import { createRequire } from 'node:module';
import {
  assertActiveSessionFromBearer,
  getFirebaseAdmin,
  mapCoreErrorToHttp,
} from './_firebaseAdmin.js';

const require = createRequire(import.meta.url);
const mcpCallables = require('../functions/mcp/callables.js');

const ACTION_MAP: Record<string, (req: unknown) => Promise<unknown>> = {
  getStatus: mcpCallables.getMcpSettingsStatus,
  createApiKey: mcpCallables.createMcpApiKey,
  updateApiKeyScopes: mcpCallables.updateMcpApiKeyScopes,
  toggleApiKey: mcpCallables.toggleMcpApiKey,
  revokeApiKey: mcpCallables.revokeMcpApiKey,
  toggleGlobal: mcpCallables.toggleGlobalMcp,
  setUserEligibility: mcpCallables.setUserMcpEligibility,
  revokeSession: mcpCallables.revokeMcpSession,
  getAuditLogs: mcpCallables.getMcpAuditLogs,
  getOpenApiSchema: mcpCallables.getMcpOpenApiSchema,
};

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
    const { action, ...payload } = (body || {}) as { action?: string } & Record<string, unknown>;
    const targetHandler = action ? ACTION_MAP[action] : undefined;
    if (typeof targetHandler !== 'function') {
      return res.status(400).json({ error: { code: 'invalid-argument', message: 'Ação MCP inválida.' } });
    }

    const callableReq = {
      auth: { uid: session.uid, token: session.token },
      authProfile: session.profile,
      data: payload,
    };

    const result = await targetHandler(callableReq);
    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Erro ao processar integração MCP.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
