import { createRequire } from 'node:module';
import { getFirebaseAdmin } from './_firebaseAdmin.js';

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
  getFirebaseAdmin();
  if (!process.env.VERCEL_MCP_ORIGIN) {
    process.env.VERCEL_MCP_ORIGIN = 'https://beta.luisices.com.br';
  }
  if (!process.env.VERCEL_MCP_DOMAIN) {
    process.env.VERCEL_MCP_DOMAIN = 'beta.luisices.com.br';
  }

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
