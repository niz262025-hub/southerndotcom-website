const MOBILE_CLIENTS = Object.freeze({
  'myops-mobile': {
    client_id: 'myops-mobile',
    display_name: 'MYOPSMobile',
    redirect_uris: ['myops://auth/callback'],
    pkce_required: true,
    pkce_method: 'S256',
  },
});

export function getMobileClient(clientId) {
  if (typeof clientId !== 'string') return null;
  return MOBILE_CLIENTS[clientId] ?? null;
}

export function validateMobileClient(clientId, redirectUri) {
  const client = getMobileClient(clientId);
  if (!client) return { ok: false, error: 'unknown_client' };
  if (typeof redirectUri !== 'string' || redirectUri.length > 2048) {
    return { ok: false, error: 'invalid_redirect_uri' };
  }
  if (redirectUri.includes('*') || redirectUri.startsWith('http://') || redirectUri.startsWith('https://')) {
    return { ok: false, error: 'invalid_redirect_uri' };
  }
  if (client.redirect_uris[0] !== redirectUri) {
    return { ok: false, error: 'invalid_redirect_uri' };
  }
  return { ok: true, client };
}

export function validateStateAndNonce(value, label) {
  if (typeof value !== 'string') return { ok: false, error: `${label}_required` };
  const normalized = value.trim();
  if (normalized.length < 16 || normalized.length > 256) {
    return { ok: false, error: `${label}_invalid` };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    return { ok: false, error: `${label}_invalid` };
  }
  return { ok: true, value: normalized };
}

export function isPkceS256Allowed(client, codeChallengeMethod) {
  if (!client || client.pkce_required !== true) return false;
  return codeChallengeMethod === 'S256';
}

export { MOBILE_CLIENTS };
