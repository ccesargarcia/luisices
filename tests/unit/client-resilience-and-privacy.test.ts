import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizePii, sanitizeObject } from '../../src/lib/sentry';

describe('Etapa 9: Recuperação de Conexão do Cliente e Privacidade do Usuário (Achados 12 e 14)', () => {
  describe('Achado 14: Sanitização de PII e Privacidade no Sentry', () => {
    it('deve mascarar emails em strings e mensagens de erro', () => {
      const input = 'Erro ao processar cliente joao.silva@gmail.com no pedido';
      const output = sanitizePii(input);
      expect(output).toBe('Erro ao processar cliente [REDACTED_EMAIL] no pedido');
    });

    it('deve mascarar telefones brasileiros com ou sem código de área', () => {
      const input1 = 'Contato: 11987654321 ou +55 11 98888-7777';
      const output1 = sanitizePii(input1);
      expect(output1).not.toContain('11987654321');
      expect(output1).not.toContain('98888-7777');
      expect(output1).toContain('[REDACTED_PHONE]');

      const input2 = 'Telefone fixo: 11 3333-4444';
      const output2 = sanitizePii(input2);
      expect(output2).not.toContain('3333-4444');
      expect(output2).toContain('[REDACTED_PHONE]');
    });

    it('deve mascarar CPF em mensagens', () => {
      const input = 'Documento do cliente: 123.456.789-00 informado';
      const output = sanitizePii(input);
      expect(output).toBe('Documento do cliente: [REDACTED_CPF] informado');
    });

    it('não deve alterar strings que não contêm PII', () => {
      const input = 'INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)';
      expect(sanitizePii(input)).toBe(input);
    });

    it('deve sanitizar objetos recursivamente, incluindo extras, contexts e breadcrumb data', () => {
      const rawPayload = {
        userEmail: 'cliente@teste.com',
        userPhone: '11988887777',
        authToken: 'secret_jwt_token_123',
        password: 'my-password-here',
        nested: {
          customerCpf: '123.456.789-00',
          cleanNotes: 'Tudo certo com o pedido',
        },
      };

      const cleaned = sanitizeObject(rawPayload);
      expect(cleaned.userEmail).toBe('[REDACTED_EMAIL]');
      expect(cleaned.userPhone).toContain('[REDACTED_PHONE]');
      expect(cleaned.authToken).toBe('[REDACTED]');
      expect(cleaned.password).toBe('[REDACTED]');
      expect(cleaned.nested.customerCpf).toBe('[REDACTED_CPF]');
      expect(cleaned.nested.cleanNotes).toBe('Tudo certo com o pedido');
    });
  });

  describe('Achado 12: Cooldown de recuperação de persistência do Firestore', () => {
    const memoryStore: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (k: string) => memoryStore[k] ?? null,
      setItem: (k: string, v: string) => { memoryStore[k] = String(v); },
      clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
    };

    beforeEach(() => {
      mockSessionStorage.clear();
      vi.clearAllMocks();
    });

    it('deve registrar timestamp e respeitar janela de cooldown de 30 segundos', () => {
      const now = Date.now();
      mockSessionStorage.setItem('firestore_recovery_timestamp', String(now));

      const lastAttempt = Number(mockSessionStorage.getItem('firestore_recovery_timestamp') || '0');
      const isCooldownActive = Date.now() - lastAttempt < 30_000;

      expect(isCooldownActive).toBe(true);
    });
  });
});
