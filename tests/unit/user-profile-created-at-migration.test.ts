import { describe, expect, it } from 'vitest';
import { parseLegacyIsoDate } from '../../scripts/migrate-user-profile-created-at.mjs';

describe('migração de userProfiles.createdAt', () => {
  it('aceita datas ISO UTC canônicas e preserva o instante', () => {
    const date = parseLegacyIsoDate('2024-03-12T14:15:16.789Z');
    expect(date?.toISOString()).toBe('2024-03-12T14:15:16.789Z');
  });

  it.each([
    undefined,
    null,
    1710252916789,
    '12/03/2024',
    '2024-03-12T14:15:16Z',
    '2024-02-30T14:15:16.789Z',
    '2024-03-12T14:15:16.789+00:00',
  ])('ignora valor ausente, inválido ou fora do formato legado seguro: %s', (value) => {
    expect(parseLegacyIsoDate(value)).toBeNull();
  });
});
