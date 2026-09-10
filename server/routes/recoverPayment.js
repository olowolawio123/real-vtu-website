const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();

router.post("/recover-payment", async (req, res) => {
  try {
    const { reference, email } = req.body;

    if (!reference || !email) {
      return res.status(400).json({
        success: false,
        message: "Reference and email are required",
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key is not configured",
      });
    }

    console.log("RECOVERY REQUEST:", {
      reference,
      email,
    });

    // 1. Verify the transaction directly with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        timeout: 30000,
      }
    );

    const payment = paystackResponse.data.data;

    console.log("RECOVERY PAYSTACK RESULT:", {
      status: payment?.status,
      amount: payment?.amount,
      currency: payment?.currency,
      reference: payment?.reference,
      customerEmail: payment?.customer?.email,
      customerCode: payment?.customer?.customer_code,
    });

    // 2. Make absolutely sure this payment succeeded
    if (payment.status !== "success") {
      return res.status(400).json({
        success: false,
        message: `Payment status is ${payment.status}, not success`,
      });
    }

    // 3. Make sure this is an NGN payment
    if (payment.currency !== "NGN") {
      return res.status(400).json({
        success: false,
        message: "Payment currency is not NGN",
      });
    }

    // 4. Make sure the amount is exactly ₦100
    if (Number(payment.amount) !== 10000) {
      return res.status(400).json({
        success: false,
        message: "Payment amount is not ₦100",
      });
    }

    // 5. Make sure the Paystack customer matches
    const paymentEmail = payment.customer?.email?.toLowerCase();

    if (paymentEmail !== email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Paystack customer email does not match",
      });
    }

    const db = admin.firestore();

    // 6. Find Firebase user by email
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "No Firebase user found for this email",
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;

    console.log("RECOVERY FIREBASE USER:", {
      uid,
      email,
    });

    const userRef = db.collection("users").doc(uid);
    const paymentRef = db
      .collection("walletPayments")
      .doc(reference);

    // 7. Credit atomically and prevent duplicate recovery
    await db.runTransaction(async (transaction) => {
      const paymentSnapshot = await transaction.get(paymentRef);

      if (
        paymentSnapshot.exists &&
        paymentSnapshot.data().credited === true
      ) {
        throw new Error(
          "This payment has already been credited."
        );
      }

      const userSnapshot = await transaction.get(userRef);

      const currentBalance = userSnapshot.exists
        ? Number(userSnapshot.data().wallet || 0)
        : 0;

      const amountNaira = Number(payment.amount) / 100;

      transaction.set(
        userRef,
        {
          wallet: currentBalance + amountNaira,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(paymentRef, {
        reference,
        uid,
        email,
        amount: amountNaira,
        credited: true,
        status: "success",
        recovered: true,
        recoveredAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log("PAYMENT RECOVERED SUCCESSFULLY:", {
      reference,
      uid,
      email,
      amount: 100,
    });

    return res.status(200).json({
      success: true,
      message: "Payment recovered and wallet credited",
      reference,
      email,
      amount: 100,
    });
  } catch (error) {
    console.error(
      "PAYMENT RECOVERY ERROR:",
      error.message
    );

    if (
      error.message ===
      "This payment has already been credited."
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to recover payment",
    });
  }
});

module.exports = router;