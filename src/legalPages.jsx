import PropTypes from 'prop-types';
import { useEffect } from 'react';

const companyDetails = {
  brand: 'MYOPS',
  legalEntity: 'Southern Dotcom Enterprise',
  registration: '202303050959 (003472425-X)',
  phone: '012-271 9377',
  website: 'https://myops.com.my',
  supportEmail: 'support@myops.com.my',
};

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Refund & Cancellation', href: '/refund-cancellation' },
  { label: 'Acceptable Use', href: '/acceptable-use' },
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
        <linearGradient id="myopsBrandGradientLegal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC167A" />
          <stop offset="45%" stopColor="#F0187A" />
          <stop offset="78%" stopColor="#FF8A00" />
          <stop offset="100%" stopColor="#8B3DFF" />
        </linearGradient>
      </defs>
      <path d="M25 92L60 22L95 92H82L60 52L38 92H25Z" fill="url(#myopsBrandGradientLegal)" opacity="0.96" />
      <path d="M18 96L60 15L102 96H86L60 46L34 96H18Z" fill="none" stroke="#071B49" strokeWidth="6" strokeLinejoin="round" opacity="0.9" />
      <path d="M31 84V35H45L60 58L75 35H89V84H75V54L60 79L45 54V84H31Z" fill="#071B49" />
    </svg>
  );
}

LogoMark.propTypes = {
  compact: PropTypes.bool,
};

