/**
 * Detector Heurístico de Spam para E-mails Recebidos
 * Utilizado pelo Webhook de Recebimento e pela interface do operador.
 */

// Padrões de palavras-chave com alta pontuação de spam (golpes, phishing, adultos, cripto)
const HIGH_RISK_KEYWORDS = [
  /\b(viagra|cialis|crypto|bitcoin|ethereum|forex|lucro garantido|renda passiva|trabalhe em casa e ganhe|ganhe dinheiro facil)\b/i,
  /\b(sua conta foi suspensa|atualize seus dados bancarios|sua senha expira hoje|urgente: acesse o link|clique aqui para resgatar|parabens voce foi selecionado)\b/i,
  /\b(loteria|sorteio internacional|premio acumulado|transferencia pendente|heranca|milionario)\b/i,
  /\b(casino|aposta online|apostas esportivas|slot|betano|bet365|roleta)\b/i,
];

// Padrões de média pontuação (marketing agressivo e chamadas apelativas)
const MEDIUM_RISK_KEYWORDS = [
  /\b(oferta imperdivel|desconto exclusivo|promocao valida somente hoje|compre agora|nao perca essa oportunidade)\b/i,
  /\b(unsubscribe|clique para cancelar inscricao|descadastre-se|opt-out)\b/i,
  /\b(free gift|free trial|100% gratis|sem compromisso)\b/i,
];

// Encurtadores de links suspeitos frequentemente usados em phishing
const SUSPICIOUS_URL_SHORTENERS = [
  /\b(bit\.ly|tinyurl\.com|t\.co|is\.gd|buff\.ly|ow\.ly|cutt\.ly|rb\.gy)\b/i,
];

const SUSPICIOUS_TLDS = [
  /\.top$/i,
  /\.xyz$/i,
  /\.click$/i,
  /\.link$/i,
  /\.loan$/i,
  /\.work$/i,
  /\.live$/i,
  /\.buzz$/i,
  /\.bar$/i,
  /\.rest$/i,
];

const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'mailinator.com',
  'yopmail.com',
];

/**
 * Normaliza e extrai apenas o endereço de e-mail de strings como "Nome <email@dominio.com>"
 */
function extractEmailAddress(rawFrom) {
  if (!rawFrom || typeof rawFrom !== 'string') return '';
  const match = rawFrom.match(/<([^>]+)>/);
  return (match ? match[1] : rawFrom).trim().toLowerCase();
}

/**
 * Extrai o domínio de um e-mail
 */
function extractEmailDomain(email) {
  const clean = extractEmailAddress(email);
  const parts = clean.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : clean.toLowerCase();
}

function matchesSenderOrDomain(identifier, ruleList) {
  if (!identifier || !Array.isArray(ruleList)) return false;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  if (!clean) return false;
  return ruleList.some((entry) => {
    const cleanEntry = String(entry || '').toLowerCase().trim().replace(/^@/, '');
    if (!cleanEntry) return false;
    return clean === cleanEntry || clean.endsWith(`.${cleanEntry}`) || clean.endsWith(`@${cleanEntry}`);
  });
}

/**
 * Avalia o conteúdo de um e-mail e calcula uma pontuação de spam (0 a 100).
 * Retorna { isSpam: boolean, score: number, reasons: string[] }
 * 
 * @param {Object} emailData
 * @param {string} emailData.from
 * @param {string} emailData.subject
 * @param {string} emailData.text
 * @param {string} emailData.html
 * @param {string[]} [emailData.blockedSenders] Lista de e-mails/domínios bloqueados pelo usuário
 * @param {string[]} [emailData.allowedSenders] Lista de e-mails/domínios confiáveis (whitelist)
 */
