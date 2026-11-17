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
  getDocsFromServer,
  getDoc,
  getDocFromServer,
  query,
  orderBy,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { UserProfile, UserRole, Permission, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../app/types';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';

const USERS_COLLECTION = 'userProfiles';

export async function callBetaUsersApi<T>(
  action: string,
  payload: Record<string, unknown> = {},
  options: { optionalAuth?: boolean } = {},
): Promise<T> {
  const user = auth.currentUser;
  if (!user && !options.optionalAuth) {
    throw Object.assign(new Error('Sua sessão expirou. Entre novamente.'), { code: 'unauthenticated' });
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user) {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }
  const response = await fetch(getVercelBetaApiUrl('/api/users-admin'), {
    method: 'POST',
    headers,
    cache: 'no-store',
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500) {
      throw new VercelInfraError(`Erro no módulo de usuários (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro no módulo de usuários (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}

function normalizeDate(value: any): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return undefined;
}

export interface DeviceSession {
  deviceId: string;
  userAgent: string;
  ip: string;
  location: string;
  lastActiveAt: any;
  createdAt: any;
  status?: string;
}

export interface UserSyncResult {
  success: boolean;
  synced: boolean;
  status: string;
  version?: number;
  pendingSteps?: {
    revocation?: boolean;
    claims?: boolean;
  };
}

export class FirebaseUserService {
  async registerDeviceSession(deviceId: string, userAgent: string): Promise<void> {
    await executeWithGcpFallback<void>(
      'usersAdmin',
      async () => {
        await callBetaUsersApi('registerDeviceSession', { deviceId, userAgent });
      },
      async () => {
        const callable = httpsCallable(functions, 'registerDeviceSession');
        await callable({ deviceId, userAgent });
      },
    );
  }

  async revokeAllSessions(uid: string): Promise<UserSyncResult> {
    return executeWithGcpFallback(
      'usersAdmin',
      () => callBetaUsersApi<UserSyncResult>('revokeAllSessions', { uid }),
      async () => {
        const callable = httpsCallable<{ uid: string }, UserSyncResult>(functions, 'revokeAllSessions');
        const result = await callable({ uid });
        return result.data;
      },
    );
  }

  async revokeDeviceSession(uid: string, deviceId: string): Promise<void> {
    await executeWithGcpFallback<void>(
      'usersAdmin',
      async () => {
        await callBetaUsersApi('revokeDeviceSession', { uid, deviceId });
      },
      async () => {
        const callable = httpsCallable<{ uid: string; deviceId: string }, { success: boolean }>(functions, 'revokeDeviceSession');
        await callable({ uid, deviceId });
      },
    );
  }

  async getUserDevices(uid: string): Promise<DeviceSession[]> {
    const q = query(collection(db, USERS_COLLECTION, uid, 'devices'), orderBy('lastActiveAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          deviceId: d.id,
          userAgent: data.userAgent || '',
          ip: data.ip || '',
          location: data.location || '',
          lastActiveAt: normalizeDate(data.lastActiveAt),
          createdAt: normalizeDate(data.createdAt),
          status: data.status || 'active',
        } as DeviceSession;
      })
      .filter((d) => d.status !== 'revoked');
  }

  async sendAdminPasswordReset(email: string): Promise<void> {
    await executeWithGcpFallback<void>(
      'usersAdmin',
      async () => {
        await callBetaUsersApi('sendAdminPasswordReset', { email });
      },
      async () => {
        const callable = httpsCallable(functions, 'sendAdminPasswordReset');
        await callable({ email });
      },
    );
  }

  async createUserInvitation(email: string, whatsappPhone?: string): Promise<{
    expiresAt?: string;
    repairedExistingAccount?: boolean;
    verificationSent?: boolean;
  }> {
    return executeWithGcpFallback(
      'usersAdmin',
      () => callBetaUsersApi<{ success: boolean; expiresAt?: string; repairedExistingAccount?: boolean; verificationSent?: boolean }>('createUserInvitation', { email, whatsappPhone }),
      async () => {
        const callable = httpsCallable<
          { email: string; whatsappPhone?: string },
          { success: boolean; expiresAt?: string; repairedExistingAccount?: boolean; verificationSent?: boolean }
        >(
          functions,
          'createUserInvitation',
        );
        const result = await callable({ email, whatsappPhone });
        return result.data;
      },
    );
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
    const data = await executeWithGcpFallback(
      'usersAdmin',
      () => callBetaUsersApi<{ success: boolean; uid: string; profile: UserProfile }>('createUser', { email, password, displayName, role, permissions }),
      async () => {
        const callable = httpsCallable<
          { email: string; password: string; displayName: string; role: string; permissions: Permission },
          { success: boolean; uid: string; profile: UserProfile }
        >(functions, 'createUser');
        const result = await callable({ email, password, displayName, role, permissions });
        return result.data;
      },
    );
    return data.profile;
  }

  /**
   * Busca o perfil de um usuário no Firestore.
   * Não cria perfil automaticamente: contas novas requerem convite válido aprovado no servidor.
   */
  async getUserProfile(uid: string, _email?: string, _displayName?: string): Promise<UserProfile | null> {
    try {
      const snap = await getDocFromServer(doc(db, USERS_COLLECTION, uid));
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        // O ID do documento é a identidade canônica. Nunca associe permissões
        // encontrando outro perfil pelo mesmo e-mail (por exemplo, UID antigo).
        if (profile.uid && profile.uid !== uid) {
          console.error('[getUserProfile] UID do perfil diverge do caminho do documento:', uid);
          return null;
        }
        return { ...profile, uid };
      }
    } catch {
      try {
        const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          if (profile.uid && profile.uid !== uid) {
            console.error('[getUserProfile] UID do perfil em cache diverge do caminho do documento:', uid);
            return null;
          }
          return { ...profile, uid };
        }
      } catch (localErr) {
        console.warn('[getUserProfile] Falha ao consultar perfil local:', localErr);
      }
    }
    return null;
  }

  /**
   * Lista todos os perfis de usuários.
   */
  async listUsers(): Promise<UserProfile[]> {
    const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'asc'));
    const snap = await getDocsFromServer(q).catch(() => getDocs(q));
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
      const data = await executeWithGcpFallback(
        'usersAdmin',
        () => callBetaUsersApi<{ users: Array<{ uid: string; authCreatedAt?: string; lastSignInAt?: string }> }>('getUserAccountMetadata', { uids: batch }),
        async () => {
          const callable = httpsCallable<{ uids: string[] }, { users: Array<{ uid: string; authCreatedAt?: string; lastSignInAt?: string }> }>(
            functions,
            'getUserAccountMetadata',
          );
          const result = await callable({ uids: batch });
          return result.data;
        },
      );
      return data.users;
    }));
    return results.flat();
  }

  /**
   * Atualiza dados do perfil (role, permissions, displayName, active).
   */
  async updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'createdBy'>>): Promise<UserSyncResult> {
    return executeWithGcpFallback(
      'usersAdmin',
      () => callBetaUsersApi<UserSyncResult>('updateUser', { uid, ...data }),
      async () => {
        const callable = httpsCallable<Record<string, any>, UserSyncResult>(functions, 'updateUser');
        const result = await callable({ uid, ...data });
        return result.data;
      },
    );
  }

  /**
   * Ativa ou desativa um usuário (soft-delete).
   */
  async setUserActive(uid: string, active: boolean): Promise<UserSyncResult> {
    return executeWithGcpFallback(
      'usersAdmin',
      () => callBetaUsersApi<UserSyncResult>('updateUser', { uid, active }),
      async () => {
        const callable = httpsCallable<{ uid: string; active: boolean }, UserSyncResult>(functions, 'updateUser');
        const result = await callable({ uid, active });
        return result.data;
      },
    );
  }

  /**
   * Remove permanentemente um usuário (Firebase Auth + Firestore coordenados).
   * A exclusão é realizada exclusivamente via Cloud Function administrativa para garantir atomicidade.
   */
  async deleteUser(uid: string): Promise<void> {
    await executeWithGcpFallback<void>(
      'usersAdmin',
      async () => {
        await callBetaUsersApi('deleteUser', { uid });
      },
      async () => {
        const callable = httpsCallable<{ uid: string }, { success: boolean }>(functions, 'deleteUser');
        await callable({ uid });
      },
    );
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
