import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './pages/Layout';
import { Dashboard } from './pages/Dashboard';
import { WeeklyCalendar } from './pages/WeeklyCalendar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Configurar basename para GitHub Pages
// Em desenvolvimento: '' (vazio)
// Em produção (GitHub Pages): '/luisices/' ou o nome do seu repositório
const basename = import.meta.env.BASE_URL || '/';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/registrar',
    Component: Register,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/recuperar-senha',
    Component: ResetPassword,
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
        Component: Dashboard,
      },
      {
        path: 'agenda',
        Component: WeeklyCalendar,
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
