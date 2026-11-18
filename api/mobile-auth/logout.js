import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { projectForEnvironment } from '../../server/project.js';
import { serverServiceKey } from '../../server/service-key.js';

const HASHABLE=/^[A-Za-z0-9_-]{43}$/;
const sha256=value=>createHash('sha256').update(value).digest('base64url');
export function createMobileLogoutHandler({env=process.env,clientFactory=createClient}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(req.headers['content-type']?.split(';')[0]?.trim()!=='application/json') return res.status(415).json({error:'unsupported_media_type'});
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{return res.status(400).json({error:'invalid_request'})}}
  if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>2048)
   return res.status(400).json({error:'invalid_request'});
  const refresh=body.refresh_token;
  const bearer=req.headers.authorization;
  const access=typeof bearer==='string'&&bearer.startsWith('Bearer ')?bearer.slice(7):null;
  if(!HASHABLE.test(refresh||'')&&!HASHABLE.test(access||''))
   return res.status(400).json({error:'invalid_request'});
  const project=projectForEnvironment(env),key=serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY,project);
  if(!key) return res.status(503).json({error:'mobile_auth_unavailable'});
  try{
   const admin=clientFactory(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
   // Revoke by either credential. Invalid or already revoked credentials remain
   // indistinguishable; never reveal whether a token was valid.
   const rpc=HASHABLE.test(refresh||'')?'myops_mobile_revoke_refresh':'myops_mobile_revoke_access';
   const args=rpc==='myops_mobile_revoke_refresh'?{p_refresh_hash:sha256(refresh)}:{p_access_hash:sha256(access)};
   const {error}=await admin.rpc(rpc,args);
   if(error) return res.status(503).json({error:'mobile_auth_unavailable'});
   return res.status(204).end();
  }catch{return res.status(503).json({error:'mobile_auth_unavailable'});}
 };
}
export default createMobileLogoutHandler();
