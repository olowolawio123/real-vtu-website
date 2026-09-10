import React, { useEffect, useState } from "react";
import axios from "axios";
import { PaystackButton } from "react-paystack";
import { auth } from "../../firebase";
import { toast } from "react-toastify";

const FundWallet = () => {
  const [amount, setAmount] = useState("");
  const [user, setUser] = useState(null);

  const publicKey =
    process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  // =====================================================
  // AUTHENTICATED USER
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged((authUser) => {
        setUser(authUser);
      });

    return () => unsubscribe();
  }, []);

  // =====================================================
  // PAYMENT SUCCESS
  // =====================================================

  const handleSuccess = async (reference) => {
    try {
      if (!user) {
        toast.error("Please log in again.");
        return;
      }

      const paymentReference =
        reference?.reference || reference;

      if (!paymentReference) {
        toast.error(
          "Payment reference was not received."
        );
        return;
      }

      console.log(
        "Payment reference:",
        paymentReference
      );

      console.log(
        "Firebase UID:",
        user.uid
      );

      const response = await axios.post(
        `${apiUrl}/api/verify-payment`,
        {
          reference: paymentReference,
          uid: user.uid,
        }
      );

      if (response.data.success) {
        toast.success(
          `Wallet funded successfully with ₦${Number(
            response.data.amount
          ).toLocaleString()}`
        );

        setAmount("");
      }
    } catch (error) {
      console.error(
        "Verification error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        "Payment completed, but wallet verification failed. Do not pay again."
      );
    }
  };

  // =====================================================
  // PAYMENT CLOSED
  // =====================================================

  const handleClose = () => {
    toast.info(
      "Payment window closed."
    );
  };

  // =====================================================
  // PAYSTACK CONFIG
  // =====================================================

  const config = {
    reference:
      new Date().getTime().toString(),

    email:
      user?.email || "",

    // Paystack uses kobo
    amount:
      Number(amount) * 100,

    publicKey,

    currency: "NGN",

    // Connect payment to Firebase user
    metadata: {
      uid:
        user?.uid || "",

      name:
        user?.displayName || "",
    },

    onSuccess:
      handleSuccess,

    onClose:
      handleClose,
  };

  // =====================================================
  // QUICK AMOUNTS
  // =====================================================

  const quickAmounts = [
    100,
    500,
    1000,
    2000,
    5000,
    10000,
  ];

  const numericAmount =
    Number(amount);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <div style={styles.brandBadge}>
              INSTANT LOAD
            </div>

            <h1 style={styles.title}>
              Fund Wallet
            </h1>

            <p style={styles.subtitle}>
              Add money to your wallet and
              enjoy instant VTU services.
            </p>
          </div>

          <div style={styles.securityBadge}>
            <span style={styles.lockIcon}>
              🔒
            </span>

            <div>
              <strong style={styles.securityTitle}>
                Secure Payment
              </strong>

              <span style={styles.securityText}>
                Powered by Paystack
              </span>
            </div>
          </div>
        </div>

        {/* MAIN CARD */}

        <div style={styles.card}>

          {/* WALLET HERO */}

          <div style={styles.walletHero}>
            <div>
              <span style={styles.walletLabel}>
                WALLET FUNDING
              </span>

              <h2 style={styles.walletTitle}>
                Add money to your wallet
              </h2>

              <p style={styles.walletText}>
                Enter an amount below to
                continue with your secure
                payment.
              </p>
            </div>

            <div style={styles.walletIconLarge}>
              ₦
            </div>
          </div>

          {/* AMOUNT */}

          <div style={styles.section}>
            <label style={styles.label}>
              Amount to fund
            </label>

            <div style={styles.amountWrapper}>
              <span style={styles.currency}>
                ₦
              </span>

              <input
                type="number"
                inputMode="decimal"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                style={styles.amountInput}
              />
            </div>

            <p style={styles.amountHint}>
              Minimum funding amount: ₦1
            </p>
          </div>

          {/* QUICK AMOUNTS */}

          <div style={styles.section}>
            <label style={styles.label}>
              Quick amount
            </label>

            <div style={styles.quickGrid}>
              {quickAmounts.map(
                (quickAmount) => {
                  const active =
                    numericAmount ===
                    quickAmount;

                  return (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() =>
                        setAmount(
                          String(
                            quickAmount
                          )
                        )
                      }
                      style={{
                        ...styles.quickButton,
                        ...(active
                          ? styles.quickButtonActive
                          : {}),
                      }}
                    >
                      ₦
                      {quickAmount.toLocaleString()}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* PAYMENT SUMMARY */}

          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span>
                Funding amount
              </span>

              <strong>
                ₦
                {numericAmount > 0
                  ? numericAmount.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )
                  : "0.00"}
              </strong>
            </div>

            <div style={styles.summaryRow}>
              <span>
                Payment fee
              </span>

              <strong>
                ₦0.00
              </strong>
            </div>

            <div style={styles.summaryDivider} />

            <div style={styles.totalRow}>
              <span>
                Total
              </span>

              <strong>
                ₦
                {numericAmount > 0
                  ? numericAmount.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )
                  : "0.00"}
              </strong>
            </div>
          </div>

          {/* PAY BUTTON */}

          <div style={styles.paymentArea}>
            {numericAmount > 0 &&
            user &&
            publicKey ? (
              <PaystackButton
                {...config}
                className="instant-load-paystack-button"
                text={`Fund Wallet — ₦${numericAmount.toLocaleString()}`}
                style={styles.paystackButton}
              />
            ) : (
              <button
                type="button"
                disabled
                style={
                  styles.disabledPayButton
                }
              >
                {numericAmount <= 0
                  ? "Enter Amount to Continue"
                  : !user
                  ? "Please Log In"
                  : "Payment Unavailable"}
              </button>
            )}
          </div>

          {/* LOGIN WARNING */}

          {!user && (
            <div style={styles.warning}>
              <span>
                ⚠️
              </span>

              <span>
                Please log in to fund your
                wallet.
              </span>
            </div>
          )}

          {/* PUBLIC KEY WARNING */}

          {!publicKey && (
            <div style={styles.warning}>
              <span>
                ⚠️
              </span>

              <span>
                Paystack public key is not
                configured.
              </span>
            </div>
          )}
        </div>

        {/* TRUST SECTION */}

        <div style={styles.trustCard}>
          <div style={styles.trustHeader}>
            <div style={styles.trustIcon}>
              🛡️
            </div>

            <div>
              <strong style={styles.trustTitle}>
                Safe & Secure Funding
              </strong>

              <p style={styles.trustText}>
                Your payment is securely
                processed through Paystack.
              </p>
            </div>
          </div>

          <div style={styles.trustGrid}>

            <div style={styles.trustItem}>
              <span
                style={styles.trustItemIcon}
              >
                🔒
              </span>

              <div>
                <strong>
                  Secure
                </strong>

                <span>
                  Protected payment
                </span>
              </div>
            </div>

            <div style={styles.trustItem}>
              <span
                style={styles.trustItemIcon}
              >
                ⚡
              </span>

              <div>
                <strong>
                  Fast
                </strong>

                <span>
                  Instant wallet credit
                </span>
              </div>
            </div>

            <div style={styles.trustItem}>
              <span
                style={styles.trustItemIcon}
              >
                ✓
              </span>

              <div>
                <strong>
                  Reliable
                </strong>

                <span>
                  Payment verification
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* HELP */}

        <div style={styles.help}>
          <strong>
            Need help?
          </strong>

          <span>
            Contact INSTANT LOAD support
            if your wallet does not update
            after payment.
          </span>
        </div>

      </div>
    </div>
  );
};

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f8ff 0%, #eef3ff 100%)",
    padding:
      "35px 20px 60px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  container: {
    maxWidth: "850px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "25px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },

  brandBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding:
      "6px 11px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
    marginBottom: "9px",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "34px",
    fontWeight: 800,
    letterSpacing: "-0.8px",
  },

  subtitle: {
    margin:
      "7px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  securityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "15px",
    padding:
      "12px 16px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.05)",
  },

  lockIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    background: "#ecfdf5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  securityTitle: {
    display: "block",
    color: "#111827",
    fontSize: "13px",
  },

  securityText: {
    display: "block",
    color: "#9ca3af",
    fontSize: "11px",
    marginTop: "2px",
  },

  card: {
    background: "#fff",
    borderRadius: "24px",
    padding: "30px",
    boxShadow:
      "0 15px 50px rgba(15,23,42,0.08)",
  },

  walletHero: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    background:
      "linear-gradient(135deg, #111827, #1e3a8a)",
    color: "#fff",
    borderRadius: "19px",
    padding:
      "24px",
    marginBottom: "28px",
    overflow: "hidden",
  },

  walletLabel: {
    display: "block",
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1.2px",
    marginBottom: "6px",
  },

  walletTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
  },

  walletText: {
    margin:
      "7px 0 0",
    color: "#cbd5e1",
    fontSize: "13px",
    maxWidth: "500px",
  },

  walletIconLarge: {
    width: "65px",
    height: "65px",
    flexShrink: 0,
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "29px",
    fontWeight: 800,
  },

  section: {
    marginBottom: "25px",
  },

  label: {
    display: "block",
    color: "#374151",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "9px",
  },

  amountWrapper: {
    display: "flex",
    alignItems: "center",
    border:
      "2px solid #dbeafe",
    borderRadius: "15px",
    background: "#f8fbff",
    padding:
      "0 16px",
  },

  currency: {
    color: "#2563eb",
    fontSize: "24px",
    fontWeight: 800,
  },

  amountInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    padding:
      "17px 10px",
    fontSize: "25px",
    fontWeight: 800,
    color: "#111827",
  },

  amountHint: {
    margin:
      "7px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "10px",
  },

  quickButton: {
    border:
      "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    borderRadius: "12px",
    padding:
      "12px 10px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  quickButtonActive: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border:
      "1px solid #60a5fa",
  },

  summary: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding:
      "18px",
    marginBottom: "18px",
  },

  summaryRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "11px",
  },

  summaryDivider: {
    height: "1px",
    background: "#e5e7eb",
    margin:
      "14px 0",
  },

  totalRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    color: "#111827",
    fontSize: "15px",
    fontWeight: 800,
  },

  paymentArea: {
    width: "100%",
  },

  paystackButton: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "17px",
    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 10px 25px rgba(37,99,235,0.22)",
  },

  disabledPayButton: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "17px",
    background: "#e5e7eb",
    color: "#9ca3af",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "not-allowed",
  },

  warning: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "#dc2626",
    background: "#fef2f2",
    border:
      "1px solid #fecaca",
    borderRadius: "11px",
    padding:
      "11px",
    marginTop: "12px",
    fontSize: "12px",
  },

  trustCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "22px",
    marginTop: "24px",
    boxShadow:
      "0 10px 35px rgba(15,23,42,0.06)",
  },

  trustHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  trustIcon: {
    width: "43px",
    height: "43px",
    borderRadius: "13px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  trustTitle: {
    display: "block",
    color: "#111827",
    fontSize: "14px",
  },

  trustText: {
    margin:
      "4px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
  },

  trustGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
  },

  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  trustItemIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    flexShrink: 0,
  },

  help: {
    display: "flex",
    justifyContent: "center",
    gap: "5px",
    flexWrap: "wrap",
    textAlign: "center",
    marginTop: "20px",
    color: "#9ca3af",
    fontSize: "11px",
  },
};

export default FundWallet;