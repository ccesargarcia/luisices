/**
 * Firebase Storage Service
 *
 * Serviço para upload e gerenciamento de arquivos no Firebase Storage
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import type { OrderAttachment } from '../app/types';

export class FirebaseStorageService {
  /**
   * Upload de foto de cliente
   */
  async uploadCustomerPhoto(file: File, userId: string, customerId: string): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Arquivo deve ser uma imagem');
    if (file.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB');

    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `customer_${customerId}_${timestamp}.${ext}`;
    const storageRef = ref(storage, `users/${userId}/customers/${fileName}`);
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return getDownloadURL(storageRef);
  }

  /**
   * Upload de imagem com redimensionamento automático
   * @param file - Arquivo de imagem
   * @param userId - ID do usuário
   * @param folder - Pasta de destino (avatar, logo, banner)
   * @returns URL pública da imagem
   */
  async uploadImage(
    file: File,
    userId: string,
    folder: 'avatar' | 'logo' | 'banner'
  ): Promise<string> {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      throw new Error('Arquivo deve ser uma imagem');
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Imagem muito grande. Máximo: 5MB');
    }

    // Criar referência única
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${folder}_${timestamp}.${extension}`;
    const storagePath = `users/${userId}/${folder}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Metadata
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    };

    // Upload
    await uploadBytes(storageRef, file, metadata);

    // Obter URL pública
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }

  /**
   * Gerar thumbnail de imagem via Canvas (máx 300px no lado maior)
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
   * Upload de anexo de pedido (imagem ou PDF, máx 100MB)
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
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo: 100MB');
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${safeName}`;
    const storagePath = `users/${userId}/orders/${orderId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    };

    await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(storageRef);

    // Gerar e fazer upload da thumbnail para imagens
    let thumbnailUrl: string | undefined;
    const isPdf = file.type === 'application/pdf';
    if (!isPdf) {
      const thumbBlob = await this.generateThumbnail(file);
      if (thumbBlob) {
        const thumbPath = `users/${userId}/orders/${orderId}/thumbnails/${timestamp}_thumb_${safeName.replace(/\.[^.]+$/, '')}.webp`;
        const thumbRef = ref(storage, thumbPath);
        await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/webp' });
        thumbnailUrl = await getDownloadURL(thumbRef);
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
      // Extrair path do storage da URL
      const path = this.extractPathFromUrl(imageUrl);
      if (!path) return;

      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      // Não lançar erro - imagem pode já ter sido deletada
    }
  }

  /**
   * Extrair path do storage da URL pública
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const match = url.match(/\/o\/(.+?)\?/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const firebaseStorageService = new FirebaseStorageService();
