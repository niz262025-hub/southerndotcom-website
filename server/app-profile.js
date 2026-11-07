// Descriptive labels only: these never authorize membership, roles or entitlement.
export function appProfileFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const displayName = typeof metadata.display_name === 'string' ? metadata.display_name.trim() : '';
  const companyName = (typeof metadata.company_name === 'string' ? metadata.company_name.trim() : '')
    || (metadata.account_type === 'personal' ? displayName : '');
  if (!displayName || displayName.length > 100 || !companyName || companyName.length > 200) return null;
  return { display_name: displayName, company_name: companyName };
}

export async function loadAppProfile(admin, userId) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || data?.user?.id !== userId) throw new Error('app_profile_unavailable');
  return appProfileFromMetadata(data.user.user_metadata);
}
