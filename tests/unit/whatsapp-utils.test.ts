import { describe, it, expect } from 'vitest';
import {
  normalizePhoneForWhatsApp,
  formatPhoneForDisplay,
} from '../../src/app/utils/whatsapp';

describe('Utilitários de WhatsApp (whatsapp-utils)', () => {
  describe('normalizePhoneForWhatsApp', () => {
    it('deve adicionar o DDI 55 do Brasil para números com DDD de 11 dígitos', () => {
      expect(normalizePhoneForWhatsApp('11999998888')).toBe('5511999998888');
      expect(normalizePhoneForWhatsApp('(11) 99999-8888')).toBe('5511999998888');
      expect(normalizePhoneForWhatsApp('11 9 9999-8888')).toBe('5511999998888');
    });

    it('deve adicionar o DDI 55 do Brasil para telefones fixos com DDD de 10 dígitos', () => {
      expect(normalizePhoneForWhatsApp('1133334444')).toBe('551133334444');
      expect(normalizePhoneForWhatsApp('(11) 3333-4444')).toBe('551133334444');
    });

    it('NÃO deve duplicar o DDI caso o número já comece com 55', () => {
      expect(normalizePhoneForWhatsApp('5511999998888')).toBe('5511999998888');
      expect(normalizePhoneForWhatsApp('+55 (11) 99999-8888')).toBe('5511999998888');
    });

    it('deve retornar string vazia para inputs inválidos ou sem dígitos', () => {
      expect(normalizePhoneForWhatsApp('')).toBe('');
      expect(normalizePhoneForWhatsApp('   ')).toBe('');
      expect(normalizePhoneForWhatsApp('abc')).toBe('');
    });
  });

  describe('formatPhoneForDisplay', () => {
    it('deve formatar número com 55 e 9 dígitos para exibição amigável', () => {
      expect(formatPhoneForDisplay('5511999998888')).toBe('(11) 99999-8888');
      expect(formatPhoneForDisplay('11999998888')).toBe('(11) 99999-8888');
    });

    it('deve formatar telefone fixo com 8 dígitos para exibição', () => {
      expect(formatPhoneForDisplay('551133334444')).toBe('(11) 3333-4444');
      expect(formatPhoneForDisplay('1133334444')).toBe('(11) 3333-4444');
    });

    it('deve retornar string vazia para valores nulos ou vazios', () => {
      expect(formatPhoneForDisplay(null)).toBe('');
      expect(formatPhoneForDisplay(undefined)).toBe('');
      expect(formatPhoneForDisplay('')).toBe('');
    });
  });
});
