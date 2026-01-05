'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
  }, []);

  const handleSelectPlan = async (priceId: string, tier: string) => {
    if (tier === 'free') {
      if (user) {
        router.push('/coach');
      } else {
        router.push('/signup?plan=free');
      }
      return;
    }

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

  const prices = {
    pro: {
      monthly: { amount: 29, priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY },
      annual: { amount: 199, priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL },
    },
    litigation: {
      monthly: { amount: 149, priceId: process.env.NEXT_PUBLIC_STRIPE_LITIGATION_MONTHLY },
      annual: { amount: 999, priceId: process.env.NEXT_PUBLIC_STRIPE_LITIGATION_ANNUAL },
    },
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

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <button 
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={billingCycle === 'annual' ? 'active' : ''}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
            <span className="save-badge">Save 40%+</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          
          {/* Free Tier */}
          <div className="pricing-card free">
            <div className="card-header">
              <h2>Free</h2>
              <div className="price">
                <span className="amount">$0</span>
                <span className="period">forever</span>
              </div>
            </div>
            <p className="card-desc">Start documenting immediately. No credit card required.</p>
            <ul className="features">
              <li>✓ 3 evidence saves</li>
              <li>✓ 10 coach messages per day</li>
              <li>✓ Pattern detection</li>
              <li>✓ Basic case dashboard</li>
              <li className="limited">✗ Document generation</li>
              <li className="limited">✗ Exhibit packets</li>
              <li className="limited">✗ Bulk import</li>
            </ul>
            <button 
              className="cta-btn secondary"
              onClick={() => handleSelectPlan('', 'free')}
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier - Most Popular */}
          <div className="pricing-card pro popular">
            <div className="popular-badge">MOST POPULAR</div>
            <div className="card-header">
              <h2>Pro</h2>
              <div className="price">
                <span className="amount">
                  ${billingCycle === 'monthly' ? prices.pro.monthly.amount : Math.round(prices.pro.annual.amount / 12)}
                </span>
                <span className="period">/month</span>
              </div>
              {billingCycle === 'annual' && (
                <div className="annual-note">Billed ${prices.pro.annual.amount}/year</div>
              )}
            </div>
            <p className="card-desc">Everything you need to build an undeniable case.</p>
            <ul className="features">
              <li>✓ <strong>Unlimited</strong> evidence saves</li>
              <li>✓ <strong>Unlimited</strong> coach messages</li>
              <li>✓ Pattern detection & tracking</li>
              <li>✓ Full case dashboard</li>
              <li>✓ Court exhibit packets</li>
              <li>✓ Declaration generator</li>
              <li>✓ Timeline documents</li>
              <li>✓ Bulk message import</li>
              <li>✓ 7-day free trial</li>
            </ul>
            <button 
              className="cta-btn primary"
              onClick={() => handleSelectPlan(
                billingCycle === 'monthly' ? prices.pro.monthly.priceId! : prices.pro.annual.priceId!,
                'pro'
              )}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Start 7-Day Free Trial'}
            </button>
            <p className="trial-note">Cancel anytime. No charge for 7 days.</p>
          </div>

          {/* Litigation Support - Anchor */}
          <div className="pricing-card litigation">
            <div className="card-header">
              <h2>Litigation Support</h2>
              <div className="price">
                <span className="amount">
                  ${billingCycle === 'monthly' ? prices.litigation.monthly.amount : Math.round(prices.litigation.annual.amount / 12)}
                </span>
                <span className="period">/month</span>
              </div>
              {billingCycle === 'annual' && (
                <div className="annual-note">Billed ${prices.litigation.annual.amount}/year</div>
              )}
            </div>
            <p className="card-desc">For active litigation with upcoming court dates.</p>
            <ul className="features">
              <li>✓ Everything in Pro</li>
              <li>✓ <strong>Priority</strong> AI responses</li>
              <li>✓ Attorney export package</li>
              <li>✓ Court-formatted filings</li>
              <li>✓ Deposition prep guides</li>
              <li>✓ Pattern expert summary</li>
              <li>✓ Email support within 24hrs</li>
              <li>✓ Monthly case review call</li>
            </ul>
            <button 
              className="cta-btn secondary"
              onClick={() => handleSelectPlan(
                billingCycle === 'monthly' ? prices.litigation.monthly.priceId! : prices.litigation.annual.priceId!,
                'litigation'
              )}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Get Litigation Support'}
            </button>
          </div>

        </div>

        {/* Social Proof */}
        <div className="social-proof">
          <div className="stat">
            <span className="stat-number">2,847</span>
            <span className="stat-label">patterns documented this month</span>
          </div>
          <div className="stat">
            <span className="stat-number">94%</span>
            <span className="stat-label">of users say they feel more prepared for court</span>
          </div>
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
              <div className="comparison-label">Pattern 18 Pro</div>
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
            <p>We understand. Start with our free tier - it's not a trial, it's free forever. If you're in crisis, reach out to us.</p>
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
          margin-bottom: 40px;
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
        .billing-toggle {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 40px;
        }
        .billing-toggle button {
          padding: 12px 24px;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .billing-toggle button.active {
          border-color: #1a3a2f;
          background: #1a3a2f;
          color: white;
        }
        .save-badge {
          background: #fef3c7;
          color: #92400e;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .billing-toggle button.active .save-badge {
          background: #22c55e;
          color: white;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 60px;
        }
        @media (max-width: 900px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto 60px;
          }
          .pricing-card.pro {
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
          transform: scale(1.05);
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
        .period {
          font-size: 16px;
          color: #6b7280;
        }
        .annual-note {
          font-size: 13px;
          color: #059669;
          margin-top: 4px;
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
        .features li.limited {
          color: #9ca3af;
        }
        .features li strong {
          color: #059669;
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
        .social-proof {
          display: flex;
          justify-content: center;
          gap: 60px;
          padding: 40px;
          background: white;
          border-radius: 16px;
          margin-bottom: 40px;
        }
        @media (max-width: 600px) {
          .social-proof {
            flex-direction: column;
            gap: 24px;
            text-align: center;
          }
        }
        .stat-number {
          display: block;
          font-size: 36px;
          font-weight: 800;
          color: #059669;
        }
        .stat-label {
          font-size: 14px;
          color: #6b7280;
        }
        .comparison {
          background: #1a3a2f;
          border-radius: 16px;
          padding: 40px;
          color: white;
          text-align: center;
          margin-bottom: 40px;
        }
        .comparison h3 {
          font-size: 24px;
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
          background: rgba(255,255,255,0.1);
        }
        .comparison-item.pattern18 {
          background: #059669;
        }
        .comparison-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .comparison-price {
          font-size: 32px;
          font-weight: 800;
        }
        .comparison-note {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 4px;
        }
        .comparison-vs {
          font-size: 18px;
          font-weight: 600;
          opacity: 0.6;
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