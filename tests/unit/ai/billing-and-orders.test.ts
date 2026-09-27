import { describe, it, expect } from 'vitest';
const { AiToolsExecutor } = require('../../../functions/ai/tools');
const { getCallerScope } = require('../../../functions/ai/authorization');

describe('IA-03: Cobranças e Mensagens Baseadas em Pedidos Reais', () => {
  const mockOrders = [
    {
      orderId: 'ord-101',
      orderNumber: '#101',
      customerName: 'Juliana Paes',
      customerPhone: '11999998888',
      productSummary: 'Topo de Bolo 3D Luxo',
      totalPrice: 120.0,
      paidAmount: 50.0,
      remainingAmount: 70.0,
      status: 'in-progress',
      paymentStatus: 'partial',
      deliveryDate: '2026-09-30',
      userId: 'user-1',
      isDeleted: false,
    },
    {
      orderId: 'ord-102',
      orderNumber: '#102',
      customerName: 'Juliana Paes',
      customerPhone: '11999998888',
      productSummary: 'Caixas Cenário 10un',
      totalPrice: 200.0,
      paidAmount: 200.0,
      remainingAmount: 0.0,
      status: 'completed',
      paymentStatus: 'paid',
      deliveryDate: '2026-09-20',
      userId: 'user-1',
      isDeleted: false,
    },
  ];

  const mockRepos = {
    getScopedOrders: async () => mockOrders,
    getScopedCustomers: async () => ({
      customers: [{ name: 'Juliana Paes', phone: '11999998888' }],
      totalScoped: 1,
    }),
  };

  const executor = new AiToolsExecutor(mockRepos);
  const scope = getCallerScope('user-1', { role: 'admin', active: true });

  it('deve buscar o saldo real e montar cobrança com valores exatos para pedido com débito', async () => {
    const res = await executor.executeGenerateWhatsAppMessage(
      { orderNumber: '#101', recipientName: 'Juliana Paes', messageType: 'cobranca_saldo' },
      scope
    );

    expect(res.recipientPhone).toBe('5511999998888');
    expect(res.orderDetails).toBeDefined();
    expect(res.orderDetails.remainingAmount).toBe(70.0);
    expect(res.text).toContain('70,00');
    expect(res.text).toContain('120,00');
  });

  it('deve gerar mensagem de quitação/confirmação quando o pedido já estiver 100% pago', async () => {
    const res = await executor.executeGenerateWhatsAppMessage(
      { orderNumber: '#102', recipientName: 'Juliana Paes', messageType: 'cobranca_saldo' },
      scope
    );

    expect(res.orderDetails.remainingAmount).toBe(0);
    expect(res.orderDetails.paymentStatus).toBe('paid');
    expect(res.text).toContain('totalmente quitado');
  });

  it('deve extrair rascunho de pedido com normalização de telefone', async () => {
    const draft = await executor.executeExtractOrderDraft(
      {
        customerName: 'Juliana Paes',
        productSummary: 'Lembrancinhas Maternidade',
        quantity: 30,
        totalPrice: 240,
        paidAmount: 100,
        deliveryDate: '2026-10-15',
      },
      scope
    );

    expect(draft.customerName).toBe('Juliana Paes');
    expect(draft.customerPhone).toBe('5511999998888');
    expect(draft.quantity).toBe(30);
    expect(draft.totalPrice).toBe(240);
  });
});
