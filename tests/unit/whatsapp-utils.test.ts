import { describe, it, expect } from 'vitest';
import {
  normalizePhoneForWhatsApp,
  formatPhoneForDisplay,
  generateCatalogOrderWhatsAppMessage,
  generateProductInquiryWhatsAppMessage,
  generateBespokeConsultationWhatsAppMessage,
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

  describe('generateCatalogOrderWhatsAppMessage', () => {
    it('deve gerar mensagem dinâmica com itens, valores, personalização e prazo calculado', () => {
      const msg = generateCatalogOrderWhatsAppMessage({
        orderCode: 'LJ-1234',
        businessName: 'Luisices',
        items: [
          {
            name: 'Convite Luxo Rosé',
            price: 15.5,
            quantity: 30,
            leadTimeDays: 7,
            customName: 'Helena & Rafael',
          },
          {
            name: 'Menu de Mesa',
            price: 5.0,
            quantity: 30,
            leadTimeDays: 3,
          },
        ],
        subtotal: 615,
        customerNotes: 'Evento dia 25/12',
      });

      expect(msg).toContain('NOVO PEDIDO DA LOJINHA');
      expect(msg).toContain('#LJ-1234');
      expect(msg).toContain('Convite Luxo Rosé');
      expect(msg).toContain('Helena & Rafael');
      expect(msg).toContain('Menu de Mesa');
      expect(msg).toContain('até 7 dias úteis');
      expect(msg).toContain('R$ 615,00');
      expect(msg).toContain('Evento dia 25/12');
    });
  });

  describe('generateProductInquiryWhatsAppMessage', () => {
    it('deve formatar consulta de produto individual com categoria e valor', () => {
      const msg = generateProductInquiryWhatsAppMessage({
        businessName: 'Luisices',
        productName: 'Topo de Bolo Shaker',
        price: 45.0,
        category: 'Festas',
        leadTimeDays: 5,
        customName: 'Bernardo 5 anos',
      });

      expect(msg).toContain('Luisices');
      expect(msg).toContain('Topo de Bolo Shaker');
      expect(msg).toContain('(Festas)');
      expect(msg).toContain('R$ 45,00');
      expect(msg).toContain('até 5 dias úteis');
      expect(msg).toContain('Bernardo 5 anos');
    });
  });

  describe('generateBespokeConsultationWhatsAppMessage', () => {
    it('deve formatar pedido de consultoria sob medida com categoria e data', () => {
      const msg = generateBespokeConsultationWhatsAppMessage({
        businessName: 'Luisices',
        category: 'Casamentos',
        eventDate: '15/10/2026',
        notes: 'Identidade visual completa com monograma em hot stamping',
      });

      expect(msg).toContain('Luisices');
      expect(msg).toContain('categoria *Casamentos*');
      expect(msg).toContain('15/10/2026');
      expect(msg).toContain('Identidade visual completa com monograma em hot stamping');
    });
  });
});
