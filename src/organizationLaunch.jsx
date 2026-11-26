import { useState } from 'react';
import { authRequest } from './authRequest';

// Options are display-only; the server independently checks membership and entitlement on launch.
export function useOrganizationLaunch() {
  const [choice, setChoice] = useState(null);
  async function launch(product) {
    const options = await authRequest('launch-options', { product });
    if (!options.organizationRequired) {
      const result = await authRequest('launch', { product });
      window.location.assign(result.next);
      return;
    }
    if (!Array.isArray(options.organizations) || options.organizations.length === 0) throw new Error('No active organization is available for this application.');
    setChoice({ product, organizations: options.organizations, selected: options.organizations.length === 1 ? options.organizations[0].id : '', error: '', busy: false });
  }
  async function confirm() {
    if (!choice?.selected || choice.busy) return;
    setChoice(current => ({ ...current, busy: true, error: '' }));
    try {
      const result = await authRequest('launch', { product: choice.product, organization_id: choice.selected });
      window.location.assign(result.next);
    } catch (error) {
      setChoice(current => current && ({ ...current, busy: false, error: error.message }));
    }
  }
  const chooser = choice && <div role="dialog" aria-label="Select organization">
    <label>Organization <select value={choice.selected} disabled={choice.busy} onChange={event => setChoice({ ...choice, selected: event.target.value })}>
      <option value="">Select an organization</option>
      {choice.organizations.map(org => <option key={org.id} value={org.id}>{org.name || org.id}</option>)}
    </select></label>
    <button type="button" disabled={!choice.selected || choice.busy} onClick={confirm}>Continue</button>
    <button type="button" disabled={choice.busy} onClick={() => setChoice(null)}>Cancel</button>
    <p role="alert">{choice.error}</p>
  </div>;
  return { launch, chooser };
}
