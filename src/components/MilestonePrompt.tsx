'use client';

import { useEffect, useState } from 'react';

type Trigger = '10_incidents' | 'first_court_doc' | 'day_30';

const COPY: Record<Trigger, { headline: string; body: string }> = {
  '10_incidents': {
    headline: "You've documented 10 incidents.",
    body: "If Pattern18 has made this easier than spreadsheets or scattered notes, a short testimonial would help other parents find it. No pressure — share when you're ready.",
  },
  first_court_doc: {
    headline: 'You just built a court-ready document.',
    body: 'If it saved you time or money, would you share that? Other parents will find Pattern18 because of you.',
  },
  day_30: {
    headline: '30 days with Pattern18.',
    body: "How's it going? Your words could help another parent find this tool.",
  },
};

export default function MilestonePrompt() {
  const [active, setActive] = useState<Trigger | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Share form state
  const [content, setContent] = useState('');
  const [attribution, setAttribution] = useState<'named' | 'first_name' | 'anonymous'>('first_name');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/milestones/active')
      .then((r) => (r.ok ? r.json() : { active: [] }))
      .then((data) => {
        if (!mounted) return;
        const list: Trigger[] = data.active ?? [];
        if (list.length > 0) setActive(list[0]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (!active) return null;

  const dismiss = async () => {
    const t = active;
    setActive(null);
    fetch('/api/milestones/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger_event: t }),
    }).catch(() => {});
  };

  const submitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (content.trim().length < 10) {
      setError('Add at least a sentence or two.');
      return;
    }
    if (attribution === 'named' && !displayName.trim()) {
      setError('Add your full name (or pick first-name-only).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_event: active,
          content: content.trim(),
          attribution,
          display_name: displayName.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not submit. Try again.');
      } else {
        setDone(true);
        // Auto-dismiss the card after submitting
        fetch('/api/milestones/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger_event: active }),
        }).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copy = COPY[active];

  return (
    <>
      <div style={{
        background: 'var(--teal-tint)',
        border: '1px solid var(--teal-border)',
        borderRadius: 14,
        padding: '18px 20px',
        margin: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 700,
            fontSize: 17,
            color: 'var(--charcoal)',
            lineHeight: 1.3,
          }}>
            {copy.headline}
          </p>
          <p style={{
            margin: '6px 0 0',
            color: 'var(--charcoal)',
            opacity: 0.8,
            fontSize: 14,
            lineHeight: 1.55,
          }}>
            {copy.body}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowShare(true)}
            style={{
              background: 'var(--teal)',
              color: 'var(--warm-white)',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 9,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Share testimonial →
          </button>
          <button
            onClick={dismiss}
            style={{
              background: 'transparent',
              color: 'var(--charcoal)',
              border: '1px solid var(--teal-border)',
              padding: '10px 18px',
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </div>

      {showShare && !done && (
        <div onClick={() => !submitting && setShowShare(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(31,41,55,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitTestimonial} style={{
            background: 'var(--warm-white)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 520,
            width: '100%',
            boxShadow: '0 20px 60px rgba(31,41,55,0.2)',
          }}>
            <h3 style={{
              margin: '0 0 8px',
              fontFamily: 'var(--serif)',
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--charcoal)',
            }}>Share a testimonial</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--charcoal)', opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
              Two or three sentences is plenty. We&apos;ll review before publishing anything.
            </p>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1500}
              placeholder="What has Pattern18 done for you?"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--teal-border)',
                fontFamily: 'inherit',
                fontSize: 15,
                resize: 'vertical',
                marginBottom: 14,
              }}
            />

            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>
              How would you like to be credited?
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {([
                { v: 'named',       l: 'Full name' },
                { v: 'first_name',  l: 'First name only' },
                { v: 'anonymous',   l: 'Anonymous' },
              ] as const).map((opt) => (
                <label key={opt.v} style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: '1px solid var(--teal-border)',
                  borderRadius: 8,
                  background: attribution === opt.v ? 'var(--teal)' : 'var(--warm-white)',
                  color: attribution === opt.v ? 'var(--warm-white)' : 'var(--charcoal)',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="attribution"
                    value={opt.v}
                    checked={attribution === opt.v}
                    onChange={() => setAttribution(opt.v)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  {opt.l}
                </label>
              ))}
            </div>

            {(attribution === 'named' || attribution === 'first_name') && (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={attribution === 'named' ? 'Your full name' : 'Your first name'}
                maxLength={120}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: 10,
                  border: '1px solid var(--teal-border)',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  marginBottom: 14,
                }}
              />
            )}

            {error && (
              <div style={{
                background: 'rgba(244,132,107,0.12)',
                border: '1px solid var(--coral)',
                color: '#8a3a26',
                padding: '10px 12px',
                borderRadius: 9,
                fontSize: 13,
                marginBottom: 14,
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid var(--teal-border)',
                  background: 'var(--warm-white)',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '12px',
                  border: 'none',
                  background: submitting ? 'var(--charcoal-50)' : 'var(--teal)',
                  color: 'var(--warm-white)',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >{submitting ? 'Sending…' : 'Send testimonial'}</button>
            </div>
          </form>
        </div>
      )}

      {showShare && done && (
        <div onClick={() => setShowShare(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(31,41,55,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--warm-white)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 440,
            width: '100%',
            textAlign: 'center',
          }}>
            <h3 style={{
              margin: '0 0 8px',
              fontFamily: 'var(--serif)',
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--charcoal)',
            }}>Got it. Thank you.</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--charcoal)', opacity: 0.7 }}>
              I read every testimonial personally. We&apos;ll review yours before publishing.
            </p>
            <button
              onClick={() => setShowShare(false)}
              style={{
                background: 'var(--teal)',
                color: 'var(--warm-white)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >Close</button>
          </div>
        </div>
      )}
    </>
  );
}
