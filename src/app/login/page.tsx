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

      if (data.url) {
        setLoadingState('Redirecting to checkout...')
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        setLoadingState('')
      }
    } catch (err) {
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
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💚</div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#1a3a2f' }}>
          {mode === 'login' ? 'Welcome Back' : 'Start Your Free Trial'}
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          {mode === 'login'
            ? 'Sign in to access your coach'
            : '7 days free, then $89/month. Cancel anytime.'}
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
              color: mode === 'login' ? '#1a3a2f' : '#666',
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
              color: mode === 'signup' ? '#1a3a2f' : '#666',
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
                    color: '#2dd4a8',
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
                    border: '2px solid #2dd4a8',
                    borderRadius: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: '#f0fdf4',
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
              background: loading ? '#ccc' : 'linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading
              ? loadingState || 'Loading...'
              : mode === 'signup'
                ? 'Start 7-Day Free Trial'
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
              color: '#2dd4a8',
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
            background: '#e8f5e9',
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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1f18 0%, #1a3a2f 100%)',
      }}>
        <div style={{ fontSize: '48px' }}>💚</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}