import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { authRequest } from './authRequest';
import { useSession } from './session';
import { FreeTrial } from './FreeTrial';

const POLL_MS = 3000;
const POLL_MAX = 10;
// Display only. Slot counts come from the server and access is re-checked server-side.
export function FoundersPromo({ production = false }) {
  const session = useSession();
  const sandboxCheckout = !production && import.meta.env?.VITE_MYOPS_MONTHLY_SANDBOX === 'true';
  const [selection,setSelection]=useState({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function checkout(plan) {
    if(busy) return;
    setBusy(true);setError('');
    const products=plan==='complete_monthly'?['opsfinance','opsflow','opsp']:(selection[plan]||[]);
    try {
      const result=await authRequest('checkout',{plan,products});
      const next=new URL(result.next);
      if(next.origin!=='https://dev.toyyibpay.com') throw new Error('Unexpected payment destination.');
      window.location.assign(next.href);
    }catch(e){setError(e.message);setBusy(false);}
  }
  const [, setFounders] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const polls = useRef(0);

  const loadFounders = useCallback(() => authRequest('founders').then(setFounders).catch(() => setFounders({ available: false })), []);
  useEffect(() => { if (session.enabled) loadFounders(); }, [session.enabled, loadFounders]);

  const returning = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payment') === 'return';
  useEffect(() => {
    if (!session.enabled || !returning || !session.signedIn || session.lifetime) { setWaiting(false); return undefined; }
    setWaiting(true);
    const timer = setInterval(() => {
      polls.current += 1;
      session.refresh(false);
      if (polls.current >= POLL_MAX) { clearInterval(timer); setWaiting(false); }
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.enabled, session.signedIn, session.lifetime, returning]);

  if (!session.enabled || session.status === 'loading') return null;

  const plans = [
    { name: 'Starter', price: 'RM9.90', period: '/ month', description: 'Limited-use entry tier for lighter operating needs.', actionLabel: 'Checkout opening soon', featured: false },
    { id:'single_monthly', count:1, name: 'Single', price: 'RM19.90', period: '/ month', description: 'Choose one MYOPS product for a focused rollout.', actionLabel: 'Checkout opening soon', featured: false },
    { id:'duo_monthly', count:2, name: 'Duo', price: 'RM29.90', period: '/ month', description: 'Access any two paid MYOPS products in one bundle.', actionLabel: 'Checkout opening soon', featured: false },
    { id:'complete_monthly', count:3, name: 'Complete', price: 'RM39.90', period: '/ month', description: 'Unlock the complete MYOPS bundle for your business.', actionLabel: 'Checkout opening soon', featured: true },
    { name: 'OpsHub', price: 'RM0', period: '/ month', description: 'Seller account is free; GMV commission tiers are 3% / 2% / 1.5%.', actionLabel: null, featured: false },
  ];

  return (
    <section className="content-section founders-promo" id="founders" aria-labelledby="founders-title">
      <div className="container">
        <p className="section-label">Subscription &amp; Pricing</p>
        <h2 id="founders-title">Choose your MYOPS plan</h2>
        <div className="pricing-cards">
          <FreeTrial />
          {plans.map((plan) => (
            <article key={plan.name} className={`price-card${plan.featured ? ' price-card-featured' : ''}`}>
              <h3>{plan.name}</h3>
              <p className="price-amount">{plan.price} <span>{plan.period}</span></p>
              <p>{plan.description}</p>
              {sandboxCheckout && plan.id ? <>
                {plan.count<3 && <fieldset disabled={busy}><legend>Choose {plan.count} application{plan.count>1?'s':''}</legend>
                  {['opsfinance','opsflow','opsp'].map(app=><label key={app}><input type="checkbox" checked={(selection[plan.id]||[]).includes(app)} onChange={e=>setSelection(old=>({...old,[plan.id]:e.target.checked?[...(old[plan.id]||[]),app]:(old[plan.id]||[]).filter(x=>x!==app)}))}/>{({opsfinance:'OpsFinance',opsflow:'OpsFlow',opsp:'OpsPS'})[app]}</label>)}
                </fieldset>}
                <button type="button" className="btn btn-secondary" disabled={busy||!session.signedIn||session.lifetime||(plan.count<3&&(selection[plan.id]||[]).length!==plan.count)} onClick={()=>checkout(plan.id)}>Test sandbox checkout</button>
              </> : plan.actionLabel ? (
                <button type="button" className="btn btn-secondary" disabled>{plan.actionLabel}</button>
              ) : (
                <p className="founders-note">Seller account is free. GMV tiers are 3% / 2% / 1.5%.</p>
              )}
            </article>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        {waiting && <p role="status">Confirming your payment…</p>}
        <p className="founders-note">All paid plans include a 14-day trial and manual monthly renewal.</p>
        <p className="founders-note">Monthly subscriptions are not open for purchase yet.</p>
        <p className="founders-note">{production ? 'Payments are not available yet.' : 'Sandbox payments only: no real money is charged in Preview. Payments are verified server-side before access is granted.'}</p>
      </div>
    </section>
  );
}

FoundersPromo.propTypes = { production: PropTypes.bool };
