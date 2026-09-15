import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
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
  const [walletBalance, setWalletBalance] =
    useState(0);

  const [selectedProvider, setSelectedProvider] =
    useState("");

  const [selectedPlan, setSelectedPlan] =
    useState(null);

  const [smartCardNumber, setSmartCardNumber] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [customer, setCustomer] =
    useState(null);

  const [loadingPlans, setLoadingPlans] =
    useState(true);

  const [verifying, setVerifying] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [receipt, setReceipt] =
    useState(null);

  const [showPinModal, setShowPinModal] =
    useState(false);

  const [transactionPin, setTransactionPin] =
    useState("");

  const [providerMode, setProviderMode] =
    useState("vtunaija");

  // =====================================================
  // LOAD CABLE TV PLANS
  // =====================================================

  useEffect(() => {
    let unsubscribeAuth;

    const loadPlans = async (user) => {
      try {
        setLoadingPlans(true);

        if (!user) {
          setPlans([]);
          setSelectedProvider("");
          return;
        }

        const idToken =
          await user.getIdToken();

        const response = await axios.get(
          `${API_URL}/api/vtu/cable-tv-plans`,
          {
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

        const responseData = response.data || {};

console.log(
  "CABLE TV FULL API RESPONSE:",
  responseData
);

// -----------------------------------------------------
// Detect provider from all possible response wrappers
// -----------------------------------------------------

const detectedProvider = String(
  responseData?.provider ||
    responseData?.data?.provider ||
    responseData?.data?.data?.provider ||
    responseData?.result?.provider ||
    "vtunaija"
).toLowerCase();

console.log(
  "DETECTED CABLE PROVIDER:",
  detectedProvider
);

setProviderMode(
  detectedProvider
);

// -----------------------------------------------------
// Find cable plans from all possible response wrappers
// -----------------------------------------------------

let rawPlans =
  responseData?.data?.dataplans ||
  responseData?.data?.data?.dataplans ||
  responseData?.dataplans ||
  responseData?.data?.plans ||
  responseData?.data?.data ||
  responseData?.plans ||
  [];

// Make sure it is actually an array
if (!Array.isArray(rawPlans)) {
  rawPlans = [];
}

console.log(
  "RAW CABLE PLANS:",
  rawPlans
);

console.log(
  "RAW CABLE PLAN COUNT:",
  rawPlans.length
);

        /*
         * Normalize both providers into one
         * frontend format.
         */
        const normalizedPlans =
          rawPlans
            .map((plan) => {
              if (
  detectedProvider ===
  "cheapdatahub"
) {
  return {
    cabletv_plan_id:
      plan.plan_id,

    plan_id:
      plan.plan_id,

    the_cabletv_name:
      plan.cable ||
      plan.the_cabletv_name ||
      plan.provider_name ||
      "",

    size:
      plan.plan_name ||
      plan.size ||
      "",

    plan_name:
      plan.plan_name ||
      plan.size ||
      "",

    price_for_basicuser:
      Number(
        plan.price_for_basicuser ||
        plan.sellingPrice ||
        plan.price ||
        0
      ),

    provider_price:
      Number(
        plan.provider_price ||
        plan.price ||
        0
      ),

    duration:
      Number(
        plan.duration ||
        30
      ),

    provider:
      "cheapdatahub",
  };
}

              return {
                ...plan,

                cabletv_plan_id:
                  plan.cabletv_plan_id,

                plan_id:
                  plan.cabletv_plan_id,

                the_cabletv_name:
                  plan.the_cabletv_name,

                size:
                  plan.size,

                price_for_basicuser:
                  Number(
                    plan.price_for_basicuser ||
                      0
                  ),

                duration:
                  plan.duration,

                provider:
                  "vtunaija",
              };
            })
            .filter(
              (plan) =>
                plan.the_cabletv_name &&
                Number(
                  plan.price_for_basicuser
                ) > 0
            );

        setPlans(
          normalizedPlans
        );

        if (
          normalizedPlans.length > 0
        ) {
          setSelectedProvider(
            normalizedPlans[0]
              .the_cabletv_name || ""
          );
        }
      } catch (error) {
        console.error(
          "Cable TV plans error:",
          error.response?.data ||
            error.message
        );

        toast.error(
          error.response?.data?.message ||
            "Unable to load Cable TV plans"
        );
      } finally {
        setLoadingPlans(false);
      }
    };

    unsubscribeAuth =
      auth.onAuthStateChanged((user) => {
        loadPlans(user);
      });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  // =====================================================
  // WATCH WALLET
  // =====================================================

  useEffect(() => {
    let unsubscribeWallet = null;

    const unsubscribeAuth =
      auth.onAuthStateChanged((user) => {
        if (!user) {
          setWalletBalance(0);

          if (unsubscribeWallet) {
            unsubscribeWallet();
            unsubscribeWallet = null;
          }

          return;
        }

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        unsubscribeWallet =
          onSnapshot(
            userRef,
            (snapshot) => {
              if (snapshot.exists()) {
                const data =
                  snapshot.data() || {};

                setWalletBalance(
                  Number(
                    data.wallet || 0
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
      });

    return () => {
      if (unsubscribeWallet) {
        unsubscribeWallet();
      }

      unsubscribeAuth();
    };
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
        !uniqueProviders.includes(
          provider
        )
      ) {
        uniqueProviders.push(
          provider
        );
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
  }, [
    plans,
    selectedProvider,
  ]);

  // =====================================================
  // SELECT PROVIDER
  // =====================================================

  const handleProviderChange = (
    event
  ) => {
    const provider =
      event.target.value;

    setSelectedProvider(provider);
    setSelectedPlan(null);
    setCustomer(null);
    setReceipt(null);
    setSmartCardNumber("");
  };

  // =====================================================
  // SELECT PLAN
  // =====================================================

  const handlePlanChange = (
    event
  ) => {
    const planId =
      event.target.value;

    const plan =
      providerPlans.find(
        (item) =>
          String(
            item.cabletv_plan_id
          ) === String(planId)
      );

    setSelectedPlan(
      plan || null
    );

    setCustomer(null);
    setReceipt(null);
  };

  // =====================================================
  // VERIFY CUSTOMER
  // =====================================================

  const handleVerifyCustomer =
    async () => {
      const user =
        auth.currentUser;

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

      if (
        !/^\d+$/.test(
          cleanSmartCard
        )
      ) {
        toast.error(
          "Smart Card / IUC number must contain only numbers"
        );
        return;
      }

      if (!selectedProvider) {
        toast.error(
          "Select a Cable TV provider"
        );
        return;
      }

      /*
       * CheapDataHub currently does not expose
       * the verification endpoint we use for
       * VTU Naija.
       *
       * Therefore verification is not required
       * when CheapDataHub is active.
       */
      if (
        providerMode ===
        "cheapdatahub"
      ) {
        setCustomer({
          verificationUnavailable:
            true,

          customerName:
            "Verification unavailable",

          smartCardNumber:
            cleanSmartCard,
        });

        toast.info(
          "CheapDataHub does not currently provide customer verification. Please confirm your Smart Card number before subscribing."
        );

        return;
      }

      try {
        setVerifying(true);
        setCustomer(null);

        const idToken =
          await user.getIdToken();

        const cableName =
          selectedProvider ===
          "GOTV"
            ? "1"
            : selectedProvider ===
              "DSTV"
            ? "2"
            : selectedProvider ===
              "STARTIMES"
            ? "3"
            : "4";

        const response =
          await axios.post(
            `${API_URL}/api/vtu/verify-cable-customer`,
            {
              cableName,

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

        const status =
          String(
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

        setCustomer(
          providerData
        );

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
  // VALIDATE PURCHASE
  // =====================================================

  const handlePurchase =
    async () => {
      const user =
        auth.currentUser;

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

      if (
        !/^\d+$/.test(
          cleanSmartCard
        )
      ) {
        toast.error(
          "Smart Card / IUC number must contain only numbers"
        );
        return;
      }

      /*
       * CheapDataHub requires a phone number.
       */
      if (
        providerMode ===
        "cheapdatahub"
      ) {
        const cleanPhone =
          phoneNumber.trim();

        if (!cleanPhone) {
          toast.error(
            "Enter your phone number"
          );
          return;
        }

        if (
          !/^\d{10,15}$/.test(
            cleanPhone
          )
        ) {
          toast.error(
            "Enter a valid phone number"
          );
          return;
        }

        /*
         * For CheapDataHub, verification is
         * intentionally not required.
         */
        if (!customer) {
          setCustomer({
            verificationUnavailable:
              true,

            customerName:
              "Verification unavailable",

            smartCardNumber:
              cleanSmartCard,
          });
        }
      } else {
        /*
         * VTU Naija still requires verification.
         */
        if (!customer) {
          toast.error(
            "Verify the customer before subscribing"
          );
          return;
        }
      }

      const amount =
        Number(
          selectedPlan.price_for_basicuser
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        toast.error(
          "Invalid Cable TV plan price"
        );
        return;
      }

      if (
        amount > walletBalance
      ) {
        toast.error(
          "Insufficient wallet balance"
        );
        return;
      }

      setTransactionPin("");
      setShowPinModal(true);
    };

  // =====================================================
  // SUBMIT CABLE PURCHASE WITH PIN
  // =====================================================

  const submitCablePurchase =
    async () => {
      const user =
        auth.currentUser;

      if (!user) {
        toast.error(
          "Please login before continuing"
        );
        return;
      }

      if (
        !/^\d{4}$/.test(
          transactionPin
        )
      ) {
        toast.error(
          "Enter your 4-digit transaction PIN"
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

      let cleanPhone = "";

      if (
        providerMode ===
        "cheapdatahub"
      ) {
        cleanPhone =
          phoneNumber.trim();

        if (!cleanPhone) {
          toast.error(
            "Enter your phone number"
          );
          return;
        }

        if (
          !/^\d{10,15}$/.test(
            cleanPhone
          )
        ) {
          toast.error(
            "Enter a valid phone number"
          );
          return;
        }
      }

      try {
        setPurchasing(true);

        const idToken =
          await user.getIdToken();

        /*
         * VTU Naija expects:
         * 1 = GOTV
         * 2 = DSTV
         * 3 = STARTIMES
         *
         * CheapDataHub uses the plan ID directly.
         */
        const cableName =
          selectedProvider ===
          "GOTV"
            ? "1"
            : selectedProvider ===
              "DSTV"
            ? "2"
            : selectedProvider ===
              "STARTIMES"
            ? "3"
            : "4";

        const amount =
          Number(
            selectedPlan.price_for_basicuser
          );

        /*
         * IMPORTANT:
         *
         * VTU Naija:
         * cablePlan = cabletv_plan_id
         *
         * CheapDataHub:
         * cablePlan = plan_id
         *
         * We normalized both fields earlier,
         * so cabletv_plan_id contains the correct
         * value for both providers.
         */
        const cablePlan =
          selectedPlan.cabletv_plan_id;

        const response =
          await axios.post(
            `${API_URL}/api/vtu/buy-cable-tv`,
            {
              cableName,

              smartCardNumber:
                cleanSmartCard,

              cablePlan,

              amount,

              phone:
                providerMode ===
                "cheapdatahub"
                  ? cleanPhone
                  : undefined,

              transactionPin,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${idToken}`,
              },
            }
          );

        const result =
          response.data;

        /*
         * Pending / unknown provider response.
         */
        if (
          result?.pending
        ) {
          toast.warning(
            result?.message ||
              "Your Cable TV request is being checked. Please do not purchase again yet."
          );

          setTransactionPin("");
          setShowPinModal(false);

          return;
        }

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
          provider:
            selectedProvider,

          plan:
            selectedPlan.size,

          smartCardNumber:
            cleanSmartCard,

          phone:
            cleanPhone ||
            null,

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
        setTransactionPin("");
        setShowPinModal(false);
      } catch (error) {
        console.error(
          "Cable TV purchase error:",
          error.response?.data ||
            error.message
        );

        if (
          error.response?.status ===
          401
        ) {
          toast.error(
            error.response?.data?.message ||
              "Incorrect transaction PIN"
          );

          setTransactionPin("");

          return;
        }

        if (
          error.response?.status ===
          202
        ) {
          toast.warning(
            error.response?.data?.message ||
              "Your Cable TV request is being checked. Please do not purchase again yet."
          );

          setTransactionPin("");
          setShowPinModal(false);

          return;
        }

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

  const formatMoney = (
    amount
  ) => {
    return Number(
      amount || 0
    ).toLocaleString(
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
        <div
          style={
            styles.loadingCard
          }
        >
          <div
            style={
              styles.loadingIcon
            }
          >
            📺
          </div>

          <h2
            style={
              styles.loadingTitle
            }
          >
            Loading Cable TV
          </h2>

          <p
            style={
              styles.loadingText
            }
          >
            Getting the latest subscription
            packages...
          </p>

          <div
            style={
              styles.spinner
            }
          />
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

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <div
              style={
                styles.brandBadge
              }
            >
              INSTANT LOAD
            </div>

            <h1
              style={styles.title}
            >
              Cable TV
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Subscribe to your favourite
              Cable TV package instantly.
            </p>
          </div>

          <div
            style={
              styles.walletCard
            }
          >
            <div
              style={
                styles.walletTop
              }
            >
              <span>
                Wallet Balance
              </span>

              <span
                style={
                  styles.walletIcon
                }
              >
                ₦
              </span>
            </div>

            <strong
              style={
                styles.walletAmount
              }
            >
              ₦
              {formatMoney(
                walletBalance
              )}
            </strong>
          </div>
        </div>

        {/* MAIN CARD */}

        <div style={styles.card}>

          {/* PROVIDER */}

          <div style={styles.section}>
            <label
              style={styles.label}
            >
              Cable TV Provider
            </label>

            <div
              style={
                styles.selectWrapper
              }
            >
              <span
                style={
                  styles.selectIcon
                }
              >
                📺
              </span>

              <select
                value={
                  selectedProvider
                }
                onChange={
                  handleProviderChange
                }
                style={
                  styles.select
                }
              >
                <option value="">
                  Select provider
                </option>

                {providers.map(
                  (provider) => (
                    <option
                      key={provider}
                      value={provider}
                    >
                      {provider}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* PROVIDER QUICK CHOICES */}

          {providers.length > 0 && (
            <div
              style={
                styles.providerTiles
              }
            >
              {providers.map(
                (provider) => {
                  const active =
                    selectedProvider ===
                    provider;

                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(
                          provider
                        );

                        setSelectedPlan(
                          null
                        );

                        setCustomer(
                          null
                        );

                        setReceipt(
                          null
                        );

                        setSmartCardNumber(
                          ""
                        );
                      }}
                      style={{
                        ...styles.providerTile,

                        ...(active
                          ? styles.providerTileActive
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          ...styles.providerTileIcon,

                          ...(active
                            ? styles.providerTileIconActive
                            : {}),
                        }}
                      >
                        📺
                      </span>

                      <span>
                        {provider}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* PLAN */}

          <div style={styles.section}>
            <label
              style={styles.label}
            >
              Select Package
            </label>

            <div
              style={
                styles.selectWrapper
              }
            >
              <span
                style={
                  styles.selectIcon
                }
              >
                ⭐
              </span>

              <select
                value={
                  selectedPlan?.cabletv_plan_id ||
                  ""
                }
                onChange={
                  handlePlanChange
                }
                style={
                  styles.select
                }
                disabled={
                  !selectedProvider
                }
              >
                <option value="">
                  {selectedProvider
                    ? "Select package"
                    : "Select provider first"}
                </option>

                {providerPlans.map(
                  (plan) => (
                    <option
                      key={
                        plan.cabletv_plan_id
                      }
                      value={
                        plan.cabletv_plan_id
                      }
                    >
                      {plan.size} — ₦
                      {formatMoney(
                        plan.price_for_basicuser
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* PLAN SUMMARY */}

          {selectedPlan && (
            <div
              style={
                styles.planCard
              }
            >
              <div
                style={
                  styles.planHeader
                }
              >
                <div>
                  <span
                    style={
                      styles.planEyebrow
                    }
                  >
                    SELECTED PACKAGE
                  </span>

                  <h3
                    style={
                      styles.planTitle
                    }
                  >
                    {selectedPlan.size}
                  </h3>
                </div>

                <div
                  style={
                    styles.planPrice
                  }
                >
                  ₦
                  {formatMoney(
                    selectedPlan.price_for_basicuser
                  )}
                </div>
              </div>

              <div
                style={
                  styles.planDetails
                }
              >
                <div
                  style={
                    styles.planDetail
                  }
                >
                  <span
                    style={
                      styles.detailIcon
                    }
                  >
                    📺
                  </span>

                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
                    >
                      Provider
                    </span>

                    <strong>
                      {selectedProvider}
                    </strong>
                  </div>
                </div>

                <div
                  style={
                    styles.planDetail
                  }
                >
                  <span
                    style={
                      styles.detailIcon
                    }
                  >
                    📅
                  </span>

                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
                    >
                      Duration
                    </span>

                    <strong>
                      {
                        selectedPlan.duration
                      }{" "}
                      days
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SMART CARD */}

          <div style={styles.section}>
            <label
              style={styles.label}
            >
              Smart Card / IUC Number
            </label>

            <div
              style={
                styles.inputRow
              }
            >
              <div
                style={
                  styles.inputWrapper
                }
              >
                <span
                  style={
                    styles.inputIcon
                  }
                >
                  #
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    smartCardNumber
                  }
                  onChange={(
                    event
                  ) => {
                    setSmartCardNumber(
                      event.target.value
                    );

                    setCustomer(
                      null
                    );

                    setReceipt(
                      null
                    );
                  }}
                  placeholder="Enter Smart Card / IUC number"
                  style={
                    styles.input
                  }
                />
              </div>

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
                style={{
                  ...styles.verifyButton,

                  ...(verifying
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {verifying ? (
                  <>
                    <span
                      style={
                        styles.buttonSpinner
                      }
                    />
                    Verifying
                  </>
                ) : providerMode ===
                  "cheapdatahub" ? (
                  <>
                    ✓ Confirm
                  </>
                ) : (
                  <>
                    ✓ Verify
                  </>
                )}
              </button>
            </div>

            {providerMode ===
            "cheapdatahub" ? (
              <div
                style={
                  styles.infoHint
                }
              >
                <span>ℹ️</span>

                <span>
                  CheapDataHub does not currently
                  provide Cable TV customer
                  verification. Please carefully
                  confirm your Smart Card / IUC
                  number before subscribing.
                </span>
              </div>
            ) : (
              <div
                style={
                  styles.sandboxHint
                }
              >
                <span>🧪</span>

                Sandbox test number:{" "}
                <strong>
                  1212121212
                </strong>
              </div>
            )}
          </div>

          {/* PHONE NUMBER */}

          <div style={styles.section}>
            <label
              style={styles.label}
            >
              Phone Number
              {providerMode ===
                "cheapdatahub" &&
                " *"}
            </label>

            <div
              style={
                styles.inputWrapper
              }
            >
              <span
                style={
                  styles.inputIcon
                }
              >
                ☎
              </span>

              <input
                type="tel"
                inputMode="numeric"
                value={
                  phoneNumber
                }
                onChange={(
                  event
                ) => {
                  setPhoneNumber(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  );

                  setReceipt(
                    null
                  );
                }}
                placeholder="Enter phone number"
                maxLength={15}
                style={
                  styles.input
                }
              />
            </div>

            <div
              style={
                styles.phoneHint
              }
            >
              {providerMode ===
              "cheapdatahub"
                ? "Required for Cable TV subscription."
                : "Phone number for your transaction record."}
            </div>
          </div>

          {/* CUSTOMER */}

          {customer && (
            <div
              style={
                customer.verificationUnavailable
                  ? styles.customerInfoCard
                  : styles.customerCard
              }
            >
              <div
                style={
                  styles.customerHeader
                }
              >
                <div
                  style={
                    customer.verificationUnavailable
                      ? styles.customerInfoIcon
                      : styles.customerCheck
                  }
                >
                  {customer.verificationUnavailable
                    ? "ℹ"
                    : "✓"}
                </div>

                <div>
                  <strong
                    style={
                      customer.verificationUnavailable
                        ? styles.customerInfoTitle
                        : styles.customerTitle
                    }
                  >
                    {customer.verificationUnavailable
                      ? "Ready for Subscription"
                      : "Customer Verified"}
                  </strong>

                  <span
                    style={
                      styles.customerSubtitle
                    }
                  >
                    {customer.verificationUnavailable
                      ? "Please make sure your Smart Card / IUC number is correct."
                      : "Customer details confirmed"}
                  </span>
                </div>
              </div>

              {!customer.verificationUnavailable && (
                <div
                  style={
                    styles.customerGrid
                  }
                >
                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
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
                      style={
                        styles.detailLabel
                      }
                    >
                      Smart Card / IUC
                    </span>

                    <strong>
                      {smartCardNumber}
                    </strong>
                  </div>

                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
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
              )}
            </div>
          )}

          {/* PURCHASE */}

          <div
            style={
              styles.purchaseArea
            }
          >
            <div
              style={
                styles.purchaseSummary
              }
            >
              <div>
                <span
                  style={
                    styles.summaryLabel
                  }
                >
                  You will pay
                </span>

                <strong
                  style={
                    styles.summaryAmount
                  }
                >
                  ₦
                  {formatMoney(
                    selectedPlan?.price_for_basicuser ||
                      0
                  )}
                </strong>
              </div>

              <div
                style={
                  styles.balanceMini
                }
              >
                <span>
                  Balance
                </span>

                <strong>
                  ₦
                  {formatMoney(
                    walletBalance
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handlePurchase
              }
              disabled={
                purchasing ||
                !selectedPlan ||
                (providerMode !==
                  "cheapdatahub" &&
                  !customer) ||
                (providerMode ===
                  "cheapdatahub" &&
                  !phoneNumber.trim()) ||
                Number(
                  selectedPlan?.price_for_basicuser
                ) > walletBalance
              }
              style={{
                ...styles.purchaseButton,

                ...(purchasing ||
                !selectedPlan ||
                (providerMode !==
                  "cheapdatahub" &&
                  !customer) ||
                (providerMode ===
                  "cheapdatahub" &&
                  !phoneNumber.trim()) ||
                Number(
                  selectedPlan?.price_for_basicuser
                ) > walletBalance
                  ? styles.purchaseButtonDisabled
                  : {}),
              }}
            >
              {purchasing ? (
                <>
                  <span
                    style={
                      styles.buttonSpinner
                    }
                  />
                  Processing Subscription...
                </>
              ) : (
                <>
                  Subscribe Now

                  <span
                    style={
                      styles.arrow
                    }
                  >
                    →
                  </span>
                </>
              )}
            </button>

            {selectedPlan &&
              Number(
                selectedPlan.price_for_basicuser
              ) > walletBalance && (
                <div
                  style={
                    styles.insufficient
                  }
                >
                  ⚠️ Insufficient wallet balance.
                  Please fund your wallet first.
                </div>
              )}
          </div>
        </div>

        {/* RECEIPT */}

        {receipt && (
          <div
            style={
              styles.receipt
            }
          >
            <div
              style={
                styles.receiptTop
              }
            >
              <div
                style={
                  styles.receiptSuccessIcon
                }
              >
                ✓
              </div>

              <div>
                <span
                  style={
                    styles.receiptSuccess
                  }
                >
                  Payment Successful
                </span>

                <h2
                  style={
                    styles.receiptTitle
                  }
                >
                  Cable TV Subscription
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReceipt(null)
                }
                style={
                  styles.closeButton
                }
              >
                ×
              </button>
            </div>

            <div
              style={
                styles.receiptDivider
              }
            />

            <div
              style={
                styles.receiptGrid
              }
            >
              <div>
                <span
                  style={
                    styles.detailLabel
                  }
                >
                  Provider
                </span>

                <strong>
                  {receipt.provider}
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.detailLabel
                  }
                >
                  Package
                </span>

                <strong>
                  {receipt.plan}
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.detailLabel
                  }
                >
                  Smart Card / IUC
                </span>

                <strong>
                  {receipt.smartCardNumber}
                </strong>
              </div>

              {receipt.phone && (
                <div>
                  <span
                    style={
                      styles.detailLabel
                    }
                  >
                    Phone
                  </span>

                  <strong>
                    {receipt.phone}
                  </strong>
                </div>
              )}

              <div>
                <span
                  style={
                    styles.detailLabel
                  }
                >
                  Amount
                </span>

                <strong>
                  ₦
                  {formatMoney(
                    receipt.amount
                  )}
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.detailLabel
                  }
                >
                  Duration
                </span>

                <strong>
                  {receipt.duration} days
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.detailLabel
                  }
                >
                  Provider Reference
                </span>

                <strong
                  style={
                    styles.reference
                  }
                >
                  {receipt.providerReference ||
                    "N/A"}
                </strong>
              </div>
            </div>

            <div
              style={
                styles.receiptFooter
              }
            >
              <span>
                INSTANT LOAD
              </span>

              <span>
                Cable TV subscription receipt
              </span>
            </div>
          </div>
        )}

        {/* PIN MODAL */}

        {showPinModal && (
          <div
            style={
              styles.pinOverlay
            }
          >
            <div
              style={
                styles.pinModal
              }
            >
              <button
                type="button"
                onClick={() => {
                  if (!purchasing) {
                    setShowPinModal(
                      false
                    );

                    setTransactionPin(
                      ""
                    );
                  }
                }}
                style={
                  styles.pinClose
                }
                disabled={
                  purchasing
                }
              >
                ×
              </button>

              <div
                style={
                  styles.pinIcon
                }
              >
                🔐
              </div>

              <h2
                style={
                  styles.pinTitle
                }
              >
                Confirm Subscription
              </h2>

              <p
                style={
                  styles.pinText
                }
              >
                Enter your 4-digit transaction
                PIN to complete this Cable TV
                subscription.
              </p>

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={
                  transactionPin
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setTransactionPin(
                    value
                  );
                }}
                placeholder="••••"
                style={
                  styles.pinInput
                }
                disabled={
                  purchasing
                }
              />

              <div
                style={
                  styles.pinAmount
                }
              >
                ₦
                {formatMoney(
                  selectedPlan?.price_for_basicuser ||
                    0
                )}
              </div>

              <button
                type="button"
                onClick={
                  submitCablePurchase
                }
                disabled={
                  purchasing ||
                  transactionPin.length !==
                    4
                }
                style={{
                  ...styles.pinConfirmButton,

                  ...(purchasing ||
                  transactionPin.length !==
                    4
                    ? styles.pinConfirmDisabled
                    : {}),
                }}
              >
                {purchasing ? (
                  <>
                    <span
                      style={
                        styles.buttonSpinner
                      }
                    />
                    Processing...
                  </>
                ) : (
                  "Confirm & Subscribe"
                )}
              </button>

              <p
                style={
                  styles.pinSecurity
                }
              >
                🔒 Your transaction PIN is securely
                verified before your wallet is debited.
              </p>
            </div>
          </div>
        )}

        {/* TRUST */}

        <div style={styles.trust}>
          <div
            style={
              styles.trustItem
            }
          >
            <span>🔒</span>
            <span>
              Secure payment
            </span>
          </div>

          <div
            style={
              styles.trustItem
            }
          >
            <span>⚡</span>
            <span>
              Instant processing
            </span>
          </div>

          <div
            style={
              styles.trustItem
            }
          >
            <span>✓</span>
            <span>
              Reliable service
            </span>
          </div>
        </div>

        {/* PROVIDER NOTICE */}

        <div
          style={
            styles.sandboxNotice
          }
        >
          <span>
            {providerMode ===
            "cheapdatahub"
              ? "ℹ️"
              : "🧪"}
          </span>

          <span>
            {providerMode ===
            "cheapdatahub"
              ? "Cable TV is being processed through CheapDataHub."
              : "Cable TV services are currently running in VTU Naija sandbox mode."}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f8ff 0%, #eef3ff 100%)",
    padding:
      "35px 20px 60px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  container: {
    maxWidth: "960px",
    margin: "0 auto",
  },

  loadingCard: {
    maxWidth: "420px",
    margin: "100px auto",
    background: "#fff",
    borderRadius: "24px",
    padding: "45px 30px",
    textAlign: "center",
    boxShadow:
      "0 20px 60px rgba(30,64,175,0.10)",
  },

  loadingIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    fontSize: "30px",
  },

  loadingTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "23px",
  },

  loadingText: {
    color: "#6b7280",
    margin:
      "8px 0 22px",
  },

  spinner: {
    width: "28px",
    height: "28px",
    border:
      "3px solid #dbeafe",
    borderTop:
      "3px solid #2563eb",
    borderRadius: "50%",
    margin: "0 auto",
    animation:
      "spin 1s linear infinite",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "25px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },

  brandBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding:
      "6px 11px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1px",
    marginBottom: "9px",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "34px",
    fontWeight: 800,
    letterSpacing: "-0.8px",
  },

  subtitle: {
    margin:
      "7px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  walletCard: {
    minWidth: "205px",
    background:
      "linear-gradient(135deg, #111827, #1e3a8a)",
    color: "#fff",
    borderRadius: "18px",
    padding:
      "18px 20px",
    boxShadow:
      "0 12px 30px rgba(30,58,138,0.20)",
  },

  walletTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    fontSize: "12px",
    opacity: 0.78,
    marginBottom: "8px",
  },

  walletIcon: {
    width: "25px",
    height: "25px",
    borderRadius: "8px",
    background:
      "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  walletAmount: {
    fontSize: "24px",
    letterSpacing: "-0.5px",
  },

  card: {
    background: "#fff",
    borderRadius: "24px",
    padding: "30px",
    boxShadow:
      "0 15px 50px rgba(15,23,42,0.08)",
  },

  section: {
    marginBottom: "24px",
  },

  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "9px",
  },

  selectWrapper: {
    position: "relative",
  },

  selectIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform:
      "translateY(-50%)",
    zIndex: 2,
    fontSize: "17px",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding:
      "14px 15px 14px 45px",
    border:
      "1px solid #dbe2ea",
    borderRadius: "13px",
    background: "#fff",
    color: "#111827",
    fontSize: "15px",
    outline: "none",
  },

  providerTiles: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "-10px",
    marginBottom: "25px",
  },

  providerTile: {
    border:
      "1px solid #e5e7eb",
    background: "#fff",
    color: "#4b5563",
    borderRadius: "12px",
    padding:
      "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },

  providerTileActive: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border:
      "1px solid #93c5fd",
  },

  providerTileIcon: {
    width: "25px",
    height: "25px",
    borderRadius: "8px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
  },

  providerTileIconActive: {
    background: "#dbeafe",
  },

  planCard: {
    background:
      "linear-gradient(135deg, #eff6ff, #f5f3ff)",
    border:
      "1px solid #dbeafe",
    borderRadius: "17px",
    padding: "19px",
    marginBottom: "25px",
  },

  planHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
  },

  planEyebrow: {
    display: "block",
    fontSize: "10px",
    fontWeight: 800,
    color: "#6366f1",
    letterSpacing: "1px",
    marginBottom: "5px",
  },

  planTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "21px",
  },

  planPrice: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#1d4ed8",
  },

  planDetails: {
    display: "flex",
    gap: "25px",
    marginTop: "17px",
    paddingTop: "15px",
    borderTop:
      "1px solid rgba(148,163,184,0.25)",
    flexWrap: "wrap",
  },

  planDetail: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  detailIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  detailLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: "11px",
    marginBottom: "3px",
  },

  inputRow: {
    display: "flex",
    gap: "10px",
    alignItems: "stretch",
  },

  inputWrapper: {
    flex: 1,
    position: "relative",
  },

  inputIcon: {
    position: "absolute",
    left: "15px",
    top: "50%",
    transform:
      "translateY(-50%)",
    color: "#6b7280",
    fontWeight: 800,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding:
      "14px 15px 14px 40px",
    border:
      "1px solid #dbe2ea",
    borderRadius: "13px",
    fontSize: "15px",
    outline: "none",
    color: "#111827",
  },

  verifyButton: {
    border: "none",
    borderRadius: "13px",
    padding:
      "0 23px",
    background:
      "linear-gradient(135deg, #374151, #111827)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  disabledButton: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  sandboxHint: {
    marginTop: "9px",
    color: "#6b7280",
    fontSize: "12px",
  },

  infoHint: {
    marginTop: "9px",
    padding:
      "10px 12px",
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "10px",
    color: "#1e40af",
    fontSize: "12px",
    lineHeight: 1.5,
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },

  phoneHint: {
    marginTop: "7px",
    color: "#6b7280",
    fontSize: "12px",
  },

  customerCard: {
    background: "#ecfdf5",
    border:
      "1px solid #a7f3d0",
    borderRadius: "17px",
    padding: "20px",
    marginBottom: "25px",
  },

  customerInfoCard: {
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "17px",
    padding: "20px",
    marginBottom: "25px",
  },

  customerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },

  customerCheck: {
    width: "39px",
    height: "39px",
    borderRadius: "12px",
    background: "#10b981",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "18px",
  },

  customerInfoIcon: {
    width: "39px",
    height: "39px",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "18px",
  },

  customerTitle: {
    display: "block",
    color: "#047857",
    fontSize: "15px",
  },

  customerInfoTitle: {
    display: "block",
    color: "#1d4ed8",
    fontSize: "15px",
  },

  customerSubtitle: {
    display: "block",
    color: "#6b7280",
    fontSize: "12px",
    marginTop: "2px",
  },

  customerGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
  },

  purchaseArea: {
    marginTop: "28px",
  },

  purchaseSummary: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    background: "#f9fafb",
    borderRadius: "15px",
    padding:
      "15px 17px",
    marginBottom: "12px",
  },

  summaryLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: "11px",
    marginBottom: "3px",
  },

  summaryAmount: {
    fontSize: "20px",
    color: "#111827",
  },

  balanceMini: {
    textAlign: "right",
    color: "#6b7280",
    fontSize: "11px",
  },

  purchaseButton: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "16px",
    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 10px 25px rgba(37,99,235,0.22)",
  },

  purchaseButtonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  arrow: {
    marginLeft: "10px",
    fontSize: "20px",
  },

  insufficient: {
    textAlign: "center",
    color: "#dc2626",
    fontSize: "13px",
    marginTop: "10px",
  },

  buttonSpinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border:
      "2px solid rgba(255,255,255,0.35)",
    borderTop:
      "2px solid #fff",
    borderRadius: "50%",
    marginRight: "8px",
    verticalAlign: "-2px",
  },

  receipt: {
    marginTop: "25px",
    background: "#fff",
    borderRadius: "24px",
    padding: "27px",
    boxShadow:
      "0 15px 50px rgba(15,23,42,0.08)",
    border:
      "1px solid #d1fae5",
  },

  receiptTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  receiptSuccessIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    background: "#10b981",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: 900,
  },

  receiptSuccess: {
    display: "block",
    color: "#059669",
    fontSize: "12px",
    fontWeight: 800,
  },

  receiptTitle: {
    margin:
      "3px 0 0",
    fontSize: "22px",
    color: "#111827",
  },

  closeButton: {
    marginLeft: "auto",
    width: "36px",
    height: "36px",
    border: "none",
    borderRadius: "50%",
    background: "#f3f4f6",
    color: "#4b5563",
    fontSize: "22px",
    cursor: "pointer",
  },

  receiptDivider: {
    height: "1px",
    background: "#e5e7eb",
    margin:
      "22px 0",
  },

  receiptGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "20px",
  },

  reference: {
    wordBreak: "break-all",
    fontSize: "13px",
  },

  receiptFooter: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: "10px",
    marginTop: "25px",
    paddingTop: "16px",
    borderTop:
      "1px dashed #d1d5db",
    color: "#9ca3af",
    fontSize: "11px",
  },

  // =====================================================
  // TRANSACTION PIN MODAL
  // =====================================================

  pinOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15, 23, 42, 0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 9999,
    boxSizing: "border-box",
  },

  pinModal: {
    position: "relative",
    width: "100%",
    maxWidth: "390px",
    background: "#fff",
    borderRadius: "24px",
    padding:
      "32px 25px 25px",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow:
      "0 25px 80px rgba(15,23,42,0.30)",
  },

  pinClose: {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "34px",
    height: "34px",
    border: "none",
    borderRadius: "50%",
    background: "#f3f4f6",
    color: "#4b5563",
    fontSize: "22px",
    cursor: "pointer",
  },

  pinIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg, #dbeafe, #ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: "27px",
  },

  pinTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "22px",
    fontWeight: 800,
  },

  pinText: {
    margin:
      "8px auto 20px",
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: 1.6,
    maxWidth: "300px",
  },

  pinInput: {
    width: "100%",
    boxSizing: "border-box",
    textAlign: "center",
    letterSpacing: "12px",
    fontSize: "26px",
    fontWeight: 800,
    padding: "14px 12px",
    border:
      "2px solid #dbe2ea",
    borderRadius: "14px",
    outline: "none",
    color: "#111827",
  },

  pinAmount: {
    margin:
      "17px 0",
    fontSize: "22px",
    fontWeight: 800,
    color: "#1d4ed8",
  },

  pinConfirmButton: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "15px",
    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 10px 25px rgba(37,99,235,0.22)",
  },

  pinConfirmDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  pinSecurity: {
    margin:
      "16px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  trust: {
    display: "flex",
    justifyContent: "center",
    gap: "28px",
    flexWrap: "wrap",
    marginTop: "25px",
    color: "#6b7280",
    fontSize: "12px",
  },

  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  sandboxNotice: {
    marginTop: "20px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "12px",
    padding:
      "10px 15px",
    background:
      "rgba(255,255,255,0.65)",
    borderRadius: "10px",
  },
};

export default CableTvPurchase;