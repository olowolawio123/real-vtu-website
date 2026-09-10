const admin = require("firebase-admin");

const {
  queryElectricityTransaction,
} = require("./electricityService");

const CHECK_INTERVAL_MS = 60 * 1000;

const MAX_ORDERS_PER_CHECK = 20;

let checkerStarted = false;


/*
 * ------------------------------------------------------------
 * PROVIDER STATUS HELPERS
 * ------------------------------------------------------------
 */

function getProviderStatus(providerResult) {
  return String(
    providerResult?.status ||
      providerResult?.Status ||
      providerResult?.data?.status ||
      providerResult?.data?.Status ||
      ""
  ).toLowerCase();
}


function isProviderSuccessful(providerResult) {
  const status =
    getProviderStatus(providerResult);

  return (
    status === "successful" ||
    status === "success"
  );
}


function isProviderFailed(providerResult) {
  const status =
    getProviderStatus(providerResult);

  return (
    status === "failed" ||
    status === "fail" ||
    status === "error" ||
    status === "rejected"
  );
}


/*
 * ------------------------------------------------------------
 * REFUND ELECTRICITY ORDER
 * ------------------------------------------------------------
 *
 * Refunds the exact amount that was originally removed
 * from the customer's wallet.
 *
 * For electricity:
 *
 * customer pays = provider amount + ₦50
 *
 * therefore:
 *
 * refund = order.amount
 *
 * NOT order.providerAmount.
 */

async function refundElectricityOrder({
  orderRef,
  userId,
  reason,
  providerResult,
}) {
  const db = admin.firestore();

  const walletTransactionRef = db
    .collection("walletTransactions")
    .where("orderId", "==", orderRef.id)
    .limit(1);

  await db.runTransaction(
    async (transaction) => {
      /*
       * Read order first.
       */

      const orderSnap =
        await transaction.get(
          orderRef
        );

      if (!orderSnap.exists) {
        throw new Error(
          "ELECTRICITY_ORDER_NOT_FOUND"
        );
      }

      const orderData =
        orderSnap.data();

      /*
       * Never refund an already successful order.
       */

      if (
        orderData.status ===
        "successful"
      ) {
        console.log(
          "REFUND SKIPPED: electricity order already successful.",
          orderRef.id
        );

        return;
      }

      /*
       * Never refund twice.
       */

      if (
        orderData.debitStatus ===
        "refunded"
      ) {
        console.log(
          "REFUND SKIPPED: electricity order already refunded.",
          orderRef.id
        );

        return;
      }

      /*
       * The order must have been debited before
       * a refund can happen.
       */

      if (
        orderData.debitStatus !==
        "debited"
      ) {
        console.log(
          "REFUND SKIPPED: electricity order was not debited.",
          {
            orderId:
              orderRef.id,

            debitStatus:
              orderData.debitStatus ||
              null,
          }
        );

        return;
      }

      const userIdFromOrder =
        orderData.uid;

      if (!userIdFromOrder) {
        throw new Error(
          "ELECTRICITY_ORDER_USER_MISSING"
        );
      }

      /*
       * Get the customer wallet.
       */

      const userRef = db
        .collection("users")
        .doc(userIdFromOrder);

      const userSnap =
        await transaction.get(
          userRef
        );

      if (!userSnap.exists) {
        throw new Error(
          "ELECTRICITY_USER_NOT_FOUND"
        );
      }

      const currentBalance =
        Number(
          userSnap.data()?.wallet ||
            0
        );

      if (
        !Number.isFinite(
          currentBalance
        )
      ) {
        throw new Error(
          "ELECTRICITY_INVALID_WALLET"
        );
      }

      /*
       * This is the amount originally charged
       * to the customer.
       */

      const refundAmount =
        Number(
          orderData.amount || 0
        );

      if (
        !Number.isFinite(
          refundAmount
        ) ||
        refundAmount <= 0
      ) {
        throw new Error(
          "ELECTRICITY_INVALID_REFUND_AMOUNT"
        );
      }

      const refundBalance =
        currentBalance +
        refundAmount;

      /*
       * Update wallet.
       */

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

      /*
       * Find the original debit ledger.
       */

      const ledgerQuerySnap =
        await db
          .collection(
            "walletTransactions"
          )
          .where(
            "orderId",
            "==",
            orderRef.id
          )
          .limit(1)
          .get();

      if (
        ledgerQuerySnap.empty
      ) {
        throw new Error(
          "ELECTRICITY_LEDGER_NOT_FOUND"
        );
      }

      const ledgerRef =
        ledgerQuerySnap.docs[0].ref;

      /*
       * Update original debit entry.
       */

      transaction.update(
        ledgerRef,
        {
          status:
            "refunded",

          refundAmount:
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

      /*
       * Create a separate refund ledger entry.
       */

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
            userIdFromOrder,

          type:
            "refund",

          service:
            "electricity",

          amount:
            refundAmount,

          orderId:
            orderRef.id,

          requestId:
            orderData.requestId ||
            null,

          balanceBefore:
            currentBalance,

          balanceAfter:
            refundBalance,

          status:
            "completed",

          description:
            "Electricity purchase refund",

          refundReason:
            reason,

          providerTransactionId:
            orderData.providerTransactionId ||
            null,

          createdAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        }
      );

      /*
       * Mark the order as failed/refunded.
       */

      transaction.update(
        orderRef,
        {
          status:
            "failed",

          debitStatus:
            "refunded",

          refundAmount:
            refundAmount,

          refundReason:
            reason,

          providerResult:
            providerResult ||
            null,

          refundedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),

          updatedAt:
            admin.firestore
              .FieldValue
              .serverTimestamp(),
        }
      );

      console.log(
        "ELECTRICITY ORDER REFUNDED:",
        {
          orderId:
            orderRef.id,

          uid:
            userIdFromOrder,

          refundAmount,

          balanceBefore:
            currentBalance,

          balanceAfter:
            refundBalance,
        }
      );
    }
  );
}


