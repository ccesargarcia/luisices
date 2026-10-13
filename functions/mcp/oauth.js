/**
 * Módulo de Autenticação OAuth 2.1 com Authorization Code + PKCE (S256)
 * e Descoberta de Metadados de Recursos Protegidos para MCP / ChatGPT.
 */

const crypto = require('crypto');
const { COLLECTIONS, MCP_SCOPES } = require('./constants');
const { getCallerScope } = require('../ai/authorization');

const APP_ORIGIN = () => process.env.GCLOUD_PROJECT === 'papelaria-dashboard' || process.env.GCP_PROJECT === 'papelaria-dashboard'
  ? 'https://luisices.com.br' : 'https://dev.luisices.com.br';
const OAUTH_ORIGIN = () => process.env.GCLOUD_PROJECT === 'papelaria-dashboard' || process.env.GCP_PROJECT === 'papelaria-dashboard'
  ? 'https://api.luisices.com.br' : 'https://api.dev.luisices.com.br';
const ALLOWED_SCOPES = new Set(Object.values(MCP_SCOPES).map((scope) => scope.id));
const INTERNAL_OAUTH_CLIENT = Object.freeze({
  clientId: 'chatgpt-mcp',
  clientName: 'ChatGPT MCP (cliente interno legado)',
  redirectUris: ['https://chatgpt.com/aip/g-mcp/oauth/callback'],
  enabled: true,
  tokenEndpointAuthMethod: 'none',
  grantTypes: ['authorization_code', 'refresh_token'],
  responseTypes: ['code'],
});

function isOAuthClientId(value) {
  return value === INTERNAL_OAUTH_CLIENT.clientId || (typeof value === 'string' && /^client_[a-f0-9]{24}$/.test(value));
}

async function getOAuthClient(db, clientId, transaction) {
  if (clientId === INTERNAL_OAUTH_CLIENT.clientId) return INTERNAL_OAUTH_CLIENT;
  const ref = db.collection('oauthClients').doc(clientId);
  const snap = transaction ? await transaction.get(ref) : await ref.get();
  return snap.exists ? snap.data() : null;
}

function validRedirectUri(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const uri = new URL(value);
    if (uri.username || uri.password || uri.hash || value.includes('#') || /^(?:https?):\/\/[^/?#]*@/i.test(value) || uri.href !== value) return false;
    if (uri.protocol === 'https:') return true;
    return uri.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname) && Boolean(uri.port);
  } catch (_err) {
    return false;
  }
}

function parseScopes(value) {
  const scopes = [...new Set(String(value || '').trim().split(/\s+/).filter(Boolean))];
  if (!scopes.length || scopes.some((scope) => !ALLOWED_SCOPES.has(scope))) return null;
  return scopes;
}

function getEffectiveUserScopes(requestedScopes, userProfile) {
  if (!Array.isArray(requestedScopes) || requestedScopes.length === 0) {
    return [MCP_SCOPES.ORDERS_READ.id];
  }
  const isAdmin = userProfile && userProfile.role === 'admin';
  if (isAdmin) {
    return requestedScopes;
  }

  const customScopes = userProfile?.permissions?.mcpScopes || userProfile?.mcpScopes;
  const validNonAdminScopes = Object.values(MCP_SCOPES)
    .filter((s) => !s.requiresAdmin)
    .map((s) => s.id);

  let allowedForUser = validNonAdminScopes;
  if (Array.isArray(customScopes) && customScopes.length > 0) {
    allowedForUser = customScopes.filter((s) => validNonAdminScopes.includes(s));
  }

  const effective = requestedScopes.filter((s) => allowedForUser.includes(s));
  return effective.length > 0 ? effective : (allowedForUser.length > 0 ? allowedForUser : [MCP_SCOPES.ORDERS_READ.id]);
}

function authError(res, status, error, description) {
  return res.status(status).json({ error, error_description: description });
}

async function consumeOAuthRateLimit(db, key, limit, windowSeconds = 3600) {
  if (!db || typeof db.runTransaction !== 'function') return false;
  const bucket = crypto.createHash('sha256').update(String(key)).digest('hex');
  const ref = db.collection('oauthRateLimits').doc(bucket);
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
    const snap = await tx.get(ref);
    const stored = snap.exists ? snap.data() : {};
    const count = stored.windowStart === windowStart ? Number(stored.count) || 0 : 0;
    if (count >= limit) return false;
    tx.set(ref, { count: count + 1, windowStart, updatedAt: now });
    return true;
  });
}

