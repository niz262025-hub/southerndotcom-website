import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { projectForEnvironment } from './project.js';
import { serverServiceKey } from './service-key.js';

const BEARER = /^Bearer ([A-Za-z0-9_-]{43})$/;
const hash = value => createHash('sha256').update(value).digest('base64url');

// Server-side opaque access token verifier; never forward the token to Supabase Auth.
// Returns null for invalid, expired, revoked or unavailable sessions (fail closed).
export async function verifyMobileAccess(req,{env=process.env,clientFactory=createClient}={}) {
 const auth=req.headers?.authorization;
 const match=typeof auth==='string'?BEARER.exec(auth):null;
 if(!match) return null;
 const project=projectForEnvironment(env);
 const key=serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY,project);
 if(!key) return null;
 try {
  const admin=clientFactory(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.rpc('myops_mobile_verify_access',{p_access_hash:hash(match[1])});
  if(error||!Array.isArray(data)||data.length!==1) return null;
  const row=data[0];
  if(!row.mobile_session_id||!row.mobile_user_id||!row.login_session_id) return null;
  return {sessionId:row.mobile_session_id,userId:row.mobile_user_id,loginSessionId:row.login_session_id};
 } catch {return null;}
}
