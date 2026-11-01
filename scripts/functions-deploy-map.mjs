#!/usr/bin/env node
/**
 * Fonte única de verdade para o mapeamento de Cloud Functions por domínio,
 * resolução de escopo seletivo (incluindo múltiplos domínios) e geração de
 * chunks de deploy para DEV (luisices-dev) e PROD (papelaria-dashboard).
 */

export const DEV_ONLY_SANDBOX_FUNCTIONS = [
  'calculateSuperfreteShipping',
  'createSuperfreteLabel',
];

export const DOMAIN_FUNCTIONS = {
  whatsapp: [
    'sendWhatsAppDirectMessage',
    'deleteWhatsAppMessage',
    'syncWhatsAppChatMessages',
    'getWhatsAppInstanceStatus',
    'evolutionWhatsAppWebhook',
    'markWhatsAppChatRead',
    'ensureWhatsAppConversation',
  ],
  alexa: [
    'approveAlexaDraft',
    'approveAlexaPairing',
    'cancelAlexaDraft',
    'getAlexaIntegrationStatus',
    'revokeAlexaBinding',
    'setAlexaPermission',
    'toggleGlobalAlexaIntegration',
    'alexaWebhook',
  ],
  email: [
    'cleanupEmailDrafts',
    'resendReceivingWebhook',
    'sendCustomEmail',
    'getEmailUsage',
  ],
  ai: [
    'aiAgentChat',
    'getAiUsage',
    'enrichGalleryItemWithAi',
    'enrichStoreProductWithAi',
  ],
  media: [
    'galleryMedia',
  ],
  ordersCore: [
    'createOrder',
    'updateComplexOrder',
    'submitPublicCatalogOrder',
    'getPublicCatalogProducts',
  ],
  superfrete: [
    'calculateSuperfreteShipping',
    'createSuperfreteLabel',
  ],
  tracking: [
    'createOrderTrackingLink',
    'listOrderTrackingLinks',
    'revokeOrderTrackingLink',
    'revokeOrderTrackingLinkById',
    'deleteOrderTrackingLink',
    'deleteOrderTrackingLinksBatch',
    'getPublicOrderTracking',
  ],
  users: [
    'updateUser',
    'recordUserPasswordChange',
    'completeUserInvitation',
    'createUserInvitation',
    'createUser',
    'getUserAccountMetadata',
    'deleteUser',
    'revokeAllSessions',
    'repairUserClaims',
    'registerDeviceSession',
    'revokeDeviceSession',
    'sendAdminPasswordReset',
    'sendPasswordResetEmail',
    'sendVerificationEmail',
    'validateUserInvitation',
  ],
  mcp: [
    'getMcpSettingsStatus',
    'createMcpApiKey',
    'updateMcpApiKeyScopes',
    'toggleMcpApiKey',
    'revokeMcpApiKey',
    'toggleGlobalMcp',
    'setUserMcpEligibility',
    'revokeMcpSession',
    'getMcpAuditLogs',
    'getMcpOpenApiSchema',
    'chatGptToolsEndpoint',
  ],
};

export const KNOWN_DOMAINS = new Set([
  'superfrete',
  'email',
  'whatsapp',
  'alexa',
  'users',
  'orders',
  'mcp',
  'ai',
  'media',
]);

/**
 * Número máximo de domínios combinados em um deploy seletivo antes de recorrer ao escopo 'all'.
 */
export const MAX_SELECTIVE_DOMAINS = 3;

/**
 * Mapa explícito de arquivos pertencentes a um domínio que são importados diretamente
 * por outros domínios via require('../<dominio>/<arquivo>').
 * Quando um desses arquivos é alterado, os domínios consumidores também são incluídos no escopo.
 */
export const CROSS_DOMAIN_CONSUMERS = {
  'functions/mcp/profilePermissions.js': ['users'],
  'functions/mcp/tracing.js': ['ai'],
  'functions/mcp/constants.js': ['ai', 'users'],
  'functions/alexa/constants.js': ['ai'],
};

/**
 * Determina o escopo de deploy a partir da lista de arquivos alterados em functions/.
 * Suporta múltiplos domínios combinados (ex.: "ai,users" ou "orders,whatsapp") sem cair em "all".
 *
 * @param {string[]} changedFiles Caminhos relativos ao repositório (ex.: ['functions/ai/tools.js', 'functions/users/index.js'])
 * @param {{ env?: 'dev' | 'prod', maxDomains?: number }} [options]
 * @returns {string} Escopo resolvido ('all', 'ai', 'ai,users', 'superfrete', etc.)
 */
