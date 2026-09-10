require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const {
  startPendingOrderChecker,
} = require("./services/pendingOrderService"); 

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

const verifyPaymentRoute = require("./routes/verifyPayment");
const recoverPaymentRoute = require("./routes/recoverPayment");
const webhookRoute = require("./routes/paystackWebhook");
const vtuRoute = require("./routes/vtu");
const transactionsRoute = require("./routes/transactions");
const adminRoute = require("./routes/admin");

app.post(
  "/api/paystack/webhook",
  express.raw({
    type: "application/json",
  }),
  webhookRoute
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "vtu-payment-server",
  });
});

app.use("/api", verifyPaymentRoute);
app.use("/api", recoverPaymentRoute);
app.use("/api/vtu", vtuRoute);
app.use("/api/transactions", transactionsRoute);
app.use("/api/admin", adminRoute);

app.listen(port, () => {
  console.log(
    `Server running on port ${port}`
  );

  startPendingOrderChecker();
});