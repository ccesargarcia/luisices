/**
 * Motor de Precificação Unificado para IA e Ateliê - Luisices
 *
 * Módulo de cálculo puro utilizado para garantir paridade centavo a centavo
 * entre a calculadora do frontend e o copiloto de IA do backend.
 */

const DEFAULT_PRICING_SETTINGS = {
  desiredSalary: 3000,
  workingDaysPerMonth: 20,
  workingHoursPerDay: 6,
  monthlyFixedExpenses: {
    rent: 0,
    electricity: 120,
    internet: 100,
    meiTax: 75,
    softwareSubscriptions: 45,
    otherFixedExpenses: 50,
  },
  defaultWasteMarginPercent: 10,
  defaultPaymentFeePercent: 4.5,
  defaultProfitMarginPercent: 50,
};

/**
 * Calcula a taxa horária e minuto de operação do ateliê
 */
function calculateHourlyRate(settings = {}) {
  const desiredSalary = settings.desiredSalary !== undefined && settings.desiredSalary !== null && !isNaN(Number(settings.desiredSalary))
    ? Math.max(0, Number(settings.desiredSalary))
    : DEFAULT_PRICING_SETTINGS.desiredSalary;

  const days = settings.workingDaysPerMonth !== undefined && settings.workingDaysPerMonth !== null && !isNaN(Number(settings.workingDaysPerMonth))
    ? Math.max(0, Number(settings.workingDaysPerMonth))
    : DEFAULT_PRICING_SETTINGS.workingDaysPerMonth;

  const hoursPerDay = settings.workingHoursPerDay !== undefined && settings.workingHoursPerDay !== null && !isNaN(Number(settings.workingHoursPerDay))
    ? Math.max(0, Number(settings.workingHoursPerDay))
    : DEFAULT_PRICING_SETTINGS.workingHoursPerDay;

  const monthlyHours = Math.max(1, days * hoursPerDay);

  const fixed = settings.monthlyFixedExpenses || DEFAULT_PRICING_SETTINGS.monthlyFixedExpenses;
  const totalFixedExpenses =
    (Number(fixed.rent) || 0) +
    (Number(fixed.electricity) || 0) +
    (Number(fixed.internet) || 0) +
    (Number(fixed.meiTax) || 0) +
    (Number(fixed.softwareSubscriptions) || 0) +
    (Number(fixed.otherFixedExpenses) || 0);

  const salaryPerHour = desiredSalary / monthlyHours;
  const fixedCostPerHour = totalFixedExpenses / monthlyHours;
  const hourlyRate = salaryPerHour + fixedCostPerHour;
  const minuteRate = hourlyRate / 60;

  return {
    monthlyHours,
    totalFixedExpenses,
    salaryPerHour,
    fixedCostPerHour,
    hourlyRate,
    minuteRate,
  };
}

/**
 * Calcula a precificação de uma receita/item com base em materiais, rendimento,
 * tempo de produção, setup, perda, taxas e margem de lucro.
 */
