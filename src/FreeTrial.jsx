import { useEffect, useState } from 'react';
import { useSession } from './session';
import { authRequest } from './authRequest';
import { useLocale } from './locale';

export function FreeTrial() {
  const session=useSession();
  const {t,language}=useLocale();
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
    setBusy(true);setMessage('');
    try {const result=await authRequest('launch',{product});window.location.assign(result.next);}
    catch(error){setMessage(error.message);setBusy(false);}
  }
  const labels={opsfinance:'OpsFinance',opsflow:'OpsFlow',opsp:'OpsPS'};
  const availableApps=[...new Set(Array.isArray(state?.availableApps)?state.availableApps:[])]
    .filter(product=>Object.hasOwn(labels,product)&&session.products?.[product]!=='coming_soon');
  const active=state?.trial?.status==='active';
  const expired=state&&['expired','upgraded'].includes(state.trial?.status);
  return <article className="price-card price-card-featured" id="free-trial" aria-labelledby="free-trial-title">
    <h3 id="free-trial-title">{t('Free 7-Day Trial')}</h3>
    <p className="price-amount">RM0 <span>{t('/ 7 days')}</span></p>
    <p>{t('Evaluate eligible MYOPS applications for 7 days: 1 user, 1 company and up to 30 transactions per eligible app. Available applications and their limits are shown in your account.')}</p>
    <p>{t('No card required. No automatic renewal. Your data is retained after expiry.')}</p>
    {!session.signedIn ? <div className="founders-actions"><a className="btn btn-primary" href="/register">{t('Start free 7-day trial')}</a><a className="btn btn-secondary" href="/login">{t('Already registered? Login')}</a></div>
      : session.status==='unavailable' ? <p role="status">{t('Retry the session check before starting a trial.')}</p>
      : active ? <><p>{t('Active until')} {new Date(state.trial.expires_at).toLocaleString(({en:'en-MY',ms:'ms-MY',zh:'zh-CN',ta:'ta-MY'})[language],{timeZone:'Asia/Kuala_Lumpur'})} (Malaysia).</p>{availableApps.map(product=><button key={product} className="btn btn-primary" onClick={()=>open(product)} disabled={busy}>{t('Open')} {labels[product]}</button>)}{!availableApps.length&&<p>{t('Trial application access is currently unavailable.')}</p>}</>
      : state?.canStart&&availableApps.length>0 ? <button className="btn btn-primary" onClick={start} disabled={busy}>{t(busy?'Activating…':'Activate my free 7-day trial')}</button>
      : expired ? <p>{t('Your trial has ended. Choose a subscription to continue; your records are retained.')}</p>
      : state?.canStart ? <p>{t('Trial applications are not available yet. Please check your account later.')}</p>
      : state?.trial?.status==='not_started' ? <p>{t('Your existing access is unchanged. Check your account for trial eligibility.')}</p>
      : state ? <p>{t('Trial availability could not be confirmed. Please check your account.')}</p>
      : <p>{t('Checking trial eligibility…')}</p>}
    <p role="status" aria-live="polite">{t(message||state?.message)}</p>
  </article>;
}
