import { RouterProvider } from 'react-router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { router, isStoreRoute } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from './components/common/ThemeProvider';
import { Toaster } from './components/ui/sonner';

const THEME_OPTIONS = ['light', 'dark', 'system', 'deep-ocean', 'forest-glow', 'sunset-amber'];
const isVercelBetaHost =
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase().replace(/\.$/, '') === 'beta.luisices.com.br';

function App() {
  // A vitrine pública não deve carregar providers administrativos nem listeners de sessão.
  if (isStoreRoute()) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={THEME_OPTIONS}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
        {isVercelBetaHost ? <SpeedInsights /> : null}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={THEME_OPTIONS}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster richColors closeButton position="top-right" />
      {isVercelBetaHost ? <SpeedInsights /> : null}
    </ThemeProvider>
  );
}

export default App;
