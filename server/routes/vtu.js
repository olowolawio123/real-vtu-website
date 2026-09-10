const express = require("express");
const admin = require("firebase-admin");

const requireAuth = require("../middleware/authMiddleware");

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
  return /^\d{11}$/.test(String(number || ""));
}

function isSuccessfulProviderResponse(response) {
  const status = String(
    response?.Status ||
      response?.status ||
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
      ""
  ).toLowerCase();

  return (
    status === "failed" ||
    status === "fail" ||
    status === "error" ||
    status === "rejected"
  );
}

/* ============================================================
   DATA PLANS
   ============================================================ */

router.get(
  "/data-plans",
  async (req, res) => {
    try {
      const data =
        await getDataPlans();

      return res.status(200).json({
        success: true,
        data,
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
          "Unable to load data plans",
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
    const uid = req.user.uid;

    const {
      network,
      mobileNumber,
      plan,
    } = req.body;

    let orderRef = null;
    let requestId = null;

    try {
      const networkName =
        String(
          network || ""
        ).toUpperCase();

      const networkId =
        NETWORK_IDS[networkName];

      if (!networkId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid network",
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
            "Enter a valid 11-digit Nigerian phone number",
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
            "Sandbox testing uses 08011111111",
        });
      }

      if (!plan) {
        return res.status(400).json({
          success: false,
          message:
            "Data plan is required",
        });
      }

      const providerData =
        await getDataPlans();

      const providerPlans =
        providerData?.dataplans || [];

      const selectedPlan =
        providerPlans.find(
          (item) =>
            String(
              item.data_plan_id
            ) === String(plan) &&
            String(
              item.status
            ).toLowerCase() === "on"
        );

      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          message:
            "Selected data plan is unavailable",
        });
      }

      const sellingPrice =
        Number(
          selectedPlan.price_for_basicuser
        );

      if (
        !Number.isFinite(
          sellingPrice
        ) ||
        sellingPrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid data plan price",
        });
      }

      const userRef =
        db.collection("users").doc(uid);

      orderRef =
        db
          .collection("dataOrders")
          .doc();

      requestId =
        generateRequestId();

      let balanceBefore = 0;
      let balanceAfter = 0;

      if (WALLET_DEBIT_ENABLED) {
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

            const userData =
              userSnap.data() || {};

            balanceBefore =
              Number(
                userData.wallet || 0
              );

            if (
              !Number.isFinite(
                balanceBefore
              )
            ) {
              throw new Error(
                "INVALID_WALLET"
              );
            }

            if (
              balanceBefore <
              sellingPrice
            ) {
              throw new Error(
                "INSUFFICIENT_BALANCE"
              );
            }

            balanceAfter =
              balanceBefore -
              sellingPrice;

            transaction.update(
              userRef,
              {
                wallet:
                  balanceAfter,
                updatedAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

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
                  networkName,
                networkId,
                mobileNumber,
                planId:
                  String(
                    selectedPlan.data_plan_id
                  ),
                plan:
                  selectedPlan.size,
                dataType:
                  selectedPlan.the_datatype_name,
                duration:
                  selectedPlan.duration,
                amount:
                  sellingPrice,
                providerPrice:
                  sellingPrice,
                debitStatus:
                  "debited",
                status:
                  "processing",
                createdAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

            const ledgerRef =
              db
                .collection(
                  "walletTransactions"
                )
                .doc();

            transaction.set(
              ledgerRef,
              {
                uid,
                type:
                  "debit",
                service:
                  "data",
                amount:
                  sellingPrice,
                balanceBefore,
                balanceAfter,
                orderId:
                  orderRef.id,
                requestId,
                network:
                  networkName,
                mobileNumber,
                planId:
                  String(
                    selectedPlan.data_plan_id
                  ),
                description:
                  `Data purchase - ${selectedPlan.size} ${networkName}`,
                status:
                  "completed",
                createdAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }
        );
      } else {
        await orderRef.set({
          uid,
          orderId:
            orderRef.id,
          requestId,
          service:
            "data",
          network:
            networkName,
          networkId,
          mobileNumber,
          planId:
            String(
              selectedPlan.data_plan_id
            ),
          plan:
            selectedPlan.size,
          dataType:
            selectedPlan.the_datatype_name,
          duration:
            selectedPlan.duration,
          amount:
            sellingPrice,
          providerPrice:
            sellingPrice,
          debitStatus:
            "disabled",
          status:
            "processing",
          createdAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });
      }

      let providerResponse;

      try {
        providerResponse =
          await purchaseData({
            network:
              networkId,
            mobileNumber,
            plan:
              String(
                selectedPlan.data_plan_id
              ),
            requestId,
          });
      } catch (providerError) {
        console.error(
          "Data provider error:",
          providerError.response
            ?.data ||
            providerError.message
        );

        /*
         * IMPORTANT:
         * A timeout/network error does NOT automatically mean
         * the provider did not process the transaction.
         *
         * Keep the order processing so it can be reconciled.
         */

        await orderRef.update({
          status:
            "unknown",
          providerError:
            providerError.response
              ?.data ||
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
            "Your data request is being checked. Please do not purchase again yet.",
          requestId,
          orderId:
            orderRef.id,
        });
      }

      if (
        isExplicitProviderFailure(
          providerResponse
        )
      ) {
        if (WALLET_DEBIT_ENABLED) {
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

              if (
                !userSnap.exists ||
                !orderSnap.exists
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

              const currentBalance =
                Number(
                  userSnap.data()
                    ?.wallet || 0
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
                  status:
                    "failed",
                  debitStatus:
                    "refunded",
                  providerResponse,
                  failedAt:
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
                  service:
                    "data",
                  amount:
                    sellingPrice,
                  balanceBefore:
                    currentBalance,
                  balanceAfter:
                    refundBalance,
                  orderId:
                    orderRef.id,
                  requestId,
                  network:
                    networkName,
                  mobileNumber,
                  planId:
                    String(
                      selectedPlan.data_plan_id
                    ),
                  description:
                    `Data refund - ${selectedPlan.size} ${networkName}`,
                  status:
                    "completed",
                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );
            }
          );
        } else {
          await orderRef.update({
            status:
              "failed",
            providerResponse,
            failedAt:
              admin.firestore
                .FieldValue
                .serverTimestamp(),
          });
        }

        return res.status(400).json({
          success: false,
          message:
            WALLET_DEBIT_ENABLED
              ? "Data purchase failed. Your wallet has been refunded."
              : "Data purchase failed.",
          requestId,
          orderId:
            orderRef.id,
          providerResponse,
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
          providerResponse,
        });
      }

      const providerReference =
        providerResponse?.ident ||
        providerResponse?.id ||
        providerResponse?.reference ||
        null;

      await orderRef.update({
        status:
          "successful",
        debitStatus:
          WALLET_DEBIT_ENABLED
            ? "debited"
            : "disabled",
        providerReference,
        providerResponse,
        completedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
      });

      return res.status(200).json({
        success: true,
        message:
          "Data purchase successful",
        requestId,
        orderId:
          orderRef.id,
        providerReference,
        amount:
          sellingPrice,
        network:
          networkName,
        mobileNumber,
        plan:
          selectedPlan.size,
        providerResponse,
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
            "User wallet account not found",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient wallet balance",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid wallet balance",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to process data purchase",
        requestId,
        orderId:
          orderRef?.id || null,
      });
    }
  }
);

