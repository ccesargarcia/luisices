import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { resolveOAuthApiOrigin } from '../utils/oauthEnvironment';

const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  'orders:read': { label: 'Consultar Pedidos & Prazos', description: 'Visualizar fila de produção, pedidos do dia e status de encomendas.' },
  'orders:draft': { label: 'Criar Rascunhos de Encomendas', description: 'Extrair dados e montar rascunhos de pedidos a partir de conversas.' },
  'orders:create': { label: 'Criar Pedidos no Sistema', description: 'Registrar novos pedidos diretamente na fila do ateliê.' },
  'orders:update': { label: 'Editar Pedidos', description: 'Atualizar dados operacionais de pedidos, se permitido pelo perfil.' },
  'customers:read': { label: 'Consultar Clientes & Contatos', description: 'Buscar histórico e contatos de clientes para atendimento.' },
  'customers:create': { label: 'Criar Clientes', description: 'Cadastrar clientes, se permitido pelo perfil.' },
  'customers:update': { label: 'Editar Clientes', description: 'Atualizar dados de clientes, se permitido pelo perfil.' },
  'payments:read': { label: 'Consultar Pagamentos', description: 'Consultar pagamentos e saldos de pedidos, se permitido pelo perfil.' },
  'payments:write': { label: 'Registrar Pagamentos', description: 'Registrar pagamentos de pedidos, se permitido pelo perfil.' },
  'pricing:estimate': { label: 'Calculadora de Precificação', description: 'Calcular sugestões de preço, custos de insumos e margem.' },
  'whatsapp:compose': { label: 'Gerador de Mensagens WhatsApp', description: 'Preparar mensagens para envio (cobrança, avisos, pedidos).' },
  'gallery:read': { label: 'Consultar Portfólio / Acervo', description: 'Buscar fotos e modelos da galeria de produtos.' },
  'financial:read': { label: 'Relatórios Financeiros & DRE', description: 'Acessar relatórios e métricas financeiras. Restrito a administradores.' },
  'team:read': { label: 'Auditoria & Desempenho da Equipe', description: 'Auditar pedidos e produtividade da equipe. Restrito a administradores.' },
};

export function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('Cliente MCP');
  const [scopes, setScopes] = useState<string[]>([]);
  const apiOrigin = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return resolveOAuthApiOrigin({
      hostname: window.location.hostname,
      isDevelopmentBuild: import.meta.env.DEV,
      firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    });
  }, []);
  const apiUrl = apiOrigin ? `${apiOrigin}/oauth/authorize` : null;

  useEffect(() => {
    if (!apiUrl) {
      setError('Ambiente OAuth não reconhecido. Abra a página pelo domínio oficial de DEV ou produção.');
      return;
    }
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
    if (!apiUrl) {
      setError('Ambiente OAuth não reconhecido. Nenhuma credencial foi enviada.');
      return;
    }
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
          <CardDescription>
            {clientName} solicita acesso às funcionalidades abaixo. A lista mostra o que foi solicitado; o acesso concedido também depende do papel e das permissões do seu perfil Luisices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={authorize} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="oauth-email">E-mail</Label><Input id="oauth-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="oauth-password">Senha</Label><Input id="oauth-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>

            <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Funcionalidades Solicitadas:
              </span>
              <ul className="space-y-2.5 text-xs">
                {scopes.map((scope) => {
                  const info = SCOPE_DESCRIPTIONS[scope] || { label: scope, description: 'A funcionalidade só será liberada se estiver autorizada no perfil Luisices.' };
                  return (
                    <li key={scope} className="flex items-start gap-2.5">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold mt-0.5">•</span>
                      <div>
                        <span className="font-semibold text-foreground block">{info.label}</span>
                        <span className="text-muted-foreground text-[11px] block">{info.description}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">Sua senha é validada pelo Firebase Authentication. A autorização fica vinculada ao seu usuário e às suas permissões do ateliê.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading || !apiUrl}>{loading ? 'Validando e autorizando…' : 'Entrar e autorizar'}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
