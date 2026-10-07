import { describe, it, expect } from 'vitest';
import { runEmailBulkAction } from '../../src/app/utils/emailBulkActions';

describe('ações de e-mail em massa', () => {
  it('separa falhas parciais para preservar seleção e contar apenas sucessos', async () => {
    const result = await runEmailBulkAction(['ok', 'denied', 'offline'], async id => {
      if (id !== 'ok') throw new Error(id);
    });
    expect(result).toEqual({ succeeded: ['ok'], failed: ['denied', 'offline'] });
  });
  it('não relata sucesso quando todas as operações falham', async () => {
    expect(await runEmailBulkAction(['a', 'b'], () => { throw new Error('denied'); }))
      .toEqual({ succeeded: [], failed: ['a', 'b'] });
  });
});
