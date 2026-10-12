/** Formatação das respostas do diálogo; sem acesso à persistência. */
const { escapeXmlCharacters } = require('ask-sdk-core');

// Meses em português para pronúncia amigável
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Sanitiza texto dinâmico para fala segura em SSML (prevenção de injeção).
 */
function sanitizeSpeech(text) {
  if (!text) return '';
  return escapeXmlCharacters(String(text).trim());
}

/**
 * Formata moeda para pronúncia em português brasileiro.
 */
function formatCurrencyPtBr(value) {
  const num = Number(value || 0);
  const reais = Math.floor(num);
  const centavos = Math.round((num - reais) * 100);

  if (num === 0) return 'zero reais';

  const partes = [];
  if (reais > 0) {
    partes.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos > 0) {
    partes.push(`${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  return partes.join(' e ');
}

/**
 * Formata data YYYY-MM-DD para pronúncia clara: "10 de outubro de 2026"
 */
function formatDatePtBr(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const day = parseInt(dayStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${day} de ${monthName} de ${yearStr}`;
}

/**
 * Monta o resumo verbal e avança estado para 'awaiting_confirmation'.
 * Inclui detalhamento de preço unitário e total quando pricingMode === 'unit',
 * ou total do pedido inteiro quando pricingMode === 'total'.
 * Inclui confirmação explícita de gratuidade quando price === 0.
 */
function buildConfirmationSpeech(draftData, identity, config) {
  const isProd = config.environment === 'prod';
  const name = sanitizeSpeech(identity.displayName || 'Amanda');
  const qty = draftData.quantity;
  const prod = sanitizeSpeech(draftData.product);
  const cust = sanitizeSpeech(draftData.customer);
  const dateFormatted = formatDatePtBr(draftData.deliveryDate);
  const prefix = isProd ? `${name}:` : `${name}, no ambiente de teste:`;

  if (draftData.pricingMode === 'unit' && draftData.unitPriceCents !== null && draftData.unitPriceCents !== undefined) {
    const unitPriceReais = draftData.unitPriceCents / 100;
    const unitPriceFormatted = unitPriceReais === 0 ? 'zero reais' : formatCurrencyPtBr(unitPriceReais);
    const totalPriceFormatted = draftData.price === 0 ? 'zero reais, pedido gratuito' : formatCurrencyPtBr(draftData.price);
    return `${prefix} ${qty} ${prod} para ${cust} a ${unitPriceFormatted} cada, total de ${totalPriceFormatted}, entrega em ${dateFormatted}. Confirmar? Diga: pode confirmar. Ou diga o que deseja corrigir.`;
  }

  const priceFormatted = draftData.price === 0
    ? 'zero reais, pedido gratuito'
    : formatCurrencyPtBr(draftData.price);

  return `${prefix} ${qty} ${prod} para ${cust}, entrega em ${dateFormatted}, total de ${priceFormatted}. Confirmar? Diga: pode confirmar. Ou diga o que deseja corrigir.`;
}

module.exports = { sanitizeSpeech, formatCurrencyPtBr, formatDatePtBr, buildConfirmationSpeech };
