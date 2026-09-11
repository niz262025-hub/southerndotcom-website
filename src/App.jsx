import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import {
  AcceptableUsePage,
  CookiePolicyPage,
  PrivacyPolicyPage,
  RefundCancellationPage,
  TermsOfServicePage,
} from './legalPages';

const products = [
  {
    name: 'OpsHub',
    tag: 'Operations Marketplace',
    description: 'Discover and connect through a marketplace designed around operational needs.',
    cta: 'Explore OpsHub',
    accent: 'blue',
  },
  {
    name: 'OpsPS',
    tag: 'Personal Shopper Management Platform',
    description:
      'Manage products, orders, inventory, and fulfilment with a platform built for day-to-day personal shopper operations.',
    cta: 'Explore OpsPS',
    accent: 'purple',
  },
];

const ecosystemNodes = ['MYOPS', 'OpsHub', 'OpsPS'];

const benefits = [
  {
    title: 'Built Around Real Business Needs',
    text: 'Practical digital solutions built to support everyday operations and service workflows.',
  },
  {
    title: 'Connected Solutions',
    text: 'Different solutions brought together under one ecosystem for clearer coordination.',
  },
  {
    title: 'Simple & Practical',
    text: 'Designed to help teams work more effectively without unnecessary complexity.',
  },
  {
    title: 'Built to Scale',
    text: 'A foundation that can evolve with changing business requirements and growth.',
  },
];

const routes = {
  '/privacy': PrivacyPolicyPage,
  '/terms': TermsOfServicePage,
  '/cookies': CookiePolicyPage,
  '/refund-cancellation': RefundCancellationPage,
  '/acceptable-use': AcceptableUsePage,
};

function normalizePath(pathname) {
  const filtered = pathname.split('?')[0].split('#')[0];
  const cleaned = filtered === '' ? '/' : filtered.replace(/\/+$/, '') || '/';
  return cleaned;
}

function LogoMark({ compact = false }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={compact ? 'brand-mark-svg compact' : 'brand-mark-svg'}
      role="img"
      aria-label="MYOPS logo"
    >
      <defs>
        <linearGradient id="myopsBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC167A" />
          <stop offset="45%" stopColor="#F0187A" />
          <stop offset="78%" stopColor="#FF8A00" />
          <stop offset="100%" stopColor="#8B3DFF" />
        </linearGradient>
      </defs>
      <path d="M25 92L60 22L95 92H82L60 52L38 92H25Z" fill="url(#myopsBrandGradient)" opacity="0.96" />
      <path d="M18 96L60 15L102 96H86L60 46L34 96H18Z" fill="none" stroke="#071B49" strokeWidth="6" strokeLinejoin="round" opacity="0.9" />
      <path d="M31 84V35H45L60 58L75 35H89V84H75V54L60 79L45 54V84H31Z" fill="#071B49" />
    </svg>
  );
}

LogoMark.propTypes = {
  compact: PropTypes.bool,
};

