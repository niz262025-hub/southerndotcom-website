import { createClient } from '@supabase/supabase-js';
import { hashCode, validCode, verifyCodeChallenge, mobileClient } from '../../server/mobile-oauth.js';
import { projectForEnvironment } from '../../server/project.js';
import { serverServiceKey } from '../../server/service-key.js';

// Token redemption is wired but NOT enabled: no refresh-token lifecycle exists yet.
// Never consume a valid code until an atomic mobile credential issuance flow is ready.
export function createMobileTokenHandler({ env = process.env, clientFactory = createClient } = {}) {
 return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') return res.status(415).json({error:'unsupported_media_type'});
  const body = typeof req.body === 'string' ? (()=>{try{return JSON.parse(req.body)}catch{return null}})() : req.body;
  if (!body || Array.isArray(body) || JSON.stringify(body).length > 4096) return res.status(400).json({error:'invalid_request'});
  const { code, code_verifier, client_id, redirect_uri, grant_type } = body;
  if (grant_type !== 'authorization_code' || client_id !== mobileClient.id || redirect_uri !== mobileClient.redirect ||
      !validCode(code) || !verifyCodeChallenge(code_verifier, body.code_challenge)) {
   return res.status(400).json({error:'invalid_grant'});
  }
  // The client must NOT supply a trusted challenge. The expected challenge must be
  // loaded from the stored code record, which is protected by server-only access.
  const project = projectForEnvironment(env);
  const key = serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY, project);
  if (!key) return res.status(503).json({error:'mobile_auth_unavailable'});
  // Database RPC: myops_mobile_redeem_code(p_code_hash,p_code_challenge,p_client_id,p_redirect_uri).
  // DO NOT invoke until a server-owned challenge lookup and atomic credential issuance
  // are available; otherwise valid codes could be burned without issuing credentials.
  void clientFactory; void hashCode;
  return res.status(503).json({error:'mobile_credential_issuance_not_configured'});
 };
}
export default createMobileTokenHandler();
