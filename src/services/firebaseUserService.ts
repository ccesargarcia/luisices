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
  query,
  orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { UserProfile, UserRole, Permission, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../app/types';

const USERS_COLLECTION = 'userProfiles';

function normalizeDate(value: any): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return undefined;
}

export class FirebaseUserService {
  async sendAdminPasswordReset(email: string): Promise<void> {
    const callable = httpsCallable(functions, 'sendAdminPasswordReset');
    await callable({ email });
  }

  async createUserInvitation(email: string, whatsappPhone?: string): Promise<{
    expiresAt?: string;
    repairedExistingAccount?: boolean;
    verificationSent?: boolean;
  }> {
    const callable = httpsCallable<
      { email: string; whatsappPhone?: string },
      { success: boolean; expiresAt?: string; repairedExistingAccount?: boolean; verificationSent?: boolean }
    >(
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
  ): Promise<UserProfile> {
    const callable = httpsCallable<
      { email: string; password: string; displayName: string; role: string; permissions: Permission },
      { success: boolean; uid: string; profile: UserProfile }
    >(functions, 'createUser');

    const result = await callable({ email, password, displayName, role, permissions });
    return result.data.profile;
  }

  /**
   * Busca o perfil de um usuário no Firestore.
   * Não cria perfil automaticamente: contas novas requerem convite válido aprovado no servidor.
   */
  async getUserProfile(uid: string, _email?: string, _displayName?: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (snap.exists()) return snap.data() as UserProfile;
    return null;
  }

  /**
   * Lista todos os perfis de usuários.
   */
  async listUsers(): Promise<UserProfile[]> {
    const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        createdAt: normalizeDate(data.createdAt) || '',
        updatedAt: normalizeDate(data.updatedAt),
        passwordChangedAt: normalizeDate(data.passwordChangedAt),
        lastPasswordResetRequestedAt: normalizeDate(data.lastPasswordResetRequestedAt),
      } as UserProfile;
    });
  }

  async getAccountMetadata(uids: string[]): Promise<Array<{ uid: string; authCreatedAt?: string; lastSignInAt?: string }>> {
    const signedInUser = auth.currentUser;
    if (!signedInUser) throw new Error('Sua sessão expirou. Entre novamente para consultar os acessos.');
    await signedInUser.getIdToken(true);

    const batches: string[][] = [];
    for (let index = 0; index < uids.length; index += 100) batches.push(uids.slice(index, index + 100));
    const results = await Promise.all(batches.map(async (batch) => {
      const callable = httpsCallable<{ uids: string[] }, { users: Array<{ uid: string; authCreatedAt?: string; lastSignInAt?: string }> }>(
        functions,
        'getUserAccountMetadata',
      );
      const result = await callable({ uids: batch });
      return result.data.users;
    }));
    return results.flat();
  }

  /**
   * Atualiza dados do perfil (role, permissions, displayName, active).
   */
  async updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'createdBy'>>): Promise<void> {
    const callable = httpsCallable(functions, 'updateUser');
    await callable({ uid, ...data });
  }

  /**
   * Ativa ou desativa um usuário (soft-delete).
   */
  async setUserActive(uid: string, active: boolean): Promise<void> {
    const callable = httpsCallable(functions, 'updateUser');
    await callable({ uid, active });
  }

  /**
   * Remove permanentemente um usuário (Firebase Auth + Firestore coordenados).
   * A exclusão é realizada exclusivamente via Cloud Function administrativa para garantir atomicidade.
   */
  async deleteUser(uid: string): Promise<void> {
    const callable = httpsCallable<{ uid: string }, { success: boolean }>(functions, 'deleteUser');
    await callable({ uid });
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
