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

async function getElectricityPlans() {
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

async function purchaseElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
}) {
  if (!VTU_BASE_URL) {
    throw new Error("VTU base URL is missing");
  }

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
}

module.exports = {
  getElectricityPlans,
  verifyElectricityMeter,
  purchaseElectricity,
};