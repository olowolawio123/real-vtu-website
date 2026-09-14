const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();

const REFERRAL_BONUS = 100;
const MIN_REFERRAL_DEPOSIT = 1000;

router.post("/verify-payment", async (req, res) => {
  try {
    const { reference, uid } = req.body;

    console.log("VERIFY PAYMENT REQUEST:", {
      reference,
      uid,
    });

    if (!reference || !uid) {
      return res.status(400).json({
        success: false,
        message: "Payment reference and user ID are required",
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("PAYSTACK_SECRET_KEY is missing");

      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured",
      });
    }

    // ---------------------------------------------------------
    // VERIFY PAYMENT WITH PAYSTACK
    // ---------------------------------------------------------

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        timeout: 30000,
      }
    );

    const transaction = response.data.data;

    console.log("PAYSTACK VERIFICATION RESULT:", {
      status: transaction?.status,
      amount: transaction?.amount,
      currency: transaction?.currency,
      metadataUid: transaction?.metadata?.uid || null,
    });

    if (transaction?.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment was not successful",
      });
    }

    // ---------------------------------------------------------
    // VERIFY PAYMENT BELONGS TO USER
    // ---------------------------------------------------------

    const paymentUid = transaction.metadata?.uid;

    if (!paymentUid || paymentUid !== uid) {
      console.error("PAYMENT USER MISMATCH:", {
        paymentUid: paymentUid || null,
        requestUid: uid,
      });

      return res.status(403).json({
        success: false,
        message: "Payment user does not match account",
      });
    }

    // ---------------------------------------------------------
    // CONVERT KOBO TO NAIRA
    // ---------------------------------------------------------

    const amountNaira =
      Number(transaction.amount) / 100;

    if (
      !Number.isFinite(amountNaira) ||
      amountNaira <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const db = admin.firestore();

    const userRef =
      db.collection("users").doc(uid);

    const paymentRef =
      db
        .collection("walletPayments")
        .doc(reference);

    let alreadyCredited = false;
    let referralBonusPaid = false;
    let referralBonusAmount = 0;

    // ---------------------------------------------------------
    // FIRESTORE TRANSACTION
    // ---------------------------------------------------------

    await db.runTransaction(
      async (firestoreTransaction) => {

        // =====================================================
        // IMPORTANT:
        // ALL READS MUST HAPPEN BEFORE ANY WRITES
        // =====================================================

        // -----------------------------------------------------
        // READ PAYMENT
        // -----------------------------------------------------

        const paymentSnap =
          await firestoreTransaction.get(paymentRef);

        if (
          paymentSnap.exists &&
          paymentSnap.data().credited === true
        ) {
          alreadyCredited = true;
          return;
        }

        // -----------------------------------------------------
        // READ DEPOSITING USER
        // -----------------------------------------------------

        const userSnap =
          await firestoreTransaction.get(userRef);

        if (!userSnap.exists) {
          throw new Error(
            "USER_ACCOUNT_NOT_FOUND"
          );
        }

        const userData =
          userSnap.data() || {};

        // -----------------------------------------------------
        // CALCULATE USER WALLET
        // -----------------------------------------------------

        const currentBalance =
          Number(userData.wallet || 0);

        const newBalance =
          currentBalance + amountNaira;

        // -----------------------------------------------------
        // REFERRAL INFORMATION
        // -----------------------------------------------------

        const referredBy =
          userData.referredBy || null;

        const referredByCode =
          userData.referredByCode || null;

        const referralAlreadyProcessed =
          userData.referralBonusProcessed === true;

        const qualifiesForReferralBonus =
          amountNaira >= MIN_REFERRAL_DEPOSIT &&
          !referralAlreadyProcessed &&
          !!referredBy &&
          referredBy !== uid;

        console.log(
          "REFERRAL CHECK:",
          {
            uid,
            amountNaira,
            minimumDeposit:
              MIN_REFERRAL_DEPOSIT,
            referredBy,
            referredByCode,
            referralAlreadyProcessed,
            qualifiesForReferralBonus,
          }
        );

        // -----------------------------------------------------
        // VARIABLES FOR REFERRER
        // -----------------------------------------------------

        let referrerRef = null;
        let referrerData = null;
        let referrerNewBalance = 0;
        let referrerNewCount = 0;
        let referrerNewEarnings = 0;

        let bonusRef = null;
        let bonusAlreadyExists = false;

        // =====================================================
        // READ REFERRER + BONUS RECORD
        // =====================================================

        if (qualifiesForReferralBonus) {

          referrerRef =
            db
              .collection("users")
              .doc(referredBy);

          // READ REFERRER
          const referrerSnap =
            await firestoreTransaction.get(
              referrerRef
            );

          if (referrerSnap.exists) {

            referrerData =
              referrerSnap.data() || {};

            const referrerCurrentBalance =
              Number(
                referrerData.wallet || 0
              );

            const currentReferralCount =
              Number(
                referrerData.referralCount || 0
              );

            const currentReferralEarnings =
              Number(
                referrerData.referralBonusEarned || 0
              );

            referrerNewBalance =
              referrerCurrentBalance +
              REFERRAL_BONUS;

            referrerNewCount =
              currentReferralCount + 1;

            referrerNewEarnings =
              currentReferralEarnings +
              REFERRAL_BONUS;

            // -------------------------------------------------
            // READ BONUS RECORD
            // -------------------------------------------------

            bonusRef =
              db
                .collection("referralBonuses")
                .doc(reference);

            const bonusSnap =
              await firestoreTransaction.get(
                bonusRef
              );

            bonusAlreadyExists =
              bonusSnap.exists;

          } else {

            console.log(
              "REFERRER ACCOUNT NOT FOUND:",
              referredBy
            );
          }
        }

        // =====================================================
        // NOW ALL READS ARE FINISHED
        // =====================================================
        // ONLY NOW DO WE WRITE
        // =====================================================

        // -----------------------------------------------------
        // CREDIT DEPOSITING USER
        // -----------------------------------------------------

        firestoreTransaction.set(
          userRef,
          {
            wallet: newBalance,

            updatedAt:
              admin.firestore.FieldValue
                .serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        // -----------------------------------------------------
        // RECORD PAYMENT
        // -----------------------------------------------------

        firestoreTransaction.set(
          paymentRef,
          {
            reference,
            uid,
            amount: amountNaira,
            credited: true,
            status: "success",

            createdAt:
              admin.firestore.FieldValue
                .serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        // =====================================================
        // CREDIT REFERRAL BONUS
        // =====================================================

        if (
          qualifiesForReferralBonus &&
          referrerRef &&
          referrerData &&
          !bonusAlreadyExists
        ) {

          // ---------------------------------------------------
          // CREDIT REFERRER WALLET
          // ---------------------------------------------------

          firestoreTransaction.set(
            referrerRef,
            {
              wallet:
                referrerNewBalance,

              referralCount:
                referrerNewCount,

              referralBonusEarned:
                referrerNewEarnings,

              updatedAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          // ---------------------------------------------------
          // CREATE BONUS RECORD
          // ---------------------------------------------------

          firestoreTransaction.set(
            bonusRef,
            {
              paymentReference:
                reference,

              referredUserId:
                uid,

              referrerUserId:
                referredBy,

              referralCode:
                referredByCode,

              amount:
                REFERRAL_BONUS,

              minimumDeposit:
                MIN_REFERRAL_DEPOSIT,

              status:
                "credited",

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          // ---------------------------------------------------
          // MARK REFERRAL AS PROCESSED
          // ---------------------------------------------------

          firestoreTransaction.set(
            userRef,
            {
              referralBonusProcessed:
                true,
            },
            {
              merge: true,
            }
          );

          referralBonusPaid = true;
          referralBonusAmount =
            REFERRAL_BONUS;

          console.log(
            "========================================"
          );

          console.log(
            "REFERRAL BONUS CREDITED SUCCESSFULLY"
          );

          console.log({
            paymentReference:
              reference,

            referredUserId:
              uid,

            referrerUserId:
              referredBy,

            depositAmount:
              amountNaira,

            minimumDeposit:
              MIN_REFERRAL_DEPOSIT,

            bonus:
              REFERRAL_BONUS,
          });

          console.log(
            "========================================"
          );
        }
      }
    );

    // ---------------------------------------------------------
    // DUPLICATE PAYMENT
    // ---------------------------------------------------------

    if (alreadyCredited) {

      console.log(
        "PAYMENT ALREADY CREDITED:",
        reference
      );

      return res.status(200).json({
        success: true,
        message:
          "Payment was already processed",

        amount:
          amountNaira,

        referralBonusPaid:
          false,

        referralBonusAmount:
          0,
      });
    }

    // ---------------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------------

    console.log(
      "PAYMENT CREDITED SUCCESSFULLY:",
      {
        reference,
        uid,
        amount: amountNaira,
        referralBonusPaid,
        referralBonusAmount,
      }
    );

    return res.status(200).json({
      success: true,

      message:
        referralBonusPaid
          ? "Payment verified, wallet credited and referral bonus awarded"
          : "Payment verified and wallet credited",

      amount:
        amountNaira,

      referralBonusPaid,

      referralBonusAmount,
    });

  } catch (error) {

    console.error(
      "PAYMENT VERIFICATION ERROR:",
      error.message,
      error.response?.data || ""
    );

    if (
      error.message ===
      "USER_ACCOUNT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify payment",
    });
  }
});

module.exports = router;