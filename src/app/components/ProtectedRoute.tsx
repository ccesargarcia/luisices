import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, loading, isAdmin, userProfile, refreshUserProfile } = useAuth();
  const [retryingProfile, setRetryingProfile] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Sua sessão continua ativa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Não foi possível carregar os dados da sua conta. Verifique sua conexão e tente novamente.
          </p>
          <button
            type="button"
            disabled={retryingProfile}
            onClick={async () => {
              setRetryingProfile(true);
              try {
                await refreshUserProfile();
              } catch (error) {
                console.warn('[ProtectedRoute] Não foi possível atualizar o perfil:', error);
              } finally {
                setRetryingProfile(false);
              }
            }}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retryingProfile ? 'Verificando…' : 'Tentar novamente'}
          </button>
        </section>
      </main>
    );
  }

  if (userProfile.active === false) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
