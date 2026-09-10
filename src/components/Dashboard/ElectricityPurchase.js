import React, { useEffect, useState } from "react";
import axios from "axios";

import { auth, db } from "../../firebase";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { toast } from "react-toastify";

const ElectricityPurchase = () => {
  const [providers, setProviders] = useState([]);
  const [discoName, setDiscoName] = useState("");

  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("prepaid");

  const [customer, setCustomer] = useState(null);
  const [amount, setAmount] = useState("");

  const [walletBalance, setWalletBalance] = useState(0);

  const [loadingProviders, setLoadingProviders] =
    useState(true);

  const [verifying, setVerifying] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [purchaseResult, setPurchaseResult] =
    useState(null);

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  // ---------------------------------------------------------
  // LOAD ELECTRICITY PROVIDERS
  // ---------------------------------------------------------

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoadingProviders(true);

        const response = await axios.get(
          `${apiUrl}/api/vtu/electricity-plans`
        );

        const data =
          response.data?.data?.dataplans || [];

        setProviders(data);

        if (data.length > 0) {
          setDiscoName(
            String(data[0].electricity_plan_id)
          );
        }
      } catch (error) {
        console.error(
          "Electricity providers error:",
          error.response?.data ||
            error.message
        );

        toast.error(
          "Unable to load electricity providers."
        );
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, [apiUrl]);

  // ---------------------------------------------------------
  // WALLET LISTENER
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // VERIFY METER
  // ---------------------------------------------------------

  const handleVerifyMeter = async () => {
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
        "Please verify your email before continuing."
      );
      return;
    }

    if (!discoName) {
      toast.error(
        "Please select an electricity provider."
      );
      return;
    }

    if (
      !meterNumber ||
      !/^\d{10,15}$/.test(
        meterNumber
      )
    ) {
      toast.error(
        "Enter a valid meter number."
      );
      return;
    }

    if (
      process.env.NODE_ENV !==
        "production" &&
      meterNumber !==
        "1111111111111"
    ) {
      toast.error(
        "Sandbox testing uses meter number 1111111111111."
      );
      return;
    }

    try {
      setVerifying(true);
      setCustomer(null);
      setPurchaseResult(null);

      toast.info(
        "Verifying electricity meter..."
      );

      const idToken =
        await currentUser.getIdToken();

      const response =
        await axios.post(
          `${apiUrl}/api/vtu/verify-electricity-meter`,
          {
            discoName,
            meterNumber,
          },
          {
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      if (
        response.data?.success
      ) {
        setCustomer(
          response.data.customer
        );

        toast.success(
          "Meter verified successfully."
        );
      } else {
        toast.error(
          response.data?.message ||
            "Meter verification failed."
        );
      }
    } catch (error) {
      console.error(
        "Meter verification error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Unable to verify meter."
      );
    } finally {
      setVerifying(false);
    }
  };

  // ---------------------------------------------------------
  // PURCHASE ELECTRICITY
  // ---------------------------------------------------------

  const handlePurchase = async () => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      toast.error(
        "Please log in first."
      );
      return;
    }

    if (!customer) {
      toast.error(
        "Please verify your meter first."
      );
      return;
    }

    const electricityAmount =
      Number(amount);

    if (
      !Number.isFinite(
        electricityAmount
      ) ||
      electricityAmount <= 0
    ) {
      toast.error(
        "Enter a valid electricity amount."
      );
      return;
    }

    if (
      !Number.isInteger(
        electricityAmount
      )
    ) {
      toast.error(
        "Amount must be a whole number."
      );
      return;
    }

    if (
      electricityAmount >
      walletBalance
    ) {
      toast.error(
        `Insufficient wallet balance. Available: ₦${walletBalance.toLocaleString()}`
      );
      return;
    }

    try {
      setPurchasing(true);
      setPurchaseResult(null);

      toast.info(
        "Processing electricity purchase..."
      );

      const idToken =
        await currentUser.getIdToken();

      const response =
        await axios.post(
          `${apiUrl}/api/vtu/buy-electricity`,
          {
            discoName,
            meterNumber,
            meterType,
            amount:
              electricityAmount,
          },
          {
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      console.log(
        "Electricity purchase response:",
        response.data
      );

      if (
        response.data?.success
      ) {
        setPurchaseResult(
          response.data
        );

        toast.success(
          "Electricity purchase successful!"
        );

        setAmount("");
      } else {
        toast.error(
          response.data?.message ||
            "Electricity purchase failed."
        );
      }
    } catch (error) {
      console.error(
        "Electricity purchase error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Unable to process electricity purchase."
      );
    } finally {
      setPurchasing(false);
    }
  };

  const electricityAmount =
    Number(amount) || 0;

  const remainingBalance =
    walletBalance -
    electricityAmount;

  const selectedProvider =
    providers.find(
      (provider) =>
        String(
          provider.electricity_plan_id
        ) === String(discoName)
    );

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="container mt-4 mb-5">
      <div className="card shadow-sm p-4">

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">
            Buy Electricity
          </h3>

          <span className="badge bg-success">
            Wallet: ₦
            {walletBalance.toLocaleString()}
          </span>
        </div>

        {/* PROVIDER */}

        <div className="mb-3">
          <label className="form-label">
            Electricity Provider
          </label>

          <select
            className="form-select"
            value={discoName}
            onChange={(e) => {
              setDiscoName(
                e.target.value
              );
              setCustomer(null);
              setPurchaseResult(null);
            }}
            disabled={
              loadingProviders ||
              verifying ||
              purchasing
            }
          >
            {loadingProviders ? (
              <option>
                Loading providers...
              </option>
            ) : (
              <>
                <option value="">
                  Select provider
                </option>

                {providers.map(
                  (provider) => (
                    <option
                      key={
                        provider.electricity_plan_id
                      }
                      value={
                        provider.electricity_plan_id
                      }
                    >
                      {
                        provider.the_electricty_name
                      }
                    </option>
                  )
                )}
              </>
            )}
          </select>
        </div>

        {/* METER NUMBER */}

        <div className="mb-3">
          <label className="form-label">
            Meter Number
          </label>

          <input
            type="tel"
            className="form-control"
            placeholder="1111111111111"
            value={meterNumber}
            onChange={(e) => {
              setMeterNumber(
                e.target.value.replace(
                  /\D/g,
                  ""
                )
              );
              setCustomer(null);
              setPurchaseResult(null);
            }}
            maxLength="15"
            disabled={
              verifying ||
              purchasing
            }
          />

          <small className="text-muted">
            Sandbox testing uses
            1111111111111.
          </small>
        </div>

        {/* VERIFY */}

        <button
          type="button"
          className="btn btn-outline-primary w-100 mb-4"
          onClick={
            handleVerifyMeter
          }
          disabled={
            verifying ||
            purchasing ||
            !discoName ||
            !meterNumber
          }
        >
          {verifying
            ? "Verifying meter..."
            : "Verify Meter"}
        </button>

        {/* CUSTOMER */}

        {customer && (
          <div className="alert alert-success">

            <h5>
              Meter Verified
            </h5>

            <div>
              <strong>
                Customer:
              </strong>{" "}
              {customer.name ||
                "N/A"}
            </div>

            {customer.address && (
              <div>
                <strong>
                  Address:
                </strong>{" "}
                {customer.address}
              </div>
            )}

            {selectedProvider && (
              <div>
                <strong>
                  Provider:
                </strong>{" "}
                {
                  selectedProvider.the_electricty_name
                }
              </div>
            )}
          </div>
        )}

        {/* METER TYPE */}

        {customer && (
          <div className="mb-3">
            <label className="form-label">
              Meter Type
            </label>

            <select
              className="form-select"
              value={meterType}
              onChange={(e) =>
                setMeterType(
                  e.target.value
                )
              }
              disabled={purchasing}
            >
              <option value="prepaid">
                Prepaid
              </option>

              <option value="postpaid">
                Postpaid
              </option>
            </select>
          </div>
        )}

        {/* AMOUNT */}

        {customer && (
          <div className="mb-3">
            <label className="form-label">
              Amount (₦)
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
              disabled={purchasing}
            />
          </div>
        )}

        {/* BALANCE PREVIEW */}

        {customer &&
          amount && (
            <div
              className={`alert ${
                remainingBalance >= 0
                  ? "alert-info"
                  : "alert-danger"
              }`}
            >
              <div>
                Electricity:
                {" "}
                ₦
                {electricityAmount.toLocaleString()}
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
                <strong>
                  Insufficient wallet
                  balance.
                </strong>
              )}
            </div>
          )}

        {/* PURCHASE BUTTON */}

        {customer && (
          <button
            type="button"
            className="btn btn-primary w-100"
            onClick={
              handlePurchase
            }
            disabled={
              purchasing ||
              !amount ||
              electricityAmount <=
                0 ||
              electricityAmount >
                walletBalance
            }
          >
            {purchasing
              ? "Processing..."
              : `Buy Electricity ${
                  electricityAmount > 0
                    ? `₦${electricityAmount.toLocaleString()}`
                    : ""
                }`}
          </button>
        )}

        {/* RESULT */}

        {purchaseResult && (
          <div className="alert alert-success mt-4">

            <h4>
              Electricity Purchase
              Successful
            </h4>

            <hr />

            <div>
              <strong>
                Amount:
              </strong>{" "}
              ₦
              {Number(
                purchaseResult.amount
              ).toLocaleString()}
            </div>

            <div>
              <strong>
                Meter:
              </strong>{" "}
              {purchaseResult.meterNumber}
            </div>

            <div>
              <strong>
                Type:
              </strong>{" "}
              {purchaseResult.meterType}
            </div>

            {purchaseResult.providerReference && (
              <div>
                <strong>
                  Reference:
                </strong>{" "}
                {
                  purchaseResult.providerReference
                }
              </div>
            )}

            {purchaseResult.token && (
              <div className="mt-3">
                <strong>
                  Electricity Token:
                </strong>

                <div className="fs-4 fw-bold mt-1">
                  {purchaseResult.token}
                </div>
              </div>
            )}

          </div>
        )}

        <small className="text-muted d-block mt-3 text-center">
          Sandbox mode — wallet
          deduction is enabled.
        </small>

      </div>
    </div>
  );
};

export default ElectricityPurchase;