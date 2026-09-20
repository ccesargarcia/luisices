import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { trackLogin } from '../../services/analyticsService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Loader2, LogIn, Mail, Lock, Eye, EyeOff, Package2, Store, ArrowRight } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, loading: authLoading, userProfile } = useAuth();
  const navigate = useNavigate();

  // Se o usuário já estiver autenticado e ativo e tentar acessar /login, redireciona para o dashboard com replace
  useEffect(() => {
    if (!authLoading && isAuthenticated && userProfile && userProfile.active !== false) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, userProfile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      trackLogin('email');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);

      // Mensagens específicas para diferentes tipos de erro
      if (err.message?.includes('desativada')) {
        setError('🚫 Sua conta foi desativada. Entre em contato com o administrador para reativar seu acesso.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas de login. Por favor, aguarde alguns minutos e tente novamente.');
      } else {
        setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative login-bg">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

      {/* Alternador de tema discreto no canto superior */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="w-full bg-card/90 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-3 text-center pb-4 pt-6">
            <div className="mx-auto size-14 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shadow-xs">
              <Package2 className="size-7 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Bem-vindo à Luisices
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Gestão inteligente para papelaria personalizada
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 text-sm bg-background/60"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Senha
                  </Label>
                  <Link
                    to="/recuperar-senha"
                    className="text-xs text-primary hover:underline font-medium"
                    tabIndex={-1}
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 text-sm bg-background/60"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 px-6 pb-6 pt-2">
              <Button
                type="submit"
                className="w-full h-10 font-semibold shadow-xs active:scale-[0.98] transition-transform cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4 mr-2" />
                    Entrar no Sistema
                  </>
                )}
              </Button>

              <div className="pt-2 border-t border-border/60 w-full text-center">
                <Link
                  to="/catalogo"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-primary/5"
                >
                  <Store className="size-3.5 text-primary" />
                  <span>É cliente? Acessar catálogo da lojinha</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default Login;
