const axios = require("axios");

const VTU_MODE = process.env.VTU_MODE || "sandbox";

const VTU_BASE_URL =
  VTU_MODE === "sandbox"
    ? process.env.VTU_SANDBOX_BASE_URL
    : process.env.VTU_LIVE_BASE_URL;

const VTU_API_KEY = process.env.VTU_API_KEY;

function getVtuHeaders() {
  if (!VTU_API_KEY) {
    throw new Error("VTU API key is missing");
  }

  return {
    Authorization: `Token ${VTU_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getDataPlans() {
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

  return response.data;
}

async function purchaseData({
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

module.exports = {
  getDataPlans,
  purchaseData,
};