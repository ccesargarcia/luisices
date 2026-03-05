import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      console.log('[ResetPassword] Enviando email para:', email);
      await resetPassword(email);
      console.log('[ResetPassword] Email enviado com sucesso (ou email não existe)');
      setSuccess(true);
    } catch (err: any) {
      console.error('[ResetPassword] Erro ao enviar email:', err);
      console.error('[ResetPassword] Código do erro:', err.code);
      console.error('[ResetPassword] Mensagem:', err.message);

      // Mensagens específicas para diferentes erros
      if (err.code === 'auth/user-not-found') {
        setError('E-mail não encontrado. Verifique se digitou corretamente.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido. Verifique o formato.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else {
        setError(err.message || 'Erro ao enviar email de recuperação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Recuperar Senha</CardTitle>
          <CardDescription className="text-center">
            Digite seu e-mail para receber as instruções
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="size-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">E-mail enviado com sucesso!</p>
                  <p className="text-sm">
                    Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Verifique também a pasta de <strong>spam/lixo eletrônico</strong>.
                    O e-mail pode levar alguns minutos para chegar.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                  disabled={success}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {!success && (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="size-4 mr-2" />
                    Enviar E-mail
                  </>
                )}
              </Button>
            )}

            <Link to="/login" className="w-full">
              <Button type="button" variant="outline" className="w-full">
                <ArrowLeft className="size-4 mr-2" />
                Voltar ao Login
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
