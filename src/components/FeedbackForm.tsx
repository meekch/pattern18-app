'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Category = 'bug' | 'feature' | 'general';

const CATEGORIES: Array<{ value: Category; label: string; placeholder: string }> = [
  { value: 'bug',     label: 'Bug',              placeholder: 'What did you try, what happened, and what did you expect?' },
  { value: 'feature', label: 'Feature request',  placeholder: 'What would you like to be able to do that you can\u2019t right now?' },
  { value: 'general', label: 'General feedback', placeholder: 'Tell Christy anything, what\u2019s working, what isn\u2019t, what hits home\u2026' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOFT_MAX = 2000;
const COUNTER_THRESHOLD = 1500;
const DISCARD_CONFIRM_THRESHOLD = 20;

interface FeedbackFormProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackForm({ open, onClose }: FeedbackFormProps) {
  const [category, setCategory] = useState<Category | ''>('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [pathname, setPathname] = useState<string>('/');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Capture pathname at open + pre-populate email from auth session.
  useEffect(() => {
    if (!open) return;
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
    setSubmitted(false);
    setError(null);
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session?.user?.email && !email) {
        setEmail(data.session.user.email);
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the heading on open for screen readers + keyboard users.
  useEffect(() => {
    if (open && headingRef.current) headingRef.current.focus();
  }, [open]);

  // Esc to close (with discard guard).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, message]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const currentCategory = CATEGORIES.find((c) => c.value === category);
  const placeholder = currentCategory
    ? currentCategory.placeholder
    : 'Pick a category above to get started.';

  function attemptClose() {
    if (submitting) return;
    if (!submitted && message.trim().length > DISCARD_CONFIRM_THRESHOLD) {
      const ok = confirm('Discard this feedback?');
      if (!ok) return;
    }
    resetAndClose();
  }

  function resetAndClose() {
    setCategory('');
    setMessage('');
    setError(null);
    setSubmitted(false);
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!category) {
      setError('Pick a category to continue.');
      return;
    }
    if (message.trim().length < 5) {
      setError('Add a few more words so Christy can understand.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email so Christy can reply if needed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim(),
          route: pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong sending this. Want to try again?');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
      // Auto-close after 3s.
      setTimeout(() => {
        resetAndClose();
      }, 3000);
    } catch {
      setError('Could not reach the server. Want to try again?');
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fb-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-form-title"
      onClick={attemptClose}
    >
      <div className="fb-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="fb-handle" aria-hidden="true" />

        {submitted ? (
          <div className="fb-success">
            <div className="fb-heart" aria-hidden="true">♥</div>
            <p className="fb-success-text">
              Thanks, Christy reads every one of these. She&rsquo;ll follow up if there&rsquo;s a question.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id="feedback-form-title" ref={headingRef} tabIndex={-1} className="fb-h">
              Send Christy your feedback
            </h2>
            <p className="fb-sub">She reads every one of these personally.</p>

            {error && <div className="fb-error" role="alert">{error}</div>}

            <fieldset className="fb-field">
              <legend className="fb-label">Category</legend>
              <div className="fb-radios">
                {CATEGORIES.map((c) => (
                  <label key={c.value} className={`fb-radio ${category === c.value ? 'on' : ''}`}>
                    <input
                      type="radio"
                      name="fb-category"
                      value={c.value}
                      checked={category === c.value}
                      onChange={() => setCategory(c.value)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="fb-field">
              <span className="fb-label">What happened or what would you like?</span>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={placeholder}
                rows={5}
                maxLength={SOFT_MAX + 200}
              />
              {message.length >= COUNTER_THRESHOLD && (
                <span className="fb-counter">
                  {message.length} / {SOFT_MAX}
                </span>
              )}
            </label>

            <label className="fb-field">
              <span className="fb-label">Your email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
              />
              <span className="fb-helper">
                Christy will reply here if there&rsquo;s a follow-up question.
              </span>
            </label>

            <p className="fb-route">Sent from: {pathname}</p>

            <div className="fb-actions">
              <button type="button" className="fb-cancel" onClick={attemptClose}>
                Close
              </button>
              <button type="submit" className="fb-submit" disabled={submitting}>
                {submitting ? 'Sending\u2026' : error ? 'Try again' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .fb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 31, 24, 0.55);
          z-index: 9000;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fb-fade 0.2s ease-out;
        }

        .fb-sheet {
          background: #FAFAF7;
          width: 100%;
          max-width: 100%;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          padding: 12px 22px max(20px, env(safe-area-inset-bottom)) 22px;
          min-height: 60vh;
          max-height: 85vh;
          overflow-y: auto;
          animation: fb-slide-up 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.15);
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.18);
        }

        .fb-handle {
          width: 40px;
          height: 4px;
          background: #C7E4E0;
          border-radius: 2px;
          margin: 4px auto 14px;
        }

        @keyframes fb-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fb-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fb-zoom-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .fb-h {
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 700;
          font-size: 22px;
          color: #1F2937;
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          line-height: 1.2;
          outline: none;
        }
        .fb-sub {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 18px;
          line-height: 1.5;
        }

        .fb-field {
          display: block;
          margin: 0 0 16px;
        }
        .fb-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 8px;
          line-height: 1.4;
          padding: 0;
        }
        .fb-helper {
          display: block;
          font-size: 12px;
          color: #6b7280;
          margin-top: 6px;
          line-height: 1.4;
        }

        .fb-radios {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fb-radio {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          padding: 10px 14px;
          border: 1px solid #C7E4E0;
          border-radius: 10px;
          cursor: pointer;
          background: #FFFFFF;
          font-size: 15px;
          color: #1F2937;
          font-weight: 500;
          transition: background 0.15s, border-color 0.15s;
        }
        .fb-radio:hover { border-color: #2F9D94; }
        .fb-radio.on {
          background: #EAF5F3;
          border-color: #2F9D94;
          color: #1A5F5A;
          font-weight: 600;
        }
        .fb-radio input {
          width: 18px;
          height: 18px;
          margin: 0;
          accent-color: #2F9D94;
          flex-shrink: 0;
        }

        .fb-field textarea,
        .fb-field input[type='email'] {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #C7E4E0;
          border-radius: 10px;
          font-size: 16px;
          font-family: inherit;
          background: #FFFFFF;
          color: #1F2937;
          line-height: 1.5;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
        }
        .fb-field textarea {
          resize: vertical;
          min-height: 120px;
        }
        .fb-field textarea:focus,
        .fb-field input[type='email']:focus {
          outline: 2px solid #2F9D94;
          outline-offset: 1px;
          border-color: #2F9D94;
        }

        .fb-counter {
          display: block;
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .fb-route {
          font-size: 12px;
          color: #9ca3af;
          margin: 0 0 18px;
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          word-break: break-all;
        }

        .fb-actions {
          display: flex;
          gap: 10px;
          justify-content: space-between;
          align-items: center;
          padding-top: 4px;
          border-top: 1px solid #f3f4f6;
          margin-top: 18px;
        }
        .fb-cancel {
          background: none;
          border: none;
          font: inherit;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          padding: 12px 8px;
          min-height: 44px;
        }
        .fb-cancel:hover { color: #1F2937; }

        .fb-submit {
          flex: 1;
          padding: 14px 22px;
          background: #2F9D94;
          color: #FAFAF7;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          min-height: 48px;
          transition: background 0.15s;
        }
        .fb-submit:hover:not(:disabled) { background: #1A5F5A; }
        .fb-submit:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .fb-error {
          background: rgba(229, 121, 99, 0.12);
          border: 1px solid #E57963;
          color: #8a3a26;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          margin: 0 0 14px;
          line-height: 1.45;
        }

        .fb-success {
          padding: 36px 12px 28px;
          text-align: center;
          animation: fb-zoom-in 0.25s ease-out;
        }
        .fb-heart {
          font-size: 48px;
          color: #2F9D94;
          line-height: 1;
          margin-bottom: 14px;
        }
        .fb-success-text {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 18px;
          color: #1F2937;
          line-height: 1.45;
          margin: 0;
          max-width: 360px;
          margin-left: auto;
          margin-right: auto;
        }

        /* DESKTOP: centered modal, max-width 520px */
        @media (min-width: 768px) {
          .fb-overlay {
            align-items: center;
          }
          .fb-sheet {
            max-width: 520px;
            min-height: 0;
            max-height: 88vh;
            border-radius: 16px;
            padding: 28px 32px 24px;
            animation: fb-zoom-in 0.22s ease-out;
          }
          .fb-handle { display: none; }
          .fb-actions {
            justify-content: flex-end;
          }
          .fb-submit {
            flex: 0 0 auto;
            min-width: 140px;
          }
        }
      `}</style>
    </div>
  );
}
