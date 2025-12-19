"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

export default function TimelinePage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="coming-soon">
        <div className="icon">📅</div>
        <h1>Timeline View</h1>
        <p>Visual timeline of incidents coming soon.</p>
        <p className="subtext">This will show your documented incidents on a timeline, making it easy to see patterns of escalation over time.</p>
        <button onClick={() => router.push("/evidence")}>
          ← Back to All Incidents
        </button>
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
        button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
      `}</style>
    </AppLayout>
  );
}