function evaluateSpam(emailData) {
  const from = extractEmailAddress(emailData.from || '');
  const domain = extractEmailDomain(from);
  const subject = String(emailData.subject || '').trim();
  const text = String(emailData.text || '').trim();
  const html = String(emailData.html || '').trim();
  const fullContent = `${subject} \n ${text} \n ${html}`.slice(0, 100000);

  const blocked = Array.isArray(emailData.blockedSenders) ? emailData.blockedSenders.map(s => String(s).toLowerCase().trim()) : [];
  const allowed = Array.isArray(emailData.allowedSenders) ? emailData.allowedSenders.map(s => String(s).toLowerCase().trim()) : [];

  const reasons = [];

  // 1. Whitelist explícita: se estiver na lista de confiáveis, pontuação 0
  if (from && (matchesSenderOrDomain(from, allowed) || (domain && matchesSenderOrDomain(domain, allowed)))) {
    return {
      isSpam: false,
      score: 0,
      reasons: ['Remetente ou domínio presente na lista de confiança (whitelist).'],
    };
  }

  // 2. Blacklist explícita: bloqueio direto
  if (from && (matchesSenderOrDomain(from, blocked) || (domain && matchesSenderOrDomain(domain, blocked)))) {
    return {
      isSpam: true,
      score: 100,
      reasons: ['Remetente ou domínio cadastrado na lista de remetentes bloqueados pelo operador.'],
    };
  }

  let score = 0;

  // 3. Verificação de remetente ausente ou malformatado
  if (!from || !from.includes('@')) {
    score += 45;
    reasons.push('Remetente ausente ou formato inválido');
  }

  // 4. Domínios descartáveis comuns
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    score += 50;
    reasons.push('Uso de domínio de e-mail temporário/descartável');
  }

  // 4.1 TLDs de alto abuso
  if (domain && SUSPICIOUS_TLDS.some((tld) => tld.test(domain))) {
    score += 30;
    reasons.push(`Domínio com terminação comumente associada a campanhas de spam (${domain.substring(domain.lastIndexOf('.'))})`);
  }

  // 5. Assunto em caixa alta excessiva (ALL CAPS SHOUTING)
  if (subject.length > 10) {
    const letters = subject.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 5) {
      const upperCount = (letters.match(/[A-Z]/g) || []).length;
      if (upperCount / letters.length > 0.7) {
        score += 25;
        reasons.push('Assunto com excesso de letras maiúsculas');
      }
    }
  }

  // 6. Excesso de pontuação agressiva no assunto (ex: "Ganhe agora!!!! ??? $$$")
  if (/([!?$€£]{3,})/.test(subject)) {
    score += 20;
    reasons.push('Excesso de pontuação sensacionalista no assunto');
  }

  // 7. Palavras-chave de alto risco
  for (const regex of HIGH_RISK_KEYWORDS) {
    if (regex.test(fullContent)) {
      score += 40;
      reasons.push('Contém palavras-chave com alto índice de golpe ou phishing');
      break;
    }
  }

  // 8. Palavras-chave de médio risco
  let mediumMatchCount = 0;
  for (const regex of MEDIUM_RISK_KEYWORDS) {
    if (regex.test(fullContent)) {
      mediumMatchCount++;
    }
  }
  if (mediumMatchCount > 0) {
    score += Math.min(mediumMatchCount * 15, 30);
    reasons.push('Contém termos promocionais agressivos');
  }

  // 9. Presença de encurtadores de links suspeitos no corpo
  for (const regex of SUSPICIOUS_URL_SHORTENERS) {
    if (regex.test(fullContent)) {
      score += 25;
      reasons.push('Contém links encurtados comumente usados para ocultar destinos maliciosos');
      break;
    }
  }

  // 10. E-mail totalmente vazio (sem texto nem assunto)
  if (!subject && !text && !html) {
    score += 30;
    reasons.push('Mensagem sem assunto e sem corpo de texto');
  }

  // Normalização do score (0 a 100)
  score = Math.min(Math.max(score, 0), 100);

  // Limiar de classificação: score >= 50 é considerado Spam
  const isSpam = score >= 50;

  return {
    isSpam,
    score,
    reasons,
  };
}

module.exports = {
  evaluateSpam,
  extractEmailAddress,
  extractEmailDomain,
};
