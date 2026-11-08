import { build } from 'vite';
import { flagEnabled, previewIsolationErrors } from '../server/project.js';
import { productionSsoPreflight } from '../server/production-preflight.js';
import { effectiveBuildEnvironment } from './build-environment.js';

const requestedProductionAuth = process.env.VERCEL_ENV === 'production'
  && flagEnabled(process.env.MYOPS_ENABLE_PRODUCTION_AUTH);
const mode = process.env.VERCEL_ENV === 'preview'
  ? 'preview-auth'
  : requestedProductionAuth ? 'production-auth' : 'production';
const env = effectiveBuildEnvironment(mode);
const isolationErrors = previewIsolationErrors(env);
if (isolationErrors.length) throw new Error(`Preview isolation configuration rejected: ${isolationErrors.join(', ')}`);
const preflight = productionSsoPreflight(env);
if (preflight.errors.length) {
  throw new Error(`Production SSO configuration is incomplete: ${preflight.errors.join(', ')}`);
}
const productionAuth = env.VERCEL_ENV === 'production' && flagEnabled(env.MYOPS_ENABLE_PRODUCTION_AUTH);
await build({ mode: env.VERCEL_ENV === 'preview' ? 'preview-auth' : productionAuth ? 'production-auth' : 'production' });
