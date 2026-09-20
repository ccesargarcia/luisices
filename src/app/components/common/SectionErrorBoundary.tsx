import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { captureException } from '../../../lib/sentry';

interface Props {
  children: ReactNode;
  title?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SectionErrorBoundary] Erro capturado na seção:', error, errorInfo);
    try {
      captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
          sectionTitle: this.props.title,
        },
      });
    } catch {}
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className={`flex flex-col items-center justify-center p-6 my-2 rounded-2xl bg-card/70 border border-destructive/20 text-center shadow-xs backdrop-blur-md animate-in fade-in duration-200 ${
            this.props.className ?? ''
          }`}
        >
          <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-3 shrink-0">
            <AlertCircle className="size-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {this.props.title || 'Falha ao exibir esta seção'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {this.props.fallbackMessage ||
              'Ocorreu um erro inesperado ao renderizar estes dados. O restante do sistema continua operacional.'}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="mt-4 gap-1.5 text-xs font-semibold h-8 rounded-lg cursor-pointer border-border hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            <span>Tentar Novamente</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
