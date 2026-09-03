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
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

export class FirebaseAuthService {
  /**
   * Registrar novo usuário
   */
  async register(email: string, password: string, displayName?: string, verificationContinueUrl?: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Atualizar nome do usuário se fornecido
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    await sendEmailVerification(userCredential.user, {
      url: verificationContinueUrl || `${window.location.origin}/action?mode=verifyEmail`,
      handleCodeInApp: true,
    });

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
    await signOut(auth);
  }

  /**
   * Enviar email de recuperação de senha via SendGrid
   */
  async resetPassword(email: string): Promise<void> {
    try {
      // Chamar Cloud Function que envia email via SendGrid
      const sendResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');

      const result = await sendResetEmail({ email });

      console.log('Email de recuperação enviado:', result.data);
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
    return onAuthStateChanged(auth, callback);
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
