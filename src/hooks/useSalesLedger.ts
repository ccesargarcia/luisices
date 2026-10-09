import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { SaleRecord, LedgerPeriod, Tag } from '../app/types';
import { firebaseLedgerService, getSalesLedgerQuery, getSalesLedgerDateRangeQuery } from '../services/firebaseLedgerService';
import { parseLocalDate } from '../app/utils/date';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getLedgerDateRange(period: LedgerPeriod, customRange?: { start?: string; end?: string }): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayEnd };

    case 'yesterday': {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayEnd);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: yStart, end: yEnd };
    }

    case 'week': {
      const wStart = new Date(now);
      wStart.setDate(now.getDate() - 7);
      wStart.setHours(0, 0, 0, 0);
      return { start: wStart, end: todayEnd };
    }

    case 'month': {
      // Do primeiro dia do mês atual até o último momento do mês atual
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: mStart, end: mEnd };
    }

    case 'quarter': {
      const qStart = new Date(now);
      qStart.setDate(now.getDate() - 90);
      qStart.setHours(0, 0, 0, 0);
      return { start: qStart, end: todayEnd };
    }

    case 'year': {
      // Do início do ano atual até agora
      const yStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start: yStart, end: todayEnd };
    }

    case 'custom': {
      const cStart = customRange?.start
        ? parseLocalDate(customRange.start, false)
        : new Date(2000, 0, 1, 0, 0, 0, 0);
      const cEnd = customRange?.end
        ? parseLocalDate(customRange.end, true)
        : todayEnd;
      return { start: cStart, end: cEnd };
    }

    case 'all':
    default:
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  }
}

