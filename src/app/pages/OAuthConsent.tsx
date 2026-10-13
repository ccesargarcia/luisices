import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('Cliente MCP');
  const [scopes, setScopes] = useState<string[]>([]);
  const apiUrl = useMemo(() => {
    const isDev = window.location.hostname === 'dev.luisices.com.br';
    return `${window.location.protocol}//api${isDev ? '.dev' : ''}.luisices.com.br/oauth/authorize`;
  }, []);

  useEffect(() => {
    if (!requestId) return;
    const infoUrl = apiUrl.replace('/oauth/authorize', '/oauth/consent');
    fetch(`${infoUrl}?request_id=${encodeURIComponent(requestId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error_description || 'Solicitação OAuth inválida.');
        setClientName(data.client_name);
        setScopes(data.scopes || []);
      })
      .catch((err) => setError(err?.message || 'Solicitação OAuth inválida.'));
  }, [apiUrl, requestId]);

  async function authorize(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!requestId) {
      setError('Solicitação de autorização ausente. Recomece a conexão pelo ChatGPT.');
      return;
    }
    setLoading(true);
    try {
      const user = await firebaseAuthService.login(email, password);
      const idToken = await user.getIdToken(true);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ request_id: requestId }),
      });
      const result = await response.json();
      if (!response.ok || !result.redirect_uri) throw new Error(result.error_description || 'Não foi possível concluir a autorização.');
      window.location.assign(result.redirect_uri);
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar ou autorizar a integração.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Autorizar acesso ao Luisices</CardTitle>
          <CardDescription>{clientName} solicita acesso aos seguintes recursos:</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={authorize} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="oauth-email">E-mail</Label><Input id="oauth-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="oauth-password">Senha</Label><Input id="oauth-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">{scopes.map((scope) => <li key={scope}>{scope}</li>)}</ul>
            <p className="text-sm text-muted-foreground">Sua senha é validada pelo Firebase Authentication. A autorização fica vinculada à sua conta e às permissões atuais.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Validando e autorizando…' : 'Entrar e autorizar'}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
