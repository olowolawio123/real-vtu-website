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


/* =========================================================
   VTU NAIJA HEADERS
========================================================= */

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


/* =========================================================
   CHEAPDATAHUB HEADERS
========================================================= */

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


/* =========================================================
   ELECTRICITY PROVIDERS
========================================================= */

async function getElectricityPlans() {

  /*
   * CHEAPDATAHUB
   *
   * CheapDataHub uses our configured
   * disco IDs.
   */

  if (
    VTU_PROVIDER ===
    "cheapdatahub"
  ) {

    const raw =
      process.env.CHEAPDATAHUB_DISCO_IDS ||
      "{}";

    let mapping;

    try {
      mapping =
        JSON.parse(raw);
    } catch (error) {

      throw new Error(
        "CHEAPDATAHUB_DISCO_IDS contains invalid JSON"
      );
    }

    const plans =
      Object.entries(mapping).map(
        ([name, id]) => ({
          id: Number(id),
          disco_id: Number(id),
          disco_name: name,
          provider:
            "cheapdatahub",
        })
      );

    console.log(
      "CheapDataHub electricity providers:",
      plans
    );

    return {
      success: true,
      provider:
        "cheapdatahub",
      message:
        "CheapDataHub electricity providers loaded successfully.",
      data: plans,
      plans: plans,
      count: plans.length,
    };
  }


  /*
   * VTU NAIJA
   */

  if (!VTU_BASE_URL) {
    throw new Error(
      "VTU base URL is missing"
    );
  }

  const response =
    await axios.post(
      `${VTU_BASE_URL}/api/listelectricity/`,
      {},
      {
        headers:
          getVtuHeaders(),
        timeout: 30000,
      }
    );

  return response.data;
}


/* =========================================================
   ELECTRICITY METER VERIFICATION
========================================================= */

async function verifyElectricityMeter({
  discoName,
  meterNumber,
}) {

  /*
   * CHEAPDATAHUB
   *
   * CheapDataHub does not currently
   * expose a public meter verification
   * endpoint in the reseller API docs.
   */

  if (VTU_PROVIDER === "cheapdatahub") {
  return {
    success: false,
    provider: "cheapdatahub",
    verificationAvailable: false,
    verificationUnavailable: true,
    message:
      "Meter verification is not available through CheapDataHub. The meter will be validated during purchase.",
    data: {
      discoName: String(discoName),
      meterNumber: String(meterNumber),
    },
  };
} 


  /*
   * VTU NAIJA
   */

  if (!VTU_BASE_URL) {
    throw new Error(
      "VTU base URL is missing"
    );
  }

  const response =
    await axios.post(
      `${VTU_BASE_URL}/api/billpayment/verify/`,
      {
        disco_name:
          String(discoName),

        meter_number:
          String(meterNumber),
      },
      {
        headers:
          getVtuHeaders(),
        timeout: 30000,
      }
    );

  return response.data;
}


/* =========================================================
   VTU NAIJA ELECTRICITY PURCHASE
========================================================= */

async function purchaseVtuNaijaElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
}) {

  if (!VTU_BASE_URL) {
    throw new Error(
      "VTU base URL is missing"
    );
  }

  try {

    const response =
      await axios.post(
        `${VTU_BASE_URL}/api/billpayment/`,
        {
          disco_name:
            String(discoName),

          meter_number:
            String(meterNumber),

          MeterType:
            meterType ||
            "prepaid",

          amount:
            String(amount),
        },
        {
          headers:
            getVtuHeaders(),
          timeout: 30000,
        }
      );

    return response.data;

  } catch (error) {

    if (
      error.response?.data
    ) {

      console.error(
        "Electricity provider HTTP response:",
        error.response.data
      );

      return error.response.data;
    }

    throw error;
  }
}


/* =========================================================
   GET CHEAPDATAHUB DISCO ID
========================================================= */

function getCheapDataHubDiscoId(
  discoName
) {

  const raw =
    process.env.CHEAPDATAHUB_DISCO_IDS ||
    "{}";

  let mapping;

  try {

    mapping =
      JSON.parse(raw);

  } catch (error) {

    throw new Error(
      "CHEAPDATAHUB_DISCO_IDS contains invalid JSON"
    );
  }


  const key =
    String(discoName || "")
      .trim()
      .toLowerCase();


  const discoId =
    mapping[key];


  if (
    discoId === undefined ||
    discoId === null ||
    discoId === ""
  ) {

    throw new Error(
      `CheapDataHub electricity provider ID is not configured for ${discoName}`
    );
  }


  const numericId =
    Number(discoId);


  if (
    !Number.isFinite(
      numericId
    )
  ) {

    throw new Error(
      `Invalid CheapDataHub electricity provider ID for ${discoName}`
    );
  }


  return numericId;
}


/* =========================================================
   CHEAPDATAHUB ELECTRICITY PURCHASE
========================================================= */

async function purchaseCheapDataHubElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
  phone,
}) {

  if (!phone) {
    throw new Error(
      "Customer phone number is required"
    );
  }


  const discoId =
    getCheapDataHubDiscoId(
      discoName
    );


  console.log(
    "CheapDataHub electricity purchase:",
    {
      discoName,
      discoId,
      meterNumber,
      meterType,
      amount,
      phone,
    }
  );


  try {

    const response =
      await axios.post(
        `${CHEAPDATAHUB_BASE_URL}/electricity/purchase/`,
        {
          disco_id:
            discoId,

          meter_number:
            String(meterNumber),

          amount:
            Number(amount),

          meter_type:
            meterType ||
            "prepaid",

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

    if (
      error.response?.data
    ) {

      console.error(
        "CheapDataHub electricity response:",
        error.response.data
      );

      return error.response.data;
    }


    console.error(
      "CheapDataHub electricity error:",
      error.message
    );

    throw error;
  }
}


/* =========================================================
   PROVIDER-INDEPENDENT ELECTRICITY PURCHASE
========================================================= */

async function purchaseElectricity({
  discoName,
  meterNumber,
  meterType,
  amount,
  phone,
}) {

  if (
    VTU_PROVIDER ===
    "cheapdatahub"
  ) {

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


/* =========================================================
   ELECTRICITY TRANSACTION QUERY
========================================================= */

async function queryElectricityTransaction({
  transactionId,
}) {

  /*
   * CHEAPDATAHUB
   */

  if (
    VTU_PROVIDER ===
    "cheapdatahub"
  ) {

    return {
      success: false,
      provider:
        "cheapdatahub",
      message:
        "CheapDataHub electricity transaction status is handled through its transaction/webhook system.",
    };
  }


  /*
   * VTU NAIJA
   */

  if (!VTU_BASE_URL) {
    throw new Error(
      "VTU base URL is missing"
    );
  }


  if (!transactionId) {
    throw new Error(
      "VTU transaction ID is required"
    );
  }


  const response =
    await axios.get(
      `${VTU_BASE_URL}/api/queryTransaction/index.php`,
      {
        params: {
          transaction_id:
            String(
              transactionId
            ),
        },

        headers:
          getVtuHeaders(),

        timeout: 30000,
      }
    );


  return response.data;
}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getElectricityPlans,
  verifyElectricityMeter,
  purchaseElectricity,
  queryElectricityTransaction,
};