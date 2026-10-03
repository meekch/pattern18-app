'use client';

import SiteNav from '@/components/SiteNav';

const SECTIONS = [
  {
    title: 'How files arrive',
    body: 'We use your firm’s secure portal when you have one. If you don’t, we set up a private Pattern18 folder for the matter, shared only with the attorneys and staff you name. We never accept message exports by email attachment.',
  },
  {
    title: 'Where data is stored',
    body: 'Files are kept in encrypted, access-controlled storage. Matters are labeled with a case code, never a client’s name.',
  },
  {
    title: 'Who can access it',
    body: 'Only the Pattern18 analyst assigned to your matter, using two-factor authentication on every account.',
  },
  {
    title: 'How AI is used',
    body: 'Pattern18 uses AI to flag candidate messages and suggest pattern labels, through Anthropic’s commercial API, where customer data is not used to train models by default. AI never writes quoted text. Every quote, date, and count is checked by a person against the original source before delivery.',
  },
  {
    title: 'Retention',
    body: 'Files are deleted 30 days after delivery unless counsel asks otherwise in writing, and we confirm the deletion in writing.',
  },
];

export default function SecurityPage() {
  return (
    <div className="container">
      <div className="teal-accent" />

      <SiteNav />

      <main className="main">
        <div className="head">
          <h1>How Pattern18 protects client data.</h1>
          <p>Built for attorneys who are responsible for every vendor they use.</p>
        </div>

        <div className="sections">
          {SECTIONS.map((s) => (
            <section key={s.title} className="card">
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>

        <p className="contact">
          Questions about security? Email <a href="mailto:hello@pattern18.com">hello@pattern18.com</a>.
        </p>
      </main>

      <style jsx>{`
        .container {
          min-height: 100dvh;
          background: var(--warm-white);
          color: var(--charcoal);
          font-family: var(--sans);
        }
        .teal-accent { height: 4px; background: var(--teal); }

        .main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 64px 24px 80px;
        }

        .head { text-align: center; margin-bottom: 40px; }
        .head h1 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: clamp(28px, 4vw, 40px);
          color: var(--charcoal);
          margin-bottom: 12px;
        }
        .head p {
          color: var(--charcoal-70);
          font-size: 16px;
          max-width: 540px;
          margin: 0 auto;
        }

        .sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 720px;
          margin: 0 auto;
        }
        .card {
          background: var(--warm-white);
          border: 1px solid var(--teal-border);
          border-radius: 16px;
          padding: 28px 24px;
        }
        .card h2 {
          font-family: var(--serif);
          font-weight: 700;
          font-size: 22px;
          color: var(--charcoal);
          margin-bottom: 10px;
        }
        .card p {
          font-size: 15px;
          color: var(--charcoal);
          line-height: 1.6;
        }

        .contact {
          text-align: center;
          margin-top: 64px;
          font-size: 16px;
          color: var(--charcoal);
        }
        .contact a { color: var(--teal); font-weight: 600; text-decoration: none; }
        .contact a:hover { color: var(--deep-teal); }
      `}</style>
    </div>
  );
}
