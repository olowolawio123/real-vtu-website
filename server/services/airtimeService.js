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

/*
 * CheapDataHub provider IDs can be configured in .env.
 *
 * Example:
 * CHEAPDATAHUB_AIRTIME_PROVIDER_IDS={"mtn":1,"glo":2,"airtel":3,"9mobile":4}
 *
 * We do not hard-code provider IDs because they are provider-specific.
 */
function getCheapDataHubProviderId(network) {
  const raw =
    process.env.CHEAPDATAHUB_AIRTIME_PROVIDER_IDS || "{}";

  let mapping;

  try {
    mapping = JSON.parse(raw);
  } catch {
    throw new Error(
      "CHEAPDATAHUB_AIRTIME_PROVIDER_IDS contains invalid JSON"
    );
  }

  const key = String(network || "")
    .trim()
    .toLowerCase();

  const providerId = mapping[key];

  if (!providerId) {
    throw new Error(
      `CheapDataHub airtime provider ID is not configured for ${network}`
    );
  }

  return Number(providerId);
}

async function purchaseVtuNaijaAirtime({
  network,
  mobileNumber,
  amount,
  requestId,
}) {
  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/topup/`,
    {
      network: String(network),
      mobile_number: mobileNumber,
      Ported_number: "true",
      "request-id": requestId,
      amount: String(amount),
      airtime_type: "VTU",
    },
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

async function purchaseCheapDataHubAirtime({
  network,
  mobileNumber,
  amount,
}) {
  const providerId = getCheapDataHubProviderId(network);

  const payload = {
    provider_id: providerId,
    phone_number: mobileNumber,
    amount: Number(amount),
  };

  console.log("CheapDataHub airtime request:", {
    provider_id: providerId,
    phone_number: mobileNumber,
    amount: Number(amount),
  });

  try {
    const response = await axios.post(
      `${CHEAPDATAHUB_BASE_URL}/airtime/purchase/`,
      payload,
      {
        headers: getCheapDataHubHeaders(),
        timeout: 30000,
      }
    );

    console.log(
      "CheapDataHub airtime response:",
      response.data
    );

    return response.data;
  }  catch (error) {
  const providerResponse =
    error.response?.data || null;

  console.error(
    "CheapDataHub airtime HTTP error:",
    providerResponse || error.message
  );

  const wrappedError = new Error(
    providerResponse?.message ||
      error.message ||
      "CheapDataHub airtime purchase failed"
  );

  wrappedError.providerResponse =
    providerResponse;

  throw wrappedError;
}
}

async function purchaseAirtime({
  network,
  mobileNumber,
  amount,
  requestId,
}) {
  if (VTU_PROVIDER === "cheapdatahub") {
    return purchaseCheapDataHubAirtime({
      network,
      mobileNumber,
      amount,
    });
  }

  return purchaseVtuNaijaAirtime({
    network,
    mobileNumber,
    amount,
    requestId,
  });
}

module.exports = {
  purchaseAirtime,
};