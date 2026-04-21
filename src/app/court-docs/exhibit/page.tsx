"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";

function ExhibitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const incidentIds = searchParams.get('incidents');

  return (
    <div className="coming-soon">
      <div className="icon">📎</div>
      <h1>Exhibit Package Builder</h1>
      <p>Bundle your evidence into court-ready exhibits.</p>
      {incidentIds && (
        <p className="selected">Selected incidents: {incidentIds.split(',').length}</p>
      )}
      <p className="subtext">Select incidents from your evidence library and generate professionally formatted exhibit packages with proper labeling (Exhibit A, B, C...).</p>
      <div className="actions">
        <button className="primary" onClick={() => router.push("/evidence")}>
          Select Evidence →
        </button>
        <button className="secondary" onClick={() => router.push("/documents/generate")}>
          ← Back to Document Options
        </button>
      </div>
      <div className="notice">
        <strong>Coming Soon</strong>
        <p>Full exhibit generation is under development. Your evidence is being documented and will be ready when this feature launches.</p>
      </div>
    </div>
  );
}

export default function ExhibitBuilderPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div style={{textAlign:'center',padding:'80px'}}>Loading...</div>}>
        <ExhibitContent />
      </Suspense>

      <style jsx global>{`
        .coming-soon {
          text-align: center;
          padding: 60px 20px;
          max-width: 500px;
          margin: 0 auto;
        }
        .coming-soon .icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        .coming-soon h1 {
          margin: 0 0 12px;
          color: #1F2937;
        }
        .coming-soon p {
          color: #666;
          margin: 0 0 8px;
        }
        .coming-soon .selected {
          background: #EAF5F3;
          color: #2e7d32;
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-block;
          font-size: 14px;
          margin: 8px 0;
        }
        .coming-soon .subtext {
          font-size: 14px;
          color: #999;
          margin-bottom: 32px;
        }
        .coming-soon .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          margin-bottom: 32px;
        }
        .coming-soon button {
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        .coming-soon .primary {
          background: #2dd4a8;
          color: #1F2937;
          border: none;
          font-weight: 600;
        }
        .coming-soon .secondary {
          background: none;
          color: #666;
          border: 1px solid #ddd;
        }
        .coming-soon .notice {
          background: #f0f9f6;
          border-radius: 12px;
          padding: 20px;
          text-align: left;
        }
        .coming-soon .notice strong {
          color: #1F2937;
        }
        .coming-soon .notice p {
          margin: 8px 0 0;
          font-size: 14px;
        }
      `}</style>
    </AppLayout>
  );
}