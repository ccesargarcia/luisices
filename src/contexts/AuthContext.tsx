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

function isStoreRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const view = (new URLSearchParams(window.location.search).get('view') || '').toLowerCase();
  const isCatalogSubdomain =
    host.startsWith('loja.') ||
    host.startsWith('lojinha.') ||
    host.startsWith('catalogo.') ||
    host.startsWith('catalog.') ||
    ['loja', 'lojinha', 'catalog', 'catalogo'].includes(view);

  if (isCatalogSubdomain) return true;

  const path = window.location.pathname.toLowerCase();
  return (
    path === '/loja' ||
    path.startsWith('/loja/') ||
    path === '/lojinha' ||
    path.startsWith('/lojinha/') ||
    path === '/catalogo' ||
    path.startsWith('/catalogo/') ||
    path === '/catalog' ||
    path.startsWith('/catalog/')
  );
}

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
        // Se estiver navegando na loja/vitrine pública, desativa a escuta em tempo real do perfil administrativo
        if (isStoreRoute()) {
          setLoading(false);
          return;
        }

        try {
          // Garante que o token de autenticação está válido antes de conectar os listeners do Firestore
          await u.getIdToken();
        } catch (tokenErr) {
          console.warn('[AuthContext] Falha ao renovar token de autenticação inicial (possível offline):', tokenErr);
        }

        // Assina atualizações em tempo real do perfil do usuário diretamente
        profileUnsub = onSnapshot(
          doc(db, 'userProfiles', u.uid),
          async (snap) => {
            if (!snap.exists()) {
              // Se o documento ainda não existir no primeiro acesso, inicializa via getUserProfile
              try {
                const created = await firebaseUserService.getUserProfile(
                  u.uid,
                  u.email ?? undefined,
                  u.displayName ?? undefined,
                );
                if (created) {
                  setUserProfile(created);
                }
              } catch (initErr) {
                console.warn('Erro ao inicializar perfil de usuário:', initErr);
              }
              setLoading(false);
              return;
            }

            const data = snap.data() as UserProfile;

            // Se o administrador desativar a conta, efetua logout imediatamente
            if (data.active === false) {
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
                    pricing: data.permissions?.pricing ?? DEFAULT_USER_PERMISSIONS.pricing,
                    store: data.permissions?.store ?? DEFAULT_USER_PERMISSIONS.store,
                    whatsapp: data.permissions?.whatsapp ?? DEFAULT_USER_PERMISSIONS.whatsapp ?? false,
                    aiCopilot: data.permissions?.aiCopilot ?? DEFAULT_USER_PERMISSIONS.aiCopilot ?? false,
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
                    pricing: data.permissions?.pricing ?? false,
                    whatsapp: data.permissions?.whatsapp ?? false,
                    aiCopilot: data.permissions?.aiCopilot ?? false,
                  };

            const profile: UserProfile = {
              ...data,
              active: true,
              permissions,
            };

            setUserProfile(profile);
            setUserAnalytics(u.uid, profile.role);
            setLoading(false);
          },
          (err) => {
            if (!isStoreRoute() && err?.code !== 'permission-denied' && !String(err?.message).includes('insufficient permissions')) {
              console.warn('[AuthContext] Aviso ao escutar perfil do usuário no Firestore:', err?.message || err);
            }
            // Nunca efetua logout forçado por falha transitória de listener (evita deslogar o usuário em oscilações de rede/token)
            const fallbackProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || u.email?.split('@')[0] || 'Usuário',
              role: 'user',
              permissions: { ...DEFAULT_USER_PERMISSIONS },
              active: true,
              createdAt: new Date().toISOString(),
              createdBy: u.uid,
            };

            // Mantém perfil existente caso já carregado, ou aplica perfil de contingência para não travar a aplicação
            setUserProfile((prev) => prev ?? fallbackProfile);
            setLoading(false);

            // Tenta recuperação silenciosa em background renovando o token do Firebase
            if (err?.code === 'permission-denied' || String(err?.message).includes('insufficient permissions')) {
              u.getIdToken(true)
                .then(() => firebaseUserService.getUserProfile(u.uid, u.email ?? undefined, u.displayName ?? undefined))
                .then((fresh) => {
                  if (fresh && fresh.active !== false) {
                    setUserProfile(fresh);
                  }
                })
                .catch(() => {
                  // Fallback de contingência permanece ativo
                });
            }
          }
        );
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

    if (profile && profile.active === false) {
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
      if (!userProfile || userProfile.active === false) {
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
