import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import axios from "axios";

import { auth } from "../../firebase";

import { toast } from "react-toastify";

const DataPurchase = () => {
  const [network, setNetwork] = useState("MTN");
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [transactionPin, setTransactionPin] = useState("");

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("Please log in first.");
        setPlans([]);
        return;
      }

      const idToken =
        await currentUser.getIdToken();

      const response = await axios.get(
        `${apiUrl}/api/vtu/data-plans`,
        {
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

      console.log(
        "FULL DATA PLANS RESPONSE:",
        response.data
      );

      const payload = response.data;

      const requestSuccessful =
        payload?.success === true ||
        payload?.status === "success" ||
        payload?.Status === "successful";

      if (!requestSuccessful) {
        toast.error(
          payload?.message ||
            "Unable to load data plans."
        );

        setPlans([]);
        return;
      }

      const providerPlans =
        payload?.dataplans ||
        payload?.data?.dataplans ||
        [];

      const activePlans =
        providerPlans.filter((plan) => {
          const status =
            String(
              plan.status || ""
            ).toLowerCase();

          return (
            status === "on" ||
            status === "active" ||
            status === "enabled" ||
            status === ""
          );
        });

      setPlans(activePlans);

      if (activePlans.length === 0) {
        toast.warning(
          "No active data plans are available."
        );
      }
    } catch (error) {
      console.error(
        "Data plans error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to load data plans."
      );

      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const filteredPlans =
    plans.filter(
      (plan) =>
        String(
          plan.the_network_name || ""
        ).toUpperCase() === network
    );

  const selectedPlanData =
    plans.find(
      (item) =>
        String(
          item.data_plan_id
        ) === String(selectedPlan)
    );

  const handlePurchase = async () => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      toast.error("Please log in first.");
      return;
    }

    if (
      currentUser.email &&
      !currentUser.emailVerified
    ) {
      toast.error(
        "Please verify your email before purchasing."
      );
      return;
    }

    if (
      !phone ||
      phone.length !== 11
    ) {
      toast.error(
        "Enter a valid 11-digit Nigerian phone number."
      );
      return;
    }

    if (
      process.env.NODE_ENV !==
        "production" &&
      phone !== "08011111111"
    ) {
      toast.error(
        "Sandbox testing uses 08011111111."
      );
      return;
    }

    if (!selectedPlan) {
      toast.error(
        "Please select a data plan."
      );
      return;
    }

    const plan =
      plans.find(
        (item) =>
          String(
            item.data_plan_id
          ) === String(selectedPlan)
      );

    if (!plan) {
      toast.error(
        "Selected plan could not be found."
      );
      return;
    }

    if (
      !Number.isFinite(
        Number(plan.sellingPrice)
      ) ||
      Number(plan.sellingPrice) <= 0
    ) {
      toast.error(
        "This data plan has an invalid selling price."
      );
      return;
    }

    setTransactionPin("");
    setShowPinModal(true);
  };

  const submitDataPurchase = async () => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      toast.error("Please log in first.");
      return;
    }

    if (
      !/^\d{4}$/.test(transactionPin)
    ) {
      toast.error(
        "Enter your 4-digit transaction PIN."
      );
      return;
    }

    const plan =
      plans.find(
        (item) =>
          String(
            item.data_plan_id
          ) === String(selectedPlan)
      );

    if (!plan) {
      toast.error(
        "Selected plan could not be found."
      );
      return;
    }

    try {
      setLoading(true);

      const idToken =
        await currentUser.getIdToken();

      const response =
        await axios.post(
          `${apiUrl}/api/vtu/buy-data`,
          {
            network,
            mobileNumber: phone,
            plan: selectedPlan,
            transactionPin,
          },
          {
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      console.log(
        "Data purchase response:",
        response.data
      );

      if (
        response.data.success ||
        response.data.status === "success" ||
        response.data.Status === "successful"
      ) {
        toast.success(
          `Data purchase successful: ${plan.size} to ${phone}`
        );

        console.log(
          "Request ID:",
          response.data.requestId
        );

        console.log(
          "Provider response:",
          response.data.providerResponse
        );

        setShowPinModal(false);
        setTransactionPin("");
        setSelectedPlan("");
        setPhone("");

        return;
      }

      toast.error(
        response.data.message ||
          "Purchase failed."
      );
    } catch (error) {
      console.error(
        "Data purchase error:",
        error.response?.data ||
          error.message
      );

      const status =
        error.response?.status;

      const message =
        error.response?.data?.message ||
        "Unable to process purchase.";

      toast.error(message);

      if (status === 401) {
        setTransactionPin("");
        return;
      }

      setShowPinModal(false);
      setTransactionPin("");
    } finally {
      setLoading(false);
    }
  };

  const closePinModal = () => {
    if (loading) {
      return;
    }

    setShowPinModal(false);
    setTransactionPin("");
  };

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
        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              color: "#2563eb",
              fontSize: "14px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            INSTANT LOAD
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: "800",
              color: "#0f172a",
            }}
          >
            Buy Data
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#64748b",
              fontSize: "15px",
            }}
          >
            Choose a network, select your data
            plan and get connected instantly.
          </p>
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
          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "12px",
                fontSize: "14px",
                fontWeight: "700",
                color: "#334155",
              }}
            >
              Select Network
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: "12px",
              }}
            >
              {[
                {
                  value: "MTN",
                  name: "MTN",
                  icon: "📱",
                },
                {
                  value: "AIRTEL",
                  name: "Airtel",
                  icon: "📶",
                },
                {
                  value: "GLO",
                  name: "Glo",
                  icon: "🌐",
                },
                {
                  value: "9MOBILE",
                  name: "9mobile",
                  icon: "📡",
                },
              ].map((item) => {
                const active =
                  network === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setNetwork(
                        item.value
                      );
                      setSelectedPlan("");
                    }}
                    style={{
                      border: active
                        ? "2px solid #2563eb"
                        : "1px solid #e2e8f0",
                      background: active
                        ? "#eff6ff"
                        : "#ffffff",
                      borderRadius: "16px",
                      padding:
                        "15px 10px",
                      cursor: "pointer",
                      transition:
                        "all 0.2s ease",
                      color: active
                        ? "#1d4ed8"
                        : "#475569",
                      fontWeight: "700",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "22px",
                        marginBottom: "5px",
                      }}
                    >
                      {item.icon}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                      }}
                    >
                      {item.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "9px",
                fontSize: "14px",
                fontWeight: "700",
                color: "#334155",
              }}
            >
              Phone Number
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "15px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  fontSize: "19px",
                }}
              >
                📱
              </span>

              <input
                type="tel"
                placeholder="08011111111"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                maxLength="11"
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  height: "54px",
                  borderRadius: "14px",
                  border:
                    "1px solid #dbe3ef",
                  padding:
                    "0 15px 0 48px",
                  fontSize: "15px",
                  outline: "none",
                  color: "#0f172a",
                  background:
                    "#f8fafc",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "8px",
                color: "#94a3b8",
                fontSize: "12px",
              }}
            >
              Sandbox testing uses
              08011111111.
            </div>
          </div>

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "14px",
                fontWeight: "700",
                color: "#334155",
              }}
            >
              Select Data Plan
            </label>

            {loading ? (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background:
                    "#f8fafc",
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                Loading data plans...
              </div>
            ) : filteredPlans.length ===
              0 ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background:
                    "#fff7ed",
                  border:
                    "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: "14px",
                }}
              >
                No active plans available
                for {network}.
              </div>
            ) : (
              <select
                value={selectedPlan}
                onChange={(e) =>
                  setSelectedPlan(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  height: "55px",
                  borderRadius: "14px",
                  border:
                    "1px solid #dbe3ef",
                  padding: "0 15px",
                  background:
                    "#f8fafc",
                  color: "#0f172a",
                  fontSize: "15px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">
                  Select a data plan
                </option>

                {filteredPlans.map(
                  (plan) => (
                    <option
                      key={
                        plan.data_plan_id
                      }
                      value={
                        plan.data_plan_id
                      }
                    >
                      {plan.size} — ₦
                      {Number(
                        plan.sellingPrice
                      ).toLocaleString()}{" "}
                      (
                      {plan.duration}{" "}
                      day
                      {String(
                        plan.duration
                      ) === "1"
                        ? ""
                        : "s"}
                      )
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          {selectedPlanData && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, #eff6ff, #f5f3ff)",
                borderRadius: "18px",
                padding: "20px",
                marginBottom: "25px",
                border:
                  "1px solid #dbeafe",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "15px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom:
                        "4px",
                    }}
                  >
                    SELECTED PLAN
                  </div>

                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {
                      selectedPlanData.size
                    }
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    PRICE
                  </div>

                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "800",
                      color: "#2563eb",
                    }}
                  >
                    ₦
                    {Number(
                      selectedPlanData.sellingPrice
                    ).toLocaleString()}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background:
                      "rgba(255,255,255,0.75)",
                    borderRadius:
                      "12px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    NETWORK
                  </div>

                  <strong
                    style={{
                      fontSize: "13px",
                    }}
                  >
                    {
                      selectedPlanData.the_network_name
                    }
                  </strong>
                </div>

                <div
                  style={{
                    background:
                      "rgba(255,255,255,0.75)",
                    borderRadius:
                      "12px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    TYPE
                  </div>

                  <strong
                    style={{
                      fontSize: "13px",
                    }}
                  >
                    {
                      selectedPlanData.the_datatype_name
                    }
                  </strong>
                </div>

                <div
                  style={{
                    background:
                      "rgba(255,255,255,0.75)",
                    borderRadius:
                      "12px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    VALIDITY
                  </div>

                  <strong
                    style={{
                      fontSize: "13px",
                    }}
                  >
                    {
                      selectedPlanData.duration
                    }{" "}
                    day
                    {String(
                      selectedPlanData.duration
                    ) === "1"
                      ? ""
                      : "s"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handlePurchase}
            disabled={
              loading ||
              !selectedPlan ||
              !phone
            }
            style={{
              width: "100%",
              height: "56px",
              border: "none",
              borderRadius: "15px",
              background:
                loading ||
                !selectedPlan ||
                !phone
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "800",
              cursor:
                loading ||
                !selectedPlan ||
                !phone
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                loading ||
                !selectedPlan ||
                !phone
                  ? "none"
                  : "0 10px 25px rgba(37, 99, 235, 0.25)",
            }}
          >
            {loading
              ? "Processing..."
              : selectedPlanData
              ? `Buy ${
                  selectedPlanData.size
                } for ₦${Number(
                  selectedPlanData.sellingPrice
                ).toLocaleString()}`
              : "Buy Data"}
          </button>

          <div
            style={{
              display: "flex",
              justifyContent:
                "center",
              gap: "8px",
              alignItems:
                "center",
              marginTop: "20px",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            <span>🔒</span>

            <span>
              Secure purchase • Transaction PIN protected
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: "15px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "18px",
              textAlign: "center",
              boxShadow:
                "0 8px 25px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginBottom: "7px",
              }}
            >
              ⚡
            </div>

            <strong
              style={{
                display: "block",
                color: "#0f172a",
                fontSize: "14px",
              }}
            >
              Fast
            </strong>

            <span
              style={{
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Instant processing
            </span>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "18px",
              textAlign: "center",
              boxShadow:
                "0 8px 25px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginBottom: "7px",
              }}
            >
              🛡️
            </div>

            <strong
              style={{
                display: "block",
                color: "#0f172a",
                fontSize: "14px",
              }}
            >
              Secure
            </strong>

            <span
              style={{
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              PIN protected
            </span>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "18px",
              textAlign: "center",
              boxShadow:
                "0 8px 25px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginBottom: "7px",
              }}
            >
              ✓
            </div>

            <strong
              style={{
                display: "block",
                color: "#0f172a",
                fontSize: "14px",
              }}
            >
              Reliable
            </strong>

            <span
              style={{
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Trusted service
            </span>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "18px",
            color: "#94a3b8",
            fontSize: "11px",
          }}
        >
          Sandbox mode — testing environment.
        </div>
      </div>

      {showPinModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.60)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
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
                marginBottom:
                  "22px",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius:
                    "50%",
                  background:
                    "#eff6ff",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  margin:
                    "0 auto 14px",
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
                  margin:
                    "8px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight:
                    "1.5",
                }}
              >
                Enter your 4-digit PIN
                to authorize this data
                purchase.
              </p>
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={transactionPin}
              onChange={(e) =>
                setTransactionPin(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                    "Enter" &&
                  transactionPin.length ===
                    4 &&
                  !loading
                ) {
                  submitDataPurchase();
                }
              }}
              placeholder="••••"
              style={{
                width: "100%",
                height: "58px",
                boxSizing:
                  "border-box",
                borderRadius:
                  "14px",
                border:
                  "1px solid #dbe3ef",
                background:
                  "#f8fafc",
                textAlign:
                  "center",
                fontSize: "25px",
                letterSpacing:
                  "10px",
                outline: "none",
                color: "#0f172a",
              }}
            />

            <button
              type="button"
              onClick={
                submitDataPurchase
              }
              disabled={
                loading ||
                transactionPin.length !==
                  4
              }
              style={{
                width: "100%",
                height: "52px",
                marginTop:
                  "16px",
                border: "none",
                borderRadius:
                  "14px",
                background:
                  loading ||
                  transactionPin.length !==
                    4
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "800",
                cursor:
                  loading ||
                  transactionPin.length !==
                    4
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "Processing..."
                : "Confirm Purchase"}
            </button>

            <button
              type="button"
              onClick={
                closePinModal
              }
              disabled={loading}
              style={{
                width: "100%",
                height: "48px",
                marginTop: "10px",
                border: "none",
                background:
                  "transparent",
                color: "#64748b",
                fontSize: "14px",
                fontWeight: "700",
                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Cancel
            </button>

            <div
              style={{
                textAlign:
                  "center",
                marginTop:
                  "10px",
                color: "#94a3b8",
                fontSize: "11px",
              }}
            >
              🔒 Your PIN is securely
              verified.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPurchase;