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
      console.log('useUserSettings: No user authenticated');
      setSettings(null);
      setLoading(false);
      return;
    }

    console.log('useUserSettings: Setting up listener for user:', user.uid);
    const docRef = doc(db, 'users', user.uid, 'settings', 'profile');
    console.log('useUserSettings: Document path:', `users/${user.uid}/settings/profile`);
    
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        console.log('useUserSettings: Snapshot received, exists:', doc.exists());
        if (doc.exists()) {
          const data = doc.data();
          console.log('useUserSettings: Document data:', data);
          setSettings({
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as UserSettings);
        } else {
          console.log('useUserSettings: Document does not exist');
          setSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('useUserSettings: Error in snapshot:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      console.log('useUserSettings: Cleaning up listener');
      unsubscribe();
    };
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
      // Deletar avatar antigo se existir (não bloqueia se falhar)
      if (settings?.avatar) {
        try {
          await firebaseStorageService.deleteImage(settings.avatar);
        } catch (deleteError) {
          console.warn('Não foi possível deletar avatar antigo (continuando):', deleteError);
        }
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
      // Deletar logo antiga se existir (não bloqueia se falhar)
      if (settings?.logo) {
        try {
          await firebaseStorageService.deleteImage(settings.logo);
        } catch (deleteError) {
          console.warn('Não foi possível deletar logo antigo (continuando):', deleteError);
        }
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
      // Deletar banner antigo se existir (não bloqueia se falhar)
      if (settings?.banner) {
        try {
          await firebaseStorageService.deleteImage(settings.banner);
        } catch (deleteError) {
          console.warn('Não foi possível deletar banner antigo (continuando):', deleteError);
        }
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

  // Remover avatar
  const removeAvatar = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Tentar deletar do Storage (não bloqueia se falhar)
      if (settings?.avatar) {
        try {
          await firebaseStorageService.deleteImage(settings.avatar);
        } catch (storageError) {
          console.warn('Erro ao deletar imagem do Storage (continuando):', storageError);
        }
      }
      // Sempre atualizar Firestore
      await firebaseSettingsService.updateAvatar(user.uid, null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover logo
  const removeLogo = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Tentar deletar do Storage (não bloqueia se falhar)
      if (settings?.logo) {
        try {
          await firebaseStorageService.deleteImage(settings.logo);
        } catch (storageError) {
          console.warn('Erro ao deletar imagem do Storage (continuando):', storageError);
        }
      }
      // Sempre atualizar Firestore
      await firebaseSettingsService.updateLogo(user.uid, null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover banner
  const removeBanner = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Tentar deletar do Storage (não bloqueia se falhar)
      if (settings?.banner) {
        try {
          await firebaseStorageService.deleteImage(settings.banner);
        } catch (storageError) {
          console.warn('Erro ao deletar imagem do Storage (continuando):', storageError);
        }
      }
      // Sempre atualizar Firestore
      await firebaseSettingsService.updateBanner(user.uid, null);
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
    removeAvatar,
    removeLogo,
    removeBanner,
    resetToDefaults,
  };
}
