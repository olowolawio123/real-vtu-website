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

const VTU_PROVIDER =
  String(
    process.env.VTU_PROVIDER || "vtunaija"
  )
    .trim()
    .toLowerCase();

/* ============================================================
   HELPERS
   ============================================================ */

function generateRequestId() {
  return `VTU-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

/*
 * IMPORTANT:
 * Sandbox restrictions apply ONLY to VTU Naija sandbox.
 *
 * CheapDataHub does not use VTU Naija's sandbox test numbers.
 */
function isVtuNaijaSandbox() {
  return (
    VTU_PROVIDER === "vtunaija" &&
    VTU_MODE === "sandbox"
  );
}

function getCustomerPhone(userData = {}) {
  const possiblePhones = [
    userData.phone,
    userData.phoneNumber,
    userData.mobile,
    userData.mobileNumber,
    userData.telephone,
  ];

  const phone = possiblePhones.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );

  return phone
    ? String(phone).trim()
    : null;
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
    status === "success" ||
    status === "true"
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
    status === "rejected" ||
    status === "false"
  );
}

function getProviderResponseFromError(error) {
  return (
    error?.providerResponse ||
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
    response?.reference ||
    response?.data?.transaction_id ||
    response?.data?.transactionId ||
    response?.data?.id ||
    response?.data?.ident ||
    response?.data?.reference ||
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
        await transaction.get(userRef);

      const orderSnap =
        await transaction.get(orderRef);

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
        providerResponse?.dataplans ||
        providerResponse?.data ||
        [];

      const dynamicPlans =
        providerPlans.map(
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

              provider:
                VTU_PROVIDER,
            };
          }
        );

      return res.json({
        success: true,

        provider:
          VTU_PROVIDER,

        dataplans:
          dynamicPlans,
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
      /* --------------------------------------------------------
         TRANSACTION PIN
         -------------------------------------------------------- */

      const pinVerification =
        await verifyTransactionPin(
          uid,
          transactionPin
        );

      if (
        !pinVerification.success
      ) {
        return res.status(401).json({
          success: false,
          message:
            pinVerification.message,
        });
      }

      /* --------------------------------------------------------
         VALIDATION
         -------------------------------------------------------- */

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

      /*
       * ONLY VTU NAIJA SANDBOX uses this test number.
       */
      if (
  VTU_PROVIDER === "vtunaija" &&
  isVtuNaijaSandbox() &&
  String(mobileNumber) !== "08011111111"
) {
  return res.status(400).json({
    success: false,
    message:
      "VTU Naija sandbox testing requires the number 08011111111.",
  });
}

      if (!plan) {
        return res.status(400).json({
          success: false,
          message:
            "Data plan is required.",
        });
      }

      /* --------------------------------------------------------
         FIND PLAN
         -------------------------------------------------------- */

      const plansResponse =
        await getDataPlans();

      const plans =
        plansResponse?.dataplans ||
        plansResponse?.data ||
        [];

      const requestedPlan =
        String(plan).trim();

      const selectedPlan =
        plans.find(
          (item) => {
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
                value !==
                  undefined &&
                value !== null &&
                String(value).trim() ===
                  requestedPlan
            );
          }
        );

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

      /* --------------------------------------------------------
         FIRESTORE REFERENCES
         -------------------------------------------------------- */

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

      /* --------------------------------------------------------
         DEBIT WALLET
         -------------------------------------------------------- */

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

              provider:
                VTU_PROVIDER,

              network:
                normalizedNetwork,

              networkId,

              mobileNumber:
                String(
                  mobileNumber
                ),

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

              provider:
                VTU_PROVIDER,

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

      /* --------------------------------------------------------
         PROVIDER PURCHASE
         -------------------------------------------------------- */

      let providerResponse;

      try {
        providerResponse =
  await purchaseData({
    network:
      VTU_PROVIDER === "cheapdatahub"
        ? normalizedNetwork.toLowerCase()
        : networkId,

    mobileNumber:
      String(
        mobileNumber
      ),

    plan:
      String(plan),

    requestId,
  });
      } catch (
        providerError
      ) {
        const providerErrorData =
          getProviderResponseFromError(
            providerError
          );

        console.error(
          "Data provider error:",
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

      /* --------------------------------------------------------
         PROVIDER RESULT
         -------------------------------------------------------- */

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

      /* --------------------------------------------------------
         SUCCESS
         -------------------------------------------------------- */

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
    const uid = req.user.uid;

    const {
      network,
      mobileNumber,
      amount,
      transactionPin,
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      // =========================================================
      // VERIFY TRANSACTION PIN
      // =========================================================

      const pinVerification =
        await verifyTransactionPin(
          uid,
          transactionPin
        );

      if (!pinVerification.success) {
        return res.status(401).json({
          success: false,
          message: pinVerification.message,
        });
      }

      // =========================================================
      // VALIDATE NETWORK
      // =========================================================

      if (!network) {
        return res.status(400).json({
          success: false,
          message: "Network is required.",
        });
      }

      const normalizedNetwork =
        String(network)
          .trim()
          .toUpperCase();

      const networkId =
        NETWORK_IDS[normalizedNetwork];

      if (!networkId) {
        return res.status(400).json({
          success: false,
          message: "Invalid network.",
        });
      }

      // =========================================================
      // VALIDATE PHONE
      // =========================================================

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

      // =========================================================
      // VTU NAIJA SANDBOX RESTRICTION
      // ONLY APPLIES TO VTU NAIJA SANDBOX
      // =========================================================

      if (
        VTU_PROVIDER === "vtunaija" &&
        isVtuNaijaSandbox() &&
        String(mobileNumber) !==
          "08011111111"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "VTU Naija sandbox testing requires the number 08011111111.",
        });
      }

      // =========================================================
      // VALIDATE AMOUNT
      // =========================================================

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

      // =========================================================
      // FIRESTORE REFERENCES
      // =========================================================

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
          .collection("walletTransactions")
          .doc();

      requestId =
        generateRequestId();

      // =========================================================
      // DEBIT USER WALLET
      // =========================================================

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

          // -----------------------------------------------
          // UPDATE WALLET
          // -----------------------------------------------

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

          // -----------------------------------------------
          // CREATE AIRTIME ORDER
          // -----------------------------------------------

          transaction.set(
            orderRef,
            {
              uid,

              orderId:
                orderRef.id,

              requestId,

              service:
                "airtime",

              provider:
                VTU_PROVIDER,

              network:
                normalizedNetwork,

              networkId,

              mobileNumber:
                String(
                  mobileNumber
                ),

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

          // -----------------------------------------------
          // CREATE WALLET TRANSACTION
          // -----------------------------------------------

          transaction.set(
            walletTransactionRef,
            {
              uid,

              type:
                "debit",

              service:
                "airtime",

              provider:
                VTU_PROVIDER,

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

      // =========================================================
      // SEND REQUEST TO PROVIDER
      // =========================================================

      let providerResponse;

      try {
        providerResponse =
          await purchaseAirtime({
            network:
              VTU_PROVIDER ===
              "cheapdatahub"
                ? normalizedNetwork.toLowerCase()
                : networkId,

            mobileNumber:
              String(
                mobileNumber
              ),

            amount:
              purchaseAmount,

            requestId,
          });

        console.log(
          "Airtime provider response:",
          JSON.stringify(
            providerResponse,
            null,
            2
          )
        );
      } catch (
        providerError
      ) {
        const providerErrorData =
          getProviderResponseFromError(
            providerError
          );

        console.error(
          "Airtime provider error:",
          providerErrorData ||
            providerError.message
        );

        // =====================================================
        // EXPLICIT PROVIDER FAILURE → REFUND
        // =====================================================

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

        // =====================================================
        // PROVIDER RESPONSE UNKNOWN
        // =====================================================

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

      // =========================================================
      // GET PROVIDER REFERENCE
      // =========================================================

      const providerTransactionId =
        getProviderTransactionId(
          providerResponse
        );

      const providerReference =
        getProviderReference(
          providerResponse
        );

      // =========================================================
      // DETECT CHEAPDATAHUB STATUS
      // =========================================================

      const providerStatus = String(
        providerResponse?.status ??
        providerResponse?.Status ??
        providerResponse?.data?.status ??
        providerResponse?.data?.Status ??
        ""
      )
        .trim()
        .toLowerCase();

      const providerSuccess =
        providerResponse?.success === true ||
        providerResponse?.data?.success === true;

      const cheapDataHubSuccess =
        VTU_PROVIDER ===
          "cheapdatahub" &&
        (
          providerStatus ===
            "true" ||
          providerStatus ===
            "successful" ||
          providerStatus ===
            "success" ||
          providerSuccess === true
        );

      // =========================================================
      // EXPLICIT PROVIDER FAILURE
      // =========================================================

      if (
        isExplicitProviderFailure(
          providerResponse
        ) &&
        !cheapDataHubSuccess
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

          status:
            "failed",

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
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

      // =========================================================
      // DETERMINE FINAL SUCCESS
      //
      // CheapDataHub gets an explicit success check here.
      // =========================================================

      const genericSuccess =
        isSuccessfulProviderResponse(
          providerResponse
        );

      const transactionSuccessful =
        cheapDataHubSuccess ||
        genericSuccess;

      // =========================================================
      // STILL PROCESSING / UNKNOWN
      // =========================================================

      if (
        !transactionSuccessful
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

      // =========================================================
      // MARK ORDER SUCCESSFUL
      // =========================================================

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

      // =========================================================
      // SUCCESS RESPONSE
      // =========================================================

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

      // =========================================================
      // USER NOT FOUND
      // =========================================================

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

      // =========================================================
      // INSUFFICIENT BALANCE
      // =========================================================

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

      // =========================================================
      // INVALID WALLET
      // =========================================================

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

      // =========================================================
      // GENERIC ERROR
      // =========================================================

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
  meterType,
  amount,
  transactionPin,
  phone,
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
        isVtuNaijaSandbox() &&
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

/*
 * CheapDataHub currently does not expose
 * a public electricity meter verification
 * endpoint in its reseller API.
 *
 * The actual meter validation happens
 * during the purchase request.
 */
if (
  VTU_PROVIDER === "cheapdatahub" &&
  providerResponse?.verificationUnavailable
) {
  return res.status(200).json({
    success: true,

    provider:
      "cheapdatahub",

    verificationUnavailable:
      true,

    message:
      providerResponse.message ||
      "Meter verification will be completed during purchase.",

    data:
      providerResponse.data || null,
  });
}

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
      phone,
      amount,
      transactionPin,
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      // VERIFY TRANSACTION PIN
      const pinVerification = await verifyTransactionPin(
        userId,
        transactionPin
      );

      if (!pinVerification.success) {
        return res.status(401).json({
          success: false,
          message: pinVerification.message,
        });
      }

      // BASIC VALIDATION
      if (!discoName) {
        return res.status(400).json({
          success: false,
          message: "Electricity provider is required.",
        });
      }

      if (
        !meterNumber ||
        !/^\d{10,15}$/.test(String(meterNumber))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid meter number.",
        });
      }

      // PHONE NUMBER ENTERED BY CUSTOMER
      const customerPhone = String(phone || "").trim();

      if (!/^0\d{10}$/.test(customerPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 11-digit Nigerian phone number.",
        });
      }

      // VTU NAIJA SANDBOX ONLY
      if (
        isVtuNaijaSandbox() &&
        String(meterNumber) !== "1111111111111"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses meter number 1111111111111.",
        });
      }

      // ELECTRICITY AMOUNT
      const electricityAmount = Number(amount);

      if (
        !Number.isFinite(electricityAmount) ||
        electricityAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid electricity amount.",
        });
      }

      if (!Number.isInteger(electricityAmount)) {
        return res.status(400).json({
          success: false,
          message:
            "Electricity amount must be a whole number.",
        });
      }

      // CALCULATE PRICE
      const pricing = calculateElectricityPrice(
        electricityAmount
      );

      const providerCost = pricing.providerCost;
      const sellingPrice = pricing.sellingPrice;

      // FIRESTORE REFERENCES
      const userRef = db
        .collection("users")
        .doc(userId);

      const normalizedMeterType =
        String(meterType).toLowerCase() === "postpaid"
          ? "postpaid"
          : "prepaid";

      orderRef = db
        .collection("electricityOrders")
        .doc();

      walletTransactionRef = db
        .collection("walletTransactions")
        .doc();

      requestId = generateRequestId();

      // DEBIT WALLET + CREATE PROCESSING ORDER
      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) {
          throw new Error("USER_NOT_FOUND");
        }

        const userData = userSnap.data() || {};

        const currentBalance = Number(
          userData.wallet || 0
        );

        if (!Number.isFinite(currentBalance)) {
          throw new Error("INVALID_WALLET");
        }

        if (
          WALLET_DEBIT_ENABLED &&
          currentBalance < sellingPrice
        ) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const newBalance = WALLET_DEBIT_ENABLED
          ? currentBalance - sellingPrice
          : currentBalance;

        // DEBIT USER WALLET
        if (WALLET_DEBIT_ENABLED) {
          transaction.update(userRef, {
            wallet: newBalance,
            updatedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // CREATE ELECTRICITY ORDER
        transaction.set(orderRef, {
          uid: userId,
          orderId: orderRef.id,
          requestId,
          service: "electricity",
          provider: VTU_PROVIDER,

          discoName: String(discoName).trim(),

          meterNumber: String(meterNumber).trim(),

          meterType: normalizedMeterType,

          customerPhone: customerPhone,

          amount: sellingPrice,

          providerAmount: providerCost,

          profit: sellingPrice - providerCost,

          debitStatus: WALLET_DEBIT_ENABLED
            ? "debited"
            : "not_debited",

          status: "processing",

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        // CREATE WALLET TRANSACTION
        transaction.set(walletTransactionRef, {
          uid: userId,

          type: "debit",

          service: "electricity",

          provider: VTU_PROVIDER,

          amount: sellingPrice,

          orderId: orderRef.id,

          requestId,

          balanceBefore: currentBalance,

          balanceAfter: newBalance,

          status: "completed",

          description:
            `Electricity purchase - ${discoName}`,

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // LOG CUSTOMER PHONE
      console.log("Electricity customer:", {
        userId,
        phone: "present",
        provider: VTU_PROVIDER,
        meterNumber: String(meterNumber),
        discoName: String(discoName),
      });

      // CALL ELECTRICITY PROVIDER
      let providerResponse;

      try {
        providerResponse = await purchaseElectricity({
          discoName: String(discoName),

          meterNumber: String(meterNumber),

          meterType: normalizedMeterType,

          amount: providerCost,

          phone: customerPhone,
        });
      } catch (providerError) {
        const providerErrorData =
          getProviderResponseFromError(providerError);

        console.error(
          "Electricity provider error:",
          JSON.stringify(
            providerErrorData || providerError.message,
            null,
            2
          )
        );

        // PROVIDER EXPLICIT FAILURE
        if (
          providerErrorData &&
          isExplicitProviderFailure(providerErrorData)
        ) {
          await refundOrder({
            orderRef,

            walletTransactionRef,

            userRef,

            uid: userId,

            service: "electricity",

            refundAmount: sellingPrice,

            requestId,

            reason:
              "Electricity provider rejected transaction",
          });

          return res.status(400).json({
            success: false,

            message:
              "Electricity purchase failed. Your wallet has been refunded.",

            providerResponse: providerErrorData,

            requestId,

            orderId: orderRef.id,
          });
        }

        // UNKNOWN PROVIDER RESPONSE
        await orderRef.update({
          status: "unknown",

          providerError:
            providerErrorData || providerError.message,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your electricity request is being checked. Please do not purchase again yet.",

          requestId,

          orderId: orderRef.id,
        });
      }

      // LOG PROVIDER RESPONSE
      console.log(
        "ELECTRICITY PROVIDER RESPONSE:",
        JSON.stringify(providerResponse, null, 2)
      );

      // PROVIDER DETAILS
      const providerTransactionId =
        getProviderTransactionId(providerResponse);

      const providerReference =
        getProviderReference(providerResponse);

      // EXTRACT TOKEN
      const electricityToken =
        providerResponse?.electricitytoken ||
        providerResponse?.token ||
        providerResponse?.data?.electricitytoken ||
        providerResponse?.data?.token ||
        null;

      // EXTRACT UNITS
      const electricityUnits =
        providerResponse?.units ||
        providerResponse?.data?.units ||
        null;

      // PROVIDER FAILURE CHECK
      if (
        isExplicitProviderFailure(providerResponse)
      ) {
        console.error(
          "Electricity provider rejected transaction:",
          JSON.stringify(providerResponse, null, 2)
        );

        await refundOrder({
          orderRef,

          walletTransactionRef,

          userRef,

          uid: userId,

          service: "electricity",

          refundAmount: sellingPrice,

          requestId,

          reason:
            "Electricity provider rejected transaction",
        });

        await orderRef.update({
          status: "failed",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(400).json({
          success: false,

          message:
            "Electricity purchase failed. Your wallet has been refunded.",

          providerResponse,

          requestId,

          orderId: orderRef.id,
        });
      }

      // SUCCESS CHECK
      const providerSuccess =
        isSuccessfulProviderResponse(providerResponse);

      // CHEAPDATAHUB SUCCESS CHECK
      const cheapDataHubSuccess =
        VTU_PROVIDER === "cheapdatahub" &&
        (
          providerResponse?.status === true ||
          String(
            providerResponse?.status
          ).toLowerCase() === "true" ||
          String(
            providerResponse?.Status
          ).toLowerCase() === "successful"
        );

      const confirmedSuccess =
        providerSuccess || cheapDataHubSuccess;

      // PROVIDER DID NOT CONFIRM SUCCESS
      if (!confirmedSuccess) {
        await orderRef.update({
          status: "unknown",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your electricity purchase is still being processed. Please do not purchase again yet.",

          providerResponse,

          requestId,

          orderId: orderRef.id,
        });
      }

      // PREPAID MUST HAVE TOKEN
      if (
        normalizedMeterType === "prepaid" &&
        !electricityToken
      ) {
        console.error(
          "Provider reported success but no electricity token was returned:",
          JSON.stringify(providerResponse, null, 2)
        );

        await orderRef.update({
          status: "unknown",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "The provider reported the request was received, but no electricity token has been returned yet. Please do not purchase again.",

          providerTransactionId,

          providerReference,

          requestId,

          orderId: orderRef.id,
        });
      }

      // CONFIRMED SUCCESS
      await db.runTransaction(async (transaction) => {
        transaction.update(orderRef, {
          status: "successful",

          providerTransactionId,

          providerReference,

          electricityToken,

          electricityUnits,

          providerResponse,

          completedAt:
            admin.firestore.FieldValue.serverTimestamp(),

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(walletTransactionRef, {
          status: "successful",

          providerTransactionId,

          providerReference,

          completedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // RETURN SUCCESS
      return res.json({
        success: true,

        message:
          "Electricity purchase successful.",

        requestId,

        orderId: orderRef.id,

        providerTransactionId,

        providerReference,

        token: electricityToken,

        units: electricityUnits,

        amount: sellingPrice,

        meterNumber: String(meterNumber),

        meterType: normalizedMeterType,
      });
    } catch (error) {
      console.error(
        "Electricity purchase error:",
        error
      );

      if (
        error.message === "USER_NOT_FOUND"
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
        error.message === "INVALID_WALLET"
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

      /*
       * ONLY VTU NAIJA SANDBOX uses this test card.
       */
      if (
        isVtuNaijaSandbox() &&
        cleanSmartCardNumber !==
          "1212121212"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Sandbox testing uses smart card number 1212121212.",
        });
      }

      /*
       * IMPORTANT:
       * Use the service abstraction.
       *
       * Do not call VTU Naija directly from this route.
       */
      const providerResponse =
        await verifyCableCustomer({
          cableName:
            String(cableName),

          smartCardNumber:
            cleanSmartCardNumber,
        });

      /*
 * CheapDataHub currently does not expose
 * a public cable customer verification
 * endpoint in its reseller API.
 *
 * The smart card will be validated during
 * the actual purchase request.
 */
if (
  VTU_PROVIDER === "cheapdatahub" &&
  providerResponse?.verificationUnavailable
) {
  return res.status(200).json({
    success: true,

    provider:
      "cheapdatahub",

    verificationUnavailable:
      true,

    message:
      providerResponse.message ||
      "Smart card validation will be completed during purchase.",

    data:
      providerResponse.data || null,
  });
}

const status =
  String(
    providerResponse?.status ||
      providerResponse?.Status ||
      providerResponse?.data
        ?.status ||
      providerResponse?.data
        ?.Status ||
      ""
  ).toLowerCase();

if (
  status === "success" ||
  status === "successful" ||
  status === "true"
) {
  return res.status(200).json({
    success: true,

    message:
      "Cable TV customer verified successfully.",

    data:
      providerResponse,
  });
}
      return res.status(400).json({
        success: false,

        message:
          providerResponse?.api_response ||
          providerResponse?.message ||
          providerResponse?.data
            ?.message ||
          "Cable TV customer verification failed.",

        data:
          providerResponse,
      });
    } catch (error) {
      console.error(
        "Cable customer verification error:",
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,

        message:
          error.response?.data
            ?.message ||
          error.response?.data
            ?.api_response ||
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
    const uid = req.user.uid;

    const {
      cableName,
      smartCardNumber,
      cablePlan,
      amount,
      transactionPin,
      phone,
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      const pinVerification = await verifyTransactionPin(
        uid,
        transactionPin
      );

      if (!pinVerification.success) {
        return res.status(401).json({
          success: false,
          message: pinVerification.message,
        });
      }

      if (!cableName) {
        return res.status(400).json({
          success: false,
          message: "Cable TV provider is required.",
        });
      }

      if (!smartCardNumber) {
        return res.status(400).json({
          success: false,
          message: "Smart card number is required.",
        });
      }

      if (!cablePlan) {
        return res.status(400).json({
          success: false,
          message: "Cable TV plan is required.",
        });
      }

      const cleanSmartCardNumber = String(
        smartCardNumber
      ).trim();

      if (!/^\d+$/.test(cleanSmartCardNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid smart card number.",
        });
      }

      /*
       * CheapDataHub is live-only and does not use
       * the VTU Naija sandbox smart-card number.
       *
       * Only enforce 1212121212 when actually using
       * VTU Naija sandbox.
       */
      if (
        VTU_PROVIDER !== "cheapdatahub" &&
        isVtuNaijaSandbox() &&
        cleanSmartCardNumber !== "1212121212"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses smart card number 1212121212.",
        });
      }

      /*
       * CheapDataHub requires a phone number
       * for cable purchases.
       */
      let customerPhone = null;

      if (VTU_PROVIDER === "cheapdatahub") {
        customerPhone = String(phone || "").trim();

        if (!customerPhone) {
          return res.status(400).json({
            success: false,
            message:
              "Customer phone number is required.",
          });
        }

        if (!/^\d{10,15}$/.test(customerPhone)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid customer phone number.",
          });
        }
      }

      const purchaseAmount = Number(amount);

      if (
        !Number.isFinite(purchaseAmount) ||
        purchaseAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid Cable TV amount.",
        });
      }

      if (!Number.isInteger(purchaseAmount)) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV amount must be a whole number.",
        });
      }

      const userRef = db
        .collection("users")
        .doc(uid);

      orderRef = db
        .collection("cableTvOrders")
        .doc();

      walletTransactionRef = db
        .collection("walletTransactions")
        .doc();

      requestId = generateRequestId();

      /*
       * Debit wallet and create order.
       */
      await db.runTransaction(
        async (transaction) => {
          const userSnap = await transaction.get(
            userRef
          );

          if (!userSnap.exists) {
            throw new Error("USER_NOT_FOUND");
          }

          const userData = userSnap.data() || {};

          const balance = Number(
            userData.wallet || 0
          );

          if (!Number.isFinite(balance)) {
            throw new Error("INVALID_WALLET");
          }

          if (
            WALLET_DEBIT_ENABLED &&
            balance < purchaseAmount
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            WALLET_DEBIT_ENABLED
              ? balance - purchaseAmount
              : balance;

          if (WALLET_DEBIT_ENABLED) {
            transaction.update(
              userRef,
              {
                wallet: newBalance,

                updatedAt:
                  admin.firestore.FieldValue
                    .serverTimestamp(),
              }
            );
          }

          transaction.set(
            orderRef,
            {
              uid,

              orderId: orderRef.id,

              requestId,

              service: "cabletv",

              provider: VTU_PROVIDER,

              cableName: String(cableName),

              smartCardNumber:
                cleanSmartCardNumber,

              cablePlan: String(cablePlan),

              amount: purchaseAmount,

              customerPhone:
                customerPhone || null,

              debitStatus:
                WALLET_DEBIT_ENABLED
                  ? "debited"
                  : "not_debited",

              status: "processing",

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            }
          );

          transaction.set(
            walletTransactionRef,
            {
              uid,

              type: "debit",

              service: "cabletv",

              provider: VTU_PROVIDER,

              amount: purchaseAmount,

              orderId: orderRef.id,

              requestId,

              balanceBefore: balance,

              balanceAfter: newBalance,

              status: "completed",

              description:
                `Cable TV purchase - ${cableName}`,

              createdAt:
                admin.firestore.FieldValue
                  .serverTimestamp(),
            }
          );
        }
      );

      /*
       * Send purchase to provider.
       */
      let providerResponse;

      try {
        providerResponse = await purchaseCableTv({
          cableName: String(cableName),

          smartCardNumber:
            cleanSmartCardNumber,

          cablePlan: String(cablePlan),

          phone: customerPhone,
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

        /*
         * Explicit provider failure:
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

            service: "cabletv",

            refundAmount: purchaseAmount,

            requestId,

            reason:
              "Cable TV provider rejected transaction",
          });

          return res.status(400).json({
            success: false,

            message:
              "Cable TV purchase failed. Your wallet has been refunded.",

            requestId,

            orderId: orderRef.id,
          });
        }

        /*
         * Unknown provider/network error.
         * Keep transaction pending rather than
         * immediately risking a duplicate purchase.
         */
        await orderRef.update({
          status: "unknown",

          providerError:
            providerErrorData ||
            providerError.message,

          updatedAt:
            admin.firestore.FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your Cable TV request is being checked. Please do not purchase again yet.",

          requestId,

          orderId: orderRef.id,
        });
      }

      console.log(
        "Cable TV provider response:",
        JSON.stringify(
          providerResponse,
          null,
          2
        )
      );

      const providerTransactionId =
        getProviderTransactionId(
          providerResponse
        );

      const providerReference =
        getProviderReference(
          providerResponse
        );

      /*
       * Explicit provider failure.
       */
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

          service: "cabletv",

          refundAmount: purchaseAmount,

          requestId,

          reason:
            "Cable TV provider rejected transaction",
        });

        await orderRef.update({
          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore.FieldValue
              .serverTimestamp(),
        });

        return res.status(400).json({
          success: false,

          message:
            "Cable TV purchase failed. Your wallet has been refunded.",

          requestId,

          orderId: orderRef.id,
        });
      }

      /*
       * CheapDataHub successful response:
       *
       * {
       *   status: "true",
       *   message: "Cable subscription successful",
       *   reference: "CDH987654"
       * }
       */
      const cheapDataHubSuccess =
        VTU_PROVIDER === "cheapdatahub" &&
        (
          providerResponse?.status === true ||
          String(
            providerResponse?.status || ""
          ).toLowerCase() === "true"
        );

      const providerSuccessful =
        cheapDataHubSuccess ||
        isSuccessfulProviderResponse(
          providerResponse
        );

      /*
       * Provider did not clearly confirm success.
       */
      if (!providerSuccessful) {
        await orderRef.update({
          status: "unknown",

          providerTransactionId,

          providerReference,

          providerResponse,

          updatedAt:
            admin.firestore.FieldValue
              .serverTimestamp(),
        });

        return res.status(202).json({
          success: false,

          pending: true,

          message:
            "Your Cable TV purchase is still being processed. Please do not purchase again yet.",

          requestId,

          orderId: orderRef.id,
        });
      }

      /*
       * Mark successful.
       */
      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status: "successful",

              providerTransactionId,

              providerReference,

              providerResponse,

              completedAt:
                admin.firestore.FieldValue
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
                admin.firestore.FieldValue
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

        orderId: orderRef.id,

        amount: purchaseAmount,

        providerReference,

        providerTransactionId,

        data: providerResponse,
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