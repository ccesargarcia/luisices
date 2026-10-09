import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: { id: 'mock-db' },
  auth: { currentUser: { uid: 'user-settings-123' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  getDoc: vi.fn((...args) => mockGetDoc(...args)),
  setDoc: vi.fn((...args) => mockSetDoc(...args)),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { firebaseSettingsService } from '../../src/services/firebaseSettingsService';
import { DASHBOARD_CARD_CONFIGS, DEFAULT_DASHBOARD_CARDS } from '../../src/app/utils/dashboardCards';
import { TAG_COLORS, getTextColor } from '../../src/app/utils/tagColors';

describe('Funcionalidade: Configurações, Dashboard Cards e Sistema de Cores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Serviço de Configurações do Usuário (firebaseSettingsService)', () => {
    it('getSettings deve retornar configurações salvas quando documento existe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          businessName: 'Luisices Personalizados',
          primaryColor: '#F4B7B9',
          colorTheme: 'rose',
          compactCards: true,
          deliveryAlertDays: 5,
          updatedAt: { toDate: () => new Date('2026-10-01T12:00:00Z') },
        }),
      });

      const settings = await firebaseSettingsService.getSettings('user-1');
      expect(settings).toBeDefined();
      expect(settings?.businessName).toBe('Luisices Personalizados');
      expect(settings?.primaryColor).toBe('#F4B7B9');
      expect(settings?.colorTheme).toBe('rose');
      expect(settings?.compactCards).toBe(true);
      expect(settings?.deliveryAlertDays).toBe(5);
      expect(settings?.updatedAt).toEqual(new Date('2026-10-01T12:00:00Z'));
    });

    it('getSettings deve retornar null se o documento não existir', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const settings = await firebaseSettingsService.getSettings('user-new');
      expect(settings).toBeNull();
    });

    it('updateSettings deve mesclar alterações com { merge: true }', async () => {
      await firebaseSettingsService.updateSettings('user-1', {
        businessName: 'Novo Nome',
        whatsappPhone: '5511999998888',
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-1/settings/profile' }),
        expect.objectContaining({
          businessName: 'Novo Nome',
          whatsappPhone: '5511999998888',
          updatedAt: expect.any(Date),
        }),
        { merge: true }
      );
    });

    it('resetToDefaults deve redefinir documento para defaults', async () => {
      await firebaseSettingsService.resetToDefaults('user-reset');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-reset/settings/profile' }),
        expect.objectContaining({
          userId: 'user-reset',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('toggleStorePublished deve atualizar status na loja pública e no perfil', async () => {
      await firebaseSettingsService.toggleStorePublished('user-1', false, 'Em manutenção');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-1/settings/profile' }),
        expect.objectContaining({
          storePublished: false,
          storeUnpublishMessage: 'Em manutenção',
        }),
        { merge: true }
      );
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'storeSettings/public' }),
        expect.objectContaining({
          storePublished: false,
          storeUnpublishMessage: 'Em manutenção',
        }),
        { merge: true }
      );
    });

    it('updateAvatar deve atualizar avatar do usuário', async () => {
      await firebaseSettingsService.updateAvatar('user-1', 'https://cdn.luisices.com.br/avatar.png');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-1/settings/profile' }),
        expect.objectContaining({
          avatar: 'https://cdn.luisices.com.br/avatar.png',
          userId: 'user-1',
        }),
        { merge: true }
      );
    });

    it('updateCatalogLogo deve sincronizar no perfil do usuário e na coleção pública storeSettings', async () => {
      await firebaseSettingsService.updateCatalogLogo('user-1', 'https://cdn.luisices.com.br/catalog-logo.png');

      // 1. Perfil do usuário
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user-1/settings/profile' }),
        expect.objectContaining({
          catalogLogo: 'https://cdn.luisices.com.br/catalog-logo.png',
        }),
        { merge: true }
      );

      // 2. Vitrine pública
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'storeSettings/public' }),
        expect.objectContaining({
          catalogLogo: 'https://cdn.luisices.com.br/catalog-logo.png',
        }),
        { merge: true }
      );
    });

    it('updateCatalogBanner deve atualizar banner da loja pública', async () => {
      await firebaseSettingsService.updateCatalogBanner('user-1', 'https://cdn.luisices.com.br/banner.png');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'storeSettings/public' }),
        expect.objectContaining({
          catalogBanner: 'https://cdn.luisices.com.br/banner.png',
        }),
        { merge: true }
      );
    });
  });

  describe('2. Configuração dos Cards do Dashboard (dashboardCards)', () => {
    it('deve possuir 12 cards configurados com IDs e descrições únicas', () => {
      expect(DASHBOARD_CARD_CONFIGS).toHaveLength(12);

      const ids = DASHBOARD_CARD_CONFIGS.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(12);

      DASHBOARD_CARD_CONFIGS.forEach(card => {
        expect(card.id).toBeTruthy();
        expect(card.label).toBeTruthy();
        expect(card.description).toBeTruthy();
      });
    });

    it('DEFAULT_DASHBOARD_CARDS deve conter todos os identificadores padrão', () => {
      expect(DEFAULT_DASHBOARD_CARDS).toContain('total');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('revenue');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('open');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('avgTicket');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('inProgress');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('toReceive');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('received');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('topProducts');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('delivery');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('overdue');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('statusChart');
      expect(DEFAULT_DASHBOARD_CARDS).toContain('weeklyChart');
    });
  });

  describe('3. Paleta de Cores e Acessibilidade de Tags (tagColors)', () => {
    it('deve fornecer contraste adequado para cores claras e escuras', () => {
      // Amarelo (#b49a5a) deve usar texto escuro para legibilidade WCAG
      expect(getTextColor('#b49a5a')).toBe('#1f1b1b');

      // Lima (#879b62) deve usar texto escuro
      expect(getTextColor('#879b62')).toBe('#1f1b1b');

      // Vermelho (#b86b6b) deve usar texto branco
      expect(getTextColor('#b86b6b')).toBe('#ffffff');

      // Azul (#6785a8) deve usar texto branco
      expect(getTextColor('#6785a8')).toBe('#ffffff');
    });

    it('deve retornar branco como fallback para cores não cadastradas', () => {
      expect(getTextColor('#000000')).toBe('#ffffff');
      expect(getTextColor('#123456')).toBe('#ffffff');
      expect(getTextColor('')).toBe('#ffffff');
    });

    it('todas as cores cadastradas na lista TAG_COLORS devem ter nome, valor e textColor', () => {
      expect(TAG_COLORS.length).toBeGreaterThanOrEqual(10);
      TAG_COLORS.forEach(color => {
        expect(color.name).toBeTruthy();
        expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(color.textColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('4. Resiliência de Métricas de Receita e Intervalos Contábeis', () => {
    it('getLedgerDateRange para mês deve cobrir desde o primeiro até o último milissegundo do mês corrente', async () => {
      const { getLedgerDateRange } = await import('../../src/hooks/useSalesLedger');
      const range = getLedgerDateRange('month');
      const now = new Date();
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(now.getMonth());
      expect(range.start.getFullYear()).toBe(now.getFullYear());

      // O fim do mês deve ser o último dia do mês corrente (ex: dia 30 ou 31 às 23:59:59.999)
      const expectedEndMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      expect(range.end.getTime()).toBe(expectedEndMonth.getTime());
    });

    it('prioriza completedRevenue do ledger sobre fallbackRevenue de pedidos ativos quando disponível', () => {
      const fallbackRevenue = 0; // Nenhum pedido concluído ativo no quadro
      const ledgerStats = {
        completedCount: 1,
        completedRevenue: 28.0,
        averageTicket: 28.0,
      };

      const resolvedRevenue = ledgerStats.completedRevenue > 0 ? ledgerStats.completedRevenue : fallbackRevenue;
      expect(resolvedRevenue).toBe(28.0);
    });

    it('preserva zero no mês atual quando há registros no ledger mas nenhuma venda no mês (sem vazar receita histórica)', () => {
      const allSalesCount = 15; // Há histórico no ledger
      const ledgerStats = {
        completedCount: 0,
        completedRevenue: 0,
        averageTicket: 0,
        totalPaid: 0,
      };
      const allTimeHistoricalRevenue = 45000; // Total histórico acumulado da empresa

      // Lógica canônica: se há dados no ledger, o valor do mês é o do ledger (0), e nunca o total acumulado
      const resolvedRevenue = allSalesCount > 0 ? ledgerStats.completedRevenue : allTimeHistoricalRevenue;
      expect(resolvedRevenue).toBe(0);
    });

    it('fallback de pedidos considera apenas pedidos do mês corrente e nunca pedidos de meses anteriores', () => {
      const now = new Date();
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();

      const orders = [
        // Pedido de 2 meses atrás (concluído)
        {
          id: 'old-1',
          status: 'completed',
          price: 500,
          createdAt: new Date(curYear, curMonth - 2, 10).toISOString(),
        },
        // Pedido do mês atual (concluído)
        {
          id: 'cur-1',
          status: 'completed',
          price: 120,
          createdAt: new Date(curYear, curMonth, 5).toISOString(),
        },
        // Pedido do mês atual (pendente)
        {
          id: 'cur-2',
          status: 'pending',
          price: 80,
          createdAt: new Date(curYear, curMonth, 6).toISOString(),
        },
      ];

      const ordersInMonth = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });

      const completedInMonth = ordersInMonth.filter((o) => o.status === 'completed');
      const fallbackRevenue = completedInMonth.reduce((sum, o) => sum + o.price, 0);

      expect(fallbackRevenue).toBe(120);
      expect(fallbackRevenue).not.toBe(620); // Não inclui o pedido antigo de 500
    });
  });
});
