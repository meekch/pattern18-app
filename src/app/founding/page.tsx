'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

const REF_COOKIE = 'p18_fm_ref';

const JOURNEY_OPTIONS = [
  { value: 'pre_filing', label: 'Pre-filing' },
  { value: 'active_case', label: 'Active case' },
  { value: 'post_judgment_active', label: 'Post-judgment, active co-parenting' },
  { value: 'order_in_place', label: 'Custody order in place, navigating ongoing issues' },
  { value: 'high_conflict_no_court', label: 'Just navigating high-conflict co-parenting (no active court case)' },
];

function FoundingContent({ programLive }: { programLive: boolean }) {
  const searchParams = useSearchParams();

  const [refToken, setRefToken] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [journey, setJourney] = useState('');
  const [challenge, setChallenge] = useState('');
  const [triedBefore, setTriedBefore] = useState('');
  const [techComfort, setTechComfort] = useState<number | null>(null);
  const [canCommit, setCanCommit] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capture ?ref= into cookie + state
  useEffect(() => {
    const fromUrl = searchParams.get('ref');
    if (fromUrl) {
      document.cookie = `${REF_COOKIE}=${encodeURIComponent(fromUrl)}; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax`;
      setRefToken(fromUrl);
      return;
    }
    const cookieMatch = document.cookie.match(new RegExp(`${REF_COOKIE}=([^;]+)`));
    if (cookieMatch) setRefToken(decodeURIComponent(cookieMatch[1]));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !email.trim() || !journey || !challenge.trim() || techComfort === null || !canCommit) {
      setError('Please fill out the required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/founding/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          journey_stage: journey,
          biggest_challenge: challenge.trim(),
          what_tried_before: triedBefore.trim() || null,
          tech_comfort: techComfort,
          can_commit: canCommit,
          additional_notes: notes.trim() || null,
          ref_token: refToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!programLive) {
    return (
      <div className="page">
        <SiteNav />
        <main className="placeholder">
          <p className="eyebrow">Pattern18 Founding Members</p>
          <h1>Coming soon.</h1>
          <p className="lede">
            Founding Member applications open Sunday, April 26. Ten parents currently navigating
            high-conflict custody, six months free, in exchange for honest feedback. Check back then.
          </p>
          <Link href="/" className="back-link">← Back to homepage</Link>
        </main>
        <PageStyles />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page">
        <SiteNav />
        <main className="placeholder">
          <p className="eyebrow">Pattern18 Founding Members</p>
          <h1>Application received.</h1>
          <p className="lede">
            Thanks, {firstName.trim()}. I&apos;ll personally review your application and get back to you
            within 3 days. Check your inbox for a confirmation now.
          </p>
          <Link href="/" className="back-link">← Back to homepage</Link>
        </main>
        <PageStyles />
      </div>
    );
  }

  return (
    <div className="page">
      <SiteNav />

      {/* HERO */}
      <section className="hero">
        <p className="eyebrow">Pattern18 Founding Members</p>
        <h1>Help shape the tool you wish you&apos;d had from day one.</h1>
        <p className="lede">
          10 Founding Member spots. 6 months free in exchange for feedback. No cost, no ownership, no strings.
        </p>
        <a href="#apply" className="btn-primary">Apply to become a Founding Member</a>
      </section>

      {/* WHY */}
      <section className="section">
        <h2>Why Founding Members?</h2>
        <div className="founder-letter">
          <p>
            Pattern18 works. But the version I built alone is not the version that will help 10 million
            parents navigating high-conflict custody. The people who know how to make it better are the
            ones using it in the middle of real chaos.
          </p>
          <p>
            I&apos;m opening 10 Founding Member spots to a cohort of real survivors. You&apos;ll use Pattern18
            for your actual day-to-day situation. You&apos;ll tell me what works, what&apos;s broken, and what&apos;s
            missing. In exchange, you get free access, a locked Founding Member rate for life if you choose
            to continue after 6 months, and direct input on the roadmap.
          </p>
          <p className="signed">— Rae, Founder</p>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="section tinted">
        <h2 className="center">What Founding Members get</h2>
        <div className="cards-grid">
          <div className="card">
            <h3>Free access for 6 months</h3>
            <p>Every feature, no cost, no credit card.</p>
          </div>
          <div className="card">
            <h3>Private Founding Member community</h3>
            <p>A dedicated space inside the Pattern18 community for Founding Members only. Weekly office hours, peer support, direct line to me.</p>
          </div>
          <div className="card">
            <h3>Founding Member rate for life</h3>
            <p>After 6 months, if Pattern18 is useful to you, keep your Founding Member pricing locked in. No obligation.</p>
          </div>
          <div className="card">
            <h3>Your input shapes the product</h3>
            <p>Weekly check-ins, two 30-minute calls, and direct feedback loops. What you say changes what gets built.</p>
          </div>
        </div>
      </section>

      {/* WHAT WE ASK */}
      <section className="section">
        <h2 className="center">What we ask in return</h2>
        <ol className="ask-list">
          <li>Use Pattern18 for your real situation, not just as a test.</li>
          <li>A 15-minute weekly check-in (quick form, 5 questions).</li>
          <li>Optional: a quick chat with me anytime if you want to talk something through (my calendar is in your welcome email).</li>
          <li>At day 90, share a testimonial if Pattern18 has helped, named, first-name-only, or fully anonymous, your choice. Not required.</li>
        </ol>
      </section>

      {/* WHO FOR / NOT FOR */}
      <section className="section">
        <div className="who-grid">
          <div className="who-card">
            <h3>For you if</h3>
            <ul>
              <li>Currently navigating high-conflict custody.</li>
              <li>Comfortable with software.</li>
              <li>Ready to use Pattern18 for real, not hypothetically.</li>
              <li>Willing to give honest feedback, both what works and what doesn&apos;t.</li>
            </ul>
          </div>
          <div className="who-card">
            <h3>Not for you right now if</h3>
            <ul>
              <li>You&apos;re in acute crisis or mid-emergency. You deserve a finished product, not a work-in-progress. The general launch comes later this year.</li>
              <li>You want only to observe, not actively use.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* APPLICATION */}
      <section id="apply" className="section apply-section">
        <h2 className="center">Apply to become a Founding Member</h2>
        {refToken && (
          <p className="ref-banner">Referred by another Founding Member ✓</p>
        )}

        <form onSubmit={handleSubmit} className="apply-form">
          <label className="field">
            <span className="field-label">First name <em>*</em></span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={80}
            />
          </label>

          <label className="field">
            <span className="field-label">Email <em>*</em></span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Where are you in your family court journey? <em>*</em></span>
            <select value={journey} onChange={(e) => setJourney(e.target.value)} required>
              <option value="">Select…</option>
              {JOURNEY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">What&apos;s the single biggest communication or documentation challenge you&apos;re dealing with right now? <em>*</em></span>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              required
              rows={4}
              maxLength={1500}
              placeholder="2-3 sentences is plenty."
            />
          </label>

          <label className="field">
            <span className="field-label">What have you tried before? <em>(optional)</em></span>
            <textarea
              value={triedBefore}
              onChange={(e) => setTriedBefore(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="Apps, journals, spreadsheets, lawyer guidance, etc. and what worked / didn't."
            />
          </label>

          <fieldset className="field">
            <legend className="field-label">How comfortable are you with using software? <em>*</em></legend>
            <div className="scale">
              {[1,2,3,4,5].map(n => (
                <label key={n} className={`scale-pill ${techComfort === n ? 'on' : ''}`}>
                  <input
                    type="radio"
                    name="tech_comfort"
                    value={n}
                    checked={techComfort === n}
                    onChange={() => setTechComfort(n)}
                  />
                  {n}
                </label>
              ))}
            </div>
            <p className="scale-hint"><strong>1</strong> = I struggle with most apps · <strong>5</strong> = I figure things out quickly</p>
          </fieldset>

          <fieldset className="field">
            <legend className="field-label">Can you commit to weekly 15-min check-ins and two 30-minute calls over 6 months? <em>*</em></legend>
            <div className="commit-row">
              {[
                { v: 'yes',     l: 'Yes' },
                { v: 'no',      l: 'No' },
                { v: 'unsure',  l: 'Unsure' },
              ].map(c => (
                <label key={c.v} className={`commit-pill ${canCommit === c.v ? 'on' : ''}`}>
                  <input
                    type="radio"
                    name="can_commit"
                    value={c.v}
                    checked={canCommit === c.v}
                    onChange={() => setCanCommit(c.v)}
                  />
                  {c.l}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span className="field-label">Anything else you want me to know? <em>(optional)</em></span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1500}
            />
          </label>

          <button type="submit" disabled={submitting} className="btn-primary btn-block">
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
          <p className="form-foot">I personally review every application. Expect to hear back within 3 days.</p>

          {error && <div className="error">{error}</div>}
        </form>
      </section>

      <PageStyles />
    </div>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      .page {
        background: var(--warm-white);
        color: var(--charcoal);
        font-family: var(--sans);
        min-height: 100dvh;
      }
      .placeholder {
        max-width: 640px;
        margin: 0 auto;
        padding: 96px 24px 120px;
        text-align: center;
      }
      .placeholder h1 {
        font-family: var(--serif);
        font-weight: 800;
        font-size: clamp(36px, 6vw, 56px);
        margin-bottom: 18px;
        letter-spacing: -0.02em;
      }
      .placeholder .lede {
        color: var(--charcoal-70);
        font-size: 17px;
        line-height: 1.6;
      }
      .placeholder .back-link {
        display: inline-block;
        margin-top: 32px;
        color: var(--teal);
        font-weight: 600;
      }

      .hero {
        max-width: 820px;
        margin: 0 auto;
        padding: 80px 24px 64px;
        text-align: center;
      }
      .hero .eyebrow {
        color: var(--teal);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        margin-bottom: 28px;
      }
      .hero h1 {
        font-family: var(--serif);
        font-weight: 800;
        font-size: clamp(34px, 5.4vw, 60px);
        line-height: 1.08;
        letter-spacing: -0.02em;
        margin-bottom: 22px;
      }
      .hero .lede {
        color: var(--charcoal);
        font-size: clamp(17px, 2vw, 20px);
        line-height: 1.5;
        margin-bottom: 32px;
        max-width: 640px;
        margin-left: auto;
        margin-right: auto;
      }
      .hero .btn-primary { min-width: 320px; }

      .section {
        max-width: 920px;
        margin: 0 auto;
        padding: 64px 24px;
      }
      .section.tinted {
        background: var(--teal-tint);
        max-width: none;
      }
      .section.tinted > * {
        max-width: 920px;
        margin-left: auto;
        margin-right: auto;
      }
      .section h2 {
        font-family: var(--serif);
        font-weight: 700;
        font-size: clamp(26px, 4vw, 38px);
        margin-bottom: 22px;
        letter-spacing: -0.01em;
      }
      .section h2.center {
        text-align: center;
      }

      .founder-letter {
        max-width: 720px;
        border-left: 3px solid var(--teal);
        padding: 8px 28px;
      }
      .founder-letter p {
        font-size: 17px;
        line-height: 1.7;
        margin-bottom: 18px;
      }
      .founder-letter .signed {
        font-family: var(--serif);
        font-style: italic;
        color: var(--teal);
        font-size: 18px;
      }

      .cards-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
        margin-top: 36px;
      }
      .cards-grid .card {
        background: var(--warm-white);
        border: 1px solid var(--teal-border);
        border-radius: 14px;
        padding: 22px 22px 24px;
      }
      .cards-grid h3 {
        font-family: var(--serif);
        font-weight: 700;
        font-size: 18px;
        margin-bottom: 8px;
      }
      .cards-grid p {
        color: var(--charcoal-70);
        line-height: 1.55;
        font-size: 15px;
      }
      @media (max-width: 720px) {
        .cards-grid { grid-template-columns: 1fr; }
      }

      .ask-list {
        list-style: decimal inside;
        padding-left: 4px;
        margin-top: 20px;
        max-width: 720px;
        margin-left: auto;
        margin-right: auto;
        font-size: 16px;
        line-height: 1.7;
      }
      .ask-list li { margin-bottom: 10px; }

      .who-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }
      .who-card {
        background: var(--warm-white);
        border: 1px solid var(--teal-border);
        border-radius: 14px;
        padding: 22px 22px 24px;
      }
      .who-card h3 {
        font-family: var(--serif);
        font-weight: 700;
        font-size: 19px;
        margin-bottom: 12px;
      }
      .who-card ul {
        list-style: disc inside;
        font-size: 15px;
        line-height: 1.65;
        color: var(--charcoal-70);
      }
      .who-card li { margin-bottom: 8px; }
      @media (max-width: 720px) {
        .who-grid { grid-template-columns: 1fr; }
      }

      .apply-section {
        background: var(--teal-tint);
        max-width: none;
        scroll-margin-top: 80px;
      }
      .apply-section > * {
        max-width: 640px;
        margin-left: auto;
        margin-right: auto;
      }
      .ref-banner {
        text-align: center;
        color: var(--deep-teal);
        font-weight: 600;
        margin-top: -12px;
        margin-bottom: 12px;
        font-size: 14px;
      }
      .apply-form {
        background: var(--warm-white);
        border: 1px solid var(--teal-border);
        border-radius: 16px;
        padding: 28px 24px 30px;
        margin-top: 24px;
      }
      .field {
        display: block;
        margin-bottom: 18px;
      }
      .field-label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--charcoal);
        margin-bottom: 6px;
        line-height: 1.4;
      }
      .field-label em {
        color: var(--coral);
        font-style: normal;
        font-weight: 700;
      }
      .field input[type=text],
      .field input[type=email],
      .field select,
      .field textarea {
        width: 100%;
        padding: 11px 13px;
        border: 1px solid var(--teal-border);
        border-radius: 9px;
        font-size: 15px;
        font-family: inherit;
        background: var(--warm-white);
        color: var(--charcoal);
      }
      .field textarea { resize: vertical; min-height: 90px; }
      .field input:focus, .field select:focus, .field textarea:focus {
        outline: 2px solid var(--teal);
        outline-offset: 1px;
      }

      .scale, .commit-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .scale-pill, .commit-pill {
        flex: 1 1 60px;
        min-width: 60px;
        padding: 10px 12px;
        text-align: center;
        border: 1px solid var(--teal-border);
        background: var(--warm-white);
        border-radius: 9px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        color: var(--charcoal);
      }
      .scale-pill input, .commit-pill input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .scale-pill.on, .commit-pill.on {
        background: var(--teal);
        color: var(--warm-white);
        border-color: var(--teal);
      }
      .scale-hint {
        font-size: 12px;
        color: var(--charcoal-70);
        margin-top: 8px;
      }

      .btn-block { width: 100%; margin-top: 6px; }
      .form-foot {
        text-align: center;
        font-size: 13px;
        color: var(--charcoal-70);
        margin-top: 14px;
      }
      .error {
        margin-top: 14px;
        background: rgba(244, 132, 107, 0.12);
        border: 1px solid var(--coral);
        color: #8a3a26;
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 14px;
      }

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
    `}</style>
  );
}

export default function FoundingPage() {
  // Server-side env check passed via a tiny client wrapper.
  const programLive = process.env.NEXT_PUBLIC_FOUNDING_MEMBER_PROGRAM_LIVE === 'true';
  return (
    <Suspense fallback={<div className="page" />}>
      <FoundingContent programLive={programLive} />
    </Suspense>
  );
}