function LandingPage() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="container nav">
          <a href="/" className="brand" aria-label="MYOPS home">
            <span className="brand-mark">
              <LogoMark compact />
            </span>
            <span className="brand-wordmark">MYOPS</span>
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#products">Products</a>
            <a href="#benefits">Why MYOPS</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <a href="#contact" className="btn btn-primary nav-cta">
            Get Started
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">ONE ECOSYSTEM. MULTIPLE SOLUTIONS.</span>
              <h1>One Ecosystem. Multiple Solutions.</h1>
              <p>
                MYOPS brings connected digital solutions together to help businesses and professionals work
                smarter, manage better and move forward.
              </p>
              <p className="positioning-copy">
                MYOPS is a business technology ecosystem built around practical digital solutions for modern
                businesses and professionals.
              </p>
              <div className="hero-actions">
                <a href="#products" className="btn btn-primary">
                  Explore Our Solutions
                </a>
                <a href="#contact" className="btn btn-secondary">
                  Get Started
                </a>
              </div>
            </div>

            <div className="hero-visual" aria-label="MYOPS platform overview">
              <div className="visual-card main-panel">
                <div className="panel-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="panel-body">
                  <div className="mini-chart">
                    <span className="bar b1" />
                    <span className="bar b2" />
                    <span className="bar b3" />
                    <span className="bar b4" />
                  </div>
                  <div className="panel-metrics panel-labels">
                    <div>
                      <label>Operations</label>
                      <strong>Connected</strong>
                    </div>
                    <div>
                      <label>Workflow</label>
                      <strong>Clear</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-card floating-one">
                <span>OpsHub</span>
                <strong>Business clarity</strong>
              </div>
              <div className="floating-card floating-two">
                <span>OpsPS</span>
                <strong>Service speed</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">MYOPS Ecosystem</span>
              <h2>Explore MYOPS Solutions</h2>
            </div>

            <div className="product-grid">
              {products.map((product) => (
                <article className={`product-card ${product.accent}`} key={product.name}>
                  <div className="product-badge">{product.tag}</div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <a href="#contact" className="card-link">
                    {product.cta}
                  </a>
                </article>
              ))}
            </div>

            <div className="ecosystem-rail" aria-label="MYOPS ecosystem hierarchy">
              {ecosystemNodes.map((node, index) => (
                <div className="ecosystem-node" key={node}>
                  {index > 0 && <span className="ecosystem-arrow">↓</span>}
                  <span>{node}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="section alt-bg">
          <div className="container">
            <div className="section-heading narrow">
              <span className="eyebrow">Why MYOPS</span>
              <h2>Built around real business needs.</h2>
            </div>

            <div className="benefits-grid">
              {benefits.map((benefit) => (
                <div className="benefit-item" key={benefit.title}>
                  <span className="check">✓</span>
                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="section about-section">
          <div className="container about-grid">
            <div>
              <span className="eyebrow">About MYOPS</span>
              <h2>MYOPS is a technology ecosystem focused on creating practical digital solutions for modern businesses and professionals.</h2>
            </div>
            <div>
              <p>
                MYOPS is operated by Southern Dotcom Enterprise, a registered Malaysian business.
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="section cta-section">
          <div className="container cta-box">
            <div>
              <span className="eyebrow">Explore the ecosystem</span>
              <h2>Ready to explore MYOPS?</h2>
              <p>Discover the digital solutions designed to help you work smarter and move forward.</p>
            </div>
            <div className="hero-actions compact-actions">
              <a href="#products" className="btn btn-primary large-btn">
                Explore Solutions
              </a>
              <a href="mailto:support@myops.com.my" className="btn btn-secondary large-btn">
                Contact MYOPS
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <div className="brand footer-brand" aria-label="MYOPS footer brand">
              <span className="brand-mark">
                <LogoMark compact />
              </span>
              <span className="brand-wordmark">MYOPS</span>
            </div>
            <p>One Ecosystem. Multiple Solutions.</p>
          </div>

          <div className="footer-links">
            <div>
              <h3>Products</h3>
              <a href="#products">OpsHub</a>
              <a href="#products">OpsPS</a>
            </div>
            <div>
              <h3>Company</h3>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </div>
            <div>
              <h3>Legal</h3>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/cookies">Cookie Policy</a>
              <a href="/refund-cancellation">Refund &amp; Cancellation</a>
              <a href="/acceptable-use">Acceptable Use</a>
            </div>
          </div>

          <div className="footer-meta">
            <a href="mailto:support@myops.com.my">support@myops.com.my</a>
            <a href="tel:+60122719377">012-271 9377</a>
            <span>Southern Dotcom Enterprise</span>
            <span>Registration No. 202303050959 (003472425-X)</span>
            <span>MYOPS is a business technology ecosystem operated by Southern Dotcom Enterprise.</span>
            <span>© 2026 MYOPS. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const PageComponent = routes[pathname] || LandingPage;
  return <PageComponent />;
}
