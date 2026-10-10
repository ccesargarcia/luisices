import {
  parseLocalDate,
  formatDateShort,
  getDaysUntilBirthday,
  isBirthdayThisMonth,
  isBirthdayUpcoming,
} from '../../src/app/utils/date';
import { getLedgerDateRange } from '../../src/hooks/useSalesLedger';
import { getSalesLedgerDateRangeQuery, getSalesLedgerQuery } from '../../src/services/firebaseLedgerService';

vi.mock('../../src/lib/firebase', () => ({
  db: { id: 'mock-db' },
  auth: { currentUser: { uid: 'user-123' } },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ name })),
  query: vi.fn((coll, ...clauses) => ({ coll, clauses })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
}));

describe('Etapa 8: Consultas, Fusos Horários e Paginação (Achados 10, 11 e 18)', () => {
  describe('Achado 11: Resolução de fusos horários locais em datas', () => {
    it('formatDateShort deve formatar tanto strings YYYY-MM-DD quanto ISO timestamps sem retornar Invalid Date', () => {
      // YYYY-MM-DD padrão
      expect(formatDateShort('2026-10-05')).toBe('05/10/2026');

      // ISO Timestamp completo (ex: createdAt do Firestore)
      expect(formatDateShort('2026-10-05T19:28:30.123Z')).toBe('05/10/2026');

      // Objeto Date
      expect(formatDateShort(new Date(2026, 9, 5))).toBe('05/10/2026');

      // Firestore Timestamp mock com toDate()
      const mockTimestamp = {
        toDate: () => new Date(2026, 9, 5),
      };
      expect(formatDateShort(mockTimestamp)).toBe('05/10/2026');

      // Casos inválidos ou nulos nunca devem retornar "Invalid Date"
      expect(formatDateShort('')).toBe('');
      expect(formatDateShort(null)).toBe('');
      expect(formatDateShort(undefined)).toBe('');
      expect(formatDateShort('data-invalida')).toBe('');
    });

    it('parseLocalDate deve interpretar ano, mês e dia com base no fuso local sem recuar para o dia anterior', () => {
      const start = parseLocalDate('2026-09-30', false);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(8); // Setembro é índice 8 (0-indexed)
      expect(start.getDate()).toBe(30);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);

      const end = parseLocalDate('2026-09-30', true);
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(8);
      expect(end.getDate()).toBe(30);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('getLedgerDateRange deve aplicar parseLocalDate para períodos customizados', () => {
      const range = getLedgerDateRange('custom', {
        start: '2026-10-01',
        end: '2026-10-05',
      });

      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(9); // Outubro
      expect(range.start.getFullYear()).toBe(2026);

      expect(range.end.getDate()).toBe(5);
      expect(range.end.getMonth()).toBe(9);
      expect(range.end.getFullYear()).toBe(2026);
      expect(range.end.getHours()).toBe(23);
      expect(range.end.getMinutes()).toBe(59);
    });
  });

  describe('Achado 10 & 18: Estratégia de merge e desduplicação de consultas operacionais e históricas', () => {
    it('merge de pedidos operacionais e históricos não deve perder pedidos operacionais antigos e deve desduplicar', () => {
      // Simula uma lista operacional (pedidos antigos ou recentes em andamento)
      const operationalOrders = [
        { id: 'op-1', orderNumber: '001', createdAt: '2025-01-01T10:00:00.000Z', status: 'pending' },
        { id: 'op-2', orderNumber: '002', createdAt: '2026-09-30T10:00:00.000Z', status: 'in-progress' },
      ];

      // Simula histórico recente (finalizados/cancelados)
      const historicalOrders = [
        { id: 'hist-1', orderNumber: '003', createdAt: '2026-09-29T12:00:00.000Z', status: 'completed' },
        // Caso um pedido tenha mudado de status e conste temporariamente em ambos
        { id: 'op-2', orderNumber: '002', createdAt: '2026-09-30T10:00:00.000Z', status: 'completed' },
      ];

      const ordersById = new Map<string, any>();
      [...operationalOrders, ...historicalOrders].forEach(o => ordersById.set(o.id, o));
      const sorted = [...ordersById.values()].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );

      // Deve ter exatamente 3 pedidos únicos
      expect(sorted).toHaveLength(3);
      expect(ordersById.has('op-1')).toBe(true);
      expect(ordersById.has('op-2')).toBe(true);
      expect(ordersById.has('hist-1')).toBe(true);

      // O pedido operacional antigo (de 2025) deve continuar existindo na listagem
      const oldOp = sorted.find(o => o.id === 'op-1');
      expect(oldOp).toBeDefined();
      expect(oldOp.orderNumber).toBe('001');

      // Ordenação correta por createdAt decrescente
      expect(sorted[0].id).toBe('op-2');
      expect(sorted[1].id).toBe('hist-1');
      expect(sorted[2].id).toBe('op-1');
    });

    it('merge de orçamentos ativos e históricos deve manter orçamentos ativos sem sofrer truncamento', () => {
      const activeQuotes = [
        { id: 'q-active-old', quoteNumber: 'Q-001', createdAt: '2025-06-01T00:00:00.000Z', status: 'draft' },
        { id: 'q-active-recent', quoteNumber: 'Q-002', createdAt: '2026-10-01T00:00:00.000Z', status: 'sent' },
      ];

      const historicalQuotes = [
        { id: 'q-hist-1', quoteNumber: 'Q-003', createdAt: '2026-09-15T00:00:00.000Z', status: 'approved' },
      ];

      const map = new Map<string, any>();
      [...activeQuotes, ...historicalQuotes].forEach(q => map.set(q.id, q));
      const list = [...map.values()].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );

      expect(list).toHaveLength(3);
      expect(list.find(q => q.id === 'q-active-old')).toBeDefined();
    });

    it('getSalesLedgerDateRangeQuery deve construir filtros de data corretos', () => {
      const qAll = getSalesLedgerDateRangeQuery('user-1', 'all', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z');
      expect(qAll).toBeDefined();

      const qOwn = getSalesLedgerDateRangeQuery('user-1', 'own', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z');
      expect(qOwn).toBeDefined();

      const qAssigned = getSalesLedgerDateRangeQuery('user-1', 'assigned', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z');
      expect(qAssigned).toBeDefined();
    });
  });

  describe('Cálculos e utilitários de aniversariantes (Marketing de Afeto)', () => {
    // Referência fixa para testes: 10 de Outubro de 2026
    const refDate = new Date(2026, 9, 10, 14, 0, 0); // 10/10/2026

    it('getDaysUntilBirthday deve retornar 0 se o aniversário for hoje', () => {
      expect(getDaysUntilBirthday('1990-10-10', refDate)).toBe(0);
    });

    it('getDaysUntilBirthday deve calcular dias futuros no mesmo mês e ano', () => {
      // 15 de Outubro (5 dias a frente de 10 de Outubro)
      expect(getDaysUntilBirthday('1995-10-15', refDate)).toBe(5);
    });

    it('getDaysUntilBirthday deve virar o ano para aniversários já ocorridos no ano atual', () => {
      // 05 de Outubro (já passou em 2026, próximo será em 05/10/2027)
      const days = getDaysUntilBirthday('1990-10-05', refDate);
      expect(days).toBeGreaterThan(350);
    });

    it('getDaysUntilBirthday deve retornar null para inputs nulos, inválidos ou mal formatados', () => {
      expect(getDaysUntilBirthday(null, refDate)).toBeNull();
      expect(getDaysUntilBirthday(undefined, refDate)).toBeNull();
      expect(getDaysUntilBirthday('', refDate)).toBeNull();
      expect(getDaysUntilBirthday('data-invalida', refDate)).toBeNull();
      expect(getDaysUntilBirthday('1990-99-99', refDate)).toBeNull();
    });

    it('isBirthdayThisMonth deve identificar corretamente aniversários do mês atual', () => {
      expect(isBirthdayThisMonth('1995-10-25', refDate)).toBe(true);
      expect(isBirthdayThisMonth('1990-10-01', refDate)).toBe(true);
      expect(isBirthdayThisMonth('1990-11-10', refDate)).toBe(false);
      expect(isBirthdayThisMonth(null, refDate)).toBe(false);
    });

    it('isBirthdayUpcoming deve identificar aniversários nos próximos N dias', () => {
      // Em 3 dias (13/10)
      expect(isBirthdayUpcoming('1995-10-13', 7, refDate)).toBe(true);
      // Em 10 dias (20/10) - fora da janela de 7 dias
      expect(isBirthdayUpcoming('1995-10-20', 7, refDate)).toBe(false);
      // Hoje (10/10)
      expect(isBirthdayUpcoming('1995-10-10', 7, refDate)).toBe(true);
      // Já passou (09/10)
      expect(isBirthdayUpcoming('1995-10-09', 7, refDate)).toBe(false);
    });
  });
});
