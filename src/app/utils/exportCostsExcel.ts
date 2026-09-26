import * as XLSX from 'xlsx';
import { SupplyItem, PurchaseHistoryItem, ProductPricingRecipe } from '../types';
import { formatCurrency } from './currency';

/**
 * Gera e faz o download da planilha Excel completa (.xlsx)
 * com 3 abas estruturadas com a identidade do Ateliê Luisices:
 * 1. Cadastro de Custos de Insumos
 * 2. Histórico de Compras & Evolução
 * 3. Custo por Produto (Ficha Técnica)
 */
export function exportCostsToExcel(
  supplies: SupplyItem[],
  historyItems: PurchaseHistoryItem[],
  recipes: ProductPricingRecipe[]
) {
  const wb = XLSX.utils.book_new();

  // ───────────────────────────────────────────────────────────────────────────
  // ABA 1 — Cadastro de Custos de Insumos
  // ───────────────────────────────────────────────────────────────────────────
  const sheet1Data = supplies.map((s) => {
    const totalCost = (s.purchasePrice || 0) + (s.shippingCost || 0);
    const unitCost = s.packageQuantity > 0 ? totalCost / s.packageQuantity : s.unitCost || 0;
    const isLowStock = (s.currentStock || 0) <= (s.minStock || 0) || s.needsReorder;

    return {
      'Categoria': getCategoryLabel(s.category),
      'Insumo / Material': s.name,
      'Marca / Modelo': s.brandModel || '—',
      'Onde Comprei (Loja)': s.supplier || '—',
      'Contato / Link Compra': s.purchaseUrl || '—',
      'Data Última Compra': formatDateBR(s.lastPurchaseDate || s.createdAt),
      'Qtd. Comprada': s.packageQuantity,
      'Unidade': s.unit,
      'Valor Pago (R$)': s.purchasePrice,
      'Frete (R$)': s.shippingCost || 0,
      'Custo Total (R$)': totalCost,
      'Custo Unitário (R$)': Number(unitCost.toFixed(4)),
      'Rendimento / Obs.': s.notes || '—',
      'Estoque Atual': s.currentStock ?? 0,
      'Estoque Mínimo': s.minStock ?? 0,
      'Comprar Novamente?': isLowStock ? 'SIM (ALERTA)' : 'NÃO (OK)',
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  // Larguras de colunas da Aba 1
  ws1['!cols'] = [
    { wch: 22 }, // Categoria
    { wch: 32 }, // Insumo
    { wch: 18 }, // Marca/Modelo
    { wch: 20 }, // Onde Comprei
    { wch: 25 }, // Link/Contato
    { wch: 18 }, // Data
    { wch: 14 }, // Qtd
    { wch: 10 }, // Unidade
    { wch: 16 }, // Valor Pago
    { wch: 12 }, // Frete
    { wch: 16 }, // Custo Total
    { wch: 18 }, // Custo Unitario
    { wch: 25 }, // Rendimento
    { wch: 14 }, // Estoque Atual
    { wch: 15 }, // Estoque Minimo
    { wch: 18 }, // Comprar Novamente
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '1-Cadastro de Custos');

  // ───────────────────────────────────────────────────────────────────────────
  // ABA 2 — Histórico de Compras
  // ───────────────────────────────────────────────────────────────────────────
  const sheet2Data = historyItems.map((h) => {
    const total = h.totalPrice || (h.price + (h.shippingCost || 0));
    const uCost = h.quantity > 0 ? total / h.quantity : h.unitCost || 0;

    return {
      'Data da Compra': formatDateBR(h.date || h.createdAt),
      'Insumo / Material': h.supplyName,
      'Categoria': getCategoryLabel(h.category),
      'Loja / Fornecedor': h.store || '—',
      'Quantidade Comprada': h.quantity,
      'Unidade': h.unit,
      'Valor Pago (R$)': h.price,
      'Frete (R$)': h.shippingCost || 0,
      'Valor Final (R$)': total,
      'Custo Unitário Resultante (R$)': Number(uCost.toFixed(4)),
      'Observações': h.notes || '—',
    };
  });

  const ws2 = XLSX.utils.json_to_sheet(
    sheet2Data.length > 0
      ? sheet2Data
      : [
          {
            'Data da Compra': 'Sem registros',
            'Insumo / Material': '—',
            'Categoria': '—',
            'Loja / Fornecedor': '—',
            'Quantidade Comprada': 0,
            'Unidade': '—',
            'Valor Pago (R$)': 0,
            'Frete (R$)': 0,
            'Valor Final (R$)': 0,
            'Custo Unitário Resultante (R$)': 0,
            'Observações': 'Nenhum histórico registrado ainda',
          },
        ]
  );
  ws2['!cols'] = [
    { wch: 16 },
    { wch: 30 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 16 },
    { wch: 28 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '2-Histórico de Compras');

  // ───────────────────────────────────────────────────────────────────────────
  // ABA 3 — Custo por Produto (Fichas Técnicas)
  // ───────────────────────────────────────────────────────────────────────────
  const sheet3Rows: any[] = [];

  recipes.forEach((r) => {
    const matCost = (r.items || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const otherCosts = r.fixedCostsShare || 0;
    const directCostNoLabor = matCost + otherCosts;
    const laborCost = r.laborCost || 0;
    const totalUnitCost = directCostNoLabor + laborCost;

    sheet3Rows.push({
      'Produto': r.productName,
      'Material / Componente': '=== RESUMO DO PRODUTO ===',
      'Qtd. Usada': 1,
      'Unidade': 'unidade',
      'Custo Un. Material (R$)': '—',
      'Custo Total Mat. (R$)': Number(matCost.toFixed(2)),
      'Outros Custos (R$)': Number(otherCosts.toFixed(2)),
      'Custo Direto Sem Mão de Obra (R$)': Number(directCostNoLabor.toFixed(2)),
      'Custo Mão de Obra (R$)': Number(laborCost.toFixed(2)),
      'Custo Total Un. (R$)': Number(totalUnitCost.toFixed(2)),
      'Preço Sugerido (R$)': Number((r.suggestedUnitPrice || 0).toFixed(2)),
      'Margem Defenido (%)': `${r.profitMarginPercent || 50}%`,
    });

    // Detalhamento dos insumos do produto
    (r.items || []).forEach((item) => {
      sheet3Rows.push({
        'Produto': `  ↳ ${r.productName}`,
        'Material / Componente': item.name,
        'Qtd. Usada': item.quantityUsed,
        'Unidade': item.unit,
        'Custo Un. Material (R$)': Number((item.unitCost || 0).toFixed(4)),
        'Custo Total Mat. (R$)': Number((item.totalCost || 0).toFixed(2)),
        'Outros Custos (R$)': '—',
        'Custo Direto Sem Mão de Obra (R$)': '—',
        'Custo Mão de Obra (R$)': '—',
        'Custo Total Un. (R$)': '—',
        'Preço Sugerido (R$)': '—',
        'Margem Defenido (%)': '—',
      });
    });

    // Linha em branco separadora
    sheet3Rows.push({
      'Produto': '',
      'Material / Componente': '',
      'Qtd. Usada': '',
      'Unidade': '',
      'Custo Un. Material (R$)': '',
      'Custo Total Mat. (R$)': '',
      'Outros Custos (R$)': '',
      'Custo Direto Sem Mão de Obra (R$)': '',
      'Custo Mão de Obra (R$)': '',
      'Custo Total Un. (R$)': '',
      'Preço Sugerido (R$)': '',
      'Margem Defenido (%)': '',
    });
  });

  const ws3 = XLSX.utils.json_to_sheet(sheet3Rows);
  ws3['!cols'] = [
    { wch: 30 },
    { wch: 35 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '3-Custo por Produto');

  // Fazer o download do arquivo Excel
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Planilha_Custos_Insumos_Luisices_${dateStr}.xlsx`);
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    papeis: 'Papéis',
    vinis: 'Vinis & Recorte',
    botons: 'Bótons',
    canecas: 'Canecas & Sublimação',
    embalagens: 'Caixas & Embalagens',
    fitas_aviamentos: 'Fitas & Laços / Aviamentos',
    adesivos_colas: 'Colas & Adesivos',
    impressao_tintas: 'Impressão & Tintas',
    laminacao_foils: 'Laminação & Foils',
    acrilicos: 'Acrílicos',
    chaveiros: 'Chaveiros & Mimos',
    outros: 'Outros',
  };
  return map[cat] || cat;
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.slice(0, 10).split('-');
    if (day && month && year) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
