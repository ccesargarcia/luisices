/**
 * Error Boundary Component
 * Componente de fallback para erros de roteamento
 */

import { useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { useEffect } from 'react';
import { captureException } from '../../lib/sentry';

export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    if (error && !isRouteErrorResponse(error)) {
      captureException(error, { source: 'ReactRouterErrorBoundary' });
    }
  }, [error]);

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '4rem', margin: '0' }}>404</h1>
          <h2 style={{ fontSize: '1.5rem', margin: '1rem 0' }}>Página não encontrada</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            A página que você está procurando não existe.
          </p>
          <Link
            to="/"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '1rem'
            }}
          >
            Voltar para o Dashboard
          </Link>
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1>Oops!</h1>
        <p>Código do erro: {error.status}</p>
        <p>{error.statusText}</p>
        {error.data?.message && <p>{error.data.message}</p>}
        <Link
          to="/"
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none'
          }}
        >
          Voltar para o Dashboard
        </Link>
      </div>
    );
  }

  const errorMessage = error instanceof Error ? error.message : String(error || 'Erro desconhecido');
  const lowerMsg = errorMessage.toLowerCase();

  const isChunkError =
    lowerMsg.includes('dynamically imported module') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('loading chunk') ||
    lowerMsg.includes('importing a module script failed') ||
    lowerMsg.includes('error loading dynamically imported module') ||
    lowerMsg.includes('cannot read properties of undefined') ||
    lowerMsg.includes('unexpected token') ||
    lowerMsg.includes('is not a valid javascript mime type') ||
    lowerMsg.includes('módulo') && lowerMsg.includes('indefinido');

  const handleReload = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
      sessionStorage.removeItem('luisices_chunk_auto_reload_attempted');
    } catch {}
    window.location.reload();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1>{isChunkError ? 'Nova versão disponível' : 'Algo deu errado'}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        {isChunkError
          ? 'Uma nova versão do sistema foi publicada ou a conexão foi restabelecida. Clique abaixo para carregar a versão mais recente.'
          : 'Ocorreu um erro inesperado na aplicação.'}
      </p>
      <pre style={{
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        borderRadius: '6px',
        maxWidth: '600px',
        overflow: 'auto',
        fontSize: '0.875rem'
      }}>
        {errorMessage}
      </pre>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleReload}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Atualizar e Recarregar
        </button>
        <Link
          to="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#e2e8f0',
            color: '#1e293b',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
