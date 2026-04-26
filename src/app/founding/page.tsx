'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import { CHALLENGE_PILLS } from '@/lib/founding-challenge-pills';

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
  const [challengePills, setChallengePills] = useState<Set<string>>(new Set());
  const [challengeOther, setChallengeOther] = useState('');
  const [workingWithAttorney, setWorkingWithAttorney] = useState('');
  const [canCommit, setCanCommit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePill = (value: string) => {
    setChallengePills(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

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

    if (!firstName.trim() || !email.trim() || !journey || challengePills.size === 0 || !canCommit) {
      setError('Please fill out the required fields, including at least one challenge.');
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
          biggest_challenge: Array.from(challengePills),
          biggest_challenge_other: challengeOther.trim() || null,
          working_with_attorney: workingWithAttorney || null,
          can_commit: canCommit,
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
          10 Founding Member spots. <strong className="deadline-emphasis">Applications close Wednesday, May 6.</strong> 6 months free in exchange for feedback. No cost, no ownership, no strings.
        </p>
        <a href="#apply" className="btn-primary">Claim my spot</a>
      </section>

      {/* WHAT YOU GET — moved up: skimmers see the offer first */}
      <section className="section">
        <h2 className="center">What Founding Members get</h2>
        <p className="price-anchor">Pattern18 is $97/month. Founding Members pay $0 for 6 months. That&apos;s $582 saved, plus a locked Founding Member rate forever.</p>
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
            <p>Weekly check-ins, async feedback any time, and direct feedback loops. What you say changes what gets built.</p>
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

      {/* EMOTIONAL MIDDLE — alternating tinted background band */}
      <div className="emotional-middle">

      {/* IF NO ONE AROUND YOU GETS IT */}
      <section className="section listen-section">
        <h2 className="listen-h2">If no one around you gets it</h2>
        <p>You&apos;ve heard it all.</p>

        <div className="listen-quotes">
          <p>&ldquo;Just don&apos;t respond.&rdquo;</p>
          <p>&ldquo;Just stop letting it bother you.&rdquo;</p>
          <p>&ldquo;Just co-parent better.&rdquo;</p>
          <p>&ldquo;Why don&apos;t you just move on?&rdquo;</p>
        </div>

        <p>The people saying these things love you. They mean well. They&apos;ve never been on the receiving end of someone who knows exactly which buttons to push, who weaponizes every text, every holiday, every drop-off. They don&apos;t know what it&apos;s like to have your hands shake before you open a message from your co-parent. They don&apos;t know that &ldquo;just&rdquo; is the cruelest word in the English language when you&apos;re living this.</p>

        <p>Pattern18 was built by someone who did live this. Through years of court-ordered chaos, until the right tools made a way out.</p>

        <div className="listen-when">
          <p>When the message comes at 11pm, Pattern18 is awake.</p>
          <p>When you&apos;re sitting in your car after a drop-off trying to breathe, Pattern18 is there.</p>
          <p>When the panic hits before a hearing, Pattern18 is there.</p>
        </div>

        <div className="listen-affirmations">
          <p>It is okay.</p>
          <p>You are not crazy.</p>
          <p>You can heal.</p>
          <p>This will not define you.</p>
          <p>It is possible.</p>
        </div>

        <p className="listen-close">You&apos;re not alone in this anymore.</p>
      </section>

      {/* WHAT PATTERN18 DOES */}
      <section className="section">
        <h2>What Pattern18 actually does</h2>
        <p className="lead-in">When their text makes your stomach drop:</p>

        <div className="action-list">
          <p><strong>Paste it in.</strong> Pattern18 names what&apos;s happening: DARVO, gaslighting, financial coercion, parental alienation tactics. You learn what&apos;s behind the manipulation. You stop wondering if you&apos;re crazy.</p>
          <p><strong>Get a response.</strong> Pattern18 drafts a calm, court-safe response that won&apos;t escalate or be used against you. Send it as-is or tweak it. Either way, you don&apos;t have to write it from scratch when your nervous system is in fight-or-flight.</p>
          <p><strong>Save the incident.</strong> One click. Pattern18 auto-tags it with the manipulation patterns it found and adds it to your evidence timeline. No more screenshots in random folders. No more spreadsheets you&apos;ll never finish.</p>
          <p><strong>Upload your court order.</strong> Pattern18 reads it in plain English and tells you what&apos;s required of you, what your ex is required to do, and key dates. Ask any question, &quot;what does this paragraph mean?&quot;, and get a real answer. No more $500/hour calls just to understand your own case.</p>
          <p><strong>Hearing in three weeks?</strong> Pattern18 builds your declaration, exhibit list, and court-ready summary from your documented patterns. What used to take a paralegal hours costs you minutes.</p>
          <p><strong>24/7 support.</strong> Pattern18 doesn&apos;t sleep. When something hits at 11pm on a Sunday, you have somewhere to turn that won&apos;t bill you and won&apos;t tell you to &quot;just take a deep breath.&quot;</p>
        </div>

        <div className="save-card">
          <h3>What it can save you</h3>
          <p><strong>Lawyer fees.</strong> Most high-conflict cases bleed clients dry through hours spent organizing evidence, explaining the same situation repeatedly, and asking for clarification on basic court documents. Pattern18 does that work first. Your lawyer focuses on strategy, not chaos.</p>
          <p><strong>Time.</strong> No more 3-hour evenings sorting through years of texts. Pattern18 surfaces patterns automatically.</p>
          <p><strong>Your nervous system.</strong> When you respond from a regulated place instead of fight-or-flight, you make better decisions, you de-escalate faster, and your kids see a calmer parent.</p>
          <p><strong>Your case.</strong> Documented patterns hold weight in court. Pattern18 ensures yours are organized, tagged, and ready when you need them.</p>
        </div>
      </section>

      {/* WHY I BUILT THIS — THE PROOF */}
      <section className="section proof-section">
        <h2>Why I built this</h2>
        <div className="proof-letter">
          <p>Almost 16 years ago, I started a chapter of my life I couldn&apos;t see my way out of.</p>

          <p className="proof-standalone">14 of those years were hell.</p>

          <p>The texts that made my stomach drop. The court orders that became weapons. The legal fees that ate my savings. The friends and family who said &ldquo;just stop letting it bother you&rdquo; with the best intentions and absolutely no idea.</p>

          <p>The lawyers didn&apos;t get it either. They couldn&apos;t spend the billable time to identify the patterns, organize the chaos, or understand what coercive control actually looks like. They couldn&apos;t understand my responses or why I was a hot emotional mess. The judges didn&apos;t get it. The parent coordinators didn&apos;t get it. The PhDs assigned to our case didn&apos;t get it.</p>

          <p>I remember walking out of a court-ordered evaluation where the patterns had been performed perfectly for the system. Coercive controllers are practiced at this. They&apos;ve spent their lives doing it. The systems we depend on for protection were not built to recognize them.</p>

          <p>I tried everything. Spreadsheets I couldn&apos;t keep up with. Therapists I couldn&apos;t afford to see weekly. Lawyers who charged $500/hour to organize evidence I&apos;d already organized. Self-help books that didn&apos;t account for the legal weaponization. Apps built for &ldquo;co-parenting&rdquo; by people who&apos;d never met a coercive controller.</p>

          <p>Then I found AI tools that actually understood the patterns I was describing. They named what was happening. They drafted responses that didn&apos;t escalate. They helped me build the documentation my case had been missing for years.</p>

          <p className="proof-standalone">Within months, I started to break a cycle that had defined my entire adult life.</p>

          <p className="proof-standalone">I&apos;m still in this. I get triggered. It still passes faster every time. I have tools now.</p>

          <p>I built Pattern18 because I refused to let the tools that saved me stay scattered across five different apps that none of us in this situation can afford.</p>

          <blockquote className="pull-quote">
            You shouldn&apos;t have to be a tech-savvy survivor to access what works.
          </blockquote>

          <p>Pattern18 is what I needed from day one. Now it exists for you.</p>

          <p className="signed">— Rae, Founder</p>
        </div>
      </section>

      {/* WHY FOUNDING MEMBERS — moved last in emotional middle for cohort-of-survivors mission close */}
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
          <p className="emphasis">
            Your feedback is the single most important thing in this program.
          </p>
          <p className="emphasis">
            This is how great software gets built. Not in boardrooms. Not from market research. From the
            people living the problem, telling the truth about what helps and what doesn&apos;t. Every survey
            response, every bug you flag, every &quot;I wish it did this&quot;: it shapes what reaches the next
            survivor faster.
          </p>
          <p className="emphasis">
            The next 10 million parents needing this tool aren&apos;t going to wait. We don&apos;t have years to
            figure it out.
          </p>

          <blockquote className="pull-quote">
            What you tell me in week one might be the change that helps a mother walk into court next month
            with the documentation that wins her case.
          </blockquote>

          <p className="emphasis">
            That&apos;s the work. Honest feedback, fast iteration, real impact. We owe it to the people coming
            behind us.
          </p>
          <p className="signed">— Rae, Founder</p>
        </div>
      </section>

      </div>{/* /emotional-middle */}

      {/* ARE YOU READY? */}
      <section className="section ready-section">
        <h2 className="ready-h2">Are you ready?</h2>
        <div className="ready-lines">
          <p>Ready to take your life back?</p>
          <p>Ready to take your power back?</p>
          <p>Ready to remember who you were before the chaos, and become the version of yourself you&apos;re meant to be from here?</p>
          <p>Ready to heal so you can be the parent your kids actually need?</p>
          <p>Ready to walk into your next court date documented, prepared, and unshakable?</p>
        </div>
        <p className="ready-yes">If yes, this is for you.</p>
        <div className="ready-cta-wrap">
          <a href="#apply" className="btn-primary btn-ready">Claim my spot</a>
        </div>
      </section>

      {/* APPLICATION */}
      <section id="apply" className="section apply-section">
        <h2 className="center">Apply to become a Founding Member</h2>
        <p className="apply-deadline">Applications close Wednesday, May 6 at 11:59 PM MST.</p>
        {refToken && (
          <p className="ref-banner">Referred by another Founding Member ✓</p>
        )}

        <form onSubmit={handleSubmit} className="apply-form">
          <p className="form-intro">
            Tell me about you. I read every application personally. There&apos;s no right answer to any of these questions, just be honest. Most people only need 5 minutes.
          </p>

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

          <fieldset className="field">
            <legend className="field-label">What are you dealing with right now? <em>*</em></legend>
            <p className="field-sublabel">Pick as many as apply. No wrong answers.</p>
            <div className="challenge-pills">
              {CHALLENGE_PILLS.map(p => (
                <label
                  key={p.value}
                  className={`challenge-pill ${challengePills.has(p.value) ? 'on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={challengePills.has(p.value)}
                    onChange={() => togglePill(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span className="field-label">Anything else you want me to know? <em>(optional, 1-2 sentences)</em></span>
            <textarea
              value={challengeOther}
              onChange={(e) => setChallengeOther(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Skip if the pills above cover it."
            />
          </label>

          <label className="field">
            <span className="field-label">Are you currently working with an attorney? <em>(optional)</em></span>
            <select
              value={workingWithAttorney}
              onChange={(e) => setWorkingWithAttorney(e.target.value)}
            >
              <option value="">Select&hellip;</option>
              <option value="yes_currently">Yes, currently</option>
              <option value="past_not_current">I have in the past, but not currently</option>
              <option value="no">No, not working with one</option>
              <option value="prefer_not_to_say">I don&apos;t want to share</option>
            </select>
          </label>

          {workingWithAttorney === 'yes_currently' && (
            <div className="attorney-followup">
              <p>
                After 30 days, if Pattern18 is helping you, I&apos;ll send you a referral code your
                attorney can use to get early access to Pattern18 for Firms, our portal designed
                specifically for family law attorneys handling high-conflict cases. They get early
                access. You get an additional 3 months of Pattern18 added to your account. No
                pressure, no obligation, opt-in only.
              </p>
            </div>
          )}

          <fieldset className="field">
            <legend className="field-label">Can you commit to honest weekly feedback? <em>*</em></legend>
            <p className="field-sublabel">A quick 15-minute weekly check-in. Tell me what&apos;s working, what&apos;s broken, and what you wish Pattern18 did better.</p>
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

          <button type="submit" disabled={submitting} className="btn-primary btn-block">
            {submitting ? 'Sending…' : 'Claim my spot'}
          </button>
          <p className="form-foot">
            <span className="form-foot-icon" aria-hidden="true">✉</span>
            <em>I personally review every application. Expect to hear back within 3 days.</em>
          </p>

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
      .deadline-emphasis {
        color: var(--teal);
        font-weight: 700;
      }
      .hero .btn-primary { min-width: 320px; }

      .section {
        max-width: 920px;
        margin: 0 auto;
        padding: 64px 24px;
      }
      /* Alternating background band for the emotional middle (sections
         If no one around you gets it / What Pattern18 actually does /
         Why I built this / Why Founding Members?). Full-bleed band on
         a paler-than-teal-tint shade that reads as a clean section
         break against warm-white. */
      .emotional-middle {
        background: #F0F7F6;
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
        font-family: var(--serif);
        font-size: 18px;
        line-height: 1.65;
        margin-bottom: 18px;
        color: var(--charcoal);
      }
      .founder-letter p.emphasis {
        font-weight: 600;
      }
      .founder-letter p.emphasis + p.emphasis {
        margin-top: -4px;
      }
      .founder-letter .signed {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 400;
        color: var(--teal);
        font-size: 18px;
        margin-top: 24px;
      }

      /* Shared pull-quote treatment used inside Why Founding Members
         and Why I Built This. Larger Fraunces, indented, teal accent. */
      .pull-quote {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 500;
        font-size: clamp(20px, 2.6vw, 26px);
        line-height: 1.45;
        color: var(--charcoal);
        border-left: 4px solid var(--teal);
        padding: 6px 0 6px 22px;
        margin: 28px 0 28px 12px;
        max-width: 640px;
        letter-spacing: -0.005em;
      }

      /* Why I built this — the proof */
      .proof-section {
        padding-top: 96px;
        padding-bottom: 96px;
      }
      .proof-letter {
        max-width: 720px;
        border-left: 3px solid var(--teal);
        padding: 8px 28px;
      }
      .proof-letter p {
        font-size: 17px;
        line-height: 1.7;
        margin-bottom: 18px;
        color: var(--charcoal);
      }
      .proof-letter p.proof-standalone {
        font-family: var(--serif);
        font-weight: 500;
        font-size: clamp(20px, 2.4vw, 24px);
        line-height: 1.4;
        color: var(--charcoal);
        margin: 28px 0;
        letter-spacing: -0.005em;
      }
      .proof-letter .pull-quote {
        margin-left: 0;
      }
      .proof-letter .signed {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 400;
        color: var(--teal);
        font-size: 18px;
        margin-top: 28px;
      }
      @media (max-width: 480px) {
        .proof-letter { padding: 8px 18px; }
        .proof-letter p.proof-standalone { margin: 22px 0; }
      }

      /* Price anchor above What Founding Members get */
      .price-anchor {
        text-align: center;
        font-family: var(--serif);
        font-style: italic;
        font-size: 15px;
        color: var(--charcoal);
        opacity: 0.75;
        max-width: 640px;
        margin: -10px auto 28px;
        line-height: 1.55;
      }

      /* Form intro + foot polish */
      .form-intro {
        font-size: 15px;
        line-height: 1.6;
        color: var(--charcoal);
        opacity: 0.8;
        margin: 0 0 22px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--teal-border);
      }
      .form-foot-icon {
        color: var(--teal);
        margin-right: 6px;
        font-style: normal;
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

      /* If no one around you gets it */
      .listen-section {
        padding-top: 96px;
        padding-bottom: 96px;
        max-width: 760px;
      }
      .listen-h2 {
        text-align: center;
        font-size: clamp(30px, 4.6vw, 44px);
        margin-bottom: 28px;
      }
      .listen-section > p {
        font-size: 17px;
        line-height: 1.7;
        margin-bottom: 18px;
        color: var(--charcoal);
      }
      .listen-quotes {
        margin: 24px 0 32px;
        padding-left: 18px;
        border-left: 2px solid var(--teal-border);
      }
      .listen-quotes p {
        font-family: var(--serif);
        font-style: italic;
        font-size: 18px;
        line-height: 1.55;
        margin-bottom: 8px;
        color: var(--charcoal-70);
      }
      .listen-when {
        margin: 28px 0 40px;
      }
      .listen-when p {
        font-size: 17px;
        line-height: 1.6;
        margin-bottom: 12px;
        color: var(--charcoal);
      }
      .listen-affirmations {
        text-align: center;
        margin: 48px 0 40px;
      }
      .listen-affirmations p {
        font-family: var(--serif);
        font-weight: 600;
        font-size: clamp(20px, 2.6vw, 26px);
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--charcoal);
        margin: 0;
        padding: 22px 0;
      }
      .listen-close {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 500;
        font-size: clamp(22px, 2.9vw, 30px);
        text-align: center;
        color: var(--teal);
        line-height: 1.4;
        letter-spacing: -0.01em;
        margin-top: 40px;
      }

      /* What Pattern18 actually does */
      .lead-in {
        font-family: var(--serif);
        font-style: italic;
        font-size: 18px;
        color: var(--charcoal);
        opacity: 0.85;
        margin-bottom: 22px;
      }
      .action-list {
        max-width: 720px;
      }
      .action-list p {
        font-size: 16px;
        line-height: 1.65;
        margin-bottom: 16px;
        color: var(--charcoal);
      }
      .action-list strong {
        color: var(--deep-teal);
        font-weight: 700;
      }
      .save-card {
        max-width: 720px;
        background: var(--teal-tint);
        border: 1px solid var(--teal-border);
        border-radius: 16px;
        padding: 28px 28px 22px;
        margin-top: 28px;
      }
      .save-card h3 {
        font-family: var(--serif);
        font-weight: 700;
        font-size: 22px;
        margin-bottom: 14px;
        color: var(--charcoal);
      }
      .save-card p {
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 12px;
        color: var(--charcoal);
      }
      .save-card p:last-child { margin-bottom: 0; }
      .save-card strong {
        color: var(--deep-teal);
        font-weight: 700;
      }

      /* Are you ready? — climactic, ~1.5x larger headline,
         tightly restricted line width, larger CTA */
      .ready-section {
        text-align: center;
        padding-top: 120px;
        padding-bottom: 120px;
      }
      .ready-h2 {
        font-family: var(--serif);
        font-weight: 800;
        font-size: clamp(56px, 10vw, 100px);
        line-height: 1.0;
        letter-spacing: -0.025em;
        margin-bottom: 56px;
        color: var(--charcoal);
      }
      .ready-lines {
        max-width: 580px;
        margin: 0 auto 48px;
      }
      .ready-lines p {
        font-family: var(--serif);
        font-weight: 500;
        font-size: clamp(20px, 2.5vw, 25px);
        line-height: 1.45;
        margin: 0;
        padding: 22px 0;
        color: var(--charcoal);
      }
      .ready-lines p + p { border-top: 1px solid var(--teal-border); }
      .ready-yes {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 600;
        font-size: clamp(24px, 3.4vw, 34px);
        color: var(--teal);
        margin: 32px 0 48px;
        letter-spacing: -0.01em;
      }
      .ready-cta-wrap { display: flex; justify-content: center; }
      .btn-ready {
        font-size: 18px;
        padding: 20px 40px;
        min-height: 60px;
        min-width: 340px;
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
      .apply-form {
        width: 100%;
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

      .field-sublabel {
        display: block;
        font-size: 13px;
        font-style: italic;
        font-weight: 400;
        color: var(--charcoal-70);
        margin: -2px 0 8px;
        line-height: 1.5;
      }

      .challenge-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 4px 0 10px;
      }
      .challenge-pill {
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        padding: 10px 14px;
        border: 1px solid var(--teal-border);
        background: var(--warm-white);
        border-radius: 999px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        color: var(--charcoal);
        line-height: 1.3;
        transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
      }
      .challenge-pill:hover {
        border-color: var(--teal);
      }
      .challenge-pill input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .challenge-pill.on {
        background: var(--teal);
        color: var(--warm-white);
        border-color: var(--teal);
      }

      .apply-deadline {
        text-align: center;
        font-size: 13px;
        font-style: italic;
        color: var(--charcoal-70);
        margin: 0 0 18px;
      }

      .attorney-followup {
        background: var(--teal-tint);
        border: 1px solid var(--teal-border);
        border-radius: 10px;
        padding: 14px 16px;
        margin: -8px 0 18px;
      }
      .attorney-followup p {
        margin: 0;
        font-size: 14px;
        line-height: 1.55;
        color: var(--charcoal);
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
