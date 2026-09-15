const axios = require("axios");

const VTU_PROVIDER = String(
  process.env.VTU_PROVIDER || "vtunaija"
).toLowerCase();

const VTU_MODE =
  process.env.VTU_MODE || "sandbox";

const VTU_BASE_URL =
  VTU_MODE === "sandbox"
    ? process.env.VTU_SANDBOX_BASE_URL
    : process.env.VTU_LIVE_BASE_URL;

const VTU_API_KEY =
  process.env.VTU_API_KEY;

const CHEAPDATAHUB_BASE_URL =
  process.env.CHEAPDATAHUB_BASE_URL ||
  "https://www.cheapdatahub.ng/api/v1/resellers";

const CHEAPDATAHUB_API_KEY =
  process.env.CHEAPDATAHUB_API_KEY;

// =====================================================
// MARKUP
// =====================================================

const CHEAPDATAHUB_CABLE_MARKUP = Number(
  process.env.CHEAPDATAHUB_CABLE_MARKUP || 50
);

// =====================================================
// VTU HEADERS
// =====================================================

function getVtuHeaders() {
  if (!VTU_API_KEY) {
    throw new Error(
      "VTU API key is missing"
    );
  }

  return {
    Authorization: `Token ${VTU_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// =====================================================
// CHEAPDATAHUB HEADERS
// =====================================================

function getCheapDataHubHeaders() {
  if (!CHEAPDATAHUB_API_KEY) {
    throw new Error(
      "CheapDataHub API key is missing"
    );
  }

  return {
    Authorization: `Bearer ${CHEAPDATAHUB_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// =====================================================
// CHEAPDATAHUB CABLE PLANS
// =====================================================

const CHEAPDATAHUB_CABLE_PLANS = [
  // ===================================================
  // DSTV
  // ===================================================

  {
    plan_id: 8,
    cable: "DSTV",
    plan_name: "Compact",
    price: 19000,
    duration: 30,
  },

  {
    plan_id: 9,
    cable: "DSTV",
    plan_name: "Compact Plus",
    price: 30000,
    duration: 30,
  },

  {
    plan_id: 7,
    cable: "DSTV",
    plan_name: "Confam",
    price: 11000,
    duration: 30,
  },

  {
    plan_id: 3,
    cable: "DSTV",
    plan_name: "Padi",
    price: 4400,
    duration: 30,
  },

  {
    plan_id: 10,
    cable: "DSTV",
    plan_name: "Premium",
    price: 44500,
    duration: 30,
  },

  {
    plan_id: 6,
    cable: "DSTV",
    plan_name: "Yanga",
    price: 6000,
    duration: 30,
  },

  // ===================================================
  // GOTV
  // ===================================================

  {
    plan_id: 11,
    cable: "GOTV",
    plan_name: "Jinja",
    price: 3900,
    duration: 30,
  },

  {
    plan_id: 12,
    cable: "GOTV",
    plan_name: "Jolli",
    price: 5800,
    duration: 30,
  },

  {
    plan_id: 13,
    cable: "GOTV",
    plan_name: "Max",
    price: 8500,
    duration: 30,
  },

  {
    plan_id: 4,
    cable: "GOTV",
    plan_name: "Smallie Monthly",
    price: 1900,
    duration: 30,
  },

  {
    plan_id: 14,
    cable: "GOTV",
    plan_name: "Supa",
    price: 11400,
    duration: 30,
  },

  {
    plan_id: 15,
    cable: "GOTV",
    plan_name: "Supa Plus",
    price: 16800,
    duration: 30,
  },

  // ===================================================
  // STARTIMES
  // ===================================================

  {
    plan_id: 18,
    cable: "STARTIMES",
    plan_name: "Basic Antenna - 1 Week",
    price: 1400,
    duration: 7,
  },

  {
    plan_id: 20,
    cable: "STARTIMES",
    plan_name: "Basic Antenna - 1 Month",
    price: 4000,
    duration: 30,
  },

  {
    plan_id: 19,
    cable: "STARTIMES",
    plan_name: "Basic Dish - 1 Week",
    price: 1700,
    duration: 7,
  },

  {
    plan_id: 21,
    cable: "STARTIMES",
    plan_name: "Basic Dish - 1 Month",
    price: 5100,
    duration: 30,
  },

  {
    plan_id: 22,
    cable: "STARTIMES",
    plan_name: "Classic Dish - 1 Week",
    price: 2500,
    duration: 7,
  },

  {
    plan_id: 23,
    cable: "STARTIMES",
    plan_name: "Classic Dish - 1 Month",
    price: 7400,
    duration: 30,
  },

  {
    plan_id: 17,
    cable: "STARTIMES",
    plan_name: "Nova Antenna - 1 Month",
    price: 2100,
    duration: 30,
  },

  {
    plan_id: 5,
    cable: "STARTIMES",
    plan_name: "Nova Antenna - 1 Week",
    price: 700,
    duration: 7,
  },

  {
    plan_id: 16,
    cable: "STARTIMES",
    plan_name: "Nova Dish - 1 Week",
    price: 700,
    duration: 7,
  },

  {
    plan_id: 25,
    cable: "STARTIMES",
    plan_name: "Super Antenna - 1 Week",
    price: 3200,
    duration: 7,
  },

  {
    plan_id: 26,
    cable: "STARTIMES",
    plan_name: "Super Antenna - 1 Month",
    price: 9500,
    duration: 30,
  },

  {
    plan_id: 24,
    cable: "STARTIMES",
    plan_name: "Super Dish - 1 Week",
    price: 3300,
    duration: 7,
  },
];

// =====================================================
// NORMALIZE CHEAPDATAHUB PLANS
// =====================================================

function normalizeCheapDataHubCablePlans() {
  return CHEAPDATAHUB_CABLE_PLANS.map(
    (plan) => {
      const providerPrice =
        Number(plan.price);

      const sellingPrice =
        providerPrice +
        CHEAPDATAHUB_CABLE_MARKUP;

      return {
        cabletv_plan_id:
          String(plan.plan_id),

        plan_id:
          Number(plan.plan_id),

        the_cabletv_name:
          plan.cable,

        size:
          plan.plan_name,

        plan_name:
          plan.plan_name,

        duration:
          plan.duration,

        provider_price:
          providerPrice,

        price_for_basicuser:
          sellingPrice,

        sellingPrice:
          sellingPrice,

        commission:
          CHEAPDATAHUB_CABLE_MARKUP,

        provider:
          "cheapdatahub",
      };
    }
  );
}

// =====================================================
// GET CABLE PLANS
// =====================================================

async function getCableTvPlans() {
  if (VTU_PROVIDER === "cheapdatahub") {
    const normalizedPlans = CHEAPDATAHUB_CABLE_PLANS.map((plan) => ({
      cabletv_plan_id: String(plan.plan_id),
      plan_id: String(plan.plan_id),

      the_cabletv_name: plan.cable,

      size: plan.plan_name,
      plan_name: plan.plan_name,

      price_for_basicuser:
        Number(plan.price) + 50,

      provider_price:
        Number(plan.price),

      duration:
        plan.duration || 30,

      provider: "cheapdatahub",
    }));

    return {
      success: true,
      provider: "cheapdatahub",

      data: {
        dataplans: normalizedPlans,
      },
    };
  }

  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/listcabletvplans/`,
    {},
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

// =====================================================
// VERIFY CUSTOMER
// =====================================================

async function verifyCableCustomer({
  cableName,
  smartCardNumber,
}) {
  if (
    VTU_PROVIDER ===
    "cheapdatahub"
  ) {
    return {
      success: true,

      provider:
        "cheapdatahub",

      verificationAvailable:
        false,

      message:
        "CheapDataHub does not currently provide cable customer verification. Please confirm the smart card number before purchasing.",
    };
  }

  if (!VTU_BASE_URL) {
    throw new Error(
      "VTU base URL is missing"
    );
  }

  const response =
    await axios.post(
      `${VTU_BASE_URL}/api/cablesub/verify/`,
      {
        cablename:
          String(cableName),

        smartcard_number:
          String(
            smartCardNumber
          ),
      },
      {
        headers:
          getVtuHeaders(),

        timeout: 30000,
      }
    );

  return response.data;
}

// =====================================================
// VTU NAIJA PURCHASE
// =====================================================

async function purchaseVtuNaijaCableTv({
  cableName,
  smartCardNumber,
  cablePlan,
}) {
  if (!VTU_BASE_URL) {
    throw new Error(
      "VTU base URL is missing"
    );
  }

  try {
    const response =
      await axios.post(
        `${VTU_BASE_URL}/api/cablesub/`,
        {
          cablename:
            String(cableName),

          smartcard_number:
            String(
              smartCardNumber
            ),

          cableplan:
            String(cablePlan),
        },
        {
          headers:
            getVtuHeaders(),

          timeout: 30000,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "VTU Naija cable response:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

// =====================================================
// CHEAPDATAHUB PURCHASE
// =====================================================

async function purchaseCheapDataHubCableTv({
  smartCardNumber,
  cablePlan,
  phone,
}) {
  if (!phone) {
    throw new Error(
      "Customer phone number is required"
    );
  }

  try {
    const response =
      await axios.post(
        `${CHEAPDATAHUB_BASE_URL}/cable/purchase/`,
        {
          plan_id:
            Number(cablePlan),

          cardnumber:
            String(
              smartCardNumber
            ),

          phone:
            String(phone),
        },
        {
          headers:
            getCheapDataHubHeaders(),

          timeout: 30000,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "CheapDataHub cable response:",
      error.response?.data ||
        error.message
    );

    // IMPORTANT:
    // Do not return provider errors as
    // successful-looking responses.
    throw error;
  }
}

// =====================================================
// PURCHASE CABLE
// =====================================================

async function purchaseCableTv({
  cableName,
  smartCardNumber,
  cablePlan,
  phone,
}) {
  if (
    VTU_PROVIDER ===
    "cheapdatahub"
  ) {
    return purchaseCheapDataHubCableTv({
      smartCardNumber,
      cablePlan,
      phone,
    });
  }

  return purchaseVtuNaijaCableTv({
    cableName,
    smartCardNumber,
    cablePlan,
  });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getCableTvPlans,
  verifyCableCustomer,
  purchaseCableTv,
};