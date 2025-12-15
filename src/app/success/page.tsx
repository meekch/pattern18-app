'use client'

export default function SuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1f18 0%, #1a3a2f 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
        <h1 style={{ fontSize: '28px', marginBottom: '12px', color: '#1a3a2f' }}>
          Welcome to Pattern 18!
        </h1>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '17px', lineHeight: '1.6' }}>
          Your 7-day free trial has started. Check your email for a magic link to access your coach.
        </p>
        
        <div style={{
          background: '#e8f5e9',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <p style={{ color: '#2e7d32', fontWeight: '600', marginBottom: '8px' }}>
            📬 Check your inbox
          </p>
          <p style={{ color: '#666', fontSize: '15px' }}>
            Click the magic link to log in — no password needed.
          </p>
        </div>

        <p style={{ color: '#999', fontSize: '14px' }}>
          Didn't get it? Check your spam folder or{' '}
          <a href="/login" style={{ color: '#14b8a6', textDecoration: 'none' }}>
            request a new link
          </a>
        </p>
      </div>
    </div>
  )
}