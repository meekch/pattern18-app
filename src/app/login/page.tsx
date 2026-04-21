"use client";

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [showPromoField, setShowPromoField] = useState(false)
  
  // Dynamic pricing message based on promo code
  const getPricingMessage = () => {
    const code = promoCode.toUpperCase().trim();
    if (code === 'HEALING') {
      return 'Free access for beta testers.';
    } else if (code === 'BETA50' || code === 'COUNTER') {
      return '7 days free, then 50% off. Cancel anytime.';
    } else if (promoCode.trim()) {
      return 'Discount will be applied at checkout.';
    }
    return '7 days free, then billed monthly. Cancel anytime.';
  }
  
  // Dynamic headline
  const getHeadline = () => {
    const code = promoCode.toUpperCase().trim();
    if (code === 'HEALING') {
      return 'Welcome, Beta Tester';
    }
    return 'Start Your Free Trial';
  }
  
  // Dynamic button text
  const getButtonText = () => {
    const code = promoCode.toUpperCase().trim();
    if (code === 'HEALING') {
      return 'Get Free Access';
    }
    return 'Start 7-Day Free Trial';
  }
  const [loading, setLoading] = useState(false)
  const [loadingState, setLoadingState] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  // Handle URL params (canceled checkout, promo codes in URL)
  useEffect(() => {
    const canceled = searchParams.get('canceled')
    const code = searchParams.get('code')
    
    if (canceled === 'true') {
      setError('Checkout was canceled. Ready to try again when you are.')
      setMode('signup')
    }
    
    if (code) {
      setPromoCode(code)
      setShowPromoField(true)
      setMode('signup')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingState('Signing in...')
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      setLoadingState('')
    } else if (data.session) {
      // Middleware handles subscription check — redirects to /subscribe if needed
      router.push('/coach')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingState('Creating your account...')
    setError(null)

    // First create the auth user with password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      setLoadingState('')
      return
    }

    // Send welcome email (fire and forget)
    fetch('/api/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).catch(err => console.error('Welcome email failed:', err))

    // Then redirect to Stripe checkout
    try {
      setLoadingState('Preparing secure checkout...')

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          promoCode: promoCode.trim() || undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Stripe checkout API error:', response.status, data)
        setError(data.error || 'Failed to start checkout. Please try again.')
        setLoading(false)
        setLoadingState('')
        return
      }

      if (data.url) {
        setLoadingState('Redirecting to checkout...')
        window.location.href = data.url
      } else {
        console.error('Stripe checkout returned no URL:', data)
        setError(data.error || 'Something went wrong setting up checkout.')
        setLoading(false)
        setLoadingState('')
      }
    } catch (err) {
      console.error('Stripe checkout fetch failed:', err)
      setError('Failed to start checkout. Please try again.')
      setLoading(false)
      setLoadingState('')
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email first')
      return
    }
    setLoading(true)
    setLoadingState('Sending reset link...')
    setError(null)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    
    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for password reset link')
    }
    setLoading(false)
    setLoadingState('')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAF7',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: '#FAFAF7',
        border: '1px solid #C7E4E0',
        borderRadius: '20px',
        padding: '40px 32px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 12px 40px rgba(31,41,55,0.06)'
      }}>
        <div style={{
          background: '#2F9D94',
          color: '#FAFAF7',
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 800,
          fontSize: '26px',
          margin: '0 auto 20px'
        }}>18</div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '28px', marginBottom: '8px', color: '#1F2937', letterSpacing: '-0.01em' }}>
          {mode === 'login' ? 'Welcome back' : getHeadline()}
        </h1>
        <p style={{ color: '#1F2937', opacity: 0.7, marginBottom: '28px' }}>
          {mode === 'login'
            ? 'Sign in to access your coach.'
            : getPricingMessage()}
        </p>

        {/* Login/Signup Toggle */}
        <div style={{
          display: 'flex',
          background: '#f5f5f5',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setMessage(null); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '10px',
              background: mode === 'login' ? 'white' : 'transparent',
              fontWeight: mode === 'login' ? '600' : '400',
              color: mode === 'login' ? '#1F2937' : '#666',
              cursor: 'pointer',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '10px',
              background: mode === 'signup' ? 'white' : 'transparent',
              fontWeight: mode === 'signup' ? '600' : '400',
              color: mode === 'signup' ? '#1F2937' : '#666',
              cursor: 'pointer',
              boxShadow: mode === 'signup' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none',
              opacity: loading ? 0.7 : 1
            }}
          />
          
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                marginBottom: '8px',
                boxSizing: 'border-box',
                outline: 'none',
                opacity: loading ? 0.7 : 1
              }}
            />
            {mode === 'signup' && (
              <p style={{ 
                fontSize: '12px', 
                color: '#999', 
                textAlign: 'left',
                marginBottom: '16px',
                marginTop: '0'
              }}>
                At least 6 characters
              </p>
            )}
          </div>

          {/* Promo Code Section - Signup Only */}
          {mode === 'signup' && (
            <div style={{ marginBottom: '16px' }}>
              {!showPromoField ? (
                <button
                  type="button"
                  onClick={() => setShowPromoField(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2F9D94',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '8px 0'
                  }}
                >
                  Have a promo code?
                </button>
              ) : (
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: '16px',
                    border: '2px solid #2F9D94',
                    borderRadius: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: '#EAF5F3',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    opacity: loading ? 0.7 : 1
                  }}
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#9ca3af' : '#2F9D94',
              color: '#FAFAF7',
              border: 'none',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: 700,
              minHeight: '52px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            {loading
              ? loadingState || 'Loading...'
              : mode === 'signup'
                ? getButtonText()
                : 'Sign In'}
          </button>
        </form>

        {/* Forgot password */}
        {mode === 'login' && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#2F9D94',
              cursor: 'pointer',
              marginTop: '16px',
              fontSize: '14px'
            }}
          >
            Forgot password?
          </button>
        )}

        {message && (
          <p style={{
            marginTop: '20px',
            padding: '16px',
            background: '#EAF5F3',
            borderRadius: '12px',
            color: '#2e7d32'
          }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{
            marginTop: '20px',
            padding: '16px',
            background: '#ffebee',
            borderRadius: '12px',
            color: '#c62828'
          }}>
            {error}
          </p>
        )}

        <p style={{ marginTop: '24px', fontSize: '14px', color: '#999' }}>
          {mode === 'login'
            ? "Enter your email and password to sign in."
            : promoCode.toUpperCase().trim() === 'HEALING'
              ? "Complete signup to activate your free beta access."
              : "You'll be redirected to secure checkout. No charge for 7 days."}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAF7',
      }}>
        <div style={{
          background: '#2F9D94',
          color: '#FAFAF7',
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 800,
          fontSize: '26px'
        }}>18</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
