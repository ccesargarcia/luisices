import { createRequire } from 'module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
} from '../../src/app/types';
import { deepClonePermission } from '../../src/app/utils/userPermissions';

describe('SuperFrete granular permissions', () => {
  it('defines superfrete as true for admins and false by default for non-admins', () => {
    expect(ADMIN_PERMISSIONS.superfrete).toBe(true);
    expect(DEFAULT_USER_PERMISSIONS.superfrete).toBe(false);
    expect(EMPLOYEE_PERMISSIONS.superfrete).toBe(false);
  });

  it('preserves superfrete flag in deepClonePermission', () => {
    expect(deepClonePermission({ ...DEFAULT_USER_PERMISSIONS, superfrete: true }).superfrete).toBe(true);
    expect(deepClonePermission(null).superfrete).toBe(false);
  });
});

describe('functions/orders/superfrete.js RBAC with granular permission', () => {
  const originalProject = process.env.GCLOUD_PROJECT;
  const originalEmulator = process.env.FUNCTIONS_EMULATOR;
  const originalToken = process.env.SUPERFRETE_SANDBOX_TOKEN;

  beforeEach(() => {
    process.env.GCLOUD_PROJECT = 'luisices-dev';
    process.env.FUNCTIONS_EMULATOR = 'true';
    process.env.SUPERFRETE_SANDBOX_TOKEN = 'test-sandbox-token';
  });

  afterEach(() => {
    process.env.GCLOUD_PROJECT = originalProject;
    process.env.FUNCTIONS_EMULATOR = originalEmulator;
    process.env.SUPERFRETE_SANDBOX_TOKEN = originalToken;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('blocks non-admin without permissions.superfrete and allows non-admin with permissions.superfrete using admin settings', async () => {
    const functionsRequire = createRequire(require.resolve('../../functions/package.json'));
    const authModule = functionsRequire('./common/runtimeCompat');
    const firestoreModule = functionsRequire('firebase-admin/firestore');

    const assertSpy = vi.spyOn(authModule, 'assertActiveSession');
    const dbMock = {
      doc: vi.fn((path: string) => ({
        get: vi.fn(async () => {
          if (path === 'users/admin-1/settings/profile') {
            return {
              exists: true,
              data: () => ({
                superfreteEnabled: true,
                businessZipCode: '04567000',
              }),
            };
          }
          return { exists: false, data: () => undefined };
        }),
      })),
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(async () => ({
          empty: false,
          docs: [{ id: 'admin-1' }],
        })),
      })),
    };
    vi.spyOn(firestoreModule, 'getFirestore').mockReturnValue(dbMock as never);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 1, name: 'PAC', price: 25.5, delivery_time: 5 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { handleCalculateSuperfreteShipping } = require('../../functions/orders/superfrete');

    assertSpy.mockResolvedValueOnce({
      uid: 'func-1',
      profile: { role: 'funcionario', active: true, permissions: { superfrete: false } },
    });

    await expect(
      handleCalculateSuperfreteShipping({ auth: { uid: 'func-1' }, data: { toPostalCode: '01310100' } }),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    assertSpy.mockResolvedValueOnce({
      uid: 'func-1',
      profile: { role: 'funcionario', active: true, permissions: { superfrete: true } },
    });

    const result = await handleCalculateSuperfreteShipping({
      auth: { uid: 'func-1' },
      data: { fromPostalCode: '01153000', toPostalCode: '01310100' },
    });

    expect(result.success).toBe(true);
    expect(result.services).toHaveLength(1);
    const fetchBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(fetchBody.from.postal_code).toBe('04567000');
    expect(fetchBody.to.postal_code).toBe('01310100');
  });
});
