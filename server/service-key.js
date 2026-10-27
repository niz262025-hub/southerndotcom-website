// This selects a server environment credential, never authenticates a browser JWT.
// Supabase still verifies its signature and permissions on every upstream request.
export function serverServiceKey(value, project) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('sb_secret_')) return value;
  try {
    const parts=value.split('.');
    if(parts.length!==3 || parts.some(part=>!part))return null;
    const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString());
    const ref=new URL(project).hostname.split('.')[0];
    if(header.alg!=='HS256'||payload.role!=='service_role'||payload.ref!==ref
      || !Number.isFinite(payload.exp)||payload.exp<=Date.now()/1000)return null;
    return value;
  } catch {return null;}
}
