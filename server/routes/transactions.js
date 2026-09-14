const express = require("express");
const admin = require("firebase-admin");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

function timestampToMillis(value) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function timestampToISOString(value) {
  const millis = timestampToMillis(value);

  if (!millis) {
    return null;
  }

  return new Date(millis).toISOString();
}

function numberOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();

  if (
    value === "success" ||
    value === "successful" ||
    value === "completed"
  ) {
    return "successful";
  }

  if (
    value === "failed" ||
    value === "fail"
  ) {
    return "failed";
  }

  if (
    value === "refunded" ||
    value === "refund"
  ) {
    return "refunded";
  }

  if (
    value === "processing" ||
    value === "pending"
  ) {
    return "processing";
  }

  return value || "unknown";
}

function firstValue(object, keys) {
  if (!object) {
    return null;
  }

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  return null;
}

/*
 * Safely load a Firestore collection.
 *
 * If one optional collection fails, transaction history
 * can still load the other transaction types.
 */
async function safeCollectionQuery(
  db,
  collectionName,
  uid
) {
  try {
    const snapshot = await db
      .collection(collectionName)
      .where("uid", "==", uid)
      .get();

    return {
      snapshot,
      error: null,
    };
  } catch (error) {
    console.error(
      `Transaction history: unable to read ${collectionName}`,
      {
        message: error.message,
        code: error.code,
      }
    );

    return {
      snapshot: null,
      error,
    };
  }
}

