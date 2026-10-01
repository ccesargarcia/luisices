/**
 * Ferramentas (Tools) do Servidor MCP para o Alexa+ Add-on do Luisices.
 * Define esquemas e executores de lógica de negócio sobre o Firestore.
 */

const admin = require('firebase-admin');

const COLLECTIONS = {
  ORDERS: 'orders',
  SALES_LEDGER: 'salesLedger',
  PRODUCTS: 'products',
  USER_PROFILES: 'userProfiles',
};

/**
 * Catálogo de definições de ferramentas (schemas) expostas pelo Servidor MCP
 */
const MCP_TOOLS = [
  {
    name: 'create_order',
    description: 'Cria um novo pedido de papelaria/lembrancinhas personalizadas no ateliê Luisices.',
    inputSchema: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Nome completo ou primeiro nome do cliente (ex: "Bruno", "Amanda Silva").',
        },
        product: {
          type: 'string',
          description: 'Descrição ou nome do produto solicitado (ex: "20 caixinhas milk tema safari", "topo de bolo").',
        },
        quantity: {
          type: 'integer',
          description: 'Quantidade total de itens (número inteiro maior que zero).',
          minimum: 1,
        },
        unitPrice: {
          type: 'number',
          description: 'Preço unitário por item em reais (opcional, ex: 5.50). Se omitido, busca no catálogo.',
        },
        totalPrice: {
          type: 'number',
          description: 'Valor total do pedido em reais (opcional, ex: 110.00).',
        },
        deliveryDate: {
          type: 'string',
          description: 'Data de entrega combinada no formato YYYY-MM-DD (ex: "2026-10-25").',
        },
        notes: {
          type: 'string',
          description: 'Observações de personalização, tema, cores ou detalhes adicionais (opcional).',
        },
      },
      required: ['customer', 'product', 'quantity', 'deliveryDate'],
    },
  },
  {
    name: 'check_product_price',
    description: 'Consulta o catálogo do ateliê Luisices para obter preço unitário, estoque e detalhes de um produto.',
    inputSchema: {
      type: 'object',
      properties: {
        productQuery: {
          type: 'string',
          description: 'Nome ou termo de busca do produto (ex: "caixinha milk", "sacolinha", "topo de bolo").',
        },
      },
      required: ['productQuery'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Consulta o status, itens e data de entrega de pedidos recentes por nome do cliente ou código.',
    inputSchema: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          description: 'Nome do cliente para busca de pedidos recentes.',
        },
        orderId: {
          type: 'string',
          description: 'ID ou código do pedido (opcional).',
        },
      },
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Retorna um resumo de faturamento, pedidos entregues e saldo do ateliê Luisices no período.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month', 'last_month'],
          description: 'Período desejado para o resumo (padrão: "this_month").',
        },
      },
    },
  },
];

/**
 * Executa a ferramenta `create_order`
 */
