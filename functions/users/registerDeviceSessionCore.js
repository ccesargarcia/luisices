const { HttpsError } = require('firebase-functions/v2/https');

async function registerDeviceSessionCore(request, { db, serverTimestamp }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Requer autenticação.');

  const { deviceId, userAgent } = request.data || {};
  // Validação estrita de deviceId: apenas caracteres alfanuméricos, hífen e underscore (impede path traversal)
  if (!deviceId || typeof deviceId !== 'string' || !/^[a-zA-Z0-9_-]{5,100}$/.test(deviceId)) {
    throw new HttpsError('invalid-argument', 'deviceId inválido. Deve ter entre 5 e 100 caracteres alfanuméricos.');
  }

  if (userAgent !== undefined && typeof userAgent !== 'string') {
    throw new HttpsError('invalid-argument', 'userAgent deve ser uma string.');
  }

  let safeUserAgent = (typeof userAgent === 'string' && userAgent.trim().length > 0) ? userAgent.trim() : 'Desconhecido';
  if (safeUserAgent.length > 300) {
    safeUserAgent = safeUserAgent.substring(0, 300) + '...';
  }

  // Obter IP (x-forwarded-for pode conter múltiplos IPs, proxy reverso, Cloud Run / Cloudflare / Fastly)
  let ip = request.rawRequest?.headers?.['cf-connecting-ip'] ||
           request.rawRequest?.headers?.['fastly-client-ip'] ||
           request.rawRequest?.headers?.['x-real-ip'] ||
           request.rawRequest?.headers?.['x-forwarded-for'] ||
           request.rawRequest?.ip ||
           request.rawRequest?.socket?.remoteAddress;
  if (ip && typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip && typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.substring(7);
  ip = (ip && typeof ip === 'string' && ip.trim()) ? ip.trim() : 'Desconhecido';

  const uid = request.auth.uid;
  const profileRef = db.doc(`userProfiles/${uid}`);
  const userDevicesRef = db.collection(`userProfiles/${uid}/devices`);
  const deviceRef = userDevicesRef.doc(deviceId);

  await db.runTransaction(async (transaction) => {
    const [profileSnap, deviceSnap] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(deviceRef),
    ]);

    if (!profileSnap.exists || profileSnap.data().active === false) {
      throw new HttpsError('permission-denied', 'Perfil de usuário inativo ou inexistente.');
    }

    const profileData = profileSnap.data();
    // Barreira de revogação: rejeita ID token emitido antes ou no mesmo segundo da última revogação
    const authTime = request.auth.token.auth_time;
    if (profileData.tokensValidAfterTime && typeof authTime === 'number' && authTime <= profileData.tokensValidAfterTime) {
      throw new HttpsError('unauthenticated', 'Sessão revogada. Faça login novamente.');
    }

    let locationString = 'Localização não verificada';

    if (deviceSnap.exists) {
      // Dispositivo existente: atualiza sem consultar toda a coleção (Otimização C1)
      const existingData = deviceSnap.data();
      // Revogação individual é permanente para este identificador. Um heartbeat
      // concorrente ou um cliente antigo não pode reativá-lo; um novo login usa
      // outro deviceId e segue pelo fluxo de novo dispositivo abaixo.
      if (existingData.status === 'revoked') {
        throw new HttpsError('permission-denied', 'Sessão deste dispositivo revogada. Faça login novamente.');
      }
      if (existingData.ip === ip && existingData.location) {
        locationString = existingData.location;
      }

      transaction.update(deviceRef, {
        userAgent: safeUserAgent,
        ip,
        location: locationString,
        status: 'active',
        lastActiveAt: serverTimestamp(),
      });
    } else {
      // Novo dispositivo: agora sim consulta a coleção para garantir o teto de 10 dispositivos
      const devicesSnap = await transaction.get(userDevicesRef);
      if (devicesSnap.size >= 10) {
        let oldestDevice = null;
        devicesSnap.forEach((doc) => {
          const data = doc.data();
          const time = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
          if (!oldestDevice || time < oldestDevice.time) {
            oldestDevice = { id: doc.id, time };
          }
        });
        if (oldestDevice) {
          transaction.delete(userDevicesRef.doc(oldestDevice.id));
        }
      }

      transaction.set(deviceRef, {
        deviceId,
        userAgent: safeUserAgent,
        ip,
        location: locationString,
        status: 'active',
        lastActiveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
  });

  return { success: true };
}

module.exports = { registerDeviceSessionCore };
