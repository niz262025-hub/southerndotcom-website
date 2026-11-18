import { randomToken, hashToken, randomUuid } from './mobile-auth-crypto.js';

function nowMs() {
  return Date.now();
}

export class MemoryMobileAuthStore {
  constructor() {
    this.authorizationCodes = new Map();
    this.sessions = new Map();
    this.refreshTokens = new Map();
    this.accessTokens = new Map();
  }

  issueAuthorizationCode(record) {
    const code = randomToken(32);
    const codeHash = hashToken(code);
    const entry = {
      codeHash,
      userId: record.userId,
      clientId: record.clientId,
      redirectUri: record.redirectUri,
      codeChallenge: record.codeChallenge,
      codeChallengeMethod: record.codeChallengeMethod,
      state: record.state,
      nonce: record.nonce,
      createdAt: nowMs(),
      expiresAt: nowMs() + 60000,
      consumedAt: null,
      consumed: false,
    };
    this.authorizationCodes.set(codeHash, entry);
    return { code, codeHash, entry };
  }

  findAuthorizationCode(codeHash) {
    return this.authorizationCodes.get(codeHash) ?? null;
  }

  consumeAuthorizationCode(codeHash) {
    const entry = this.authorizationCodes.get(codeHash);
    if (!entry) return { ok: false, reason: 'invalid_grant' };
    if (entry.consumed || entry.consumedAt || entry.expiresAt <= nowMs()) {
      return { ok: false, reason: 'invalid_grant' };
    }
    entry.consumed = true;
    entry.consumedAt = nowMs();
    return { ok: true, entry };
  }

  createSession(userId, clientId) {
    const sessionId = randomUuid();
    const session = {
      id: sessionId,
      userId,
      clientId,
      createdAt: nowMs(),
      expiresAt: nowMs() + (30 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      active: true,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) ?? null;
  }

  revokeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.active = false;
    session.revokedAt = nowMs();
    for (const [hash, token] of this.refreshTokens.entries()) {
      if (token.sessionId === sessionId) {
        token.revokedAt = nowMs();
        token.active = false;
        if (token.replacedByHash) {
          this.refreshTokens.delete(hash);
        }
      }
    }
    for (const [, token] of this.accessTokens.entries()) {
      if (token.sessionId === sessionId) {
        token.revokedAt = nowMs();
        token.active = false;
      }
    }
    return true;
  }

  issueAccessToken(sessionId, userId, clientId, emailVerified = true) {
    const token = randomToken(32);
    const hash = hashToken(token);
    const expiresAt = nowMs() + (15 * 60 * 1000);
    this.accessTokens.set(hash, {
      hash,
      sessionId,
      userId,
      clientId,
      expiresAt,
      revokedAt: null,
      active: true,
      emailVerified,
    });
    return { token, hash, expiresAt };
  }

  getAccessToken(hash) {
    const token = this.accessTokens.get(hash) ?? null;
    if (!token || token.revokedAt || !token.active || token.expiresAt <= nowMs()) {
      return null;
    }
    return token;
  }

  issueRefreshToken(sessionId, userId, clientId) {
    const token = randomToken(32);
    const hash = hashToken(token);
    const expiresAt = nowMs() + (30 * 24 * 60 * 60 * 1000);
    const record = {
      hash,
      sessionId,
      userId,
      clientId,
      familyId: randomUuid(),
      expiresAt,
      revokedAt: null,
      active: true,
      replacedByHash: null,
      usedAt: null,
    };
    this.refreshTokens.set(hash, record);
    return { token, hash, expiresAt, record };
  }

  findRefreshToken(hash) {
    return this.refreshTokens.get(hash) ?? null;
  }

  rotateRefreshToken({ sessionId, currentHash, clientId, userId }) {
    const current = this.refreshTokens.get(currentHash);
    if (!current || current.sessionId !== sessionId || current.revokedAt || current.expiresAt <= nowMs()) {
      return { ok: false, reason: 'invalid_grant' };
    }
    const newToken = randomToken(32);
    const newHash = hashToken(newToken);
    current.revokedAt = nowMs();
    current.active = false;
    current.replacedByHash = newHash;
    current.usedAt = nowMs();
    const next = {
      hash: newHash,
      sessionId,
      userId,
      clientId,
      familyId: current.familyId,
      expiresAt: nowMs() + (30 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      active: true,
      replacedByHash: null,
      usedAt: null,
    };
    this.refreshTokens.set(newHash, next);
    return { ok: true, token: newToken, hash: newHash, expiresAt: next.expiresAt, record: next };
  }

  replayRefreshToken(hash) {
    const token = this.refreshTokens.get(hash);
    if (!token || !token.revokedAt) return { ok: false };
    const session = this.sessions.get(token.sessionId);
    if (session) {
      this.revokeSession(token.sessionId);
    }
    return { ok: true, revokedSessionId: token.sessionId };
  }
}

export function createMemoryMobileAuthStore() {
  return new MemoryMobileAuthStore();
}

export function createProductionMobileAuthStore() {
  return {
    ready: false,
    issueAuthorizationCode: () => ({ ok: false, reason: 'unavailable' }),
    findAuthorizationCode: () => null,
    consumeAuthorizationCode: () => ({ ok: false, reason: 'unavailable' }),
    createSession: () => null,
    getSession: () => null,
    revokeSession: () => false,
    issueAccessToken: () => ({ token: '', hash: '', expiresAt: 0 }),
    getAccessToken: () => null,
    issueRefreshToken: () => ({ token: '', hash: '', expiresAt: 0, record: null }),
    findRefreshToken: () => null,
    rotateRefreshToken: () => ({ ok: false, reason: 'unavailable' }),
    replayRefreshToken: () => ({ ok: false }),
  };
}
