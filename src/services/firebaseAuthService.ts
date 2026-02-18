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
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export class FirebaseAuthService {
  /**
   * Registrar novo usuário
   */
  async register(email: string, password: string, displayName?: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Atualizar nome do usuário se fornecido
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    return userCredential.user;
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
   * Enviar email de recuperação de senha
   */
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
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
