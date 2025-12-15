'use client'

import { useState } from 'react'

interface SubscriptionGateProps {
  status: 'canceled' | 'past_due' | 'expired' | string
  email: string
}

export default function SubscriptionGate({ status, email }: SubscriptionGateProps) {
  const [loading, setLoading] = useState(false)

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error opening portal:', error)
    }
    setLoading(false)
  }

  const handleNewSubscription = () => {
    window.location.href = '/login?tab=signup'
  }

  const getContent = () => {
    switch (status) {
      case 'past_due':
        return {
          icon: '⚠️',
          title: 'Payment Issue',
          message: 'We couldn\'t process your last payment. Please update your payment method to continue using Pattern 18.',
          primaryAction: 'Update Payment Method',
          primaryHandler: handleManageSubscription,
        }
      case 'canceled':
        return {
          icon: '💚',
          title: 'We Miss You',
          message: 'Your subscription has ended, but your account and conversation history are still here whenever you\'re ready to come back.',
          primaryAction: 'Resubscribe',
          primaryHandler: handleManageSubscription,
        }
      default:
        return {
          icon: '💚',
          title: 'Subscription Required',
          message: 'Start your 7-day free trial to access your 24/7 strategic partner for navigating high-conflict co-parenting.',
          primaryAction: 'Start Free Trial',
          primaryHandler: handleNewSubscription,
        }
    }
  }

  const content = getContent()

  return (
    <div className="gate-container">
      <div className="gate-card">
        <div className="gate-icon">{content.icon}</div>
        <h1>{content.title}</h1>
        <p>{content.message}</p>
        
        <button 
          onClick={content.primaryHandler} 
          disabled={loading}
          className="primary-btn"
        >
          {loading ? 'Loading...' : content.primaryAction}
        </button>

        {status === 'canceled' && (
          <p className="note">
            Questions? Email us at <a href="mailto:hello@pattern18.com">hello@pattern18.com</a>
          </p>
        )}

        <div className="features">
          <h3>What you get with Pattern 18:</h3>
          <ul>
            <li>✓ 24/7 AI coaching for high-conflict situations</li>
            <li>✓ Recognize manipulation patterns instantly</li>
            <li>✓ Craft strategic responses (or know when silence wins)</li>
            <li>✓ Document incidents for court</li>
            <li>✓ Create legal documents</li>
            <li>✓ Breathing exercises & emotional regulation tools</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .gate-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f5f7f6 0%, #e8f5e9 100%);
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .gate-card {
          background: white;
          border-radius: 24px;
          max-width: 480px;
          width: 100%;
          padding: 48px 40px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }

        .gate-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }

        h1 {
          font-size: 28px;
          color: #1a3a2f;
          margin: 0 0 16px 0;
          font-weight: 700;
        }

        p {
          font-size: 16px;
          color: #666;
          line-height: 1.6;
          margin: 0 0 32px 0;
        }

        .primary-btn {
          width: 100%;
          padding: 18px 32px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26, 58, 47, 0.3);
        }

        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .note {
          font-size: 14px;
          color: #999;
          margin: 24px 0 0 0;
        }

        .note a {
          color: #2dd4a8;
          text-decoration: none;
        }

        .note a:hover {
          text-decoration: underline;
        }

        .features {
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid #eee;
          text-align: left;
        }

        .features h3 {
          font-size: 14px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 20px 0;
          text-align: center;
        }

        .features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features li {
          padding: 10px 0;
          font-size: 15px;
          color: #444;
          border-bottom: 1px solid #f5f5f5;
        }

        .features li:last-child {
          border-bottom: none;
        }

        @media (max-width: 500px) {
          .gate-card {
            padding: 32px 24px;
          }

          .gate-icon {
            font-size: 48px;
          }

          h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  )
}