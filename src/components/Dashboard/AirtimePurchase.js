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

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  /*
   * Load wallet balance.
   */
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
              airtimeAmount,
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
          `₦${airtimeAmount.toLocaleString()} ${network} airtime sent to ${phone}`
        );

        setAmount("");
        setPhone("");
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

  return (
    <div className="container mt-4">
      <div className="card shadow-sm p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">
            Buy Airtime
          </h3>

          <span className="badge bg-success">
            Wallet: ₦
            {walletBalance.toLocaleString()}
          </span>
        </div>

        <div className="mb-3">
          <label className="form-label">
            Select Network
          </label>

          <select
            className="form-select"
            value={network}
            onChange={(e) =>
              setNetwork(
                e.target.value
              )
            }
            disabled={loading}
          >
            <option value="MTN">
              MTN
            </option>

            <option value="AIRTEL">
              Airtel
            </option>

            <option value="GLO">
              Glo
            </option>

            <option value="9MOBILE">
              9mobile
            </option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">
            Phone Number
          </label>

          <input
            type="tel"
            className="form-control"
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
            disabled={loading}
          />

          <small className="text-muted">
            Sandbox testing uses
            08011111111.
          </small>
        </div>

        <div className="mb-3">
          <label className="form-label">
            Airtime Amount
          </label>

          <input
            type="number"
            className="form-control"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value
              )
            }
            min="1"
            step="1"
            disabled={loading}
          />
        </div>

        {amount && (
          <div
            className={`alert ${
              remainingBalance >= 0
                ? "alert-info"
                : "alert-danger"
            }`}
          >
            <div>
              <strong>
                {network}
              </strong>
            </div>

            <div>
              Airtime:
              {" "}
              ₦
              {airtimeAmount.toLocaleString()}
            </div>

            <div>
              Current wallet:
              {" "}
              ₦
              {walletBalance.toLocaleString()}
            </div>

            <div>
              Balance after purchase:
              {" "}
              ₦
              {Math.max(
                remainingBalance,
                0
              ).toLocaleString()}
            </div>

            {remainingBalance <
              0 && (
              <div className="mt-2">
                <strong>
                  Insufficient wallet
                  balance.
                </strong>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={
            handlePurchase
          }
          disabled={
            loading ||
            !phone ||
            !amount ||
            airtimeAmount <= 0 ||
            airtimeAmount >
              walletBalance
          }
        >
          {loading
            ? "Processing..."
            : `Buy ₦${
                airtimeAmount > 0
                  ? airtimeAmount.toLocaleString()
                  : "0"
              } Airtime`}
        </button>

        <small className="text-muted d-block mt-3 text-center">
          Sandbox mode — wallet
          deduction is enabled.
        </small>
      </div>
    </div>
  );
};

export default AirtimePurchase;