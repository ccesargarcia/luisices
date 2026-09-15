/**
 * Firebase User Management Service
 *
 * Gerencia criação e perfis de usuários.
 * Usa Cloud Functions para operações sensíveis (createUser, deleteUser) com validação de admin no servidor.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { UserProfile, UserRole, Permission, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../app/types';

const USERS_COLLECTION = 'userProfiles';

export class FirebaseUserService {
  async sendAdminPasswordReset(email: string): Promise<void> {
    const callable = httpsCallable(functions, 'sendAdminPasswordReset');
    await callable({ email });
  }

  async createUserInvitation(email: string, whatsappPhone?: string): Promise<{ expiresAt: string }> {
    const callable = httpsCallable<{ email: string; whatsappPhone?: string }, { success: boolean; expiresAt: string }>(
      functions,
      'createUserInvitation',
    );
    const result = await callable({ email, whatsappPhone });
    return result.data;
  }
  /**
   * Cria um novo usuário via Cloud Function segura (com validação de admin no servidor),
   * depois retorna o UserProfile criado.
   */
  async createUser(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    permissions: Permission,
    createdBy: string,
  ): Promise<UserProfile> {
    const callable = httpsCallable<
      { email: string; password: string; displayName: string; role: string; permissions: Permission; createdBy: string },
      { success: boolean; uid: string; profile: UserProfile }
    >(functions, 'createUser');

    const result = await callable({ email, password, displayName, role, permissions, createdBy });
    return result.data.profile;
  }

  /**
   * Busca o perfil de um usuário no Firestore.
   * Se não existir, inicializa automaticamente com perfil padrão de usuário ('user') e DEFAULT_USER_PERMISSIONS.
   */
  async getUserProfile(uid: string, email?: string, displayName?: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (snap.exists()) return snap.data() as UserProfile;

    // Se o usuário está autenticado mas ainda não tem perfil salvo no Firestore,
    // inicializa automaticamente com perfil de usuário comum e permissões padrão.
    if (email && auth.currentUser) {
      const profile: UserProfile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: 'user',
        permissions: { ...DEFAULT_USER_PERMISSIONS },
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
   * Remove permanentemente um usuário (Firebase Auth + Firestore).
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      const callable = httpsCallable<{ uid: string }, { success: boolean }>(functions, 'deleteUser');
      await callable({ uid });
    } catch (err) {
      console.warn('[firebaseUserService.deleteUser] Callable failed, deleting directly from Firestore:', err);
      await deleteDoc(doc(db, USERS_COLLECTION, uid));
    }
  }

  /**
   * Retorna permissões padrão por role.
   */
  getDefaultPermissions(role: UserRole): Permission {
    if (role === 'admin') return { ...ADMIN_PERMISSIONS };
    if (role === 'funcionario') return { ...EMPLOYEE_PERMISSIONS };
    return { ...DEFAULT_USER_PERMISSIONS };
  }
}

export const firebaseUserService = new FirebaseUserService();