async function applyEndpointRateLimit(req, res, db, bucket, limit) {
  const address = req.ip || req.socket?.remoteAddress || 'unknown';
  if (await consumeOAuthRateLimit(db, `${bucket}:${address}`, limit)) return true;
  const secondsIntoWindow = Math.floor(Date.now() / 1000) % 3600;
  res.setHeader('Retry-After', String(3600 - secondsIntoWindow));
  authError(res, 429, 'slow_down', 'Limite de requisições OAuth excedido. Tente novamente mais tarde.');
  return false;
}

/**
 * Metadata do Recurso Protegido (RFC 9728)
 */
function getOauthProtectedResourceMetadata(baseUrl) {
  const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard' || process.env.GCP_PROJECT === 'papelaria-dashboard';
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
  const isProd = process.env.GCLOUD_PROJECT === 'papelaria-dashboard' || process.env.GCP_PROJECT === 'papelaria-dashboard';
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
    token_endpoint_auth_methods_supported: ['none'],
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
    if (!db || !Array.isArray(body.redirect_uris) || body.redirect_uris.length < 1 || body.redirect_uris.length > 10) {
      return authError(res, 400, 'invalid_client_metadata', 'Informe entre 1 e 10 redirect_uris válidos.');
    }
    if (body.redirect_uris.some((uri) => !validRedirectUri(uri)) || new Set(body.redirect_uris).size !== body.redirect_uris.length) {
      return authError(res, 400, 'invalid_redirect_uri', 'Callback inválido; HTTPS é obrigatório, com HTTP permitido somente em loopback local.');
    }
    if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== 'none') {
      return authError(res, 400, 'invalid_client_metadata', 'O servidor aceita somente clientes públicos com autenticação none.');
    }
    if (body.grant_types !== undefined && (!Array.isArray(body.grant_types) || body.grant_types.some((grant) => !['authorization_code', 'refresh_token'].includes(grant)) || !body.grant_types.includes('authorization_code'))) {
      return authError(res, 400, 'invalid_client_metadata', 'O servidor aceita somente authorization_code e refresh_token.');
    }
    if (body.response_types !== undefined && (!Array.isArray(body.response_types) || body.response_types.some((type) => type !== 'code') || !body.response_types.includes('code'))) {
      return authError(res, 400, 'invalid_client_metadata', 'O servidor aceita somente response_type=code.');
    }
    if (!await applyEndpointRateLimit(req, res, db, 'register', 60)) return undefined;
    const clientName = String(body.client_name || 'ChatGPT MCP Client').slice(0, 120);
    const redirectUris = body.redirect_uris;
    const grantTypes = body.grant_types || ['authorization_code', 'refresh_token'];
    const responseTypes = body.response_types || ['code'];

    const clientId = `client_${crypto.randomBytes(12).toString('hex')}`;

    const clientData = {
      clientId,
      clientName,
      redirectUris,
      createdAt: new Date().toISOString(),
      expiresAt: 0,
      enabled: true,
      tokenEndpointAuthMethod: 'none',
      grantTypes,
      responseTypes,
    };

    await db.collection('oauthClients').doc(clientId).set(clientData);

    return res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  let params = req.method === 'GET' ? req.query || {} : req.body || {};
  const requestId = req.method === 'POST' ? params.request_id : null;
  if (req.method === 'POST' && requestId && db) {
    const pendingSnap = await db.collection('oauthAuthorizationRequests').doc(String(requestId)).get();
    if (!pendingSnap.exists || pendingSnap.data().used || pendingSnap.data().expiresAt <= Date.now()) return authError(res, 400, 'invalid_request', 'Solicitação OAuth expirada ou já utilizada.');
    const pending = pendingSnap.data();
    params = { ...pending, response_type: 'code', client_id: pending.clientId, redirect_uri: pending.redirectUri, scope: pending.scope, code_challenge: pending.codeChallenge, code_challenge_method: pending.codeChallengeMethod, request_id: requestId };
  }
  const clientId = params.client_id;
  const redirectUri = params.redirect_uri;
  const scopes = parseScopes(params.scope || 'orders:read');
  const state = String(params.state || '');
  const challenge = params.code_challenge;
  if (!db || !isOAuthClientId(clientId) || params.response_type !== 'code' || !validRedirectUri(redirectUri)
      || !scopes || state.length > 1024 || !/^[A-Za-z0-9_-]{43,128}$/.test(String(challenge || ''))
      || params.code_challenge_method !== 'S256') {
    return authError(res, 400, 'invalid_request', 'Solicitação OAuth inválida; PKCE S256 é obrigatório.');
  }

  if (req.method === 'GET') {
    if (!await applyEndpointRateLimit(req, res, db, 'authorize', 30)) return undefined;
    const client = await getOAuthClient(db, clientId);
    if (!client || client.enabled === false) return authError(res, 400, 'invalid_client', 'Cliente OAuth desconhecido ou desativado.');
    if (client.tokenEndpointAuthMethod && client.tokenEndpointAuthMethod !== 'none') return authError(res, 400, 'invalid_client', 'Método de autenticação do cliente não suportado.');
    if (client.grantTypes && !client.grantTypes.includes('authorization_code')) return authError(res, 400, 'unauthorized_client', 'Cliente não registrado para authorization_code.');
    if (client.responseTypes && !client.responseTypes.includes('code')) return authError(res, 400, 'unauthorized_client', 'Cliente não registrado para response_type=code.');
    if (!Array.isArray(client.redirectUris) || !client.redirectUris.includes(redirectUri)) return authError(res, 400, 'invalid_redirect_uri', 'Callback não cadastrado para este cliente.');
    const requestId = `req_${crypto.randomBytes(24).toString('hex')}`;
    await db.collection('oauthAuthorizationRequests').doc(requestId).set({
      requestId, clientId, redirectUri, scope: scopes.join(' '), state, codeChallenge: challenge,
      codeChallengeMethod: 'S256', used: false, expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const consentUrl = new URL('/oauth-consent', APP_ORIGIN());
    consentUrl.searchParams.set('request_id', requestId);
    return res.redirect(303, consentUrl.toString());
  }

  if (req.method !== 'POST') return res.status(405).send('Método não permitido.');
  if (!await applyEndpointRateLimit(req, res, db, 'consent', 30)) return undefined;
  const consentRequestId = req.body?.request_id;
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken || typeof consentRequestId !== 'string' || !/^req_[a-f0-9]{48}$/.test(consentRequestId) || typeof getAuth !== 'function') return authError(res, 401, 'login_required', 'Entre na conta Luisices para autorizar a integração.');

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken, true);
  } catch (_err) {
    return authError(res, 401, 'login_required', 'A sessão Firebase é inválida, expirada ou revogada. Entre novamente.');
  }
  if (!decoded?.uid) return authError(res, 401, 'login_required', 'A sessão Firebase não contém uma identidade válida.');
  const profileRef = db.collection(COLLECTIONS.USERS).doc(decoded.uid);
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists) return authError(res, 403, 'access_denied', 'Perfil de usuário não localizado.');
  const profile = profileSnap.data();
  if (!Number.isFinite(decoded.auth_time) || profile.active === false || ['paused', 'inactive', 'disabled'].includes(profile.status) || profile.permissions?.mcpAccess === false
      || (profile.tokensValidAfterTime && decoded.auth_time <= profile.tokensValidAfterTime)) {
    return authError(res, 403, 'access_denied', 'Conta inativa, sem permissão MCP ou com sessão revogada.');
  }

  const requestRef = db.collection('oauthAuthorizationRequests').doc(String(consentRequestId));
  const code = `lui_code_${crypto.randomBytes(24).toString('hex')}`;
  try {
    await db.runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) throw new Error('invalid_authorization_request');
      const stored = requestSnap.data();
      if (stored.used || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now()) throw new Error('invalid_authorization_request');
      const [currentClient, currentProfileSnap] = await Promise.all([getOAuthClient(db, stored.clientId, tx), tx.get(profileRef)]);
      if (!currentClient || currentClient.enabled === false || !currentProfileSnap.exists || !currentClient.redirectUris?.includes(stored.redirectUri)) throw new Error('invalid_authorization_request');
      const currentProfile = currentProfileSnap.data();
      if (currentProfile.active === false || ['paused', 'inactive', 'disabled'].includes(currentProfile.status)
          || currentProfile.permissions?.mcpAccess === false || (currentProfile.tokensValidAfterTime && (!Number.isFinite(decoded.auth_time) || decoded.auth_time <= currentProfile.tokensValidAfterTime))) throw new Error('invalid_authorization_request');
      const requestedScopes = parseScopes(stored.scope);
      if (!requestedScopes) throw new Error('invalid_scope');
      const effectiveScopes = getEffectiveUserScopes(requestedScopes, currentProfile);
      tx.update(requestRef, { used: true, usedAt: Date.now(), userId: decoded.uid });
      tx.set(db.collection('oauthAuthCodes').doc(code), {
        code, clientId: stored.clientId, redirectUri: stored.redirectUri, userId: decoded.uid, authTime: decoded.auth_time,
        userEmail: currentProfile.email || decoded.email || '', scope: effectiveScopes.join(' '), codeChallenge: stored.codeChallenge,
        codeChallengeMethod: 'S256', used: false, expiresAt: Date.now() + 5 * 60 * 1000,
        createdAt: new Date().toISOString(), issuer: OAUTH_ORIGIN(),
      });
    });
  } catch (err) {
    if (err.message === 'invalid_scope') return authError(res, 400, 'invalid_scope', 'Escopos de autorização inválidos.');
    return authError(res, 400, 'invalid_request', 'Solicitação de consentimento expirada ou já utilizada. Inicie novamente a conexão.');
  }
  const requestSnap = await requestRef.get();
  const stored = requestSnap.data();
  const callback = new URL(stored.redirectUri);
  callback.searchParams.set('code', code);
  if (stored.state) callback.searchParams.set('state', stored.state);
  return res.status(200).json({ redirect_uri: callback.toString() });
}

