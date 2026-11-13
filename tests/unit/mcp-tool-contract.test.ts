import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const { TOOLS_METADATA } = require('../../functions/mcp/openapi.js');
const { MCP_SCOPES, TOOL_SCOPE_MAP } = require('../../functions/mcp/constants.js');
const { AiToolsExecutor } = require('../../functions/ai/tools.js');

type DispatcherEntry = { name: string; method: string };

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(relativePath), 'utf8');
}

function readScopeNamesFromSource(source: string): string[] {
  const block = source.match(/const TOOL_SCOPE_MAP = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error('Não foi possível localizar o bloco TOOL_SCOPE_MAP.');
  return [...block[1].matchAll(/^\s{2}([a-z][a-z0-9_]*):\s*'[^']+',?\s*$/gm)]
    .map((match) => match[1]);
}

function readDispatcherEntries(source: string): DispatcherEntry[] {
  return [...source.matchAll(/case '([^']+)':\s*return await toolsExecutor\.([A-Za-z][A-Za-z0-9_]*)\(args, scope\);/g)]
    .map((match) => ({ name: match[1], method: match[2] }));
}

function readDocumentedCatalog(source: string): Array<{ name: string; scope: string }> {
  const section = source.match(/### 5\.1 Catálogo de ferramentas e escopos([\s\S]*?)(?=\n## 6\.)/);
  if (!section) throw new Error('Não foi possível localizar o catálogo MCP completo na documentação.');
  return [...section[1].matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)]
    .map((match) => ({ name: match[1], scope: match[2] }));
}

function duplicates(names: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }
  return [...repeated].sort();
}

function expectSameNames(reference: string[], candidate: string[], label: string): void {
  const referenceSet = new Set(reference);
  const candidateSet = new Set(candidate);
  const missing = [...referenceSet].filter((name) => !candidateSet.has(name)).sort();
  const extra = [...candidateSet].filter((name) => !referenceSet.has(name)).sort();

  expect({ missing, extra }, `${label}: nomes ausentes ou extras`).toEqual({ missing: [], extra: [] });
}

describe('Contrato de ferramentas MCP', () => {
  const metadataNames = TOOLS_METADATA.map((tool: { name: string }) => tool.name);
  const scopeNames = Object.keys(TOOL_SCOPE_MAP);
  const sourceScopeNames = readScopeNamesFromSource(readSource('functions/mcp/constants.js'));
  const dispatcherEntries = readDispatcherEntries(readSource('functions/mcp/endpoint.js'));
  const dispatcherNames = dispatcherEntries.map(({ name }) => name);
  const documentedCatalog = readDocumentedCatalog(readSource('docs/INTEGRACAO_CHATGPT_MCP.md'));
  const documentedNames = documentedCatalog.map(({ name }) => name);

  it('mantém nomes únicos no catálogo, no mapa de escopos e no dispatcher', () => {
    expect(duplicates(metadataNames), 'TOOLS_METADATA contém ferramenta duplicada').toEqual([]);
    expect(duplicates(sourceScopeNames), 'TOOL_SCOPE_MAP contém chave duplicada').toEqual([]);
    expect(duplicates(dispatcherNames), 'Dispatcher contém case duplicado').toEqual([]);
    expect(sourceScopeNames.sort(), 'Chaves declaradas e carregadas do mapa divergem')
      .toEqual(scopeNames.sort());
  });

  it('mantém catálogo, escopos e dispatcher com exatamente o mesmo conjunto de ferramentas', () => {
    expectSameNames(metadataNames, scopeNames, 'TOOLS_METADATA x TOOL_SCOPE_MAP');
    expectSameNames(metadataNames, dispatcherNames, 'TOOLS_METADATA x dispatcher');
  });

  it('publica o mesmo escopo requerido no schema e no mapa e usa escopos conhecidos', () => {
    const knownScopes = new Set(Object.values(MCP_SCOPES).map((scope: { id: string }) => scope.id));

    for (const tool of TOOLS_METADATA as Array<{ name: string; scope: string }>) {
      expect(TOOL_SCOPE_MAP[tool.name], `${tool.name}: escopo do schema difere do mapa`)
        .toBe(tool.scope);
      expect(knownScopes.has(tool.scope), `${tool.name}: escopo não declarado em MCP_SCOPES`)
        .toBe(true);
    }
  });

  it('mapeia cada rota do dispatcher para um método existente no executor', () => {
    for (const { name, method } of dispatcherEntries) {
      expect(typeof AiToolsExecutor.prototype[method], `${name}: AiToolsExecutor.${method} inexistente`)
        .toBe('function');
    }
  });

  it('mantém nomes e escopos do catálogo documental alinhados ao registro ativo', () => {
    expect(duplicates(documentedNames), 'Catálogo documental contém ferramenta duplicada').toEqual([]);
    expectSameNames(metadataNames, documentedNames, 'TOOLS_METADATA x catálogo documental');

    for (const entry of documentedCatalog) {
      expect(TOOL_SCOPE_MAP[entry.name], `${entry.name}: escopo documental difere do mapa`)
        .toBe(entry.scope);
    }
  });
});
