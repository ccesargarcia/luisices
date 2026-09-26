/**
 * Subsistema de Observabilidade, Telemetria e Gestão de Custos - Luisices
 */

const { MODEL_PRICING_USD, BUSINESS_TIMEZONE, PROVIDER_TIMEZONE, MODEL_CONFIG } = require('./config');

/**
 * Calcula custo estimado em USD com base na tabela tarifária oficial
 */
function calculateTokenCost(model = 'default', promptTokens = 0, candidatesTokens = 0, reasoningTokens = 0) {
  const pricing = MODEL_PRICING_USD[model] || MODEL_PRICING_USD['default'];
  const totalCandidateTokens = candidatesTokens + reasoningTokens;
  const promptCost = (promptTokens / 1_000_000) * pricing.promptPerMillion;
  const candidatesCost = (totalCandidateTokens / 1_000_000) * pricing.candidatesPerMillion;
  return Number((promptCost + candidatesCost).toFixed(6));
}

/**
 * Formata chaves de data no fuso de negócios
 */
function getDateKeys(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const year = parts.find((p) => p.type === 'year')?.value || '2026';
    return {
      dailyKey: `${year}-${month}-${day}`,
      monthlyKey: `${year}-${month}`,
    };
  } catch {
    const iso = date.toISOString();
    return {
      dailyKey: iso.split('T')[0],
      monthlyKey: iso.slice(0, 7),
    };
  }
}

/**
 * Registra log detalhado e atualiza agregados diários e mensais com quebra por modelo
 */
