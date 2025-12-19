"use client";

import { useRouter } from "next/navigation";
import BulkMessageUpload from "@/components/evidence/BulkMessageUpload";

export default function EvidenceUploadPage() {
  const router = useRouter();

  return (
    <div className="upload-page">
      <header className="header">
        <button onClick={() => router.push("/evidence")} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>📤 Import Messages</h1>
        <div style={{ width: 100 }} /> {/* Spacer for alignment */}
      </header>

      <main className="main">
        <BulkMessageUpload />
      </main>

      <style jsx>{`
        .upload-page {
          min-height: 100vh;
          background: #f8faf9;
        }
        .header {
          background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
        }
        .back-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          cursor: pointer;
        }
        .back-btn:hover { color: white; }
        .header h1 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .main {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }
      `}</style>
    </div>
  );
}