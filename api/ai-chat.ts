import { createRequire } from 'node:module';
import {
  ApiHttpError,
  assertActiveSessionFromBearer,
  getFirebaseAdmin,
  getVertexAiContext,
} from './_firebaseAdmin.js';

export const maxDuration = 60;

const require = createRequire(import.meta.url);
const { createAiServices } = require('../functions/ai/index.js');

function resolveErrorResponse(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof ApiHttpError) {
    return { status: err.statusCode, code: err.code, message: err.message };
  }
  const anyErr = err as { code?: string; message?: string; statusCode?: number } | null;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : 'internal';
  const message =
    typeof anyErr?.message === 'string' && anyErr.message
      ? anyErr.message
      : 'Erro interno ao processar o Copiloto de IA.';

  switch (code) {
    case 'unauthenticated':
      return { status: 401, code, message };
    case 'permission-denied':
      return { status: 403, code, message };
    case 'invalid-argument':
      return { status: 400, code, message };
    case 'resource-exhausted':
      return { status: 429, code, message };
    case 'deadline-exceeded':
      return { status: 504, code, message };
    default:
      return { status: anyErr?.statusCode || 500, code, message };
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

  try {
    const { auth, firestore } = getFirebaseAdmin();
    const session = await assertActiveSessionFromBearer(
      auth,
      firestore,
      req.headers?.authorization,
    );

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const callableRequest = {
      auth: { uid: session.uid, token: session.token },
      authProfile: session.profile,
      data: body,
    };

    const apiKey = typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY : '';
    const aiServices = createAiServices(
      { firestore: () => firestore, auth: () => auth },
      apiKey,
      { vertexAi: getVertexAiContext('southamerica-east1') },
    );
    const result = await aiServices.handlers.aiAgentChat(callableRequest);
    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message } = resolveErrorResponse(err);
    return res.status(status).json({ error: { code, message } });
  }
}
