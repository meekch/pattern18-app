"use client";

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
// ... rest of file

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
            ? 'Enter your email to sign in' 
            : '7 days free, then $89/month. Cancel anytime.'}
        </p>

        <div style={{
          display: 'flex',
          background: '#f5f5f5',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setMode('login')}
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
            onClick={() => setMode('signup')}
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
              : mode === 'login' 
                ? 'Send Magic Link' 
                : 'Start 7-Day Free Trial'}
          </button>
        </form>

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
            ? "We'll email you a magic link for password-free sign in."
            : "You'll be taken to secure checkout. No charge for 7 days."}
        </p>
      </div>
    </div>
  )
}