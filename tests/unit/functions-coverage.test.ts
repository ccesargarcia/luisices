import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CROSS_DOMAIN_CONSUMERS,
  DEV_ONLY_SANDBOX_FUNCTIONS,
  DOMAIN_FUNCTIONS,
  getFallbackChunks,
  resolveDeployPlan,
  resolveFunctionsScope,
} from '../../scripts/functions-deploy-map.mjs';

function getIndexExports(): string[] {
  const content = fs.readFileSync(path.resolve('functions/index.js'), 'utf8');
  return [...content.matchAll(/expose\('([^']+)'/g)].map(m => m[1]).sort();
}

describe('Cobertura e integridade das Cloud Functions nos workflows de deploy', () => {
  const indexExports = getIndexExports();

  it('functions/index.js exporta exatamente 63 Cloud Functions', () => {
    expect(indexExports.length).toBe(63);
  });

  it('tests/fixtures/functions-exports.json reflete 100% dos exports de index.js sem omissões', () => {
    const fixtureRaw = fs.readFileSync(path.resolve('tests/fixtures/functions-exports.json'), 'utf8');
    const fixtureData: Record<string, string[]> = JSON.parse(fixtureRaw);
    const fixtureExports = Object.values(fixtureData).flat().sort();

    const missingInFixture = indexExports.filter(fn => !fixtureExports.includes(fn));
    const extraInFixture = fixtureExports.filter(fn => !indexExports.includes(fn));

    expect(missingInFixture, 'Funções em index.js faltando no fixture').toEqual([]);
    expect(extraInFixture, 'Funções no fixture inexistentes em index.js').toEqual([]);
  });

  it('scripts/functions-deploy-map.mjs (Dev): fallback particionado cobre 100% das 63 funções com zero duplicatas', () => {
    const chunks = getFallbackChunks('dev');
    const flattened = chunks.flatMap(c => c.functions);

    const setFlat = new Set(flattened);
    const missing = indexExports.filter(fn => !setFlat.has(fn));
    const unexpected = flattened.filter(fn => !indexExports.includes(fn));

    expect(flattened.length, 'Não deve haver duplicatas nos chunks').toBe(setFlat.size);
    expect(missing, 'Nenhuma função exportada deve ficar de fora do fallback de dev').toEqual([]);
    expect(unexpected, 'Nenhuma função inexistente deve constar no mapa').toEqual([]);
    expect(setFlat.size).toBe(63);
  });

  it('scripts/functions-deploy-map.mjs (Produção): cobre exatamente as 61 funções elegíveis para prod', () => {
    const chunks = getFallbackChunks('prod');
    const flattened = chunks.flatMap(c => c.functions);

    const setFlat = new Set(flattened);
    const expectedProdExports = indexExports.filter(fn => !DEV_ONLY_SANDBOX_FUNCTIONS.includes(fn));

    const missing = expectedProdExports.filter(fn => !setFlat.has(fn));
    const unexpectedInProd = flattened.filter(fn => DEV_ONLY_SANDBOX_FUNCTIONS.includes(fn));

    expect(flattened.length).toBe(setFlat.size);
    expect(missing, 'Todas as 61 funções elegíveis devem estar no fallback de produção').toEqual([]);
    expect(unexpectedInProd, 'Funções Sandbox SuperFrete não devem estar no fallback de produção').toEqual([]);
    expect(setFlat.size).toBe(61);
  });

  it('o escopo seletivo do MCP contém as 11 funções do módulo e o escopo de IA inclui IA + MCP sem duplicatas', () => {
    const expectedMcp = [
      'getMcpSettingsStatus', 'createMcpApiKey', 'updateMcpApiKeyScopes', 'toggleMcpApiKey',
      'revokeMcpApiKey', 'toggleGlobalMcp', 'setUserMcpEligibility', 'revokeMcpSession',
      'getMcpAuditLogs', 'getMcpOpenApiSchema', 'chatGptToolsEndpoint'
    ].sort();

    expect([...DOMAIN_FUNCTIONS.mcp].sort()).toEqual(expectedMcp);

    const aiPlan = resolveDeployPlan('ai', 'prod');
    expect(aiPlan.mode).toBe('Selective');
    expect(aiPlan.chunks.map(c => c.label)).toEqual(['IA', 'MCP']);
    expect(aiPlan.chunks[1].functions.sort()).toEqual(expectedMcp);
  });

  it('os workflows deploy-dev, deploy-production e deploy-functions-manual delegam para scripts/functions-deploy-map.mjs', () => {
    const devWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-dev.yml'), 'utf8');
    const prodWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-production.yml'), 'utf8');
    const manualWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-functions-manual.yml'), 'utf8');

    const expectedPattern = /\^functions\/\(email\|whatsapp\|alexa\|users\|mcp\|orders\|ai\|media\)\//;

    expect(devWorkflow).toMatch(expectedPattern);
    expect(prodWorkflow).toMatch(expectedPattern);
    expect(devWorkflow).toContain('node scripts/functions-deploy-map.mjs --resolve-scope --env=dev');
    expect(prodWorkflow).toContain('node scripts/functions-deploy-map.mjs --resolve-scope --env=prod');
    expect(devWorkflow).toContain('node scripts/functions-deploy-map.mjs --print-chunks --env=dev');
    expect(manualWorkflow).toContain('node scripts/functions-deploy-map.mjs --print-chunks --env=dev');
    expect(manualWorkflow).toContain('node scripts/functions-deploy-map.mjs --print-chunks --env=prod');
  });

  it('resolveFunctionsScope suporta domínios únicos, combinações de até 3 domínios e fallback para all quando >3 ou arquivo raiz', () => {
    // Mudança isolada em IA
    expect(resolveFunctionsScope(['functions/ai/callables.js', 'functions/ai/tools.js'])).toBe('ai');
    // Mudança conjunta em IA + MCP -> deduplica para 'ai' (que já publica IA + MCP)
    expect(resolveFunctionsScope(['functions/ai/tools.js', 'functions/mcp/openapi.js'])).toBe('ai');
    // Mudança conjunta em Pedidos + Mídia -> deduplica para 'orders' (que já inclui galleryMedia)
    expect(resolveFunctionsScope(['functions/orders/index.js', 'functions/media/gallery.js'])).toBe('orders');
    // Mudança isolada em Mídia
    expect(resolveFunctionsScope(['functions/media/gallery.js'])).toBe('media');
    // Mudança isolada em SuperFrete (dev vs prod)
    expect(resolveFunctionsScope(['functions/orders/superfrete.js'], { env: 'dev' })).toBe('superfrete');
    expect(resolveFunctionsScope(['functions/orders/superfrete.js'], { env: 'prod' })).toBe('all');
    // Mudança em 2 domínios distintos (ex.: IA + Usuários) -> escopo combinado seletivo sem cair em all!
    expect(resolveFunctionsScope(['functions/ai/repositories.js', 'functions/users/index.js'])).toBe('ai,users');
    // Mudança em 3 domínios distintos -> escopo combinado seletivo
    expect(resolveFunctionsScope([
      'functions/ai/tools.js',
      'functions/mcp/openapi.js', // deduplicado com ai
      'functions/users/index.js',
      'functions/email/send.js',
    ])).toBe('ai,email,users');
    // Mudança em 4+ domínios distintos -> cai em 'all'
    expect(resolveFunctionsScope([
      'functions/ai/tools.js',
      'functions/users/index.js',
      'functions/email/send.js',
      'functions/whatsapp/send.js',
    ])).toBe('all');
    // Mudança em arquivo raiz ou common -> 'all'
    expect(resolveFunctionsScope(['functions/index.js'])).toBe('all');
    expect(resolveFunctionsScope(['functions/common/sentry.js', 'functions/users/index.js'])).toBe('all');

    // Mudança em arquivos com consumidores cross-domain (diretos e transitivos) -> inclui automaticamente os consumidores
    expect(resolveFunctionsScope(['functions/mcp/profilePermissions.js'])).toBe('mcp,users');
    expect(resolveFunctionsScope(['functions/mcp/profilePermissions.js', 'functions/email/send.js'])).toBe('email,mcp,users');
    expect(resolveFunctionsScope(['functions/mcp/constants.js', 'functions/email/send.js'])).toBe('ai,email,users');
    expect(resolveFunctionsScope(['functions/mcp/tracing.js'])).toBe('ai'); // ai já publica IA + MCP
    expect(resolveFunctionsScope(['functions/alexa/constants.js'])).toBe('ai,alexa');
  });

  it('todos os imports cross-domain (diretos e transitivos) em functions/ estão mapeados em CROSS_DOMAIN_CONSUMERS ou cobertos por bundle implícito', () => {
    const domains = ['ai', 'alexa', 'email', 'mcp', 'media', 'orders', 'users', 'whatsapp'];
    const unmappedImports: string[] = [];

    function collectTransitiveIntraDomainFiles(domain: string, entryFile: string, visited = new Set<string>()): string[] {
      const relKey = `functions/${domain}/${entryFile}`;
      if (visited.has(relKey)) return [];
      visited.add(relKey);

      const fullPath = path.resolve('functions', domain, entryFile);
      if (!fs.existsSync(fullPath)) return [relKey];

      const content = fs.readFileSync(fullPath, 'utf8');
      const localMatches = [...content.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)];
      for (const m of localMatches) {
        const sub = m[1].endsWith('.js') ? m[1] : `${m[1]}.js`;
        collectTransitiveIntraDomainFiles(domain, sub, visited);
      }
      return [...visited];
    }

    for (const consumerDomain of domains) {
      const domainDir = path.resolve('functions', consumerDomain);
      const files = fs.readdirSync(domainDir).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(domainDir, file), 'utf8');
        const matches = [...content.matchAll(/require\(['"]\.\.\/([^/'"]+)\/([^'"]+)['"]\)/g)];

        for (const match of matches) {
          const targetDomain = match[1];
          const targetSubpath = match[2].endsWith('.js') ? match[2] : `${match[2]}.js`;

          if (!domains.includes(targetDomain) || targetDomain === consumerDomain) {
            continue;
          }

          // Dependência implícita já garantida:
          // - Alterar qualquer arquivo em functions/ai/* já publica os chunks IA + MCP
          if (targetDomain === 'ai' && consumerDomain === 'mcp') {
            continue;
          }
          // - Alterar qualquer arquivo em functions/orders/* já publica Pedidos (que inclui galleryMedia)
          if (targetDomain === 'orders' && consumerDomain === 'media') {
            continue;
          }

          const transitiveTargetKeys = collectTransitiveIntraDomainFiles(targetDomain, targetSubpath);
          for (const targetFileKey of transitiveTargetKeys) {
            const mappedConsumers = CROSS_DOMAIN_CONSUMERS[targetFileKey as keyof typeof CROSS_DOMAIN_CONSUMERS] || [];
            if (!mappedConsumers.includes(consumerDomain)) {
              unmappedImports.push(`functions/${consumerDomain}/${file} -> ${targetFileKey}`);
            }
          }
        }
      }
    }

    expect(unmappedImports, 'Imports entre domínios (diretos ou transitivos) sem mapeamento em CROSS_DOMAIN_CONSUMERS').toEqual([]);
  });

  it('resolveDeployPlan combina múltiplos domínios sem duplicar functions e bloqueia superfrete em produção', () => {
    const plan = resolveDeployPlan('ai,mcp,users', 'prod');
    expect(plan.mode).toBe('Selective');
    expect(plan.chunks.map(c => c.label)).toEqual(['IA', 'MCP', 'Usuários']);

    const allFns = plan.chunks.flatMap(c => c.functions);
    expect(allFns.length).toBe(new Set(allFns).size);

    expect(() => resolveDeployPlan('superfrete', 'prod')).toThrow(/SuperFrete Sandbox/);
    expect(() => resolveDeployPlan('calculateSuperfreteShipping', 'prod')).toThrow(/SuperFrete Sandbox/);
  });

  it('mcp_metadata e cloudflare_cache incluem functions/ai/ para invalidar cache quando houver mudanças em tools', () => {
    const devWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-dev.yml'), 'utf8');
    const prodWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-production.yml'), 'utf8');

    // Em dev, paths-filter de mcp_metadata deve incluir functions/ai/**
    expect(devWorkflow).toMatch(/mcp_metadata:[\s\S]*?- 'functions\/ai\/\*\*'/);

    // Em produção, a regex de cloudflare_cache deve incluir ai
    expect(prodWorkflow).toMatch(/\^functions\/\(mcp\|ai\)\//);
  });
});
