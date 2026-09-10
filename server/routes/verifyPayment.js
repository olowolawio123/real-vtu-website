const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();

router.post("/verify-payment", async (req, res) => {
  try {
    const { reference, uid } = req.body;

    if (!reference || !uid) {
      return res.status(400).json({
        message: "Payment reference and user ID are required",
      });
    }

    // Verify the transaction directly with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const transaction = response.data.data;

    // Payment must actually be successful
    if (transaction.status !== "success") {
      return res.status(400).json({
        message: "Payment was not successful",
      });
    }

    // Make sure the payment belongs to this Firebase user
    const paymentUid = transaction.metadata?.uid;

    if (!paymentUid || paymentUid !== uid) {
      return res.status(403).json({
        message: "Payment user does not match account",
      });
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const paymentRef = db.collection("walletPayments").doc(reference);

    // Use a Firestore transaction so the payment cannot be credited twice
    await db.runTransaction(async (transactionRef) => {
      const paymentSnap = await transactionRef.get(paymentRef);

      // Already credited
      if (paymentSnap.exists && paymentSnap.data().credited === true) {
        return;
      }

      const userSnap = await transactionRef.get(userRef);

      let currentBalance = 0;

      if (userSnap.exists) {
        currentBalance = Number(userSnap.data().wallet || 0);
      }

      // Paystack amount is in kobo
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

    return res.status(200).json({
      success: true,
      message: "Payment verified and wallet credited",
      amount: Number(transaction.amount) / 100,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to verify payment",
    });
  }
});

module.exports = router;