async function recordAiUsage(db, record = {}) {
  const {
    userId = 'anon',
    action = 'chat',
    requestedModel = '',
    usedModel = 'gemini-2.5-flash',
    promptTokens = 0,
    candidatesTokens = 0,
    reasoningTokens = 0,
    totalTokens = promptTokens + candidatesTokens + reasoningTokens,
    cacheHit = false,
    durationMs = 0,
    status = 'success',
    errorMessage = null,
    itemId = null,
    isEstimatedUsage = false,
    attempts = [],
  } = record;

  const costUsd = calculateTokenCost(usedModel, promptTokens, candidatesTokens, reasoningTokens);
  const now = new Date();
  const { dailyKey, monthlyKey } = getDateKeys(now);

  const logEntry = {
    userId,
    action,
    requestedModel,
    model: usedModel,
    promptTokens,
    candidatesTokens,
    reasoningTokens,
    totalTokens,
    estimatedCostUsd: costUsd,
    isEstimatedUsage,
    attempts: Array.isArray(attempts) ? attempts.map((attempt) => ({
      model: attempt.model || usedModel,
      status: attempt.status || status,
      usageKnown: Boolean(attempt.usageKnown),
      promptTokens: Number(attempt.promptTokens) || 0,
      candidatesTokens: Number(attempt.candidatesTokens) || 0,
      reasoningTokens: Number(attempt.reasoningTokens) || 0,
      totalTokens: Number(attempt.totalTokens) || 0,
    })) : [],
    cacheHit,
    durationMs,
    status,
    errorMessage: errorMessage ? String(errorMessage).slice(0, 300) : null,
    itemId: itemId || null,
    timestamp: now.toISOString(),
    dailyKey,
    monthlyKey,
  };

  if (!db) {
    return logEntry;
  }

  try {
    const FieldValue = db.FieldValue || require('firebase-admin').firestore.FieldValue;
    const usageAttempts = logEntry.attempts.length ? logEntry.attempts : [{
      model: usedModel,
      status,
      usageKnown: true,
      promptTokens,
      candidatesTokens,
      reasoningTokens,
      totalTokens,
    }];

    // 1. Grava log individual
    await db.collection('ai_usage_logs').add({
      ...logEntry,
      createdAt: FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : now.toISOString(),
    });

    // 2. Atualiza agregado diário atômico com quebra por modelo
    const dailyRef = db.doc(`ai_usage_daily/${dailyKey}`);
    const monthlyRef = db.doc(`ai_usage_monthly/${monthlyKey}`);
    await dailyRef.set({
      date: dailyKey,
      totalRequests: FieldValue.increment ? FieldValue.increment(1) : 1,
      totalTokens: FieldValue.increment ? FieldValue.increment(totalTokens) : totalTokens,
      totalPromptTokens: FieldValue.increment ? FieldValue.increment(promptTokens) : promptTokens,
      totalCandidatesTokens: FieldValue.increment ? FieldValue.increment(candidatesTokens) : candidatesTokens,
      totalReasoningTokens: FieldValue.increment ? FieldValue.increment(reasoningTokens) : reasoningTokens,
      totalCostUsd: FieldValue.increment ? FieldValue.increment(costUsd) : costUsd,
      updatedAt: now.toISOString(),
    }, { merge: true });

    // Conta tentativas por modelo, inclusive falhas; só soma custo/token quando o provedor informou uso.
    for (const attempt of usageAttempts) {
      const modelKey = String(attempt.model || usedModel || 'gemini-2.5-flash').replace(/\./g, '_');
      const attemptCost = attempt.usageKnown
        ? calculateTokenCost(attempt.model || usedModel, attempt.promptTokens, attempt.candidatesTokens, attempt.reasoningTokens)
        : 0;
      await dailyRef.set({
        [`models.${modelKey}.requests`]: FieldValue.increment ? FieldValue.increment(1) : 1,
        [`models.${modelKey}.tokens`]: FieldValue.increment ? FieldValue.increment(attempt.totalTokens) : attempt.totalTokens,
        [`models.${modelKey}.costUsd`]: FieldValue.increment ? FieldValue.increment(attemptCost) : attemptCost,
        [`models.${modelKey}.unknownUsageAttempts`]: FieldValue.increment && !attempt.usageKnown ? FieldValue.increment(1) : (!attempt.usageKnown ? 1 : 0),
      }, { merge: true });
      await monthlyRef.set({
        [`models.${modelKey}.requests`]: FieldValue.increment ? FieldValue.increment(1) : 1,
        [`models.${modelKey}.tokens`]: FieldValue.increment ? FieldValue.increment(attempt.totalTokens) : attempt.totalTokens,
        [`models.${modelKey}.costUsd`]: FieldValue.increment ? FieldValue.increment(attemptCost) : attemptCost,
        [`models.${modelKey}.unknownUsageAttempts`]: FieldValue.increment && !attempt.usageKnown ? FieldValue.increment(1) : (!attempt.usageKnown ? 1 : 0),
      }, { merge: true });
    }

    // 3. Atualiza agregado mensal atômico
    await monthlyRef.set({
      month: monthlyKey,
      totalRequests: FieldValue.increment ? FieldValue.increment(1) : 1,
      totalTokens: FieldValue.increment ? FieldValue.increment(totalTokens) : totalTokens,
      totalCostUsd: FieldValue.increment ? FieldValue.increment(costUsd) : costUsd,
      updatedAt: now.toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[recordAiUsage] Falha ao registrar telemetria no Firestore:', err.message);
  }

  return logEntry;
}

/**
 * Consulta métricas consolidadas com contrato 100% compatível com frontend (R11 & P2)
 */
async function getAiUsageSummary(db) {
  const now = new Date();
  const { dailyKey, monthlyKey } = getDateKeys(now);

  let dailyData = { totalRequests: 0, totalTokens: 0, totalCostUsd: 0, models: {} };
  let monthlyData = { totalRequests: 0, totalTokens: 0, totalCostUsd: 0 };
  let recentLogs = [];
  let isFirestoreAvailable = Boolean(db);

  if (db) {
    try {
      const [dailyDoc, monthlyDoc, recentSnap] = await Promise.all([
        db.doc(`ai_usage_daily/${dailyKey}`).get(),
        db.doc(`ai_usage_monthly/${monthlyKey}`).get(),
        db.collection('ai_usage_logs').orderBy('timestamp', 'desc').limit(15).get(),
      ]);

      if (dailyDoc && dailyDoc.exists && typeof dailyDoc.data === 'function') {
        dailyData = dailyDoc.data() || dailyData;
      }
      if (monthlyDoc && monthlyDoc.exists && typeof monthlyDoc.data === 'function') {
        monthlyData = monthlyDoc.data() || monthlyData;
      }
      if (recentSnap && recentSnap.docs && recentSnap.docs.length > 0) {
        recentLogs = recentSnap.docs.map((d) => {
          const dt = (typeof d.data === 'function' ? d.data() : d) || {};
          return {
            id: d.id,
            model: dt.model || 'gemini-2.5-flash',
            action: dt.action || 'chat',
            promptTokens: dt.promptTokens || 0,
            candidatesTokens: dt.candidatesTokens || 0,
            reasoningTokens: dt.reasoningTokens || 0,
            totalTokens: dt.totalTokens || 0,
            timestamp: dt.timestamp || new Date().toISOString(),
            userId: dt.userId || null,
          };
        });
      }
    } catch (err) {
      isFirestoreAvailable = false;
      console.warn('[getAiUsageSummary] Erro ao ler dados no Firestore:', err.message);
    }
  }

  // Fuso de reset do Gemini no horário do Pacífico (PT / America/Los_Angeles)
  let providerReset = new Date();
  try {
    const ptFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PROVIDER_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const ptParts = ptFormatter.formatToParts(now);
    const ptYear = ptParts.find((p) => p.type === 'year')?.value || '2026';
    const ptMonth = ptParts.find((p) => p.type === 'month')?.value || '01';
    const ptDay = ptParts.find((p) => p.type === 'day')?.value || '01';
    
    // Meia-noite do dia seguinte em Los Angeles
    const nextDay = new Date(Date.UTC(Number(ptYear), Number(ptMonth) - 1, Number(ptDay) + 1, 8, 0, 0));
    providerReset = nextDay;
  } catch {
    providerReset.setUTCHours(8, 0, 0, 0);
    if (providerReset < now) {
      providerReset.setUTCDate(providerReset.getUTCDate() + 1);
    }
  }

  const dailyLimit = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT) || null;
  const monthlyLimit = Number(process.env.GEMINI_MONTHLY_REQUEST_LIMIT) || null;
  const dailyUsed = dailyData.requests || dailyData.totalRequests || 0;
  const monthlyUsed = monthlyData.requests || monthlyData.totalRequests || 0;

  // Extrai uso observado por modelo de forma factual
  const flashObserved = dailyData.models?.['gemini-2_5-flash'] || dailyData.models?.['gemini-2.5-flash'] || { requests: 0, tokens: 0 };
  const liteObserved = dailyData.models?.['gemini-2_5-flash-lite'] || dailyData.models?.['gemini-2.5-flash-lite'] || { requests: 0, tokens: 0 };
  const hasAnyModelBreakdown = Boolean(dailyData.models && Object.keys(dailyData.models).length);

  const models = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Modelo principal para chat operacional, tool calls e visão rápida.',
      category: 'Produção (Padrão)',
      isDefault: true,
      isActive: true,
      daily: {
        used: flashObserved.requests || dailyUsed,
        limit: dailyLimit,
        percentage: dailyLimit ? Math.min(100, Math.round(((flashObserved.requests || dailyUsed) / dailyLimit) * 100)) : null,
      },
      rpm: { used: null, limit: null },
      monthly: { used: monthlyData.models?.['gemini-2_5-flash']?.requests ?? null },
      tpmLimit: null,
      unknownUsageAttempts: dailyData.models?.['gemini-2_5-flash']?.unknownUsageAttempts || 0,
      liveStatus: !isFirestoreAvailable ? 'INDISPONIVEL' : (flashObserved.requests ? 'DADOS_REGISTRADOS' : (dailyUsed && !hasAnyModelBreakdown ? 'METRICA_INCOMPLETA' : 'SEM_DADOS')),
      liveCode: null,
      liveMessage: !isFirestoreAvailable ? 'Falha na leitura de telemetria' : (flashObserved.requests ? 'Uso registrado no Firestore; API não sondada' : (dailyUsed && !hasAnyModelBreakdown ? 'Há uso agregado sem separação por modelo' : 'Sem chamadas registradas no período')),
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      description: 'Modelo econômico para fallback, resumos e alta taxa de requisições.',
      category: 'Produção (Fallback)',
      isDefault: false,
      isActive: false,
      daily: {
        used: liteObserved.requests || 0,
        limit: dailyLimit,
        percentage: dailyLimit ? Math.min(100, Math.round(((liteObserved.requests || 0) / dailyLimit) * 100)) : null,
      },
      rpm: { used: null, limit: null },
      monthly: { used: monthlyData.models?.['gemini-2_5-flash-lite']?.requests ?? null },
      tpmLimit: null,
      unknownUsageAttempts: dailyData.models?.['gemini-2_5-flash-lite']?.unknownUsageAttempts || 0,
      liveStatus: !isFirestoreAvailable ? 'INDISPONIVEL' : (liteObserved.requests ? 'DADOS_REGISTRADOS' : (dailyUsed && !hasAnyModelBreakdown ? 'METRICA_INCOMPLETA' : 'SEM_DADOS')),
      liveCode: null,
      liveMessage: !isFirestoreAvailable ? 'Falha na leitura de telemetria' : (liteObserved.requests ? 'Uso registrado no Firestore; API não sondada' : (dailyUsed && !hasAnyModelBreakdown ? 'Há uso agregado sem separação por modelo' : 'Sem chamadas registradas no período')),
    },
  ];

  return {
    success: true,
    isAvailable: isFirestoreAvailable,
    activeModel: MODEL_CONFIG.PRIMARY_CHAT_MODEL,
    provider: 'Google Gemini API (cota do provedor não sondada)',
    resetsAt: null,
    daily: {
      used: dailyUsed,
      limit: dailyLimit,
      percentage: dailyLimit ? Math.min(100, Math.round((dailyUsed / dailyLimit) * 100)) : null,
    },
    totalDaily: {
      used: dailyUsed,
      limit: dailyLimit,
      percentage: dailyLimit ? Math.min(100, Math.round((dailyUsed / dailyLimit) * 100)) : null,
    },
    totalMonthly: {
      used: monthlyUsed,
      limit: monthlyLimit,
      percentage: monthlyLimit ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : null,
    },
    models,
    recentLogs,
    timezone: BUSINESS_TIMEZONE,
    providerTimezone: PROVIDER_TIMEZONE,
    today: {
      date: dailyKey,
      requests: dailyUsed,
      tokens: dailyData.tokens || dailyData.totalTokens || 0,
      estimatedCostUsd: Number((dailyData.totalCostUsd || 0).toFixed(4)),
    },
    month: {
      month: monthlyKey,
      requests: monthlyUsed,
      tokens: monthlyData.totalTokens || 0,
      estimatedCostUsd: Number((monthlyData.totalCostUsd || 0).toFixed(4)),
    },
    providerQuota: {
      resetAt: null,
      status: 'unverified',
      notes: 'A API não foi sondada; este painel mostra somente uso registrado pelo Luisices.',
    },
  };
}

module.exports = {
  calculateTokenCost,
  getDateKeys,
  recordAiUsage,
  getAiUsageSummary,
};
