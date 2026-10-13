/**
 * Serviço de comunicação com o backend de MCP / ChatGPT no Luisices.
 * Comunica-se com as Cloud Functions v2 via httpsCallable.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import {
  McpSettingsStatus,
  CreateMcpKeyParams,
  CreateMcpKeyResult,
} from '../app/types';

export class FirebaseMcpService {
  /**
   * Obtém o status da integração, chaves cadastradas e lista de membros elegíveis.
   */
  async getStatus(): Promise<McpSettingsStatus> {
    const callable = httpsCallable<undefined, McpSettingsStatus>(
      functions,
      'getMcpSettingsStatus'
    );
    const result = await callable();
    return result.data;
  }

  /**
   * Cria uma nova chave de acesso com escopos granulares (Admin).
   */
  async createApiKey(params: CreateMcpKeyParams): Promise<CreateMcpKeyResult> {
    const callable = httpsCallable<CreateMcpKeyParams, CreateMcpKeyResult>(
      functions,
      'createMcpApiKey'
    );
    const result = await callable(params);
    return result.data;
  }

  /**
   * Alterna o estado liga/desliga de uma chave específica.
   */
  async toggleApiKey(keyId: string, enabled: boolean): Promise<{ success: boolean; keyId: string; enabled: boolean }> {
    const callable = httpsCallable<{ keyId: string; enabled: boolean }, { success: boolean; keyId: string; enabled: boolean }>(
      functions,
      'toggleMcpApiKey'
    );
    const result = await callable({ keyId, enabled });
    return result.data;
  }

  /**
   * Revoga / exclui permanentemente uma chave de acesso.
   */
  async revokeApiKey(keyId: string): Promise<{ success: boolean; keyId: string }> {
    const callable = httpsCallable<{ keyId: string }, { success: boolean; keyId: string }>(
      functions,
      'revokeMcpApiKey'
    );
    const result = await callable({ keyId });
    return result.data;
  }

  /**
   * Alterna o interruptor global da integração MCP.
   */
  async toggleGlobal(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    const callable = httpsCallable<{ enabled: boolean }, { success: boolean; enabled: boolean }>(
      functions,
      'toggleGlobalMcp'
    );
    const result = await callable({ enabled });
    return result.data;
  }

  /**
   * Define se um colaborador específico do sistema tem permissão para usar MCP/ChatGPT.
   */
  async setUserEligibility(targetUid: string, eligible: boolean): Promise<{ success: boolean; targetUid: string; eligible: boolean }> {
    const callable = httpsCallable<{ targetUid: string; eligible: boolean }, { success: boolean; targetUid: string; eligible: boolean }>(
      functions,
      'setUserMcpEligibility'
    );
    const result = await callable({ targetUid, eligible });
    return result.data;
  }

  /**
   * Revoga uma sessão ativa de conexão MCP / ChatGPT (usuário próprio ou administrador).
   */
  async revokeSession(sessionId: string): Promise<{ success: boolean; sessionId: string; userId?: string }> {
    const callable = httpsCallable<{ sessionId: string }, { success: boolean; sessionId: string; userId?: string }>(
      functions,
      'revokeMcpSession'
    );
    const result = await callable({ sessionId });
    return result.data;
  }

  /**
   * Revoga todas as sessões MCP / ChatGPT ativas de um colaborador específico.
   */
  async revokeUserSessions(targetUid: string): Promise<{ success: boolean; targetUid: string; revoked: boolean }> {
    const callable = httpsCallable<{ targetUid: string }, { success: boolean; targetUid: string; revoked: boolean }>(
      functions,
      'revokeMcpSession'
    );
    const result = await callable({ targetUid });
    return result.data;
  }
}

export const firebaseMcpService = new FirebaseMcpService();
