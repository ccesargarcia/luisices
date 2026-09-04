/**
 * Firebase User Management Service
 *
 * Gerencia criação e perfis de usuários.
 * Usa a REST API do Firebase Auth para criar usuários sem deslogar o admin.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole, Permission, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from '../app/types';

const USERS_COLLECTION = 'userProfiles';

export class FirebaseUserService {
  /**
   * Cria um novo usuário via Firebase Auth REST API (sem deslogar o admin atual),
   * depois salva o UserProfile no Firestore.
   */
  async createUser(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    permissions: Permission,
    createdBy: string,
  ): Promise<UserProfile> {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, returnSecureToken: false }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      const msg = err?.error?.message || 'Erro ao criar usuário';
      throw new Error(msg);
    }

    const data = await res.json();
    const uid: string = data.localId;

    const profile: UserProfile = {
      uid,
      email,
      displayName,
      role,
      permissions,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy,
    };

    await setDoc(doc(db, USERS_COLLECTION, uid), profile);
    return profile;
  }

  /**
   * Busca o perfil de um usuário no Firestore.
   * Se não existir, cria um perfil padrão de admin (primeiro usuário do sistema).
   */
  async getUserProfile(uid: string, email?: string, displayName?: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (snap.exists()) return snap.data() as UserProfile;

    // Cria perfil admin automaticamente ao primeiro acesso
    if (email) {
      const profile: UserProfile = {
        uid,
        email,
        displayName: displayName || email,
        role: 'admin',
        permissions: ADMIN_PERMISSIONS,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: uid,
      };
      await setDoc(doc(db, USERS_COLLECTION, uid), profile);
      return profile;
    }

    return null;
  }

  /**
   * Lista todos os perfis de usuários.
   */
  async listUsers(): Promise<UserProfile[]> {
    const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  }

  /**
   * Atualiza dados do perfil (role, permissions, displayName, active).
   */
  async updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'createdBy'>>): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, uid), data as Record<string, unknown>);
  }

  /**
   * Ativa ou desativa um usuário (soft-delete).
   */
  async setUserActive(uid: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, uid), { active });
  }

  /**
   * Retorna permissões padrão por role.
   */
  getDefaultPermissions(role: UserRole): Permission {
    return role === 'admin' ? { ...ADMIN_PERMISSIONS } : { ...DEFAULT_USER_PERMISSIONS };
  }
}

export const firebaseUserService = new FirebaseUserService();
