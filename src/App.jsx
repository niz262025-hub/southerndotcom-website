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
    tag: ['Personal Shopper', 'Operations'],
    icon: 'PS',
    description: ['Manage trips, products,', 'orders and customers easily.'],
    cta: 'Explore OpsPS',
    accent: 'pink',
    art: 'opsps',
    href: '#contact',
  },
  {
    name: 'OpsHub',
    tag: ['Business Marketplace', '& Operations'],
    icon: 'HB',
    description: ['Sell, manage and grow', 'your business online.'],
    cta: 'Explore OpsHub',
    accent: 'orange',
    art: 'opshub',
    href: 'https://opshub.myops.com.my/',
  },
  {
    name: 'OpsFinance',
    tag: ['Accounting &', 'Financial Management'],
    icon: 'FX',
    description: ['Keep your business finances', 'organised and clear.'],
    cta: 'Explore OpsFinance',
    accent: 'purple',
    art: 'opsfinance',
    href: '#contact',
  },
  {
    name: 'OpsFlow',
    tag: ['Workflow &', 'Business Automation'],
    icon: 'FL',
    description: ['Streamline your operations', 'and work smarter.'],
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

function LandingPage() {
  return (
    <div className="page-shell reference-page">
      <main className="reference-main">
        <section className="hero">
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#products">Products</a>
            <a href="#benefits">Why MYOPS</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="hero-assembly">
            <div className="hero-content-layer">
              <a href="/" className="hero-logo" aria-label="MYOPS home">
                <img src="/images/myops-logo-wordmark.png" alt="MYOPS" width="397" height="102" />
              </a>
              <h1>
                Digital Solutions
                <br />
                for the Way
                <br />
                You Work
              </h1>
              <p>
                Practical business technology
                <br className="desktop-break" /> to help you manage, sell,
                <br className="desktop-break" /> operate and grow — all in one
                <br className="desktop-break" /> ecosystem.
              </p>
              <div className="hero-actions">
                <a href="#products" className="btn btn-primary hero-cta">
                  Explore Solutions <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            <div className="hero-scene">
              <img
                src="/images/myops-hero-bg.webp"
                alt="Two MYOPS characters looking at a laptop in front of the MYOPS orders dashboard"
                width="1536"
                height="617"
              />
            </div>
          </div>
        </section>

        <section id="products" className="product-section" aria-label="MYOPS products">
          <div className="product-grid">
            {products.map((product) => (
              <article className={`product-card ${product.accent}`} key={product.name}>
                <div className="product-art">
                  <img
                    src={`/images/${product.art}-card-art.png`}
                    alt={`${product.name} illustration`}
                    width="380"
                    height="248"
                  />
                </div>
                <img
                  className="product-badge"
                  src={`/images/${product.art}-card-badge.png`}
                  alt=""
                  width="88"
                  height="88"
                />
                <h3>{product.name}</h3>
                <p className="product-tagline">
                  {product.tag.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
                <p className="product-desc">
                  {product.description.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
                <a href={product.href} className="card-link" aria-label={product.cta}>
                  <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
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
