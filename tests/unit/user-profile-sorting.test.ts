import { describe, expect, it } from 'vitest';
import { sortUsersByDisplayedCreatedAt } from '../../src/app/utils/userProfileSorting';

describe('ordenação da lista de usuários pela data exibida', () => {
  it('usa authCreatedAt quando disponível, mesmo se a ordem dos perfis for diferente', () => {
    const users = [
      { uid: 'created-first-profile', createdAt: '2026-02-01T00:00:00.000Z', authCreatedAt: '2026-10-19T00:00:00.000Z' },
      { uid: 'created-second-profile', createdAt: '2026-02-02T00:00:00.000Z', authCreatedAt: '2026-10-11T00:00:00.000Z' },
    ];

    expect(sortUsersByDisplayedCreatedAt(users).map(({ uid }) => uid)).toEqual([
      'created-second-profile',
      'created-first-profile',
    ]);
    expect(users[0].uid).toBe('created-first-profile');
  });

  it('usa createdAt quando não há data da conta Firebase e mantém datas ausentes no fim', () => {
    const users = [
      { uid: 'missing-date', createdAt: undefined, authCreatedAt: undefined },
      { uid: 'fallback-date', createdAt: '2026-03-10T00:00:00.000Z', authCreatedAt: undefined },
      { uid: 'auth-date', createdAt: '2026-03-01T00:00:00.000Z', authCreatedAt: '2026-03-05T00:00:00.000Z' },
    ];

    expect(sortUsersByDisplayedCreatedAt(users).map(({ uid }) => uid)).toEqual([
      'auth-date',
      'fallback-date',
      'missing-date',
    ]);
  });
});
