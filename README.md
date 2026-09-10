# VTU Website - Paystack Wallet Funding

This project uses Paystack for payments and Firebase Firestore for user wallets.

## Payment flow

1. Customer starts a Paystack payment.
2. Paystack sends `charge.success` to `POST /api/paystack/webhook`.
3. The server verifies the transaction with Paystack.
4. The server checks the Firebase user ID in Paystack metadata.
5. The server atomically credits `users/{uid}.wallet`.
6. A `walletPayments/{reference}` document makes the operation idempotent, so one payment reference cannot credit the wallet twice.
7. The browser also calls `/api/verify-payment` immediately after payment as a convenience/fallback.

The webhook is the important part: wallet crediting does not depend on the customer keeping the browser open.

## Required server environment variables

```text
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
PAYSTACK_SECRET_KEY=sk_test_...
FIREBASE_SERVICE_ACCOUNT_JSON={...}
```

For local development you can instead put the Firebase Admin service account file at:

```text
server/serviceAccountKey.json
```

Do not commit that file.

## Required frontend environment variables

```text
REACT_APP_PAYSTACK_PUBLIC_KEY=pk_test_...
REACT_APP_API_URL=https://your-api-domain.com
```

## Paystack dashboard

Set the webhook URL to:

```text
https://your-api-domain.com/api/paystack/webhook
```

The server must be publicly reachable over HTTPS in production.

## Important security note

Never put a Paystack secret key (`sk_...`) in React or any `REACT_APP_*` variable. Secret keys belong only on the server.

If an old secret key was exposed in source code, rotate it in Paystack before going live.
