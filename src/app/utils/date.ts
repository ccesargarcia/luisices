/**
 * Utilitários de data compartilhados.
 *
 * Usar sempre `parseLocalDate` para strings no formato "YYYY-MM-DD" —
 * isso evita o bug de UTC offset (ex: "2026-02-23" virar 22/02 no Brasil UTC-3).
 * Para timestamps ISO completos (ex: createdAt) usar `new Date()` diretamente.
 */

/** Converte "YYYY-MM-DD" em Date no horário local (sem shift de UTC). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-02-23" → "23/02/2026" */
export function formatDateShort(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** "2026-02-23" → "23 de fevereiro de 2026" */
export function formatDateLong(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** "2026-02-23" → "23/02" */
export function formatDateDayMonth(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/** "2026-02-23" → "23 fev." */
export function formatDateMonthShort(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Formata data/hora de um timestamp ISO completo (ex: createdAt do Firestore).
 * Usa new Date() porque timestamps ISO já incluem timezone info.
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata qualquer string de data — detecta automaticamente se é
 * "YYYY-MM-DD" (local) ou timestamp ISO completo.
 */
export function formatDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return formatDateLong(dateStr);
  }
  return formatDateTime(dateStr);
}

/** Número de dias entre hoje e uma data "YYYY-MM-DD" (positivo = futuro). */
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(dateStr);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Número de dias que uma data "YYYY-MM-DD" está no passado (positivo = passado). */
export function daysOverdue(dateStr: string): number {
  return -daysUntil(dateStr);
}
