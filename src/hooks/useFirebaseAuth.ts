/**
 * useFirebaseAuth Hook
 *
 * Hook React para gerenciar estado de autenticação
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { firebaseAuthService } from '../services/firebaseAuthService';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Observar mudanças de autenticação
    const unsubscribe = firebaseAuthService.onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    login: firebaseAuthService.login.bind(firebaseAuthService),
    logout: firebaseAuthService.logout.bind(firebaseAuthService),
    register: firebaseAuthService.register.bind(firebaseAuthService),
    resetPassword: firebaseAuthService.resetPassword.bind(firebaseAuthService),
  };
}
