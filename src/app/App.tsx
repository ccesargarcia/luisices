import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { OrdersProvider } from '../contexts/OrdersContext';
import { UserSettingsProvider } from '../contexts/UserSettingsContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <UserSettingsProvider>
          <OrdersProvider>
            <RouterProvider router={router} />
          </OrdersProvider>
        </UserSettingsProvider>
      </AuthProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}

export default App;