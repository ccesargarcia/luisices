/**
 * Repositórios de Acesso aos Dados do Ateliê com Blindagem de Escopo - Luisices
 */

const { filterOrdersByScope, filterCustomersByScope, filterGalleryByScope } = require('./authorization');
const { TOOL_LIMITS } = require('./config');
const { traceMcpStep } = require('../mcp/tracing');
const { resolvePaymentAmounts } = require('./financialMath');

function normalizeTimestamp(val) {
  if (!val) return '';
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'object' && val._seconds !== undefined) {
    return new Date(val._seconds * 1000).toISOString();
  }
  return String(val);
}

function sanitizeGalleryImagePath(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value);
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const match = url.pathname.match(/\/o\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    if (url.hostname === 'cdn.luisices.com.br' || url.hostname === 'cdn-dev.luisices.com.br') {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }
    return '';
  } catch {
    return value.split('?')[0].replace(/^\/+/, '');
  }
}

function orderOrdersByCreationDate(query) {
  return query && typeof query.orderBy === 'function'
    ? query.orderBy('createdAt', 'desc')
    : query;
}

function sanitizeOrderForAi(id, data = {}) {
  const pName = data.productName || data.productSummary || data.itemsSummary || data.description || 'Personalizado Luisices';

  // Extrai preço total do pedido considerando todas as variações de campos do schema (price, totalPrice, payment.totalAmount, etc.)
  const rawPrice = data.price !== undefined && data.price !== null
    ? data.price
    : (data.totalPrice !== undefined && data.totalPrice !== null
      ? data.totalPrice
      : (data.payment?.totalAmount !== undefined && data.payment?.totalAmount !== null
        ? data.payment.totalAmount
        : (data.totalAmount !== undefined && data.totalAmount !== null
          ? data.totalAmount
          : (data.value !== undefined && data.value !== null
            ? data.value
            : (data.amount !== undefined && data.amount !== null ? data.amount : 0)))));
  const parsedPrice = Number(rawPrice);
  const totalPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;

  // Extrai valor já pago considerando payment.paidAmount, paidAmount, signalAmount
  const rawPaid = data.payment?.paidAmount !== undefined && data.payment?.paidAmount !== null
    ? data.payment.paidAmount
    : (data.paidAmount !== undefined && data.paidAmount !== null
      ? data.paidAmount
      : (data.signalAmount !== undefined && data.signalAmount !== null
        ? data.signalAmount
        : 0));
  const parsedPaidAmount = Number(rawPaid);
  const storedPaidAmount = Number.isFinite(parsedPaidAmount) ? parsedPaidAmount : 0;

  // Normaliza status do pagamento
  const rawPaymentStatus = data.payment?.status || data.paymentStatus || (storedPaidAmount >= totalPrice && totalPrice > 0 ? 'paid' : (storedPaidAmount > 0 ? 'partial' : 'pending'));
  const paymentStatus = String(rawPaymentStatus).toLowerCase();
  const paymentAmounts = resolvePaymentAmounts({ totalPrice, paidAmount: storedPaidAmount, paymentStatus });
  const paidAmount = paymentAmounts.paidAmount;
  const remainingAmount = paymentAmounts.remainingAmount;

  // Normaliza status do pedido
  const rawStatus = String(data.status || 'pending').toLowerCase().trim();
  let normalizedStatus = 'pending';
  if (['completed', 'concluido', 'concluído', 'delivered', 'entregue', 'finalizado', 'pronto'].includes(rawStatus)) {
    normalizedStatus = 'completed';
  } else if (['in-progress', 'in_progress', 'em-andamento', 'em_andamento', 'producao', 'produção', 'em producao', 'em produção', 'recebido', 'received', 'in_contact'].includes(rawStatus)) {
    normalizedStatus = 'in-progress';
  } else if (['cancelled', 'canceled', 'cancelado', 'cancelada'].includes(rawStatus)) {
    normalizedStatus = 'cancelled';
  } else {
    normalizedStatus = 'pending';
  }

  return {
    orderId: id,
    orderNumber: data.orderNumber || (id ? `#${id.slice(-5)}` : 'S/N'),
    customerName: data.customerName || data.clientName || 'Cliente não informado',
    customerPhone: data.customerPhone || data.phone || '',
    productName: pName,
    productSummary: pName,
    quantity: Number(data.quantity) || 1,
    totalPrice,
    paidAmount,
    remainingAmount,
    status: normalizedStatus,
    rawStatus,
    paymentStatus,
    deliveryDate: normalizeTimestamp(data.deliveryDate || data.deadline).split('T')[0] || '',
    createdAt: normalizeTimestamp(data.createdAt || data.creationDate),
    theme: data.theme || '',
    notes: data.notes || '',
    userId: String(data.userId || ''),
    createdBy: String(data.createdBy || ''),
    createdByName: String(data.createdByName || ''),
    assignedTo: String(data.assignedTo || ''),
    assignedToName: String(data.assignedToName || ''),
    version: Number.isSafeInteger(data.version) && data.version > 0 ? data.version : 1,
    isDeleted: Boolean(data.deletedAt || data.isDeleted),
  };
}

