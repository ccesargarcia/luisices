import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiPricingDetails } from '../../../src/app/components/AiPricingDetails';
import { getAiPricingDetails } from '../../../src/app/utils/aiPricing';
import type { AiPricingEstimate } from '../../../src/app/types';
const { AiToolsExecutor } = require('../../../functions/ai/tools');
const base = { productName: 'Sintético', quantity: 1, unitCost: 1, suggestedUnitPrice: 2, suggestedTotalPrice: 2 };

describe('Contrato de exibição de custos/premissas', () => {
  it('mostra valores efetivos do backend, inclusive zero; não duplica subtotais', async () => {
    const result = await new AiToolsExecutor({}).executePricingEstimate({ unitCostRaw: 12, customizationCost: 0, quantity: 7, setupTimeMinutes: 14 }, { uid: 'synthetic' });
    const details = getAiPricingDetails(result);
    expect(details.map((detail) => detail.value)).toEqual([12, 0, result.breakdown.wasteMarginAmount, result.breakdown.directLaborPerUnit, result.breakdown.setupLaborPerUnit]);
    expect(details.reduce((sum, detail) => sum + detail.value, 0)).toBeCloseTo(result.unitCost, 1);
    const html = renderToStaticMarkup(<AiPricingDetails estimate={result} />);
    expect(html).toContain('12,00');
    expect(html).toContain('0,00');
    expect(html).toContain('padrão assumido');
    expect(html).toContain('origem humana não comprovada');
    expect(html).toContain('Setup rateado');
    expect(html).toContain('Despesas fixas já incluídas');
  });
  it('adapta histórico antigo do backend pelo subtotal, sem inferir divisão ou somar labor duas vezes', () => {
    const old: AiPricingEstimate = { ...base, breakdown: { materialsBase: 20, totalMaterialsWithWaste: 22, wasteMarginAmount: 2, directLaborPerUnit: 5, setupLaborPerUnit: 1, specializedLabor: 6, fixedCostsShare: 0.5 } };
    expect(getAiPricingDetails(old).map((detail) => detail.value)).toEqual([20, 2, 5, 1]);
    const html = renderToStaticMarkup(<AiPricingDetails estimate={old} />);
    expect(html).toContain('Materiais e personalização (subtotal)');
    expect(html).toContain('premissas indisponíveis');
    expect(html).not.toMatch(/R\$\s*0,00/);
  });
  it('adapta nomes legados do frontend e omite ausências', () => {
    expect(getAiPricingDetails({ ...base, breakdown: { materials: 10, customization: 3, labor: 5 } }).map((detail) => detail.value)).toEqual([10, 3, 5]);
    const html = renderToStaticMarkup(<AiPricingDetails estimate={{ ...base, breakdown: {} }} />);
    expect(html).toContain('indisponível');
    expect(html).not.toMatch(/R\$\s*0,00/);
  });
});
