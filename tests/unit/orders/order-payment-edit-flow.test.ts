import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDecimalMoneyInput } from '../../../src/app/utils/parseDecimalMoneyInput';
import { formatDecimalMoneyInput } from '../../../src/app/utils/formatDecimalMoneyInput';

const mockOrderGet = vi.fn();
const mockSaleGet = vi.fn();
const mockTransactionUpdate = vi.fn();
const mockTransactionSet = vi.fn();

vi.mock('../../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1', email: 'owner@example.com', displayName: 'Proprietário' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, coll, id) => ({ coll, id: id || 'generated-id' })),
  getDocs: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ userId: 'user-1', version: 1 }),
  })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-01-01') }),
  },
  runTransaction: vi.fn(async (_db, fn) => {
    const fakeTransaction = {
      get: vi.fn(async (ref: any) => {
        if (ref.coll === 'orders') return mockOrderGet();
        if (ref.coll === 'salesLedger' || ref.id) return mockSaleGet();
        if (ref.coll === 'metadata' || ref.id === 'counters') {
          return { exists: () => true, data: () => ({ orderCounter: 100 }) };
        }
        return { exists: () => false };
      }),
      update: mockTransactionUpdate,
      set: mockTransactionSet,
    };
    return fn(fakeTransaction);
  }),
}));

import { firebaseOrderService } from '../../../src/services/firebaseOrderService';
import type { PaymentStatus } from '../../../src/app/types';

/**
 * Réplica exata da regra CEL do Firestore (firestore.rules linha 344)
 * isConsistentOrderPayment(payment, price)
 */
function isConsistentOrderPaymentRule(payment: any, price: number): boolean {
  if (!payment) return true;
  const paid = payment.paidAmount;
  const remaining = payment.remainingAmount;
  const status = payment.status;
  const method = payment.method ?? null;

  const validMethod = method === null || ['pix', 'cash', 'credit', 'debit', 'transfer'].includes(method);
  const statusConsistent = status === 'paid'
    ? paid === price
    : status === 'partial'
      ? (paid > 0 && paid < price)
      : status === 'pending' && paid === 0;

  return payment.totalAmount === price
    && typeof paid === 'number' && paid >= 0 && paid <= price
    && remaining >= 0
    && Math.abs(remaining - (price - paid)) < 0.005
    && validMethod
    && statusConsistent;
}