/*
 * ------------------------------------------------------------
 * MARK ELECTRICITY ORDER SUCCESSFUL
 * ------------------------------------------------------------
 */

async function markElectricitySuccessful({
  orderRef,
  providerResult,
}) {
  const db = admin.firestore();

  await db.runTransaction(
    async (transaction) => {
      const orderSnap =
        await transaction.get(
          orderRef
        );

      if (!orderSnap.exists) {
        throw new Error(
          "ELECTRICITY_ORDER_NOT_FOUND"
        );
      }

      const orderData =
        orderSnap.data();

      /*
       * If another process already completed
       * the order, do nothing.
       */

      if (
        orderData.status ===
        "successful"
      ) {
        console.log(
          "SUCCESS UPDATE SKIPPED: order already successful.",
          orderRef.id
        );

        return;
      }

      /*
       * If the order was already refunded,
       * NEVER turn it back into successful.
       */

      if (
        orderData.debitStatus ===
        "refunded"
      ) {
        console.log(
          "SUCCESS UPDATE SKIPPED: order already refunded.",
          orderRef.id
        );

        return;
      }

      const providerTransactionId =
        orderData.providerTransactionId ||
        providerResult?.data
          ?.transaction_id ||
        providerResult?.transaction_id ||
        providerResult?.data?.id ||
        providerResult?.id ||
        providerResult?.data?.ident ||
        providerResult?.ident ||
        null;

      const providerReference =
        providerResult?.data?.ident ||
        providerResult?.data?.id ||
        providerResult?.ident ||
        providerResult?.id ||
        providerResult?.reference ||
        null;

      const electricityToken =
        providerResult?.data
          ?.electricitytoken ||
        providerResult?.data?.token ||
        providerResult?.electricitytoken ||
        providerResult?.token ||
        null;

      /*
       * Mark the order successful.
       */

      transaction.update(
        orderRef,
        {
          status:
            "successful",

          debitStatus:
            "debited",

          providerTransactionId,

          providerReference,

          electricityToken,

          providerResult,

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

      /*
       * Update the original wallet ledger.
       */

      const ledgerQuerySnap =
        await db
          .collection(
            "walletTransactions"
          )
          .where(
            "orderId",
            "==",
            orderRef.id
          )
          .limit(1)
          .get();

      if (
        !ledgerQuerySnap.empty
      ) {
        const ledgerRef =
          ledgerQuerySnap.docs[0].ref;

        transaction.update(
          ledgerRef,
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

      console.log(
        "ELECTRICITY ORDER MARKED SUCCESSFUL:",
        {
          orderId:
            orderRef.id,

          providerTransactionId,

          providerReference,
        }
      );
    }
  );
}


/*
 * ------------------------------------------------------------
 * CHECK ONE PENDING ELECTRICITY ORDER
 * ------------------------------------------------------------
 */

async function checkOnePendingElectricityOrder(
  doc
) {
  const order =
    doc.data();

  const orderRef =
    doc.ref;

  const orderId =
    doc.id;

  const providerTransactionId =
    order.providerTransactionId ||
    null;

  console.log(
    "PENDING ELECTRICITY ORDER:",
    {
      orderId,

      requestId:
        order.requestId ||
        null,

      providerTransactionId,

      meterNumber:
        order.meterNumber ||
        null,

      amount:
        order.amount ||
        null,

      providerAmount:
        order.providerAmount ||
        null,

      status:
        order.status ||
        null,

      debitStatus:
        order.debitStatus ||
        null,
    }
  );

  /*
   * We cannot query VTU without the provider
   * transaction ID.
   *
   * DO NOT REFUND.
   */

  if (
    !providerTransactionId
  ) {
    console.log(
      "CANNOT CHECK PROVIDER STATUS: transaction ID is missing.",
      orderId
    );

    return;
  }

  try {
    const providerResult =
      await queryElectricityTransaction(
        {
          transactionId:
            providerTransactionId,
        }
      );

    console.log(
      "ELECTRICITY STATUS RESULT:",
      {
        orderId,

        providerTransactionId,

        providerResult,
      }
    );

    /*
     * Provider says successful.
     */

    if (
      isProviderSuccessful(
        providerResult
      )
    ) {
      await markElectricitySuccessful(
        {
          orderRef,

          providerResult,
        }
      );

      return;
    }

    /*
     * Provider says failed.
     */

    if (
      isProviderFailed(
        providerResult
      )
    ) {
      await refundElectricityOrder(
        {
          orderRef,

          userId:
            order.uid,

          reason:
            "Electricity provider confirmed transaction failure",

          providerResult,
        }
      );

      return;
    }

    /*
     * Provider still says processing,
     * pending, initiated, etc.
     *
     * Do nothing. The next checker cycle
     * will try again.
     */

    console.log(
      "ELECTRICITY TRANSACTION STILL PROCESSING:",
      {
        orderId,

        providerTransactionId,

        providerStatus:
          getProviderStatus(
            providerResult
          ),
      }
    );
  } catch (error) {
    /*
     * Query failure does NOT mean the customer's
     * purchase failed.
     *
     * Do NOT refund.
     */

    console.error(
      "ELECTRICITY STATUS QUERY ERROR:",
      {
        orderId,

        providerTransactionId,

        error:
          error.response?.data ||
          error.message,
      }
    );
  }
}


/*
 * ------------------------------------------------------------
 * CHECK ALL PENDING ELECTRICITY ORDERS
 * ------------------------------------------------------------
 */

async function checkPendingElectricityOrders() {
  try {
    const db =
      admin.firestore();

    const snapshot =
      await db
        .collection(
          "electricityOrders"
        )
        .where(
          "status",
          "==",
          "unknown"
        )
        .limit(
          MAX_ORDERS_PER_CHECK
        )
        .get();

    if (
      snapshot.empty
    ) {
      console.log(
        "PENDING ELECTRICITY CHECK: no unknown orders."
      );

      return;
    }

    console.log(
      `PENDING ELECTRICITY CHECK: ${snapshot.size} order(s) found`
    );

    /*
     * Process sequentially.
     *
     * This prevents us from sending a large burst
     * of requests to the provider.
     */

    for (
      const doc of snapshot.docs
    ) {
      await checkOnePendingElectricityOrder(
        doc
      );
    }
  } catch (error) {
    console.error(
      "PENDING ELECTRICITY CHECK ERROR:",
      error.message
    );
  }
}


/*
 * ------------------------------------------------------------
 * START AUTOMATIC CHECKER
 * ------------------------------------------------------------
 */

function startPendingOrderChecker() {
  if (
    checkerStarted
  ) {
    return;
  }

  checkerStarted = true;

  console.log(
    "Automatic pending-order checker started."
  );

  /*
   * Run immediately when the server starts.
   */

  checkPendingElectricityOrders();

  /*
   * Then check every 60 seconds.
   */

  setInterval(
    checkPendingElectricityOrders,
    CHECK_INTERVAL_MS
  );
}


module.exports = {
  startPendingOrderChecker,

  checkPendingElectricityOrders,

  checkOnePendingElectricityOrder,

  refundElectricityOrder,

  markElectricitySuccessful,
};