import { describe, expect, it, vi } from 'vitest';
const { createMcpAiServices } = require('../../../functions/mcp/aiServices');
const { AiDataRepositories } = require('../../../functions/ai/repositories');
const { AiToolsExecutor } = require('../../../functions/ai/tools');

describe('createMcpAiServices', () => {
  it('monta somente repositórios e executor com as dependências recebidas', () => {
    const firestore = { collection: vi.fn() };
    const auth = { getUser: vi.fn() };

    const services = createMcpAiServices({ firestore, auth });

    expect(services.repositories).toBeInstanceOf(AiDataRepositories);
    expect(services.repositories.db).toBe(firestore);
    expect(services.repositories.auth).toBe(auth);
    expect(services.toolsExecutor).toBeInstanceOf(AiToolsExecutor);
    expect(services.toolsExecutor.repos).toBe(services.repositories);
    expect(services).not.toHaveProperty('geminiClient');
    expect(services).not.toHaveProperty('handlers');
  });
});
