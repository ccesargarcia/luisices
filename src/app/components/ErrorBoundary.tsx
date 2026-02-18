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
      <h1>Algo deu errado</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Ocorreu um erro inesperado na aplicação.
      </p>
      <pre style={{
        backgroundColor: '#f5f5f5',
        padding: '1rem',
        borderRadius: '6px',
        maxWidth: '600px',
        overflow: 'auto',
        fontSize: '0.875rem'
      }}>
        {error instanceof Error ? error.message : 'Erro desconhecido'}
      </pre>
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
