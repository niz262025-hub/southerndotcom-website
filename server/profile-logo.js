import { randomUUID } from 'node:crypto';

export const LOGO_BUCKET = 'myops-profile-logos';
export const LOGO_MAX_BYTES = 256 * 1024;
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function ownedLogoPath(path, userId) {
  return typeof userId === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(userId)
    && typeof path === 'string' && path.startsWith(`${userId}/`)
    && /^[a-zA-Z0-9-]{1,64}\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(path);
}

export function decodeLogo(contentType, encoded) {
  if (!Object.hasOwn(TYPES, contentType) || typeof encoded !== 'string'
    || !encoded.length || encoded.length > Math.ceil(LOGO_MAX_BYTES / 3) * 4
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('Use a PNG, JPEG or WebP logo up to 256 KB.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  const png = bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    && bytes.subarray(12, 16).toString() === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0
    && bytes.readUInt32BE(16) <= 4096 && bytes.readUInt32BE(20) <= 4096
    && bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'));
  const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216
    && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  const webp = bytes.length >= 20 && bytes.subarray(0, 4).toString() === 'RIFF'
    && bytes.subarray(8, 12).toString() === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length
    && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.subarray(12, 16).toString());
  if (bytes.length > LOGO_MAX_BYTES || !({ 'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp })[contentType]) {
    throw new Error('The logo content does not match its image format.');
  }
  return { bytes, extension: TYPES[contentType] };
}

export async function profileLogoUrl(client, user) {
  const path = user.user_metadata?.logo_path;
  if (!ownedLogoPath(path, user.id)) return null;
  try {
    const { data, error } = await client.storage.from(LOGO_BUCKET).createSignedUrl(path, 300);
    return !error && typeof data?.signedUrl === 'string' ? data.signedUrl : null;
  } catch { return null; }
}

// Caller must first validate the central session. This service uses that caller's
// Storage client/JWT; RLS independently enforces the same owner prefix.
export async function changeProfileLogo({ client, user, operation, contentType, encoded, saveMetadata }) {
  if (operation !== 'upload' && operation !== 'remove') throw new Error('Invalid logo operation.');
  const bucket = client.storage.from(LOGO_BUCKET);
  const oldPath = ownedLogoPath(user.user_metadata?.logo_path, user.id) ? user.user_metadata.logo_path : null;
  if (operation === 'remove') {
    if (oldPath) {
      const removed = await bucket.remove([oldPath]);
      if (removed.error) throw new Error('Logo removal failed. Please retry.');
    }
    await saveMetadata({ logo_path: null });
    return { message: 'Logo removed. The MYOPS logo will be used.' };
  }
  const { bytes, extension } = decodeLogo(contentType, encoded);
  const path = `${user.id}/${randomUUID()}.${extension}`;
  if (!ownedLogoPath(path, user.id)) throw new Error('Logo owner is invalid.');
  const uploaded = await bucket.upload(path, bytes, { contentType, upsert: false, cacheControl: '0' });
  if (uploaded.error) throw new Error('Logo upload failed. Please retry.');
  try { await saveMetadata({ logo_path: path }); }
  catch {
    // Only the newly created object is eligible for rollback; never remove the old logo.
    await bucket.remove([path]).catch(() => {});
    throw new Error('Logo could not be saved. Please retry.');
  }
  let cleanupPending = false;
  if (oldPath) {
    try { cleanupPending = Boolean((await bucket.remove([oldPath])).error); }
    catch { cleanupPending = true; }
  }
  return { message: 'Logo saved.', ...(cleanupPending ? { cleanupPending: true } : {}) };
}
