# Deployment and route verification — 9 November 2026 MY/SG

## Result: step 2 remains IN PROGRESS

This is an inspection and browser navigation run, not a production release. No merge, promotion, payment, database or environment changes were performed.

## Deployment evidence

- PR #56 remains OPEN, mergeable; reviewed commit 2d82d5387311aa6b19f6a346aba9af242d2424b4. Vercel commit status success; code review completed without findings.
- Preview dpl_9SqCVNE4Dco2QS6FabN9hnQDJMg8 is READY for that commit. Host: southerndotcom-website-foq8sqaoo-mohd-syaiful-nizam1.vercel.app.
- Live www.myops.com.my resolves through the authenticated Vercel lookup to READY production dpl_4FcJmY7qociSK7zcs5BvndLqZF4k, commit 22053c822077066dbbefc0c38398fc6d3257b90a, branch release/opshr-live.
- PR #56 is based on main 5682c57dee07c5c3c39157d7fca5927802f91e95. Main and live differ across auth, trial, billing UI and other files; promoting the entire preview would include unrelated changes. Prepare a minimal patch on the inspected live baseline before production release.

## Browser results

| Check | Result |
| --- | --- |
| Preview Finance solution CTA | PASS: Open MYOPS Account href /account; actual click loads account page. |
| Preview Flow solution CTA | PASS: same central account destination and actual click. |
| Preview OpsPS solution CTA | PASS: same central account destination and actual click. |
| Preview account authentication | BLOCKED: session banner says Session check unavailable; account settles on Use the trusted MYOPS website URL. No login or entitlement pass claimed. |
| Live OpsHR → My Account while signed out | PASS: actual click redirects to the central Welcome back to MYOPS login form. |
| Live Finance solution | Old Open OpsFinance CTA still present. |
| Live Flow solution | Old Discuss OpsFlow CTA still present. |
| Live OpsPS solution | Old Contact OpsPS CTA still present; actual click reaches /contact. |
| Authenticated account → application | NOT VERIFIED: no authenticated account/session used. |

Preview Deployment Protection was accessed using a scoped expiring Vercel share link for this deployment. No share credential is recorded here and protection was not disabled. The app trust rejection is separate from Vercel Deployment Protection.

## Next work

1. Base the three-CTA-only release patch on the current inspected production source, preserving its session/trial fixes.
2. Configure or use an approved trusted preview origin for application auth without weakening host checks; verify signed-out redirect and authenticated account launch.
3. Release the tested production candidate within owner authorization, verify domain-to-deployment mapping and repeat actual browser clicks.
4. Only then mark step 2 DONE. New-user registration/email/billing remain separate gates.
