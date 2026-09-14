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

async function getElectricityPlans() {
  if (VTU_PROVIDER === "cheapdatahub") {
    return {
      success: false,
      provider: "cheapdatahub",
      message:
        "CheapDataHub electricity provider catalogue is not configured yet.",
    };
  }

  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/listelectricity/`,
    {},
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

async function verifyElectricityMeter({
  discoName,
  meterNumber,
}) {
  if (VTU_PROVIDER === "cheapdatahub") {
    return {
      success: false,
      provider: "cheapdatahub",
      message:
        "CheapDataHub meter verification endpoint is not configured yet.",
    };
  }

  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/billpayment/verify/`,
    {
      disco_name: String(discoName),
      meter_number: String(meterNumber),
    },
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

async function purchaseVtuNaijaElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
}) {
  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  try {
    const response = await axios.post(
      `${VTU_BASE_URL}/api/billpayment/`,
      {
        disco_name: String(discoName),
        meter_number: String(meterNumber),
        MeterType: meterType || "prepaid",
        amount: String(amount),
      },
      {
        headers: getVtuHeaders(),
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error) {
    if (error.response?.data) {
      console.error(
        "Electricity provider HTTP response:",
        error.response.data
      );

      return error.response.data;
    }

    throw error;
  }
}

function getCheapDataHubDiscoId(discoName) {
  const raw =
    process.env.CHEAPDATAHUB_DISCO_IDS || "{}";

  let mapping;

  try {
    mapping = JSON.parse(raw);
  } catch {
    throw new Error(
      "CHEAPDATAHUB_DISCO_IDS contains invalid JSON"
    );
  }

  const key = String(discoName || "")
    .trim()
    .toLowerCase();

  const discoId = mapping[key];

  if (!discoId) {
    throw new Error(
      `CheapDataHub electricity provider ID is not configured for ${discoName}`
    );
  }

  return Number(discoId);
}

async function purchaseCheapDataHubElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
  phone,
}) {
  const discoId = getCheapDataHubDiscoId(discoName);

  const response = await axios.post(
    `${CHEAPDATAHUB_BASE_URL}/electricity/purchase/`,
    {
      disco_id: discoId,
      meter_number: meterNumber,
      amount: Number(amount),
      meter_type: meterType || "prepaid",
      phone: phone || "",
    },
    {
      headers: getCheapDataHubHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

async function purchaseElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
  phone,
}) {
  if (VTU_PROVIDER === "cheapdatahub") {
    return purchaseCheapDataHubElectricity({
      discoName,
      meterNumber,
      meterType,
      amount,
      phone,
    });
  }

  return purchaseVtuNaijaElectricity({
    discoName,
    meterNumber,
    meterType,
    amount,
  });
}

async function queryElectricityTransaction({
  transactionId,
}) {
  if (VTU_PROVIDER === "cheapdatahub") {
    return {
      success: false,
      provider: "cheapdatahub",
      message:
        "CheapDataHub electricity transaction query is handled through transactions/webhooks.",
    };
  }

  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  if (!transactionId) {
    throw new Error(
      "VTU transaction ID is required"
    );
  }

  const response = await axios.get(
    `${VTU_BASE_URL}/api/queryTransaction/index.php`,
    {
      params: {
        transaction_id: String(transactionId),
      },
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

module.exports = {
  getElectricityPlans,
  verifyElectricityMeter,
  purchaseElectricity,
  queryElectricityTransaction,
};