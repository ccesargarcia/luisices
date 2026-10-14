#!/usr/bin/env node

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API_BASE = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'luisices.com.br';
const RULESET_PHASE = 'http_request_cache_settings';
const RULE_REF = 'luisices_mcp_api_cache_bypass';
const RULE_DESCRIPTION = 'Luisices API and MCP: bypass edge cache except metadata';
const RULE_EXPRESSION = '(http.host in {"api.dev.luisices.com.br" "api.luisices.com.br"} and not http.request.uri.path in {"/openapi.json" "/openapi.yaml" "/schema" "/.well-known/ai-plugin.json" "/ai-plugin.json" "/.well-known/plugin.json" "/plugin.json" "/.well-known/oauth-protected-resource" "/.well-known/oauth-authorization-server" "/.well-known/openid-configuration"})';

if (!API_TOKEN) {
  throw new Error('CLOUDFLARE_API_TOKEN não está configurado.');
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
  const zones = await cfRequest(`/zones?name=${encodeURIComponent(ZONE_NAME)}&per_page=50`);
  const zone = zones.find((candidate) => candidate.name === ZONE_NAME);
  if (!zone) throw new Error(`Zona Cloudflare ${ZONE_NAME} não localizada.`);

  const rulesets = await cfRequest(`/zones/${zone.id}/rulesets`);
  let rulesetSummary = rulesets.find((candidate) => candidate.phase === RULESET_PHASE && candidate.kind === 'zone');

  const rule = {
    ref: RULE_REF,
    description: RULE_DESCRIPTION,
    expression: RULE_EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: { cache: false },
    enabled: true,
  };

  if (!rulesetSummary) {
    const createdRuleset = await cfRequest(`/zones/${zone.id}/rulesets`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Luisices API cache policy',
        kind: 'zone',
        phase: RULESET_PHASE,
        rules: [rule],
      }),
    });
    console.log(`Cache bypass criado no ruleset ${createdRuleset.id} para os hosts da API Luisices.`);
    return;
  }

  // O endpoint /rulesets lista apenas resumos sem o array rules preenchido.
  // Devemos buscar o ruleset específico pelo ID para obter as regras existentes.
  const ruleset = await cfRequest(`/zones/${zone.id}/rulesets/${rulesetSummary.id}`);

  const existingRules = ruleset.rules || [];
  const managedRule = existingRules.find((candidate) => candidate.ref === RULE_REF || candidate.description === RULE_DESCRIPTION);
  if (!managedRule) {
    await cfRequest(`/zones/${zone.id}/rulesets/${ruleset.id}/rules`, {
      method: 'POST',
      body: JSON.stringify(rule),
    });
    console.log(`Cache bypass adicionado ao final do ruleset ${ruleset.id} para os hosts da API Luisices.`);
    return;
  }

  const lastOtherRule = [...existingRules].reverse().find((candidate) => candidate.id !== managedRule.id);
  const shouldMoveToEnd = existingRules[existingRules.length - 1]?.id !== managedRule.id && Boolean(lastOtherRule);
  await cfRequest(`/zones/${zone.id}/rulesets/${ruleset.id}/rules/${managedRule.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...rule,
      ...(shouldMoveToEnd ? { position: { after: lastOtherRule.id } } : {}),
    }),
  });
  console.log(`Cache bypass atualizado e colocado ao final do ruleset ${ruleset.id}.`);
}

main().catch((error) => {
  console.error(`Não foi possível configurar o bypass de cache MCP/API: ${error.message}`);
  process.exitCode = 1;
});
