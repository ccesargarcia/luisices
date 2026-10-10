import React from 'react';
import type { AiPricingEstimate } from '../types';
import { getAiPricingDetails } from '../utils/aiPricing';
import { formatCurrency } from '../utils/currency';

export function AiPricingDetails({ estimate }: { estimate: AiPricingEstimate }) {
  const details = getAiPricingDetails(estimate);
  return (
    <div className="text-[11px] space-y-1 text-muted-foreground border-t border-blue-500/20 pt-2 mt-2">
      {details.length ? details.map((detail) => (
        <div key={detail.label}>• {detail.label}: {formatCurrency(detail.value)}/un</div>
      )) : <div>Detalhamento de custos indisponível.</div>}
      {estimate.breakdown?.fixedCostsIncludedInLabor && <div>Despesas fixas já incluídas na mão de obra.</div>}
      <div className="font-medium">Premissas — revise antes de usar:</div>
      {estimate.assumptions?.length ? estimate.assumptions.map((assumption, index) => (
        <div key={index}>{assumption}</div>
      )) : <div>Estimativa antiga: origem das entradas e premissas indisponíveis.</div>}
    </div>
  );
}
