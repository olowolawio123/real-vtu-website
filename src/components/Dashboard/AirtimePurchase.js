import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";

import { auth, db } from "../../firebase";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { toast } from "react-toastify";

const AirtimePurchase = () => {
  const [network, setNetwork] =
    useState("MTN");

  const [phone, setPhone] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [walletBalance, setWalletBalance] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [showPinModal, setShowPinModal] =
    useState(false);

  const [transactionPin, setTransactionPin] =
    useState("");

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  useEffect(() => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      return;
    }

    const userRef = doc(
      db,
      "users",
      currentUser.uid
    );

    const unsubscribe =
      onSnapshot(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setWalletBalance(
              Number(
                snapshot.data().wallet || 0
              )
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

    return () => unsubscribe();
  }, []);

  const handlePurchase = async () => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      toast.error(
        "Please log in first."
      );
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
      !/^\d{11}$/.test(phone)
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

    const airtimeAmount =
      Number(amount);

    if (
      !Number.isFinite(
        airtimeAmount
      ) ||
      airtimeAmount <= 0
    ) {
      toast.error(
        "Enter a valid airtime amount."
      );
      return;
    }

    if (
      !Number.isInteger(
        airtimeAmount
      )
    ) {
      toast.error(
        "Airtime amount must be a whole number."
      );
      return;
    }

    if (
      airtimeAmount >
      walletBalance
    ) {
      toast.error(
        `Insufficient wallet balance. Available: ₦${walletBalance.toLocaleString()}`
      );
      return;
    }

    setTransactionPin("");
    setShowPinModal(true);
  };

  const submitAirtimePurchase =
    async () => {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        toast.error(
          "Please log in first."
        );
        return;
      }

      if (
        !/^\d{4}$/.test(
          transactionPin
        )
      ) {
        toast.error(
          "Enter your 4-digit Transaction PIN."
        );
        return;
      }

      try {
        setLoading(true);

        toast.info(
          "Authenticating airtime purchase..."
        );

        const idToken =
          await currentUser.getIdToken();

        const response =
          await axios.post(
            `${apiUrl}/api/vtu/buy-airtime`,
            {
              network,
              mobileNumber: phone,
              amount:
                Number(amount),
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
          "Airtime purchase response:",
          response.data
        );

        if (
          response.data.success
        ) {
          toast.success(
            `₦${Number(amount).toLocaleString()} ${network} airtime sent to ${phone}`
          );

          setAmount("");
          setPhone("");
          setTransactionPin("");
          setShowPinModal(false);
        } else {
          toast.error(
            response.data.message ||
              "Airtime purchase failed."
          );
        }
      } catch (error) {
        console.error(
          "Airtime purchase error:",
          error.response?.data ||
            error.message
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to process airtime purchase."
        );
      } finally {
        setLoading(false);
      }
    };

  const airtimeAmount =
    Number(amount) || 0;

  const remainingBalance =
    walletBalance -
    airtimeAmount;

  const networks = [
    {
      name: "MTN",
      icon: "bi-phone-fill",
    },
    {
      name: "AIRTEL",
      icon: "bi-phone-fill",
    },
    {
      name: "GLO",
      icon: "bi-phone-fill",
    },
    {
      name: "9MOBILE",
      icon: "bi-phone-fill",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F7FB",
        padding:
          "30px 20px 50px",
        fontFamily:
          "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#0A6CFF",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing:
                  "1px",
                marginBottom:
                  "6px",
              }}
            >
              INSTANT LOAD
            </div>

            <h1
              style={{
                margin: 0,
                color: "#071A3D",
                fontSize: "28px",
                fontWeight: "800",
              }}
            >
              Buy Airtime
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#718096",
                fontSize: "13px",
              }}
            >
              Recharge any Nigerian
              network instantly.
            </p>
          </div>

          {/* Wallet */}
          <div
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #E5EBF3",
              borderRadius: "14px",
              padding:
                "12px 17px",
              display: "flex",
              alignItems:
                "center",
              gap: "10px",
              boxShadow:
                "0 6px 18px rgba(20, 50, 90, 0.06)",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius:
                  "11px",
                background:
                  "#EAF2FF",
                color: "#0A6CFF",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              <i className="bi bi-wallet2"></i>
            </div>

            <div>
              <div
                style={{
                  color:
                    "#718096",
                  fontSize:
                    "11px",
                }}
              >
                Wallet Balance
              </div>

              <strong
                style={{
                  color:
                    "#071A3D",
                  fontSize:
                    "17px",
                }}
              >
                ₦
                {walletBalance.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div
          style={{
            background:
              "#ffffff",
            borderRadius:
              "22px",
            padding: "30px",
            border:
              "1px solid #E5EBF3",
            boxShadow:
              "0 12px 35px rgba(20, 50, 90, 0.07)",
          }}
        >
          {/* Network */}
          <div
            style={{
              marginBottom:
                "25px",
            }}
          >
            <label
              style={{
                display: "block",
                color:
                  "#344563",
                fontSize:
                  "13px",
                fontWeight:
                  "700",
                marginBottom:
                  "12px",
              }}
            >
              Select Network
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: "10px",
              }}
            >
              {networks.map(
                (item) => {
                  const selected =
                    network ===
                    item.name;

                  return (
                    <button
                      key={
                        item.name
                      }
                      type="button"
                      onClick={() =>
                        setNetwork(
                          item.name
                        )
                      }
                      disabled={
                        loading
                      }
                      style={{
                        border:
                          selected
                            ? "2px solid #0A6CFF"
                            : "1px solid #DDE5EF",
                        background:
                          selected
                            ? "#EAF2FF"
                            : "#ffffff",
                        color:
                          selected
                            ? "#0A6CFF"
                            : "#526581",
                        borderRadius:
                          "13px",
                        padding:
                          "15px 8px",
                        cursor:
                          loading
                            ? "not-allowed"
                            : "pointer",
                        fontWeight:
                          "700",
                        fontSize:
                          "12px",
                      }}
                    >
                      <i
                        className={`bi ${item.icon}`}
                        style={{
                          display:
                            "block",
                          fontSize:
                            "20px",
                          marginBottom:
                            "7px",
                        }}
                      ></i>

                      {item.name}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Phone */}
          <div
            style={{
              marginBottom:
                "22px",
            }}
          >
            <label
              style={{
                display: "block",
                color:
                  "#344563",
                fontSize:
                  "13px",
                fontWeight:
                  "700",
                marginBottom:
                  "8px",
              }}
            >
              Phone Number
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <i
                className="bi bi-telephone"
                style={{
                  position:
                    "absolute",
                  left: "15px",
                  top: "15px",
                  color:
                    "#8A99AD",
                }}
              ></i>

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
                disabled={
                  loading
                }
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "14px 15px 14px 43px",
                  border:
                    "1px solid #DDE5EF",
                  borderRadius:
                    "12px",
                  fontSize:
                    "14px",
                  outline:
                    "none",
                  color:
                    "#172B4D",
                  background:
                    "#ffffff",
                }}
              />
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "#8A99AD",
                fontSize:
                  "11px",
              }}
            >
              Sandbox testing uses
              08011111111.
            </div>
          </div>

          {/* Amount */}
          <div
            style={{
              marginBottom:
                "22px",
            }}
          >
            <label
              style={{
                display: "block",
                color:
                  "#344563",
                fontSize:
                  "13px",
                fontWeight:
                  "700",
                marginBottom:
                  "8px",
              }}
            >
              Airtime Amount
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <span
                style={{
                  position:
                    "absolute",
                  left: "15px",
                  top: "13px",
                  color:
                    "#718096",
                  fontSize:
                    "16px",
                  fontWeight:
                    "700",
                }}
              >
                ₦
              </span>

              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                min="1"
                step="1"
                disabled={
                  loading
                }
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "14px 15px 14px 40px",
                  border:
                    "1px solid #DDE5EF",
                  borderRadius:
                    "12px",
                  fontSize:
                    "14px",
                  outline:
                    "none",
                  color:
                    "#172B4D",
                  background:
                    "#ffffff",
                }}
              />
            </div>
          </div>

          {/* Purchase Summary */}
          {amount && (
            <div
              style={{
                background:
                  remainingBalance >=
                  0
                    ? "#F4F8FF"
                    : "#FFF5F5",
                border:
                  remainingBalance >=
                  0
                    ? "1px solid #D9E8FF"
                    : "1px solid #FFD8D8",
                borderRadius:
                  "16px",
                padding:
                  "18px",
                marginBottom:
                  "22px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "14px",
                }}
              >
                <strong
                  style={{
                    color:
                      "#071A3D",
                    fontSize:
                      "14px",
                  }}
                >
                  Purchase Summary
                </strong>

                <span
                  style={{
                    background:
                      "#EAF2FF",
                    color:
                      "#0A6CFF",
                    padding:
                      "5px 9px",
                    borderRadius:
                      "8px",
                    fontSize:
                      "10px",
                    fontWeight:
                      "800",
                  }}
                >
                  {network}
                </span>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "#718096",
                  fontSize:
                    "12px",
                  marginBottom:
                    "9px",
                }}
              >
                <span>
                  Airtime
                </span>

                <strong
                  style={{
                    color:
                      "#172B4D",
                  }}
                >
                  ₦
                  {airtimeAmount.toLocaleString()}
                </strong>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "#718096",
                  fontSize:
                    "12px",
                  marginBottom:
                    "9px",
                }}
              >
                <span>
                  Current wallet
                </span>

                <strong
                  style={{
                    color:
                      "#172B4D",
                  }}
                >
                  ₦
                  {walletBalance.toLocaleString()}
                </strong>
              </div>

              <div
                style={{
                  height: "1px",
                  background:
                    "#DDE5EF",
                  margin:
                    "13px 0",
                }}
              />

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  fontSize:
                    "13px",
                }}
              >
                <strong
                  style={{
                    color:
                      "#344563",
                  }}
                >
                  Balance after purchase
                </strong>

                <strong
                  style={{
                    color:
                      remainingBalance >=
                      0
                        ? "#0A6CFF"
                        : "#D64545",
                    fontSize:
                      "15px",
                  }}
                >
                  ₦
                  {Math.max(
                    remainingBalance,
                    0
                  ).toLocaleString()}
                </strong>
              </div>

              {remainingBalance <
                0 && (
                <div
                  style={{
                    marginTop:
                      "12px",
                    color:
                      "#D64545",
                    fontSize:
                      "12px",
                    fontWeight:
                      "700",
                  }}
                >
                  <i className="bi bi-exclamation-circle me-1"></i>
                  Insufficient wallet
                  balance.
                </div>
              )}
            </div>
          )}

          {/* Purchase Button */}
          <button
            type="button"
            onClick={
              handlePurchase
            }
            disabled={
              loading ||
              !phone ||
              !amount ||
              airtimeAmount <=
                0 ||
              airtimeAmount >
                walletBalance
            }
            style={{
              width:
                "100%",
              border: "none",
              borderRadius:
                "13px",
              padding:
                "15px",
              background:
                loading ||
                !phone ||
                !amount ||
                airtimeAmount <=
                  0 ||
                airtimeAmount >
                  walletBalance
                  ? "#B7C5D9"
                  : "linear-gradient(135deg, #0A6CFF, #0062E6)",
              color:
                "#ffffff",
              fontSize:
                "14px",
              fontWeight:
                "800",
              cursor:
                loading ||
                !phone ||
                !amount ||
                airtimeAmount <=
                  0 ||
                airtimeAmount >
                  walletBalance
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                loading ||
                !phone ||
                !amount ||
                airtimeAmount <=
                  0 ||
                airtimeAmount >
                  walletBalance
                  ? "none"
                  : "0 9px 22px rgba(10, 108, 255, 0.22)",
            }}
          >
            {loading
              ? "Processing..."
              : `Buy ₦${
                  airtimeAmount >
                  0
                    ? airtimeAmount.toLocaleString()
                    : "0"
                } Airtime`}
          </button>

          {/* Security */}
          <div
            style={{
              textAlign:
                "center",
              marginTop:
                "16px",
              color:
                "#8A99AD",
              fontSize:
                "11px",
            }}
          >
            <i className="bi bi-shield-check me-1"></i>
            Secure wallet-powered
            purchase
          </div>

          <div
            style={{
              textAlign:
                "center",
              marginTop:
                "5px",
              color:
                "#A0AEC0",
              fontSize:
                "10px",
            }}
          >
            Sandbox mode — wallet
            deduction is enabled.
          </div>
        </div>
      </div>

      {/* Transaction PIN Modal */}
      {showPinModal && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(7, 26, 61, 0.55)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "20px",
            zIndex: 9999,
          }}
          onClick={() => {
            if (!loading) {
              setShowPinModal(
                false
              );
              setTransactionPin(
                ""
              );
            }
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width:
                "100%",
              maxWidth:
                "390px",
              background:
                "#ffffff",
              borderRadius:
                "22px",
              padding:
                "28px",
              boxSizing:
                "border-box",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width:
                  "55px",
                height:
                  "55px",
                borderRadius:
                  "16px",
                background:
                  "#EAF2FF",
                color:
                  "#0A6CFF",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                margin:
                  "0 auto 16px",
                fontSize:
                  "25px",
              }}
            >
              <i className="bi bi-shield-lock-fill"></i>
            </div>

            <h2
              style={{
                margin:
                  "0 0 7px",
                textAlign:
                  "center",
                color:
                  "#071A3D",
                fontSize:
                  "21px",
                fontWeight:
                  "800",
              }}
            >
              Enter Transaction PIN
            </h2>

            <p
              style={{
                margin:
                  "0 0 22px",
                textAlign:
                  "center",
                color:
                  "#718096",
                fontSize:
                  "13px",
                lineHeight:
                  "1.5",
              }}
            >
              Enter your 4-digit PIN
              to authorize this
              airtime purchase.
            </p>

            <div
              style={{
                background:
                  "#F4F8FF",
                border:
                  "1px solid #D9E8FF",
                borderRadius:
                  "13px",
                padding:
                  "13px",
                marginBottom:
                  "20px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  color:
                    "#718096",
                  fontSize:
                    "11px",
                  marginBottom:
                    "4px",
                }}
              >
                Purchase
              </div>

              <strong
                style={{
                  color:
                    "#071A3D",
                  fontSize:
                    "16px",
                }}
              >
                ₦
                {airtimeAmount.toLocaleString()}
                {" "}
                {network}
              </strong>
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              autoFocus
              placeholder="••••"
              value={
                transactionPin
              }
              onChange={(e) =>
                setTransactionPin(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              disabled={loading}
              onKeyDown={(e) => {
                if (
                  e.key ===
                    "Enter" &&
                  transactionPin.length ===
                    4 &&
                  !loading
                ) {
                  submitAirtimePurchase();
                }
              }}
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "15px",
                border:
                  "1px solid #DDE5EF",
                borderRadius:
                  "12px",
                outline:
                  "none",
                textAlign:
                  "center",
                fontSize:
                  "25px",
                letterSpacing:
                  "9px",
                color:
                  "#071A3D",
                marginBottom:
                  "17px",
              }}
            />

            <button
              type="button"
              onClick={
                submitAirtimePurchase
              }
              disabled={
                loading ||
                transactionPin.length !==
                  4
              }
              style={{
                width:
                  "100%",
                border:
                  "none",
                borderRadius:
                  "12px",
                padding:
                  "14px",
                background:
                  loading ||
                  transactionPin.length !==
                    4
                    ? "#B7C5D9"
                    : "linear-gradient(135deg, #0A6CFF, #0062E6)",
                color:
                  "#ffffff",
                fontWeight:
                  "800",
                fontSize:
                  "14px",
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
              disabled={loading}
              onClick={() => {
                setShowPinModal(
                  false
                );
                setTransactionPin(
                  ""
                );
              }}
              style={{
                width:
                  "100%",
                border:
                  "none",
                background:
                  "transparent",
                color:
                  "#718096",
                padding:
                  "12px",
                marginTop:
                  "5px",
                fontWeight:
                  "700",
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
                color:
                  "#A0AEC0",
                fontSize:
                  "10px",
                marginTop:
                  "5px",
              }}
            >
              Your PIN is securely
              verified by the server.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AirtimePurchase;