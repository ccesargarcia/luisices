#!/usr/bin/env node
/**
 * Limpeza automática de imagens antigas no Google Artifact Registry (Cloud Functions v2).
 * Mantém as N versões mais recentes de cada pacote Docker (padrão: 2) e remove as anteriores
 * para evitar acúmulo mensal de armazenamento no GCP.
 *
 * Uso:
 *   node scripts/cleanup-artifact-registry.mjs --project=luisices-dev --dry-run
 *   node scripts/cleanup-artifact-registry.mjs --project=luisices-dev --destroy --keep=2
 */

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { GoogleAuth } = require('google-auth-library');

const args = process.argv.slice(2);
const isDestroy = args.includes('--destroy');
const isDryRun = !isDestroy || args.includes('--dry-run');
const isStrict = args.includes('--strict');

const projectArg = args.find((a) => a.startsWith('--project='));
const locationArg = args.find((a) => a.startsWith('--location='));
const keepArg = args.find((a) => a.startsWith('--keep='));
const keyFileArg = args.find((a) => a.startsWith('--key-file='));

const credentialsPath = keyFileArg ? keyFileArg.split('=')[1] : process.env.GOOGLE_APPLICATION_CREDENTIALS;
let projectId = projectArg ? projectArg.split('=')[1] : (process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID);
const location = locationArg ? locationArg.split('=')[1] : 'us-central1';
const keepCount = Math.max(1, Number(keepArg ? keepArg.split('=')[1] : 2) || 2);

const API_BASE = 'https://artifactregistry.googleapis.com/v1';

async function apiRequest(client, url, method = 'GET') {
  const res = await client.request({ url, method });
  return res.data;
}

async function listAllPages(client, baseUrl, key) {
  const items = [];
  let pageToken = '';
  do {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = pageToken ? `${baseUrl}${sep}pageToken=${encodeURIComponent(pageToken)}` : baseUrl;
    const data = await apiRequest(client, url);
    if (Array.isArray(data?.[key])) {
      items.push(...data[key]);
    }
    pageToken = data?.nextPageToken || '';
  } while (pageToken);
  return items;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧹 LIMPEZA DE IMAGENS NO ARTIFACT REGISTRY (CLOUD FUNCTIONS)');
  console.log('='.repeat(70));
  console.log(`Modo: ${isDryRun ? '🔍 SIMULAÇÃO (DRY-RUN)' : `🚨 REMOÇÃO REAL (mantendo últimas ${keepCount} versões)`}`);

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

  console.log(`Projeto GCP: ${projectId} | Região: ${location}`);

  const client = await auth.getClient();
  const reposParent = `${API_BASE}/projects/${projectId}/locations/${location}/repositories`;

  let repositories = [];
  try {
    repositories = await listAllPages(client, `${reposParent}?pageSize=100`, 'repositories');
  } catch (err) {
    const status = err?.response?.status || err?.code;
    const msg = err?.response?.data?.error?.message || err?.message || String(err);
    console.warn(`⚠️ Não foi possível listar repositórios do Artifact Registry (${status || 'erro'}): ${msg}`);
    if (isStrict) process.exit(1);
    return;
  }

  const dockerRepos = repositories.filter(
    (repo) => repo.format === 'DOCKER' && (repo.name.endsWith('/gcf-artifacts') || repo.name.includes('cloud-run-source-deploy'))
  );

  if (dockerRepos.length === 0) {
    console.log('ℹ️ Nenhum repositório Docker de Cloud Functions/Cloud Run encontrado nesta região.');
    return;
  }

  let totalPackages = 0;
  let totalDeleted = 0;
  let totalKept = 0;
  let totalErrors = 0;

  for (const repo of dockerRepos) {
    const repoShort = repo.name.split('/').pop();
    const packages = await listAllPages(client, `${API_BASE}/${repo.name}/packages?pageSize=200`, 'packages');
    console.log(`📦 Repositório ${repoShort}: ${packages.length} pacote(s)`);

    for (const pkg of packages) {
      totalPackages += 1;
      const versions = await listAllPages(client, `${API_BASE}/${pkg.name}/versions?pageSize=200`, 'versions');
      if (versions.length <= keepCount) {
        totalKept += versions.length;
        continue;
      }

      const sorted = [...versions].sort((a, b) => {
        const ta = Date.parse(a.updateTime || a.createTime || 0) || 0;
        const tb = Date.parse(b.updateTime || b.createTime || 0) || 0;
        return tb - ta;
      });

      const toKeep = sorted.slice(0, keepCount);
      const toDelete = sorted.slice(keepCount);
      totalKept += toKeep.length;

      const pkgShort = decodeURIComponent(pkg.name.split('/').pop() || pkg.name);
      if (isDryRun) {
        console.log(`  🔍 [DRY-RUN] ${pkgShort}: manter ${toKeep.length}, remover ${toDelete.length}`);
        totalDeleted += toDelete.length;
        continue;
      }

      for (const version of toDelete) {
        try {
          await apiRequest(client, `${API_BASE}/${version.name}`, 'DELETE');
          totalDeleted += 1;
        } catch (err) {
          totalErrors += 1;
          const status = err?.response?.status;
          const msg = err?.response?.data?.error?.message || err?.message || String(err);
          console.warn(`  ⚠️ Falha ao remover versão em ${pkgShort} (${status || 'erro'}): ${msg}`);
          if (status === 403) {
            console.warn('  ℹ️ Conceda a role roles/artifactregistry.repoAdmin (ou artifactregistry.versions.delete) à Service Account de deploy.');
            if (isStrict) process.exit(1);
            return;
          }
        }
      }
      console.log(`  ✅ ${pkgShort}: mantidas ${toKeep.length}, removidas ${toDelete.length}`);
    }
  }

  console.log('-'.repeat(70));
  console.log(`Resumo: ${totalPackages} pacotes | ${totalKept} versões mantidas | ${totalDeleted} ${isDryRun ? 'a remover' : 'removidas'} | ${totalErrors} falhas`);
}

main().catch((err) => {
  console.error('❌ Erro inesperado na limpeza do Artifact Registry:', err);
  if (isStrict) process.exit(1);
});
