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
  setupTimeMinutes: number;
  totalLaborMinutes: number;
  hourlyRateApplied: number;
  minuteRateApplied: number;
  proportionalPercent: number;
  laborCost: number;
  setupCost: number;
  equivalentMinutesCovered: number;
  fixedCostsShare: number;
  totalUnitCost: number;
  breakevenPrice: number;
  pricingMethod: 'margin_on_sale' | 'markup_on_cost';
  paymentFeePercent: number;
  paymentFeeAmount: number;
  profitMarginPercent: number;
  suggestedUnitPrice: number;
  effectivePrice: number;
  netProfitAmount: number;
  netProfitPercent: number;
  markupMultiplier: number;
  maxDiscountPercent: number;
  batchTiers: BatchTier[];
}

export interface CalculateRecipeParams {
  items: RecipeItem[];
  wasteMarginPercent?: number;
  laborMode?: 'time' | 'proportional';
  productionTimeMinutes?: number;
  setupTimeMinutes?: number;
  proportionalPercent?: number;
  paymentFeePercent?: number;
  profitMarginPercent?: number;
  pricingMethod?: 'margin_on_sale' | 'markup_on_cost';
  manualUnitPrice?: number;
  settings?: Partial<StudioPricingSettings>;
}

/**
 * Calcula a precificação detalhada de um produto de papelaria personalizada
 * com base nos insumos, rendimento de folha, tempo de setup por encomenda,
 * montagem unitária, taxas e margem real.
 */
