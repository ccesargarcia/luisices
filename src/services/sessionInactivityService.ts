import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const SESSION_IDLE_TIMEOUT_OPTIONS = [0, 15, 30, 60] as const;
export type SessionIdleTimeoutMinutes = typeof SESSION_IDLE_TIMEOUT_OPTIONS[number];
export const DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES: SessionIdleTimeoutMinutes = 30;

const ACTIVITY_STORAGE_PREFIX = 'luisices_session_activity_';
const PERSIST_ACTIVITY_INTERVAL_MS = 2_000;
const ACTIVITY_EVENT_THROTTLE_MS = 1_000;
const SETTINGS_READ_TIMEOUT_MS = 2_500;

export function normalizeSessionIdleTimeout(value: unknown): SessionIdleTimeoutMinutes {
  return SESSION_IDLE_TIMEOUT_OPTIONS.includes(value as SessionIdleTimeoutMinutes)
    ? value as SessionIdleTimeoutMinutes
    : DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES;
}

function activityStorageKey(uid: string): string {
  return `${ACTIVITY_STORAGE_PREFIX}${uid}`;
}

function readTimestamp(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeTimestamp(key: string, timestamp: number): void {
  try {
    localStorage.setItem(key, String(timestamp));
  } catch {
    // O controle segue ativo na aba atual se o navegador bloquear localStorage.
  }
}

export function clearSessionActivity(uid: string): void {
  try {
    localStorage.removeItem(activityStorageKey(uid));
  } catch {
    // A sessão Firebase ainda será encerrada mesmo se a limpeza local falhar.
  }
}

export async function startSessionInactivityGuard(
  uid: string,
  onTimeout: (timeoutMinutes: SessionIdleTimeoutMinutes) => Promise<void> | void,
  shouldContinue: () => boolean,
): Promise<() => void> {
  const settingsRef = doc(db, 'users', uid, 'settings', 'profile');
  let timeoutMinutes = DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES;
  let settingsWaitTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    const settingsSnapshot = await Promise.race([
      getDoc(settingsRef),
      new Promise<null>(resolve => {
        settingsWaitTimer = setTimeout(() => resolve(null), SETTINGS_READ_TIMEOUT_MS);
      }),
    ]);
    if (settingsSnapshot?.exists()) {
      timeoutMinutes = normalizeSessionIdleTimeout(settingsSnapshot.data().sessionIdleTimeoutMinutes);
    }
  } catch {
    // Se as configurações estiverem temporariamente indisponíveis, usa o padrão seguro.
  } finally {
    if (settingsWaitTimer) clearTimeout(settingsWaitTimer);
  }

  if (!shouldContinue()) return () => {};

  const key = activityStorageKey(uid);
  let lastActivityAt = readTimestamp(key) ?? Date.now();
  let lastPersistedAt = lastActivityAt;
  let lastActivityEventAt = 0;
  if (timeoutMinutes > 0) writeTimestamp(key, lastActivityAt);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let expired = false;
  let unsubscribeSettings: (() => void) | undefined;
  let activityChannel: BroadcastChannel | undefined;
  try {
    activityChannel = new BroadcastChannel(`${ACTIVITY_STORAGE_PREFIX}${uid}`);
    activityChannel.onmessage = (event: MessageEvent<unknown>) => {
      const timestamp = Number(event.data);
      if (!stopped && timeoutMinutes > 0 && Number.isFinite(timestamp) && timestamp > lastActivityAt) {
        lastActivityAt = timestamp;
        lastPersistedAt = Math.max(lastPersistedAt, readTimestamp(key) ?? 0);
        scheduleExpiry();
      }
    };
  } catch {
    // O evento storage permanece como fallback para sincronização entre abas.
  }

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    if (unsubscribeSettings) unsubscribeSettings();
    activityChannel?.close();
    for (const eventName of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel']) {
      window.removeEventListener(eventName, handleActivity);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', checkExpiry);
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const expire = () => {
    if (stopped || expired) return;
    expired = true;
    if (timer) clearTimeout(timer);
    void Promise.resolve(onTimeout(timeoutMinutes)).catch(error => {
      console.error('[SessionInactivity] Falha ao encerrar uma sessão inativa:', error);
    });
  };

  const syncLatestActivity = () => {
    const stored = readTimestamp(key);
    if (stored && stored > lastActivityAt) {
      lastActivityAt = stored;
      lastPersistedAt = stored;
    }
  };

  const scheduleExpiry = () => {
    if (stopped || expired) return;
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (timeoutMinutes === 0) return;
    syncLatestActivity();
    const remainingMs = timeoutMinutes * 60_000 - (Date.now() - lastActivityAt);
    if (remainingMs <= 0) {
      expire();
      return;
    }
    timer = setTimeout(expire, remainingMs);
  };

  function handleActivity() {
    if (stopped || expired || timeoutMinutes === 0) return;
    const now = Date.now();
    if (now - lastActivityEventAt < ACTIVITY_EVENT_THROTTLE_MS) return;
    lastActivityEventAt = now;
    syncLatestActivity();
    if (Date.now() - lastActivityAt >= timeoutMinutes * 60_000) {
      expire();
      return;
    }
    lastActivityAt = Math.max(now, lastActivityAt + 1);
    activityChannel?.postMessage(lastActivityAt);
    if (lastActivityAt - lastPersistedAt >= PERSIST_ACTIVITY_INTERVAL_MS) {
      writeTimestamp(key, lastActivityAt);
      lastPersistedAt = lastActivityAt;
    }
    scheduleExpiry();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== key || !event.newValue) return;
    const stored = Number(event.newValue);
    if (Number.isFinite(stored) && stored > lastActivityAt) {
      lastActivityAt = stored;
      lastPersistedAt = stored;
      scheduleExpiry();
    }
  }

  function checkExpiry() {
    scheduleExpiry();
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible') checkExpiry();
  }

  for (const eventName of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel']) {
    window.addEventListener(eventName, handleActivity, { passive: true });
  }
  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', checkExpiry);
  document.addEventListener('visibilitychange', handleVisibility);

  unsubscribeSettings = onSnapshot(settingsRef, snapshot => {
    const nextTimeout = normalizeSessionIdleTimeout(snapshot.data()?.sessionIdleTimeoutMinutes);
    if (nextTimeout !== timeoutMinutes) {
      timeoutMinutes = nextTimeout;
      if (timeoutMinutes === 0) {
        clearSessionActivity(uid);
        lastActivityAt = Date.now();
        lastPersistedAt = lastActivityAt;
      } else if (!readTimestamp(key)) {
        lastActivityAt = Date.now();
        lastPersistedAt = lastActivityAt;
        writeTimestamp(key, lastActivityAt);
      }
      scheduleExpiry();
    }
  }, error => {
    console.warn('[SessionInactivity] Não foi possível observar o limite de inatividade:', error);
  });

  scheduleExpiry();
  return stop;
}
