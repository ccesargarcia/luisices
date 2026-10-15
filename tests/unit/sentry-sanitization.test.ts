import { describe, it, expect } from 'vitest';
// @ts-ignore
import { sanitizeText, sanitizeValue, sanitizeEvent } from '../../functions/common/sentry';

describe('Sentry Sanitization Suite', () => {
  describe('sanitizeText', () => {
    it('redacts email addresses', () => {
      const input = 'Error contacting user test@example.com for order';
      expect(sanitizeText(input)).toBe('Error contacting user [REDACTED_EMAIL] for order');
    });

    it('redacts phone numbers (BR formats)', () => {
      expect(sanitizeText('Telefone: +55 11 99876-5432')).toContain('[REDACTED_PHONE]');
      expect(sanitizeText('Contato: (11) 98765-4321')).toContain('[REDACTED_PHONE]');
      expect(sanitizeText('Tel: 11987654321')).toContain('[REDACTED_PHONE]');
    });

    it('redacts Brazilian CPF numbers', () => {
      const input = 'CPF do cliente: 123.456.789-00 registrado';
      expect(sanitizeText(input)).toBe('CPF do cliente: [REDACTED_CPF] registrado');
    });

    it('redacts Bearer tokens in headers or log messages', () => {
      const input = 'Failed with authorization header: Bearer ya29.a0AfH6SMD_xyz12345-token';
      expect(sanitizeText(input)).toBe('Failed with authorization header: Bearer [REDACTED_TOKEN]');
    });

    it('redacts JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.g_1234567890abcdefghijklmnopqr';
      const input = `Received invalid token ${jwt} from client`;
      expect(sanitizeText(input)).toBe('Received invalid token [REDACTED_JWT] from client');
    });

    it('redacts Google API Keys', () => {
      const googleKey = 'AIzaSyD-abcde12345ABCDE_fghij67890FGHIJ';
      const input = `GCP Error: key=${googleKey} is quota exceeded`;
      expect(sanitizeText(input)).toContain('[REDACTED_API_KEY]');
      expect(sanitizeText(input)).not.toContain(googleKey);
    });

    it('redacts Resend API Keys', () => {
      const resendKey = 're_12345678_abcdefghijklmnopqrstuvwx';
      const input = `Resend webhook error using ${resendKey}`;
      expect(sanitizeText(input)).toContain('[REDACTED_RESEND_KEY]');
      expect(sanitizeText(input)).not.toContain(resendKey);
    });

    it('redacts inline passwords and secrets in free text', () => {
      const input1 = 'Connection failed: password: MySuperSecretPassword123! to host';
      expect(sanitizeText(input1)).toContain('[REDACTED_CREDENTIAL]');
      expect(sanitizeText(input1)).not.toContain('MySuperSecretPassword123!');

      const input2 = 'Config dump: api_key="secretKey123456"';
      expect(sanitizeText(input2)).toContain('[REDACTED_CREDENTIAL]');
      expect(sanitizeText(input2)).not.toContain('secretKey123456');
    });
  });

  describe('sanitizeValue', () => {
    it('completely redacts values with sensitive field names', () => {
      expect(sanitizeValue('secretValue', 'authorization')).toBe('[REDACTED]');
      expect(sanitizeValue('secretValue', 'api_key')).toBe('[REDACTED]');
      expect(sanitizeValue('secretValue', 'password')).toBe('[REDACTED]');
      expect(sanitizeValue('secretValue', 'token')).toBe('[REDACTED]');
    });

    it('sanitizes text values inside non-sensitive fields', () => {
      const obj = {
        description: 'Failed to notify user@luisices.com.br with token Bearer secret12345',
        status: 500,
      };
      const sanitized = sanitizeValue(obj);
      expect(sanitized.description).toContain('[REDACTED_EMAIL]');
      expect(sanitized.description).toContain('Bearer [REDACTED_TOKEN]');
      expect(sanitized.status).toBe(500);
    });
  });

  describe('sanitizeEvent', () => {
    it('removes user identity, strips URL query parameters, and cleans exception values', () => {
      const event: any = {
        user: { id: 'user-123', email: 'admin@luisices.com.br' },
        request: {
          url: 'https://api.luisices.com.br/orders?token=sensitive_query_param#anchor',
          data: { secret: 'top_secret' },
          cookies: 'session_id=123',
        },
        exception: {
          values: [
            {
              value: 'Error with user admin@luisices.com.br using key AIzaSyD-abcde12345ABCDE_fghij67890FGHIJ',
            },
          ],
        },
      };

      const result = sanitizeEvent(event);
      expect(result.user).toBeUndefined();
      expect(result.request.url).toBe('https://api.luisices.com.br/orders');
      expect(result.request.data).toBe('[REDACTED]');
      expect(result.request.cookies).toBeUndefined();
      expect(result.exception.values[0].value).toContain('[REDACTED_EMAIL]');
      expect(result.exception.values[0].value).toContain('[REDACTED_API_KEY]');
    });
  });
});
