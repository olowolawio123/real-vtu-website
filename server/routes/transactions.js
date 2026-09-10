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

  if (value === "failed" || value === "fail") {
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

router.get("/", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;

    const db = admin.firestore();

    const [
      walletPaymentsSnapshot,
      walletTransactionsSnapshot,
      dataOrdersSnapshot,
      airtimeOrdersSnapshot,
      electricityOrdersSnapshot,
    ] = await Promise.all([
      db
        .collection("walletPayments")
        .where("uid", "==", uid)
        .get(),

      db
        .collection("walletTransactions")
        .where("uid", "==", uid)
        .get(),

      db
        .collection("dataOrders")
        .where("uid", "==", uid)
        .get(),

      db
        .collection("airtimeOrders")
        .where("uid", "==", uid)
        .get(),

      db
        .collection("electricityOrders")
        .where("uid", "==", uid)
        .get(),
    ]);

    /*
     * DATA ORDERS
     */

    const dataOrders = new Map();

    dataOrdersSnapshot.forEach((doc) => {
      dataOrders.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      });
    });

    /*
     * AIRTIME ORDERS
     */

    const airtimeOrders = new Map();

    airtimeOrdersSnapshot.forEach((doc) => {
      airtimeOrders.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      });
    });

    /*
     * ELECTRICITY ORDERS
     */

    const electricityOrders = new Map();

    electricityOrdersSnapshot.forEach((doc) => {
      electricityOrders.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      });
    });

    const transactions = [];

    /*
     * WALLET PAYMENTS
     */

    walletPaymentsSnapshot.forEach((doc) => {
      const data = doc.data();

      const amount = numberOrZero(data.amount);

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

        amountSigned: Math.abs(amount),

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
        },
      });
    });

    /*
     * WALLET TRANSACTIONS
     */

    walletTransactionsSnapshot.forEach((doc) => {
      const data = doc.data();

      const amount = numberOrZero(
        data.amount
      );

      const transactionType =
        String(
          data.type || ""
        ).toLowerCase();

      const service =
        String(
          data.service || ""
        ).toLowerCase();

      const isRefund =
        transactionType === "refund";

      const isDebit =
        transactionType === "debit";

      const isData =
        service === "data";

      const isAirtime =
        service === "airtime";

      const isElectricity =
        service === "electricity";

      const dataOrder =
        data.orderId
          ? dataOrders.get(data.orderId)
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

      const order =
        dataOrder ||
        airtimeOrder ||
        electricityOrder ||
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

        if (orderStatus) {
          status = orderStatus;
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
          title = "Data Purchase";
        } else if (isAirtime) {
          title = "Airtime Purchase";
        } else if (isElectricity) {
          title = "Electricity Purchase";
        } else {
          title = "Wallet Debit";
        }
      }

      if (isRefund) {
        if (isAirtime) {
          title =
            "Airtime Purchase Refund";
        } else if (isData) {
          title =
            "Data Purchase Refund";
        } else if (isElectricity) {
          title =
            "Electricity Purchase Refund";
        } else {
          title = "Wallet Refund";
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

      if (isAirtime && airtimeOrder) {
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

      const signedAmount = isRefund
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
        category = "electricity";
      }

      if (isRefund) {
        if (isAirtime) {
          category = "airtime";
        } else if (isData) {
          category = "data";
        } else if (isElectricity) {
          category = "electricity";
        } else {
          category = "other";
        }
      }

      /*
       * ELECTRICITY INFORMATION
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

        /*
         * ELECTRICITY FIELDS
         */

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
        },
      });
    });

    /*
     * ORDER IDS ALREADY REPRESENTED
     */

    const walletTransactionOrderIds =
      new Set();

    walletTransactionsSnapshot.forEach(
      (doc) => {
        const data = doc.data();

        if (data.orderId) {
          walletTransactionOrderIds.add(
            data.orderId
          );
        }
      }
    );

    /*
     * DATA ORDERS WITHOUT WALLET TRANSACTION
     */

    dataOrdersSnapshot.forEach((doc) => {
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
          debitStatus:
            data.debitStatus ||
            null,
        },
      });
    });

    /*
     * AIRTIME ORDERS WITHOUT WALLET TRANSACTION
     */

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

          title: "Airtime Purchase",

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
            airtimeAmount:
              amount,

            debitStatus:
              data.debitStatus ||
              null,
          },
        });
      }
    );

    /*
     * ELECTRICITY ORDERS WITHOUT WALLET TRANSACTION
     */

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

          category: "electricity",

          type: "purchase",

          service: "electricity",

          title: "Electricity Purchase",

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
      "Transaction history error:",
      error.message
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load transaction history",
    });
  }
});

module.exports = router;