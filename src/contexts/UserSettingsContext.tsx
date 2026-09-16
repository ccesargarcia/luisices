// @refresh reset
/**
 * Context that holds a single Firestore onSnapshot listener for user settings.
 * All components read from here instead of creating their own listeners.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { UserSettings } from '../services/firebaseSettingsService';

interface UserSettingsContextValue {
  settings: UserSettings | null;
  loading: boolean;
  error: Error | null;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'profile');

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as UserSettings);
        } else {
          setSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('UserSettingsContext: onSnapshot error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <UserSettingsContext.Provider value={{ settings, loading, error }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettingsContext() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error('useUserSettingsContext must be used inside UserSettingsProvider');
  return ctx;
}
