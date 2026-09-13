// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { firebaseUserService } from '../services/firebaseUserService';
import { UserProfile, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../app/types';
import { setUserAnalytics } from '../services/analyticsService';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (check: (p: UserProfile['permissions']) => boolean) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
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
    let profileUnsub: (() => void) | null = null;

    const authUnsubscribe = firebaseAuthService.onAuthChange(async (u) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setLoading(true);
      setUser(u);

      if (u) {
        try {
          // Garante que o documento existe no Firestore
          await firebaseUserService.getUserProfile(
            u.uid,
            u.email ?? undefined,
            u.displayName ?? undefined,
          );

          // Assina atualizações em tempo real do perfil do usuário
          profileUnsub = onSnapshot(
            doc(db, 'userProfiles', u.uid),
            (snap) => {
              if (!snap.exists()) {
                setUserProfile(null);
                setLoading(false);
                return;
              }

              const data = snap.data() as UserProfile;

              // Se o administrador desativar a conta, efetua logout imediatamente
              if (!data.active) {
                toast.error('Sua conta foi desativada pelo administrador.');
                firebaseAuthService.logout().catch(() => {});
                setUserProfile(null);
                setLoading(false);
                return;
              }

              const fallbackPermissions = data.role === 'admin'
                ? ADMIN_PERMISSIONS
                : data.role === 'funcionario'
                  ? EMPLOYEE_PERMISSIONS
                  : DEFAULT_USER_PERMISSIONS;

              // Para usuários padrão ('user'), usa DEFAULT_USER_PERMISSIONS como base e respeita permissões do Firestore
              const permissions = data.role === 'admin'
                ? ADMIN_PERMISSIONS
                : data.role === 'user'
                  ? {
                      ...DEFAULT_USER_PERMISSIONS,
                      ...(data.permissions || {}),
                      reports: data.permissions?.reports ?? DEFAULT_USER_PERMISSIONS.reports,
                      exchanges: data.permissions?.exchanges ?? DEFAULT_USER_PERMISSIONS.exchanges,
                      settings: data.permissions?.settings ?? DEFAULT_USER_PERMISSIONS.settings,
                      store: data.permissions?.store ?? DEFAULT_USER_PERMISSIONS.store,
                      orders: {
                        ...DEFAULT_USER_PERMISSIONS.orders,
                        ...(data.permissions?.orders || {}),
                        delete: data.permissions?.orders?.delete ?? DEFAULT_USER_PERMISSIONS.orders.delete,
                      },
                    }
                  : {
                      ...fallbackPermissions,
                      ...(data.permissions || {}),
                      store: data.permissions?.store ?? false,
                    };

              const profile: UserProfile = {
                ...data,
                permissions,
              };

              setUserProfile(profile);
              setUserAnalytics(u.uid, profile.role);
              setLoading(false);
            },
            (err) => {
              console.error('Erro ao escutar perfil do usuário em tempo real:', err);
              setLoading(false);
            }
          );
        } catch (err) {
          console.error('Erro ao carregar perfil do usuário:', err);
          setUserProfile(null);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (profileUnsub) profileUnsub();
      authUnsubscribe();
    };
  }, []);

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

  const register = async (email: string, password: string, displayName?: string) => {
    await firebaseAuthService.register(email, password, displayName);
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
        return false;
      }
      if (userProfile.role === 'admin') {
        return true;
      }
      return check(userProfile.permissions);
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
        register,
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
