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

const ELECTRICITY_MARKUP = 50;

const ElectricityPurchase = () => {
  const [user, setUser] = useState(null);

  const [providers, setProviders] = useState([]);
  const [discoName, setDiscoName] = useState("");

  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [amount, setAmount] = useState("");

  const [walletBalance, setWalletBalance] = useState(0);

  const [loadingProviders, setLoadingProviders] =
    useState(true);

  const [verifyingMeter, setVerifyingMeter] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [meterVerified, setMeterVerified] =
    useState(false);

  const [meterDetails, setMeterDetails] =
    useState(null);

  const [purchaseResult, setPurchaseResult] =
    useState(null);

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  /*
   * AUTH
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (authUser) => {
        console.log(
          "AUTH USER:",
          authUser
            ? authUser.email
            : "No user logged in"
        );

        setUser(authUser);
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * LOAD ELECTRICITY PROVIDERS
   */
  useEffect(() => {
    if (!user) {
      setProviders([]);
      setLoadingProviders(false);
      return;
    }

    const loadProviders = async () => {
      try {
        setLoadingProviders(true);

        const token =
          await user.getIdToken();

        console.log(
          "Loading electricity providers from:",
          `${apiUrl}/api/vtu/electricity-providers`
        );

        const response = await axios.get(
          `${apiUrl}/api/vtu/electricity-providers`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
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
        } else if (
          Array.isArray(payload?.dataplans)
        ) {
          providerData = payload.dataplans;
        } else if (
          Array.isArray(payload?.data)
        ) {
          providerData = payload.data;
        } else if (
          Array.isArray(payload?.providers)
        ) {
          providerData = payload.providers;
        } else if (
          Array.isArray(payload?.electricity)
        ) {
          providerData = payload.electricity;
        } else if (
          Array.isArray(
            payload?.data?.dataplans
          )
        ) {
          providerData =
            payload.data.dataplans;
        } else if (
          Array.isArray(
            payload?.data?.providers
          )
        ) {
          providerData =
            payload.data.providers;
        } else if (
          Array.isArray(
            payload?.data?.electricity
          )
        ) {
          providerData =
            payload.data.electricity;
        } else if (
          Array.isArray(
            payload?.data?.data
          )
        ) {
          providerData =
            payload.data.data;
        }

        console.log(
          "RAW ELECTRICITY PROVIDER LIST:",
          providerData
        );

        if (
          !Array.isArray(providerData) ||
          providerData.length === 0
        ) {
          setProviders([]);

          toast.error(
            "No electricity providers are available."
          );

          return;
        }

        /*
         * NORMALIZE PROVIDERS
         */
        const normalizedProviders =
          providerData
            .map((provider, index) => {
              if (
                typeof provider === "string"
              ) {
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
                provider?.electricity_plan_id ||
                provider?.id ||
                "";

              const label =
                provider?.the_electricty_name ||
                provider?.the_electricity_name ||
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
            .filter(
              (provider) =>
                provider.value &&
                provider.name
            );

        console.log(
          "FINAL PROVIDERS FOR DROPDOWN:",
          normalizedProviders
        );

        setProviders(
          normalizedProviders
        );

        if (
          normalizedProviders.length === 0
        ) {
          toast.error(
            "Electricity provider data could not be read."
          );
        }
      } catch (error) {
        console.error(
          "Electricity providers error:",
          error.response?.data ||
            error.message
        );

        setProviders([]);

        if (
          error.response?.status === 401
        ) {
          toast.error(
            "Your login session has expired. Please log in again."
          );
        } else {
          toast.error(
            error.response?.data?.message ||
              "Unable to load electricity providers."
          );
        }
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, [user, apiUrl]);

  /*
   * WALLET BALANCE
   */
  useEffect(() => {
    if (!user) {
      setWalletBalance(0);
      return;
    }

    const db = getFirestore();

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data =
            snapshot.data();

          setWalletBalance(
            Number(data.wallet || 0)
          );
        } else {
          setWalletBalance(0);
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
  }, [user]);

  /*
   * PRICING
   */
  const electricityAmount =
    Number(amount) || 0;

  const sellingPrice =
    electricityAmount > 0
      ? electricityAmount +
        ELECTRICITY_MARKUP
      : 0;

  /*
   * PROVIDER CHANGE
   */
  const handleProviderChange = (
    e
  ) => {
    const value =
      e.target.value;

    console.log(
      "SELECTED ELECTRICITY PROVIDER:",
      value
    );

    setDiscoName(value);

    setMeterVerified(false);
    setMeterDetails(null);
    setPurchaseResult(null);
  };

  /*
   * METER NUMBER CHANGE
   */
  const handleMeterNumberChange = (
    e
  ) => {
    const value =
      e.target.value.replace(
        /\D/g,
        ""
      );

    setMeterNumber(value);

    setMeterVerified(false);
    setMeterDetails(null);
    setPurchaseResult(null);
  };

  /*
   * VERIFY METER
   */
  const handleVerifyMeter = async () => {
    try {
      if (!user) {
        toast.error(
          "Please log in again."
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
          String(meterNumber)
        )
      ) {
        toast.error(
          "Enter a valid meter number."
        );
        return;
      }

      setVerifyingMeter(true);
      setMeterVerified(false);
      setMeterDetails(null);
      setPurchaseResult(null);

      /*
       * SANDBOX TEST METER
       */
      if (
        String(meterNumber) ===
        "1111111111111"
      ) {
        console.log(
          "SANDBOX METER DETECTED"
        );
      }

      const token =
        await user.getIdToken();

      console.log(
        "VERIFYING ELECTRICITY METER:",
        {
          discoName,
          meterNumber,
          meterType,
        }
      );

      const response =
        await axios.post(
          `${apiUrl}/api/vtu/verify-electricity-meter`,
          {
            discoName,
            meterNumber:
              String(meterNumber),
            meterType,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      console.log(
        "METER VERIFICATION RESPONSE:",
        response.data
      );

      /*
       * IMPORTANT:
       *
       * VTU Naija returns:
       *
       * status: "success"
       *
       * Status: "successful"
       *
       * instead of:
       *
       * success: true
       *
       * So we accept all three.
       */
      if (
        response.data?.success === true ||
        response.data?.status === "success" ||
        response.data?.Status === "successful"
      ) {
        setMeterVerified(true);

        const providerData =
          response.data.data ||
          response.data;

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

          meterNumber:
            String(meterNumber),

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

      /*
       * PROVIDER RETURNED A REAL FAILURE
       */
      setMeterVerified(false);

      toast.error(
        response.data?.message ||
          response.data?.api_response ||
          "Meter verification failed."
      );
    } catch (error) {
      console.error(
        "Meter verification error:",
        error.response?.data ||
          error.message
      );

      const errorData =
        error.response?.data;

      /*
       * SANDBOX FALLBACK
       *
       * This allows the known sandbox
       * meter to be used if the provider
       * temporarily rejects the request.
       */
      if (
        String(meterNumber) ===
        "1111111111111"
      ) {
        setMeterVerified(true);

        setMeterDetails({
          meterNumber:
            String(meterNumber),

          meterType,

          customerName:
            "Sandbox Customer",
        });

        toast.success(
          "Sandbox meter verified successfully."
        );
      } else {
        setMeterVerified(false);

        toast.error(
          errorData?.message ||
            errorData?.api_response ||
            "Unable to verify meter."
        );
      }
    } finally {
      setVerifyingMeter(false);
    }
  };

  /*
   * PURCHASE ELECTRICITY
   */
  const handlePurchase = async () => {
    try {
      if (!user) {
        toast.error(
          "Please log in again."
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
          String(meterNumber)
        )
      ) {
        toast.error(
          "Enter a valid meter number."
        );
        return;
      }

      if (!meterVerified) {
        toast.error(
          "Please verify your meter first."
        );
        return;
      }

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
          "Electricity amount must be a whole number."
        );
        return;
      }

      if (
        walletBalance <
        sellingPrice
      ) {
        toast.error(
          `Insufficient wallet balance. You need ₦${sellingPrice.toLocaleString()}.`
        );
        return;
      }

      setPurchasing(true);
      setPurchaseResult(null);

      const token =
        await user.getIdToken();

      console.log(
        "BUYING ELECTRICITY:",
        {
          discoName,
          meterNumber,
          meterType,
          amount:
            electricityAmount,
        }
      );

      const response =
        await axios.post(
          `${apiUrl}/api/vtu/buy-electricity`,
          {
            discoName,
            meterNumber:
              String(meterNumber),
            meterType,
            amount:
              electricityAmount,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      console.log(
        "ELECTRICITY PURCHASE RESPONSE:",
        response.data
      );

      if (
        response.data?.success === true
      ) {
        setPurchaseResult(
          response.data
        );

        toast.success(
          "Electricity purchase successful."
        );

        setAmount("");
      } else if (
        response.data?.pending
      ) {
        toast.info(
          response.data.message ||
            "Your electricity purchase is being processed. Please do not purchase again."
        );

        setPurchaseResult(
          response.data
        );
      } else {
        toast.error(
          response.data?.message ||
            response.data
              ?.api_response ||
            "Electricity purchase failed."
        );
      }
    } catch (error) {
      console.error(
        "Electricity purchase error:",
        error.response?.data ||
          error.message
      );

      const data =
        error.response?.data;

      if (data?.pending) {
        toast.info(
          data.message ||
            "Your electricity purchase is still being processed. Please do not purchase again."
        );

        setPurchaseResult(data);
      } else {
        toast.error(
          data?.message ||
            data?.api_response ||
            "Unable to process electricity purchase."
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Electricity Purchase</h3>

      {/* PROVIDER */}
      <div className="mb-3">
        <label className="form-label">
          Electricity Provider
        </label>

        <select
          className="form-select"
          value={discoName}
          onChange={
            handleProviderChange
          }
          disabled={
            loadingProviders ||
            providers.length === 0
          }
        >
          <option value="">
            {loadingProviders
              ? "Loading providers..."
              : providers.length === 0
              ? "No providers available"
              : "Select provider"}
          </option>

          {providers.map(
            (
              provider,
              index
            ) => (
              <option
                key={
                  provider.id ||
                  index
                }
                value={
                  provider.value
                }
              >
                {provider.name}
              </option>
            )
          )}
        </select>

        {!loadingProviders &&
          providers.length > 0 && (
            <small className="text-muted">
              {providers.length} electricity
              {" "}
              providers available
            </small>
          )}

        {!loadingProviders &&
          providers.length === 0 && (
            <small className="text-danger">
              No electricity providers
              are available.
            </small>
          )}
      </div>

      {/* METER TYPE */}
      <div className="mb-3">
        <label className="form-label">
          Meter Type
        </label>

        <select
          className="form-select"
          value={meterType}
          onChange={(e) => {
            setMeterType(
              e.target.value
            );

            setMeterVerified(false);
            setMeterDetails(null);
            setPurchaseResult(null);
          }}
        >
          <option value="prepaid">
            Prepaid
          </option>

          <option value="postpaid">
            Postpaid
          </option>
        </select>
      </div>

      {/* METER NUMBER */}
      <div className="mb-3">
        <label className="form-label">
          Meter Number
        </label>

        <input
          type="text"
          className="form-control"
          placeholder="Enter meter number"
          value={meterNumber}
          onChange={
            handleMeterNumberChange
          }
          maxLength="15"
        />
      </div>

      {/* VERIFY BUTTON */}
      <button
        type="button"
        className="btn btn-secondary mb-3"
        onClick={
          handleVerifyMeter
        }
        disabled={
          verifyingMeter ||
          !discoName ||
          !meterNumber
        }
      >
        {verifyingMeter
          ? "Verifying..."
          : "Verify Meter"}
      </button>

      {/* VERIFIED METER */}
      {meterVerified &&
        meterDetails && (
          <div className="alert alert-success">
            <strong>
              Meter verified
            </strong>

            <div className="mt-2">
              Meter:
              {" "}
              {meterNumber}
            </div>

            <div>
              Type:
              {" "}
              {meterType}
            </div>

            {meterDetails.customerName && (
              <div>
                Customer:
                {" "}
                {
                  meterDetails.customerName
                }
              </div>
            )}

            {meterDetails.customer_name && (
              <div>
                Customer:
                {" "}
                {
                  meterDetails.customer_name
                }
              </div>
            )}

            {meterDetails.name && (
              <div>
                Customer:
                {" "}
                {meterDetails.name}
              </div>
            )}
          </div>
        )}

      {/* AMOUNT */}
      <div className="mb-3">
        <label className="form-label">
          Electricity Amount (₦)
        </label>

        <input
          type="number"
          className="form-control"
          placeholder="Enter electricity amount"
          value={amount}
          onChange={(e) =>
            setAmount(
              e.target.value
            )
          }
          min="1"
          step="1"
        />
      </div>

      {/* PRICE */}
      {electricityAmount > 0 && (
        <div className="alert alert-info">
          <div>
            Electricity amount:
            {" "}
            ₦
            {electricityAmount.toLocaleString()}
          </div>

          <div>
            Service charge:
            {" "}
            ₦
            {ELECTRICITY_MARKUP.toLocaleString()}
          </div>

          <strong>
            You will pay:
            {" "}
            ₦
            {sellingPrice.toLocaleString()}
          </strong>
        </div>
      )}

      {/* WALLET */}
      <div className="mb-3">
        <strong>
          Wallet Balance:
          {" "}
          ₦
          {walletBalance.toLocaleString()}
        </strong>
      </div>

      {/* PURCHASE */}
      {electricityAmount > 0 && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={
            handlePurchase
          }
          disabled={
            purchasing ||
            !user ||
            !meterVerified ||
            walletBalance <
              sellingPrice
          }
        >
          {purchasing
            ? "Processing..."
            : `Buy Electricity ₦${sellingPrice.toLocaleString()}`}
        </button>
      )}

      {/* PURCHASE RESULT */}
      {purchaseResult && (
        <div
          className={`alert ${
            purchaseResult.success
              ? "alert-success"
              : "alert-warning"
          } mt-4`}
        >
          {purchaseResult.success ? (
            <>
              <h5>
                Electricity Purchase
                {" "}
                Successful
              </h5>

              <p>
                Amount:
                {" "}
                ₦
                {Number(
                  purchaseResult.amount ||
                    sellingPrice
                ).toLocaleString()}
              </p>

              <p>
                Meter Number:
                {" "}
                {purchaseResult.meterNumber ||
                  meterNumber}
              </p>

              <p>
                Meter Type:
                {" "}
                {purchaseResult.meterType ||
                  meterType}
              </p>

              {purchaseResult.providerReference && (
                <p>
                  Provider Reference:
                  {" "}
                  {
                    purchaseResult.providerReference
                  }
                </p>
              )}

              {purchaseResult.providerTransactionId && (
                <p>
                  Provider Transaction ID:
                  {" "}
                  {
                    purchaseResult.providerTransactionId
                  }
                </p>
              )}

              {purchaseResult.token && (
                <p>
                  Electricity Token:
                  {" "}
                  <strong>
                    {
                      purchaseResult.token
                    }
                  </strong>
                </p>
              )}

              {purchaseResult.electricitytoken && (
                <p>
                  Electricity Token:
                  {" "}
                  <strong>
                    {
                      purchaseResult.electricitytoken
                    }
                  </strong>
                </p>
              )}
            </>
          ) : (
            <>
              <h5>
                Purchase Processing
              </h5>

              <p>
                {purchaseResult.message ||
                  "Your electricity purchase is being processed. Please do not purchase again yet."}
              </p>

              {purchaseResult.orderId && (
                <p>
                  Order ID:
                  {" "}
                  {
                    purchaseResult.orderId
                  }
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* SANDBOX NOTICE */}
      <div className="mt-4">
        <small className="text-muted">
          Electricity services are currently
          running in sandbox mode.
          {" "}
          Sandbox meter:
          {" "}
          1111111111111
        </small>
      </div>
    </div>
  );
};

export default ElectricityPurchase;