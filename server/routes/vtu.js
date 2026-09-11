const express = require("express");
const admin = require("firebase-admin");

const requireAuth = require("../middleware/authMiddleware");

const {
  verifyTransactionPin,
} = require("../services/transactionPinService");

const {
  calculateDataPrice,
  calculateElectricityPrice,
} = require("../services/pricingService");

const {
  getDataPlans,
  purchaseData,
} = require("../services/dataService");

const {
  purchaseAirtime,
} = require("../services/airtimeService");

const {
  getElectricityPlans,
  verifyElectricityMeter,
  purchaseElectricity,
} = require("../services/electricityService");

const {
  getCableTvPlans,
  verifyCableCustomer,
  purchaseCableTv,
} = require("../services/cableTvService");

const router = express.Router();

const db = admin.firestore();


/* ============================================================
   SETTINGS
   ============================================================ */

const NETWORK_IDS = {
  MTN: "1",
  GLO: "2",
  "9MOBILE": "3",
  AIRTEL: "4",
};

const WALLET_DEBIT_ENABLED =
  String(
    process.env.VTU_WALLET_DEBIT_ENABLED || "true"
  ).toLowerCase() === "true";

const VTU_MODE =
  String(
    process.env.VTU_MODE || "sandbox"
  ).toLowerCase();

const VTU_API_KEY = process.env.VTU_API_KEY;

const VTU_BASE_URL =
  VTU_MODE === "sandbox"
    ? process.env.VTU_SANDBOX_BASE_URL
    : process.env.VTU_LIVE_BASE_URL;
/* ============================================================
   HELPERS
   ============================================================ */

