import { RouterProvider } from 'react-router';
import { router, isCatalogSubdomain } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

function App() {
  // Se for vitrine pública por subdomínio ou ?view=loja, opera em isolamento total
  // sem carregar providers administrativos ou listeners de sessão do Firestore
  if (isCatalogSubdomain) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}

export default App;