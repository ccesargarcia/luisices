/**
 * Sentry Observability Configuration
 *
 * Monitoramento de erros em tempo real e rastreamento de performance
 * para a plataforma Luisices.
 */

import * as Sentry from '@sentry/react';

const DEFAULT_SENTRY_DSN = 'https://d29ba26f91dac0c5c56b94866f16c461@o4512090827980800.ingest.us.sentry.io/4512090844626944';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN || DEFAULT_SENTRY_DSN;

  if (!dsn || typeof window === 'undefined') return;

  const isDev =
    import.meta.env.DEV ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('dev.luisices');

  Sentry.init({
    dsn,
    environment: isDev ? 'development' : 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Rastreamento de performance: amostra controlada de 20% para respeitar cota gratuita
    tracesSampleRate: isDev ? 1.0 : 0.2,

    // Session Replay: grava sessão em vídeo interativo apenas quando ocorrer erro
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,

    // Ignorar ruídos inofensivos de extensões de navegador ou rede intermitente
    ignoreErrors: [
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
      'chrome-extension://',
      'moz-extension://',
    ],
  });
}

/**
 * Utilitário para reportar erros manuais capturados no código com contexto
 */
export function captureException(error: unknown, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Inicia o rastreamento de execução de um Agente de IA (gen_ai.invoke_agent)
 * Compatível com o painel Sentry AI Agents & Conversations
 */
export function traceAgentRun<T>(
  agentName: string,
  conversationId: string,
  fn: () => Promise<T> | T,
  attributes?: Record<string, any>
): Promise<T> | T {
  // Limpa o ID da conversa para garantir formato seguro (sem barras)
  const cleanConvId = conversationId.replace(/[\/\\]/g, '_');
  return Sentry.startSpan(
    {
      name: `invoke_agent ${agentName}`,
      op: 'gen_ai.invoke_agent',
      attributes: {
        'gen_ai.agent.name': agentName,
        'gen_ai.conversation.id': cleanConvId,
        ...attributes,
      },
    },
    () => fn()
  );
}

/**
 * Inicia o rastreamento de uma chamada LLM / Chat de IA (gen_ai.chat)
 * Permite registrar modelos, tokens e histórico de conversas no Sentry Explore > Conversations
 */
export function traceAIChat<T>(
  model: string,
  conversationId: string,
  fn: (span?: any) => Promise<T> | T,
  options?: {
    inputMessages?: Array<{ role: string; content: string; reasoning?: string }>;
    systemInstruction?: string;
  }
): Promise<T> | T {
  const cleanConvId = conversationId.replace(/[\/\\]/g, '_');
  const spanAttributes: Record<string, any> = {
    'gen_ai.request.model': model,
    'gen_ai.conversation.id': cleanConvId,
  };

  if (options?.systemInstruction) {
    spanAttributes['gen_ai.system_instructions'] = options.systemInstruction;
  }

  if (options?.inputMessages) {
    spanAttributes['gen_ai.input.messages'] = JSON.stringify(
      options.inputMessages.map((m) => ({
        role: m.role,
        parts: m.reasoning
          ? [
              { type: 'reasoning', content: m.reasoning },
              { type: 'text', content: m.content },
            ]
          : [{ type: 'text', content: m.content }],
      }))
    );
  }

  return Sentry.startSpan(
    {
      name: `chat ${model}`,
      op: 'gen_ai.chat',
      attributes: spanAttributes,
    },
    (span) => fn(span)
  );
}

/**
 * Inicia o rastreamento de execução de uma Tool / Ferramenta de Agente (gen_ai.execute_tool)
 */
export function traceAITool<T>(
  toolName: string,
  fn: () => Promise<T> | T,
  attributes?: Record<string, any>
): Promise<T> | T {
  return Sentry.startSpan(
    {
      name: `execute_tool ${toolName}`,
      op: 'gen_ai.execute_tool',
      attributes: {
        'gen_ai.tool.name': toolName,
        ...attributes,
      },
    },
    () => fn()
  );
}

export { Sentry };

