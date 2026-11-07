# ToyyibPay sandbox checkout backend

This repository implements the secure Preview-only ToyyibPay sandbox flow for founder and single-app payments. The key rule is simple: the browser never decides billing state, and merchant credentials are never exposed to the frontend or committed to GitHub.

## Scope

- Preview-only backend API for ToyyibPay sandbox checkout
- Server-side pricing in MYR, stored and enforced on the backend
- Authenticated order creation using the server-owned payment record
- Provider bill creation on the server, not in the browser
- Callback verification with provider reconciliation and idempotent replay handling
- Subscription entitlements and renewal status derived from server-side payment state
- Sandbox-only integration tests covering checkout and callbacks

## Security model

### Server-hosted secrets

All payment credentials stay in server environment variables only:

- `MYOPS_SERVICE_ROLE_KEY`
- `TOYYIBPAY_SANDBOX_SECRET_KEY`
- `TOYYIBPAY_SANDBOX_CATEGORY_CODE`
- `MYOPS_ADMIN_USER_IDS`
- `MYOPS_APP_URL_<SLUG>`

These values must be configured in the deployment environment, never in frontend code, public HTML, or source-controlled files.

### Canonical pricing

The authoritative pricing is set server-side in the payment flow and must be checked against the provider response before acceptance:

- Founder lifetime: RM29 once
- Single app monthly: RM29 per month

Proposed bundle and business tiers remain disabled by policy and are rejected server-side with `plan_disabled`.

### Authenticated checkout

Checkout is only available to signed-in users with an existing server-owned profile that marks the account as `personal` and a confirmed email. The server verifies this on the backend via `myops_create_payment` before creating any reservation or bill.

### Provider bill creation

The backend calls the ToyyibPay sandbox endpoint to create a bill with:

- `userSecretKey`
- `categoryCode`
- `billAmount` in cents (MYR price × 100)
- `billExternalReferenceNo` equal to the internal order reference (`MYOPS-...`)
- `billCallbackUrl` set to `${origin}/api/toyyibpay-callback`

The created `BillCode` is stored on the server record. The browser only receives the redirect URL to `https://dev.toyyibpay.com/<BillCode>`.

## Callback flow

The callback endpoint receives POST data from ToyyibPay and must handle it as untrusted input.

### Validation rules

- Preview-only route: `/api/toyyibpay-callback`
- POST only
- Reject malformed fields, invalid order refs, invalid bill codes, or oversized payloads
- Reject a supplied hash when it does not match:
  `md5(secret + status + order_id + refno + "ok")`
- Treat `status=2` as pending and ignore it
- Require a valid provider-side confirmation for `status=1` or `status=3`

### Provider reconciliation

A callback is never accepted as final authority. The server must independently confirm the payment with ToyyibPay using `getBillTransactions` and match:

- same `order_ref` / `billExternalReferenceNo`
- paid status
- expected amount in MYR
- correct bill code

The server records the result and settles the order only if all checks match. This makes callback handling idempotent and prevents forged callbacks from granting access.

### Idempotency

Duplicate callbacks and replayed webhook payloads are de-duplicated by a stable event key:

- `sha256(billcode|order_id|refno|status)`

The server stores the event key and returns a harmless `already_settled` response on duplicate execution. Failure and cancellation callbacks are accepted only when the hash is valid and the provider confirmation matches the server record.

## Subscription state and entitlements

The backend uses server-side payment settlement to grant entitlements:

- Founder lifetime: grants lifetime access to every live app
- Single-app monthly: grants access only to the selected live app for that payment
- No free lifetime entitlements are created
- A documented late Founder payment is flag-only for manual review; it never grants a lifetime or monthly conversion

The browser reads server-side `session` data and must never trust client-side access checks.

## Required deployment configuration

Before activating the sandbox in Preview, the deployment must have all of the following configured as environment variables:

- `MYOPS_SESSION_SECRET` (existing)
- `VITE_SUPABASE_URL` (existing)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (existing)
- `MYOPS_SERVICE_ROLE_KEY`
- `TOYYIBPAY_SANDBOX_SECRET_KEY`
- `TOYYIBPAY_SANDBOX_CATEGORY_CODE`
- `MYOPS_ADMIN_USER_IDS`
- `MYOPS_APP_URL_<SLUG>` for each launchable app

No credentials should appear in frontend code, source files, or GitHub pull requests.

## Validation and tests

The repository includes focused sandbox integration tests for:

- checkout request validation
- server-side bill creation
- callback hash and field validation
- duplicate callback handling
- provider reconciliation and amount-mismatch rejection
- single-app subscriptions and founder lifetime settlement

The test suite is run via:

- `npm test`
- `npm run lint`
- `npm run build`

## Known constraints

- Sandbox configuration is Preview-only and blocked until the required server variables are added
- Deployment protection can block a provider callback; the callback route must be reachable from the provider without exposing secrets
- The underlying Supabase SQL foundation and Phase 3 payment tables must be applied in staging prior to live end-to-end sandbox verification

This repo intentionally fails closed when the sandbox is not configured, which prevents interactive checkout or callback authorization from being treated as complete without the required server-side secrets.
