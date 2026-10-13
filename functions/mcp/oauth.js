/**
 * Módulo de Autenticação OAuth 2.1 com Authorization Code + PKCE (S256)
 * e Descoberta de Metadados de Recursos Protegidos para MCP / ChatGPT.
 */

const crypto = require('crypto');
const { COLLECTIONS, MCP_SCOPES } = require('./constants');
const { getCallerScope } = require('../ai/authorization');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Metadata do Recurso Protegido (RFC 9723 / MCP Authorization draft)
 */
function getOauthProtectedResourceMetadata(baseUrl) {
  const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard';
  const defaultDomain = isProd ? 'https://api.luisices.com.br' : 'https://api.dev.luisices.com.br';
  let origin = defaultDomain;
  try {
    if (baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
      const parsedOrigin = new URL(baseUrl).origin;
      if (!parsedOrigin.includes('cloudfunctions.net') && !parsedOrigin.includes('run.app')) {
        origin = parsedOrigin;
      }
    }
  } catch (_e) {
    // fallback para defaultDomain
  }

  const allScopes = Object.values(MCP_SCOPES).map((s) => s.id);

  return {
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: allScopes,
    bearer_methods_supported: ['header'],
    resource_documentation: `${origin}/chatGptToolsEndpoint/openapi.json`,
  };
}

/**
 * Metadata do Servidor de Autorização OAuth 2.1 / OIDC (RFC 8414)
 */
function getOauthAuthorizationServerMetadata(baseUrl) {
  const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard';
  const defaultDomain = isProd ? 'https://api.luisices.com.br' : 'https://api.dev.luisices.com.br';
  let origin = defaultDomain;
  try {
    if (baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
      const parsedOrigin = new URL(baseUrl).origin;
      if (!parsedOrigin.includes('cloudfunctions.net') && !parsedOrigin.includes('run.app')) {
        origin = parsedOrigin;
      }
    }
  } catch (_e) {
    // fallback para defaultDomain
  }

  const allScopes = Object.values(MCP_SCOPES).map((s) => s.id);

  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    scopes_supported: allScopes,
    service_documentation: `${origin}/chatGptToolsEndpoint`,
  };
}

/**
 * Calcula o challenge S256 para validação de PKCE.
 * BASE64URL( SHA256( ASCII(code_verifier) ) )
 */
function calculateS256Challenge(codeVerifier) {
  return crypto
    .createHash('sha256')
    .update(String(codeVerifier || ''), 'utf8')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Endpoint de Registro Dinâmico de Cliente OAuth (RFC 7591)
 */
async function handleOAuthRegister(req, res, db) {
  try {
    const body = req.body || {};
    const clientName = body.client_name || 'ChatGPT MCP Client';
    const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0
      ? body.redirect_uris
      : ['https://chatgpt.com/aip/g-mcp/oauth/callback'];

    const clientId = `client_${crypto.randomBytes(12).toString('hex')}`;
    const clientSecret = `secret_${crypto.randomBytes(24).toString('hex')}`;

    const clientData = {
      clientId,
      clientSecret,
      clientName,
      redirectUris,
      createdAt: new Date().toISOString(),
      expiresAt: 0,
    };

    if (db) {
      await db.collection('oauthClients').doc(clientId).set(clientData);
    }

    return res.status(201).json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });
  } catch (err) {
    console.error('[OAuth] Erro no registro de cliente:', err.message);
    return res.status(500).json({ error: 'server_error', error_description: 'Erro interno ao registrar cliente OAuth.' });
  }
}

/**
 * Handling do fluxo de Autorização OAuth 2.1 (GET renderiza formulário, POST processa login)
 */
