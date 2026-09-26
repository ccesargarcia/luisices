import { describe, it, expect, vi } from 'vitest';
const { AiBudgetManager } = require('../../../functions/ai/budget');
const { downloadImageAsBase64 } = require('../../../functions/ai/handlers');
const { calculateRecipePricing } = require('../../../functions/ai/pricing/pricingCalculator');
const { AiToolsExecutor } = require('../../../functions/ai/tools');
const { recordAiUsage, getAiUsageSummary } = require('../../../functions/ai/usage');
const { AiDataRepositories } = require('../../../functions/ai/repositories');

describe('Revisão 3: Validação das Correções Críticas (P1 e P2)', () => {
  describe('1. Orçamento e Teto Global no Firestore (P1)', () => {
    it('deve aplicar teto diário global do projeto no Firestore atomicamente', async () => {
      const mockStore = new Map();
      const mockDb = {
        doc: (path: string) => ({
          path,
          get: async () => ({
            exists: mockStore.has(path),
            data: () => mockStore.get(path) || { tokens: 0, requests: 0 },
          }),
        }),
        runTransaction: async (updateFn: any) => {
          const transaction = {
            get: async (ref: any) => ({
              exists: mockStore.has(ref.path),
              data: () => mockStore.get(ref.path) || { tokens: 0, requests: 0 },
            }),
            set: (ref: any, data: any, opts?: any) => {
              const prev = mockStore.get(ref.path) || {};
              mockStore.set(ref.path, opts?.merge ? { ...prev, ...data } : data);
            },
            update: (ref: any, data: any) => {
              const prev = mockStore.get(ref.path) || {};
              mockStore.set(ref.path, { ...prev, ...data });
            },
          };
          return updateFn(transaction);
        },
      };

      const budget = new AiBudgetManager(mockDb);

      // Simula projeto já no limite (DAILY_TOKENS_PROJECT_CEILING)
      const today = budget.getTodayDateKey();
      mockStore.set(`ai_budget_daily/project_${today}`, {
        tokens: 4_999_000,
        requests: 500,
      });

      // Tentativa de reservar 2.000 tokens deve estourar o teto global (4.999.000 + 2.000 > 5.000.000)
      await expect(budget.reserveBudget('user-alpha', 2000)).rejects.toThrow(/Teto global de projeto atingido/);
    });

    it('deve persistir reservas no Firestore e garantir idempotência entre instâncias', async () => {
      const mockStore = new Map();
      const mockDb = {
        doc: (path: string) => ({ path }),
        runTransaction: async (updateFn: any) => {
          const transaction = {
            get: async (ref: any) => ({
              exists: mockStore.has(ref.path),
              data: () => mockStore.get(ref.path),
            }),
            set: (ref: any, data: any) => {
              mockStore.set(ref.path, data);
            },
            update: (ref: any, data: any) => {
              const prev = mockStore.get(ref.path) || {};
              mockStore.set(ref.path, { ...prev, ...data });
            },
          };
          return updateFn(transaction);
        },
      };

      // Instância A reserva 2.000 tokens
      const instanceA = new AiBudgetManager(mockDb);
      const res = await instanceA.reserveBudget('user-beta', 2000);
      expect(res.success).toBe(true);

      const resDocBefore = mockStore.get(`ai_budget_reservations/${res.reservationId}`);
      expect(resDocBefore.status).toBe('RESERVED');
      expect(resDocBefore.reservedTokens).toBe(2000);

      // Instância B (nova instância simulando autoscaling/restart) reconcilia com 1.200 tokens
      const instanceB = new AiBudgetManager(mockDb);
      await instanceB.reconcileBudget(res, 1200);

      const resDocAfter = mockStore.get(`ai_budget_reservations/${res.reservationId}`);
      expect(resDocAfter.status).toBe('COMMITTED');
      expect(resDocAfter.actualTokens).toBe(1200);

      // Repetição da reconciliação pela Instância A não deve alterar ou duplicar
      await instanceA.reconcileBudget(res, 1200);
      expect(mockStore.get(`ai_budget_reservations/${res.reservationId}`).status).toBe('COMMITTED');
    });

    it('deve falhar fechado se o Firestore estiver indisponível e não usar orçamento local em produção', async () => {
      const uid = `firestore-down-${Date.now()}`;
      const budget = new AiBudgetManager({
        doc: () => ({}),
        runTransaction: async () => { throw new Error('Firestore indisponível'); },
      });

      await expect(budget.reserveBudget(uid, 2000)).rejects.toThrow(/reservar o orçamento/);
      expect(budget.inMemoryDailyUsage.has(`${uid}_${budget.getTodayDateKey()}`)).toBe(false);
    });
  });

  describe('2. Proteção contra SSRF IPv6 e Streaming Limit (P1)', () => {
    it('deve bloquear qualquer literal IPv6 e formas mapeadas', async () => {
      await expect(downloadImageAsBase64('http://[::1]/secret.jpg')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('http://[fc00::1]/internal.png')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('http://[::ffff:127.0.0.1]/test.webp')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('http://[fe80::1]/linklocal.jpg')).rejects.toThrow(/SSRF/);
    });

    it('deve bloquear IPs hex/octais e portas não-padrão', async () => {
      await expect(downloadImageAsBase64('http://0x7f000001/bad.jpg')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('http://0177.0.0.1/bad.jpg')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('http://firebasestorage.googleapis.com:8080/image.jpg')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('http://user:pass@storage.googleapis.com/pic.png')).rejects.toThrow(/SSRF/);
      await expect(downloadImageAsBase64('https://example.com/image.jpg')).rejects.toThrow(/SSRF/);
    });

    it('deve abortar stream imediatamente durante a leitura progressiva sem carregar excesso de memória', async () => {
      let readCount = 0;
      const fakeStreamReader = {
        read: async () => {
          readCount++;
          if (readCount === 1) {
            return { done: false, value: new Uint8Array(500) };
          }
          if (readCount === 2) {
            // Emite bloco gigante que excede o teto de 1.000 bytes
            return { done: false, value: new Uint8Array(2000) };
          }
          return { done: true, value: undefined };
        },
        cancel: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        body: { getReader: () => fakeStreamReader },
      });

      await expect(
        downloadImageAsBase64('https://firebasestorage.googleapis.com/v0/b/bucket/o/img.jpg', 1000, 5000, mockFetch)
      ).rejects.toThrow(/excede o limite/);

      expect(fakeStreamReader.cancel).toHaveBeenCalled();
    });
  });

  describe('3. Consultas Operacionais e Paginação Un-truncated (P1)', () => {
    it('deve percorrer páginas no Firestore para recuperar faturamento total exato sem truncar em 200', async () => {
      const generatedOrders = Array.from({ length: 450 }, (_, i) => ({
        id: `ord-${i}`,
        data: () => ({
          orderNumber: `#${i}`,
          totalPrice: 100,
          paidAmount: 100,
          remainingAmount: 0,
          status: 'delivered',
          paymentStatus: 'paid',
          createdAt: new Date('2026-09-20T12:00:00Z'),
          deletedAt: null,
        }),
      }));

      const mockDb = {
        collection: () => ({
          where: () => ({
            limit: (batchSize: number) => ({
              get: async () => ({
                empty: false,
                docs: generatedOrders.slice(0, batchSize),
              }),
              startAfter: (lastDoc: any) => ({
                get: async () => {
                  const idx = generatedOrders.findIndex((d) => d.id === lastDoc.id);
                  const nextDocs = generatedOrders.slice(idx + 1, idx + 1 + batchSize);
                  return { empty: nextDocs.length === 0, docs: nextDocs };
                },
              }),
            }),
          }),
        }),
      };

      const repos = new AiDataRepositories(mockDb);
      const orders = await repos.getScopedOrders({ uid: 'admin-1', isAdmin: true }, { fetchAll: true });

      expect(orders.length).toBe(450);
      const totalRevenue = orders.reduce((acc, o) => acc + o.totalPrice, 0);
      expect(totalRevenue).toBe(45000);
    });

    it('deve percorrer todas as páginas dos vínculos não-admin e deduplicar resultados', async () => {
      const generated = Array.from({ length: 450 }, (_, i) => ({
        id: `linked-${i}`,
        data: () => ({ userId: 'u-page', createdBy: 'u-page', totalPrice: 10, deletedAt: null }),
      }));
      const mockDb = {
        collection: () => ({
          where: (field: string) => {
            const makeQuery = () => ({
            limit: (size: number) => {
              let cursorId: string | null = null;
              const query: any = {
                startAfter: (doc: any) => { cursorId = doc.id; return query; },
                get: async () => {
                  if (field !== 'userId' && field !== 'createdBy') return { docs: [] };
                  const start = cursorId ? generated.findIndex((d) => d.id === cursorId) + 1 : 0;
                  return { docs: generated.slice(start, start + size) };
                },
              };
              return query;
            },
            });
            return { ...makeQuery(), where: () => makeQuery() };
          },
        }),
      };

      const repos = new AiDataRepositories(mockDb);
      const orders = await repos.getScopedOrders({ uid: 'u-page', isAdmin: false });
      expect(orders).toHaveLength(450);
    });
  });

  describe('4. Telemetria e Transparência de Cotas (P2)', () => {
    it('deve sinalizar indisponibilidade honesta se a leitura do Firestore falhar', async () => {
      const mockFailingDb = {
        doc: () => ({
          get: async () => { throw new Error('Firestore connection timeout'); },
        }),
        collection: () => ({
          orderBy: () => ({
            limit: () => ({
              get: async () => { throw new Error('Firestore connection timeout'); },
            }),
          }),
        }),
      };

      const summary = await getAiUsageSummary(mockFailingDb);
      expect(summary.isAvailable).toBe(false);
      expect(summary.models[0].liveStatus).toBe('INDISPONIVEL');
      expect(summary.models[0].liveCode).toBeNull();
      expect(summary.daily.limit).toBeNull();
    });

    it('deve registrar reasoningTokens individualmente na telemetria', async () => {
      const entry = await recordAiUsage(null, {
        userId: 'dev-1',
        action: 'chat',
        usedModel: 'gemini-2.5-flash',
        promptTokens: 500,
        candidatesTokens: 200,
        reasoningTokens: 150,
      });

      expect(entry.reasoningTokens).toBe(150);
      expect(entry.totalTokens).toBe(850);
      expect(entry.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('deve persistir as tentativas e marcar uso desconhecido sem contar tokens inventados', async () => {
      const entry = await recordAiUsage(null, {
        userId: 'retry-user',
        usedModel: 'gemini-2.5-flash-lite',
        status: 'success',
        attempts: [
          { model: 'gemini-2.5-flash', status: 'timeout', usageKnown: false },
          { model: 'gemini-2.5-flash-lite', status: 'success', usageKnown: true, promptTokens: 50, candidatesTokens: 20, totalTokens: 70 },
        ],
      });

      expect(entry.attempts).toHaveLength(2);
      expect(entry.attempts[0].usageKnown).toBe(false);
      expect(entry.attempts[0].totalTokens).toBe(0);
      expect(entry.attempts[1].totalTokens).toBe(70);
    });
  });

  describe('5. Paridade Comercial de Preços e Tiers de Lote (P2)', () => {
    it('deve manter consistência exata de centavos para lote de 10 unidades com setup de 30 minutos', () => {
      const result = calculateRecipePricing({
        items: [{ name: 'Item', unitCost: 0, quantityUsed: 1, totalCost: 0 }],
        setupTimeMinutes: 30,
        productionTimeMinutes: 0,
        wasteMarginPercent: 0,
        profitMarginPercent: 40,
        paymentFeePercent: 14.5,
      });

      const tier10 = result.batchTiers.find((t: any) => t.quantity === 10);
      expect(tier10).toBeDefined();

      // unitPrice = R$ 3,10 -> totalPrice deve ser R$ 31,00 (3,10 * 10)
      expect(tier10.unitPrice).toBe(3.10);
      expect(tier10.totalPrice).toBe(31.00);
      expect(tier10.totalPrice).toBe(Math.round(tier10.unitPrice * 10 * 100) / 100);
    });

    it('deve retornar exatamente o mesmo valor total no tools.js ao consultar o tier de lote', async () => {
      const mockRepos = {
        getPricingSettings: async () => null,
      };

      const tools = new AiToolsExecutor(mockRepos);
      const estimate = await tools.executePricingEstimate({
        productName: 'Camiseta Personalizada',
        quantity: 10,
        rawMaterialsCost: 0,
        customizationCost: 0,
        laborTimeMinutes: 0,
        setupTimeMinutes: 30,
        profitMarginPercent: 40,
        paymentFeePercent: 14.5,
        wasteMarginPercent: 0,
      }, { uid: 'u1', role: 'admin' });

      expect(estimate.suggestedUnitPrice).toBe(3.10);
      expect(estimate.suggestedTotalPrice).toBe(31.00);
    });
  });
});
