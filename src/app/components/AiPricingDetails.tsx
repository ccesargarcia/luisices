import React from 'react';
import type { AiPricingEstimate } from '../types';
import { getAiPricingDetails } from '../utils/aiPricing';
import { formatCurrency } from '../utils/currency';

export function AiPricingDetails({ estimate }: { estimate: AiPricingEstimate }) {
  const details = getAiPricingDetails(estimate);
  const inputs = Object.values(estimate.inputs || {});
  const hasDefaults = inputs.some((input) => input.source === 'default');
  const hasInvalidSettings = inputs.some((input) => input.invalidConfiguration);
  const hasConfiguredValues = inputs.some((input) => input.source === 'configuration');
  return (
    <div className="text-[11px] text-muted-foreground border-t border-blue-500/20 pt-2 mt-2">
      <details>
        <summary className="cursor-pointer font-medium">Ver composição do preço</summary>
        <div className="space-y-1 pt-2">
          {details.length ? details.map((detail) => (
            <div key={detail.label}>• {detail.label}: {formatCurrency(detail.value)}/un</div>
          )) : <div>Detalhamento de custos indisponível.</div>}
          {estimate.breakdown?.fixedCostsIncludedInLabor && <div>Despesas fixas do ateliê já estão consideradas na mão de obra.</div>}
          <div className="font-medium pt-1">Sobre esta estimativa</div>
          {hasDefaults && <div>Alguns custos ou tempos não foram informados e usei valores padrão. Atualize esses dados para chegar a um preço mais preciso.</div>}
          {hasInvalidSettings && <div>Uma configuração inválida foi substituída por um valor padrão.</div>}
          {hasConfiguredValues && <div>Alguns valores vêm das configurações do ateliê.</div>}
          {!inputs.length && <div>Os dados de origem desta estimativa antiga não estão disponíveis.</div>}
          {estimate.assumptions?.some((assumption) => assumption.startsWith('Setup de ')) && <div>O tempo de preparação foi dividido entre as unidades do lote.</div>}
        </div>
      </details>
    </div>
  );
}
