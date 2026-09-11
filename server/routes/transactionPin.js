const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");

const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

const db = admin.firestore();

const PIN_COLLECTION = "transactionPins";

function hashPin(pin, salt) {
  return crypto
    .pbkdf2Sync(
      String(pin),
      salt,
      100000,
      64,
      "sha512"
    )
    .toString("hex");
}

function isValidPin(pin) {
  return /^\d{4}$/.test(
    String(pin || "")
  );
}

/*
============================================================
CREATE TRANSACTION PIN
============================================================
*/

router.post(
  "/transaction-pin",
  requireAuth,
  async (req, res) => {
    const uid = req.user.uid;

    try {
      const { pin } = req.body;

      if (!isValidPin(pin)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction PIN must be exactly 4 digits.",
        });
      }

      const pinRef = db
        .collection(PIN_COLLECTION)
        .doc(uid);

      const existingPin =
        await pinRef.get();

      if (existingPin.exists) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction PIN already exists. Use the change PIN option.",
        });
      }

      /*
      Store the salt as a HEX STRING.

      The verification service uses
      the exact same string.
      */
      const salt =
        crypto
          .randomBytes(32)
          .toString("hex");

      const hash =
        hashPin(
          String(pin),
          salt
        );

      await pinRef.set({
        uid,
        hash,
        salt,
        createdAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
        updatedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
      });

      return res.status(201).json({
        success: true,
        message:
          "Transaction PIN created successfully.",
      });
    } catch (error) {
      console.error(
        "Create transaction PIN error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create transaction PIN.",
      });
    }
  }
);

/*
============================================================
CHECK TRANSACTION PIN STATUS
============================================================
*/

router.get(
  "/transaction-pin/status",
  requireAuth,
  async (req, res) => {
    const uid = req.user.uid;

    try {
      const pinRef = db
        .collection(PIN_COLLECTION)
        .doc(uid);

      const pinSnap =
        await pinRef.get();

      return res.json({
        success: true,
        hasPin: pinSnap.exists,
      });
    } catch (error) {
      console.error(
        "Transaction PIN status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to check transaction PIN status.",
      });
    }
  }
);

/*
============================================================
VERIFY TRANSACTION PIN
============================================================
*/

router.post(
  "/transaction-pin/verify",
  requireAuth,
  async (req, res) => {
    const uid = req.user.uid;

    try {
      const { pin } = req.body;

      if (!isValidPin(pin)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction PIN must be exactly 4 digits.",
        });
      }

      const pinRef = db
        .collection(PIN_COLLECTION)
        .doc(uid);

      const pinSnap =
        await pinRef.get();

      if (!pinSnap.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Transaction PIN has not been created.",
        });
      }

      const pinData =
        pinSnap.data();

      if (
        !pinData.hash ||
        !pinData.salt
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Transaction PIN is not configured correctly.",
        });
      }

      const calculatedHash =
        hashPin(
          String(pin),
          pinData.salt
        );

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
        return res.status(401).json({
          success: false,
          message:
            "Incorrect Transaction PIN.",
        });
      }

      const pinMatches =
        crypto.timingSafeEqual(
          storedHash,
          suppliedHash
        );

      if (!pinMatches) {
        return res.status(401).json({
          success: false,
          message:
            "Incorrect Transaction PIN.",
        });
      }

      return res.json({
        success: true,
        message:
          "Transaction PIN verified.",
      });
    } catch (error) {
      console.error(
        "Verify transaction PIN error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify Transaction PIN.",
      });
    }
  }
);

/*
============================================================
CHANGE TRANSACTION PIN
============================================================
*/

router.put(
  "/transaction-pin",
  requireAuth,
  async (req, res) => {
    const uid = req.user.uid;

    try {
      const {
        currentPin,
        newPin,
      } = req.body;

      if (
        !isValidPin(currentPin) ||
        !isValidPin(newPin)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Both PINs must be exactly 4 digits.",
        });
      }

      if (
        String(currentPin) ===
        String(newPin)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New PIN must be different from your current PIN.",
        });
      }

      const pinRef = db
        .collection(PIN_COLLECTION)
        .doc(uid);

      const pinSnap =
        await pinRef.get();

      if (!pinSnap.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Transaction PIN has not been created.",
        });
      }

      const pinData =
        pinSnap.data();

      const currentHash =
        hashPin(
          String(currentPin),
          pinData.salt
        );

      const storedHash =
        Buffer.from(
          pinData.hash,
          "hex"
        );

      const currentHashBuffer =
        Buffer.from(
          currentHash,
          "hex"
        );

      if (
        storedHash.length !==
        currentHashBuffer.length
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Current Transaction PIN is incorrect.",
        });
      }

      const currentPinMatches =
        crypto.timingSafeEqual(
          storedHash,
          currentHashBuffer
        );

      if (!currentPinMatches) {
        return res.status(401).json({
          success: false,
          message:
            "Current Transaction PIN is incorrect.",
        });
      }

      const newSalt =
        crypto
          .randomBytes(32)
          .toString("hex");

      const newHash =
        hashPin(
          String(newPin),
          newSalt
        );

      await pinRef.update({
        hash: newHash,
        salt: newSalt,
        updatedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
      });

      return res.json({
        success: true,
        message:
          "Transaction PIN changed successfully.",
      });
    } catch (error) {
      console.error(
        "Change transaction PIN error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to change Transaction PIN.",
      });
    }
  }
);

module.exports = router;