async function handleOAuthConsentInfo(req, res, db) {
  const requestId = req.query?.request_id;
  if (!requestId || typeof requestId !== 'string') return authError(res, 400, 'invalid_request', 'request_id obrigatório.');
  const requestSnap = await db.collection('oauthAuthorizationRequests').doc(requestId).get();
  if (!requestSnap.exists || requestSnap.data().used || requestSnap.data().expiresAt <= Date.now()) return authError(res, 400, 'invalid_request', 'Solicitação expirada ou já utilizada.');
  const request = requestSnap.data();
  const client = await getOAuthClient(db, request.clientId);
  if (!client || client.enabled === false) return authError(res, 400, 'invalid_client', 'Cliente OAuth desativado.');
  if (client.grantTypes && !client.grantTypes.includes('authorization_code')) return authError(res, 400, 'unauthorized_client', 'Cliente não registrado para authorization_code.');
  return res.status(200).json({ client_name: client.clientName || 'Cliente MCP', scopes: parseScopes(request.scope) || [] });
}

/**
 * Troca do Authorization Code + PKCE pelo Token de Acesso (POST /oauth/token)
 */
async function handleOAuthToken(req, res, db) {
  const body = req.body || {};
  const grantType = body.grant_type;
  const issuer = OAUTH_ORIGIN();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  if (!db || !await applyEndpointRateLimit(req, res, db, 'token', 120)) return undefined;
  const tokenAuthorization = req.headers?.authorization || req.headers?.Authorization || '';
  if (body.client_secret !== undefined || /^Basic\s/i.test(tokenAuthorization)) return authError(res, 401, 'invalid_client', 'O servidor aceita somente clientes públicos sem segredo.');

  if (grantType === 'authorization_code') {
    const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier } = body;
    if (typeof code !== 'string' || !code.startsWith('lui_code_') || !isOAuthClientId(clientId)
        || !redirectUri || typeof verifier !== 'string') return authError(res, 400, 'invalid_request', 'code, client_id, redirect_uri e code_verifier válidos são obrigatórios.');
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(String(verifier))) return authError(res, 400, 'invalid_grant', 'PKCE code_verifier inválido.');
    const codeRef = db.collection('oauthAuthCodes').doc(code);
    const registeredClient = await getOAuthClient(db, clientId);
    if (!registeredClient || registeredClient.enabled === false || (registeredClient.tokenEndpointAuthMethod || 'none') !== 'none'
        || registeredClient.grantTypes && !registeredClient.grantTypes.includes('authorization_code')) return authError(res, 400, 'invalid_client', 'Cliente OAuth desconhecido, desativado ou não suportado.');
    if (!Array.isArray(registeredClient.redirectUris) || !registeredClient.redirectUris.includes(redirectUri)) return authError(res, 400, 'invalid_grant', 'redirect_uri não cadastrado para o cliente.');

    const accessToken = `lui_oauth_at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `lui_oauth_rt_${crypto.randomBytes(32).toString('hex')}`;
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();
    const expiresInSeconds = 3600;
    let resultScope = '';
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        if (!snap.exists) throw new Error('invalid_grant');
        const data = snap.data();
        const userRef = db.collection(COLLECTIONS.USERS).doc(data.userId);
        const currentClient = await getOAuthClient(db, clientId, tx);
        const userSnap = await tx.get(userRef);
        if (!currentClient || !userSnap.exists) throw new Error('invalid_grant');
        const profile = userSnap.data();
        if (data.used || !Number.isFinite(data.expiresAt) || data.expiresAt <= now || data.issuer !== issuer || data.clientId !== clientId || data.redirectUri !== redirectUri
            || currentClient.enabled === false || (currentClient.tokenEndpointAuthMethod || 'none') !== 'none'
            || currentClient.grantTypes && !currentClient.grantTypes.includes('authorization_code')
            || !currentClient.redirectUris?.includes(redirectUri) || profile.active === false || ['paused', 'inactive', 'disabled'].includes(profile.status)
            || profile.permissions?.mcpAccess === false || (profile.tokensValidAfterTime && (!Number.isFinite(data.authTime) || data.authTime <= profile.tokensValidAfterTime))) throw new Error('invalid_grant');
        if (data.codeChallengeMethod !== 'S256' || calculateS256Challenge(verifier) !== data.codeChallenge) throw new Error('invalid_grant');
        const requestedScopes = parseScopes(data.scope);
        if (!requestedScopes) throw new Error('invalid_scope');
        const scopes = getEffectiveUserScopes(requestedScopes, profile);
        resultScope = scopes.join(' ');
        const expiresAt = now + expiresInSeconds * 1000;
        const refreshExpiresAt = now + 30 * 24 * 3600 * 1000;
        const tokenDoc = { accessToken, refreshToken, sessionId, clientId, userId: data.userId, authTime: data.authTime, userEmail: profile.email || '', userName: profile.displayName || profile.email || 'Usuário', scope: resultScope, scopes, iss: issuer, aud: issuer, createdAt: new Date().toISOString(), expiresAt };
        const sessionDoc = { sessionId, accessToken, refreshToken, clientId, clientName: registeredClient.clientName || 'Cliente MCP', userId: data.userId, userEmail: tokenDoc.userEmail, userName: tokenDoc.userName, userRole: profile.role || 'user', scope: resultScope, scopes, active: true, revoked: false, iss: issuer, aud: issuer, createdAt: new Date().toISOString(), expiresAt: refreshExpiresAt, lastUsedAt: new Date().toISOString(), totalCalls: 0 };
        tx.update(codeRef, { used: true, usedAt: now });
        tx.set(db.collection('oauthAccessTokens').doc(accessToken), tokenDoc);
        tx.set(db.collection('oauthRefreshTokens').doc(refreshToken), { refreshToken, accessToken, sessionId, clientId, userId: data.userId, authTime: data.authTime, userEmail: tokenDoc.userEmail, scope: resultScope, scopes, iss: issuer, aud: issuer, createdAt: new Date().toISOString(), expiresAt: refreshExpiresAt, revoked: false });
        tx.set(db.collection('oauthSessions').doc(sessionId), sessionDoc);
      });
    } catch (err) {
      const invalidScope = err.message === 'invalid_scope';
      return authError(res, invalidScope ? 400 : 400, invalidScope ? 'invalid_scope' : 'invalid_grant', invalidScope ? 'Escopo inválido ou reservado a administradores.' : 'Código expirado, utilizado, vinculado a outro cliente/callback ou PKCE inválido.');
    }
    return res.status(200).json({ access_token: accessToken, token_type: 'Bearer', expires_in: expiresInSeconds, refresh_token: refreshToken, scope: resultScope });
  }

  if (grantType === 'refresh_token') {
    const { refresh_token: oldRefreshToken, client_id: clientId } = body;
    if (typeof oldRefreshToken !== 'string' || !oldRefreshToken.startsWith('lui_oauth_rt_') || !isOAuthClientId(clientId)) return authError(res, 400, 'invalid_request', 'refresh_token e client_id válidos são obrigatórios.');
    const oldRef = db.collection('oauthRefreshTokens').doc(oldRefreshToken);
    const newAccessToken = `lui_oauth_at_${crypto.randomBytes(32).toString('hex')}`;
    const newRefreshToken = `lui_oauth_rt_${crypto.randomBytes(32).toString('hex')}`;
    const now = Date.now();
    const expiresInSeconds = 3600;
    let resultScope = '';
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(oldRef);
        if (!snap.exists) throw new Error('invalid_grant');
        const refresh = snap.data();
        const sessionRef = db.collection('oauthSessions').doc(refresh.sessionId);
        const userRef = db.collection(COLLECTIONS.USERS).doc(refresh.userId);
        const [sessionSnap, userSnap, client] = await Promise.all([tx.get(sessionRef), tx.get(userRef), getOAuthClient(db, clientId, tx)]);
        if (!sessionSnap.exists || !userSnap.exists || !client) throw new Error('invalid_grant');
        const session = sessionSnap.data();
        const profile = userSnap.data();
        if (refresh.revoked || !Number.isFinite(refresh.expiresAt) || refresh.expiresAt <= now || refresh.clientId !== clientId || refresh.iss !== issuer || refresh.aud !== issuer
            || session.revoked || session.active === false || !Number.isFinite(session.expiresAt) || session.expiresAt <= now || session.userId !== refresh.userId
            || session.refreshToken !== oldRefreshToken || session.clientId !== clientId || session.iss !== issuer || session.aud !== issuer
            || client.enabled === false || (client.tokenEndpointAuthMethod || 'none') !== 'none'
            || client.grantTypes && !client.grantTypes.includes('refresh_token')
            || profile.active === false || ['paused', 'inactive', 'disabled'].includes(profile.status) || profile.permissions?.mcpAccess === false
            || (profile.tokensValidAfterTime && (!Number.isFinite(refresh.authTime) || refresh.authTime <= profile.tokensValidAfterTime))) throw new Error('invalid_grant');
        const scopes = parseScopes(refresh.scope);
        if (!scopes || profile.role !== 'admin' && scopes.some((scope) => scope === MCP_SCOPES.FINANCIAL_READ.id || scope === MCP_SCOPES.TEAM_READ.id)) throw new Error('invalid_scope');
        resultScope = scopes.join(' ');
        const expiresAt = now + expiresInSeconds * 1000;
        const refreshExpiresAt = Math.min(refresh.expiresAt, now + 30 * 24 * 3600 * 1000);
        tx.update(oldRef, { revoked: true, replacedAt: now });
        tx.set(db.collection('oauthAccessTokens').doc(newAccessToken), { accessToken: newAccessToken, refreshToken: newRefreshToken, sessionId: refresh.sessionId, clientId, userId: refresh.userId, authTime: refresh.authTime, userEmail: profile.email || '', userName: profile.displayName || profile.email || 'Usuário', scope: resultScope, scopes, iss: issuer, aud: issuer, createdAt: new Date().toISOString(), expiresAt });
        tx.set(db.collection('oauthRefreshTokens').doc(newRefreshToken), { refreshToken: newRefreshToken, accessToken: newAccessToken, sessionId: refresh.sessionId, clientId, userId: refresh.userId, authTime: refresh.authTime, userEmail: profile.email || '', scope: resultScope, scopes, iss: issuer, aud: issuer, createdAt: new Date().toISOString(), expiresAt: refreshExpiresAt, revoked: false });
        tx.update(sessionRef, { accessToken: newAccessToken, refreshToken: newRefreshToken, lastUsedAt: new Date().toISOString() });
      });
    } catch (_err) {
      return authError(res, 400, 'invalid_grant', 'Refresh token expirado, já utilizado, revogado ou vinculado a outro cliente/ambiente.');
    }
    return res.status(200).json({ access_token: newAccessToken, token_type: 'Bearer', expires_in: expiresInSeconds, refresh_token: newRefreshToken, scope: resultScope });
  }
  return authError(res, 400, 'unsupported_grant_type', 'Utilize authorization_code ou refresh_token.');
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

  if (!Number.isFinite(tokenData.expiresAt) || tokenData.expiresAt <= Date.now()) {
    return { success: false, status: 401, code: 'TOKEN_EXPIRED', message: 'Token de acesso OAuth 2.1 expirado. Utilize o refresh token para renovar.' };
  }

  const expectedIssuer = OAUTH_ORIGIN();
  if (tokenData.iss !== expectedIssuer) {
    return { success: false, status: 401, code: 'INVALID_ISSUER', message: 'Emissor (issuer) do token OAuth não confere com o ambiente.' };
  }
  if (tokenData.aud !== expectedIssuer) {
    return { success: false, status: 401, code: 'INVALID_AUDIENCE', message: 'Público (audience) do token OAuth é inválido.' };
  }

  if (!tokenData.sessionId) return { success: false, status: 401, code: 'SESSION_REQUIRED', message: 'Token OAuth sem sessão vinculada.' };
  const sessionSnap = await db.collection('oauthSessions').doc(tokenData.sessionId).get();
  if (!sessionSnap.exists) return { success: false, status: 401, code: 'SESSION_NOT_FOUND', message: 'Sessão OAuth vinculada não encontrada.' };
  const sessionData = sessionSnap.data();
  if (sessionData.iss !== expectedIssuer) return { success: false, status: 401, code: 'INVALID_SESSION_ISSUER', message: 'Emissor (issuer) da sessão OAuth não confere com o ambiente.' };
  if (sessionData.aud !== expectedIssuer) return { success: false, status: 401, code: 'INVALID_SESSION_AUDIENCE', message: 'Público (audience) da sessão OAuth não confere com o ambiente.' };
  if (sessionData.active === false || sessionData.revoked || sessionData.userId !== tokenData.userId || sessionData.clientId !== tokenData.clientId
      || !Number.isFinite(sessionData.expiresAt) || sessionData.expiresAt <= Date.now()) {
    return { success: false, status: 401, code: 'SESSION_REVOKED', message: 'Sessão MCP revogada, expirada ou vinculada a outro cliente/ambiente.' };
  }
  if (!isOAuthClientId(tokenData.clientId)) return { success: false, status: 401, code: 'INVALID_CLIENT', message: 'Token OAuth sem cliente vinculado.' };
  const client = await getOAuthClient(db, tokenData.clientId);
  if (!client || client.enabled === false) return { success: false, status: 401, code: 'INVALID_CLIENT', message: 'Cliente OAuth desativado ou removido.' };

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
  if (userProfile.active === false || userProfile.status === 'paused' || userProfile.status === 'disabled' || userProfile.status === 'inactive') {
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

  if (userProfile.tokensValidAfterTime && (!Number.isFinite(tokenData.authTime) || tokenData.authTime <= userProfile.tokensValidAfterTime)) {
    return { success: false, status: 401, code: 'SESSION_REVOKED', message: 'A autenticação Firebase desta sessão foi revogada.' };
  }

  const scope = getCallerScope(tokenData.userId, userProfile);
  let tokenScopes;
  if (Array.isArray(tokenData.scopes)) tokenScopes = [...new Set(tokenData.scopes)];
  else if (tokenData.scope === undefined || tokenData.scope === null || tokenData.scope === '') tokenScopes = [];
  else {
    tokenScopes = parseScopes(tokenData.scope);
    if (!tokenScopes) return { success: false, status: 401, code: 'INVALID_SCOPE', message: 'Token OAuth contém escopos desconhecidos.' };
  }
  if (tokenScopes.some((value) => !ALLOWED_SCOPES.has(value))) return { success: false, status: 401, code: 'INVALID_SCOPE', message: 'Token OAuth contém escopos desconhecidos.' };
  if (userProfile.role !== 'admin' && tokenScopes.some((value) => value === MCP_SCOPES.FINANCIAL_READ.id || value === MCP_SCOPES.TEAM_READ.id)) {
    return { success: false, status: 403, code: 'SCOPE_PERMISSION_DENIED', message: 'O perfil atual não permite os escopos administrativos deste token.' };
  }
  if (!await consumeOAuthRateLimit(db, `mcp-user:${tokenData.userId}`, 120)) {
    return { success: false, status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Limite de 120 chamadas MCP por hora excedido para esta conta.' };
  }

  return {
    success: true,
    keyData: {
      userId: tokenData.userId,
      scopes: tokenScopes,
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
  handleOAuthConsentInfo,
  handleOAuthToken,
  validateOAuthAccessToken,
};
