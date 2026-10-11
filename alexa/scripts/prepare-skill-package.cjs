/**
 * Script para preparar os arquivos da Skill Alexa para diferentes ambientes (DEV vs PROD).
 * Adapta dinamicamente o manifesto (skill.json) e o modelo de interação (pt-BR.json).
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  dev: {
    endpoint: 'https://api.dev.luisices.com.br/alexaWebhook',
    invocation: 'ateliê de testes',
    skillName: 'Ateliê de Testes',
    privacyPolicyUrl: 'https://dev.luisices.com.br',
    testingInstructions: 'Ambiente isolado de desenvolvimento. Requer perfil de voz ativo no aplicativo Alexa e pareamento supervisionado aprovado por administrador no Luisices.'
  },
  prod: {
    endpoint: 'https://us-central1-papelaria-dashboard.cloudfunctions.net/alexaWebhook',
    invocation: 'ateliê',
    skillName: 'Luisices Ateliê',
    privacyPolicyUrl: 'https://luisices.com.br',
    testingInstructions: 'Ambiente de produção do ateliê Luisices.'
  }
};

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--env' && args[i + 1]) {
      result.env = args[++i];
    } else if (arg === '--endpoint' && args[i + 1]) {
      result.endpoint = args[++i];
    } else if (arg === '--invocation' && args[i + 1]) {
      result.invocation = args[++i];
    } else if (arg === '--skill-name' && args[i + 1]) {
      result.skillName = args[++i];
    } else if (arg === '--privacy-policy-url' && args[i + 1]) {
      result.privacyPolicyUrl = args[++i];
    } else if (arg === '--output-dir' && args[i + 1]) {
      result.outputDir = args[++i];
    } else if (arg === '--source-dir' && args[i + 1]) {
      result.sourceDir = args[++i];
    }
  }
  return result;
}

function prepareSkillPackage(options = {}) {
  const env = (options.env || 'dev').toLowerCase();
  if (env !== 'dev' && env !== 'prod') {
    throw new Error(`Ambiente inválido: '${env}'. Use 'dev' ou 'prod'.`);
  }

  const envDefaults = DEFAULTS[env];
  const endpoint = options.endpoint || (env === 'prod' ? process.env.ALEXA_PROD_ENDPOINT : process.env.ALEXA_DEV_ENDPOINT) || process.env.ALEXA_ENDPOINT || envDefaults.endpoint;
  const invocation = options.invocation || (env === 'dev' ? process.env.ALEXA_DEV_INVOCATION_NAME : process.env.ALEXA_PROD_INVOCATION_NAME) || envDefaults.invocation;
  const skillName = options.skillName || (env === 'dev' ? process.env.ALEXA_DEV_SKILL_NAME : process.env.ALEXA_PROD_SKILL_NAME) || envDefaults.skillName;
  const privacyPolicyUrl = options.privacyPolicyUrl || (env === 'dev' ? process.env.ALEXA_DEV_PRIVACY_POLICY_URL : process.env.ALEXA_PROD_PRIVACY_POLICY_URL) || process.env.ALEXA_PRIVACY_POLICY_URL || envDefaults.privacyPolicyUrl;

  const baseDir = options.sourceDir || path.resolve(__dirname, '../skill-package');
  const outDir = options.outputDir || path.resolve(__dirname, '../build/skill-package');

  const manifestPath = path.join(baseDir, 'skill.json');
  const interactionModelPath = path.join(baseDir, 'interactionModels/custom/pt-BR.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Arquivo de manifesto não encontrado em: ${manifestPath}`);
  }
  if (!fs.existsSync(interactionModelPath)) {
    throw new Error(`Arquivo de modelo de interação não encontrado em: ${interactionModelPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const interactionModel = JSON.parse(fs.readFileSync(interactionModelPath, 'utf8'));

  // 1. Atualiza manifesto
  if (manifest.manifest?.publishingInformation?.locales?.['pt-BR']) {
    const locale = manifest.manifest.publishingInformation.locales['pt-BR'];
    locale.name = skillName;
    locale.examplePhrases = [
      `Alexa, abrir ${invocation}`,
      `Alexa, peça ao ${invocation} para criar um pedido`,
      'vincular minha voz'
    ];
    if (env === 'prod') {
      locale.smallIconUri = 'https://cdn.luisices.com.br/public/images/alexa-small-icon.png';
      locale.largeIconUri = 'https://cdn.luisices.com.br/public/images/alexa-large-icon.png';
    } else {
      locale.smallIconUri = 'https://dev.luisices.com.br/images/alexa-small-icon.png';
      locale.largeIconUri = 'https://dev.luisices.com.br/images/alexa-large-icon.png';
    }
  }
  if (manifest.manifest?.publishingInformation) {
    manifest.manifest.publishingInformation.testingInstructions = envDefaults.testingInstructions;
  }
  if (manifest.manifest?.apis?.custom?.endpoint) {
    manifest.manifest.apis.custom.endpoint.uri = endpoint;
    manifest.manifest.apis.custom.endpoint.sslCertificateType = 'Wildcard';
  }
  if (!manifest.manifest.privacyAndCompliance) {
    manifest.manifest.privacyAndCompliance = {};
  }
  if (!manifest.manifest.privacyAndCompliance.locales) {
    manifest.manifest.privacyAndCompliance.locales = {};
  }
  if (!manifest.manifest.privacyAndCompliance.locales['pt-BR']) {
    manifest.manifest.privacyAndCompliance.locales['pt-BR'] = {};
  }
  manifest.manifest.privacyAndCompliance.locales['pt-BR'].privacyPolicyUrl = privacyPolicyUrl;

  // 2. Atualiza modelo de interação
  if (interactionModel.interactionModel?.languageModel) {
    interactionModel.interactionModel.languageModel.invocationName = invocation;
  }

  // 3. Salva no diretório de saída
  const outModelsDir = path.join(outDir, 'interactionModels/custom');
  fs.mkdirSync(outModelsDir, { recursive: true });

  const outManifestPath = path.join(outDir, 'skill.json');
  const outModelPath = path.join(outModelsDir, 'pt-BR.json');

  fs.writeFileSync(outManifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(outModelPath, JSON.stringify(interactionModel, null, 2) + '\n', 'utf8');

  return {
    env,
    endpoint,
    invocation,
    skillName,
    privacyPolicyUrl,
    manifestPath: outManifestPath,
    interactionModelPath: outModelPath,
  };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = prepareSkillPackage(args);
    console.log(`✅ Skill package preparado com sucesso para o ambiente [${result.env.toUpperCase()}]:`);
    console.log(`   - Nome: "${result.skillName}"`);
    console.log(`   - Invocação: "${result.invocation}"`);
    console.log(`   - Endpoint: ${result.endpoint}`);
    console.log(`   - Manifesto: ${result.manifestPath}`);
    console.log(`   - Modelo: ${result.interactionModelPath}`);
  } catch (err) {
    console.error(`❌ Erro ao preparar skill package:`, err.message);
    process.exit(1);
  }
}

module.exports = {
  prepareSkillPackage,
  DEFAULTS,
};