async function executeCreateOrder(args, { db, userUid = 'alexa-plus-user' } = {}) {
  const { customer, product, quantity, unitPrice, totalPrice, deliveryDate, notes } = args || {};

  if (!customer || typeof customer !== 'string' || !customer.trim()) {
    throw new Error('Nome do cliente é obrigatório.');
  }
  if (!product || typeof product !== 'string' || !product.trim()) {
    throw new Error('Nome ou descrição do produto é obrigatório.');
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error('Quantidade deve ser um número inteiro maior ou igual a 1.');
  }
  if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(deliveryDate).trim())) {
    throw new Error('Data de entrega é obrigatória no formato YYYY-MM-DD.');
  }

  const cleanCustomer = customer.trim();
  const cleanProduct = product.trim();
  const cleanDeliveryDate = deliveryDate.trim();

  // Calcula valores
  let calcUnitPrice = typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice : null;
  let calcTotalPrice = typeof totalPrice === 'number' && totalPrice > 0 ? totalPrice : null;

  // Se preço unitário não foi informado, tentar localizar no catálogo
  let catalogMatch = null;
  if (calcUnitPrice === null && calcTotalPrice === null && db) {
    try {
      const snap = await db.collection(COLLECTIONS.PRODUCTS).limit(50).get();
      if (!snap.empty) {
        const queryLower = cleanProduct.toLowerCase();
        for (const doc of snap.docs) {
          const p = doc.data() || {};
          const pName = (p.name || '').toLowerCase();
          if (pName && (queryLower.includes(pName) || pName.includes(queryLower))) {
            catalogMatch = { id: doc.id, name: p.name, unitPrice: p.unitPrice || p.price || 0 };
            calcUnitPrice = Number(catalogMatch.unitPrice);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('[AlexaPlusTools] Erro ao buscar produto no catálogo:', err.message);
    }
  }

  if (calcUnitPrice !== null && calcTotalPrice === null) {
    calcTotalPrice = Math.round(calcUnitPrice * qty * 100) / 100;
  } else if (calcTotalPrice !== null && calcUnitPrice === null) {
    calcUnitPrice = Math.round((calcTotalPrice / qty) * 100) / 100;
  } else if (calcUnitPrice === null && calcTotalPrice === null) {
    // Valor padrão zerado para cotação posterior se não informado
    calcUnitPrice = 0;
    calcTotalPrice = 0;
  }

  const nowIso = new Date().toISOString();
  const orderData = {
    customerName: cleanCustomer,
    description: `${qty}x ${cleanProduct}`,
    items: [
      {
        product: cleanProduct,
        quantity: qty,
        unitPrice: calcUnitPrice,
        totalPrice: calcTotalPrice,
      },
    ],
    quantity: qty,
    unitPrice: calcUnitPrice,
    totalPrice: calcTotalPrice,
    deliveryDate: cleanDeliveryDate,
    status: 'pending',
    source: 'alexa_plus_addon',
    notes: notes ? String(notes).trim() : '',
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: userUid,
  };

  let orderId = `ord_alexaplus_${Date.now()}`;
  if (db && typeof db.collection === 'function') {
    const docRef = await db.collection(COLLECTIONS.ORDERS).add({
      ...orderData,
      createdAtServer: admin.firestore ? admin.firestore.FieldValue.serverTimestamp() : nowIso,
    });
    orderId = docRef.id;

    // Registra entrada de auditoria/ledger se houver valor
    if (calcTotalPrice > 0) {
      try {
        await db.collection(COLLECTIONS.SALES_LEDGER).doc(orderId).set({
          orderId,
          customerName: cleanCustomer,
          amount: calcTotalPrice,
          source: 'alexa_plus_addon',
          timestamp: nowIso,
          status: 'pending_payment',
        });
      } catch (lErr) {
        console.warn('[AlexaPlusTools] Erro ao registrar ledger:', lErr.message);
      }
    }
  }

  const priceText = calcTotalPrice > 0 ? ` no valor total de R$ ${calcTotalPrice.toFixed(2).replace('.', ',')}` : '';
  const dateFormatted = cleanDeliveryDate.split('-').reverse().join('/');

  return {
    orderId,
    customer: cleanCustomer,
    product: cleanProduct,
    quantity: qty,
    unitPrice: calcUnitPrice,
    totalPrice: calcTotalPrice,
    deliveryDate: dateFormatted,
    status: 'pending',
    message: `Pedido #${orderId.slice(-6)} criado com sucesso para ${cleanCustomer}: ${qty}x ${cleanProduct}${priceText}, com entrega para ${dateFormatted}.`,
  };
}

/**
 * Executa a ferramenta `check_product_price`
 */
async function executeCheckProductPrice(args, { db } = {}) {
  const { productQuery } = args || {};
  if (!productQuery || typeof productQuery !== 'string' || !productQuery.trim()) {
    throw new Error('Termo de busca do produto é obrigatório.');
  }

  const q = productQuery.toLowerCase().trim();
  const matches = [];

  if (db && typeof db.collection === 'function') {
    try {
      const snap = await db.collection(COLLECTIONS.PRODUCTS).limit(50).get();
      if (!snap.empty) {
        for (const doc of snap.docs) {
          const data = doc.data() || {};
          const name = (data.name || '').toLowerCase();
          const category = (data.category || '').toLowerCase();
          if (name.includes(q) || category.includes(q) || q.includes(name)) {
            matches.push({
              id: doc.id,
              name: data.name,
              category: data.category || 'Geral',
              unitPrice: data.unitPrice || data.price || 0,
              description: data.description || '',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[AlexaPlusTools] Erro ao consultar produtos:', err.message);
    }
  }

  if (matches.length === 0) {
    return {
      found: false,
      query: productQuery,
      message: `Nenhum produto cadastrado com o termo "${productQuery}". Você pode criar o pedido informando o valor desejado diretamente.`,
    };
  }

  const listText = matches
    .map((m) => `• ${m.name}: R$ ${Number(m.unitPrice).toFixed(2).replace('.', ',')} por unidade`)
    .join('\n');

  return {
    found: true,
    count: matches.length,
    products: matches,
    message: `Encontrei ${matches.length} produto(s) no catálogo:\n${listText}`,
  };
}

/**
 * Executa a ferramenta `get_order_status`
 */
async function executeGetOrderStatus(args, { db } = {}) {
  const { customerName, orderId } = args || {};
  const orders = [];

  if (db && typeof db.collection === 'function') {
    try {
      let queryRef = db.collection(COLLECTIONS.ORDERS);
      if (orderId) {
        const docSnap = await queryRef.doc(orderId).get();
        if (docSnap.exists) {
          orders.push({ id: docSnap.id, ...docSnap.data() });
        }
      } else if (customerName && customerName.trim()) {
        const cName = customerName.toLowerCase().trim();
        const snap = await queryRef.orderBy('createdAt', 'desc').limit(20).get();
        if (!snap.empty) {
          for (const d of snap.docs) {
            const data = d.data() || {};
            const itemCustomer = (data.customerName || data.customer || '').toLowerCase();
            if (itemCustomer.includes(cName) || cName.includes(itemCustomer)) {
              orders.push({ id: d.id, ...data });
            }
          }
        }
      } else {
        const snap = await queryRef.orderBy('createdAt', 'desc').limit(5).get();
        if (!snap.empty) {
          orders.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      }
    } catch (err) {
      console.warn('[AlexaPlusTools] Erro ao consultar status de pedidos:', err.message);
    }
  }

  if (orders.length === 0) {
    return {
      found: false,
      message: `Nenhum pedido recente encontrado${customerName ? ` para o cliente "${customerName}"` : ''}.`,
    };
  }

  const statusMap = {
    pending: 'Pendente',
    in_production: 'Em Produção',
    completed: 'Pronto / Concluído',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };

  const listText = orders
    .map((o) => {
      const st = statusMap[o.status] || o.status || 'Em andamento';
      const tot = o.totalPrice ? ` (R$ ${Number(o.totalPrice).toFixed(2).replace('.', ',')})` : '';
      const delivery = o.deliveryDate ? ` - Entrega: ${o.deliveryDate}` : '';
      return `• Pedido #${o.id.slice(-6)} (${o.customerName || 'Cliente'}): ${o.description || 'Itens diversos'}${tot} - Status: ${st}${delivery}`;
    })
    .join('\n');

  return {
    found: true,
    count: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      customer: o.customerName || o.customer,
      description: o.description,
      status: o.status,
      deliveryDate: o.deliveryDate,
      totalPrice: o.totalPrice,
    })),
    message: `Encontrei ${orders.length} pedido(s):\n${listText}`,
  };
}

/**
 * Executa a ferramenta `get_financial_summary`
 */
async function executeGetFinancialSummary(args, { db } = {}) {
  const period = (args?.period || 'this_month').toLowerCase();
  let totalRevenue = 0;
  let orderCount = 0;

  if (db && typeof db.collection === 'function') {
    try {
      const snap = await db.collection(COLLECTIONS.ORDERS).limit(100).get();
      if (!snap.empty) {
        for (const doc of snap.docs) {
          const o = doc.data() || {};
          if (o.status !== 'cancelled' && o.totalPrice) {
            totalRevenue += Number(o.totalPrice) || 0;
            orderCount++;
          }
        }
      }
    } catch (err) {
      console.warn('[AlexaPlusTools] Erro ao calcular resumo financeiro:', err.message);
    }
  }

  const periodLabels = {
    today: 'hoje',
    this_week: 'nesta semana',
    this_month: 'neste mês',
    last_month: 'no mês passado',
  };

  const pLabel = periodLabels[period] || 'no período';
  const revFormatted = totalRevenue.toFixed(2).replace('.', ',');

  return {
    period,
    totalRevenue,
    orderCount,
    message: `Resumo financeiro do Luisices ${pLabel}: Total faturado de R$ ${revFormatted} em ${orderCount} pedido(s) ativos.`,
  };
}

/**
 * Roteador de execução de ferramentas MCP
 */
async function handleToolCall(name, args, context = {}) {
  switch (name) {
    case 'create_order':
      return await executeCreateOrder(args, context);
    case 'check_product_price':
      return await executeCheckProductPrice(args, context);
    case 'get_order_status':
      return await executeGetOrderStatus(args, context);
    case 'get_financial_summary':
      return await executeGetFinancialSummary(args, context);
    default:
      throw new Error(`Ferramenta desconhecida: "${name}".`);
  }
}

module.exports = {
  COLLECTIONS,
  MCP_TOOLS,
  handleToolCall,
  executeCreateOrder,
  executeCheckProductPrice,
  executeGetOrderStatus,
  executeGetFinancialSummary,
};
