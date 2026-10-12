/** Validação e normalização de entradas do diálogo; sem acesso à persistência. */
const { normalizeQuantity, normalizeCurrencyToFloat } = require('./nlpHelper');

/**
 * Normaliza e valida data de entrega no fuso America/Sao_Paulo.
 * Rejeita datas incompletas (ex: semanas ou apenas mês) e datas no passado.
 */
function parseAndValidateDeliveryDate(dateSlotValue, timezone = 'America/Sao_Paulo') {
  if (!dateSlotValue || typeof dateSlotValue !== 'string') {
    return { valid: false, error: 'Data não informada.' };
  }

  let raw = dateSlotValue.trim();

  // Suporte a dias da semana emitidos pela Alexa (AMAZON.DATE):
  // 1. Caso YYYY-Www-D (ex: 2026-W41-1 = Segunda-feira da semana 41)
  const fullWeekMatch = raw.match(/^(\d{4})-W(\d{2})-([1-7])$/);
  if (fullWeekMatch) {
    const year = parseInt(fullWeekMatch[1], 10);
    const week = parseInt(fullWeekMatch[2], 10);
    const day = parseInt(fullWeekMatch[3], 10); // 1 = Mon .. 7 = Sun
    if (week < 1 || week > 53) {
      return { valid: false, error: 'Semana inválida. Informe uma data exata para a entrega.' };
    }
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const targetDate = new Date(jan4.getTime() + ((week - 1) * 7 + (day - jan4Day)) * 86400000);
    // Recalcula semana ISO do resultado para impedir que semanas inexistentes
    // (por exemplo, semana 53 em ano com apenas 52) transbordem para outro ano.
    const targetIsoDay = targetDate.getUTCDay() || 7;
    const thursday = new Date(targetDate.getTime() + (4 - targetIsoDay) * 86400000);
    const isoYear = thursday.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const firstThursdayDay = firstThursday.getUTCDay() || 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() + (4 - firstThursdayDay));
    const isoWeek = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
    if (isoYear !== year || isoWeek !== week) {
      return { valid: false, error: 'Semana inválida para o ano informado. Informe uma data exata para a entrega.' };
    }
    raw = targetDate.toISOString().slice(0, 10);
  } else {
    // 2. Caso XXXX-WXX-D (ex: XXXX-WXX-1 = Segunda-feira sem ano/semana explícita)
    const relativeWeekDayMatch = raw.match(/^XXXX-WXX-([1-7])$/);
    if (relativeWeekDayMatch) {
      const targetIsoDay = parseInt(relativeWeekDayMatch[1], 10);
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
      const [y, m, d] = todayStr.split('-').map(Number);
      const todayDate = new Date(Date.UTC(y, m - 1, d));
      const currentIsoDay = todayDate.getUTCDay() || 7;
      let daysAhead = targetIsoDay - currentIsoDay;
      // O mesmo dia da semana pode ser hoje; dias já passados avançam uma semana.
      if (daysAhead < 0) {
        daysAhead += 7;
      }
      const resolvedDate = new Date(todayDate.getTime() + daysAhead * 86400000);
      raw = resolvedDate.toISOString().slice(0, 10);
    }
  }

  // Verifica se é semana sem dia especificado (ex: 2026-W41, XXXX-WXX) ou mês incompleto (2026-10)
  if (raw.includes('W') || /^\d{4}-\d{2}$/.test(raw)) {
    return {
      valid: false,
      error: 'Data incompleta. Por favor, informe o dia e o mês exatos da entrega.',
    };
  }

  // Formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return {
      valid: false,
      error: 'Formato de data não reconhecido. Por favor, informe dia e mês da entrega.',
    };
  }

  // Validação civil no fuso de São Paulo
  const [yearStr, monthStr, dayStr] = raw.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return { valid: false, error: 'Data inválida no calendário.' };
  }

  const testDate = new Date(Date.UTC(y, m - 1, d));
  if (
    testDate.getUTCFullYear() !== y ||
    testDate.getUTCMonth() !== m - 1 ||
    testDate.getUTCDate() !== d
  ) {
    return { valid: false, error: 'Data inválida no calendário.' };
  }

  // Validar se não é data retroativa
  const now = new Date();
  // Comparação considerando timezone de São Paulo (UTC-3 padrão)
  const spTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  if (raw < spTodayStr) {
    return {
      valid: false,
      error: 'A data de entrega não pode ser anterior à data de hoje.',
    };
  }

  return { valid: true, date: raw };
}

/**
 * Interpreta e valida quantidade inteira de itens (1 a 10.000 itens) usando NLP.
 * Suporta dígitos ("28"), números por extenso ("vinte e oito", "duas"),
 * ordinais ("primeiro", "segundo"), numerais compostos ("20 e 8"),
 * e sufixos comuns ("28 itens", "dez unidades").
 */
function parseQuantity(quantityValue) {
  return normalizeQuantity(quantityValue);
}

/**
 * Interpreta e valida valor monetário em reais usando NLP.
 * Converte strings capturadas como "X reais e Y centavos", "X reais", "X e Y",
 * "X vírgula Y", ordinais e numerais compostos em formato de ponto flutuante válido.
 */
function parseAndValidatePrice(priceValue) {
  const res = normalizeCurrencyToFloat(priceValue);
  if (!res.valid) return { valid: false, error: res.error };
  return { valid: true, price: res.price };
}

/**
 * Valida valor monetário e converte para centavos inteiros (0 a 1.000.000 centavos = R$ 10.000,00).
 * Rejeita estritamente não-inteiros, limites excedidos ou formatos malformados.
 */
function parseAndValidatePriceToCents(priceValue) {
  const res = normalizeCurrencyToFloat(priceValue);
  if (!res.valid) return res;
  const cents = Math.round(res.price * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1000000) {
    return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
  }
  return { valid: true, cents, price: cents / 100 };
}

/**
 * Normaliza texto para correspondência no catálogo (minúsculas, sem acentos ou pontuação).
 */
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { parseAndValidateDeliveryDate, parseQuantity, parseAndValidatePrice, parseAndValidatePriceToCents, normalizeText };
