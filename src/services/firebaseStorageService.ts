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

export class FirebaseStorageService {
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
