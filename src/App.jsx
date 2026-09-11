const products = [
  {
    name: 'OpsHub',
    tag: 'Business Operations Platform',
    description:
      'Centralize workflows, teams, processes, and key performance insights in one modern operations command center.',
    cta: 'Explore OpsHub',
    accent: 'blue',
  },
  {
    name: 'OpsPS',
    tag: 'Personal Shopper Management',
    description:
      'Coordinate shoppers, demand, fulfillment, and service quality with a platform built for speed and visibility.',
    cta: 'Explore OpsPS',
    accent: 'purple',
  },
];

const ecosystemNodes = ['MYOPS', 'OpsHub', 'OpsPS', 'Future Apps'];

const benefits = [
  'Unified operations for every team and workflow',
  'Faster decisions with real-time visibility',
  'Automation that reduces friction and manual work',
  'Scalable systems designed for business growth',
  'Clearer accountability across teams',
  'Better customer experience and service quality',
];

const stats = [
  { value: '360°', label: 'Operational visibility' },
  { value: '24/7', label: 'Business continuity focus' },
  { value: '1 platform', label: 'For smarter execution' },
];

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

export default function App() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="container nav">
          <div className="brand" aria-label="MYOPS home">
            <span className="brand-mark">
              <LogoMark compact />
            </span>
            <span className="brand-wordmark">MYOPS</span>
          </div>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#products">Products</a>
            <a href="#benefits">Why MYOPS</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <a href="#contact" className="btn btn-primary nav-cta">
            Talk to us
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">ONE ECOSYSTEM. MULTIPLE SOLUTIONS.</span>
              <h1>Turn complexity into clear, scalable business performance.</h1>
              <p>
                MYOPS is a connected business technology ecosystem that brings together operations, service
                management, and future-ready digital solutions for businesses, operators, and growing teams.
              </p>
              <div className="hero-actions">
                <a href="#products" className="btn btn-primary">
                  Explore solutions
                </a>
                <a href="#about" className="btn btn-secondary">
                  Learn more
                </a>
              </div>
              <div className="hero-stats" aria-label="MYOPS key metrics">
                {stats.map((stat) => (
                  <div className="stat" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
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
                  <div className="panel-metrics">
                    <div>
                      <label>Efficiency</label>
                      <strong>92%</strong>
                    </div>
                    <div>
                      <label>Growth</label>
                      <strong>+41%</strong>
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
              <h2>Purpose-built solutions for operational excellence.</h2>
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
              <h2>Built to help teams operate smarter, faster, and more confidently.</h2>
            </div>

            <div className="benefits-grid">
              {benefits.map((benefit) => (
                <div className="benefit-item" key={benefit}>
                  <span className="check">✓</span>
                  <p>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="section about-section">
          <div className="container about-grid">
            <div>
              <span className="eyebrow">About MYOPS</span>
              <h2>We connect business operations with measurable performance.</h2>
            </div>
            <div>
              <p>
                MYOPS brings together operational strategy, platform thinking, and execution support to help
                businesses unlock clarity at every stage of growth. From operational planning to daily delivery,
                our solutions help teams work with less friction and more confidence.
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="section cta-section">
          <div className="container cta-box">
            <div>
              <span className="eyebrow">Let’s build smarter operations</span>
              <h2>Ready to modernize the way your business runs?</h2>
            </div>
            <a href="mailto:hello@myops.com.my" className="btn btn-primary large-btn">
              hello@myops.com.my
            </a>
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
            <p>MYOPS is a business technology ecosystem operated by Southern Dotcom Enterprise.</p>
          </div>

          <div className="footer-links">
            <a href="#products">Products</a>
            <a href="#benefits">Why MYOPS</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-meta">
            <a href="mailto:support@myops.com.my">support@myops.com.my</a>
            <span>© 2026 MYOPS</span>
          </div>
        </div>

        <div className="container legal-footer">
          <div className="legal-block">
            <p>Southern Dotcom Enterprise</p>
            <p>Registration No.: 202303050959 (003472425-X)</p>
            <p>Malaysia</p>
          </div>
          <div className="legal-block">
            <a href="https://myops.com.my">Official website</a>
            <a href="tel:+60122719377">Phone: 012-271 9377</a>
            <a href="mailto:support@myops.com.my">Support email</a>
          </div>
          <div className="legal-block legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
            <a href="#">Refund &amp; Cancellation Policy</a>
            <a href="#">Acceptable Use Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
