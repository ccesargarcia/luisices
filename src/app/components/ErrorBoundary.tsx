/**
 * Error Boundary Component
 * Componente de fallback para erros de roteamento
 */

import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

export function ErrorBoundary() {
  const error = useRouteError();

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

  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  const isChunkError =
    errorMessage.includes('dynamically imported module') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('Importing a module script failed') ||
    errorMessage.includes('error loading dynamically imported module');

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
          ? 'Uma nova versão do sistema foi publicada. Recarregue a página para aplicar as alterações.'
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
