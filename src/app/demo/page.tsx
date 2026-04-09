'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import DemoConcierge from '@/components/DemoConcierge';

function DemoContent() {
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Capture UTM params into sessionStorage (only if present)
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    if (utmSource) sessionStorage.setItem('utm_source', utmSource);
    if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium);
    if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);

    // Capture referrer on first load
    if (document.referrer && !sessionStorage.getItem('referrer')) {
      sessionStorage.setItem('referrer', document.referrer);
    }

    if (sessionStorage.getItem('demo_authorized') === 'true') {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    const key = searchParams.get('key');
    if (key) {
      verifyKey(key);
    } else {
      setChecking(false);
    }
  }, [searchParams]);

  const verifyKey = async (key: string) => {
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/demo/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        sessionStorage.setItem('demo_authorized', 'true');
        setAuthorized(true);
      } else {
        setError('Invalid access key.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setVerifying(false);
    setChecking(false);
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    verifyKey(passcode.trim());
  };

  if (checking) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <div className="gate">
          <div className="gate-loading">Verifying access...</div>
          <style jsx>{gateStyles}</style>
        </div>
      </>
    );
  }

  if (!authorized) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <div className="gate">
          <div className="gate-card">
            <div className="gate-badge">Private Preview</div>
            <h1>Luméa Medical Aesthetics</h1>
            <p>Enter your access code to view this demo.</p>
            <form onSubmit={handlePasscodeSubmit}>
              <input
                type="text"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Access code"
                autoFocus
                disabled={verifying}
              />
              {error && <div className="gate-error">{error}</div>}
              <button type="submit" disabled={verifying || !passcode.trim()}>
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          </div>
          <style jsx>{gateStyles}</style>
        </div>
      </>
    );
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <div className="demo-page">
        <div className={`hero ${started ? 'hero-hidden' : ''}`}>
          <div className="hero-content">
            <div className="hero-badge">Private Preview</div>
            <h1>Luméa Medical Aesthetics</h1>
            <h2>Consultation Concierge</h2>
            <p>
              A private prototype experience that captures, qualifies, and confirms
              consultation requests with calm, polished guidance.
            </p>
            <button className="cta" onClick={() => setStarted(true)}>
              Start Consultation
            </button>
          </div>
        </div>

        <div className={`chat-wrapper ${started ? 'chat-visible' : ''}`}>
          <div className="chat-header">
            <div className="header-brand">
              <span className="chat-logo">Luméa Medical Aesthetics</span>
              <span className="chat-label">Private Consultation Concierge</span>
            </div>
          </div>
          {started && <div className="chat-body"><DemoConcierge /></div>}
        </div>

        <style jsx>{`
          .demo-page {
            min-height: 100vh;
            background: #F7F6F3;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            position: relative;
            overflow-x: hidden;
          }
          .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px 24px;
            opacity: 1;
            transition: opacity 400ms ease-in-out;
            position: relative;
            z-index: 2;
          }
          .hero-hidden {
            opacity: 0;
            pointer-events: none;
            position: absolute;
            inset: 0;
          }
          .hero-content {
            max-width: 520px;
          }
          .hero-badge {
            display: inline-block;
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #5A5A5A;
            border: 1px solid #E7E2DA;
            padding: 6px 16px;
            border-radius: 20px;
            margin-bottom: 32px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          h1 {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 42px;
            font-weight: 500;
            color: #232323;
            margin: 0 0 8px 0;
            letter-spacing: -0.3px;
            line-height: 1.2;
          }
          h2 {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            font-weight: 400;
            color: #5A5A5A;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin: 0 0 28px 0;
          }
          p {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #5A5A5A;
            margin: 0 0 40px 0;
            letter-spacing: 0.01em;
          }
          .cta {
            padding: 16px 40px;
            background: #C7B8A3;
            color: #FFFFFF;
            border: none;
            border-radius: 32px;
            font-size: 15px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 500;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.3s;
          }
          .cta:hover {
            background: #B7A48C;
            transform: translateY(-1px);
          }
          .chat-wrapper {
            min-height: 100vh;
            opacity: 0;
            transition: opacity 400ms ease-in-out 100ms;
            display: flex;
            flex-direction: column;
          }
          .chat-visible {
            opacity: 1;
          }
          .chat-body {
            flex: 1;
          }
          .chat-header {
            padding: 18px 24px;
            border-bottom: 1px solid #E7E2DA;
            background: #FFFFFF;
            flex-shrink: 0;
          }
          .header-brand {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .chat-logo {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 20px;
            font-weight: 600;
            color: #232323;
            letter-spacing: 0.3px;
          }
          .chat-label {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11px;
            color: #5A5A5A;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          @media (max-width: 480px) {
            h1 { font-size: 34px; }
            h2 { font-size: 12px; }
            p { font-size: 14px; }
            .cta { width: 100%; }
            .chat-logo { font-size: 18px; }
          }
        `}</style>
      </div>
    </>
  );
}

const gateStyles = `
  .gate {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F7F6F3;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 24px;
  }
  .gate-loading {
    font-size: 14px;
    color: #5A5A5A;
    letter-spacing: 0.5px;
  }
  .gate-card {
    text-align: center;
    max-width: 380px;
    width: 100%;
  }
  .gate-badge {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #5A5A5A;
    border: 1px solid #E7E2DA;
    padding: 6px 16px;
    border-radius: 20px;
    margin-bottom: 24px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .gate-card h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 32px;
    font-weight: 500;
    color: #232323;
    margin: 0 0 12px 0;
    letter-spacing: -0.3px;
  }
  .gate-card p {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 15px;
    color: #5A5A5A;
    margin: 0 0 28px 0;
    line-height: 1.5;
  }
  .gate-card form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .gate-card input {
    padding: 14px 16px;
    border: 1px solid #E7E2DA;
    border-radius: 12px;
    font-size: 15px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #232323;
    background: #FFFFFF;
    outline: none;
    text-align: center;
    letter-spacing: 1px;
    transition: border-color 0.2s;
  }
  .gate-card input:focus {
    border-color: #C7B8A3;
  }
  .gate-card input::placeholder {
    color: #9A948B;
    letter-spacing: 0.5px;
  }
  .gate-error {
    font-size: 13px;
    color: #B44;
  }
  .gate-card button {
    padding: 14px 24px;
    background: #C7B8A3;
    color: #FFFFFF;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }
  .gate-card button:hover:not(:disabled) {
    background: #B7A48C;
  }
  .gate-card button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F6F3',
        color: '#5A5A5A',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: '14px',
      }}>
        Loading...
      </div>
    }>
      <DemoContent />
    </Suspense>
  );
}
