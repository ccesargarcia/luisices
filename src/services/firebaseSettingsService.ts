/**
 * Firebase Settings Service
 *
 * Serviço para gerenciar configurações e personalização do usuário
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
    console.log('Updating settings for user:', userId, settings);
    const docRef = doc(db, 'users', userId, 'settings', 'profile');
    
    // Verificar se documento existe
    const docSnap = await getDoc(docRef);

    const data = {
      ...settings,
      userId,
      updatedAt: new Date(),
    };

    console.log('Data to save:', data);

    if (docSnap.exists()) {
      console.log('Document exists, updating...');
      await updateDoc(docRef, data);
    } else {
      console.log('Document does not exist, creating...');
      await setDoc(docRef, data);
    }
    
    console.log('Settings updated successfully');
  }

  /**
   * Atualizar avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    await this.updateSettings(userId, { avatar: avatarUrl });
  }

  /**
   * Atualizar logo
   */
  async updateLogo(userId: string, logoUrl: string): Promise<void> {
    await this.updateSettings(userId, { logo: logoUrl });
  }

  /**
   * Atualizar banner
   */
  async updateBanner(userId: string, bannerUrl: string): Promise<void> {
    await this.updateSettings(userId, { banner: bannerUrl });
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
