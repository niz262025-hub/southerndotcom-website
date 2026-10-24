# OpsFinance launch integration audit — baseline 12e71ef

## Verified in source
- `src/session.jsx` already calls `authRequest('launch', { product: product.slug })` for active entitlements.
- `server/auth.js` explicitly blocks `launch` on the official production domain via the production action allowlist.
- `server/app-access.js` reads `MYOPS_APP_URL_OPSFINANCE`, issues a short-lived single-use ticket, and sends the browser to `/launch#t=...`.
- `src/AccountPreview.jsx` is explicitly a design-only preview and its Open App buttons are disabled.
- The OpsFinance product marketing CTA in `src/App.jsx` currently points to `https://app.myops.com.my/`, not an authenticated app handoff.

## Deployment configuration targets
- UAT: `MYOPS_APP_URL_OPSFINANCE=https://uat-finance.myops.com.my`
- Production after approval: `MYOPS_APP_URL_OPSFINANCE=https://finance.myops.com.my`

These are intended environment settings, not verified deployed values. Do not include `/dashboard` in the configured base URL: the server adds `/launch`.

## Implementation gates
1. Verify registered MYOPS app client, public-key signature protocol, required Supabase RPCs and current entitlement policies in UAT.
2. Implement OpsFinance `/launch` browser fragment capture and immediate removal, POST ticket exchange through its server, session establishment and `/dashboard` redirect.
3. Enforce membership and RLS on every OpsFinance read/write; reject invalid/replayed/expired tickets.
4. Test sign-in, launch, unentitled user, logout, revocation, two-business isolation and full dashboard.
5. Only after tests and explicit approval, enable `launch` in the MYOPS production allowlist and deploy the production hostname.

No production auth policy or route is changed by this document.
