import { useEffect, useRef } from 'react';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { database } from '../lib/firebase';
import { User } from 'firebase/auth';

export function usePresence(user: User | null) {
  const presenceRef = useRef<{ setOffline: () => Promise<void> | void } | null>(null);

  useEffect(() => {
    if (!user) return;

    const uid = user.uid;
    const userStatusDatabaseRef = ref(database, `/status/${uid}`);
    const connectedRef = ref(database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // We're connected (or reconnected)! Set up the disconnect hook.
        // The onDisconnect() call is sent to the server. If the client disconnects,
        // the server will write this data.
        onDisconnect(userStatusDatabaseRef)
          .set({
            state: 'offline',
            lastChanged: serverTimestamp(),
          })
          .then(() => {
            // Once the disconnect hook is established on the server,
            // we can confidently set ourselves to online.
            set(userStatusDatabaseRef, {
              state: 'online',
              lastChanged: serverTimestamp(),
            });
          });
      }
    });

    // Provide a way to manually go offline (e.g., on logout)
    presenceRef.current = {
      setOffline: () => {
        return set(userStatusDatabaseRef, {
          state: 'offline',
          lastChanged: serverTimestamp(),
        });
      }
    };

    return () => {
      unsubscribe();
      // Optionally set offline when component unmounts (though onDisconnect handles closing tab)
      // but we shouldn't set offline on every unmount unless they actually logged out,
      // because React StrictMode or route changes might unmount this if it wasn't strictly at the root.
      // But since it's going to be used in AuthContext (root), it's safe.
    };
  }, [user]);

  // Expose a function to set offline manually (e.g., during logout)
  return {
    setOffline: () => presenceRef.current?.setOffline()
  };
}
