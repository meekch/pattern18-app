"use client";

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Handle the recovery token from the URL
    const handleRecovery = async () => {
      try {
        // Check for hash params (Supabase sometimes puts tokens there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'recovery') {
          // Set the session from the recovery tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          
          if (error) {
            setError('Invalid or expired reset link. Please request a new one.')
            setLoading(false)
            return
          }
          
          setSessionReady(true)
          setLoading(false)
          return
        }

        // Also check query params
        const queryParams = new URLSearchParams(window.location.search)
        const code = queryParams.get('code')
        
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setError('Invalid or expired reset link. Please request a new one.')
            setLoading(false)
            return
          }
          setSessionReady(true)
          setLoading(false)
          return
        }

        // Check if there's already a session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
          setLoading(false)
          return
        }

        // Listen for auth state changes (recovery event)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            setSessionReady(true)
            setLoading(false)
          }
        })

        // Give it a moment, then show error if still no session
        setTimeout(() => {
          if (!sessionReady) {
            setError('No valid reset session found. Please request a new password reset link.')
            setLoading(false)
          }
        }, 3000)

        return () => subscription.unsubscribe()
      } catch (err) {
        console.error('Recovery error:', err)
        setError('Something went wrong. Please try again.')
        setLoading(false)
      }
    }

    handleRecovery()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setUpdating(true)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
      setUpdating(false)
    } else {
      setMessage("Password updated! Redirecting to login...")
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1f18 0%, #1a3a2f 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <p>Verifying reset link...</p>
        </div>
      </div>
    )
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#1a3a2f' }}>
          Reset Password
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          {sessionReady ? 'Enter your new password below.' : 'There was a problem with your reset link.'}
        </p>

        {sessionReady ? (
          <form onSubmit={handleReset}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
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
            
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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
              disabled={updating}
              style={{
                width: '100%',
                padding: '16px',
                background: updating ? '#ccc' : 'linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: updating ? 'not-allowed' : 'pointer'
              }}
            >
              {updating ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Request New Reset Link
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

        <button
          onClick={() => router.push('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: '#2dd4a8',
            cursor: 'pointer',
            marginTop: '24px',
            fontSize: '14px'
          }}
        >
          Back to login
        </button>
      </div>
    </div>
  )
}