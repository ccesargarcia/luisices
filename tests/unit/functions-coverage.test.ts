import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function getIndexExports(): string[] {
  const content = fs.readFileSync(path.resolve('functions/index.js'), 'utf8');
  return [...content.matchAll(/expose\('([^']+)'/g)].map(m => m[1]).sort();
}

function parseChunksFromContent(content: string, startMarker: string, endMarker: string): string[] {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return [];
  const endIndex = content.indexOf(endMarker, startIndex);
  const section = endIndex === -1 ? content.slice(startIndex) : content.slice(startIndex, endIndex);

  const chunks = [...section.matchAll(/deploy_chunk\s+"[^"]+"\s+"([^"]+)"/g)].map(m => m[1]);
  return chunks.flatMap(c => c.split(',').map(fn => fn.trim().replace(/^functions:/, ''))).filter(Boolean);
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

  it('deploy-dev.yml: o deploy particionado cobre 100% das 63 funções com zero duplicatas', () => {
    const devWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-dev.yml'), 'utf8');
    const flattened = parseChunksFromContent(
      devWorkflow,
      'Executando deploy particionado resiliente por módulos (cobertura total 63 funções)...',
      'Removendo versões de secrets sem funções vinculadas'
    );

    const setFlat = new Set(flattened);
    const missing = indexExports.filter(fn => !setFlat.has(fn));
    const unexpected = flattened.filter(fn => !indexExports.includes(fn));

    expect(flattened.length, 'Não deve haver duplicatas nos chunks').toBe(setFlat.size);
    expect(missing, 'Nenhuma função exportada deve ficar de fora do fallback de dev').toEqual([]);
    expect(unexpected, 'Nenhuma função inexistente deve constar no workflow').toEqual([]);
    expect(setFlat.size).toBe(63);
  });

  it('deploy-functions-manual.yml (Dev): fallback particionado cobre 100% das 63 funções', () => {
    const manualWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-functions-manual.yml'), 'utf8');
    const flattened = parseChunksFromContent(
      manualWorkflow,
      'Particionando por domínios (cobertura total 63 funções)...',
      'Removendo versões de secrets sem funções vinculadas no Secret Manager (Dev)...'
    );

    const setFlat = new Set(flattened);
    const missing = indexExports.filter(fn => !setFlat.has(fn));

    expect(flattened.length).toBe(setFlat.size);
    expect(missing).toEqual([]);
    expect(setFlat.size).toBe(63);
  });

  it('deploy-functions-manual.yml (Produção): cobre exatamente as 61 funções elegíveis para prod', () => {
    const manualWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-functions-manual.yml'), 'utf8');
    const flattened = parseChunksFromContent(
      manualWorkflow,
      'Particionando por domínios (cobertura total 61 funções elegíveis)...',
      'Removendo versões de secrets sem funções vinculadas no Secret Manager (Prod)...'
    );

    const setFlat = new Set(flattened);
    const devOnlySandbox = ['calculateSuperfreteShipping', 'createSuperfreteLabel'];
    const expectedProdExports = indexExports.filter(fn => !devOnlySandbox.includes(fn));

    const missing = expectedProdExports.filter(fn => !setFlat.has(fn));
    const unexpectedInProd = flattened.filter(fn => devOnlySandbox.includes(fn));

    expect(flattened.length).toBe(setFlat.size);
    expect(missing, 'Todas as 61 funções elegíveis devem estar no fallback de produção').toEqual([]);
    expect(unexpectedInProd, 'Funções Sandbox SuperFrete não devem estar no fallback de produção').toEqual([]);
    expect(setFlat.size).toBe(61);
  });

  it('todos os escopos seletivos do MCP contêm as 11 funções do módulo', () => {
    const devWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-dev.yml'), 'utf8');
    const manualWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-functions-manual.yml'), 'utf8');

    const expectedMcp = [
      'getMcpSettingsStatus', 'createMcpApiKey', 'updateMcpApiKeyScopes', 'toggleMcpApiKey',
      'revokeMcpApiKey', 'toggleGlobalMcp', 'setUserMcpEligibility', 'revokeMcpSession',
      'getMcpAuditLogs', 'getMcpOpenApiSchema', 'chatGptToolsEndpoint'
    ].sort();

    const checkMcpSection = (content: string) => {
      const match = content.match(/deploy_chunk\s+"MCP"\s+"([^"]+)"/);
      expect(match).toBeTruthy();
      const functions = match![1].split(',').map(f => f.trim().replace(/^functions:/, '')).sort();
      expect(functions).toEqual(expectedMcp);
    };

    checkMcpSection(devWorkflow);
    checkMcpSection(manualWorkflow);
  });

  it('reconhece o módulo ai nos filtros regex de detecção em deploy-dev e deploy-production', () => {
    const devWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-dev.yml'), 'utf8');
    const prodWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-production.yml'), 'utf8');

    const expectedPattern = /\^functions\/\(email\|whatsapp\|alexa\|users\|mcp\|orders\|ai\)\//;

    expect(devWorkflow).toMatch(expectedPattern);
    expect(prodWorkflow).toMatch(expectedPattern);
  });

  it('roteia corretamente alterações isoladas de functions/ai e conjuntas com mcp para o escopo seletivo ai', () => {
    // Simula a lógica de shell dos workflows
    function resolveScope(changedFiles: string[]): string {
      const pattern = /^functions\/(email|whatsapp|alexa|users|mcp|orders|ai)\//;
      if (changedFiles.length === 1 && changedFiles[0] === 'functions/orders/superfrete.js') {
        return 'superfrete';
      }
      if (changedFiles.some(f => !pattern.test(f))) {
        return 'all';
      }
      const modules = [...new Set(changedFiles.map(f => f.replace(/^functions\/([^/]+)\/.*/, '$1')))].sort();
      if (modules.length === 1) return modules[0];
      if (modules.join('\n') === 'ai\nmcp') return 'ai';
      return 'all';
    }

    // Mudança isolada em IA
    expect(resolveScope(['functions/ai/callables.js', 'functions/ai/tools.js'])).toBe('ai');
    // Mudança conjunta em IA + MCP -> escopo ai (publica IA e MCP juntos sem disparar all)
    expect(resolveScope(['functions/ai/tools.js', 'functions/mcp/openapi.js'])).toBe('ai');
    // Mudança isolada no WhatsApp
    expect(resolveScope(['functions/whatsapp/send.js'])).toBe('whatsapp');
    // Mudança no index.js -> escopo all
    expect(resolveScope(['functions/index.js'])).toBe('all');
    // Mudança mista não suportada (IA + E-mail) -> escopo all
    expect(resolveScope(['functions/ai/callables.js', 'functions/email/send.js'])).toBe('all');
  });

  it('o escopo seletivo de IA publica tanto as functions de IA quanto os consumidores MCP', () => {
    const devWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-dev.yml'), 'utf8');
    const manualWorkflow = fs.readFileSync(path.resolve('.github/workflows/deploy-functions-manual.yml'), 'utf8');

    // Verifica que o bloco do escopo 'ai' publica tanto o chunk "IA" quanto o chunk "MCP"
    const aiScopePattern = /Deploy seletivo das Functions de IA e seus consumidores MCP[\s\S]*?deploy_chunk "IA"[\s\S]*?deploy_chunk "MCP"/;

    expect(devWorkflow).toMatch(aiScopePattern);
    expect(manualWorkflow).toMatch(aiScopePattern);
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
