import { mobileAuthEnabled } from '../../server/mobile-environment.js';
import { createClient } from '@supabase/supabase-js';
import { mobileAuthorizationQuery } from '../../src/mobileAuthorization.js';
import { issueAuthorizationCode,hashCode } from '../../server/mobile-oauth.js';
import { verifyMobileBrowserSession } from '../../server/mobile-browser-session.js';
import { projectForEnvironment } from '../../server/project.js';
import { serverServiceKey } from '../../server/service-key.js';

export function createMobileAuthorizeHandler({env=process.env,clientFactory=createClient,sessionVerifier=verifyMobileBrowserSession}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  let url;
  try {url=new URL(req.url,'https://www.myops.com.my');}catch{return res.status(400).json({error:'invalid_request'});}
  const params=Object.fromEntries(url.searchParams);
  const query=mobileAuthorizationQuery(params);
  if(!query) return res.status(400).json({error:'invalid_request'});
  // Do not redirect errors or codes until the native login integration has been tested.
  if(!mobileAuthEnabled(env))
   return res.status(503).json({error:'mobile_authorization_disabled'});
  const session=await sessionVerifier(req,{env});
  if(!session?.verifiedJwt||!session?.durableLoginVerified) {
   if (req.headers['sec-fetch-mode'] === 'navigate' || req.headers.accept?.includes('text/html')) {
    query.set('mobile_login','1');
    res.setHeader('Location','/login?'+query);
    return res.status(302).end();
   }
   return res.status(401).json({error:'login_required'});
  }
  const project=projectForEnvironment(env),key=serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY,project);
  if(!key) return res.status(503).json({error:'mobile_auth_unavailable'});
  const code=issueAuthorizationCode();
  try {
   const admin=clientFactory(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await admin.rpc('myops_mobile_issue_code',{
    p_code_hash:hashCode(code),p_user_id:session.userId,
    p_login_session_id:session.loginSessionId,p_code_challenge:params.code_challenge
   });
   if(error||data!==true) return res.status(503).json({error:'mobile_auth_unavailable'});
   const redirect=new URL('myops://auth/callback');
   redirect.searchParams.set('code',code);
   redirect.searchParams.set('state',params.state);
   res.setHeader('Location',redirect.toString());
   return res.status(302).end();
  }catch{return res.status(503).json({error:'mobile_auth_unavailable'});}
 };
}
export default createMobileAuthorizeHandler();
