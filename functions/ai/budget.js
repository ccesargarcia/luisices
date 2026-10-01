/**
 * Subsistema de Orçamento Distribuído e Rate Limiting - Luisices
 *
 * Controla consumo diário de tokens por usuário e projeto com reserva
 * atômica antes da chamada e reconciliação pós-execução via Firestore e memória.
 */

const crypto = require('crypto');
const { BUDGET_LIMITS, BUSINESS_TIMEZONE } = require('./config');

// Estado compartilhado em memória persistente entre requisições no mesmo processo Node
const GLOBAL_IN_MEMORY_DAILY_USAGE = new Map(); // key -> { tokens, requests }
const GLOBAL_RESERVATION_STATES = new Map(); // reservationId -> { status: 'RESERVED' | 'COMMITTED' | 'RELEASED', reservedTokens, key, projectKey }

class AiBudgetManager {
  constructor(firestoreInstance = null) {
    this.firestore = firestoreInstance;
    this.inMemoryDailyUsage = GLOBAL_IN_MEMORY_DAILY_USAGE;
    this.reservationStates = GLOBAL_RESERVATION_STATES;
  }

  getTodayDateKey() {
    const now = new Date();
    try {
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: BUSINESS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(now);
      const day = parts.find((p) => p.type === 'day')?.value || '01';
      const month = parts.find((p) => p.type === 'month')?.value || '01';
      const year = parts.find((p) => p.type === 'year')?.value || '2026';
      return `${year}-${month}-${day}`;
    } catch {
      return now.toISOString().split('T')[0];
    }
  }

