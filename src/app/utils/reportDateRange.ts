import { parseLocalDate } from './date';

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

/** Shared date boundaries for dashboard, reports and comparison periods. */
export function getReportDateRange(
  period: ReportPeriod,
  offset = 0,
  customRange?: { start?: string; end?: string },
  now = new Date(),
) {
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'all') return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  if (period === 'custom') {
    const start = customRange?.start ? parseLocalDate(customRange.start) : new Date(2000, 0, 1);
    const end = customRange?.end ? parseLocalDate(customRange.end, true) : new Date(now);
    return { start, end };
  }
  const days: Record<Exclude<ReportPeriod, 'today' | 'all' | 'custom'>, number> = {
    week: 7, month: 30, quarter: 90, year: 365,
  };
  const end = new Date(now);
  end.setDate(end.getDate() - days[period] * offset);
  const start = new Date(end);
  start.setDate(start.getDate() - days[period]);
  return { start, end };
}
