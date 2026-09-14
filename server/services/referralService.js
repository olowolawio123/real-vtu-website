const admin = require("firebase-admin");

const db = admin.firestore();

const DEFAULT_REFERRAL_BONUS = 100;

/**
 * Generate a unique referral code from a user's UID.
 */
function generateReferralCode(uid) {
  return `IL${uid.slice(0, 8).toUpperCase()}`;
}

/**
 * Create referral information for a new user.
 */
async function createReferralProfile(uid) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error("User account not found");
  }

  const userData = userSnap.data() || {};

  if (userData.referralCode) {
    return {
      referralCode: userData.referralCode,
    };
  }

  const referralCode = generateReferralCode(uid);

  await userRef.set(
    {
      referralCode,
      referralBonusEarned: 0,
      referralCount: 0,
      referredBy: userData.referredBy || null,
    },
    { merge: true }
  );

  return {
    referralCode,
  };
}

/**
 * Find a user using their referral code.
 */
async function findReferrerByCode(referralCode) {
  if (!referralCode) {
    return null;
  }

  const snapshot = await db
    .collection("users")
    .where("referralCode", "==", referralCode.trim().toUpperCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];

  return {
    uid: doc.id,
    data: doc.data(),
  };
}

/**
 * Save the referrer against the new user's account.
 */
async function attachReferrer(newUserUid, referralCode) {
  if (!referralCode) {
    return {
      success: false,
      message: "No referral code supplied",
    };
  }

  const referrer = await findReferrerByCode(referralCode);

  if (!referrer) {
    return {
      success: false,
      message: "Invalid referral code",
    };
  }

  // Prevent self-referral.
  if (referrer.uid === newUserUid) {
    return {
      success: false,
      message: "You cannot refer yourself",
    };
  }

  const newUserRef = db.collection("users").doc(newUserUid);

  await db.runTransaction(async (transaction) => {
    const newUserSnap = await transaction.get(newUserRef);

    if (!newUserSnap.exists) {
      throw new Error("New user account not found");
    }

    const newUserData = newUserSnap.data() || {};

    // A user can only have one referrer.
    if (newUserData.referredBy) {
      return;
    }

    transaction.set(
      newUserRef,
      {
        referredBy: referrer.uid,
        referralCodeUsed: referralCode.trim().toUpperCase(),
      },
      { merge: true }
    );
  });

  return {
    success: true,
    referrerUid: referrer.uid,
  };
}

/**
 * Award the referral bonus after the referred user's
 * first successful wallet deposit.
 *
 * This is protected against duplicate payment processing.
 */
async function awardReferralBonus({
  depositedUserUid,
  paymentReference,
  depositAmount,
}) {
  if (!depositedUserUid || !paymentReference) {
    throw new Error("Missing referral bonus information");
  }

  const userRef = db.collection("users").doc(depositedUserUid);

  const result = await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists) {
      throw new Error("Depositing user not found");
    }

    const userData = userSnap.data() || {};

    const referrerUid = userData.referredBy;

    if (!referrerUid) {
      return {
        awarded: false,
        reason: "User was not referred",
      };
    }

    // Only the first successful deposit qualifies.
    if (userData.referralBonusProcessed === true) {
      return {
        awarded: false,
        reason: "Referral bonus already processed",
      };
    }

    const referrerRef = db.collection("users").doc(referrerUid);
    const referrerSnap = await transaction.get(referrerRef);

    if (!referrerSnap.exists) {
      return {
        awarded: false,
        reason: "Referrer account not found",
      };
    }

    const referrerData = referrerSnap.data() || {};

    const bonusAmount = Number(
      referrerData.referralBonusAmount || DEFAULT_REFERRAL_BONUS
    );

    if (!Number.isFinite(bonusAmount) || bonusAmount <= 0) {
      return {
        awarded: false,
        reason: "Invalid referral bonus amount",
      };
    }

    const currentReferrerBalance = Number(
      referrerData.walletBalance || 0
    );

    const currentBonusTotal = Number(
      referrerData.referralBonusEarned || 0
    );

    const currentReferralCount = Number(
      referrerData.referralCount || 0
    );

    const bonusRef = db
      .collection("referralBonuses")
      .doc(paymentReference);

    transaction.set(bonusRef, {
      referrerUid,
      referredUserUid: depositedUserUid,
      paymentReference,
      depositAmount: Number(depositAmount || 0),
      bonusAmount,
      status: "successful",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(
      referrerRef,
      {
        walletBalance: currentReferrerBalance + bonusAmount,
        referralBonusEarned: currentBonusTotal + bonusAmount,
        referralCount: currentReferralCount + 1,
      },
      { merge: true }
    );

    transaction.set(
      userRef,
      {
        referralBonusProcessed: true,
        referralBonusPaymentReference: paymentReference,
      },
      { merge: true }
    );

    return {
      awarded: true,
      bonusAmount,
      referrerUid,
    };
  });

  return result;
}

module.exports = {
  DEFAULT_REFERRAL_BONUS,
  generateReferralCode,
  createReferralProfile,
  findReferrerByCode,
  attachReferrer,
  awardReferralBonus,
};