import { useEffect, useRef } from 'react';
import { ref, onValue, onDisconnect, set, serverTimestamp, push, remove, DatabaseReference } from 'firebase/database';
import { database } from '../lib/firebase';
import { User } from 'firebase/auth';

export function usePresence(user: User | null) {
  const presenceRef = useRef<{ setOffline: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!user) return;

    let isCleanedUp = false;
    const uid = user.uid;
    const connectedRef = ref(database, '.info/connected');
    const myConnectionsRef = ref(database, `/status/${uid}/connections`);
    const lastOnlineRef = ref(database, `/status/${uid}/lastOnline`);
    let activeConnectionRef: DatabaseReference | null = null;

    const unsubscribe = onValue(connectedRef, async (snap) => {
      if (snap.val() === true && !isCleanedUp) {
        try {
          const connRef = push(myConnectionsRef);
          activeConnectionRef = connRef;

          // Aguarda o registro atômico do onDisconnect no servidor antes de publicar a conexão
          await Promise.all([
            onDisconnect(connRef).remove(),
            onDisconnect(lastOnlineRef).set(serverTimestamp()),
          ]);

          // Se a aba foi desmontada durante a espera da promise, aborta o registro
          if (isCleanedUp) {
            await remove(connRef).catch(() => {});
            return;
          }

          await set(connRef, true);
        } catch (err) {
          console.warn('[usePresence] Falha ao configurar presença no RTDB:', err);
        }
      }
    }, (err) => {
      console.warn('[usePresence] Erro ao escutar conexão no RTDB:', err);
    });

    presenceRef.current = {
      setOffline: async () => {
        if (activeConnectionRef) {
          const refToClean = activeConnectionRef;
          activeConnectionRef = null;
          try {
            await onDisconnect(refToClean).cancel();
            await remove(refToClean);
            await set(lastOnlineRef, serverTimestamp());
          } catch (err) {
            console.warn('[usePresence] Erro ao desativar presença:', err);
          }
        }
      }
    };

    return () => {
      isCleanedUp = true;
      unsubscribe();
      if (activeConnectionRef) {
        const refToClean = activeConnectionRef;
        activeConnectionRef = null;
        onDisconnect(refToClean).cancel().catch(() => {});
        remove(refToClean).catch(() => {});
        set(lastOnlineRef, serverTimestamp()).catch(() => {});
      }
    };
  }, [user]);

  return {
    setOffline: () => presenceRef.current?.setOffline()
  };
}
