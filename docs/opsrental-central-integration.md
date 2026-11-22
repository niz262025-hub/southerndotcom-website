# OpsRental central integration: release gates

The signed entitlement endpoint can return an `admin` decision scoped to one requested organization. It checks the live app session, the server-owned MYOPS administrator allowlist and a current active owner/admin membership for that exact organization. The request is app-authenticated; the browser cannot assert a role. Rental APIs continue to verify local membership, role and data scope. The new claim is fail-closed when the central contract is unavailable.

This is not a complete production authorization rollout. The MYOPS administrator allowlist is environment configuration; removing an ID takes effect only once the updated configuration reaches the runtime. A centrally managed, immediately revocable administrator authority must be designed and tested before claiming immediate administrator revocation. Removing an organization membership or revoking a central session is checked on each request.

## Free trial decision required

OpsRental is deliberately excluded from central trial admission and quota. Existing trial policies define features only for OpsFinance, OpsFlow and OpsPS. MYOPS needs an explicit decision on which OpsRental creates or other actions consume one of the 30 transactions (properties, tenancies, payments, tickets, documents; edits/deletes and retries). The implementation also needs an idempotent, failure-safe quota/mutation contract so failed or repeated operations neither exhaust quota incorrectly nor bypass it. Do not enable the product in the trial allowlist until this is implemented and tested. MYOPS currently measures seven days as 168 hours; confirm whether that matches the requested calendar-day interpretation.

## Hosted UAT and release gates

Use a dedicated approved non-production environment with registered OpsRental client signing keys, central login/session and entitlement services, synthetic users, organizations and roles, rental tables with reviewed RLS, and a private rental Storage bucket. Verify preview-only configuration and browser desktop/mobile flows, trial limits and expiry, organization and tenant isolation, revoked sessions and admin authority, private file access and cache headers. Hosted migrations, resource configuration, deployment and merge each require explicit authorization. No existing shared SSO staging or production resources are changed by this proposal.
