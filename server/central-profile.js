import { descriptiveProfile } from './profile-fields.js';
import { profileLogoUrl } from './profile-logo.js';

// Descriptive data only; caller must already validate the app/session/entitlement.
export async function loadCentralProfile(admin, userId) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || data?.user?.id !== userId) throw new Error('Central profile unavailable.');
  const user = data.user, metadata = user.user_metadata;
  if (!metadata || !['personal', 'business'].includes(metadata.account_type)
    || typeof metadata.display_name !== 'string' || !metadata.display_name.trim()
    || metadata.display_name.length > 120) return null;
  return {
    display_name: metadata.display_name.trim(), account_type: metadata.account_type,
    ...descriptiveProfile(metadata),
    logo_url: await profileLogoUrl(admin, user),
    updated_at: typeof user.updated_at === 'string' ? user.updated_at : null,
  };
}
