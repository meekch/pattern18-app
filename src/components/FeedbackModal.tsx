'use client';

import { useState } from 'react';

interface FeedbackModalProps {
  pathname?: string | null;
  onClose: () => void;
}

type FeedbackType = 'general' | 'bug' | 'feature' | 'idea';

const TYPE_OPTIONS: Array<{ id: FeedbackType; icon: string; label: string; placeholder: string }> = [
  { id: 'general', icon: '💬', label: 'General',     placeholder: "What's working? What could be better?" },
  { id: 'bug',     icon: '🐛', label: 'Bug',         placeholder: 'Tell me what broke. Steps if you remember them.' },
  { id: 'feature', icon: '✨', label: 'Feature',     placeholder: 'What would make Pattern18 more useful for you?' },
  { id: 'idea',    icon: '💡', label: 'Idea',        placeholder: 'Share a prompt, workflow, or anything else on your mind.' },
];

export default function FeedbackModal({ pathname, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('general');
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: text.trim(),
          pathname: pathname ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send feedback. Please try again.');
        setLoading(false);
        return;
      }
      setSubmitted(true);
      setLoading(false);
    } catch {
      setError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  };

  const currentOption = TYPE_OPTIONS.find(o => o.id === type)!;

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="success-view">
            <div className="success-icon">✓</div>
            <h2>Thanks.</h2>
            <p>Your note went straight to me. Every &ldquo;I wish it did this&rdquo; shapes what reaches the next survivor faster.</p>
            <button onClick={onClose} className="close-btn">Done</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Send feedback</h2>
              <button onClick={onClose} className="x-btn" aria-label="Close">✕</button>
            </div>
            <p className="modal-subtitle">Quick async note, that&rsquo;s it. No reply expected.</p>

            <div className="type-selector">
              {TYPE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setType(option.id)}
                  className={`type-btn ${type === option.id ? 'active' : ''}`}
                >
                  <span className="type-icon">{option.icon}</span>
                  <span className="type-label">{option.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={currentOption.placeholder}
              className="feedback-input"
              rows={5}
              maxLength={4000}
            />

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="submit-btn"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>

            {error && <p className="error-note">{error}</p>}

            <p className="privacy-note">
              🔒 Only the founder reads this.
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .feedback-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 31, 24, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .feedback-modal {
          background: white;
          border-radius: 20px;
          max-width: 480px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.3);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .modal-header h2 {
          font-size: 22px;
          color: #1F2937;
          margin: 0;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 700;
        }

        .x-btn {
          background: #f5f5f5;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
          color: #666;
          transition: background 0.15s;
        }

        .x-btn:hover { background: #eee; }

        .modal-subtitle {
          color: #666;
          font-size: 14px;
          margin: 0 0 18px 0;
          line-height: 1.5;
        }

        .type-selector {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 6px;
          background: #f8faf9;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .type-btn:hover { background: #EAF5F3; }

        .type-btn.active {
          background: #EAF5F3;
          border-color: #2F9D94;
        }

        .type-icon { font-size: 20px; }

        .type-label {
          font-size: 12px;
          font-weight: 600;
          color: #1F2937;
        }

        .feedback-input {
          width: 100%;
          padding: 14px;
          border: 2px solid #e8e8e8;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          line-height: 1.55;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color 0.15s;
          margin-bottom: 14px;
          min-height: 110px;
        }

        .feedback-input:focus {
          outline: none;
          border-color: #2F9D94;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #2F9D94;
          color: #FAFAF7;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          min-height: 48px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .submit-btn:hover:not(:disabled) { background: #1A5F5A; }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .privacy-note {
          text-align: center;
          font-size: 12px;
          color: #999;
          margin: 14px 0 0 0;
        }

        .error-note {
          text-align: center;
          font-size: 13px;
          color: #b04425;
          background: rgba(244, 132, 107, 0.12);
          border: 1px solid #F4846B;
          padding: 8px 12px;
          border-radius: 8px;
          margin: 12px 0 0 0;
        }

        .success-view {
          text-align: center;
          padding: 16px 0;
        }

        .success-icon {
          font-size: 48px;
          color: #2F9D94;
          margin-bottom: 14px;
          font-weight: 700;
        }

        .success-view h2 {
          font-size: 24px;
          color: #1F2937;
          margin: 0 0 10px 0;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 700;
        }

        .success-view p {
          color: #666;
          font-size: 15px;
          line-height: 1.55;
          margin: 0 0 22px 0;
        }

        .close-btn {
          padding: 14px 40px;
          background: #2F9D94;
          color: #FAFAF7;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          min-height: 48px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .close-btn:hover { background: #1A5F5A; }

        @media (max-width: 480px) {
          .feedback-modal { padding: 22px; }
          .type-selector { grid-template-columns: repeat(2, 1fr); }
          .type-icon { font-size: 18px; }
          .type-label { font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
