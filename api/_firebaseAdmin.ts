import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

interface FirebaseAdminBundle {
  app: App;
  projectId: string;
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
}

let cachedBundle: FirebaseAdminBundle | null = null;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function getFirebaseAdmin(): FirebaseAdminBundle {
  if (cachedBundle) return cachedBundle;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_DEV;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_DEV não configurado na Vercel.');
  }

  const serviceAccount = JSON.parse(rawServiceAccount);
  const projectId = serviceAccount.project_id || 'luisices-dev';
  if (!process.env.GCLOUD_PROJECT) {
    process.env.GCLOUD_PROJECT = projectId;
  }
  const storageBucket =
    process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket,
    });

  let firestore: Firestore;
  try {
    firestore = initializeFirestore(app, { preferRest: true });
  } catch {
    firestore = getFirestore(app);
  }

  cachedBundle = {
    app,
    projectId,
    auth: getAuth(app),
    firestore,
    storage: getStorage(app),
  };

  return cachedBundle;
}

export function getVertexAiContext(location = 'southamerica-east1') {
  const { app, projectId } = getFirebaseAdmin();
  return {
    projectId,
    location,
    async getAccessToken(): Promise<string> {
      if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
        return cachedAccessToken.token;
      }
      const credential = app.options.credential;
      if (!credential || typeof credential.getAccessToken !== 'function') {
        throw new Error('Credencial Firebase Admin indisponível para Vertex AI.');
      }
      const tokenRes = await credential.getAccessToken();
      cachedAccessToken = {
        token: tokenRes.access_token,
        expiresAt: Date.now() + Math.max(60, Number(tokenRes.expires_in || 3600)) * 1000,
      };
      return cachedAccessToken.token;
    },
  };
}

export class ApiHttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function assertActiveSessionFromBearer(
  auth: Auth,
  firestore: Firestore,
  rawAuthorization: string | string[] | undefined,
) {
  const authHeader = Array.isArray(rawAuthorization) ? rawAuthorization[0] : String(rawAuthorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new ApiHttpError(401, 'unauthenticated', 'Requer autenticação.');
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(match[1].trim(), true);
  } catch {
    throw new ApiHttpError(401, 'unauthenticated', 'Sessão inválida ou revogada.');
  }

  const profileSnap = await firestore.collection('userProfiles').doc(decoded.uid).get();
  if (!profileSnap.exists || profileSnap.data()?.active === false) {
    throw new ApiHttpError(403, 'permission-denied', 'Perfil de usuário inativo ou inexistente.');
  }

  const profile = profileSnap.data() || {};
  const authTime = decoded.auth_time;
  if (
    profile.tokensValidAfterTime &&
    (!Number.isFinite(authTime) || authTime <= profile.tokensValidAfterTime)
  ) {
    throw new ApiHttpError(401, 'unauthenticated', 'Sessão revogada no servidor. Faça login novamente.');
  }

  return { uid: decoded.uid, token: decoded, profile };
}

export function mapCoreErrorToHttp(
  err: unknown,
  fallbackMessage = 'Erro interno no servidor.',
): { status: number; code: string; message: string; details?: unknown } {
  if (err instanceof ApiHttpError) {
    return { status: err.statusCode, code: err.code, message: err.message };
  }
  const anyErr = err as { code?: string; message?: string; statusCode?: number; details?: unknown } | null;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : 'internal';
  const message = typeof anyErr?.message === 'string' && anyErr.message ? anyErr.message : fallbackMessage;
  const details = anyErr?.details;

  switch (code) {
    case 'unauthenticated':
      return { status: 401, code, message, details };
    case 'permission-denied':
      return { status: 403, code, message, details };
    case 'not-found':
      return { status: 404, code, message, details };
    case 'invalid-argument':
      return { status: 400, code, message, details };
    case 'failed-precondition':
      return { status: 412, code, message, details };
    case 'aborted':
    case 'already-exists':
      return { status: 409, code, message, details };
    case 'resource-exhausted':
      return { status: 429, code, message, details };
    case 'deadline-exceeded':
      return { status: 504, code, message, details };
    default:
      return { status: anyErr?.statusCode || 500, code, message, details };
  }
}
