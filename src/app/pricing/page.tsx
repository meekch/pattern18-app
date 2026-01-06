'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
  }, []);

  const handleSelectPlan = async (priceId: string, tier: string) => {
    if (!user) {
      router.push(`/signup?plan=${tier}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id }),
      });

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.push('/')} className="back-btn">
          ← Back
        </button>
        <div className="logo">💚</div>
      </header>

      <main className="main">
        <div className="hero">
          <h1>Document the Truth. Build Your Case.</h1>
          <p>Family attorneys charge $300-400/hour. Pattern 18 gives you court-ready documentation for less than a single consultation.</p>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          
          {/* Survivor Tier */}
          <div className="pricing-card survivor">
            <div className="card-header">
              <h2>Survivor</h2>
              <div className="price">
                <span className="amount">$29</span>
                <span className="period">/month</span>
              </div>
            </div>
            <p className="card-desc">Everything you need to document patterns and build your case.</p>
            <ul className="features">
              <li>✓ <strong>Unlimited</strong> evidence saves</li>
              <li>✓ <strong>Unlimited</strong> coach messages</li>
              <li>✓ Pattern detection & tracking</li>
              <li>✓ Full case dashboard</li>
              <li>✓ Court exhibit packets</li>
              <li>✓ Declaration generator</li>
              <li>✓ Timeline documents</li>
              <li>✓ Bulk message import</li>
              <li>✓ Court Prep Mode</li>
              <li>✓ Healing Space</li>
            </ul>
            <button 
              className="cta-btn primary"
              onClick={() => handleSelectPlan(process.env.NEXT_PUBLIC_STRIPE_SURVIVOR_MONTHLY!, 'survivor')}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Start 7-Day Free Trial'}
            </button>
            <p className="trial-note">Cancel anytime. No charge for 7 days.</p>
          </div>

          {/* Litigation Tier - Most Popular */}
          <div className="pricing-card litigation popular">
            <div className="popular-badge">MOST POPULAR</div>
            <div className="card-header">
              <h2>Litigation</h2>
              <div className="price">
                <span className="amount">$99</span>
                <span className="period">/month</span>
              </div>
            </div>
            <p className="card-desc">For active court cases. Priority support when you need it most.</p>
            <ul className="features">
              <li>✓ Everything in Survivor</li>
              <li className="highlight">✓ <strong>Priority</strong> AI responses</li>
              <li>✓ Attorney export package</li>
              <li>✓ Case summary generator</li>
              <li>✓ Court-formatted filings</li>
              <li>✓ Deposition prep guides</li>
              <li>✓ Pattern expert summary</li>
              <li>✓ Email support</li>
              <li>✓ Exclusive video library</li>
            </ul>
            <button 
              className="cta-btn primary"
              onClick={() => handleSelectPlan(process.env.NEXT_PUBLIC_STRIPE_LITIGATION_MONTHLY!, 'litigation')}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Start 7-Day Free Trial'}
            </button>
            <p className="trial-note">Cancel anytime. No charge for 7 days.</p>
          </div>

          {/* Law Firms */}
          <div className="pricing-card firms">
            <div className="card-header">
              <h2>Law Firms</h2>
              <div className="price">
                <span className="amount-small">Custom</span>
              </div>
            </div>
            <p className="card-desc">Become a Pattern 18 Certified Firm. Your clients arrive prepared.</p>
            <ul className="features">
              <li>✓ Multi-attorney dashboard</li>
              <li>✓ Client account management</li>
              <li>✓ <strong>Sponsor survivor accounts</strong></li>
              <li>✓ White-label reports</li>
              <li>✓ "Pattern 18 Certified" badge</li>
              <li>✓ Listed as trusted referral</li>
              <li>✓ Staff training session</li>
              <li>✓ Priority support</li>
            </ul>
            <div className="firm-tiers">
              <div className="firm-tier">
                <span className="tier-name">Solo</span>
                <span className="tier-price">$299/mo</span>
              </div>
              <div className="firm-tier">
                <span className="tier-name">Small Firm</span>
                <span className="tier-price">$799/mo</span>
              </div>
              <div className="firm-tier">
                <span className="tier-name">Full Firm</span>
                <span className="tier-price">$1,999/mo</span>
              </div>
            </div>
            <button 
              className="cta-btn secondary"
              onClick={() => window.location.href = 'mailto:hello@pattern18.com?subject=Law Firm Inquiry'}
            >
              Contact Us
            </button>
          </div>

        </div>

        {/* The Mission */}
        <div className="mission-block">
          <h3>Our Mission</h3>
          <p>Every law firm subscription sponsors free access for survivors who can't afford it. When firms pay, victims get helped. That's how we change the system together.</p>
        </div>

        {/* Comparison to Attorney */}
        <div className="comparison">
          <h3>Compare the Cost</h3>
          <div className="comparison-grid">
            <div className="comparison-item attorney">
              <div className="comparison-label">Family Attorney</div>
              <div className="comparison-price">$300-400/hr</div>
              <div className="comparison-note">Initial consultation alone</div>
            </div>
            <div className="comparison-vs">vs</div>
            <div className="comparison-item pattern18">
              <div className="comparison-label">Pattern 18</div>
              <div className="comparison-price">$29/mo</div>
              <div className="comparison-note">Unlimited documentation & court docs</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="faq">
          <h3>Questions?</h3>
          
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>Yes. Cancel with one click, no questions asked. Your data stays yours.</p>
          </div>
          
          <div className="faq-item">
            <h4>Is my data secure?</h4>
            <p>Bank-level encryption. We never share your data. You can export or delete everything anytime.</p>
          </div>
          
          <div className="faq-item">
            <h4>Is this legal advice?</h4>
            <p>No. Pattern 18 helps you document and organize evidence. We recommend working with an attorney for legal strategy.</p>
          </div>

          <div className="faq-item">
            <h4>What if I can't afford this?</h4>
            <p>Start with the 7-day free trial. If you're in financial hardship, reach out to us - we have sponsored accounts available through our law firm partners.</p>
          </div>
        </div>

      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0fdf4 0%, #f5f7f6 100%);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
        }
        .back-btn {
          background: none;
          border: none;
          color: #1a3a2f;
          font-size: 16px;
          cursor: pointer;
        }
        .logo {
          font-size: 32px;
        }
        .main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }
        .hero {
          text-align: center;
          margin-bottom: 48px;
        }
        .hero h1 {
          font-size: 36px;
          color: #1a3a2f;
          margin: 0 0 16px;
          line-height: 1.2;
        }
        .hero p {
          font-size: 18px;
          color: #4b5563;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 48px;
        }
        @media (max-width: 900px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 420px;
            margin: 0 auto 48px;
          }
          .pricing-card.popular {
            order: -1;
          }
        }
        .pricing-card {
          background: white;
          border-radius: 20px;
          padding: 32px 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .pricing-card.popular {
          border: 3px solid #059669;
          transform: scale(1.02);
        }
        @media (max-width: 900px) {
          .pricing-card.popular {
            transform: none;
          }
        }
        .popular-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: #059669;
          color: white;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }
        .card-header {
          margin-bottom: 16px;
        }
        .card-header h2 {
          font-size: 22px;
          color: #1a3a2f;
          margin: 0 0 12px;
        }
        .price {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .amount {
          font-size: 48px;
          font-weight: 800;
          color: #1a3a2f;
        }
        .amount-small {
          font-size: 36px;
          font-weight: 800;
          color: #1a3a2f;
        }
        .period {
          font-size: 16px;
          color: #6b7280;
        }
        .card-desc {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          flex: 1;
        }
        .features li {
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
          color: #374151;
        }
        .features li:last-child {
          border-bottom: none;
        }
        .features li.highlight {
          background: #fef3c7;
          margin: 0 -12px;
          padding: 10px 12px;
          border-radius: 8px;
          border-bottom: none;
        }
        .features li strong {
          color: #059669;
        }
        .firm-tiers {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
          background: #f9fafb;
          padding: 16px;
          border-radius: 12px;
        }
        .firm-tier {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }
        .tier-name {
          color: #6b7280;
        }
        .tier-price {
          font-weight: 700;
          color: #1a3a2f;
        }
        .cta-btn {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cta-btn.primary {
          background: #059669;
          color: white;
          border: none;
        }
        .cta-btn.primary:hover {
          background: #047857;
        }
        .cta-btn.secondary {
          background: white;
          color: #1a3a2f;
          border: 2px solid #1a3a2f;
        }
        .cta-btn.secondary:hover {
          background: #f0fdf4;
        }
        .cta-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .trial-note {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          margin-top: 12px;
        }
        .mission-block {
          background: #1a3a2f;
          color: white;
          border-radius: 16px;
          padding: 32px 40px;
          text-align: center;
          margin-bottom: 40px;
        }
        .mission-block h3 {
          font-size: 20px;
          margin: 0 0 12px;
        }
        .mission-block p {
          font-size: 16px;
          margin: 0;
          opacity: 0.9;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }
        .comparison {
          background: white;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          margin-bottom: 40px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .comparison h3 {
          font-size: 24px;
          color: #1a3a2f;
          margin: 0 0 32px;
        }
        .comparison-grid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
        }
        @media (max-width: 600px) {
          .comparison-grid {
            flex-direction: column;
            gap: 24px;
          }
        }
        .comparison-item {
          padding: 24px 40px;
          border-radius: 12px;
        }
        .comparison-item.attorney {
          background: #fef2f2;
          border: 2px solid #fecaca;
        }
        .comparison-item.pattern18 {
          background: #f0fdf4;
          border: 2px solid #059669;
        }
        .comparison-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .comparison-price {
          font-size: 32px;
          font-weight: 800;
          color: #1a3a2f;
        }
        .comparison-note {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
        .comparison-vs {
          font-size: 18px;
          font-weight: 600;
          color: #9ca3af;
        }
        .faq {
          max-width: 600px;
          margin: 0 auto;
        }
        .faq h3 {
          text-align: center;
          font-size: 24px;
          color: #1a3a2f;
          margin: 0 0 32px;
        }
        .faq-item {
          background: white;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .faq-item h4 {
          font-size: 16px;
          color: #1a3a2f;
          margin: 0 0 8px;
        }
        .faq-item p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}