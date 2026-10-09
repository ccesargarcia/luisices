/**
 * Detector Heurístico de Spam para E-mails no Frontend (TypeScript)
 */

export interface SpamEvaluationResult {
  isSpam: boolean;
  score: number;
  reasons: string[];
}

export interface SpamEvaluationOptions {
  blockedSenders?: string[];
  allowedSenders?: string[];
}

const HIGH_RISK_KEYWORDS = [
  /\b(viagra|cialis|crypto|bitcoin|ethereum|forex|lucro garantido|renda passiva|trabalhe em casa e ganhe|ganhe dinheiro facil)\b/i,
  /\b(sua conta foi suspensa|atualize seus dados bancarios|sua senha expira hoje|urgente: acesse o link|clique aqui para resgatar|parabens voce foi selecionado)\b/i,
  /\b(loteria|sorteio internacional|premio acumulado|transferencia pendente|heranca|milionario)\b/i,
  /\b(casino|aposta online|apostas esportivas|slot|betano|bet365|roleta)\b/i,
];

const MEDIUM_RISK_KEYWORDS = [
  /\b(oferta imperdivel|desconto exclusivo|promocao valida somente hoje|compre agora|nao perca essa oportunidade)\b/i,
  /\b(unsubscribe|clique para cancelar inscricao|descadastre-se|opt-out)\b/i,
  /\b(free gift|free trial|100% gratis|sem compromisso)\b/i,
];

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

export function extractEmailAddress(rawFrom: string): string {
  if (!rawFrom) return '';
  const match = rawFrom.match(/<([^>]+)>/);
  return (match ? match[1] : rawFrom).trim().toLowerCase();
}

export function extractEmailDomain(email: string): string {
  const clean = extractEmailAddress(email);
  const parts = clean.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : clean.toLowerCase();
}

export function normalizeSenderIdentifier(input: string): string {
  if (!input) return '';
  const trimmed = input.trim().toLowerCase();
  const address = extractEmailAddress(trimmed);
  if (address) return address;
  return trimmed.replace(/^@+/, '@');
}

export function matchesSenderOrDomain(identifier: string, ruleList: string[]): boolean {
  if (!identifier) return false;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  if (!clean) return false;
  return ruleList.some((entry) => {
    const cleanEntry = entry.toLowerCase().trim().replace(/^@/, '');
    if (!cleanEntry) return false;
    return clean === cleanEntry || clean.endsWith(`.${cleanEntry}`) || clean.endsWith(`@${cleanEntry}`);
  });
}

export function evaluateSpam(
  emailData: {
    from?: string;
    subject?: string;
    text?: string;
    html?: string;
    blockedSenders?: string[];
    allowedSenders?: string[];
  },
  options?: SpamEvaluationOptions
): SpamEvaluationResult {
  const from = extractEmailAddress(emailData.from || '');
  const domain = extractEmailDomain(from);
  const subject = String(emailData.subject || '').trim();
  const text = String(emailData.text || '').trim();
  const html = String(emailData.html || '').trim();
  const fullContent = `${subject} \n ${text} \n ${html}`.slice(0, 100000);

  const blockedList = options?.blockedSenders || emailData.blockedSenders || [];
  const allowedList = options?.allowedSenders || emailData.allowedSenders || [];

  const blocked = Array.isArray(blockedList)
    ? blockedList.map((s) => String(s).toLowerCase().trim())
    : [];
  const allowed = Array.isArray(allowedList)
    ? allowedList.map((s) => String(s).toLowerCase().trim())
    : [];

  const reasons: string[] = [];

  // 1. Whitelist explícita
  if (from && (matchesSenderOrDomain(from, allowed) || (domain && matchesSenderOrDomain(domain, allowed)))) {
    return {
      isSpam: false,
      score: 0,
      reasons: ['Remetente ou domínio presente na lista de confiança (whitelist).'],
    };
  }

  // 2. Blacklist explícita
  if (from && (matchesSenderOrDomain(from, blocked) || (domain && matchesSenderOrDomain(domain, blocked)))) {
    return {
      isSpam: true,
      score: 100,
      reasons: ['Remetente ou domínio cadastrado na lista de remetentes bloqueados pelo operador.'],
    };
  }

  let score = 0;

  // 3. Remetente ausente ou malformatado
  if (!from || !from.includes('@')) {
    score += 45;
    reasons.push('Remetente ausente ou formato inválido');
  }

  // 4. Domínio descartável
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    score += 50;
    reasons.push('Uso de domínio de e-mail temporário/descartável');
  }

  // 4.1 TLDs de alto abuso
  if (domain && SUSPICIOUS_TLDS.some((tld) => tld.test(domain))) {
    score += 30;
    reasons.push(`Domínio com terminação comumente associada a campanhas de spam (${domain.substring(domain.lastIndexOf('.'))})`);
  }

  // 5. Assunto em caixa alta (ALL CAPS)
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

  // 6. Pontuação excessiva no assunto
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

  // 8. Palavras-chave promocionais
  let mediumCount = 0;
  for (const regex of MEDIUM_RISK_KEYWORDS) {
    if (regex.test(fullContent)) mediumCount++;
  }
  if (mediumCount > 0) {
    score += Math.min(mediumCount * 15, 30);
    reasons.push('Contém termos promocionais agressivos');
  }

  // 9. Encurtadores suspeitos
  for (const regex of SUSPICIOUS_URL_SHORTENERS) {
    if (regex.test(fullContent)) {
      score += 25;
      reasons.push('Contém links encurtados comumente usados em spam');
      break;
    }
  }

  // 10. Vazio
  if (!subject && !text && !html) {
    score += 30;
    reasons.push('Mensagem sem assunto e sem texto');
  }

  score = Math.min(Math.max(score, 0), 100);

  return {
    isSpam: score >= 50,
    score,
    reasons,
  };
}
