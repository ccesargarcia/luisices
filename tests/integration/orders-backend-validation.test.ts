import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, runTransaction, Timestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;
const dbFor = (uid: string) => env.authenticatedContext(uid).firestore();
const updateOrder = (db: any, path: string, changes: Record<string, any>, version = 2) =>
  updateDoc(doc(db, path), { ...changes, version });

const baseOrder = {
  userId: 'owner',
  orderNumber: '#2026-0001',
  customerName: 'Cliente Teste',
  customerPhone: '11999999999',
  productName: 'Convite Luxo',
  quantity: 2,
  price: 200,
  pricingMode: 'total',
  unitPrice: null,
  items: null,
  status: 'pending',
  deliveryDate: '2026-11-20',
  notes: 'Observações do pedido',
  tags: null,
  payment: {
    status: 'partial',
    method: 'pix',
    totalAmount: 200,
    paidAmount: 50,
    remainingAmount: 150,
  },
  createdAt: Timestamp.now(),
  assignedTo: 'emp-assigned',
};

const createOrderWithConsistentPayment = (overrides: Record<string, any>) => {
  const order = { ...baseOrder, ...overrides };
  const price = order.isExchange === true ? 0 : order.price;
  return {
    ...order,
    payment: overrides.payment ?? {
      status: 'paid',
      totalAmount: price,
      paidAmount: price,
      remainingAmount: 0,
    },
  };
};

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Execute via emulador local do Firestore (npm run test:integration).');
  }
  env = await initializeTestEnvironment({
    projectId: 'demo-luisices-review',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const fs = context.firestore();
    // Perfis de usuários
    await fs.doc('userProfiles/owner').set({
      role: 'user',
      active: true,
      permissions: { orders: { create: true, view: true, edit: true, delete: true } },
    });
    await fs.doc('userProfiles/other-user').set({
      role: 'user',
      active: true,
      permissions: { orders: { create: true, view: true, edit: true, delete: true } },
    });
    await fs.doc('userProfiles/emp-assigned').set({
      role: 'funcionario',
      active: true,
      permissions: { orders: { view: true, edit: true, delete: false } },
    });
    await fs.doc('userProfiles/emp-unassigned').set({
      role: 'funcionario',
      active: true,
      permissions: { orders: { view: true, edit: true, delete: false } },
    });
    await fs.doc('userProfiles/emp-no-edit').set({
      role: 'funcionario',
      active: true,
      permissions: { orders: { view: true, edit: false, delete: false } },
    });
    await fs.doc('userProfiles/emp-no-view').set({
      role: 'funcionario',
      active: true,
      permissions: { orders: { view: false, edit: true, delete: false } },
    });
    await fs.doc('userProfiles/emp-delete-only').set({
      role: 'funcionario',
      active: true,
      permissions: { orders: { view: true, edit: false, delete: true } },
    });
    await fs.doc('userProfiles/emp-archived-delete-only').set({
      role: 'funcionario',
      active: true,
      permissions: {
        orders: { view: true, edit: false, delete: false },
        archivedOrders: { view: true, create: false, edit: false, delete: true },
      },
    });
    await fs.doc('userProfiles/admin').set({
      role: 'admin',
      active: true,
    });
    await fs.doc('userProfiles/blocked').set({
      role: 'user',
      active: false,
      permissions: { orders: { create: true, view: true, edit: true, delete: true } },
    });

    // Pedido inicial para testes de update
    await fs.doc('orders/order-1').set({
      ...baseOrder,
      version: 1,
    });
  });
});