export function calculateRecipePricing(
  params: CalculateRecipeParams
): PricingCalculationResult {
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
  } = params;

  const rates = calculateHourlyRate(settings);

  // 1. Custo dos materiais diretos (com suporte a rendimento de folhas inteiras se configurado)
  const materialsCost = items.reduce((acc, item) => {
    let cost = 0;
    if (item.piecesPerSheet && item.piecesPerSheet > 0 && item.useSheetRounding) {
      // Para 1 unidade avulsa, consome pelo menos 1 folha inteira
      const sheetsNeeded = Math.ceil(1 / item.piecesPerSheet);
      cost = (Number(item.unitCost) || 0) * sheetsNeeded;
    } else {
      cost = Number(item.totalCost) || (Number(item.unitCost) || 0) * (Number(item.quantityUsed) || 0);
    }
    return acc + cost;
  }, 0);

  // Perda de materiais (margem de erro de corte/impressão)
  const wasteAmount = materialsCost * (wasteMarginPercent / 100);
  const materialsCostWithWaste = materialsCost + wasteAmount;

  // 2. Custo de mão de obra (Setup da encomenda + Produção por peça)
  const setupMinutesNum = Number(setupTimeMinutes) || 0;
  const prodMinutesNum = Number(productionTimeMinutes) || 0;
  const totalLaborMinutes = setupMinutesNum + prodMinutesNum;

  const setupCost = setupMinutesNum * rates.minuteRate;
  let unitLaborCost = 0;
  let laborCost = 0;
  let equivalentMinutesCovered = 0;

  if (laborMode === 'time') {
    unitLaborCost = prodMinutesNum * rates.minuteRate;
    laborCost = unitLaborCost + setupCost;
    equivalentMinutesCovered = totalLaborMinutes;
  } else {
    laborCost = materialsCost * (Number(proportionalPercent) / 100);
    equivalentMinutesCovered = rates.minuteRate > 0 ? Math.round(laborCost / rates.minuteRate) : 0;
  }

  // Rateio de custos fixos embutidos
  const fixedCostsShare = laborMode === 'time'
    ? totalLaborMinutes * (rates.fixedCostPerHour / 60)
    : laborCost * (rates.fixedCostPerHour / (rates.hourlyRate || 1));

  // 3. Custo Base Unitário (CPV)
  const totalUnitCost = materialsCostWithWaste + laborCost;

  // 4. Preço de Ponto de Equilíbrio (Custo Total + Taxas de Venda, Lucro Zero)
  const feeDecimal = paymentFeePercent / 100;
  const breakevenPrice = feeDecimal < 0.99 ? totalUnitCost / (1 - feeDecimal) : totalUnitCost;

  // 5. Formação do Preço Sugerido
  let suggestedUnitPrice = 0;

  if (pricingMethod === 'markup_on_cost') {
    // Markup multiplicador sobre o custo: Custo * (1 + Margem) / (1 - Taxa)
    const costWithMarkup = totalUnitCost * (1 + profitMarginPercent / 100);
    suggestedUnitPrice = feeDecimal < 0.99 ? costWithMarkup / (1 - feeDecimal) : costWithMarkup;
  } else {
    // Margem sobre a Venda (Divisor): Preço = Custo / (1 - (Taxas + Margem))
    const totalDeductionsPercent = paymentFeePercent + profitMarginPercent;
    const rawDivisor = 1 - totalDeductionsPercent / 100;

    // Garantir monotonicidade estrita: se as deduções somadas atingirem >= 98%,
    // limitar o divisor a 0.02 para que pedir mais margem NUNCA diminua o preço sugerido.
    const safeDivisor = Math.max(0.02, rawDivisor);
    suggestedUnitPrice = totalUnitCost / safeDivisor;
  }

  const effectivePrice = params.manualUnitPrice && params.manualUnitPrice > 0
    ? params.manualUnitPrice
    : suggestedUnitPrice;

  const paymentFeeAmount = effectivePrice * feeDecimal;
  // Lucro líquido real (pode ser negativo em caso de preço abaixo do custo/taxas)
  const netProfitAmount = effectivePrice - totalUnitCost - paymentFeeAmount;
  const netProfitPercent = effectivePrice > 0 ? (netProfitAmount / effectivePrice) * 100 : 0;
  const markupMultiplier = totalUnitCost > 0 ? effectivePrice / totalUnitCost : 0;

  // Desconto comercial máximo que pode ser concedido sem gerar prejuízo
  const maxDiscountPercent = suggestedUnitPrice > breakevenPrice && suggestedUnitPrice > 0
    ? Math.max(0, ((suggestedUnitPrice - breakevenPrice) / suggestedUnitPrice) * 100)
    : 0;

  // 6. Simulador de Lotes (Economia de escala real por diluição de setup e tiragem)
  const quantities = [1, 10, 20, 30, 50, 100];

  const batchTiers: BatchTier[] = quantities.map((qty) => {
    // Diluição do setup entre as unidades do lote + curva de aprendizado na montagem
    let batchUnitLabor = 0;
    if (laborMode === 'time') {
      const setupPerUnit = setupMinutesNum / qty;
      // Ganho de agilidade na produção em série (até 20% de redução na montagem repetitiva a partir de 20 un)
      const seriesEfficiency = qty === 1 ? 1 : Math.max(0.8, 1 - (Math.log10(qty) * 0.1));
      const assemblyMinutesPerUnit = prodMinutesNum * seriesEfficiency;
      batchUnitLabor = (setupPerUnit + assemblyMinutesPerUnit) * rates.minuteRate;
    } else {
      const scaleDiscount = qty === 1 ? 0 : Math.min(25, (qty / 100) * 25);
      batchUnitLabor = laborCost * (1 - scaleDiscount / 100);
    }

    // Rendimento real de materiais no lote
    let batchMaterialCostUnit = 0;
    items.forEach((item) => {
      if (item.piecesPerSheet && item.piecesPerSheet > 0 && item.useSheetRounding) {
        const sheetsNeeded = Math.ceil(qty / item.piecesPerSheet);
        const itemBatchUnitCost = ((Number(item.unitCost) || 0) * sheetsNeeded) / qty;
        batchMaterialCostUnit += itemBatchUnitCost;
      } else {
        const unitItemCost = Number(item.totalCost) || (Number(item.unitCost) || 0) * (Number(item.quantityUsed) || 0);
        batchMaterialCostUnit += unitItemCost;
      }
    });

    const batchMaterialWithWaste = batchMaterialCostUnit * (1 + wasteMarginPercent / 100);
    const batchUnitCost = batchMaterialWithWaste + batchUnitLabor;

    let batchUnitPrice = 0;
    if (pricingMethod === 'markup_on_cost') {
      const costWithMarkup = batchUnitCost * (1 + profitMarginPercent / 100);
      batchUnitPrice = feeDecimal < 0.99 ? costWithMarkup / (1 - feeDecimal) : costWithMarkup;
    } else {
      const totalDeductionsPercent = paymentFeePercent + profitMarginPercent;
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
      scaleDiscountPercent: qty === 1 || suggestedUnitPrice <= 0 ? 0 : Math.max(0, Math.round((1 - (roundedUnitPrice / suggestedUnitPrice)) * 100)),
      unitCost: Math.round(batchUnitCost * 100) / 100,
      unitPrice: roundedUnitPrice,
      totalPrice: batchTotalPrice,
      totalProfit: batchTotalProfit,
    };
  });

  return {
    materialsCost: Math.round(materialsCost * 100) / 100,
    wasteMarginPercent,
    wasteAmount: Math.round(wasteAmount * 100) / 100,
    materialsCostWithWaste: Math.round(materialsCostWithWaste * 100) / 100,
    laborMode,
    productionTimeMinutes: prodMinutesNum,
    setupTimeMinutes: setupMinutesNum,
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
    paymentFeePercent,
    paymentFeeAmount: Math.round(paymentFeeAmount * 100) / 100,
    profitMarginPercent,
    suggestedUnitPrice: Math.round(suggestedUnitPrice * 100) / 100,
    effectivePrice: Math.round(effectivePrice * 100) / 100,
    netProfitAmount: Math.round(netProfitAmount * 100) / 100,
    netProfitPercent: Math.round(netProfitPercent * 10) / 10,
    markupMultiplier: Math.round(markupMultiplier * 100) / 100,
    maxDiscountPercent: Math.round(maxDiscountPercent * 10) / 10,
    batchTiers,
  };
}
