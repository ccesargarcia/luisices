import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './pages/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionRoute } from './components/PermissionRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Páginas carregadas sob demanda — o bundle inicial fica menor
const Dashboard      = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const WeeklyCalendar = lazy(() => import('./pages/WeeklyCalendar').then(m => ({ default: m.WeeklyCalendar })));
const Customers      = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Reports        = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings       = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Quotes         = lazy(() => import('./pages/Quotes').then(m => ({ default: m.Quotes })));
const Products       = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Gallery        = lazy(() => import('./pages/Gallery').then(m => ({ default: m.Gallery })));
const Exchanges      = lazy(() => import('./pages/Exchanges').then(m => ({ default: m.Exchanges })));
const Users          = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const FixNegativeValues = lazy(() => import('./pages/FixNegativeValues').then(m => ({ default: m.default })));
const Login          = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ResetPassword  = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const AuthAction     = lazy(() => import('./pages/AuthAction').then(m => ({ default: m.AuthAction })));

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
    element: <Lazy><Login /></Lazy>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/registrar',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/recuperar-senha',
    element: <Lazy><ResetPassword /></Lazy>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/action',
    element: <Lazy><AuthAction /></Lazy>,
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
        element: <Lazy><PermissionRoute check={p => p.settings}><Settings /></PermissionRoute></Lazy>,
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
