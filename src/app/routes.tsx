import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './pages/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionRoute } from './components/PermissionRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { AuthAction } from './pages/AuthAction';

/**
 * Carregador lazy resiliente a falhas de rede e descompasso de chunks pós-deploy.
 *
 * Mecanismo de Garantia Quádrupla:
 * 1. Resolução segura de componente: suporte transparente a named export (`m[name]`) e default export (`m.default`).
 * 2. Retry em memória (800ms) para oscilações temporárias de conexão.
 * 3. Auto-recuperação (Auto-Reload Inteligente): caso o chunk tenha sido removido do servidor
 *    por um deploy recente ou o script retorne inválido/indefinido, limpa cache/storage e recarrega
 *    a página suavemente (com flag em sessionStorage para prevenção estrita de loops).
 * 4. Fallback final amigável com ErrorBoundary para o usuário se o reload não resolver.
 */
const CHUNK_RELOAD_KEY = 'luisices_chunk_auto_reload_attempted';

function isChunkOrStaleDeployError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch') ||
    msg.includes('loading chunk') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('cannot read properties of undefined') ||
    msg.includes('unexpected token') ||
    msg.includes('is not a valid javascript mime type')
  );
}

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<any>,
  componentName?: string
) {
  return lazy(async () => {
    const resolveComponent = (m: any): { default: T } => {
      if (!m) {
        throw new Error(
          `Falha de carregamento: módulo '${componentName || 'componente'}' é nulo ou indefinido`
        );
      }
      const resolved = (componentName && m[componentName]) || m.default || m;
      if (!resolved || (typeof resolved !== 'function' && typeof resolved !== 'object')) {
        throw new Error(
          `Componente '${componentName || 'default'}' não encontrado no módulo carregado`
        );
      }
      return { default: resolved as T };
    };

    try {
      const module = await importer();
      // Resetar flag de reload ao carregar com sucesso
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }
      return resolveComponent(module);
    } catch (firstError) {
      console.warn('[lazyWithRetry] Falha na 1ª tentativa do chunk, retentando...', firstError);
      await new Promise((resolve) => setTimeout(resolve, 800));

      try {
        const module = await importer();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        }
        return resolveComponent(module);
      } catch (secondError) {
        console.error('[lazyWithRetry] Falha na 2ª tentativa do chunk:', secondError);

        // Se estiver no navegador e o erro for de descompasso de chunk/deploy, executa auto-recuperação
        if (typeof window !== 'undefined' && isChunkOrStaleDeployError(secondError)) {
          const hasReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
          if (!hasReloaded) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, 'true');
            console.info('[lazyWithRetry] Detectada nova versão do sistema. Atualizando automaticamente...');

            // Limpa Service Worker e Caches antes do reload para garantir versão fresca
            try {
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
            } catch {
              // Ignore cache cleanup errors on reload
            }

            window.location.reload();
            // Retorna promessa que não resolve enquanto a página descarrega
            return new Promise<{ default: T }>(() => {});
          }
        }

        // Se já houve auto-reload e mesmo assim falhou, repassa para o ErrorBoundary
        throw secondError;
      }
    }
  });
}

// Páginas carregadas sob demanda com proteção e resolução segura (named ou default export)
const Dashboard          = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard');
const WeeklyCalendar     = lazyWithRetry(() => import('./pages/WeeklyCalendar'), 'WeeklyCalendar');
const Customers          = lazyWithRetry(() => import('./pages/Customers'), 'Customers');
const Reports            = lazyWithRetry(() => import('./pages/Reports'), 'Reports');
const Settings           = lazyWithRetry(() => import('./pages/Settings'), 'Settings');
const Quotes             = lazyWithRetry(() => import('./pages/Quotes'), 'Quotes');
const Products           = lazyWithRetry(() => import('./pages/Products'), 'Products');
const Gallery            = lazyWithRetry(() => import('./pages/Gallery'), 'Gallery');
const Exchanges          = lazyWithRetry(() => import('./pages/Exchanges'), 'Exchanges');
const Users              = lazyWithRetry(() => import('./pages/Users'), 'Users');
const HelpCenter         = lazyWithRetry(() => import('./pages/HelpCenter'), 'HelpCenter');
const Emails             = lazyWithRetry(() => import('./pages/Emails'), 'Emails');
const Pricing            = lazyWithRetry(() => import('./pages/Pricing'), 'Pricing');
const FixNegativeValues  = lazyWithRetry(() => import('./pages/FixNegativeValues'));
const PublicCatalog      = lazyWithRetry(() => import('./pages/PublicCatalog'), 'PublicCatalog');
const StoreCustomization = lazyWithRetry(() => import('./pages/StoreCustomization'), 'StoreCustomization');
const StoreProducts      = lazyWithRetry(() => import('./pages/StoreProducts'), 'StoreProducts');
const StoreOrders        = lazyWithRetry(() => import('./pages/StoreOrders'), 'StoreOrders');

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Configurar basename para GitHub Pages
// Em desenvolvimento: '' (vazio)
// Em produção (GitHub Pages): '/luisices/' ou o nome do seu repositório
const basename = import.meta.env.BASE_URL || '/';

