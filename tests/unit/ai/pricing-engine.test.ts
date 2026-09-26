import { describe, it, expect } from 'vitest';
const nodePricing = require('../../../functions/ai/pricing/pricingCalculator');
import * as tsPricing from '../../../src/app/utils/pricingCalculations';

describe('IA-04: Paridade e Correção do Motor de Precificação (Backend & Frontend)', () => {
  const sampleSettings = {
    desiredSalary: 3500,
    workingDaysPerMonth: 22,
    workingHoursPerDay: 7,
    monthlyFixedExpenses: {
      rent: 0,
      electricity: 150,
      internet: 110,
      meiTax: 75,
      softwareSubscriptions: 55,
      otherFixedExpenses: 60,
    },
    defaultWasteMarginPercent: 12,
    defaultPaymentFeePercent: 4.99,
    defaultProfitMarginPercent: 45,
  };

  it('deve produzir exatamente a mesma taxa horária e por minuto no Node e TypeScript', () => {
    const nodeRate = nodePricing.calculateHourlyRate(sampleSettings);
    const tsRate = tsPricing.calculateHourlyRate(sampleSettings);

    expect(nodeRate.monthlyHours).toBe(tsRate.monthlyHours);
    expect(nodeRate.totalFixedExpenses).toBe(tsRate.totalFixedExpenses);
    expect(nodeRate.salaryPerHour).toBeCloseTo(tsRate.salaryPerHour, 4);
    expect(nodeRate.fixedCostPerHour).toBeCloseTo(tsRate.fixedCostPerHour, 4);
    expect(nodeRate.hourlyRate).toBeCloseTo(tsRate.hourlyRate, 4);
    expect(nodeRate.minuteRate).toBeCloseTo(tsRate.minuteRate, 4);
  });

  it('deve preservar valores zero explícitos e NÃO substituí-los por padrões (ex: R$ 15 / R$ 5 / 15 min)', () => {
    const zeroParams = {
      items: [
        {
          name: 'Brinde 100% digital',
          unit: 'unidade' as const,
          unitCost: 0,
          quantityUsed: 1,
          totalCost: 0,
        },
      ],
      wasteMarginPercent: 0,
      productionTimeMinutes: 0,
      setupTimeMinutes: 0,
      profitMarginPercent: 0,
      paymentFeePercent: 0,
      settings: sampleSettings,
    };

    const nodeResult = nodePricing.calculateRecipePricing(zeroParams);
    const tsResult = tsPricing.calculateRecipePricing(zeroParams);

    // Custos explícitos zero devem resultar em custo zero e não R$ 29,75
    expect(nodeResult.materialsCost).toBe(0);
    expect(nodeResult.wasteAmount).toBe(0);
    expect(nodeResult.laborCost).toBe(0);
    expect(nodeResult.totalUnitCost).toBe(0);
    expect(nodeResult.suggestedUnitPrice).toBe(0);

    expect(nodeResult.totalUnitCost).toBe(tsResult.totalUnitCost);
    expect(nodeResult.suggestedUnitPrice).toBe(tsResult.suggestedUnitPrice);
  });

  it('deve ter paridade exata em caso completo com setup, rendimento de folha e batch tiers', () => {
    const complexParams = {
      items: [
        {
          supplyId: 'sup-1',
          name: 'Papel Fotográfico 230g',
          unit: 'folha' as const,
          unitCost: 1.20,
          piecesPerSheet: 4,
          useSheetRounding: true,
        },
        {
          supplyId: 'sup-2',
          name: 'Laço de Cetim com Strass',
          unit: 'unidade' as const,
          unitCost: 0.85,
          quantityUsed: 1,
          totalCost: 0.85,
        },
      ],
      wasteMarginPercent: 10,
      laborMode: 'time' as const,
      setupTimeMinutes: 25,
      productionTimeMinutes: 8,
      profitMarginPercent: 50,
      paymentFeePercent: 4.5,
      settings: sampleSettings,
    };

    const nodeRes = nodePricing.calculateRecipePricing(complexParams);
    const tsRes = tsPricing.calculateRecipePricing(complexParams);

    expect(nodeRes.materialsCost).toBeCloseTo(tsRes.materialsCost, 2);
    expect(nodeRes.wasteAmount).toBeCloseTo(tsRes.wasteAmount, 2);
    expect(nodeRes.materialsCostWithWaste).toBeCloseTo(tsRes.materialsCostWithWaste, 2);
    expect(nodeRes.setupCost).toBeCloseTo(tsRes.setupCost, 2);
    expect(nodeRes.laborCost).toBeCloseTo(tsRes.laborCost, 2);
    expect(nodeRes.totalUnitCost).toBeCloseTo(tsRes.totalUnitCost, 2);
    expect(nodeRes.breakevenPrice).toBeCloseTo(tsRes.breakevenPrice, 2);
    expect(nodeRes.suggestedUnitPrice).toBeCloseTo(tsRes.suggestedUnitPrice, 2);
    expect(nodeRes.netProfitAmount).toBeCloseTo(tsRes.netProfitAmount, 2);
    expect(nodeRes.maxDiscountPercent).toBeCloseTo(tsRes.maxDiscountPercent, 1);

    expect(nodeRes.batchTiers.length).toBe(tsRes.batchTiers.length);
    for (let i = 0; i < nodeRes.batchTiers.length; i++) {
      expect(nodeRes.batchTiers[i].unitCost).toBeCloseTo(tsRes.batchTiers[i].unitCost, 2);
      expect(nodeRes.batchTiers[i].unitPrice).toBeCloseTo(tsRes.batchTiers[i].unitPrice, 2);
      expect(nodeRes.batchTiers[i].totalPrice).toBeCloseTo(tsRes.batchTiers[i].totalPrice, 2);
    }
  });

  it('deve ter paridade no método Markup on Cost', () => {
    const markupParams = {
      items: [{ name: 'Caixa', unit: 'unidade' as const, unitCost: 15, quantityUsed: 1, totalCost: 15 }],
      wasteMarginPercent: 5,
      productionTimeMinutes: 10,
      profitMarginPercent: 40,
      paymentFeePercent: 5,
      pricingMethod: 'markup_on_cost' as const,
      settings: sampleSettings,
    };

    const nodeRes = nodePricing.calculateRecipePricing(markupParams);
    const tsRes = tsPricing.calculateRecipePricing(markupParams);

    expect(nodeRes.suggestedUnitPrice).toBeCloseTo(tsRes.suggestedUnitPrice, 2);
    expect(nodeRes.netProfitAmount).toBeCloseTo(tsRes.netProfitAmount, 2);
  });
});
