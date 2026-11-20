/**
 * Firebase Authentication Service
 *
 * Serviço para gerenciamento de autenticação de usuários
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  reload,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, authPersistenceReady, functions } from '../lib/firebase';
import { executeWithGcpFallback } from './backendRoutingService';
import { callBetaUsersApi } from './firebaseUserService';
import { clearCustomerPhotoBlobCache } from '../hooks/useCustomerPhotoUrl';

export class FirebaseAuthService {
  /**
   * Registrar novo usuário
  */
  async register(email: string, password: string, displayName?: string, inviteToken?: string): Promise<User> {
    await authPersistenceReady;
    if (!inviteToken) {
      throw new Error('Este cadastro só pode ser concluído por meio de um convite válido.');
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Atualizar nome do usuário se fornecido
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    await executeWithGcpFallback<void>(
      'usersAdmin',
      async () => {
        await callBetaUsersApi('sendVerificationEmail', { inviteToken });
      },
      async () => {
        const sendVerification = httpsCallable(functions, 'sendVerificationEmail');
        await sendVerification({ inviteToken });
      },
      'sendVerificationEmail',
    );

    return userCredential.user;
  }

  async reloadCurrentUser(): Promise<User | null> {
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    return auth.currentUser;
  }

  /**
   * Login
   */
  async login(email: string, password: string): Promise<User> {
    await authPersistenceReady;
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } finally {
      clearCustomerPhotoBlobCache();
    }
  }

  /**
   * Enviar email de recuperação de senha via SendGrid
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const idempotencyKey = globalThis.crypto.randomUUID();
      await executeWithGcpFallback<void>(
        'usersAdmin',
        async () => {
          await callBetaUsersApi('sendPasswordResetEmail', { email, idempotencyKey }, { optionalAuth: true });
        },
        async () => {
          const sendResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');
          await sendResetEmail({ email, idempotencyKey });
        },
        'sendPasswordResetEmail',
      );

    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      throw error;
    }
  }

  /**
   * Observar mudanças de autenticação
   * Retorna função para cancelar a observação
   */
  onAuthChange(callback: (user: User | null) => void): () => void {
    let lastUid: string | null = auth.currentUser?.uid ?? null;
    return onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid ?? null;
      if (nextUid !== lastUid || !nextUid) {
        clearCustomerPhotoBlobCache();
      }
      lastUid = nextUid;
      callback(user);
    });
  }

  /**
   * Obter usuário atual
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Obter token de autenticação
   */
  async getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    return await user.getIdToken();
  }
}

// Exportar instância singleton
export const firebaseAuthService = new FirebaseAuthService();
