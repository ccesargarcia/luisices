/**
 * Firebase Storage Service
 *
 * Serviço para upload e gerenciamento de arquivos no Firebase Storage
 * com otimização automática para formato WebP e compressão inteligente client-side.
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import type { OrderAttachment } from '../app/types';
import { optimizeImageToWebP } from '../app/utils/imageOptimizer';
import { toCdnUrl, toPublicCdnUrl } from '../app/utils/cdnUtils';

export type AllowedStorageMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'image/svg+xml'
  | 'application/pdf';

export interface FileSignatureValidationResult {
  valid: boolean;
  detectedMime: AllowedStorageMime | null;
  error?: string;
}

/**
 * Validação rigorosa de assinatura binária (magic bytes) no client-side antes do upload.
 * Impede que arquivos maliciosos (scripts, executáveis, HTML disfarçado) sejam enviados
 * mesmo quando o cabeçalho HTTP ou a extensão do arquivo tiverem sido forjados.
 */
export async function validateFileSignature(
  file: File | Blob,
  allowedMimes?: AllowedStorageMime[]
): Promise<FileSignatureValidationResult> {
  if (!file || file.size < 4) {
    return { valid: false, detectedMime: null, error: 'Arquivo inválido ou vazio.' };
  }

  // Lê os primeiros 16 bytes para análise de magic numbers
  const headerSlice = file.slice(0, 16);
  const buffer = await headerSlice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let detectedMime: AllowedStorageMime | null = null;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    detectedMime = 'image/png';
  }
  // JPEG / JPG: FF D8 FF
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detectedMime = 'image/jpeg';
  }
  // GIF: 47 49 46 38 ('GIF8')
  else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    detectedMime = 'image/gif';
  }
  // PDF: 25 50 44 46 ('%PDF')
  else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    detectedMime = 'application/pdf';
  }
  // WebP: RIFF (52 49 46 46) em 0..3 e WEBP (57 45 42 50) em 8..11
  else if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    detectedMime = 'image/webp';
  }
  // SVG: verificação textual com bloqueio de Stored XSS
  else if (file.type === 'image/svg+xml') {
    const textSlice = file.slice(0, 1024);
    const text = await textSlice.text();
    const clean = text.replace(/^\uFEFF/, '').trim();
    if (clean.startsWith('<?xml') || clean.startsWith('<svg') || /<svg[\s>]/i.test(clean)) {
      if (/<script[\s>]/i.test(text) || /javascript:/i.test(text) || /on\w+\s*=/i.test(text)) {
        return {
          valid: false,
          detectedMime: null,
          error: 'Arquivo SVG contém scripts ou manipuladores de eventos proibidos.',
        };
      }
      detectedMime = 'image/svg+xml';
    }
  }

  if (!detectedMime) {
    return {
      valid: false,
      detectedMime: null,
      error: 'Assinatura binária do arquivo (magic bytes) desconhecida ou formato não suportado.',
    };
  }

  if (allowedMimes && allowedMimes.length > 0) {
    if (!allowedMimes.includes(detectedMime)) {
      return {
        valid: false,
        detectedMime,
        error: `Tipo de arquivo detectado (${detectedMime}) não é permitido nesta operação.`,
      };
    }
  }

  if (file.type && file.type !== detectedMime) {
    const isBothJpeg = (file.type === 'image/jpeg' || file.type === 'image/jpg') && detectedMime === 'image/jpeg';
    if (!isBothJpeg) {
      return {
        valid: false,
        detectedMime,
        error: `Inconsistência de arquivo: declarado como "${file.type}", mas conteúdo real é "${detectedMime}".`,
      };
    }
  }

  return { valid: true, detectedMime };
}

