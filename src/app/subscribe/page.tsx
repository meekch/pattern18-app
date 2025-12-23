'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Check if already subscribed
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('email', session.user.email?.toLowerCase())
        .in('status', ['active', 'trialing'])
        .single();

      if (subscription) {
        router.push('/coach');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    init();
  }, [router]);

  const handleCheckout = async () => {
    if (!user) return;
    setCheckoutLoading(true);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          promoCode: promoCode || undefined,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error creating checkout session');
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating checkout session');
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
          <div className="loading-icon">💚</div>
          <p>Loading...</p>
        </div>
        <style jsx>{`
          .container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f5f7f6 100%);
          }
          .loading {
            text-align: center;
          }
          .loading-icon {
            font-size: 48px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <div className="header">
          <div className="logo">18</div>
          <h1>Pattern 18 Coach</h1>
          <p className="tagline">Your 24/7 Strategic Partner</p>
        </div>

        {/* Trial Badge */}
        <div className="trial-badge">
          <span className="trial-text">7-DAY FREE TRIAL</span>
          <span className="trial-price">$0 today</span>
        </div>

        {/* What You Get */}
        <div className="benefits">
          <h2>What's included:</h2>
          <ul>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>24/7 AI Coach</strong>
                <span>Analyze messages, draft responses, get support anytime</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Pattern Recognition</strong>
                <span>Instantly identify manipulation tactics</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Evidence Documentation</strong>
                <span>Build your case with organized, timestamped records</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Court Document Generation</strong>
                <span>Create declarations, timelines, and exhibits</span>
              </div>
            </li>
            <li>
              <span className="check">✓</span>
              <div>
                <strong>Healing & Grounding Tools</strong>
                <span>Breathing exercises, affirmations, and support</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Pricing */}
        <div className="pricing">
          <div className="price-row">
            <span>Today</span>
            <span className="price-free">$0.00</span>
          </div>
          <div className="price-row future">
            <span>After 7 days</span>
            <span>$89/month</span>
          </div>
          <p className="cancel-note">Cancel anytime. No questions asked.</p>
        </div>

        {/* Promo Code */}
        {!showPromo ? (
          <button className="promo-toggle" onClick={() => setShowPromo(true)}>
            Have a promo code?
          </button>
        ) : (
          <div className="promo-input">
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            />
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="cta-button"
        >
          {checkoutLoading ? (
            'Loading...'
          ) : (
            <>Start My Free Trial →</>
          )}
        </button>

        <p className="secure-note">🔒 Secure checkout powered by Stripe</p>

        {/* User Info */}
        <div className="user-info">
          <span>Signed in as {user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Sign out
          </button>
        </div>
      </div>

      {/* Trust Elements */}
      <div className="trust">
        <p>"This tool helped me see what I couldn't see for years."</p>
        <span>— Pattern 18 User</span>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f5f7f6 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .card {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }

        .header {
          text-align: center;
          margin-bottom: 24px;
        }

        .logo {
          display: inline-block;
          background: #1a3a2f;
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 24px;
          margin-bottom: 16px;
        }

        .header h1 {
          font-size: 24px;
          color: #1a3a2f;
          margin-bottom: 4px;
        }

        .tagline {
          color: #666;
          font-size: 14px;
        }

        .trial-badge {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 2px solid #10b981;
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          margin-bottom: 24px;
        }

        .trial-text {
          display: block;
          color: #059669;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .trial-price {
          font-size: 32px;
          font-weight: 700;
          color: #1a3a2f;
        }

        .benefits h2 {
          font-size: 14px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }

        .benefits ul {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
        }

        .benefits li {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }

        .check {
          color: #10b981;
          font-weight: 700;
          font-size: 16px;
          margin-top: 2px;
        }

        .benefits li strong {
          display: block;
          color: #1a3a2f;
          font-size: 15px;
        }

        .benefits li span {
          color: #666;
          font-size: 13px;
        }

        .pricing {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .price-row.future {
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 16px;
          color: #666;
          font-size: 14px;
        }

        .price-free {
          font-size: 24px;
          font-weight: 700;
          color: #10b981;
        }

        .cancel-note {
          text-align: center;
          font-size: 12px;
          color: #888;
          margin-top: 12px;
        }

        .promo-toggle {
          background: none;
          border: none;
          color: #14b8a6;
          font-size: 14px;
          cursor: pointer;
          width: 100%;
          padding: 8px;
          margin-bottom: 16px;
        }

        .promo-input {
          margin-bottom: 16px;
        }

        .promo-input input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 16px;
          text-align: center;
          letter-spacing: 2px;
        }

        .promo-input input:focus {
          outline: none;
          border-color: #14b8a6;
        }

        .cta-button {
          width: 100%;
          padding: 18px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cta-button:hover:not(:disabled) {
          background: #2d5a4a;
          transform: translateY(-2px);
        }

        .cta-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .secure-note {
          text-align: center;
          font-size: 12px;
          color: #888;
          margin-top: 12px;
        }

        .user-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 13px;
          color: #888;
        }

        .logout-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 13px;
        }

        .trust {
          margin-top: 24px;
          text-align: center;
          max-width: 300px;
        }

        .trust p {
          font-style: italic;
          color: #666;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .trust span {
          color: #888;
          font-size: 12px;
        }

        @media (max-width: 480px) {
          .card {
            padding: 24px;
          }

          .trial-price {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}