import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './pages/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionRoute } from './components/PermissionRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { AuthAction } from './pages/AuthAction';

/**
 * Carregador lazy resiliente a atualizações de build/deploy.
 * Se o hash do chunk mudou no servidor e o navegador falhar no import dinâmico,
 * recarrega a página automaticamente uma vez para buscar os novos bundles.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem('chunk_reload');
      throw error;
    }
  });
}

// Páginas carregadas sob demanda com retry automático
const Dashboard      = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const WeeklyCalendar = lazyWithRetry(() => import('./pages/WeeklyCalendar').then(m => ({ default: m.WeeklyCalendar })));
const Customers      = lazyWithRetry(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Reports        = lazyWithRetry(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings       = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Quotes         = lazyWithRetry(() => import('./pages/Quotes').then(m => ({ default: m.Quotes })));
const Products       = lazyWithRetry(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Gallery        = lazyWithRetry(() => import('./pages/Gallery').then(m => ({ default: m.Gallery })));
const Exchanges      = lazyWithRetry(() => import('./pages/Exchanges').then(m => ({ default: m.Exchanges })));
const Users          = lazyWithRetry(() => import('./pages/Users').then(m => ({ default: m.Users })));
const FixNegativeValues = lazyWithRetry(() => import('./pages/FixNegativeValues').then(m => ({ default: m.default })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Configurar basename para GitHub Pages
// Em desenvolvimento: '' (vazio)
// Em produção (GitHub Pages): '/luisices/' ou o nome do seu repositório
const basename = import.meta.env.BASE_URL || '/';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/registrar',
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/recuperar-senha',
    element: <ResetPassword />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/action',
    element: <AuthAction />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Lazy><PermissionRoute check={p => p.dashboard}><Dashboard /></PermissionRoute></Lazy>,
      },
      {
        path: 'agenda',
        element: <Lazy><PermissionRoute check={p => p.orders?.view ?? false}><WeeklyCalendar /></PermissionRoute></Lazy>,
      },
      {
        path: 'clientes',
        element: <Lazy><PermissionRoute check={p => p.customers?.view ?? false}><Customers /></PermissionRoute></Lazy>,
      },
      {
        path: 'relatorios',
        element: <Lazy><PermissionRoute check={p => p.reports}><Reports /></PermissionRoute></Lazy>,
      },
      {
        path: 'orcamentos',
        element: <Lazy><PermissionRoute check={p => p.quotes?.view ?? false}><Quotes /></PermissionRoute></Lazy>,
      },
      {
        path: 'produtos',
        element: <Lazy><PermissionRoute check={p => p.products?.view ?? false}><Products /></PermissionRoute></Lazy>,
      },
      {
        path: 'galeria',
        element: <Lazy><PermissionRoute check={p => p.gallery?.view ?? false}><Gallery /></PermissionRoute></Lazy>,
      },
      {
        path: 'permutas',
        element: <Lazy><PermissionRoute check={p => p.exchanges}><Exchanges /></PermissionRoute></Lazy>,
      },
      {
        path: 'configuracoes',
        element: <Lazy><PermissionRoute check={p => p.settings} allowUserRole><Settings /></PermissionRoute></Lazy>,
      },
      {
        path: 'settings',  // Alias em inglês
        element: <Navigate to="/configuracoes" replace />,
      },
      {
        path: 'usuarios',
        element: <Lazy><PermissionRoute check={p => p.users?.view ?? false}><Users /></PermissionRoute></Lazy>,
      },
      {
        path: 'corrigir-valores',
        element: <Lazy><ProtectedRoute><FixNegativeValues /></ProtectedRoute></Lazy>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  basename,
});
