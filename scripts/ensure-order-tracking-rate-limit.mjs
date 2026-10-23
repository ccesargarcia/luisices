#!/usr/bin/env node
/**
 * Creates or updates the Cloudflare zone WAF rate limit for public order tracking.
 * The rule is intentionally limited to the callable endpoint path.
 */
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const baseUrl = 'https://api.cloudflare.com/client/v4';
const endpointPath = '/getPublicOrderTracking';
const stableRef = 'luisices_public_tracking_rate_limit';
const desiredRule = {
  ref: stableRef,
  description: 'Luisices: limite de consultas públicas de acompanhamento de pedidos',
  expression: `http.request.uri.path eq "${endpointPath}"`,
  action: 'block',
  ratelimit: {
    characteristics: ['cf.colo.id', 'ip.src'],
    period: 10,
    requests_per_period: 5,
    mitigation_timeout: 10,
  },
  enabled: true,
};

if (!apiToken) {
  console.error('CLOUDFLARE_API_TOKEN não está configurado.');
  process.exit(1);
}

async function request(endpoint, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const detail = data.errors?.map((error) => error.message).filter(Boolean).join('; ')
      || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return data.result;
}

async function getZone() {
  const zones = await request('/zones?name=luisices.com.br');
  const zone = zones.find((item) => item.name === 'luisices.com.br');
  if (!zone) throw new Error('Zona luisices.com.br não encontrada ou sem permissão de leitura.');
  return zone;
}

async function ensureZoneRule(zone) {
  let entrypoint;
  try {
    entrypoint = await request(`/zones/${zone.id}/rulesets/phases/http_ratelimit/entrypoint`);
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  if (!entrypoint) {
    await request(`/zones/${zone.id}/rulesets`, {
      method: 'POST',
      body: {
        name: 'Luisices public order tracking rate limits',
        description: 'Rate limiting de consultas públicas do Luisices',
        kind: 'zone',
        phase: 'http_ratelimit',
        rules: [desiredRule],
      },
    });
    console.log('Regra WAF de acompanhamento criada no ruleset de zona.');
    return;
  }

  const current = entrypoint.rules.find((rule) => rule.ref === stableRef || rule.expression === desiredRule.expression);
  if (!current) {
    await request(`/zones/${zone.id}/rulesets/${entrypoint.id}/rules`, {
      method: 'POST',
      body: desiredRule,
    });
    console.log('Regra WAF de acompanhamento adicionada ao ruleset existente.');
    return;
  }

  const sameConfig = current.enabled === true
    && current.action === desiredRule.action
    && current.expression === desiredRule.expression
    && current.ratelimit?.period === desiredRule.ratelimit.period
    && current.ratelimit?.requests_per_period === desiredRule.ratelimit.requests_per_period
    && current.ratelimit?.mitigation_timeout === desiredRule.ratelimit.mitigation_timeout
    && current.ratelimit?.characteristics?.includes('ip.src')
    && current.ratelimit?.characteristics?.includes('cf.colo.id');
  if (sameConfig) {
    console.log(`Regra WAF ativa e atualizada: ${current.id}`);
    return;
  }

  await request(`/zones/${zone.id}/rulesets/${entrypoint.id}/rules/${current.id}`, {
    method: 'PUT',
    body: desiredRule,
  });
  console.log(`Regra WAF ajustada para 5 requisições/10 s: ${current.id}`);
}

try {
  const zone = await getZone();
  await ensureZoneRule(zone);
} catch (error) {
  console.error(`Não foi possível configurar o rate limit WAF: ${error.message}`);
  process.exitCode = 1;
}
