/**
 * Repositórios de Acesso aos Dados do Ateliê com Blindagem de Escopo - Luisices
 */

const { filterOrdersByScope, filterCustomersByScope, filterGalleryByScope } = require('./authorization');
const { TOOL_LIMITS } = require('./config');

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

function sanitizeOrderForAi(id, data = {}) {
  const pName = data.productName || data.productSummary || data.itemsSummary || data.description || 'Personalizado Luisices';
  return {
    orderId: id,
    orderNumber: data.orderNumber || (id ? `#${id.slice(-5)}` : 'S/N'),
    customerName: data.customerName || data.clientName || 'Cliente não informado',
    customerPhone: data.customerPhone || data.phone || '',
    productName: pName,
    productSummary: pName,
    quantity: Number(data.quantity) || 1,
    totalPrice: Number(data.totalPrice || data.totalAmount || data.value || 0),
    paidAmount: Number(data.paidAmount || data.signalAmount || 0),
    remainingAmount: Number(data.remainingAmount !== undefined ? data.remainingAmount : (data.totalPrice || 0) - (data.paidAmount || 0)),
    status: data.status || 'pending',
    paymentStatus: data.paymentStatus || 'pending',
    deliveryDate: normalizeTimestamp(data.deliveryDate || data.deadline).split('T')[0] || '',
    createdAt: normalizeTimestamp(data.createdAt || data.creationDate),
    theme: data.theme || '',
    notes: data.notes || '',
    userId: String(data.userId || ''),
    createdBy: String(data.createdBy || ''),
    assignedTo: String(data.assignedTo || ''),
    isDeleted: Boolean(data.deletedAt || data.isDeleted),
  };
}

/** Lê páginas completas até o fim ou falha claramente ao atingir o teto operacional. */
async function readAllPages(queryFactory, { pageSize = 250, maxDocs = 5000 } = {}) {
  const docs = [];
  let cursor = null;
  while (true) {
    // Lê no máximo um registro além do teto para diferenciar conjunto completo
    // exatamente no limite de um resultado truncado.
    const requested = Math.min(pageSize, maxDocs - docs.length + 1);
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
      throw new Error(`Consulta excedeu o limite operacional de ${maxDocs} registros; resultado parcial recusado.`);
    }
    if (pageDocs.length < requested) return docs;
    cursor = pageDocs[pageDocs.length - 1];
  }
}

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

    let rawDocs = [];
    const maxSafetyCeiling = options.maxLimit || 5000;
    const linkedQueryCeiling = Math.ceil(maxSafetyCeiling / 3);

    try {
      if (scope.isAdmin) {
        const docs = await readAllPages(
          () => this.db.collection('orders').where('deletedAt', '==', null),
          { maxDocs: maxSafetyCeiling },
        );
        rawDocs = docs.map((d) => sanitizeOrderForAi(d.id, d.data()));
      } else {
        const [userDocs, assignedDocs, createdDocs] = await Promise.all([
          readAllPages(() => this.db.collection('orders').where('userId', '==', scope.uid).where('deletedAt', '==', null), { maxDocs: linkedQueryCeiling }),
          readAllPages(() => this.db.collection('orders').where('assignedTo', '==', scope.uid).where('deletedAt', '==', null), { maxDocs: linkedQueryCeiling }),
          readAllPages(() => this.db.collection('orders').where('createdBy', '==', scope.uid).where('deletedAt', '==', null), { maxDocs: linkedQueryCeiling }),
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
    return filtered;
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
            tags: Array.isArray(data.tags) ? data.tags.map((t) => typeof t === 'string' ? t : t.name) : [],
            imageUrl: data.imageUrl || '',
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
              tags: Array.isArray(data.tags) ? data.tags.map((t) => typeof t === 'string' ? t : t.name) : [],
              imageUrl: data.imageUrl || '',
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
      const [products, supplies, gallery] = await Promise.all([
        this.getStoreProducts(),
        this.getSupplies(scope),
        this.getGalleryItems(scope, { limit: 10 }),
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

      if (gallery.length > 0) {
        lines.push('AMOSTRA LIMITADA DE DESTAQUES DO ACERVO AUTORIZADO:');
        gallery.slice(0, 8).forEach((g) => {
          lines.push(`• ${g.title}${g.category ? ` [${g.category}]` : ''}`);
        });
      }

      return lines.length > 0 ? `\n\n--- DADOS DE CATÁLOGO & INSUMOS AUTORIZADOS ---\n${lines.join('\n')}\n--- FIM DOS DADOS ---` : '';
    } catch (err) {
      console.warn('[getCatalogKnowledge] Erro ao compilar resumo:', err.message);
      return '\n\n[AVISO DE DADOS] Não foi possível consultar todo o contexto de catálogo/insumos/galeria. Não afirme que uma busca foi completa nem que um item inexiste; peça nova tentativa ou confirmação manual.\n';
    }
  }
}

module.exports = {
  AiDataRepositories,
  sanitizeOrderForAi,
  normalizeTimestamp,
};