router.get(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const uid = req.user.uid;

      if (!uid) {
        return res.status(401).json({
          success: false,
          message: "User authentication required.",
        });
      }

      const db = admin.firestore();

      /*
       * LOAD ALL TRANSACTION COLLECTIONS
       *
       * Promise.allSettled/safe queries are used so
       * one missing/problematic collection does not
       * destroy the entire transaction history.
       */

      const [
        walletPaymentsResult,
        walletTransactionsResult,
        dataOrdersResult,
        airtimeOrdersResult,
        electricityOrdersResult,
        cableOrdersResult,
      ] = await Promise.all([
        safeCollectionQuery(
          db,
          "walletPayments",
          uid
        ),

        safeCollectionQuery(
          db,
          "walletTransactions",
          uid
        ),

        safeCollectionQuery(
          db,
          "dataOrders",
          uid
        ),

        safeCollectionQuery(
          db,
          "airtimeOrders",
          uid
        ),

        safeCollectionQuery(
          db,
          "electricityOrders",
          uid
        ),

        safeCollectionQuery(
          db,
          "cableOrders",
          uid
        ),
      ]);

      const walletPaymentsSnapshot =
        walletPaymentsResult.snapshot;

      const walletTransactionsSnapshot =
        walletTransactionsResult.snapshot;

      const dataOrdersSnapshot =
        dataOrdersResult.snapshot;

      const airtimeOrdersSnapshot =
        airtimeOrdersResult.snapshot;

      const electricityOrdersSnapshot =
        electricityOrdersResult.snapshot;

      const cableOrdersSnapshot =
        cableOrdersResult.snapshot;

      const transactions = [];

      /*
       * CREATE ORDER MAPS
       */

      const dataOrders = new Map();

      if (dataOrdersSnapshot) {
        dataOrdersSnapshot.forEach((doc) => {
          dataOrders.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      const airtimeOrders = new Map();

      if (airtimeOrdersSnapshot) {
        airtimeOrdersSnapshot.forEach((doc) => {
          airtimeOrders.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      const electricityOrders = new Map();

      if (electricityOrdersSnapshot) {
        electricityOrdersSnapshot.forEach((doc) => {
          electricityOrders.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      const cableOrders = new Map();

      if (cableOrdersSnapshot) {
        cableOrdersSnapshot.forEach((doc) => {
          cableOrders.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      /*
       * WALLET PAYMENTS
       *
       * This includes Paystack wallet funding.
       */

      if (walletPaymentsSnapshot) {
        walletPaymentsSnapshot.forEach((doc) => {
          const data = doc.data();

          const amount = numberOrZero(
            data.amount
          );

          transactions.push({
            id: `wallet_${doc.id}`,

            category: "wallet",

            type: "credit",

            service: "wallet",

            title: "Wallet Funding",

            description:
              data.description ||
              "Wallet funded successfully",

            amount,

            amountSigned:
              Math.abs(amount),

            status: normalizeStatus(
              data.status || "success"
            ),

            reference:
              data.reference ||
              doc.id,

            requestId: null,

            orderId: null,

            network: null,

            mobileNumber: null,

            plan: null,

            providerReference: null,

            electricityProvider: null,

            discoName: null,

            meterNumber: null,

            meterType: null,

            electricityToken: null,

            createdAt:
              timestampToISOString(
                data.createdAt
              ),

            details: {
              paymentReference:
                data.reference ||
                doc.id,

              credited:
                data.credited !== false,
            },
          });
        });
      }

      /*
       * WALLET TRANSACTIONS
       */

      const walletTransactionOrderIds =
        new Set();

      if (walletTransactionsSnapshot) {
        walletTransactionsSnapshot.forEach(
          (doc) => {
            const data = doc.data();

            if (data.orderId) {
              walletTransactionOrderIds.add(
                data.orderId
              );
            }

            const amount =
              numberOrZero(data.amount);

            const transactionType =
              String(
                data.type || ""
              ).toLowerCase();

            const service =
              String(
                data.service || ""
              ).toLowerCase();

            const isRefund =
              transactionType ===
              "refund";

            const isDebit =
              transactionType ===
              "debit";

            const isData =
              service === "data";

            const isAirtime =
              service === "airtime";

            const isElectricity =
              service ===
              "electricity";

            const dataOrder =
              data.orderId
                ? dataOrders.get(
                    data.orderId
                  )
                : null;

            const airtimeOrder =
              data.orderId
                ? airtimeOrders.get(
                    data.orderId
                  )
                : null;

            const electricityOrder =
              data.orderId
                ? electricityOrders.get(
                    data.orderId
                  )
                : null;

            const cableOrder =
              data.orderId
                ? cableOrders.get(
                    data.orderId
                  )
                : null;

            const order =
              dataOrder ||
              airtimeOrder ||
              electricityOrder ||
              cableOrder ||
              null;

            let status =
              normalizeStatus(
                data.status
              );

            if (order) {
              const orderStatus =
                normalizeStatus(
                  order.status
                );

              if (
                orderStatus &&
                orderStatus !== "unknown"
              ) {
                status =
                  orderStatus;
              }
            }

            if (isRefund) {
              status = "refunded";
            }

            /*
             * TITLE
             */

            let title =
              "Wallet Transaction";

            if (isDebit) {
              if (isData) {
                title =
                  "Data Purchase";
              } else if (
                isAirtime
              ) {
                title =
                  "Airtime Purchase";
              } else if (
                isElectricity
              ) {
                title =
                  "Electricity Purchase";
              } else if (
                service.includes(
                  "cable"
                )
              ) {
                title =
                  "Cable TV Purchase";
              } else {
                title =
                  "Wallet Debit";
              }
            }

            if (isRefund) {
              if (isAirtime) {
                title =
                  "Airtime Purchase Refund";
              } else if (isData) {
                title =
                  "Data Purchase Refund";
              } else if (
                isElectricity
              ) {
                title =
                  "Electricity Purchase Refund";
              } else {
                title =
                  "Wallet Refund";
              }
            }

            /*
             * DESCRIPTION
             */

            let description =
              data.description ||
              "Wallet transaction";

            if (isData && dataOrder) {
              description =
                data.description ||
                `Data purchase - ${
                  dataOrder.planName ||
                  dataOrder.plan ||
                  dataOrder.size ||
                  "Data"
                }`;
            }

            if (
              isAirtime &&
              airtimeOrder
            ) {
              description =
                data.description ||
                `Airtime purchase - ₦${numberOrZero(
                  airtimeOrder.amount ||
                    data.amount
                ).toLocaleString()}`;
            }

            if (
              isElectricity &&
              electricityOrder
            ) {
              description =
                data.description ||
                `Electricity purchase - ${
                  firstValue(
                    electricityOrder,
                    [
                      "discoName",
                      "disco_name",
                      "electricityProvider",
                      "electricity_provider",
                      "providerName",
                      "provider",
                    ]
                  ) ||
                  "Electricity"
                }`;
            }

            /*
             * SIGNED AMOUNT
             */

            const signedAmount =
              isRefund
                ? Math.abs(amount)
                : isDebit
                ? -Math.abs(amount)
                : Math.abs(amount);

            /*
             * CATEGORY
             */

            let category = "other";

            if (isData) {
              category = "data";
            }

            if (isAirtime) {
              category = "airtime";
            }

            if (isElectricity) {
              category =
                "electricity";
            }

            if (
              service.includes("cable")
            ) {
              category =
                "cabletv";
            }

            /*
             * ELECTRICITY
             */

            const electricityProvider =
              firstValue(
                data,
                [
                  "electricityProvider",
                  "electricity_provider",
                  "discoName",
                  "disco_name",
                  "providerName",
                  "provider",
                ]
              ) ||
              firstValue(
                electricityOrder,
                [
                  "electricityProvider",
                  "electricity_provider",
                  "discoName",
                  "disco_name",
                  "providerName",
                  "provider",
                ]
              );

            const meterNumber =
              firstValue(
                data,
                [
                  "meterNumber",
                  "meter_number",
                  "meter",
                ]
              ) ||
              firstValue(
                electricityOrder,
                [
                  "meterNumber",
                  "meter_number",
                  "meter",
                ]
              );

            const meterType =
              firstValue(
                data,
                [
                  "meterType",
                  "meter_type",
                  "MeterType",
                ]
              ) ||
              firstValue(
                electricityOrder,
                [
                  "meterType",
                  "meter_type",
                  "MeterType",
                ]
              );

            const electricityToken =
              firstValue(
                data,
                [
                  "electricityToken",
                  "electricity_token",
                  "token",
                  "electricitytoken",
                ]
              ) ||
              firstValue(
                electricityOrder,
                [
                  "electricityToken",
                  "electricity_token",
                  "token",
                  "electricitytoken",
                ]
              );

            const electricityProviderReference =
              firstValue(
                data,
                [
                  "providerReference",
                  "provider_reference",
                  "providerRef",
                  "reference",
                  "ident",
                ]
              ) ||
              firstValue(
                electricityOrder,
                [
                  "providerReference",
                  "provider_reference",
                  "providerRef",
                  "reference",
                  "ident",
                  "id",
                ]
              );

            /*
             * CABLE INFORMATION
             */

            const cableProvider =
              firstValue(
                data,
                [
                  "cableName",
                  "cable_name",
                  "cableProvider",
                  "cable_provider",
                  "cableTvProvider",
                  "cable_tv_provider",
                  "providerName",
                  "provider",
                  "the_cabletv_name",
                ]
              ) ||
              firstValue(
                cableOrder,
                [
                  "cableName",
                  "cable_name",
                  "cableProvider",
                  "cable_provider",
                  "cableTvProvider",
                  "cable_tv_provider",
                  "providerName",
                  "provider",
                  "the_cabletv_name",
                ]
              );

            const smartCardNumber =
              firstValue(
                data,
                [
                  "smartCardNumber",
                  "smart_card_number",
                  "smartcardNumber",
                  "smartcard_number",
                  "iucNumber",
                  "iuc_number",
                  "smartCard",
                  "smart_card",
                  "iuc",
                ]
              ) ||
              firstValue(
                cableOrder,
                [
                  "smartCardNumber",
                  "smart_card_number",
                  "smartcardNumber",
                  "smartcard_number",
                  "iucNumber",
                  "iuc_number",
                  "smartCard",
                  "smart_card",
                  "iuc",
                ]
              );

            const cablePlan =
              firstValue(
                data,
                [
                  "plan",
                  "planName",
                  "plan_name",
                  "package",
                  "packageName",
                  "package_name",
                  "cablePlan",
                  "cable_plan",
                  "cableplan",
                  "size",
                ]
              ) ||
              firstValue(
                cableOrder,
                [
                  "plan",
                  "planName",
                  "plan_name",
                  "package",
                  "packageName",
                  "package_name",
                  "cablePlan",
                  "cable_plan",
                  "cableplan",
                  "size",
                ]
              );

            const duration =
              firstValue(
                data,
                [
                  "duration",
                  "durationDays",
                  "duration_days",
                ]
              ) ||
              firstValue(
                cableOrder,
                [
                  "duration",
                  "durationDays",
                  "duration_days",
                ]
              );

            transactions.push({
              id:
                `wallet_transaction_${doc.id}`,

              category,

              type:
                isRefund
                  ? "refund"
                  : isDebit
                  ? "debit"
                  : transactionType ||
                    "transaction",

              service:
                service ||
                "other",

              title,

              description,

              amount,

              amountSigned:
                signedAmount,

              status,

              reference:
                data.reference ||
                data.requestId ||
                doc.id,

              requestId:
                data.requestId ||
                order?.requestId ||
                null,

              orderId:
                data.orderId ||
                null,

              network:
                data.network ||
                order?.network ||
                null,

              mobileNumber:
                data.mobileNumber ||
                order?.mobileNumber ||
                null,

              plan:
                data.planName ||
                data.plan ||
                order?.planName ||
                order?.plan ||
                order?.size ||
                null,

              providerReference:
                data.providerReference ||
                order?.providerReference ||
                order?.providerId ||
                null,

              electricityProvider:
                electricityProvider ||
                null,

              discoName:
                electricityProvider ||
                null,

              meterNumber:
                meterNumber ||
                null,

              meterType:
                meterType ||
                null,

              electricityToken:
                electricityToken ||
                null,

              cableName:
                cableProvider ||
                null,

              cableProvider:
                cableProvider ||
                null,

              smartCardNumber:
                smartCardNumber ||
                null,

              cablePlan:
                cablePlan ||
                null,

              duration:
                duration ||
                null,

              createdAt:
                timestampToISOString(
                  data.createdAt ||
                    order?.createdAt
                ),

              details: {
                balanceBefore:
                  numberOrZero(
                    data.balanceBefore
                  ),

                balanceAfter:
                  numberOrZero(
                    data.balanceAfter
                  ),

                debitStatus:
                  order?.debitStatus ||
                  null,

                providerStatus:
                  order?.status ||
                  null,

                providerReference:
                  electricityProviderReference ||
                  null,

                electricityProvider:
                  electricityProvider ||
                  null,

                meterNumber:
                  meterNumber ||
                  null,

                meterType:
                  meterType ||
                  null,

                electricityToken:
                  electricityToken ||
                  null,

                airtimeAmount:
                  isAirtime
                    ? numberOrZero(
                        airtimeOrder?.amount ||
                          data.amount
                      )
                    : null,

                cableProvider:
                  cableProvider ||
                  null,

                smartCardNumber:
                  smartCardNumber ||
                  null,

                cablePlan:
                  cablePlan ||
                  null,

                duration:
                  duration ||
                  null,
              },
            });
          }
        );
      }

      /*
       * DATA ORDERS WITHOUT WALLET TRANSACTION
       */

      if (dataOrdersSnapshot) {
        dataOrdersSnapshot.forEach(
          (doc) => {
            const data = doc.data();

            if (
              walletTransactionOrderIds.has(
                doc.id
              )
            ) {
              return;
            }

            const amount =
              numberOrZero(
                data.sellingPrice ??
                  data.amount ??
                  data.planAmount
              );

            transactions.push({
              id:
                `data_order_${doc.id}`,

              category: "data",

              type: "purchase",

              service: "data",

              title: "Data Purchase",

              description:
                data.description ||
                `Data purchase - ${
                  data.planName ||
                  data.plan ||
                  data.size ||
                  "Data"
                }`,

              amount,

              amountSigned:
                -Math.abs(amount),

              status:
                normalizeStatus(
                  data.status
                ),

              reference:
                data.requestId ||
                data.orderId ||
                doc.id,

              requestId:
                data.requestId ||
                null,

              orderId: doc.id,

              network:
                data.network ||
                null,

              mobileNumber:
                data.mobileNumber ||
                null,

              plan:
                data.planName ||
                data.plan ||
                data.size ||
                null,

              providerReference:
                data.providerReference ||
                null,

              electricityProvider:
                null,

              discoName:
                null,

              meterNumber:
                null,

              meterType:
                null,

              electricityToken:
                null,

              createdAt:
                timestampToISOString(
                  data.createdAt
                ),

              details: {
                debitStatus:
                  data.debitStatus ||
                  null,
              },
            });
          }
        );
      }

      /*
       * AIRTIME ORDERS WITHOUT WALLET TRANSACTION
       */

      if (airtimeOrdersSnapshot) {
        airtimeOrdersSnapshot.forEach(
          (doc) => {
            const data = doc.data();

            if (
              walletTransactionOrderIds.has(
                doc.id
              )
            ) {
              return;
            }

            const amount =
              numberOrZero(
                data.amount ||
                  data.sellingPrice
              );

            transactions.push({
              id:
                `airtime_order_${doc.id}`,

              category: "airtime",

              type: "purchase",

              service: "airtime",

              title:
                "Airtime Purchase",

              description:
                data.description ||
                `Airtime purchase - ₦${amount.toLocaleString()}`,

              amount,

              amountSigned:
                -Math.abs(amount),

              status:
                normalizeStatus(
                  data.status
                ),

              reference:
                data.requestId ||
                data.orderId ||
                doc.id,

              requestId:
                data.requestId ||
                null,

              orderId: doc.id,

              network:
                data.network ||
                null,

              mobileNumber:
                data.mobileNumber ||
                null,

              plan: null,

              providerReference:
                data.providerReference ||
                null,

              electricityProvider:
                null,

              discoName: null,

              meterNumber: null,

              meterType: null,

              electricityToken:
                null,

              createdAt:
                timestampToISOString(
                  data.createdAt
                ),

              details: {
                airtimeAmount:
                  amount,

                debitStatus:
                  data.debitStatus ||
                  null,
              },
            });
          }
        );
      }

      /*
       * ELECTRICITY ORDERS WITHOUT WALLET TRANSACTION
       */

      if (electricityOrdersSnapshot) {
        electricityOrdersSnapshot.forEach(
          (doc) => {
            const data = doc.data();

            if (
              walletTransactionOrderIds.has(
                doc.id
              )
            ) {
              return;
            }

            const amount =
              numberOrZero(
                data.amount ||
                  data.sellingPrice ||
                  data.planAmount ||
                  data.plan_amount
              );

            const electricityProvider =
              firstValue(
                data,
                [
                  "electricityProvider",
                  "electricity_provider",
                  "discoName",
                  "disco_name",
                  "providerName",
                  "provider",
                ]
              );

            const meterNumber =
              firstValue(
                data,
                [
                  "meterNumber",
                  "meter_number",
                  "meter",
                ]
              );

            const meterType =
              firstValue(
                data,
                [
                  "meterType",
                  "meter_type",
                  "MeterType",
                ]
              );

            const electricityToken =
              firstValue(
                data,
                [
                  "electricityToken",
                  "electricity_token",
                  "token",
                  "electricitytoken",
                ]
              );

            const providerReference =
              firstValue(
                data,
                [
                  "providerReference",
                  "provider_reference",
                  "providerRef",
                  "reference",
                  "ident",
                  "id",
                ]
              );

            transactions.push({
              id:
                `electricity_order_${doc.id}`,

              category:
                "electricity",

              type: "purchase",

              service:
                "electricity",

              title:
                "Electricity Purchase",

              description:
                data.description ||
                `Electricity purchase - ${
                  electricityProvider ||
                  "Electricity"
                }`,

              amount,

              amountSigned:
                -Math.abs(amount),

              status:
                normalizeStatus(
                  data.status
                ),

              reference:
                data.requestId ||
                data.orderId ||
                providerReference ||
                doc.id,

              requestId:
                data.requestId ||
                null,

              orderId: doc.id,

              network: null,

              mobileNumber: null,

              plan: null,

              providerReference:
                providerReference ||
                null,

              electricityProvider:
                electricityProvider ||
                null,

              discoName:
                electricityProvider ||
                null,

              meterNumber:
                meterNumber ||
                null,

              meterType:
                meterType ||
                null,

              electricityToken:
                electricityToken ||
                null,

              createdAt:
                timestampToISOString(
                  data.createdAt
                ),

              details: {
                debitStatus:
                  data.debitStatus ||
                  null,

                providerStatus:
                  data.status ||
                  null,

                providerReference:
                  providerReference ||
                  null,

                electricityProvider:
                  electricityProvider ||
                  null,

                meterNumber:
                  meterNumber ||
                  null,

                meterType:
                  meterType ||
                  null,

                electricityToken:
                  electricityToken ||
                  null,
              },
            });
          }
        );
      }

      /*
       * CABLE ORDERS WITHOUT WALLET TRANSACTION
       */

      if (cableOrdersSnapshot) {
        cableOrdersSnapshot.forEach(
          (doc) => {
            const data = doc.data();

            if (
              walletTransactionOrderIds.has(
                doc.id
              )
            ) {
              return;
            }

            const amount =
              numberOrZero(
                data.amount ||
                  data.sellingPrice ||
                  data.planAmount ||
                  data.plan_amount
              );

            const cableProvider =
              firstValue(
                data,
                [
                  "cableName",
                  "cable_name",
                  "cableProvider",
                  "cable_provider",
                  "cableTvProvider",
                  "cable_tv_provider",
                  "providerName",
                  "provider",
                  "the_cabletv_name",
                ]
              );

            const smartCardNumber =
              firstValue(
                data,
                [
                  "smartCardNumber",
                  "smart_card_number",
                  "smartcardNumber",
                  "smartcard_number",
                  "iucNumber",
                  "iuc_number",
                  "smartCard",
                  "smart_card",
                  "iuc",
                ]
              );

            const cablePlan =
              firstValue(
                data,
                [
                  "plan",
                  "planName",
                  "plan_name",
                  "package",
                  "packageName",
                  "package_name",
                  "cablePlan",
                  "cable_plan",
                  "cableplan",
                  "size",
                ]
              );

            const duration =
              firstValue(
                data,
                [
                  "duration",
                  "durationDays",
                  "duration_days",
                ]
              );

            transactions.push({
              id:
                `cable_order_${doc.id}`,

              category:
                "cabletv",

              type: "purchase",

              service:
                "cabletv",

              title:
                "Cable TV Purchase",

              description:
                data.description ||
                `Cable TV purchase - ${
                  cableProvider ||
                  "Cable TV"
                }`,

              amount,

              amountSigned:
                -Math.abs(amount),

              status:
                normalizeStatus(
                  data.status
                ),

              reference:
                data.requestId ||
                data.orderId ||
                data.reference ||
                doc.id,

              requestId:
                data.requestId ||
                null,

              orderId: doc.id,

              network: null,

              mobileNumber: null,

              plan:
                cablePlan ||
                null,

              providerReference:
                data.providerReference ||
                null,

              electricityProvider:
                null,

              discoName:
                null,

              meterNumber:
                null,

              meterType:
                null,

              electricityToken:
                null,

              cableName:
                cableProvider ||
                null,

              cableProvider:
                cableProvider ||
                null,

              smartCardNumber:
                smartCardNumber ||
                null,

              cablePlan:
                cablePlan ||
                null,

              duration:
                duration ||
                null,

              createdAt:
                timestampToISOString(
                  data.createdAt
                ),

              details: {
                cableProvider:
                  cableProvider ||
                  null,

                smartCardNumber:
                  smartCardNumber ||
                  null,

                cablePlan:
                  cablePlan ||
                  null,

                duration:
                  duration ||
                  null,
              },
            });
          }
        );
      }

      /*
       * SORT NEWEST FIRST
       */

      transactions.sort(
        (a, b) => {
          const dateA =
            a.createdAt
              ? new Date(
                  a.createdAt
                ).getTime()
              : 0;

          const dateB =
            b.createdAt
              ? new Date(
                  b.createdAt
                ).getTime()
              : 0;

          return dateB - dateA;
        }
      );

      /*
       * RESPONSE
       */

      return res.status(200).json({
        success: true,

        count:
          transactions.length,

        data: transactions,
      });
    } catch (error) {
      console.error(
        "===================================="
      );

      console.error(
        "TRANSACTION HISTORY ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Code:",
        error.code
      );

      console.error(
        "Stack:",
        error.stack
      );

      console.error(
        "===================================="
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load transaction history",

        error:
          error.message,

        code:
          error.code || null,
      });
    }
  }
);

module.exports = router;