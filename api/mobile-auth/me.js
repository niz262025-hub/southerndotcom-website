import { verifyMobileAccess } from '../../server/mobile-access.js';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 const session=await verifyMobileAccess(req);
 if(!session) return res.status(401).json({error:'invalid_token'});
 return res.status(200).json({active:true,user_id:session.userId});
}
