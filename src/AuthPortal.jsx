import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { authRequest as request } from './authRequest';
import { jumpToFounders } from './foundersNav';

const productLabels = { opsp: 'OpsPS', opsfinance: 'OpsFinance', opsflow: 'OpsFlow', opswms: 'OpsWMS', opshr: 'OpsHR' };

export function AuthPortal({ mode, production = false }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState(null);
  const [trialInfo,setTrialInfo]=useState(null);
  const [accountType, setAccountType] = useState('personal');
  const started = useRef(false);
  const [verifyEmail, setVerifyEmail] = useState(() => new URLSearchParams(window.location.search).get('email') || '');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!resendAt || now >= resendAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAt, now]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (mode === 'callback') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      // Remove sensitive callback material before any request/navigation. No tokens
      // are handled by browser code, including implicit-flow fragments.
      window.history.replaceState(null, '', '/auth/callback');
      if (!code || params.has('error')) { setMessage('Invalid or expired link. Request a new email.'); return; }
      setBusy(true);
      request('callback', { code }).then((data) => window.location.replace(data.next))
        .catch((error) => setMessage(error.message)).finally(() => setBusy(false));
    } else if (mode === 'dashboard' || mode === 'reset') {
      setBusy(true);
      request('account').then((data) => { setAccount(data); setAccountType(data.profile?.account_type || 'personal'); if(data.trialAvailable&&!data.lifetime&&!production) request('trial_status').then(setTrialInfo).catch(error=>setMessage(error.message)); }).catch((error) => {
        if (error.status === 401) window.location.replace('/login');
        else setMessage(error.message);
      }).finally(() => setBusy(false));
    }
  }, [mode, production]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const action = mode === 'dashboard' ? 'profile' : mode === 'verify' ? 'verify_signup_otp' : mode;
      const result = await request(action, fields);
      if (result.next) window.location.assign(result.next);
      else setMessage(result.message);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function checkSandboxPayment() {
    if(busy) return;
    setBusy(true);setMessage('');
    try {
      const result=await request('payment_reconcile');
      setMessage(result.message);
      const updatedAccount = await request('account');
      setAccount(updatedAccount);
      if (updatedAccount.trialAvailable && !updatedAccount.lifetime) setTrialInfo(await request('trial_status'));
      else setTrialInfo(null);
    } catch(error){setMessage(error.message);}
    finally{setBusy(false);}
  }
  async function startTrial() {
    if(busy) return;
    setBusy(true);setMessage('');
    try {const result=await request('trial_start',{confirm:true});setTrialInfo(result);setMessage(result.message);}
    catch(error){setMessage(error.message);}
    finally{setBusy(false);}
  }
  async function openTrialApp(product) {
    if(busy) return;
    setBusy(true);setMessage('');
    try {const result=await request('launch',{product});window.location.assign(result.next);}
    catch(error){setMessage(error.message);setBusy(false);}
  }

  async function logout() {
    setBusy(true);
    try { const result = await request('logout'); window.location.replace(result.next); }
    catch (error) { setMessage(error.message); setBusy(false); }
  }

  const titles = { register: 'Create your MYOPS account', login: 'Welcome back to MYOPS',
    verify: 'Verify your email', forgot: 'Reset your password', reset: 'Choose a new password', callback: 'Confirming your MYOPS account', dashboard: 'Your MYOPS account' };
  return (
    <section className="account-preview container" aria-labelledby="auth-title">
      <div className="account-preview-heading"><span className="account-eyebrow">MYOPS · Customer Portal</span>
        <h1 id="auth-title">{titles[mode]}</h1>
        <p>Secure MYOPS account access{!production && ' · Development Preview'}</p>
      </div>
      <div className="account-preview-panel account-form-panel">
        <p role="status" aria-live="polite">{busy ? 'Please wait…' : message}</p>
        {mode === 'dashboard' && account && <>
          <p>Signed in as {account.email}</p>
          {account.profile?.company_name && <p>{account.profile.company_name}</p>}
          {account.profile && <p>{account.profile.display_name} · {account.profile.account_type === 'business' ? 'Business' : 'Personal'}</p>}
          <p>Open applications from the <a href="/">MYOPS homepage</a>; access is checked by the server on every launch.</p>
          <section id="subscription" aria-labelledby="subscription-title">
            <h2 id="subscription-title">Billing and subscriptions</h2>
            {!production && <button type="button" className="btn btn-secondary" disabled={busy} onClick={checkSandboxPayment}>Verify sandbox payment</button>}
            {account.products ? (
              <ul>
                {Object.entries(productLabels).map(([slug, label]) => (
                  <li id={`subscription-${slug}`} key={slug}>
                    {label}: {!account.lifetime && account.products[slug]==='active' && trialInfo?.trial.status==='active' && trialInfo.availableApps.includes(slug) ? 'Free trial active' : ({ active: 'Active subscription', none: 'No subscription', coming_soon: 'Coming soon' })[account.products[slug]]}
                    {account.products[slug] === 'none' && <> — <a className="btn btn-secondary" href="/#founders" onClick={jumpToFounders}>View Founders 100 and All Apps offer</a></>}
                  </li>
                ))}
              </ul>
            ) : <p>Subscription status is currently unavailable.</p>}
            {!production && account.trialAvailable && !account.lifetime && <section aria-labelledby="trial-title">
              <h3 id="trial-title">Free Trial — 7 days</h3>
              <p>RM0 for 7 × 24 hours from activation. No payment card, automatic charge or renewal. One trial per eligible account/company; 1 user and 1 company. Your data is kept after expiry.</p>
              <p>Staging UAT apps: {trialInfo?.availableApps.map(product=>productLabels[product]).join(', ') || 'Checking availability…'}. Other applications are not included yet.</p>
              {trialInfo?.availableApps.includes('opsflow') && <p>OpsFlow: up to 30 transaction records and 2 purchase-order flows.</p>}
              {trialInfo?.availableApps.includes('opsfinance') && <p>OpsFinance: up to 30 transactions and 2 CSV/TXT bank statements, with 30 rows per file. Start bank accounts with zero opening balance. Statement approval, reconciliation and reports are preview only; export requires an upgrade in MYOPS.</p>}
              {trialInfo?.availableApps.includes('opsp') && <p>OpsPS: up to 2 trips/projects and 30 primary orders or manual financial entries. Financial entries linked to an order share its quota. Basic sales/orders reports are included; advanced reporting, export and multi-user require an upgrade in MYOPS.</p>}
              {trialInfo ? <>
                <p>Trial status: {trialInfo.trial.status.replace('_',' ')}</p>
                {trialInfo.trial.expires_at && <p>Expires: {new Date(trialInfo.trial.expires_at).toLocaleString()}</p>}
                {trialInfo.canStart && <button type="button" className="btn btn-primary" disabled={busy} onClick={startTrial}>Activate free 7-day trial</button>}
                {trialInfo.trial.status==='active' && trialInfo.availableApps.map(product=><button key={product} type="button" className="btn btn-primary" disabled={busy} onClick={()=>openTrialApp(product)}>Open {productLabels[product]}</button>)}
                {!trialInfo.canStart && trialInfo.trial.status==='not_started' && <p>Your existing access is already active; no trial is needed.</p>}
              </> : <p>Checking trial eligibility…</p>}
              <p>Other packages: First 100 Subscribers · Normal Subscription (2 apps) · All Apps. New paid checkout is not enabled by this trial test.</p>
            </section>}
            {account.lifetime && <p>Founders 100 lifetime access: active (all current and future MYOPS apps).</p>}
            <p>{production ? 'Subscriptions and application access are not available for purchase yet.' : 'Preview payments use the ToyyibPay sandbox only. Application access is granted only after the server confirms a verified payment or active subscription.'}</p>
          </section>
          <p>Applications open through your MYOPS login. This site signs you out after 15 minutes of inactivity.</p>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={logout}>Sign out</button>
          <p><a href="/forgot-password">Change password</a></p>
        </>}
        {mode === 'verify' && <p>Enter the 6- or 8-digit code from your MYOPS confirmation email. After verification you will be signed in automatically.</p>}
        {mode === 'callback' && <p><a href="/login">Return to sign in</a></p>}
        {mode === 'verify' && <form onSubmit={submit} aria-busy={busy}>
          <label>Email<input type="email" name="email" autoComplete="email" value={verifyEmail} onChange={e=>setVerifyEmail(e.target.value)} required disabled={busy}/></label>
          <label>Verification code<input type="text" name="token" inputMode="numeric" pattern="[0-9]{6}([0-9]{2})?" maxLength={8} autoComplete="one-time-code" required disabled={busy}/></label>
          <button type="submit" className="btn btn-primary" disabled={busy}>Verify & sign in</button>
          <button type="button" className="btn btn-secondary" disabled={busy || now < resendAt} onClick={async()=>{setBusy(true);setMessage('');try{const result=await request('resend_signup_otp',{email:verifyEmail});setMessage(result.message);setNow(Date.now());setResendAt(Date.now()+60000);}catch(error){setMessage(error.message);}finally{setBusy(false);}}}>Resend code</button>
        </form>}
        {mode !== 'callback' && mode !== 'verify' && (mode !== 'dashboard' || account) && (mode !== 'reset' || account) && (
          <form onSubmit={submit} aria-busy={busy}>
            {(mode === 'register' || mode === 'dashboard') && <>
              <input type="hidden" name="profileVersion" value="1" />
              <h2>{mode === 'dashboard' ? 'Complete your profile' : 'Account details'}</h2>
              {mode === 'dashboard' && <p>Save your name and company here once. Applications use these details when setting up your account; existing application data is preserved.</p>}
              <label>Full name<input name="displayName" autoComplete="name" defaultValue={account?.profile?.display_name || ''} required maxLength={100} disabled={busy} /></label>
              {accountType !== 'business' && <label>Company name<input name="companyName" autoComplete="organization" defaultValue={account?.profile?.company_name || ''} maxLength={200} disabled={busy} /></label>}
              <label>Account type<select name="accountType" value={accountType} onChange={(e) => setAccountType(e.target.value)} disabled={busy}>
                <option value="personal">Personal / Individual</option><option value="business">Business</option>
              </select></label>
              {accountType === 'business' && <>
                <label>Company name<input name="companyName" autoComplete="organization" defaultValue={account?.profile?.company_name || ''} maxLength={200} required disabled={busy} /></label>
                <label>SSM registration number<input name="ssmNumber" defaultValue={account?.profile?.ssm_number || ''} maxLength={50} required disabled={busy} /></label>
                <label>Company email<input name="companyEmail" type="email" autoComplete="email" defaultValue={account?.profile?.company_email || account?.email || ''} maxLength={254} required disabled={busy} /></label>
                <label>Person in charge<input name="personInCharge" defaultValue={account?.profile?.person_in_charge || ''} maxLength={100} required disabled={busy} /></label>
              </>}
              <label>Contact number<input name="contactNumber" type="tel" autoComplete="tel" defaultValue={account?.profile?.contact_number || ''} maxLength={40} required disabled={busy} /></label>
              <label>{accountType === 'business' ? 'Business address' : 'Address'}<textarea name="address" autoComplete="street-address" defaultValue={account?.profile?.address || ''} maxLength={1000} required disabled={busy} /></label>
            </>}
            {['register', 'login', 'forgot'].includes(mode) && <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>}
            {['register', 'login', 'reset'].includes(mode) && <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 12} maxLength={128} disabled={busy} /></label>}
            {mode === 'register' && <p>Use 12–128 characters for your password. Enter the TAC/OTP sent to your email on the next screen.</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : ({ register: 'Register', login: 'Sign in', forgot: 'Send recovery email', reset: 'Save password', dashboard: 'Save profile' })[mode]}</button>
          </form>
        )}
        <p className="account-switch"><a href="/login">Sign in</a> · <a href="/register">Register</a> · <a href="/forgot-password">Forgot password?</a></p>
      </div>
    </section>
  );
}
AuthPortal.propTypes = { production: PropTypes.bool, mode: PropTypes.oneOf(['register', 'login', 'forgot', 'reset', 'callback', 'verify', 'dashboard']).isRequired };
