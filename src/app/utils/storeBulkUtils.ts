/**
 * Utilitários para processamento e sanitização de uploads em lote de produtos da loja.
 * Funções puras sem dependências de UI ou Firebase para máxima testabilidade e performance.
 */

/**
 * Aplica máscara de moeda BRL em digitação contínua (centavos).
 * Ex: "1590" -> "15,90" | "100000" -> "1.000,00"
 */
export function parsePriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte string formatada em Real ("15,90" ou "1.250,50") em número float (15.9 ou 1250.5).
 */
export function priceInputToFloat(display: string): number {
  return parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Converte o nome do arquivo da imagem em um título amigável de produto.
 * Exemplo: "caixa_milk-luxo-dourada_01.jpg" -> "Caixa Milk Luxo Dourada"
 */
export function formatFilenameToTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const clean = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove números isolados no fim se for apenas índice (ex: "Produto 01" -> "Produto")
  const strippedIndex = clean.replace(/\s+\d+$/, '');
  const target = strippedIndex.length >= 3 ? strippedIndex : clean;

  // Capitaliza primeira letra de cada palavra
  return target
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
