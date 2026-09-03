import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../types';

interface PermissionRouteProps {
  children: ReactNode;
  check: (permissions: UserProfile['permissions']) => boolean;
  allowUserRole?: boolean;
}

/**
 * Wrapper para rotas que requerem permissão específica.
 * Se o usuário não tiver a permissão, redireciona para a home.
 */
export function PermissionRoute({ children, check, allowUserRole = false }: PermissionRouteProps) {
  const { hasPermission, userProfile } = useAuth();

  if (!hasPermission(check) && !(allowUserRole && userProfile?.role === 'user' && userProfile.active)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