export function useSalesLedger(options?: {
  defaultPeriod?: LedgerPeriod;
  teamUserIds?: string[]; // IDs de usuários filtrados pelo AdminTeamFilter
  dateRange?: { start: string; end: string }; // Intervalo opcional para consulta filtrada no Firestore
}) {
  const { user, userProfile } = useAuth();
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<LedgerPeriod>(options?.defaultPeriod || 'month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const hasAutoSyncedRef = useRef(false);

  // Escuta o ledger do Firestore
  useEffect(() => {
    if (!user) {
      setAllSales([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const isAdmin = userProfile?.role === 'admin';
    const isEmployee = userProfile?.role === 'funcionario';
    const startDate = options?.dateRange?.start;
    const endDate = options?.dateRange?.end;

    const baseQuery = startDate && endDate
      ? getSalesLedgerDateRangeQuery(user.uid, isAdmin ? 'all' : 'own', startDate, endDate)
      : getSalesLedgerQuery(user.uid, isAdmin ? 'all' : 'own');

    const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): SaleRecord[] =>
      snapshot.docs.map((d) => {
        const raw = d.data();
        let dateVal = raw.date;
        if (dateVal && typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
          dateVal = dateVal.toDate().toISOString();
        } else if (dateVal instanceof Date) {
          dateVal = dateVal.toISOString();
        } else {
          dateVal = String(dateVal || new Date().toISOString());
        }

        // Normaliza tags mantendo o contrato Tag[] — preserva objetos com name/color,
        // converte strings para { name: string }. Não destrói atributos de Tag de pedidos web.
        const tags: Tag[] = Array.isArray(raw.tags)
          ? raw.tags.map((t: unknown) => {
              if (t && typeof t === 'object' && 'name' in t) return t as Tag;
              if (typeof t === 'string') return { name: t } as Tag;
              return { name: String(t) } as Tag;
            })
          : [];

        return {
          ...raw,
          id: d.id,
          date: dateVal,
          tags,
        } as SaleRecord;
      });

    let ownSales: SaleRecord[] = [];
    let assignedSales: SaleRecord[] = [];

    const publish = () => {
      const map = new Map<string, SaleRecord>();
      [...ownSales, ...assignedSales].forEach((s) => map.set(s.id, s));
      const list = [...map.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setAllSales(list);
      setLoading(false);

      // Se o ledger estiver vazio e ainda não tiver feito sync, sincroniza pedidos existentes
      if (list.length === 0 && !hasAutoSyncedRef.current) {
        hasAutoSyncedRef.current = true;
        firebaseLedgerService.syncExistingOrdersToLedger(user.uid, isAdmin).catch((err) => {
          console.warn('Erro ao sincronizar pedidos existentes com o ledger:', err);
        });
      }
    };

    const unsubscribers = [
      onSnapshot(
        baseQuery,
        (snapshot) => {
          ownSales = mapSnapshot(snapshot);
          publish();
        },
        (err) => {
          console.error('useSalesLedger: erro ao escutar vendas:', err);
          setLoading(false);
        }
      ),
    ];

    if (isEmployee) {
      const assignedQuery = startDate && endDate
        ? getSalesLedgerDateRangeQuery(user.uid, 'assigned', startDate, endDate)
        : getSalesLedgerQuery(user.uid, 'assigned');

      unsubscribers.push(
        onSnapshot(
          assignedQuery,
          (snapshot) => {
            assignedSales = mapSnapshot(snapshot);
            publish();
          },
          (err) => {
            console.error('useSalesLedger: erro nas vendas atribuídas:', err);
            setLoading(false);
          }
        )
      );
    }

    return () => unsubscribers.forEach((u) => u());
  }, [user, userProfile?.role, options?.dateRange?.start, options?.dateRange?.end]);

  // Filtro de equipe (multi-usuário)
  const teamFilteredSales = useMemo(() => {
    const filterIds = options?.teamUserIds;
    if (!filterIds || filterIds.length === 0 || filterIds.includes('all')) {
      return allSales;
    }

    return allSales.filter((sale) => {
      if (filterIds.includes('unassigned') && !sale.assignedTo) return true;
      if (sale.assignedTo && filterIds.includes(sale.assignedTo)) return true;
      if (sale.userId && filterIds.includes(sale.userId)) return true;
      return false;
    });
  }, [allSales, options?.teamUserIds]);

  // Intervalo de datas para o período atual
  const dateRange = useMemo(
    () => getLedgerDateRange(period, { start: customStart, end: customEnd }),
    [period, customStart, customEnd]
  );

  // Vendas filtradas por período e equipe
  const salesInPeriod = useMemo(() => {
    return teamFilteredSales.filter((sale) => {
      const d = new Date(sale.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [teamFilteredSales, dateRange]);

  // Vendas válidas: DESCARTA pedidos cancelados!
  const validSales = useMemo(() => {
    return salesInPeriod.filter((s) => s.status !== 'cancelled');
  }, [salesInPeriod]);

  // Métricas calculadas para o período
  const stats = useMemo(() => {
    const totalCount = validSales.length;
    const completedSales = validSales.filter((s) => s.status === 'completed');

    // Faturamento realizado (pedidos concluídos)
    const completedRevenue = completedSales.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Total de vendas válidas (inclui andamento e concluídos)
    const totalValidAmount = validSales.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Total efetivamente recebido/pago
    const totalPaid = validSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

    // Ticket Médio no período
    const averageTicket = totalCount > 0 ? totalValidAmount / totalCount : 0;
    const completedAverageTicket = completedSales.length > 0 ? completedRevenue / completedSales.length : 0;

    // Métricas de cancelados (descartados)
    const cancelledSales = salesInPeriod.filter((s) => s.status === 'cancelled');
    const cancelledCount = cancelledSales.length;
    const cancelledAmount = cancelledSales.reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      totalSalesCount: totalCount,
      completedCount: completedSales.length,
      completedRevenue,
      totalValidAmount,
      totalPaid,
      averageTicket,
      completedAverageTicket,
      cancelledCount,
      cancelledAmount,
    };
  }, [validSales, salesInPeriod]);

  // Métricas históricas globais (todo o histórico da empresa, descartando cancelados)
  const allTimeStats = useMemo(() => {
    const validAllTime = teamFilteredSales.filter((s) => s.status !== 'cancelled');
    const totalAllTimeRevenue = validAllTime
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalAllTimeAmount = validAllTime.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalAllTimeCount = validAllTime.length;
    const allTimeAverageTicket = totalAllTimeCount > 0 ? totalAllTimeAmount / totalAllTimeCount : 0;

    return {
      totalAllTimeRevenue,
      totalAllTimeAmount,
      totalAllTimeCount,
      allTimeAverageTicket,
    };
  }, [teamFilteredSales]);

  const setCustomDateRange = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod('custom');
  }, []);

  return {
    allSales,
    salesInPeriod,
    validSales,
    period,
    setPeriod,
    customStart,
    customEnd,
    setCustomDateRange,
    dateRange,
    stats,
    allTimeStats,
    loading,
  };
}
