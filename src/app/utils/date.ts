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
