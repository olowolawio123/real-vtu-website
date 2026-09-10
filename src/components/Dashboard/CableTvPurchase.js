import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { toast } from "react-toastify";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const CableTvPurchase = () => {
  const [plans, setPlans] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  const [selectedProvider, setSelectedProvider] =
    useState("");

  const [selectedPlan, setSelectedPlan] =
    useState(null);

  const [smartCardNumber, setSmartCardNumber] =
    useState("");

  const [customer, setCustomer] = useState(null);

  const [loadingPlans, setLoadingPlans] =
    useState(true);

  const [verifying, setVerifying] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [receipt, setReceipt] =
    useState(null);

  // =====================================================
  // LOAD CABLE TV PLANS
  // =====================================================

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoadingPlans(true);

        const response = await axios.get(
          `${API_URL}/api/vtu/cable-tv-plans`
        );

        const cablePlans =
          response.data?.data?.dataplans || [];

        setPlans(cablePlans);

        if (cablePlans.length > 0) {
          setSelectedProvider(
            cablePlans[0].the_cabletv_name
          );
        }
      } catch (error) {
        console.error(
          "Cable TV plans error:",
          error.response?.data || error.message
        );

        toast.error(
          "Unable to load Cable TV plans"
        );
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

  // =====================================================
  // WATCH WALLET
  // =====================================================

  useEffect(() => {
    const unsubscribeAuth =
      auth.onAuthStateChanged((user) => {
        if (!user) {
          setWalletBalance(0);
          return;
        }

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        const unsubscribeWallet =
          onSnapshot(
            userRef,
            (snapshot) => {
              if (snapshot.exists()) {
                const data =
                  snapshot.data() || {};

                setWalletBalance(
                  Number(data.wallet || 0)
                );
              }
            },
            (error) => {
              console.error(
                "Wallet listener error:",
                error
              );
            }
          );

        return () => unsubscribeWallet();
      });

    return () => unsubscribeAuth();
  }, []);

  // =====================================================
  // PROVIDERS
  // =====================================================

  const providers = useMemo(() => {
    const uniqueProviders = [];

    plans.forEach((plan) => {
      const provider =
        plan.the_cabletv_name;

      if (
        provider &&
        !uniqueProviders.includes(provider)
      ) {
        uniqueProviders.push(provider);
      }
    });

    return uniqueProviders;
  }, [plans]);

  // =====================================================
  // PLANS FOR SELECTED PROVIDER
  // =====================================================

  const providerPlans = useMemo(() => {
    return plans.filter(
      (plan) =>
        plan.the_cabletv_name ===
        selectedProvider
    );
  }, [plans, selectedProvider]);

  // =====================================================
  // SELECT PROVIDER
  // =====================================================

  const handleProviderChange = (event) => {
    const provider = event.target.value;

    setSelectedProvider(provider);
    setSelectedPlan(null);
    setCustomer(null);
    setReceipt(null);
  };

  // =====================================================
  // SELECT PLAN
  // =====================================================

  const handlePlanChange = (event) => {
    const planId = event.target.value;

    const plan = providerPlans.find(
      (item) =>
        String(item.cabletv_plan_id) ===
        String(planId)
    );

    setSelectedPlan(plan || null);
    setCustomer(null);
    setReceipt(null);
  };

  // =====================================================
  // VERIFY CUSTOMER
  // =====================================================

  const handleVerifyCustomer = async () => {
    const user = auth.currentUser;

    if (!user) {
      toast.error(
        "Please login before continuing"
      );
      return;
    }

    const cleanSmartCard =
      smartCardNumber.trim();

    if (!cleanSmartCard) {
      toast.error(
        "Enter your Smart Card / IUC number"
      );
      return;
    }

    if (!/^\d+$/.test(cleanSmartCard)) {
      toast.error(
        "Smart Card / IUC number must contain only numbers"
      );
      return;
    }

    try {
      setVerifying(true);
      setCustomer(null);

      const idToken =
        await user.getIdToken();

      const response = await axios.post(
        `${API_URL}/api/vtu/verify-cable-customer`,
        {
          cableName:
            selectedProvider === "GOTV"
              ? "1"
              : selectedProvider === "DSTV"
              ? "2"
              : selectedProvider ===
                "STARTIMES"
              ? "3"
              : "4",
          smartCardNumber:
            cleanSmartCard,
        },
        {
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

      const providerData =
        response.data?.data;

      if (!providerData) {
        toast.error(
          "Customer verification failed"
        );
        return;
      }

      const status = String(
        providerData?.Status ||
          providerData?.status ||
          ""
      ).toLowerCase();

      if (
        status === "failed" ||
        status === "fail" ||
        status === "error"
      ) {
        toast.error(
          providerData?.api_response ||
            "Customer verification failed"
        );
        return;
      }

      setCustomer(providerData);

      toast.success(
        "Customer verified successfully"
      );
    } catch (error) {
      console.error(
        "Cable TV verification error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to verify customer"
      );
    } finally {
      setVerifying(false);
    }
  };

  // =====================================================
  // PURCHASE
  // =====================================================

  const handlePurchase = async () => {
    const user = auth.currentUser;

    if (!user) {
      toast.error(
        "Please login before continuing"
      );
      return;
    }

    if (!selectedProvider) {
      toast.error(
        "Select a Cable TV provider"
      );
      return;
    }

    if (!selectedPlan) {
      toast.error(
        "Select a Cable TV plan"
      );
      return;
    }

    const cleanSmartCard =
      smartCardNumber.trim();

    if (!cleanSmartCard) {
      toast.error(
        "Enter your Smart Card / IUC number"
      );
      return;
    }

    if (!customer) {
      toast.error(
        "Verify the customer before subscribing"
      );
      return;
    }

    const amount = Number(
      selectedPlan.price_for_basicuser
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(
        "Invalid Cable TV plan price"
      );
      return;
    }

    if (amount > walletBalance) {
      toast.error(
        "Insufficient wallet balance"
      );
      return;
    }

    try {
      setPurchasing(true);

      const idToken =
        await user.getIdToken();

      const cableName =
        selectedProvider === "GOTV"
          ? "1"
          : selectedProvider === "DSTV"
          ? "2"
          : selectedProvider ===
            "STARTIMES"
          ? "3"
          : "4";

      const response = await axios.post(
        `${API_URL}/api/vtu/buy-cable-tv`,
        {
          cableName,
          smartCardNumber:
            cleanSmartCard,
          cablePlan:
            selectedPlan.cabletv_plan_id,
          amount,
        },
        {
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        toast.error(
          result?.message ||
            "Cable TV subscription failed"
        );
        return;
      }

      const providerResponse =
        result?.data || {};

      const providerReference =
        result?.providerReference ||
        providerResponse?.ident ||
        providerResponse?.id ||
        providerResponse?.reference ||
        null;

      setReceipt({
        provider: selectedProvider,
        plan: selectedPlan.size,
        smartCardNumber:
          cleanSmartCard,
        amount,
        duration:
          selectedPlan.duration,
        providerReference,
        providerResponse,
      });

      toast.success(
        "Cable TV subscription successful"
      );

      setCustomer(null);
    } catch (error) {
      console.error(
        "Cable TV purchase error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        error.response?.data?.message ||
          "Cable TV subscription failed"
      );
    } finally {
      setPurchasing(false);
    }
  };

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loadingPlans) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>
          Loading Cable TV plans...
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Cable TV Subscription
            </h1>

            <p style={styles.subtitle}>
              Subscribe to your Cable TV package
              using your wallet.
            </p>
          </div>

          <div style={styles.wallet}>
            <span style={styles.walletLabel}>
              Wallet Balance
            </span>

            <strong style={styles.walletAmount}>
              ₦{formatMoney(walletBalance)}
            </strong>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.section}>
            <label style={styles.label}>
              Cable TV Provider
            </label>

            <select
              value={selectedProvider}
              onChange={handleProviderChange}
              style={styles.input}
            >
              <option value="">
                Select provider
              </option>

              {providers.map((provider) => (
                <option
                  key={provider}
                  value={provider}
                >
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>
              Package
            </label>

            <select
              value={
                selectedPlan?.cabletv_plan_id ||
                ""
              }
              onChange={handlePlanChange}
              style={styles.input}
              disabled={!selectedProvider}
            >
              <option value="">
                Select package
              </option>

              {providerPlans.map((plan) => (
                <option
                  key={plan.cabletv_plan_id}
                  value={plan.cabletv_plan_id}
                >
                  {plan.size} — ₦
                  {formatMoney(
                    plan.price_for_basicuser
                  )}
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div style={styles.planBox}>
              <div>
                <span style={styles.smallLabel}>
                  Package
                </span>

                <strong>
                  {selectedPlan.size}
                </strong>
              </div>

              <div>
                <span style={styles.smallLabel}>
                  Price
                </span>

                <strong>
                  ₦
                  {formatMoney(
                    selectedPlan.price_for_basicuser
                  )}
                </strong>
              </div>

              <div>
                <span style={styles.smallLabel}>
                  Duration
                </span>

                <strong>
                  {selectedPlan.duration} days
                </strong>
              </div>
            </div>
          )}

          <div style={styles.section}>
            <label style={styles.label}>
              Smart Card / IUC Number
            </label>

            <div style={styles.inputRow}>
              <input
                type="text"
                inputMode="numeric"
                value={smartCardNumber}
                onChange={(event) => {
                  setSmartCardNumber(
                    event.target.value
                  );
                  setCustomer(null);
                  setReceipt(null);
                }}
                placeholder="Enter Smart Card / IUC number"
                style={styles.input}
              />

              <button
                type="button"
                onClick={
                  handleVerifyCustomer
                }
                disabled={
                  verifying ||
                  !selectedProvider ||
                  !smartCardNumber.trim()
                }
                style={styles.verifyButton}
              >
                {verifying
                  ? "Verifying..."
                  : "Verify"}
              </button>
            </div>

            <p style={styles.hint}>
              Sandbox test number:
              {" "}
              <strong>
                1212121212
              </strong>
            </p>
          </div>

          {customer && (
            <div style={styles.customerBox}>
              <div style={styles.successTitle}>
                ✓ Customer Verified
              </div>

              <div style={styles.customerGrid}>
                <div>
                  <span
                    style={styles.smallLabel}
                  >
                    Customer Name
                  </span>

                  <strong>
                    {customer.Customer_Name ||
                      customer.name ||
                      "N/A"}
                  </strong>
                </div>

                <div>
                  <span
                    style={styles.smallLabel}
                  >
                    Smart Card / IUC
                  </span>

                  <strong>
                    {smartCardNumber}
                  </strong>
                </div>

                <div>
                  <span
                    style={styles.smallLabel}
                  >
                    Address
                  </span>

                  <strong>
                    {customer.Customer_Address ||
                      customer.address ||
                      "N/A"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div style={styles.purchaseArea}>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={
                purchasing ||
                !selectedPlan ||
                !customer ||
                Number(
                  selectedPlan?.price_for_basicuser
                ) > walletBalance
              }
              style={styles.purchaseButton}
            >
              {purchasing
                ? "Processing..."
                : selectedPlan
                ? `Subscribe — ₦${formatMoney(
                    selectedPlan.price_for_basicuser
                  )}`
                : "Subscribe"}
            </button>

            {selectedPlan &&
              Number(
                selectedPlan.price_for_basicuser
              ) > walletBalance && (
                <p style={styles.insufficient}>
                  Insufficient wallet balance.
                  Please fund your wallet first.
                </p>
              )}
          </div>
        </div>

        {receipt && (
          <div style={styles.receipt}>
            <div style={styles.receiptHeader}>
              <div>
                <div style={styles.receiptSuccess}>
                  ✓ Subscription Successful
                </div>

                <h2 style={styles.receiptTitle}>
                  Cable TV Receipt
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReceipt(null)
                }
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.receiptGrid}>
              <div>
                <span
                  style={styles.smallLabel}
                >
                  Provider
                </span>

                <strong>
                  {receipt.provider}
                </strong>
              </div>

              <div>
                <span
                  style={styles.smallLabel}
                >
                  Package
                </span>

                <strong>
                  {receipt.plan}
                </strong>
              </div>

              <div>
                <span
                  style={styles.smallLabel}
                >
                  Smart Card / IUC
                </span>

                <strong>
                  {receipt.smartCardNumber}
                </strong>
              </div>

              <div>
                <span
                  style={styles.smallLabel}
                >
                  Amount
                </span>

                <strong>
                  ₦{formatMoney(receipt.amount)}
                </strong>
              </div>

              <div>
                <span
                  style={styles.smallLabel}
                >
                  Duration
                </span>

                <strong>
                  {receipt.duration} days
                </strong>
              </div>

              <div>
                <span
                  style={styles.smallLabel}
                >
                  Provider Reference
                </span>

                <strong>
                  {receipt.providerReference ||
                    "N/A"}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "40px 20px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  loading: {
    textAlign: "center",
    padding: "80px 20px",
    fontSize: "18px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    color: "#111827",
  },

  subtitle: {
    marginTop: "8px",
    color: "#6b7280",
  },

  wallet: {
    background: "#111827",
    color: "#fff",
    borderRadius: "14px",
    padding: "16px 20px",
    minWidth: "180px",
  },

  walletLabel: {
    display: "block",
    fontSize: "12px",
    opacity: 0.75,
    marginBottom: "5px",
  },

  walletAmount: {
    fontSize: "22px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "28px",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.06)",
  },

  section: {
    marginBottom: "22px",
  },

  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#374151",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "15px",
    background: "#fff",
  },

  inputRow: {
    display: "flex",
    gap: "10px",
    alignItems: "stretch",
  },

  verifyButton: {
    border: "none",
    borderRadius: "10px",
    padding: "0 22px",
    background: "#374151",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  hint: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "8px",
  },

  planBox: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    background: "#f9fafb",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "22px",
  },

  smallLabel: {
    display: "block",
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
  },

  customerBox: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "22px",
  },

  successTitle: {
    color: "#047857",
    fontWeight: 700,
    marginBottom: "15px",
  },

  customerGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },

  purchaseArea: {
    marginTop: "10px",
  },

  purchaseButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "11px",
    background: "#111827",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  insufficient: {
    textAlign: "center",
    color: "#dc2626",
    fontSize: "14px",
    marginTop: "10px",
  },

  receipt: {
    background: "#fff",
    borderRadius: "18px",
    padding: "28px",
    marginTop: "25px",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.06)",
  },

  receiptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "25px",
  },

  receiptSuccess: {
    color: "#059669",
    fontWeight: 700,
    marginBottom: "6px",
  },

  receiptTitle: {
    margin: 0,
    fontSize: "24px",
  },

  closeButton: {
    border: "none",
    background: "#f3f4f6",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    fontSize: "22px",
    cursor: "pointer",
  },

  receiptGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
  },
};

export default CableTvPurchase;