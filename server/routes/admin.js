const express = require("express");
const admin = require("firebase-admin");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "";

function isAdmin(req) {
  const email = String(
    req.user?.email || ""
  ).toLowerCase();

  return (
    ADMIN_EMAIL &&
    email === ADMIN_EMAIL.toLowerCase()
  );
}

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

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizeStatus(status) {
  const value = String(
    status || ""
  ).toLowerCase();

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
 * ADMIN ACCESS
 */

router.use(requireAuth);

router.use((req, res, next) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
});

/*
 * ADMIN DASHBOARD SUMMARY
 */

router.get("/dashboard", async (req, res) => {
  try {
    const db = admin.firestore();

    const [
      usersSnapshot,
      walletPaymentsSnapshot,
      walletTransactionsSnapshot,
      dataOrdersSnapshot,
      airtimeOrdersSnapshot,
      electricityOrdersSnapshot,
      cableTvOrdersSnapshot,
    ] = await Promise.all([
      db.collection("users").get(),

      db.collection("walletPayments").get(),

      db.collection("walletTransactions").get(),

      db.collection("dataOrders").get(),

      db.collection("airtimeOrders").get(),

      db.collection("electricityOrders").get(),

      db.collection("cableTvOrders").get(),
    ]);

    let totalWalletFunding = 0;
    let successfulWalletFunding = 0;

    walletPaymentsSnapshot.forEach(
      (doc) => {
        const data = doc.data();

        const amount = numberOrZero(
          data.amount
        );

        totalWalletFunding += amount;

        const status =
          normalizeStatus(data.status);

        if (status === "successful") {
          successfulWalletFunding += amount;
        }
      }
    );

    let totalWalletDebits = 0;
    let totalRefunds = 0;

    walletTransactionsSnapshot.forEach(
      (doc) => {
        const data = doc.data();

        const amount = Math.abs(
          numberOrZero(data.amount)
        );

        const type = String(
          data.type || ""
        ).toLowerCase();

        if (type === "debit") {
          totalWalletDebits += amount;
        }

        if (type === "refund") {
          totalRefunds += amount;
        }
      }
    );

    const countSuccessful = (
      snapshot
    ) => {
      let count = 0;

      snapshot.forEach((doc) => {
        const status =
          normalizeStatus(
            doc.data().status
          );

        if (status === "successful") {
          count += 1;
        }
      });

      return count;
    };

    const countProcessing = (
      snapshot
    ) => {
      let count = 0;

      snapshot.forEach((doc) => {
        const status =
          normalizeStatus(
            doc.data().status
          );

        if (status === "processing") {
          count += 1;
        }
      });

      return count;
    };

    const countFailed = (
      snapshot
    ) => {
      let count = 0;

      snapshot.forEach((doc) => {
        const status =
          normalizeStatus(
            doc.data().status
          );

        if (status === "failed") {
          count += 1;
        }
      });

      return count;
    };

    return res.status(200).json({
      success: true,

      data: {
        users: {
          total: usersSnapshot.size,
        },

        wallet: {
          totalFunding:
            totalWalletFunding,

          successfulFunding:
            successfulWalletFunding,

          totalDebits:
            totalWalletDebits,

          totalRefunds:
            totalRefunds,
        },

        services: {
          data: {
            total:
              dataOrdersSnapshot.size,

            successful:
              countSuccessful(
                dataOrdersSnapshot
              ),

            processing:
              countProcessing(
                dataOrdersSnapshot
              ),

            failed:
              countFailed(
                dataOrdersSnapshot
              ),
          },

          airtime: {
            total:
              airtimeOrdersSnapshot.size,

            successful:
              countSuccessful(
                airtimeOrdersSnapshot
              ),

            processing:
              countProcessing(
                airtimeOrdersSnapshot
              ),

            failed:
              countFailed(
                airtimeOrdersSnapshot
              ),
          },

          electricity: {
            total:
              electricityOrdersSnapshot.size,

            successful:
              countSuccessful(
                electricityOrdersSnapshot
              ),

            processing:
              countProcessing(
                electricityOrdersSnapshot
              ),

            failed:
              countFailed(
                electricityOrdersSnapshot
              ),
          },

          cableTv: {
            total:
              cableTvOrdersSnapshot.size,

            successful:
              countSuccessful(
                cableTvOrdersSnapshot
              ),

            processing:
              countProcessing(
                cableTvOrdersSnapshot
              ),

            failed:
              countFailed(
                cableTvOrdersSnapshot
              ),
          },
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load admin dashboard",
    });
  }
});

/*
 * ALL USERS
 */

router.get("/users", async (req, res) => {
  try {
    const db = admin.firestore();

    const snapshot =
      await db
        .collection("users")
        .get();

    const users = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      users.push({
        id: doc.id,

        uid:
          data.uid ||
          doc.id,

        email:
          data.email ||
          null,

        wallet:
          numberOrZero(
            data.wallet
          ),

        createdAt:
          timestampToISOString(
            data.createdAt
          ),
      });
    });

    users.sort(
      (a, b) =>
        timestampToMillis(
          b.createdAt
        ) -
        timestampToMillis(
          a.createdAt
        )
    );

    return res.status(200).json({
      success: true,

      count: users.length,

      data: users,
    });
  } catch (error) {
    console.error(
      "Admin users error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load users",
    });
  }
});