export class FirebaseStorageService {
  /**
   * Upload de foto de cliente (otimizada em WebP)
   */
  async uploadCustomerPhoto(file: File, userId: string, customerId: string): Promise<string> {
    const validation = await validateFileSignature(file, ['image/jpeg', 'image/png', 'image/webp']);
    if (!validation.valid) throw new Error(validation.error || 'Arquivo deve ser uma imagem válida (JPEG, PNG ou WebP).');

    // Otimiza para WebP com resolução máxima de 1200px (excelente para avatares e fichas de cliente)
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 1200, quality: 0.85, fallbackOnError: false });
    if (optimizedFile.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `customer_${customerId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/customers/${fileName}`);
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return toPublicCdnUrl(storageRef.fullPath);
  }

  /**
   * Upload de foto de produto (otimizada em WebP)
   */
  async uploadProductPhoto(file: File, userId: string, productId: string): Promise<string> {
    const validation = await validateFileSignature(file, ['image/jpeg', 'image/png', 'image/webp']);
    if (!validation.valid) throw new Error(validation.error || 'Arquivo deve ser uma imagem válida (JPEG, PNG ou WebP).');

    // Otimiza para WebP em resolução Full HD (1920px) para alta fidelidade e rápida renderização
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 1920, quality: 0.85, fallbackOnError: false });
    if (optimizedFile.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `product_${productId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/products/${fileName}`);
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return toPublicCdnUrl(storageRef.fullPath);
  }

  /**
   * Upload de foto de produto da vitrine da lojinha pública (otimizada em WebP)
   */
  async uploadStoreProductPhoto(file: File, productId: string): Promise<string> {
    const validation = await validateFileSignature(file, ['image/jpeg', 'image/png', 'image/webp']);
    if (!validation.valid) throw new Error(validation.error || 'Arquivo deve ser uma imagem válida (JPEG, PNG ou WebP).');

    // Otimiza para WebP garantindo carregamento instantâneo para clientes no mobile
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 1920, quality: 0.85, fallbackOnError: false });
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
    return toPublicCdnUrl(storageRef.fullPath);
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
    folder: 'avatar' | 'logo' | 'tracking-logo' | 'banner' | 'catalog-logo' | 'catalog-banner' | 'catalog-header' | 'catalog-about'
  ): Promise<string> {
    const allowedImageTypes: AllowedStorageMime[] = folder === 'tracking-logo'
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

    if (folder === 'tracking-logo' && file.size > 5 * 1024 * 1024) {
      throw new Error('A logo do acompanhamento deve ter no máximo 5 MB.');
    }

    const validation = await validateFileSignature(file, allowedImageTypes);
    if (!validation.valid) {
      throw new Error(validation.error || 'Formato não suportado. Envie uma imagem JPG, PNG ou WebP.');
    }

    // Definir resolução máxima ideal dependendo do tipo de imagem
    const maxDimension =
      folder === 'banner' || folder === 'catalog-banner' || folder === 'catalog-header' || folder === 'catalog-about'
        ? 2560
        : folder === 'avatar' || folder === 'logo' || folder === 'tracking-logo' || folder === 'catalog-logo'
        ? 1000
        : 1920;

    const optimizedFile = await optimizeImageToWebP(file, {
      maxDimension,
      quality: 0.88,
      fallbackOnError: false,
      forceResize: folder === 'tracking-logo',
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
    return toPublicCdnUrl(storageRef.fullPath);
  }

  /**
   * Upload de imagem da galeria de artes (otimizada em WebP, máx 2048px)
   */
  async uploadGalleryImage(file: File, userId: string, itemId: string): Promise<string> {
    const validation = await validateFileSignature(file, ['image/jpeg', 'image/png', 'image/webp']);
    if (!validation.valid) {
      throw new Error(validation.error || 'Formato não suportado. Envie uma imagem JPG, PNG ou WebP.');
    }

    // Otimiza galeria para WebP 2048px com alta qualidade para zoom de artes
    const optimizedFile = await optimizeImageToWebP(file, { maxDimension: 2048, quality: 0.88, fallbackOnError: false });
    if (optimizedFile.size > 15 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 15MB');

    const timestamp = Date.now();
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `gallery_${itemId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/gallery/${fileName}`);
    await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    // A galeria é privada: persistimos somente o caminho, nunca uma URL/token.
    return storageRef.fullPath;
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
    orderId: string,
    onProgress?: (progress: number) => void,
  ): Promise<OrderAttachment> {
    const validation = await validateFileSignature(file, [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]);
    if (!validation.valid) {
      throw new Error(validation.error || 'Arquivo com formato ou conteúdo inválido.');
    }

    const isPdf = validation.detectedMime === 'application/pdf';
    onProgress?.(0);
    
    // Se for imagem, otimiza para WebP antes de salvar (sem fallback silencioso para arquivos corrompidos)
    const fileToUpload = isPdf
      ? file
      : await optimizeImageToWebP(file, { maxDimension: 2048, quality: 0.85, fallbackOnError: false });

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileToUpload.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo: 100MB');
    }
    onProgress?.(5);

    const currentUid = auth.currentUser?.uid || userId;
    const timestamp = Date.now();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${safeName}`;
    const storagePath = `users/${currentUid}/orders/${orderId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata: UploadMetadata = {
      contentType: fileToUpload.type || (file.type ? file.type : 'application/octet-stream'),
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        userId: currentUid,
        ...(orderId === 'email_draft'
          ? { emailDraft: 'true', uploadedAtMs: String(Date.now()) }
          : {}),
      },
    };

    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);
    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const ratio = snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
          onProgress?.(5 + Math.round(ratio * 90));
        },
        reject,
        resolve,
      );
    });
    const rawUrl = await getDownloadURL(storageRef);
    const url = orderId === 'email_draft' ? rawUrl : toCdnUrl(rawUrl);

    // Gerar e fazer upload da thumbnail para imagens
    let thumbnailUrl: string | undefined;
    if (!isPdf && (fileToUpload.type?.startsWith('image/') || file.type?.startsWith('image/'))) {
      onProgress?.(95);
      try {
        const thumbBlob = await this.generateThumbnail(fileToUpload);
        if (thumbBlob) {
          const thumbPath = `users/${currentUid}/orders/${orderId}/thumbnails/${timestamp}_thumb_${safeName.replace(/\.[^.]+$/, '')}.webp`;
          const thumbRef = ref(storage, thumbPath);
          await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/webp' });
          const rawThumbnail = await getDownloadURL(thumbRef);
          thumbnailUrl = orderId === 'email_draft' ? rawThumbnail : toCdnUrl(rawThumbnail);
        }
      } catch (err) {
        console.warn('[StorageService] Não foi possível gerar thumbnail para anexo:', err);
      }
    }

    onProgress?.(100);

    return { url, thumbnail: thumbnailUrl, name: file.name, isPdf };
  }

  /**
   * Upload de anexo de e-mail (salvo em users/${userId}/orders/email_draft/ com leitura restrita ao dono/admin)
   * @param file - Arquivo a enviar
   * @param userId - ID do usuário
   * @returns OrderAttachment com URL individual autenticada por token para a prévia
   */
  async uploadEmailAttachment(
    file: File,
    userId: string
  ): Promise<OrderAttachment> {
    return this.uploadOrderAttachment(file, userId, 'email_draft');
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
