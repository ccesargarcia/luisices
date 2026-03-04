import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../types';

interface PermissionRouteProps {
  children: ReactNode;
  check: (permissions: UserProfile['permissions']) => boolean;
}

/**
 * Wrapper para rotas que requerem permissão específica.
 * Se o usuário não tiver a permissão, redireciona para a home.
 */
export function PermissionRoute({ children, check }: PermissionRouteProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(check)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
