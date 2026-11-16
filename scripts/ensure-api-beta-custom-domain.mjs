#!/usr/bin/env node
/**
 * Prepares api.beta.luisices.com.br for a Wrangler-managed Worker Custom Domain.
 * Removes only the legacy route/CNAME created by the previous Beta gateway setup.
 */
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const baseUrl = 'https://api.cloudflare.com/client/v4';
const zoneName = 'luisices.com.br';
const hostname = 'api.beta.luisices.com.br';
const legacyCnameTarget = 'beta.luisices.com.br';
const legacyRoutePattern = `${hostname}/*`;

if (!apiToken) {
  throw new Error('CLOUDFLARE_API_TOKEN não configurado.');
}

async function request(endpoint, { method = 'GET' } = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const details = data.errors?.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(details || `Cloudflare API retornou HTTP ${response.status}.`);
  }
  return data.result;
}

try {
  const zones = await request(`/zones?name=${encodeURIComponent(zoneName)}`);
  const zone = zones.find((item) => item.name === zoneName);
  if (!zone) throw new Error(`Zona ${zoneName} não encontrada ou sem permissão de leitura.`);

  const records = await request(`/zones/${zone.id}/dns_records?name=${encodeURIComponent(hostname)}`);
  const betaRecords = records.filter((item) => item.name === hostname);
  for (const record of betaRecords) {
    const currentTarget = String(record.content || '').replace(/\.$/, '').toLowerCase();
    if (record.type !== 'CNAME' || currentTarget !== legacyCnameTarget) {
      throw new Error(`Registro DNS inesperado em ${hostname}; nenhuma alteração foi feita.`);
    }
  }

  const routes = await request(`/zones/${zone.id}/workers/routes`);
  for (const route of routes.filter((item) => item.pattern === legacyRoutePattern)) {
    await request(`/zones/${zone.id}/workers/routes/${route.id}`, { method: 'DELETE' });
    console.log(`Rota antiga removida: ${route.pattern}`);
  }

  for (const record of betaRecords) {
    await request(`/zones/${zone.id}/dns_records/${record.id}`, { method: 'DELETE' });
    console.log(`CNAME legado removido de ${hostname}; Wrangler criará o registro e certificado do Worker.`);
  }
} catch (error) {
  console.error(`Falha ao preparar o Custom Domain Beta: ${error.message}`);
  process.exitCode = 1;
}
