import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(0);

  // Listen for wallet changes in real time. When the backend credits the wallet
  // from the Paystack webhook, the balance on the dashboard updates automatically.
  useEffect(() => {
    let unsubscribeWallet;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setWallet(0);
        return;
      }

      const walletRef = doc(db, "users", user.uid);
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
      if (unsubscribeWallet) unsubscribeWallet();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Logged out");
    navigate("/login");
  };

  // Action buttons
  const actions = [
    { icon: "bi-phone-fill", title: "Buy Airtime", route: "/buy-airtime" },
    { icon: "bi-wifi", title: "Buy Data", route: "/buy-data" },
    { icon: "bi-tv-fill", title: "TV Subscription", route: "/tv" },
    { icon: "bi-lightning-charge-fill", title: "Electricity", route: "/electricity" },
    { icon: "bi-receipt", title: "Transactions", route: "/transactions" },
  ];

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Dashboard</h4>
        <button className="btn btn-outline-danger" onClick={handleLogout}>
          Logout <i className="bi bi-box-arrow-right ms-1"></i>
        </button>
      </div>

      {/* Wallet Card */}
      <div className="card bg-success text-white mb-4 shadow-sm">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0">Wallet Balance</h6>
            <h3>₦{wallet.toLocaleString()}</h3>
          </div>
          <div
            title="Fund Wallet"
            onClick={() => navigate("/fund-wallet")}
            style={{ cursor: "pointer" }}
          >
            <i className="bi bi-wallet2 fs-1 text-white"></i>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="row g-4">
        {actions.map((action, idx) => (
          <div key={idx} className="col-md-4">
            <div
              className="card shadow-sm text-center p-4 hover-effect"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(action.route)}
            >
              <i className={`bi ${action.icon} fs-1 text-primary mb-2`}></i>
              <h5>{action.title}</h5>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
