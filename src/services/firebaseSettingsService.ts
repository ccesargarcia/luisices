/**
 * Firebase Settings Service
 *
 * Serviço para gerenciar configurações e personalização do usuário
 */

import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserSettings {
  userId: string;
  
  // Personalização visual
  avatar?: string; // URL da imagem
  logo?: string; // URL da logo
  banner?: string; // URL do banner
  
  // Informações do negócio
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  
  // Tema e cores
  primaryColor?: string;
  accentColor?: string;
  
  // Metadata
  updatedAt: Date;
}

export class FirebaseSettingsService {
  /**
   * Obter configurações do usuário
   */
  async getSettings(userId: string): Promise<UserSettings | null> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserSettings;
    }

    return null;
  }

  /**
   * Atualizar configurações do usuário
   */
  async updateSettings(
    userId: string,
    settings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    
    // Verificar se documento existe
    const docSnap = await getDoc(docRef);

    const data = {
      ...settings,
      userId,
      updatedAt: new Date(),
    };

    if (docSnap.exists()) {
      await updateDoc(docRef, data);
    } else {
      await setDoc(docRef, data);
    }
  }

  /**
   * Atualizar avatar
   */
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await updateDoc(docRef, {
      avatar: avatarUrl === null ? deleteField() : avatarUrl,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualizar logo
   */
  async updateLogo(userId: string, logoUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await updateDoc(docRef, {
      logo: logoUrl === null ? deleteField() : logoUrl,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualizar banner
   */
  async updateBanner(userId: string, bannerUrl: string | null): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await updateDoc(docRef, {
      banner: bannerUrl === null ? deleteField() : bannerUrl,
      updatedAt: new Date(),
    });
  }

  /**
   * Resetar para configurações padrão
   */
  async resetToDefaults(userId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    await setDoc(docRef, {
      userId,
      updatedAt: new Date(),
    });
  }
}

export const firebaseSettingsService = new FirebaseSettingsService();
