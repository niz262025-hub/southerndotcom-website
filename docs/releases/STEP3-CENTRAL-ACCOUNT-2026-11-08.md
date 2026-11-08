# Step 3 — central MYOPS account flow

Implementation and automated verification complete. Production release and real email/browser UAT remain later release steps.

Depends on the Step 2 policy branch / MYOPS PR #52. Review and merge policy before this account-flow change.

## Verified flows

| Flow | Evidence |
| --- | --- |
| Personal/company registration | Required contact/company validation; forged roles and tenant fields excluded; unconfirmed email cannot sign in |
| Email confirmation | Existing PKCE handler verifies the user, creates secure cookies and returns `/account`; recovery remains on the fixed password-update route |
| Login and inactivity | Existing verified identity, signed login binding, durable satellite activity and 15-minute inactivity tests pass |
| Profile save/read | Updated company/name/SSM/contact metadata read back only through the verified user; no subscription or role is granted |
| Trial activation | Account and shared session refreshed after activation; one set of account launch buttons |
| Four app access | Account, session and launch handlers agree on OpsFinance/OpsFlow/OpsPS/OpsHR eligibility; expired trial and Coming Soon OpsWMS issue no launch ticket |
| Paid/trial label | Server returns per-app access mode from separate paid and trial resolution; UI uses that mode |
| Central logout/expiry UI | Passive access updates remove unavailable launch buttons; a signed-out session clears account content and redirects to MYOPS login |

## Changes

- Registration guidance covers the four eligible apps instead of OpsHR alone.
- The account page launches active apps through the central signed launch endpoint for paid and trial customers; unentitled/coming-soon apps expose no launch button.
- Removed the duplicate trial card/account launch controls. Activation re-reads central account status and passively refreshes the shared session.
- Account visibility follows central session probes. A transient probe failure removes launch controls while retaining retryable profile context; a confirmed sign-out clears account content.
- Descriptive metadata remains separate from authorization. The server-owned trial client now respects the handler's client factory, enabling realistic account/session/launch contract tests without real network calls.
- Removed Preview-specific support/error wording from the shared production flow.

## Validation

- Full MYOPS suite: 212 PASS, 36 SKIP, 0 FAIL. Skips require native PostgreSQL binaries; PGlite database tests ran.
- Trial integration suite: 1 PASS; activates a trial in isolated PGlite and verifies a real central handler launch contract.
- ESLint: PASS.
- Public production-mode build: PASS.
- Authenticated Preview build: PASS.
- Tests use synthetic users and mocked email/SDK transports. No actual confirmation email delivery or hosted app data write is claimed.

## Release boundaries

No production promotion, hosted SQL change, new paid resource or customer transaction was performed. Step 2's four-app production trial gate remains opt-in and requires all adapters to pass integrated UAT. Real email confirmation on phone/desktop, hosted profile propagation, each app's signed session redemption and payment UAT must be verified on the planned release candidate before go-live.