/** Lê páginas completas até o fim ou falha claramente ao atingir o teto operacional. */
async function readAllPages(queryFactory, { pageSize = 250, maxDocs = 5000, allowPartial = false } = {}) {
  const docs = [];
  let cursor = null;
  while (true) {
    // Lê no máximo um registro além do teto para diferenciar conjunto completo
    // exatamente no limite de um resultado truncado (quando allowPartial é false).
    const requested = Math.min(pageSize, maxDocs - docs.length + (allowPartial ? 0 : 1));
    if (requested <= 0) return docs;
    let query = queryFactory().limit(requested);
    if (cursor) {
      if (typeof query.startAfter !== 'function') {
        throw new Error('A consulta não oferece paginação segura; resultado incompleto recusado.');
      }
      query = query.startAfter(cursor);
    }
    const page = await query.get();
    const pageDocs = page?.docs || [];
    if (!pageDocs.length) return docs;
    docs.push(...pageDocs);
    if (docs.length > maxDocs) {
      if (allowPartial) {
        return docs.slice(0, maxDocs);
      }
      throw new Error(`Consulta excedeu o limite operacional de ${maxDocs} registros; resultado parcial recusado.`);
    }
    if (pageDocs.length < requested) return docs;
    if (docs.length >= maxDocs) {
      if (allowPartial) return docs.slice(0, maxDocs);
      if (typeof query.startAfter !== 'function') {
        throw new Error('A consulta não oferece paginação segura; resultado incompleto recusado.');
      }
      const nextPage = await queryFactory().limit(1).startAfter(pageDocs[pageDocs.length - 1]).get();
      if ((nextPage?.docs || []).length) {
        throw new Error(`Consulta excedeu o limite operacional de ${maxDocs} registros; resultado parcial recusado.`);
      }
      return docs;
    }
    cursor = pageDocs[pageDocs.length - 1];
  }
}

// Cache volátil em memória para evitar leituras repetidas do Firestore em interações contínuas
const SCOPED_ORDERS_CACHE = new Map();
const SCOPED_ORDERS_TTL_MS = 20 * 1000; // 20 segundos

class AiDataRepositories {
  constructor(firestoreInstance, authInstance = null) {
    this.db = firestoreInstance;
    this.auth = authInstance;
  }

