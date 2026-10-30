/**
 * Consulta de cota do Resend, isolada do caminho de envio e de recebimento.
 * Mantém a autorização e o fallback histórico em Firestore.
 */

const moduleInitializationStartedAt = process.hrtime.bigint();

const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const { onCall } = require('../common/sentryFunctions');
const { RESEND_API_KEY } = require('../common/secrets');
const { assertActiveSession } = require('../common/helpers');
const { withFirstInvocationSpan } = require('../common/sentry');

let moduleInitializationMs = null;

const getEmailUsage = onCall(
  { cors: true, maxInstances: 5, secrets: [RESEND_API_KEY] },
  withFirstInvocationSpan('getEmailUsage', async (request) => {
    const { profile: profileData } = await assertActiveSession(request);

    const isActive = profileData?.active !== false;
    const isUserAdmin = profileData?.role === 'admin';
    const emailsPerm = profileData?.permissions?.emails;
    const hasEmailPerm = isActive && (
      isUserAdmin ||
      emailsPerm === true ||
      (typeof emailsPerm === 'object' && emailsPerm !== null && Boolean(emailsPerm.view || emailsPerm.create))
    );
    if (!hasEmailPerm) {
      throw new HttpsError('permission-denied', 'Sem permissão para consultar a cota de e-mails.');
    }

    // 1. Sempre computar contagem real do Firestore para garantir feedback em tempo real
    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

    let firestoreTodayCount = 0;
    let firestoreMonthCount = 0;
    try {
      const [todaySnap, monthSnap] = await Promise.all([
        getFirestore().collection('sentEmails')
          .where('sentAt', '>=', startOfTodayUtc.toISOString())
          .count()
          .get(),
        getFirestore().collection('sentEmails')
          .where('sentAt', '>=', startOfMonthUtc.toISOString())
          .count()
          .get(),
      ]);
      firestoreTodayCount = todaySnap.data().count;
      firestoreMonthCount = monthSnap.data().count;
    } catch (fsErr) {
      console.warn('[getEmailUsage] Erro ao consultar sentEmails no Firestore:', fsErr);
    }

    // 2. Tentar consultar métricas oficiais do Resend
    let resendDailySent = 0;
    let resendMonthlySent = 0;
    let source = 'firestore_fallback';

    const apiKey = RESEND_API_KEY.value();
    if (apiKey) {
      try {
        const startOfTodayIso = `${now.toISOString().split('T')[0]}T00:00:00Z`;
        const startOfMonthIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;

        const [dailyRes, monthlyRes] = await Promise.all([
          fetch(`https://api.resend.com/emails/metrics?start_date=${startOfTodayIso}&metrics=sent,delivered`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Luisices-Functions/1.0',
            },
          }),
          fetch(`https://api.resend.com/emails/metrics?start_date=${startOfMonthIso}&metrics=sent,delivered`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Luisices-Functions/1.0',
            },
          }),
        ]);

        if (dailyRes.ok && monthlyRes.ok) {
          const dailyData = await dailyRes.json();
          const monthlyData = await monthlyRes.json();
          resendDailySent = Number(dailyData?.totals?.sent ?? 0);
          resendMonthlySent = Number(monthlyData?.totals?.sent ?? 0);
          source = 'resend_api';
          console.log(`[getEmailUsage] Resend metrics sucesso - Hoje: ${resendDailySent}, Mês: ${resendMonthlySent}`);
        } else {
          console.warn(`[getEmailUsage] Resend /emails/metrics status: daily=${dailyRes.status}, monthly=${monthlyRes.status}`);
        }
      } catch (err) {
        console.warn('[getEmailUsage] Erro ao consultar https://api.resend.com/emails/metrics:', err);
      }
    }

    const finalDailyUsed = Math.max(resendDailySent, firestoreTodayCount);
    const finalMonthlyUsed = Math.max(resendMonthlySent, firestoreMonthCount);

    const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const nextUtcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

    return {
      success: true,
      source,
      daily: {
        used: finalDailyUsed,
        limit: 100,
        sent: finalDailyUsed,
        received: 0,
        resetsAt: nextUtcMidnight.toISOString(),
      },
      monthly: {
        used: finalMonthlyUsed,
        limit: 3000,
        sent: finalMonthlyUsed,
        received: 0,
        resetsAt: nextUtcMonth.toISOString(),
      },
    };
  }, () => moduleInitializationMs)
);

moduleInitializationMs = Number((Number(process.hrtime.bigint() - moduleInitializationStartedAt) / 1e6).toFixed(2));

module.exports = { getEmailUsage };
