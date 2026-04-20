'use client';

import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import { STRIPE_MONTHLY_URL, STRIPE_ANNUAL_URL } from '@/lib/stripe-links';

export default function PricingPage() {
  return (
    <div className="container">
      <div className="teal-accent" />

      <SiteNav />

      <main className="main">
        {/* HERO */}
        <div className="hero">
          <h1>One price. Everything included.</h1>
          <p>$97/month. Cancel anytime. 7-day free trial.</p>
        </div>

        {/* CONSUMER PLAN */}
        <div className="plan">
          <div className="plan-head">
            <span className="plan-brand">PATTERN18</span>
            <div className="plan-price">
              <span className="amount">$97</span>
              <span className="period">/month</span>
            </div>
          </div>

          <p className="plan-label">What you get:</p>
          <ul className="features">
            <li><span className="check">✓</span> <strong>24/7 AI coach</strong>, unlimited message analysis</li>
            <li><span className="check">✓</span> <strong>Real-time pattern detection</strong> (DARVO, gaslighting, coercive control)</li>
            <li><span className="check">✓</span> <strong>Automatic case file and incident timeline</strong></li>
            <li><span className="check">✓</span> <strong>BIFF response generator</strong></li>
            <li><span className="check">✓</span> <strong>Court-ready documentation export</strong></li>
            <li><span className="check">✓</span> <strong>Pattern timeline</strong> across months or years</li>
            <li><span className="check">✓</span> <strong>Healing module</strong>, grounding tools, community</li>
          </ul>

          <a href={STRIPE_MONTHLY_URL} className="btn-primary btn-block">
            Start 7-Day Free Trial
          </a>
          <p className="trial-note">No credit card charged during trial.</p>
        </div>

        <div className="yearly-wrap">
          <p className="yearly">
            Prefer to pay yearly? <a href={STRIPE_ANNUAL_URL} className="yearly-link">Get Pattern18 for $697/year</a> <span className="save">(save $467)</span>.
          </p>
        </div>

        {/* COMPARISON */}
        <div className="comparison">
          <h2>Compare the cost.</h2>
          <div className="comparison-grid">
            <div className="compare-item attorney">
              <div className="compare-label">Family Attorney</div>
              <div className="compare-price">$300-400/hr</div>
              <div className="compare-note">Initial consultation alone</div>
            </div>
            <div className="compare-vs">vs</div>
            <div className="compare-item p18">
              <div className="compare-label">Pattern18</div>
              <div className="compare-price">$97/mo</div>
              <div className="compare-note">Unlimited analysis, documentation, court exports</div>
            </div>
          </div>
        </div>

        {/* FIRMS SECTION */}
        <div id="firms" className="firms">
          <div className="firms-head">
            <h2>For Law Firms.</h2>
            <p>Become a Pattern18 Certified Firm. Your clients arrive prepared.</p>
          </div>

          <div className="firms-grid">
            <div className="firm-card">
              <h3>Solo</h3>
              <div className="firm-price"><span className="firm-amount">$299</span><span className="firm-period">/mo</span></div>
              <ul>
                <li>✓ Single-attorney dashboard</li>
                <li>✓ Client account management</li>
                <li>✓ "Pattern18 Certified" badge</li>
                <li>✓ White-label reports</li>
                <li>✓ Staff training session</li>
              </ul>
              <a href="mailto:hello@pattern18.com?subject=Pattern18 Solo Firm Inquiry" className="btn-outline">Contact us</a>
            </div>

            <div className="firm-card featured">
              <div className="firm-badge">MOST POPULAR</div>
              <h3>Small Firm</h3>
              <div className="firm-price"><span className="firm-amount">$799</span><span className="firm-period">/mo</span></div>
              <ul>
                <li>✓ Up to 5 attorneys</li>
                <li>✓ Sponsor survivor accounts</li>
                <li>✓ Listed as trusted referral</li>
                <li>✓ Priority support</li>
                <li>✓ Everything in Solo</li>
              </ul>
              <a href="mailto:hello@pattern18.com?subject=Pattern18 Small Firm Inquiry" className="btn-primary">Contact us</a>
            </div>

            <div className="firm-card">
              <h3>Full Firm</h3>
              <div className="firm-price"><span className="firm-amount">$1,999</span><span className="firm-period">/mo</span></div>
              <ul>
                <li>✓ Unlimited attorneys</li>
                <li>✓ Sponsor survivor accounts at scale</li>
                <li>✓ Custom training and onboarding</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ Everything in Small Firm</li>
              </ul>
              <a href="mailto:hello@pattern18.com?subject=Pattern18 Full Firm Inquiry" className="btn-outline">Contact us</a>
            </div>
          </div>

          <div className="mission">
            <h3>Our mission.</h3>
            <p>Every firm subscription sponsors free access for survivors who can't afford it. When firms pay, victims get helped. That's how we change the system.</p>
          </div>
        </div>

        {/* FAQ LINK */}
        <div className="faq-cta">
          <Link href="/faq" className="faq-link">See frequently asked questions →</Link>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100dvh;
          background: var(--warm-white);
          color: var(--charcoal);
          font-family: var(--sans);
        }
        .teal-accent { height: 4px; background: var(--teal); }

        .main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 64px 24px 80px;
        }

        .hero { text-align: center; margin-bottom: 48px; }
        .hero h1 {
          font-family: var(--serif);
          font-weight: 800;
          font-size: clamp(32px, 5vw, 48px);
          color: var(--charcoal);
          line-height: 1.1;
          margin-bottom: 14px;
          letter-spacing: -0.02em;
        }
        .hero p {
          font-size: 18px;
          color: var(--charcoal-70);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* CONSUMER PLAN */
        .plan {
          max-width: 560px;
          margin: 0 auto;
          background: var(--warm-white);
          border: 2px solid var(--teal);
          border-radius: 20px;
          padding: 36px 32px;
        }
        .plan-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--teal-border);
          margin-bottom: 22px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .plan-brand {
          font-family: var(--serif);
          font-weight: 800;
          color: var(--teal);
          letter-spacing: 0.05em;
          font-size: 18px;
        }
        .plan-price { display: flex; align-items: baseline; gap: 4px; }
        .amount {
          font-family: var(--serif);
          font-weight: 800;
          font-size: 52px;
          color: var(--charcoal);
          line-height: 1;
        }
        .period { font-size: 16px; color: var(--charcoal-70); }
        .plan-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--charcoal-70);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 14px;
        }
        .features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
        }
        .features li {
          padding: 10px 0;
          border-bottom: 1px solid var(--teal-border);
          font-size: 15px;
          color: var(--charcoal);
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .features li:last-child { border-bottom: none; }
        .check { color: var(--teal); font-weight: 800; }
        .btn-block { width: 100%; }
        .trial-note {
          text-align: center;
          font-size: 13px;
          color: var(--charcoal-50);
          margin-top: 14px;
        }

        .yearly-wrap { text-align: center; margin: 24px auto 72px; }
        .yearly { color: var(--charcoal); font-size: 15px; }
        .yearly-link { color: var(--deep-teal); font-weight: 600; text-decoration: underline; }
        .save { color: var(--coral); font-weight: 700; }

        /* COMPARISON */
        .comparison {
          background: var(--teal-tint);
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          margin-bottom: 80px;
        }
        .comparison h2 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: clamp(26px, 4vw, 36px);
          color: var(--charcoal);
          margin-bottom: 32px;
        }
        .comparison-grid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
        }
        @media (max-width: 640px) {
          .comparison-grid { flex-direction: column; gap: 20px; }
        }
        .compare-item {
          padding: 24px 32px;
          border-radius: 12px;
          min-width: 220px;
        }
        .compare-item.attorney {
          background: var(--warm-white);
          border: 2px solid var(--teal-border);
        }
        .compare-item.p18 {
          background: var(--warm-white);
          border: 2px solid var(--teal);
        }
        .compare-label { font-size: 13px; color: var(--charcoal-70); margin-bottom: 6px; }
        .compare-price {
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 800;
          color: var(--charcoal);
        }
        .compare-note { font-size: 12px; color: var(--charcoal-50); margin-top: 6px; }
        .compare-vs { font-size: 18px; font-weight: 600; color: var(--charcoal-50); }

        /* FIRMS */
        .firms { scroll-margin-top: 80px; }
        .firms-head { text-align: center; margin-bottom: 40px; }
        .firms-head h2 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: clamp(28px, 4vw, 40px);
          color: var(--charcoal);
          margin-bottom: 12px;
        }
        .firms-head p {
          color: var(--charcoal-70);
          font-size: 16px;
          max-width: 540px;
          margin: 0 auto;
        }
        .firms-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 48px;
        }
        @media (max-width: 900px) {
          .firms-grid { grid-template-columns: 1fr; max-width: 420px; margin-left: auto; margin-right: auto; }
          .firm-card.featured { order: -1; }
        }
        .firm-card {
          background: var(--warm-white);
          border: 1px solid var(--teal-border);
          border-radius: 16px;
          padding: 28px 24px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .firm-card.featured { border: 2px solid var(--teal); }
        .firm-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--teal);
          color: var(--warm-white);
          font-size: 11px;
          font-weight: 700;
          padding: 5px 14px;
          border-radius: 20px;
          letter-spacing: 0.05em;
        }
        .firm-card h3 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 22px;
          color: var(--charcoal);
          margin-bottom: 10px;
        }
        .firm-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 18px; }
        .firm-amount {
          font-family: var(--serif);
          font-weight: 800;
          font-size: 36px;
          color: var(--charcoal);
          line-height: 1;
        }
        .firm-period { font-size: 15px; color: var(--charcoal-70); }
        .firm-card ul {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          flex: 1;
        }
        .firm-card li {
          padding: 8px 0;
          font-size: 14px;
          color: var(--charcoal);
          line-height: 1.5;
        }
        .mission {
          background: var(--deep-teal);
          color: var(--warm-white);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
        }
        .mission h3 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 22px;
          margin-bottom: 10px;
        }
        .mission p { line-height: 1.6; opacity: 0.92; max-width: 580px; margin: 0 auto; }

        /* FAQ CTA */
        .faq-cta { text-align: center; margin-top: 64px; }
        .faq-link { color: var(--teal); text-decoration: none; font-weight: 600; font-size: 16px; }
        .faq-link:hover { color: var(--deep-teal); }
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
          transition: background 0.15s ease;
          border: none;
          cursor: pointer;
        }
        .btn-primary:hover { background: var(--deep-teal); }
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
