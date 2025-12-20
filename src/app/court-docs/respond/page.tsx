"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

export default function RespondToFilingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [filingText, setFilingText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<number, string>>({});

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/login");
    };
    check();
  }, [router]);

  const extractClaims = () => {
    setExtracting(true);
    setTimeout(() => {
      setClaims([
        { id: 1, text: "Respondent has refused parenting time.", category: "Parenting Time" },
        { id: 2, text: "Respondent made unilateral decisions about education.", category: "Decision Making" },
        { id: 3, text: "Respondent engaged in alienating behavior.", category: "Parental Alienation" }
      ]);
      setExtracting(false);
      setStep(2);
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="respond-page">
        <h1>Respond to Their Filing</h1>
        <p className="subtitle">Upload their motion and build your response with evidence.</p>

        <div className="progress">
          <div className={`step ${step >= 1 ? "active" : ""}`}>1. Upload</div>
          <div className={`step ${step >= 2 ? "active" : ""}`}>2. Review Claims</div>
          <div className={`step ${step >= 3 ? "active" : ""}`}>3. Respond</div>
          <div className={`step ${step >= 4 ? "active" : ""}`}>4. Generate</div>
        </div>

        {step === 1 && (
          <div className="card">
            <h2>Upload Their Filing</h2>
            <textarea
              value={filingText}
              onChange={e => setFilingText(e.target.value)}
              placeholder="Paste the text of their motion or petition here..."
              rows={8}
            />
            <button onClick={extractClaims} disabled={!filingText.trim() || extracting} className="primary-btn">
              {extracting ? "Extracting..." : "Extract Claims"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>Claims Identified</h2>
            <p>We found {claims.length} claims in their filing.</p>
            <div className="claims-list">
              {claims.map(c => (
                <div key={c.id} className="claim-item">
                  <span className="claim-category">{c.category}</span>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
            <div className="btn-row">
              <button onClick={() => setStep(1)} className="secondary-btn">Back</button>
              <button onClick={() => setStep(3)} className="primary-btn">Build Responses</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2>Your Response to Each Claim</h2>
            <div className="responses-list">
              {claims.map(c => (
                <div key={c.id} className="response-item">
                  <p className="claim-text">"{c.text}"</p>
                  <div className="response-options">
                    <button className={responses[c.id] === "deny" ? "selected" : ""} onClick={() => setResponses(p => ({...p, [c.id]: "deny"}))}>Deny</button>
                    <button className={responses[c.id] === "admit" ? "selected" : ""} onClick={() => setResponses(p => ({...p, [c.id]: "admit"}))}>Admit</button>
                    <button className={responses[c.id] === "partial" ? "selected" : ""} onClick={() => setResponses(p => ({...p, [c.id]: "partial"}))}>Admit in Part</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="btn-row">
              <button onClick={() => setStep(2)} className="secondary-btn">Back</button>
              <button onClick={() => setStep(4)} className="primary-btn">Generate Documents</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card success">
            <div className="success-icon">✓</div>
            <h2>Documents Ready!</h2>
            <p>Your response documents have been generated.</p>
            <div className="doc-list">
              <div className="doc-item"><span>📄</span> Response to Motion (Word)</div>
              <div className="doc-item"><span>📎</span> Exhibit A: Evidence Log (PDF)</div>
            </div>
            <button onClick={() => router.push("/documents")} className="primary-btn">Back to Documents</button>
          </div>
        )}
      </div>

      <style jsx>{`
        .respond-page { max-width: 700px; margin: 0 auto; }
        h1 { margin: 0 0 8px; font-size: 28px; color: #1a3a2f; }
        .subtitle { color: #666; margin: 0 0 24px; }
        .progress { display: flex; gap: 8px; margin-bottom: 24px; }
        .step { flex: 1; padding: 12px; text-align: center; background: #eee; border-radius: 8px; font-size: 13px; color: #666; }
        .step.active { background: #1a3a2f; color: white; }
        .card { background: white; border-radius: 16px; padding: 24px; }
        .card h2 { margin: 0 0 16px; font-size: 18px; color: #1a3a2f; }
        textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
        .primary-btn { background: #2dd4a8; color: #1a3a2f; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .primary-btn:disabled { opacity: 0.5; }
        .secondary-btn { background: white; border: 1px solid #ddd; padding: 14px 28px; border-radius: 8px; cursor: pointer; }
        .btn-row { display: flex; justify-content: space-between; margin-top: 20px; }
        .claims-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
        .claim-item { background: #f8f8f8; padding: 16px; border-radius: 10px; }
        .claim-category { font-size: 11px; background: #1a3a2f; color: white; padding: 2px 10px; border-radius: 10px; }
        .claim-item p { margin: 8px 0 0; }
        .responses-list { display: flex; flex-direction: column; gap: 16px; }
        .response-item { border: 1px solid #eee; padding: 16px; border-radius: 10px; }
        .claim-text { margin: 0 0 12px; font-style: italic; color: #555; }
        .response-options { display: flex; gap: 8px; }
        .response-options button { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; }
        .response-options button.selected { background: #1a3a2f; color: white; border-color: #1a3a2f; }
        .success { text-align: center; }
        .success-icon { width: 60px; height: 60px; background: #2dd4a8; color: #1a3a2f; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 16px; }
        .doc-list { margin: 24px 0; }
        .doc-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f8f8; border-radius: 8px; margin-bottom: 8px; }
      `}</style>
    </AppLayout>
  );
}
