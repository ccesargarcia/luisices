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

  const cleanupImage = async (url: string | undefined, description: string): Promise<void> => {
    if (!url) return;
    try {
      await firebaseStorageService.deleteImage(url);
    } catch (storageError) {
      console.warn(`Não foi possível excluir ${description} do Storage:`, storageError);
    }
  };

  const uploadAndReplaceImage = async (
    file: File,
    folder: Parameters<typeof firebaseStorageService.uploadImage>[2],
    oldUrl: string | undefined,
    description: string,
    persist: (url: string) => Promise<void>
  ): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    const newUrl = await firebaseStorageService.uploadImage(file, user.uid, folder);
    try {
      await persist(newUrl);
    } catch (error) {
      await cleanupImage(newUrl, 'a nova imagem que não foi salva');
      throw error;
    }
    if (oldUrl && oldUrl !== newUrl) await cleanupImage(oldUrl, description);
    return newUrl;
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
      return await uploadAndReplaceImage(file, 'avatar', settings?.avatar, 'o avatar antigo',
        (url) => firebaseSettingsService.updateAvatar(user.uid, url));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de logo
  const uploadLogo = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      return await uploadAndReplaceImage(file, 'logo', settings?.logo, 'a logo antiga',
        (url) => firebaseSettingsService.updateLogo(user.uid, url));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Logo exclusiva da página pública de acompanhamento; não altera a logo do painel.
  const uploadOrderTrackingLogo = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    return firebaseStorageService.uploadImage(file, user.uid, 'tracking-logo');
  };

  // Upload de logo exclusivo do catálogo / lojinha pública online
  const uploadCatalogLogo = async (file: File, previousLogoUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      return await uploadAndReplaceImage(file, 'catalog-logo', previousLogoUrl || settings?.catalogLogo,
        'a logo antiga do catálogo', (url) => firebaseSettingsService.updateCatalogLogo(user.uid, url));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de banner da lojinha pública (formato LinkedIn / 4:1)
  const uploadCatalogBanner = async (file: File, oldUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      return await uploadAndReplaceImage(file, 'catalog-banner', oldUrl || settings?.catalogBanner,
        'o banner antigo do catálogo', (url) => firebaseSettingsService.updateCatalogBanner(user.uid, url));
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
      return await uploadAndReplaceImage(file, 'catalog-header', oldUrl || settings?.catalogHeaderBackground,
        'o fundo antigo do cabeçalho', (url) => firebaseSettingsService.updateCatalogHeaderBackground(user.uid, url));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de banner
  const uploadBanner = async (file: File): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      return await uploadAndReplaceImage(file, 'banner', settings?.banner, 'o banner antigo',
        (url) => firebaseSettingsService.updateBanner(user.uid, url));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover avatar
  const removeAvatar = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const oldUrl = settings?.avatar;
      await firebaseSettingsService.updateAvatar(user.uid, null);
      await cleanupImage(oldUrl, 'o avatar removido');
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover logo
  const removeLogo = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const oldUrl = settings?.logo;
      await firebaseSettingsService.updateLogo(user.uid, null);
      await cleanupImage(oldUrl, 'a logo removida');
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
      await firebaseSettingsService.updateCatalogLogo(user.uid, null);
      await cleanupImage(urlToDelete, 'a logo removida do catálogo');
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
      await firebaseSettingsService.updateCatalogBanner(user.uid, null);
      await cleanupImage(urlToDelete, 'o banner removido do catálogo');
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
      await firebaseSettingsService.updateCatalogHeaderBackground(user.uid, null);
      await cleanupImage(urlToDelete, 'o fundo removido do cabeçalho');
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Remover banner
  const removeBanner = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const oldUrl = settings?.banner;
      await firebaseSettingsService.updateBanner(user.uid, null);
      await cleanupImage(oldUrl, 'o banner removido');
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Upload de foto/imagem da seção Quem Somos / Sobre o Ateliê
  const uploadCatalogAboutImage = async (file: File, oldUrl?: string): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      return await uploadAndReplaceImage(file, 'catalog-about', oldUrl || settings?.catalogAboutImageUrl,
        'a imagem antiga da seção Sobre', (url) => firebaseSettingsService.updateCatalogAboutImage(user.uid, url));
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
      await firebaseSettingsService.updateCatalogAboutImage(user.uid, null);
      await cleanupImage(urlToDelete, 'a imagem removida da seção Sobre');
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Resetar para padrões
  const resetToDefaults = async () => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const imageUrls = new Set([
        settings?.avatar,
        settings?.logo,
        settings?.catalogLogo,
        settings?.catalogBanner,
        settings?.catalogHeaderBackground,
        settings?.catalogAboutImageUrl,
        settings?.banner,
        settings?.orderTrackingTemplate?.logoUrl,
        ...(settings?.catalogBanners || []).map((banner) => banner.imageUrl),
      ].filter((url): url is string => Boolean(url)));

      // Primeiro limpa as referências no banco; falha no Storage pode deixar
      // um arquivo órfão, mas não uma configuração apontando para imagem apagada.
      await firebaseSettingsService.resetToDefaults(user.uid);

      const deletionResults = await Promise.allSettled(
        [...imageUrls].map((url) => firebaseStorageService.deleteImage(url))
      );
      deletionResults.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('Não foi possível excluir uma imagem após restaurar as configurações:', result.reason);
        }
      });
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
    uploadOrderTrackingLogo,
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
