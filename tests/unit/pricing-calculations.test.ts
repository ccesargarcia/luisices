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

    it('deve exibir prejuízo real (valor negativo) quando o preço de venda for insuficiente', () => {
      // Cenário: custo total R$ 10, venda por R$ 8 e taxa de 5%
      // Taxa: R$ 0,40. Custo: R$ 10,00. Resultado real: 8 - 10 - 0.40 = -R$ 2,40
      const result = calculateRecipePricing({
        items: [
          {
            name: 'Item Teste',
            unit: 'unidade',
            unitCost: 10.0,
            quantityUsed: 1,
            totalCost: 10.0,
          },
        ],
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
        paymentFeePercent: 5,
        profitMarginPercent: 20,
        manualUnitPrice: 8.0, // Preço praticado com desconto excessivo
        settings: DEFAULT_PRICING_SETTINGS,
      });

      expect(result.totalUnitCost).toBe(10.0);
      expect(result.paymentFeeAmount).toBe(0.40);
      expect(result.netProfitAmount).toBeCloseTo(-2.40, 2);
      expect(result.netProfitPercent).toBeLessThan(0);
    });

    it('deve manter monotonicidade do preço mesmo em margens solicitadas altas (>90%)', () => {
      const baseParams = {
        items: [
          {
            name: 'Insumo',
            unit: 'unidade' as const,
            unitCost: 10.0,
            quantityUsed: 1,
            totalCost: 10.0,
          },
        ],
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
        paymentFeePercent: 5,
        settings: DEFAULT_PRICING_SETTINGS,
      };

      const result89 = calculateRecipePricing({
        ...baseParams,
        profitMarginPercent: 89,
      });

      const result91 = calculateRecipePricing({
        ...baseParams,
        profitMarginPercent: 91,
      });

      // Pedir 91% de margem NUNCA pode resultar em preço menor do que pedir 89%
      expect(result91.suggestedUnitPrice).toBeGreaterThanOrEqual(result89.suggestedUnitPrice);
      expect(result89.suggestedUnitPrice).toBeGreaterThan(100);
      expect(result91.suggestedUnitPrice).toBeGreaterThan(100);
    });

    it('deve diluir tempo fixo de setup da encomenda entre as unidades do lote', () => {
      const result = calculateRecipePricing({
        items: [
          {
            name: 'Papel',
            unit: 'folha',
            unitCost: 0.50,
            quantityUsed: 1,
            totalCost: 0.50,
          },
        ],
        wasteMarginPercent: 0,
        setupTimeMinutes: 30, // 30 min de arte/setup da encomenda
        productionTimeMinutes: 5, // 5 min de montagem por unidade
        paymentFeePercent: 0,
        profitMarginPercent: 30,
        settings: DEFAULT_PRICING_SETTINGS,
      });

      expect(result.setupTimeMinutes).toBe(30);
      expect(result.productionTimeMinutes).toBe(5);
      expect(result.totalLaborMinutes).toBe(35);

      // No lote de 1 unidade, o custo unitário inclui os 30 min de setup
      const tier1 = result.batchTiers.find((t) => t.quantity === 1);
      // No lote de 10 unidades, o setup de 30 min vira 3 min por unidade
      const tier10 = result.batchTiers.find((t) => t.quantity === 10);

      expect(tier1).toBeDefined();
      expect(tier10).toBeDefined();
      expect(tier10!.unitCost).toBeLessThan(tier1!.unitCost);
      expect(tier10!.unitPrice).toBeLessThan(tier1!.unitPrice);
    });

    it('deve calcular rendimento de folhas inteiras (Math.ceil)', () => {
      const result = calculateRecipePricing({
        items: [
          {
            name: 'Papel Fotográfico A4',
            unit: 'folha',
            unitCost: 1.00,
            quantityUsed: 1,
            totalCost: 1.00,
            piecesPerSheet: 6, // Cabem 6 tags por folha
            useSheetRounding: true,
          },
        ],
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
        paymentFeePercent: 0,
        profitMarginPercent: 0,
        settings: DEFAULT_PRICING_SETTINGS,
      });

      // Para 1 tag avulsa com folha inteira: consome 1 folha = R$ 1,00
      expect(result.materialsCost).toBe(1.00);

      // No lote de 10 tags: ceil(10 / 6) = 2 folhas -> 2 * R$ 1,00 = R$ 2,00 / 10 = R$ 0,20 por unidade
      const tier10 = result.batchTiers.find((t) => t.quantity === 10);
      expect(tier10).toBeDefined();
      expect(tier10!.unitCost).toBeCloseTo(0.20, 2);
    });

    it('deve calcular preço de ponto de equilíbrio e desconto máximo', () => {
      const result = calculateRecipePricing({
        items: [
          {
            name: 'Caixa',
            unit: 'unidade',
            unitCost: 10.0,
            quantityUsed: 1,
            totalCost: 10.0,
          },
        ],
        wasteMarginPercent: 0,
        productionTimeMinutes: 0,
        paymentFeePercent: 10,
        profitMarginPercent: 40,
        settings: DEFAULT_PRICING_SETTINGS,
      });

      // Custo: R$ 10. Taxa de 10%. Preço de equilíbrio: 10 / 0.9 = R$ 11,11
      expect(result.breakevenPrice).toBeCloseTo(11.11, 2);
      // Preço sugerido: 10 / (1 - 0.5) = R$ 20,00
      expect(result.suggestedUnitPrice).toBeCloseTo(20.00, 2);
      // Desconto máximo até chegar em R$ 11,11: (20 - 11.11) / 20 = ~44.4%
      expect(result.maxDiscountPercent).toBeGreaterThan(40);
    });
  });

  describe('formatCurrency', () => {
    it('deve formatar valores numéricos no padrão monetário BRL', () => {
      const formatted = formatCurrency(24.5);
      expect(formatted).toContain('24,50');
      expect(formatted).toContain('R$');
    });

    it('deve formatar valores maiores com separador de milhar', () => {
      const formatted = formatCurrency(1250.75);
      expect(formatted).toContain('1.250,75');
    });
  });
});
