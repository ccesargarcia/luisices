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
  | 'application/pdf';

export interface FileSignatureValidationResult {
  valid: boolean;
  detectedMime: AllowedStorageMime | null;
  error?: string;
}

const MAX_IMAGE_PIXELS = 40_000_000;

async function decodeRasterImage(file: File | Blob): Promise<boolean> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try {
      return bitmap.width > 0 && bitmap.height > 0 && bitmap.width * bitmap.height <= MAX_IMAGE_PIXELS;
    } finally {
      bitmap.close();
    }
  }

  // Navegadores antigos: usa o decoder nativo de imagem do elemento Image.
  if (typeof Image !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(file);
    try {
      return await new Promise<boolean>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0
          && image.naturalWidth * image.naturalHeight <= MAX_IMAGE_PIXELS);
        image.onerror = () => resolve(false);
        image.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // Se não houver decoder nativo, falha fechado: a assinatura sozinha não prova que a imagem decodifica.
  return false;
}

/**
 * Verifica o formato real antes de qualquer gravação no Firebase Storage.
 * Imagens raster também são decodificadas pelo navegador; SVG foi removido da allowlist
 * porque regras do Storage validam metadados, não conseguem sanitizar XML ativo.
 */
export async function validateFileSignature(
  file: File | Blob,
  allowedMimes?: AllowedStorageMime[]
): Promise<FileSignatureValidationResult> {
  if (!file || file.size < 14) {
    return { valid: false, detectedMime: null, error: 'Arquivo vazio, truncado ou inválido.' };
  }

  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  let detectedMime: AllowedStorageMime | null = null;

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, index) => bytes[index] === byte)) {
    if (file.size < 33 || bytes[8] !== 0 || bytes[9] !== 0 || bytes[10] !== 0 || bytes[11] !== 13
      || bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
      return { valid: false, detectedMime: null, error: 'Imagem PNG incompleta ou inválida.' };
    }
    detectedMime = 'image/png';
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const marker = bytes[3];
    const segmentLength = (bytes[4] << 8) | bytes[5];
    if (!((marker >= 0xe0 && marker <= 0xef) || marker === 0xdb
      || (marker >= 0xc0 && marker <= 0xc3) || marker === 0xfe)
      || segmentLength < 2 || segmentLength + 4 > file.size) {
      return { valid: false, detectedMime: null, error: 'Imagem JPEG incompleta ou inválida.' };
    }
    detectedMime = 'image/jpeg';
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    const view = new DataView(await file.slice(0, 13).arrayBuffer());
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
      return { valid: false, detectedMime: null, error: 'Imagem GIF incompleta ou inválida.' };
    }
    detectedMime = 'image/gif';
  } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    const view = new DataView(await file.slice(0, 16).arrayBuffer());
    if (view.getUint32(4, true) + 8 !== file.size
      || !['VP8 ', 'VP8L', 'VP8X'].includes(String.fromCharCode(...bytes.slice(12, 16)))) {
      return { valid: false, detectedMime: null, error: 'Imagem WebP incompleta ou inválida.' };
    }
    detectedMime = 'image/webp';
  } else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44
    && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    const header = new TextDecoder().decode(await file.slice(0, 16).arrayBuffer());
    const tail = new TextDecoder().decode(await file.slice(Math.max(0, file.size - 4096)).arrayBuffer());
    if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r?\n|\r)/.test(header) || !/%%EOF[\x00\x09\x0a\x0c\x0d\x20]*$/.test(tail)) {
      return { valid: false, detectedMime: null, error: 'Documento PDF incompleto ou inválido.' };
    }
    detectedMime = 'application/pdf';
  }

  if (!detectedMime) {
    return { valid: false, detectedMime: null, error: 'Formato não suportado. Envie JPEG, PNG, WebP, GIF ou PDF.' };
  }
  if (allowedMimes?.length && !allowedMimes.includes(detectedMime)) {
    return { valid: false, detectedMime, error: `Formato detectado (${detectedMime}) não é permitido nesta operação.` };
  }
  if (file.type && file.type !== detectedMime && !(file.type === 'image/jpg' && detectedMime === 'image/jpeg')) {
    return { valid: false, detectedMime, error: `Tipo informado (${file.type}) não corresponde ao conteúdo (${detectedMime}).` };
  }

  if (detectedMime.startsWith('image/')) {
    try {
      if (!await decodeRasterImage(file)) {
        return { valid: false, detectedMime, error: 'A imagem está corrompida ou não pode ser decodificada.' };
      }
    } catch {
      return { valid: false, detectedMime, error: 'A imagem está corrompida ou não pode ser decodificada.' };
    }
  }
  return { valid: true, detectedMime };
}

export class FirebaseStorageService {
  /** Central gate for every client-side Storage write in this service. */
  private async uploadValidatedBytes(
    storageRef: ReturnType<typeof ref>,
    file: Blob,
    metadata: UploadMetadata | undefined,
    allowedMimes: AllowedStorageMime[],
  ): Promise<void> {
    const validation = await validateFileSignature(file, allowedMimes);
    if (!validation.valid || !validation.detectedMime) {
      throw new Error(validation.error || 'Arquivo inválido ou não permitido.');
    }
    await uploadBytes(storageRef, file, {
      ...metadata,
      contentType: validation.detectedMime,
    });
  }
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
    await this.uploadValidatedBytes(storageRef, optimizedFile, {
      customMetadata: { uploadedAt: new Date().toISOString() },
    }, ['image/jpeg', 'image/png', 'image/webp']);
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
    await this.uploadValidatedBytes(storageRef, optimizedFile, {
      customMetadata: { uploadedAt: new Date().toISOString() },
    }, ['image/jpeg', 'image/png', 'image/webp']);
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
    await this.uploadValidatedBytes(storageRef, optimizedFile, {
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: currentUid,
      },
    }, ['image/jpeg', 'image/png', 'image/webp']);
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
      : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
    await this.uploadValidatedBytes(
      storageRef,
      optimizedFile,
      metadata,
      folder === 'tracking-logo'
        ? ['image/jpeg', 'image/png', 'image/webp']
        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    );

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
    await this.uploadValidatedBytes(storageRef, optimizedFile, {
      customMetadata: { uploadedAt: new Date().toISOString() },
    }, ['image/jpeg', 'image/png', 'image/webp']);
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

    const finalAllowedMimes: AllowedStorageMime[] = isPdf
      ? ['application/pdf']
      : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const finalValidation = await validateFileSignature(fileToUpload, finalAllowedMimes);
    if (!finalValidation.valid || !finalValidation.detectedMime) {
      throw new Error(finalValidation.error || 'Arquivo inválido ou não permitido.');
    }
    metadata.contentType = finalValidation.detectedMime;
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
          await this.uploadValidatedBytes(thumbRef, thumbBlob, undefined, ['image/webp']);
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
