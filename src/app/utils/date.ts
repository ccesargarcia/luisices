/**
 * Utilitários de data compartilhados.
 *
 * Usar sempre `parseLocalDate` para strings no formato "YYYY-MM-DD" —
 * isso evita o bug de UTC offset (ex: "2026-02-23" virar 22/02 no Brasil UTC-3).
 * Para timestamps ISO completos (ex: createdAt) suporta parsing automático seguro.
 */

/** Converte "YYYY-MM-DD" ou timestamp ISO em Date no horário local (sem shift de UTC). */
export function parseLocalDate(dateStr: string, isEndOfDay = false): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date(NaN);
  }
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = cleanStr.split('-').map(Number);
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const [y, m, d] = parts;
    if (isEndOfDay) {
      return new Date(y, m - 1, d, 23, 59, 59, 999);
    }
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(dateStr);
}

/** "2026-02-23", ISO string ou Date → "23/02/2026" */
export function formatDateShort(dateVal: any): string {
  if (!dateVal) return '';
  try {
    if (typeof dateVal?.toDate === 'function') {
      return dateVal.toDate().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      return dateVal.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    const str = String(dateVal).trim();
    if (!str) return '';
    const dateObj = parseLocalDate(str);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** "2026-02-23" → "23 de fevereiro de 2026" */
export function formatDateLong(dateStr: string): string {
  const dateObj = parseLocalDate(dateStr);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** "2026-02-23" → "23/02" */
export function formatDateDayMonth(dateStr: string): string {
  const dateObj = parseLocalDate(dateStr);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/** "2026-02-23" → "23 fev." */
export function formatDateMonthShort(dateStr: string): string {
  const dateObj = parseLocalDate(dateStr);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Formata data/hora de um timestamp ISO completo (ex: createdAt do Firestore).
 * Usa new Date() porque timestamps ISO já incluem timezone info.
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Formata qualquer string de data — detecta automaticamente se é
 * "YYYY-MM-DD" (local) ou timestamp ISO completo.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return formatDateLong(dateStr);
  }
  return formatDateTime(dateStr);
}

/** Número de dias entre hoje e uma data "YYYY-MM-DD" (positivo = futuro). */
export function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(dateStr);
  if (isNaN(target.getTime())) return 0;
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Número de dias que uma data "YYYY-MM-DD" está no passado (positivo = passado). */
export function daysOverdue(dateStr: string): number {
  return -daysUntil(dateStr);
}

/**
 * Retorna os dias restantes para o próximo aniversário considerando o ano atual/próximo.
 * Retorna null se a string de aniversário for inválida.
 * 0 = é hoje!
 */
export function getDaysUntilBirthday(birthday?: string | null, referenceDate = new Date()): number | null {
  if (!birthday || typeof birthday !== 'string') return null;
  const parts = birthday.trim().split('-');
  if (parts.length < 3) return null;
  const mm = Number(parts[1]);
  const dd = Number(parts[2]);
  if (!mm || !dd || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  let next = new Date(today.getFullYear(), mm - 1, dd, 0, 0, 0, 0);
  if (next.getTime() < today.getTime()) {
    next.setFullYear(today.getFullYear() + 1);
  }

  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Verifica se o aniversário é no mês da data de referência (mês atual por padrão) */
export function isBirthdayThisMonth(birthday?: string | null, referenceDate = new Date()): boolean {
  if (!birthday || typeof birthday !== 'string') return false;
  const parts = birthday.trim().split('-');
  if (parts.length < 3) return false;
  const mm = Number(parts[1]);
  return mm === referenceDate.getMonth() + 1;
}

/** Verifica se o aniversário é nos próximos N dias (padrão 7 dias) */
export function isBirthdayUpcoming(birthday?: string | null, maxDays = 7, referenceDate = new Date()): boolean {
  const days = getDaysUntilBirthday(birthday, referenceDate);
  return days !== null && days >= 0 && days <= maxDays;
}

