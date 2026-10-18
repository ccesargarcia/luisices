import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseMcpService } from '../../services/firebaseMcpService';
import { McpApiKey, McpSettingsStatus } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Key,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Code2,
  BookOpen,
  ArrowLeft,
  Lock,
  Layers,
  Sparkles,
  Terminal,
  RefreshCw,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';

export function ApiDocs() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [mcpStatus, setMcpStatus] = useState<McpSettingsStatus | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');

  const swaggerContainerRef = useRef<HTMLDivElement>(null);
  const swaggerInstanceRef = useRef<any>(null);

  // Carrega status e OpenAPI Schema autenticado
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, schemaRes] = await Promise.all([
        firebaseMcpService.getStatus().catch(() => null),
        firebaseMcpService.getOpenApiSchema(),
      ]);

      if (statusRes) {
        setMcpStatus(statusRes);
        const activeKeys = (statusRes.keys || []).filter((k) => k.enabled);
        if (activeKeys.length > 0) {
          setSelectedKeyId(activeKeys[0].keyId);
        }
      }

      setSchemaData(schemaRes);
    } catch (err: any) {
      console.error('[ApiDocs] Erro ao carregar schema OpenAPI:', err);
      setError(err?.message || 'Falha ao autenticar acesso à documentação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Determina o token ativo para testes e exemplos
  const activeKeyObject = mcpStatus?.keys?.find((k) => k.keyId === selectedKeyId);
  const effectiveToken = customToken.trim() || activeKeyObject?.keyPrefix || 'lui_live_SEU_TOKEN_AQUI';

  // Inicializa o Swagger UI dinamicamente
  useEffect(() => {
    if (loading || error || !schemaData?.schema) return;

    let isMounted = true;

    const initSwagger = async () => {
      try {
        // Carrega CSS se ainda não estiver presente
        if (!document.getElementById('swagger-ui-css')) {
          const link = document.createElement('link');
          link.id = 'swagger-ui-css';
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css';
          document.head.appendChild(link);
        }

        // Carrega Script se ainda não carregado
        if (!(window as any).SwaggerUIBundle) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Não foi possível carregar o Swagger UI.'));
            document.body.appendChild(script);
          });
        }

        if (!isMounted || !swaggerContainerRef.current) return;

        const SwaggerUIBundle = (window as any).SwaggerUIBundle;
        const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset;

        // Limpa instância anterior
        swaggerContainerRef.current.innerHTML = '';

        const ui = SwaggerUIBundle({
          spec: schemaData.schema,
          domNode: swaggerContainerRef.current,
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
          requestInterceptor: (req: any) => {
            if (effectiveToken && !req.headers.Authorization) {
              req.headers.Authorization = `Bearer ${effectiveToken}`;
            }
            return req;
          },
        });

        swaggerInstanceRef.current = ui;

        if (effectiveToken && ui.preauthorizeApiKey) {
          ui.preauthorizeApiKey('bearerAuth', effectiveToken);
        }
      } catch (swaggerErr: any) {
        console.error('[ApiDocs] Erro ao renderizar Swagger UI:', swaggerErr);
      }
    };

    initSwagger();

    return () => {
      isMounted = false;
    };
  }, [loading, error, schemaData]);

  // Atualiza pré-autorização quando a chave muda
  useEffect(() => {
    if (swaggerInstanceRef.current?.preauthorizeApiKey && effectiveToken) {
      swaggerInstanceRef.current.preauthorizeApiKey('bearerAuth', effectiveToken);
    }
  }, [effectiveToken]);

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isDev = schemaData?.environment === 'dev';
  const baseUrl = schemaData?.endpointBaseUrl || 'https://api.luisices.com.br/chatGptToolsEndpoint';

  // Exemplos de código interativos
  const getCodeSnippet = () => {
    switch (selectedLanguage) {
      case 'curl':
        return `# 1. Consultar entregas e pedidos do dia
curl -X POST "${baseUrl}/tools/daily_briefing" \\
  -H "Authorization: Bearer ${effectiveToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"date": "${new Date().toISOString().slice(0, 10)}"}'

# 2. Consultar pedidos na fila de produção
curl -X POST "${baseUrl}/tools/query_orders_view" \\
  -H "Authorization: Bearer ${effectiveToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "em_producao", "limit": 10}'`;

      case 'javascript':
        return `// Exemplo com Fetch API (Node.js / Browser)
const token = "${effectiveToken}";
const endpoint = "${baseUrl}/tools/query_orders_view";

async function fetchOrders() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "em_producao",
      limit: 10
    })
  });

  const data = await response.json();
  console.log("Pedidos retornados:", data);
}

fetchOrders();`;

      case 'python':
        return `# Exemplo com Python (requests)
import requests

token = "${effectiveToken}"
url = "${baseUrl}/tools/query_orders_view"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

payload = {
    "status": "em_producao",
    "limit": 10
}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Resultado:", response.json())`;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Barra de Navegação e Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/configuracoes')}
              className="size-8 p-0"
              title="Voltar às Configurações"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="size-6 text-primary" />
              Documentação da API (Swagger UI)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10">
            Especificação interativa OpenAPI 3.0.3 protegida para integração com ChatGPT, Agentes de IA e sistemas externos.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-10 sm:pl-0 flex-wrap">
          <Badge
            variant="outline"
            className={
              isDev
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }
          >
            <span className={`inline-block size-1.5 rounded-full mr-1.5 ${isDev ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {isDev ? 'Ambiente Dev' : 'Ambiente Produção'}
          </Badge>

          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
            <Lock className="size-3 mr-1" />
            Acesso Restrito & Autenticado
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
        </div>
      </div>

      {/* Card de Configuração de Autenticação para Testes */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-primary" />
              Autenticação da API (Bearer Token)
            </CardTitle>
            <Link
              to="/configuracoes"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Gerenciar Chaves de Acesso
              <ExternalLink className="size-3" />
            </Link>
          </div>
          <CardDescription className="text-xs">
            Todas as chamadas à API exigem o cabeçalho HTTP <code>Authorization: Bearer &lt;sua_chave&gt;</code>.
            Selecione uma chave abaixo para testar diretamente no Swagger interativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seleção de Chave Cadastrada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Usar Chave Cadastrada no Sistema</Label>
              {mcpStatus?.keys && mcpStatus.keys.length > 0 ? (
                <Select value={selectedKeyId} onValueChange={(val) => { setSelectedKeyId(val); setCustomToken(''); }}>
                  <SelectTrigger className="text-xs h-9 font-mono">
                    <SelectValue placeholder="Selecione uma chave de API" />
                  </SelectTrigger>
                  <SelectContent>
                    {mcpStatus.keys.map((k) => (
                      <SelectItem key={k.keyId} value={k.keyId} className="text-xs font-mono">
                        {k.keyName} ({k.keyPrefix}) {k.enabled ? '' : '[Desativada]'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 rounded-lg border border-border/60 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Nenhuma chave de API gerada ainda.</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/configuracoes')}>
                    Criar Chave
                  </Button>
                </div>
              )}
            </div>

            {/* Inserção de Token Manual */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ou Informar Token Manualmente para Teste</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="lui_live_... ou token Bearer"
                  value={customToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomToken(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyText(effectiveToken, 'token')}
                  className="h-9 px-3 shrink-0 gap-1.5"
                  title="Copiar token"
                >
                  {copiedField === 'token' ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  <span className="hidden sm:inline">Copiar</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0 font-medium">URL Base da API:</span>
              <code className="text-[11px] font-mono text-primary truncate">{baseUrl}</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyText(baseUrl, 'baseUrl')}
              className="h-6 px-2 text-[11px] gap-1"
            >
              {copiedField === 'baseUrl' ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copiedField === 'baseUrl' ? 'Copiado' : 'Copiar URL'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo Principal com Abas */}
      <Tabs defaultValue="swagger" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="swagger" className="gap-1.5 text-xs">
            <Layers className="size-3.5" />
            Swagger UI
          </TabsTrigger>
          <TabsTrigger value="snippets" className="gap-1.5 text-xs">
            <Code2 className="size-3.5" />
            Exemplos de Código
          </TabsTrigger>
          <TabsTrigger value="scopes" className="gap-1.5 text-xs">
            <Key className="size-3.5" />
            Escopos & Permissões
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Swagger UI Interativo */}
        <TabsContent value="swagger" className="space-y-4">
          <Card className="border-border/60 overflow-hidden shadow-xs">
            <CardHeader className="bg-muted/30 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCode className="size-4.5 text-primary" />
                    Explorer Interativo de Endpoints
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Execute requisições reais com <strong>Try it out</strong>. A autenticação Bearer é aplicada automaticamente.
                  </CardDescription>
                </div>
                {schemaData?.openapiUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 text-xs shrink-0"
                  >
                    <a href={schemaData.openapiUrl} target="_blank" rel="noreferrer">
                      <span>Ver openapi.json</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0 sm:p-4">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <RefreshCw className="size-8 animate-spin text-primary" />
                  <p className="text-sm">Carregando documentação e especificações OpenAPI...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center space-y-3">
                  <AlertCircle className="size-10 text-destructive mx-auto" />
                  <p className="text-sm font-semibold text-destructive">{error}</p>
                  <Button size="sm" variant="outline" onClick={loadData}>
                    Tentar Novamente
                  </Button>
                </div>
              ) : (
                <div className="swagger-ui-custom-wrapper min-h-[600px] bg-background rounded-lg p-2 sm:p-4 overflow-x-auto">
                  <div ref={swaggerContainerRef} id="swagger-ui-container" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Exemplos de Código */}
        <TabsContent value="snippets" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="size-4.5 text-primary" />
                    Exemplos Prontos para Uso
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Códigos pré-configurados com a URL base e o token de autenticação selecionado.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedLanguage === 'curl' ? 'default' : 'outline'}
                    onClick={() => setSelectedLanguage('curl')}
                    className="h-7 text-xs px-2.5"
                  >
                    cURL
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedLanguage === 'javascript' ? 'default' : 'outline'}
                    onClick={() => setSelectedLanguage('javascript')}
                    className="h-7 text-xs px-2.5"
                  >
                    JavaScript
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedLanguage === 'python' ? 'default' : 'outline'}
                    onClick={() => setSelectedLanguage('python')}
                    className="h-7 text-xs px-2.5"
                  >
                    Python
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed custom-scrollbar">
                  {getCodeSnippet()}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyText(getCodeSnippet(), 'codeSnippet')}
                  className="absolute top-2.5 right-2.5 h-7 px-2 text-xs gap-1 opacity-90 hover:opacity-100"
                >
                  {copiedField === 'codeSnippet' ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{copiedField === 'codeSnippet' ? 'Copiado' : 'Copiar Código'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    Headers Obrigatórios
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Sempre envie <code>Authorization: Bearer &lt;chave&gt;</code> e <code>Content-Type: application/json</code>.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    Método HTTP
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Todas as ferramentas utilizam o método <code>POST</code> com payload JSON no corpo da requisição.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" />
                    Rate Limit
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Cada chave possui limite de requisições por hora configurável no painel com cabeçalhos de controle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Escopos & Permissões */}
        <TabsContent value="scopes" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="size-4.5 text-primary" />
                Matriz de Escopos da API
              </CardTitle>
              <CardDescription className="text-xs">
                As chaves de API podem ser configuradas com permissões restritas para maior segurança.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
                {(mcpStatus?.availableScopes || [
                  { id: 'orders:read', label: 'Consultar Pedidos', description: 'Leitura de pedidos, status de produção e resumo diário.', requiresAdmin: false },
                  { id: 'orders:create', label: 'Criar Pedidos', description: 'Criação de novos pedidos de clientes diretamente na fila.', requiresAdmin: false },
                  { id: 'orders:update', label: 'Atualizar Pedidos', description: 'Modificação de dados, itens e observações de pedidos existentes.', requiresAdmin: false },
                  { id: 'customers:read', label: 'Consultar Clientes', description: 'Busca por clientes, contatos de WhatsApp e histórico.', requiresAdmin: false },
                  { id: 'pricing:estimate', label: 'Calcular Precificação', description: 'Cálculo de custos de insumos, margem e preço sugerido.', requiresAdmin: false },
                  { id: 'financial:read', label: 'Resumo Financeiro', description: 'Leitura de faturamento, ticket médio e fluxo financeiro.', requiresAdmin: true },
                ]).map((scope) => (
                  <div key={scope.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-muted/20 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-bold text-primary font-mono">{scope.id}</code>
                        {scope.requiresAdmin && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{scope.description}</p>
                    </div>
                    <span className="text-xs font-medium text-foreground shrink-0">{scope.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ApiDocs;
