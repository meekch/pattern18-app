'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';

export default function ThankYouPage() {
  const router = useRouter();

  const steps = [
    {
      number: '1',
      title: 'Upload a screenshot',
      description: 'Paste a message from your co-parent and get instant analysis',
      href: '/coach',
    },
    {
      number: '2',
      title: 'Set up your case',
      description: 'Add your case details, court info, and key dates',
      href: '/case-setup',
    },
    {
      number: '3',
      title: 'Explore your dashboard',
      description: 'See patterns, timelines, and evidence at a glance',
      href: '/my-case',
    },
  ];

  return (
    <div className="container">
      <Script id="meta-conversion" strategy="afterInteractive">
        {`fbq('track', 'StartTrial');`}
      </Script>

      <div className="header">
        <div className="logo">18</div>
      </div>

      <div className="card">
        <div className="hero-badge">18</div>
        <h1>You're in. Let's build your case.</h1>
        <p className="subtitle">
          Your 7-day free trial is active. Every message you document makes your case stronger.
        </p>

        <div className="steps">
          {steps.map((step) => (
            <button
              key={step.number}
              className="step"
              onClick={() => router.push(step.href)}
            >
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </div>
              <div className="step-arrow">→</div>
            </button>
          ))}
        </div>

        <button
          className="cta"
          onClick={() => router.push('/coach')}
        >
          Get Started
        </button>
      </div>

      <style jsx>{`
        .container {
          min-height: 100dvh;
          background: linear-gradient(135deg, #EAF5F3 0%, #EAF5F3 50%, #FAFAF7 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header {
          width: 100%;
          padding: 20px 24px;
          display: flex;
          justify-content: center;
        }
        .logo {
          background: #2F9D94;
          color: #FAFAF7;
          padding: 10px 18px;
          border-radius: 10px;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: 0.02em;
        }
        .card {
          background: #FAFAF7;
          border: 1px solid #C7E4E0;
          border-radius: 20px;
          padding: 40px 32px;
          max-width: 480px;
          width: 100%;
          margin: 0 24px;
          box-shadow: 0 12px 40px rgba(31, 41, 55, 0.06);
          text-align: center;
        }
        .hero-badge {
          background: #2F9D94;
          color: #FAFAF7;
          width: 64px;
          height: 64px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 800;
          font-size: 30px;
          margin: 0 auto 20px;
        }
        h1 {
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 800;
          font-size: 28px;
          color: #1F2937;
          margin: 0 0 12px 0;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }
        .subtitle {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
          margin: 0 0 32px 0;
        }
        .steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          width: 100%;
        }
        .step:hover {
          background: #EAF5F3;
          border-color: #2F9D94;
        }
        .step-number {
          width: 32px;
          height: 32px;
          background: #2F9D94;
          color: #FAFAF7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
        }
        .step-content {
          flex: 1;
        }
        .step-content strong {
          display: block;
          font-size: 15px;
          color: #1F2937;
          margin-bottom: 2px;
        }
        .step-content span {
          font-size: 13px;
          color: #666;
        }
        .step-arrow {
          color: #2F9D94;
          font-size: 18px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .cta {
          width: 100%;
          padding: 16px;
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
        .cta:hover {
          background: #1A5F5A;
        }
        @media (max-width: 480px) {
          .card {
            padding: 32px 24px;
            margin: 0 16px;
          }
          h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}
