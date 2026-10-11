// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { firebaseUserService } from '../services/firebaseUserService';
import { UserProfile, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, EMPLOYEE_PERMISSIONS } from '../app/types';
import { setUserAnalytics } from '../services/analyticsService';
import { toast } from 'sonner';
import { usePresence } from '../hooks/usePresence';
import { repairClaimsIfNeeded } from '../services/claimsRepairService';

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
  const currentUidRef                 = useRef<string | null>(null);
  const isLoggingInRef                = useRef<boolean>(false);
  const presence = usePresence(user);

  const handleLogout = useCallback(async (clearReg = false, uUid?: string) => {
    currentUidRef.current = null;
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
    if (uidToClear) {
      localStorage.removeItem(`luisices_device_reg_${uidToClear}`);
    }
    try {
      localStorage.removeItem('luisices_device_id');
      localStorage.removeItem('luisices_device_last_reg');
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('luisices_device_reg_')) {
          localStorage.removeItem(k);
        }
      });
      sessionStorage.removeItem('luisices_admin_selected_users');
    } catch (_) {}
    await firebaseAuthService.logout().catch(() => {});
    setUser(null);
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

    const authUnsubscribe = firebaseAuthService.onAuthChange(async (u) => {
      // Se for o mesmo usuário e os listeners já estiverem ativos, apenas atualiza o objeto user (ex: token refresh).
      // Se os listeners não estiverem ativos (ex: novo login consecutivo), prossegue com a inicialização completa.
      if (currentUidRef.current === u?.uid && profileUnsub) {
        setUser(u);
        return;
      }

      currentUidRef.current = u?.uid || null;

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
        let heartbeatTimer: any = null;
        let onlineHandler: (() => void) | null = null;
        try {
          // Garante que o token de autenticação está válido antes de conectar os listeners do Firestore
          await u.getIdToken();
          
          let deviceId = localStorage.getItem('luisices_device_id');

          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('luisices_device_id', deviceId);
          }

          const syncDeviceSession = async () => {
            const devId = localStorage.getItem('luisices_device_id') || deviceId;
            if (!devId) return;
            try {
              await firebaseUserService.registerDeviceSession(devId, navigator.userAgent);
              localStorage.setItem('luisices_device_last_reg', String(Date.now()));
            } catch (err: any) {
              console.warn('[AuthContext] Erro ao sincronizar sessão do dispositivo:', err);
              if (String(err?.message || '').toLowerCase().includes('revogada') && !isLoggingInRef.current) {
                toast.error('Esta sessão foi revogada remotamente.');
                localStorage.removeItem('luisices_device_id');
                localStorage.removeItem('luisices_device_last_reg');
                handleLogout(true, u.uid);
              }
            }
          };

          // Sincroniza IP/dispositivo se não sincronizou nos últimos 30 segundos
          const lastReg = Number(localStorage.getItem('luisices_device_last_reg') || '0');
          if (Date.now() - lastReg > 30 * 1000) {
            syncDeviceSession();
          }

          // Atualiza IP imediatamente quando houver reconexão/troca de rede
          onlineHandler = () => {
            syncDeviceSession();
          };
          window.addEventListener('online', onlineHandler);

          // Heartbeat periódico a cada 5 minutos para manter IP e lastActiveAt atualizados
          heartbeatTimer = setInterval(syncDeviceSession, 5 * 60 * 1000);
          
          let deviceWasRegistered = false;
          const snapUnsub = onSnapshot(doc(db, 'userProfiles', u.uid, 'devices', deviceId), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data?.status === 'revoked') {
                if (!isLoggingInRef.current) {
                  toast.error('Esta sessão foi revogada remotamente.');
                  localStorage.removeItem('luisices_device_id');
                  localStorage.removeItem('luisices_device_last_reg');
                  handleLogout(true, u.uid);
                }
                return;
              }
              deviceWasRegistered = true;
            } else {
              // Se já estava registrado nesta sessão ativa e sumiu do Firestore, a sessão foi revogada remotamente.
              if (deviceWasRegistered && !isLoggingInRef.current) {
                toast.error('Esta sessão foi revogada remotamente.');
                localStorage.removeItem('luisices_device_id');
                localStorage.removeItem('luisices_device_last_reg');
                handleLogout(true, u.uid);
              } else {
                deviceWasRegistered = true;
                syncDeviceSession();
              }
            }
          }, (err) => {
            if (err?.code !== 'permission-denied' && !String(err?.message).includes('insufficient permissions')) {
              console.warn('[AuthContext] Aviso ao escutar dispositivo:', err);
            }
          });

          deviceUnsub = () => {
            snapUnsub();
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            if (onlineHandler) window.removeEventListener('online', onlineHandler);
          };

        } catch (tokenErr) {
          console.warn('[AuthContext] Falha ao renovar token de autenticação inicial (possível offline):', tokenErr);
        }

        // Assina atualizações em tempo real do perfil do usuário diretamente
        profileUnsub = onSnapshot(
          doc(db, 'userProfiles', u.uid),
          async (snap) => {
            if (!snap.exists()) {
              // Se a conta autenticou com sucesso mas o documento userProfiles ainda não existe,
              // inicializa perfil administrativo resiliente em memória para não bloquear o acesso
              const fallback: UserProfile = {
                uid: u.uid,
                email: u.email || '',
                displayName: u.displayName || u.email?.split('@')[0] || 'Administrador',
                role: 'admin',
                permissions: ADMIN_PERMISSIONS,
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: u.uid,
              };
              setUserProfile((prev) => prev ?? fallback);
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
              if (!isLoggingInRef.current && data.tokensValidAfterTime && authTime <= data.tokensValidAfterTime) {
                toast.error('Esta sessão foi revogada remotamente.');
                handleLogout(true, u.uid);
                setLoading(false);
                return;
              }

              // Auto-recuperação de claims: sincroniza se divergir do perfil do Firestore
              if (idTokenResult.claims.role !== data.role || idTokenResult.claims.active !== true) {
                try {
                  const repair = await repairClaimsIfNeeded(u, data);
                  if (!repair.synced) console.warn('[AuthContext] Claims ainda pendentes:', repair.status);
                } catch (repairErr) {
                  console.warn('[AuthContext] Falha ao acionar reparo administrativo de claims:', repairErr);
                }
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
    isLoggingInRef.current = true;
    currentUidRef.current = null;
    try {
      localStorage.removeItem('luisices_device_id');
      localStorage.removeItem('luisices_device_last_reg');
    } catch (_) {}

    const newDeviceId = crypto.randomUUID();
    localStorage.setItem('luisices_device_id', newDeviceId);

    try {
      let user = await firebaseAuthService.login(email, password);

      // Garante que o Firestore receba o token de autenticação antes da leitura
      await user.getIdToken(true);

      // Verificar se o usuário possui perfil cadastrado e ativo
      let profile: UserProfile | null = null;
      try {
        profile = await firebaseUserService.getUserProfile(
          user.uid,
          user.email ?? undefined,
          user.displayName ?? undefined
        );
      } catch (err: any) {
        // Se ocorrer colisão temporal de 1 segundo (clock skew) com tokensValidAfterTime de revogação recente,
        // aguarda o próximo segundo (1100ms) e reautentica para garantir auth_time estritamente posterior.
        if (err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permissions')) {
          await new Promise((r) => setTimeout(r, 1100));
          const reauthUser = await firebaseAuthService.login(email, password);
          await reauthUser.getIdToken(true);
          profile = await firebaseUserService.getUserProfile(
            reauthUser.uid,
            reauthUser.email ?? undefined,
            reauthUser.displayName ?? undefined
          );
          user = reauthUser;
        } else {
          throw err;
        }
      }

      if (!profile) {
        // Se a conta autenticou com sucesso no Firebase Auth mas o documento userProfiles ainda não existe,
        // inicializa perfil administrativo resiliente em memória para permitir o acesso e navegação imediata
        console.warn('[AuthContext] Perfil não encontrado no Firestore para UID:', user.uid);
        const fallbackProfile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Administrador',
          role: 'admin',
          permissions: ADMIN_PERMISSIONS,
          active: true,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        };
        setUserProfile(fallbackProfile);
        profile = fallbackProfile;
      }

      if (profile.active === false) {
        // Usuário inativo - fazer logout imediato
        await handleLogout(true, user.uid);
        throw new Error('Sua conta foi desativada. Entre em contato com o administrador.');
      }

      // Se o perfil tiver tokensValidAfterTime e o token ainda estiver em colisão temporal,
      // avança o token com novo login sem abortar a sessão
      const idTokenResult = await user.getIdTokenResult();
      const authTime = Math.floor(new Date(idTokenResult.authTime).getTime() / 1000);
      if (profile.tokensValidAfterTime && authTime <= profile.tokensValidAfterTime) {
        await new Promise((r) => setTimeout(r, 1100));
        const reauthUser = await firebaseAuthService.login(email, password);
        await reauthUser.getIdToken(true);
      }

      // Registra a sessão do dispositivo com o novo deviceId imediatamente
      try {
        await firebaseUserService.registerDeviceSession(newDeviceId, navigator.userAgent);
        localStorage.setItem('luisices_device_last_reg', String(Date.now()));
      } catch (regErr) {
        console.warn('[AuthContext] Aviso ao registrar sessão no login:', regErr);
      }
    } finally {
      isLoggingInRef.current = false;
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
