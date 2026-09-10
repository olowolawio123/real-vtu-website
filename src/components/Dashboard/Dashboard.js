import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let unsubscribeWallet;

    const unsubscribeAuth = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);

      if (!authUser) {
        setWallet(0);
        return;
      }

      const walletRef = doc(db, "users", authUser.uid);

      unsubscribeWallet = onSnapshot(
        walletRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setWallet(Number(snapshot.data().wallet || 0));
          } else {
            setWallet(0);
          }
        },
        () => toast.error("Error watching wallet balance")
      );
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeWallet) {
        unsubscribeWallet();
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Unable to log out");
    }
  };

  const actions = [
    {
      icon: "bi-phone-fill",
      title: "Buy Airtime",
      description: "Recharge any network instantly",
      route: "/buy-airtime",
    },
    {
      icon: "bi-wifi",
      title: "Buy Data",
      description: "Affordable data bundles",
      route: "/buy-data",
    },
    {
      icon: "bi-tv-fill",
      title: "TV Subscription",
      description: "Renew your TV subscription",
      route: "/tv",
    },
    {
      icon: "bi-lightning-charge-fill",
      title: "Electricity",
      description: "Pay your electricity bill",
      route: "/electricity",
    },
    {
      icon: "bi-receipt",
      title: "Transactions",
      description: "View your transaction history",
      route: "/transactions",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F7FB",
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Top Navigation */}
      <nav
        style={{
          background: "#071A3D",
          color: "#ffffff",
          padding: "16px 24px",
          boxShadow: "0 4px 20px rgba(7, 26, 61, 0.15)",
        }}
      >
        <div
          style={{
            maxWidth: "1250px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
            }}
            onClick={() => navigate("/Dashboard")}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #0A6CFF, #00B8FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "17px",
              }}
            >
              IL
            </div>

            <div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  letterSpacing: "0.3px",
                }}
              >
                INSTANT LOAD
              </div>

              <div
                style={{
                  fontSize: "10px",
                  color: "#AFC4E8",
                  letterSpacing: "1px",
                }}
              >
                FAST • SECURE • RELIABLE
              </div>
            </div>
          </div>

          {/* User Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "none",
              }}
              className="dashboard-user-email"
            >
              {user?.email || ""}
            </div>

            <button
              onClick={handleLogout}
              style={{
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "9px 14px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
          padding: "35px 24px 50px",
        }}
      >
        {/* Welcome Banner */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #0A6CFF 0%, #0756D9 55%, #063B9F 100%)",
            borderRadius: "24px",
            padding: "30px",
            color: "#ffffff",
            marginBottom: "25px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 15px 35px rgba(10, 108, 255, 0.2)",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            <p
              style={{
                margin: "0 0 7px",
                fontSize: "13px",
                color: "#CFE1FF",
                fontWeight: "600",
              }}
            >
              Welcome back 👋
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "800",
                letterSpacing: "-0.6px",
              }}
            >
              {user?.displayName || "Welcome to INSTANT LOAD"}
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                maxWidth: "600px",
                color: "#E1ECFF",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Manage airtime, data, electricity and TV
              subscriptions from one simple dashboard.
            </p>
          </div>

          <i
            className="bi bi-lightning-charge-fill"
            style={{
              position: "absolute",
              right: "40px",
              top: "25px",
              fontSize: "110px",
              color: "rgba(255,255,255,0.08)",
            }}
          ></i>
        </div>

        {/* Wallet Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "25px",
              boxShadow: "0 8px 25px rgba(20, 50, 90, 0.07)",
              border: "1px solid #E7EDF5",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#EAF2FF",
                  color: "#0A6CFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "21px",
                }}
              >
                <i className="bi bi-wallet2"></i>
              </div>

              <div>
                <div
                  style={{
                    color: "#718096",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Wallet Balance
                </div>

                <div
                  style={{
                    color: "#071A3D",
                    fontSize: "30px",
                    fontWeight: "800",
                    marginTop: "3px",
                  }}
                >
                  ₦{wallet.toLocaleString()}
                </div>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                background: "#EDF1F6",
                margin: "18px 0",
              }}
            />

            <div
              style={{
                color: "#718096",
                fontSize: "12px",
              }}
            >
              Available balance for your purchases
            </div>
          </div>

          <button
            onClick={() => navigate("/fund-wallet")}
            style={{
              border: "none",
              borderRadius: "20px",
              padding: "24px 28px",
              background:
                "linear-gradient(135deg, #071A3D, #0B2B63)",
              color: "#ffffff",
              cursor: "pointer",
              minWidth: "190px",
              boxShadow: "0 10px 25px rgba(7, 26, 61, 0.15)",
            }}
          >
            <i
              className="bi bi-plus-circle"
              style={{
                fontSize: "28px",
                display: "block",
                marginBottom: "10px",
              }}
            ></i>

            <span
              style={{
                display: "block",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              Fund Wallet
            </span>

            <span
              style={{
                display: "block",
                marginTop: "4px",
                fontSize: "11px",
                color: "#B9C9E2",
              }}
            >
              Add money instantly
            </span>
          </button>
        </div>

        {/* Quick Services */}
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "17px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#071A3D",
                  fontSize: "21px",
                  fontWeight: "800",
                }}
              >
                Quick Services
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#718096",
                  fontSize: "13px",
                }}
              >
                Choose a service to get started
              </p>
            </div>
          </div>

          <div className="row g-3">
            {actions.map((action, index) => (
              <div
                key={index}
                className="col-12 col-sm-6 col-lg-4"
              >
                <div
                  onClick={() => navigate(action.route)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #E7EDF5",
                    borderRadius: "18px",
                    padding: "23px",
                    cursor: "pointer",
                    height: "100%",
                    boxShadow:
                      "0 7px 20px rgba(20, 50, 90, 0.05)",
                    transition:
                      "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 14px 30px rgba(20, 50, 90, 0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 7px 20px rgba(20, 50, 90, 0.05)";
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "15px",
                      background: "#EAF2FF",
                      color: "#0A6CFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "23px",
                      marginBottom: "16px",
                    }}
                  >
                    <i className={`bi ${action.icon}`}></i>
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      color: "#172B4D",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    {action.title}
                  </h3>

                  <p
                    style={{
                      margin: "7px 0 14px",
                      color: "#718096",
                      fontSize: "12px",
                      lineHeight: "1.5",
                    }}
                  >
                    {action.description}
                  </p>

                  <div
                    style={{
                      color: "#0A6CFF",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    Continue
                    <i className="bi bi-arrow-right ms-1"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Section */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "25px",
            border: "1px solid #E7EDF5",
            boxShadow: "0 7px 20px rgba(20, 50, 90, 0.05)",
          }}
        >
          <div className="row g-4 align-items-center">
            <div className="col-lg-7">
              <div
                style={{
                  color: "#0A6CFF",
                  fontSize: "12px",
                  fontWeight: "800",
                  letterSpacing: "0.8px",
                  marginBottom: "7px",
                }}
              >
                INSTANT LOAD
              </div>

              <h3
                style={{
                  margin: 0,
                  color: "#071A3D",
                  fontSize: "20px",
                  fontWeight: "800",
                }}
              >
                Fast, Secure & Reliable
              </h3>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#718096",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                Your everyday digital services, available
                whenever you need them.
              </p>
            </div>

            <div className="col-lg-5">
              <div className="row g-3">
                <div className="col-4 text-center">
                  <i
                    className="bi bi-lightning-charge-fill"
                    style={{
                      fontSize: "22px",
                      color: "#0A6CFF",
                    }}
                  ></i>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#526581",
                      marginTop: "6px",
                    }}
                  >
                    Fast
                  </div>
                </div>

                <div className="col-4 text-center">
                  <i
                    className="bi bi-shield-check"
                    style={{
                      fontSize: "22px",
                      color: "#0A6CFF",
                    }}
                  ></i>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#526581",
                      marginTop: "6px",
                    }}
                  >
                    Secure
                  </div>
                </div>

                <div className="col-4 text-center">
                  <i
                    className="bi bi-headset"
                    style={{
                      fontSize: "22px",
                      color: "#0A6CFF",
                    }}
                  ></i>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#526581",
                      marginTop: "6px",
                    }}
                  >
                    Support
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile adjustments */}
      <style>
        {`
          @media (max-width: 576px) {
            .dashboard-user-email {
              display: none !important;
            }
          }

          @media (max-width: 700px) {
            main {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }

          @media (max-width: 600px) {
            nav > div {
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;