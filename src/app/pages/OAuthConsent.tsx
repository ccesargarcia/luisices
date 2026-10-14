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
  const [authenticatedEmail, setAuthenticatedEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      })
      .catch((err) => setError(err?.message || 'Solicitação OAuth inválida.'));
  }, [apiUrl, requestId]);

  async function previewPermissions(event: FormEvent) {
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
      const infoUrl = apiUrl.replace('/oauth/authorize', '/oauth/consent');
      const response = await fetch(`${infoUrl}?request_id=${encodeURIComponent(requestId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const result = await response.json();
      if (!response.ok || result.requires_login) throw new Error(result.error_description || 'Não foi possível consultar as permissões deste perfil.');
      const effectiveScopes = Array.isArray(result.scopes) ? result.scopes : [];
      setClientName(result.client_name || clientName);
      setScopes(effectiveScopes);
      setAuthenticatedEmail(user.email || email);
      setIsAuthenticated(true);
      setPassword('');
      if (!effectiveScopes.length) setError('Seu perfil não possui funcionalidades liberadas para esta integração.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar e consultar as permissões.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  }

  async function authorize() {
    setError('');
    if (!apiUrl || !requestId) {
      setError('Solicitação OAuth inválida. Recomece a conexão pelo ChatGPT.');
      return;
    }
    const user = firebaseAuthService.getCurrentUser();
    if (!user) {
      setIsAuthenticated(false);
      setError('Sua sessão expirou. Entre novamente para consultar as permissões.');
      return;
    }
    setLoading(true);
    try {
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
      setError(err?.message || 'Falha ao autorizar a integração.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Autorizar acesso ao Luisices</CardTitle>
          <CardDescription>
            {isAuthenticated
              ? `Permissões que o perfil ${authenticatedEmail} pode conceder a ${clientName}.`
              : `${clientName} solicita acesso. Entre na sua conta Luisices para carregar as permissões efetivas do seu perfil.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={previewPermissions} className="space-y-4">
            {!isAuthenticated && (
              <>
                <div className="space-y-2"><Label htmlFor="oauth-email">E-mail</Label><Input id="oauth-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="oauth-password">Senha</Label><Input id="oauth-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
              </>
            )}

            {!isAuthenticated ? (
              <p className="text-xs text-muted-foreground">As permissões serão consultadas após o login. A integração só receberá os acessos autorizados pelo seu perfil e papel.</p>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Permissões efetivas deste perfil ({scopes.length}):
                </span>
                {scopes.length ? (
                  <ul className="space-y-2.5 text-xs">
                    {scopes.map((scope) => {
                      const info = SCOPE_DESCRIPTIONS[scope] || { label: scope, description: 'Permissão concedida pelo perfil Luisices.' };
                      return (
                        <li key={scope} className="flex items-start gap-2.5">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">✓</span>
                          <div>
                            <span className="font-semibold text-foreground block">{info.label}</span>
                            <span className="text-muted-foreground text-[11px] block">{info.description}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma funcionalidade está liberada no perfil.</p>
                )}
              </div>
            )}

            {!isAuthenticated && <p className="text-xs text-muted-foreground">Sua senha é validada pelo Firebase Authentication e não é compartilhada com o ChatGPT.</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {isAuthenticated ? (
              <Button className="w-full" type="button" onClick={authorize} disabled={loading || !scopes.length || !apiUrl}>
                {loading ? 'Autorizando…' : 'Confirmar e autorizar'}
              </Button>
            ) : (
              <Button className="w-full" type="submit" disabled={loading || !apiUrl}>
                {loading ? 'Consultando permissões…' : 'Entrar e consultar permissões'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
