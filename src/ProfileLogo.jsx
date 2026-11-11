import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { authRequest } from './authRequest';

const DEFAULT_LOGO = '/images/myops-logo-wordmark.png';
const logoUrl = (value) => {
  try {
    const url = new URL(value);
    const project = new URL(import.meta.env?.VITE_SUPABASE_URL);
    if (url.protocol === 'https:' && url.origin === project.origin
        && url.pathname.startsWith('/storage/v1/object/sign/myops-profile-logos/')
        && !url.username && !url.password && !url.hash) return url.href;
  } catch { /* Use the bundled logo for untrusted or unavailable URLs. */ }
  return DEFAULT_LOGO;
};
export function ProfileLogo({ profile, refresh }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function change(operation) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      let fields = { operation };
      if (operation === 'upload') {
        if (!file) throw new Error('Choose a logo first.');
        const encoded = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(new Error('Logo could not be read.'));
          reader.readAsDataURL(file);
        });
        fields = { ...fields, contentType: file.type, encoded };
      }
      const result = await authRequest('profile-logo', fields);
      setFile(null); setMessage(result.cleanupPending ? 'Logo saved. Previous private file cleanup is pending.' : result.message);
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const image = preview || logoUrl(profile?.logo_url);
  return <section className="profile-logo" aria-labelledby="profile-logo-title">
    <h2 id="profile-logo-title">Company / account logo</h2>
    <img src={image} alt="Company or MYOPS logo" width="180" height="72"
      onError={event => { if (event.currentTarget.getAttribute('src') !== DEFAULT_LOGO) event.currentTarget.src = DEFAULT_LOGO; }} />
    <p>PNG, JPEG or WebP, up to 256 KB. The MYOPS logo is used when no logo is available.</p>
    <label>Choose logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => {
      const selected = event.target.files?.[0]; setMessage('');
      if (selected && (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || selected.size > 256 * 1024)) {
        setFile(null); event.target.value = ''; setMessage('Use a PNG, JPEG or WebP logo up to 256 KB.');
      } else setFile(selected || null);
    }} /></label>
    <div className="profile-logo-actions">
      <button type="button" disabled={busy || !file} onClick={() => change('upload')}>{busy ? 'Please wait…' : 'Save logo'}</button>
      <button type="button" disabled={busy || !profile?.has_logo} onClick={() => change('remove')}>Remove logo</button>
    </div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
ProfileLogo.propTypes = { profile: PropTypes.object, refresh: PropTypes.func.isRequired };
