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
    { name: 'Single App', price: 'RM19.90', period: '/ month', description: 'Choose one MYOPS app for a focused rollout.', actionLabel: 'Checkout opening soon', featured: false },
    { name: 'Duo', price: 'RM29.90', period: '/ month', description: 'Access any two paid MYOPS apps in one bundle.', actionLabel: 'Checkout opening soon', featured: false },
    { name: 'Triple', price: 'RM39.90', period: '/ month', description: 'Unlock three MYOPS apps for broader business operations.', actionLabel: 'Checkout opening soon', featured: true },
    { name: 'All Apps', price: 'RM49.90', period: '/ month', description: 'Access the complete MYOPS suite for your business.', actionLabel: 'Checkout opening soon', featured: false },
  ];

  return (
    <section className="content-section founders-promo" id="founders" aria-labelledby="founders-title">
      <div className="container">
        <p className="section-label">Subscription &amp; Pricing</p>
        <h2 id="founders-title">Choose your MYOPS plan</h2>
        <div className="pricing-trial-feature">
          <FreeTrial />
        </div>
        <div className="pricing-cards pricing-cards-four">
          {plans.map((plan) => (
            <article key={plan.name} className={`price-card price-card-plan${plan.featured ? ' price-card-highlight' : ''}`}>
              <h3>{plan.name}</h3>
              <p className="price-amount">{plan.price} <span>{plan.period}</span></p>
              <p>{plan.description}</p>
              {plan.actionLabel ? (
                <button type="button" className="btn btn-secondary" disabled>{plan.actionLabel}</button>
              ) : (
                <p className="founders-note">Seller account is free. GMV tiers are 3% / 2% / 1.5%.</p>
              )}
            </article>
          ))}
        </div>
        {waiting && <p role="status">Confirming your payment…</p>}
        <p className="founders-note">All paid plans are monthly and manual renewal is not yet open for checkout.</p>
        <p className="founders-note">Monthly subscriptions are not open for purchase yet.</p>
        <p className="founders-note">{production ? 'Payments are not available yet.' : 'Sandbox payments only: no real money is charged in Preview. Payments are verified server-side before access is granted.'}</p>
      </div>
    </section>
  );
}

FoundersPromo.propTypes = { production: PropTypes.bool };
