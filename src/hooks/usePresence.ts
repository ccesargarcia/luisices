import { useEffect, useRef } from 'react';
import { ref, onValue, onDisconnect, set, serverTimestamp, push, remove } from 'firebase/database';
import { database } from '../lib/firebase';
import { User } from 'firebase/auth';

export function usePresence(user: User | null) {
  const presenceRef = useRef<{ setOffline: () => Promise<void> | void } | null>(null);

  useEffect(() => {
    if (!user) return;

    const uid = user.uid;
    const connectedRef = ref(database, '.info/connected');
    const myConnectionsRef = ref(database, `/status/${uid}/connections`);
    const lastOnlineRef = ref(database, `/status/${uid}/lastOnline`);
    let connectionRef: any = null;

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // We're connected (or reconnected)!
        connectionRef = push(myConnectionsRef);

        // When I disconnect, remove this device
        onDisconnect(connectionRef).remove();

        // When I disconnect, update the last time I was seen online
        onDisconnect(lastOnlineRef).set(serverTimestamp());

        // Add this device to my connections list
        set(connectionRef, true);
      }
    });

    presenceRef.current = {
      setOffline: () => {
        if (connectionRef) {
          return remove(connectionRef).then(() => {
            return set(lastOnlineRef, serverTimestamp());
          });
        }
      }
    };

    return () => {
      unsubscribe();
      if (connectionRef) {
        remove(connectionRef);
        set(lastOnlineRef, serverTimestamp());
      }
    };
  }, [user]);

  return {
    setOffline: () => presenceRef.current?.setOffline()
  };
}
