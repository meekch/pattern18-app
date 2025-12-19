"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ExtractedClaim {
  index: number;
  text: string;
  category: string;
  matchingIncidents: string[];
}

interface CaseInfo {
  user_role: string;
  user_legal_name: string;
  coparent_legal_name: string;
  case_number: string;
  court_name: string;
}

export default function RespondToFilingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  
  // Workflow state
  const [step, setStep] = useState<'upload' | 'review' | 'respond' | 'generate'>('upload');
  const [filingFile, setFilingFile] = useState<File | null>(null);
  const [filingText, setFilingText] = useState("");
  const [extractedClaims, setExtractedClaims] = useState<ExtractedClaim[]>([]);
  const [responses, setResponses] = useState<Record<number, {
    type: 'admit' | 'deny' | 'admit_in_part' | 'insufficient_knowledge';
    statement: string;
    evidenceIds: string[];
  }>>({});
  
  // Processing state
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      await loadData(session.user.id);
    };
    checkAuth();
  }, [router]);

  const loadData = async (userId: string) => {
    // Load case info
    const { data: caseData } = await supabase
      .from("user_cases")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (caseData) {
      setCaseInfo(caseData);
    }

    // Load incidents for matching
    const response = await fetch(`/api/incidents?userId=${userId}`);
    const data = await response.json();
    if (data.incidents) {
      setIncidents(data.incidents);
    }

    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilingFile(file);
  };

  const extractClaims = async () => {
    if (!filingFile && !filingText) return;
    
    setExtracting(true);
    
    // TODO: Call AI API to extract claims from filing
    // For now, simulate with placeholder
    setTimeout(() => {
      const mockClaims: ExtractedClaim[] = [
        {
          index: 0,
          text: "Respondent has repeatedly refused to allow Petitioner scheduled parenting time.",
          category: "Parenting Time",
          matchingIncidents: []
        },
        {
          index: 1,
          text: "Respondent has made unilateral decisions about the minor child's education without consulting Petitioner.",
          category: "Decision Making",
          matchingIncidents: []
        },
        {
          index: 2,
          text: "Respondent has engaged in a pattern of alienating behavior designed to damage the relationship between Petitioner and the minor child.",
          category: "Parental Alienation",
          matchingIncidents: []
        }
      ];
      
      // Match incidents to claims based on patterns
      mockClaims.forEach(claim => {
        const matches = incidents.filter(inc => {
          const patterns = inc.patterns || [];
          if (claim.category === "Parenting Time" && patterns.some((p: string) => p.toLowerCase().includes("gatekeeping"))) return true;
          if (claim.category === "Parental Alienation" && patterns.some((p: string) => p.toLowerCase().includes("alienation"))) return true;
          return false;
        });
        claim.matchingIncidents = matches.map(m => m.id);
      });
      
      setExtractedClaims(mockClaims);
      
      // Initialize responses
      const initialResponses: typeof responses = {};
      mockClaims.forEach(claim => {
        initialResponses[claim.index] = {
          type: 'deny',
          statement: '',
          evidenceIds: claim.matchingIncidents
        };
      });
      setResponses(initialResponses);
      
      setStep('review');
      setExtracting(false);
    }, 2000);
  };

  const updateResponse = (claimIndex: number, field: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [claimIndex]: {
        ...prev[claimIndex],
        [field]: value
      }
    }));
  };

  const generateDocuments = async () => {
    setGenerating(true);
    
    // TODO: Generate actual documents
    setTimeout(() => {
      setStep('generate');
      setGenerating(false);
    }, 2000);
  };

  const getPartyLabel = (role: 'petitioner' | 'respondent') => {
    if (!caseInfo) return role;
    if (role === 'petitioner') {
      return caseInfo.user_role === 'petitioner' 
        ? `${caseInfo.user_legal_name} (You)` 
        : caseInfo.coparent_legal_name;
    } else {
      return caseInfo.user_role === 'respondent' 
        ? `${caseInfo.user_legal_name} (You)` 
        : caseInfo.coparent_legal_name;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0d1f18 0%, #1a3a2f 100%);
            color: white;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top-color: #2dd4a8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="respond-page">
      <header className="header">
        <button onClick={() => router.push("/evidence")} className="back-btn">
          ← Back to Evidence
        </button>
        <h1>📩 Respond to Their Filing</h1>
        <div style={{ width: 100 }} />
      </header>

      {/* Case setup required */}
      {!caseInfo && (
        <div className="setup-required">
          <h2>⚠️ Case Setup Required</h2>
          <p>You need to set up your case information before generating court documents.</p>
          <button onClick={() => router.push("/case-setup")}>
            Set Up Case Info →
          </button>
        </div>
      )}

      {caseInfo && (
        <main className="main">
          {/* Progress */}
          <div className="progress">
            <div className={`step ${step === 'upload' ? 'active' : step !== 'upload' ? 'done' : ''}`}>
              1. Upload Filing
            </div>
            <div className={`step ${step === 'review' ? 'active' : step === 'respond' || step === 'generate' ? 'done' : ''}`}>
              2. Review Claims
            </div>
            <div className={`step ${step === 'respond' ? 'active' : step === 'generate' ? 'done' : ''}`}>
              3. Your Response
            </div>
            <div className={`step ${step === 'generate' ? 'active' : ''}`}>
              4. Generate
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="card">
              <h2>Upload Their Filing</h2>
              <p className="subtitle">
                Upload the motion or petition you need to respond to. 
                We'll extract their claims and match your evidence.
              </p>

              <div className="upload-area">
                <input
                  type="file"
                  id="filing-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="filing-upload" className="upload-label">
                  <div className="upload-icon">📄</div>
                  <div className="upload-text">
                    {filingFile ? filingFile.name : 'Click to upload PDF or Word document'}
                  </div>
                </label>
              </div>

              <div className="divider">
                <span>or paste the text</span>
              </div>

              <textarea
                value={filingText}
                onChange={(e) => setFilingText(e.target.value)}
                placeholder="Paste the filing text here..."
                className="text-input"
                rows={6}
              />

              <button
                className="primary-btn"
                onClick={extractClaims}
                disabled={(!filingFile && !filingText) || extracting}
              >
                {extracting ? 'Extracting Claims...' : 'Extract Claims →'}
              </button>
            </div>
          )}

          {/* Step 2: Review Claims */}
          {step === 'review' && (
            <div className="card">
              <h2>Claims Identified</h2>
              <p className="subtitle">
                We found {extractedClaims.length} claims in their filing. 
                Review each and we'll match your evidence.
              </p>

              <div className="claims-list">
                {extractedClaims.map((claim) => (
                  <div key={claim.index} className="claim-card">
                    <div className="claim-header">
                      <span className="claim-number">Claim {claim.index + 1}</span>
                      <span className="claim-category">{claim.category}</span>
                    </div>
                    <p className="claim-text">"{claim.text}"</p>
                    <div className="claim-evidence">
                      {claim.matchingIncidents.length > 0 ? (
                        <span className="evidence-match">
                          ✓ {claim.matchingIncidents.length} matching incident(s) found
                        </span>
                      ) : (
                        <span className="evidence-none">
                          ⚠️ No matching evidence found
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="button-row">
                <button className="secondary-btn" onClick={() => setStep('upload')}>
                  ← Back
                </button>
                <button className="primary-btn" onClick={() => setStep('respond')}>
                  Build Responses →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Build Responses */}
          {step === 'respond' && (
            <div className="card">
              <h2>Your Response to Each Claim</h2>
              <p className="subtitle">
                For each claim, select your response type and add supporting evidence.
              </p>

              <div className="responses-list">
                {extractedClaims.map((claim) => (
                  <div key={claim.index} className="response-card">
                    <div className="response-claim">
                      <strong>Claim {claim.index + 1}:</strong> "{claim.text}"
                    </div>

                    <div className="response-type">
                      <label>Your Response:</label>
                      <div className="response-options">
                        {(['admit', 'deny', 'admit_in_part', 'insufficient_knowledge'] as const).map(type => (
                          <button
                            key={type}
                            className={`response-option ${responses[claim.index]?.type === type ? 'selected' : ''}`}
                            onClick={() => updateResponse(claim.index, 'type', type)}
                          >
                            {type === 'admit' && 'Admit'}
                            {type === 'deny' && 'Deny'}
                            {type === 'admit_in_part' && 'Admit in Part'}
                            {type === 'insufficient_knowledge' && 'Insufficient Knowledge'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="response-statement">
                      <label>Your Statement:</label>
                      <textarea
                        value={responses[claim.index]?.statement || ''}
                        onChange={(e) => updateResponse(claim.index, 'statement', e.target.value)}
                        placeholder="Explain your response..."
                        rows={3}
                      />
                    </div>

                    <div className="response-evidence">
                      <label>Supporting Evidence ({responses[claim.index]?.evidenceIds?.length || 0} selected):</label>
                      <button 
                        className="add-evidence-btn"
                        onClick={() => {
                          // TODO: Open evidence selector modal
                          alert('Evidence selector coming soon');
                        }}
                      >
                        + Select Evidence
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="button-row">
                <button className="secondary-btn" onClick={() => setStep('review')}>
                  ← Back
                </button>
                <button className="primary-btn" onClick={generateDocuments} disabled={generating}>
                  {generating ? 'Generating...' : 'Generate Documents →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {step === 'generate' && (
            <div className="card success-card">
              <div className="success-icon">✓</div>
              <h2>Documents Ready!</h2>
              <p className="subtitle">
                Your response documents have been generated.
              </p>

              <div className="documents-list">
                <div className="document-item">
                  <span className="doc-icon">📄</span>
                  <div className="doc-info">
                    <div className="doc-title">Response to Motion</div>
                    <div className="doc-desc">Word document (.docx)</div>
                  </div>
                  <button className="download-btn">Download</button>
                </div>

                <div className="document-item">
                  <span className="doc-icon">📎</span>
                  <div className="doc-info">
                    <div className="doc-title">Exhibit A: Communication Log</div>
                    <div className="doc-desc">PDF format</div>
                  </div>
                  <button className="download-btn">Download</button>
                </div>

                <div className="document-item">
                  <span className="doc-icon">📊</span>
                  <div className="doc-info">
                    <div className="doc-title">Exhibit B: Pattern Analysis</div>
                    <div className="doc-desc">PDF format</div>
                  </div>
                  <button className="download-btn">Download</button>
                </div>
              </div>

              <div className="button-row">
                <button className="secondary-btn" onClick={() => router.push('/evidence')}>
                  Back to Dashboard
                </button>
                <button className="primary-btn" onClick={() => setStep('upload')}>
                  Respond to Another Filing
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      <style jsx>{`
        .respond-page {
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
        .header h1 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .setup-required {
          max-width: 500px;
          margin: 60px auto;
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .setup-required h2 {
          color: #856404;
          margin: 0 0 12px;
        }
        .setup-required p {
          color: #666;
          margin: 0 0 24px;
        }
        .setup-required button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .main {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .progress {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .step {
          flex: 1;
          padding: 12px 8px;
          text-align: center;
          background: #e0e0e0;
          border-radius: 8px;
          font-size: 12px;
          color: #666;
        }
        .step.active {
          background: #1a3a2f;
          color: white;
        }
        .step.done {
          background: #2dd4a8;
          color: #1a3a2f;
        }

        .card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .card h2 {
          margin: 0 0 8px;
          color: #1a3a2f;
        }
        .subtitle {
          color: #666;
          margin: 0 0 24px;
          font-size: 14px;
        }

        .upload-area {
          margin-bottom: 24px;
        }
        .hidden {
          display: none;
        }
        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          border: 2px dashed #ddd;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-label:hover {
          border-color: #2dd4a8;
          background: #f9fffd;
        }
        .upload-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .upload-text {
          color: #666;
        }

        .divider {
          text-align: center;
          color: #999;
          margin: 24px 0;
          font-size: 13px;
        }

        .text-input {
          width: 100%;
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 24px;
        }

        .claims-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .claim-card {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 16px;
        }
        .claim-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .claim-number {
          font-weight: 600;
          color: #1a3a2f;
        }
        .claim-category {
          font-size: 12px;
          background: #f0f0f0;
          padding: 2px 10px;
          border-radius: 10px;
          color: #666;
        }
        .claim-text {
          font-style: italic;
          color: #555;
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .evidence-match {
          color: #28a745;
          font-size: 13px;
        }
        .evidence-none {
          color: #dc3545;
          font-size: 13px;
        }

        .responses-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 24px;
        }
        .response-card {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 20px;
        }
        .response-claim {
          font-size: 13px;
          color: #555;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        .response-type label,
        .response-statement label,
        .response-evidence label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          margin-bottom: 8px;
        }
        .response-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .response-option {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 13px;
        }
        .response-option.selected {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }
        .response-statement textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 16px;
        }
        .add-evidence-btn {
          background: #f0f9f6;
          border: 1px solid #2dd4a8;
          color: #1a3a2f;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .success-card {
          text-align: center;
        }
        .success-icon {
          width: 64px;
          height: 64px;
          background: #2dd4a8;
          color: #1a3a2f;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 20px;
        }

        .documents-list {
          margin: 24px 0;
          text-align: left;
        }
        .document-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid #eee;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .doc-icon {
          font-size: 24px;
        }
        .doc-info {
          flex: 1;
        }
        .doc-title {
          font-weight: 600;
          color: #333;
        }
        .doc-desc {
          font-size: 12px;
          color: #999;
        }
        .download-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .button-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .primary-btn {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .secondary-btn {
          background: white;
          color: #333;
          border: 1px solid #ddd;
          padding: 14px 28px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .response-options {
            flex-direction: column;
          }
          .button-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}