// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { firebaseUserService } from '../services/firebaseUserService';
import { UserProfile } from '../app/types';
import { setUserAnalytics } from '../services/analyticsService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (check: (p: UserProfile['permissions']) => boolean) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    const profile = await firebaseUserService.getUserProfile(
      u.uid,
      u.email ?? undefined,
      u.displayName ?? undefined,
    );
    setUserProfile(profile);

    // Set analytics user properties
    if (profile) {
      setUserAnalytics(u.uid, profile.role);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthChange(async (u) => {
      setLoading(true);
      setUser(u);
      if (u) {
        try {
          await loadProfile(u);
        } catch (err) {
          console.error('Erro ao carregar perfil do usuário:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const user = await firebaseAuthService.login(email, password);

    // Verificar se o usuário está ativo
    const profile = await firebaseUserService.getUserProfile(
      user.uid,
      user.email ?? undefined,
      user.displayName ?? undefined
    );

    if (profile && !profile.active) {
      // Usuário inativo - fazer logout imediato
      await firebaseAuthService.logout();
      throw new Error('Sua conta foi desativada. Entre em contato com o administrador.');
    }
  };

  const logout = async () => {
    await firebaseAuthService.logout();
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await firebaseAuthService.resetPassword(email);
  };

  const refreshUserProfile = async () => {
    if (user) await loadProfile(user);
  };

  const hasPermission = useCallback(
    (check: (p: UserProfile['permissions']) => boolean): boolean => {
      if (!userProfile || !userProfile.active) {
        console.log('[hasPermission] Sem perfil ou usuário inativo:', { userProfile });
        return false;
      }
      const result = check(userProfile.permissions);
      console.log('[hasPermission] Verificação:', {
        role: userProfile.role,
        email: userProfile.email,
        permissions: userProfile.permissions,
        result
      });
      return result;
    },
    [userProfile],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAuthenticated: !!user,
        isAdmin: userProfile?.role === 'admin',
        hasPermission,
        login,
        logout,
        resetPassword,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
