import { describe, expect, it } from 'vitest';
import { handleCreateOrder } from '../../../functions/orders/index.js';

const mockDb: any = {
  doc: (path: string) => ({
    get: async () => ({
      exists: true,
      data: () => ({
        active: true,
        permissions: { orders: { create: true } },
      }),
    }),
  }),
};

const baseRequest = (orderData: Record<string, any>) => ({
  auth: { uid: 'user-unit-1', token: { auth_time: 1 } },
  data: { orderData },
});

describe('Unit tests: validação de criação de pedidos (handleCreateOrder)', () => {
  const validOrder = {
    customerName: 'Cliente Teste',
    productName: 'Produto Teste',
    quantity: 1,
    price: 50,
    deliveryDate: '2026-11-20',
  };

  it('rejeita isExchange quando não for booleano (ex: "false", 0, "true")', async () => {
    await expect(handleCreateOrder(baseRequest({ ...validOrder, isExchange: 'false' }), mockDb))
      .rejects.toThrow('Indicador de permuta inválido.');

    await expect(handleCreateOrder(baseRequest({ ...validOrder, isExchange: 'true' }), mockDb))
      .rejects.toThrow('Indicador de permuta inválido.');

    await expect(handleCreateOrder(baseRequest({ ...validOrder, isExchange: 0 }), mockDb))
      .rejects.toThrow('Indicador de permuta inválido.');
  });

  it('rejeita pricingMode inválido', async () => {
    await expect(handleCreateOrder(baseRequest({ ...validOrder, pricingMode: 'desconto' }), mockDb))
      .rejects.toThrow('Tipo de preço inválido.');

    await expect(handleCreateOrder(baseRequest({ ...validOrder, pricingMode: 'invalid' }), mockDb))
      .rejects.toThrow('Tipo de preço inválido.');
  });

  it('rejeita unitPrice negativo, não numérico ou acima de 1.000.000', async () => {
    await expect(handleCreateOrder(baseRequest({ ...validOrder, unitPrice: -1 }), mockDb))
      .rejects.toThrow('Preço unitário inválido.');

    await expect(handleCreateOrder(baseRequest({ ...validOrder, unitPrice: 1000000.01 }), mockDb))
      .rejects.toThrow('Preço unitário inválido.');

    await expect(handleCreateOrder(baseRequest({ ...validOrder, unitPrice: '50' as any }), mockDb))
      .rejects.toThrow('Preço unitário inválido.');
  });

  it('rejeita preço unitário com frações de centavos', async () => {
    await expect(handleCreateOrder(baseRequest({ ...validOrder, unitPrice: 10.555 }), mockDb))
      .rejects.toThrow('O preço unitário deve usar centavos inteiros.');
  });

  it('rejeita unitPrice incompatível com o item único', async () => {
    const singleItemOrder = {
      ...validOrder,
      quantity: 2,
      price: 100,
      unitPrice: 60, // Diverge do preço do item (50)
      items: [{ name: 'Item', quantity: 2, unitPrice: 50, price: 100 }],
    };

    await expect(handleCreateOrder(baseRequest(singleItemOrder), mockDb))
      .rejects.toThrow('O preço unitário do pedido não corresponde ao item.');
  });

  it('rejeita unitPrice em pedidos com múltiplos itens', async () => {
    const multiItemOrder = {
      ...validOrder,
      quantity: 2,
      price: 100,
      unitPrice: 50,
      items: [
        { name: 'Item 1', quantity: 1, unitPrice: 50, price: 50 },
        { name: 'Item 2', quantity: 1, unitPrice: 50, price: 50 },
      ],
    };

    await expect(handleCreateOrder(baseRequest(multiItemOrder), mockDb))
      .rejects.toThrow('Pedidos com múltiplos itens não devem ter unitPrice no pedido.');
  });

  it('rejeita pricingMode unit ou total em pedidos com múltiplos itens', async () => {
    const multiItemOrder = {
      ...validOrder,
      quantity: 2,
      price: 100,
      pricingMode: 'unit',
      items: [
        { name: 'Item 1', quantity: 1, unitPrice: 50, price: 50 },
        { name: 'Item 2', quantity: 1, unitPrice: 50, price: 50 },
      ],
    };

    await expect(handleCreateOrder(baseRequest(multiItemOrder), mockDb))
      .rejects.toThrow('Pedidos com múltiplos itens devem usar o tipo de preço "items".');
  });

  it('rejeita pricingMode items quando items for nulo', async () => {
    const noItemsOrder = {
      ...validOrder,
      pricingMode: 'items',
      items: null,
    };

    await expect(handleCreateOrder(baseRequest(noItemsOrder), mockDb))
      .rejects.toThrow('O tipo de preço "items" exige uma lista de itens estruturados.');
  });

  it('rejeita items que não seja um array', async () => {
    const invalidItemsOrder = {
      ...validOrder,
      items: 'not-an-array' as any,
    };

    await expect(handleCreateOrder(baseRequest(invalidItemsOrder), mockDb))
      .rejects.toThrow('A lista de itens deve ser um array válido.');
  });

  it('rejeita preço total incompatível com quantidade e unitPrice no modo unit', async () => {
    const mismatchSimpleOrder = {
      ...validOrder,
      quantity: 2,
      price: 120, // 2 * 50 = 100, diverge de 120
      pricingMode: 'unit',
      unitPrice: 50,
      items: null,
    };

    await expect(handleCreateOrder(baseRequest(mismatchSimpleOrder), mockDb))
      .rejects.toThrow('O preço total não corresponde à quantidade e ao preço unitário.');
  });

  describe('Validações de Preço e Quantidade do Pedido', () => {
    it('rejeita preço negativo, não numérico ou acima de 1.000.000', async () => {
      await expect(handleCreateOrder(baseRequest({ ...validOrder, price: -10 }), mockDb))
        .rejects.toThrow('O preço deve ser um número válido de até 1.000.000.');

      await expect(handleCreateOrder(baseRequest({ ...validOrder, price: 1000001 }), mockDb))
        .rejects.toThrow('O preço deve ser um número válido de até 1.000.000.');

      await expect(handleCreateOrder(baseRequest({ ...validOrder, price: 'cem' as any }), mockDb))
        .rejects.toThrow('O preço deve ser um número válido de até 1.000.000.');

      await expect(handleCreateOrder(baseRequest({ ...validOrder, price: Number.NaN }), mockDb))
        .rejects.toThrow('O preço deve ser um número válido de até 1.000.000.');
    });

    it('rejeita preço com frações de centavos', async () => {
      await expect(handleCreateOrder(baseRequest({ ...validOrder, price: 50.125 }), mockDb))
        .rejects.toThrow('O preço deve usar centavos inteiros.');
    });

    it('rejeita quantidade menor que 1, fracionária ou acima de 10.000', async () => {
      await expect(handleCreateOrder(baseRequest({ ...validOrder, quantity: 0 }), mockDb))
        .rejects.toThrow('A quantidade deve ser um número inteiro entre 1 e 10.000.');

      await expect(handleCreateOrder(baseRequest({ ...validOrder, quantity: -2 }), mockDb))
        .rejects.toThrow('A quantidade deve ser um número inteiro entre 1 e 10.000.');

      await expect(handleCreateOrder(baseRequest({ ...validOrder, quantity: 1.5 as any }), mockDb))
        .rejects.toThrow('A quantidade deve ser um número inteiro entre 1 e 10.000.');

      await expect(handleCreateOrder(baseRequest({ ...validOrder, quantity: 10001 }), mockDb))
        .rejects.toThrow('A quantidade deve ser um número inteiro entre 1 e 10.000.');
    });

    it('rejeita modo unit sem unitPrice em pedido simples', async () => {
      const order = {
        ...validOrder,
        pricingMode: 'unit',
        unitPrice: null,
      };
      await expect(handleCreateOrder(baseRequest(order), mockDb))
        .rejects.toThrow('O modo de preço unitário exige o preço unitário do pedido.');
    });
  });

  describe('Validações de Itens Estruturados (items)', () => {
    it('rejeita array de itens vazio ou com mais de 10 itens', async () => {
      await expect(handleCreateOrder(baseRequest({ ...validOrder, items: [] }), mockDb))
        .rejects.toThrow('O pedido deve ter de 1 a 10 itens.');

      const elevenItems = Array.from({ length: 11 }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: 1,
        unitPrice: 10,
        price: 10,
      }));
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        quantity: 11,
        price: 110,
        items: elevenItems,
      }), mockDb)).rejects.toThrow('O pedido deve ter de 1 a 10 itens.');
    });

    it('rejeita item com preço unitário negativo, acima de 1.000.000 ou com frações de centavos', async () => {
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        items: [{ name: 'Item', quantity: 1, unitPrice: -5, price: -5 }],
      }), mockDb)).rejects.toThrow('Um ou mais itens do pedido são inválidos.');

      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        items: [{ name: 'Item', quantity: 1, unitPrice: 1000001, price: 1000001 }],
      }), mockDb)).rejects.toThrow('Um ou mais itens do pedido são inválidos.');

      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        items: [{ name: 'Item', quantity: 1, unitPrice: 10.555, price: 10.56 }],
      }), mockDb)).rejects.toThrow('O preço unitário deve usar centavos inteiros.');
    });

    it('rejeita item com quantidade zero ou fracionária', async () => {
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        items: [{ name: 'Item', quantity: 0, unitPrice: 50, price: 0 }],
      }), mockDb)).rejects.toThrow('Um ou mais itens do pedido são inválidos.');

      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        items: [{ name: 'Item', quantity: 1.5 as any, unitPrice: 50, price: 75 }],
      }), mockDb)).rejects.toThrow('Um ou mais itens do pedido são inválidos.');
    });

    it('rejeita item com subtotal inconsistente (quantity * unitPrice != price)', async () => {
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        quantity: 2,
        price: 80,
        items: [{ name: 'Item', quantity: 2, unitPrice: 50, price: 80 }], // 2 * 50 != 80
      }), mockDb)).rejects.toThrow('O preço unitário deve corresponder ao subtotal do item, arredondado para centavos.');
    });

    it('rejeita quando a soma das quantidades dos itens diverge do total do pedido', async () => {
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        quantity: 5, // Itens somam 3
        price: 150,
        items: [
          { name: 'Item 1', quantity: 2, unitPrice: 50, price: 100 },
          { name: 'Item 2', quantity: 1, unitPrice: 50, price: 50 },
        ],
      }), mockDb)).rejects.toThrow('A quantidade e o total do pedido devem corresponder à soma dos itens.');
    });

    it('rejeita quando a soma dos preços dos itens diverge do valor total do pedido', async () => {
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        quantity: 2,
        price: 300, // Itens somam 200
        items: [
          { name: 'Item 1', quantity: 1, unitPrice: 100, price: 100 },
          { name: 'Item 2', quantity: 1, unitPrice: 100, price: 100 },
        ],
      }), mockDb)).rejects.toThrow('A quantidade e o total do pedido devem corresponder à soma dos itens.');
    });
  });

  describe('Validações de Permuta (isExchange e exchangeItems)', () => {
    it('rejeita permuta com mais de 10 itens recebidos', async () => {
      const exchangeOrder = {
        ...validOrder,
        isExchange: true,
        exchangeItems: Array.from({ length: 11 }, (_, i) => ({
          name: `Item Permuta ${i + 1}`,
          quantity: 1,
          value: 10,
        })),
      };

      await expect(handleCreateOrder(baseRequest(exchangeOrder), mockDb))
        .rejects.toThrow('Itens recebidos na permuta são inválidos.');
    });

    it('rejeita item de permuta com quantidade zero ou valor negativo', async () => {
      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        isExchange: true,
        exchangeItems: [{ name: 'Item', quantity: 0, value: 50 }],
      }), mockDb)).rejects.toThrow('Itens recebidos na permuta são inválidos.');

      await expect(handleCreateOrder(baseRequest({
        ...validOrder,
        isExchange: true,
        exchangeItems: [{ name: 'Item', quantity: 1, value: -10 }],
      }), mockDb)).rejects.toThrow('Itens recebidos na permuta são inválidos.');
    });
  });
});
