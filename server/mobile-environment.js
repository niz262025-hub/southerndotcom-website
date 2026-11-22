import { projectForEnvironment, STAGING_PROJECT } from './project.js';

export function mobileAuthEnabled(env) {
  return env.MYOPS_ENABLE_MOBILE_TOKEN_ISSUANCE === 'true'
    && projectForEnvironment(env) === STAGING_PROJECT;
}
