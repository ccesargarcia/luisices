/**
 * Módulo de Dynamic Entities da Alexa (Sincronização Dinâmica do Catálogo).
 * Injeta dinamicamente produtos e sinônimos no modelo de fala da Alexa em tempo de execução.
 */

const { COLLECTIONS } = require('./repository');

// Cache local de 60 segundos por usuário para evitar sobrecarga de leituras no Firestore
const DYNAMIC_ENTITIES_CACHE = new Map(); // key -> { timestamp, products }
const DYNAMIC_CACHE_TTL_MS = 60 * 1000;

/**
 * Gera sinônimos automáticos comuns para produtos de papelaria/artesanato.
 */
function generateAutomaticSynonyms(productName) {
  if (!productName || typeof productName !== 'string') return [];
  const clean = productName.trim();
  const synonyms = new Set();

  const lower = clean.toLowerCase();

  // Remove "Personalizado", "Personalizada", "de Luxo", "Simples"
  const stripped = clean
    .replace(/\b(personalizados?|personalizadas?|de luxo|luxo|simples|3d|completo|completa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped && stripped.toLowerCase() !== lower && stripped.length >= 3) {
    synonyms.add(stripped);
  }

  // Se começar com Caixa/Caixinha
  if (lower.startsWith('caixa ') || lower.startsWith('caixas ')) {
    synonyms.add(clean.replace(/^caixas?\s+/i, 'Caixinha '));
    synonyms.add(clean.replace(/^caixas?\s+/i, ''));
  } else if (lower.startsWith('caixinha ') || lower.startsWith('caixinhas ')) {
    synonyms.add(clean.replace(/^caixinhas?\s+/i, 'Caixa '));
    synonyms.add(clean.replace(/^caixinhas?\s+/i, ''));
  }

  // Se começar com Caderno / Caderninho
  if (lower.startsWith('caderno ') || lower.startsWith('cadernos ')) {
    synonyms.add(clean.replace(/^cadernos?\s+/i, 'Caderninho '));
  } else if (lower.startsWith('caderninho ') || lower.startsWith('caderninhos ')) {
    synonyms.add(clean.replace(/^caderninhos?\s+/i, 'Caderno '));
  }

  // Se começar com Bloco / Bloquinho
  if (lower.startsWith('bloco ') || lower.startsWith('blocos ')) {
    synonyms.add(clean.replace(/^blocos?\s+/i, 'Bloquinho '));
  } else if (lower.startsWith('bloquinho ') || lower.startsWith('bloquinhos ')) {
    synonyms.add(clean.replace(/^bloquinhos?\s+/i, 'Bloco '));
  }

  return Array.from(synonyms).filter((s) => s.length >= 3 && s.toLowerCase() !== lower);
}

/**
 * Busca produtos ativos no Firestore para popular os Dynamic Entities.
 */
async function fetchCatalogProductsForDynamicEntities(db, uid) {
  if (!db) return [];

  const cacheKey = `dyn_${uid || 'global'}`;
  const cached = DYNAMIC_ENTITIES_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < DYNAMIC_CACHE_TTL_MS) {
    return cached.products;
  }

  const productsList = [];

  try {
    // 1. Tenta buscar no catálogo storeProducts (Lojinha / Vitrine)
    if (typeof db.collection === 'function') {
      const storeCol = db.collection('storeProducts');
      let storeSnap = null;
      if (storeCol) {
        const query = typeof storeCol.limit === 'function' ? storeCol.limit(50) : storeCol;
        if (typeof query.get === 'function') {
          storeSnap = await query.get().catch(() => null);
        }
      }
      if (storeSnap && !storeSnap.empty) {
        storeSnap.forEach((doc) => {
          const data = typeof doc.data === 'function' ? doc.data() : (doc.data || {});
          if (data.status === 'hidden' || data.active === false) return;
          const name = data.name || '';
          if (name && name.trim().length >= 2) {
            productsList.push({
              id: doc.id,
              name: name.trim(),
              unitPrice: Number(data.price ?? data.unitPrice ?? 0),
              synonyms: generateAutomaticSynonyms(name),
            });
          }
        });
      }
    }

    // 2. Se houver usuário autenticado, inclui também os produtos personalizados de products
    if (uid && typeof db.collection === 'function') {
      const userCol = db.collection(COLLECTIONS.PRODUCTS || 'products');
      let userSnap = null;
      if (userCol && typeof userCol.where === 'function') {
        const queryWhere = userCol.where('userId', '==', uid);
        const query = typeof queryWhere.limit === 'function' ? queryWhere.limit(50) : queryWhere;
        if (typeof query.get === 'function') {
          userSnap = await query.get().catch(() => null);
        }
      }
      if (userSnap && !userSnap.empty) {
        userSnap.forEach((doc) => {
          const data = typeof doc.data === 'function' ? doc.data() : (doc.data || {});
          const name = data.name || '';
          if (name && name.trim().length >= 2) {
            // Evita duplicatas por nome idêntico
            const exists = productsList.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());
            if (!exists) {
              productsList.push({
                id: doc.id,
                name: name.trim(),
                unitPrice: Number(data.unitPrice ?? data.price ?? 0),
                synonyms: generateAutomaticSynonyms(name),
              });
            }
          }
        });
      }
    }

    DYNAMIC_ENTITIES_CACHE.set(cacheKey, {
      timestamp: Date.now(),
      products: productsList,
    });

    return productsList;
  } catch (err) {
    console.warn('[DynamicEntities] Erro ao carregar produtos para Dynamic Entities:', err?.message || err);
    return [];
  }
}

/**
 * Constrói a diretiva Dialog.UpdateDynamicEntities para o slot PRODUCT_TYPE.
 */
function buildDynamicEntitiesDirective(products) {
  if (!Array.isArray(products) || products.length === 0) return null;

  const slotValues = products.slice(0, 100).map((prod) => {
    const rawName = String(prod.name || '').trim();
    const synonyms = Array.isArray(prod.synonyms)
      ? prod.synonyms.map((s) => String(s).trim()).filter(Boolean)
      : [];

    return {
      id: String(prod.id || rawName).slice(0, 64),
      name: {
        value: rawName.slice(0, 100),
        synonyms: Array.from(new Set(synonyms)).slice(0, 50),
      },
    };
  });

  return {
    type: 'Dialog.UpdateDynamicEntities',
    updateBehavior: 'REPLACE',
    types: [
      {
        name: 'PRODUCT_TYPE',
        values: slotValues,
      },
    ],
  };
}

function clearDynamicEntitiesCache() {
  DYNAMIC_ENTITIES_CACHE.clear();
}

module.exports = {
  buildDynamicEntitiesDirective,
  fetchCatalogProductsForDynamicEntities,
  generateAutomaticSynonyms,
  clearDynamicEntitiesCache,
};
