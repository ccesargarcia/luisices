import { onIdTokenChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, database } from '../lib/firebase';

export type AdminPresenceState = 'loading' | 'ready' | 'claims-pending' | 'unavailable';
export interface PresenceEntry {
  state?: string;
  connections?: Record<string, boolean>;
  lastOnline?: number;
}
export interface AdminPresenceSnapshot {
  state: AdminPresenceState;
  data: Record<string, PresenceEntry>;
}

/** Reanexa o listener cancelado quando o token muda, mesmo se User mantiver a identidade. */
export function subscribeAdminPresence(uid: string, onChange: (snapshot: AdminPresenceSnapshot) => void) {
  let stopped = false;
  let generation = 0;
  let unsubscribeStatus: (() => void) | undefined;

  const clearStatus = () => {
    unsubscribeStatus?.();
    unsubscribeStatus = undefined;
  };

  const unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
    const currentGeneration = ++generation;
    clearStatus();
    if (stopped) return;
    onChange({ state: 'loading', data: {} });
    const isCurrent = () => !stopped && currentGeneration === generation && auth.currentUser?.uid === uid;
    if (!user || user.uid !== uid) {
      onChange({ state: 'unavailable', data: {} });
      return;
    }
    try {
      const token = await user.getIdTokenResult();
      if (!isCurrent()) return;
      // isAdmin do Firestore não substitui as claims que as regras RTDB recebem.
      if (token.claims.role !== 'admin' || (token.claims.active != null && token.claims.active !== true)) {
        onChange({ state: 'claims-pending', data: {} });
        return;
      }
      unsubscribeStatus = onValue(ref(database, '/status'), (snapshot) => {
        if (isCurrent()) onChange({ state: 'ready', data: snapshot.val() || {} });
      }, (error) => {
        if (!isCurrent()) return;
        onChange({ state: 'unavailable', data: {} });
        // Sem token, UID ou conteúdo do banco no diagnóstico.
        console.warn('[Users] Presença indisponível; verifique regras, revogação e instância RTDB.', {
          code: (error as Error & { code?: string }).code,
          projectId: database.app.options.projectId,
          databaseURL: database.app.options.databaseURL,
        });
      });
    } catch (error) {
      if (!isCurrent()) return;
      onChange({ state: 'unavailable', data: {} });
      console.warn('[Users] Falha ao validar a sessão para presença:', (error as { code?: string }).code || 'unknown');
    }
  }, () => {
    ++generation;
    clearStatus();
    if (!stopped) onChange({ state: 'unavailable', data: {} });
  });

  return () => {
    stopped = true;
    ++generation;
    unsubscribeAuth();
    clearStatus();
  };
}
