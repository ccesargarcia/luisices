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
import { usePresence } from '../hooks/usePresence';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (check: (p: UserProfile['permissions']) => boolean) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string, inviteToken?: string) => Promise<void>;
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
  const presence = usePresence(user);

  const handleLogout = useCallback(async (clearReg = false, uUid?: string) => {
    try {
      if (presence.setOffline) {
        await Promise.race([
          presence.setOffline(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
      }
    } catch (e) {
      console.warn('[AuthContext] Timeout ao ficar offline:', e);
    }
    const uidToClear = uUid || user?.uid;
    if (clearReg && uidToClear) {
      localStorage.removeItem(`luisices_device_reg_${uidToClear}`);
    }
    await firebaseAuthService.logout().catch(() => {});
    setUserProfile(null);
  }, [presence, user]);

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
    let deviceUnsub: (() => void) | null = null;
    let currentUid: string | null = null;

    const authUnsubscribe = firebaseAuthService.onAuthChange(async (u) => {
      if (currentUid === u?.uid) {
        // Ignora mudanças se for o mesmo usuário (ex: token refresh),
        // evitando desmontar a aplicação e quebrar o status de online (presence).
        setUser(u);
        return;
      }

      currentUid = u?.uid || null;

      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (deviceUnsub) {
        deviceUnsub();
        deviceUnsub = null;
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
          
          let deviceId = localStorage.getItem('luisices_device_id');

          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('luisices_device_id', deviceId);
          }
          
          let deviceWasRegistered = false;
          deviceUnsub = onSnapshot(doc(db, 'userProfiles', u.uid, 'devices', deviceId), (snap) => {
            if (snap.exists()) {
              deviceWasRegistered = true;
              const lastReg = Number(localStorage.getItem('luisices_device_last_reg') || '0');
              if (Date.now() - lastReg > 60 * 60 * 1000) {
                firebaseUserService.registerDeviceSession(deviceId, navigator.userAgent).then(() => {
                  localStorage.setItem('luisices_device_last_reg', String(Date.now()));
                }).catch(err => console.warn('[AuthContext] Erro ao atualizar sessão do dispositivo', err));
              }
            } else {
              const regKey = `luisices_device_reg_${u.uid}`;
              if (deviceWasRegistered || localStorage.getItem(regKey) === 'true') {
                localStorage.removeItem(regKey);
                toast.error('Esta sessão foi revogada remotamente.');
                handleLogout(true, u.uid);
              } else {
                deviceWasRegistered = true;
                localStorage.setItem(regKey, 'true');
                firebaseUserService.registerDeviceSession(deviceId, navigator.userAgent).then(() => {
                  localStorage.setItem('luisices_device_last_reg', String(Date.now()));
                }).catch(err => console.warn('[AuthContext] Erro ao registrar sessão do dispositivo', err));
              }
            }
          }, (err) => console.warn('[AuthContext] Aviso ao escutar dispositivo:', err));

        } catch (tokenErr) {
          console.warn('[AuthContext] Falha ao renovar token de autenticação inicial (possível offline):', tokenErr);
        }

        // Assina atualizações em tempo real do perfil do usuário diretamente
        profileUnsub = onSnapshot(
          doc(db, 'userProfiles', u.uid),
          async (snap) => {
            if (!snap.exists()) {
              // Conta sem perfil não possui acesso operacional automático
              setUserProfile(null);
              setLoading(false);
              return;
            }

            const data = snap.data() as UserProfile;

            // Se o administrador desativar a conta, efetua logout imediatamente
            if (data.active === false) {
              toast.error('Sua conta foi desativada pelo administrador.');
              handleLogout(true, u.uid);
              setLoading(false);
              return;
            }

            // Se o token for anterior à última revogação no servidor, encerra a sessão
            try {
              const idTokenResult = await u.getIdTokenResult();
              const authTime = Math.floor(new Date(idTokenResult.authTime).getTime() / 1000);
              if (data.tokensValidAfterTime && authTime <= data.tokensValidAfterTime) {
                toast.error('Esta sessão foi revogada remotamente.');
                handleLogout(true, u.uid);
                setLoading(false);
                return;
              }

              // Auto-recuperação de claims: sincroniza se divergir do perfil do Firestore
              const claimActive = Boolean(idTokenResult.claims.active);
              const profileActive = Boolean(data.active);
              if (idTokenResult.claims.role !== data.role || claimActive !== profileActive) {
                try {
                  const { httpsCallable } = await import('firebase/functions');
                  const { functions } = await import('../lib/firebase');
                  const repairClaims = httpsCallable(functions, 'repairUserClaims');
                  await repairClaims({ uid: u.uid });
                } catch (repairErr) {
                  console.warn('[AuthContext] Falha ao acionar reparo administrativo de claims:', repairErr);
                }
                await u.getIdToken(true);
              }
            } catch (claimErr) {
              console.warn('[AuthContext] Falha ao verificar/atualizar claims do token:', claimErr);
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
            // Falha ao validar o perfil deve bloquear o acesso até que a identidade
            // seja confirmada novamente; nunca assumir um perfil ativo por fallback.
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (profileUnsub) profileUnsub();
      if (deviceUnsub) deviceUnsub();
      authUnsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const user = await firebaseAuthService.login(email, password);

    // O e-mail só pode ser usado para acessar o sistema depois da confirmação.
    await user.reload();
    if (!user.emailVerified) {
      await handleLogout(true, user.uid);
      const error = new Error('Confirme seu e-mail para liberar o acesso. O cadastro está aguardando a confirmação do endereço enviado por e-mail.');
      (error as Error & { code: string }).code = 'auth/email-not-verified';
      throw error;
    }

    // Garante que o Firestore receba o token de autenticação antes da leitura
    await user.getIdToken(true);

    // Verificar se o usuário possui perfil cadastrado e ativo
    const profile = await firebaseUserService.getUserProfile(
      user.uid,
      user.email ?? undefined,
      user.displayName ?? undefined
    );

    if (!profile) {
      await handleLogout(true, user.uid);
      throw new Error('Sua conta não possui permissão de acesso ou convite ativo.');
    }

    if (profile.active === false) {
      // Usuário inativo - fazer logout imediato
      await handleLogout(true, user.uid);
      throw new Error('Sua conta foi desativada. Entre em contato com o administrador.');
    }
  };

  const register = async (email: string, password: string, displayName?: string, inviteToken?: string) => {
    await firebaseAuthService.register(email, password, displayName, inviteToken);
  };

  const logout = async () => {
    return handleLogout(true);
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
// trigger deploy
