import { isAppLive, APP_RELEASES } from '../src/appRelease.js';
import { isPlatformAdmin } from './entitlements.js';

// Server-owned explicit UAT identities retain existing entitlements, never public access.
export function isReleaseTester(userId, env = {}) {
  return isPlatformAdmin(userId, env) || (typeof userId === 'string' && userId.length > 0
    && String(env.MYOPS_RELEASE_UAT_USER_IDS || '').split(',').map(id => id.trim()).includes(userId));
}
export function releasedCatalog(catalog, userId, env = {}, releases = APP_RELEASES) {
  return catalog.map(item => ({ ...item, launch_status:
    isAppLive(item.slug, releases) || isReleaseTester(userId, env) ? item.launch_status : 'coming_soon' }));
}
export function canPurchaseApps(apps, releases = APP_RELEASES) {
  return Array.isArray(apps) && apps.length > 0 && apps.every(app => isAppLive(app, releases));
}
