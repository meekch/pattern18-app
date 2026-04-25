'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

const USE_OPTIONS = [
  'Analyzing a co-parent message',
  'Building or editing the case file',
  'Generating a court document',
  'Reviewing patterns / timeline',
  'Healing tools',
  'Just reading / catching up',
];

const OPENS_OPTIONS = ['0', '1-3', '4-7', '8+'] as const;

export default function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [validating, setValidating] = useState(true);
  const [tokenOk, setTokenOk] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);

  const [opens, setOpens] = useState<string>('');
  const [uses, setUses] = useState<Set<string>>(new Set());
  const [helpful, setHelpful] = useState('');
  const [broken, setBroken] = useState('');
  const [wishes, setWishes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/founding/checkin/${token}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!mounted) return;
        if (ok && data.ok) {
          setTokenOk(true);
          setWeekNumber(data.week_number);
        } else {
          setTokenError(
            data.reason === 'expired'
              ? 'This check-in link has expired. Watch for the next one in your inbox.'
              : 'This link is invalid.'
          );
        }
      })
      .catch(() => mounted && setTokenError('Could not validate this link.'))
      .finally(() => mounted && setValidating(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  const toggleUse = (label: string) => {
    setUses((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/founding/checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opens_this_week: opens || null,
          uses_this_week: Array.from(uses),
          most_helpful: helpful.trim() || null,
          broken_or_confusing: broken.trim() || null,
          wishes_it_did: wishes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Could not submit. Try again.');
      else setSubmitted(true);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="page">
        <SiteNav />
        <main className="wrap">
          <p>Validating link…</p>
        </main>
        <Styles />
      </div>
    );
  }

  if (!tokenOk) {
    return (
      <div className="page">
        <SiteNav />
        <main className="wrap">
          <h1>Link not valid</h1>
          <p className="lede">{tokenError}</p>
          <Link href="/" className="btn-primary">Back to homepage</Link>
        </main>
        <Styles />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page">
        <SiteNav />
        <main className="wrap">
          <p className="eyebrow">Founding Member · Week {weekNumber}</p>
          <h1>Got it. Thank you.</h1>
          <p className="lede">
            Your check-in is in. I read every one. See you next Sunday.
          </p>
          <p className="signed">— Rae</p>
        </main>
        <Styles />
      </div>
    );
  }

  return (
    <div className="page">
      <SiteNav />
      <main className="wrap">
        <p className="eyebrow">Founding Member · Week {weekNumber}</p>
        <h1>Quick check-in</h1>
        <p className="lede">Five questions, two minutes. Skip any that don&apos;t apply.</p>

        <form onSubmit={handleSubmit} className="form">
          <fieldset className="field">
            <legend className="field-label">How many times did you open Pattern18 this week?</legend>
            <div className="pill-row">
              {OPENS_OPTIONS.map((o) => (
                <label key={o} className={`pill ${opens === o ? 'on' : ''}`}>
                  <input
                    type="radio"
                    name="opens"
                    value={o}
                    checked={opens === o}
                    onChange={() => setOpens(o)}
                  />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field-label">What did you use it for? (pick any)</legend>
            <div className="pill-row stacked">
              {USE_OPTIONS.map((u) => (
                <label key={u} className={`pill wide ${uses.has(u) ? 'on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={uses.has(u)}
                    onChange={() => toggleUse(u)}
                  />
                  {u}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span className="field-label">Most helpful thing this week?</span>
            <textarea
              value={helpful}
              onChange={(e) => setHelpful(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>

          <label className="field">
            <span className="field-label">Anything broken or confusing?</span>
            <textarea
              value={broken}
              onChange={(e) => setBroken(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>

          <label className="field">
            <span className="field-label">Anything you wish Pattern18 did?</span>
            <textarea
              value={wishes}
              onChange={(e) => setWishes(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>

          <button type="submit" disabled={submitting} className="btn-primary btn-block">
            {submitting ? 'Sending…' : 'Submit check-in'}
          </button>
          {error && <div className="error">{error}</div>}
        </form>
      </main>

      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      .page {
        background: var(--warm-white);
        color: var(--charcoal);
        font-family: var(--sans);
        min-height: 100dvh;
      }
      .wrap {
        max-width: 640px;
        margin: 0 auto;
        padding: 64px 24px 96px;
      }
      .wrap .eyebrow {
        color: var(--teal);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin-bottom: 16px;
      }
      .wrap h1 {
        font-family: var(--serif);
        font-weight: 800;
        font-size: clamp(30px, 5vw, 44px);
        line-height: 1.1;
        margin-bottom: 14px;
        letter-spacing: -0.02em;
      }
      .wrap .lede {
        color: var(--charcoal-70);
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 28px;
      }
      .wrap .signed {
        font-family: var(--serif);
        font-style: italic;
        color: var(--teal);
        font-size: 18px;
        margin-top: 24px;
      }
      .form { display: flex; flex-direction: column; gap: 18px; }
      .field {
        display: block;
        background: var(--warm-white);
        border: 1px solid var(--teal-border);
        border-radius: 12px;
        padding: 18px;
      }
      .field-label {
        display: block;
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 10px;
        line-height: 1.4;
      }
      .pill-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pill-row.stacked .pill { flex: 1 1 calc(50% - 4px); }
      @media (max-width: 480px) {
        .pill-row.stacked .pill { flex: 1 1 100%; }
      }
      .pill {
        flex: 0 0 auto;
        padding: 10px 14px;
        border: 1px solid var(--teal-border);
        background: var(--warm-white);
        color: var(--charcoal);
        border-radius: 9px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        text-align: center;
      }
      .pill input { position: absolute; opacity: 0; pointer-events: none; }
      .pill.on {
        background: var(--teal);
        color: var(--warm-white);
        border-color: var(--teal);
      }
      .pill.wide {
        flex: 1 1 auto;
        text-align: left;
      }
      textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--teal-border);
        border-radius: 9px;
        font-family: inherit;
        font-size: 15px;
        resize: vertical;
        min-height: 80px;
        background: var(--warm-white);
        color: var(--charcoal);
      }
      textarea:focus { outline: 2px solid var(--teal); outline-offset: 1px; }
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--teal);
        color: var(--warm-white);
        padding: 16px 32px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 16px;
        text-decoration: none;
        min-height: 52px;
        border: none;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .btn-primary:hover:not(:disabled) { background: var(--deep-teal); }
      .btn-primary:disabled { background: var(--charcoal-50); cursor: not-allowed; }
      .btn-block { width: 100%; }
      .error {
        background: rgba(244, 132, 107, 0.12);
        border: 1px solid var(--coral);
        color: #8a3a26;
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 14px;
      }
    `}</style>
  );
}