export function resolveFunctionsScope(changedFiles, options = {}) {
  const env = options.env || 'prod';
  const maxDomains = options.maxDomains ?? MAX_SELECTIVE_DOMAINS;

  const cleanFiles = (changedFiles || [])
    .map((f) => String(f || '').trim())
    .filter(Boolean);

  if (cleanFiles.length === 0) {
    return 'all';
  }

  if (cleanFiles.length === 1 && cleanFiles[0] === 'functions/orders/superfrete.js') {
    return env === 'prod' ? 'all' : 'superfrete';
  }

  const domainRegex = /^functions\/(email|whatsapp|alexa|users|mcp|orders|ai|media)\//;
  if (cleanFiles.some((f) => !domainRegex.test(f))) {
    return 'all';
  }

  const moduleSet = new Set(cleanFiles.map((f) => f.replace(/^functions\/([^/]+)\/.*/, '$1')));

  // Expande consumidores cross-domain quando um arquivo compartilhado entre domínios é alterado
  for (const file of cleanFiles) {
    const consumers = CROSS_DOMAIN_CONSUMERS[file];
    if (consumers) {
      for (const consumer of consumers) {
        moduleSet.add(consumer);
      }
    }
  }

  const rawModules = [...moduleSet].sort();

  // Normaliza dependências implícitas entre domínios:
  // - 'ai' já publica tanto o chunk IA quanto o chunk MCP
  // - 'orders' já publica galleryMedia (media)
  const normalized = rawModules.filter((mod) => {
    if (mod === 'mcp' && rawModules.includes('ai')) return false;
    if (mod === 'media' && rawModules.includes('orders')) return false;
    return true;
  });

  if (normalized.length === 0 || normalized.length > maxDomains) {
    return 'all';
  }

  return normalized.join(',');
}

function formatTargets(fnList) {
  return fnList.map((fn) => `functions:${fn}`).join(',');
}

/**
 * Retorna os chunks de deploy para um único domínio.
 * @param {string} domain
 * @param {'dev' | 'prod'} env
 * @returns {Array<{ label: string, functions: string[], targets: string }>}
 */
export function getDomainChunks(domain, env = 'prod') {
  const isDev = env === 'dev';

  switch (domain) {
    case 'superfrete': {
      if (!isDev) {
        throw new Error('A integração SuperFrete Sandbox só pode ser publicada no ambiente dev.');
      }
      return [{ label: 'SuperFrete', functions: [...DOMAIN_FUNCTIONS.superfrete] }];
    }
    case 'email':
      return [{ label: 'E-mail', functions: [...DOMAIN_FUNCTIONS.email] }];
    case 'whatsapp':
      return [{ label: 'WhatsApp', functions: [...DOMAIN_FUNCTIONS.whatsapp] }];
    case 'alexa':
      return [{ label: 'Alexa', functions: [...DOMAIN_FUNCTIONS.alexa] }];
    case 'users':
      return [{ label: 'Usuários', functions: [...DOMAIN_FUNCTIONS.users] }];
    case 'media':
      return [{ label: 'Mídia', functions: [...DOMAIN_FUNCTIONS.media] }];
    case 'orders': {
      const orderFns = [
        ...DOMAIN_FUNCTIONS.ordersCore,
        ...(isDev ? DOMAIN_FUNCTIONS.superfrete : []),
        ...DOMAIN_FUNCTIONS.media,
      ];
      return [
        { label: 'Pedidos', functions: orderFns },
        { label: 'Acompanhamento', functions: [...DOMAIN_FUNCTIONS.tracking] },
      ];
    }
    case 'mcp':
      return [{ label: 'MCP', functions: [...DOMAIN_FUNCTIONS.mcp] }];
    case 'ai':
      return [
        { label: 'IA', functions: [...DOMAIN_FUNCTIONS.ai] },
        { label: 'MCP', functions: [...DOMAIN_FUNCTIONS.mcp] },
      ];
    default:
      throw new Error(`Domínio desconhecido: ${domain}`);
  }
}

/**
 * Retorna os chunks do fallback particionado completo (63 funções em dev, 61 em prod).
 * @param {'dev' | 'prod'} env
 * @returns {Array<{ label: string, functions: string[], targets: string }>}
 */
