import { mobileAuthEnabled } from '../../server/mobile-environment.js';
import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { validCode, mobileClient } from '../../server/mobile-oauth.js';
import { projectForEnvironment } from '../../server/project.js';
import { serverServiceKey } from '../../server/service-key.js';

const sha256 = value => createHash('sha256').update(value).digest('base64url');
const pkceVerifier = /^[A-Za-z0-9_-]{43,128}$/;
const token = () => randomBytes(32).toString('base64url');

export function createMobileTokenHandler({env=process.env, clientFactory=createClient}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Pragma','no-cache');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(req.headers['content-type']?.split(';')[0]?.trim()!=='application/json') return res.status(415).json({error:'unsupported_media_type'});
  const body=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return null}})():req.body;
  if(!body||Array.isArray(body)||JSON.stringify(body).length>4096) return res.status(400).json({error:'invalid_request'});
  const {code,code_verifier,client_id,redirect_uri,grant_type}=body;
  if(grant_type!=='authorization_code'||client_id!==mobileClient.id||redirect_uri!==mobileClient.redirect||
    !validCode(code)||!pkceVerifier.test(code_verifier||'')) return res.status(400).json({error:'invalid_grant'});
  // This route stays disabled until token verification, rotation, revocation and
  // complete native client UAT are ready. Do not issue unusable bearer credentials.
  if(!mobileAuthEnabled(env)) return res.status(503).json({error:'mobile_token_issuance_disabled'});
  const project=projectForEnvironment(env);
  const key=serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY,project);
  if(!key) return res.status(503).json({error:'mobile_auth_unavailable'});
  const access=token(),refresh=token();
  try {
   const admin=clientFactory(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await admin.rpc('myops_mobile_redeem_and_issue',{
    p_code_hash:sha256(code),p_code_challenge:sha256(code_verifier),
    p_client_id:client_id,p_redirect_uri:redirect_uri,
    p_access_hash:sha256(access),p_refresh_hash:sha256(refresh)
   });
   if(error) return res.status(503).json({error:'mobile_auth_unavailable'});
   if(!Array.isArray(data)||data.length!==1) return res.status(400).json({error:'invalid_grant'});
   return res.status(200).json({access_token:access,token_type:'Bearer',expires_in:900,
    refresh_token:refresh,refresh_expires_in:2592000});
  }catch{return res.status(503).json({error:'mobile_auth_unavailable'});}
 };
}
export default createMobileTokenHandler();
