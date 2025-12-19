"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface CaseData {
  case_number: string;
  court_name: string;
  court_county: string;
  court_state: string;
  judge_name: string;
  user_role: "petitioner" | "respondent" | "";
  user_legal_name: string;
  coparent_legal_name: string;
  children_names: string[];
  original_filing_date: string;
}

export default function CaseSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingCase, setExistingCase] = useState<any>(null);
  const [step, setStep] = useState(1);
  
  const [caseData, setCaseData] = useState<CaseData>({
    case_number: "",
    court_name: "",
    court_county: "",
    court_state: "Arizona",
    judge_name: "",
    user_role: "",
    user_legal_name: "",
    coparent_legal_name: "",
    children_names: [""],
    original_filing_date: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      
      // Check for existing case
      const { data: existingCaseData } = await supabase
        .from("user_cases")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (existingCaseData) {
        setExistingCase(existingCaseData);
        setCaseData({
          case_number: existingCaseData.case_number || "",
          court_name: existingCaseData.court_name || "",
          court_county: existingCaseData.court_county || "",
          court_state: existingCaseData.court_state || "Arizona",
          judge_name: existingCaseData.judge_name || "",
          user_role: existingCaseData.user_role || "",
          user_legal_name: existingCaseData.user_legal_name || "",
          coparent_legal_name: existingCaseData.coparent_legal_name || "",
          children_names: existingCaseData.children_names || [""],
          original_filing_date: existingCaseData.original_filing_date || "",
        });
      }
      
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const handleSave = async () => {
    if (!user || !caseData.user_role) return;
    
    setSaving(true);
    
    try {
      const saveData = {
        user_id: user.id,
        case_number: caseData.case_number || null,
        court_name: caseData.court_name || null,
        court_county: caseData.court_county || null,
        court_state: caseData.court_state,
        judge_name: caseData.judge_name || null,
        user_role: caseData.user_role,
        user_legal_name: caseData.user_legal_name || null,
        coparent_legal_name: caseData.coparent_legal_name || null,
        children_names: caseData.children_names.filter(n => n.trim()),
        original_filing_date: caseData.original_filing_date || null,
        updated_at: new Date().toISOString(),
      };

      if (existingCase) {
        const { error } = await supabase
          .from("user_cases")
          .update(saveData)
          .eq("id", existingCase.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_cases")
          .insert(saveData);
        if (error) throw error;
      }

      router.push("/evidence");
    } catch (error) {
      console.error("Error saving case:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addChild = () => {
    setCaseData(prev => ({
      ...prev,
      children_names: [...prev.children_names, ""]
    }));
  };

  const updateChildName = (index: number, name: string) => {
    setCaseData(prev => ({
      ...prev,
      children_names: prev.children_names.map((n, i) => i === index ? name : n)
    }));
  };

  const removeChild = (index: number) => {
    if (caseData.children_names.length > 1) {
      setCaseData(prev => ({
        ...prev,
        children_names: prev.children_names.filter((_, i) => i !== index)
      }));
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
    <div className="setup-page">
      <header className="header">
        <button onClick={() => router.push("/coach")} className="back-btn">
          ← Back
        </button>
        <h1>⚖️ Case Setup</h1>
        <div style={{ width: 80 }} />
      </header>

      <main className="main">
        {/* Progress */}
        <div className="progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1. Your Role</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2. Case Info</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3. Parties</div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="card">
            <h2>What is your role in this case?</h2>
            <p className="subtitle">
              This is determined by who filed the <strong>original</strong> petition. 
              This role never changes, even if you file motions later.
            </p>

            <div className="role-options">
              <button
                className={`role-btn ${caseData.user_role === 'petitioner' ? 'selected' : ''}`}
                onClick={() => setCaseData(prev => ({ ...prev, user_role: 'petitioner' }))}
              >
                <div className="role-icon">📋</div>
                <div className="role-title">I am the PETITIONER</div>
                <div className="role-desc">I filed the original case</div>
              </button>

              <button
                className={`role-btn ${caseData.user_role === 'respondent' ? 'selected' : ''}`}
                onClick={() => setCaseData(prev => ({ ...prev, user_role: 'respondent' }))}
              >
                <div className="role-icon">📩</div>
                <div className="role-title">I am the RESPONDENT</div>
                <div className="role-desc">The case was filed against me</div>
              </button>
            </div>

            <div className="info-box">
              <strong>Why does this matter?</strong>
              <p>
                All court documents must use the correct party designations. 
                If you're the Respondent, any motion you file is titled 
                "Respondent's Motion to..." — even though you're filing it.
              </p>
            </div>

            <div className="nav-buttons">
              <div />
              <button 
                className="next-btn" 
                onClick={() => setStep(2)}
                disabled={!caseData.user_role}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Case Info */}
        {step === 2 && (
          <div className="card">
            <h2>Case Information</h2>
            <p className="subtitle">This information appears on court documents</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Case Number</label>
                <input
                  type="text"
                  value={caseData.case_number}
                  onChange={e => setCaseData(prev => ({ ...prev, case_number: e.target.value }))}
                  placeholder="e.g., FC2020-001234"
                />
              </div>

              <div className="form-group">
                <label>Original Filing Date</label>
                <input
                  type="date"
                  value={caseData.original_filing_date}
                  onChange={e => setCaseData(prev => ({ ...prev, original_filing_date: e.target.value }))}
                />
              </div>

              <div className="form-group full-width">
                <label>Court Name</label>
                <input
                  type="text"
                  value={caseData.court_name}
                  onChange={e => setCaseData(prev => ({ ...prev, court_name: e.target.value }))}
                  placeholder="e.g., Superior Court of Arizona"
                />
              </div>

              <div className="form-group">
                <label>County</label>
                <input
                  type="text"
                  value={caseData.court_county}
                  onChange={e => setCaseData(prev => ({ ...prev, court_county: e.target.value }))}
                  placeholder="e.g., Maricopa"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <select
                  value={caseData.court_state}
                  onChange={e => setCaseData(prev => ({ ...prev, court_state: e.target.value }))}
                >
                  <option value="Arizona">Arizona</option>
                  <option value="California">California</option>
                  <option value="Texas">Texas</option>
                  <option value="Florida">Florida</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Judge Name (if assigned)</label>
                <input
                  type="text"
                  value={caseData.judge_name}
                  onChange={e => setCaseData(prev => ({ ...prev, judge_name: e.target.value }))}
                  placeholder="e.g., Hon. Jane Smith"
                />
              </div>
            </div>

            <div className="nav-buttons">
              <button className="back-step-btn" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="next-btn" onClick={() => setStep(3)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Parties */}
        {step === 3 && (
          <div className="card">
            <h2>Party Information</h2>
            <p className="subtitle">Names as they appear on court documents (ALL CAPS recommended)</p>

            <div className="party-section">
              <div className="party-label">
                {caseData.user_role === 'petitioner' ? 'PETITIONER (You)' : 'RESPONDENT (You)'}
              </div>
              <input
                type="text"
                value={caseData.user_legal_name}
                onChange={e => setCaseData(prev => ({ ...prev, user_legal_name: e.target.value }))}
                placeholder="YOUR FULL LEGAL NAME"
                className="party-input"
              />
            </div>

            <div className="party-section">
              <div className="party-label">
                {caseData.user_role === 'petitioner' ? 'RESPONDENT (Co-Parent)' : 'PETITIONER (Co-Parent)'}
              </div>
              <input
                type="text"
                value={caseData.coparent_legal_name}
                onChange={e => setCaseData(prev => ({ ...prev, coparent_legal_name: e.target.value }))}
                placeholder="CO-PARENT'S FULL LEGAL NAME"
                className="party-input"
              />
            </div>

            <div className="children-section">
              <div className="party-label">MINOR CHILD(REN)</div>
              {caseData.children_names.map((name, index) => (
                <div key={index} className="child-row">
                  <input
                    type="text"
                    value={name}
                    onChange={e => updateChildName(index, e.target.value)}
                    placeholder={`Child ${index + 1} name`}
                    className="child-input"
                  />
                  {caseData.children_names.length > 1 && (
                    <button 
                      className="remove-child-btn"
                      onClick={() => removeChild(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button className="add-child-btn" onClick={addChild}>
                + Add Another Child
              </button>
            </div>

            {/* Preview */}
            <div className="preview-box">
              <div className="preview-title">Document Header Preview</div>
              <div className="preview-content">
                <div><strong>{caseData.user_role === 'petitioner' ? caseData.user_legal_name || '[YOUR NAME]' : caseData.coparent_legal_name || '[CO-PARENT NAME]'}</strong></div>
                <div className="preview-role">Petitioner,</div>
                <div className="preview-vs">vs.</div>
                <div><strong>{caseData.user_role === 'respondent' ? caseData.user_legal_name || '[YOUR NAME]' : caseData.coparent_legal_name || '[CO-PARENT NAME]'}</strong></div>
                <div className="preview-role">Respondent.</div>
              </div>
            </div>

            <div className="nav-buttons">
              <button className="back-step-btn" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button 
                className="save-btn" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : existingCase ? 'Update Case Info' : 'Save & Continue'}
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .setup-page {
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

        .main {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .progress {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .progress-step {
          flex: 1;
          padding: 12px;
          text-align: center;
          background: #e0e0e0;
          border-radius: 8px;
          font-size: 13px;
          color: #666;
        }
        .progress-step.active {
          background: #1a3a2f;
          color: white;
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
          font-size: 22px;
        }
        .subtitle {
          color: #666;
          margin: 0 0 24px;
          font-size: 14px;
        }

        .role-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .role-btn {
          padding: 24px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .role-btn:hover {
          border-color: #2dd4a8;
        }
        .role-btn.selected {
          border-color: #1a3a2f;
          background: #f0f9f6;
        }
        .role-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .role-title {
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .role-desc {
          font-size: 13px;
          color: #666;
        }

        .info-box {
          background: #f0f9f6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .info-box strong {
          color: #1a3a2f;
        }
        .info-box p {
          margin: 8px 0 0;
          font-size: 13px;
          color: #555;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group.full-width {
          grid-column: span 2;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #333;
        }
        .form-group input,
        .form-group select {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2dd4a8;
        }

        .party-section {
          margin-bottom: 20px;
        }
        .party-label {
          font-size: 12px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .party-input {
          width: 100%;
          padding: 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          text-transform: uppercase;
        }

        .children-section {
          margin-bottom: 24px;
        }
        .child-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .child-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }
        .remove-child-btn {
          width: 40px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #999;
          font-size: 20px;
          cursor: pointer;
        }
        .remove-child-btn:hover {
          background: #fee;
          color: #c00;
          border-color: #fcc;
        }
        .add-child-btn {
          background: none;
          border: none;
          color: #2dd4a8;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 0;
        }

        .preview-box {
          background: #f8f8f8;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .preview-title {
          font-size: 11px;
          color: #999;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .preview-content {
          font-family: 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.6;
        }
        .preview-role {
          margin-left: 40px;
          font-style: italic;
        }
        .preview-vs {
          margin: 8px 0;
          font-style: italic;
        }

        .nav-buttons {
          display: flex;
          justify-content: space-between;
        }
        .back-step-btn {
          padding: 14px 24px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }
        .next-btn,
        .save-btn {
          padding: 14px 32px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .next-btn:disabled,
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .save-btn {
          background: #2dd4a8;
          color: #1a3a2f;
        }

        @media (max-width: 640px) {
          .role-options {
            grid-template-columns: 1fr;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}