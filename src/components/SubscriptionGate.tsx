import { useState } from 'react'

interface SubscriptionGateProps {
  status: 'canceled' | 'past_due' | 'expired' | string
  email: string
}

export default function SubscriptionGate({ status, email }: SubscriptionGateProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleStartTrial = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Stripe checkout API error:', res.status, data)
        setError(data.error || 'Failed to start checkout. Please try again.')
        setLoading(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Stripe checkout returned no URL:', data)
        setError(data.error || 'Something went wrong setting up checkout.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Checkout fetch failed:', err)
      setError('Failed to connect to checkout. Please try again.')
      setLoading(false)
    }
  }

  const getContent = () => {
    switch (status) {
      case 'past_due':
        return {
          icon: '⚠️',
          title: 'Payment Issue',
          message: 'We could not process your last payment. Please update your payment method to continue using Pattern18.',
          primaryAction: 'Update Payment Method',
          primaryHandler: handleManageSubscription,
        }
      case 'canceled':
        return {
          icon: '',
          title: 'We Miss You',
          message: 'Your subscription has ended, but your account and conversation history are still here whenever you are ready to come back.',
          primaryAction: 'Resubscribe',
          primaryHandler: handleManageSubscription,
        }
      default:
        return {
          icon: '',
          title: 'Subscription Required',
          message: 'Start your 7-day free trial to access your 24/7 strategic partner for navigating high-conflict co-parenting.',
          primaryAction: 'Start Free Trial',
          primaryHandler: handleStartTrial,
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
        <button onClick={content.primaryHandler} disabled={loading} className="primary-btn">
          {loading ? 'Loading...' : content.primaryAction}
        </button>
        {error && <p className="error-msg">{error}</p>}
        {status === 'canceled' && (
          <p className="note">
            Questions? Email us at <a href="mailto:hello@pattern18.com">hello@pattern18.com</a>
          </p>
        )}
        <div className="features">
          <h3>What you get with Pattern18:</h3>
          <ul>
            <li>24/7 AI coaching for high-conflict situations</li>
            <li>Recognize manipulation patterns instantly</li>
            <li>Craft strategic responses (or know when silence wins)</li>
            <li>Document incidents for court</li>
            <li>Create legal documents</li>
            <li>Breathing exercises and emotional regulation tools</li>
          </ul>
        </div>
      </div>
      <style jsx>{`
        .gate-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #FAFAF7 0%, #EAF5F3 100%);
          padding: 24px;
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
          color: #1F2937;
          margin: 0 0 16px 0;
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
          background: #2F9D94;
          color: #FAFAF7;
          border: none;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 700;
          min-height: 52px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .primary-btn:hover:not(:disabled) {
          background: #1A5F5A;
        }
        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .error-msg {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin: 16px 0 0 0;
          text-align: center;
        }
        .note {
          font-size: 14px;
          color: #999;
          margin: 24px 0 0 0;
        }
        .note a {
          color: #2dd4a8;
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
      `}</style>
    </div>
  )
}