import { describe, it, expect } from 'vitest';
import {
  formatFilenameToTitle,
  parsePriceInput,
  priceInputToFloat,
} from '@/app/utils/storeBulkUtils';

describe('Utilitários de Upload em Lote da Lojinha (store-bulk-utils)', () => {
  describe('formatFilenameToTitle', () => {
    it('deve converter underscores e hífens em espaços com capitalização correta', () => {
      expect(formatFilenameToTitle('caixa_milk_luxo.jpg')).toBe('Caixa Milk Luxo');
      expect(formatFilenameToTitle('convite-casamento-floral.png')).toBe('Convite Casamento Floral');
    });

    it('deve remover sufixos numéricos de índice no final do nome', () => {
      expect(formatFilenameToTitle('topo_de_bolo_aniversario_01.webp')).toBe('Topo De Bolo Aniversario');
      expect(formatFilenameToTitle('sacola-kraft-personalizada-2.jpeg')).toBe('Sacola Kraft Personalizada');
    });

    it('deve preservar nomes curtos mesmo que contenham números', () => {
      const result = formatFilenameToTitle('a1.jpg');
      expect(result).toBe('A1');
    });

    it('deve lidar com múltiplos espaços e símbolos repetidos', () => {
      expect(formatFilenameToTitle('caderno___personalizado---luxo.png')).toBe('Caderno Personalizado Luxo');
    });
  });

  describe('parsePriceInput & priceInputToFloat', () => {
    it('deve formatar centavos para máscara BRL em tempo real', () => {
      expect(parsePriceInput('1500')).toBe('15,00');
      expect(parsePriceInput('990')).toBe('9,90');
      expect(parsePriceInput('125050')).toBe('1.250,50');
      expect(parsePriceInput('')).toBe('');
      expect(parsePriceInput('abc')).toBe('');
    });

    it('deve converter string de preço formatada para número float correto', () => {
      expect(priceInputToFloat('15,00')).toBe(15);
      expect(priceInputToFloat('9,90')).toBe(9.9);
      expect(priceInputToFloat('1.250,50')).toBe(1250.5);
      expect(priceInputToFloat('')).toBe(0);
    });
  });
});
