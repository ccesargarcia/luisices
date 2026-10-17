#!/usr/bin/env node
/**
 * Script de Auditoria e Limpeza de Versões Obsoletas do Google Secret Manager.
 *
 * Preserva estritamente a versão mais recente em uso (latest) e destrói
 * as versões antigas para zerar o custo recorrente de $0.06/versão/mês.
 *
 * Uso:
 *   node scripts/cleanup-secret-versions.mjs --project=luisices-dev --dry-run
 *   node scripts/cleanup-secret-versions.mjs --project=luisices-dev --destroy
 */

import { GoogleAuth } from 'google-auth-library';

const args = process.argv.slice(2);
const isDestroy = args.includes('--destroy');
const isDryRun = !isDestroy || args.includes('--dry-run');

const projectArg = args.find((a) => a.startsWith('--project='));
const keyFileArg = args.find((a) => a.startsWith('--key-file='));

const credentialsPath = keyFileArg ? keyFileArg.split('=')[1] : process.env.GOOGLE_APPLICATION_CREDENTIALS;

let projectId = projectArg ? projectArg.split('=')[1] : (process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID);

async function main() {
  console.log('='.repeat(70));
  console.log('🛡️  AUDITORIA E LIMPEZA DE VERSÕES DO GOOGLE SECRET MANAGER');
  console.log('='.repeat(70));
  console.log(`Modo: ${isDryRun ? '🔍 SIMULAÇÃO (DRY-RUN - Nenhuma versão será destruída)' : '🚨 DESTRUIÇÃO REAL (Apenas versões obsoletas)'}`);

  const authOptions = {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  };
  if (credentialsPath) {
    authOptions.keyFile = credentialsPath;
  }

  const auth = new GoogleAuth(authOptions);
  if (!projectId) {
    try {
      projectId = await auth.getProjectId();
    } catch {
      // fallback
    }
  }

  if (!projectId) {
    console.error('❌ ERRO: ID do projeto não informado. Use --project=<PROJECT_ID>');
    process.exit(1);
  }

  console.log(`Projeto GCP: ${projectId}`);
  console.log('-'.repeat(70));

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

  if (!token) {
    console.error('❌ ERRO: Falha ao obter token de acesso do Google Cloud.');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  // 1. Listar todos os segredos do projeto (com paginação)
  const secrets = [];
  let secretsPageToken = '';
  do {
    const url = new URL(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets`);
    url.searchParams.set('pageSize', '100');
    if (secretsPageToken) url.searchParams.set('pageToken', secretsPageToken);

    const secretsRes = await fetch(url.toString(), { headers });
    if (!secretsRes.ok) {
      const errorText = await secretsRes.text();
      console.error(`❌ Falha ao listar segredos (${secretsRes.status}): ${errorText}`);
      process.exit(1);
    }

    const secretsData = await secretsRes.json();
    if (secretsData.secrets) secrets.push(...secretsData.secrets);
    secretsPageToken = secretsData.nextPageToken || '';
  } while (secretsPageToken);

  if (secrets.length === 0) {
    console.log('ℹ️  Nenhum segredo encontrado no projeto.');
    process.exit(0);
  }

  console.log(`Encontrados ${secrets.length} segredos no Secret Manager.`);
  console.log('-'.repeat(70));

  let totalActiveVersions = 0;
  let totalPreservedVersions = 0;
  let totalDestroyedVersions = 0;
  let totalAlreadyDestroyed = 0;
  const failures = [];

  for (const secret of secrets) {
    const secretFullName = secret.name; // projects/{num}/secrets/{secretId}
    const secretId = secretFullName.split('/').pop();

    // 2. Listar todas as versões do segredo (com paginação)
    const versions = [];
    let versionsPageToken = '';
    let versionsFetchError = false;

    do {
      const url = new URL(`https://secretmanager.googleapis.com/v1/${secretFullName}/versions`);
      url.searchParams.set('pageSize', '100');
      if (versionsPageToken) url.searchParams.set('pageToken', versionsPageToken);

      const versionsRes = await fetch(url.toString(), { headers });
      if (!versionsRes.ok) {
        console.warn(`⚠️  Não foi possível listar versões do secret '${secretId}': ${versionsRes.statusText}`);
        failures.push({ secretId, error: `Falha ao listar versões (${versionsRes.status} ${versionsRes.statusText})` });
        versionsFetchError = true;
        break;
      }

      const versionsData = await versionsRes.json();
      if (versionsData.versions) versions.push(...versionsData.versions);
      versionsPageToken = versionsData.nextPageToken || '';
    } while (versionsPageToken);

    if (versionsFetchError) {
      continue;
    }

    // Parse versões e seus estados
    const parsedVersions = versions.map((v) => {
      const vNum = parseInt(v.name.split('/').pop(), 10);
      return {
        fullName: v.name,
        versionNumber: vNum,
        state: v.state, // ENABLED, DISABLED, DESTROYED
        createTime: v.createTime,
      };
    });

    // Ordenar por número da versão decrescente (mais recente primeiro)
    parsedVersions.sort((a, b) => b.versionNumber - a.versionNumber);

    const enabledVersions = parsedVersions.filter((v) => v.state === 'ENABLED');
    const disabledVersions = parsedVersions.filter((v) => v.state === 'DISABLED');
    const alreadyDestroyed = parsedVersions.filter((v) => v.state === 'DESTROYED');

    totalActiveVersions += enabledVersions.length + disabledVersions.length;
    totalAlreadyDestroyed += alreadyDestroyed.length;

    if (enabledVersions.length === 0 && disabledVersions.length === 0) {
      console.log(`🔒 Secret: ${secretId} | Todas as versões já estão destruídas.`);
      continue;
    }

    // Preserva a versão com maior número estritamente ENABLED.
    // Se não houver nenhuma ENABLED (ex: todas desabilitadas intencionalmente), preserva a maior DISABLED por cautela.
    const preservedVersion = enabledVersions.length > 0 ? enabledVersions[0] : disabledVersions[0];

    // Todas as outras versões ENABLED ou DISABLED são obsoletas e devem ser destruídas para zerar custos
    const obsoleteVersions = [...enabledVersions, ...disabledVersions].filter(
      (v) => v.versionNumber !== preservedVersion.versionNumber
    );

    totalPreservedVersions += 1;

    console.log(`\n🔑 Secret: ${secretId}`);
    console.log(`   Versões ativas: ${enabledVersions.length} (ENABLED) | Desabilitadas: ${disabledVersions.length} (DISABLED) | Já destruídas: ${alreadyDestroyed.length}`);
    console.log(`   ✅ PRESERVANDO: Versão v${preservedVersion.versionNumber} (state: ${preservedVersion.state})`);

    if (obsoleteVersions.length === 0) {
      console.log('   ✨ Nenhuma versão obsoleta para destruir. Tudo limpo!');
      continue;
    }

    console.log(`   🗑️  Versões obsoletas a destruir: ${obsoleteVersions.length} [${obsoleteVersions.map((v) => `v${v.versionNumber} (${v.state})`).join(', ')}]`);

    for (const v of obsoleteVersions) {
      if (isDryRun) {
        totalDestroyedVersions += 1;
      } else {
        const destroyUrl = `https://secretmanager.googleapis.com/v1/${v.fullName}:destroy`;
        const destroyRes = await fetch(destroyUrl, {
          method: 'POST',
          headers,
        });

        if (destroyRes.ok) {
          totalDestroyedVersions += 1;
          console.log(`      ✓ Destruída: v${v.versionNumber}`);
        } else {
          console.error(`      ✗ Falha ao destruir v${v.versionNumber}: ${destroyRes.status} ${destroyRes.statusText}`);
          failures.push({
            secretId,
            version: v.versionNumber,
            error: `Falha ao destruir (${destroyRes.status} ${destroyRes.statusText})`,
          });
        }
      }
    }
  }

  const monthlySavings = (totalDestroyedVersions * 0.06).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DA AUDITORIA & LIMPEZA');
  console.log('='.repeat(70));
  console.log(`• Segredos auditados:             ${secrets.length}`);
  console.log(`• Versões ativas encontradas:     ${totalActiveVersions}`);
  console.log(`• Versões mais recentes MANTIDAS: ${totalPreservedVersions}`);
  console.log(`• Versões obsoletas DESTRUÍDAS:   ${totalDestroyedVersions} ${isDryRun ? '(simulação)' : ''}`);
  console.log(`• Versões já destruídas antes:    ${totalAlreadyDestroyed}`);
  console.log(`• Economia mensal estimada:       US$ ${monthlySavings} / mês`);
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} falha(s) durante a limpeza:`);
    for (const failure of failures) {
      const versionLabel = failure.version ? ` v${failure.version}` : '';
      console.error(`   - ${failure.secretId}${versionLabel}: ${failure.error}`);
    }
    process.exitCode = 1;
  }
  console.log('='.repeat(70));

  if (isDryRun && totalDestroyedVersions > 0) {
    console.log('\n💡 Para efetivar a destruição e zerar o custo, execute com a flag --destroy:');
    console.log(`   node scripts/cleanup-secret-versions.mjs --project=${projectId} --destroy\n`);
  }
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
