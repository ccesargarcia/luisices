import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const dbFor = (uid = 'owner') => env.authenticatedContext(uid).firestore();
const baseQuote = {
  userId: 'owner', customerName: 'Cliente Teste', customerPhone: '11999999999',
  status: 'draft', items: [
    { name: 'Produto A', quantity: 2, unitPrice: 150 },
    { name: 'Produto B', quantity: 1, unitPrice: 50 },
  ],
  discount: 10, discountType: 'percent', totalPrice: 315,
};

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Execute via npm run test:integration.');
  env = await initializeTestEnvironment({
    projectId: 'demo-luisices-review', firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc('userProfiles/owner').set({
      role: 'user', active: true,
      permissions: { quotes: { create: true, view: true, edit: true, delete: true } },
    });
  });
});

describe('Validação matemática de orçamentos nas regras do Firestore', () => {
  it('aceita orçamento cujo total corresponde aos itens e ao desconto', async () => {
    await assertSucceeds(setDoc(doc(dbFor(), 'quotes/valid'), baseQuote));
  });

  it('usa arredondamento de centavos idêntico para percentuais', async () => {
    await assertSucceeds(setDoc(doc(dbFor(), 'quotes/five-cents'), {
      ...baseQuote,
      items: [{ name: 'Item de cinco centavos', quantity: 1, unitPrice: 0.05 }],
      discount: null, discountType: null, totalPrice: 0.05,
    }));
    await assertSucceeds(setDoc(doc(dbFor(), 'quotes/rounded'), {
      ...baseQuote,
      items: [{ name: 'Item de cinco centavos', quantity: 1, unitPrice: 0.05 }],
      discount: 10, discountType: 'percent', totalPrice: 0.04,
    }));
  });

  it('rejeita total adulterado, desconto maior que o subtotal e percentual acima de 100', async () => {
    await assertFails(setDoc(doc(dbFor(), 'quotes/wrong-total'), { ...baseQuote, totalPrice: 1 }));
    await assertFails(setDoc(doc(dbFor(), 'quotes/oversized-discount'), {
      ...baseQuote, discount: 351, discountType: 'fixed', totalPrice: 0,
    }));
    await assertFails(setDoc(doc(dbFor(), 'quotes/invalid-percent'), {
      ...baseQuote, discount: 101, totalPrice: -3.5,
    }));
  });

  it('rejeita quantidade fracionária, preço adulterado e mais de 10 itens', async () => {
    await assertFails(setDoc(doc(dbFor(), 'quotes/fractional-quantity'), {
      ...baseQuote, items: [{ name: 'Produto A', quantity: 1.5, unitPrice: 100 }], discount: null, discountType: null, totalPrice: 150,
    }));
    await assertFails(setDoc(doc(dbFor(), 'quotes/extra-item-fields'), {
      ...baseQuote, items: [{ name: 'Produto A', quantity: 2, unitPrice: 150, price: 300 }], discount: null, discountType: null, totalPrice: 300,
    }));
    await assertFails(setDoc(doc(dbFor(), 'quotes/fractional-cent-price'), {
      ...baseQuote,
      items: [{ name: 'Produto A', quantity: 1, unitPrice: 0.051 }],
      discount: null, discountType: null, totalPrice: 0.05,
    }));
    await assertFails(setDoc(doc(dbFor(), 'quotes/too-many'), {
      ...baseQuote,
      items: Array.from({ length: 11 }, (_, i) => ({ name: `Item ${i}`, quantity: 1, unitPrice: 1 })),
      discount: null, discountType: null, totalPrice: 11,
    }));
  });

  it('aceita exatamente 10 itens e os limites máximos válidos de quantidade e preço', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      name: `Item ${i + 1}`,
      quantity: i === 0 ? 10000 : 1,
      unitPrice: i === 0 ? 1000000 : 0,
    }));
    await assertSucceeds(setDoc(doc(dbFor(), 'quotes/max-valid-boundaries'), {
      ...baseQuote,
      items,
      discount: 0,
      discountType: 'fixed',
      totalPrice: 10000000000,
    }));
  });

  it('rejeita limites inválidos de quantidade, preço, nome e precisão do desconto', async () => {
    const validSingle = [{ name: 'Produto', quantity: 1, unitPrice: 10 }];
    const invalidQuotes = [
      { id: 'zero-quantity', items: [{ ...validSingle[0], quantity: 0 }], discount: 0, totalPrice: 0 },
      { id: 'quantity-over-limit', items: [{ ...validSingle[0], quantity: 10001 }], discount: 0, totalPrice: 100010 },
      { id: 'price-over-limit', items: [{ ...validSingle[0], unitPrice: 1000000.01 }], discount: 0, totalPrice: 1000000.01 },
      { id: 'blank-name', items: [{ ...validSingle[0], name: '   ' }], discount: 0, totalPrice: 10 },
      { id: 'name-over-limit', items: [{ ...validSingle[0], name: 'A'.repeat(301) }], discount: 0, totalPrice: 10 },
      { id: 'fractional-cent-discount', items: validSingle, discount: 0.001, discountType: 'fixed', totalPrice: 10 },
      { id: 'negative-discount', items: validSingle, discount: -0.01, discountType: 'fixed', totalPrice: 10 },
      { id: 'unknown-discount-type', items: validSingle, discount: 0, discountType: 'amount', totalPrice: 10 },
      { id: 'negative-total', items: validSingle, discount: 0, discountType: 'fixed', totalPrice: -1 },
    ];

    for (const { id, ...quote } of invalidQuotes) {
      await assertFails(setDoc(doc(dbFor(), `quotes/${id}`), {
        ...baseQuote,
        ...quote,
        discountType: quote.discountType ?? 'fixed',
      }));
    }
  });

  it('valida atualizações de valor e permite transição de status sem alterar o cálculo', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('quotes/existing').set(baseQuote);
      await context.firestore().doc('quotes/legacy').set({
        userId: 'owner', customerName: 'Cliente legado', totalPrice: 100, status: 'draft',
      });
    });
    await assertSucceeds(updateDoc(doc(dbFor(), 'quotes/existing'), { status: 'sent' }));
    await assertFails(updateDoc(doc(dbFor(), 'quotes/existing'), { totalPrice: 314 }));
    await assertSucceeds(updateDoc(doc(dbFor(), 'quotes/legacy'), { status: 'sent' }));
    await assertFails(updateDoc(doc(dbFor(), 'quotes/legacy'), { totalPrice: 1 }));

    // Simulação exata da edição do E2E (quotes.spec.ts:77):
    // 1 item alterado para unitPrice 125, desconto 10%
    await assertSucceeds(updateDoc(doc(dbFor(), 'quotes/existing'), {
      items: [{ name: 'Produto editável', quantity: 1, unitPrice: 125 }],
      discount: 10,
      discountType: 'percent',
      totalPrice: 112.5,
    }));
  });
});
