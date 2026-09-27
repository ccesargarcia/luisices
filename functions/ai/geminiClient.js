/**
 * Cliente Resiliente da API Gemini - Luisices
 *
 * Gerencia chamadas HTTP seguras com fallback controlado (máx 1 tentativa),
 * circuit breaker por modelo, timeout compartilhado cobrindo body stream e
 * extração sanitizada de tokens.
 */

const { TIMEOUTS, MODEL_CONFIG } = require('./config');

// Estado compartilhado de falhas dos modelos no processo Node
const SHARED_MODEL_FAILURES = new Map(); // model -> { count, lastFailedAt }

class GeminiClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.primaryModel = options.primaryModel || MODEL_CONFIG.PRIMARY_CHAT_MODEL;
    this.fallbackModels = options.fallbackModels || (options.fallbackModel ? [options.fallbackModel] : (Array.isArray(MODEL_CONFIG.FALLBACK_CHAT_MODELS) ? MODEL_CONFIG.FALLBACK_CHAT_MODELS : [MODEL_CONFIG.FALLBACK_CHAT_MODEL, 'gemini-3.1-flash-lite'].filter(Boolean)));
    this.fallbackModel = options.fallbackModel || this.fallbackModels[0] || MODEL_CONFIG.FALLBACK_CHAT_MODEL;
    this.modelFailures = SHARED_MODEL_FAILURES;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  isModelHealthy(model) {
    const info = this.modelFailures.get(model);
    if (!info) return true;
    if (info.count >= MODEL_CONFIG.CIRCUIT_BREAKER_FAIL_THRESHOLD) {
      if (Date.now() - info.lastFailedAt < MODEL_CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS) {
        return false; // Circuit aberto (em suspensão)
      }
      // Cooldown expirou, tenta reabilitar
      console.info(`[GeminiClient] Circuit breaker cooldown expirou para o modelo ${model}. Reabilitando modelo para nova tentativa.`);
      this.modelFailures.delete(model);
    }
    return true;
  }

  recordModelSuccess(model) {
    if (this.modelFailures.has(model)) {
      console.info(`[GeminiClient] Modelo ${model} restabelecido com sucesso. Resetando contador de falhas.`);
      this.modelFailures.delete(model);
    }
  }

  recordModelFailure(model, error) {
    const isFatalAuthError = error?.status === 401 || error?.status === 403;
    if (isFatalAuthError) return; // Erros de credenciais não são falha de saúde do modelo

    const current = this.modelFailures.get(model) || { count: 0, lastFailedAt: 0 };
    const nextCount = current.count + 1;
    this.modelFailures.set(model, {
      count: nextCount,
      lastFailedAt: Date.now(),
    });

    if (nextCount >= MODEL_CONFIG.CIRCUIT_BREAKER_FAIL_THRESHOLD) {
      console.warn(`[GeminiClient] Circuit breaker acionado para o modelo ${model} (${nextCount} falhas consecutivas). Suspenso por ${MODEL_CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s.`);
    }
  }

  /**
   * Executa geração de conteúdo com política estrita de fallback
   */
  async generateContent(payload, options = {}) {
    const key = options.apiKey || this.apiKey;
    if (!key) {
      const err = new Error('Chave GEMINI_API_KEY não configurada no ambiente.');
      err.code = 'failed-precondition';
      err.isNonRetryable = true;
      throw err;
    }

    const totalTimeoutMs = options.totalTimeoutMs || TIMEOUTS.CHAT_TOTAL_MS;
    const startTime = Date.now();

    const candidateModels = [
      options.primaryModel || this.primaryModel,
      ...(options.fallbackModels || this.fallbackModels || [this.fallbackModel]),
    ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i && this.isModelHealthy(m));

    if (candidateModels.length === 0) {
      // Se todos os modelos saudáveis estiverem suspensos, tenta a lista toda
      candidateModels.push(this.primaryModel, ...this.fallbackModels);
    }

    let lastError = null;
    let attempts = 0;
    const attemptLog = [];

    for (const model of candidateModels) {
      if (attempts > MODEL_CONFIG.MAX_FALLBACK_ATTEMPTS) break;
      attempts++;

      const elapsed = Date.now() - startTime;
      const remainingTime = totalTimeoutMs - elapsed;
      if (remainingTime <= 1000) {
        const timeoutErr = new Error(`Tempo total de execução excedido (${totalTimeoutMs}ms).`);
        timeoutErr.code = 'deadline-exceeded';
        throw timeoutErr;
      }

      const controller = new AbortController();
      const perAttemptTimeout = Math.min(remainingTime, 15000);
      const timeoutId = setTimeout(() => controller.abort(), perAttemptTimeout);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const attempt = { model, status: 'started', usageKnown: false };
      let attemptRecorded = false;

      try {
        const resp = await this.fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // O timeout cobre tanto a resposta quanto o streaming do corpo HTTP
        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          const status = resp.status;
          const error = new Error(`Gemini API error (Status ${status}): ${errBody.slice(0, 300)}`);
          error.status = status;
          attempt.status = `http_${status}`;
          attemptRecorded = true;
          attemptLog.push({ ...attempt });

          // Classificação de erros fatais de autenticação que afetam toda a conta (401, 403)
          if (status === 401 || status === 403) {
            error.isNonRetryable = true;
            this.recordModelFailure(model, error);
            throw error;
          }

          // Se status for 404 (modelo específico inexistente/descontinuado) ou 429 ou 5xx:
          // Grava a falha do modelo e tenta imediatamente o próximo da cascata
          this.recordModelFailure(model, error);
          lastError = error;
          continue;
        }

        const data = await resp.json();
        this.recordModelSuccess(model);

        // Validação da resposta
        const candidate = data?.candidates?.[0];
        if (!candidate) {
          const noCandidateErr = new Error('A API Gemini não retornou nenhum candidato de resposta.');
          attempt.status = 'empty_response';
          attemptRecorded = true;
          attemptLog.push({ ...attempt });
          this.recordModelFailure(model, noCandidateErr);
          lastError = noCandidateErr;
          continue;
        }

        const finishReason = candidate.finishReason;
        if (finishReason === 'SAFETY') {
          const safetyErr = new Error('A resposta foi bloqueada pelos filtros de segurança.');
          safetyErr.isBlocked = true;
          safetyErr.isNonRetryable = true;
          throw safetyErr;
        }

        const isTruncated = finishReason === 'MAX_TOKENS';

        // Extração de telemetria de tokens incluindo reasoning / thoughts (R14)
        const meta = data.usageMetadata || {};
        const promptTokens = meta.promptTokenCount || meta.promptTokens || 0;
        const candidatesTokens = meta.candidatesTokenCount || meta.candidatesTokens || 0;
        const reasoningTokens = meta.thoughtsTokenCount || meta.candidatesTokenDetails?.[0]?.thoughtsTokenCount || 0;
        const totalTokens = meta.totalTokenCount || meta.totalTokens || (promptTokens + candidatesTokens + reasoningTokens);
        attempt.status = isTruncated ? 'truncated' : 'success';
        attempt.usageKnown = Boolean(meta.totalTokenCount || meta.totalTokens || promptTokens || candidatesTokens || reasoningTokens);
        Object.assign(attempt, { promptTokens, candidatesTokens, reasoningTokens, totalTokens });
        attemptRecorded = true;
        attemptLog.push({ ...attempt });

        return {
          data,
          modelUsed: model,
          durationMs: Date.now() - startTime,
          tokens: {
            promptTokens,
            candidatesTokens,
            reasoningTokens,
            totalTokens,
          },
          attempts: attemptLog,
          finishReason,
          isTruncated,
        };
      } catch (err) {
        if (!attemptRecorded) {
          attempt.status = err?.name === 'AbortError' || err?.code === 'ABORT_ERR' ? 'timeout' : 'network_or_parse_error';
          attemptLog.push({ ...attempt });
          attemptRecorded = true;
        }
        if (err.isNonRetryable) {
          err.attempts = attemptLog;
          err.providerAttempted = true;
          throw err;
        }

        const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
        if (isTimeout) {
          const timeoutErr = new Error(`Modelo ${model} excedeu timeout de ${perAttemptTimeout}ms`);
          this.recordModelFailure(model, timeoutErr);
          lastError = timeoutErr;
        } else {
          this.recordModelFailure(model, err);
          lastError = err;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const finalError = lastError || new Error('Nenhum modelo Gemini disponível respondeu com sucesso.');
    finalError.attempts = attemptLog;
    finalError.providerAttempted = attemptLog.length > 0;
    throw finalError;
  }
}

module.exports = {
  GeminiClient,
};
