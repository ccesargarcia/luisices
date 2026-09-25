/**
 * Hook para gerenciar configurações do usuário.
 * Reads settings/loading/error from the shared UserSettingsContext (single Firestore listener).
 * Mutation methods (updateSettings, upload*, remove*, resetToDefaults) are kept here.
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSettingsContext } from '../contexts/UserSettingsContext';
import {
  UserSettings,
  firebaseSettingsService,
} from '../services/firebaseSettingsService';
import { firebaseStorageService } from '../services/firebaseStorageService';

export function useUserSettings() {
  const { user } = useAuth();
  const { settings, loading, error: ctxError } = useUserSettingsContext();
  const [error, setError] = useState<Error | null>(ctxError);

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

  // Alternar publicação da loja (publicada / despublicada)
  const toggleStorePublished = async (
    storePublished: boolean,
    storeUnpublishMessage?: string
  ): Promise<void> => {
    if (!user) throw new Error("Usuário não autenticado");
    try {
      await firebaseSettingsService.toggleStorePublished(
        user.uid,
        storePublished,
        storeUnpublishMessage
      );
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

  // Upload de logo exclusivo do catálogo / lojinha pública online
  const uploadCatalogLogo = async (file: File, previousLogoUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const oldUrl = previousLogoUrl || settings?.catalogLogo;
      if (oldUrl) {
        try {
          await firebaseStorageService.deleteImage(oldUrl);
        } catch (deleteError) {
          console.warn('Não foi possível deletar catalogLogo antigo (continuando):', deleteError);
        }
      }

      const url = await firebaseStorageService.uploadImage(file, user.uid, 'catalog-logo');
      await firebaseSettingsService.updateCatalogLogo(user.uid, url);

      return url;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de banner da lojinha pública (formato LinkedIn / 4:1)
  const uploadCatalogBanner = async (file: File, oldUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      if (oldUrl) {
        try {
          await firebaseStorageService.deleteImage(oldUrl);
        } catch (deleteError) {
          console.warn('Não foi possível deletar catalogBanner antigo (continuando):', deleteError);
        }
      }

      const url = await firebaseStorageService.uploadImage(file, user.uid, 'catalog-banner');
      await firebaseSettingsService.updateCatalogBanner(user.uid, url);

      return url;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload individual de imagem de banner para múltiplos banners rotativos
  const uploadCatalogBannerImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      return await firebaseStorageService.uploadImage(file, user.uid, 'catalog-banner');
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Deletar imagem de banner avulsa do Firebase Storage
  const deleteCatalogBannerImage = async (imageUrl: string): Promise<void> => {
    try {
      await firebaseStorageService.deleteImage(imageUrl);
    } catch (storageError) {
      console.warn('Erro ao deletar imagem de banner do Storage (continuando):', storageError);
    }
  };

  // Upload de arte/fundo da barra superior fixa da lojinha pública
  const uploadCatalogHeaderBackground = async (file: File, oldUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      if (oldUrl) {
        try {
          await firebaseStorageService.deleteImage(oldUrl);
        } catch (deleteError) {
          console.warn('Não foi possível deletar catalogHeaderBackground antigo (continuando):', deleteError);
        }
      }

      const url = await firebaseStorageService.uploadImage(file, user.uid, 'catalog-header');
      await firebaseSettingsService.updateCatalogHeaderBackground(user.uid, url);

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

  // Remover logo do catálogo / lojinha pública
  const removeCatalogLogo = async (logoUrlToDelete?: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const urlToDelete = logoUrlToDelete || settings?.catalogLogo;
      if (urlToDelete) {
        try {
          await firebaseStorageService.deleteImage(urlToDelete);
        } catch (storageError) {
          console.warn('Erro ao deletar catalogLogo do Storage (continuando):', storageError);
        }
      }
      await firebaseSettingsService.updateCatalogLogo(user.uid, null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover banner do catálogo / lojinha pública
  const removeCatalogBanner = async (bannerUrlToDelete?: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const urlToDelete = bannerUrlToDelete || settings?.catalogBanner;
      if (urlToDelete) {
        try {
          await firebaseStorageService.deleteImage(urlToDelete);
        } catch (storageError) {
          console.warn('Erro ao deletar catalogBanner do Storage (continuando):', storageError);
        }
      }
      await firebaseSettingsService.updateCatalogBanner(user.uid, null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover imagem de fundo da barra superior fixa
  const removeCatalogHeaderBackground = async (bgUrlToDelete?: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const urlToDelete = bgUrlToDelete || settings?.catalogHeaderBackground;
      if (urlToDelete) {
        try {
          await firebaseStorageService.deleteImage(urlToDelete);
        } catch (storageError) {
          console.warn('Erro ao deletar catalogHeaderBackground do Storage (continuando):', storageError);
        }
      }
      await firebaseSettingsService.updateCatalogHeaderBackground(user.uid, null);
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

  // Upload de foto/imagem da seção Quem Somos / Sobre o Ateliê
  const uploadCatalogAboutImage = async (file: File, oldUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      if (oldUrl) {
        try {
          await firebaseStorageService.deleteImage(oldUrl);
        } catch (deleteError) {
          console.warn('Não foi possível deletar catalogAboutImageUrl antigo (continuando):', deleteError);
        }
      }

      const url = await firebaseStorageService.uploadImage(file, user.uid, 'catalog-about');
      await firebaseSettingsService.updateCatalogAboutImage(user.uid, url);

      return url;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover foto da seção Quem Somos
  const removeCatalogAboutImage = async (oldUrl?: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const urlToDelete = oldUrl || settings?.catalogAboutImageUrl;
      if (urlToDelete) {
        try {
          await firebaseStorageService.deleteImage(urlToDelete);
        } catch (storageError) {
          console.warn('Erro ao deletar imagem do Storage (continuando):', storageError);
        }
      }
      await firebaseSettingsService.updateCatalogAboutImage(user.uid, null);
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
      if (settings?.catalogLogo) {
        await firebaseStorageService.deleteImage(settings.catalogLogo);
      }
      if (settings?.catalogBanner) {
        await firebaseStorageService.deleteImage(settings.catalogBanner);
      }
      if (settings?.catalogHeaderBackground) {
        await firebaseStorageService.deleteImage(settings.catalogHeaderBackground);
      }
      if (settings?.catalogAboutImageUrl) {
        await firebaseStorageService.deleteImage(settings.catalogAboutImageUrl);
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
    toggleStorePublished,
    uploadAvatar,
    uploadLogo,
    uploadCatalogLogo,
    uploadCatalogBanner,
    uploadCatalogBannerImage,
    deleteCatalogBannerImage,
    uploadCatalogHeaderBackground,
    uploadCatalogAboutImage,
    uploadBanner,
    removeAvatar,
    removeLogo,
    removeCatalogLogo,
    removeCatalogBanner,
    removeCatalogHeaderBackground,
    removeCatalogAboutImage,
    removeBanner,
    resetToDefaults,
  };
}
