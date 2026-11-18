export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  // No in-memory authorization codes, static secrets or browser cookie forwarding.
  // Activation requires atomic consume, PKCE verification, rotation and revocation.
  return res.status(503).json({error:'mobile_token_exchange_not_configured'});
}
