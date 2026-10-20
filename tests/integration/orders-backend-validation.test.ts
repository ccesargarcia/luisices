import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;
const dbFor = (uid: string) => env.authenticatedContext(uid).firestore();

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
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          customerName: 'Cliente Atualizado',
        })
      );
    });

    it('permite que administrador edite qualquer pedido', async () => {
      const adminDb = dbFor('admin');
      await assertSucceeds(
        updateDoc(doc(adminDb, 'orders/order-1'), {
          customerName: 'Cliente Atualizado pelo Admin',
        })
      );
    });

    it('permite que funcionário atribuído com permissão edit atualize o pedido', async () => {
      const empDb = dbFor('emp-assigned');
      await assertSucceeds(
        updateDoc(doc(empDb, 'orders/order-1'), {
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
        updateDoc(doc(empNoEditDb, 'orders/order-no-edit'), {
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
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          userId: 'other-user',
        })
      );
    });

    it('impede alteração do orderNumber (identidade do pedido)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          orderNumber: '#9999-9999',
        })
      );
    });

    it('impede alteração do createdAt (auditoria temporal)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          createdAt: Timestamp.now(),
        })
      );
    });

    it('impede alteração de outros campos imutáveis (createdByUid, source, idempotencyKey)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          createdByUid: 'malicious-uid',
        })
      );
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          source: 'malicious-source',
        })
      );
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          idempotencyKey: 'new-key',
        })
      );
    });

    it('impede inclusão de campos arbitrários não permitidos na atualização (lista positiva fechada via changed.hasOnly)', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          unexpectedInjectedField: 'hack',
        })
      );
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
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
        updateDoc(doc(ownerDb, 'orders/order-1'), {
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
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          items: null,
          pricingMode: 'hack_mode',
        })
      );
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
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
        updateDoc(doc(ownerDb, 'orders/order-multi-items'), {
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
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          price: 250, // payment.totalAmount é 200 no baseOrder
        })
      );
    });

    it('rejeita alteração de pagamento com paidAmount maior que o total ou remainingAmount inválido', async () => {
      const ownerDb = dbFor('owner');
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          payment: {
            status: 'paid',
            totalAmount: 200,
            paidAmount: 250, // Maior que 200
            remainingAmount: 0,
          },
        })
      );
      await assertFails(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
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
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          status: 'in-progress',
        })
      );
      await assertSucceeds(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          status: 'completed',
        })
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

    it('permite atualizações legítimas que não tocam no campo version (ex: arquivamento)', async () => {
      const ownerDb = dbFor('owner');
      await assertSucceeds(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          isArchived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: 'owner',
        })
      );
    });

    it('documenta comportamento de compatibilidade: gravação que omite version preserva versão anterior', async () => {
      const ownerDb = dbFor('owner');
      // Gravação legítima ou auxiliar sem version é aceita e preserva o campo version existente
      await assertSucceeds(
        updateDoc(doc(ownerDb, 'orders/order-1'), {
          notes: 'Edição de observação sem alterar version',
        })
      );
      const snap = await getDoc(doc(ownerDb, 'orders/order-1'));
      expect(snap.data()?.version).toBe(1);
    });
  });
});
