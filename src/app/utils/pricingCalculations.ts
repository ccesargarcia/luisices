import {
  StudioPricingSettings,
  RecipeItem,
  BatchTier,
} from '../types';

export const DEFAULT_PRICING_SETTINGS: Omit<StudioPricingSettings, 'userId'> = {
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

export interface HourlyRateBreakdown {
  monthlyHours: number;
  totalFixedExpenses: number;
  salaryPerHour: number;
  fixedCostPerHour: number;
  hourlyRate: number;
  minuteRate: number;
}

/**
 * Calcula o valor da hora e do minuto de operação do ateliê
 */
export function calculateHourlyRate(
  settings: Partial<StudioPricingSettings> = {}
): HourlyRateBreakdown {
  const desiredSalary = Number(settings.desiredSalary) || DEFAULT_PRICING_SETTINGS.desiredSalary;
  const days = Number(settings.workingDaysPerMonth) || DEFAULT_PRICING_SETTINGS.workingDaysPerMonth;
  const hoursPerDay = Number(settings.workingHoursPerDay) || DEFAULT_PRICING_SETTINGS.workingHoursPerDay;

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

export interface PricingCalculationResult {
  materialsCost: number;
  wasteMarginPercent: number;
  wasteAmount: number;
  materialsCostWithWaste: number;
  laborMode: 'time' | 'proportional';
  productionTimeMinutes: number;
  hourlyRateApplied: number;
  minuteRateApplied: number;
  proportionalPercent: number;
  laborCost: number;
  equivalentMinutesCovered: number;
  fixedCostsShare: number;
  totalUnitCost: number;
  paymentFeePercent: number;
  paymentFeeAmount: number;
  profitMarginPercent: number;
  suggestedUnitPrice: number;
  netProfitAmount: number;
  netProfitPercent: number;
  markupMultiplier: number;
  batchTiers: BatchTier[];
}

export interface CalculateRecipeParams {
  items: RecipeItem[];
  wasteMarginPercent?: number;
  laborMode?: 'time' | 'proportional';
  productionTimeMinutes?: number;
  proportionalPercent?: number;
  paymentFeePercent?: number;
  profitMarginPercent?: number;
  manualUnitPrice?: number;
  settings?: Partial<StudioPricingSettings>;
}

/**
 * Calcula a precificação detalhada de um produto com base nos insumos,
 * tempo/modo de mão de obra e taxas.
 */
export function calculateRecipePricing(
  params: CalculateRecipeParams
): PricingCalculationResult {
  const {
    items = [],
    wasteMarginPercent = params.settings?.defaultWasteMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultWasteMarginPercent,
    laborMode = 'time',
    productionTimeMinutes = 20,
    proportionalPercent = 100,
    paymentFeePercent = params.settings?.defaultPaymentFeePercent ?? DEFAULT_PRICING_SETTINGS.defaultPaymentFeePercent,
    profitMarginPercent = params.settings?.defaultProfitMarginPercent ?? DEFAULT_PRICING_SETTINGS.defaultProfitMarginPercent,
    settings = {},
  } = params;

  const rates = calculateHourlyRate(settings);

  // 1. Custo dos materiais diretos
  const materialsCost = items.reduce((acc, item) => {
    const cost = Number(item.totalCost) || (Number(item.unitCost) || 0) * (Number(item.quantityUsed) || 0);
    return acc + cost;
  }, 0);

  // Perda de materiais (margem de erro de corte/impressão)
  const wasteAmount = materialsCost * (wasteMarginPercent / 100);
  const materialsCostWithWaste = materialsCost + wasteAmount;

  // 2. Custo de mão de obra
  let laborCost = 0;
  let equivalentMinutesCovered = 0;

  if (laborMode === 'time') {
    laborCost = (Number(productionTimeMinutes) || 0) * rates.minuteRate;
    equivalentMinutesCovered = Number(productionTimeMinutes) || 0;
  } else {
    laborCost = materialsCost * (Number(proportionalPercent) / 100);
    equivalentMinutesCovered = rates.minuteRate > 0 ? Math.round(laborCost / rates.minuteRate) : 0;
  }

  // Rateio de custos fixos embutidos
  const fixedCostsShare = laborMode === 'time'
    ? (Number(productionTimeMinutes) || 0) * (rates.fixedCostPerHour / 60)
    : laborCost * (rates.fixedCostPerHour / (rates.hourlyRate || 1));

  // 3. Custo Base Unitário (CPV)
  const totalUnitCost = materialsCostWithWaste + laborCost;

  // 4. Formação do Preço Sugerido (Divisor de Margem sobre a Venda)
  const totalDeductionsPercent = paymentFeePercent + profitMarginPercent;
  const divisor = 1 - totalDeductionsPercent / 100;

  let suggestedUnitPrice = 0;
  if (divisor > 0.05) {
    suggestedUnitPrice = totalUnitCost / divisor;
  } else {
    // Fallback markup multiplicador se as porcentagens somadas excederem 95%
    suggestedUnitPrice = totalUnitCost * (1 + profitMarginPercent / 100);
  }

  const effectivePrice = params.manualUnitPrice && params.manualUnitPrice > 0
    ? params.manualUnitPrice
    : suggestedUnitPrice;

  const paymentFeeAmount = effectivePrice * (paymentFeePercent / 100);
  const netProfitAmount = Math.max(0, effectivePrice - totalUnitCost - paymentFeeAmount);
  const netProfitPercent = effectivePrice > 0 ? (netProfitAmount / effectivePrice) * 100 : 0;
  const markupMultiplier = totalUnitCost > 0 ? effectivePrice / totalUnitCost : 0;

  // 5. Simulador de Lotes (Economia de escala)
  const quantities = [1, 10, 20, 30, 50, 100];
  const scaleDiscounts: Record<number, number> = {
    1: 0,
    10: 15,
    20: 25,
    30: 35,
    50: 45,
    100: 50,
  };

  const batchTiers: BatchTier[] = quantities.map((qty) => {
    const scaleDiscount = scaleDiscounts[qty] ?? 30;
    // O custo de material não tem desconto (a menos que compre atacado),
    // mas o tempo de corte/montagem tem ganho de escala significativo em lote
    const batchLaborCost = laborCost * (1 - scaleDiscount / 100);
    const batchUnitCost = materialsCostWithWaste + batchLaborCost;

    let batchUnitPrice = 0;
    if (divisor > 0.05) {
      batchUnitPrice = batchUnitCost / divisor;
    } else {
      batchUnitPrice = batchUnitCost * (1 + profitMarginPercent / 100);
    }

    const batchTotalPrice = Math.round(batchUnitPrice * qty * 100) / 100;
    const batchTotalCost = batchUnitCost * qty;
    const batchTotalFees = batchTotalPrice * (paymentFeePercent / 100);
    const batchTotalProfit = Math.max(0, batchTotalPrice - batchTotalCost - batchTotalFees);

    return {
      quantity: qty,
      scaleDiscountPercent: scaleDiscount,
      unitCost: Math.round(batchUnitCost * 100) / 100,
      unitPrice: Math.round(batchUnitPrice * 100) / 100,
      totalPrice: batchTotalPrice,
      totalProfit: Math.round(batchTotalProfit * 100) / 100,
    };
  });

  return {
    materialsCost: Math.round(materialsCost * 100) / 100,
    wasteMarginPercent,
    wasteAmount: Math.round(wasteAmount * 100) / 100,
    materialsCostWithWaste: Math.round(materialsCostWithWaste * 100) / 100,
    laborMode,
    productionTimeMinutes: Number(productionTimeMinutes) || 0,
    hourlyRateApplied: Math.round(rates.hourlyRate * 100) / 100,
    minuteRateApplied: Math.round(rates.minuteRate * 100) / 100,
    proportionalPercent: Number(proportionalPercent) || 0,
    laborCost: Math.round(laborCost * 100) / 100,
    equivalentMinutesCovered,
    fixedCostsShare: Math.round(fixedCostsShare * 100) / 100,
    totalUnitCost: Math.round(totalUnitCost * 100) / 100,
    paymentFeePercent,
    paymentFeeAmount: Math.round(paymentFeeAmount * 100) / 100,
    profitMarginPercent,
    suggestedUnitPrice: Math.round(suggestedUnitPrice * 100) / 100,
    netProfitAmount: Math.round(netProfitAmount * 100) / 100,
    netProfitPercent: Math.round(netProfitPercent * 10) / 10,
    markupMultiplier: Math.round(markupMultiplier * 100) / 100,
    batchTiers,
  };
}
