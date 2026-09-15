import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "react-toastify";

const ELECTRICITY_MARKUP = 150;

const ElectricityPurchase = () => {
  const [user, setUser] = useState(null);

  const [providers, setProviders] = useState([]);
  const [discoName, setDiscoName] = useState("");

  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const [walletBalance, setWalletBalance] = useState(0);

  const [loadingProviders, setLoadingProviders] = useState(true);
  const [verifyingMeter, setVerifyingMeter] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const [meterVerified, setMeterVerified] = useState(false);
  const [meterVerificationUnavailable, setMeterVerificationUnavailable] =
    useState(false);

  const [meterDetails, setMeterDetails] = useState(null);
  const [purchaseResult, setPurchaseResult] = useState(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [transactionPin, setTransactionPin] = useState("");

  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProviders([]);
      setLoadingProviders(false);
      return;
    }

    const loadProviders = async () => {
      try {
        setLoadingProviders(true);

        const token = await user.getIdToken();

        const response = await axios.get(
          `${apiUrl}/api/vtu/electricity-providers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          "FULL ELECTRICITY PROVIDERS RESPONSE:",
          response.data
        );

        const payload = response.data;

        let providerData = [];

        if (Array.isArray(payload)) {
          providerData = payload;
        } else if (Array.isArray(payload?.data)) {
          providerData = payload.data;
        } else if (Array.isArray(payload?.providers)) {
          providerData = payload.providers;
        } else if (Array.isArray(payload?.electricity)) {
          providerData = payload.electricity;
        } else if (Array.isArray(payload?.data?.providers)) {
          providerData = payload.data.providers;
        } else if (Array.isArray(payload?.data?.electricity)) {
          providerData = payload.data.electricity;
        }

        if (!providerData.length) {
          setProviders([]);
          toast.error("No electricity providers are available.");
          return;
        }

        const normalizedProviders = providerData
          .map((provider, index) => {
            if (typeof provider === "string") {
              return {
                id: String(index),
                name: provider,
                value: provider,
              };
            }

            const value =
              provider?.disco_name ||
              provider?.discoName ||
              provider?.disco ||
              provider?.provider ||
              provider?.service_name ||
              provider?.name ||
              provider?.code ||
              provider?.id ||
              "";

            const label =
              provider?.electricity_name ||
              provider?.disco_name ||
              provider?.discoName ||
              provider?.disco ||
              provider?.provider ||
              provider?.service_name ||
              provider?.name ||
              provider?.code ||
              value;

            return {
              ...provider,
              id:
                provider?.electricity_plan_id ||
                provider?.id ||
                provider?.code ||
                index,
              name: String(label),
              value: String(value),
            };
          })
          .filter((provider) => provider.value && provider.name);

        setProviders(normalizedProviders);
      } catch (error) {
        console.error(
          "Electricity providers error:",
          error.response?.data || error.message
        );

        setProviders([]);

        toast.error(
          error.response?.data?.message ||
            "Unable to load electricity providers."
        );
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, [user, apiUrl]);

  useEffect(() => {
    if (!user) {
      setWalletBalance(0);
      return;
    }

    const db = getFirestore();

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setWalletBalance(Number(data.wallet || 0));
        } else {
          setWalletBalance(0);
        }
      },
      (error) => {
        console.error("Wallet listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const electricityAmount = Number(amount) || 0;

  const sellingPrice =
    electricityAmount > 0
      ? electricityAmount + ELECTRICITY_MARKUP
      : 0;

  const handleProviderChange = (e) => {
    const value = e.target.value;

    setDiscoName(value);
    setMeterVerified(false);
    setMeterVerificationUnavailable(false);
    setMeterDetails(null);
    setPurchaseResult(null);
  };

  const handleMeterNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    setMeterNumber(value);
    setMeterVerified(false);
    setMeterVerificationUnavailable(false);
    setMeterDetails(null);
    setPurchaseResult(null);
  };

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    setPhoneNumber(value);
    setPurchaseResult(null);
  };

  const handleVerifyMeter = async () => {
    try {
      if (!user) {
        toast.error("Please log in again.");
        return;
      }

      if (!discoName) {
        toast.error("Please select an electricity provider.");
        return;
      }

      if (!meterNumber || !/^\d{10,15}$/.test(String(meterNumber))) {
        toast.error("Enter a valid meter number.");
        return;
      }

      setVerifyingMeter(true);
      setMeterVerified(false);
      setMeterVerificationUnavailable(false);
      setMeterDetails(null);
      setPurchaseResult(null);

      const token = await user.getIdToken();

      const response = await axios.post(
        `${apiUrl}/api/vtu/verify-electricity-meter`,
        {
          discoName,
          meterNumber: String(meterNumber),
          meterType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "METER VERIFICATION RESPONSE:",
        response.data
      );

      if (response.data?.verificationUnavailable === true) {
        setMeterVerified(true);
        setMeterVerificationUnavailable(true);

        setMeterDetails({
          meterNumber: String(meterNumber),
          meterType,
          customerName: "",
        });

        toast.info(
          response.data?.message ||
            "Meter verification is unavailable. The meter will be validated during purchase."
        );

        return;
      }

      if (
        response.data?.success === true ||
        response.data?.status === "success" ||
        response.data?.Status === "successful"
      ) {
        setMeterVerified(true);
        setMeterVerificationUnavailable(false);

        const providerData =
          response.data.data || response.data;

        const customerName =
          providerData?.customer_name ||
          providerData?.customerName ||
          providerData?.name ||
          response.data?.customer_name ||
          response.data?.customerName ||
          response.data?.name ||
          "";

        setMeterDetails({
          ...providerData,
          meterNumber: String(meterNumber),
          meterType,
          customerName,
        });

        toast.success(
          customerName
            ? `Meter verified: ${customerName}`
            : "Meter verified successfully."
        );

        return;
      }

      setMeterVerified(false);
      setMeterVerificationUnavailable(false);

      toast.error(
        response.data?.message ||
          response.data?.api_response ||
          "Meter verification failed."
      );
    } catch (error) {
      console.error(
        "Meter verification error:",
        error.response?.data || error.message
      );

      setMeterVerified(false);
      setMeterVerificationUnavailable(false);

      toast.error(
        error.response?.data?.message ||
          error.response?.data?.api_response ||
          "Unable to verify meter."
      );
    } finally {
      setVerifyingMeter(false);
    }
  };

  const handlePurchase = async () => {
    try {
      if (!user) {
        toast.error("Please log in again.");
        return;
      }

      if (!discoName) {
        toast.error("Please select an electricity provider.");
        return;
      }

      if (!meterNumber || !/^\d{10,15}$/.test(String(meterNumber))) {
        toast.error("Enter a valid meter number.");
        return;
      }

      if (!phoneNumber || !/^0\d{10}$/.test(String(phoneNumber))) {
        toast.error("Enter a valid 11-digit phone number.");
        return;
      }

      if (!meterVerified) {
        toast.error(
          "Please complete the meter verification step first."
        );
        return;
      }

      if (!Number.isFinite(electricityAmount) || electricityAmount <= 0) {
        toast.error("Enter a valid electricity amount.");
        return;
      }

      if (!Number.isInteger(electricityAmount)) {
        toast.error("Electricity amount must be a whole number.");
        return;
      }

      if (walletBalance < sellingPrice) {
        toast.error(
          `Insufficient wallet balance. You need ₦${sellingPrice.toLocaleString()}.`
        );
        return;
      }

      setTransactionPin("");
      setShowPinModal(true);
    } catch (error) {
      console.error(
        "Electricity purchase validation error:",
        error
      );
    }
  };

  const submitElectricityPurchase = async () => {
    if (!user) {
      toast.error("Please log in again.");
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }

    try {
      setPurchasing(true);
      setPurchaseResult(null);

      const token = await user.getIdToken();

      const response = await axios.post(
        `${apiUrl}/api/vtu/buy-electricity`,
        {
          discoName,
          meterNumber: String(meterNumber),
          meterType,
          phone: String(phoneNumber),
          amount: electricityAmount,
          transactionPin,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "ELECTRICITY PURCHASE RESPONSE:",
        response.data
      );

      if (response.data?.success === true) {
        setPurchaseResult(response.data);

        toast.success("Electricity purchase successful.");

        setAmount("");
        setShowPinModal(false);
        setTransactionPin("");

        setMeterVerified(false);
        setMeterVerificationUnavailable(false);
        setMeterDetails(null);
      } else if (response.data?.pending) {
        toast.info(
          response.data.message ||
            "Your electricity purchase is being processed. Please do not purchase again."
        );

        setPurchaseResult(response.data);

        setShowPinModal(false);
        setTransactionPin("");
      } else {
        toast.error(
          response.data?.message ||
            response.data?.api_response ||
            "Electricity purchase failed."
        );
      }
    } catch (error) {
      console.error(
        "Electricity purchase error:",
        error.response?.data || error.message
      );

      const data = error.response?.data;

      if (error.response?.status === 401) {
        toast.error(
          data?.message || "Incorrect transaction PIN."
        );

        setTransactionPin("");
        return;
      }

      if (data?.pending) {
        toast.info(
          data.message ||
            "Your electricity purchase is still being processed. Please do not purchase again."
        );

        setPurchaseResult(data);
        setShowPinModal(false);
        setTransactionPin("");
      } else {
        toast.error(
          data?.message ||
            data?.api_response ||
            "Unable to process electricity purchase."
        );

        setShowPinModal(false);
        setTransactionPin("");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const closePinModal = () => {
    if (purchasing) {
      return;
    }

    setShowPinModal(false);
    setTransactionPin("");
  };

  const verifiedCustomerName =
    meterDetails?.customerName ||
    meterDetails?.customer_name ||
    meterDetails?.name ||
    "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f5f9ff 0%, #eef4ff 100%)",
        padding: "30px 20px 50px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "25px" }}>
          <div
            style={{
              color: "#2563eb",
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            INSTANT LOAD
          </div>

          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "32px",
              fontWeight: "800",
            }}
          >
            Electricity
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#64748b",
              fontSize: "15px",
            }}
          >
            Pay your electricity bill quickly and securely.
          </p>
        </div>

        <div
          style={{
            background:
              "linear-gradient(135deg, #0f172a, #1e3a8a)",
            borderRadius: "22px",
            padding: "22px 25px",
            color: "#ffffff",
            marginBottom: "20px",
            boxShadow:
              "0 15px 35px rgba(15, 23, 42, 0.15)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              opacity: 0.75,
              marginBottom: "5px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Available Balance
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
            }}
          >
            ₦{walletBalance.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "30px",
            boxShadow:
              "0 15px 45px rgba(15, 23, 42, 0.08)",
            border:
              "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Electricity Provider
            </label>

            <select
              value={discoName}
              onChange={handleProviderChange}
              disabled={
                loadingProviders ||
                providers.length === 0
              }
              style={{
                width: "100%",
                height: "55px",
                borderRadius: "14px",
                border: "1px solid #dbe3ef",
                padding: "0 15px",
                background: "#f8fafc",
                color: "#0f172a",
                fontSize: "15px",
                outline: "none",
              }}
            >
              <option value="">
                {loadingProviders
                  ? "Loading providers..."
                  : providers.length === 0
                  ? "No providers available"
                  : "Select electricity provider"}
              </option>

              {providers.map((provider, index) => (
                <option
                  key={provider.id || index}
                  value={provider.value}
                >
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Meter Type
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {[
                {
                  value: "prepaid",
                  title: "Prepaid",
                  icon: "⚡",
                },
                {
                  value: "postpaid",
                  title: "Postpaid",
                  icon: "🧾",
                },
              ].map((item) => {
                const active =
                  meterType === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setMeterType(item.value);
                      setMeterVerified(false);
                      setMeterVerificationUnavailable(false);
                      setMeterDetails(null);
                      setPurchaseResult(null);
                    }}
                    style={{
                      padding: "15px",
                      borderRadius: "15px",
                      border: active
                        ? "2px solid #2563eb"
                        : "1px solid #e2e8f0",
                      background: active
                        ? "#eff6ff"
                        : "#ffffff",
                      color: active
                        ? "#1d4ed8"
                        : "#475569",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "20px",
                        marginRight: "8px",
                      }}
                    >
                      {item.icon}
                    </span>

                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Meter Number
            </label>

            <input
              type="text"
              placeholder="Enter meter number"
              value={meterNumber}
              onChange={handleMeterNumberChange}
              maxLength="15"
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: "55px",
                borderRadius: "14px",
                border: "1px solid #dbe3ef",
                padding: "0 15px",
                background: "#f8fafc",
                color: "#0f172a",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Phone Number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              placeholder="08012345678"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              maxLength="11"
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: "55px",
                borderRadius: "14px",
                border: "1px solid #dbe3ef",
                padding: "0 15px",
                background: "#f8fafc",
                color: "#0f172a",
                fontSize: "15px",
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: "7px",
                color: "#94a3b8",
                fontSize: "12px",
              }}
            >
              This number is used to process your electricity payment.
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerifyMeter}
            disabled={
              verifyingMeter ||
              !discoName ||
              !meterNumber
            }
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "14px",
              border: "1px solid #2563eb",
              background:
                verifyingMeter ||
                !discoName ||
                !meterNumber
                  ? "#e2e8f0"
                  : "#eff6ff",
              color:
                verifyingMeter ||
                !discoName ||
                !meterNumber
                  ? "#94a3b8"
                  : "#2563eb",
              fontWeight: "800",
              cursor:
                verifyingMeter ||
                !discoName ||
                !meterNumber
                  ? "not-allowed"
                  : "pointer",
              marginBottom: "20px",
            }}
          >
            {verifyingMeter ? "Checking..." : "✓ Check Meter"}
          </button>

          {meterVerified && meterDetails && (
            <div
              style={{
                background:
                  meterVerificationUnavailable
                    ? "linear-gradient(135deg, #eff6ff, #f0f9ff)"
                    : "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
                border:
                  meterVerificationUnavailable
                    ? "1px solid #bfdbfe"
                    : "1px solid #bbf7d0",
                borderRadius: "18px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background:
                      meterVerificationUnavailable
                        ? "#2563eb"
                        : "#16a34a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                  }}
                >
                  {meterVerificationUnavailable ? "i" : "✓"}
                </div>

                <div>
                  <div
                    style={{
                      color:
                        meterVerificationUnavailable
                          ? "#1d4ed8"
                          : "#166534",
                      fontSize: "12px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    {meterVerificationUnavailable
                      ? "Verification unavailable"
                      : "Meter verified"}
                  </div>

                  <strong
                    style={{
                      color:
                        meterVerificationUnavailable
                          ? "#1e3a8a"
                          : "#14532d",
                      fontSize: "16px",
                    }}
                  >
                    {meterVerificationUnavailable
                      ? "Meter will be validated during purchase"
                      : verifiedCustomerName ||
                        "Verified Customer"}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  color: "#475569",
                  fontSize: "13px",
                  lineHeight: "1.8",
                }}
              >
                <div>
                  <strong>Meter:</strong>{" "}
                  {meterNumber}
                </div>

                <div>
                  <strong>Type:</strong>{" "}
                  {meterType}
                </div>

                {meterVerificationUnavailable && (
                  <div style={{ marginTop: "8px" }}>
                    This provider does not currently expose meter
                    verification. Your meter will be checked when the
                    electricity purchase is submitted.
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              Amount
            </label>

            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontWeight: "700",
                }}
              >
                ₦
              </span>

              <input
                type="number"
                placeholder="Enter amount (minimum ₦1,000)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1000"
                step="1"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  height: "55px",
                  borderRadius: "14px",
                  border: "1px solid #dbe3ef",
                  padding: "0 15px 0 38px",
                  background: "#f8fafc",
                  color: "#0f172a",
                  fontSize: "16px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {electricityAmount > 0 && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, #eff6ff, #f5f3ff)",
                borderRadius: "18px",
                padding: "20px",
                marginBottom: "20px",
                border: "1px solid #dbeafe",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                <span>Electricity</span>

                <span>
                  ₦{electricityAmount.toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                <span>Service charge</span>

                <span>
                  ₦{ELECTRICITY_MARKUP.toLocaleString()}
                </span>
              </div>

              <div
                style={{
                  borderTop: "1px solid #dbeafe",
                  paddingTop: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ color: "#0f172a" }}>
                  Total
                </strong>

                <strong
                  style={{
                    color: "#2563eb",
                    fontSize: "24px",
                  }}
                >
                  ₦{sellingPrice.toLocaleString()}
                </strong>
              </div>
            </div>
          )}

          {electricityAmount > 0 && (
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                borderRadius: "14px",
                background:
                  walletBalance >= sellingPrice
                    ? "#f0fdf4"
                    : "#fff7ed",
                color:
                  walletBalance >= sellingPrice
                    ? "#166534"
                    : "#9a3412",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {walletBalance >= sellingPrice
                ? "✓ You have enough wallet balance for this purchase."
                : `You need ₦${(
                    sellingPrice - walletBalance
                  ).toLocaleString()} more in your wallet.`}
            </div>
          )}

          {electricityAmount > 0 && (
            <button
              type="button"
              onClick={handlePurchase}
              disabled={
                purchasing ||
                !user ||
                !meterVerified ||
                walletBalance < sellingPrice
              }
              style={{
                width: "100%",
                height: "58px",
                border: "none",
                borderRadius: "15px",
                background:
                  purchasing ||
                  !user ||
                  !meterVerified ||
                  walletBalance < sellingPrice
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "800",
                cursor:
                  purchasing ||
                  !user ||
                  !meterVerified ||
                  walletBalance < sellingPrice
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {purchasing
                ? "Processing electricity payment..."
                : `Pay ₦${sellingPrice.toLocaleString()}`}
            </button>
          )}

          {purchaseResult && (
            <div
              style={{
                marginTop: "25px",
                borderRadius: "20px",
                padding: "22px",
                background: purchaseResult.success
                  ? "linear-gradient(135deg, #ecfdf5, #f0fdf4)"
                  : "linear-gradient(135deg, #fff7ed, #fffbeb)",
                border: purchaseResult.success
                  ? "1px solid #bbf7d0"
                  : "1px solid #fed7aa",
              }}
            >
              {purchaseResult.success ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "18px",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "#16a34a",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        fontWeight: "800",
                      }}
                    >
                      ✓
                    </div>

                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "#166534",
                          fontSize: "17px",
                        }}
                      >
                        Electricity Purchase Successful
                      </strong>

                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                        }}
                      >
                        Your electricity payment was processed.
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#475569",
                      fontSize: "14px",
                      lineHeight: "1.9",
                    }}
                  >
                    <div>
                      <strong>Amount:</strong>{" "}
                      ₦
                      {Number(
                        purchaseResult.amount || sellingPrice
                      ).toLocaleString()}
                    </div>

                    <div>
                      <strong>Meter:</strong>{" "}
                      {purchaseResult.meterNumber || meterNumber}
                    </div>

                    <div>
                      <strong>Type:</strong>{" "}
                      {purchaseResult.meterType || meterType}
                    </div>

                    {purchaseResult.providerReference && (
                      <div>
                        <strong>Provider Reference:</strong>{" "}
                        {purchaseResult.providerReference}
                      </div>
                    )}

                    {purchaseResult.providerTransactionId && (
                      <div>
                        <strong>Transaction ID:</strong>{" "}
                        {purchaseResult.providerTransactionId}
                      </div>
                    )}
                  </div>

                  {(purchaseResult.token ||
                    purchaseResult.electricitytoken ||
                    purchaseResult.data?.token) && (
                    <div
                      style={{
                        marginTop: "18px",
                        padding: "18px",
                        borderRadius: "15px",
                        background: "#ffffff",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          marginBottom: "6px",
                        }}
                      >
                        Electricity Token
                      </div>

                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "800",
                          color: "#166534",
                          wordBreak: "break-word",
                        }}
                      >
                        {purchaseResult.token ||
                          purchaseResult.electricitytoken ||
                          purchaseResult.data?.token}
                      </div>
                    </div>
                  )}

                  {purchaseResult.units && (
                    <div
                      style={{
                        marginTop: "12px",
                        color: "#166534",
                        fontWeight: "700",
                      }}
                    >
                      Units: {purchaseResult.units}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <strong
                    style={{
                      display: "block",
                      color: "#9a3412",
                      fontSize: "17px",
                      marginBottom: "8px",
                    }}
                  >
                    Purchase Processing
                  </strong>

                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    {purchaseResult.message ||
                      "Your electricity purchase is being processed. Please do not purchase again yet."}
                  </p>

                  {purchaseResult.orderId && (
                    <div
                      style={{
                        marginTop: "10px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      Order ID: {purchaseResult.orderId}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showPinModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.60)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "390px",
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              boxShadow:
                "0 25px 70px rgba(15, 23, 42, 0.25)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                  fontSize: "26px",
                }}
              >
                🔐
              </div>

              <h3
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "22px",
                  fontWeight: "800",
                }}
              >
                Enter Transaction PIN
              </h3>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: "1.5",
                }}
              >
                Enter your 4-digit PIN to authorize this electricity payment.
              </p>
            </div>

            <div
              style={{
                background: "#f8fafc",
                borderRadius: "14px",
                padding: "12px",
                marginBottom: "15px",
                textAlign: "center",
                color: "#475569",
                fontSize: "13px",
              }}
            >
              Pay ₦{sellingPrice.toLocaleString()}
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={transactionPin}
              onChange={(e) =>
                setTransactionPin(
                  e.target.value.replace(/\D/g, "")
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  transactionPin.length === 4 &&
                  !purchasing
                ) {
                  submitElectricityPurchase();
                }
              }}
              placeholder="••••"
              style={{
                width: "100%",
                height: "58px",
                boxSizing: "border-box",
                borderRadius: "14px",
                border: "1px solid #dbe3ef",
                background: "#f8fafc",
                textAlign: "center",
                fontSize: "25px",
                letterSpacing: "10px",
                outline: "none",
                color: "#0f172a",
              }}
            />

            <button
              type="button"
              onClick={submitElectricityPurchase}
              disabled={
                purchasing ||
                transactionPin.length !== 4
              }
              style={{
                width: "100%",
                height: "52px",
                marginTop: "16px",
                border: "none",
                borderRadius: "14px",
                background:
                  purchasing ||
                  transactionPin.length !== 4
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "800",
                cursor:
                  purchasing ||
                  transactionPin.length !== 4
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {purchasing
                ? "Processing..."
                : "Confirm Payment"}
            </button>

            <button
              type="button"
              onClick={closePinModal}
              disabled={purchasing}
              style={{
                width: "100%",
                height: "48px",
                marginTop: "10px",
                border: "none",
                background: "transparent",
                color: "#64748b",
                fontSize: "14px",
                fontWeight: "700",
                cursor: purchasing
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectricityPurchase;