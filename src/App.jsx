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

export default function App() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="container nav">
          <div className="brand" aria-label="MYOPS home">
            <span className="brand-mark">M</span>
            <span>MYOPS</span>
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
              <span className="eyebrow">Built for modern operations</span>
              <h1>Turn complexity into clear, scalable business performance.</h1>
              <p>
                MYOPS helps organizations streamline operations, improve visibility, and move faster with
                purpose-built platforms for business management and personal shopper operations.
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
              <span className="eyebrow">Our platforms</span>
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
              <span className="brand-mark">M</span>
              <span>MYOPS</span>
            </div>
            <p>Smarter operations for growth, visibility, and execution.</p>
          </div>

          <div className="footer-links">
            <a href="#products">Products</a>
            <a href="#benefits">Why MYOPS</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-meta">
            <a href="mailto:hello@myops.com.my">hello@myops.com.my</a>
            <span>© 2026 MYOPS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