// Detecção de subdomínio de catálogo/loja (ex: loja.dev.luisices.com.br, catalogo.dev.luisices.com.br, etc.)
// Também aceita parâmetro ?view=loja ou ?view=catalog para testes locais ou de desenvolvimento
const isCatalogSubdomain = typeof window !== 'undefined' && (() => {
  const host = window.location.hostname.toLowerCase();
  const view = (new URLSearchParams(window.location.search).get('view') || '').toLowerCase();
  return (
    host.startsWith('loja.') ||
    host.startsWith('lojinha.') ||
    host.startsWith('catalogo.') ||
    host.startsWith('catalog.') ||
    ['loja', 'lojinha', 'catalog', 'catalogo'].includes(view)
  );
})();

export const router = isCatalogSubdomain
  ? createBrowserRouter([
      {
        path: '/',
        element: <Lazy><PublicCatalog /></Lazy>,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/login',
        element: <Navigate to="/" replace />,
      },
      {
        path: '*',
        element: <Lazy><PublicCatalog /></Lazy>,
        errorElement: <ErrorBoundary />,
      },
    ], { basename })
  : createBrowserRouter([
      {
        path: '/login',
        element: <Login />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/registrar',
        element: <Register />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/recuperar-senha',
        element: <ResetPassword />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/action',
        element: <AuthAction />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/loja',
        element: <Lazy><PublicCatalog /></Lazy>,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/lojinha',
        element: <Navigate to="/loja" replace />,
      },
      {
        path: '/catalogo',
        element: <Lazy><PublicCatalog /></Lazy>,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/catalog',
        element: <Navigate to="/loja" replace />,
      },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Lazy><PermissionRoute check={p => p.dashboard}><Dashboard /></PermissionRoute></Lazy>,
      },
      {
        path: 'agenda',
        element: <Lazy><PermissionRoute check={p => p.orders?.view ?? false}><WeeklyCalendar /></PermissionRoute></Lazy>,
      },
      {
        path: 'clientes',
        element: <Lazy><PermissionRoute check={p => p.customers?.view ?? false}><Customers /></PermissionRoute></Lazy>,
      },
      {
        path: 'relatorios',
        element: <Lazy><PermissionRoute check={p => p.reports} allowUserRole><Reports /></PermissionRoute></Lazy>,
      },
      {
        path: 'orcamentos',
        element: <Lazy><PermissionRoute check={p => p.quotes?.view ?? false}><Quotes /></PermissionRoute></Lazy>,
      },
      {
        path: 'produtos',
        element: <Lazy><PermissionRoute check={p => p.products?.view ?? false}><Products /></PermissionRoute></Lazy>,
      },
      {
        path: 'precificacao',
        element: <Lazy><PermissionRoute check={p => p.pricing ?? false} allowUserRole><Pricing /></PermissionRoute></Lazy>,
      },
      {
        path: 'galeria',
        element: <Lazy><PermissionRoute check={p => p.gallery?.view ?? false}><Gallery /></PermissionRoute></Lazy>,
      },
      {
        path: 'permutas',
        element: <Lazy><PermissionRoute check={p => p.exchanges} allowUserRole><Exchanges /></PermissionRoute></Lazy>,
      },
      {
        path: 'configuracoes',
        element: <Lazy><PermissionRoute check={p => p.settings} allowUserRole><Settings /></PermissionRoute></Lazy>,
      },
      {
        path: 'personalizar-lojinha',
        element: <Lazy><PermissionRoute check={p => p.store ?? false} allowUserRole><StoreCustomization /></PermissionRoute></Lazy>,
      },
      {
        path: 'produtos-lojinha',
        element: <Lazy><PermissionRoute check={p => p.storeProducts?.view ?? p.store ?? false} allowUserRole><StoreProducts /></PermissionRoute></Lazy>,
      },
      {
        path: 'pedidos-lojinha',
        element: <Lazy><PermissionRoute check={p => Boolean(p.store || p.storeProducts?.view || p.orders?.view)} allowUserRole><StoreOrders /></PermissionRoute></Lazy>,
      },
      {
        path: 'lojinha/pedidos',
        element: <Navigate to="/pedidos-lojinha" replace />,
      },
      {
        path: 'lojinha/produtos',
        element: <Navigate to="/produtos-lojinha" replace />,
      },
      {
        path: 'settings',  // Alias em inglês
        element: <Navigate to="/configuracoes" replace />,
      },
      {
        path: 'usuarios',
        element: <Lazy><PermissionRoute check={p => p.users?.view ?? false}><Users /></PermissionRoute></Lazy>,
      },
      {
        path: 'emails',
        element: <Lazy><PermissionRoute check={p => p.emails ?? false}><Emails /></PermissionRoute></Lazy>,
      },
      {
        path: 'ajuda',
        element: <Lazy><HelpCenter /></Lazy>,
      },
      {
        path: 'corrigir-valores',
        element: <Lazy><ProtectedRoute adminOnly><FixNegativeValues /></ProtectedRoute></Lazy>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  basename,
});
