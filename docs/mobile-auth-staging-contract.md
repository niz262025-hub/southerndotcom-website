# MYOPS Mobile Native Auth Contract (Staging Only)

Status: proposal / staging review required / not executed / do not apply to production.

This document describes the secure server-side contract for MYOPSMobile integration with MYOPS Central Login without changing the existing browser auth flow. The web authentication system remains the source of truth. This mobile contract is additive and off by default.

## Feature flag

Set the server flag explicitly before enabling mobile auth in staging:

```env
MYOPS_ENABLE_MOBILE_AUTH=true
```

The flag must remain disabled by default. Production remains fail-closed unless a separate, explicit approval is granted.

## Client registry

The native client is registered server-side only:

- client_id: `myops-mobile`
- display name: `MYOPSMobile`
- redirect_uri: `myops://auth/callback`
- PKCE: required
- PKCE method: `S256` only

The server validates the exact redirect URI and rejects wildcard, prefix, HTTP, and dynamic native registration attempts.

## Endpoint contract

All routes are `POST` only and accept `application/json` request bodies. No `GET` route is used for authorisation or token exchange.

### POST /api/mobile-auth/authorize

Request example:

```json
{
  "client_id": "myops-mobile",
  "redirect_uri": "myops://auth/callback",
  "code_challenge": "xYDnQQ4WF14R-99ngWcAj_koSNv6nUs96oh8XDOOM7g",
  "code_challenge_method": "S256",
  "state": "state_1234567890abcdef",
  "nonce": "nonce_1234567890abcdef"
}
```

Server requirements:

- feature flag enabled
- exact `client_id` match
- exact redirect URI match
- `state` and `nonce` format and length validation
- current authenticated MYOPS user session required
- user must be verified
- authorization code generated using cryptographically secure randomness
- authorization code lifetime: 60 seconds
- store only a hash of the authorization code
- do not place the code in a URL or redirect

Response:

```json
{
  "code": "synthetic-code",
  "state": "state_1234567890abcdef",
  "expires_in": 60,
  "code_challenge_method": "S256"
}
```

### POST /api/mobile-auth/token

Request example:

```json
{
  "grant_type": "authorization_code",
  "client_id": "myops-mobile",
  "redirect_uri": "myops://auth/callback",
  "code": "synthetic-code",
  "code_verifier": "test-code-verifier-1234567890abc"
}
```

Requirements:

- verify code hash
- reject expired or used code
- reject replay
- require exact client and redirect match
- verify `BASE64URL(SHA256(code_verifier)) == code_challenge`
- create a mobile session bound to the user and client
- issue short-lived access token and rotating refresh token
- hash all refresh tokens before storage
- never expose Supabase refresh tokens

Response:

```json
{
  "token_type": "Bearer",
  "access_token": "synthetic-access-token",
  "expires_in": 900,
  "refresh_token": "synthetic-refresh-token",
  "session_id": "mobile-session-id"
}
```

### POST /api/mobile-auth/refresh

Request example:

```json
{
  "client_id": "myops-mobile",
  "refresh_token": "synthetic-refresh-token"
}
```

Requirements:

- validate stored token hash
- check session is still active
- rotate refresh token on every successful use
- revoke the prior refresh token atomically
- detect replay and revoke the whole session family
- reject expired or revoked sessions

### POST /api/mobile-auth/me

Authorization header:

```http
Authorization: Bearer synthetic-access-token
```

Response:

```json
{
  "user_id": "stable-user-id",
  "email_verified": true,
  "session_id": "mobile-session-id"
}
```

This response deliberately omits tokens and other secrets.

### POST /api/mobile-auth/logout

Authorization header:

```http
Authorization: Bearer synthetic-access-token
```

Behavior:

- revoke the active mobile session
- revoke all refresh tokens in the session family
- make subsequent `/me` and `/refresh` calls fail
- return a generic success payload

## PKCE sequence

1. MYOPSMobile creates a `code_verifier` and derives `code_challenge = BASE64URL(SHA256(code_verifier))`.
2. The app calls `/api/mobile-auth/authorize` with the S256 challenge and a state/nonce value.
3. The server verifies the authenticated user and stores only the challenge, not the verifier.
4. The mobile app receives a short-lived authorization code.
5. The app exchanges the code by calling `/api/mobile-auth/token` with the original verifier.
6. The server validates the verifier using the stored challenge and issues access and refresh tokens.

## Secure storage recommendations for MYOPSMobile

- store the access token in secure storage with app-level encryption
- store the refresh token in secure storage, not in plaintext in logs or user-visible files
- never store tokens in URL query strings, route params, AsyncStorage in clear text, or app debug output
- never log authorization codes, verifier values, access tokens, refresh tokens, or client secrets
- treat the callback URI as exact and non-user-configurable

## Token lifetimes

- authorization code: 60 seconds
- access token: 15 minutes
- refresh token: max 30 days
- mobile session: active until revocation or expiry

## Refresh rotation and replay controls

- each successful refresh rotates the active refresh token
- the old token is revoked immediately
- reuse of a revoked token triggers a replay response and revokes the entire session family
- session-family revocation prevents token reuse after compromise or callback races

## Error model

The mobile contract returns generic, fail-closed responses without exposing upstream secrets or internal data.

Examples:

- `invalid_grant`
- `invalid_redirect_uri`
- `invalid_pkce`
- `authorization_code_expired`
- `authorization_code_replay`
- `invalid_token`
- `user_unverified`
- `unauthorized`

## Staging validation steps

1. Enable the feature flag only in staging.
2. Verify the platform app uses the exact URI `myops://auth/callback`.
3. Confirm the authorize call succeeds only when the browser session is valid and the user is email-confirmed.
4. Verify PKCE S256 validation during token exchange.
5. Confirm refresh rotation and replay revocation.
6. Confirm `me` and `logout` reject revoked tokens.
7. Confirm no tokens appear in URLs or logs.

## Rollback plan

- disable `MYOPS_ENABLE_MOBILE_AUTH`
- remove the staging route handlers if required
- keep the original browser flow intact
- do not apply the SQL proposals to production
- if staging validation fails, leave the feature off and revert the staging-only PR

## SQL proposal status

The SQL under `supabase/proposals/` is not executed and must remain out-of-band of production deployments. It is a staging proposal only and should be reviewed before any staging environment is configured.
