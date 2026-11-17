import { createRequire } from 'node:module';
import { ApiHttpError, assertBetaEdgeRequest, getFirebaseAdmin } from './_firebaseAdmin.js';

export const maxDuration = 30;

const require = createRequire(import.meta.url);

export default async function handler(
  req: {
    path?: string;
    url?: string;
    query?: Record<string, string | string[] | undefined>;
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
  if (!process.env.VERCEL_MCP_ORIGIN) {
    process.env.VERCEL_MCP_ORIGIN = 'https://api.beta.luisices.com.br';
  }
  if (!process.env.VERCEL_MCP_DOMAIN) {
    process.env.VERCEL_MCP_DOMAIN = 'api.beta.luisices.com.br';
  }
  if (!process.env.VERCEL_MCP_APP_ORIGIN) {
    process.env.VERCEL_MCP_APP_ORIGIN = 'https://beta.luisices.com.br';
  }
  if (!process.env.VERCEL_MCP_DOCUMENTATION_URL) {
    process.env.VERCEL_MCP_DOCUMENTATION_URL = 'https://api.beta.luisices.com.br/openapi.json';
  }

  try {
    assertBetaEdgeRequest(req.headers?.['x-beta-edge-secret']);
  } catch (error) {
    const statusCode = error instanceof ApiHttpError ? error.statusCode : 403;
    return res.status(statusCode).json({ error: { code: 'permission-denied', message: 'Origem não autorizada.' } });
  }

  getFirebaseAdmin();

  const rawMcpPath = req.query?.mcpPath;
  const mcpPath = Array.isArray(rawMcpPath) ? rawMcpPath[0] : rawMcpPath;
  if (typeof mcpPath === 'string') {
    req.path = `/${mcpPath.replace(/^\/+/, '')}`;
  } else if (!req.path && req.url) {
    req.path = req.url.split('?')[0].replace(/^\/api\/mcp-server\/?/, '/');
  }

  const { chatGptToolsEndpoint } = require('../functions/mcp/endpoint.js');
  return chatGptToolsEndpoint(req, res);
}