function calculateRecipePricing(params = {}) {
  const {
    items = [],
    wasteMarginPercent = params.settings?.defaultWasteMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultWasteMarginPercent,
    laborMode = 'time',
    productionTimeMinutes = 20,
    setupTimeMinutes = 0,
    proportionalPercent = 100,
    paymentFeePercent = params.settings?.defaultPaymentFeePercent ?? DEFAULT_PRICING_SETTINGS.defaultPaymentFeePercent,
    profitMarginPercent = params.settings?.defaultProfitMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultProfitMarginPercent,
    pricingMethod = 'margin_on_sale',
    settings = {},
    manualUnitPrice,
  } = params;

  // Validação estrita de números
  const safeWastePercent = Math.max(0, Number(wasteMarginPercent) || 0);
  const safeFeePercent = Math.max(0, Number(paymentFeePercent) || 0);
  const safeProfitPercent = Math.max(0, Number(profitMarginPercent) || 0);
  const safeSetupMinutes = Math.max(0, Number(setupTimeMinutes) || 0);
  const safeProdMinutes = Math.max(0, Number(productionTimeMinutes) || 0);
  const totalLaborMinutes = safeSetupMinutes + safeProdMinutes;

  const rates = calculateHourlyRate(settings);

  // 1. Custo dos materiais diretos (com rendimento de folha se configurado)
  const materialsCost = items.reduce((acc, item) => {
    let cost = 0;
    if (item.piecesPerSheet && item.piecesPerSheet > 0 && item.useSheetRounding) {
      const sheetsNeeded = Math.ceil(1 / item.piecesPerSheet);
      cost = (Number(item.unitCost) || 0) * sheetsNeeded;
    } else {
      cost = Number(item.totalCost) !== undefined && !isNaN(Number(item.totalCost)) && item.totalCost !== null
        ? Number(item.totalCost)
        : (Number(item.unitCost) || 0) * (Number(item.quantityUsed) || 0);
    }
    return acc + Math.max(0, cost);
  }, 0);

  // Perda de materiais
  const wasteAmount = materialsCost * (safeWastePercent / 100);
  const materialsCostWithWaste = materialsCost + wasteAmount;

  // 2. Mão de obra
  const setupCost = safeSetupMinutes * rates.minuteRate;
  let unitLaborCost = 0;
  let laborCost = 0;
  let equivalentMinutesCovered = 0;

  if (laborMode === 'time') {
    unitLaborCost = safeProdMinutes * rates.minuteRate;
    laborCost = unitLaborCost + setupCost;
    equivalentMinutesCovered = totalLaborMinutes;
  } else {
    laborCost = materialsCost * (Math.max(0, Number(proportionalPercent) || 0) / 100);
    equivalentMinutesCovered = rates.minuteRate > 0 ? Math.round(laborCost / rates.minuteRate) : 0;
  }

  // Rateio de custos fixos
  const fixedCostsShare = laborMode === 'time'
    ? totalLaborMinutes * (rates.fixedCostPerHour / 60)
    : laborCost * (rates.fixedCostPerHour / (rates.hourlyRate || 1));

  // 3. Custo Base Unitário
  const totalUnitCost = materialsCostWithWaste + laborCost;

  // 4. Ponto de equilíbrio
  const feeDecimal = safeFeePercent / 100;
  const breakevenPrice = feeDecimal < 0.99 ? totalUnitCost / (1 - feeDecimal) : totalUnitCost;

  // 5. Preço Sugerido
  let suggestedUnitPrice = 0;
  if (pricingMethod === 'markup_on_cost') {
    const costWithMarkup = totalUnitCost * (1 + safeProfitPercent / 100);
    suggestedUnitPrice = feeDecimal < 0.99 ? costWithMarkup / (1 - feeDecimal) : costWithMarkup;
  } else {
    const totalDeductionsPercent = safeFeePercent + safeProfitPercent;
    const rawDivisor = 1 - totalDeductionsPercent / 100;
    const safeDivisor = Math.max(0.02, rawDivisor);
    suggestedUnitPrice = totalUnitCost / safeDivisor;
  }

  const effectivePrice = manualUnitPrice !== undefined && manualUnitPrice !== null && Number(manualUnitPrice) > 0
    ? Number(manualUnitPrice)
    : suggestedUnitPrice;

  const paymentFeeAmount = effectivePrice * feeDecimal;
  const netProfitAmount = effectivePrice - totalUnitCost - paymentFeeAmount;
  const netProfitPercent = effectivePrice > 0 ? (netProfitAmount / effectivePrice) * 100 : 0;
  const markupMultiplier = totalUnitCost > 0 ? effectivePrice / totalUnitCost : 0;

  const maxDiscountPercent = suggestedUnitPrice > breakevenPrice && suggestedUnitPrice > 0
    ? Math.max(0, ((suggestedUnitPrice - breakevenPrice) / suggestedUnitPrice) * 100)
    : 0;

  // 6. Tiers de lote
  const quantities = [1, 10, 20, 30, 50, 100];
  const batchTiers = quantities.map((qty) => {
    let batchUnitLabor = 0;
    if (laborMode === 'time') {
      const setupPerUnit = safeSetupMinutes / qty;
      const seriesEfficiency = qty === 1 ? 1 : Math.max(0.8, 1 - (Math.log10(qty) * 0.1));
      const assemblyMinutesPerUnit = safeProdMinutes * seriesEfficiency;
      batchUnitLabor = (setupPerUnit + assemblyMinutesPerUnit) * rates.minuteRate;
    } else {
      const scaleDiscount = qty === 1 ? 0 : Math.min(25, (qty / 100) * 25);
      batchUnitLabor = laborCost * (1 - scaleDiscount / 100);
    }

    let batchMaterialCostUnit = 0;
    items.forEach((item) => {
      if (item.piecesPerSheet && item.piecesPerSheet > 0 && item.useSheetRounding) {
        const sheetsNeeded = Math.ceil(qty / item.piecesPerSheet);
        const itemBatchUnitCost = ((Number(item.unitCost) || 0) * sheetsNeeded) / qty;
        batchMaterialCostUnit += itemBatchUnitCost;
      } else {
        const unitItemCost = Number(item.totalCost) !== undefined && !isNaN(Number(item.totalCost)) && item.totalCost !== null
          ? Number(item.totalCost)
          : (Number(item.unitCost) || 0) * (Number(item.quantityUsed) || 0);
        batchMaterialCostUnit += unitItemCost;
      }
    });

    const batchMaterialWithWaste = batchMaterialCostUnit * (1 + safeWastePercent / 100);
    const batchUnitCost = batchMaterialWithWaste + batchUnitLabor;

    let batchUnitPrice = 0;
    if (pricingMethod === 'markup_on_cost') {
      const costWithMarkup = batchUnitCost * (1 + safeProfitPercent / 100);
      batchUnitPrice = feeDecimal < 0.99 ? costWithMarkup / (1 - feeDecimal) : costWithMarkup;
    } else {
      const totalDeductionsPercent = safeFeePercent + safeProfitPercent;
      const safeDivisor = Math.max(0.02, 1 - totalDeductionsPercent / 100);
      batchUnitPrice = batchUnitCost / safeDivisor;
    }

    const roundedUnitPrice = Math.round(batchUnitPrice * 100) / 100;
    const batchTotalPrice = Math.round(roundedUnitPrice * qty * 100) / 100;
    const batchTotalCost = Math.round(batchUnitCost * qty * 100) / 100;
    const batchTotalFees = Math.round(batchTotalPrice * feeDecimal * 100) / 100;
    const batchTotalProfit = Math.round((batchTotalPrice - batchTotalCost - batchTotalFees) * 100) / 100;

    return {
      quantity: qty,
      scaleDiscountPercent: qty === 1 ? 0 : Math.max(0, Math.round((1 - (roundedUnitPrice / suggestedUnitPrice)) * 100)),
      unitCost: Math.round(batchUnitCost * 100) / 100,
      unitPrice: roundedUnitPrice,
      totalPrice: batchTotalPrice,
      totalProfit: batchTotalProfit,
    };
  });

  return {
    materialsCost: Math.round(materialsCost * 100) / 100,
    wasteMarginPercent: safeWastePercent,
    wasteAmount: Math.round(wasteAmount * 100) / 100,
    materialsCostWithWaste: Math.round(materialsCostWithWaste * 100) / 100,
    laborMode,
    productionTimeMinutes: safeProdMinutes,
    setupTimeMinutes: safeSetupMinutes,
    totalLaborMinutes,
    hourlyRateApplied: Math.round(rates.hourlyRate * 100) / 100,
    minuteRateApplied: Math.round(rates.minuteRate * 100) / 100,
    proportionalPercent: Number(proportionalPercent) || 0,
    laborCost: Math.round(laborCost * 100) / 100,
    setupCost: Math.round(setupCost * 100) / 100,
    equivalentMinutesCovered,
    fixedCostsShare: Math.round(fixedCostsShare * 100) / 100,
    totalUnitCost: Math.round(totalUnitCost * 100) / 100,
    breakevenPrice: Math.round(breakevenPrice * 100) / 100,
    pricingMethod,
    paymentFeePercent: safeFeePercent,
    paymentFeeAmount: Math.round(paymentFeeAmount * 100) / 100,
    profitMarginPercent: safeProfitPercent,
    suggestedUnitPrice: Math.round(suggestedUnitPrice * 100) / 100,
    effectivePrice: Math.round(effectivePrice * 100) / 100,
    netProfitAmount: Math.round(netProfitAmount * 100) / 100,
    netProfitPercent: Math.round(netProfitPercent * 10) / 10,
    markupMultiplier: Math.round(markupMultiplier * 100) / 100,
    maxDiscountPercent: Math.round(maxDiscountPercent * 10) / 10,
    batchTiers,
  };
}

module.exports = {
  DEFAULT_PRICING_SETTINGS,
  calculateHourlyRate,
  calculateRecipePricing,
};