  /**
   * Busca pedidos autorizados no escopo do usuário com suporte a paginação e recuperação completa para agregações
   */
  async getScopedOrders(scope, options = {}) {
    if (!this.db) return [];

    const isPartialAllowed = options.allowPartial ?? (options.maxLimit ? true : false);
    const useCache = options.skipCache !== true;
    const cacheKey = `${scope?.isAdmin ? 'admin' : (scope?.uid || 'anon')}:${options.maxLimit || 'full'}:${isPartialAllowed ? 'partial' : 'complete'}`;
    const cached = SCOPED_ORDERS_CACHE.get(cacheKey);
    if (useCache && cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let rawDocs = [];
    const maxSafetyCeiling = options.maxLimit || 5000;
    const linkedQueryCeiling = Math.ceil(maxSafetyCeiling / 3);

    try {
      if (scope.isAdmin) {
        const docs = await traceMcpStep('firestore.orders_read', () => readAllPages(
          () => orderOrdersByCreationDate(this.db.collection('orders').where('deletedAt', '==', null)),
          { maxDocs: maxSafetyCeiling, allowPartial: isPartialAllowed },
        ), {
          'db.system': 'firestore',
          'mcp.query.partition': 'admin',
          'mcp.query.max_documents': maxSafetyCeiling,
        });
        rawDocs = docs.map((d) => sanitizeOrderForAi(d.id, d.data()));
      } else {
        const [userDocs, assignedDocs, createdDocs] = await Promise.all([
          traceMcpStep('firestore.orders_read', () => readAllPages(() => orderOrdersByCreationDate(this.db.collection('orders').where('userId', '==', scope.uid).where('deletedAt', '==', null)), { maxDocs: linkedQueryCeiling, allowPartial: isPartialAllowed }), { 'db.system': 'firestore', 'mcp.query.partition': 'owner', 'mcp.query.max_documents': linkedQueryCeiling }),
          traceMcpStep('firestore.orders_read', () => readAllPages(() => orderOrdersByCreationDate(this.db.collection('orders').where('assignedTo', '==', scope.uid).where('deletedAt', '==', null)), { maxDocs: linkedQueryCeiling, allowPartial: isPartialAllowed }), { 'db.system': 'firestore', 'mcp.query.partition': 'assignee', 'mcp.query.max_documents': linkedQueryCeiling }),
          traceMcpStep('firestore.orders_read', () => readAllPages(() => orderOrdersByCreationDate(this.db.collection('orders').where('createdBy', '==', scope.uid).where('deletedAt', '==', null)), { maxDocs: linkedQueryCeiling, allowPartial: isPartialAllowed }), { 'db.system': 'firestore', 'mcp.query.partition': 'creator', 'mcp.query.max_documents': linkedQueryCeiling }),
        ]);

        const map = new Map();
        [...userDocs, ...assignedDocs, ...createdDocs].forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, sanitizeOrderForAi(d.id, d.data()));
          }
        });

