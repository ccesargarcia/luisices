import tls from 'node:tls';
import { appendFile } from 'node:fs/promises';

const DOMAIN = 'luisices.com.br';
const HOSTS = [DOMAIN, `www.${DOMAIN}`];
const PAGES_IPS = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
];
const REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUSH_URL = process.env.UPTIME_KUMA_PAGES_CERT_PUSH_URL;
const MIN_VALIDITY_DAYS = 21;

function connectAndInspect(hostname, ip) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: ip,
      port: 443,
      servername: hostname,
      rejectUnauthorized: true,
      checkServerIdentity: (_serverName, certificate) => tls.checkServerIdentity(hostname, certificate),
      timeout: 10_000,
    });
    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      const expiry = Date.parse(certificate.valid_to);
      const daysRemaining = Math.floor((expiry - Date.now()) / 86_400_000);
      socket.end();
      if (!Number.isFinite(expiry) || daysRemaining < MIN_VALIDITY_DAYS) {
        reject(new Error(`Certificado de origem para ${hostname} em ${ip} vence em menos de ${MIN_VALIDITY_DAYS} dias.`));
        return;
      }
      resolve({ hostname, ip, daysRemaining, expiresAt: new Date(expiry).toISOString() });
    });
    socket.once('timeout', () => socket.destroy(new Error(`Timeout TLS ao conectar ${hostname} em ${ip}.`)));
    socket.once('error', reject);
  });
}

async function verifyPagesApi() {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/pages`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const page = await response.json().catch(() => ({}));
  if (!response.ok || page.cname !== DOMAIN) {
    throw new Error(`API do GitHub Pages não confirmou o domínio ${DOMAIN}.`);
  }
  const certificate = page.https_certificate;
  const expiresAt = Date.parse(certificate?.expires_at || '');
  const daysRemaining = Math.floor((expiresAt - Date.now()) / 86_400_000);
  if (!['approved', 'issued'].includes(certificate?.state) || daysRemaining < MIN_VALIDITY_DAYS) {
    throw new Error(`Certificado informado pelo GitHub Pages inválido ou com menos de ${MIN_VALIDITY_DAYS} dias de validade (estado ${certificate?.state || 'indisponível'}).`);
  }
  return { daysRemaining, expiresAt: new Date(expiresAt).toISOString() };
}

async function sendKumaStatus(status, message) {
  if (!PUSH_URL) {
    console.warn('UPTIME_KUMA_PAGES_CERT_PUSH_URL não configurado; verificação seguirá sem enviar heartbeat ao Uptime Kuma.');
    return;
  }
  const push = new URL(PUSH_URL);
  push.searchParams.set('status', status);
  push.searchParams.set('msg', message);
  const response = await fetch(push, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Uptime Kuma recusou o heartbeat (HTTP ${response.status}).`);
}

if (!REPOSITORY || !GITHUB_TOKEN) {
  throw new Error('GITHUB_REPOSITORY e GITHUB_TOKEN são necessários para consultar o estado do GitHub Pages.');
}

let summary = '';
try {
  const pages = await verifyPagesApi();
  const probes = await Promise.all(HOSTS.flatMap((host) => PAGES_IPS.map((ip) => connectAndInspect(host, ip))));
  const soonestExpiry = probes.reduce((soonest, probe) => (probe.daysRemaining < soonest.daysRemaining ? probe : soonest));
  summary = `Origem GitHub Pages válida; certificado TLS direto vence em ${soonestExpiry.expiresAt} (${soonestExpiry.daysRemaining} dias). API Pages: ${pages.daysRemaining} dias.`;
  for (const probe of probes) console.log(`TLS direto válido: ${probe.hostname} via ${probe.ip}; vence ${probe.expiresAt}.`);
  await sendKumaStatus('up', summary);
  await writeSummary(`## GitHub Pages origin TLS\n\n${summary}\n`);
  console.log(summary);
} catch (error) {
  const reason = error instanceof Error ? error.message : 'Falha não identificada na verificação TLS da origem.';
  try {
    await sendKumaStatus('down', reason);
  } catch {
    console.error('Não foi possível atualizar o monitor Push do Uptime Kuma.');
  }
  await writeSummary(`## GitHub Pages origin TLS\n\nFalha: ${reason}\n`);
  console.error(reason);
  process.exitCode = 1;
}

async function writeSummary(content) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, content);
  }
}
