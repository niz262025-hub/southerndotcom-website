import { mobileAuthEnabled } from '../../server/mobile-environment.js';
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { projectForEnvironment } from '../../server/project.js';
import { serverServiceKey } from '../../server/service-key.js';

const hash=value=>createHash('sha256').update(value).digest('base64url');
const newToken=()=>randomBytes(32).toString('base64url');
const REFRESH=/^[A-Za-z0-9_-]{43}$/;

export function createMobileRefreshHandler({env=process.env,clientFactory=createClient}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Pragma','no-cache');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(req.headers['content-type']?.split(';')[0]?.trim()!=='application/json') return res.status(415).json({error:'unsupported_media_type'});
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{return res.status(400).json({error:'invalid_request'})}}
  if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>4096||
     body.grant_type!=='refresh_token'||!REFRESH.test(body.refresh_token||'')||body.client_id!=='myopsmobile')
   return res.status(400).json({error:'invalid_request'});
  if(!mobileAuthEnabled(env))
   return res.status(503).json({error:'mobile_token_issuance_disabled'});
  const project=projectForEnvironment(env),key=serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY,project);
  if(!key) return res.status(503).json({error:'mobile_auth_unavailable'});
  const access=newToken(),refresh=newToken();
  try{
   const admin=clientFactory(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await admin.rpc('myops_mobile_rotate_refresh',{
    p_old_refresh_hash:hash(body.refresh_token),
    p_new_access_hash:hash(access),p_new_refresh_hash:hash(refresh)
   });
   if(error) return res.status(503).json({error:'mobile_auth_unavailable'});
   if(!Array.isArray(data)||data.length!==1) return res.status(400).json({error:'invalid_grant'});
   return res.status(200).json({access_token:access,token_type:'Bearer',expires_in:900,
    refresh_token:refresh,refresh_expires_in:2592000});
  }catch{return res.status(503).json({error:'mobile_auth_unavailable'});}
 };
}
export default createMobileRefreshHandler();
