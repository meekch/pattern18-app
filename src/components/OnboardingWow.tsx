'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingWow({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [coparentName, setCoparentName] = useState('');
  const [courtDate, setCourtDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Save setup info if provided
      if (coparentName || courtDate) {
        setIsSubmitting(true);
        try {
          await supabase.from('case_context').upsert({
            user_id: userId,
            coparent_name: coparentName || null,
            next_court_date: courtDate || null,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } catch (e) {
          console.error('Failed to save setup:', e);
        }
        setIsSubmitting(false);
      }
      setStep(3);
    }
  };

  const handleSkipSetup = () => {
    setStep(3);
  };

  const handleFirstAction = async (action: string) => {
    // Mark onboarding complete
    try {
      await supabase.from('case_context').upsert({
        user_id: userId,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (e) {
      console.error('Failed to mark onboarding complete:', e);
    }
    
    // Complete onboarding and pass the action to parent
    onComplete();
    
    // Trigger the action in parent component via custom event
    window.dispatchEvent(new CustomEvent('onboarding-action', { detail: action }));
  };

  return (
    <div className="onboarding-container">
      {/* Progress dots */}
      <div className="progress-dots">
        <span className={`dot ${step >= 1 ? 'active' : ''}`} />
        <span className={`dot ${step >= 2 ? 'active' : ''}`} />
        <span className={`dot ${step >= 3 ? 'active' : ''}`} />
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="step step-welcome">
          <div className="welcome-icon">💚</div>
          <h1>You're not alone anymore.</h1>
          <p>
            I'm here 24/7 to help you navigate this. 
            Together, we'll document everything, stay calm, 
            and build your case—one message at a time.
          </p>
          <div className="tagline-mini">
            <span>Document.</span>
            <span>Breathe.</span>
            <span>Protect.</span>
          </div>
          <button className="continue-btn" onClick={handleContinue}>
            Let's get started →
          </button>
        </div>
      )}

      {/* Step 2: Quick Setup */}
      {step === 2 && (
        <div className="step step-setup">
          <div className="setup-icon">⚡</div>
          <h1>Quick setup</h1>
          <p className="setup-subtitle">This helps me personalize your experience (optional)</p>
          
          <div className="setup-fields">
            <div className="field">
              <label>What should I call your co-parent?</label>
              <input
                type="text"
                placeholder="e.g., Matt, their dad, ex"
                value={coparentName}
                onChange={(e) => setCoparentName(e.target.value)}
              />
            </div>
            
            <div className="field">
              <label>Do you have a court date coming up?</label>
              <input
                type="date"
                value={courtDate}
                onChange={(e) => setCourtDate(e.target.value)}
              />
            </div>
          </div>

          <button className="continue-btn" onClick={handleContinue} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Continue →'}
          </button>
          <button className="skip-btn" onClick={handleSkipSetup}>
            Skip for now
          </button>
        </div>
      )}

      {/* Step 3: First Action */}
      {step === 3 && (
        <div className="step step-action">
          <div className="action-icon">🚀</div>
          <h1>Let's see what I can do</h1>
          <p className="action-subtitle">Pick one to try right now:</p>
          
          <div className="first-actions">
            <button 
              className="first-action-btn"
              onClick={() => handleFirstAction('screenshot')}
            >
              <span className="action-emoji">📸</span>
              <div className="action-text">
                <strong>Upload a screenshot</strong>
                <span>I'll analyze it instantly</span>
              </div>
            </button>
            
            <button 
              className="first-action-btn"
              onClick={() => handleFirstAction('paste')}
            >
              <span className="action-emoji">📝</span>
              <div className="action-text">
                <strong>Paste a message</strong>
                <span>I'll decode what's really going on</span>
              </div>
            </button>
            
            <button 
              className="first-action-btn"
              onClick={() => handleFirstAction('court_order')}
            >
              <span className="action-emoji">📋</span>
              <div className="action-text">
                <strong>Upload a court order</strong>
                <span>I'll learn your rules & schedule</span>
              </div>
            </button>
          </div>

          <button className="explore-btn" onClick={() => handleFirstAction('explore')}>
            Just let me explore first
          </button>
        </div>
      )}

      <style jsx>{`
        .onboarding-container {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f5f7f6 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .progress-dots {
          position: absolute;
          top: 40px;
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d1d5db;
          transition: all 0.3s ease;
        }

        .dot.active {
          background: #14b8a6;
          width: 24px;
          border-radius: 4px;
        }

        .step {
          max-width: 440px;
          width: 100%;
          text-align: center;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Step 1: Welcome */
        .welcome-icon {
          font-size: 64px;
          margin-bottom: 24px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .step-welcome h1 {
          font-size: 32px;
          color: #1a3a2f;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .step-welcome p {
          font-size: 18px;
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .tagline-mini {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .tagline-mini span {
          color: #14b8a6;
          font-weight: 600;
          font-size: 14px;
        }

        .continue-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 16px 48px;
          border-radius: 30px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .continue-btn:hover {
          background: #2d5a4a;
          transform: translateY(-2px);
        }

        .continue-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Step 2: Setup */
        .setup-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .step-setup h1 {
          font-size: 28px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }

        .setup-subtitle {
          color: #6b7280;
          margin-bottom: 32px;
        }

        .setup-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 32px;
        }

        .field {
          text-align: left;
        }

        .field label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .field input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .field input:focus {
          outline: none;
          border-color: #14b8a6;
        }

        .skip-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 15px;
          cursor: pointer;
          margin-top: 16px;
          padding: 8px;
        }

        .skip-btn:hover {
          color: #374151;
        }

        /* Step 3: First Action */
        .action-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .step-action h1 {
          font-size: 28px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }

        .action-subtitle {
          color: #6b7280;
          margin-bottom: 24px;
        }

        .first-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .first-action-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .first-action-btn:hover {
          border-color: #14b8a6;
          background: #f0fdfa;
          transform: translateX(4px);
        }

        .action-emoji {
          font-size: 32px;
        }

        .action-text {
          display: flex;
          flex-direction: column;
        }

        .action-text strong {
          color: #1a3a2f;
          font-size: 16px;
        }

        .action-text span {
          color: #6b7280;
          font-size: 14px;
        }

        .explore-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 15px;
          cursor: pointer;
          padding: 8px;
        }

        .explore-btn:hover {
          color: #14b8a6;
        }

        @media (max-width: 480px) {
          .step-welcome h1 {
            font-size: 26px;
          }

          .step-welcome p {
            font-size: 16px;
          }

          .tagline-mini {
            flex-direction: column;
            gap: 8px;
          }

          .first-action-btn {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}