/* ============================================================
   BUY AIRTIME
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
    } = req.body;

    let orderRef = null;
    let requestId = null;

    try {
      const networkName =
        String(
          network || ""
        ).toUpperCase();

      const networkId =
        NETWORK_IDS[networkName];

      if (!networkId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid network",
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
            "Enter a valid 11-digit Nigerian phone number",
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
            "Sandbox testing uses 08011111111",
        });
      }

      const airtimeAmount =
        Number(amount);

      if (
        !Number.isFinite(
          airtimeAmount
        ) ||
        airtimeAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid airtime amount",
        });
      }

      if (
        !Number.isInteger(
          airtimeAmount
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Airtime amount must be a whole number",
        });
      }

      const userRef =
        db.collection("users").doc(uid);

      orderRef =
        db
          .collection(
            "airtimeOrders"
          )
          .doc();

      requestId =
        generateRequestId();

      if (WALLET_DEBIT_ENABLED) {
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
              balance <
              airtimeAmount
            ) {
              throw new Error(
                "INSUFFICIENT_BALANCE"
              );
            }

            const newBalance =
              balance -
              airtimeAmount;

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
                  networkName,
                networkId,
                mobileNumber,
                amount:
                  airtimeAmount,
                debitStatus:
                  "debited",
                status:
                  "processing",
                createdAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );

            const ledgerRef =
              db
                .collection(
                  "walletTransactions"
                )
                .doc();

            transaction.set(
              ledgerRef,
              {
                uid,
                type:
                  "debit",
                service:
                  "airtime",
                amount:
                  airtimeAmount,
                balanceBefore:
                  balance,
                balanceAfter:
                  newBalance,
                orderId:
                  orderRef.id,
                requestId,
                network:
                  networkName,
                mobileNumber,
                description:
                  `Airtime purchase - ₦${airtimeAmount}`,
                status:
                  "completed",
                createdAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp(),
              }
            );
          }
        );
      } else {
        await orderRef.set({
          uid,
          orderId:
            orderRef.id,
          requestId,
          service:
            "airtime",
          network:
            networkName,
          networkId,
          mobileNumber,
          amount:
            airtimeAmount,
          debitStatus:
            "disabled",
          status:
            "processing",
          createdAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        });
      }

      let providerResponse;

      try {
        providerResponse =
          await purchaseAirtime({
            network:
              networkId,
            mobileNumber,
            amount:
              airtimeAmount,
            requestId,
          });
      } catch (providerError) {
        console.error(
          "Airtime provider error:",
          providerError.response
            ?.data ||
            providerError.message
        );

        await orderRef.update({
          status:
            "unknown",
          providerError:
            providerError.response
              ?.data ||
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
            "Your airtime request is being checked. Please do not purchase again yet.",
          requestId,
          orderId:
            orderRef.id,
        });
      }

      if (
        isExplicitProviderFailure(
          providerResponse
        )
      ) {
        if (WALLET_DEBIT_ENABLED) {
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

              if (
                !userSnap.exists ||
                !orderSnap.exists
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

              const currentBalance =
                Number(
                  userSnap.data()
                    ?.wallet || 0
                );

              const refundBalance =
                currentBalance +
                airtimeAmount;

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
                  providerResponse,
                  failedAt:
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
                  service:
                    "airtime",
                  amount:
                    airtimeAmount,
                  balanceBefore:
                    currentBalance,
                  balanceAfter:
                    refundBalance,
                  orderId:
                    orderRef.id,
                  requestId,
                  network:
                    networkName,
                  mobileNumber,
                  description:
                    `Airtime refund - ₦${airtimeAmount}`,
                  status:
                    "completed",
                  createdAt:
                    admin.firestore
                      .FieldValue
                      .serverTimestamp(),
                }
              );
            }
          );
        } else {
          await orderRef.update({
            status:
              "failed",
            providerResponse,
            failedAt:
              admin.firestore
                .FieldValue
                .serverTimestamp(),
          });
        }

        return res.status(400).json({
          success: false,
          message:
            WALLET_DEBIT_ENABLED
              ? "Airtime purchase failed. Your wallet has been refunded."
              : "Airtime purchase failed.",
          requestId,
          orderId:
            orderRef.id,
          providerResponse,
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
          providerResponse,
        });
      }

      const providerReference =
        providerResponse?.ident ||
        providerResponse?.id ||
        providerResponse?.reference ||
        null;

      await orderRef.update({
        status:
          "successful",
        debitStatus:
          WALLET_DEBIT_ENABLED
            ? "debited"
            : "disabled",
        providerReference,
        providerResponse,
        completedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
      });

      return res.status(200).json({
        success: true,
        message:
          "Airtime purchase successful",
        requestId,
        orderId:
          orderRef.id,
        providerReference,
        amount:
          airtimeAmount,
        network:
          networkName,
        mobileNumber,
        providerResponse,
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
            "User wallet account not found",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient wallet balance",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid wallet balance",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to process airtime purchase",
        requestId,
        orderId:
          orderRef?.id || null,
      });
    }
  }
);

/* ============================================================
   ELECTRICITY PLANS
   ============================================================ */

