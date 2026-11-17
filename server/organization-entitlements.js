import { projectForEnvironment } from './project.js';
import { serverServiceKey } from './service-key.js';

// Called only after Auth verifies userId. Browser RLS deliberately hides organization
// billing from managers; resolve only subscriptions covered by their own active membership
// AND an explicit app grant. No request body or editable user metadata chooses this scope.
export async function loadGrantedOrganizationSubscriptions({ client, userId, grants, env, clientFactory }) {
  const granted = new Set(grants.map(grant => grant.organization_id).filter(id => typeof id === 'string' && id));
  if (!granted.size) return [];
  const memberships = await client.from('myops_memberships').select('organization_id,user_id,status')
    .eq('user_id', userId).eq('status', 'active');
  if (memberships.error) return null;
  const organizations = [...new Set((memberships.data || [])
    .filter(row => row.user_id === userId && row.status === 'active' && granted.has(row.organization_id))
    .map(row => row.organization_id))];
  if (!organizations.length) return [];
  const project = projectForEnvironment(env);
  const key = serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY, project);
  if (!key) return null;
  const server = clientFactory(project, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await server.from('myops_subscriptions')
    .select('personal_user_id,organization_id,product_slug,is_complete_bundle,status,current_period_end')
    .in('organization_id', organizations);
  if (result.error) return null;
  return (result.data || []).filter(row => !row.personal_user_id && organizations.includes(row.organization_id));
}
