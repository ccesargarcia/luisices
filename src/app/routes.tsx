import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './pages/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
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
const Login          = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register       = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ResetPassword  = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));

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
    element: <Lazy><Register /></Lazy>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/recuperar-senha',
    element: <Lazy><ResetPassword /></Lazy>,
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
        element: <Lazy><Dashboard /></Lazy>,
      },
      {
        path: 'agenda',
        element: <Lazy><WeeklyCalendar /></Lazy>,
      },
      {
        path: 'clientes',
        element: <Lazy><Customers /></Lazy>,
      },
      {
        path: 'relatorios',
        element: <Lazy><Reports /></Lazy>,
      },
      {
        path: 'orcamentos',
        element: <Lazy><Quotes /></Lazy>,
      },
      {
        path: 'produtos',
        element: <Lazy><Products /></Lazy>,
      },
      {
        path: 'galeria',
        element: <Lazy><Gallery /></Lazy>,
      },
      {
        path: 'permutas',
        element: <Lazy><Exchanges /></Lazy>,
      },
      {
        path: 'configuracoes',
        element: <Lazy><Settings /></Lazy>,
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