router.get(
  "/electricity-plans",
  async (req, res) => {
    try {
      const data =
        await getElectricityPlans();

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "Electricity plans error:",
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
    try {
      const {
        discoName,
        meterNumber,
      } = req.body;

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
            "Enter a valid meter number.",
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

      const result =
        await verifyElectricityMeter({
          discoName:
            String(discoName),
          meterNumber:
            String(meterNumber),
        });

      const successful =
        result?.status === "success" ||
        result?.Status === "successful";

      if (!successful) {
        return res.status(400).json({
          success: false,
          message:
            result?.api_response ||
            "Meter verification failed.",
          providerResponse:
            result,
        });
      }

      return res.json({
        success: true,
        message:
          "Meter verified successfully.",
        customer: {
          name:
            result.Customer_Name ||
            result.name ||
            "",
          address:
            result.Customer_Address ||
            "",
        },
        providerReference:
          result.ident ||
          result.id ||
          null,
        providerResponse:
          result,
      });
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
    const userId =
      req.user.uid;

    const {
      discoName,
      meterNumber,
      meterType,
      amount,
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

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
            "Enter a valid meter number.",
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
            "Enter a valid electricity amount.",
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

      const normalizedMeterType =
        String(meterType)
          .toLowerCase() ===
        "postpaid"
          ? "postpaid"
          : "prepaid";

      const userRef =
        db.collection("users")
          .doc(userId);

      orderRef =
        db
          .collection(
            "electricityOrders"
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
              walletSnap.data()
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
            currentBalance <
            electricityAmount
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            currentBalance -
            electricityAmount;

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

          transaction.set(
            orderRef,
            {
              uid:
                userId,
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
                electricityAmount,
              debitStatus:
                "debited",
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
              uid:
                userId,
              type:
                "debit",
              service:
                "electricity",
              amount:
                electricityAmount,
              orderId:
                orderRef.id,
              requestId,
              balanceBefore:
                currentBalance,
              balanceAfter:
                newBalance,
              status:
                "completed",
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
              electricityAmount,
          });
      } catch (providerError) {
        console.error(
          "Electricity provider error:",
          providerError.response
            ?.data ||
            providerError.message
        );

        await orderRef.update({
          status:
            "unknown",
          providerError:
            providerError.response
              ?.data ||
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

            const currentBalance =
              Number(
                userSnap.data()
                  ?.wallet || 0
              );

            const refundBalance =
              currentBalance +
              electricityAmount;

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
                providerResponse,
                failedAt:
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
                refundAmount:
                  electricityAmount,
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
                uid:
                  userId,
                type:
                  "refund",
                service:
                  "electricity",
                amount:
                  electricityAmount,
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
          providerResponse,
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
          providerResponse,
        });
      }

      const providerReference =
        providerResponse?.ident ||
        providerResponse?.id ||
        providerResponse?.reference ||
        null;

      const electricityToken =
        providerResponse?.electricitytoken ||
        providerResponse?.token ||
        null;

      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status:
                "successful",
              providerReference,
              electricityToken,
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
        providerReference,
        token:
          electricityToken,
        amount:
          electricityAmount,
        meterNumber:
          String(meterNumber),
        meterType:
          normalizedMeterType,
        providerResponse,
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
  async (req, res) => {
    try {
      const providerResponse =
        await getCableTvPlans();

      return res.json({
        success: true,
        data:
          providerResponse,
      });
    } catch (error) {
      console.error(
        "Cable TV plans error:",
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load Cable TV plans",
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
    try {
      const {
        cableName,
        smartCardNumber,
      } = req.body;

      if (!cableName) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV provider is required",
        });
      }

      if (!smartCardNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Smart card number is required",
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
            "Invalid smart card number",
        });
      }

      if (
        isSandbox() &&
        cleanSmartCardNumber !==
          "1212121212" &&
        String(cableName)
          .toLowerCase() !==
          "showmax"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sandbox testing uses smart card number 1212121212.",
        });
      }

      const providerResponse =
        await verifyCableCustomer({
          cableName:
            String(cableName),
          smartCardNumber:
            cleanSmartCardNumber,
        });

      return res.json({
        success: true,
        data:
          providerResponse,
      });
    } catch (error) {
      console.error(
        "Cable TV verification error:",
        error.response?.data ||
          error.message
      );

      return res.status(400).json({
        success: false,
        message:
          "Unable to verify Cable TV customer",
        error:
          error.response?.data ||
          error.message,
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
    } = req.body;

    let orderRef = null;
    let walletTransactionRef = null;
    let requestId = null;

    try {
      if (!cableName) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV provider is required",
        });
      }

      if (!smartCardNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Smart card number is required",
        });
      }

      if (!cablePlan) {
        return res.status(400).json({
          success: false,
          message:
            "Cable TV plan is required",
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
            "Invalid smart card number",
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
            "Invalid Cable TV amount",
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
            "Cable TV amount must be a whole number",
        });
      }

      const userRef =
        db.collection("users")
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

      /*
       * IMPORTANT:
       * Order creation + wallet debit + ledger entry
       * are now one Firestore transaction.
       */

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
            balance <
            purchaseAmount
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          const newBalance =
            balance -
            purchaseAmount;

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
                "debited",
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
        console.error(
          "Cable TV provider error:",
          providerError.response
            ?.data ||
            providerError.message
        );

        await orderRef.update({
          status:
            "unknown",
          providerError:
            providerError.response
              ?.data ||
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

            const currentBalance =
              Number(
                userSnap.data()
                  ?.wallet || 0
              );

            const refundBalance =
              currentBalance +
              purchaseAmount;

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
                providerResponse,
                failedAt:
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
                refundAmount:
                  purchaseAmount,
                balanceBeforeRefund:
                  currentBalance,
                balanceAfterRefund:
                  refundBalance,
                refundReason:
                  "Cable TV provider rejected transaction",
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
                service:
                  "cabletv",
                amount:
                  purchaseAmount,
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
                  "Cable TV purchase refund",
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
            "Cable TV purchase failed. Your wallet has been refunded.",
          requestId,
          orderId:
            orderRef.id,
          providerResponse,
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
          providerResponse,
        });
      }

      const providerReference =
        providerResponse?.ident ||
        providerResponse?.id ||
        providerResponse?.reference ||
        providerResponse?.request_id ||
        null;

      await db.runTransaction(
        async (transaction) => {
          transaction.update(
            orderRef,
            {
              status:
                "successful",
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
          "Cable TV subscription successful",
        requestId,
        orderId:
          orderRef.id,
        amount:
          purchaseAmount,
        providerReference,
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
            "User account not found",
        });
      }

      if (
        error.message ===
        "INSUFFICIENT_BALANCE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient wallet balance",
        });
      }

      if (
        error.message ===
        "INVALID_WALLET"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid wallet balance",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to process Cable TV purchase",
        requestId,
        orderId:
          orderRef?.id || null,
      });
    }
  }
);

module.exports = router;