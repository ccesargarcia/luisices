import { RouterProvider } from 'react-router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { router, isStoreRoute } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from './components/common/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { isVercelBetaHost } from './utils/betaHost';

const THEME_OPTIONS = ['light', 'dark', 'system', 'deep-ocean', 'forest-glow', 'sunset-amber'];
const showSpeedInsights = isVercelBetaHost();

function App() {
  // A vitrine pública não deve carregar providers administrativos nem listeners de sessão.
  if (isStoreRoute()) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={THEME_OPTIONS}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
        {showSpeedInsights ? <SpeedInsights /> : null}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={THEME_OPTIONS}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster richColors closeButton position="top-right" />
      {showSpeedInsights ? <SpeedInsights /> : null}
    </ThemeProvider>
  );
}

export default App;
