import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  return createHash('sha256').update(value).digest('hex');
}

export function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

export function verifyPkceS256(codeVerifier, codeChallenge) {
  if (typeof codeVerifier !== 'string' || typeof codeChallenge !== 'string') return false;
  const expected = base64UrlEncode(createHash('sha256').update(codeVerifier).digest());
  return constantTimeEqual(expected, codeChallenge);
}

export function constantTimeEqual(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  if (actual.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isValidBase64Url(value, minLength = 16, maxLength = 256) {
  return typeof value === 'string'
    && value.length >= minLength
    && value.length <= maxLength
    && BASE64URL_RE.test(value);
}

export function parseRequestBody(req, maxBytes = 8192) {
  if (req.method !== 'POST') return { ok: false, status: 405, error: 'Method not allowed.' };
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    return { ok: false, status: 400, error: 'Request must be JSON.' };
  }
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > maxBytes) {
    return { ok: false, status: 413, error: 'Request body too large.' };
  }
  try {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'Request body must be a JSON object.' };
    }
    return { ok: true, body: parsed };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body.' };
  }
}

export function parseBearerToken(headerValue) {
  if (typeof headerValue !== 'string') return null;
  const match = headerValue.match(/^Bearer\s+([^\s]+)$/i);
  return match ? match[1] : null;
}

export function randomUuid() {
  return randomBytes(16).toString('hex');
}
