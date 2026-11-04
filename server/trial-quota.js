// Trusted server adapter only. The signed app/session handler must supply this
// identity; never pass through user_id/login_session_id from a browser body.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FEATURES={opsfinance:['transactions','bank_statements','invoice_receipt_documents'],opsflow:['transactions','workflows'],opsp:['transactions','projects']};
export async function consumeVerifiedTrialQuota(client,identity,feature,operationId) {
 if(!identity?.active || !UUID.test(identity.userId||'') || !UUID.test(identity.loginSessionId||'') || !UUID.test(operationId||'')) return {allowed:false,reason:'invalid_session'};
 if(!Object.hasOwn(FEATURES,identity.product) || !FEATURES[identity.product].includes(feature)) return {allowed:false,reason:'premium_or_unavailable'};
 try {
  const {data,error}=await client.rpc('myops_consume_trial_quota',{p_user_id:identity.userId,p_login_session_id:identity.loginSessionId,p_app_id:identity.product,p_feature:feature,p_operation_id:operationId});
  if(error || !data || typeof data.allowed!=='boolean') return {allowed:false,reason:'unavailable'};
  if(!data.allowed) return {allowed:false,reason:['trial_inactive','trial_membership_changed','trial_limit_reached'].includes(data.reason)?data.reason:'unavailable'};
  if(!Number.isInteger(data.used)||!Number.isInteger(data.limit)||data.used<1||data.used>data.limit||typeof data.replayed!=='boolean') return {allowed:false,reason:'unavailable'};
  return {allowed:true,used:data.used,limit:data.limit,replayed:data.replayed};
 } catch { return {allowed:false,reason:'unavailable'}; }
}
