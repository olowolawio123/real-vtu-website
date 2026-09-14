const express = require("express");
const admin = require("firebase-admin");

const router = express.Router();

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken =
      await admin.auth().verifyIdToken(idToken);

    req.user = decodedToken;

    next();
  } catch (error) {
    console.error(
      "REFERRAL AUTH ERROR:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }
};

router.post(
  "/attach",
  authenticateUser,
  async (req, res) => {
    try {
      const uid = req.user.uid;

      const referralCode =
        String(req.body.referralCode || "")
          .trim()
          .toUpperCase();

      if (!referralCode) {
        return res.status(400).json({
          success: false,
          message: "Referral code is required",
        });
      }

      const db = admin.firestore();

      const userRef =
        db.collection("users").doc(uid);

      const userSnap =
        await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({
          success: false,
          message: "User account not found",
        });
      }

      const userData =
        userSnap.data() || {};

      // Already attached
      if (userData.referredBy) {
        return res.status(200).json({
          success: true,
          message: "Referral already attached",
          referredBy: userData.referredBy,
          referredByCode:
            userData.referredByCode || null,
        });
      }

      // Find the owner of the referral code
      const referrerQuery =
        await db
          .collection("users")
          .where(
            "referralCode",
            "==",
            referralCode
          )
          .limit(1)
          .get();

      if (referrerQuery.empty) {
        return res.status(404).json({
          success: false,
          message: "Referral code not found",
        });
      }

      const referrerDoc =
        referrerQuery.docs[0];

      const referrerUid =
        referrerDoc.id;

      // Prevent self-referral
      if (referrerUid === uid) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot use your own referral code",
        });
      }

      // Save BOTH the referral code and referrer UID
      await userRef.set(
        {
          referredBy: referrerUid,
          referredByCode: referralCode,
          referralBonusProcessed: false,
        },
        {
          merge: true,
        }
      );

      console.log(
        "REFERRAL ATTACHED SUCCESSFULLY:",
        {
          newUser: uid,
          referrerUid,
          referralCode,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Referral attached successfully",
        referredBy: referrerUid,
        referredByCode: referralCode,
      });
    } catch (error) {
      console.error(
        "REFERRAL ATTACH ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to attach referral",
      });
    }
  }
);

module.exports = router;