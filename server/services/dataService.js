const axios = require("axios");

const VTU_PROVIDER = String(
  process.env.VTU_PROVIDER || "vtunaija"
).toLowerCase();

const VTU_MODE = process.env.VTU_MODE || "sandbox";

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

function getVtuHeaders() {
  if (!VTU_API_KEY) {
    throw new Error("VTU API key is missing");
  }

  return {
    Authorization: `Token ${VTU_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function getCheapDataHubHeaders() {
  if (!CHEAPDATAHUB_API_KEY) {
    throw new Error("CheapDataHub API key is missing");
  }

  return {
    Authorization: `Bearer ${CHEAPDATAHUB_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getVtuNaijaDataPlans() {
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

/*
 * Public CheapDataHub plan catalogue.
 *
 * These IDs/prices are the public plan catalogue we have already
 * identified. Actual purchase availability remains dependent on
 * the CheapDataHub API account.
 */
const CHEAPDATAHUB_PLANS = [
  // MTN
  {
    data_plan_id: 43,
    the_network_name: "MTN",
    size: "110MB",
    the_datatype_name: "Gifting",
    validity: "1 Day",
    provider_price: 99,
  },
  {
    data_plan_id: 74,
    the_network_name: "MTN",
    size: "230MB",
    the_datatype_name: "Gifting",
    validity: "1 Day",
    provider_price: 200,
  },
  {
    data_plan_id: 76,
    the_network_name: "MTN",
    size: "500MB",
    the_datatype_name: "SME",
    validity: "2 Days",
    provider_price: 250,
  },
  {
    data_plan_id: 44,
    the_network_name: "MTN",
    size: "500MB",
    the_datatype_name: "Data Share",
    validity: "30 Days",
    provider_price: 300,
  },
  {
    data_plan_id: 77,
    the_network_name: "MTN",
    size: "1GB",
    the_datatype_name: "SME",
    validity: "2 Days",
    provider_price: 399,
  },
  {
    data_plan_id: 45,
    the_network_name: "MTN",
    size: "1GB",
    the_datatype_name: "SME",
    validity: "7 Days",
    provider_price: 450,
  },
  {
    data_plan_id: 46,
    the_network_name: "MTN",
    size: "1GB",
    the_datatype_name: "SME",
    validity: "30 Days",
    provider_price: 570,
  },
  {
    data_plan_id: 79,
    the_network_name: "MTN",
    size: "2.5GB",
    the_datatype_name: "SME",
    validity: "1 Day",
    provider_price: 600,
  },
  {
    data_plan_id: 27,
    the_network_name: "MTN",
    size: "2.5GB",
    the_datatype_name: "Gifting",
    validity: "2 Days",
    provider_price: 900,
  },
  {
    data_plan_id: 71,
    the_network_name: "MTN",
    size: "2GB",
    the_datatype_name: "Gifting",
    validity: "7 Days",
    provider_price: 900,
  },
  {
    data_plan_id: 47,
    the_network_name: "MTN",
    size: "2GB",
    the_datatype_name: "SME",
    validity: "7 Days",
    provider_price: 930,
  },
  {
    data_plan_id: 48,
    the_network_name: "MTN",
    size: "2GB",
    the_datatype_name: "SME",
    validity: "30 Days",
    provider_price: 1150,
  },
  {
    data_plan_id: 49,
    the_network_name: "MTN",
    size: "3GB",
    the_datatype_name: "SME",
    validity: "30 Days",
    provider_price: 1370,
  },
  {
    data_plan_id: 50,
    the_network_name: "MTN",
    size: "5GB",
    the_datatype_name: "SME",
    validity: "30 Days",
    provider_price: 2050,
  },
  {
    data_plan_id: 53,
    the_network_name: "MTN",
    size: "6GB",
    the_datatype_name: "Gifting",
    validity: "7 Days",
    provider_price: 2495,
  },
  {
    data_plan_id: 55,
    the_network_name: "MTN",
    size: "11GB",
    the_datatype_name: "Gifting",
    validity: "7 Days",
    provider_price: 3550,
  },
  {
    data_plan_id: 33,
    the_network_name: "MTN",
    size: "7GB",
    the_datatype_name: "Gifting",
    validity: "30 Days",
    provider_price: 3600,
  },
  {
    data_plan_id: 67,
    the_network_name: "MTN",
    size: "10GB",
    the_datatype_name: "Gifting",
    validity: "30 Days",
    provider_price: 4800,
  },
  {
    data_plan_id: 57,
    the_network_name: "MTN",
    size: "36GB",
    the_datatype_name: "Gifting",
    validity: "30 Days",
    provider_price: 10900,
  },
  {
    data_plan_id: 51,
    the_network_name: "MTN",
    size: "75GB",
    the_datatype_name: "SME",
    validity: "30 Days",
    provider_price: 17990,
  },

  // GLO
  {
    data_plan_id: 42,
    the_network_name: "GLO",
    size: "200MB",
    the_datatype_name: "Corporate Gifting",
    validity: "1 Day",
    provider_price: 92,
  },
  {
    data_plan_id: 35,
    the_network_name: "GLO",
    size: "500MB",
    the_datatype_name: "Corporate Gifting",
    validity: "30 Days",
    provider_price: 225,
  },
  {
    data_plan_id: 84,
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Awoof",
    validity: "1 Day",
    provider_price: 250,
  },
  {
    data_plan_id: 68,
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Corporate Gifting",
    validity: "3 Days",
    provider_price: 300,
  },
  {
    data_plan_id: 36,
    the_network_name: "GLO",
    size: "1GB",
    the_datatype_name: "Corporate Gifting",
    validity: "30 Days",
    provider_price: 425,
  },

  // Airtel
  {
    data_plan_id: 70,
    the_network_name: "AIRTEL",
    size: "1GB",
    the_datatype_name: "Social Bundle Gifting",
    validity: "3 Days",
    provider_price: 295,
  },
  {
    data_plan_id: 13,
    the_network_name: "AIRTEL",
    size: "500MB",
    the_datatype_name: "Gifting",
    validity: "7 Days",
    provider_price: 490,
  },
];

function getCheapDataHubDataPlans() {
  const markup = Number(
    process.env.VTU_DATA_MARKUP || 50
  );

  return {
    status: "success",
    Status: "successful",
    provider: "cheapdatahub",
    count: CHEAPDATAHUB_PLANS.length,
    dataplans: CHEAPDATAHUB_PLANS.map((plan) => ({
      ...plan,
      plan_name: `${plan.size} ${plan.the_datatype_name}`,
      price_for_basicuser: Number(plan.provider_price),
      sellingPrice:
        Number(plan.provider_price) + markup,
      profit: markup,
      provider: "cheapdatahub",
    })),
  };
}

async function getDataPlans() {
  if (VTU_PROVIDER === "cheapdatahub") {
    return getCheapDataHubDataPlans();
  }

  return getVtuNaijaDataPlans();
}

async function purchaseVtuNaijaData({
  network,
  mobileNumber,
  plan,
  requestId,
}) {
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

  return response.data;
}

async function purchaseCheapDataHubData({
  mobileNumber,
  plan,
}) {
  if (!CHEAPDATAHUB_API_KEY) {
    throw new Error("CheapDataHub API key is missing");
  }

  const response = await axios.post(
    `${CHEAPDATAHUB_BASE_URL}/data/purchase/`,
    {
      bundle_id: Number(plan),
      phone_number: mobileNumber,
    },
    {
      headers: getCheapDataHubHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

async function purchaseData({
  network,
  mobileNumber,
  plan,
  requestId,
}) {
  if (VTU_PROVIDER === "cheapdatahub") {
    return purchaseCheapDataHubData({
      mobileNumber,
      plan,
    });
  }

  return purchaseVtuNaijaData({
    network,
    mobileNumber,
    plan,
    requestId,
  });
}

module.exports = {
  getDataPlans,
  purchaseData,
};