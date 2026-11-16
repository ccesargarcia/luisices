import { createRequire } from 'node:module';
import { getFirebaseAdmin } from './_firebaseAdmin.js';

export const maxDuration = 60;

const require = createRequire(import.meta.url);
const { assertActiveSession } = require('../functions/common/helpers.js');
const { createAiServices } = require('../functions/ai/index.js');
const { mapToHttpsError } = require('../functions/ai/httpsError.js');

function mapHttpsErrorStatus(code?: string): number {
  switch (code) {
    case 'unauthenticated':
      return 401;
    case 'permission-denied':
      return 403;
    case 'invalid-argument':
      return 400;
    case 'resource-exhausted':
      return 429;
    case 'deadline-exceeded':
      return 504;
    default:
      return 500;
  }
}

export default async function handler(
  req: {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
  },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
    };
  },
) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const rawAuth = req.headers?.authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : String(rawAuth || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: { code: 'unauthenticated', message: 'Requer autenticação.' } });
  }

  try {
    const { auth, firestore } = getFirebaseAdmin();
    const decoded = await auth.verifyIdToken(match[1].trim(), true);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const callableRequest: Record<string, unknown> = {
      auth: { uid: decoded.uid, token: decoded },
      data: body,
    };

    const { profile } = await assertActiveSession(callableRequest, { db: firestore });
    callableRequest.authProfile = profile;

    const apiKey = typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY : '';
    const aiServices = createAiServices(
      { firestore: () => firestore, auth: () => auth },
      apiKey,
    );
    const result = await aiServices.handlers.aiAgentChat(callableRequest);
    return res.status(200).json(result);
  } catch (err) {
    const mapped = mapToHttpsError(err);
    const statusCode = mapHttpsErrorStatus(mapped?.code);
    return res.status(statusCode).json({
      error: {
        code: mapped?.code || 'internal',
        message: mapped?.message || 'Erro interno ao processar o Copiloto de IA.',
      },
    });
  }
}
