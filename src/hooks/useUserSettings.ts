/**
 * Hook para gerenciar configurações do usuário
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  UserSettings,
  firebaseSettingsService,
} from '../services/firebaseSettingsService';
import { firebaseStorageService } from '../services/firebaseStorageService';

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Observar mudanças em tempo real
  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'profile');
    
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
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
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Atualizar configurações
  const updateSettings = async (
    newSettings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
  ) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      await firebaseSettingsService.updateSettings(user.uid, newSettings);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de avatar
  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Deletar avatar antigo se existir
      if (settings?.avatar) {
        await firebaseStorageService.deleteImage(settings.avatar);
      }

      // Upload novo avatar
      const url = await firebaseStorageService.uploadImage(file, user.uid, 'avatar');
      
      // Atualizar Firestore
      await firebaseSettingsService.updateAvatar(user.uid, url);
      
      return url;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de logo
  const uploadLogo = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Deletar logo antiga se existir
      if (settings?.logo) {
        await firebaseStorageService.deleteImage(settings.logo);
      }

      // Upload nova logo
      const url = await firebaseStorageService.uploadImage(file, user.uid, 'logo');
      
      // Atualizar Firestore
      await firebaseSettingsService.updateLogo(user.uid, url);
      
      return url;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de banner
  const uploadBanner = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Deletar banner antigo se existir
      if (settings?.banner) {
        await firebaseStorageService.deleteImage(settings.banner);
      }

      // Upload novo banner
      const url = await firebaseStorageService.uploadImage(file, user.uid, 'banner');
      
      // Atualizar Firestore
      await firebaseSettingsService.updateBanner(user.uid, url);
      
      return url;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Resetar para padrões
  const resetToDefaults = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Deletar imagens do storage
      if (settings?.avatar) {
        await firebaseStorageService.deleteImage(settings.avatar);
      }
      if (settings?.logo) {
        await firebaseStorageService.deleteImage(settings.logo);
      }
      if (settings?.banner) {
        await firebaseStorageService.deleteImage(settings.banner);
      }

      // Resetar Firestore
      await firebaseSettingsService.resetToDefaults(user.uid);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    uploadAvatar,
    uploadLogo,
    uploadBanner,
    resetToDefaults,
  };
}
