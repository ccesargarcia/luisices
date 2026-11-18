import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
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
  | 'alexa'
  | 'mcpAdmin'
  | 'communicationsAdmin'
  | 'usersAdmin';

export interface BackendRoutingConfig {
  globalMode: BackendProvider;
  autoFallbackToGcp: boolean;
  routes: Record<BackendRouteKey, RouteOverride>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BackendFallbackEvent {
  id: string;
  routeKey: BackendRouteKey;
  operation?: string;
  timestamp: string;
  reason: string;
  status?: number;
  vercelError?: BackendErrorSummary;
  gcpError?: BackendErrorSummary;
  durationMs?: number;
  host: string;
  recoveredViaGcp: boolean;
}

export interface BackendErrorSummary {
  name?: string;
  code?: string;
  status?: number;
}

const STORAGE_CACHE_KEY = 'luisices_backend_routing_v1';
const TELEMETRY_CACHE_KEY = 'luisices_backend_routing_telemetry_v1';
const MAX_TELEMETRY_EVENTS = 50;

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
    mcpAdmin: 'inherit',
    communicationsAdmin: 'inherit',
    usersAdmin: 'inherit',
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
      mcpAdmin: pickRoute('mcpAdmin'),
      communicationsAdmin: pickRoute('communicationsAdmin'),
      usersAdmin: pickRoute('usersAdmin'),
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
  if (anyErr?.code === 'vercel-payload-too-large' && anyErr.status === 413) return true;
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

function readCachedTelemetry(): BackendFallbackEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TELEMETRY_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TELEMETRY_EVENTS) : [];
  } catch {
    return [];
  }
}

let telemetryEvents: BackendFallbackEvent[] = readCachedTelemetry();
let telemetryListenerStarted = false;
const telemetrySubscribers = new Set<(events: BackendFallbackEvent[]) => void>();

function mergeTelemetryEvents(remote: BackendFallbackEvent[], local: BackendFallbackEvent[]): BackendFallbackEvent[] {
  const byId = new Map<string, BackendFallbackEvent>();
  for (const item of [...remote, ...local]) {
    if (item && typeof item.id === 'string' && typeof item.routeKey === 'string') {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, MAX_TELEMETRY_EVENTS);
}

function notifyTelemetrySubscribers(next: BackendFallbackEvent[]) {
  telemetryEvents = next.slice(0, MAX_TELEMETRY_EVENTS);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(telemetryEvents));
    } catch {}
  }
  telemetrySubscribers.forEach((cb) => cb(telemetryEvents));
}

function summarizeBackendError(error: unknown): BackendErrorSummary | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { name?: unknown; code?: unknown; status?: unknown };
  const summary: BackendErrorSummary = {};
  if (typeof value.name === 'string') {
    summary.name = value.name.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 48);
  }
  if (typeof value.code === 'string') {
    summary.code = value.code.replace(/[^a-zA-Z0-9._/-]/g, '').slice(0, 64);
  } else if (value.name === 'TypeError') {
    summary.code = 'network-error';
  }
  if (typeof value.status === 'number' && Number.isInteger(value.status)) {
    summary.status = value.status;
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function formatBackendErrorSummary(summary?: BackendErrorSummary): string {
  if (!summary) return 'sem código';
  return [
    summary.status ? `HTTP ${summary.status}` : undefined,
    summary.code,
    summary.name,
  ].filter(Boolean).join(' · ') || 'sem código';
}

export function ensureTelemetryListener(): void {
  if (telemetryListenerStarted || typeof window === 'undefined') return;
  telemetryListenerStarted = true;
  try {
    onSnapshot(
      doc(db, 'storeSettings', 'backendRoutingTelemetry'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (Array.isArray(data?.events)) {
          notifyTelemetrySubscribers(mergeTelemetryEvents(data.events, telemetryEvents));
        }
      },
      () => {},
    );
  } catch {
    telemetryListenerStarted = false;
  }
}

export function getBackendFallbackTelemetry(): BackendFallbackEvent[] {
  ensureTelemetryListener();
  return telemetryEvents;
}

export function subscribeBackendFallbackTelemetry(
  cb: (events: BackendFallbackEvent[]) => void,
): () => void {
  ensureTelemetryListener();
  telemetrySubscribers.add(cb);
  cb(telemetryEvents);
  return () => {
    telemetrySubscribers.delete(cb);
  };
}

export async function clearBackendFallbackTelemetry(): Promise<void> {
  notifyTelemetrySubscribers([]);
  try {
    await setDoc(
      doc(db, 'storeSettings', 'backendRoutingTelemetry'),
      { events: [], updatedAt: new Date().toISOString() },
      { merge: true },
    );
  } catch {
    // Sem permissão de escrita em ambiente público; mantém limpeza local.
  }
}

function recordFallbackEvent(
  routeKey: BackendRouteKey,
  operation: string | undefined,
  vercelErr: unknown,
  gcpErr: unknown,
  recoveredViaGcp: boolean,
  durationMs: number,
): void {
  const vercelError = summarizeBackendError(vercelErr);
  const gcpError = summarizeBackendError(gcpErr);
  const safeOperation = (operation || routeKey).replace(/[^a-zA-Z0-9._/-]/g, '').slice(0, 64);
  const event: BackendFallbackEvent = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    routeKey,
    operation: safeOperation,
    timestamp: new Date().toISOString(),
    reason: `Beta: ${formatBackendErrorSummary(vercelError)}${gcpError ? ` · GCP: ${formatBackendErrorSummary(gcpError)}` : ''}`,
    ...(vercelError?.status ? { status: vercelError.status } : {}),
    ...(vercelError ? { vercelError } : {}),
    ...(gcpError ? { gcpError } : {}),
    durationMs: Math.max(0, Math.round(durationMs)),
    host: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    recoveredViaGcp,
  };
  const next = mergeTelemetryEvents([event], telemetryEvents);
  notifyTelemetrySubscribers(next);
  const telemetryRef = doc(db, 'storeSettings', 'backendRoutingTelemetry');
  void runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(telemetryRef);
    const currentEvents = snapshot.exists() && Array.isArray(snapshot.data()?.events)
      ? snapshot.data()?.events as BackendFallbackEvent[]
      : [];
    transaction.set(telemetryRef, {
      events: mergeTelemetryEvents(currentEvents, [event]),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }).catch(() => {
    // Visitantes públicos sem permissão de escrita mantêm o registro local sem erro.
  });
}

export async function executeWithGcpFallback<T>(
  routeKey: BackendRouteKey,
  vercelCall: () => Promise<T>,
  gcpFallbackCall: () => Promise<T>,
  operation?: string,
): Promise<T> {
  if (!shouldUseVercelForRoute(routeKey)) {
    return gcpFallbackCall();
  }

  const startedAt = Date.now();
  try {
    return await vercelCall();
  } catch (err) {
    if (isAutoFallbackToGcpEnabled() && isFallbackEligibleError(err)) {
      console.warn(`[BackendRouting] Falha em "${routeKey}/${operation || 'unknown'}" (${formatBackendErrorSummary(summarizeBackendError(err))}). Acionando fallback GCP.`);
      try {
        const result = await gcpFallbackCall();
        recordFallbackEvent(routeKey, operation, err, undefined, true, Date.now() - startedAt);
        return result;
      } catch (gcpErr) {
        recordFallbackEvent(routeKey, operation, err, gcpErr, false, Date.now() - startedAt);
        throw gcpErr;
      }
    }
    throw err;
  }
}
