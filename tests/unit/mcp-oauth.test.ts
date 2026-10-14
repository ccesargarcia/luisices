import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOauthProtectedResourceMetadata,
  getOauthAuthorizationServerMetadata,
  calculateS256Challenge,
  validateOAuthAccessToken,
} from '../../functions/mcp/oauth.js';
import { clearMcpAuthCache, validateMcpRequest } from '../../functions/mcp/auth.js';
import apiWorker from '../../cloudflare/api-worker/src/index.js';
import { createHash } from 'node:crypto';

const accessToken = (label: string) => `lui_oauth_at_${createHash('sha256').update(label).digest('hex')}`;
const employeePermissions = {
  mcpAccess: true,
  orders: { view: true, create: true, edit: true },
  customers: { view: true, create: true, edit: true },
};

describe('OAuth 2.1 & Protected Resource Metadata for MCP / ChatGPT', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearMcpAuthCache();
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
                    permissions: employeePermissions,
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

      const result = await validateOAuthAccessToken(accessToken('valid'), mockDb);
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
        runTransaction: async (work: any) => work({ get: async () => ({ exists: false }), set: () => {} }),
      };

      const result = await validateOAuthAccessToken(accessToken('expired'), mockDb);
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

      const result = await validateOAuthAccessToken(accessToken('wrong-issuer'), mockDb);
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

      const result = await validateOAuthAccessToken(accessToken('suspended-user'), mockDb);
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
                    permissions: { ...employeePermissions, mcpScopes: ['orders:read'] },
                  }),
                }),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
        runTransaction: async (work: any) => work({ get: async () => ({ exists: false }), set: () => {} }),
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

      const result = await validateOAuthAccessToken(accessToken('revoked'), mockDb);
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

      const result = await validateOAuthAccessToken(accessToken('session-revoked'), mockDb);
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe('SESSION_REVOKED');
      expect(result.message).toContain('revogada');
    });

    it('deve filtrar automaticamente escopos administrativos para usuário não-admin sem falhar com erro', async () => {
      const { handleOAuthAuthorize } = await import('../../functions/mcp/oauth.js');
      let createdAuthCodeDoc: any = null;

      const mockTx: any = {
        get: async (ref: any) => {
          if (ref.id === 'req_123456789012345678901234567890123456789012345678') {
            return {
              exists: true,
              data: () => ({
                requestId: 'req_123456789012345678901234567890123456789012345678',
                clientId: 'chatgpt-mcp',
                redirectUri: 'https://chatgpt.com/aip/g-mcp/oauth/callback',
                scope: 'orders:read financial:read team:read',
                codeChallenge: 'A_VALID_BASE64URL_S256_CODE_CHALLENGE_STRING_43',
                codeChallengeMethod: 'S256',
                expiresAt: Date.now() + 600000,
                used: false,
              }),
            };
          }
          if (ref.id === 'user_func_001') {
            return {
              exists: true,
              data: () => ({
                uid: 'user_func_001',
                email: 'funcionario@luisices.com.br',
                role: 'funcionario', // não-admin
                active: true,
                permissions: { ...employeePermissions, mcpScopes: ['orders:read', 'customers:read'] },
              }),
            };
          }
          return { exists: false };
        },
        update: () => {},
        set: (docRef: any, data: any) => {
          createdAuthCodeDoc = data;
        },
      };

      const mockDb: any = {
        collection: (colName: string) => {
          return {
            doc: (docId: string) => ({
              id: docId,
              get: async () => mockTx.get({ id: docId }),
            }),
          };
        },
        runTransaction: async (cb: any) => cb(mockTx),
      };

      const mockGetAuth = () => ({
        verifyIdToken: async () => ({
          uid: 'user_func_001',
          email: 'funcionario@luisices.com.br',
          auth_time: Math.floor(Date.now() / 1000) - 10,
        }),
      });

      const req: any = {
        method: 'POST',
        headers: {
          authorization: 'Bearer mock_valid_firebase_id_token',
        },
        body: {
          request_id: 'req_123456789012345678901234567890123456789012345678',
        },
      };

      let resJson: any = null;
      const res: any = {
        setHeader: () => {},
        status: (code: number) => ({
          json: (data: any) => {
            resJson = { code, ...data };
            return resJson;
          },
        }),
      };

      await handleOAuthAuthorize(req, res, mockDb, mockGetAuth);

      expect(resJson).toBeDefined();
      expect(resJson.code).toBe(200);
      expect(resJson.redirect_uri).toContain('code=lui_code_');
      expect(createdAuthCodeDoc).toBeDefined();
      // Deve ter mantido apenas 'orders:read' e filtrado os escopos de admin
      expect(createdAuthCodeDoc.scope).not.toContain('financial:read');
      expect(createdAuthCodeDoc.scope).not.toContain('team:read');
      expect(createdAuthCodeDoc.scope).toContain('orders:read');
    });
  });

  describe('4. Permissões Granulares, Atualização de Perfil & Renovação (Seção 8)', () => {
    const { getEffectiveUserScopes, handleOAuthToken } = require('../../functions/mcp/oauth.js');

    it('getEffectiveUserScopes: interseção estrita e sem fallback para escopos não solicitados', () => {
      // Solicitação somente de escopo administrativo por usuário comum: retorna array vazio
      expect(getEffectiveUserScopes(['financial:read'], { role: 'funcionario' })).toEqual([]);

      // Solicitação mista: concede apenas os escopos permitidos
      expect(getEffectiveUserScopes(['orders:read', 'financial:read'], { role: 'funcionario', permissions: { orders: { view: true } } })).toEqual(['orders:read']);

      // Lista granular vazia no perfil: bloqueia tudo (retorna [])
      expect(getEffectiveUserScopes(['orders:read'], { role: 'funcionario', permissions: { mcpScopes: [] } })).toEqual([]);

      // Admin com lista granular restritiva: respeita a lista configurada
      expect(getEffectiveUserScopes(['orders:read', 'orders:create'], { role: 'admin', permissions: { mcpScopes: ['orders:read'] } })).toEqual(['orders:read']);

      // Admin sem lista configurada: recebe todos os escopos válidos solicitados
      expect(getEffectiveUserScopes(['orders:read', 'financial:read'], { role: 'admin' })).toEqual(['orders:read']);
    });

    it('validateOAuthAccessToken: bloqueia ferramenta quando a permissão correspondente é removida do perfil', async () => {
      let currentProfile: any = {
        role: 'funcionario',
        active: true,
        permissions: { ...employeePermissions, mcpScopes: ['orders:read', 'orders:create'] },
      };

      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthAccessTokens') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    userId: 'user_colab_999',
                    clientId: 'client_aaaaaaaaaaaaaaaaaaaaaaaa',
                    sessionId: 'sess_live_123',
                    authTime: Math.floor(Date.now() / 1000),
                    scopes: ['orders:read', 'orders:create'],
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 3600000,
                  }),
                }),
              }),
            };
          }
          if (colName === 'oauthSessions') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ userId: 'user_colab_999', clientId: 'client_aaaaaaaaaaaaaaaaaaaaaaaa', iss: 'https://api.dev.luisices.com.br', aud: 'https://api.dev.luisices.com.br', active: true, revoked: false, expiresAt: Date.now() + 3600000 }) }) }) };
          }
          if (colName === 'oauthClients') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ enabled: true }) }) }) };
          }
          if (colName === 'userProfiles') {
            return { doc: () => ({ get: async () => ({ exists: true, data: () => currentProfile }) }) };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
        runTransaction: async (work: any) => work({ get: async () => ({ exists: false }), set: () => {} }),
      };

      // 1. Inicialmente com orders:create
      const initialRes = await validateOAuthAccessToken(accessToken('token-01'), mockDb);
      expect(initialRes.success).toBe(true);
      expect(initialRes.keyData.scopes).toEqual(['orders:read', 'orders:create']);

      // 2. Remove a permissão orders:create do perfil
      currentProfile = {
        role: 'funcionario',
        active: true,
        permissions: { ...employeePermissions, mcpScopes: ['orders:read'] },
      };

      const updatedRes = await validateOAuthAccessToken(accessToken('token-01'), mockDb);
      expect(updatedRes.success).toBe(true);
      expect(updatedRes.keyData.scopes).toEqual(['orders:read']); // orders:create removido imediatamente!

      // 3. Atualiza o perfil para lista vazia de escopos []
      currentProfile = {
        role: 'funcionario',
        active: true,
        permissions: { ...employeePermissions, mcpScopes: [] },
      };

      const emptyRes = await validateOAuthAccessToken(accessToken('token-01'), mockDb);
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.status).toBe(403);
      expect(emptyRes.code).toBe('SCOPE_PERMISSION_DENIED');
    });

    it('handleOAuthToken refresh: reduz escopos se o perfil foi alterado e não acrescenta escopos novos', async () => {
      let currentProfile: any = {
        role: 'funcionario',
        active: true,
        permissions: { ...employeePermissions, mcpScopes: ['orders:read'] },
      };

      const mockDb: any = {
        collection: (colName: string) => {
          if (colName === 'oauthRefreshTokens') {
            return {
              doc: (id: string) => ({
                id,
                get: async () => ({
                  exists: true,
                  data: () => ({
                    refreshToken: id,
                    sessionId: 'sess_rt_123',
                    userId: 'user_rt_01',
                    clientId: 'chatgpt-mcp',
                    authTime: Math.floor(Date.now() / 1000),
                    scope: 'orders:read orders:create',
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    expiresAt: Date.now() + 86400000,
                    revoked: false,
                  }),
                }),
              }),
            };
          }
          if (colName === 'oauthSessions') {
            return {
              doc: (id: string) => ({
                id,
                get: async () => ({
                  exists: true,
                  data: () => ({
                    sessionId: id,
                    userId: 'user_rt_01',
                    clientId: 'chatgpt-mcp',
                    refreshToken: `lui_oauth_rt_${'c'.repeat(64)}`,
                    resource: 'https://api.dev.luisices.com.br',
                    iss: 'https://api.dev.luisices.com.br',
                    aud: 'https://api.dev.luisices.com.br',
                    active: true,
                    revoked: false,
                    expiresAt: Date.now() + 86400000,
                  }),
                }),
              }),
            };
          }
          if (colName === 'oauthClients') {
            return { doc: (id: string) => ({ id, get: async () => ({ exists: true, data: () => ({ enabled: true, grantTypes: ['refresh_token'] }) }) }) };
          }
          if (colName === 'userProfiles') {
            return { doc: (id: string) => ({ id, get: async () => ({ exists: true, data: () => currentProfile }) }) };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
        runTransaction: async (cb: any) => cb({
          get: async (ref: any) => {
            if (ref.id === `lui_oauth_rt_${'c'.repeat(64)}`) {
              return {
                exists: true,
                data: () => ({
                  refreshToken: `lui_oauth_rt_${'c'.repeat(64)}`,
                  resource: 'https://api.dev.luisices.com.br',
                  sessionId: 'sess_rt_123',
                  userId: 'user_rt_01',
                  clientId: 'chatgpt-mcp',
                  scope: 'orders:read orders:create',
                  iss: 'https://api.dev.luisices.com.br',
                  aud: 'https://api.dev.luisices.com.br',
                  expiresAt: Date.now() + 86400000,
                  revoked: false,
                }),
              };
            }
            if (ref.id === 'sess_rt_123') {
              return {
                exists: true,
                data: () => ({
                  sessionId: 'sess_rt_123',
                  userId: 'user_rt_01',
                  clientId: 'chatgpt-mcp',
                  refreshToken: `lui_oauth_rt_${'c'.repeat(64)}`,
                  iss: 'https://api.dev.luisices.com.br',
                  aud: 'https://api.dev.luisices.com.br',
                  active: true,
                  revoked: false,
                  expiresAt: Date.now() + 86400000,
                }),
              };
            }
            if (ref.id === 'user_rt_01') {
              return { exists: true, data: () => currentProfile };
            }
            if (ref.id === 'chatgpt-mcp') {
              return { exists: true, data: () => ({ enabled: true, grantTypes: ['refresh_token'] }) };
            }
            return { exists: false };
          },
          update: () => {},
          set: () => {},
          create: () => {},
        }),
      };

      const req: any = {
        method: 'POST',
        body: {
          grant_type: 'refresh_token',
          refresh_token: `lui_oauth_rt_${'c'.repeat(64)}`,
          client_id: 'chatgpt-mcp',
          resource: 'https://api.dev.luisices.com.br',
        },
      };

      let resData: any = null;
      const res: any = {
        setHeader: () => {},
        status: (code: number) => ({
          json: (data: any) => {
            resData = { code, ...data };
            return resData;
          },
        }),
      };

      await handleOAuthToken(req, res, mockDb);

      expect(resData).toBeDefined();
      expect(resData.code).toBe(200);
      expect(resData.scope).toBe('orders:read'); // Reduziu de orders:read orders:create para orders:read!
    });
  });
});
