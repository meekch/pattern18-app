'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
        // Already subscribed, go to coach
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
        <div className="loading">Loading...</div>
        <style jsx>{`
          .container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f7f6;
          }
          .loading {
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="logo">18</div>
        <h1>One more step</h1>
        <p className="subtitle">Start your subscription to access Pattern 18 Coach</p>

        <div className="plan-box">
          <div className="plan-header">
            <span className="plan-name">Pattern 18 Coach</span>
            <span className="plan-price">
              $89
              <span className="plan-period">/month</span>
            </span>
          </div>
          <ul className="features">
            <li>✓ Unlimited message analysis</li>
            <li>✓ Pattern detection & documentation</li>
            <li>✓ Court document generation</li>
            <li>✓ Response drafting</li>
            <li>✓ Healing & regulation tools</li>
            <li>✓ Cancel anytime</li>
          </ul>
        </div>

        <p className="promo-note">Have a promo code? You can enter it on the next screen.</p>

        <button 
          onClick={handleCheckout} 
          disabled={checkoutLoading}
          className="checkout-btn"
        >
          {checkoutLoading ? 'Loading...' : 'Continue to Payment'}
        </button>

        <button onClick={handleLogout} className="logout-link">
          Log out
        </button>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .logo {
          width: 50px;
          height: 50px;
          background: #1a3a2f;
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          margin: 0 auto 20px;
        }
        h1 {
          color: #1a3a2f;
          font-size: 24px;
          margin: 0 0 8px;
        }
        .subtitle {
          color: #666;
          margin: 0 0 30px;
          font-size: 15px;
        }
        .plan-box {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: left;
        }
        .plan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        .plan-name {
          font-weight: 600;
          color: #1a3a2f;
        }
        .plan-price {
          font-size: 20px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .plan-period {
          font-size: 14px;
          font-weight: 400;
          color: #666;
        }
        .features {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .features li {
          padding: 6px 0;
          color: #4b5563;
          font-size: 14px;
        }
        .promo-note {
          color: #666;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .checkout-btn {
          width: 100%;
          padding: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 16px;
        }
        .checkout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .logout-link {
          background: none;
          border: none;
          color: #666;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}