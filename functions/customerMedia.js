const crypto = require('crypto');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ['image/png', 'png'];
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return ['image/jpeg', 'jpg'];
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return ['image/gif', 'gif'];
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return ['image/webp', 'webp'];
  return null;
}

const uploadPrivateCustomerPhoto = onCall({ maxInstances: 5 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  const { customerId, imageBase64 } = request.data || {};
  if (typeof customerId !== 'string' || !customerId || customerId.includes('/')
    || typeof imageBase64 !== 'string' || imageBase64.length > 7 * 1024 * 1024
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    throw new HttpsError('invalid-argument', 'Foto ou cliente inválido.');
  }
  const [profileSnap, customerSnap] = await Promise.all([
    admin.firestore().doc(`userProfiles/${request.auth.uid}`).get(),
    admin.firestore().doc(`customers/${customerId}`).get(),
  ]);
  const profile = profileSnap.exists ? profileSnap.data() : null;
  const customer = customerSnap.exists ? customerSnap.data() : null;
  if (!profile || profile.active === false || !customer
    || !(profile.role === 'admin' || customer.userId === request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Sem permissão para alterar a foto deste cliente.');
  }
  const bytes = Buffer.from(imageBase64, 'base64');
  const type = imageType(bytes);
  if (!type || bytes.length > 5 * 1024 * 1024) throw new HttpsError('invalid-argument', 'Use uma imagem PNG, JPEG, GIF ou WebP de até 5 MB.');
  const bucket = admin.storage().bucket();
  const path = `users/${customer.userId}/customers/customer_${customerId}_${crypto.randomUUID()}.${type[1]}`;
  // Admin SDK não gera firebaseStorageDownloadTokens. Imagens são lidas pelo SDK autenticado.
  await bucket.file(path).save(bytes, {
    resumable: false,
    metadata: { contentType: type[0], cacheControl: 'private, no-store, max-age=0' },
  });
  return { photoUrl: `gs://${bucket.name}/${path}` };
});

module.exports = { uploadPrivateCustomerPhoto, imageType };
