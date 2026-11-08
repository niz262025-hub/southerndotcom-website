import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { authRequest } from './authRequest';
import { useSession } from './session';
import { FreeTrial } from './FreeTrial';
import { PUBLIC_PAID_PLANS } from './subscriptionPolicy';

const POLL_MS = 3000;
const POLL_MAX = 10;
// Display only. Slot counts come from the server and access is re-checked server-side.
export function FoundersPromo({ production = false }) {
  const session = useSession();
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

  const plans = PUBLIC_PAID_PLANS;

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
              <button type="button" className="btn btn-secondary" disabled>Checkout opening soon</button>
            </article>
          ))}
        </div>
        {waiting && <p role="status">Confirming your payment…</p>}
        <p className="founders-note">One free 7-day trial covers available OpsFinance, OpsFlow, OpsPS and OpsHR, subject to eligibility. Monthly plans renew manually.</p>
        <p className="founders-note">Choose a plan when subscriptions become available.</p>
        <p className="founders-note">{production ? 'Check payment availability before purchase.' : 'Sandbox payments only: no real money is charged in Preview. Payments are verified server-side before access is granted.'}</p>
      </div>
    </section>
  );
}

FoundersPromo.propTypes = { production: PropTypes.bool };
