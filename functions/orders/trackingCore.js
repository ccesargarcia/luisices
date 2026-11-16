const crypto = require('node:crypto');

function createCoreError(code, message, details) {
  const err = new Error(message);
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

/**
 * Núcleo puro de consulta pública de acompanhamento de pedido.
 * Nunca expõe dados financeiros ou de contato.
 */
async function handleGetPublicOrderTrackingCore(token, { getFirestore: getDb } = {}) {
  if (typeof getDb !== 'function') {
    throw new Error('getFirestore é obrigatório.');
  }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    throw createCoreError('not-found', 'Link de acompanhamento inválido ou desativado.');
  }

  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const orderSnapshot = await db.collection('orders').where('publicTrackingHash', '==', tokenHash).limit(1).get();
  if (orderSnapshot.empty) {
    throw createCoreError('not-found', 'Link de acompanhamento inválido ou desativado.');
  }

  const orderSnap = orderSnapshot.docs[0];
  const order = orderSnap.data() || {};
  const expiryIsMissing = !Object.prototype.hasOwnProperty.call(order, 'publicTrackingExpiresAt');
  const expiresAtMs = typeof order.publicTrackingExpiresAt === 'string'
    ? Date.parse(order.publicTrackingExpiresAt)
    : Number.NaN;
  const isExpired = order.publicTrackingExpiresAt !== null
    && (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now());
  if (order.publicTrackingHash !== tokenHash || order.isArchived || expiryIsMissing || isExpired) {
    throw createCoreError('not-found', 'Link de acompanhamento inválido ou desativado.');
  }

  let trackingTemplate = {};
  const ownerUid = typeof order.userId === 'string'
    ? order.userId
    : (typeof order.createdByUid === 'string' ? order.createdByUid : '');

  if (ownerUid) {
    const settingsSnap = await db.doc(`users/${ownerUid}/settings/profile`).get();
    const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
    const raw = settings.orderTrackingTemplate && typeof settings.orderTrackingTemplate === 'object'
      ? settings.orderTrackingTemplate
      : {};
    const safeText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
    const safeColor = (value) => (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '');
    const logoUrl = safeText(raw.logoUrl, 500);

    const isOwnedTrackingLogo = (value) => {
      try {
        const parsed = new URL(value);
        let storagePath = '';
        if (['cdn.luisices.com.br', 'cdn-dev.luisices.com.br'].includes(parsed.hostname)) {
          storagePath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
        } else if (parsed.hostname === 'firebasestorage.googleapis.com') {
          const match = parsed.pathname.match(/\/o\/(.+)$/);
          if (match) storagePath = decodeURIComponent(match[1]);
        }
        return storagePath.startsWith(`users/${ownerUid}/tracking-logo/`)
          && storagePath.split('/').length === 4
          && !storagePath.split('/').includes('..');
      } catch {
        return false;
      }
    };

    trackingTemplate = {
      layout: ['classic', 'editorial', 'soft'].includes(raw.layout) ? raw.layout : 'classic',
      brandName: safeText(raw.brandName, 80) || safeText(settings.businessName, 80),
      logoUrl: isOwnedTrackingLogo(logoUrl)
        ? logoUrl
        : (typeof settings.logo === 'string' && /^https:\/\//i.test(settings.logo) ? settings.logo.slice(0, 500) : ''),
      title: safeText(raw.title, 100) || 'Acompanhe seu pedido',
      subtitle: safeText(raw.subtitle, 160) || 'Veja as atualizações do seu pedido por aqui.',
      footerText: safeText(raw.footerText, 240) || 'Dúvidas? Fale com a nossa equipe.',
      backgroundColor: safeColor(raw.backgroundColor),
      surfaceColor: safeColor(raw.surfaceColor),
      primaryColor: safeColor(raw.primaryColor),
      textColor: safeColor(raw.textColor),
      showLogo: typeof raw.showLogo === 'boolean' ? raw.showLogo : true,
      showProgress: typeof raw.showProgress === 'boolean' ? raw.showProgress : true,
      showProduct: typeof raw.showProduct === 'boolean' ? raw.showProduct : true,
      showQuantity: typeof raw.showQuantity === 'boolean' ? raw.showQuantity : true,
      showDeliveryDate: typeof raw.showDeliveryDate === 'boolean' ? raw.showDeliveryDate : true,
      showTrackingCode: typeof raw.showTrackingCode === 'boolean' ? raw.showTrackingCode : true,
      productLabel: safeText(raw.productLabel, 40) || 'Item',
      quantityLabel: safeText(raw.quantityLabel, 40) || 'Quantidade',
      deliveryLabel: safeText(raw.deliveryLabel, 40) || 'Previsão de entrega',
      trackingLabel: safeText(raw.trackingLabel, 40) || 'Código de rastreio',
    };
  }

  return {
    orderNumber: typeof order.orderNumber === 'string' ? order.orderNumber.slice(0, 100) : '',
    status: ['pending', 'in-progress', 'completed', 'cancelled'].includes(order.status) ? order.status : 'pending',
    productName: typeof order.productName === 'string' ? order.productName.slice(0, 160) : 'Pedido personalizado',
    quantity: Number.isSafeInteger(order.quantity) && order.quantity > 0 ? order.quantity : 1,
    deliveryDate: typeof order.deliveryDate === 'string' ? order.deliveryDate.slice(0, 40) : '',
    updatedAt: typeof order.updatedAt === 'string'
      ? order.updatedAt.slice(0, 40)
      : (typeof order.createdAt === 'string' ? order.createdAt.slice(0, 40) : ''),
    shippingStatus: typeof order.shippingStatus === 'string' ? order.shippingStatus.slice(0, 80) : '',
    shippingTrackingNumber: typeof order.shippingTrackingNumber === 'string' ? order.shippingTrackingNumber.slice(0, 120) : '',
    trackingTemplate,
  };
}

module.exports = { handleGetPublicOrderTrackingCore };
