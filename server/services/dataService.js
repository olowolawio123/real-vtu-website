const axios = require("axios");

const VTU_MODE = process.env.VTU_MODE || "sandbox";
const VTU_PROVIDER = (
  process.env.VTU_PROVIDER || "vtunaija"
).toLowerCase();

const VTU_BASE_URL =
  VTU_MODE === "sandbox"
    ? process.env.VTU_SANDBOX_BASE_URL
    : process.env.VTU_LIVE_BASE_URL;

const VTU_API_KEY = process.env.VTU_API_KEY;

const CHEAPDATAHUB_BASE_URL =
  process.env.CHEAPDATAHUB_BASE_URL ||
  "https://www.cheapdatahub.ng/api/v1/resellers";

const CHEAPDATAHUB_API_KEY =
  process.env.CHEAPDATAHUB_API_KEY;

const CHEAPDATAHUB_MARKUP = 50;

// ============================================================
// VTU NAIJA HEADERS
// ============================================================

function getVtuHeaders() {
  if (!VTU_API_KEY) {
    throw new Error("VTU API key is missing");
  }

  return {
    Authorization: `Token ${VTU_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ============================================================
// CHEAPDATAHUB HEADERS
// ============================================================

function getCheapDataHubHeaders() {
  if (!CHEAPDATAHUB_API_KEY) {
    throw new Error("CheapDataHub API key is missing");
  }

  return {
    Authorization: `Bearer ${CHEAPDATAHUB_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ============================================================
// CHEAPDATAHUB DATA PLAN CATALOGUE
// ============================================================
// These are the currently published CheapDataHub Plan IDs.
// 9Mobile is intentionally excluded.
// Plans marked UNAVAILABLE on CheapDataHub are excluded.
// ============================================================

const CHEAPDATAHUB_DATA_PLANS = [
  // ==========================================================
  // MTN
  // ==========================================================

  {
    data_plan_id: "43",
    the_network_name: "MTN",
    size: "110MB",
    the_datatype_name: "Gifting",
    plan_name: "110MB Gifting",
    validity: "1 Day",
    provider_price: 99,
  },

  {
    data_plan_id: "74",
    the_network_name: "MTN",
    size: "230MB",
    the_datatype_name: "Gifting",
    plan_name: "230MB Gifting",
    validity: "1 Day",
    provider_price: 200,
  },

  {
    data_plan_id: "76",
    the_network_name: "MTN",
    size: "500MB",
    the_datatype_name: "SME",
    plan_name: "500MB SME",
    validity: "2 Days",
    provider_price: 250,
  },

  {
    data_plan_id: "44",
    the_network_name: "MTN",
    size: "500MB",
    the_datatype_name: "Data Share",
    plan_name: "500MB Data Share",
    validity: "30 Days",
    provider_price: 300,
  },

  {
    data_plan_id: "77",
    the_network_name: "MTN",
    size: "1GB",
    the_datatype_name: "SME",
    plan_name: "1GB SME",
    validity: "2 Days",
    provider_price: 399,
  },

  {
    data_plan_id: "45",
    the_network_name: "MTN",
    size: "1GB",
    the_datatype_name: "SME",
    plan_name: "1GB SME",
    validity: "7 Days",
    provider_price: 450,
  },

  {
    data_plan_id: "46",
    the_network_name: "MTN",
    size: "1GB",
    the_datatype_name: "SME",
    plan_name: "1GB SME",
    validity: "30 Days",
    provider_price: 570,
  },

  {
    data_plan_id: "79",
    the_network_name: "MTN",
    size: "2.5GB",
    the_datatype_name: "SME",
    plan_name: "2.5GB SME",
    validity: "1 Day",
    provider_price: 600,
  },

  {
    data_plan_id: "27",
    the_network_name: "MTN",
    size: "2.5GB",
    the_datatype_name: "Gifting",
    plan_name: "2.5GB Gifting",
    validity: "2 Days",
    provider_price: 900,
  },

  {
    data_plan_id: "71",
    the_network_name: "MTN",
    size: "2GB",
    the_datatype_name: "Gifting",
    plan_name: "2GB Gifting",
    validity: "7 Days",
    provider_price: 900,
  },

  {
    data_plan_id: "47",
    the_network_name: "MTN",
    size: "2GB",
    the_datatype_name: "SME",
    plan_name: "2GB SME",
    validity: "7 Days",
    provider_price: 930,
  },

  {
    data_plan_id: "60",
    the_network_name: "MTN",
    size: "4.5GB",
    the_datatype_name: "Gifting",
    plan_name: "4.5GB Gifting",
    validity: "1 Day",
    provider_price: 1050,
  },

  {
    data_plan_id: "48",
    the_network_name: "MTN",
    size: "2GB",
    the_datatype_name: "SME",
    plan_name: "2GB SME",
    validity: "30 Days",
    provider_price: 1150,
  },

  {
    data_plan_id: "61",
    the_network_name: "MTN",
    size: "4GB",
    the_datatype_name: "Gifting",
    plan_name: "4GB Gifting",
    validity: "2 Days",
    provider_price: 1175,
  },

  {
    data_plan_id: "49",
    the_network_name: "MTN",
    size: "3GB",
    the_datatype_name: "SME",
    plan_name: "3GB SME",
    validity: "30 Days",
    provider_price: 1370,
  },

  {
    data_plan_id: "50",
    the_network_name: "MTN",
    size: "5GB",
    the_datatype_name: "SME",
    plan_name: "5GB SME",
    validity: "30 Days",
    provider_price: 2050,
  },

  {
    data_plan_id: "53",
    the_network_name: "MTN",
    size: "6GB",
    the_datatype_name: "Gifting",
    plan_name: "6GB Gifting",
    validity: "7 Days",
    provider_price: 2495,
  },

  {
    data_plan_id: "55",
    the_network_name: "MTN",
    size: "11GB",
    the_datatype_name: "Gifting",
    plan_name: "11GB Gifting",
    validity: "7 Days",
    provider_price: 3550,
  },

  {
    data_plan_id: "33",
    the_network_name: "MTN",
    size: "7GB",
    the_datatype_name: "Gifting",
    plan_name: "7GB Gifting",
    validity: "30 Days",
    provider_price: 3600,
  },

  {
    data_plan_id: "67",
    the_network_name: "MTN",
    size: "10GB",
    the_datatype_name: "Gifting",
    plan_name: "10GB Gifting",
    validity: "30 Days",
    provider_price: 4800,
  },

  {
    data_plan_id: "57",
    the_network_name: "MTN",
    size: "36GB",
    the_datatype_name: "Gifting",
    plan_name: "36GB Gifting",
    validity: "30 Days",
    provider_price: 10900,
  },

  {
    data_plan_id: "51",
    the_network_name: "MTN",
    size: "75GB",
    the_datatype_name: "SME",
    plan_name: "75GB SME",
    validity: "30 Days",
    provider_price: 17990,
  },

  // ==========================================================
  // GLO
  // ==========================================================

  {
    data_plan_id: "42",
    the_network_name: "GLO",
    size: "200MB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "200MB Corporate Gifting",
    validity: "1 Day",
    provider_price: 92,
  },

  {
    data_plan_id: "35",
    the_network_name: "GLO",
    size: "500MB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "500MB Corporate Gifting",
    validity: "30 Days",
    provider_price: 225,
  },

  {
    data_plan_id: "84",
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Awoof",
    plan_name: "1GB Awoof",
    validity: "1 Day",
    provider_price: 250,
  },

  {
    data_plan_id: "68",
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "1GB Corporate Gifting",
    validity: "3 Days",
    provider_price: 300,
  },

  {
    data_plan_id: "36",
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "1GB Corporate Gifting",
    validity: "30 Days",
    provider_price: 425,
  },

  {
    data_plan_id: "41",
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Gifting",
    plan_name: "1GB Gifting",
    validity: "14 Days",
    provider_price: 485,
  },

  {
    data_plan_id: "40",
    the_network_name: "GLO",
    size: "2GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "2GB Corporate Gifting",
    validity: "30 Days",
    provider_price: 850,
  },

  {
    data_plan_id: "37",
    the_network_name: "GLO",
    size: "3GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "3GB Corporate Gifting",
    validity: "30 Days",
    provider_price: 1300,
  },

  {
    data_plan_id: "54",
    the_network_name: "GLO",
    size: "5GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "5GB Corporate Gifting",
    validity: "7 Days",
    provider_price: 1699,
  },

  {
    data_plan_id: "38",
    the_network_name: "GLO",
    size: "5GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "5GB Corporate Gifting",
    validity: "30 Days",
    provider_price: 2250,
  },

  {
    data_plan_id: "39",
    the_network_name: "GLO",
    size: "10GB",
    the_datatype_name: "Corporate Gifting",
    plan_name: "10GB Corporate Gifting",
    validity: "30 Days",
    provider_price: 4390,
  },

  {
    data_plan_id: "59",
    the_network_name: "GLO",
    size: "20.5GB",
    the_datatype_name: "Gifting",
    plan_name: "20.5GB Gifting",
    validity: "30 Days",
    provider_price: 5300,
  },

  {
    data_plan_id: "58",
    the_network_name: "GLO",
    size: "107GB",
    the_datatype_name: "Gifting",
    plan_name: "107GB Gifting",
    validity: "30 Days",
    provider_price: 19300,
  },

  // ==========================================================
  // AIRTEL
  // ==========================================================

  {
    data_plan_id: "70",
    the_network_name: "AIRTEL",
    size: "1GB",
    the_datatype_name: "Social Bundle Gifting",
    plan_name: "1GB Social Bundle Gifting",
    validity: "3 Days",
    provider_price: 295,
  },

  {
    data_plan_id: "13",
    the_network_name: "AIRTEL",
    size: "500MB",
    the_datatype_name: "Gifting",
    plan_name: "500MB Gifting",
    validity: "7 Days",
    provider_price: 490,
  },

  {
    data_plan_id: "69",
    the_network_name: "AIRTEL",
    size: "1.5GB",
    the_datatype_name: "Gifting",
    plan_name: "1.5GB Gifting",
    validity: "1 Day",
    provider_price: 500,
  },

  {
    data_plan_id: "66",
    the_network_name: "AIRTEL",
    size: "1.5GB",
    the_datatype_name: "Gifting",
    plan_name: "1.5GB Gifting",
    validity: "2 Days",
    provider_price: 599,
  },

  {
    data_plan_id: "15",
    the_network_name: "AIRTEL",
    size: "1GB",
    the_datatype_name: "Gifting",
    plan_name: "1GB Gifting",
    validity: "7 Days",
    provider_price: 800,
  },

  {
    data_plan_id: "17",
    the_network_name: "AIRTEL",
    size: "2GB",
    the_datatype_name: "Gifting",
    plan_name: "2GB Gifting",
    validity: "30 Days",
    provider_price: 1490,
  },

  {
    data_plan_id: "52",
    the_network_name: "AIRTEL",
    size: "5GB",
    the_datatype_name: "Gifting",
    plan_name: "5GB Gifting",
    validity: "7 Days",
    provider_price: 1570,
  },

  {
    data_plan_id: "18",
    the_network_name: "AIRTEL",
    size: "3GB",
    the_datatype_name: "Gifting",
    plan_name: "3GB Gifting",
    validity: "30 Days",
    provider_price: 1960,
  },

  {
    data_plan_id: "22",
    the_network_name: "AIRTEL",
    size: "6GB",
    the_datatype_name: "SME",
    plan_name: "6GB SME",
    validity: "7 Days",
    provider_price: 2455,
  },

  {
    data_plan_id: "19",
    the_network_name: "AIRTEL",
    size: "4GB",
    the_datatype_name: "Gifting",
    plan_name: "4GB Gifting",
    validity: "30 Days",
    provider_price: 2570,
  },

  {
    data_plan_id: "20",
    the_network_name: "AIRTEL",
    size: "8GB",
    the_datatype_name: "Gifting",
    plan_name: "8GB Gifting",
    validity: "30 Days",
    provider_price: 2999,
  },

  {
    data_plan_id: "21",
    the_network_name: "AIRTEL",
    size: "10GB",
    the_datatype_name: "Gifting",
    plan_name: "10GB Gifting",
    validity: "30 Days",
    provider_price: 4070,
  },
];

// ============================================================
// NORMALIZE CHEAPDATAHUB DATA PLANS
// ============================================================

function getCheapDataHubDataPlans() {
  return CHEAPDATAHUB_DATA_PLANS.map((plan) => ({
    data_plan_id: String(plan.data_plan_id),

    // Keep both names because different parts of the existing
    // frontend/backend may use different field names.
    plan_id: String(plan.data_plan_id),

    the_network_name: plan.the_network_name,

    size: plan.size,

    the_datatype_name: plan.the_datatype_name,

    plan_name: plan.plan_name,

    validity: plan.validity,

    provider_price: Number(plan.provider_price),

    price_for_basicuser: Number(plan.provider_price),

    sellingPrice:
      Number(plan.provider_price) + CHEAPDATAHUB_MARKUP,

    provider: "cheapdatahub",
  }));
}

// ============================================================
// CHEAPDATAHUB DATA PURCHASE
// ============================================================

async function purchaseCheapDataHubData({
  network,
  mobileNumber,
  plan,
  requestId,
}) {
  if (!CHEAPDATAHUB_API_KEY) {
    throw new Error("CheapDataHub API key is missing");
  }

  if (!mobileNumber) {
    throw new Error("Mobile number is required");
  }

  if (!plan) {
    throw new Error("Data plan ID is required");
  }

  const planId = String(plan);
const response = await axios.post(
  `${CHEAPDATAHUB_BASE_URL}/data/purchase/`,
  {
    network: String(network).toLowerCase(),
    bundle_id: Number(planId),
    phone_number: mobileNumber,
  },
    {
      headers: getCheapDataHubHeaders(),
      timeout: 30000,
    }
  );

  console.log(
    "CHEAPDATAHUB DATA PURCHASE RESPONSE:",
    JSON.stringify(response.data, null, 2)
  );

  return response.data;
}

// ============================================================
// MAIN GET DATA PLANS
// ============================================================

async function getDataPlans() {
  // ----------------------------------------------------------
  // CHEAPDATAHUB
  // ----------------------------------------------------------

  if (VTU_PROVIDER === "cheapdatahub") {
    const plans = getCheapDataHubDataPlans();

console.log(
  "========== CHEAPDATAHUB PLAN COUNT =========="
);

console.log("TOTAL:", plans.length);

console.log(
  "MTN:",
  plans.filter(
    (p) =>
      String(p.the_network_name).toUpperCase() === "MTN"
  ).length
);

console.log(
  "GLO:",
  plans.filter(
    (p) =>
      String(p.the_network_name).toUpperCase() === "GLO"
  ).length
);

console.log(
  "AIRTEL:",
  plans.filter(
    (p) =>
      String(p.the_network_name).toUpperCase() === "AIRTEL"
  ).length
);

console.log(
  "PLAN IDS:",
  plans.map((p) => p.data_plan_id).join(", ")
);

console.log(
  "============================================"
);
    return {
      success: true,
      provider: "cheapdatahub",
      dataplans: plans,
    };
  }

  // ----------------------------------------------------------
  // VTU NAIJA
  // ----------------------------------------------------------

  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/listdataplans/`,
    {},
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  console.log(
    "VTU DATA PLANS RESPONSE:",
    JSON.stringify(response.data, null, 2)
  );

  return response.data;
}

// ============================================================
// MAIN PURCHASE DATA
// ============================================================

async function purchaseData({
  network,
  mobileNumber,
  plan,
  requestId,
}) {
  // ----------------------------------------------------------
  // CHEAPDATAHUB
  // ----------------------------------------------------------

  if (VTU_PROVIDER === "cheapdatahub") {
    return purchaseCheapDataHubData({
      network,
      mobileNumber,
      plan,
      requestId,
    });
  }

  // ----------------------------------------------------------
  // VTU NAIJA
  // ----------------------------------------------------------

  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/data/`,
    {
      network: String(network),
      mobile_number: mobileNumber,
      Ported_number: "true",
      "request-id": requestId,
      plan: String(plan),
    },
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  console.log(
    "VTU NAIJA DATA PURCHASE RESPONSE:",
    JSON.stringify(response.data, null, 2)
  );

  return response.data;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getDataPlans,
  purchaseData,
  getCheapDataHubDataPlans,
  purchaseCheapDataHubData,
};