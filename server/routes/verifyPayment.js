const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();

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

    if (transaction.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment was not successful",
      });
    }

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

    const db = admin.firestore();

    const userRef = db.collection("users").doc(uid);
    const paymentRef = db.collection("walletPayments").doc(reference);

    await db.runTransaction(async (transactionRef) => {
      const paymentSnap = await transactionRef.get(paymentRef);

      if (paymentSnap.exists && paymentSnap.data().credited === true) {
        return;
      }

      const userSnap = await transactionRef.get(userRef);

      let currentBalance = 0;

      if (userSnap.exists) {
        currentBalance = Number(userSnap.data().wallet || 0);
      }

      const amountNaira = Number(transaction.amount) / 100;

      transactionRef.set(
        userRef,
        {
          wallet: currentBalance + amountNaira,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      transactionRef.set(paymentRef, {
        reference,
        uid,
        amount: amountNaira,
        credited: true,
        status: "success",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log("PAYMENT CREDITED SUCCESSFULLY:", {
      reference,
      uid,
      amount: Number(transaction.amount) / 100,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified and wallet credited",
      amount: Number(transaction.amount) / 100,
    });
  } catch (error) {
    console.error(
      "PAYMENT VERIFICATION ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
});

module.exports = router;