function generateRequestId() {
  return `VTU-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

function isSandbox() {
  return VTU_MODE === "sandbox";
}

function isValidNigerianPhone(number) {
  return /^\d{11}$/.test(
    String(number || "")
  );
}

function isSuccessfulProviderResponse(response) {
  const status = String(
    response?.Status ||
      response?.status ||
      response?.data?.Status ||
      response?.data?.status ||
      ""
  ).toLowerCase();

  return (
    status === "successful" ||
    status === "success"
  );
}

function isExplicitProviderFailure(response) {
  const status = String(
    response?.Status ||
      response?.status ||
      response?.data?.Status ||
      response?.data?.status ||
      ""
  ).toLowerCase();

  return (
    status === "failed" ||
    status === "fail" ||
    status === "error" ||
    status === "rejected"
  );
}

function getProviderResponseFromError(error) {
  return (
    error?.response?.data ||
    null
  );
}

function getProviderTransactionId(response) {
  return (
    response?.transaction_id ||
    response?.transactionId ||
    response?.id ||
    response?.ident ||
    response?.data?.transaction_id ||
    response?.data?.transactionId ||
    response?.data?.id ||
    response?.data?.ident ||
    null
  );
}

function getProviderReference(response) {
  return (
    response?.ident ||
    response?.id ||
    response?.reference ||
    response?.request_id ||
    response?.transaction_id ||
    response?.transactionId ||
    response?.data?.ident ||
    response?.data?.id ||
    response?.data?.reference ||
    response?.data?.request_id ||
    response?.data?.transaction_id ||
    response?.data?.transactionId ||
    null
  );
}


/* ============================================================
   REFUND HELPER
   ============================================================ */

async function refundOrder({
  orderRef,
  walletTransactionRef,
  userRef,
  uid,
  service,
  refundAmount,
  requestId,
  reason,
}) {
  await db.runTransaction(
    async (transaction) => {
      const userSnap =
        await transaction.get(
          userRef
        );

      const orderSnap =
        await transaction.get(
          orderRef
        );

      const ledgerSnap =
        await transaction.get(
          walletTransactionRef
        );

      if (
        !userSnap.exists ||
        !orderSnap.exists ||
        !ledgerSnap.exists
      ) {
        throw new Error(
          "REFUND_DATA_MISSING"
        );
      }

      const orderData =
        orderSnap.data();

      /*
       * Never refund twice.
       */

      if (
        orderData.debitStatus ===
        "refunded"
      ) {
        return;
      }

      /*
       * Never refund a successful order.
       */

      if (
        orderData.status ===
        "successful"
      ) {
        return;
      }

      const currentBalance =
        Number(
          userSnap.data()?.wallet || 0
        );

      if (
        !Number.isFinite(
          currentBalance
        )
      ) {
        throw new Error(
          "INVALID_WALLET"
        );
      }

      const refundBalance =
        currentBalance +
        refundAmount;

      transaction.update(
        userRef,
        {
          wallet:
            refundBalance,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        }
      );

      transaction.update(
        orderRef,
        {
          status:
            "failed",

          debitStatus:
            "refunded",

          refundAmount,

          refundReason:
            reason,

          failedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        }
      );

      transaction.update(
        walletTransactionRef,
        {
          status:
            "refunded",

          refundAmount,

          balanceBeforeRefund:
            currentBalance,

          balanceAfterRefund:
            refundBalance,

          refundReason:
            reason,

          refundedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        }
      );

      const refundRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();

      transaction.set(
        refundRef,
        {
          uid,

          type:
            "refund",

          service,

          amount:
            refundAmount,

          orderId:
            orderRef.id,

          requestId,

          balanceBefore:
            currentBalance,

          balanceAfter:
            refundBalance,

          status:
            "completed",

          description:
            `${service} purchase refund`,

          refundReason:
            reason,

          createdAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        }
      );
    }
  );
}


/* ============================================================
   DATA PLANS
   ============================================================ */

router.get(
  "/data-plans",
  requireAuth,
  async (req, res) => {
    try {
      const providerResponse =
        await getDataPlans();

      const providerPlans =
        providerResponse?.dataplans || [];

      const dynamicPlans = providerPlans.map(
        (plan) => {
          const pricing =
            calculateDataPrice(plan);

          return {
            ...plan,
            providerCost:
              pricing.providerCost,
            sellingPrice:
              pricing.sellingPrice,
            profit:
              pricing.profit,
          };
        }
      );

      return res.json({
        success: true,
        dataplans: dynamicPlans,
      });
    } catch (error) {
      console.error(
        "Data plans error:",
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load data plans.",
      });
    }
  }
);

/* ============================================================
   BUY DATA
   ============================================================ */

router.post(
  "/buy-data",
  requireAuth,
  async (req, res) => {
    const uid =
      req.user.uid;

    const {
  network,
  mobileNumber,
  plan,
  transactionPin,
} = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      const pinVerification =
  await verifyTransactionPin(
    uid,
    transactionPin
  );

if (!pinVerification.success) {
  return res.status(401).json({
    success: false,
    message:
      pinVerification.message,
  });
}
      if (!network) {
        return res.status(400).json({
          success: false,
          message:
            "Network is required.",
        });
      }

      const normalizedNetwork =
        String(network)
          .trim()
          .toUpperCase();

      const networkId =
        NETWORK_IDS[
          normalizedNetwork
        ];

      if (!networkId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid network.",
        });
      }

      if (
        !mobileNumber ||
        !isValidNigerianPhone(
          mobileNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Nigerian phone number.",
        });
      }

      if (
        isSandbox() &&
        String(mobileNumber) !==
          "08011111111"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses phone number 08011111111.",
        });
      }

      if (!plan) {
        return res.status(400).json({
          success: false,
          message:
            "Data plan is required.",
        });
      }

      const plansResponse =
        await getDataPlans();

      const plans =
        plansResponse?.dataplans ||
        plansResponse?.data ||
        [];

      const requestedPlan = String(
  plan || ""
).trim();

const selectedPlan = plans.find((item) => {
  const possibleIds = [
    item?.dataplan_id,
    item?.dataplanId,
    item?.data_plan_id,
    item?.dataPlanId,
    item?.plan_id,
    item?.planId,
    item?.plan_code,
    item?.planCode,
    item?.code,
    item?.id,
    item?.plan,
  ];

  return possibleIds.some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() ===
        requestedPlan
  );
});
      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          message:
            "Selected data plan was not found.",
        });
      }

      const pricing =
        calculateDataPrice(
          selectedPlan
        );

      const providerCost =
        pricing.providerCost;

      const sellingPrice =
        pricing.sellingPrice;

      const profit =
        pricing.profit;

      const userRef =
        db
          .collection("users")
          .doc(uid);

      orderRef =
        db
          .collection("dataOrders")
          .doc();

      walletTransactionRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();

      requestId =
        generateRequestId();

      await db.runTransaction(
        async (transaction) => {
          const userSnap =
            await transaction.get(
              userRef
            );

          if (!userSnap.exists) {
            throw new Error(
              "USER_NOT_FOUND"
            );
          }

          const currentBalance =
            Number(
              userSnap.data()
                ?.wallet || 0
            );

          if (
            !Number.isFinite(
              currentBalance
            )
          ) {
            throw new Error(
              "INVALID_WALLET"
            );
          }

          if (
            WALLET_DEBIT_ENABLED &&
            currentBalance <
              sellingPrice
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            WALLET_DEBIT_ENABLED
              ? currentBalance -
                sellingPrice
              : currentBalance;

          if (
            WALLET_DEBIT_ENABLED
          ) {
            transaction.update(
              userRef,
              {
                wallet:
                  newBalance,

                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }

          transaction.set(
            orderRef,
            {
              uid,

              orderId:
                orderRef.id,

              requestId,

              service:
                "data",

              network:
                normalizedNetwork,

              networkId,

              mobileNumber:
                String(mobileNumber),

              plan:
                String(plan),

              providerCost,

              amount:
                sellingPrice,

              profit,

              debitStatus:
                WALLET_DEBIT_ENABLED
                  ? "debited"
                  : "not_debited",

              status:
                "processing",

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            walletTransactionRef,
            {
              uid,

              type:
                "debit",

              service:
                "data",

              amount:
                sellingPrice,

              orderId:
                orderRef.id,

              requestId,

              balanceBefore:
                currentBalance,

              balanceAfter:
                newBalance,

              status:
                "completed",

              description:
                `Data purchase - ${normalizedNetwork}`,

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      let providerResponse;

      try {
        providerResponse =
          await purchaseData({
            network:
              networkId,

            mobileNumber:
              String(mobileNumber),

            plan:
              String(plan),

            requestId,
          });
      } catch (providerError) {
        const providerErrorData =
          getProviderResponseFromError(
            providerError
          );

        console.error(
          "Data provider error:",
          providerErrorData ||
            providerError.message
        );

        /*
         * If VTU explicitly rejected the transaction,
         * refund immediately.
         */

        if (
          providerErrorData &&
          isExplicitProviderFailure(
            providerErrorData
          )
        ) {
          await refundOrder({
            orderRef,

            walletTransactionRef,

            userRef,

            uid,

            service:
              "data",

            refundAmount:
              sellingPrice,

            requestId,

            reason:
              "Data provider rejected transaction",
          });

          return res.status(400).json({
            success: false,

            message:
              "Data purchase failed. Your wallet has been refunded.",

            requestId,

            orderId:
              orderRef.id,
          });
        }

        /*
         * Timeout/network/ambiguous error.
         * Do NOT refund automatically.
         */

        await orderRef.update({
          status:
            "unknown",

          providerError:
            providerErrorData ||
            providerError.message,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your data purchase is being checked. Please do not purchase again yet.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      const providerTransactionId =
        getProviderTransactionId(
          providerResponse
        );

      const providerReference =
        getProviderReference(
          providerResponse
        );

      if (
        isExplicitProviderFailure(
          providerResponse
        )
      ) {
        await refundOrder({
          orderRef,

          walletTransactionRef,

          userRef,

          uid,

          service:
            "data",

          refundAmount:
            sellingPrice,

          requestId,

          reason:
            "Data provider rejected transaction",
        });

        await orderRef.update({
          providerTransactionId,

          providerReference,

          providerResponse,
        });

        return res.status(400).json({
          success: false,

          message:
            "Data purchase failed. Your wallet has been refunded.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      if (
        !isSuccessfulProviderResponse(
          providerResponse
        )
      ) {
        await orderRef.update({
          status:
            "unknown",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your data purchase is still being processed. Please do not purchase again yet.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status:
                "successful",

              providerTransactionId,

              providerReference,

              providerResponse,

              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            walletTransactionRef,
            {
              status:
                "successful",

              providerTransactionId,

              providerReference,

              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return res.json({
        success: true,

        message:
          "Data purchase successful.",

        requestId,

        orderId:
          orderRef.id,

        amount:
          sellingPrice,

        providerReference,

        providerTransactionId,
      });
    } catch (error) {
      console.error(
        "Data purchase error:",
        error
      );

      if (
        error.message ===
        "USER_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Insufficient wallet balance.",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid wallet balance.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to process data purchase.",

        requestId,

        orderId:
          orderRef?.id || null,
      });
    }
  }
);


/* ============================================================
   AIRTIME
   ============================================================ */

router.post(
  "/buy-airtime",
  requireAuth,
  async (req, res) => {
    const uid =
      req.user.uid;

    const {
  network,
  mobileNumber,
  amount,
  transactionPin,
} = req.body;
 
const pinVerification =
  await verifyTransactionPin(
    uid,
    transactionPin
  );

if (!pinVerification.success) {
  return res.status(401).json({
    success: false,
    message:
      pinVerification.message,
  });
}

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      if (!network) {
        return res.status(400).json({
          success: false,
          message:
            "Network is required.",
        });
      }

      const normalizedNetwork =
        String(network)
          .trim()
          .toUpperCase();

      const networkId =
        NETWORK_IDS[
          normalizedNetwork
        ];

      if (!networkId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid network.",
        });
      }

      if (
        !mobileNumber ||
        !isValidNigerianPhone(
          mobileNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Nigerian phone number.",
        });
      }

      if (
        isSandbox() &&
        String(mobileNumber) !==
          "08011111111"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses phone number 08011111111.",
        });
      }

      const purchaseAmount =
        Number(amount);

      if (
        !Number.isFinite(
          purchaseAmount
        ) ||
        purchaseAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid airtime amount.",
        });
      }

      if (
        !Number.isInteger(
          purchaseAmount
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Airtime amount must be a whole number.",
        });
      }

      const userRef =
        db
          .collection("users")
          .doc(uid);

      orderRef =
        db
          .collection("airtimeOrders")
          .doc();

      walletTransactionRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();

      requestId =
        generateRequestId();

      await db.runTransaction(
        async (transaction) => {
          const userSnap =
            await transaction.get(
              userRef
            );

          if (!userSnap.exists) {
            throw new Error(
              "USER_NOT_FOUND"
            );
          }

          const currentBalance =
            Number(
              userSnap.data()
                ?.wallet || 0
            );

          if (
            !Number.isFinite(
              currentBalance
            )
          ) {
            throw new Error(
              "INVALID_WALLET"
            );
          }

          if (
            WALLET_DEBIT_ENABLED &&
            currentBalance <
              purchaseAmount
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            WALLET_DEBIT_ENABLED
              ? currentBalance -
                purchaseAmount
              : currentBalance;

          if (
            WALLET_DEBIT_ENABLED
          ) {
            transaction.update(
              userRef,
              {
                wallet:
                  newBalance,

                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }

          transaction.set(
            orderRef,
            {
              uid,

              orderId:
                orderRef.id,

              requestId,

              service:
                "airtime",

              network:
                normalizedNetwork,

              networkId,

              mobileNumber:
                String(mobileNumber),

              amount:
                purchaseAmount,

              debitStatus:
                WALLET_DEBIT_ENABLED
                  ? "debited"
                  : "not_debited",

              status:
                "processing",

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            walletTransactionRef,
            {
              uid,

              type:
                "debit",

              service:
                "airtime",

              amount:
                purchaseAmount,

              orderId:
                orderRef.id,

              requestId,

              balanceBefore:
                currentBalance,

              balanceAfter:
                newBalance,

              status:
                "completed",

              description:
                `Airtime purchase - ${normalizedNetwork}`,

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      let providerResponse;

      try {
        providerResponse =
          await purchaseAirtime({
            network:
              networkId,

            mobileNumber:
              String(mobileNumber),

            amount:
              purchaseAmount,

            requestId,
          });
      } catch (providerError) {
        const providerErrorData =
          getProviderResponseFromError(
            providerError
          );

        console.error(
          "Airtime provider error:",
          providerErrorData ||
            providerError.message
        );

        if (
          providerErrorData &&
          isExplicitProviderFailure(
            providerErrorData
          )
        ) {
          await refundOrder({
            orderRef,

            walletTransactionRef,

            userRef,

            uid,

            service:
              "airtime",

            refundAmount:
              purchaseAmount,

            requestId,

            reason:
              "Airtime provider rejected transaction",
          });

          return res.status(400).json({
            success: false,

            message:
              "Airtime purchase failed. Your wallet has been refunded.",

            requestId,

            orderId:
              orderRef.id,
          });
        }

        await orderRef.update({
          status:
            "unknown",

          providerError:
            providerErrorData ||
            providerError.message,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your airtime purchase is being checked. Please do not purchase again yet.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      const providerTransactionId =
        getProviderTransactionId(
          providerResponse
        );

      const providerReference =
        getProviderReference(
          providerResponse
        );

      if (
        isExplicitProviderFailure(
          providerResponse
        )
      ) {
        await refundOrder({
          orderRef,

          walletTransactionRef,

          userRef,

          uid,

          service:
            "airtime",

          refundAmount:
            purchaseAmount,

          requestId,

          reason:
            "Airtime provider rejected transaction",
        });

        await orderRef.update({
          providerTransactionId,

          providerReference,

          providerResponse,
        });

        return res.status(400).json({
          success: false,

          message:
            "Airtime purchase failed. Your wallet has been refunded.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      if (
        !isSuccessfulProviderResponse(
          providerResponse
        )
      ) {
        await orderRef.update({
          status:
            "unknown",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your airtime purchase is still being processed. Please do not purchase again yet.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status:
                "successful",

              providerTransactionId,

              providerReference,

              providerResponse,

              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            walletTransactionRef,
            {
              status:
                "successful",

              providerTransactionId,

              providerReference,

              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return res.json({
        success: true,

        message:
          "Airtime purchase successful.",

        requestId,

        orderId:
          orderRef.id,

        amount:
          purchaseAmount,

        providerReference,

        providerTransactionId,
      });
    } catch (error) {
      console.error(
        "Airtime purchase error:",
        error
      );

      if (
        error.message ===
        "USER_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Insufficient wallet balance.",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid wallet balance.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to process airtime purchase.",

        requestId,

        orderId:
          orderRef?.id || null,
      });
    }
  }
);


/* ============================================================
   ELECTRICITY PROVIDERS
   ============================================================ */

router.get(
  "/electricity-providers",
  requireAuth,
  async (req, res) => {
    try {
      const providerResponse =
        await getElectricityPlans();

      return res.json(
        providerResponse
      );
    } catch (error) {
      console.error(
        "Electricity providers error:",
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load electricity providers.",
      });
    }
  }
);


/* ============================================================
   VERIFY ELECTRICITY METER
   ============================================================ */

router.post(
  "/verify-electricity-meter",
  requireAuth,
  async (req, res) => {
    const {
      discoName,
      meterNumber,
    } = req.body;

    try {
      if (!discoName) {
        return res.status(400).json({
          success: false,

          message:
            "Electricity provider is required.",
        });
      }

      if (
        !meterNumber ||
        !/^\d{10,15}$/.test(
          String(meterNumber)
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid meter number.",
        });
      }

      if (
        isSandbox() &&
        String(meterNumber) !==
          "1111111111111"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Sandbox testing uses meter number 1111111111111.",
        });
      }

      const providerResponse =
        await verifyElectricityMeter({
          discoName:
            String(discoName),

          meterNumber:
            String(meterNumber),
        });

      return res.json(
        providerResponse
      );
    } catch (error) {
      console.error(
        "Electricity meter verification error:",
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to verify electricity meter.",
      });
    }
  }
);


/* ============================================================
   BUY ELECTRICITY
   ============================================================ */
router.post(
  "/buy-electricity",
  requireAuth,
  async (req, res) => {
    const userId = req.user.uid;

    const {
      discoName,
      meterNumber,
      meterType,
      amount,
      transactionPin,
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      const pinVerification =
        await verifyTransactionPin(
          userId,
          transactionPin
        );

      if (!pinVerification.success) {
        return res.status(401).json({
          success: false,
          message: pinVerification.message,
        });
      }

      if (!discoName) {
        return res.status(400).json({
          success: false,
          message:
            "Electricity provider is required.",
        });
      }

      if (
        !meterNumber ||
        !/^\d{10,15}$/.test(
          String(meterNumber)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid meter number.",
        });
      }

      if (
        isSandbox() &&
        String(meterNumber) !==
          "1111111111111"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses meter number 1111111111111.",
        });
      }

      const electricityAmount =
        Number(amount);

      if (
        !Number.isFinite(
          electricityAmount
        ) ||
        electricityAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid electricity amount.",
        });
      }

      if (
        !Number.isInteger(
          electricityAmount
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Electricity amount must be a whole number.",
        });
      }

      const pricing =
        calculateElectricityPrice(
          electricityAmount
        );

      const providerCost =
        pricing.providerCost;

      const sellingPrice =
        pricing.sellingPrice;

      const userRef = db
        .collection("users")
        .doc(userId);

      const normalizedMeterType =
        String(meterType)
          .toLowerCase() ===
        "postpaid"
          ? "postpaid"
          : "prepaid";

      orderRef = db
        .collection("electricityOrders")
        .doc();

      walletTransactionRef = db
        .collection("walletTransactions")
        .doc();

      requestId =
        generateRequestId();

      await db.runTransaction(
        async (transaction) => {
          const walletSnap =
            await transaction.get(
              userRef
            );

          if (!walletSnap.exists) {
            throw new Error(
              "USER_NOT_FOUND"
            );
          }

          const currentBalance =
            Number(
              walletSnap.data()?.wallet ||
                0
            );

          if (
            !Number.isFinite(
              currentBalance
            )
          ) {
            throw new Error(
              "INVALID_WALLET"
            );
          }

          if (
            WALLET_DEBIT_ENABLED &&
            currentBalance <
              sellingPrice
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            WALLET_DEBIT_ENABLED
              ? currentBalance -
                sellingPrice
              : currentBalance;

          if (WALLET_DEBIT_ENABLED) {
            transaction.update(
              userRef,
              {
                wallet:
                  newBalance,
                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }

          transaction.set(
            orderRef,
            {
              uid: userId,
              orderId:
                orderRef.id,
              requestId,
              service:
                "electricity",
              discoName:
                String(discoName),
              meterNumber:
                String(meterNumber),
              meterType:
                normalizedMeterType,
              amount:
                sellingPrice,
              providerAmount:
                providerCost,
              profit:
                sellingPrice -
                providerCost,
              debitStatus:
                WALLET_DEBIT_ENABLED
                  ? "debited"
                  : "not_debited",
              status:
                "processing",
              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            walletTransactionRef,
            {
              uid: userId,
              type: "debit",
              service:
                "electricity",
              amount:
                sellingPrice,
              orderId:
                orderRef.id,
              requestId,
              balanceBefore:
                currentBalance,
              balanceAfter:
                newBalance,
              status:
                "completed",
              description:
                `Electricity purchase - ${discoName}`,
              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      let providerResponse;

      try {
        providerResponse =
          await purchaseElectricity({
            discoName:
              String(discoName),
            meterNumber:
              String(meterNumber),
            meterType:
              normalizedMeterType,
            amount:
              providerCost,
          });
      } catch (providerError) {
        const providerErrorData =
          getProviderResponseFromError(
            providerError
          );

        console.error(
          "Electricity provider error:",
          providerErrorData ||
            providerError.message
        );

        if (
          providerErrorData &&
          isExplicitProviderFailure(
            providerErrorData
          )
        ) {
          const failedProviderTransactionId =
            getProviderTransactionId(
              providerErrorData
            );

          const failedProviderReference =
            getProviderReference(
              providerErrorData
            );

          await db.runTransaction(
            async (transaction) => {
              const userSnap =
                await transaction.get(
                  userRef
                );

              const orderSnap =
                await transaction.get(
                  orderRef
                );

              const ledgerSnap =
                await transaction.get(
                  walletTransactionRef
                );

              if (
                !userSnap.exists ||
                !orderSnap.exists ||
                !ledgerSnap.exists
              ) {
                throw new Error(
                  "REFUND_DATA_MISSING"
                );
              }

              const orderData =
                orderSnap.data();

              if (
                orderData.debitStatus ===
                "refunded"
              ) {
                return;
              }

              if (
                orderData.status ===
                "successful"
              ) {
                return;
              }

              const currentBalance =
                Number(
                  userSnap.data()?.wallet ||
                    0
                );

              const refundBalance =
                currentBalance +
                sellingPrice;

              transaction.update(
                userRef,
                {
                  wallet:
                    refundBalance,
                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              transaction.update(
                orderRef,
                {
                  status: "failed",
                  debitStatus:
                    "refunded",
                  providerTransactionId:
                    failedProviderTransactionId,
                  providerReference:
                    failedProviderReference,
                  providerResponse:
                    providerErrorData,
                  refundAmount:
                    sellingPrice,
                  failedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                  updatedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              transaction.update(
                walletTransactionRef,
                {
                  status: "refunded",
                  refundAmount:
                    sellingPrice,
                  balanceBeforeRefund:
                    currentBalance,
                  balanceAfterRefund:
                    refundBalance,
                  refundReason:
                    "Electricity provider rejected transaction",
                  refundedAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );

              const refundRef =
                db
                  .collection(
                    "walletTransactions"
                  )
                  .doc();

              transaction.set(
                refundRef,
                {
                  uid: userId,
                  type: "refund",
                  service:
                    "electricity",
                  amount:
                    sellingPrice,
                  orderId:
                    orderRef.id,
                  requestId,
                  balanceBefore:
                    currentBalance,
                  balanceAfter:
                    refundBalance,
                  status:
                    "completed",
                  description:
                    "Electricity purchase refund",
                  refundReason:
                    "Electricity provider rejected transaction",
                  providerTransactionId:
                    failedProviderTransactionId,
                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );
            }
          );

          return res.status(400).json({
            success: false,
            message:
              "Electricity purchase failed. Your wallet has been refunded.",
            requestId,
            orderId:
              orderRef.id,
          });
        }

        await orderRef.update({
          status: "unknown",
          providerError:
            providerErrorData ||
            providerError.message,
          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,
          pending: true,
          message:
            "Your electricity request is being checked. Please do not purchase again yet.",
          requestId,
          orderId:
            orderRef.id,
        });
      }

      const providerTransactionId =
        providerResponse?.transaction_id ||
        providerResponse?.transactionId ||
        providerResponse?.id ||
        providerResponse?.ident ||
        providerResponse?.data
          ?.transaction_id ||
        providerResponse?.data
          ?.transactionId ||
        providerResponse?.data?.id ||
        providerResponse?.data?.ident ||
        providerResponse?.data
          ?.transaction
          ?.transaction_id ||
        providerResponse?.data
          ?.transaction?.id ||
        providerResponse?.data
          ?.transaction?.ident ||
        null;

      console.log(
        "ELECTRICITY PROVIDER RESPONSE:",
        JSON.stringify(
          providerResponse,
          null,
          2
        )
      );

      console.log(
        "ELECTRICITY PROVIDER TRANSACTION ID:",
        providerTransactionId
      );

      const providerReference =
        getProviderReference(
          providerResponse
        );

      if (
        isExplicitProviderFailure(
          providerResponse
        )
      ) {
        await db.runTransaction(
          async (transaction) => {
            const userSnap =
              await transaction.get(
                userRef
              );

            const orderSnap =
              await transaction.get(
                orderRef
              );

            const ledgerSnap =
              await transaction.get(
                walletTransactionRef
              );

            if (
              !userSnap.exists ||
              !orderSnap.exists ||
              !ledgerSnap.exists
            ) {
              throw new Error(
                "REFUND_DATA_MISSING"
              );
            }

            const orderData =
              orderSnap.data();

            if (
              orderData.debitStatus ===
              "refunded"
            ) {
              return;
            }

            if (
              orderData.status ===
              "successful"
            ) {
              return;
            }

            const currentBalance =
              Number(
                userSnap.data()?.wallet ||
                  0
              );

            const refundBalance =
              currentBalance +
              sellingPrice;

            transaction.update(
              userRef,
              {
                wallet:
                  refundBalance,
                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

            transaction.update(
              orderRef,
              {
                status: "failed",
                debitStatus:
                  "refunded",
                providerTransactionId,
                providerReference,
                providerResponse,
                refundAmount:
                  sellingPrice,
                failedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

            transaction.update(
              walletTransactionRef,
              {
                status: "refunded",
                refundAmount:
                  sellingPrice,
                balanceBeforeRefund:
                  currentBalance,
                balanceAfterRefund:
                  refundBalance,
                refundReason:
                  "Electricity provider rejected transaction",
                refundedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

            const refundRef =
              db
                .collection(
                  "walletTransactions"
                )
                .doc();

            transaction.set(
              refundRef,
              {
                uid: userId,
                type: "refund",
                service:
                  "electricity",
                amount:
                  sellingPrice,
                orderId:
                  orderRef.id,
                requestId,
                balanceBefore:
                  currentBalance,
                balanceAfter:
                  refundBalance,
                status:
                  "completed",
                description:
                  "Electricity purchase refund",
                createdAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }
        );

        return res.status(400).json({
          success: false,
          message:
            "Electricity purchase failed. Your wallet has been refunded.",
          requestId,
          orderId:
            orderRef.id,
        });
      }

      if (
        !isSuccessfulProviderResponse(
          providerResponse
        )
      ) {
        await orderRef.update({
          status: "unknown",
          providerTransactionId,
          providerReference,
          providerResponse,
          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,
          pending: true,
          message:
            "Your electricity purchase is still being processed. Please do not purchase again yet.",
          requestId,
          orderId:
            orderRef.id,
        });
      }

      const electricityToken =
        providerResponse?.electricitytoken ||
        providerResponse?.token ||
        providerResponse?.data
          ?.electricitytoken ||
        providerResponse?.data?.token ||
        null;

      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status: "successful",
              providerTransactionId,
              providerReference,
              electricityToken,
              providerResponse,
              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
              updatedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            walletTransactionRef,
            {
              status: "successful",
              providerTransactionId,
              providerReference,
              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return res.json({
        success: true,
        message:
          "Electricity purchase successful.",
        requestId,
        orderId:
          orderRef.id,
        providerTransactionId,
        providerReference,
        token:
          electricityToken,
        amount:
          sellingPrice,
        meterNumber:
          String(meterNumber),
        meterType:
          normalizedMeterType,
      });
    } catch (error) {
      console.error(
        "Electricity purchase error:",
        error
      );

      if (
        error.message ===
        "USER_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User wallet was not found.",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient wallet balance.",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid wallet balance.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to process electricity purchase.",
        requestId,
        orderId:
          orderRef?.id || null,
      });
    }
  }
);

/* ============================================================
   CABLE TV PLANS
   ============================================================ */

router.get(
  "/cable-tv-plans",
  requireAuth,
  async (req, res) => {
    try {
      const providerResponse =
        await getCableTvPlans();

      return res.json(
        providerResponse
      );
    } catch (error) {
      console.error(
        "Cable TV plans error:",
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load Cable TV plans.",
      });
    }
  }
);


/* ============================================================
   VERIFY CABLE CUSTOMER
   ============================================================ */

router.post(
  "/verify-cable-customer",
  requireAuth,
  async (req, res) => {
    const {
      cableName,
      smartCardNumber,
    } = req.body;

    try {
      if (!cableName) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV provider is required.",
        });
      }

      if (!smartCardNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Smart card number is required.",
        });
      }

      const cleanSmartCardNumber =
        String(smartCardNumber).trim();

      if (
        !/^\d+$/.test(
          cleanSmartCardNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid smart card number.",
        });
      }

      if (
        isSandbox() &&
        cleanSmartCardNumber !==
          "1212121212"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses smart card number 1212121212.",
        });
      }

      

      if (!VTU_BASE_URL) {
        console.error(
          "VTU_BASE_URL is missing"
        );

        return res.status(500).json({
          success: false,
          message:
            "VTU base URL is not configured.",
        });
      }

      console.log(
        "CABLE CUSTOMER VERIFICATION REQUEST:",
        {
          cableName:
            String(cableName),
          smartCardNumber:
            cleanSmartCardNumber,
          baseUrl:
            VTU_BASE_URL,
        }
      );

      const axios = require("axios");

      const providerResponse =
        await axios.post(
          `${VTU_BASE_URL}/api/cablesub/verify/`,
          {
            cablename:
              String(cableName),

            smart_card_number:
              cleanSmartCardNumber,
          },
          {
            headers: {
              Authorization:
                `Token ${VTU_API_KEY}`,

              "Content-Type":
                "application/json",
            },

            timeout: 30000,
          }
        );

      console.log(
        "CABLE CUSTOMER VERIFICATION RESPONSE:",
        JSON.stringify(
          providerResponse.data,
          null,
          2
        )
      );

      const data =
        providerResponse.data;

      const status = String(
        data?.status ||
          data?.Status ||
          ""
      ).toLowerCase();

      if (
        status === "success" ||
        status === "successful"
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Cable TV customer verified successfully.",
          data,
        });
      }

      return res.status(400).json({
        success: false,
        message:
          data?.api_response ||
          data?.message ||
          "Cable TV customer verification failed.",
        data,
      });
    } catch (error) {
      console.error(
        "CABLE CUSTOMER VERIFICATION ERROR:",
        error.response?.data ||
          error.message
      );

       console.error(
  "CABLE VERIFICATION FULL ERROR:",
  error
);

console.error(
  "CABLE VERIFICATION RESPONSE:",
  error.response?.data
);

console.error(
  "CABLE VERIFICATION STATUS:",
  error.response?.status
);

return res.status(500).json({
  success: false,

  message:
    error.response?.data?.message ||
    error.response?.data?.api_response ||
    "Unable to verify Cable TV customer.",
});
    }
  }
);

/* ============================================================
   BUY CABLE TV
   ============================================================ */

router.post(
  "/buy-cable-tv",
  requireAuth,
  async (req, res) => {
    const uid =
      req.user.uid;

    const {
      cableName,
      smartCardNumber,
      cablePlan,
      amount,
      transactionPin,
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      // Verify Transaction PIN before doing anything
      // that can debit the user's wallet.
      const pinVerification =
        await verifyTransactionPin(
          uid,
          transactionPin
        );

      if (!pinVerification.success) {
        return res.status(401).json({
          success: false,
          message:
            pinVerification.message,
        });
      }

      if (!cableName) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV provider is required.",
        });
      }

      if (!smartCardNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Smart card number is required.",
        });
      }

      if (!cablePlan) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV plan is required.",
        });
      }

      const cleanSmartCardNumber =
        String(
          smartCardNumber
        ).trim();

      if (
        !/^\d+$/.test(
          cleanSmartCardNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid smart card number.",
        });
      }

      if (
        isSandbox() &&
        cleanSmartCardNumber !==
          "1212121212"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses smart card number 1212121212.",
        });
      }

      const purchaseAmount =
        Number(amount);

      if (
        !Number.isFinite(
          purchaseAmount
        ) ||
        purchaseAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Cable TV amount.",
        });
      }

      if (
        !Number.isInteger(
          purchaseAmount
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV amount must be a whole number.",
        });
      }

      const userRef =
        db
          .collection("users")
          .doc(uid);

      orderRef =
        db
          .collection(
            "cableTvOrders"
          )
          .doc();

      walletTransactionRef =
        db
          .collection(
            "walletTransactions"
          )
          .doc();

      requestId =
        generateRequestId();

      await db.runTransaction(
        async (transaction) => {
          const userSnap =
            await transaction.get(
              userRef
            );

          if (!userSnap.exists) {
            throw new Error(
              "USER_NOT_FOUND"
            );
          }

          const balance =
            Number(
              userSnap.data()
                ?.wallet || 0
            );

          if (
            !Number.isFinite(
              balance
            )
          ) {
            throw new Error(
              "INVALID_WALLET"
            );
          }

          if (
            WALLET_DEBIT_ENABLED &&
            balance <
              purchaseAmount
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            WALLET_DEBIT_ENABLED
              ? balance -
                purchaseAmount
              : balance;

          if (
            WALLET_DEBIT_ENABLED
          ) {
            transaction.update(
              userRef,
              {
                wallet:
                  newBalance,

                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }

          transaction.set(
            orderRef,
            {
              uid,

              orderId:
                orderRef.id,

              requestId,

              service:
                "cabletv",

              cableName:
                String(cableName),

              smartCardNumber:
                cleanSmartCardNumber,

              cablePlan:
                String(cablePlan),

              amount:
                purchaseAmount,

              debitStatus:
                WALLET_DEBIT_ENABLED
                  ? "debited"
                  : "not_debited",

              status:
                "processing",

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            walletTransactionRef,
            {
              uid,

              type:
                "debit",

              service:
                "cabletv",

              amount:
                purchaseAmount,

              orderId:
                orderRef.id,

              requestId,

              balanceBefore:
                balance,

              balanceAfter:
                newBalance,

              status:
                "completed",

              description:
                `Cable TV purchase - ${cableName}`,

              createdAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      let providerResponse;

      try {
        providerResponse =
          await purchaseCableTv({
            cableName:
              String(cableName),

            smartCardNumber:
              cleanSmartCardNumber,

            cablePlan:
              String(cablePlan),
          });
      } catch (providerError) {
        const providerErrorData =
          getProviderResponseFromError(
            providerError
          );

        console.error(
          "Cable TV provider error:",
          providerErrorData ||
            providerError.message
        );

        if (
          providerErrorData &&
          isExplicitProviderFailure(
            providerErrorData
          )
        ) {
          await refundOrder({
            orderRef,

            walletTransactionRef,

            userRef,

            uid,

            service:
              "cabletv",

            refundAmount:
              purchaseAmount,

            requestId,

            reason:
              "Cable TV provider rejected transaction",
          });

          return res.status(400).json({
            success: false,

            message:
              "Cable TV purchase failed. Your wallet has been refunded.",

            requestId,

            orderId:
              orderRef.id,
          });
        }

        await orderRef.update({
          status:
            "unknown",

          providerError:
            providerErrorData ||
            providerError.message,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your Cable TV request is being checked. Please do not purchase again yet.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      const providerTransactionId =
        getProviderTransactionId(
          providerResponse
        );

      const providerReference =
        getProviderReference(
          providerResponse
        );

      if (
        isExplicitProviderFailure(
          providerResponse
        )
      ) {
        await refundOrder({
          orderRef,

          walletTransactionRef,

          userRef,

          uid,

          service:
            "cabletv",

          refundAmount:
            purchaseAmount,

          requestId,

          reason:
            "Cable TV provider rejected transaction",
        });

        await orderRef.update({
          providerTransactionId,

          providerReference,

          providerResponse,
        });

        return res.status(400).json({
          success: false,

          message:
            "Cable TV purchase failed. Your wallet has been refunded.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      if (
        !isSuccessfulProviderResponse(
          providerResponse
        )
      ) {
        await orderRef.update({
          status:
            "unknown",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your Cable TV purchase is still being processed. Please do not purchase again yet.",

          requestId,

          orderId:
            orderRef.id,
        });
      }

      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status:
                "successful",

              providerTransactionId,

              providerReference,

              providerResponse,

              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.update(
            walletTransactionRef,
            {
              status:
                "successful",

              providerTransactionId,

              providerReference,

              completedAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      return res.json({
        success: true,

        message:
          "Cable TV subscription successful.",

        requestId,

        orderId:
          orderRef.id,

        amount:
          purchaseAmount,

        providerReference,

        providerTransactionId,

        data:
          providerResponse,
      });
    } catch (error) {
      console.error(
        "Cable TV purchase error:",
        error
      );

      if (
        error.message ===
        "USER_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Insufficient wallet balance.",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid wallet balance.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to process Cable TV purchase.",

        requestId,

        orderId:
          orderRef?.id || null,
      });
    }
  }
);

module.exports = router;