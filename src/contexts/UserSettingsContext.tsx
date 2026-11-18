// @refresh reset
/**
 * Context that holds a single Firestore onSnapshot listener for user settings.
 * All components read from here instead of creating their own listeners.
 */

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { UserSettings } from '../services/firebaseSettingsService';
import { toPublicCdnUrl } from '../app/utils/cdnUtils';

function formatUserSettings(data: any): UserSettings {
  const rawDate = data.updatedAt;
  const updatedAt = typeof rawDate?.toDate === 'function' 
    ? rawDate.toDate() 
    : (rawDate ? new Date(rawDate) : new Date());

  return {
    ...data,
    avatar: data.avatar ? toPublicCdnUrl(data.avatar) : undefined,
    logo: data.logo ? toPublicCdnUrl(data.logo) : undefined,
    banner: data.banner ? toPublicCdnUrl(data.banner) : undefined,
    catalogLogo: data.catalogLogo ? toPublicCdnUrl(data.catalogLogo) : undefined,
    catalogBanner: data.catalogBanner ? toPublicCdnUrl(data.catalogBanner) : undefined,
    catalogHeaderBackground: data.catalogHeaderBackground ? toPublicCdnUrl(data.catalogHeaderBackground) : undefined,
    catalogAboutImageUrl: data.catalogAboutImageUrl ? toPublicCdnUrl(data.catalogAboutImageUrl) : undefined,
    catalogBanners: Array.isArray(data.catalogBanners)
      ? data.catalogBanners.map((b: any) => ({ ...b, imageUrl: toPublicCdnUrl(b.imageUrl) }))
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
  const { user, userProfile, loading: authLoading } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [sharedSuperfrete, setSharedSuperfrete] = useState<Pick<UserSettings, 'superfreteEnabled' | 'superfreteDefaultPackage'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !userProfile || authLoading) {
      setUserSettings(null);
      setSharedSuperfrete(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'profile');

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserSettings(formatUserSettings(data));
        } else {
          setUserSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        if (err?.code !== 'permission-denied' && !String(err?.message).includes('insufficient permissions')) {
          console.warn('UserSettingsContext: onSnapshot listener cancelado:', err?.message || err);
        }
        setError(err as Error);
        setUserSettings((prev) => prev ?? null);
        setLoading(false);
      }
    );

    let unsubscribePublic: (() => void) | undefined;
    if (userProfile.role !== 'admin') {
      const publicRef = doc(db, 'storeSettings', 'public');
      unsubscribePublic = onSnapshot(
        publicRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setSharedSuperfrete({
              superfreteEnabled: data.superfreteEnabled,
              superfreteDefaultPackage: data.superfreteDefaultPackage,
            });
          } else {
            setSharedSuperfrete(null);
          }
        },
        () => {
          setSharedSuperfrete(null);
        }
      );
    } else {
      setSharedSuperfrete(null);
    }

    return () => {
      unsubscribe();
      unsubscribePublic?.();
    };
  }, [user, userProfile, authLoading]);

  const settings = useMemo<UserSettings | null>(() => {
    if (!userProfile || userProfile.role === 'admin') {
      return userSettings;
    }
    if (!userSettings && !sharedSuperfrete) {
      return null;
    }
    return {
      ...(userSettings || ({} as UserSettings)),
      superfreteEnabled: userSettings?.superfreteEnabled ?? sharedSuperfrete?.superfreteEnabled,
      superfreteDefaultPackage: userSettings?.superfreteDefaultPackage ?? sharedSuperfrete?.superfreteDefaultPackage,
    };
  }, [userProfile, userSettings, sharedSuperfrete]);

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
