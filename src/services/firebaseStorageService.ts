/**
 * Firebase Storage Service
 *
 * Serviço para upload e gerenciamento de arquivos no Firebase Storage
 * com otimização automática para formato WebP e compressão inteligente client-side.
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import type { OrderAttachment } from '../app/types';
import { optimizeImageToWebP } from '../app/utils/imageOptimizer';
import { toCdnUrl } from '../app/utils/cdnUtils';

export class FirebaseStorageService {
  /**
   * Upload de foto de cliente (otimizada em WebP)
   */
  async uploadCustomerPhoto(file: File, userId: string, customerId: string): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Arquivo deve ser uma imagem');

    // Otimiza para WebP com resolução máxima de 1200px (excelente para avatares e fichas de cliente)
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 1200, quality: 0.85 });
    if (optimizedFile.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `customer_${customerId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/customers/${fileName}`);
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return toCdnUrl(await getDownloadURL(storageRef));
  }

  /**
   * Upload de foto de produto (otimizada em WebP)
   */
  async uploadProductPhoto(file: File, userId: string, productId: string): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Arquivo deve ser uma imagem');

    // Otimiza para WebP em resolução Full HD (1920px) para alta fidelidade e rápida renderização
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 1920, quality: 0.85 });
    if (optimizedFile.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `product_${productId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/products/${fileName}`);
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return toCdnUrl(await getDownloadURL(storageRef));
  }

  /**
   * Upload de foto de produto da vitrine da lojinha pública (otimizada em WebP)
   */
  async uploadStoreProductPhoto(file: File, productId: string): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Arquivo deve ser uma imagem');

    // Otimiza para WebP garantindo carregamento instantâneo para clientes no mobile
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 1920, quality: 0.85 });
    if (optimizedFile.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `store_product_${productId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `store/products/${fileName}`);
    const currentUid = auth.currentUser?.uid || '';
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: currentUid,
      },
    });
    return toCdnUrl(await getDownloadURL(storageRef));
  }

  /**
   * Upload de imagem com redimensionamento automático e conversão WebP
   * @param file - Arquivo de imagem
   * @param userId - ID do usuário
   * @param folder - Pasta de destino (avatar, logo, banner, etc.)
   * @returns URL pública da imagem
   */
  async uploadImage(
    file: File,
    userId: string,
    folder: 'avatar' | 'logo' | 'banner' | 'catalog-logo' | 'catalog-banner' | 'catalog-header' | 'catalog-about'
  ): Promise<string> {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedImageTypes.includes(file.type)) {
      throw new Error('Formato não suportado. Envie uma imagem JPG, PNG ou WebP.');
    }

    // Definir resolução máxima ideal dependendo do tipo de imagem
    const maxDimension =
      folder === 'banner' || folder === 'catalog-banner' || folder === 'catalog-header' || folder === 'catalog-about'
        ? 2560
        : folder === 'avatar' || folder === 'logo' || folder === 'catalog-logo'
        ? 1000
        : 1920;

    const optimizedFile = await optimizeImageToWebP(file, {
      maxDimension,
      quality: 0.88,
    });

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (optimizedFile.size > maxSize) {
      throw new Error('Imagem muito grande. Máximo: 5MB');
    }

    // Criar referência única
    const timestamp = Date.now();
    const extension = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `${folder}_${timestamp}.${extension}`;
    const storagePath = folder.startsWith('catalog-')
      ? `store/${folder}/${fileName}`
      : `users/${userId}/${folder}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Metadata
    const currentUid = auth.currentUser?.uid || userId;
    const metadata: UploadMetadata = {
      contentType: optimizedFile.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: currentUid,
      },
    };

    // Upload
    await uploadBytes(storageRef, optimizedFile, metadata);

    // Obter URL pública
    const downloadURL = await getDownloadURL(storageRef);
    return toCdnUrl(downloadURL);
  }

  /**
   * Upload de imagem da galeria de artes (otimizada em WebP, máx 2048px)
   */
  async uploadGalleryImage(file: File, userId: string, itemId: string): Promise<string> {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedImageTypes.includes(file.type)) {
      throw new Error('Formato não suportado. Envie uma imagem JPG, PNG ou WebP.');
    }

    // Otimiza galeria para WebP 2048px com alta qualidade para zoom de artes
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 2048, quality: 0.88 });
    if (optimizedFile.size > 15 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 15MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `gallery_${itemId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/gallery/${fileName}`);
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return toCdnUrl(await getDownloadURL(storageRef));
  }

  /**
   * Gerar thumbnail de imagem via Canvas (máx 300px no lado maior em WebP)
   */
  private generateThumbnail(file: File, maxPx = 300): Promise<Blob | null> {
    return new Promise(resolve => {
      if (!file.type.startsWith('image/')) { resolve(null); return; }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob), 'image/webp', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
      img.src = objectUrl;
    });
  }

  /**
   * Upload de anexo de pedido (imagem convertida para WebP ou PDF original, máx 100MB)
   * @param file - Arquivo a enviar
   * @param userId - ID do usuário
   * @param orderId - ID do pedido
   * @returns OrderAttachment com url original e thumbnail (se imagem)
   */
  async uploadOrderAttachment(
    file: File,
    userId: string,
    orderId: string
  ): Promise<OrderAttachment> {
    const isPdf = file.type === 'application/pdf';
    
    // Se for imagem, otimiza para WebP antes de salvar
    const fileToUpload = isPdf
      ? file
      : await optimizeImageToWebP(file, { maxDimension: 2048, quality: 0.85 });

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileToUpload.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo: 100MB');
    }

    const timestamp = Date.now();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${safeName}`;
    const storagePath = `users/${userId}/orders/${orderId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata: UploadMetadata = {
      contentType: fileToUpload.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    };

    await uploadBytes(storageRef, fileToUpload, metadata);
    const rawUrl = await getDownloadURL(storageRef);
    const url = toCdnUrl(rawUrl);

    // Gerar e fazer upload da thumbnail para imagens
    let thumbnailUrl: string | undefined;
    if (!isPdf) {
      const thumbBlob = await this.generateThumbnail(fileToUpload);
      if (thumbBlob) {
        const thumbPath = `users/${userId}/orders/${orderId}/thumbnails/${timestamp}_thumb_${safeName.replace(/\.[^.]+$/, '')}.webp`;
        const thumbRef = ref(storage, thumbPath);
        await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/webp' });
        thumbnailUrl = toCdnUrl(await getDownloadURL(thumbRef));
      }
    }

    return { url, thumbnail: thumbnailUrl, name: file.name, isPdf };
  }

  /**
   * Deletar imagem
   * @param imageUrl - URL completa da imagem
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const path = this.extractPathFromUrl(imageUrl);
      if (!path) return;

      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
    }
  }

  /**
   * Extrair path do storage da URL pública
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      // 1. URL padrão do Firebase Storage: /o/<path>?...
      const match = url.match(/\/o\/(.+?)(\?|$)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }

      // 2. URL com domínio CDN configurado
      const cdnBase = import.meta.env.VITE_STORAGE_CDN_URL;
      if (cdnBase && url.startsWith(cdnBase)) {
        const pathWithQuery = url.slice(cdnBase.length).replace(/^\/+/, '');
        const cleanPath = pathWithQuery.split('?')[0];
        return decodeURIComponent(cleanPath);
      }

      // 3. Fallback genérico para URLs CDN (extrai pathname)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url);
        const pathname = parsed.pathname.replace(/^\/+/, '');
        if (pathname) {
          return decodeURIComponent(pathname);
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const firebaseStorageService = new FirebaseStorageService();
