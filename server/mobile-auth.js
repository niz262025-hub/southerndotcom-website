import { createClient } from '@supabase/supabase-js';
import { projectForEnvironment } from './project.js';
import { validateMobileClient, validateStateAndNonce, isPkceS256Allowed } from './mobile-auth-clients.js';
import { createMemoryMobileAuthStore, createProductionMobileAuthStore } from './mobile-auth-store.js';
import { hashToken, randomToken, constantTimeEqual, parseBearerToken, parseRequestBody, isValidBase64Url, verifyPkceS256 } from './mobile-auth-crypto.js';

const MAX_BODY_BYTES = 8192;

function cookieMap(headerValue) {
  const entries = new Map();
  if (!headerValue) return entries;
  for (const rawPart of headerValue.split(';')) {
    const part = rawPart.trim();
    if (!part) continue;
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = decodeURIComponent(part.slice(index + 1).trim());
    entries.set(key, value);
  }
  return entries;
}

export function defaultUserResolver({ env, cookieHeader, clientFactory = createClient } = {}) {
  const accessToken = cookieMap(cookieHeader).get('__Host-myops-access');
  if (typeof accessToken !== 'string' || !accessToken) return { ok: false, reason: 'missing_session' };
  const project = projectForEnvironment(env);
  const client = clientFactory(project, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.auth.getUser(accessToken).then(({ data, error }) => {
    if (error || !data?.user || !data.user.email_confirmed_at) {
      return { ok: false, reason: 'invalid_session' };
    }
    return { ok: true, user: data.user, sessionToken: accessToken };
  }).catch(() => ({ ok: false, reason: 'invalid_session' }));
}

export function buildMobileAuthStore(env = process.env) {
  const enabled = env.MYOPS_ENABLE_MOBILE_AUTH === 'true';
  if (!enabled) return createProductionMobileAuthStore();
  const shouldUseProduction = env.MYOPS_MOBILE_STORE === 'supabase';
  if (shouldUseProduction) return createProductionMobileAuthStore();
  return createMemoryMobileAuthStore();
}

export function createMobileAuthHandler({
  env = process.env,
  route = 'authorize',
  store = buildMobileAuthStore(env),
  userResolver = defaultUserResolver,
  clock = () => Date.now(),
  clientFactory = createClient,
} = {}) {
  const reply = (res, status, body) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(status).json(body);
  };

  return async function handler(req, res) {
    const response = (status, body) => reply(res, status, body);
    if (req.method !== 'POST') return response(405, { error: 'Method not allowed.' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
      return response(400, { error: 'Request must be JSON.' });
    }
    if (env.MYOPS_ENABLE_MOBILE_AUTH !== 'true') {
      return response(404, { error: 'Mobile auth is disabled.' });
    }

    const bodyResult = parseRequestBody(req, MAX_BODY_BYTES);
    if (!bodyResult.ok) {
      return response(bodyResult.status, { error: bodyResult.error });
    }
    const body = bodyResult.body;

    if (!store || store.ready === false) {
      return response(503, { error: 'Mobile auth storage is unavailable.' });
    }

    switch (route) {
      case 'authorize': return handleAuthorize({ req, body, env, userResolver, response, clock, clientFactory, store });
      case 'token': return handleToken({ body, response, clock, store });
      case 'refresh': return handleRefresh({ body, response, clock, store });
      case 'me': return handleMe({ req, response, clock, store });
      case 'logout': return handleLogout({ req, response, store });
      default: return response(404, { error: 'Unknown route.' });
    }
  };
}

async function handleAuthorize({ req, body, env, userResolver, response, clock, clientFactory, store }) {
  const clientCheck = validateMobileClient(body.client_id, body.redirect_uri);
  if (!clientCheck.ok) return response(400, { error: clientCheck.error });
  if (!isPkceS256Allowed(clientCheck.client, body.code_challenge_method)) {
    return response(400, { error: 'invalid_pkce' });
  }
  if (!isValidBase64Url(body.code_challenge, 43, 128)) {
    return response(400, { error: 'invalid_code_challenge' });
  }
  const stateCheck = validateStateAndNonce(body.state, 'state');
  if (!stateCheck.ok) return response(400, { error: stateCheck.error });
  const nonceCheck = validateStateAndNonce(body.nonce, 'nonce');
  if (!nonceCheck.ok) return response(400, { error: nonceCheck.error });

  const userResult = await userResolver({ env, cookieHeader: req.headers.cookie, clientFactory, now: clock });
  if (!userResult.ok || !userResult.user?.id) return response(401, { error: 'unauthorized' });
  if (!userResult.user.email_confirmed_at) return response(403, { error: 'user_unverified' });

  const authCode = store.issueAuthorizationCode({
    userId: userResult.user.id,
    clientId: clientCheck.client.client_id,
    redirectUri: clientCheck.client.redirect_uris[0],
    codeChallenge: body.code_challenge,
    codeChallengeMethod: body.code_challenge_method,
    state: stateCheck.value,
    nonce: nonceCheck.value,
  });

  return response(200, {
    code: authCode.code,
    state: stateCheck.value,
    expires_in: 60,
    code_challenge_method: 'S256',
  });
}

async function handleToken({ body, response, clock, store }) {
  if (body.grant_type !== 'authorization_code') return response(400, { error: 'unsupported_grant_type' });
  const clientCheck = validateMobileClient(body.client_id, body.redirect_uri);
  if (!clientCheck.ok) return response(400, { error: clientCheck.error });
  if (!body.code || !body.code_verifier) return response(400, { error: 'invalid_grant' });
  const codeHash = hashToken(body.code);
  const record = store.findAuthorizationCode(codeHash);
  if (!record) return response(400, { error: 'invalid_grant' });
  if (record.expiresAt <= clock()) return response(400, { error: 'authorization_code_expired' });
  if (record.consumed) return response(400, { error: 'authorization_code_replay' });
  if (record.clientId !== clientCheck.client.client_id || record.redirectUri !== clientCheck.client.redirect_uris[0]) {
    return response(400, { error: 'invalid_grant' });
  }
  if (!verifyPkceS256(body.code_verifier, record.codeChallenge)) {
    return response(400, { error: 'invalid_grant' });
  }
  const consumed = store.consumeAuthorizationCode(codeHash);
  if (!consumed.ok) return response(400, { error: consumed.reason });

  const session = store.createSession(record.userId, record.clientId);
  const access = store.issueAccessToken(session.id, record.userId, record.clientId);
  const refresh = store.issueRefreshToken(session.id, record.userId, record.clientId);

  return response(200, {
    token_type: 'Bearer',
    access_token: access.token,
    expires_in: 900,
    refresh_token: refresh.token,
    session_id: session.id,
  });
}

async function handleRefresh({ body, response, clock, store }) {
  if (body.client_id !== 'myops-mobile') return response(400, { error: 'unknown_client' });
  if (typeof body.refresh_token !== 'string' || body.refresh_token.length < 16) {
    return response(400, { error: 'invalid_grant' });
  }
  const refreshHash = hashToken(body.refresh_token);
  const token = store.findRefreshToken(refreshHash);
  if (!token) return response(401, { error: 'invalid_grant' });
  if (token.revokedAt || token.expiresAt <= clock()) {
    const replay = store.replayRefreshToken(refreshHash);
    if (replay.ok) return response(401, { error: 'invalid_grant' });
    return response(401, { error: 'invalid_grant' });
  }
  const session = store.getSession(token.sessionId);
  if (!session || !session.active || session.revokedAt) return response(401, { error: 'invalid_grant' });
  if (session.clientId !== body.client_id) return response(401, { error: 'invalid_grant' });
  const rotated = store.rotateRefreshToken({
    sessionId: token.sessionId,
    currentHash: refreshHash,
    clientId: body.client_id,
    userId: token.userId,
  });
  if (!rotated.ok) return response(401, { error: rotated.reason });
  const newAccess = store.issueAccessToken(token.sessionId, token.userId, body.client_id);
  return response(200, {
    token_type: 'Bearer',
    access_token: newAccess.token,
    expires_in: 900,
    refresh_token: rotated.token,
    session_id: token.sessionId,
  });
}

async function handleMe({ req, response, clock, store }) {
  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) return response(401, { error: 'invalid_token' });
  const accessHash = hashToken(bearer);
  const token = store.getAccessToken(accessHash);
  if (!token || token.expiresAt <= clock()) return response(401, { error: 'invalid_token' });
  const session = store.getSession(token.sessionId);
  if (!session || !session.active || session.revokedAt) return response(401, { error: 'invalid_session' });

  return response(200, {
    user_id: token.userId,
    email_verified: token.emailVerified !== false,
    session_id: token.sessionId,
  });
}

async function handleLogout({ req, response, store }) {
  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) return response(401, { error: 'invalid_token' });
  const accessHash = hashToken(bearer);
  const token = store.getAccessToken(accessHash);
  if (!token) return response(401, { error: 'invalid_token' });
  const session = store.getSession(token.sessionId);
  if (session) store.revokeSession(session.id);
  return response(200, { ok: true });
}

export { hashToken, randomToken, constantTimeEqual };
