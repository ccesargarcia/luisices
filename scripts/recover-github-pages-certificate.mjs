const DOMAIN = 'luisices.com.br';
const WWW = `www.${DOMAIN}`;
const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPERATION = process.env.OPERATION;
const REPOSITORY = process.env.GITHUB_REPOSITORY;
const EXPECTED_APEX_IPS = new Set([
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
]);
const EXPECTED_WWW_TARGET = 'ccesargarcia.github.io';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!CLOUDFLARE_TOKEN || !REPOSITORY) {
  throw new Error('Faltam configurações necessárias no ambiente do workflow.');
}
if (!['github-pages-dns-only', 'restore-github-pages-proxy'].includes(OPERATION)) {
  throw new Error('Operação ausente ou não suportada.');
}
if (OPERATION === 'restore-github-pages-proxy' && !GITHUB_TOKEN) {
  throw new Error('A permissão de leitura do GitHub Pages é necessária para restaurar o proxy.');
}

async function cloudflare(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare API falhou (${response.status}) ao processar ${path}.`);
  }
  return data.result;
}

async function findPageDnsRecords() {
  const zones = await cloudflare(`/zones?name=${DOMAIN}`);
  const zone = zones.find((item) => item.name === DOMAIN);
  if (!zone) throw new Error(`Zona ${DOMAIN} não encontrada.`);

  const records = await cloudflare(`/zones/${zone.id}/dns_records?per_page=500`);
  const apex = records.filter((record) => record.name === DOMAIN && ['A', 'AAAA'].includes(record.type));
  const www = records.filter((record) => record.name === WWW && ['A', 'AAAA', 'CNAME'].includes(record.type));
  const actualApexIps = new Set(apex.filter((record) => record.type === 'A').map((record) => record.content));
  const wwwCnames = www.filter((record) => record.type === 'CNAME');

  if (apex.length !== EXPECTED_APEX_IPS.size
      || actualApexIps.size !== EXPECTED_APEX_IPS.size
      || [...EXPECTED_APEX_IPS].some((ip) => !actualApexIps.has(ip))) {
    throw new Error('Os registros A/AAAA do domínio raiz diferem do conjunto esperado do GitHub Pages; nenhuma mudança foi aplicada.');
  }
  if (www.length !== 1 || wwwCnames.length !== 1
      || wwwCnames[0].content.replace(/\.$/, '').toLowerCase() !== EXPECTED_WWW_TARGET) {
    throw new Error('O registro DNS de www difere do CNAME esperado do GitHub Pages; nenhuma mudança foi aplicada.');
  }
  return {
    zoneId: zone.id,
    records: [...apex, ...www],
  };
}

async function setProxy(zoneId, records, proxied) {
  for (const record of records) {
    if (record.proxied === proxied) continue;
    await cloudflare(`/zones/${zoneId}/dns_records/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ proxied }),
    });
    record.proxied = proxied;
    console.log(`${record.name} ${record.type}: proxy ${proxied ? 'ativado' : 'desativado'}.`);
  }
}

async function verifyDnsOnly() {
  const query = async (name, type) => {
    const url = new URL('https://cloudflare-dns.com/dns-query');
    url.searchParams.set('name', name);
    url.searchParams.set('type', type);
    const response = await fetch(url, { headers: { accept: 'application/dns-json' } });
    if (!response.ok) return [];
    const result = await response.json();
    return (result.Answer || []).map((answer) => answer.data.replace(/\.$/, '').toLowerCase());
  };

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const [ips, cnames] = await Promise.all([
      query(DOMAIN, 'A'),
      query(WWW, 'CNAME'),
    ]);
    const expectedIpsPresent = [...EXPECTED_APEX_IPS].every((ip) => ips.includes(ip));
    if (expectedIpsPresent && cnames.includes(EXPECTED_WWW_TARGET)) {
      console.log('DNS público já anuncia diretamente o GitHub Pages para o domínio raiz e www.');
      return;
    }
    console.log(`Aguardando propagação DNS (${attempt}/40).`);
    await sleep(15_000);
  }
  throw new Error('A resolução pública DNS não confirmou os destinos GitHub Pages dentro de 10 minutos.');
}

async function currentPagesCertificate() {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/pages`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const page = await response.json().catch(() => ({}));
  if (!response.ok || page.cname !== DOMAIN) {
    throw new Error(`Não foi possível confirmar o domínio Pages esperado (${DOMAIN}).`);
  }
  const cert = page.https_certificate;
  const expiry = cert?.expires_at ? Date.parse(cert.expires_at) : 0;
  if (!['approved', 'issued'].includes(cert?.state) || expiry <= Date.now() + 86_400_000) {
    throw new Error(`Certificado GitHub Pages não está válido para restaurar proxy (estado ${cert?.state || 'indisponível'}).`);
  }
}

async function verifyOriginHttpsDirect() {
  for (const host of [DOMAIN, WWW]) {
    const response = await fetch(`https://${host}/`, { redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTPS direto de ${host} retornou HTTP ${response.status}.`);
    console.log(`HTTPS direto do GitHub Pages para ${host}: HTTP ${response.status}; certificado TLS validado.`);
  }
}

async function verifyPublicSite() {
  for (const host of [DOMAIN, WWW]) {
    const response = await fetch(`https://${host}/`, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Verificação HTTPS de ${host} retornou HTTP ${response.status}.`);
    console.log(`HTTPS público de ${host}: HTTP ${response.status}.`);
  }
}

const { zoneId, records } = await findPageDnsRecords();
console.log('Registros conferidos: quatro A do domínio raiz e o CNAME de www; nenhum outro hostname será alterado.');
if (OPERATION === 'github-pages-dns-only') {
  await setProxy(zoneId, records, false);
  await verifyDnsOnly();
  console.log('DNS-only confirmado. Reinicie o vínculo do domínio em Settings → Pages e aguarde certificado emitido antes de restaurar o proxy.');
} else {
  await currentPagesCertificate();
  await verifyOriginHttpsDirect();
  await setProxy(zoneId, records, true);
  await verifyPublicSite();
  console.log('Certificado válido confirmado, proxy Cloudflare restaurado e HTTPS verificado para os dois hosts.');
}
