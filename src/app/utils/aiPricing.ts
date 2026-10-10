import type { AiPricingEstimate } from '../types';

/** Adaptação explícita de históricos: ausência não equivale a custo zero. */
export function getAiPricingDetails(estimate: AiPricingEstimate): Array<{ label: string; value: number }> {
  const b = estimate.breakdown;
  if (!b) return [];
  const rows: Array<{ label: string; value: number | undefined }> = [];
  if (b.rawMaterials !== undefined) {
    rows.push({ label: 'Matéria-prima', value: b.rawMaterials }, { label: 'Personalização', value: b.customization });
  } else if (b.materialsBase !== undefined) {
    // Contrato anterior do backend: subtotal já inclui personalização.
    rows.push({ label: 'Materiais e personalização (subtotal)', value: b.materialsBase });
  } else {
    rows.push({ label: 'Matéria-prima (histórico)', value: b.materials }, { label: 'Personalização (histórico)', value: b.customization });
  }
  rows.push({ label: 'Perdas de materiais', value: b.wasteMarginAmount });
  if (b.directLaborPerUnit !== undefined || b.setupLaborPerUnit !== undefined) {
    rows.push({ label: 'Mão de obra de montagem', value: b.directLaborPerUnit }, { label: 'Setup rateado', value: b.setupLaborPerUnit });
  } else {
    rows.push({ label: 'Mão de obra (subtotal)', value: b.specializedLabor ?? b.labor });
  }
  // fixedCostsShare é informativo: já está incluído em labor, não é custo adicional.
  return rows.filter((row): row is { label: string; value: number } => typeof row.value === 'number' && Number.isFinite(row.value));
}
