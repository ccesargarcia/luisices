/**
 * Serviço de comunicação com o backend de MCP / ChatGPT no Luisices.
 * Roteia via Vercel (/api/mcp-admin) ou Cloud Functions v2 (httpsCallable) conforme feature flag.
 */

import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import { getVercelBetaApiUrl } from '../app/utils/betaHost';
import { executeWithGcpFallback, VercelInfraError } from './backendRoutingService';
import {
  McpSettingsStatus,
  CreateMcpKeyParams,
  CreateMcpKeyResult,
  McpAuditLog,
} from '../app/types';

async function callBetaMcpApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para gerenciar a integração MCP.');
  const idToken = await user.getIdToken();
  const response = await fetch(getVercelBetaApiUrl('/api/mcp-admin'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    cache: 'no-store',
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status >= 500 && !data?.error?.code) {
      throw new VercelInfraError(`Erro na integração MCP (${response.status}).`, response.status);
    }
    const err = new Error(data?.error?.message || `Erro na integração MCP (${response.status}).`);
    if (data?.error?.code) Object.assign(err, { code: data.error.code });
    if (data?.error?.details !== undefined) Object.assign(err, { details: data.error.details });
    Object.assign(err, { status: response.status });
    throw err;
  }
  return data as T;
}

export class FirebaseMcpService {
  /**
   * Obtém o status da integração, chaves cadastradas e lista de membros elegíveis.
   */
  async getStatus(): Promise<McpSettingsStatus> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<McpSettingsStatus>('getStatus'),
      async () => {
        const callable = httpsCallable<undefined, McpSettingsStatus>(
          functions,
          'getMcpSettingsStatus'
        );
        const result = await callable();
        return result.data;
      },
    );
  }

  /**
   * Cria uma nova chave de acesso com escopos granulares (Admin).
   */
  async createApiKey(params: CreateMcpKeyParams): Promise<CreateMcpKeyResult> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<CreateMcpKeyResult>('createApiKey', { ...params }),
      async () => {
        const callable = httpsCallable<CreateMcpKeyParams, CreateMcpKeyResult>(
          functions,
          'createMcpApiKey'
        );
        const result = await callable(params);
        return result.data;
      },
    );
  }

  /** Atualiza os escopos granulares de uma chave existente. */
  async updateApiKeyScopes(keyId: string, scopes: string[]): Promise<{ success: boolean; keyId: string; scopes: string[] }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; keyId: string; scopes: string[] }>('updateApiKeyScopes', { keyId, scopes }),
      async () => {
        const callable = httpsCallable<{ keyId: string; scopes: string[] }, { success: boolean; keyId: string; scopes: string[] }>(
          functions,
          'updateMcpApiKeyScopes'
        );
        const result = await callable({ keyId, scopes });
        return result.data;
      },
    );
  }

  /**
   * Alterna o estado liga/desliga de uma chave específica.
   */
  async toggleApiKey(keyId: string, enabled: boolean): Promise<{ success: boolean; keyId: string; enabled: boolean }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; keyId: string; enabled: boolean }>('toggleApiKey', { keyId, enabled }),
      async () => {
        const callable = httpsCallable<{ keyId: string; enabled: boolean }, { success: boolean; keyId: string; enabled: boolean }>(
          functions,
          'toggleMcpApiKey'
        );
        const result = await callable({ keyId, enabled });
        return result.data;
      },
    );
  }

  /**
   * Revoga / exclui permanentemente uma chave de acesso.
   */
  async revokeApiKey(keyId: string): Promise<{ success: boolean; keyId: string }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; keyId: string }>('revokeApiKey', { keyId }),
      async () => {
        const callable = httpsCallable<{ keyId: string }, { success: boolean; keyId: string }>(
          functions,
          'revokeMcpApiKey'
        );
        const result = await callable({ keyId });
        return result.data;
      },
    );
  }

  /**
   * Alterna o interruptor global da integração MCP.
   */
  async toggleGlobal(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; enabled: boolean }>('toggleGlobal', { enabled }),
      async () => {
        const callable = httpsCallable<{ enabled: boolean }, { success: boolean; enabled: boolean }>(
          functions,
          'toggleGlobalMcp'
        );
        const result = await callable({ enabled });
        return result.data;
      },
    );
  }

  /**
   * Define se um colaborador específico do sistema tem permissão para usar MCP/ChatGPT.
   */
  async setUserEligibility(targetUid: string, eligible: boolean, scopes?: string[]): Promise<{ success: boolean; targetUid: string; eligible: boolean; scopes?: string[] }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; targetUid: string; eligible: boolean; scopes?: string[] }>('setUserEligibility', { targetUid, eligible, scopes }),
      async () => {
        const callable = httpsCallable<{ targetUid: string; eligible: boolean; scopes?: string[] }, { success: boolean; targetUid: string; eligible: boolean; scopes?: string[] }>(
          functions,
          'setUserMcpEligibility'
        );
        const result = await callable({ targetUid, eligible, scopes });
        return result.data;
      },
    );
  }

  /**
   * Revoga uma sessão ativa de conexão MCP / ChatGPT (usuário próprio ou administrador).
   */
  async revokeSession(sessionId: string): Promise<{ success: boolean; sessionId: string; userId?: string }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; sessionId: string; userId?: string }>('revokeSession', { sessionId }),
      async () => {
        const callable = httpsCallable<{ sessionId: string }, { success: boolean; sessionId: string; userId?: string }>(
          functions,
          'revokeMcpSession'
        );
        const result = await callable({ sessionId });
        return result.data;
      },
    );
  }

  /**
   * Revoga todas as sessões MCP / ChatGPT ativas de um colaborador específico.
   */
  async revokeUserSessions(targetUid: string): Promise<{ success: boolean; targetUid: string; revoked: boolean }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; targetUid: string; revoked: boolean }>('revokeSession', { targetUid }),
      async () => {
        const callable = httpsCallable<{ targetUid: string }, { success: boolean; targetUid: string; revoked: boolean }>(
          functions,
          'revokeMcpSession'
        );
        const result = await callable({ targetUid });
        return result.data;
      },
    );
  }

  /**
   * Obtém os últimos logs de auditoria de chamadas do MCP (Admin).
   */
  async getAuditLogs(limitCount = 25): Promise<{ success: boolean; logs: McpAuditLog[] }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{ success: boolean; logs: McpAuditLog[] }>('getAuditLogs', { limit: limitCount }),
      async () => {
        const callable = httpsCallable<{ limit?: number }, { success: boolean; logs: McpAuditLog[] }>(
          functions,
          'getMcpAuditLogs'
        );
        const result = await callable({ limit: limitCount });
        return result.data;
      },
    );
  }

  /**
   * Obtém a especificação OpenAPI 3.0.3 autenticada para a documentação Swagger.
   */
  async getOpenApiSchema(): Promise<{
    success: boolean;
    environment: 'dev' | 'prod';
    endpointBaseUrl: string;
    openapiUrl: string;
    schema: any;
  }> {
    return executeWithGcpFallback(
      'mcpAdmin',
      () => callBetaMcpApi<{
        success: boolean;
        environment: 'dev' | 'prod';
        endpointBaseUrl: string;
        openapiUrl: string;
        schema: any;
      }>('getOpenApiSchema'),
      async () => {
        const callable = httpsCallable<
          undefined,
          { success: boolean; environment: 'dev' | 'prod'; endpointBaseUrl: string; openapiUrl: string; schema: any }
        >(functions, 'getMcpOpenApiSchema');
        const result = await callable();
        return result.data;
      },
    );
  }
}

export const firebaseMcpService = new FirebaseMcpService();