async function handleOAuthAuthorize(req, res, db, getAuth) {
  const query = req.method === 'GET' ? req.query : (req.body || {});
  const responseType = query.response_type;
  const clientId = query.client_id || 'chatgpt-mcp';
  const redirectUri = query.redirect_uri;
  const scope = query.scope || 'orders:read orders:draft customers:read pricing:estimate whatsapp:compose gallery:read';
  const state = query.state || '';
  const codeChallenge = query.code_challenge;
  const codeChallengeMethod = query.code_challenge_method || 'S256';

  if (!redirectUri) {
    return res.status(400).send('Parâmetro obrigatório "redirect_uri" ausente.');
  }

  if (responseType !== 'code') {
    return res.status(400).send('Tipo de resposta inválido. Apenas response_type=code é aceito.');
  }

  if (!codeChallenge) {
    return res.status(400).send('OAuth 2.1 exige verificação PKCE com parâmetro code_challenge.');
  }

  if (codeChallengeMethod !== 'S256') {
    return res.status(400).send('Apenas o método de challenge S256 é suportado.');
  }

  // Renderização HTML da tela de consentimento e login no GET
  if (req.method === 'GET') {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorizar Conexão - Luisices Ateliê</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
    .card { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; width: 100%; max-width: 420px; padding: 28px; box-sizing: border-box; }
    .brand { font-size: 20px; font-weight: 700; color: #db2777; margin-bottom: 4px; text-align: center; }
    .subtitle { font-size: 14px; color: #64748b; text-align: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    input[type="email"], input[type="password"] { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; }
    input:focus { border-color: #db2777; box-shadow: 0 0 0 3px rgba(219,39,119,0.15); }
    .scopes-list { background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #475569; margin-bottom: 20px; line-height: 1.5; }
    .btn { width: 100%; background: #db2777; color: #ffffff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #be185d; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Luisices Ateliê</div>
    <div class="subtitle">Conectar Assistente MCP / ChatGPT</div>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="response_type" value="${escapeHtml(responseType)}" />
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}" />

      <div class="form-group">
        <label for="email">E-mail do Colaborador</label>
        <input type="email" id="email" name="email" required placeholder="seu.email@luisices.com.br" />
      </div>

      <div class="form-group">
        <label for="password">Senha de Acesso</label>
        <input type="password" id="password" name="password" required placeholder="••••••••" />
      </div>

      <div class="scopes-list">
        <strong>Permissões Solicitadas:</strong><br>
        Acesso seguro ao assistente para consultar pedidos, clientes e orçamentos conforme as permissões de sua conta no Luisices.
      </div>

      <button type="submit" class="btn">Autorizar Conexão</button>
    </form>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  // Processamento do login no POST
  if (req.method === 'POST') {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).send('E-mail do colaborador é obrigatório.');
    }

    try {
      let userRecord = null;
      if (typeof getAuth === 'function') {
        try {
          userRecord = await getAuth().getUserByEmail(email);
        } catch (_authErr) {
          // fallback para consulta no Firestore se getUserByEmail falhar
        }
      }

      let userId = userRecord ? userRecord.uid : null;
      let userProfile = null;

      if (!userId) {
        // Consulta no Firestore pelo e-mail
        const usersSnap = await db.collection(COLLECTIONS.USERS).where('email', '==', String(email).toLowerCase().trim()).limit(1).get();
        if (!usersSnap.empty) {
          userId = usersSnap.docs[0].id;
          userProfile = usersSnap.docs[0].data();
        }
      }

      if (!userId) {
        return res.status(401).send('Usuário não localizado no sistema Luisices.');
      }

      if (!userProfile) {
        const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        if (!userSnap.exists) {
          return res.status(403).send('Perfil de colaborador não encontrado.');
        }
        userProfile = userSnap.data();
      }

      if (userProfile.active === false || userProfile.status === 'paused') {
        return res.status(403).send('Sua conta de colaborador está inativa ou pausada.');
      }

      if (userProfile.permissions && userProfile.permissions.mcpAccess === false) {
        return res.status(403).send('Você não possui permissão para utilizar integrações MCP / ChatGPT.');
      }

      // Emissão do Código de Autorização OAuth (válido por 5 minutos)
      const authCode = `lui_code_${crypto.randomBytes(24).toString('hex')}`;
      const authCodeDoc = {
        code: authCode,
        clientId,
        redirectUri,
        userId,
        userEmail: email,
        scope,
        codeChallenge,
        codeChallengeMethod,
        used: false,
        expiresAt: Date.now() + 5 * 60 * 1000,
        createdAt: new Date().toISOString(),
      };

      await db.collection('oauthAuthCodes').doc(authCode).set(authCodeDoc);

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      return res.redirect(303, redirectUrl.toString());
    } catch (authErr) {
      console.error('[OAuth] Falha no processo de autorização:', authErr.message);
      return res.status(401).send('Falha na autenticação do colaborador.');
    }
  }
}

/**
 * Troca do Authorization Code + PKCE pelo Token de Acesso (POST /oauth/token)
 */
async function handleOAuthToken(req, res, db) {
  const body = req.body || {};
  const grantType = body.grant_type;
  const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard';
  const issuer = isProd ? 'https://api.luisices.com.br' : 'https://api.dev.luisices.com.br';

  if (grantType === 'authorization_code') {
    const { code, redirect_uri, client_id, code_verifier } = body;

    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Parâmetro code é obrigatório.' });
    }

    if (!code_verifier) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'OAuth 2.1 exige o parâmetro code_verifier para validação PKCE.' });
    }

    const codeSnap = await db.collection('oauthAuthCodes').doc(code).get();
    if (!codeSnap.exists) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Código de autorização inválido.' });
    }

    const codeData = codeSnap.data();

    if (codeData.used) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Código de autorização já foi utilizado.' });
    }

    if (codeData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Código de autorização expirado.' });
    }

    if (redirect_uri && codeData.redirectUri && redirect_uri !== codeData.redirectUri) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Incompatibilidade de redirect_uri.' });
    }

    // Validação estrita de PKCE (S256)
    if (codeData.codeChallengeMethod === 'S256') {
      const computedChallenge = calculateS256Challenge(code_verifier);
      if (computedChallenge !== codeData.codeChallenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier inválido.' });
      }
    } else if (codeData.codeChallengeMethod === 'plain') {
      if (code_verifier !== codeData.codeChallenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier inválido.' });
      }
    }

    // Marca o código como utilizado para evitar reuso
    await db.collection('oauthAuthCodes').doc(code).update({ used: true, usedAt: new Date().toISOString() });

    // Consulta de status atualizado do usuário
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(codeData.userId).get();
    if (!userSnap.exists) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Usuário proprietário do código não encontrado.' });
    }

    const userProfile = userSnap.data();
    if (userProfile.active === false || userProfile.status === 'paused' || userProfile.permissions?.mcpAccess === false) {
      return res.status(403).json({ error: 'access_denied', error_description: 'Conta de usuário inativa ou sem permissão MCP.' });
    }

    // Geração de tokens com vinculação ao usuário e criação de sessão rastreável
    const accessToken = `lui_oauth_at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `lui_oauth_rt_${crypto.randomBytes(32).toString('hex')}`;
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const expiresInSeconds = 3600;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const finalClientId = client_id || codeData.clientId || 'chatgpt-mcp';
    const clientName = (finalClientId && finalClientId.toLowerCase().includes('chatgpt'))
      ? 'ChatGPT (OpenAI MCP)'
      : 'Assistente MCP';

    const tokenDoc = {
      accessToken,
      refreshToken,
      sessionId,
      clientId: finalClientId,
      userId: codeData.userId,
      userEmail: codeData.userEmail || userProfile.email || '',
      userName: userProfile.displayName || userProfile.email || 'Usuário',
      scope: codeData.scope,
      scopes: (codeData.scope || '').split(' ').filter(Boolean),
      iss: issuer,
      aud: issuer,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    await db.collection('oauthAccessTokens').doc(accessToken).set(tokenDoc);

    await db.collection('oauthRefreshTokens').doc(refreshToken).set({
      refreshToken,
      accessToken,
      sessionId,
      clientId: tokenDoc.clientId,
      userId: codeData.userId,
      userEmail: tokenDoc.userEmail,
      scope: codeData.scope,
      scopes: tokenDoc.scopes,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
      revoked: false,
    });

    // Registra sessão ativa para monitoramento e revogação por usuário e admin
    const sessionDoc = {
      sessionId,
      accessToken,
      refreshToken,
      clientId: tokenDoc.clientId,
      clientName,
      userId: codeData.userId,
      userEmail: tokenDoc.userEmail,
      userName: tokenDoc.userName,
      userRole: userProfile.role || 'funcionario',
      scope: codeData.scope,
      scopes: tokenDoc.scopes,
      active: true,
      revoked: false,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
      lastUsedAt: new Date().toISOString(),
      totalCalls: 0,
    };
    await db.collection('oauthSessions').doc(sessionId).set(sessionDoc);

    // Sinaliza no perfil do usuário que há uma sessão aberta via MCP
    await db.collection(COLLECTIONS.USERS).doc(codeData.userId).update({
      mcpSessionActive: true,
      lastMcpConnectedAt: new Date().toISOString(),
    }).catch(() => {});

    return res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      refresh_token: refreshToken,
      scope: codeData.scope,
    });
  }

  if (grantType === 'refresh_token') {
    const { refresh_token, client_id } = body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Parâmetro refresh_token é obrigatório.' });
    }

    const refreshSnap = await db.collection('oauthRefreshTokens').doc(refresh_token).get();
    if (!refreshSnap.exists) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token não encontrado.' });
    }

    const refreshData = refreshSnap.data();
    if (refreshData.revoked) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Sessão MCP revogada pelo usuário ou administrador.' });
    }

    if (refreshData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token expirado.' });
    }

    // Valida se a sessão associada foi revogada
    if (refreshData.sessionId) {
      const sessionSnap = await db.collection('oauthSessions').doc(refreshData.sessionId).get();
      if (sessionSnap.exists) {
        const sData = sessionSnap.data();
        if (sData.active === false || sData.revoked) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Sessão MCP revogada pelo usuário ou administrador.' });
        }
      }
    }

    const userSnap = await db.collection(COLLECTIONS.USERS).doc(refreshData.userId).get();
    if (!userSnap.exists) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Usuário não localizado.' });
    }

    const userProfile = userSnap.data();
    if (userProfile.active === false || userProfile.status === 'paused' || userProfile.permissions?.mcpAccess === false) {
      return res.status(403).json({ error: 'access_denied', error_description: 'Acesso suspenso para este colaborador.' });
    }

    const newAccessToken = `lui_oauth_at_${crypto.randomBytes(32).toString('hex')}`;
    const expiresInSeconds = 3600;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const sessionId = refreshData.sessionId || `sess_${crypto.randomBytes(16).toString('hex')}`;

    const tokenDoc = {
      accessToken: newAccessToken,
      refreshToken: refresh_token,
      sessionId,
      clientId: client_id || refreshData.clientId || 'chatgpt-mcp',
      userId: refreshData.userId,
      userEmail: userProfile.email,
      userName: userProfile.displayName || userProfile.email || 'Usuário',
      scope: refreshData.scope,
      scopes: refreshData.scopes,
      iss: issuer,
      aud: issuer,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    await db.collection('oauthAccessTokens').doc(newAccessToken).set(tokenDoc);

    // Atualiza último uso na sessão
    if (refreshData.sessionId) {
      await db.collection('oauthSessions').doc(refreshData.sessionId).update({
        accessToken: newAccessToken,
        lastUsedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    return res.status(200).json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      refresh_token: refresh_token,
      scope: refreshData.scope,
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Grant type não suportado. Utilize authorization_code ou refresh_token.' });
}

/**
 * Validação de Token de Acesso OAuth 2.1
 */
async function validateOAuthAccessToken(accessToken, db) {
  if (!accessToken || !db) {
    return {
      success: false,
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Token de acesso não fornecido.',
    };
  }

  const tokenSnap = await db.collection('oauthAccessTokens').doc(accessToken).get();
  if (!tokenSnap.exists) {
    return {
      success: false,
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Token de acesso OAuth 2.1 não encontrado ou revogado.',
    };
  }

  const tokenData = tokenSnap.data();

  // Checa se o token foi explicitamente revogado
  if (tokenData.revoked) {
    return {
      success: false,
      status: 401,
      code: 'TOKEN_REVOKED',
      message: 'Sessão MCP revogada pelo usuário ou administrador.',
    };
  }

  // Checa se a sessão vinculada foi revogada
  if (tokenData.sessionId) {
    const sessionSnap = await db.collection('oauthSessions').doc(tokenData.sessionId).get();
    if (sessionSnap.exists) {
      const sData = sessionSnap.data();
      if (sData.active === false || sData.revoked) {
        return {
          success: false,
          status: 401,
          code: 'SESSION_REVOKED',
          message: 'Sessão MCP revogada pelo usuário ou administrador.',
        };
      }
    }
  }

  if (tokenData.expiresAt < Date.now()) {
    return {
      success: false,
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Token de acesso OAuth 2.1 expirado. Utilize o refresh token para renovar.',
    };
  }

  const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard';
  const expectedIssuer = isProd ? 'https://api.luisices.com.br' : 'https://api.dev.luisices.com.br';

  if (tokenData.iss && tokenData.iss !== expectedIssuer) {
    return {
      success: false,
      status: 401,
      code: 'INVALID_ISSUER',
      message: 'Emissor (issuer) do token OAuth não confere com o ambiente.',
    };
  }

  if (tokenData.aud && tokenData.aud !== expectedIssuer) {
    return {
      success: false,
      status: 401,
      code: 'INVALID_AUDIENCE',
      message: 'Público (audience) do token OAuth é inválido.',
    };
  }

  const userSnap = await db.collection(COLLECTIONS.USERS).doc(tokenData.userId).get();
  if (!userSnap.exists) {
    return {
      success: false,
      status: 403,
      code: 'USER_NOT_FOUND',
      message: 'Usuário proprietário do token OAuth não encontrado no sistema.',
    };
  }

  const userProfile = userSnap.data();
  if (userProfile.active === false || userProfile.status === 'paused') {
    return {
      success: false,
      status: 403,
      code: 'USER_INACTIVE',
      message: 'A conta do usuário vinculado está inativa ou pausada no Luisices.',
    };
  }

  if (userProfile.permissions && userProfile.permissions.mcpAccess === false) {
    return {
      success: false,
      status: 403,
      code: 'MCP_PERMISSION_DENIED',
      message: 'Este usuário não possui permissão para utilizar integrações MCP / ChatGPT.',
    };
  }

  const scope = getCallerScope(tokenData.userId, userProfile);

  return {
    success: true,
    keyData: {
      userId: tokenData.userId,
      scopes: tokenData.scopes || [],
      keyId: `oauth_${tokenData.userId}`,
      rateLimitPerHour: 120,
    },
    userProfile,
    scope,
    keyHash: accessToken,
  };
}

module.exports = {
  getOauthProtectedResourceMetadata,
  getOauthAuthorizationServerMetadata,
  calculateS256Challenge,
  handleOAuthRegister,
  handleOAuthAuthorize,
  handleOAuthToken,
  validateOAuthAccessToken,
};
