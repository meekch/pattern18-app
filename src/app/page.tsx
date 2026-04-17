'use client';

import Link from 'next/link';
import { STRIPE_MONTHLY_URL, STRIPE_ANNUAL_URL, SKOOL_URL } from '@/lib/stripe-links';

export default function HomePage() {
  return (
    <div className="page">
      <div className="teal-accent" />

      {/* ============ NAV ============ */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-badge">18</span>
            <span className="brand-name">Pattern18</span>
          </Link>
          <div className="nav-links">
            <Link href="/faq" className="nav-link">FAQ</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/login" className="nav-link">Sign in</Link>
            <a href={STRIPE_MONTHLY_URL} className="nav-cta">Start Free Trial</a>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="hero">
        <p className="eyebrow">F O R &nbsp;&nbsp;P A R E N T S &nbsp;&nbsp;S U R V I V I N G &nbsp;&nbsp;H I G H - C O N F L I C T &nbsp;&nbsp;C U S T O D Y</p>
        <h1 className="hero-h1">
          When their text<br />makes your stomach drop.
        </h1>
        <p className="hero-sub">Your 24/7 AI coach is here.</p>
        <a href={STRIPE_MONTHLY_URL} className="btn-primary hero-cta">Start 7-Day Free Trial</a>
        <Link href="/login" className="hero-secondary">Already a member? Sign in →</Link>
        <p className="hero-anchor">$97/month. Less than 20 minutes with a family lawyer. Cancel anytime.</p>
        <p className="hero-trust">No credit card charged during trial.</p>
      </section>

      {/* ============ SOCIAL PROOF STRIP ============ */}
      <section className="strip">
        <div className="strip-inner">
          <span>Over 75% of mothers who report abuse lose custody when their abuser fights for it.</span>
          <span className="dot">·</span>
          <span>Patterns win cases. Documentation wins patterns.</span>
          <span className="dot">·</span>
          <span>16 years in family court. The tool I wish I'd had from day one.</span>
        </div>
        <div className="strip-divider" />
      </section>

      {/* ============ WHO THIS IS FOR ============ */}
      <section className="section">
        <h2 className="section-h2 center">Is this you?</h2>
        <div className="cards-3">
          <div className="who-card">
            <h3 className="who-head">The parent who screenshots everything.</h3>
            <p className="who-body">You have 800 screenshots. You can't find the one you need when you need it. Your lawyer asked for a timeline. You have no idea where to start.</p>
          </div>
          <div className="who-card">
            <h3 className="who-head">The parent whose stomach drops at every notification.</h3>
            <p className="who-body">You know which messages are going to be bad before you even open them. You want to know if you're overreacting. You're not.</p>
          </div>
          <div className="who-card">
            <h3 className="who-head">The parent walking into court.</h3>
            <p className="who-body">You know the patterns are there. You just can't prove them. One Compass-style analysis becomes 40 Compass-style analyses becomes a case.</p>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="section tint">
        <h2 className="section-h2 center">How Pattern18 works.</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3 className="step-head">Paste any message.</h3>
            <p className="step-body">Pattern18 reads the subtext. DARVO. Gaslighting. Guilt trips. Moving goalposts. It names exactly what's happening underneath the words.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3 className="step-head">Save it to your case.</h3>
            <p className="step-body">Every analysis timestamps itself to your case file. Your timeline builds automatically while you live your life.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3 className="step-head">Export for your lawyer.</h3>
            <p className="step-body">When you need to prove the pattern, Pattern18 gives you court-ready documentation your attorney can actually use.</p>
          </div>
        </div>
      </section>

      {/* ============ PRODUCT DEMO ============ */}
      <section className="section">
        <div className="demo-box">
          <span className="demo-caption">[Product screenshot: real message analyzed with patterns detected]</span>
        </div>
        <p className="demo-sub">A real message. Analyzed in 8 seconds. Saved forever.</p>
      </section>

      {/* ============ FOUNDER STORY ============ */}
      <section className="section">
        <h2 className="section-h2 center">Why Pattern18 exists.</h2>
        <div className="founder">
          <p>16 years ago I had a baby with someone I didn't fully see yet.</p>
          <p>By the time I saw it, I was already tied to him by court-ordered custody until our son turns 18.</p>
          <p>I spent years confused. Years documenting in the wrong ways. Years losing time and money because I didn't have language for what was happening.</p>
          <p>My son turns 18 in 2 years. I'll finally be free of court.</p>
          <p>Before I go, I'm building the tool I needed from day one.</p>
          <p>Pattern18 is for every parent who came after me. Every mom, dad, grandparent staring at a message asking, "is this as bad as I think it is?"</p>
          <p>I built it so you don't have to wait 16 years to know.</p>
          <p className="founder-sign">— Rae</p>
        </div>
      </section>

      {/* ============ PRICING / HORMOZI VALUE STACK ============ */}
      <section className="section tint" id="pricing">
        <h2 className="section-h2 center">One price. Everything included.</h2>
        <p className="section-sub center">$97/month. Cancel anytime. 7-day free trial.</p>

        <div className="pricing-card">
          <div className="pricing-head">
            <span className="pricing-brand">PATTERN18</span>
            <div className="pricing-price">
              <span className="pricing-amount">$97</span>
              <span className="pricing-period">/month</span>
            </div>
          </div>

          <p className="pricing-label">What you get (as of today):</p>

          <ul className="stack">
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">24/7 AI coach — unlimited message analysis</div>
                <div className="stack-value">Worth $300+/mo at $10/analysis</div>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">Real-time pattern detection</div>
                <div className="stack-value">DARVO. Gaslighting. Coercive control. Named instantly.</div>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">Automatic case file and incident timeline</div>
                <div className="stack-value">Replaces $400/mo of manual documentation work.</div>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">BIFF response generator</div>
                <div className="stack-value">Pre-drafted strategic replies. Saves hours of emotional labor.</div>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">Court-ready documentation export</div>
                <div className="stack-value">Saves 4+ hours of lawyer billable at $300/hr = $1,200 per case.</div>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">Pattern timeline across months or years</div>
                <div className="stack-value">The evidence courts actually understand.</div>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <div className="stack-main">Healing module</div>
                <div className="stack-value">Grounding tools, affirmations, community support.</div>
              </div>
            </li>
          </ul>

          <div className="total">
            <div className="total-row"><span>Total value:</span><span>$2,000+/month</span></div>
            <div className="total-row your-price"><span>Your price:</span><span>$97/month</span></div>
          </div>

          <p className="pricing-why">Why so low? Because I waited 16 years for a tool like this.<br />I built it so no one else has to.</p>
          <p className="pricing-sign">— Rae</p>
        </div>

        <div className="pricing-cta-wrap">
          <a href={STRIPE_MONTHLY_URL} className="btn-primary btn-large">Start 7-Day Free Trial</a>
          <p className="yearly">
            Prefer to pay yearly? <a href={STRIPE_ANNUAL_URL} className="yearly-link">Get Pattern18 for $697/year</a> <span className="save">(save $467)</span>.
          </p>
        </div>
      </section>

      {/* ============ GUARANTEE ============ */}
      <section className="section">
        <div className="guarantee">
          <h3 className="guarantee-head">The 7-Day Promise.</h3>
          <p>Try Pattern18 for 7 days. No credit card charged during the trial.</p>
          <p>If Pattern18 doesn't name exactly what you're experiencing in your first week, walk away and pay nothing.</p>
          <p>You're not crazy. You're not overreacting. Let Pattern18 prove it.</p>
        </div>
      </section>

      {/* ============ FREE COMMUNITY ============ */}
      <section className="community">
        <h3 className="community-head">Not ready to subscribe? Join the community — free, forever.</h3>
        <p>5,000+ parents navigating high-conflict custody together. No cost. Ever.</p>
        <p>Glossary of the terms. Pattern recognition guides. Safe space to ask questions.</p>
        <a href={SKOOL_URL} target="_blank" rel="noopener noreferrer" className="btn-outline">
          Join Pattern18 Community
        </a>
      </section>

      {/* ============ LAW FIRM BANNER ============ */}
      <section className="firms-banner">
        <div className="firms-inner">
          <p className="firms-eyebrow">Are you a family law attorney?</p>
          <p className="firms-body">Pattern18 for Firms gives your practice the tools your clients need.</p>
          <Link href="/pricing#firms" className="firms-link">Pattern18 Certified firms →</Link>
        </div>
      </section>

      {/* ============ FAQ PREVIEW ============ */}
      <section className="section">
        <h2 className="section-h2 center">Questions?</h2>
        <div className="faq">
          <details className="faq-item">
            <summary>How much does it cost?</summary>
            <p>Pattern18 is $97/month with a 7-day free trial. That's less than 20 minutes with most family law attorneys, for unlimited 24/7 access. Prefer to pay yearly? Pattern18 is $697/year, which saves you $467. You can cancel anytime. No contracts, no hidden fees.</p>
          </details>
          <details className="faq-item">
            <summary>Can I cancel anytime?</summary>
            <p>Yes. Cancel with one click, no questions asked. Your data stays yours.</p>
          </details>
          <details className="faq-item">
            <summary>Is my data secure?</summary>
            <p>Bank-level encryption. We never share your data. You can export or delete everything anytime.</p>
          </details>
          <details className="faq-item">
            <summary>Is this legal advice?</summary>
            <p>No. Pattern18 helps you document and organize evidence. We recommend working with an attorney for legal strategy.</p>
          </details>
          <details className="faq-item">
            <summary>What if I can't afford this?</summary>
            <p>Start with the 7-day free trial. If you're in financial hardship, reach out to us, we have sponsored accounts available through our law firm partners.</p>
          </details>
        </div>
        <div className="faq-more">
          <Link href="/faq" className="faq-more-link">See all FAQs →</Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-title">PATTERN18</div>
            <p className="footer-tag">Find your way through.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <a href={STRIPE_MONTHLY_URL}>Try Pattern18</a>
              <Link href="/pricing">Pricing</Link>
              <Link href="/login">Sign in</Link>
            </div>
            <div className="footer-col">
              <h4>Learn</h4>
              <Link href="/faq">FAQ</Link>
              <Link href="/about">About</Link>
              <Link href="/safety">Safety</Link>
            </div>
            <div className="footer-col">
              <h4>For Attorneys</h4>
              <Link href="/pricing#firms">Pattern18 for Firms</Link>
              <Link href="/compass-certification">Compass Certification</Link>
              <a href="mailto:pro@pattern18.com">pro@pattern18.com</a>
            </div>
            <div className="footer-col">
              <h4>Community</h4>
              <a href={SKOOL_URL} target="_blank" rel="noopener noreferrer">Pattern18 Community (Skool)</a>
              <a href="https://www.tiktok.com/@pattern18app" target="_blank" rel="noopener noreferrer">TikTok: @pattern18app</a>
            </div>
          </div>
          <div className="footer-crisis">
            <p className="crisis-head">If you're in danger</p>
            <p>National DV Hotline: 1-800-799-7233</p>
            <p>Crisis Text Line: text HOME to 741741</p>
          </div>
          <div className="footer-legal">
            <p>© 2026 Pattern18. Pattern18 does not provide legal advice. All outputs are for attorney review only.</p>
            <p>
              <Link href="/terms">Terms</Link>
              <span className="sep"> · </span>
              <Link href="/privacy">Privacy</Link>
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .page {
          background: var(--warm-white);
          color: var(--charcoal);
          font-family: var(--sans);
          min-height: 100dvh;
          position: relative;
        }
        .teal-accent {
          height: 4px;
          background: var(--teal);
          width: 100%;
        }

        /* NAV */
        .nav {
          background: var(--warm-white);
          border-bottom: 1px solid var(--teal-border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--charcoal);
        }
        .brand-badge {
          background: var(--teal);
          color: var(--warm-white);
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--serif);
          font-weight: 800;
          font-size: 18px;
        }
        .brand-name {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 20px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .nav-link {
          color: var(--charcoal);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
        }
        .nav-link:hover { color: var(--teal); }
        .nav-cta {
          background: var(--teal);
          color: var(--warm-white);
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        .nav-cta:hover { background: var(--deep-teal); }

        @media (max-width: 720px) {
          .nav-link { display: none; }
          .nav-links { gap: 12px; }
        }

        /* HERO */
        .hero {
          max-width: 860px;
          margin: 0 auto;
          padding: 80px 24px 64px;
          text-align: center;
        }
        .eyebrow {
          color: var(--teal);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 28px;
          letter-spacing: 0.05em;
        }
        .hero-h1 {
          font-family: var(--serif);
          font-weight: 800;
          font-size: clamp(40px, 7vw, 76px);
          line-height: 1.05;
          color: var(--charcoal);
          margin-bottom: 24px;
          letter-spacing: -0.02em;
        }
        .hero-sub {
          font-size: clamp(18px, 2.2vw, 22px);
          color: var(--charcoal);
          margin-bottom: 40px;
          line-height: 1.5;
        }
        .hero-cta {
          min-width: 280px;
        }
        .hero-secondary {
          display: block;
          margin-top: 20px;
          color: var(--charcoal);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
        }
        .hero-secondary:hover { color: var(--teal); }
        .hero-anchor {
          margin-top: 28px;
          color: var(--charcoal-70);
          font-size: 14px;
        }
        .hero-trust {
          margin-top: 8px;
          color: var(--charcoal-50);
          font-size: 12px;
        }

        /* SOCIAL PROOF STRIP */
        .strip {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 24px 40px;
        }
        .strip-inner {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 10px 18px;
          text-align: center;
          font-size: 14px;
          color: var(--charcoal);
          line-height: 1.5;
        }
        .dot {
          color: var(--teal);
          font-weight: 700;
        }
        .strip-divider {
          height: 1px;
          background: var(--teal-border);
          max-width: 600px;
          margin: 40px auto 0;
        }

        /* SECTIONS */
        .section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 72px 24px;
        }
        .section.tint {
          background: var(--teal-tint);
          max-width: none;
          padding-left: 24px;
          padding-right: 24px;
        }
        .section.tint > * {
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }
        .section-h2 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: clamp(28px, 4vw, 44px);
          color: var(--charcoal);
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .section-h2.center { text-align: center; }
        .section-sub {
          font-size: 17px;
          color: var(--charcoal-70);
          margin-bottom: 40px;
        }
        .section-sub.center { text-align: center; }

        /* WHO CARDS */
        .cards-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }
        @media (max-width: 900px) {
          .cards-3 { grid-template-columns: 1fr; max-width: 520px; margin-left: auto; margin-right: auto; }
        }
        .who-card {
          background: var(--warm-white);
          border: 1px solid var(--teal-border);
          border-radius: 14px;
          padding: 28px 24px;
        }
        .who-head {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 22px;
          color: var(--charcoal);
          line-height: 1.25;
          margin-bottom: 12px;
        }
        .who-body {
          color: var(--charcoal);
          font-size: 15px;
          line-height: 1.6;
          opacity: 0.85;
        }

        /* STEPS */
        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 48px;
        }
        @media (max-width: 900px) {
          .steps { grid-template-columns: 1fr; max-width: 520px; margin-left: auto; margin-right: auto; }
        }
        .step { text-align: center; }
        .step-num {
          background: var(--teal);
          color: var(--warm-white);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--serif);
          font-weight: 800;
          font-size: 26px;
          margin: 0 auto 20px;
        }
        .step-head {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 20px;
          color: var(--charcoal);
          margin-bottom: 10px;
        }
        .step-body {
          color: var(--charcoal);
          font-size: 15px;
          line-height: 1.6;
          opacity: 0.85;
        }

        /* DEMO */
        .demo-box {
          max-width: 900px;
          margin: 0 auto;
          aspect-ratio: 16 / 9;
          border: 2px dashed var(--teal-border);
          border-radius: 16px;
          background: var(--warm-white);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .demo-caption {
          color: var(--charcoal-50);
          font-size: 14px;
          text-align: center;
        }
        .demo-sub {
          text-align: center;
          font-style: italic;
          color: var(--charcoal);
          opacity: 0.75;
          margin-top: 20px;
          font-size: 15px;
        }

        /* FOUNDER */
        .founder {
          max-width: 720px;
          margin: 32px auto 0;
          border-left: 3px solid var(--teal);
          padding: 8px 28px;
        }
        .founder p {
          color: var(--charcoal);
          font-size: 17px;
          line-height: 1.7;
          margin-bottom: 18px;
        }
        .founder-sign {
          font-family: var(--serif);
          font-style: italic;
          color: var(--teal);
          font-size: 22px;
          margin-top: 12px;
        }

        /* PRICING CARD */
        .pricing-card {
          max-width: 620px;
          margin: 32px auto 0;
          background: var(--warm-white);
          border: 2px solid var(--teal);
          border-radius: 20px;
          padding: 40px 36px;
        }
        @media (max-width: 600px) {
          .pricing-card { padding: 28px 22px; }
        }
        .pricing-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--teal-border);
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pricing-brand {
          font-family: var(--serif);
          font-weight: 800;
          color: var(--teal);
          letter-spacing: 0.05em;
          font-size: 20px;
        }
        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .pricing-amount {
          font-family: var(--serif);
          font-weight: 800;
          font-size: 56px;
          color: var(--charcoal);
          line-height: 1;
        }
        .pricing-period {
          font-size: 16px;
          color: var(--charcoal-70);
        }
        .pricing-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--charcoal-70);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        .stack {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
        }
        .stack li {
          display: flex;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid var(--teal-border);
        }
        .stack li:last-child { border-bottom: none; }
        .check {
          color: var(--teal);
          font-weight: 800;
          font-size: 18px;
          line-height: 1.4;
        }
        .stack-main {
          font-weight: 600;
          color: var(--charcoal);
          font-size: 15px;
          margin-bottom: 4px;
        }
        .stack-value {
          color: var(--charcoal-70);
          font-size: 13px;
          line-height: 1.5;
        }
        .total {
          background: var(--teal-tint);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          color: var(--charcoal);
          padding: 4px 0;
        }
        .total-row.your-price {
          font-weight: 700;
          font-size: 17px;
          color: var(--deep-teal);
          border-top: 1px solid var(--teal-border);
          padding-top: 10px;
          margin-top: 6px;
        }
        .pricing-why {
          color: var(--charcoal);
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.85;
        }
        .pricing-sign {
          font-family: var(--serif);
          font-style: italic;
          color: var(--teal);
          font-size: 18px;
          margin-top: 8px;
        }

        .pricing-cta-wrap {
          max-width: 620px;
          margin: 28px auto 0;
          text-align: center;
        }
        .btn-large {
          min-width: 320px;
          padding: 18px 36px;
          font-size: 17px;
        }
        .yearly {
          margin-top: 18px;
          color: var(--charcoal);
          font-size: 15px;
        }
        .yearly-link {
          color: var(--deep-teal);
          font-weight: 600;
          text-decoration: underline;
        }
        .save {
          color: var(--coral);
          font-weight: 700;
        }

        /* GUARANTEE */
        .guarantee {
          max-width: 640px;
          margin: 0 auto;
          background: var(--warm-white);
          border: 2px solid var(--teal);
          border-radius: 16px;
          padding: 36px 32px;
          text-align: center;
        }
        .guarantee-head {
          font-family: var(--serif);
          font-weight: 700;
          color: var(--charcoal);
          font-size: 26px;
          margin-bottom: 16px;
        }
        .guarantee p {
          color: var(--charcoal);
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        /* COMMUNITY */
        .community {
          background: var(--teal-tint);
          padding: 64px 24px;
          text-align: center;
        }
        .community-head {
          font-family: var(--serif);
          font-weight: 700;
          color: var(--charcoal);
          font-size: clamp(22px, 3.2vw, 30px);
          line-height: 1.25;
          max-width: 720px;
          margin: 0 auto 16px;
        }
        .community p {
          color: var(--charcoal);
          font-size: 15px;
          line-height: 1.6;
          max-width: 620px;
          margin: 0 auto 6px;
        }
        .community .btn-outline { margin-top: 24px; }

        /* LAW FIRM BANNER */
        .firms-banner {
          background: #16324F;
          padding: 28px 24px;
        }
        .firms-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 8px 20px;
          text-align: center;
        }
        .firms-eyebrow {
          color: #F4D37A;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.02em;
        }
        .firms-body {
          color: #FAFAF7;
          font-size: 15px;
        }
        .firms-link {
          color: #F4D37A;
          font-weight: 700;
          text-decoration: none;
          font-size: 15px;
          padding: 10px 14px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        .firms-link:hover { text-decoration: underline; }

        /* FAQ */
        .faq {
          max-width: 760px;
          margin: 24px auto 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .faq-item {
          background: var(--warm-white);
          border: 1px solid var(--teal-border);
          border-radius: 12px;
          padding: 18px 22px;
        }
        .faq-item[open] {
          border-color: var(--teal);
        }
        .faq-item summary {
          font-family: var(--serif);
          font-weight: 700;
          color: var(--charcoal);
          font-size: 17px;
          cursor: pointer;
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item summary::after {
          content: '+';
          color: var(--teal);
          font-size: 22px;
          font-weight: 400;
          line-height: 1;
        }
        .faq-item[open] summary::after { content: '−'; }
        .faq-item p {
          color: var(--charcoal);
          font-size: 15px;
          line-height: 1.65;
          margin-top: 12px;
          opacity: 0.85;
        }
        .faq-more { text-align: center; margin-top: 32px; }
        .faq-more-link {
          color: var(--teal);
          font-weight: 600;
          text-decoration: none;
          font-size: 15px;
        }
        .faq-more-link:hover { color: var(--deep-teal); }

        /* FOOTER */
        .footer {
          background: var(--charcoal);
          color: var(--warm-white);
          padding: 64px 24px 32px;
          margin-top: 40px;
        }
        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .footer-brand { margin-bottom: 40px; }
        .footer-title {
          font-family: var(--serif);
          font-weight: 800;
          font-size: 24px;
          letter-spacing: 0.02em;
        }
        .footer-tag {
          font-family: var(--serif);
          font-style: italic;
          opacity: 0.75;
          margin-top: 4px;
        }
        .footer-cols {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
          margin-bottom: 40px;
        }
        @media (max-width: 720px) {
          .footer-cols { grid-template-columns: 1fr 1fr; gap: 24px; }
        }
        @media (max-width: 440px) {
          .footer-cols { grid-template-columns: 1fr; }
        }
        .footer-col h4 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 14px;
          color: var(--warm-white);
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .footer-col a {
          display: block;
          color: var(--warm-white);
          opacity: 0.8;
          text-decoration: none;
          font-size: 14px;
          padding: 4px 0;
          min-height: 28px;
        }
        .footer-col a:hover {
          color: var(--teal);
          opacity: 1;
        }
        .footer-crisis {
          background: rgba(244, 132, 107, 0.08);
          border-left: 3px solid var(--coral);
          padding: 18px 20px;
          border-radius: 6px;
          margin-bottom: 32px;
        }
        .crisis-head {
          font-family: var(--serif);
          font-weight: 700;
          color: var(--coral);
          margin-bottom: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .footer-crisis p {
          color: var(--warm-white);
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }
        .footer-legal {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 24px;
          font-size: 12px;
          color: rgba(250, 250, 247, 0.6);
          line-height: 1.6;
        }
        .footer-legal p { margin-bottom: 8px; }
        .footer-legal a {
          color: rgba(250, 250, 247, 0.8);
          text-decoration: none;
        }
        .footer-legal a:hover { color: var(--teal); }
        .sep { opacity: 0.5; }
      `}</style>

      <style jsx global>{`
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--teal);
          color: var(--warm-white);
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          text-decoration: none;
          min-height: 52px;
          transition: background 0.15s ease, transform 0.15s ease;
          border: none;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: var(--deep-teal);
        }
        .btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--warm-white);
          color: var(--teal);
          border: 2px solid var(--teal);
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          min-height: 48px;
          transition: all 0.15s ease;
        }
        .btn-outline:hover {
          background: var(--teal);
          color: var(--warm-white);
        }
      `}</style>
    </div>
  );
}