function LegalPageLayout({ title, intro, children }) {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = 'MYOPS — One Ecosystem. Multiple Solutions.';
    };
  }, [title]);

  return (
    <div className="legal-shell">
      <header className="legal-topbar">
        <div className="container legal-topbar-inner">
          <a href="/" className="brand" aria-label="MYOPS home">
            <span className="brand-mark">
              <LogoMark compact />
            </span>
            <span className="brand-wordmark">MYOPS</span>
          </a>
          <nav className="legal-nav" aria-label="Legal navigation">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="legal-main">
        <div className="container legal-container">
          <article className="legal-card legal-intro">
            <span className="eyebrow legal-eyebrow">MYOPS</span>
            <h1>{title}</h1>
            <p>{intro}</p>
          </article>

          {children}
        </div>
      </main>

      <footer className="footer legal-footer-wrap">
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
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/cookies">Cookie Policy</a>
            <a href="/refund-cancellation">Refund &amp; Cancellation</a>
            <a href="/acceptable-use">Acceptable Use</a>
          </div>

          <div className="footer-meta">
            <a href="mailto:support@myops.com.my">support@myops.com.my</a>
            <a href="tel:+60122719377">012-271 9377</a>
            <span>© 2026 MYOPS. All rights reserved.</span>
          </div>
        </div>

        <div className="container legal-footer">
          <div className="legal-block">
            <p>{companyDetails.legalEntity}</p>
            <p>Registration No.: {companyDetails.registration}</p>
          </div>
          <div className="legal-block">
            <a href={companyDetails.website}>Official website</a>
            <a href={`tel:${companyDetails.phone.replace(/\s+/g, '')}`}>Phone: {companyDetails.phone}</a>
            <a href={`mailto:${companyDetails.supportEmail}`}>Support email</a>
          </div>
          <div className="legal-block legal-links">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

LegalPageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  intro: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function Section({ title, children }) {
  return (
    <section className="legal-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function ParagraphList({ items }) {
  return (
    <ul className="legal-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

ParagraphList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="MYOPS Privacy Policy"
      intro="This Privacy Policy explains how MYOPS and Southern Dotcom Enterprise handle personal data in connection with the MYOPS website and the OpsHub and OpsPS ecosystem. We have prepared this notice in a practical and understandable way and it should be read together with our Terms of Service and other operating policies where applicable."
    >
      <Section title="1. Introduction">
        <p>
          MYOPS is the master ecosystem for operational execution and personal shopper management. This notice sets out how we collect, use,
          protect, and manage personal data in connection with the MYOPS website, support communications, and related business services.
        </p>
        <p>
          This policy is intended to be a practical website notice for users, customers, and visitors. It is not intended to provide legal advice, and
          it should be read alongside the specific product terms and any separate contractual terms that may apply to a service or subscription.
        </p>
      </Section>

      <Section title="2. Who We Are">
        <p>
          MYOPS is the public-facing brand of the ecosystem operated by Southern Dotcom Enterprise. Our contact details are:
        </p>
        <ul className="legal-list">
          <li>Website: https://myops.com.my</li>
          <li>Email: support@myops.com.my</li>
          <li>Phone: 012-271 9377</li>
        </ul>
      </Section>

      <Section title="3. Personal Data We May Collect">
        <ParagraphList
          items={[
            'Account and registration information, where you create or use an account or request information from us.',
            'Contact information, such as name, phone number, email address, and business details where provided.',
            'Transaction, order, or service request information where relevant to our products or support interactions.',
            'Payment-related information, where required for a specific transaction or service arrangement, subject to the payment provider or applicable commercial terms.',
            'Device, browser, technical, and network information that may be automatically collected through standard website traffic and security logs.',
            'Usage information about how visitors use our website or services, such as pages visited or interaction patterns, where this is technically necessary or monitored for operational purposes.',
          ]}
        />
      </Section>

      <Section title="4. How We Collect Personal Data">
        <ParagraphList
          items={[
            'Directly from you when you contact us, register, submit a request, or enquire about MYOPS services.',
            'From your interactions with our website, including support requests, form submissions, and general website usage.',
            'From service providers, business partners, or payment providers where necessary to provide or administer a service.',
            'From technical systems such as hosting, security monitoring, and website logs for operational and security reasons.',
          ]}
        />
      </Section>

      <Section title="5. Purposes of Processing">
        <ParagraphList
          items={[
            'To provide and operate MYOPS website, products, and services, including OpsHub and OpsPS where applicable.',
            'To respond to enquiries, customer support requests, and service-related communications.',
            'To maintain account and service administration, including support records and user communications.',
            'To maintain security, prevent fraud or misuse, and protect the integrity of our systems and services.',
            'To improve and maintain the reliability, usability, and quality of the website and products.',
            'To satisfy legal, regulatory, or contractual obligations, including where required by applicable law or authorities.',
          ]}
        />
      </Section>

      <Section title="6. Disclosure to Service Providers">
        <p>
          We may share personal data with trusted service providers where needed to host, operate, maintain, support, or secure our website and services.
          This may include cloud hosting, technical services, communication support, and payment processing where relevant.
        </p>
        <p>
          We do not sell personal data. We take reasonable steps to ensure that third parties process data only as needed to support the services we provide.
        </p>
      </Section>

      <Section title="7. Data Retention">
        <p>
          We retain personal data only for as long as necessary to fulfil the purposes described in this policy, comply with legal obligations, resolve disputes,
          and maintain business records where appropriate. Retention periods may vary depending on the type of data and the applicable legal or contractual requirements.
        </p>
      </Section>

      <Section title="8. Data Security">
        <p>
          We use reasonable administrative, technical, and organisational measures to protect personal data against unauthorised access, loss, misuse, or alteration.
          However, no internet or electronic storage system is completely secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="9. Your Rights and Choices">
        <ParagraphList
          items={[
            'You may request access to personal data we hold about you, where applicable and lawful.',
            'You may request correction of inaccurate or incomplete personal data.',
            'Where consent is required for a specific processing activity, you may withdraw that consent in accordance with applicable law and the nature of the processing.',
            'You may contact us to ask about the purposes of processing or the categories of data involved.',
          ]}
        />
        <p>
          Where lawful and practical, we will respond to reasonable requests in a timely manner. Please note that some legal or operational obligations may limit the extent to which we can action a request.
        </p>
      </Section>

      <Section title="10. Children and Minors">
        <p>
          MYOPS services are not intended for children or minors without appropriate parental or guardian oversight, and we do not knowingly collect personal data from children in circumstances that would require parental consent without appropriate safeguards.
        </p>
      </Section>

      <Section title="11. International Transfers">
        <p>
          Personal data may be processed or stored in countries outside Malaysia where service providers or hosting infrastructure are located. Where this occurs, we will use reasonable measures to ensure that the transfer is lawful and appropriately protected under applicable requirements.
        </p>
      </Section>

      <Section title="12. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time as our services, operations, or legal obligations change. Any material changes will be reflected on this page with a revised effective date where appropriate.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          If you have questions, requests, or concerns about this Privacy Policy or personal data handling, please contact us at support@myops.com.my or call 012-271 9377.
        </p>
      </Section>
    </LegalPageLayout>
  );
}

export function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="MYOPS Terms of Service"
      intro="These Terms of Service govern use of the MYOPS website and the related ecosystem services. Please read them carefully before using the site or any services offered under the MYOPS brand."
    >
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using the MYOPS website, you agree to be bound by these Terms of Service and any additional product-specific terms that may apply to OpsHub, OpsPS or any other service made available under the MYOPS ecosystem.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be legally able to enter into these terms and, where applicable, ensure that you have authority to act on behalf of any business or organisation using the services.
        </p>
      </Section>

      <Section title="3. Account Registration and Security">
        <ParagraphList
          items={[
            'You are responsible for accurate account information and maintaining the confidentiality of your log-in details where an account is used.',
            'You must notify us promptly if you suspect unauthorised access or misuse of an account.',
            'We may suspend or restrict access where there is a security concern or suspected misuse.',
          ]}
        />
      </Section>

      <Section title="4. Use of the Website and Services">
        <p>
          You may use the MYOPS website and services only for lawful purposes and in accordance with these terms. We may change, suspend, or discontinue any feature or service at any time as part of normal operations or business decisions.
        </p>
      </Section>

      <Section title="5. Product-Specific Content">
        <p>
          OpsHub is an Operations Marketplace and OpsPS is a Personal Shopper Management Platform. Additional product-specific terms or operational rules may apply to specific product features, services, or commercial arrangements.
        </p>
      </Section>

      <Section title="6. User Responsibilities">
        <ParagraphList
          items={[
            'Use the website and services lawfully and in good faith.',
            'Do not misuse, interfere with, or attempt to compromise the integrity or availability of our systems.',
            'Do not upload, publish, or transmit material that is unlawful, harmful, misleading, abusive, or infringes the rights of others.',
            'Do not attempt to impersonate another person or business without authority.',
          ]}
        />
      </Section>

      <Section title="7. Prohibited Activities">
        <ParagraphList
          items={[
            'Unlawful activity or fraud.',
            'Unauthorised access to accounts, systems, or data.',
            'Malware, spam, scraping, or abuse of service availability.',
            'Misleading or deceptive conduct in marketplace or service interactions.',
            'Use that infringes intellectual property or privacy rights of others.',
          ]}
        />
      </Section>

      <Section title="8. Intellectual Property">
        <p>
          Unless expressly stated otherwise, all website content, branding, text, design, and software associated with MYOPS remain the property of MYOPS or its licensors. You may not reproduce, distribute, or exploit our content without prior written permission.
        </p>
      </Section>

      <Section title="9. Third-Party Services and Links">
        <p>
          Our website may include links to third-party websites or services. We do not control those services and are not responsible for their content, privacy practices, or availability. You are responsible for reviewing those third-party terms and conditions where applicable.
        </p>
      </Section>

      <Section title="10. Service Availability and Changes">
        <p>
          MYOPS may update, enhance, suspend, or discontinue features or services from time to time. We do not guarantee uninterrupted availability, and service changes may occur without prior notice where necessary for maintenance, security, or business continuity.
        </p>
      </Section>

      <Section title="11. Payments and Subscriptions">
        <p>
          Where a service, subscription, or commercial arrangement involves payment, the specific commercial terms, eligibility rules, and billing conditions may apply. We do not make unsupported promises about pricing, automatic renewals, or guaranteed service levels unless expressly confirmed in writing.
        </p>
      </Section>

      <Section title="12. Suspension and Termination">
        <p>
          MYOPS may restrict, suspend, or terminate access to the website or a service if we reasonably believe there has been a breach of these terms, misuse of the service, a security concern, or other material issue requiring action.
        </p>
      </Section>

      <Section title="13. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, MYOPS shall not be liable for indirect, incidental, consequential, or special damages arising from the use of the website or services, including loss of data, business interruption, or loss of opportunity, except where liability cannot be excluded by law.
        </p>
      </Section>

      <Section title="14. Indemnity">
        <p>
          Where appropriate and to the extent permitted by applicable law, you agree to indemnify and hold harmless MYOPS and Southern Dotcom Enterprise from claims arising from your misuse of the website or services, unauthorised actions, or breach of these terms.
        </p>
      </Section>

      <Section title="15. Governing Law">
        <p>
          These terms are governed by the laws of Malaysia, without regard to conflict of law rules. Any dispute relating to these terms will be subject to the jurisdiction of the courts of Malaysia, unless otherwise required by applicable law.
        </p>
      </Section>

      <Section title="16. Changes to Terms">
        <p>
          These Terms of Service may be updated from time to time. Continued use of the website or services after changes are published indicates acceptance of the updated terms.
        </p>
      </Section>

      <Section title="17. Contact">
        <p>
          If you have questions about these Terms of Service, please contact MYOPS at support@myops.com.my or call 012-271 9377.
        </p>
      </Section>
    </LegalPageLayout>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="MYOPS Cookie Policy"
      intro="This Cookie Policy explains how the MYOPS website may use cookies and similar technologies. It is intended to be clear, practical, and aligned with the website as it is currently implemented."
    >
      <Section title="1. What Are Cookies?">
        <p>
          Cookies are small text files placed on a device when a website is visited. They help a website remember information about a user and can support a smoother browsing experience, session management, and basic website functionality.
        </p>
      </Section>

      <Section title="2. Cookies Used on This Website">
        <p>
          Based on the current implementation of this website, no advertising, analytics, or third-party tracking platform has been identified in the active codebase. The site currently appears to rely on standard browser behaviour and basic website functionality rather than active marketing or analytics cookies. 
        </p>
        <p>
          We may still use necessary cookies to support site operation, security, and technical stability where required. Additional cookies or tracking technologies may be introduced only if clearly disclosed and implemented in a compliant manner.
        </p>
      </Section>

      <Section title="3. Essential Cookies">
        <p>
          Essential cookies may be used to maintain security, support site functions, or allow a user to navigate the website effectively. These are typically necessary for the website to function as intended and may be used without prior consent where required for technical or security reasons.
        </p>
      </Section>

      <Section title="4. Functional, Preference, and Analytics Cookies">
        <p>
          Functional and preference cookies help remember choices such as UI preferences or local site settings. Analytics cookies are used to understand website usage patterns. At present, the active website implementation does not indicate the use of advertising pixels, external analytics services, or other tracking scripts that would require specific disclosure.
        </p>
      </Section>

      <Section title="5. Third-Party Cookies">
        <p>
          Because the current website does not appear to rely on additional third-party advertising, analytics, or marketing tools, there are no such third-party cookies identified in the current codebase that we can expressly confirm. If third-party tools are introduced later, we will update this policy and disclose the relevant technology and purpose.
        </p>
      </Section>

      <Section title="6. How to Manage Cookies">
        <p>
          Users can usually manage cookies through their browser settings, including the ability to accept, reject, delete, or block cookies. Please note that disabling certain cookies may affect the functionality and usability of the website.
        </p>
      </Section>

      <Section title="7. Changes to This Cookie Policy">
        <p>
          We may update this Cookie Policy if our use of cookies or related technologies changes. We will revise the content on this page to reflect any significant changes.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          If you have questions about cookies or this website, please contact support@myops.com.my or call 012-271 9377.
        </p>
      </Section>
    </LegalPageLayout>
  );
}

export function RefundCancellationPage() {
  return (
    <LegalPageLayout
      title="MYOPS Refund & Cancellation Policy"
      intro="This Refund & Cancellation Policy explains the general approach to cancellations and refund requests for MYOPS services, products or subscriptions. Refund eligibility may depend on the applicable product, subscription terms, transaction status and circumstances."
    >
      <Section title="1. General Principles">
        <p>
          MYOPS may offer products, subscriptions, or services on different terms depending on the specific commercial arrangement. Refund eligibility may depend on the applicable product, subscription terms, transaction status, and the specific circumstances of the request.
        </p>
      </Section>

      <Section title="2. Cancellation of Services or Subscriptions">
        <p>
          If you wish to cancel a service or subscription, please contact us through the support channels set out below. We will review the request in line with the applicable product or service terms, subscription arrangements, and transaction status.
        </p>
      </Section>

      <Section title="3. Refund Requests">
        <ParagraphList
          items={[
            'Refund requests are reviewed on a case-by-case basis.',
            'Refund eligibility may depend on the applicable product, subscription terms, transaction status, and circumstances.',
            'Duplicate payments, charge disputes, or unauthorised transaction disputes may require additional verification before a refund can be processed.',
            'Where a refund is approved, the payment timeline may depend on the payment provider and bank or payment network processing times.',
          ]}
        />
      </Section>

      <Section title="4. Failed or Unauthorised Transactions">
        <p>
          If a payment fails, is declined, or is later disputed as unauthorised, we may request supporting information or additional verification before taking any action. We may also coordinate with relevant payment providers or service partners where necessary.
        </p>
      </Section>

      <Section title="5. Situations Where Refunds May Not Apply">
        <p>
          Refunds may not apply where a service has already been provided, where a subscription has been used in line with the agreed terms, or where the relevant product or service terms provide otherwise. Product-specific terms may also apply.
        </p>
      </Section>

      <Section title="6. Product-Specific Terms">
        <p>
          Certain MYOPS services or commercial arrangements may have specific cancellation, refund, or service-use terms. In those cases, the product-specific terms apply in addition to this general policy.
        </p>
      </Section>

      <Section title="7. Contact and Support">
        <p>
          To request a cancellation or discuss a refund matter, please contact MYOPS at support@myops.com.my or call 012-271 9377.
        </p>
      </Section>
    </LegalPageLayout>
  );
}

