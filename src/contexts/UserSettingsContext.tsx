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
import { toCdnUrl } from '../app/utils/cdnUtils';

function formatUserSettings(data: any): UserSettings {
  const rawDate = data.updatedAt;
  const updatedAt = typeof rawDate?.toDate === 'function' 
    ? rawDate.toDate() 
    : (rawDate ? new Date(rawDate) : new Date());

  return {
    ...data,
    avatar: data.avatar ? toCdnUrl(data.avatar) : undefined,
    logo: data.logo ? toCdnUrl(data.logo) : undefined,
    banner: data.banner ? toCdnUrl(data.banner) : undefined,
    catalogLogo: data.catalogLogo ? toCdnUrl(data.catalogLogo) : undefined,
    catalogBanner: data.catalogBanner ? toCdnUrl(data.catalogBanner) : undefined,
    catalogHeaderBackground: data.catalogHeaderBackground ? toCdnUrl(data.catalogHeaderBackground) : undefined,
    catalogAboutImageUrl: data.catalogAboutImageUrl ? toCdnUrl(data.catalogAboutImageUrl) : undefined,
    catalogBanners: Array.isArray(data.catalogBanners)
      ? data.catalogBanners.map((b: any) => ({ ...b, imageUrl: toCdnUrl(b.imageUrl) }))
      : undefined,
    updatedAt,
  } as UserSettings;
}

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
          setSettings(formatUserSettings(data));
        } else {
          setSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('UserSettingsContext: onSnapshot listener cancelado:', err?.message || err);
        setError(err as Error);
        setSettings(null);
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
