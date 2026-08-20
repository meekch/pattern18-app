'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single();

      if (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
        router.push('/coach');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    init();
  }, [router]);

  const startCheckout = async (plan: 'monthly' | 'annual') => {
    if (!user?.email) return;
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          priceId: plan === 'annual' ? process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setCheckoutError(data.error || 'Failed to start checkout. Please try again.');
        setCheckoutLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Stripe checkout fetch failed:', err);
      setCheckoutError('Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="loading-badge">18</div>
          <p>Loading...</p>
        </div>
        <style jsx>{`
          .container {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--warm-white);
            font-family: var(--sans);
          }
          .loading { text-align: center; }
          .loading-badge {
            background: var(--teal);
            color: var(--warm-white);
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--serif);
            font-weight: 800;
            font-size: 24px;
            margin: 0 auto 14px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          p { color: var(--charcoal-70); }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="teal-accent" />
      <div className="card">
        <div className="header">
          <div className="logo">18</div>
          <h1>Pattern18 Coach</h1>
          <p className="tagline">Your 24/7 AI coach for high-conflict custody.</p>
        </div>

        <div className="trial-badge">
          <span className="trial-text">7-DAY FREE TRIAL</span>
          <span className="trial-price">$0 today</span>
        </div>

        <div className="benefits">
          <h2>What's included:</h2>
          <ul>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>24/7 AI coach</strong>
                <span>Unlimited message analysis. Pattern detection. BIFF responses.</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Pattern recognition</strong>
                <span>DARVO, gaslighting, coercive control, named instantly.</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Evidence documentation</strong>
                <span>Timestamped case file. Automatic timeline.</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Court-ready exports</strong>
                <span>Declarations, exhibits, attorney-ready packets.</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Healing module</strong>
                <span>Grounding tools, affirmations, community.</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="pricing">
          <div className="price-row">
            <span>Today</span>
            <span className="price-free">$0.00</span>
          </div>
          <div className="price-row future">
            <span>After 7 days</span>
            <span>$97/month</span>
          </div>
          <p className="cancel-note">Cancel anytime. No questions asked.</p>
        </div>

        <button
          onClick={() => startCheckout('monthly')}
          disabled={checkoutLoading}
          className="cta-button"
        >
          {checkoutLoading ? 'Preparing checkout...' : 'Start My Free Trial →'}
        </button>

        <p className="yearly-line">
          Prefer to pay yearly?{' '}
          <button
            onClick={() => startCheckout('annual')}
            disabled={checkoutLoading}
            className="yearly-link"
          >
            $697/year
          </button>{' '}
          <span className="save">(save $467)</span>.
        </p>

        {checkoutError && <p className="checkout-error">{checkoutError}</p>}

        <p className="secure-note">Secure checkout powered by Stripe.</p>

        <div className="user-info">
          <span>Signed in as {user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">Sign out</button>
        </div>
      </div>

      <div className="trust">
        <p>"This tool helped me see what I couldn't see for years."</p>
        <span>Pattern18 user</span>
      </div>

      <style jsx>{`
        .container {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--warm-white);
          font-family: var(--sans);
          color: var(--charcoal);
        }
        .teal-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--teal);
        }
        .card {
          background: var(--warm-white);
          border: 1px solid var(--teal-border);
          border-radius: 20px;
          padding: 32px;
          max-width: 460px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(31, 41, 55, 0.06);
        }
        .header { text-align: center; margin-bottom: 20px; }
        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--teal);
          color: var(--warm-white);
          width: 54px;
          height: 54px;
          border-radius: 12px;
          font-family: var(--serif);
          font-weight: 800;
          font-size: 26px;
          margin-bottom: 14px;
        }
        .header h1 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 24px;
          color: var(--charcoal);
          margin-bottom: 4px;
        }
        .tagline {
          color: var(--charcoal-70);
          font-size: 14px;
        }
        .trial-badge {
          background: var(--teal-tint);
          border: 2px solid var(--teal);
          border-radius: 14px;
          padding: 14px;
          text-align: center;
          margin-bottom: 22px;
        }
        .trial-text {
          display: block;
          color: var(--deep-teal);
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .trial-price {
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 800;
          color: var(--charcoal);
        }
        .benefits h2 {
          font-size: 12px;
          color: var(--charcoal-70);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }
        .benefits ul { list-style: none; padding: 0; margin: 0 0 22px; }
        .benefits li { display: flex; gap: 10px; margin-bottom: 12px; }
        .check {
          color: var(--teal);
          font-weight: 800;
          font-size: 16px;
          margin-top: 1px;
        }
        .benefits li strong {
          display: block;
          color: var(--charcoal);
          font-size: 14px;
          margin-bottom: 2px;
        }
        .benefits li span {
          color: var(--charcoal-70);
          font-size: 13px;
          line-height: 1.5;
        }
        .pricing {
          background: var(--teal-tint);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 18px;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          color: var(--charcoal);
        }
        .price-row.future {
          border-top: 1px solid var(--teal-border);
          margin-top: 6px;
          padding-top: 14px;
          color: var(--charcoal-70);
          font-size: 14px;
        }
        .price-free {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 800;
          color: var(--teal);
        }
        .cancel-note {
          text-align: center;
          font-size: 12px;
          color: var(--charcoal-50);
          margin-top: 10px;
        }
        .cta-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 18px;
          background: var(--teal);
          color: var(--warm-white);
          border: none;
          border-radius: 14px;
          font-size: 17px;
          font-weight: 700;
          font-family: inherit;
          text-decoration: none;
          min-height: 52px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .cta-button:hover { background: var(--deep-teal); }
        .cta-button:disabled { opacity: 0.7; cursor: not-allowed; }
        .yearly-line {
          text-align: center;
          margin-top: 14px;
          color: var(--charcoal);
          font-size: 14px;
        }
        .yearly-link {
          background: none;
          border: none;
          padding: 0;
          color: var(--deep-teal);
          font-weight: 600;
          font-family: inherit;
          font-size: inherit;
          text-decoration: underline;
          cursor: pointer;
        }
        .yearly-link:disabled { opacity: 0.7; cursor: not-allowed; }
        .checkout-error {
          text-align: center;
          margin-top: 12px;
          padding: 12px;
          background: #ffebee;
          border-radius: 10px;
          color: #c62828;
          font-size: 13px;
        }
        .save { color: var(--coral); font-weight: 700; }
        .secure-note {
          text-align: center;
          font-size: 12px;
          color: var(--charcoal-50);
          margin-top: 14px;
        }
        .user-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid var(--teal-border);
          font-size: 13px;
          color: var(--charcoal-70);
        }
        .logout-btn {
          background: none;
          border: none;
          color: var(--coral);
          cursor: pointer;
          font-size: 13px;
          min-height: 32px;
        }
        .trust {
          margin-top: 22px;
          text-align: center;
          max-width: 320px;
        }
        .trust p {
          font-family: var(--serif);
          font-style: italic;
          color: var(--charcoal-70);
          font-size: 14px;
          margin-bottom: 4px;
        }
        .trust span {
          color: var(--charcoal-50);
          font-size: 12px;
        }
        @media (max-width: 480px) {
          .card { padding: 24px; }
          .trial-price { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}