        rawDocs = Array.from(map.values());
      }
    } catch (err) {
      console.warn('[getScopedOrders] Erro ao consultar orders:', err.message);
      throw new Error(`Falha ao acessar o banco de pedidos: ${err.message}`);
    }

    const filtered = filterOrdersByScope(rawDocs, scope);
    // Ordena do mais recente para o mais antigo tratando timestamps
    filtered.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });

    if (useCache) {
      SCOPED_ORDERS_CACHE.set(cacheKey, {
        data: filtered,
        expiresAt: Date.now() + SCOPED_ORDERS_TTL_MS,
      });
    }

    return filtered;
  }

  /** Busca um pedido por ID ou número e valida a posse antes de devolvê-lo. */
  async getScopedOrderDocument(scope, identifier) {
    if (!this.db || typeof identifier !== 'string' || !identifier.trim()) return null;
    const value = identifier.trim();
    const orderNumber = value.replace(/^#\s*/, '').trim();
    const orderNumberCandidates = [...new Set([value, orderNumber, `#${orderNumber}`].filter(Boolean))];
    const candidates = [];
    if (!value.includes('/')) {
      const direct = await this.db.collection('orders').doc(value).get();
      if (direct.exists) candidates.push(direct);
    }
    if (!candidates.length) {
      // O ChatGPT pode omitir o # do número apresentado ao usuário. Busque as
      // formas com e sem prefixo, mantendo a autorização e a checagem de
      // ambiguidade abaixo como fonte final da decisão.
      for (const candidate of orderNumberCandidates) {
        const matches = await this.db.collection('orders').where('orderNumber', '==', candidate).limit(50).get();
        candidates.push(...(matches.docs || []));
      }
    }
    const uniqueCandidates = [...new Map(candidates.map((doc) => [doc.id, doc])).values()];
    const scoped = uniqueCandidates.filter((doc) => {
      const data = doc.data() || {};
      return filterOrdersByScope([{ ...data, id: doc.id }], scope).length > 0;
    });
    if (scoped.length !== 1) return null;
    const doc = scoped[0];
    return { id: doc.id, ref: doc.ref, data: doc.data() || {} };
  }

  /** Busca e normaliza um único pedido para ferramentas que já receberam seu identificador. */
  async getScopedOrderSummary(scope, identifier) {
    const order = await this.getScopedOrderDocument(scope, identifier);
    if (!order) return null;
    const sanitized = sanitizeOrderForAi(order.id, order.data);
    return sanitized.isDeleted ? null : sanitized;
  }

  /**
   * Busca clientes autorizados no escopo do usuário com paginação e suporte a agregações completas
   */
  async getScopedCustomers(scope, options = {}) {
    if (!this.db) return { customers: [], totalScoped: 0, totalFiltered: 0, isFiltered: false, hasMore: false, isPartial: false };

    let rawList = [];
    const maxSafetyCeiling = options.maxLimit || 5000;
    const linkedQueryCeiling = Math.ceil(maxSafetyCeiling / 3);

    try {
      if (scope.isAdmin) {
        const docs = await readAllPages(() => this.db.collection('customers'), { maxDocs: maxSafetyCeiling });
        for (const d of docs) {
            const data = d.data() || {};
            rawList.push({
              id: d.id,
              name: data.name || data.fullName || 'Cliente',
              phone: data.phone || data.whatsapp || '',
              email: data.email || '',
              city: data.city || '',
              state: data.state || '',
              status: data.status || 'active',
              totalOrders: Number(data.totalOrders) || 0,
              totalSpent: Number(data.totalSpent) || 0,
              userId: String(data.userId || ''),
              createdBy: String(data.createdBy || ''),
              assignedTo: String(data.assignedTo || ''),
              deletedAt: data.deletedAt || null,
            });
        }
      } else {
        const [userDocs, createdDocs, assignedDocs] = await Promise.all([
          readAllPages(() => this.db.collection('customers').where('userId', '==', scope.uid), { maxDocs: linkedQueryCeiling }),
          readAllPages(() => this.db.collection('customers').where('createdBy', '==', scope.uid), { maxDocs: linkedQueryCeiling }),
          readAllPages(() => this.db.collection('customers').where('assignedTo', '==', scope.uid), { maxDocs: linkedQueryCeiling }),
        ]);

        const map = new Map();
        [...userDocs, ...createdDocs, ...assignedDocs].forEach((d) => {
          if (!map.has(d.id)) {
            const data = d.data() || {};
            map.set(d.id, {
              id: d.id,
              name: data.name || data.fullName || 'Cliente',
              phone: data.phone || data.whatsapp || '',
              email: data.email || '',
              city: data.city || '',
              state: data.state || '',
              status: data.status || 'active',
              totalOrders: Number(data.totalOrders) || 0,
              totalSpent: Number(data.totalSpent) || 0,
              userId: String(data.userId || ''),
              createdBy: String(data.createdBy || ''),
              assignedTo: String(data.assignedTo || ''),
              deletedAt: data.deletedAt || null,
            });
          }
        });
        rawList = Array.from(map.values());
      }
    } catch (err) {
      console.warn('[getScopedCustomers] Erro ao consultar customers:', err.message);
      throw new Error(`Falha ao acessar o banco de clientes: ${err.message}`);
    }

    const scoped = filterCustomersByScope(rawList, scope);
    const totalScoped = scoped.length;

    let filtered = scoped;
    const searchTerm = (options.searchTerm || '').trim().toLowerCase();
    const isFiltered = Boolean(searchTerm);

    if (isFiltered) {
      const cleanPhoneSearch = searchTerm.replace(/\D/g, '');
      filtered = scoped.filter((c) => {
        const nameMatch = c.name && c.name.toLowerCase().includes(searchTerm);
        const cityMatch = c.city && c.city.toLowerCase().includes(searchTerm);
        const emailMatch = c.email && c.email.toLowerCase().includes(searchTerm);
        const phoneMatch = cleanPhoneSearch && c.phone && c.phone.replace(/\D/g, '').includes(cleanPhoneSearch);
        return nameMatch || cityMatch || emailMatch || phoneMatch;
      });
    }

    const limit = Math.min(Math.max(Number(options.limit) || TOOL_LIMITS.CUSTOMERS_PAGE_LIMIT, 1), 50);
    const returned = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;

    return {
      customers: returned,
      totalScoped,
      totalFiltered: filtered.length,
      isFiltered,
      hasMore,
      isPartial: rawList.length >= maxSafetyCeiling,
    };
  }

  /** Busca um cliente por ID e valida o escopo de acesso antes de devolvê-lo. */
  async getScopedCustomerDocument(scope, customerId) {
    if (!this.db || typeof customerId !== 'string' || !customerId.trim() || customerId.includes('/')) return null;
    const snap = await this.db.collection('customers').doc(customerId.trim()).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (!filterCustomersByScope([{ ...data, id: snap.id }], scope).length) return null;
    return { id: snap.id, ref: snap.ref, data };
  }

  /**
   * Busca insumos cadastrados na coleção real 'supplies' com blindagem de escopo (R05)
   */
  async getSupplies(scope) {
    if (!this.db) return [];
    try {
      // Coleção oficial: 'supplies'
      let snap;
      if (scope.isAdmin || scope.canViewPricing) {
        snap = await this.db.collection('supplies').limit(100).get();
      } else {
        snap = await this.db.collection('supplies').where('userId', '==', scope.uid).limit(50).get();
      }

      return snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.name || 'Insumo',
          category: data.category || '',
          unit: data.unit || 'un',
          unitCost: data.unitCost !== undefined ? Number(data.unitCost) : 0,
          currentStock: data.currentStock !== undefined ? Number(data.currentStock) : 0,
          active: data.active !== false,
          userId: String(data.userId || ''),
        };
      }).filter((s) => s.active && (scope.isAdmin || scope.canViewPricing || s.userId === scope.uid));
    } catch (err) {
      console.warn('[getSupplies] Erro ao consultar supplies:', err.message);
      throw new Error(`Falha ao consultar insumos: ${err.message}`);
    }
  }

  /**
   * Busca produtos da lojinha
   */
  async getStoreProducts() {
    if (!this.db) return [];
    try {
      const snap = await this.db.collection('storeProducts').where('active', '!=', false).limit(50).get();
      return snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.name || 'Produto',
          category: data.category || '',
          price: data.price !== undefined ? Number(data.price) : 0,
          materials: Array.isArray(data.materials) ? data.materials : [],
        };
      });
    } catch (err) {
      console.warn('[getStoreProducts] Erro ao consultar storeProducts:', err.message);
      throw new Error(`Falha ao consultar produtos: ${err.message}`);
    }
  }

  /**
   * Busca itens da galeria com filtro de escopo
   */
  async getGalleryItems(scope, options = {}) {
    if (!this.db) return [];
    try {
      let raw = [];
      if (scope.isAdmin) {
        const docs = options.fetchAll
          ? await readAllPages(() => this.db.collection('gallery'), { maxDocs: options.maxLimit || 5000 })
          : (await this.db.collection('gallery').limit(options.sampleLimit || 100).get()).docs;
        raw = docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: data.title || data.theme || 'Projeto',
            category: data.category || '',
            papers: Array.isArray(data.papers) ? data.papers : [],
            tags: Array.isArray(data.tags) ? data.tags.map((t) => typeof t === 'string' ? t : t?.name).filter((tag) => typeof tag === 'string') : [],
            imageUrl: sanitizeGalleryImagePath(data.imagePath || data.imageUrl),
            userId: String(data.userId || ''),
            createdBy: String(data.createdBy || ''),
            ownerUid: String(data.ownerUid || ''),
            deletedAt: data.deletedAt || null,
          };
        });
      } else {
        const [userDocs, createdDocs, ownerDocs] = await Promise.all([
          options.fetchAll
            ? readAllPages(() => this.db.collection('gallery').where('userId', '==', scope.uid), { maxDocs: Math.ceil((options.maxLimit || 5000) / 3) })
            : this.db.collection('gallery').where('userId', '==', scope.uid).limit(options.sampleLimit || 50).get().then((s) => s.docs),
          options.fetchAll
            ? readAllPages(() => this.db.collection('gallery').where('createdBy', '==', scope.uid), { maxDocs: Math.ceil((options.maxLimit || 5000) / 3) })
            : this.db.collection('gallery').where('createdBy', '==', scope.uid).limit(options.sampleLimit || 50).get().then((s) => s.docs),
          options.fetchAll
            ? readAllPages(() => this.db.collection('gallery').where('ownerUid', '==', scope.uid), { maxDocs: Math.ceil((options.maxLimit || 5000) / 3) })
            : this.db.collection('gallery').where('ownerUid', '==', scope.uid).limit(options.sampleLimit || 50).get().then((s) => s.docs),
        ]);

        const map = new Map();
        [...userDocs, ...createdDocs, ...ownerDocs].forEach((d) => {
          if (!map.has(d.id)) {
            const data = d.data() || {};
            map.set(d.id, {
              id: d.id,
              title: data.title || data.theme || 'Projeto',
              category: data.category || '',
              papers: Array.isArray(data.papers) ? data.papers : [],
              tags: Array.isArray(data.tags) ? data.tags.map((t) => typeof t === 'string' ? t : t?.name).filter((tag) => typeof tag === 'string') : [],
              imageUrl: sanitizeGalleryImagePath(data.imagePath || data.imageUrl),
              userId: String(data.userId || ''),
              createdBy: String(data.createdBy || ''),
              ownerUid: String(data.ownerUid || ''),
              deletedAt: data.deletedAt || null,
            });
          }
        });
        raw = Array.from(map.values());
      }

      const scoped = filterGalleryByScope(raw, scope);
      const term = (options.searchTerm || '').trim().toLowerCase();
      const matches = !term ? scoped : scoped.filter((item) => {
        return (item.title && item.title.toLowerCase().includes(term)) ||
          (item.category && item.category.toLowerCase().includes(term)) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(term)));
      });
      const limit = Math.min(Math.max(Number(options.limit) || TOOL_LIMITS.GALLERY_PAGE_LIMIT, 1), 50);
      if (!options.returnPage) return matches.slice(0, limit);
      return { items: matches.slice(0, limit), totalFound: matches.length, hasMore: matches.length > limit };
    } catch (err) {
      console.warn('[getGalleryItems] Erro ao consultar gallery:', err.message);
      throw new Error(`Falha ao consultar a galeria: ${err.message}`);
    }
  }

  /**
   * Obtém membros da equipe conhecidos
   */
  async getTeamMembers() {
    if (!this.db) return [];
    const membersMap = new Map();
    try {
      const snap = await this.db.collection('userProfiles').get();
      snap.docs.forEach((d) => {
        const data = d.data() || {};
        membersMap.set(d.id, {
          uid: d.id,
          name: data.displayName || data.name || (data.email ? data.email.split('@')[0] : 'Colaborador'),
          email: data.email || '',
          role: data.role || 'user',
          active: data.active !== false,
        });
      });
    } catch (err) {
      console.warn('[getTeamMembers] Erro ao ler userProfiles:', err.message);
    }
    return Array.from(membersMap.values());
  }

  /**
   * Carrega configurações do ateliê
   */
  async getPricingSettings(scope) {
    if (!this.db) return null;
    try {
      const doc = await this.db.doc(`pricingSettings/${scope.uid}`).get();
      if (doc.exists) return doc.data();
    } catch (err) {
      console.warn('[getPricingSettings] Erro ao ler pricingSettings:', err.message);
    }
    return null;
  }

  /**
   * Carrega contexto resumido autorizado do catálogo (R05)
   */
  async getCatalogKnowledge(scope) {
    try {
      // A galeria tem ferramenta de busca sob demanda. Carregar uma amostra em
      // toda conversa acrescentava até três consultas sem melhorar perguntas
      // que não tratam do acervo.
      const [products, supplies] = await Promise.all([
        this.getStoreProducts(),
        this.getSupplies(scope),
      ]);

      const lines = [];
      if (products.length > 0) {
        lines.push('AMOSTRA LIMITADA DE PRODUTOS ATIVOS (não é uma busca completa):');
        products.slice(0, 20).forEach((p) => {
          const price = p.price ? ` | R$ ${p.price.toFixed(2)}` : '';
          const cat = p.category ? ` [${p.category}]` : '';
          lines.push(`• ${p.name}${cat}${price}`);
        });
      }

      if (supplies.length > 0) {
        lines.push('AMOSTRA LIMITADA DE INSUMOS & CUSTOS (não é uma lista completa):');
        supplies.slice(0, 15).forEach((s) => {
          lines.push(`• ${s.name}${s.category ? ` [${s.category}]` : ''} | R$ ${s.unitCost.toFixed(2)}/${s.unit}`);
        });
      }

      return lines.length > 0 ? `\n\n--- DADOS DE CATÁLOGO & INSUMOS AUTORIZADOS ---\n${lines.join('\n')}\n--- FIM DOS DADOS ---` : '';
    } catch (err) {
      console.warn('[getCatalogKnowledge] Erro ao compilar resumo:', err.message);
      return '\n\n[AVISO DE DADOS] Não foi possível consultar todo o contexto de catálogo/insumos/galeria. Não afirme que uma busca foi completa nem que um item inexiste; peça nova tentativa ou confirmação manual.\n';
    }
  }

  /**
   * Busca receitas/modelos de precificação salvos
   */
  async getPricingRecipes(scope, options = {}) {
    if (!this.db) return [];
    try {
      let snap;
      if (scope.isAdmin || scope.canViewPricing) {
        snap = await this.db.collection('pricingRecipes').limit(options.limit || 50).get();
      } else {
        snap = await this.db.collection('pricingRecipes').where('userId', '==', scope.uid).limit(options.limit || 50).get();
      }
      return snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          productName: data.productName || 'Modelo Salvo',
          category: data.category || 'papelaria_festa',
          pricingMethod: data.pricingMethod || 'markup_on_cost',
          profitMarginPercent: data.profitMarginPercent !== undefined ? Number(data.profitMarginPercent) : 100,
          suggestedUnitPrice: data.suggestedUnitPrice !== undefined ? Number(data.suggestedUnitPrice) : 0,
          items: Array.isArray(data.items) ? data.items : [],
          createdAt: normalizeTimestamp(data.createdAt),
          userId: String(data.userId || ''),
        };
      }).filter((r) => scope.isAdmin || scope.canViewPricing || r.userId === scope.uid);
    } catch (err) {
      console.warn('[getPricingRecipes] Erro ao consultar modelos:', err.message);
      return [];
    }
  }

  /**
   * Obtém os detalhes de um modelo/receita de precificação por ID
   */
  async getPricingRecipeById(scope, modelId) {
    if (!this.db || !modelId) return null;
    try {
      const docSnap = await this.db.collection('pricingRecipes').doc(modelId).get();
      if (!docSnap.exists) return null;
      const data = docSnap.data() || {};
      if (!scope.isAdmin && !scope.canViewPricing && data.userId !== scope.uid) {
        return null;
      }
      return {
        id: docSnap.id,
        productName: data.productName || 'Modelo Salvo',
        category: data.category || 'papelaria_festa',
        pricingMethod: data.pricingMethod || 'markup_on_cost',
        profitMarginPercent: data.profitMarginPercent !== undefined ? Number(data.profitMarginPercent) : 100,
        suggestedUnitPrice: data.suggestedUnitPrice !== undefined ? Number(data.suggestedUnitPrice) : 0,
        items: Array.isArray(data.items) ? data.items : [],
        createdAt: normalizeTimestamp(data.createdAt),
        userId: String(data.userId || ''),
      };
    } catch (err) {
      console.warn('[getPricingRecipeById] Erro ao buscar modelo:', err.message);
      return null;
    }
  }

  /**
   * Salva ou atualiza um modelo de precificação
   */
  async savePricingRecipe(scope, data) {
    if (!this.db) throw new Error('Banco de dados não disponível.');
    if (!scope?.uid) {
      const error = new Error('Usuário não autenticado.');
      error.code = 'unauthenticated';
      throw error;
    }
    const recipeData = {
      productName: String(data.productName || 'Composição').trim(),
      category: String(data.category || 'papelaria_festa').trim(),
      pricingMethod: data.pricingMethod === 'margin_on_sale' ? 'margin_on_sale' : 'markup_on_cost',
      profitMarginPercent: Number(data.profitMarginPercent) || 100,
      suggestedUnitPrice: Number(data.suggestedUnitPrice) || 0,
      items: Array.isArray(data.items) ? data.items : [],
      updatedAt: new Date(),
      userId: scope.uid || 'system',
    };

    if (data.modelId) {
      if (typeof data.modelId !== 'string' || data.modelId.includes('/') || !data.modelId.trim()) {
        const error = new Error('Identificador do modelo inválido.');
        error.code = 'invalid-argument';
        throw error;
      }
      const docRef = this.db.collection('pricingRecipes').doc(data.modelId);
      const existing = await docRef.get();
      if (!existing.exists) {
        const error = new Error('Modelo de precificação não encontrado.');
        error.code = 'not-found';
        throw error;
      }
      const existingData = existing.data() || {};
      if (!scope.isAdmin && existingData.userId !== scope.uid) {
        const error = new Error('Permissão negada para editar este modelo de precificação.');
        error.code = 'permission-denied';
        throw error;
      }
      // Edições administrativas preservam o proprietário original do modelo.
      recipeData.userId = String(existingData.userId || scope.uid);
      await docRef.set(recipeData, { merge: true });
      return { id: data.modelId, ...recipeData };
    } else {
      recipeData.createdAt = new Date();
      const docRef = await this.db.collection('pricingRecipes').add(recipeData);
      return { id: docRef.id, ...recipeData };
    }
  }

  /**
   * Busca orçamentos
   */
  async getQuotes(scope, options = {}) {
    if (!this.db) return [];
    try {
      let snap;
      if (scope.isAdmin) {
        snap = await this.db.collection('quotes').limit(options.limit || 50).get();
      } else {
        snap = await this.db.collection('quotes').where('userId', '==', scope.uid).limit(options.limit || 50).get();
      }
      return snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          quoteNumber: data.quoteNumber || `#ORC-${d.id.slice(-4)}`,
          customerName: data.customerName || 'Cliente',
          customerPhone: data.customerPhone || '',
          productName: data.items?.[0]?.name || data.productName || 'Encomenda',
          items: Array.isArray(data.items) ? data.items : [],
          totalPrice: Number(data.totalPrice) || 0,
          depositPercentage: Number(data.depositPercentage) || 50,
          paymentMethod: data.paymentCondition || data.paymentMethod || 'pix',
          status: data.status || 'pending',
          validUntil: normalizeTimestamp(data.validUntil).split('T')[0] || '',
          createdAt: normalizeTimestamp(data.createdAt),
          userId: String(data.userId || ''),
        };
      }).filter((q) => scope.isAdmin || q.userId === scope.uid);
    } catch (err) {
      console.warn('[getQuotes] Erro ao consultar orçamentos:', err.message);
      return [];
    }
  }

  /**
   * Cria um novo orçamento
   */
  async createQuote(scope, data) {
    if (!this.db) throw new Error('Banco de dados não disponível.');
    const now = new Date();
    const counterRef = this.db.collection('users').doc(scope.uid || 'system').collection('metadata').doc('quoteCounters');
    let quoteNum = 'ORC-0001';
    try {
      const snap = await counterRef.get();
      const curr = snap.exists ? (snap.data().quoteCount || 0) : 0;
      const next = curr + 1;
      await counterRef.set({ quoteCount: next }, { merge: true });
      quoteNum = `ORC-${String(next).padStart(4, '0')}`;
    } catch {
      quoteNum = `ORC-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const quoteData = {
      quoteNumber: quoteNum,
      customerName: String(data.customerName || 'Cliente').trim(),
      customerPhone: String(data.customerPhone || '').trim(),
      productName: String(data.productName || 'Encomenda').trim(),
      items: [{
        name: String(data.productName || 'Encomenda').trim(),
        quantity: Number(data.quantity) || 1,
        unitPrice: (Number(data.totalPrice) || 0) / (Number(data.quantity) || 1),
      }],
      totalPrice: Number(data.totalPrice) || 0,
      depositPercentage: Number(data.depositPercentage) || 50,
      paymentMethod: data.paymentMethod || 'pix',
      status: 'pending',
      validUntil: data.validUntil || '',
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
      userId: scope.uid || 'system',
    };

    const docRef = await this.db.collection('quotes').add(quoteData);
    return { id: docRef.id, ...quoteData, createdAt: now.toISOString() };
  }

  /**
   * Atualiza status do orçamento
   */
  async updateQuoteStatus(scope, quoteIdentifier, newStatus) {
    if (!this.db) throw new Error('Banco de dados não disponível.');
    let docRef = null;
    let docSnap = null;

    if (quoteIdentifier.startsWith('#ORC-') || quoteIdentifier.startsWith('ORC-')) {
      const num = quoteIdentifier.replace(/^#/, '');
      const snap = await this.db.collection('quotes').where('quoteNumber', '==', num).limit(1).get();
      if (!snap.empty) {
        docSnap = snap.docs[0];
        docRef = docSnap.ref;
      }
    }

    if (!docRef) {
      docRef = this.db.collection('quotes').doc(quoteIdentifier);
      docSnap = await docRef.get();
    }

    if (!docSnap || !docSnap.exists) {
      const err = new Error('Orçamento não encontrado.');
      err.code = 'not-found';
      throw err;
    }

    const data = docSnap.data();
    if (!scope.isAdmin && data.userId !== scope.uid) {
      const err = new Error('Permissão negada para alterar este orçamento.');
      err.code = 'permission-denied';
      throw err;
    }

    await docRef.update({
      status: newStatus,
      updatedAt: new Date(),
    });

    return { id: docSnap.id, quoteNumber: data.quoteNumber || `#ORC-${docSnap.id.slice(-4)}`, status: newStatus, previousStatus: data.status };
  }
}

module.exports = {
  AiDataRepositories,
  sanitizeOrderForAi,
  normalizeTimestamp,
};
