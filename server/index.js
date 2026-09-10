const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 5000;

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:3000"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: false,
  })
);

/*
 * FIREBASE ADMIN
 *
 * IMPORTANT:
 * Firebase must be initialized BEFORE
 * loading routes that use admin.firestore().
 */
function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log(
      "Firebase Admin initialized from environment variable"
    );

    return;
  }

  const serviceAccount = require(
    "./serviceAccountKey.json"
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log(
    "Firebase Admin initialized from serviceAccountKey.json"
  );
}

initializeFirebaseAdmin();

/*
 * ROUTES
 *
 * IMPORTANT:
 * These are loaded AFTER Firebase initialization.
 */
const verifyPaymentRoute = require("./routes/verifyPayment");
const webhookRoute = require("./routes/paystackWebhook");
const vtuRoute = require("./routes/vtu");
const transactionsRoute = require("./routes/transactions");
const adminRoute = require("./routes/admin");

/*
 * PAYSTACK WEBHOOK
 *
 * IMPORTANT:
 * This must come before express.json()
 * because Paystack signature verification
 * requires the raw request body.
 */
app.post(
  "/api/paystack/webhook",
  express.raw({
    type: "application/json",
  }),
  webhookRoute
);

/*
 * JSON BODY PARSER
 */
app.use(express.json());

/*
 * HEALTH CHECK
 */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "vtu-payment-server",
  });
});

/*
 * PAYMENT VERIFICATION
 */
app.use(
  "/api",
  verifyPaymentRoute
);

/*
 * VTU SERVICES
 */
app.use(
  "/api/vtu",
  vtuRoute
);

/*
 * TRANSACTION HISTORY
 */
app.use(
  "/api/transactions",
  transactionsRoute
);

/*
 * ADMIN SECTION
 */
app.use(
  "/api/admin",
  adminRoute
);

/*
 * START SERVER
 */
app.listen(port, () => {
  console.log(
    `Server running on port ${port}`
  );
});