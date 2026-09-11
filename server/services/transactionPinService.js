const crypto = require("crypto");
const admin = require("firebase-admin");

const db = admin.firestore();

const verifyTransactionPin = async (
  uid,
  pin
) => {
  try {
    if (!uid) {
      return {
        success: false,
        message:
          "User authentication is required.",
      };
    }

    if (
      !/^\d{4}$/.test(
        String(pin || "")
      )
    ) {
      return {
        success: false,
        message:
          "Transaction PIN must be exactly 4 digits.",
      };
    }

    const pinRef = db
      .collection("transactionPins")
      .doc(uid);

    const pinSnap =
      await pinRef.get();

    if (!pinSnap.exists) {
      return {
        success: false,
        message:
          "Transaction PIN has not been created.",
      };
    }

    const pinData =
      pinSnap.data();

    if (
      !pinData.hash ||
      !pinData.salt
    ) {
      return {
        success: false,
        message:
          "Transaction PIN is not configured correctly.",
      };
    }

    // IMPORTANT:
    // The PIN creation/change route stores
    // the salt as a HEX STRING and passes
    // that string directly into pbkdf2Sync().
    //
    // Therefore verification must use the
    // exact same salt string.

    const calculatedHash =
      crypto
        .pbkdf2Sync(
          String(pin),
          pinData.salt,
          100000,
          64,
          "sha512"
        )
        .toString("hex");

    const storedHash =
      Buffer.from(
        pinData.hash,
        "hex"
      );

    const suppliedHash =
      Buffer.from(
        calculatedHash,
        "hex"
      );

    if (
      storedHash.length !==
      suppliedHash.length
    ) {
      return {
        success: false,
        message:
          "Incorrect transaction PIN.",
      };
    }

    const pinMatches =
      crypto.timingSafeEqual(
        storedHash,
        suppliedHash
      );

    if (!pinMatches) {
      return {
        success: false,
        message:
          "Incorrect transaction PIN.",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Transaction PIN verification service error:",
      error
    );

    return {
      success: false,
      message:
        "Unable to verify transaction PIN.",
    };
  }
};

module.exports = {
  verifyTransactionPin,
};