  /**
   * Tenta reservar orçamento atomicamente antes da chamada à API Gemini
   */
  async reserveBudget(userId, estimatedTokens = 2000) {
    const uid = String(userId || 'anon');
    const dateKey = this.getTodayDateKey();
    const reservationKey = `${uid}_${dateKey}`;
    const projectKey = `project_${dateKey}`;
    const reservationId = `${reservationKey}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Produção deve falhar fechada: um erro do Firestore nunca reduz o teto global a memória local.
    if (this.firestore) {
      if (typeof this.firestore.runTransaction !== 'function') {
        throw new Error('Controle distribuído de orçamento indisponível. Tente novamente.');
      }
      try {
        const userRef = this.firestore.doc(`ai_budget_daily/${reservationKey}`);
        const projectRef = this.firestore.doc(`ai_budget_daily/${projectKey}`);
        const reservationRef = this.firestore.doc(`ai_budget_reservations/${reservationId}`);

        await this.firestore.runTransaction(async (transaction) => {
          const [userDoc, projectDoc] = await Promise.all([
            transaction.get(userRef),
            transaction.get(projectRef),
          ]);

          const userData = userDoc.exists ? userDoc.data() : { tokens: 0, requests: 0 };
          const projectData = projectDoc.exists ? projectDoc.data() : { tokens: 0, requests: 0 };

          const currentUserTokens = userData.tokens || 0;
          const currentUserRequests = userData.requests || 0;
          const currentProjectTokens = projectData.tokens || 0;

          // Valida limite individual do usuário
          if (currentUserTokens + estimatedTokens > BUDGET_LIMITS.DAILY_TOKENS_PER_USER) {
            const err = new Error(`Limite diário de uso de IA atingido (${BUDGET_LIMITS.DAILY_TOKENS_PER_USER} tokens/dia).`);
            err.code = 'resource-exhausted';
            throw err;
          }

          if (currentUserRequests >= BUDGET_LIMITS.DAILY_REQUESTS_PER_USER) {
            const err = new Error(`Limite diário de requisições de IA atingido (${BUDGET_LIMITS.DAILY_REQUESTS_PER_USER} requisições/dia).`);
            err.code = 'resource-exhausted';
            throw err;
          }

          // Valida teto diário global do projeto
          if (currentProjectTokens + estimatedTokens > BUDGET_LIMITS.DAILY_TOKENS_PROJECT_CEILING) {
            const err = new Error(`Teto global de projeto atingido (${BUDGET_LIMITS.DAILY_TOKENS_PROJECT_CEILING} tokens/dia).`);
            err.code = 'resource-exhausted';
            throw err;
          }

          const nowIso = new Date().toISOString();

          // 1. Atualiza limite do usuário
          transaction.set(userRef, {
            userId: uid,
            date: dateKey,
            tokens: currentUserTokens + estimatedTokens,
            requests: currentUserRequests + 1,
            updatedAt: nowIso,
          }, { merge: true });

          // 2. Atualiza teto global do projeto
          transaction.set(projectRef, {
            date: dateKey,
            tokens: currentProjectTokens + estimatedTokens,
            requests: (projectData.requests || 0) + 1,
            updatedAt: nowIso,
          }, { merge: true });

          // 3. Persiste o documento de reserva com estado no Firestore para idempotência multi-instância
          transaction.set(reservationRef, {
            reservationId,
            userId: uid,
            date: dateKey,
            reservationKey,
            projectKey,
            reservedTokens: estimatedTokens,
            status: 'RESERVED',
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        });

        // Atualiza cache local de estado
        this.reservationStates.set(reservationId, {
          status: 'RESERVED',
          reservedTokens: estimatedTokens,
          key: reservationKey,
          projectKey,
        });

        return { reservationId, reservedTokens: estimatedTokens, success: true, key: reservationKey, projectKey };
      } catch (err) {
        if (err.code === 'resource-exhausted') throw err;
        console.error('[AiBudgetManager] Falha na reserva distribuída:', err.message);
        throw new Error('Não foi possível reservar o orçamento de IA. Tente novamente.');
      }
    }

    // Fallback em memória (para testes e ambientes locais)
    const current = this.inMemoryDailyUsage.get(reservationKey) || { tokens: 0, requests: 0 };
    const projectCurrent = this.inMemoryDailyUsage.get(projectKey) || { tokens: 0, requests: 0 };

    if (current.tokens + estimatedTokens > BUDGET_LIMITS.DAILY_TOKENS_PER_USER) {
      const err = new Error(`Limite diário de uso de IA atingido (${BUDGET_LIMITS.DAILY_TOKENS_PER_USER} tokens/dia).`);
      err.code = 'resource-exhausted';
      throw err;
    }
    if (projectCurrent.tokens + estimatedTokens > BUDGET_LIMITS.DAILY_TOKENS_PROJECT_CEILING) {
      const err = new Error(`Teto global de projeto atingido (${BUDGET_LIMITS.DAILY_TOKENS_PROJECT_CEILING} tokens/dia).`);
      err.code = 'resource-exhausted';
      throw err;
    }
    if (current.requests >= BUDGET_LIMITS.DAILY_REQUESTS_PER_USER) {
      const err = new Error(`Limite diário de requisições de IA atingido (${BUDGET_LIMITS.DAILY_REQUESTS_PER_USER} requisições/dia).`);
      err.code = 'resource-exhausted';
      throw err;
    }

    this.inMemoryDailyUsage.set(reservationKey, {
      tokens: current.tokens + estimatedTokens,
      requests: current.requests + 1,
    });
    this.inMemoryDailyUsage.set(projectKey, {
      tokens: projectCurrent.tokens + estimatedTokens,
      requests: projectCurrent.requests + 1,
    });

    this.reservationStates.set(reservationId, {
      status: 'RESERVED',
      reservedTokens: estimatedTokens,
      key: reservationKey,
      projectKey,
    });

    return { reservationId, reservedTokens: estimatedTokens, success: true, key: reservationKey, projectKey };
  }

  /**
   * Reconcilia a reserva com o consumo real de tokens (estritamente idempotente entre instâncias)
   */
  async reconcileBudget(reservation, actualTokens = 0) {
    if (!reservation || !reservation.reservationId) return;
    const resId = reservation.reservationId;
    const localState = this.reservationStates.get(resId);

    // Proteção de idempotência local rápida
    if (localState && localState.status !== 'RESERVED') {
      return;
    }

    const reserved = reservation.reservedTokens || localState?.reservedTokens || 0;
    const diff = (actualTokens || 0) - reserved;
    const resKey = reservation.key || localState?.key;
    const projKey = reservation.projectKey || localState?.projectKey || `project_${this.getTodayDateKey()}`;

    if (this.firestore) {
      if (typeof this.firestore.runTransaction !== 'function') {
        throw new Error('Reconciliação distribuída do orçamento indisponível.');
      }
      try {
        const reservationRef = this.firestore.doc(`ai_budget_reservations/${resId}`);
        const userRef = this.firestore.doc(`ai_budget_daily/${resKey}`);
        const projectRef = this.firestore.doc(`ai_budget_daily/${projKey}`);

        await this.firestore.runTransaction(async (transaction) => {
          const resDoc = await transaction.get(reservationRef);
          if (!resDoc.exists) {
            throw new Error('Reserva de orçamento não encontrada.');
          }
          if (resDoc.data()?.status !== 'RESERVED') {
            // Já reconciliado ou liberado por outra instância
            return;
          }

          if (diff !== 0) {
            const [userDoc, projectDoc] = await Promise.all([
              transaction.get(userRef),
              transaction.get(projectRef),
            ]);

            if (userDoc.exists) {
              const uData = userDoc.data();
              transaction.update(userRef, {
                tokens: Math.max(0, (uData.tokens || 0) + diff),
                updatedAt: new Date().toISOString(),
              });
            }

            if (projectDoc.exists) {
              const pData = projectDoc.data();
              transaction.update(projectRef, {
                tokens: Math.max(0, (pData.tokens || 0) + diff),
                updatedAt: new Date().toISOString(),
              });
            }
          }

          transaction.update(reservationRef, {
            status: 'COMMITTED',
            actualTokens,
            reconciledAt: new Date().toISOString(),
          });
        });
        if (localState) localState.status = 'COMMITTED';
        return;
      } catch (err) {
        console.error('[AiBudgetManager] Erro ao reconciliar budget no Firestore:', err.message);
        throw new Error('Não foi possível reconciliar o orçamento de IA.');
      }
    }

    if (localState) localState.status = 'COMMITTED';

    if (diff !== 0) {
      const current = this.inMemoryDailyUsage.get(resKey);
      if (current) {
        current.tokens = Math.max(0, current.tokens + diff);
        this.inMemoryDailyUsage.set(resKey, current);
      }
      const projectCurrent = this.inMemoryDailyUsage.get(projKey);
      if (projectCurrent) {
        projectCurrent.tokens = Math.max(0, projectCurrent.tokens + diff);
        this.inMemoryDailyUsage.set(projKey, projectCurrent);
      }
    }
  }

  /**
   * Libera reserva em caso de falha imediata antes da execução (estritamente idempotente entre instâncias)
   */
  async releaseBudget(reservation) {
    if (!reservation || !reservation.reservationId) return;
    const resId = reservation.reservationId;
    const localState = this.reservationStates.get(resId);

    if (localState && localState.status !== 'RESERVED') {
      return;
    }

    const reserved = reservation.reservedTokens || localState?.reservedTokens || 0;
    const resKey = reservation.key || localState?.key;
    const projKey = reservation.projectKey || localState?.projectKey || `project_${this.getTodayDateKey()}`;
    if (!resKey || reserved === 0) return;

    if (this.firestore) {
      if (typeof this.firestore.runTransaction !== 'function') {
        throw new Error('Liberação distribuída do orçamento indisponível.');
      }
      try {
        const reservationRef = this.firestore.doc(`ai_budget_reservations/${resId}`);
        const userRef = this.firestore.doc(`ai_budget_daily/${resKey}`);
        const projectRef = this.firestore.doc(`ai_budget_daily/${projKey}`);

        await this.firestore.runTransaction(async (transaction) => {
          const resDoc = await transaction.get(reservationRef);
          if (!resDoc.exists) {
            throw new Error('Reserva de orçamento não encontrada.');
          }
          if (resDoc.data()?.status !== 'RESERVED') {
            return;
          }

          const [userDoc, projectDoc] = await Promise.all([
            transaction.get(userRef),
            transaction.get(projectRef),
          ]);

          if (userDoc.exists) {
            const uData = userDoc.data();
            transaction.update(userRef, {
              tokens: Math.max(0, (uData.tokens || 0) - reserved),
              updatedAt: new Date().toISOString(),
            });
          }

          if (projectDoc.exists) {
            const pData = projectDoc.data();
            transaction.update(projectRef, {
              tokens: Math.max(0, (pData.tokens || 0) - reserved),
              updatedAt: new Date().toISOString(),
            });
          }

          transaction.update(reservationRef, {
            status: 'RELEASED',
            releasedAt: new Date().toISOString(),
          });
        });
        if (localState) localState.status = 'RELEASED';
        return;
      } catch (err) {
        console.error('[AiBudgetManager] Erro ao liberar budget no Firestore:', err.message);
        throw new Error('Não foi possível liberar o orçamento de IA.');
      }
    }

    if (localState) localState.status = 'RELEASED';

    const current = this.inMemoryDailyUsage.get(resKey);
    if (current) {
      current.tokens = Math.max(0, current.tokens - reserved);
      this.inMemoryDailyUsage.set(resKey, current);
    }
    const projectCurrent = this.inMemoryDailyUsage.get(projKey);
    if (projectCurrent) {
      projectCurrent.tokens = Math.max(0, projectCurrent.tokens - reserved);
      this.inMemoryDailyUsage.set(projKey, projectCurrent);
    }
  }
}

module.exports = {
  AiBudgetManager,
};
