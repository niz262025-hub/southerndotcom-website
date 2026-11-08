import { useEffect, useState } from 'react';
import { useSession } from './session';
import { authRequest } from './authRequest';
import { LIVE_TRIAL_APPS, APP_LABELS } from './subscriptionPolicy';

export function FreeTrial() {
  const session=useSession();
  const [state,setState]=useState(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!session.enabled||!session.signedIn||session.status!=='ready') { setState(null); return; }
    let current=true;
    authRequest('trial_status').then(result=>{if(current)setState(result);}).catch(error=>{if(current)setMessage(error.message);});
    return ()=>{current=false;};
  },[session.enabled,session.signedIn,session.status]);
  if(!session.enabled) return null;
  async function start() {
    if(busy)return;
    setBusy(true);setMessage('');
    try {setState(await authRequest('trial_start',{confirm:true}));await session.refresh(false);}
    catch(error){setMessage(error.message);}
    finally{setBusy(false);}
  }
  async function open(product) {
    if(busy||!LIVE_TRIAL_APPS.includes(product))return;
    setBusy(true);setMessage('');
    try {const result=await authRequest('launch',{product});window.location.assign(result.next);}
    catch(error){setMessage(error.message);setBusy(false);}
  }
  const active=state?.trial?.status==='active'&&Date.parse(state.trial.expires_at)>Date.now();
  const availableApps=LIVE_TRIAL_APPS.filter(app=>state?.availableApps?.includes(app));
  const expired=state&&(['expired','upgraded'].includes(state.trial?.status)||(state.trial?.status==='active'&&!active));
  return <article className="price-card price-card-featured" id="free-trial" aria-labelledby="free-trial-title">
    <h3 id="free-trial-title">Free 7-Day Trial · Percubaan Percuma 7 Hari</h3>
    <p className="price-amount">RM0 <span>/ 7 hari</span></p>
    <p>Try available OpsFinance, OpsFlow (Retail POS), OpsPS (Personal Shopper) and OpsHR with one 7-day trial: 1 user, 1 company and 30 transactions per app. OpsWMS remains Coming Soon.</p>
    <p>No card required. No automatic renewal. Your data is retained after expiry.</p>
    {!session.signedIn ? <div className="founders-actions"><a className="btn btn-primary" href="/register">Start free 7-day trial</a><a className="btn btn-secondary" href="/login">Already registered? Login</a></div>
      : session.status==='unavailable' ? <p role="status">Retry the session check before starting a trial.</p>
      : active ? <><p>Active until {new Date(state.trial.expires_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})} (Malaysia).</p>{availableApps.map(app=><button key={app} className="btn btn-primary" onClick={()=>open(app)} disabled={busy}>Open {APP_LABELS[app]}</button>)}{!availableApps.length&&<p>Application access is being checked. Please retry shortly.</p>}</>
      : state?.canStart ? <button className="btn btn-primary" onClick={start} disabled={busy}>{busy?'Activating…':'Activate my free 7-day trial'}</button>
      : expired ? <p>Your trial has ended. Choose a subscription to continue; your records are retained.</p>
      : state ? <p>Your existing paid or administrator access remains active; no trial is needed.</p>
      : <p>Checking trial eligibility…</p>}
    <p role="status" aria-live="polite">{message||state?.message}</p>
  </article>;
}
