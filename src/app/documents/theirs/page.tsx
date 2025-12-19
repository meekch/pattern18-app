"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

export default function TheirFilingsPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="coming-soon">
        <div className="icon">📥</div>
        <h1>Their Filings</h1>
        <p>Upload and track opposing party filings coming soon.</p>
        <p className="subtext">Upload motions and petitions they've filed against you. We'll extract their claims and help you build evidence-backed responses.</p>
        <div className="actions">
          <button className="primary" onClick={() => router.push("/court-docs/respond")}>
            Respond to a Filing Now →
          </button>
          <button className="secondary" onClick={() => router.push("/documents")}>
            ← Back to Documents
          </button>
        </div>
      </div>

      <style jsx>{`
        .coming-soon {
          text-align: center;
          padding: 80px 20px;
          max-width: 500px;
          margin: 0 auto;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0 0 12px;
          color: #1a3a2f;
        }
        p {
          color: #666;
          margin: 0 0 8px;
        }
        .subtext {
          font-size: 14px;
          color: #999;
          margin-bottom: 32px;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        button {
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        .primary {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          font-weight: 600;
        }
        .secondary {
          background: none;
          color: #666;
          border: 1px solid #ddd;
        }
      `}</style>
    </AppLayout>
  );
}