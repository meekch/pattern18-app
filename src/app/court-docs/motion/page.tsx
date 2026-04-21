"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

export default function MotionBuilderPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="coming-soon">
        <div className="icon">📋</div>
        <h1>Motion / Petition Builder</h1>
        <p>Create your own motions with supporting evidence.</p>
        <p className="subtext">Build motions to modify custody, contempt petitions, or other filings. Select your evidence and we'll help format it for court.</p>
        <div className="actions">
          <button className="secondary" onClick={() => router.push("/documents/generate")}>
            ← Back to Document Options
          </button>
        </div>
        <div className="notice">
          <strong>Coming Soon</strong>
          <p>This feature is under development. For now, use the AI Coach to help draft your motion language.</p>
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
          margin-bottom: 32px;
        }
        button {
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
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