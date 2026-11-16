import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isVercelBetaHost } from '../app/utils/betaHost';

export type BackendProvider = 'vercel' | 'gcp';
export type RouteOverride = 'inherit' | BackendProvider;
export type BackendRouteKey =
  | 'galleryMedia'
  | 'publicCatalogProducts'
  | 'publicCatalogOrder'
  | 'publicOrderTracking'
  | 'orderTrackingAdmin'
  | 'aiChat'
  | 'alexa';

export interface BackendRoutingConfig {
  globalMode: BackendProvider;
  autoFallbackToGcp: boolean;
  routes: Record<BackendRouteKey, RouteOverride>;
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_CACHE_KEY = 'luisices_backend_routing_v1';

export const DEFAULT_BACKEND_ROUTING: BackendRoutingConfig = {
  globalMode: 'vercel',
  autoFallbackToGcp: true,
  routes: {
    galleryMedia: 'inherit',
    publicCatalogProducts: 'inherit',
    publicCatalogOrder: 'inherit',
    publicOrderTracking: 'inherit',
    orderTrackingAdmin: 'inherit',
    aiChat: 'inherit',
    alexa: 'inherit',
  },
};

const BUSINESS_ERROR_CODES = new Set([
  'invalid-argument',
  'unauthenticated',
  'permission-denied',
  'not-found',
  'already-exists',
  'aborted',
  'failed-precondition',
  'resource-exhausted',
]);

export class VercelInfraError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'VercelInfraError';
    this.status = status;
  }
}

function normalizeConfig(raw: unknown): BackendRoutingConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<BackendRoutingConfig>;
  const globalMode: BackendProvider = input.globalMode === 'gcp' ? 'gcp' : 'vercel';
  const autoFallbackToGcp = typeof input.autoFallbackToGcp === 'boolean' ? input.autoFallbackToGcp : true;
  const rawRoutes = (input.routes && typeof input.routes === 'object' ? input.routes : {}) as Record<string, unknown>;
  const pickRoute = (key: BackendRouteKey): RouteOverride => {
    const val = rawRoutes[key];
    return val === 'vercel' || val === 'gcp' ? val : 'inherit';
  };

  return {
    globalMode,
    autoFallbackToGcp,
    routes: {
      galleryMedia: pickRoute('galleryMedia'),
      publicCatalogProducts: pickRoute('publicCatalogProducts'),
      publicCatalogOrder: pickRoute('publicCatalogOrder'),
      publicOrderTracking: pickRoute('publicOrderTracking'),
      orderTrackingAdmin: pickRoute('orderTrackingAdmin'),
      aiChat: pickRoute('aiChat'),
      alexa: pickRoute('alexa'),
    },
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : undefined,
    updatedBy: typeof input.updatedBy === 'string' ? input.updatedBy : undefined,
  };
}

function readCachedConfig(): BackendRoutingConfig {
  if (typeof window === 'undefined') return DEFAULT_BACKEND_ROUTING;
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return DEFAULT_BACKEND_ROUTING;
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_BACKEND_ROUTING;
  }
}

let currentConfig: BackendRoutingConfig = readCachedConfig();
let listenerStarted = false;
const subscribers = new Set<(cfg: BackendRoutingConfig) => void>();

function notifySubscribers(next: BackendRoutingConfig) {
  currentConfig = next;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(next));
    } catch {}
  }
  subscribers.forEach((cb) => cb(next));
}

export function ensureBackendRoutingListener(): void {
  if (listenerStarted || typeof window === 'undefined') return;
  listenerStarted = true;
  try {
    onSnapshot(
      doc(db, 'storeSettings', 'public'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data && data.backendRouting !== undefined) {
          notifySubscribers(normalizeConfig(data.backendRouting));
        }
      },
      () => {
        // Silencioso para não bloquear fluxo público caso haja oscilação temporária de rede.
      },
    );
  } catch {
    listenerStarted = false;
  }
}

export function getBackendRoutingConfig(): BackendRoutingConfig {
  ensureBackendRoutingListener();
  return currentConfig;
}

export function subscribeBackendRouting(cb: (cfg: BackendRoutingConfig) => void): () => void {
  ensureBackendRoutingListener();
  subscribers.add(cb);
  cb(currentConfig);
  return () => {
    subscribers.delete(cb);
  };
}

export async function saveBackendRoutingConfig(
  config: BackendRoutingConfig,
  updatedBy?: string,
): Promise<BackendRoutingConfig> {
  const normalized = normalizeConfig({
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || config.updatedBy,
  });
  await setDoc(
    doc(db, 'storeSettings', 'public'),
    { backendRouting: normalized },
    { merge: true },
  );
  notifySubscribers(normalized);
  return normalized;
}

export function resolveEffectiveProvider(
  routeKey: BackendRouteKey,
  config: BackendRoutingConfig = getBackendRoutingConfig(),
  isBetaHost: boolean = isVercelBetaHost(),
): BackendProvider {
  if (!isBetaHost) return 'gcp';
  const override = config.routes[routeKey];
  return override === 'inherit' ? config.globalMode : override;
}

export function shouldUseVercelForRoute(routeKey: BackendRouteKey): boolean {
  return resolveEffectiveProvider(routeKey) === 'vercel';
}

export function isAutoFallbackToGcpEnabled(): boolean {
  return getBackendRoutingConfig().autoFallbackToGcp;
}

export function isFallbackEligibleError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof VercelInfraError) return true;
  const anyErr = err as { code?: string; status?: number; name?: string } | null;
  if (typeof anyErr?.code === 'string' && BUSINESS_ERROR_CODES.has(anyErr.code)) {
    return false;
  }
  if (typeof anyErr?.status === 'number' && anyErr.status >= 400 && anyErr.status < 500) {
    return false;
  }
  if (anyErr?.name === 'AbortError' || anyErr?.name === 'TimeoutError' || err instanceof TypeError) {
    return true;
  }
  if (typeof anyErr?.status === 'number' && anyErr.status >= 500) {
    return true;
  }
  return false;
}

export async function executeWithGcpFallback<T>(
  routeKey: BackendRouteKey,
  vercelCall: () => Promise<T>,
  gcpFallbackCall: () => Promise<T>,
): Promise<T> {
  if (!shouldUseVercelForRoute(routeKey)) {
    return gcpFallbackCall();
  }

  try {
    return await vercelCall();
  } catch (err) {
    if (isAutoFallbackToGcpEnabled() && isFallbackEligibleError(err)) {
      console.warn(`[BackendRouting] Falha na Vercel em "${routeKey}". Acionando fallback automático para GCP.`, err);
      return gcpFallbackCall();
    }
    throw err;
  }
}
