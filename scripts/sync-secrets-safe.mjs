#!/usr/bin/env node
/**
 * Sincronização Inteligente de Segredos com o Google Secret Manager.
 *
 * Evita a criação desnecessária de versões idênticas a cada deploy,
 * comparando o hash/valor com a versão ativa (latest) antes de criar nova versão.
 *
 * Uso:
 *   node scripts/sync-secrets-safe.mjs --project=luisices-dev
 */

import { createRequire } from 'node:module';

// Deploys de Functions instalam apenas functions/node_modules. Resolva a
// dependência declarada nesse pacote, independentemente do diretório atual.
const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { GoogleAuth } = requireFunctions('google-auth-library');

const args = process.argv.slice(2);
const projectArg = args.find((a) => a.startsWith('--project='));
const keyFileArg = args.find((a) => a.startsWith('--key-file='));

const credentialsPath = keyFileArg ? keyFileArg.split('=')[1] : process.env.GOOGLE_APPLICATION_CREDENTIALS;
let projectId = projectArg ? projectArg.split('=')[1] : (process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID);

const SECRETS_TO_SYNC = [
  { name: 'ORIGIN_SECRET', value: process.env.ORIGIN_SECRET },
  { name: 'ALEXA_IDENTITY_HMAC_KEY', value: process.env.ALEXA_HMAC || process.env.ALEXA_IDENTITY_HMAC_KEY },
  { name: 'RESEND_API_KEY', value: process.env.RESEND_API_KEY },
  { name: 'RESEND_WEBHOOK_SECRET', value: process.env.RESEND_WEBHOOK_SECRET },
  { name: 'EVOLUTION_API_KEY', value: process.env.EVOLUTION_API_KEY },
  { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY },
  { name: 'SUPERFRETE_SANDBOX_TOKEN', value: process.env.SUPERFRETE_SANDBOX_TOKEN },
  { name: 'ORDER_TRACKING_ENCRYPTION_KEY', value: process.env.ORDER_TRACKING_ENCRYPTION_KEY },
];

async function main() {
  console.log('='.repeat(70));
  console.log('🔒 SINCRONIZAÇÃO SEGURA DE SECRETS (ANTI-ACÚMULO DE VERSÕES)');
  console.log('='.repeat(70));

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
    console.error('❌ ERRO: ID do projeto não informado.');
    process.exit(1);
  }

  console.log(`Projeto: ${projectId}`);

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

  if (!token) {
    console.error('❌ ERRO: Falha ao obter token de acesso Google Cloud.');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  let skippedCount = 0;
  let updatedCount = 0;
  let createdCount = 0;
  const failures = [];

  for (const item of SECRETS_TO_SYNC) {
    const { name, value } = item;
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      continue;
    }

    const trimmedValue = value.trim();
    const secretPath = `projects/${projectId}/secrets/${name}`;

    try {
      // 1. Verificar se o secret existe
      const getSecretRes = await fetch(`https://secretmanager.googleapis.com/v1/${secretPath}`, { headers });

      if (getSecretRes.status === 404) {
        // Secret não existe: criar o secret e adicionar a versão inicial
        console.log(`➕ Criando novo secret: ${name}...`);
        const createRes = await fetch(`https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets?secretId=${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            replication: { automatic: {} },
          }),
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error(`❌ Falha ao criar secret ${name}: ${errText}`);
          failures.push({ name, error: `Falha ao criar: ${errText}` });
          continue;
        }

        // Adicionar versão inicial
        const addRes = await fetch(`https://secretmanager.googleapis.com/v1/${secretPath}:addVersion`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            payload: { data: Buffer.from(trimmedValue, 'utf-8').toString('base64') },
          }),
        });

        if (addRes.ok) {
          console.log(`   ✓ Criado e versão inicial adicionada.`);
          createdCount++;
        } else {
          const errText = await addRes.text();
          console.error(`   ✗ Falha ao adicionar versão inicial para ${name}: ${errText}`);
          failures.push({ name, error: `Falha ao adicionar versão inicial: ${errText}` });
        }
        continue;
      }

      if (!getSecretRes.ok) {
        const errText = await getSecretRes.text();
        console.error(`❌ Falha ao consultar secret ${name} (${getSecretRes.status}): ${errText}`);
        failures.push({ name, error: `Falha ao consultar: ${errText}` });
        continue;
      }

      // 2. Secret já existe: verificar o valor da versão 'latest'
      const accessRes = await fetch(`https://secretmanager.googleapis.com/v1/${secretPath}/versions/latest:access`, { headers });

      if (accessRes.ok) {
        const accessData = await accessRes.json();
        const currentValBase64 = accessData?.payload?.data || '';
        const currentValue = Buffer.from(currentValBase64, 'base64').toString('utf-8');

        if (currentValue === trimmedValue) {
          console.log(`⏩ ${name}: Valor idêntico à versão atual. Nenhuma versão criada ($0 custo).`);
          skippedCount++;
          continue;
        }
      } else if (accessRes.status !== 404) {
        const errText = await accessRes.text();
        console.error(`❌ Falha ao ler a versão atual de ${name} (${accessRes.status}): ${errText}`);
        failures.push({ name, error: `Falha ao ler versão atual (${accessRes.status}): ${errText}` });
        continue;
      }

      // 3. O valor mudou ou não há versão ativa: adicionar nova versão
      console.log(`🔄 ${name}: Valor alterado ou atualizado. Gravando nova versão...`);
      const addVersionRes = await fetch(`https://secretmanager.googleapis.com/v1/${secretPath}:addVersion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payload: { data: Buffer.from(trimmedValue, 'utf-8').toString('base64') },
        }),
      });

      if (addVersionRes.ok) {
        const newVersion = await addVersionRes.json();
        const vNum = newVersion.name?.split('/').pop();
        console.log(`   ✓ Nova versão adicionada com sucesso: v${vNum}`);
        updatedCount++;
      } else {
        const errText = await addVersionRes.text();
        console.error(`   ✗ Falha ao atualizar ${name}: ${errText}`);
        failures.push({ name, error: `Falha ao adicionar nova versão: ${errText}` });
      }
    } catch (err) {
      console.error(`❌ Erro inesperado ao processar secret ${name}:`, err);
      failures.push({ name, error: err.message || String(err) });
    }
  }

  console.log('-'.repeat(70));
  console.log(`Resultado: ${skippedCount} inalterados (pulados), ${updatedCount} atualizados, ${createdCount} criados.`);
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} segredo(s) falharam na sincronização:`);
    for (const f of failures) {
      console.error(`   - ${f.name}: ${f.error}`);
    }
    console.log('='.repeat(70));
    // Deixa stdout/stderr esvaziarem para não perder o resumo da falha.
    process.exitCode = 1;
  }
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('❌ Erro fatal na sincronização de secrets:', err);
  process.exitCode = 1;
});
