import { validAuthorizeRequest } from '../../server/mobile-oauth.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  const params = Object.fromEntries(new URL(req.url,'https://www.myops.com.my').searchParams);
  if(!validAuthorizeRequest(params)) return res.status(400).json({error:'invalid_request'});
  // Fail closed: no browser session can be exchanged for a mobile token until
  // the central verified login and durable code storage are integrated.
  return res.status(503).json({error:'mobile_authorization_not_configured'});
}
