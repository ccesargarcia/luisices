import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const { onCall } = require('../../functions/common/sentryFunctions.js');
const { createOrder, updateComplexOrder } = require('../../functions/orders/index.js');
const { createOrderTrackingLink } = require('../../functions/orders/tracking.js');

describe('Segurança Estrita de Origem (Gateway Exclusivo)', () => {
  const originalOriginSecret = process.env.ORIGIN_SECRET;
  const originalEmulator = process.env.FUNCTIONS_EMULATOR;

  beforeEach(() => {
    process.env.ORIGIN_SECRET = 'segredo-origem-super-secreto-123';
    delete process.env.FUNCTIONS_EMULATOR;
  });

  afterEach(() => {
    if (originalOriginSecret) process.env.ORIGIN_SECRET = originalOriginSecret;
    else delete process.env.ORIGIN_SECRET;
    if (originalEmulator) process.env.FUNCTIONS_EMULATOR = originalEmulator;
    else delete process.env.FUNCTIONS_EMULATOR;
  });

  describe('Negado por Padrão sem Origem Válida', () => {
    it('bloqueia chamada direta sem x-origin-secret quando o usuário NÃO está autenticado', async () => {
      const rawHandler = vi.fn();
      const wrappedCallable = onCall({}, rawHandler);

      const unauthRequest = {
        rawRequest: { headers: {} },
        auth: null,
      };

      await expect(wrappedCallable.run(unauthRequest)).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });
      expect(rawHandler).not.toHaveBeenCalled();
    });

    it('bloqueia chamada direta sem x-origin-secret MESMO quando o usuário ESTÁ autenticado', async () => {
      const rawHandler = vi.fn();
      const wrappedCallable = onCall({}, rawHandler);

      const authRequest = {
        rawRequest: { headers: {} },
        auth: { uid: 'logged-user-456', token: {} },
        data: {},
      };

      await expect(wrappedCallable.run(authRequest)).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });
      expect(rawHandler).not.toHaveBeenCalled();
    });

    it('permite chamada se o cabeçalho x-origin-secret estiver correto', async () => {
      const rawHandler = vi.fn().mockResolvedValue({ success: true });
      const wrappedCallable = onCall({}, rawHandler);

      const gatewayRequest = {
        rawRequest: {
          headers: { 'x-origin-secret': 'segredo-origem-super-secreto-123' },
        },
        auth: null,
        data: {},
      };

      const result = await wrappedCallable.run(gatewayRequest);
      expect(result).toEqual({ success: true });
      expect(rawHandler).toHaveBeenCalledWith(gatewayRequest);
    });
  });

  describe('Comportamento das Declarações Reais Exportadas (Sem Fallback Direto)', () => {
    it('createOrder rejeita chamada direta sem segredo de origem MESMO com usuário autenticado', async () => {
      // 1. Sem auth: rejeição estrita por proteção de origem
      await expect(createOrder.run({
        rawRequest: { headers: {} },
        auth: null,
        data: {},
      })).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });

      // 2. Com auth: chamada direta negada; exige trânsito pelo Worker
      await expect(createOrder.run({
        rawRequest: { headers: {} },
        auth: { uid: 'operator-uid-1', token: {} },
        data: {},
      })).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });
    });

    it('updateComplexOrder rejeita chamada direta sem segredo de origem MESMO com usuário autenticado', async () => {
      // 1. Sem auth: rejeição estrita por proteção de origem
      await expect(updateComplexOrder.run({
        rawRequest: { headers: {} },
        auth: null,
        data: {},
      })).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });

      // 2. Com auth: chamada direta negada; exige trânsito pelo Worker
      await expect(updateComplexOrder.run({
        rawRequest: { headers: {} },
        auth: { uid: 'operator-uid-1', token: {} },
        data: {},
      })).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });
    });

    it('outros endpoints exportados (ex: createOrderTrackingLink) rejeitam chamada direta MESMO se autenticado', async () => {
      await expect(createOrderTrackingLink.run({
        rawRequest: { headers: {} },
        auth: { uid: 'operator-uid-1', token: {} },
        data: {},
      })).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringMatching(/Acesso direto não permitido/i),
      });
    });
  });
});
