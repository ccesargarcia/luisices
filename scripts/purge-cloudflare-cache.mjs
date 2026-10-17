#!/usr/bin/env node

/**
 * Script Cirúrgico de Purge de Cache da Cloudflare para Rotas de Metadados MCP / OpenAPI
 * 
 * Uso:
 *   node scripts/purge-cloudflare-cache.mjs dev
 *   node scripts/purge-cloudflare-cache.mjs prod
 * 
 * Executa o purge somente nas URLs exatas de metadados, evitando purgar a zona inteira.
 */

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API_BASE = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'luisices.com.br';

const targetEnv = (process.argv[2] || 'dev').toLowerCase();
const isProd = targetEnv === 'prod' || targetEnv === 'production';
const domain = isProd ? 'api.luisices.com.br' : 'api.dev.luisices.com.br';

const URLS_TO_PURGE = [
  `https://${domain}/openapi.json`,
  `https://${domain}/openapi.yaml`,
  `https://${domain}/schema`,
  `https://${domain}/.well-known/ai-plugin.json`,
  `https://${domain}/ai-plugin.json`,
  `https://${domain}/.well-known/plugin.json`,
  `https://${domain}/plugin.json`,
  `https://${domain}/.well-known/oauth-protected-resource`,
  `https://${domain}/.well-known/oauth-authorization-server`,
  `https://${domain}/.well-known/openid-configuration`,
];

if (!API_TOKEN) {
  console.error('❌ ERRO: CLOUDFLARE_API_TOKEN não está configurado. Não é possível purgar o cache.');
  process.exit(1);
}

async function cfRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    const detail = payload.errors?.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(`Cloudflare API ${path} falhou (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  return payload.result;
}

async function main() {
  console.log(`🧹 Iniciando purge cirúrgico de cache para ambiente [${targetEnv.toUpperCase()}] (${domain})...`);

  const zones = await cfRequest(`/zones?name=${encodeURIComponent(ZONE_NAME)}&per_page=50`);
  const zone = zones.find((candidate) => candidate.name === ZONE_NAME);
  if (!zone) {
    throw new Error(`Zona Cloudflare ${ZONE_NAME} não localizada.`);
  }

  const result = await cfRequest(`/zones/${zone.id}/purge_cache`, {
    method: 'POST',
    body: JSON.stringify({
      files: URLS_TO_PURGE,
    }),
  });

  console.log(`✅ Purge executado com sucesso! ID: ${result.id}`);
  console.log('URLs purgadas:');
  URLS_TO_PURGE.forEach((url) => console.log(`  - ${url}`));
}

main().catch((error) => {
  console.error(`❌ Erro ao purgar cache Cloudflare: ${error.message}`);
  process.exit(1);
});
