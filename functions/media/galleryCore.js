function getGalleryStoragePath(item, requestedPath) {
  const ownerUid = typeof item?.userId === 'string' ? item.userId : '';
  const candidate = requestedPath || item?.imagePath || item?.imageUrl;
  if (!ownerUid || typeof candidate !== 'string' || !candidate) return null;
  let path = candidate;
  try {
    const url = new URL(candidate);
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const match = url.pathname.match(/\/o\/([^/]+)$/);
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    } else if (url.hostname === 'cdn.luisices.com.br' || url.hostname === 'cdn-dev.luisices.com.br') {
      path = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } else return null;
  } catch { /* Caminho canônico do Storage. */ }
  const validOwnerPath = path.startsWith(`users/${ownerUid}/gallery/`) || path.startsWith(`users/${ownerUid}/orders/`);
  if (!validOwnerPath || path.includes('..') || path.includes('\\') || path.includes('?') || path.includes('#')) return null;
  if (requestedPath && getGalleryStoragePath(item) !== path) return null;
  return path;
}

function canReadGalleryItem(uid, profile, item) {
  if (!uid || !profile || profile.active === false || ['paused', 'inactive', 'disabled'].includes(profile.status)) return false;
  if (profile.role === 'admin') return true;
  const canViewGallery = profile.permissions?.gallery === true || profile.permissions?.gallery?.view === true;
  return canViewGallery && (item.userId === uid || profile.role === 'funcionario');
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowed = typeof origin === 'string' && (() => {
    try {
      const url = new URL(origin);
      return (url.protocol === 'https:' && (url.hostname === 'luisices.com.br' || url.hostname.endsWith('.luisices.com.br')))
        || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
    } catch { return false; }
  })();
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-origin-secret, x-cf-origin-token');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

function createGalleryMediaHandler({ auth, firestore, storage, originValidator = () => ({ allowed: true }) }) {
  return async function handleGalleryMedia(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).send('Method Not Allowed');
    const originCheck = originValidator(req);
    if (!originCheck.allowed) return res.status(originCheck.statusCode || 403).send(originCheck.error || 'Forbidden');
    const itemId = typeof req.query?.itemId === 'string' ? req.query.itemId : '';
    const requestedPath = typeof req.query?.path === 'string' ? req.query.path : '';
    if (itemId && !/^[A-Za-z0-9_-]{1,150}$/.test(itemId)) return res.status(400).send('Invalid gallery item');
    if (!itemId && !requestedPath) return res.status(400).send('Gallery image path required');
    const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).send('Authentication required');
    let decoded;
    try { decoded = await auth.verifyIdToken(match[1].trim(), true); }
    catch { return res.status(401).send('Invalid or revoked session'); }
    const [profileSnap, itemSnap] = await Promise.all([
      firestore.collection('userProfiles').doc(decoded.uid).get(),
      itemId ? firestore.collection('gallery').doc(itemId).get() : Promise.resolve(null),
    ]);
    if (!profileSnap.exists || (itemId && !itemSnap.exists)) return res.status(404).send('Gallery image not found');
    const profile = profileSnap.data();
    const item = itemSnap?.data() || { userId: decoded.uid, imagePath: requestedPath };
    if (profile.tokensValidAfterTime && (!Number.isFinite(decoded.auth_time) || decoded.auth_time <= profile.tokensValidAfterTime)) return res.status(401).send('Session revoked');
    if (!canReadGalleryItem(decoded.uid, profile, item)) return res.status(403).send('Gallery access denied');
    const path = getGalleryStoragePath(item, requestedPath || undefined);
    if (!path) return res.status(404).send('Gallery image path is invalid');
    if (!itemId && !path.startsWith(`users/${decoded.uid}/gallery/`)) return res.status(403).send('Gallery access denied');
    try {
      const file = storage.bucket().file(path);
      const [metadata] = await file.getMetadata();
      const contentType = String(metadata.contentType || 'application/octet-stream');
      if (!contentType.startsWith('image/')) return res.status(415).send('Unsupported media type');
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', String(metadata.size || 0));
      if (req.method === 'HEAD') return res.status(200).send('');
      return file.createReadStream().on('error', () => {
        if (!res.headersSent) res.status(404).send('Gallery image not found');
        else res.end();
      }).pipe(res);
    } catch (error) {
      if (error?.code === 404 || error?.code === '404') return res.status(404).send('Gallery image not found');
      console.error('[galleryMedia] Storage read failed:', error?.code || 'unknown');
      return res.status(500).send('Unable to load gallery image');
    }
  };
}

module.exports = { createGalleryMediaHandler, getGalleryStoragePath, canReadGalleryItem };
