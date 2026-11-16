#!/usr/bin/env node
/** Assigns only the api.beta Custom Domain to the isolated functions-beta Worker. */
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const baseUrl = 'https://api.cloudflare.com/client/v4';
const zoneName = 'luisices.com.br';
const hostname = 'api.beta.luisices.com.br';
const service = 'functions-beta';

if (!apiToken || !accountId) {
  throw new Error('CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID são obrigatórios.');
}

async function request(endpoint, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const details = data.errors?.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(details || `Cloudflare API retornou HTTP ${response.status}.`);
  }
  return data.result;
}

try {
  const [zones, domains] = await Promise.all([
    request(`/zones?name=${encodeURIComponent(zoneName)}`),
    request(`/accounts/${accountId}/workers/domains`),
  ]);
  const zone = zones.find((item) => item.name === zoneName);
  if (!zone) throw new Error(`Zona ${zoneName} não encontrada ou sem permissão de leitura.`);

  const current = domains.find((item) => item.hostname === hostname);
  if (current && current.zone_id && current.zone_id !== zone.id) {
    throw new Error(`${hostname} está associado a uma zona inesperada; nenhuma alteração foi feita.`);
  }
  if (current?.service === service && current.enabled) {
    console.log(`${hostname} já está associado ao Worker ${service}; nenhuma alteração necessária.`);
  } else {
    await request(`/accounts/${accountId}/workers/domains`, {
      method: 'PUT',
      body: {
        hostname,
        service,
        enabled: true,
        previews_enabled: false,
        zone_id: current?.zone_id || zone.id,
        zone_name: current?.zone_name || zoneName,
      },
    });
    console.log(`Somente o vínculo de ${hostname} foi atribuído ao Worker ${service}.`);
  }

  const verified = (await request(`/accounts/${accountId}/workers/domains`))
    .find((item) => item.hostname === hostname);
  if (!verified || verified.service !== service || !verified.enabled) {
    throw new Error(`Não foi possível confirmar o vínculo de ${hostname} ao Worker ${service}.`);
  }
} catch (error) {
  console.error(`Falha ao atribuir o Custom Domain Beta: ${error.message}`);
  process.exitCode = 1;
}
