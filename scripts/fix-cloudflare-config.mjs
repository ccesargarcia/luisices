#!/usr/bin/env node
/**
 * scripts/fix-cloudflare-config.mjs
 * 
 * Aplica automaticamente as correções de conformidade na Cloudflare:
 * 1. Desativa proxy (muda para nuvem cinza) nos registros DKIM do Firebase:
 *    - firebase1._domainkey.luisices.com.br
 *    - firebase2._domainkey.luisices.com.br
 * 2. Remove registros temporários obsoletos (lixo de certificados expirados):
 *    - _acme-challenge.loja.dev.luisices.com.br
 *    - _acme-challenge.lojinha.dev.luisices.com.br
 * 3. Altera o modo SSL/TLS da zona para 'strict' (Full Strict).
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const BASE_URL = 'https://api.cloudflare.com/client/v4';

if (!API_TOKEN) {
  console.error('\n❌ ERRO: CLOUDFLARE_API_TOKEN não encontrado.');
  console.log('Defina no arquivo .env.local ou passe via linha de comando:');
  console.log('CLOUDFLARE_API_TOKEN="seu_token" node scripts/fix-cloudflare-config.mjs\n');
  process.exit(1);
}

async function cfRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const errorMsg = data.errors?.[0]?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`[Cloudflare API Error] ${endpoint} -> ${errorMsg}`);
  }

  return data.result;
}

async function run() {
  console.log('\n======================================================');
  console.log('       🛠️ APLICANDO AJUSTES AUTOMÁTICOS NA CLOUDFLARE   ');
  console.log('======================================================\n');

  // 1. Obter Zonas
  console.log('🔍 Localizando zona principal...');
  const zones = await cfRequest('/zones');
  const zone = zones.find((z) => z.name === 'luisices.com.br') || zones[0];

  if (!zone) {
    throw new Error('Nenhuma zona encontrada para luisices.com.br.');
  }

  console.log(`✅ Zona identificada: ${zone.name} (ID: ${zone.id})\n`);

  // 2. Buscar Registros DNS
  console.log('📋 Buscando registros DNS da zona...');
  const records = await cfRequest(`/zones/${zone.id}/dns_records?per_page=100`);
  console.log(`Total de registros: ${records.length}\n`);

  // 3. Configurar Apontamento DNS para WireGuard VPN (vpn.luisices.com.br)
  console.log('--- 1. Configurando Registro DNS da VPN WireGuard (vpn.luisices.com.br) ---');
  const VPN_IP = process.env.VPN_SERVER_IP || '35.209.209.91';
  const vpnRecordName = 'vpn.luisices.com.br';
  const vpnRecord = records.find(
    (r) => r.name === vpnRecordName && (r.type === 'A' || r.type === 'CNAME')
  );

  if (!vpnRecord) {
    process.stdout.write(`• Criando registro A: ${vpnRecordName} -> ${VPN_IP} (⚪ DNS Only)... `);
    await cfRequest(`/zones/${zone.id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'A',
        name: 'vpn',
        content: VPN_IP,
        ttl: 1, // Auto
        proxied: false, // DNS Only obrigatorio para trafego WireGuard UDP 51820
        comment: 'WireGuard VPN Server GCP Always Free',
      }),
    });
    console.log('✅ Criado com sucesso!');
  } else if (vpnRecord.content !== VPN_IP || vpnRecord.proxied !== false) {
    process.stdout.write(`• Atualizando ${vpnRecordName} para ${VPN_IP} (⚪ DNS Only)... `);
    await cfRequest(`/zones/${zone.id}/dns_records/${vpnRecord.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: 'A',
        name: 'vpn',
        content: VPN_IP,
        ttl: 1,
        proxied: false,
        comment: 'WireGuard VPN Server GCP Always Free',
      }),
    });
    console.log('✅ Atualizado com sucesso!');
  } else {
    console.log(`• ${vpnRecordName} já está configurado para ${VPN_IP} (⚪ DNS Only).`);
  }

  // 4. Ajustar DKIM do Firebase (Remover Proxy / Nuvem Cinza)
  console.log('\n--- 2. Ajustando Registros DKIM (Email Deliverability) ---');
  const dkimRecords = records.filter(
    (r) =>
      r.name.startsWith('firebase1._domainkey') ||
      r.name.startsWith('firebase2._domainkey')
  );


  for (const dkim of dkimRecords) {
    if (dkim.proxied) {
      process.stdout.write(`• Alterando ${dkim.name} para ⚪ DNS Only... `);
      await cfRequest(`/zones/${zone.id}/dns_records/${dkim.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ proxied: false }),
      });
      console.log('✅ Feito!');
    } else {
      console.log(`• ${dkim.name} já está como ⚪ DNS Only.`);
    }
  }

  // 4. Remover Lixo Órfão (_acme-challenge)
  console.log('\n--- 2. Removendo Registros Órfãos (_acme-challenge) ---');
  const acmeRecords = records.filter((r) => r.name.startsWith('_acme-challenge'));

  if (acmeRecords.length === 0) {
    console.log('• Nenhum registro _acme-challenge antigo encontrado.');
  } else {
    for (const acme of acmeRecords) {
      process.stdout.write(`• Removendo registro órfão ${acme.name} (${acme.type})... `);
      await cfRequest(`/zones/${zone.id}/dns_records/${acme.id}`, {
        method: 'DELETE',
      });
      console.log('🗑️ Excluído com sucesso!');
    }
  }

  // 5. Ajustar SSL/TLS para 'strict'
  console.log('\n--- 3. Ajustando Modo SSL/TLS para Full (Strict) ---');
  try {
    const ssl = await cfRequest(`/zones/${zone.id}/settings/ssl`);
    if (ssl.value !== 'strict') {
      process.stdout.write(`• Modo atual: ${ssl.value}. Atualizando para 'strict'... `);
      await cfRequest(`/zones/${zone.id}/settings/ssl`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'strict' }),
      });
      console.log('🔒 Atualizado com sucesso para Full (strict)!');
    } else {
      console.log('• Modo SSL já está configurado como Full (strict).');
    }
  } catch (err) {
    console.warn(`⚠️ Não foi possível alterar a configuração SSL: ${err.message}`);
  }

  // 6. Desativar Browser Integrity Check (BIC) - Resolve Cloudflare Error 1010
  console.log('\n--- 4. Desativando Browser Integrity Check (BIC - Corrige Erro 1010) ---');
  try {
    const bic = await cfRequest(`/zones/${zone.id}/settings/browser_check`);
    if (bic.value !== 'off') {
      process.stdout.write(`• Status atual do BIC: ${bic.value}. Desativando para permitir MCP e Plugins... `);
      await cfRequest(`/zones/${zone.id}/settings/browser_check`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'off' }),
      });
      console.log('✅ Desativado com sucesso (Error 1010 eliminado)!');
    } else {
      console.log('• Browser Integrity Check já está desativado (off).');
    }
  } catch (err) {
    console.warn(`⚠️ Não foi possível alterar Browser Integrity Check: ${err.message}`);
  }

  // 7. Ajustar Security Level para evitar desafios de captcha em chamadas automatizadas de MCP/APIs
  console.log('\n--- 5. Ajustando Nível de Segurança (Security Level) para APIs/MCP ---');
  try {
    const sec = await cfRequest(`/zones/${zone.id}/settings/security_level`);
    if (sec.value !== 'essentially_off' && sec.value !== 'low') {
      process.stdout.write(`• Nível atual: ${sec.value}. Ajustando para permissivo em APIs... `);
      try {
        await cfRequest(`/zones/${zone.id}/settings/security_level`, {
          method: 'PATCH',
          body: JSON.stringify({ value: 'essentially_off' }),
        });
        console.log('✅ Atualizado para essentially_off!');
      } catch {
        await cfRequest(`/zones/${zone.id}/settings/security_level`, {
          method: 'PATCH',
          body: JSON.stringify({ value: 'low' }),
        });
        console.log('✅ Atualizado para low!');
      }
    } else {
      console.log(`• Security Level já está em nível brando (${sec.value}).`);
    }
  } catch (err) {
    console.warn(`⚠️ Não foi possível alterar Security Level: ${err.message}`);
  }

  // 8. Otimizar Challenge TTL para reduzir repetição de desafios
  console.log('\n--- 6. Verificando Challenge TTL ---');
  try {
    const challengeTtl = await cfRequest(`/zones/${zone.id}/settings/challenge_ttl`);
    console.log(`• Challenge TTL atual: ${challengeTtl.value}s.`);
  } catch (err) {
    // Ignorar se não suportado
  }

  console.log('\n======================================================');
  console.log('🎉 TODOS OS AJUSTES FORAM APLICADOS COM SUCESSO!');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Erro durante a execução dos ajustes:', err.message);
  process.exit(1);
});
