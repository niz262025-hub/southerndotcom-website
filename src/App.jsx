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
    name: 'OpsPS',
    tag: 'Personal Shopper Operations',
    icon: 'PS',
    description: 'Manage trips, products, orders and customers easily.',
    cta: 'Explore OpsPS',
    accent: 'pink',
    art: 'opsps',
    href: '#contact',
  },
  {
    name: 'OpsHub',
    tag: 'Business Marketplace & Operations',
    icon: 'HB',
    description: 'Sell, manage and grow your business online.',
    cta: 'Explore OpsHub',
    accent: 'orange',
    art: 'opshub',
    href: 'https://opshub.myops.com.my/',
  },
  {
    name: 'OpsFinance',
    tag: 'Accounting & Financial Management',
    icon: 'FX',
    description: 'Keep your business finances organised and clear.',
    cta: 'Explore OpsFinance',
    accent: 'purple',
    art: 'opsfinance',
    href: '#contact',
  },
  {
    name: 'OpsFlow',
    tag: 'Workflow & Business Automation',
    icon: 'FL',
    description: 'Streamline your operations and work smarter.',
    cta: 'Explore OpsFlow',
    accent: 'blue',
    art: 'opsflow',
    href: '#contact',
  },
];

const routes = {
  '/privacy': PrivacyPolicyPage,
  '/terms': TermsOfServicePage,
  '/cookies': CookiePolicyPage,
  '/refund-cancellation': RefundCancellationPage,
  '/acceptable-use': AcceptableUsePage,
};

const siteBaseUrl = 'https://www.myops.com.my';

const pageMeta = {
  '/': {
    title: 'MYOPS | Business Operations Software Malaysia',
    description:
      'MYOPS brings together business operations software, workflow coordination, and service management tools for modern businesses in Malaysia.',
    ogTitle: 'MYOPS | Business Operations Software Malaysia',
    ogDescription:
      'Connected business operations software, service coordination, and management tools for growing businesses in Malaysia.',
  },
  '/privacy': {
    title: 'MYOPS Privacy Policy | Business Operations Software Malaysia',
    description: 'Read the MYOPS privacy policy covering website use, data handling, and operational services for our business software ecosystem.',
    ogTitle: 'MYOPS Privacy Policy',
    ogDescription: 'Website privacy policy for MYOPS and the business operations solutions ecosystem.',
  },
  '/terms': {
    title: 'MYOPS Terms of Service | Business Operations Software Malaysia',
    description: 'Review the MYOPS terms of service for our business operations, marketplace, and service management solutions.',
    ogTitle: 'MYOPS Terms of Service',
    ogDescription: 'MYOPS service terms for business operations software and operational platforms.',
  },
  '/cookies': {
    title: 'MYOPS Cookie Policy | Business Operations Software Malaysia',
    description: 'Learn how MYOPS uses cookies and website data to support service delivery and business operations tools.',
    ogTitle: 'MYOPS Cookie Policy',
    ogDescription: 'Cookie policy for the MYOPS website and operational service ecosystem.',
  },
  '/refund-cancellation': {
    title: 'MYOPS Refund & Cancellation Policy | Business Operations Software Malaysia',
    description: 'Review the MYOPS refund and cancellation policy for service requests and business operations support.',
    ogTitle: 'MYOPS Refund & Cancellation Policy',
    ogDescription: 'MYOPS refund and cancellation policy for operational services and support arrangements.',
  },
  '/acceptable-use': {
    title: 'MYOPS Acceptable Use Policy | Business Operations Software Malaysia',
    description: 'Read the MYOPS acceptable use policy covering responsible use of our operations management and service portal.',
    ogTitle: 'MYOPS Acceptable Use Policy',
    ogDescription: 'MYOPS acceptable use policy for operational platforms and business service tools.',
  },
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
    <div className="page-shell reference-page">
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
        </div>
      </header>

      <main className="reference-main">
        <section className="hero">
          <div className="container hero-layout">
            <div className="hero-copy">
              <div className="hero-wordmark" aria-label="MYOPS logo wordmark">
                <span className="brand-mark hero-brand-mark">
                  <LogoMark compact />
                </span>
                <span>MYOPS</span>
              </div>
              <h1>
                Digital Solutions
                <br />
                for the Way
                <br />
                You Work
              </h1>
              <p>
                Practical business technology to help you manage, sell, operate and grow — all in one ecosystem.
              </p>
              <a href="#products" className="btn btn-primary hero-cta">
                Explore Solutions <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="hero-visual" aria-label="MYOPS platform overview">
              <div className="dashboard-panel">
                <div className="panel-head">
                  <span className="myops-panel-wordmark">MYOPS</span>
                </div>
                <div className="panel-body">
                  <div className="panel-metrics">
                    <div className="metric-box">
                      <span>Dashboard</span>
                      <strong>1,298</strong>
                    </div>
                    <div className="metric-box">
                      <span>Products</span>
                      <strong>+12%</strong>
                    </div>
                  </div>
                  <div className="chart-box">
                    <div className="chart curve-a" />
                    <div className="chart curve-b" />
                  </div>
                  <div className="recent-orders">
                    <div className="order-header"><span>Recent Orders</span></div>
                    <div className="order-row"><span>#OD2401</span><span>Customer</span><span className="status success">Ready Stock</span></div>
                    <div className="order-row"><span>#OD2402</span><span>Customer</span><span className="status info">Pre-Order</span></div>
                    <div className="order-row"><span>#OD2403</span><span>Customer</span><span className="status warning">Processing</span></div>
                  </div>
                </div>
              </div>
              <img
                className="hero-character"
                src="/images/myops-master-characters-transparent.png"
                alt="MYOPS master characters"
              />
            </div>
          </div>
        </section>

        <section id="products" className="product-section">
          <div className="container">
            <div className="product-grid">
              {products.map((product) => (
                <article className={`product-card ${product.accent}`} key={product.name}>
                  <div className="product-art">
                    <div className={`mini-scene ${product.art}`}>
                      <div className="mini-window" />
                      <div className="mini-detail" />
                      <span className="scene-icon">{product.icon}</span>
                    </div>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="product-tagline">{product.tag}</p>
                  <p>{product.description}</p>
                  <a href={product.href} className="card-link" aria-label={product.cta}>
                    <span className="card-link-text">{product.cta}</span>
                    <span className="card-link-arrow" aria-hidden="true">→</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function updateSeoMeta(pathname) {
  const routeMeta = pageMeta[pathname] || pageMeta['/'];
  const pageUrl = `${siteBaseUrl}${pathname === '/' ? '/' : pathname}`;

  document.title = routeMeta.title;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', routeMeta.description);
  }

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', pageUrl);
  }

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute('content', pageUrl);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', routeMeta.ogTitle);
  }

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', routeMeta.ogDescription);
  }
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

  useEffect(() => {
    updateSeoMeta(pathname);
  }, [pathname]);

  const PageComponent = routes[pathname] || LandingPage;
  return <PageComponent />;
}
