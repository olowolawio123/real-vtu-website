const axios = require("axios");

const VTU_MODE =
  process.env.VTU_MODE || "sandbox";

const VTU_BASE_URL =
  VTU_MODE === "sandbox"
    ? process.env.VTU_SANDBOX_BASE_URL
    : process.env.VTU_LIVE_BASE_URL;

const VTU_API_KEY =
  process.env.VTU_API_KEY;

function getVtuHeaders() {
  if (!VTU_API_KEY) {
    throw new Error("VTU API key is missing");
  }

  return {
    Authorization: `Token ${VTU_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getCableTvPlans() {
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

async function verifyCableCustomer({
  cableName,
  smartCardNumber,
}) {
  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/cablesub/verify/`,
    {
      cablename: String(cableName),
      smart_card_number: String(smartCardNumber),
    },
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

async function purchaseCableTv({
  cableName,
  smartCardNumber,
  cablePlan,
}) {
  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

  const response = await axios.post(
    `${VTU_BASE_URL}/api/cablesub/`,
    {
      cablename: String(cableName),
      smart_card_number: String(smartCardNumber),
      cableplan: String(cablePlan),
    },
    {
      headers: getVtuHeaders(),
      timeout: 30000,
    }
  );

  return response.data;
}

module.exports = {
  getCableTvPlans,
  verifyCableCustomer,
  purchaseCableTv,
};