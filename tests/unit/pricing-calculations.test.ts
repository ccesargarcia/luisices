import { describe, it, expect } from 'vitest';
import {
  calculateHourlyRate,
  calculateRecipePricing,
  DEFAULT_PRICING_SETTINGS,
} from '../../src/app/utils/pricingCalculations';
import { formatCurrency } from '../../src/app/utils/currency';

describe('Cálculos Financeiros e Precificação (pricing-calculations)', () => {
  describe('calculateHourlyRate', () => {
    it('deve calcular corretamente a taxa horária e por minuto com configurações padrão', () => {
      // 20 dias * 6 horas = 120 horas no mês
      // Salário desejado: R$ 3.000 / 120h = R$ 25,00/hora
      const rate = calculateHourlyRate(DEFAULT_PRICING_SETTINGS);

      expect(rate.monthlyHours).toBe(120);
      expect(rate.salaryPerHour).toBeCloseTo(25.0, 2);

      // Despesas fixas padrão: 0 + 120 + 100 + 75 + 45 + 50 = 390
      expect(rate.totalFixedExpenses).toBe(390);

      // Custo fixo por hora: 390 / 120 = 3.25
      expect(rate.fixedCostPerHour).toBeCloseTo(3.25, 2);

      // Taxa horária total: 25 + 3.25 = 28.25
      expect(rate.hourlyRate).toBeCloseTo(28.25, 2);

      // Taxa por minuto: 28.25 / 60 = ~0.4708
      expect(rate.minuteRate).toBeCloseTo(28.25 / 60, 4);
    });

    it('deve evitar divisão por zero se dias ou horas forem preenchidos com 0', () => {
      const rate = calculateHourlyRate({
        desiredSalary: 2000,
        workingDaysPerMonth: 0,
        workingHoursPerDay: 0,
      });

      expect(rate.monthlyHours).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(rate.hourlyRate)).toBe(true);
      expect(Number.isFinite(rate.minuteRate)).toBe(true);
    });
  });

  describe('calculateRecipePricing', () => {
    it('deve calcular custo de materiais com margem de perda embutida', () => {
      const result = calculateRecipePricing({
        items: [
          {
            supplyId: 'sup-1',
            name: 'Papel Offset 180g',
            unit: 'folha',
            quantityUsed: 2,
            unitCost: 0.50,
            totalCost: 1.00, // R$ 1,00 de materiais
          },
          {
            supplyId: 'sup-2',
            name: 'Fita de Cetim',
            unit: 'm',
            quantityUsed: 1,
            unitCost: 0.80,
            totalCost: 0.80, // R$ 0,80 de materiais
          },
        ],
        wasteMarginPercent: 10, // 10% de perda
        productionTimeMinutes: 15,
        profitMarginPercent: 50,
        paymentFeePercent: 0,
        settings: DEFAULT_PRICING_SETTINGS,
      });

      // Custo bruto: 1.00 + 0.80 = 1.80
      expect(result.materialsCost).toBeCloseTo(1.80, 2);

      // Perda de 10%: 0.18
      expect(result.wasteAmount).toBeCloseTo(0.18, 2);

      // Custo com perda: 1.80 + 0.18 = 1.98
      expect(result.materialsCostWithWaste).toBeCloseTo(1.98, 2);

      // Preço de venda sugerido deve ser estritamente maior que o custo unitário total
      expect(result.suggestedUnitPrice).toBeGreaterThan(result.totalUnitCost);
      expect(result.netProfitAmount).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency', () => {
    it('deve formatar valores numéricos no padrão monetário BRL', () => {
      const formatted = formatCurrency(24.5);
      // Deve conter "24,50" e o símbolo de R$
      expect(formatted).toContain('24,50');
      expect(formatted).toContain('R$');
    });

    it('deve formatar valores maiores com separador de milhar', () => {
      const formatted = formatCurrency(1250.75);
      expect(formatted).toContain('1.250,75');
    });
  });
});