/*
 * ALL ORDERS
 */

router.get("/orders", async (req, res) => {
  try {
    const db = admin.firestore();

    const [
      dataSnapshot,
      airtimeSnapshot,
      electricitySnapshot,
      cableSnapshot,
    ] = await Promise.all([
      db
        .collection("dataOrders")
        .get(),

      db
        .collection("airtimeOrders")
        .get(),

      db
        .collection("electricityOrders")
        .get(),

      db
        .collection("cableTvOrders")
        .get(),
    ]);

    const orders = [];

    const addOrders = (
      snapshot,
      service
    ) => {
      snapshot.forEach((doc) => {
        const data = doc.data();

        const amount =
          numberOrZero(
            data.amount ??
              data.sellingPrice ??
              data.planAmount
          );

        orders.push({
          id: doc.id,

          service,

          uid:
            data.uid ||
            null,

          amount,

          status:
            normalizeStatus(
              data.status
            ),

          reference:
            data.reference ||
            data.requestId ||
            data.orderId ||
            doc.id,

          requestId:
            data.requestId ||
            null,

          network:
            data.network ||
            null,

          mobileNumber:
            data.mobileNumber ||
            data.mobile_number ||
            null,

          plan:
            data.planName ||
            data.plan ||
            data.size ||
            null,

          cableProvider:
            firstValue(
              data,
              [
                "cableName",
                "cable_name",
                "cableProvider",
                "cable_provider",
                "providerName",
                "provider",
                "the_cabletv_name",
              ]
            ),

          smartCardNumber:
            firstValue(
              data,
              [
                "smartCardNumber",
                "smart_card_number",
                "smartcardNumber",
                "smartcard_number",
                "iucNumber",
                "iuc_number",
                "iuc",
              ]
            ),

          electricityProvider:
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
            ),

          meterNumber:
            firstValue(
              data,
              [
                "meterNumber",
                "meter_number",
                "meter",
              ]
            ),

          meterType:
            firstValue(
              data,
              [
                "meterType",
                "meter_type",
                "MeterType",
              ]
            ),

          token:
            firstValue(
              data,
              [
                "token",
                "electricityToken",
                "electricity_token",
              ]
            ),

          providerReference:
            data.providerReference ||
            data.provider_reference ||
            data.providerRef ||
            null,

          createdAt:
            timestampToISOString(
              data.createdAt
            ),
        });
      });
    };

    addOrders(
      dataSnapshot,
      "data"
    );

    addOrders(
      airtimeSnapshot,
      "airtime"
    );

    addOrders(
      electricitySnapshot,
      "electricity"
    );

    addOrders(
      cableSnapshot,
      "cabletv"
    );

    orders.sort(
      (a, b) =>
        timestampToMillis(
          b.createdAt
        ) -
        timestampToMillis(
          a.createdAt
        )
    );

    return res.status(200).json({
      success: true,

      count: orders.length,

      data: orders,
    });
  } catch (error) {
    console.error(
      "Admin orders error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load orders",
    });
  }
});

/*
 * ALL WALLET TRANSACTIONS
 */

router.get(
  "/wallet-transactions",
  async (req, res) => {
    try {
      const db = admin.firestore();

      const snapshot =
        await db
          .collection(
            "walletTransactions"
          )
          .get();

      const transactions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        transactions.push({
          id: doc.id,

          uid:
            data.uid ||
            null,

          type:
            data.type ||
            null,

          service:
            data.service ||
            null,

          amount:
            numberOrZero(
              data.amount
            ),

          status:
            normalizeStatus(
              data.status
            ),

          reference:
            data.reference ||
            data.requestId ||
            doc.id,

          requestId:
            data.requestId ||
            null,

          orderId:
            data.orderId ||
            null,

          description:
            data.description ||
            null,

          balanceBefore:
            numberOrZero(
              data.balanceBefore
            ),

          balanceAfter:
            numberOrZero(
              data.balanceAfter
            ),

          createdAt:
            timestampToISOString(
              data.createdAt
            ),
        });
      });

      transactions.sort(
        (a, b) =>
          timestampToMillis(
            b.createdAt
          ) -
          timestampToMillis(
            a.createdAt
          )
      );

      return res.status(200).json({
        success: true,

        count:
          transactions.length,

        data: transactions,
      });
    } catch (error) {
      console.error(
        "Admin wallet transactions error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load wallet transactions",
      });
    }
  }
);

module.exports = router;