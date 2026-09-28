import { describe, it, expect } from 'vitest';
const { handleVoicePairingRequest, approveAlexaPairingAdmin } = require('../../../functions/alexa/pairing');
const { computeCodeHash } = require('../../../functions/alexa/repository');

describe('Alexa: Fluxo de Pareamento Supervisionado e Vinculação de Voz', () => {
  const baseConfig = {
    environment: 'dev',
    allowedSkillId: 'amzn1.ask.skill.test-dev',
    hmacKey: 'test-secret-hmac-key',
    pairingCodeTtlMinutes: 5,
  };

  const createMockDb = (initialStore: any = {}) => {
    const store = {
      alexaPairings: {},
      alexaBindings: {},
      alexaPermissions: {},
      userProfiles: {},
      alexaAudit: {},
      alexaRateLimits: {},
      ...initialStore,
    };

    return {
      store,
      collection: (col: string) => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: Boolean(store[col]?.[id]),
            data: () => store[col]?.[id] || null,
          }),
          set: async (data: any, options: any) => {
            store[col] = store[col] || {};
            store[col][id] = options?.merge ? { ...store[col][id], ...data } : data;
          },
          update: async (data: any) => {
            if (!store[col]?.[id]) throw new Error('Not found');
            store[col][id] = { ...store[col][id], ...data };
          },
        }),
        add: async (data: any) => {
          const id = 'gen_' + Math.random().toString(36).slice(2);
          store[col] = store[col] || {};
          store[col][id] = data;
          return { id };
        },
      }),
      runTransaction: async (cb: any) => {
        const transaction = {
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any, options: any) => ref.set(data, options),
          update: (ref: any, data: any) => ref.update(data),
        };
        return cb(transaction);
      },
    };
  };

  it('deve recusar gerar código de pareamento se a pessoa não for reconhecida (personId ausente)', async () => {
    const envelope = {
      context: {
        System: {
          user: { userId: 'amzn1.ask.account.DEVICE' },
        },
      },
    };

    const mockDb = createMockDb();
    const result = await handleVoicePairingRequest(envelope, baseConfig, mockDb);

    expect(result.speech).toContain('Não reconheci sua voz');
    expect(result.shouldEndSession).toBe(true);
    expect(Object.keys(mockDb.store.alexaPairings).length).toBe(0);
  });

  it('deve gerar código de 8 dígitos falado separadamente quando personId for reconhecido', async () => {
    const envelope = {
      context: {
        System: {
          person: { personId: 'amzn1.ask.person.AMANDA' },
          user: { userId: 'amzn1.ask.account.HOME' },
          device: { deviceId: 'echo-dot-1' },
        },
      },
    };

    const mockDb = createMockDb();
    const result = await handleVoicePairingRequest(envelope, baseConfig, mockDb);

    expect(result.speech).toContain('Seu código de vinculação é:');
    // Verifica dígitos espaçados com vírgula: ex "1, 2, 3, 4, 5, 6, 7, 8"
    expect(result.speech).toMatch(/\d, \d, \d, \d, \d, \d, \d, \d/);
    expect(result.shouldEndSession).toBe(true);

    // Desafio deve ter sido gravado na coleção alexaPairings
    const pairingKeys = Object.keys(mockDb.store.alexaPairings);
    expect(pairingKeys.length).toBe(1);
    const pairingRecord = mockDb.store.alexaPairings[pairingKeys[0]];
    expect(pairingRecord.environment).toBe('dev');
    expect(pairingRecord.consumedAt).toBeNull();
  });

  it('administrador ativo deve conseguir aprovar o código e vincular ao UID alvo', async () => {
    const rawCode = '84920153';
    const codeHmac = computeCodeHash(rawCode, baseConfig.hmacKey);

    const mockDb = createMockDb({
      alexaPairings: {
        [codeHmac]: {
          bindingKey: 'binding-key-amanda',
          environment: 'dev',
          allowedSkillId: 'amzn1.ask.skill.test-dev',
          expiresAt: { toDate: () => new Date(Date.now() + 4 * 60 * 1000) }, // Válido por 4 min
          consumedAt: null,
          deviceId: 'echo-dot-amanda',
        },
      },
      userProfiles: {
        'admin-uid': {
          role: 'admin',
          active: true,
          displayName: 'Caio Garcia',
        },
        'amanda-uid': {
          role: 'user',
          active: true,
          displayName: 'Amanda Garcia',
          permissions: { orders: { create: true } },
        },
      },
    });

    const approvalResult = await approveAlexaPairingAdmin({
      code: rawCode,
      targetUid: 'amanda-uid',
      authContext: { uid: 'admin-uid', email: 'admin@luisices.com.br' },
      db: mockDb,
      config: baseConfig,
    });

    expect(approvalResult.success).toBe(true);
    expect(approvalResult.targetUid).toBe('amanda-uid');

    // Desafio deve estar consumido
    expect(mockDb.store.alexaPairings[codeHmac].consumedAt).toBeDefined();

    // Vínculo deve ter sido gravado
    const binding = mockDb.store.alexaBindings['binding-key-amanda'];
    expect(binding).toBeDefined();
    expect(binding.uid).toBe('amanda-uid');
    expect(binding.active).toBe(true);
    expect(binding.approvedBy).toBe('admin-uid');
    expect(binding.allowedDeviceIds).toEqual([]);

    // Permissão deve ter sido criada/atualizada
    const perm = mockDb.store.alexaPermissions['amanda-uid'];
    expect(perm).toBeDefined();
    expect(perm.enabled).toBe(true);
    expect(perm.mode).toBe('voice_confirm');
  });

  it('deve rejeitar se o código de vinculação já expirou (mais de 5 minutos)', async () => {
    const rawCode = '11223344';
    const codeHmac = computeCodeHash(rawCode, baseConfig.hmacKey);

    const mockDb = createMockDb({
      alexaPairings: {
        [codeHmac]: {
          bindingKey: 'binding-key-amanda',
          environment: 'dev',
          expiresAt: { toDate: () => new Date(Date.now() - 60 * 1000) }, // Expirado há 1 min
          consumedAt: null,
        },
      },
      userProfiles: {
        'admin-uid': { role: 'admin', active: true },
        'amanda-uid': { role: 'user', active: true, permissions: { orders: { create: true } } },
      },
    });

    await expect(
      approveAlexaPairingAdmin({
        code: rawCode,
        targetUid: 'amanda-uid',
        authContext: { uid: 'admin-uid' },
        db: mockDb,
        config: baseConfig,
      })
    ).rejects.toThrow('expirou');
  });

  it('deve rejeitar aprovação se quem tenta aprovar não for administrador ativo', async () => {
    const rawCode = '99887766';
    const mockDb = createMockDb({
      userProfiles: {
        'user-not-admin': { role: 'funcionario', active: true },
      },
    });

    await expect(
      approveAlexaPairingAdmin({
        code: rawCode,
        targetUid: 'amanda-uid',
        authContext: { uid: 'user-not-admin' },
        db: mockDb,
        config: baseConfig,
      })
    ).rejects.toThrow('Apenas administradores');
  });
});
