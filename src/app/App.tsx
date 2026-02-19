import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;