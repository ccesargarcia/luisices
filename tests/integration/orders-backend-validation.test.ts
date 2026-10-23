import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

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
          ...baseOrder,
          orderNumber: '#2026-0005',
          quantity: 1,
          price: 10,
          items: [{ name: 'Item', quantity: 1, unitPrice: -10, price: -10 }],
        })
      );
    });

    it('rejeita item com quantidade zero ou fracionária', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-zero-qty'), {
          ...baseOrder,
          orderNumber: '#2026-0006',
          items: [{ name: 'Item', quantity: 0, unitPrice: 50, price: 0 }],
        })
      );
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-float-qty'), {
          ...baseOrder,
          orderNumber: '#2026-0007',
          items: [{ name: 'Item', quantity: 1.5 as any, unitPrice: 50, price: 75 }],
        })
      );
    });

    it('rejeita item com nome vazio ou apenas espaços', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-empty-name'), {
          ...baseOrder,
          orderNumber: '#2026-0008',
          quantity: 1,
          price: 50,
          items: [{ name: '   ', quantity: 1, unitPrice: 50, price: 50 }],
        })
      );
    });

    it('rejeita item com subtotal inconsistente (quantity * unitPrice != price)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-bad-subtotal'), {
          ...baseOrder,
          orderNumber: '#2026-0009',
          quantity: 2,
          price: 100,
          items: [{ name: 'Item', quantity: 2, unitPrice: 50, price: 80 }], // 2 * 50 != 80
        })
      );
    });

    it('rejeita campos extras não autorizados dentro do item', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-extra-field'), {
          ...baseOrder,
          orderNumber: '#2026-0010',
          quantity: 1,
          price: 50,
          items: [{ name: 'Item', quantity: 1, unitPrice: 50, price: 50, evilField: 'hack' } as any],
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
          ...baseOrder,
          orderNumber: '#2026-0011',
          quantity: 11,
          price: 110,
          items: elevenItems,
        })
      );
    });
  });

  describe('4. Consistência Agregada (Pedido vs Itens)', () => {
    it('rejeita quando a soma das quantidades dos itens diverge do total do pedido', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-qty-mismatch'), {
          ...baseOrder,
          orderNumber: '#2026-0012',
          quantity: 5, // Errado: itens somam 3
          price: 150,
          items: [
            { name: 'Item 1', quantity: 2, unitPrice: 50, price: 100 },
            { name: 'Item 2', quantity: 1, unitPrice: 50, price: 50 },
          ],
        })
      );
    });

    it('rejeita quando a soma dos preços dos itens diverge do valor total do pedido', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        setDoc(doc(ownerDb, 'orders/order-price-mismatch'), {
          ...baseOrder,
          orderNumber: '#2026-0013',
          quantity: 2,
          price: 300, // Errado: itens somam 200
          items: [
            { name: 'Item 1', quantity: 1, unitPrice: 100, price: 100 },
            { name: 'Item 2', quantity: 1, unitPrice: 100, price: 100 },
          ],
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

  describe('7. Limite de Expressões CEL e Atualização Complexa (20 Etiquetas + Itens + Preço + Pagamento)', () => {
    it('permite atualizar pedido com 20 etiquetas, itens estruturados, unitPrice e pagamento consistente sem exceder limite CEL de 1000 expressões', async () => {
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

      // Atualização que simula a tela de edição do E2E:
      // Altera preço para 130.50, insere itens estruturados, unitPrice, recalcula pagamento e altera 1 etiqueta das 20
      const revisedTag = 'Etiqueta Atualizada E2E';
      const updatedTags = [...tags.slice(0, 19), { name: revisedTag, color: '#3b82f6' }];

      await assertSucceeds(
        updateOrder(ownerDb, 'orders/order-20-tags-complex', {
          customerName: 'Cliente Teste',
          customerPhone: '11999999999',
          productName: 'Convite Luxo',
          quantity: 1,
          price: 130.50,
          items: [{
            name: 'Convite Luxo',
            quantity: 1,
            unitPrice: 130.50,
            price: 130.50,
          }],
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

    it('rejeita atualização quando a última etiqueta de 20 for inválida em pedido com itens estruturados', async () => {
      const ownerDb = dbFor('owner');
      const tags = Array.from({ length: 20 }, (_, i) => ({ name: `Etiqueta ${i}`, color: '#3b82f6' }));

      await assertSucceeds(
        setDoc(doc(ownerDb, 'orders/order-bad-20th-tag'), {
          ...baseOrder,
          orderNumber: '#2026-0022',
          quantity: 1,
          price: 130.50,
          pricingMode: 'unit',
          unitPrice: 130.50,
          items: [{
            name: 'Convite Luxo',
            quantity: 1,
            unitPrice: 130.50,
            price: 130.50,
          }],
          tags,
          payment: {
            status: 'partial',
            method: 'pix',
            totalAmount: 130.50,
            paidAmount: 30.50,
            remainingAmount: 100.00,
          },
          version: 1,
        })
      );

      const badTags = [...tags.slice(0, 19), { name: '', color: '#3b82f6' }]; // Nome vazio é inválido

      await assertFails(
        updateOrder(ownerDb, 'orders/order-bad-20th-tag', {
          tags: badTags,
          price: 130.50,
          items: [{
            name: 'Convite Luxo',
            quantity: 1,
            unitPrice: 130.50,
            price: 130.50,
          }],
        }, 2)
      );
    });
  });
});
