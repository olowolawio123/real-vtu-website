const DATA_MARKUP = 50;
const ELECTRICITY_MARKUP = 150;

function calculateDataPrice(providerPlan) {
  const providerCost = Number(
    providerPlan.price_for_api ||
      providerPlan.price_for_reseller ||
      providerPlan.price_for_basicuser
  );

  if (!Number.isFinite(providerCost) || providerCost <= 0) {
    throw new Error("INVALID_DATA_PLAN_PRICE");
  }

  const sellingPrice = providerCost + DATA_MARKUP;
  const profit = sellingPrice - providerCost;

  return {
    providerCost,
    sellingPrice,
    profit,
  };
}

function calculateElectricityPrice(providerAmount) {
  const providerCost = Number(providerAmount);

  if (!Number.isFinite(providerCost) || providerCost <= 0) {
    throw new Error("INVALID_ELECTRICITY_AMOUNT");
  }

  const sellingPrice = providerCost + ELECTRICITY_MARKUP;
  const profit = sellingPrice - providerCost;

  return {
    providerCost,
    sellingPrice,
    profit,
  };
}

module.exports = {
  calculateDataPrice,
  calculateElectricityPrice,
};