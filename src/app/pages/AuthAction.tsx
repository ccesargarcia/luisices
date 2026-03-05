import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Página de manipulação de ações do Firebase Auth
 * Processa: reset de senha, verificação de email, etc.
 */
export function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!oobCode || mode !== 'resetPassword') {
      setError('Link inválido ou expirado.');
      setVerifying(false);
      return;
    }

    // Verificar se o código é válido e obter o email
    verifyPasswordResetCode(auth, oobCode)
      .then((emailAddress) => {
        setEmail(emailAddress);
        setVerifying(false);
      })
      .catch((err) => {
        console.error('Erro ao verificar código:', err);
        if (err.code === 'auth/invalid-action-code') {
          setError('Este link já foi usado ou expirou. Solicite um novo email de recuperação.');
        } else if (err.code === 'auth/expired-action-code') {
          setError('Este link expirou. Solicite um novo email de recuperação.');
        } else {
          setError('Link inválido. Verifique se copiou o link completo do email.');
        }
        setVerifying(false);
      });
  }, [oobCode, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validações
    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setSuccess(true);

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);

      if (err.code === 'auth/weak-password') {
        setError('Senha muito fraca. Use pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('Este link já foi usado ou expirou. Solicite um novo email de recuperação.');
      } else {
        setError(err.message || 'Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verificando código
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erro na verificação
  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Link Inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/recuperar-senha')}
            >
              Solicitar Novo Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Sucesso - senha alterada
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="size-5" />
              Senha Alterada!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="size-4" />
              <AlertDescription>
                Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em instantes...
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Ir para Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Formulário de nova senha
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Nova Senha</CardTitle>
          <CardDescription className="text-center">
            Redefina a senha para: <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
