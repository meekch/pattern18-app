"use client";

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      router.push('/coach')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // First create the auth user with password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Then redirect to Stripe checkout
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch (err) {
      setError('Failed to start checkout')
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email first')
      return
    }
    setLoading(true)
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
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />

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
              ? 'Loading...'
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
            : "Create your account, then complete checkout. No charge for 7 days."}
        </p>
      </div>
    </div>
  )
}