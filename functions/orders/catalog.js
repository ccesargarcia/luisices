/** Callable pública de leitura do catálogo da loja. */

const { getFirestore } = require('firebase-admin/firestore');
const { onCall } = require('../common/sentryFunctions');

let publicCatalogCache = { expiresAt: 0, products: null };

/** Retorna somente os campos necessários para montar a vitrine pública. */
const getPublicCatalogProducts = onCall({ cors: true, maxInstances: 10 }, async () => {
  const db = getFirestore();
  const settings = await db.doc('storeSettings/public').get();
  if (!settings.exists || settings.data()?.storePublished === false) return { products: [] };
  if (process.env.FUNCTIONS_EMULATOR !== 'true' && publicCatalogCache.products && publicCatalogCache.expiresAt > Date.now()) {
    return { products: publicCatalogCache.products };
  }
  const snapshot = await db.collection('storeProducts')
    .select('name', 'price', 'unitPrice', 'category', 'description', 'imageUrl', 'photoUrl', 'images', 'leadTimeDays', 'badge', 'isCustomizable', 'active', 'status', 'order', 'createdAt')
    .get();

  const products = snapshot.docs.flatMap((doc) => {
    const data = doc.data() || {};
    const status = data.status || (data.active === false ? 'hidden' : 'active');
    const rawPrice = Number(data.price ?? data.unitPrice);
    const priceCents = Math.round(rawPrice * 100);
    if (!data.name || !Number.isFinite(rawPrice) || rawPrice <= 0 || !Number.isSafeInteger(priceCents) || !['active', 'paused'].includes(status)) return [];
    const rawLead = data.leadTimeDays;
    const leadTimeDays = rawLead !== undefined && rawLead !== null && Number.isFinite(Number(rawLead))
      ? Math.max(0, Number(rawLead))
      : 5;
    const rawImage = data.imageUrl || data.photoUrl || (Array.isArray(data.images) ? data.images[0] : '');
    const imageUrl = typeof rawImage === 'string' ? rawImage.trim().slice(0, 2048) : '';
    return [{
      id: doc.id,
      name: String(data.name).slice(0, 200),
      price: priceCents / 100,
      category: typeof data.category === 'string' ? data.category.slice(0, 100) : 'Geral',
      description: typeof data.description === 'string' ? data.description.slice(0, 4000) : '',
      imageUrl,
      leadTimeDays,
      badge: typeof data.badge === 'string' ? data.badge.slice(0, 80) : undefined,
      isCustomizable: data.isCustomizable !== false,
      status,
      order: Number.isFinite(Number(data.order)) ? Number(data.order) : undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || (typeof data.createdAt === 'string' ? data.createdAt : undefined),
    }];
  });
  if (process.env.FUNCTIONS_EMULATOR !== 'true') {
    publicCatalogCache = { products, expiresAt: Date.now() + 60_000 };
  }
  return { products };
});

module.exports = { getPublicCatalogProducts };
