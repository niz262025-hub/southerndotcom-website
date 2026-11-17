// Release acceptance ledger. READY alone is never acceptance.
// Change one entry only after recording critical authenticated production UAT evidence.
export const APP_RELEASES = Object.freeze(Object.fromEntries([
  'opsfinance', 'opsflow', 'opsp', 'opshr', 'opswms',
  'opssmarthome', 'opsclinic', 'opsrental', 'opslife',
].map(slug => [slug, Object.freeze({ status: 'coming_soon', acceptance: null })])));

export function isAppLive(slug, releases = APP_RELEASES) {
  if (!Object.hasOwn(releases, slug)) return false;
  const entry = releases[slug];
  return entry?.status === 'live' && Boolean(entry.acceptance?.commit
    && entry.acceptance?.deployment && entry.acceptance?.evidence);
}
export function liveApps(releases = APP_RELEASES) {
  return Object.keys(releases).filter(slug => isAppLive(slug, releases));
}
