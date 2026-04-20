'use client';

import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import { STRIPE_MONTHLY_URL } from '@/lib/stripe-links';

export default function FAQPage() {
  return (
    <div className="container">
      <div className="teal-accent" />

      <SiteNav />

      <main className="main">
        <header className="hero">
          <h1>Frequently asked questions.</h1>
          <p>Everything you might be wondering, answered.</p>
        </header>

        <div className="faq">
          <details className="faq-item" open>
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
            <summary>What if I can't afford this right now?</summary>
            <p>A few options. Gift subscriptions are available — a friend, family member, or advocate can purchase an annual plan for someone they love. We're also building a sponsored access program funded by our family law firm partners. If you're working with an attorney, ask them about Pattern18 — when firms subscribe, their clients get free access. If none of those fit, email hello@pattern18.com.</p>
          </details>
        </div>

        <div className="cta-wrap">
          <a href={STRIPE_MONTHLY_URL} className="btn-primary">Start 7-Day Free Trial</a>
          <p className="anchor">$97/month. Cancel anytime. No credit card charged during trial.</p>
        </div>

        <div className="back">
          <Link href="/" className="back-link">← Back to homepage</Link>
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
          max-width: 780px;
          margin: 0 auto;
          padding: 64px 24px 96px;
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
          font-size: 17px;
          color: var(--charcoal-70);
          line-height: 1.6;
        }

        .faq { display: flex; flex-direction: column; gap: 12px; }
        .faq-item {
          background: var(--warm-white);
          border: 1px solid var(--teal-border);
          border-radius: 12px;
          padding: 20px 24px;
        }
        .faq-item[open] { border-color: var(--teal); }
        .faq-item summary {
          font-family: var(--serif);
          font-weight: 700;
          color: var(--charcoal);
          font-size: 18px;
          cursor: pointer;
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          min-height: 44px;
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item summary::after {
          content: '+';
          color: var(--teal);
          font-size: 24px;
          font-weight: 400;
          line-height: 1;
        }
        .faq-item[open] summary::after { content: '−'; }
        .faq-item p {
          color: var(--charcoal);
          font-size: 15px;
          line-height: 1.7;
          margin-top: 14px;
          opacity: 0.9;
        }

        .cta-wrap {
          text-align: center;
          margin-top: 56px;
          padding: 40px 24px;
          background: var(--teal-tint);
          border-radius: 16px;
        }
        .anchor {
          margin-top: 16px;
          color: var(--charcoal-70);
          font-size: 14px;
        }

        .back { text-align: center; margin-top: 40px; }
        .back-link {
          color: var(--teal);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
        }
        .back-link:hover { color: var(--deep-teal); }
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
          min-width: 280px;
          transition: background 0.15s ease;
          border: none;
          cursor: pointer;
        }
        .btn-primary:hover { background: var(--deep-teal); }
      `}</style>
    </div>
  );
}
