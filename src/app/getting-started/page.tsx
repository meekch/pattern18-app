'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function GettingStartedPage() {
  const router = useRouter();

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>Getting Started</h1>
      </header>

      <div className="content">
        <div className="welcome-card">
          <div className="icon">👋</div>
          <h2>Welcome to Pattern 18</h2>
          <p>Your strategic partner for navigating high-conflict co-parenting. Here's how to get the most out of it.</p>
        </div>

        <div className="step-card">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Set Up Your Case</h3>
            <p>Add your basic case info so documents generate with the right names and details.</p>
            <button onClick={() => router.push('/case-setup')} className="step-btn">
              Go to Case Settings →
            </button>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Upload a Screenshot</h3>
            <p>Got a difficult message? Upload it and get help crafting a calm, strategic response.</p>
            <button onClick={() => router.push('/coach')} className="step-btn">
              Go to Coach →
            </button>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Build Your Evidence</h3>
            <p>Every interaction you document builds your case. Patterns are automatically detected and tracked.</p>
            <button onClick={() => router.push('/my-case')} className="step-btn">
              View My Case →
            </button>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>Generate Court Documents</h3>
            <p>When you're ready, create pattern summaries, timelines, and declarations from your evidence.</p>
            <button onClick={() => router.push('/docs')} className="step-btn">
              Go to Docs →
            </button>
          </div>
        </div>

        <div className="tips-card">
          <h3>💡 Pro Tips</h3>
          <ul>
            <li><strong>Don't respond immediately</strong> - Use the coach to craft a response first</li>
            <li><strong>Save everything</strong> - Even "small" incidents add up to show patterns</li>
            <li><strong>Keep it short</strong> - The best responses are brief and factual</li>
            <li><strong>Your job is to create a clean record</strong> - Not to convince them</li>
          </ul>
        </div>

        <div className="help-card">
          <h3>Need Help?</h3>
          <p>Pattern 18 is in beta. Your feedback helps us improve!</p>
          <p className="email">Questions? Email <a href="mailto:hello@pattern18.com">support@pattern18.com</a></p>
        </div>
      </div>

      <BottomNav active="menu" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
          padding-bottom: 100px;
        }
        .header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: #1a3a2f;
          color: white;
        }
        .back-btn {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        }
        .header h1 {
          font-size: 20px;
          margin: 0;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .welcome-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .welcome-card h2 {
          color: #1a3a2f;
          margin: 0 0 8px 0;
          font-size: 22px;
        }
        .welcome-card p {
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }
        .step-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex;
          gap: 16px;
        }
        .step-number {
          width: 36px;
          height: 36px;
          background: #1a3a2f;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          flex-shrink: 0;
        }
        .step-content {
          flex: 1;
        }
        .step-content h3 {
          color: #1a3a2f;
          margin: 0 0 6px 0;
          font-size: 16px;
        }
        .step-content p {
          color: #6b7280;
          margin: 0 0 12px 0;
          font-size: 14px;
          line-height: 1.4;
        }
        .step-btn {
          background: #f0fdf4;
          border: 2px solid #1a3a2f;
          color: #1a3a2f;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .step-btn:hover {
          background: #1a3a2f;
          color: white;
        }
        .tips-card {
          background: #fefce8;
          border: 1px solid #fef08a;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 12px;
        }
        .tips-card h3 {
          color: #854d0e;
          margin: 0 0 12px 0;
          font-size: 16px;
        }
        .tips-card ul {
          margin: 0;
          padding-left: 20px;
          color: #713f12;
        }
        .tips-card li {
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .tips-card strong {
          color: #854d0e;
        }
        .help-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .help-card h3 {
          color: #1a3a2f;
          margin: 0 0 8px 0;
        }
        .help-card p {
          color: #6b7280;
          margin: 0 0 8px 0;
          font-size: 14px;
        }
        .help-card .email a {
          color: #2563eb;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}