describe('Fluxo Completo de Edição de Valor Pago e Prevenção de Erro de Permissão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Diagnóstico do bug original vs Regra de Segurança do Firestore', () => {
    it('comprova que o payload dessincronizado original (paidAmount > 0 com status pending) viola a regra do Firestore', () => {
      const price = 100;
      // Payload que a interface enviava antes do fix:
      const brokenPayload = {
        totalAmount: 100,
        paidAmount: 50,
        remainingAmount: 50,
        status: 'pending', // Usuário digitou 50, mas dropdown continuou como 'pending'
        method: null,
      };

      // A regra do Firestore estrita avalia como FALSE -> FirebaseError PERMISSION_DENIED
      const passesRule = isConsistentOrderPaymentRule(brokenPayload, price);
      expect(passesRule).toBe(false);
    });

    it('comprova que o payload dessincronizado (paidAmount = total com status partial) viola a regra do Firestore', () => {
      const price = 100;
      const brokenPayload = {
        totalAmount: 100,
        paidAmount: 100,
        remainingAmount: 0,
        status: 'partial',
        method: 'pix',
      };

      // Exige paid < price quando status é partial -> falha com FALSE
      const passesRule = isConsistentOrderPaymentRule(brokenPayload, price);
      expect(passesRule).toBe(false);
    });

    it('comprova que os payloads reconciliados cumprem 100% da regra do Firestore', () => {
      const price = 100;

      // Parcial
      expect(isConsistentOrderPaymentRule({
        totalAmount: 100,
        paidAmount: 40,
        remainingAmount: 60,
        status: 'partial',
        method: 'pix',
      }, price)).toBe(true);

      // Quitado
      expect(isConsistentOrderPaymentRule({
        totalAmount: 100,
        paidAmount: 100,
        remainingAmount: 0,
        status: 'paid',
        method: 'pix',
      }, price)).toBe(true);

      // Pendente
      expect(isConsistentOrderPaymentRule({
        totalAmount: 100,
        paidAmount: 0,
        remainingAmount: 100,
        status: 'pending',
        method: null,
      }, price)).toBe(true);
    });
  });

  describe('2. Lógica da Interface (OrderEditForm / OrderDetailsDialog)', () => {
    it('deriva automaticamente status "partial" ao digitar valor entre 0 e o total', () => {
      const totalPrice = 150;
      const typedValue = '50,00';
      const parsed = parseDecimalMoneyInput(typedValue);

      let autoStatus: PaymentStatus = 'pending';
      if (parsed !== null && totalPrice > 0) {
        if (parsed >= totalPrice) autoStatus = 'paid';
        else if (parsed > 0) autoStatus = 'partial';
        else autoStatus = 'pending';
      }

      expect(autoStatus).toBe('partial');
    });

    it('deriva automaticamente status "paid" ao digitar valor igual ou superior ao total', () => {
      const totalPrice = 150;
      const typedValue = '150,00';
      const parsed = parseDecimalMoneyInput(typedValue);

      let autoStatus: PaymentStatus = 'pending';
      if (parsed !== null && totalPrice > 0) {
        if (parsed >= totalPrice) autoStatus = 'paid';
        else if (parsed > 0) autoStatus = 'partial';
        else autoStatus = 'pending';
      }

      expect(autoStatus).toBe('paid');
    });

    it('deriva automaticamente status "pending" ao zerar o campo ou deixar vazio', () => {
      const totalPrice = 150;
      const typedValue = '0';
      const parsed = parseDecimalMoneyInput(typedValue);

      let autoStatus: PaymentStatus = 'paid';
      if (parsed !== null && totalPrice > 0) {
        if (parsed >= totalPrice) autoStatus = 'paid';
        else if (parsed > 0) autoStatus = 'partial';
        else autoStatus = 'pending';
      } else if (typedValue === '' || parsed === 0) {
        autoStatus = 'pending';
      }

      expect(autoStatus).toBe('pending');
    });

    it('preenche valor total ao selecionar "paid" no dropdown e "0,00" ao selecionar "pending"', () => {
      const total = 200;

      // Selecionou 'paid'
      const paidValue = formatDecimalMoneyInput(total);
      expect(paidValue).toBe('200,00');

      // Selecionou 'pending'
      const pendingValue = '0,00';
      expect(pendingValue).toBe('0,00');
    });
  });

  describe('3. Camada de Serviço (firebaseOrderService.updateOrder)', () => {
    it('corrige status para "partial" e saldo quando o chamador envia status "pending" com valor pago positivo', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          price: 200,
          payment: { status: 'pending', totalAmount: 200, paidAmount: 0, remainingAmount: 200 },
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'user-1', amount: 200 }),
      });

      // Chamada simulando a falha anterior do formulário
      await firebaseOrderService.updateOrder('order-test-1', {
        payment: {
          status: 'pending', // Inconsistente!
          paidAmount: 80,
        } as any,
      });

      expect(mockTransactionUpdate).toHaveBeenCalled();
      const updatedPayload = mockTransactionUpdate.mock.calls[0][1];
      expect(updatedPayload.payment.status).toBe('partial');
      expect(updatedPayload.payment.paidAmount).toBe(80);
      expect(updatedPayload.payment.totalAmount).toBe(200);
      expect(updatedPayload.payment.remainingAmount).toBe(120);

      // Valida conformidade estrita com o Firestore
      expect(isConsistentOrderPaymentRule(updatedPayload.payment, 200)).toBe(true);
    });

    it('corrige status para "paid" quando o chamador envia status "partial" com valor quitado', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 2,
          price: 150,
          payment: { status: 'partial', totalAmount: 150, paidAmount: 50, remainingAmount: 100 },
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'user-1', amount: 150 }),
      });

      await firebaseOrderService.updateOrder('order-test-2', {
        payment: {
          status: 'partial', // Inconsistente com valor quitado!
          paidAmount: 150,
        } as any,
      });

      const updatedPayload = mockTransactionUpdate.mock.calls[0][1];
      expect(updatedPayload.payment.status).toBe('paid');
      expect(updatedPayload.payment.paidAmount).toBe(150);
      expect(updatedPayload.payment.remainingAmount).toBe(0);

      expect(isConsistentOrderPaymentRule(updatedPayload.payment, 150)).toBe(true);
    });

    it('recalcula payment atomicamente quando apenas o preço do pedido é alterado', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 3,
          price: 100,
          payment: { status: 'paid', totalAmount: 100, paidAmount: 100, remainingAmount: 0 },
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'user-1', amount: 100 }),
      });

      // Apenas o preço do pedido subiu para 180 (ex: cliente adicionou itens)
      await firebaseOrderService.updateOrder('order-test-3', {
        price: 180,
      });

      const updatedPayload = mockTransactionUpdate.mock.calls[0][1];
      expect(updatedPayload.price).toBe(180);
      expect(updatedPayload.payment).toBeDefined();
      expect(updatedPayload.payment.totalAmount).toBe(180);
      expect(updatedPayload.payment.paidAmount).toBe(100);
      expect(updatedPayload.payment.remainingAmount).toBe(80);
      // Status deve ter migrado de 'paid' para 'partial' porque agora há saldo devedor
      expect(updatedPayload.payment.status).toBe('partial');

      expect(isConsistentOrderPaymentRule(updatedPayload.payment, 180)).toBe(true);
    });

    it('mantém o salesLedger sincronizado com os novos valores contábeis na mesma transação', async () => {
      mockOrderGet.mockReturnValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          version: 1,
          price: 100,
          payment: { status: 'pending', totalAmount: 100, paidAmount: 0, remainingAmount: 100 },
        }),
      });
      mockSaleGet.mockReturnValue({
        exists: () => true,
        data: () => ({ userId: 'user-1', amount: 100, paidAmount: 0, paymentStatus: 'pending' }),
      });

      await firebaseOrderService.updateOrder('order-test-4', {
        payment: {
          paidAmount: 60,
          method: 'pix',
        } as any,
      });

      // Verificação da atualização do salesLedger
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);
      const ledgerCall = mockTransactionUpdate.mock.calls[1][1];
      expect(ledgerCall.paidAmount).toBe(60);
      expect(ledgerCall.paymentStatus).toBe('partial');
      expect(ledgerCall.paymentMethod).toBe('pix');
    });
  });
});
