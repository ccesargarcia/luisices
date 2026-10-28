import { describe, expect, it, vi } from 'vitest';

const { createGetAiUsageHandler } = require('../../../functions/ai/usageHandler');

describe('handler isolado de analytics históricos de IA', () => {
  const db = { name: 'analytics-db' };

  it('exige autenticação', async () => {
    const handler = createGetAiUsageHandler({ db, getSummary: vi.fn() });
    await expect(handler({})).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('permite somente administrador e não consulta o resumo para outros perfis', async () => {
    const getSummary = vi.fn();
    const handler = createGetAiUsageHandler({ db, getSummary });

    await expect(handler({
      auth: { uid: 'staff-1' },
      authProfile: { role: 'funcionario', active: true },
    })).rejects.toMatchObject({ code: 'permission-denied' });

    expect(getSummary).not.toHaveBeenCalled();
  });

  it('preserva a consulta de analytics para administrador ativo', async () => {
    const summary = { totals: { requests: 7 } };
    const getSummary = vi.fn().mockResolvedValue(summary);
    const handler = createGetAiUsageHandler({ db, getSummary });

    await expect(handler({
      auth: { uid: 'admin-1' },
      authProfile: { role: 'admin', active: true },
    })).resolves.toBe(summary);
    expect(getSummary).toHaveBeenCalledWith(db);
  });
});