describe('Validação de Pedidos no Backend do Firestore (firestore.rules)', () => {
  describe('Permutas', () => {
    it('aceita permuta sem cobrança com itens recebidos válidos', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(setDoc(doc(ownerDb, 'orders/exchange-valid'), {
        ...baseOrder,
        isExchange: true,
        exchangeItems: [{ name: 'Divulgação', quantity: 1, value: 150 }],
        payment: { status: 'paid', totalAmount: 0, paidAmount: 0, remainingAmount: 0, method: null },
      }));
    });

    it('rejeita permuta com mais de dez itens recebidos', async () => {
      const ownerDb = dbFor('owner');
      const exchange = {
        ...baseOrder,
        isExchange: true,
        payment: { status: 'paid', totalAmount: 0, paidAmount: 0, remainingAmount: 0, method: null },
      };
      await assertFails(setDoc(doc(ownerDb, 'orders/exchange-too-many'), {
        ...exchange, exchangeItems: Array.from({ length: 11 }, (_, index) => ({ name: `Item ${index}`, quantity: 1, value: 1 })),
      }));
    });

    it('permite converter um pedido em permuta somente com pagamento zerado', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(updateOrder(ownerDb, 'orders/order-1', {
        isExchange: true,
        exchangeItems: [{ name: 'Divulgação', quantity: 1, value: 150 }],
        payment: { status: 'paid', totalAmount: 0, paidAmount: 0, remainingAmount: 0, method: null },
      }));
      await assertFails(updateOrder(ownerDb, 'orders/order-1', {
        isExchange: true,
        payment: baseOrder.payment,
      }, 3));
    });
  });

  describe('1. Autorização e Controle de Acesso', () => {
    it('permite que o proprietário autorizado crie e edite o pedido', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-new'), {
          ...baseOrder,
          orderNumber: '#2026-0002',
        })
      );
      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-1', {
          customerName: 'Cliente Atualizado',
        })
      );
    });

    it('permite que administrador edite qualquer pedido', async () => {
      const adminDb = dbFor('admin');
      await assertSucceeds(
        updateOrder(adminDb, 'orders/order-1', {
          customerName: 'Cliente Atualizado pelo Admin',
        })
      );
    });

    it('permite que funcionário atribuído com permissão edit atualize o pedido', async () => {
      const empDb = dbFor('emp-assigned');
      await assertSucceeds(
        updateOrder(empDb, 'orders/order-1', {
          notes: 'Nota adicionada pelo funcionário encarregado',
        })
      );
    });

    it('rejeita alteração por outro usuário comum', async () => {
      const otherDb = dbFor('other-user');
      await assertFails(
        updateDoc(doc(otherDb, 'orders/order-1'), {
          customerName: 'Hacker',
        })
      );
    });

    it('rejeita alteração por funcionário não atribuído', async () => {
      const empOtherDb = dbFor('emp-unassigned');
      await assertFails(
        updateDoc(doc(empOtherDb, 'orders/order-1'), {
          customerName: 'Outro Funcionário',
        })
      );
    });

    it('rejeita alteração por funcionário sem permissão de edição', async () => {
      await env.withSecurityRulesDisabled(async (c) => {
        await c.firestore().doc('orders/order-no-edit').set({
          ...baseOrder,
          assignedTo: 'emp-no-edit',
        });
      });
      const empNoEditDb = dbFor('emp-no-edit');
      await assertFails(
        updateOrder(empNoEditDb, 'orders/order-no-edit', {
          customerName: 'Sem Permissão',
        })
      );
    });

    it('rejeita alteração por conta desativada ou anônima', async () => {
      const blockedDb = dbFor('blocked');
      await assertFails(
        updateDoc(doc(blockedDb, 'orders/order-1'), {
          customerName: 'Bloqueado',
        })
      );
      const anonDb = env.unauthenticatedContext().firestore();
      await assertFails(
        updateDoc(doc(anonDb, 'orders/order-1'), {
          customerName: 'Anônimo',
        })
      );
    });
  });

  describe('2. Campos Imutáveis e Restrição de Escrita', () => {
    it('impede alteração do userId (propriedade do pedido)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          userId: 'other-user',
        })
      );
    });

    it('impede alteração do orderNumber (identidade do pedido)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          orderNumber: '#9999-9999',
        })
      );
    });

    it('impede alteração do createdAt (auditoria temporal)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          createdAt: Timestamp.now(),
        })
      );
    });

    it('impede alteração de outros campos imutáveis (createdByUid, source, idempotencyKey)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          createdByUid: 'malicious-uid',
        })
      );
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          source: 'malicious-source',
        })
      );
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          idempotencyKey: 'new-key',
        })
      );
    });

    it('impede inclusão de campos arbitrários não permitidos na atualização (lista positiva fechada via changed.hasOnly)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          unexpectedInjectedField: 'hack',
        })
      );
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          adminOverride: true,
        })
      );
    });

    it('impede que o cliente altere diretamente os metadados do link público de rastreamento', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(updateOrder(ownerDb, 'orders/order-1', {
        publicTrackingHash: 'hash-forjado',
        publicTrackingExpiresAt: '2099-12-31T00:00:00.000Z',
        publicTrackingLinkId: 'link-forjado',
      }));
    });
  });

  describe('3. Validação de Itens Estruturados (items)', () => {
    it('aceita items: null na criação e na edição de pedidos sem preços unitários', async () => {
      const ownerDb = dbFor('owner');
      // Criação com items: null
      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-null-items'), {
          ...baseOrder,
          orderNumber: '#2026-0003',
          items: null,
        })
      );
      // Edição mantendo/enviando items: null
      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-1', {
          items: null,
          notes: 'Pedido legado atualizado sem itens estruturados',
        })
      );
    });

    it('rejeita criação com items: null quando pricingMode ou unitPrice forem inválidos', async () => {
      const ownerDb = dbFor('owner');
      // pricingMode inválido com items: null
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-invalid-pricing-mode'), {
          ...baseOrder,
          orderNumber: '#2026-0005',
          pricingMode: 'invalid_mode',
          items: null,
        })
      );
      // unitPrice negativo com items: null
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-negative-unit-price'), {
          ...baseOrder,
          orderNumber: '#2026-0006',
          unitPrice: -10,
          items: null,
        })
      );
      // unitPrice excedendo 1.000.000 com items: null
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-huge-unit-price'), {
          ...baseOrder,
          orderNumber: '#2026-0007',
          unitPrice: 1000001,
          items: null,
        })
      );
    });

    it('rejeita atualização com items: null quando pricingMode ou unitPrice forem inválidos', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          items: null,
          pricingMode: 'hack_mode',
        })
      );
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          items: null,
          unitPrice: -5,
        })
      );
    });

    it('aceita lista válida de itens com preços distintos e unitPrice correspondente', async () => {
      const ownerDb = dbFor('owner');
      const structuredItems = [
        { name: 'Agenda 2026', quantity: 2, unitPrice: 80, price: 160 },
        { name: 'Caneta Luxo', quantity: 1, unitPrice: 40, price: 40 },
      ];

      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-multi-items'), {
          ...baseOrder,
          orderNumber: '#2026-0004',
          quantity: 3,
          price: 200,
          pricingMode: 'items',
          unitPrice: null,
          items: structuredItems,
          version: 1,
          payment: {
            status: 'paid',
            totalAmount: 200,
            paidAmount: 200,
            remainingAmount: 0,
          },
        })
      );

      // Edição atualizando os itens estruturados
      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-multi-items', {
          quantity: 4,
          price: 240,
          items: [
            { name: 'Agenda 2026', quantity: 2, unitPrice: 80, price: 160 },
            { name: 'Caneta Luxo', quantity: 2, unitPrice: 40, price: 80 },
          ],
          payment: {
            status: 'paid',
            totalAmount: 240,
            paidAmount: 240,
            remainingAmount: 0,
          },
        })
      );
    });

    it('rejeita item com preço unitário negativo', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-neg-price'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0005',
            quantity: 2,
            price: 10,
            items: [
              { name: 'Item inválido', quantity: 1, unitPrice: -10, price: -10 },
              { name: 'Item válido', quantity: 1, unitPrice: 20, price: 20 },
            ],
          }),
        })
      );
    });

    it('rejeita item com quantidade zero ou fracionária', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-zero-qty'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0006',
            quantity: 1,
            price: 50,
            items: [
              { name: 'Item inválido', quantity: 0, unitPrice: 50, price: 0 },
              { name: 'Item válido', quantity: 1, unitPrice: 50, price: 50 },
            ],
          }),
        })
      );
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-float-qty'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0007',
            quantity: 2,
            price: 100,
            items: [
              { name: 'Item fracionário A', quantity: 1.5 as any, unitPrice: 50, price: 75 },
              { name: 'Item fracionário B', quantity: 0.5 as any, unitPrice: 50, price: 25 },
            ],
          }),
        })
      );
    });

    it('rejeita item com subtotal inconsistente (quantity * unitPrice != price)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-bad-subtotal'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0009',
            quantity: 2,
            price: 80,
            items: [{ name: 'Item', quantity: 2, unitPrice: 50, price: 80 }], // 2 * 50 != 80
          }),
        })
      );
    });

    it('rejeita lista acima do limite máximo de 10 itens estruturados', async () => {
      const ownerDb = dbFor('owner');
      const elevenItems = Array.from({ length: 11 }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: 1,
        unitPrice: 10,
        price: 10,
      }));

      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-too-many-items'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0011',
            quantity: 11,
            price: 110,
            items: elevenItems,
          }),
        })
      );
    });

    it('aceita dez itens válidos sem ultrapassar o limite de expressões CEL', async () => {
      const ownerDb = dbFor('owner');
      const items = Array.from({ length: 10 }, (_, index) => ({
        name: `Item ${index + 1}`,
        quantity: 1,
        unitPrice: 10,
        price: 10,
      }));

      await assertSucceeds(setDoc(doc(ownerDb, 'orders/order-ten-valid-items'), {
        ...createOrderWithConsistentPayment({
          orderNumber: '#2026-0016',
          quantity: 10,
          price: 100,
          items,
        }),
      }));
    });

    it('rejeita quantidade inválida até no décimo item sem ultrapassar o limite CEL', async () => {
      const ownerDb = dbFor('owner');
      const items = Array.from({ length: 10 }, (_, index) => ({
        name: `Item ${index + 1}`,
        quantity: index === 9 ? 0 : 1,
        unitPrice: 10,
        price: index === 9 ? 0 : 10,
      }));

      await assertFails(setDoc(doc(ownerDb, 'orders/order-invalid-tenth-item'), {
        ...createOrderWithConsistentPayment({
          orderNumber: '#2026-0018',
          quantity: 10,
          price: 90,
          items,
        }),
      }));
    });
  });

  describe('4. Consistência Agregada (Pedido vs Itens)', () => {
    it.each(Array.from({ length: 10 }, (_, index) => index + 1))(
      'valida a quantidade e o total exatos no cadastro com %i item(ns)',
      async (itemCount) => {
        const ownerDb = dbFor('owner');
        const items = Array.from({ length: itemCount }, (_, index) => ({
          name: `Item ${index + 1}`,
          quantity: 1,
          unitPrice: 10,
          price: 10,
        }));
        const order = createOrderWithConsistentPayment({
          orderNumber: `#2026-${String(6000 + itemCount).padStart(4, '0')}`,
          quantity: itemCount,
          price: itemCount * 10,
          items,
        });

        await assertSucceeds(setDoc(doc(ownerDb, `orders/create-exact-${itemCount}`), order));
        await assertFails(setDoc(doc(ownerDb, `orders/create-invalid-total-${itemCount}`), {
          ...order,
          orderNumber: `#2026-${String(7000 + itemCount).padStart(4, '0')}`,
          price: itemCount * 10 + 1,
          payment: {
            status: 'paid',
            totalAmount: itemCount * 10 + 1,
            paidAmount: itemCount * 10 + 1,
            remainingAmount: 0,
          },
        }));
        await assertFails(setDoc(doc(ownerDb, `orders/create-invalid-quantity-${itemCount}`), {
          ...order,
          orderNumber: `#2026-${String(8000 + itemCount).padStart(4, '0')}`,
          quantity: itemCount + 1,
        }));
      },
    );

    it('rejeita quando a soma das quantidades dos itens diverge do total do pedido', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-qty-mismatch'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0012',
            quantity: 5, // Errado: itens somam 3
            price: 150,
            items: [
              { name: 'Item 1', quantity: 2, unitPrice: 50, price: 100 },
              { name: 'Item 2', quantity: 1, unitPrice: 50, price: 50 },
            ],
          }),
        })
      );
    });

    it('rejeita quando a soma dos preços dos itens diverge do valor total do pedido', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-price-mismatch'), {
          ...createOrderWithConsistentPayment({
            orderNumber: '#2026-0013',
            quantity: 2,
            price: 300, // Errado: itens somam 200
            items: [
              { name: 'Item 1', quantity: 1, unitPrice: 100, price: 100 },
              { name: 'Item 2', quantity: 1, unitPrice: 100, price: 100 },
            ],
          }),
        })
      );
    });

    it('aceita pedido com 1 item com unitPrice consistente', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-single-item'), {
          ...baseOrder,
          orderNumber: '#2026-0014',
          quantity: 2,
          price: 100,
          pricingMode: 'unit',
          unitPrice: 50,
          items: [{ name: 'Convite', quantity: 2, unitPrice: 50, price: 100 }],
          payment: {
            status: 'paid',
            totalAmount: 100,
            paidAmount: 100,
            remainingAmount: 0,
          },
        })
      );
    });

    it('rejeita pedido com 1 item se o unitPrice do pedido divergir do item', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-single-item-mismatch'), {
          ...baseOrder,
          orderNumber: '#2026-0015',
          quantity: 2,
          price: 100,
          pricingMode: 'unit',
          unitPrice: 80, // Diverge de 50
          items: [{ name: 'Convite', quantity: 2, unitPrice: 50, price: 100 }],
        })
      );
    });
  });

  describe('5. Validação Financeira e de Pagamento', () => {
    it('rejeita alteração de preço que crie inconsistência com o totalAmount do pagamento', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          price: 250, // payment.totalAmount é 200 no baseOrder
        })
      );
    });

    it('rejeita alteração de pagamento com paidAmount maior que o total ou remainingAmount inválido', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          payment: {
            status: 'paid',
            totalAmount: 200,
            paidAmount: 250, // Maior que 200
            remainingAmount: 0,
          },
        })
      );
      await assertFails(
        updateOrder(ownerDb, 'orders/order-1', {
          payment: {
            status: 'partial',
            totalAmount: 200,
            paidAmount: 50,
            remainingAmount: 100, // Deveria ser 150
          },
        })
      );
    });

    it('aceita edição de pedido legado cujo pagamento não tinha remainingAmount', async () => {
      const ownerDb = dbFor('owner');
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('orders/legacy-payment-without-remaining').set({
          ...baseOrder,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 200,
            paidAmount: 50,
          },
          version: 1,
        });
      });

      await assertSucceeds(updateOrder(ownerDb, 'orders/legacy-payment-without-remaining', {
        price: 250,
        payment: {
          status: 'partial',
          method: 'pix',
          totalAmount: 250,
          paidAmount: 50,
        },
      }, 2));

      const saved = await getDoc(doc(ownerDb, 'orders/legacy-payment-without-remaining'));
      expect(saved.data()?.price).toBe(250);
      expect(saved.data()?.payment.remainingAmount).toBeUndefined();
    });

    it('permite atualização legítima de status sem alteração de valores financeiros', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-1', {
          status: 'in-progress',
        })
      );
      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-1', {
          status: 'completed',
        }, 3)
      );
    });

    it('permite editar campos independentes de valores legados inválidos sem exigir sua correção imediata', async () => {
      const ownerDb = dbFor('owner');
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('orders/legacy-invalid-fields').set({
          ...baseOrder,
          customerName: '   ',
          customerId: 'cliente-que-nao-existe',
          deliveryDate: 'data-antiga-invalida',
          tags: [{ name: '', color: 'cor-invalida' }],
          version: 1,
        });
      });

      await assertSucceeds(updateOrder(ownerDb, 'orders/legacy-invalid-fields', {
        notes: 'Atualização sem relação com campos legados',
      }, 2));

      const saved = await getDoc(doc(ownerDb, 'orders/legacy-invalid-fields'));
      expect(saved.data()?.notes).toBe('Atualização sem relação com campos legados');
      expect(saved.data()?.customerId).toBe('cliente-que-nao-existe');
      expect(saved.data()?.deliveryDate).toBe('data-antiga-invalida');
    });
  });

  describe('6. Controle de Concorrência (Versionamento)', () => {
    it('aceita atualização com incremento sequencial de versão (version = previous + 1)', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          notes: 'Versão 2',
          version: 2,
        })
      );
    });

    it('rejeita atualização com versão obsoleta ou desatualizada (stale version)', async () => {
      const ownerDb = dbFor('owner');
      // Documento avança legitimamente para a versão 2
      await updateDoc(doc(ownerDb, 'orders/order-1'), {
        notes: 'Versão 2 legítima',
        version: 2,
      });

      // Cliente desatualizado tenta gravar com versão 1 (obsoleta)
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          notes: 'Tentativa com versão 1 obsoleta',
          version: 1,
        })
      );
    });

    it('rejeita atualização com versão decrescente (version < previous)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          notes: 'Tentativa de versão 0',
          version: 0,
        })
      );
    });

    it('rejeita arquivamento que não incrementa version', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          isArchived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: 'owner',
        })
      );
      await assertSucceeds(updateOrder(ownerDb, 'orders/order-1', {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: 'owner',
      }));
    });

    it('rejeita atualização que omite version', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          notes: 'Edição sem incrementar version',
        })
      );
      const snap = await getDoc(doc(ownerDb, 'orders/order-1'));
      expect(snap.data()?.version).toBe(1);
    });

    it('rejeita uma escrita concorrente que tenta reutilizar a mesma próxima versão', async () => {
      const ownerDb = dbFor('owner');
      await updateOrder(ownerDb, 'orders/order-1', { notes: 'Primeira edição' }, 2);
      await assertFails(updateDoc(doc(ownerDb, 'orders/order-1'), {
        notes: 'Edição concorrente baseada na versão antiga',
        version: 2,
      }));
      expect((await getDoc(doc(ownerDb, 'orders/order-1'))).data()?.notes).toBe('Primeira edição');
    });

    it('exige a próxima versão ao atualizar pedido legado sem campo version', async () => {
      const ownerDb = dbFor('owner');
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('orders/legacy-order').set(baseOrder);
      });

      await assertFails(updateDoc(doc(ownerDb, 'orders/legacy-order'), { notes: 'Sem versão' }));
      await assertSucceeds(updateOrder(ownerDb, 'orders/legacy-order', { notes: 'Versão inicializada' }, 2));
      expect((await getDoc(doc(ownerDb, 'orders/legacy-order'))).data()?.version).toBe(2);
    });
  });

  describe('7. Limite de Expressões CEL e Atualização Complexa (20 Etiquetas + Item + Preço + Pagamento)', () => {
    it('permite atualizar pedido com 20 etiquetas, um item e pagamento sem exceder 1000 expressões CEL', async () => {
      const ownerDb = dbFor('owner');
      const tagNames = Array.from({ length: 20 }, (_, index) => `Etiqueta E2E ${String(index + 1).padStart(2, '0')}`);
      const tags = tagNames.map(name => ({ name, color: '#3b82f6' }));

      // Pedido inicial criado com 20 etiquetas, sem itens estruturados
      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-20-tags-complex'), {
          ...baseOrder,
          orderNumber: '#2026-0020',
          quantity: 1,
          price: 100,
          pricingMode: 'total',
          unitPrice: null,
          items: null,
          tags,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 100,
            paidAmount: 30.50,
            remainingAmount: 69.50,
          },
          version: 1,
        })
      );

      // Atualização que simula a edição de um pedido, pagamento e uma etiqueta
      // alterada em uma lista com 20 etiquetas.
      const revisedTag = 'Etiqueta Atualizada E2E';
      const updatedTags = [...tags.slice(0, 19), { name: revisedTag, color: '#3b82f6' }];
      const items = [{ name: 'Convite Luxo', quantity: 1, unitPrice: 130.50, price: 130.50 }];

      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-20-tags-complex', {
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo',
          quantity: 1,
          price: 130.50,
          items,
          unitPrice: 130.50,
          pricingMode: 'unit',
          deliveryDate: '2026-11-20',
          notes: 'Observações do pedido',
          status: 'in-progress',
          tags: updatedTags,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 130.50,
            paidAmount: 30.50,
            remainingAmount: 100.00,
          },
        }, 2)
      );

      const saved = await getDoc(doc(ownerDb, 'orders/order-20-tags-complex'));
      expect(saved.data()?.version).toBe(2);
      expect(saved.data()?.price).toBe(130.50);
      expect(saved.data()?.tags).toHaveLength(20);
      expect(saved.data()?.tags[19].name).toBe(revisedTag);
    });

    it('permite editar quatro itens em pedido que já tem 20 etiquetas sem exceder 1000 expressões CEL', async () => {
      const ownerDb = dbFor('owner');
      const tags = Array.from({ length: 20 }, (_, index) => ({ name: `Etiqueta ${index + 1}`, color: '#3b82f6' }));
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('orders/order-20-tags-four-items').set({
          ...baseOrder,
          orderNumber: '#2026-0024',
          quantity: 1,
          price: 100,
          items: null,
          unitPrice: null,
          pricingMode: 'total',
          tags,
          payment: { status: 'partial', method: 'pix', totalAmount: 100, paidAmount: 30, remainingAmount: 70 },
          version: 1,
        });
      });

      const items = [
        { name: 'Produto 1', quantity: 1, unitPrice: 36, price: 36 },
        { name: 'Produto 2', quantity: 1, unitPrice: 32, price: 32 },
        { name: 'Produto 3', quantity: 7, unitPrice: 1.29, price: 9.03 },
        { name: 'Produto 4', quantity: 1, unitPrice: 53.47, price: 53.47 },
      ];
      await assertSucceeds(updateOrder(ownerDb, 'orders/order-20-tags-four-items', {
        quantity: 10,
        price: 130.50,
        items,
        unitPrice: null,
        pricingMode: 'items',
        payment: { status: 'partial', method: 'pix', totalAmount: 130.50, paidAmount: 30, remainingAmount: 100.50 },
      }, 2));

      const saved = await getDoc(doc(ownerDb, 'orders/order-20-tags-four-items'));
      expect(saved.data()?.items).toHaveLength(4);
      expect(saved.data()?.tags).toHaveLength(20);
      expect(saved.data()?.price).toBe(130.50);
    });

    it('permite atualizar pedido substituindo todas as 20 etiquetas por novas etiquetas sem exceder limite CEL', async () => {
      const ownerDb = dbFor('owner');
      const initialTags = Array.from({ length: 20 }, (_, j) => ({ name: `Original ${j}`, color: '#123456' }));

      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-20-tags-all-new'), {
          ...baseOrder,
          orderNumber: '#2026-0021',
          quantity: 2,
          price: 100,
          tags: initialTags,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 100,
            paidAmount: 50,
            remainingAmount: 50,
          },
          version: 1,
        })
      );

      const brandNewTags = Array.from({ length: 20 }, (_, j) => ({ name: `Nova Etiqueta ${j}`, color: '#654321' }));

      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-20-tags-all-new', {
          tags: brandNewTags,
          price: 120,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 120,
            paidAmount: 50,
            remainingAmount: 70,
          },
        }, 2)
      );

      const saved = await getDoc(doc(ownerDb, 'orders/order-20-tags-all-new'));
      expect(saved.data()?.tags[0].name).toBe('Nova Etiqueta 0');
    });

    it('aceita 20 etiquetas com item estruturado e continua rejeitando a 21ª etiqueta', async () => {
      const ownerDb = dbFor('owner');
      const tags = Array.from({ length: 20 }, (_, i) => ({ name: `Etiqueta ${i}`, color: '#3b82f6' }));
      const item = { name: 'Convite Luxo', quantity: 1, unitPrice: 130.50, price: 130.50 };
      const commonOrder = {
        ...baseOrder,
        quantity: 1,
        price: 130.50,
        pricingMode: 'unit',
        unitPrice: 130.50,
        items: [item],
        payment: {
          status: 'partial',
          method: 'pix',
          totalAmount: 130.50,
          paidAmount: 30.50,
          remainingAmount: 100.00,
        },
        version: 1,
      };

      await assertSucceeds(setDoc(doc(ownerDb, 'orders/order-20-tags-with-item'), {
        ...commonOrder,
        orderNumber: '#2026-0022',
        tags,
      }));

      await assertFails(setDoc(doc(ownerDb, 'orders/order-21-tags-with-item'), {
        ...commonOrder,
        orderNumber: '#2026-0023',
        tags: [...tags, { name: 'Etiqueta 21', color: '#3b82f6' }],
      }));
    });
  });

  describe('4. Permissões transacionais entre pedidos atribuídos e salesLedger legado', () => {
    it('edita pedido atribuído, repara salesLedger legado e conclui com pagamento preservado', async () => {
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('salesLedger/order-1').set({
          id: 'order-1',
          orderId: 'order-1',
          orderNumber: baseOrder.orderNumber,
          userId: 'owner',
          customerName: baseOrder.customerName,
          customerPhone: baseOrder.customerPhone,
          productName: baseOrder.productName,
          quantity: 2,
          amount: 200,
          isExchange: false,
          paymentStatus: 'partial',
          paidAmount: 50,
          paymentMethod: 'pix',
          date: '2026-10-24',
          deliveryDate: baseOrder.deliveryDate,
          status: 'pending',
          createdAt: '2026-10-24T12:00:00.000Z',
          updatedAt: '2026-10-24T12:00:00.000Z',
        });
      });

      const employeeDb = dbFor('emp-assigned');
      await assertSucceeds(runTransaction(employeeDb, async (transaction) => {
        const orderRef = doc(employeeDb, 'orders/order-1');
        const saleRef = doc(employeeDb, 'salesLedger/order-1');
        await transaction.get(orderRef);
        await transaction.get(saleRef);

        transaction.update(orderRef, {
          productName: 'Convite Luxo e envelope',
          quantity: 3,
          price: 300,
          pricingMode: 'items',
          items: [
            { name: 'Convite Luxo', quantity: 2, unitPrice: 100, price: 200 },
            { name: 'Envelope', quantity: 1, unitPrice: 100, price: 100 },
          ],
          payment: {
            status: 'partial', method: 'pix', totalAmount: 300,
            paidAmount: 75, remainingAmount: 225,
          },
          version: 2,
          updatedAt: '2026-10-24T13:00:00.000Z',
        });
        transaction.update(saleRef, {
          productName: 'Convite Luxo e envelope',
          quantity: 3,
          amount: 300,
          paymentStatus: 'partial',
          paidAmount: 75,
          paymentMethod: 'pix',
          assignedTo: 'emp-assigned',
          assignedToName: null,
          updatedAt: '2026-10-24T13:00:00.000Z',
        });
      }));

      await assertSucceeds(runTransaction(employeeDb, async (transaction) => {
        const orderRef = doc(employeeDb, 'orders/order-1');
        const saleRef = doc(employeeDb, 'salesLedger/order-1');
        await transaction.get(orderRef);
        await transaction.get(saleRef);
        transaction.update(orderRef, {
          status: 'completed',
          version: 3,
          updatedAt: '2026-10-24T14:00:00.000Z',
        });
        transaction.update(saleRef, {
          status: 'completed',
          updatedAt: '2026-10-24T14:00:00.000Z',
        });
      }));

      const savedOrder = await getDoc(doc(employeeDb, 'orders/order-1'));
      const savedLedger = await getDoc(doc(employeeDb, 'salesLedger/order-1'));
      expect(savedOrder.data()?.status).toBe('completed');
      expect(savedOrder.data()?.payment.paidAmount).toBe(75);
      expect(savedLedger.data()?.assignedTo).toBe('emp-assigned');
      expect(savedLedger.data()?.amount).toBe(300);
      expect(savedLedger.data()?.paidAmount).toBe(75);
      expect(savedLedger.data()?.status).toBe('completed');
    });

    it('permite recriar o salesLedger ausente ao atualizar um pedido atribuído na produção', async () => {
      const createdAt = '2026-10-24T12:00:00.000Z';
      const orderId = 'order-without-ledger';
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set({
          ...baseOrder,
          assignedToName: 'Funcionário responsável',
          createdAt,
          version: 1,
        });
      });

      const employeeDb = dbFor('emp-assigned');
      await assertSucceeds(runTransaction(employeeDb, async (transaction) => {
        const orderRef = doc(employeeDb, `orders/${orderId}`);
        const saleRef = doc(employeeDb, `salesLedger/${orderId}`);
        await transaction.get(orderRef);
        await transaction.get(saleRef);
        transaction.update(orderRef, {
          status: 'in-progress',
          version: 2,
          updatedAt: '2026-10-24T13:00:00.000Z',
        });
        transaction.set(saleRef, {
          id: orderId,
          orderId,
          orderNumber: baseOrder.orderNumber,
          userId: 'owner',
          assignedTo: 'emp-assigned',
          assignedToName: 'Funcionário responsável',
          customerId: null,
          customerName: baseOrder.customerName,
          customerPhone: baseOrder.customerPhone,
          productName: baseOrder.productName,
          quantity: baseOrder.quantity,
          amount: baseOrder.price,
          isExchange: false,
          paymentStatus: 'partial',
          paidAmount: 50,
          paymentMethod: 'pix',
          date: createdAt,
          deliveryDate: baseOrder.deliveryDate,
          status: 'in-progress',
          isDeletedFromOrders: false,
          notes: baseOrder.notes,
          tags: null,
          createdAt,
          updatedAt: '2026-10-24T13:00:00.000Z',
        });
      }));

      const savedLedger = await getDoc(doc(employeeDb, `salesLedger/${orderId}`));
      expect(savedLedger.data()?.status).toBe('in-progress');
      expect(savedLedger.data()?.assignedTo).toBe('emp-assigned');
      expect(savedLedger.data()?.amount).toBe(baseOrder.price);
    });

    it('rejeita recriação de salesLedger com valor diferente do pedido vinculado', async () => {
      const orderId = 'order-with-forged-ledger';
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set({
          ...baseOrder,
          assignedToName: 'Funcionário responsável',
          createdAt: '2026-10-24T12:00:00.000Z',
          version: 1,
        });
      });

      const employeeDb = dbFor('emp-assigned');
      await assertFails(runTransaction(employeeDb, async (transaction) => {
        const orderRef = doc(employeeDb, `orders/${orderId}`);
        const saleRef = doc(employeeDb, `salesLedger/${orderId}`);
        await transaction.get(orderRef);
        await transaction.get(saleRef);
        transaction.update(orderRef, {
          status: 'in-progress',
          version: 2,
          updatedAt: '2026-10-24T13:00:00.000Z',
        });
        transaction.set(saleRef, {
          id: orderId,
          orderId,
          userId: 'owner',
          assignedTo: 'emp-assigned',
          assignedToName: 'Funcionário responsável',
          customerId: null,
          orderNumber: baseOrder.orderNumber,
          customerName: baseOrder.customerName,
          customerPhone: baseOrder.customerPhone,
          productName: baseOrder.productName,
          quantity: baseOrder.quantity,
          amount: baseOrder.price + 1,
          isExchange: false,
          paymentStatus: 'partial',
          paidAmount: 50,
          paymentMethod: 'pix',
          date: '2026-10-24T12:00:00.000Z',
          deliveryDate: baseOrder.deliveryDate,
          status: 'in-progress',
          isDeletedFromOrders: false,
          notes: baseOrder.notes,
          tags: null,
          createdAt: '2026-10-24T12:00:00.000Z',
          updatedAt: '2026-10-24T13:00:00.000Z',
        });
      }));
    });

    it('nega leitura e edição do ledger legado para funcionário não atribuído', async () => {
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('salesLedger/order-1').set({
          id: 'order-1',
          orderId: 'order-1',
          orderNumber: baseOrder.orderNumber,
          userId: 'owner',
          customerName: baseOrder.customerName,
          productName: baseOrder.productName,
          quantity: 2,
          amount: 200,
          paymentStatus: 'partial',
          paidAmount: 50,
          status: 'pending',
        });
      });

      const unassignedDb = dbFor('emp-unassigned');
      const saleRef = doc(unassignedDb, 'salesLedger/order-1');
      await assertFails(getDoc(saleRef));
      await assertFails(updateDoc(saleRef, { amount: 201 }));
    });

    it('impede funcionário autorizado a editar o pedido de alterar o valor do ledger isoladamente', async () => {
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('salesLedger/order-1').set({
          id: 'order-1',
          orderId: 'order-1',
          userId: 'owner',
          assignedTo: 'emp-assigned',
          amount: 200,
          quantity: 2,
          status: 'pending',
        });
      });

      const employeeDb = dbFor('emp-assigned');
      await assertFails(updateDoc(doc(employeeDb, 'salesLedger/order-1'), { amount: 1 }));
    });

    it('permite leitura ao funcionário atribuído, mas nega edição sem a permissão orders.edit', async () => {
      const orderId = 'order-assigned-without-edit';
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set({
          ...baseOrder,
          assignedTo: 'emp-no-edit',
          version: 1,
        });
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          orderNumber: baseOrder.orderNumber,
          userId: 'owner',
          assignedTo: 'emp-no-edit',
          customerName: baseOrder.customerName,
          productName: baseOrder.productName,
          quantity: 2,
          amount: 200,
          paymentStatus: 'partial',
          paidAmount: 50,
          status: 'pending',
        });
      });

      const readOnlyEmployeeDb = dbFor('emp-no-edit');
      const orderRef = doc(readOnlyEmployeeDb, `orders/${orderId}`);
      const saleRef = doc(readOnlyEmployeeDb, `salesLedger/${orderId}`);
      await assertSucceeds(getDoc(orderRef));
      await assertSucceeds(getDoc(saleRef));
      await assertFails(updateDoc(saleRef, { amount: 201 }));
      await assertFails(updateOrder(readOnlyEmployeeDb, `orders/${orderId}`, {
        notes: 'Tentativa sem permissão de edição',
      }));
    });

    it('nega leitura do pedido e do ledger ao funcionário atribuído sem orders.view', async () => {
      const orderId = 'order-assigned-without-view';
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set({
          ...baseOrder,
          assignedTo: 'emp-no-view',
          version: 1,
        });
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          userId: 'owner',
          assignedTo: 'emp-no-view',
          amount: 200,
          quantity: 2,
          status: 'pending',
        });
      });

      const employeeDb = dbFor('emp-no-view');
      await assertFails(getDoc(doc(employeeDb, `orders/${orderId}`)));
      await assertFails(getDoc(doc(employeeDb, `salesLedger/${orderId}`)));
    });

    it('permite exclusão lógica a funcionário com delete mesmo sem orders.edit e sincroniza ledger legado', async () => {
      const orderId = 'order-delete-only';
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set({
          ...baseOrder,
          assignedTo: 'emp-delete-only',
          version: 1,
        });
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          userId: 'owner',
          amount: baseOrder.price,
          quantity: baseOrder.quantity,
          status: baseOrder.status,
        });
      });

      const employeeDb = dbFor('emp-delete-only');
      const orderRef = doc(employeeDb, `orders/${orderId}`);
      const saleRef = doc(employeeDb, `salesLedger/${orderId}`);
      await assertSucceeds(updateOrder(employeeDb, `orders/${orderId}`, {
        deletedAt: Timestamp.now(),
        updatedAt: '2026-10-24T14:00:00.000Z',
      }));
      await assertSucceeds(updateDoc(saleRef, {
        isDeletedFromOrders: true,
        updatedAt: '2026-10-24T14:00:01.000Z',
      }));

      const savedOrder = await getDoc(orderRef);
      const savedLedger = await getDoc(saleRef);
      expect(savedOrder.data()?.deletedAt).toBeTruthy();
      expect(savedLedger.data()?.isDeletedFromOrders).toBe(true);
    });

    it('usa archivedOrders.delete para exclusão lógica de pedido arquivado', async () => {
      const orderId = 'archived-order-delete-only';
      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set({
          ...baseOrder,
          assignedTo: 'emp-archived-delete-only',
          isArchived: true,
          version: 1,
        });
      });

      const employeeDb = dbFor('emp-archived-delete-only');
      await assertSucceeds(updateOrder(employeeDb, `orders/${orderId}`, {
        deletedAt: Timestamp.now(),
        updatedAt: '2026-10-24T14:00:00.000Z',
      }));
    });

    it('nega exclusão lógica quando funcionário atribuído não tem permissão delete', async () => {
      const employeeDb = dbFor('emp-assigned');
      await assertFails(updateOrder(employeeDb, 'orders/order-1', {
        deletedAt: Timestamp.now(),
        updatedAt: '2026-10-24T14:00:00.000Z',
      }));
    });
  });

  describe('8. Edição de Pedido Existente com Link de Rastreamento (Adição de Itens e Limite CEL)', () => {
    it('permite atualizar pedido existente sem link ao adicionar item via OrderDetailsDialog', async () => {
      const orderId = 'order-cel-without-tracking';
      const initialOrder = {
        ...baseOrder,
        orderNumber: '#2026-0001',
        productName: 'Convite Luxo',
        quantity: 1,
        price: 100,
        pricingMode: 'unit',
        unitPrice: 100,
        items: [{ name: 'Convite Luxo', quantity: 1, unitPrice: 100, price: 100 }],
        tags: null,
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: 100,
          paidAmount: 100,
          remainingAmount: 0,
        },
        version: 1,
      };

      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set(initialOrder);
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          orderNumber: '#2026-0001',
          userId: 'owner',
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo',
          quantity: 1,
          amount: 100,
          isExchange: false,
          paymentStatus: 'paid',
          paidAmount: 100,
          paymentMethod: 'pix',
          date: '2026-10-24',
          deliveryDate: '2026-11-20',
          status: 'pending',
          createdAt: '2026-10-24T12:00:00.000Z',
          updatedAt: '2026-10-24T12:00:00.000Z',
        });
      });

      const ownerDb = dbFor('owner');
      const now = new Date().toISOString();
      const orderRef = doc(ownerDb, `orders/${orderId}`);
      const saleRef = doc(ownerDb, `salesLedger/${orderId}`);

      await assertSucceeds(runTransaction(ownerDb, async (transaction) => {
        await transaction.get(orderRef);
        await transaction.get(saleRef);

        transaction.update(orderRef, {
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo, Envelope',
          quantity: 2,
          price: 150,
          items: [
            { name: 'Convite Luxo', quantity: 1, unitPrice: 100, price: 100 },
            { name: 'Envelope', quantity: 1, unitPrice: 50, price: 50 },
          ],
          unitPrice: null,
          pricingMode: 'items',
          deliveryDate: '2026-11-20',
          notes: null,
          status: 'pending',
          tags: [],
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 150,
            paidAmount: 100,
            remainingAmount: 50,
            paymentDate: '2026-10-24T12:00:00.000Z',
            notes: null,
            history: null,
          },
          isExchange: false,
          exchangeNotes: null,
          cardColor: null,
          exchangeItems: [],
          version: 2,
          updatedAt: now,
        });

        transaction.update(saleRef, {
          updatedAt: now,
          amount: 150,
          isExchange: false,
          status: 'pending',
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo, Envelope',
          quantity: 2,
          deliveryDate: '2026-11-20',
          paymentStatus: 'partial',
          paidAmount: 100,
          paymentMethod: 'pix',
        });
      }));

      const updated = await getDoc(orderRef);
      expect(updated.data()?.quantity).toBe(2);
      expect(updated.data()?.price).toBe(150);
      expect(updated.data()?.pricingMode).toBe('items');
    });

    it('permite atualizar pedido existente COM link de rastreamento ao adicionar item via OrderDetailsDialog sem estourar limite CEL', async () => {
      const orderId = 'order-cel-with-tracking';
      const initialOrder = {
        ...baseOrder,
        orderNumber: '#2026-0002',
        productName: 'Convite Luxo',
        quantity: 1,
        price: 100,
        pricingMode: 'unit',
        unitPrice: 100,
        items: [{ name: 'Convite Luxo', quantity: 1, unitPrice: 100, price: 100 }],
        tags: null,
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: 100,
          paidAmount: 100,
          remainingAmount: 0,
        },
        version: 1,
        publicTrackingHash: 'hash-abc-123',
        publicTrackingExpiresAt: '2026-12-31T00:00:00.000Z',
        publicTrackingLinkId: 'link-123',
      };

      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set(initialOrder);
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          orderNumber: '#2026-0002',
          userId: 'owner',
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo',
          quantity: 1,
          amount: 100,
          isExchange: false,
          paymentStatus: 'paid',
          paidAmount: 100,
          paymentMethod: 'pix',
          date: '2026-10-24',
          deliveryDate: '2026-11-20',
          status: 'pending',
          createdAt: '2026-10-24T12:00:00.000Z',
          updatedAt: '2026-10-24T12:00:00.000Z',
        });
      });

      const ownerDb = dbFor('owner');
      const now = new Date().toISOString();
      const orderRef = doc(ownerDb, `orders/${orderId}`);
      const saleRef = doc(ownerDb, `salesLedger/${orderId}`);

      await assertSucceeds(runTransaction(ownerDb, async (transaction) => {
        await transaction.get(orderRef);
        await transaction.get(saleRef);

        transaction.update(orderRef, {
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo, Envelope',
          quantity: 2,
          price: 150,
          items: [
            { name: 'Convite Luxo', quantity: 1, unitPrice: 100, price: 100 },
            { name: 'Envelope', quantity: 1, unitPrice: 50, price: 50 },
          ],
          unitPrice: null,
          pricingMode: 'items',
          deliveryDate: '2026-11-20',
          notes: null,
          status: 'pending',
          tags: [],
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 150,
            paidAmount: 100,
            remainingAmount: 50,
            paymentDate: '2026-10-24T12:00:00.000Z',
            notes: null,
            history: null,
          },
          isExchange: false,
          exchangeNotes: null,
          cardColor: null,
          exchangeItems: [],
          version: 2,
          updatedAt: now,
        });

        transaction.update(saleRef, {
          updatedAt: now,
          amount: 150,
          isExchange: false,
          status: 'pending',
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo, Envelope',
          quantity: 2,
          deliveryDate: '2026-11-20',
          paymentStatus: 'partial',
          paidAmount: 100,
          paymentMethod: 'pix',
        });
      }));

      const updated = await getDoc(orderRef);
      expect(updated.data()?.quantity).toBe(2);
      expect(updated.data()?.price).toBe(150);
      expect(updated.data()?.publicTrackingHash).toBe('hash-abc-123');
    });

    it('permite atualizar pedido #2026-0088 com link de rastreamento adicionando o 4º item (payload exato dev)', async () => {
      const orderId = 'tS3wHmGaBxCdFABBXF9l';
      const initialOrder = {
        userId: 'admin',
        orderNumber: '#2026-0088',
        customerName: 'Ccesar',
        customerPhone: '11975526876',
        productName: 'Teste 1, Teste 2, Teste 3 (7x)',
        quantity: 9,
        price: 77.03,
        pricingMode: 'items',
        unitPrice: null,
        items: [
          { name: 'Teste 1', quantity: 1, unitPrice: 36, price: 36 },
          { name: 'Teste 2', quantity: 1, unitPrice: 32, price: 32 },
          { name: 'Teste 3', quantity: 7, unitPrice: 1.29, price: 9.03 },
        ],
        status: 'in-progress',
        deliveryDate: '2026-10-21',
        notes: null,
        tags: null,
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: 77.03,
          paidAmount: 77.03,
          remainingAmount: 0,
          paymentDate: '2026-10-21T20:32:14.803Z',
          notes: 'Pagamento inicial registrado',
          history: [{ amount: 32, notes: 'Pagamento inicial registrado', date: '2026-10-21T20:32:14.803Z', method: 'pix' }],
        },
        version: 18,
        createdAt: Timestamp.now(),
        updatedAt: '2026-10-24T20:49:47.931864000Z',
        isExchange: false,
        exchangeNotes: null,
        cardColor: null,
        exchangeItems: [],
        publicTrackingHash: 'hash-xyz',
        publicTrackingExpiresAt: '2026-12-31T00:00:00.000Z',
        publicTrackingLinkId: 'link-uuid-123',
      };

      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set(initialOrder);
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          orderNumber: '#2026-0088',
          userId: 'admin',
          amount: 77.03,
          isExchange: false,
          status: 'in-progress',
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: 'Teste 1, Teste 2, Teste 3 (7x)',
          quantity: 9,
          deliveryDate: '2026-10-21',
          paymentStatus: 'paid',
          paidAmount: 77.03,
          paymentMethod: 'pix',
          updatedAt: '2026-10-24T20:49:47.931864000Z',
        });
      });

      const adminDb = dbFor('admin');
      const orderRef = doc(adminDb, `orders/${orderId}`);
      const saleRef = doc(adminDb, `salesLedger/${orderId}`);

      await assertSucceeds(runTransaction(adminDb, async (transaction) => {
        await transaction.get(orderRef);
        await transaction.get(saleRef);

        transaction.update(orderRef, {
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: 'Teste 1, Teste 2, Teste 3 (7x), ffff',
          quantity: 10,
          price: 83.03,
          items: [
            { name: 'Teste 1', quantity: 1, unitPrice: 36, price: 36 },
            { name: 'Teste 2', quantity: 1, unitPrice: 32, price: 32 },
            { name: 'Teste 3', quantity: 7, unitPrice: 1.29, price: 9.03 },
            { name: 'ffff', quantity: 1, unitPrice: 6, price: 6 },
          ],
          unitPrice: null,
          pricingMode: 'items',
          deliveryDate: '2026-10-21',
          notes: null,
          status: 'in-progress',
          tags: null,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 83.03,
            paidAmount: 77.03,
            remainingAmount: 6,
            paymentDate: '2026-10-21T20:32:14.803Z',
            notes: 'Estorno/crédito automático de R$ 1.00 por redução do valor pago (de R$ 32.00 para R$ 31.00). Forma pix: R$ 1.00.',
            history: [
              { amount: 32, notes: 'Pagamento inicial registrado', date: '2026-10-21T20:32:14.803Z', method: 'pix' },
              { amount: -1, date: '2026-10-22T01:06:35.628Z', notes: 'Estorno/crédito automático de R$ 1.00 por redução do valor pago (de R$ 32.00 para R$ 31.00). Forma pix: R$ 1.00.', method: 'pix' },
            ],
          },
          isExchange: false,
          exchangeNotes: null,
          cardColor: null,
          exchangeItems: [],
          version: 19,
          updatedAt: '2026-10-25T00:40:08.110Z',
        });

        transaction.update(saleRef, {
          updatedAt: '2026-10-25T00:40:08.110Z',
          amount: 83.03,
          isExchange: false,
          status: 'in-progress',
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: 'Teste 1, Teste 2, Teste 3 (7x), ffff',
          quantity: 10,
          deliveryDate: '2026-10-21',
          paymentStatus: 'partial',
          paidAmount: 77.03,
          paymentMethod: 'pix',
        });
      }));

      const updated = await getDoc(orderRef);
      expect(updated.data()?.quantity).toBe(10);
      expect(updated.data()?.price).toBe(83.03);
      expect(updated.data()?.items).toHaveLength(4);
      expect(updated.data()?.version).toBe(19);
    });

    it('nega gravação direta de item agregado acima de quatro para exigir validação da Function', async () => {
      const orderId = 'tS3wHmGaBxCdFABBXF9l-5';
      const initialOrder = {
        userId: 'admin',
        orderNumber: '#2026-0089',
        customerName: 'Ccesar',
        customerPhone: '11975526876',
        productName: 'Teste 1, Teste 2, Teste 3 (7x), ffff',
        quantity: 10,
        price: 83.03,
        pricingMode: 'items',
        unitPrice: null,
        items: [
          { name: 'Teste 1', quantity: 1, unitPrice: 36, price: 36 },
          { name: 'Teste 2', quantity: 1, unitPrice: 32, price: 32 },
          { name: 'Teste 3', quantity: 7, unitPrice: 1.29, price: 9.03 },
          { name: 'ffff', quantity: 1, unitPrice: 6, price: 6 },
        ],
        status: 'in-progress',
        deliveryDate: '2026-10-21',
        notes: null,
        tags: null,
        payment: {
          status: 'partial',
          method: 'pix',
          totalAmount: 83.03,
          paidAmount: 77.03,
          remainingAmount: 6,
          paymentDate: '2026-10-21T20:32:14.803Z',
          notes: 'Pagamento inicial registrado',
          history: [{ amount: 32, notes: 'Pagamento inicial registrado', date: '2026-10-21T20:32:14.803Z', method: 'pix' }],
        },
        version: 19,
        createdAt: Timestamp.now(),
        updatedAt: '2026-10-24T20:49:47.931864000Z',
        isExchange: false,
        exchangeNotes: null,
        cardColor: null,
        exchangeItems: [],
        publicTrackingHash: 'hash-xyz',
        publicTrackingExpiresAt: '2026-12-31T00:00:00.000Z',
        publicTrackingLinkId: 'link-uuid-123',
      };

      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set(initialOrder);
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          orderNumber: '#2026-0089',
          userId: 'admin',
          amount: 83.03,
          isExchange: false,
          status: 'in-progress',
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: 'Teste 1, Teste 2, Teste 3 (7x), ffff',
          quantity: 10,
          deliveryDate: '2026-10-21',
          paymentStatus: 'partial',
          paidAmount: 77.03,
          paymentMethod: 'pix',
          updatedAt: '2026-10-24T20:49:47.931864000Z',
        });
      });

      const adminDb = dbFor('admin');
      const orderRef = doc(adminDb, `orders/${orderId}`);
      const saleRef = doc(adminDb, `salesLedger/${orderId}`);

      await assertFails(runTransaction(adminDb, async (transaction) => {
        await transaction.get(orderRef);
        await transaction.get(saleRef);

        transaction.update(orderRef, {
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: 'Teste 1, Teste 2, Teste 3 (7x), ffff, item 5',
          quantity: 11,
          price: 93.03,
          items: [
            { name: 'Teste 1', quantity: 1, unitPrice: 36, price: 36 },
            { name: 'Teste 2', quantity: 1, unitPrice: 32, price: 32 },
            { name: 'Teste 3', quantity: 7, unitPrice: 1.29, price: 9.03 },
            { name: 'ffff', quantity: 1, unitPrice: 6, price: 6 },
            { name: 'item 5', quantity: 1, unitPrice: 10, price: 10 },
          ],
          unitPrice: null,
          pricingMode: 'items',
          deliveryDate: '2026-10-21',
          notes: null,
          status: 'in-progress',
          tags: null,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 93.03,
            paidAmount: 77.03,
            remainingAmount: 16,
            paymentDate: '2026-10-21T20:32:14.803Z',
            notes: 'Estorno/crédito automático de R$ 1.00 por redução do valor pago (de R$ 32.00 para R$ 31.00). Forma pix: R$ 1.00.',
            history: [
              { amount: 32, notes: 'Pagamento inicial registrado', date: '2026-10-21T20:32:14.803Z', method: 'pix' },
              { amount: -1, notes: 'Estorno/crédito automático de R$ 1.00 por redução do valor pago (de R$ 32.00 para R$ 31.00). Forma pix: R$ 1.00.', date: '2026-10-22T01:06:35.628Z', method: 'pix' },
            ],
          },
          isExchange: false,
          exchangeNotes: null,
          cardColor: null,
          exchangeItems: [],
          version: 20,
          updatedAt: '2026-10-25T00:40:08.110Z',
        });

        transaction.update(saleRef, {
          updatedAt: '2026-10-25T00:40:08.110Z',
          amount: 93.03,
          isExchange: false,
          status: 'in-progress',
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: 'Teste 1, Teste 2, Teste 3 (7x), ffff, item 5',
          quantity: 11,
          deliveryDate: '2026-10-21',
          paymentStatus: 'partial',
          paidAmount: 77.03,
          paymentMethod: 'pix',
        });
      }));

      const unchanged = await getDoc(orderRef);
      expect(unchanged.data()?.quantity).toBe(10);
      expect(unchanged.data()?.items).toHaveLength(4);
    });

    it('nega gravação direta de pedido com link e dez itens para exigir validação da Function', async () => {
      const orderId = 'tS3wHmGaBxCdFABBXF9l-10';
      const initialOrder = {
        userId: 'admin',
        orderNumber: '#2026-0090',
        customerName: 'Ccesar',
        customerPhone: '11975526876',
        productName: '10 itens',
        quantity: 1,
        price: 10,
        pricingMode: 'items',
        unitPrice: null,
        items: [{ name: 'Item 1', quantity: 1, unitPrice: 10, price: 10 }],
        status: 'in-progress',
        deliveryDate: '2026-10-21',
        notes: null,
        tags: null,
        payment: {
          status: 'paid',
          method: 'pix',
          totalAmount: 10,
          paidAmount: 10,
          remainingAmount: 0,
        },
        version: 1,
        createdAt: Timestamp.now(),
        updatedAt: '2026-10-24T20:49:47.931864000Z',
        isExchange: false,
        exchangeNotes: null,
        cardColor: null,
        exchangeItems: [],
        publicTrackingHash: 'hash-xyz',
        publicTrackingExpiresAt: '2026-12-31T00:00:00.000Z',
        publicTrackingLinkId: 'link-uuid-123',
      };

      await env.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`orders/${orderId}`).set(initialOrder);
        await context.firestore().doc(`salesLedger/${orderId}`).set({
          id: orderId,
          orderId,
          orderNumber: '#2026-0090',
          userId: 'admin',
          amount: 10,
          isExchange: false,
          status: 'in-progress',
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: '10 itens',
          quantity: 1,
          deliveryDate: '2026-10-21',
          paymentStatus: 'paid',
          paidAmount: 10,
          paymentMethod: 'pix',
          updatedAt: '2026-10-24T20:49:47.931864000Z',
        });
      });

      const adminDb = dbFor('admin');
      const orderRef = doc(adminDb, `orders/${orderId}`);
      const saleRef = doc(adminDb, `salesLedger/${orderId}`);

      const items10 = Array.from({ length: 10 }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: 1,
        unitPrice: 10,
        price: 10,
      }));

      await assertFails(runTransaction(adminDb, async (transaction) => {
        await transaction.get(orderRef);
        await transaction.get(saleRef);

        transaction.update(orderRef, {
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: '10 itens atualizados',
          quantity: 10,
          price: 100,
          items: items10,
          unitPrice: null,
          pricingMode: 'items',
          deliveryDate: '2026-10-21',
          notes: null,
          status: 'in-progress',
          tags: null,
          payment: {
            status: 'paid',
            method: 'pix',
            totalAmount: 100,
            paidAmount: 100,
            remainingAmount: 0,
            paymentDate: '2026-10-21T20:32:14.803Z',
            notes: 'Pagamento total',
            history: null,
          },
          isExchange: false,
          exchangeNotes: null,
          cardColor: null,
          exchangeItems: [],
          version: 2,
          updatedAt: '2026-10-25T00:40:08.110Z',
        });

        transaction.update(saleRef, {
          updatedAt: '2026-10-25T00:40:08.110Z',
          amount: 100,
          isExchange: false,
          status: 'in-progress',
          customerName: 'Ccesar',
          customerPhone: '11975526876',
          productName: '10 itens atualizados',
          quantity: 10,
          deliveryDate: '2026-10-21',
          paymentStatus: 'paid',
          paidAmount: 100,
          paymentMethod: 'pix',
        });
      }));

      const updated = await getDoc(orderRef);
      expect(updated.data()?.items).toHaveLength(1);
      expect(updated.data()?.version).toBe(1);
    });
  });
});
