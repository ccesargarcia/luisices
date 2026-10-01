import { describe, it, expect } from 'vitest';
import { secureRandomNumber, secureRandomId } from '../../src/app/utils/random';

describe('Utilitários Criptográficos Seguros (Web Crypto API)', () => {
  describe('secureRandomNumber', () => {
    it('deve gerar números estritamente dentro do intervalo [min, max)', () => {
      const min = 10;
      const max = 50;

      for (let i = 0; i < 100; i++) {
        const val = secureRandomNumber(min, max);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(min);
        expect(val).toBeLessThan(max);
      }
    });

    it('deve retornar min se max for menor ou igual a min', () => {
      expect(secureRandomNumber(10, 10)).toBe(10);
      expect(secureRandomNumber(20, 5)).toBe(20);
    });

    it('deve gerar números de 4 dígitos para códigos de pedidos [1000, 10000)', () => {
      for (let i = 0; i < 50; i++) {
        const codeNum = secureRandomNumber(1000, 10000);
        expect(codeNum).toBeGreaterThanOrEqual(1000);
        expect(codeNum).toBeLessThan(10000);
      }
    });
  });

  describe('secureRandomId', () => {
    it('deve gerar IDs com tamanho padrão de 8 caracteres', () => {
      const id = secureRandomId();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
    });

    it('deve respeitar tamanhos personalizados', () => {
      const id4 = secureRandomId(4);
      const id16 = secureRandomId(16);
      expect(id4.length).toBe(4);
      expect(id16.length).toBe(16);
    });

    it('deve gerar IDs únicos sem colisões imediatas', () => {
      const set = new Set<string>();
      for (let i = 0; i < 200; i++) {
        set.add(secureRandomId(12));
      }
      expect(set.size).toBe(200);
    });
  });
});
