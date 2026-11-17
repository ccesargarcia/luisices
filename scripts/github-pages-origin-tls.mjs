import tls from 'node:tls';

export const GITHUB_PAGES_IPS = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
];

export function inspectGitHubPagesTls(hostname, ip, minValidityDays = 1) {
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
      if (!Number.isFinite(expiry) || daysRemaining < minValidityDays) {
        reject(new Error(`Certificado de origem para ${hostname} em ${ip} vence em menos de ${minValidityDays} dias.`));
        return;
      }
      resolve({ hostname, ip, daysRemaining, expiresAt: new Date(expiry).toISOString() });
    });
    socket.once('timeout', () => socket.destroy(new Error(`Timeout TLS ao conectar ${hostname} em ${ip}.`)));
    socket.once('error', reject);
  });
}
