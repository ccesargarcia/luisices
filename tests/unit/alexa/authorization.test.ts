import { describe, it, expect, vi } from 'vitest';
const { authorizeAlexaPerson, ERROR_CODES } = require('../../../functions/alexa/authorization');
const { computeBindingKey } = require('../../../functions/alexa/repository');

describe('Alexa: Subsistema de Identidade, Vínculo de Voz e Autorização', () => {
  const baseConfig = {
    environment: 'dev',
    isEnabled: true,
    allowedSkillId: 'amzn1.ask.skill.test-dev',
    hmacKey: 'test-secret-key-12345',
  };

  const createMockDb = (overrides = {}) => {
    const store = {
      alexaBindings: {},
      userProfiles: {},
      alexaPermissions: {},
      ...overrides,
    };

    return {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => {
            const data = store[name]?.[id];
            return {
              exists: Boolean(data),
              data: () => data || null,
            };
          },
        }),
      }),
    };
  };

  it('deve rejeitar imediatamente se a personalização/personId estiver ausente (voz não reconhecida)', async () => {
    const envelope = {
      context: {
        System: {
          user: { userId: 'amzn1.ask.account.DEVICE_ACCOUNT' },
          // Sem person!
        },
      },
    };

    const mockDb = createMockDb();
    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb);

    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.VOICE_NOT_RECOGNIZED);
    expect(result.speech).toContain('Não reconheci sua voz cadastrada');
  });

  it('nunca deve usar a conta do aparelho (amazonUserId) como substituto da identidade da pessoa', async () => {
    const envelope = {
      context: {
        System: {
          user: { userId: 'amzn1.ask.account.DEVICE_ACCOUNT_SHARED' },
          device: { deviceId: 'device-echo-dot-1' },
          person: null, // Guest falando
        },
      },
    };

    const mockDb = createMockDb();
    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb);

    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.VOICE_NOT_RECOGNIZED);
  });

  it('deve rejeitar se a integração global estiver desativada', async () => {
    const envelope = {
      context: {
        System: {
          person: { personId: 'amzn1.ask.person.AMANDA' },
          user: { userId: 'amzn1.ask.account.TEST' },
        },
      },
    };

    const disabledConfig = { ...baseConfig, isEnabled: false };
    const mockDb = createMockDb();
    const result = await authorizeAlexaPerson(envelope, disabledConfig, mockDb);

    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.INTEGRATION_DISABLED);
  });

  it('deve rejeitar se a voz não estiver vinculada em alexaBindings', async () => {
    const envelope = {
      context: {
        System: {
          person: { personId: 'amzn1.ask.person.UNKNOWN' },
          user: { userId: 'amzn1.ask.account.TEST' },
        },
      },
    };

    const mockDb = createMockDb();
    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb);

    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.VOICE_NOT_ALLOWED);
  });

  it('deve rejeitar se o vínculo de voz foi revogado', async () => {
    const amazonUserId = 'amzn1.ask.account.TEST';
    const personId = 'amzn1.ask.person.AMANDA';
    const bindingKey = computeBindingKey(
      baseConfig.environment,
      baseConfig.allowedSkillId,
      amazonUserId,
      personId,
      baseConfig.hmacKey
    );

    const mockDb = createMockDb({
      alexaBindings: {
        [bindingKey]: {
          uid: 'uid-amanda',
          active: false,
          revokedAt: new Date().toISOString(),
        },
      },
    });

    const envelope = {
      context: {
        System: {
          person: { personId },
          user: { userId: amazonUserId },
        },
      },
    };

    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb);
    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.VOICE_NOT_ALLOWED);
  });

  it('deve rejeitar se o perfil de usuário estiver inativo (active !== true)', async () => {
    const amazonUserId = 'amzn1.ask.account.TEST';
    const personId = 'amzn1.ask.person.AMANDA';
    const bindingKey = computeBindingKey(
      baseConfig.environment,
      baseConfig.allowedSkillId,
      amazonUserId,
      personId,
      baseConfig.hmacKey
    );

    const mockDb = createMockDb({
      alexaBindings: {
        [bindingKey]: {
          uid: 'uid-amanda',
          active: true,
          revokedAt: null,
          environment: 'dev',
        },
      },
      userProfiles: {
        'uid-amanda': {
          displayName: 'Amanda',
          active: false, // Inativo!
          role: 'funcionario',
        },
      },
    });

    const envelope = {
      context: {
        System: {
          person: { personId },
          user: { userId: amazonUserId },
        },
      },
    };

    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb);
    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.USER_INACTIVE);
  });

  it('deve rejeitar se o usuário não possuir permissão para criar pedidos (orders.create)', async () => {
    const amazonUserId = 'amzn1.ask.account.TEST';
    const personId = 'amzn1.ask.person.AMANDA';
    const bindingKey = computeBindingKey(
      baseConfig.environment,
      baseConfig.allowedSkillId,
      amazonUserId,
      personId,
      baseConfig.hmacKey
    );

    const admin = require('firebase-admin');
    const authSpy = vi.spyOn(admin, 'auth').mockReturnValue({
      getUser: async () => ({ disabled: false }),
    } as any);

    const mockDb = createMockDb({
      alexaBindings: {
        [bindingKey]: {
          uid: 'uid-amanda',
          active: true,
          revokedAt: null,
          environment: 'dev',
        },
      },
      userProfiles: {
        'uid-amanda': {
          displayName: 'Amanda',
          active: true,
          role: 'funcionario',
          permissions: {
            orders: { create: false, view: true }, // Sem criação de pedidos
          },
        },
      },
      alexaPermissions: {
        'uid-amanda': {
          enabled: true,
          mode: 'voice_confirm',
        },
      },
    });

    const envelope = {
      context: {
        System: {
          person: { personId },
          user: { userId: amazonUserId },
        },
      },
    };

    const mockAuth = {
      getUser: async () => ({ disabled: false }),
    };

    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb, mockAuth);

    expect(result.authorized).toBe(false);
    expect(result.code).toBe(ERROR_CODES.PERMISSION_DENIED);
  });

  it('deve autorizar com sucesso Amanda vinculada com UID correto e permissões válidas', async () => {
    const amazonUserId = 'amzn1.ask.account.TEST';
    const personId = 'amzn1.ask.person.AMANDA';
    const bindingKey = computeBindingKey(
      baseConfig.environment,
      baseConfig.allowedSkillId,
      amazonUserId,
      personId,
      baseConfig.hmacKey
    );

    const mockAuth = {
      getUser: async () => ({ disabled: false }),
    };

    const mockDb = createMockDb({
      alexaBindings: {
        [bindingKey]: {
          uid: 'uid-amanda-123',
          active: true,
          revokedAt: null,
          environment: 'dev',
        },
      },
      userProfiles: {
        'uid-amanda-123': {
          displayName: 'Amanda Garcia',
          email: 'amanda@luisices.com.br',
          active: true,
          role: 'user',
          permissions: {
            orders: { create: true, view: true, edit: true, delete: false },
          },
        },
      },
      alexaPermissions: {
        'uid-amanda-123': {
          enabled: true,
          mode: 'voice_confirm',
        },
      },
    });

    const envelope = {
      context: {
        System: {
          person: { personId },
          user: { userId: amazonUserId },
        },
      },
    };

    const result = await authorizeAlexaPerson(envelope, baseConfig, mockDb, mockAuth);

    expect(result.authorized).toBe(true);
    expect(result.identity).toBeDefined();
    expect(result.identity.uid).toBe('uid-amanda-123');
    expect(result.identity.displayName).toBe('Amanda Garcia');
    expect(result.identity.mode).toBe('voice_confirm');
  });

});
