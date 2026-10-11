#!/usr/bin/env node
/**
 * scripts/audit-cloudflare.mjs
 * 
 * Script de auditoria e status de recursos provisionados na Cloudflare:
 * - Zonas (Status, Nameservers, Plano)
 * - Registros DNS (Tipo, Nome, Conteúdo, Proxy Status, TTL)
 * - Workers Scripts (Nomes, Versões, Modificação)
 * - Custom Domains e Rotas dos Workers
 * - Configurações SSL/TLS
 * 
 * Pode ser executado localmente ou via GitHub Actions.
 * Requer: CLOUDFLARE_API_TOKEN
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente de .env.local ou .env se existirem
dotenv.config({ path: '.env.local' });
dotenv.config();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID_ENV = process.env.CLOUDFLARE_ACCOUNT_ID;
const BASE_URL = 'https://api.cloudflare.com/client/v4';

async function cfFetch(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const errorMsg = data.errors?.[0]?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`[Cloudflare API Error] ${endpoint} -> ${errorMsg}`);
  }

  return data.result;
}

async function main() {
  console.log('\n======================================================');
  console.log('       🔍 CLOUDFLARE STATUS & AUDITORIA DE RECURSOS    ');
  console.log('======================================================\n');

  if (!API_TOKEN) {
    console.error('❌ ERRO: A variável CLOUDFLARE_API_TOKEN não está definida.\n');
    console.log('💡 Como resolver:');
    console.log('  1. Localmente: Defina no arquivo .env.local ou execute:');
    console.log('     CLOUDFLARE_API_TOKEN="seu_token" npm run cloudflare:status\n');
    console.log('  2. No GitHub Actions: O token já deve estar configurado em Secrets.');
    console.log('     Você pode disparar o workflow "Auditoria Cloudflare" na aba Actions.\n');
    process.exit(1);
  }

  // 1. Validar Token
  process.stdout.write('🔑 Validando Cloudflare API Token... ');
  const tokenType = API_TOKEN.startsWith('cfat_') ? 'Account-Owned Token' : 'User Token';
  try {
    if (!API_TOKEN.startsWith('cfat_')) {
      const verify = await cfFetch('/user/tokens/verify');
      console.log(`✅ Válido (${tokenType})! Status: ${verify.status}`);
    } else {
      // Tokens de conta (cfat_) não acessam /user/tokens/verify; validamos diretamente via /zones
      await cfFetch('/zones');
      console.log(`✅ Válido (${tokenType})! Autenticação confirmada.`);
    }
  } catch (err) {
    // Fallback: tentar /zones caso seja um token com escopo específico
    try {
      await cfFetch('/zones');
      console.log(`✅ Válido! Autenticação confirmada via Zones.`);
    } catch (innerErr) {
      console.log('❌ Inválido!');
      console.error(`Detalhes: ${innerErr.message || err.message}`);
      process.exit(1);
    }
  }

  let markdownReport = '# ⛅ Relatório de Auditoria Cloudflare - Luisices\n\n';
  markdownReport += `*Gerado em:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília)\n\n`;

  // 2. Listar Zonas
  console.log('\n🌐 1. ZONAS (DOMÍNIOS CONFIGURADOS)');
  console.log('------------------------------------------------------');
  let zones = [];
  try {
    zones = await cfFetch('/zones');
  } catch (err) {
    console.error(`Erro ao listar zonas: ${err.message}`);
  }

  if (zones.length === 0) {
    console.log('⚠️ Nenhuma zona encontrada nesta conta.');
    markdownReport += '## 1. Zonas\n\nNenhuma zona encontrada.\n\n';
  } else {
    markdownReport += '## 1. Zonas Configuradas\n\n';
    markdownReport += '| Zona | Status | Plano | Nameservers |\n';
    markdownReport += '| :--- | :---: | :---: | :--- |\n';

    for (const z of zones) {
      const ns = (z.name_servers || []).join(', ');
      console.log(`• Domínio: ${z.name}`);
      console.log(`  - ID: ${z.id}`);
      console.log(`  - Status: ${z.status}`);
      console.log(`  - Plano: ${z.plan?.name || 'N/A'}`);
      console.log(`  - Nameservers: ${ns || 'Padrão'}`);
      console.log('');

      markdownReport += `| **${z.name}** | \`${z.status}\` | ${z.plan?.name || 'Free'} | \`${ns}\` |\n`;
    }
  }

  // Detectar Account ID a partir da primeira zona se não fornecido
  const accountId = ACCOUNT_ID_ENV || zones[0]?.account?.id;

  // 3. DNS Records e Configurações por Zona
  console.log('\n📋 2. REGISTROS DNS & SSL POR ZONA');
  console.log('------------------------------------------------------');

  for (const z of zones) {
    console.log(`\n📌 Zona: ${z.name}`);
    markdownReport += `\n### 2. Registros DNS da Zona: \`${z.name}\`\n\n`;

    // SSL Mode
    try {
      const ssl = await cfFetch(`/zones/${z.id}/settings/ssl`);
      console.log(`  🔒 SSL/TLS Mode: ${ssl.value || 'N/A'}`);
      markdownReport += `> 🔒 **Modo SSL/TLS:** \`${ssl.value || 'N/A'}\`\n\n`;
    } catch {
      // Ignorar se não tiver permissão de SSL
    }

    // DNS Records
    try {
      const records = await cfFetch(`/zones/${z.id}/dns_records?per_page=100`);
      console.log(`  Total de Registros DNS: ${records.length}\n`);

      markdownReport += '| Tipo | Nome | Conteúdo / Destino | Proxy (Nuvem) | TTL |\n';
      markdownReport += '| :---: | :--- | :--- | :---: | :---: |\n';

      for (const r of records) {
        const proxiedIcon = r.proxied ? '🟠 Proxied' : '⚪ DNS Only';
        console.log(`  [${r.type.padEnd(5)}] ${r.name.padEnd(30)} -> ${r.content} (${proxiedIcon})`);
        markdownReport += `| \`${r.type}\` | \`${r.name}\` | \`${r.content}\` | ${r.proxied ? '🟠 Sim' : '⚪ Não'} | ${r.ttl === 1 ? 'Auto' : r.ttl} |\n`;
      }
    } catch (err) {
      console.error(`  Erro ao listar DNS para ${z.name}: ${err.message}`);
      markdownReport += `*Erro ao buscar registros DNS: ${err.message}*\n\n`;
    }

    // Worker Routes nesta Zona
    try {
      const routes = await cfFetch(`/zones/${z.id}/workers/routes`);
      if (routes && routes.length > 0) {
        console.log(`\n  ⚡ Rotas de Workers ativas nesta zona (${routes.length}):`);
        markdownReport += `\n#### Rotas de Workers vinculadas em \`${z.name}\`\n\n`;
        markdownReport += '| Padrão de Rota (Pattern) | Worker (Script) |\n';
        markdownReport += '| :--- | :--- |\n';
        for (const rt of routes) {
          console.log(`     - Rota: ${rt.pattern} -> Worker: ${rt.script || '(Nenhum)'}`);
          markdownReport += `| \`${rt.pattern}\` | \`${rt.script || 'None'}\` |\n`;
        }
      }
    } catch {
      // Rotas podem requerer escopo específico
    }
  }

  // 4. Workers Scripts & Custom Domains da Conta
  console.log('\n\n⚡ 3. WORKERS PROVISIONADOS NA CONTA');
  console.log('------------------------------------------------------');

  if (!accountId) {
    console.log('⚠️ Account ID não encontrado para listar Workers globalmente.');
    markdownReport += '\n## 3. Workers da Conta\n\n*Account ID não fornecido.*\n';
  } else {
    markdownReport += '\n## 3. Cloudflare Workers Provisionados\n\n';

    // Listar Scripts
    try {
      const scripts = await cfFetch(`/accounts/${accountId}/workers/scripts`);
      console.log(`Total de Workers Scripts: ${scripts.length}\n`);

      if (scripts.length === 0) {
        console.log('  Nenhum Worker script provisionado ainda.');
        markdownReport += 'Nenhum script de Worker encontrado.\n\n';
      } else {
        markdownReport += '| Nome do Worker | Criado em | Última Modificação | Uso |\n';
        markdownReport += '| :--- | :--- | :--- | :---: |\n';

        for (const s of scripts) {
          const mod = s.modified_on ? new Date(s.modified_on).toLocaleString('pt-BR') : 'N/A';
          const crt = s.created_on ? new Date(s.created_on).toLocaleString('pt-BR') : 'N/A';
          console.log(`  • Worker: ${s.id}`);
          console.log(`    - Criado: ${crt}`);
          console.log(`    - Atualizado: ${mod}`);
          console.log(`    - Usage Model: ${s.usage_model || 'standard'}`);
          console.log('');

          markdownReport += `| **\`${s.id}\`** | ${crt} | ${mod} | \`${s.usage_model || 'standard'}\` |\n`;
        }
      }
    } catch (err) {
      console.error(`Erro ao listar scripts de Workers: ${err.message}`);
      markdownReport += `*Erro ao listar Workers: ${err.message}*\n\n`;
    }

    // Listar Custom Domains de Workers
    try {
      const domains = await cfFetch(`/accounts/${accountId}/workers/domains`);
      if (domains && domains.length > 0) {
        console.log(`🌐 Domínios Personalizados vinculados a Workers (${domains.length}):`);
        markdownReport += '\n### Domínios Personalizados (Worker Custom Domains)\n\n';
        markdownReport += '| Hostname / Domínio | Worker Service | Ambiente |\n';
        markdownReport += '| :--- | :--- | :---: |\n';

        for (const d of domains) {
          console.log(`  • ${d.hostname} -> Worker: ${d.service} (Env: ${d.environment || 'production'})`);
          markdownReport += `| \`${d.hostname}\` | \`${d.service}\` | \`${d.environment || 'production'}\` |\n`;
        }
      }
    } catch {
      // Ignorar caso endpoint não esteja disponível no plano
    }
  }

  // 5. Salvar Relatório em Arquivo e Step Summary do GitHub Actions
  const reportPath = path.resolve('cloudflare-status-report.md');
  fs.writeFileSync(reportPath, markdownReport, 'utf-8');
  console.log('\n======================================================');
  console.log(`📄 Relatório completo salvo em: ${reportPath}`);
  console.log('======================================================\n');

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdownReport);
    console.log('✅ Relatório adicionado ao GitHub Step Summary.');
  }
}

main().catch((err) => {
  console.error('\n❌ Erro fatal durante a auditoria:', err);
  process.exit(1);
});