export function AcceptableUsePage() {
  return (
    <LegalPageLayout
      title="MYOPS Acceptable Use Policy"
      intro="This Acceptable Use Policy sets out the standards expected when using the MYOPS website, OpsHub, OpsPS, or any related product or service. MYOPS may take appropriate action against misuse, including limiting access, suspending services, or terminating an account where necessary."
    >
      <Section title="1. General Rule">
        <p>
          You must use MYOPS services in a lawful, fair, and responsible manner. This includes respecting the rights of other users, the MYOPS platform, and any third-party services that may be accessed through or connected to the website.
        </p>
      </Section>

      <Section title="2. Prohibited Conduct">
        <ParagraphList
          items={[
            'Unlawful activity, fraud, or misleading conduct.',
            'Impersonation or attempts to deceive other users or MYOPS staff.',
            'Harassment, abuse, or threatening behaviour toward others.',
            'Unauthorised access to accounts, systems, data, or resources.',
            'Attempting to compromise security, bypass protections, or interfere with the availability or integrity of services.',
            'Malware, spam, bulk unsolicited communication, or similar abusive behaviour.',
            'Misuse of marketplace functionality, including misleading listings, false representations, or deceptive practices.',
            'Activities that infringe intellectual property, privacy, or other legal rights of third parties.',
            'Abuse of payment systems or transactions, including fraudulent or unauthorised transactions.',
          ]}
        />
      </Section>

      <Section title="3. Service Integrity">
        <p>
          You must not interfere with or disrupt the normal operation of the MYOPS website, services, infrastructure, or communications. This includes activities that may degrade performance, create unnecessary load, or compromise the reliability of our services.
        </p>
      </Section>

      <Section title="4. Enforcement">
        <p>
          MYOPS may investigate suspected violations of this policy and take appropriate action, including warning, restricting access, suspending functions, or terminating service access where the conduct is serious or ongoing.
        </p>
      </Section>

      <Section title="5. Reporting Concerns">
        <p>
          If you believe a user or activity violates this policy, please contact us at support@myops.com.my with the relevant details so we can review and take appropriate action where necessary.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
