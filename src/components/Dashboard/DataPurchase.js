import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import axios from "axios";

import { auth } from "../../firebase";

import { toast } from "react-toastify";

const DATA_MARKUP = 50;

const DataPurchase = () => {
  const [network, setNetwork] = useState("MTN");

  const [plans, setPlans] = useState([]);

  const [phone, setPhone] = useState("");

  const [selectedPlan, setSelectedPlan] = useState("");

  const [loading, setLoading] = useState(false);

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  /*
  |--------------------------------------------------------------------------
  | Calculate customer selling price
  |--------------------------------------------------------------------------
  */

  const getSellingPrice = (plan) => {
    const providerPrice =
      Number(plan.price_for_basicuser);

    return providerPrice + DATA_MARKUP;
  };

  /*
  |--------------------------------------------------------------------------
  | Load Data Plans
  |--------------------------------------------------------------------------
  */

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("Please log in first.");

        setPlans([]);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Get Firebase ID token
      |--------------------------------------------------------------------------
      */

      const idToken =
        await currentUser.getIdToken();

      /*
      |--------------------------------------------------------------------------
      | Load plans from backend
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | Accept provider success response
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | Get plans from actual provider response
      |--------------------------------------------------------------------------
      */

      const providerPlans =
        payload?.dataplans ||
        payload?.data?.dataplans ||
        [];

      console.log(
        "RAW DATA PLAN LIST:",
        providerPlans
      );

      /*
      |--------------------------------------------------------------------------
      | Keep active plans
      |--------------------------------------------------------------------------
      */

      const activePlans =
        providerPlans.filter(
          (plan) => {
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
          }
        );

      console.log(
        "ACTIVE DATA PLANS:",
        activePlans
      );

      /*
      |--------------------------------------------------------------------------
      | Save plans
      |--------------------------------------------------------------------------
      */

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

  /*
  |--------------------------------------------------------------------------
  | Load plans when page opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  /*
  |--------------------------------------------------------------------------
  | Filter plans by network
  |--------------------------------------------------------------------------
  */

  const filteredPlans =
    plans.filter(
      (plan) =>
        String(
          plan.the_network_name || ""
        ).toUpperCase() === network
    );

  /*
  |--------------------------------------------------------------------------
  | Purchase Data
  |--------------------------------------------------------------------------
  */

  const handlePurchase = async () => {
    /*
    |--------------------------------------------------------------------------
    | Check logged-in user
    |--------------------------------------------------------------------------
    */

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      toast.error(
        "Please log in first."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Check email verification
    |--------------------------------------------------------------------------
    */

    if (
      currentUser.email &&
      !currentUser.emailVerified
    ) {
      toast.error(
        "Please verify your email before purchasing."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate phone
    |--------------------------------------------------------------------------
    */

    if (
      !phone ||
      phone.length !== 11
    ) {
      toast.error(
        "Enter a valid 11-digit Nigerian phone number."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Sandbox phone
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Check selected plan
    |--------------------------------------------------------------------------
    */

    if (!selectedPlan) {
      toast.error(
        "Please select a data plan."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Find selected plan
    |--------------------------------------------------------------------------
    */

    const plan =
      plans.find(
        (item) =>
          String(
            item.data_plan_id
          ) ===
          String(selectedPlan)
      );

    if (!plan) {
      toast.error(
        "Selected plan could not be found."
      );

      return;
    }

    try {
      setLoading(true);

      toast.info(
        "Authenticating purchase..."
      );

      /*
      |--------------------------------------------------------------------------
      | Get Firebase ID token
      |--------------------------------------------------------------------------
      */

      const idToken =
        await currentUser.getIdToken();

      /*
      |--------------------------------------------------------------------------
      | Purchase data
      |--------------------------------------------------------------------------
      */

      const response =
        await axios.post(
          `${apiUrl}/api/vtu/buy-data`,
          {
            network,
            mobileNumber: phone,
            plan: selectedPlan,
          },
          {
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      console.log(
        "Purchase response:",
        response.data
      );

      /*
      |--------------------------------------------------------------------------
      | Purchase success
      |--------------------------------------------------------------------------
      */

      if (
        response.data.success ||
        response.data.status ===
          "success" ||
        response.data.Status ===
          "successful"
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

        setSelectedPlan("");

        setPhone("");
      } else {
        toast.error(
          response.data.message ||
            "Purchase failed."
        );
      }
    } catch (error) {
      console.error(
        "Purchase error:",
        error.response?.data ||
          error.message
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Unable to process purchase."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="container mt-4">
      <div className="card shadow-sm p-4">

        <h3 className="mb-4">
          Buy Data
        </h3>

        {/* NETWORK */}

        <div className="mb-3">
          <label className="form-label">
            Select Network
          </label>

          <select
            className="form-select"
            value={network}
            onChange={(e) => {
              setNetwork(
                e.target.value
              );

              setSelectedPlan("");
            }}
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

        {/* PHONE */}

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
          />

          <small className="text-muted">
            Sandbox testing uses
            08011111111.
          </small>
        </div>

        {/* PLAN */}

        <div className="mb-3">
          <label className="form-label">
            Select Data Plan
          </label>

          {loading ? (
            <p>
              Loading plans...
            </p>
          ) : filteredPlans.length ===
            0 ? (
            <div className="alert alert-warning">
              No active plans available
              for {network}.
            </div>
          ) : (
            <select
              className="form-select"
              value={selectedPlan}
              onChange={(e) =>
                setSelectedPlan(
                  e.target.value
                )
              }
            >
              <option value="">
                -- Select a plan --
              </option>

              {filteredPlans.map(
                (plan) => {
                  const sellingPrice =
                    getSellingPrice(
                      plan
                    );

                  return (
                    <option
                      key={
                        plan.data_plan_id
                      }
                      value={
                        plan.data_plan_id
                      }
                    >
                      {plan.size} — ₦
                      {sellingPrice.toLocaleString()}{" "}
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
                  );
                }
              )}
            </select>
          )}
        </div>

        {/* PLAN DETAILS */}

        {selectedPlan && (
          <div className="alert alert-info">
            {(() => {
              const plan =
                plans.find(
                  (item) =>
                    String(
                      item.data_plan_id
                    ) ===
                    String(
                      selectedPlan
                    )
                );

              if (!plan) {
                return null;
              }

              const sellingPrice =
                getSellingPrice(
                  plan
                );

              return (
                <>
                  <strong>
                    {
                      plan.the_network_name
                    }
                  </strong>

                  <br />

                  Plan:{" "}
                  {plan.size}

                  <br />

                  Type:{" "}
                  {
                    plan.the_datatype_name
                  }

                  <br />

                  Duration:{" "}
                  {plan.duration}{" "}
                  day
                  {String(
                    plan.duration
                  ) === "1"
                    ? ""
                    : "s"}

                  <br />

                  <strong>
                    Price: ₦
                    {sellingPrice.toLocaleString()}
                  </strong>
                </>
              );
            })()}
          </div>
        )}

        {/* BUY BUTTON */}

        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={
            handlePurchase
          }
          disabled={
            loading ||
            !selectedPlan ||
            !phone
          }
        >
          {loading
            ? "Processing..."
            : selectedPlan
            ? `Buy Data for ₦${getSellingPrice(
                plans.find(
                  (item) =>
                    String(
                      item.data_plan_id
                    ) ===
                    String(
                      selectedPlan
                    )
                ) || {
                  price_for_basicuser: 0,
                }
              ).toLocaleString()}`
            : "Buy Data"}
        </button>

        {/* SANDBOX NOTICE */}

        <small className="text-muted d-block mt-3 text-center">
          Sandbox mode — testing
          environment.
        </small>

      </div>
    </div>
  );
};

export default DataPurchase;