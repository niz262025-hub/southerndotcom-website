import { productionSsoPreflight } from '../server/production-preflight.js';

const result = productionSsoPreflight(process.env);
if (result.errors.length) {
  console.error('BLOCK: invalid production SSO configuration:', result.errors.join(', '));
  process.exitCode = 1;
} else if (!result.enabled) {
  console.log('SAFE: production SSO launch is disabled for this environment; no readiness claim.');
} else {
  console.log('Configuration checks passed. App key registration, identity mapping, broker isolation and authenticated UAT still require verification.');
}
