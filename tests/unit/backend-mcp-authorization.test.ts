import { describe, expect, it, vi } from 'vitest';

const { getCallerScope } = require('../../functions/ai/authorization');
const { AiDataRepositories } = require('../../functions/ai/repositories');
const { AiToolsExecutor } = require('../../functions/ai/tools');
const { getEffectiveUserScopes } = require('../../functions/mcp/oauth');

describe('backend MCP authorization', () => {
  it('allows quotes:write for either create or edit, but no other action', () => {
    const profile = (permission: Record<string, boolean>) => ({
      role: 'funcionario',
      permissions: { quotes: permission, mcpScopes: ['quotes:write'] },
    });

    expect(getEffectiveUserScopes(['quotes:write'], profile({ create: true }))).toEqual(['quotes:write']);
    expect(getEffectiveUserScopes(['quotes:write'], profile({ edit: true }))).toEqual(['quotes:write']);
    expect(getEffectiveUserScopes(['quotes:write'], profile({ view: true }))).toEqual([]);
  });

  it('grants cross-owner pricing reads only to employees explicitly allowed to view pricing', () => {
    expect(getCallerScope('employee-1', {
      role: 'funcionario', active: true, permissions: { pricing: { view: true } },
    }).canViewPricing).toBe(true);
    expect(getCallerScope('employee-1', {
      role: 'funcionario', active: true, permissions: { pricing: { view: false } },
    }).canViewPricing).toBe(false);
    expect(getCallerScope('user-1', {
      role: 'user', active: true, permissions: { pricing: { view: true } },
    }).canViewPricing).toBe(false);
  });

  it('rejects updates to another user’s pricing model before writing', async () => {
    const docRef = {
      get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ userId: 'owner-1' }) }),
      set: vi.fn(),
    };
    const db = { collection: vi.fn(() => ({ doc: vi.fn(() => docRef) })) };
    const repositories = new AiDataRepositories(db);

    await expect(repositories.savePricingRecipe(
      { uid: 'caller-2', isAdmin: false },
      { modelId: 'model-1', productName: 'Alterado' },
    )).rejects.toMatchObject({ code: 'permission-denied' });
    expect(docRef.set).not.toHaveBeenCalled();
  });

  it('checks create and edit permissions on their respective quote tools', async () => {
    const updateQuoteStatus = vi.fn();
    const tools = new AiToolsExecutor({ updateQuoteStatus });

    await expect(tools.executeCreateQuote({ confirmed: false }, {
      uid: 'user-1', permissions: { quotes: { edit: true } },
    })).rejects.toMatchObject({ code: 'permission-denied' });

    const preview = await tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0001', status: 'approved', confirmed: false,
    }, { uid: 'user-1', permissions: { quotes: { edit: true } } });
    expect(preview.preview).toBe(true);
    expect(updateQuoteStatus).not.toHaveBeenCalled();
  });

  it('requires orders:create before approving a quote with conversion enabled', async () => {
    const updateQuoteStatus = vi.fn();
    const tools = new AiToolsExecutor({ updateQuoteStatus });

    await expect(tools.executeUpdateQuoteStatus({
      quoteNumber: 'ORC-0001', status: 'approved', confirmed: true, convertToOrder: true,
    }, {
      uid: 'user-1',
      permissions: { quotes: { edit: true } },
      mcpScopes: ['quotes:write'],
    })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(updateQuoteStatus).not.toHaveBeenCalled();
  });
});