export function getFallbackChunks(env = 'prod') {
  const isDev = env === 'dev';
  const rawChunks = [
    { label: 'WhatsApp', functions: [...DOMAIN_FUNCTIONS.whatsapp] },
    { label: 'Alexa', functions: [...DOMAIN_FUNCTIONS.alexa] },
    { label: 'E-mail', functions: [...DOMAIN_FUNCTIONS.email] },
    { label: 'IA e Mídia', functions: [...DOMAIN_FUNCTIONS.ai, ...DOMAIN_FUNCTIONS.media] },
    {
      label: isDev ? 'Pedidos e SuperFrete' : 'Pedidos',
      functions: [
        ...DOMAIN_FUNCTIONS.ordersCore,
        ...(isDev ? DOMAIN_FUNCTIONS.superfrete : []),
      ],
    },
    { label: 'Acompanhamento', functions: [...DOMAIN_FUNCTIONS.tracking] },
    { label: 'Usuários', functions: [...DOMAIN_FUNCTIONS.users] },
    { label: 'MCP', functions: [...DOMAIN_FUNCTIONS.mcp] },
  ];

  return rawChunks.map((c) => ({
    ...c,
    targets: formatTargets(c.functions),
  }));
}

/**
 * Resolve uma string de escopo (ex.: 'ai', 'ai,users', 'fallback', ou lista de functions avulsas)
 * em uma lista sem duplicatas de chunks prontos para deploy.
 *
 * @param {string} scope
 * @param {'dev' | 'prod'} env
 * @returns {{ mode: 'Selective' | 'Fallback' | 'Direct' | 'All', chunks: Array<{ label: string, functions: string[], targets: string }> }}
 */
export function resolveDeployPlan(scope, env = 'prod') {
  const raw = String(scope || '').trim();
  if (!raw || raw === 'all' || raw === 'auto') {
    return { mode: 'All', chunks: [] };
  }
  if (raw === 'fallback') {
    return { mode: 'Fallback', chunks: getFallbackChunks(env) };
  }

  const tokens = raw.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  const allKnownDomains = tokens.every((t) => KNOWN_DOMAINS.has(t));

  if (allKnownDomains) {
    const seenFunctions = new Set();
    const chunks = [];

    for (const domain of tokens) {
      const domainChunks = getDomainChunks(domain, env);
      for (const chunk of domainChunks) {
        const uniqueFns = chunk.functions.filter((fn) => !seenFunctions.has(fn));
        if (uniqueFns.length > 0) {
          uniqueFns.forEach((fn) => seenFunctions.add(fn));
          chunks.push({
            label: chunk.label,
            functions: uniqueFns,
            targets: formatTargets(uniqueFns),
          });
        }
      }
    }

    return { mode: 'Selective', chunks };
  }

  // Lista explícita de functions individuais (ex.: "createOrder,updateComplexOrder")
  const explicitFns = tokens.map((t) => t.replace(/^functions:/, '')).filter(Boolean);
  if (env === 'prod' && explicitFns.some((fn) => DEV_ONLY_SANDBOX_FUNCTIONS.includes(fn))) {
    throw new Error('A integração SuperFrete Sandbox só pode ser publicada no ambiente dev.');
  }

  return {
    mode: 'Direct',
    chunks: [
      {
        label: 'Direcionado',
        functions: explicitFns,
        targets: formatTargets(explicitFns),
      },
    ],
  };
}

// ─── CLI Entrypoint ──────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const modeArg = args[0];

  if (modeArg === '--resolve-scope') {
    const envFlag = args.find((a) => a.startsWith('--env='));
    const env = envFlag ? envFlag.split('=')[1] : 'prod';
    const files = args
      .slice(1)
      .filter((a) => !a.startsWith('--'))
      .flatMap((a) => a.split(/\r?\n/))
      .map((s) => s.trim())
      .filter(Boolean);
    process.stdout.write(`${resolveFunctionsScope(files, { env })}\n`);
  } else if (modeArg === '--print-chunks') {
    const envFlag = args.find((a) => a.startsWith('--env='));
    const scopeFlag = args.find((a) => a.startsWith('--scope='));
    const env = envFlag ? envFlag.split('=')[1] : 'prod';
    const scope = scopeFlag ? scopeFlag.slice('--scope='.length) : 'all';

    try {
      const plan = resolveDeployPlan(scope, env);
      for (const chunk of plan.chunks) {
        process.stdout.write(`${chunk.label}|${chunk.targets}\n`);
      }
    } catch (err) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  } else {
    console.error('Uso: node scripts/functions-deploy-map.mjs [--resolve-scope [--env=dev|prod] <files...> | --print-chunks --env=dev|prod --scope=<scope>]');
    process.exit(1);
  }
}
