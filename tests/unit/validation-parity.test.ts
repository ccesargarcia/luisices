import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  customerSchema,
  orderSchema,
  orderEditSchema,
  quoteSchema,
  productSchema,
  storeProductSchema,
  supplySchema,
} from '../../src/app/schemas/validationSchemas';

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1', email: 'owner@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  getDocs: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ userId: 'user-1', version: 1 }),
  })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-1' })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-01-01') }),
  },
  runTransaction: vi.fn(),
}));

import { firebaseOrderService } from '../../src/services/firebaseOrderService';
import { firebaseCustomerService } from '../../src/services/firebaseCustomerService';

describe('Paridade de Validação Backend & Frontend (Zero Trust)', () => {
  describe('Zod Validation Schemas', () => {
    it('customerSchema valida limites e campos obrigatórios', () => {
      expect(() => customerSchema.parse({ name: '' })).toThrow();
      expect(() => customerSchema.parse({ name: 'a'.repeat(201) })).toThrow();
      expect(customerSchema.parse({ name: 'Maria Silva' })).toEqual(
        expect.objectContaining({ name: 'Maria Silva' })
      );
    });

    it('orderSchema e orderEditSchema barram preços negativos e quantidades inválidas', () => {
      const validOrder = {
        customerName: 'João Souza',
        productName: 'Caixa Milk Personalizada',
        quantity: 5,
        price: 50.0,
        deliveryDate: '2099-12-31',
      };
      expect(() => orderSchema.parse({ ...validOrder, price: -10 })).toThrow();
      expect(() => orderSchema.parse({ ...validOrder, quantity: 0 })).toThrow();
      expect(() => orderSchema.parse({ ...validOrder, quantity: -2 })).toThrow();
      expect(() => orderSchema.parse({ ...validOrder, customerName: 'a'.repeat(205) })).toThrow();
      expect(() => orderSchema.parse({ ...validOrder, productName: 'b'.repeat(305) })).toThrow();
      expect(orderSchema.parse(validOrder)).toEqual(expect.objectContaining(validOrder));

      // orderEditSchema permite edição mesmo para datas passadas
      expect(orderEditSchema.parse({ ...validOrder, deliveryDate: '2020-01-01' })).toBeDefined();
    });

    it('quoteSchema e productSchema barram valores negativos', () => {
      expect(() => quoteSchema.parse({
        customerName: 'Cliente',
        items: [{ description: 'Item 1', quantity: 1, unitPrice: -5 }],
      })).toThrow();

      expect(() => productSchema.parse({
        name: 'Produto Teste',
        price: -20,
      })).toThrow();

      expect(() => storeProductSchema.parse({
        name: 'Produto Vitrine',
        price: -10,
      })).toThrow();

      expect(() => supplySchema.parse({
        name: 'Papel Glossy',
        purchasePrice: -15,
        packageQuantity: 100,
      })).toThrow();

      expect(() => supplySchema.parse({
        name: 'Papel Glossy',
        purchasePrice: 15,
        packageQuantity: 0,
      })).toThrow();
    });
  });

  describe('Services Frontend Enforcement', () => {
    it('firebaseOrderService rejeita inputs inválidos antes de submeter ao Firestore', async () => {
      await expect(
        firebaseOrderService.createOrder({ customerName: '   ', price: 100 })
      ).rejects.toThrow('Nome do cliente é obrigatório');

      await expect(
        firebaseOrderService.createOrder({ customerName: 'Valido', productName: '  ' })
      ).rejects.toThrow('Nome do produto é obrigatório');

      await expect(
        firebaseOrderService.createOrder({ customerName: 'Valido', productName: 'Topo', quantity: -5 })
      ).rejects.toThrow('A quantidade deve ser um número maior que zero');

      await expect(
        firebaseOrderService.createOrder({ customerName: 'Valido', productName: 'Topo', price: -50 })
      ).rejects.toThrow('O preço não pode ser negativo');

      await expect(
        firebaseOrderService.createOrder({ customerName: 'Valido', productName: 'Topo', status: 'invalid-status' as any })
      ).rejects.toThrow('Status do pedido inválido');
    });

    it('firebaseCustomerService rejeita criação e atualização inválida', async () => {
      await expect(
        firebaseCustomerService.createCustomer('user-1', { name: '   ', phone: '11999999999' })
      ).rejects.toThrow('Nome do cliente é obrigatório');

      await expect(
        firebaseCustomerService.createCustomer('user-1', { name: 'a'.repeat(205), phone: '11999999999' })
      ).rejects.toThrow('Nome do cliente deve ter no máximo 200 caracteres');

      await expect(
        firebaseCustomerService.updateCustomer('cust-1', { totalSpent: -100 })
      ).rejects.toThrow('Total gasto não pode ser negativo');

      await expect(
        firebaseCustomerService.updateCustomer('cust-1', { totalOrders: -5 })
      ).rejects.toThrow('Total de pedidos não pode ser negativo');
    });
  });
});
