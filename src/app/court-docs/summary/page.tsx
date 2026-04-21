"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

export default function PatternSummaryPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="coming-soon">
        <div className="icon">📊</div>
        <h1>Pattern Summary Report</h1>
        <p>Generate a comprehensive report of documented behavior patterns.</p>
        <p className="subtext">This report will show pattern frequency, severity breakdown, timeline of incidents, and evidence strength - perfect for attorneys or court submissions.</p>
        <div className="actions">
          <button className="primary" onClick={() => router.push("/evidence/patterns")}>
            View Patterns Now →
          </button>
          <button className="secondary" onClick={() => router.push("/documents/generate")}>
            ← Back to Document Options
          </button>
        </div>
        <div className="notice">
          <strong>Coming Soon</strong>
          <p>Full PDF report generation is under development. For now, view your patterns in the Evidence section.</p>
        </div>
      </div>

      <style jsx>{`
        .coming-soon {
          text-align: center;
          padding: 60px 20px;
          max-width: 500px;
          margin: 0 auto;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0 0 12px;
          color: #1F2937;
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
          margin-bottom: 32px;
        }
        button {
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        .primary {
          background: #2dd4a8;
          color: #1F2937;
          border: none;
          font-weight: 600;
        }
        .secondary {
          background: none;
          color: #666;
          border: 1px solid #ddd;
        }
        .notice {
          background: #f0f9f6;
          border-radius: 12px;
          padding: 20px;
          text-align: left;
        }
        .notice strong {
          color: #1F2937;
        }
        .notice p {
          margin: 8px 0 0;
          font-size: 14px;
        }
      `}</style>
    </AppLayout>
  );
}