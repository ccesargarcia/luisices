import { createRequire } from 'node:module';
import {
  assertBetaEdgeRequest,
  assertActiveSessionFromBearer,
  getFirebaseAdmin,
  mapCoreErrorToHttp,
} from './_firebaseAdmin.js';
import { dispatchUsersAction, PUBLIC_USER_ACTIONS } from './_usersActionDispatcher.js';

const require = createRequire(import.meta.url);

export default async function handler(
  req: {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
    ip?: string;
    socket?: { remoteAddress?: string };
  },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
    };
  },
) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    assertBetaEdgeRequest(req.headers?.['x-beta-edge-secret']);
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action, ...payload } = (body || {}) as { action?: string } & Record<string, unknown>;
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: { code: 'invalid-argument', message: 'Ação obrigatória.' } });
    }

    const { auth, firestore } = getFirebaseAdmin();
    let callableAuth: { uid: string; token: unknown } | null = null;
    let authProfile: unknown = undefined;

    if (!PUBLIC_USER_ACTIONS.has(action)) {
      const session = await assertActiveSessionFromBearer(
        auth,
        firestore,
        req.headers?.authorization,
      );
      callableAuth = { uid: session.uid, token: session.token };
      authProfile = session.profile;
    } else if (typeof req.headers?.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const session = await assertActiveSessionFromBearer(auth, firestore, req.headers.authorization);
        callableAuth = { uid: session.uid, token: session.token };
        authProfile = session.profile;
      } catch {
        callableAuth = null;
      }
    }

    const callableRequest = {
      auth: callableAuth,
      ...(authProfile !== undefined ? { authProfile } : {}),
      data: payload,
      rawRequest: {
        headers: req.headers || {},
        ip: req.ip || (req.headers?.['x-forwarded-for'] as string | undefined) || req.socket?.remoteAddress,
      },
    };

    const result = await dispatchUsersAction(action, callableRequest, {
      validateUserInvitation: (request) => require('../functions/users/validateUserInvitation.js').validateUserInvitation(request),
      completeUserInvitation: (request) => require('../functions/users/completeUserInvitation.js').completeUserInvitation(request),
      sendPasswordResetEmail: (request) => require('../functions/users/index.js').sendPasswordResetEmail(request),
      sendAdminPasswordReset: (request) => require('../functions/users/index.js').sendAdminPasswordReset(request),
      createUserInvitation: (request) => require('../functions/users/createUserInvitation.js').createUserInvitation(request),
      sendVerificationEmail: (request) => require('../functions/users/sendVerificationEmail.js').sendVerificationEmail(request),
      getUserAccountMetadata: (request) => require('../functions/users/index.js').getUserAccountMetadata(request),
      recordUserPasswordChange: (request) => require('../functions/users/index.js').recordUserPasswordChange(request),
      deleteUser: (request) => require('../functions/users/index.js').deleteUser(request),
      createUser: (request) => require('../functions/users/index.js').createUser(request),
      updateUser: (request) => require('../functions/users/index.js').updateUser(request),
      registerDeviceSession: (request) => require('../functions/users/registerDeviceSession.js').registerDeviceSession(request),
      revokeAllSessions: (request) => require('../functions/users/index.js').revokeAllSessions(request),
      revokeDeviceSession: (request) => require('../functions/users/index.js').revokeDeviceSession(request),
      repairUserClaims: (request) => require('../functions/users/index.js').repairUserClaims(request),
    });

    return res.status(200).json(result);
  } catch (err) {
    const { status, code, message, details } = mapCoreErrorToHttp(
      err,
      'Erro ao processar operação de usuário.',
    );
    return res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });
  }
}
