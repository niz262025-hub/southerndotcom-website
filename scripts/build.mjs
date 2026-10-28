import { build } from 'vite';
import { productionSsoPreflight } from '../server/production-preflight.js';
const preflight = productionSsoPreflight(process.env);
if (preflight.errors.length) {
  throw new Error(`Production SSO configuration is incomplete: ${preflight.errors.join(', ')}`);
}
const productionAuth = process.env.VERCEL_ENV === 'production' && process.env.MYOPS_ENABLE_PRODUCTION_AUTH === 'true';
await build({ mode: process.env.VERCEL_ENV === 'preview' ? 'preview-auth' : productionAuth ? 'production-auth' : 'production' });
