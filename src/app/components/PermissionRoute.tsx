import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../types';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface PermissionRouteProps {
  children: ReactNode;
  check: (permissions: UserProfile['permissions']) => boolean;
  allowUserRole?: boolean;
}

/**
 * Wrapper para rotas que requerem permissão específica.
 * Se o usuário não tiver a permissão, exibe aviso amigável em vez de criar loop de redirecionamento.
 */
export function PermissionRoute({ children, check, allowUserRole = false }: PermissionRouteProps) {
  const { hasPermission, userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAllowed = hasPermission(check) || (allowUserRole && (userProfile?.role === 'user' || userProfile?.role === 'admin') && userProfile.active);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Acesso restrito</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Seu perfil de usuário não possui permissão para acessar esta funcionalidade. Solicite liberação a um administrador se necessário.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
