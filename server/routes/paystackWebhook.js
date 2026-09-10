const crypto = require("crypto");
const axios = require("axios");
const admin = require("firebase-admin");

const db = () => admin.firestore();

async function getPaystackTransaction(reference) {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      timeout: 15000,
    }
  );
  return response.data.data;
}

async function creditWallet(reference, uid, transaction) {
  const paymentRef = db().collection("walletPayments").doc(reference);
  const userRef = db().collection("users").doc(uid);
  const amountNaira = Number(transaction.amount) / 100;

  return db().runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (paymentSnap.exists && paymentSnap.data().credited === true) {
      return false;
    }

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("User account not found");

    const currentBalance = Number(userSnap.data().wallet || 0);

    tx.set(paymentRef, {
      reference,
      uid,
      amount: amountNaira,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      credited: true,
      creditedAt: admin.firestore.FieldValue.serverTimestamp(),
      paystackTransactionId: transaction.id || null,
      channel: transaction.channel || null,
      customerEmail: transaction.customer?.email || null,
    }, { merge: true });

    tx.update(userRef, {
      wallet: currentBalance + amountNaira,
      walletUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  });
}

module.exports = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    if (!signature || !process.env.PAYSTACK_SECRET_KEY) {
      return res.status(401).send("Unauthorized");
    }

    const expected = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (
      expected.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event !== "charge.success") {
      return res.status(200).send("Event ignored");
    }

    const reference = event.data?.reference;
    const metadataUid = event.data?.metadata?.uid;
    if (!reference || !metadataUid) {
      return res.status(400).send("Missing payment metadata");
    }

    // Verify directly with Paystack before changing the wallet.
    const transaction = await getPaystackTransaction(reference);
    if (transaction.status !== "success") {
      return res.status(200).send("Payment not successful");
    }

    if (transaction.metadata?.uid !== metadataUid) {
      return res.status(400).send("User mismatch");
    }

    await creditWallet(reference, metadataUid, transaction);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Paystack webhook error:", err.response?.data || err.message);
    return res.status(500).send("Webhook processing failed");
  }
};
