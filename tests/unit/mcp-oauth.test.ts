import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOauthProtectedResourceMetadata,
  getOauthAuthorizationServerMetadata,
  calculateS256Challenge,
  validateOAuthAccessToken,
} from '../../functions/mcp/oauth.js';
import { validateMcpRequest } from '../../functions/mcp/auth.js';
import apiWorker from '../../cloudflare/api-worker/src/index.js';

describe('OAuth 2.1 & Protected Resource Metadata for MCP / ChatGPT', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Discovery Endpoints & Metadata', () => {
    it('deve gerar metadata de recurso protegido estritamente aderente ao RFC 9723', () => {
      const baseUrl = 'https://api.dev.luisices.com.br/chatGptToolsEndpoint';
      const metadata = getOauthProtectedResourceMetadata(baseUrl);

      expect(metadata.resource).toBe('https://api.dev.luisices.com.br');
      expect(metadata.authorization_servers).toEqual(['https://api.dev.luisices.com.br']);
      expect(metadata.scopes_supported).toContain('orders:read');
      expect(metadata.scopes_supported).toContain('orders:draft');
      expect(metadata.scopes_supported).toContain('customers:read');
      expect(metadata.bearer_methods_supported).toEqual(['header']);
      expect(metadata.resource_documentation).toBe('https://api.dev.luisices.com.br/chatGptToolsEndpoint/openapi.json');
    });

    it('deve gerar metadata de servidor de autorização estritamente aderente ao RFC 8414 (OAuth 2.1)', () => {
      const baseUrl = 'https://api.dev.luisices.com.br/chatGptToolsEndpoint';
      const metadata = getOauthAuthorizationServerMetadata(baseUrl);

      expect(metadata.issuer).toBe('https://api.dev.luisices.com.br');
      expect(metadata.authorization_endpoint).toBe('https://api.dev.luisices.com.br/oauth/authorize');
      expect(metadata.token_endpoint).toBe('https://api.dev.luisices.com.br/oauth/token');
      expect(metadata.registration_endpoint).toBe('https://api.dev.luisices.com.br/oauth/register');
      expect(metadata.response_types_supported).toEqual(['code']);
      expect(metadata.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
      expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
      expect(metadata.token_endpoint_auth_methods_supported).toContain('none');
    });

    it('deve servir /.well-known/oauth-protected-resource via Cloudflare Worker proxy', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            resource: 'https://api.dev.luisices.com.br',
            authorization_servers: ['https://api.dev.luisices.com.br'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.dev.luisices.com.br/.well-known/oauth-protected-resource');
      const res = await apiWorker.fetch(request, { ENVIRONMENT: 'dev' }, {});

      expect(res.status).toBe(200);
      const [targetUrl] = mockFetch.mock.calls[0];
      expect(targetUrl).toBe(
        'https://us-central1-luisices-dev.cloudfunctions.net/chatGptToolsEndpoint/.well-known/oauth-protected-resource'
      );
    });

    it('deve servir /.well-known/oauth-authorization-server via Cloudflare Worker proxy', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            issuer: 'https://api.dev.luisices.com.br',
            code_challenge_methods_supported: ['S256'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('https://api.dev.luisices.com.br/.well-known/oauth-authorization-server');
      const res = await apiWorker.fetch(request, { ENVIRONMENT: 'dev' }, {});

      expect(res.status).toBe(200);
      const [targetUrl] = mockFetch.mock.calls[0];
      expect(targetUrl).toBe(
        'https://us-central1-luisices-dev.cloudfunctions.net/chatGptToolsEndpoint/.well-known/oauth-authorization-server'
      );
    });
  });

  describe('2. Validação Criptográfica de PKCE (S256)', () => {
    it('deve calcular corretamente o challenge S256 no formato base64url', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const computed = calculateS256Challenge(verifier);

      expect(computed).toBeDefined();
      expect(typeof computed).toBe('string');
      expect(computed).not.toContain('+');
      expect(computed).not.toContain('/');
      expect(computed).not.toContain('=');
    });

    it('deve gerar challenges diferentes para verifiers distintos', () => {
      const verifierA = 'code_verifier_alpha_1234567890_test_pkce_challenge';
      const verifierB = 'code_verifier_beta_9876543210_test_pkce_challenge';

      expect(calculateS256Challenge(verifierA)).not.toBe(calculateS256Challenge(verifierB));
    });
  });

  describe('3. Validação de Access Token OAuth 2.1 & Isolamento de Usuários', () => {
    it('deve validar com sucesso token OAuth ativo vinculado ao colaborador correto', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: (token: string) => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    accessToken: token,
                    userId: 'user_colab_123',
                    clientId: 'client_aaaaaaaaaaaaaaaaaaaaaaaa',
                    sessionId: 'sess_active',
                    authTime: Math.floor(Date.now() / 1000),
                    scopes: ['orders:read', 'customers:read'],
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                  }),
                }),
              }),
            };
          }
          if (colName === 'oauthSessions') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ userId: 'user_colab_123', clientId: 'client_aaaaaaaaaaaaaaaaaaaaaaaa', iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', expiresAt: Date.now() + 3600000, active: true, revoked: false }) }) }) };
          }
          if (colName === 'oauthClients') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ enabled: true }) }) }) };
          }
          if (colName === 'userProfiles') {
            return {
              doc: (uid: string) => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    uid,
                    displayName: 'Colaborador Teste',
                    email: 'colab@luisices.com.br',
                    role: 'funcionario',
                    active: true,
                    permissions: { mcpAccess: true },
                  }),
                }),
              }),
            };
          }
          if (colName === 'integrationSettings') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({ enabled: true }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
        runTransaction: async (work: any) => work({
          get: async () => ({ exists: false, data: () => undefined }),
          set: () => {},
        }),
      };

      const result = await validateOAuthAccessToken('lui_oauth_at_valid_token_123', mockDb);
      expect(result.success).toBe(true);
      expect(result.keyData.userId).toBe('user_colab_123');
      expect(result.userProfile.email).toBe('colab@luisices.com.br');
      expect(result.scope.uid).toBe('user_colab_123');
    });

    it('deve rejeitar token OAuth expirado', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    userId: 'user_123',
                    expiresAt: Date.now() - 1000, // Expirado
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await validateOAuthAccessToken('lui_oauth_at_expired_token', mockDb);
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    it('deve rejeitar token OAuth com issuer incorreto', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    userId: 'user_123',
                    iss: 'https://malicious-issuer.com',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await validateOAuthAccessToken('lui_oauth_at_wrong_issuer', mockDb);
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('INVALID_ISSUER');
    });

    it('deve rejeitar token de usuário inativo ou suspenso', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    userId: 'user_suspended',
                    clientId: 'client_bbbbbbbbbbbbbbbbbbbbbbbb',
                    sessionId: 'session_suspended',
                    authTime: Math.floor(Date.now() / 1000),
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                  }),
                }),
              }),
            };
          }
          if (colName === 'oauthSessions') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ userId: 'user_suspended', clientId: 'client_bbbbbbbbbbbbbbbbbbbbbbbb', iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', active: true, revoked: false, expiresAt: Date.now() + 3600000 }) }) }) };
          }
          if (colName === 'oauthClients') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ enabled: true }) }) }) };
          }
          if (colName === 'userProfiles') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    active: false,
                    status: 'paused',
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await validateOAuthAccessToken('lui_oauth_at_suspended_user', mockDb);
      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.code).toBe('USER_INACTIVE');
    });

    it('deve garantir compatibilidade contínua com chaves estáticas legadas lui_dev_...', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'integrationSettings') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({ enabled: true }),
                }),
              }),
            };
          }
          if (colName === 'mcpApiKeys') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    keyId: 'k_dev_123',
                    userId: 'user_legacy_123',
                    enabled: true,
                    scopes: ['orders:read'],
                  }),
                }),
              }),
            };
          }
          if (colName === 'userProfiles') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    uid: 'user_legacy_123',
                    displayName: 'Legacy User',
                    active: true,
                    permissions: { mcpAccess: true },
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const req: any = {
        headers: {
          authorization: 'Bearer lui_dev_abcdef123456789012345678901234567890',
        },
      };

      const result = await validateMcpRequest(req, mockDb);
      expect(result.success).toBe(true);
      expect(result.keyData.userId).toBe('user_legacy_123');
    });

    it('deve rejeitar chamadas sem cabeçalho Authorization com status 401', async () => {
      const mockDb: any = {
        collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }),
      };

      const req: any = { headers: {} };
      const result = await validateMcpRequest(req, mockDb);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('deve rejeitar token OAuth revogado explicitamente (revoked: true)', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    userId: 'user_123',
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                    revoked: true,
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await validateOAuthAccessToken('lui_oauth_at_revoked_token', mockDb);
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('TOKEN_REVOKED');
      expect(result.message).toContain('revogada');
    });

    it('deve rejeitar token quando a sessão MCP vinculada foi revogada (SESSION_REVOKED)', async () => {
      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    userId: 'user_123',
                    clientId: 'client_aaaaaaaaaaaaaaaaaaaaaaaa',
                    sessionId: 'sess_999',
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                    revoked: false,
                  }),
                }),
              }),
            };
          }
          if (colName === 'oauthSessions') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    sessionId: 'sess_999',
                    userId: 'user_123',
                    clientId: 'client_aaaaaaaaaaaaaaaaaaaaaaaa',
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                    active: false,
                    revoked: true,
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await validateOAuthAccessToken('lui_oauth_at_session_revoked', mockDb);
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('SESSION_REVOKED');
      expect(result.message).toContain('revogada');
    });
  });
});
