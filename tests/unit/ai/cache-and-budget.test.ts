import { describe, it, expect } from 'vitest';
const { AiResponseCache } = require('../../../functions/ai/cache');
const { AiBudgetManager } = require('../../../functions/ai/budget');

describe('IA-05 & IA-10: Cache Bounded e Orçamento Distribuído', () => {
  describe('AiResponseCache (LRU, TTL & Single-Flight)', () => {
    it('deve armazenar e recuperar respostas válidas com todos os campos intactos', () => {
      const cache = new AiResponseCache({ ttlMs: 1000, maxEntries: 10 });
      const key = cache.buildKey({ userId: 'u1', action: 'chat', prompt: 'quanto custa?' });
      const fullResponse = {
        reply: 'Custa R$ 50,00',
        orderDraft: null,
        whatsappDraft: null,
        pricingEstimate: { suggestedUnitPrice: 50.0 },
        galleryItems: [],
      };

      cache.set(key, fullResponse);
      const retrieved = cache.get(key);

      expect(retrieved).toBeDefined();
      expect(retrieved.reply).toBe('Custa R$ 50,00');
      expect(retrieved.pricingEstimate.suggestedUnitPrice).toBe(50.0);
    });

    it('não deve retornar dados após expiração do TTL', async () => {
      const cache = new AiResponseCache({ ttlMs: 50, maxEntries: 10 });
      const key = cache.buildKey({ userId: 'u1', action: 'chat', prompt: 'teste' });

      cache.set(key, { reply: 'Resposta' });
      await new Promise((resolve) => setTimeout(resolve, 70));

      expect(cache.get(key)).toBeNull();
    });

    it('deve descartar a entrada mais antiga quando maxEntries for atingido (LRU)', () => {
      const cache = new AiResponseCache({ ttlMs: 10000, maxEntries: 2 });
      const key1 = 'key-1';
      const key2 = 'key-2';
      const key3 = 'key-3';

      cache.set(key1, { reply: '1' });
      cache.set(key2, { reply: '2' });
      // Acessa key1 para torná-la mais recente
      cache.get(key1);
      // Insere key3 -> deve remover key2 (oldest)
      cache.set(key3, { reply: '3' });

      expect(cache.get(key1)).not.toBeNull();
      expect(cache.get(key3)).not.toBeNull();
      expect(cache.get(key2)).toBeNull();
    });

    it('deve deduplicar requisições concorrentes idênticas (Single-Flight)', async () => {
      const cache = new AiResponseCache();
      let callCount = 0;
      const executeFn = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { reply: 'Resultado pesado' };
      };

      const key = 'flight-key';
      const [res1, res2] = await Promise.all([
        cache.coalesce(key, executeFn),
        cache.coalesce(key, executeFn),
      ]);

      expect(callCount).toBe(1);
      expect(res1.result.reply).toBe('Resultado pesado');
      expect(res2.result.reply).toBe('Resultado pesado');
    });
  });

  describe('AiBudgetManager (Reserva Atômica e Reconciliação)', () => {
    it('deve reservar orçamento e permitir reconciliação com consumo real', async () => {
      const budget = new AiBudgetManager(null);
      const res = await budget.reserveBudget('user-budget-1', 1000);

      expect(res.success).toBe(true);
      expect(res.reservedTokens).toBe(1000);

      // Reconcilia com 1250 tokens reais
      await budget.reconcileBudget(res, 1250);
      const usage = budget.inMemoryDailyUsage.get(res.key);
      expect(usage.tokens).toBe(1250);
    });

    it('deve bloquear quando o limite diário de tokens for excedido', async () => {
      const budget = new AiBudgetManager(null);
      // Consome até perto do limite
      await budget.reserveBudget('user-max', 140000);

      // Tentativa de reservar mais além do teto de 150000 deve estourar
      await expect(budget.reserveBudget('user-max', 20000)).rejects.toThrow('Limite diário de uso de IA atingido');
    });

    it('deve liberar reserva integralmente em caso de releaseBudget', async () => {
      const budget = new AiBudgetManager(null);
      const res = await budget.reserveBudget('user-release', 1000);
      await budget.releaseBudget(res);

      const usage = budget.inMemoryDailyUsage.get(res.key);
      expect(usage.tokens).toBe(0);
    });
  });
});
