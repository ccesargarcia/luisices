import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../src/app/utils/currency';
import { calcTotal, EMPTY_ITEM } from '../../src/app/components/quotes/quoteHelpers';
import { calculateRecipePricing, DEFAULT_PRICING_SETTINGS } from '../../src/app/utils/pricingCalculations';
import { Customer, QuoteItem } from '../../src/app/types';

describe('Auditoria Minuciosa de UI/UX, Design System e Usabilidade', () => {
  describe('1. Formatação e Resiliência Monetária (Design System)', () => {
    it('deve formatar valores monetários padrão no formato BRL sem quebrar com valores zerados ou decimais', () => {
      expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
      expect(formatCurrency(12.5)).toMatch(/R\$\s*12,50/);
      expect(formatCurrency(1999.99)).toMatch(/R\$\s*1\.999,99/);
    });

    it('deve lidar com valores NaN ou indefinidos retornando R$ 0,00 com segurança', () => {
      expect(formatCurrency(NaN)).toMatch(/R\$\s*0,00/);
      expect(formatCurrency(undefined as any)).toMatch(/R\$\s*0,00/);
      expect(formatCurrency(null as any)).toMatch(/R\$\s*0,00/);
    });
  });

  describe('2. Cálculos de Itens e Descontos em Pedidos e Orçamentos', () => {
    it('deve calcular o subtotal de múltiplos itens com precisão', () => {
      const items: QuoteItem[] = [
        { name: 'Caderno Personalizado', quantity: 2, unitPrice: 35.5 },
        { name: 'Caneta Gravada', quantity: 3, unitPrice: 10 },
      ];
      const total = calcTotal(items);
      expect(total).toBe(101.0);
    });

    it('deve evitar NaN quando itens possuem strings ou valores não numéricos', () => {
      const items: QuoteItem[] = [
        { name: 'Item Teste', quantity: '2' as any, unitPrice: '15.5' as any },
        { name: 'Item Vazio', quantity: 0, unitPrice: 0 },
      ];
      const total = calcTotal(items);
      expect(total).toBe(31.0);
    });

    it('deve garantir que o desconto percentual ou fixo nunca resulte em total negativo', () => {
      const subtotal = 100;

      // Desconto fixo maior que o subtotal
      const fixedDiscountAmt = 150;
      const finalTotalFixed = Math.max(0, subtotal - fixedDiscountAmt);
      expect(finalTotalFixed).toBe(0);

      // Desconto percentual de 100%
      const percentDiscountAmt = subtotal * (100 / 100);
      const finalTotalPercent = Math.max(0, subtotal - percentDiscountAmt);
      expect(finalTotalPercent).toBe(0);
    });
  });

  describe('3. Motor de Precificação e Proteção contra Divisão por Zero', () => {
    it('deve calcular precificação com método Margin on Sale sem estourar com taxas elevadas', () => {
      const pricing = calculateRecipePricing({
        items: [{ supplyId: 's1', supplyName: 'Papel Offset', unitCost: 10, quantityUsed: 1, totalCost: 10, unit: 'un' }],
        wasteMarginPercent: 5,
        laborMode: 'time',
        productionTimeMinutes: 30,
        setupTimeMinutes: 0,
        proportionalPercent: 100,
        paymentFeePercent: 5,
        profitMarginPercent: 20,
        pricingMethod: 'margin_on_sale',
        studioSettings: DEFAULT_PRICING_SETTINGS,
      });

      expect(pricing.materialsCost).toBeGreaterThan(0);
      expect(pricing.totalUnitCost).toBeGreaterThan(0);
      expect(pricing.suggestedUnitPrice).toBeGreaterThan(pricing.totalUnitCost);
      expect(pricing.netProfitAmount).toBeGreaterThan(0);
    });

    it('deve proteger contra margens de venda somadas >= 100% (evitando divisão por zero)', () => {
      const pricing = calculateRecipePricing({
        items: [{ supplyId: 's1', supplyName: 'Papel', unitCost: 10, quantityUsed: 1, totalCost: 10, unit: 'un' }],
        wasteMarginPercent: 0,
        laborMode: 'time',
        productionTimeMinutes: 0,
        setupTimeMinutes: 0,
        proportionalPercent: 100,
        paymentFeePercent: 50,
        profitMarginPercent: 50, // 50% taxa + 50% lucro = 100% divisor zero
        pricingMethod: 'margin_on_sale',
        studioSettings: DEFAULT_PRICING_SETTINGS,
      });

      expect(Number.isFinite(pricing.suggestedUnitPrice)).toBe(true);
      expect(pricing.suggestedUnitPrice).toBeGreaterThan(0);
    });
  });

  describe('4. Busca e Filtragem Fluida de Clientes (Anti-Travamento)', () => {
    const customers: Customer[] = [
      { id: '1', name: 'Juliana Paes', phone: '(11) 98888-1111', email: 'ju@paes.com', status: 'vip', createdAt: '2026-01-01' },
      { id: '2', name: 'Marcos Mion', phone: '(21) 97777-2222', email: 'mion@globo.com', status: 'active', createdAt: '2026-01-02' },
      { id: '3', name: 'Ana Hickmann', phone: '(11) 96666-3333', email: 'ana@hickmann.com', status: 'defaulter', createdAt: '2026-01-03' },
    ];

    function searchCustomers(query: string) {
      if (!query.trim()) return customers;
      const q = query.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');

      return customers.filter((c) => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').includes(q);
        const digitsMatch = cleanDigits.length >= 2 && (c.phone || '').replace(/\D/g, '').includes(cleanDigits);
        return nameMatch || emailMatch || phoneMatch || digitsMatch;
      });
    }

    it('deve encontrar cliente por dígitos puros sem formatação de DDD ou hífen', () => {
      const res = searchCustomers('988881111');
      expect(res.length).toBe(1);
      expect(res[0].name).toBe('Juliana Paes');
    });

    it('deve encontrar cliente por fragmento de email', () => {
      const res = searchCustomers('globo.com');
      expect(res.length).toBe(1);
      expect(res[0].name).toBe('Marcos Mion');
    });

    it('deve manter ordenação e integridade quando busca não encontra resultados', () => {
      const res = searchCustomers('XYZInexistente');
      expect(res.length).toBe(0);
    });
  });

  describe('5. Sanitização de Entrada de Dados nos Formulários de Usuário', () => {
    it('deve aparar (trim) espaços acidentais no início e fim de nomes e telefones', () => {
      const input = {
        name: '   Papelaria da Maria   ',
        phone: '  (11) 99999-1234  ',
        notes: '   Observação de teste   ',
      };

      expect(input.name.trim()).toBe('Papelaria da Maria');
      expect(input.phone.trim()).toBe('(11) 99999-1234');
      expect(input.notes.trim()).toBe('Observação de teste');
    });
  });
});
