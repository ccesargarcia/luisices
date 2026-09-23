import { describe, it, expect } from 'vitest';
import { orderSchema, orderEditSchema, customerSchema } from '../../src/app/schemas/validationSchemas';

describe('Validation Schemas (Zod)', () => {
  describe('orderSchema', () => {
    it('deve aceitar a data de entrega para o dia de hoje sem erro de fuso UTC', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const validOrder = {
        customerName: 'Cliente Teste',
        productName: 'Caneca Personalizada',
        quantity: 2,
        price: 70,
        deliveryDate: todayStr,
      };

      const result = orderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar datas de entrega passadas na criação de novos pedidos', () => {
      const pastOrder = {
        customerName: 'Cliente Teste',
        productName: 'Caneca Personalizada',
        quantity: 2,
        price: 70,
        deliveryDate: '2020-01-01',
      };

      const result = orderSchema.safeParse(pastOrder);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Data de entrega não pode ser no passado');
      }
    });
  });

  describe('orderEditSchema', () => {
    it('deve permitir datas de entrega passadas na edição de pedidos existentes', () => {
      const existingPastOrder = {
        customerName: 'Cliente Teste',
        productName: 'Caneca Personalizada',
        quantity: 2,
        price: 70,
        deliveryDate: '2020-01-01',
      };

      const result = orderEditSchema.safeParse(existingPastOrder);
      expect(result.success).toBe(true);
    });
  });

  describe('customerSchema', () => {
    it('deve validar dados básicos de cliente', () => {
      const validCustomer = {
        name: 'Maria Silva',
        phone: '11999998888',
        email: 'maria@example.com',
      };

      const result = customerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });
  });
});
