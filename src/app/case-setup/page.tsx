"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

interface CaseInfo {
  id: string;
  user_role: "petitioner" | "respondent";
  case_number: string;
  court_name: string;
  county: string;
  state: string;
  judge_name: string;
  filing_date: string;
  user_legal_name: string;
  coparent_legal_name: string;
  children_names: string[];
}

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

export default function CaseSetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [existingCase, setExistingCase] = useState<CaseInfo | null>(null);
  
  const [formData, setFormData] = useState({
    user_role: "" as "" | "petitioner" | "respondent",
    case_number: "",
    court_name: "",
    county: "",
    state: "",
    judge_name: "",
    filing_date: "",
    user_legal_name: "",
    coparent_legal_name: "",
    children_names: [""]
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);

      const { data: caseData } = await supabase
        .from("user_cases")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (caseData) {
        setExistingCase(caseData);
        setFormData({
          user_role: caseData.user_role || "",
          case_number: caseData.case_number || "",
          court_name: caseData.court_name || "",
          county: caseData.county || "",
          state: caseData.state || "",
          judge_name: caseData.judge_name || "",
          filing_date: caseData.filing_date || "",
          user_legal_name: caseData.user_legal_name || "",
          coparent_legal_name: caseData.coparent_legal_name || "",
          children_names: caseData.children_names?.length ? caseData.children_names : [""]
        });
        setMode("view");
      } else {
        setMode("edit");
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    const caseData = {
      user_id: userId,
      user_role: formData.user_role,
      case_number: formData.case_number,
      court_name: formData.court_name,
      county: formData.county,
      state: formData.state,
      judge_name: formData.judge_name,
      filing_date: formData.filing_date || null,
      user_legal_name: formData.user_legal_name,
      coparent_legal_name: formData.coparent_legal_name,
      children_names: formData.children_names.filter(n => n.trim())
    };

    if (existingCase) {
      const { error } = await supabase
        .from("user_cases")
        .update(caseData)
        .eq("id", existingCase.id);
      
      if (!error) {
        setExistingCase({ ...existingCase, ...caseData } as CaseInfo);
        setMode("view");
      }
    } else {
      const { data, error } = await supabase
        .from("user_cases")
        .insert(caseData)
        .select()
        .single();
      
      if (!error && data) {
        setExistingCase(data);
        setMode("view");
      }
    }
    setSaving(false);
  };

  const addChild = () => setFormData(prev => ({ ...prev, children_names: [...prev.children_names, ""] }));
  const removeChild = (index: number) => setFormData(prev => ({ ...prev, children_names: prev.children_names.filter((_, i) => i !== index) }));
  const updateChild = (index: number, value: string) => setFormData(prev => ({ ...prev, children_names: prev.children_names.map((n, i) => i === index ? value : n) }));

  if (loading) return <AppLayout><div style={{textAlign:"center",padding:"80px"}}>Loading...</div></AppLayout>;

  // VIEW MODE
  if (mode === "view" && existingCase) {
    return (
      <AppLayout>
        <div className="case-page">
          <div className="page-header">
            <h1>Case Information</h1>
            <button className="edit-btn" onClick={() => setMode("edit")}>Edit</button>
          </div>

          <div className="info-card">
            <div className="info-section">
              <h3>Your Role</h3>
              <div className="role-badge">{existingCase.user_role === "petitioner" ? "Petitioner" : "Respondent"}</div>
              <p className="role-note">{existingCase.user_role === "petitioner" ? "You filed the original petition" : "The other party filed the original petition"}</p>
            </div>

            <div className="info-section">
              <h3>Case Details</h3>
              <div className="info-grid">
                <div className="info-item"><label>Case Number</label><span>{existingCase.case_number || "—"}</span></div>
                <div className="info-item"><label>Court</label><span>{existingCase.court_name || "—"}</span></div>
                <div className="info-item"><label>County</label><span>{existingCase.county || "—"}</span></div>
                <div className="info-item"><label>State</label><span>{existingCase.state || "—"}</span></div>
                <div className="info-item"><label>Judge</label><span>{existingCase.judge_name || "—"}</span></div>
                <div className="info-item"><label>Filing Date</label><span>{existingCase.filing_date ? new Date(existingCase.filing_date).toLocaleDateString() : "—"}</span></div>
              </div>
            </div>

            <div className="info-section">
              <h3>Parties</h3>
              <div className="parties-display">
                <div className="party">
                  <label>Petitioner</label>
                  <span className={existingCase.user_role === "petitioner" ? "you" : ""}>
                    {existingCase.user_role === "petitioner" ? existingCase.user_legal_name : existingCase.coparent_legal_name}
                    {existingCase.user_role === "petitioner" && <em> (You)</em>}
                  </span>
                </div>
                <div className="vs">vs.</div>
                <div className="party">
                  <label>Respondent</label>
                  <span className={existingCase.user_role === "respondent" ? "you" : ""}>
                    {existingCase.user_role === "respondent" ? existingCase.user_legal_name : existingCase.coparent_legal_name}
                    {existingCase.user_role === "respondent" && <em> (You)</em>}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>Children</h3>
              <div className="children-list">
                {existingCase.children_names?.length > 0 
                  ? existingCase.children_names.map((name, i) => <span key={i} className="child-name">{name}</span>)
                  : <span className="none">No children listed</span>}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .case-page { max-width: 700px; margin: 0 auto; }
          .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .page-header h1 { margin: 0; font-size: 28px; color: #1a3a2f; }
          .edit-btn { background: #f0f9f6; border: 1px solid #2dd4a8; color: #1a3a2f; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
          .info-card { background: white; border-radius: 16px; padding: 24px; }
          .info-section { padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid #eee; }
          .info-section:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
          .info-section h3 { margin: 0 0 12px; font-size: 14px; color: #666; font-weight: 500; }
          .role-badge { display: inline-block; background: #1a3a2f; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; margin-bottom: 8px; }
          .role-note { margin: 0; font-size: 13px; color: #888; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-item label { display: block; font-size: 12px; color: #999; margin-bottom: 4px; }
          .info-item span { font-size: 15px; color: #333; }
          .parties-display { display: flex; align-items: center; gap: 20px; }
          .party { flex: 1; text-align: center; padding: 16px; background: #f8f9fa; border-radius: 10px; }
          .party label { display: block; font-size: 12px; color: #999; margin-bottom: 4px; }
          .party span { font-size: 15px; color: #333; }
          .party span.you { color: #1a3a2f; font-weight: 600; }
          .party em { color: #2dd4a8; font-style: normal; font-size: 12px; }
          .vs { color: #999; font-size: 14px; }
          .children-list { display: flex; flex-wrap: wrap; gap: 8px; }
          .child-name { background: #f0f9f6; padding: 6px 14px; border-radius: 15px; font-size: 14px; }
          .none { color: #999; font-style: italic; }
        `}</style>
      </AppLayout>
    );
  }

  // EDIT MODE
  return (
    <AppLayout>
      <div className="case-page">
        <div className="page-header">
          <h1>{existingCase ? "Edit" : "Set Up"} Case Information</h1>
          {existingCase && <button className="cancel-btn" onClick={() => setMode("view")}>Cancel</button>}
        </div>

        <div className="form-card">
          <div className="form-section">
            <h3>Your Role in This Case</h3>
            <p className="section-desc">This is determined by who filed the original petition and never changes.</p>
            <div className="role-options">
              <button type="button" className={`role-option ${formData.user_role === "petitioner" ? "selected" : ""}`} onClick={() => setFormData(prev => ({ ...prev, user_role: "petitioner" }))}>
                <strong>I am the PETITIONER</strong><span>I filed the original petition</span>
              </button>
              <button type="button" className={`role-option ${formData.user_role === "respondent" ? "selected" : ""}`} onClick={() => setFormData(prev => ({ ...prev, user_role: "respondent" }))}>
                <strong>I am the RESPONDENT</strong><span>They filed the original petition</span>
              </button>
            </div>
          </div>

          <div className="form-section">
            <h3>Case Details</h3>
            <div className="form-grid">
              <div className="form-group"><label>Case Number</label><input type="text" value={formData.case_number} onChange={e => setFormData(prev => ({ ...prev, case_number: e.target.value }))} placeholder="e.g., FC-2024-001234" /></div>
              <div className="form-group"><label>Filing Date</label><input type="date" value={formData.filing_date} onChange={e => setFormData(prev => ({ ...prev, filing_date: e.target.value }))} /></div>
              <div className="form-group full"><label>Court Name</label><input type="text" value={formData.court_name} onChange={e => setFormData(prev => ({ ...prev, court_name: e.target.value }))} placeholder="e.g., Superior Court of Arizona" /></div>
              <div className="form-group"><label>County</label><input type="text" value={formData.county} onChange={e => setFormData(prev => ({ ...prev, county: e.target.value }))} placeholder="e.g., Maricopa" /></div>
              <div className="form-group"><label>State</label><select value={formData.state} onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}><option value="">Select state...</option>{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="form-group full"><label>Judge Name (optional)</label><input type="text" value={formData.judge_name} onChange={e => setFormData(prev => ({ ...prev, judge_name: e.target.value }))} placeholder="e.g., Hon. Jane Smith" /></div>
            </div>
          </div>

          <div className="form-section">
            <h3>Party Information</h3>
            <div className="form-grid">
              <div className="form-group full"><label>Your Legal Name</label><input type="text" value={formData.user_legal_name} onChange={e => setFormData(prev => ({ ...prev, user_legal_name: e.target.value }))} placeholder="As it appears on court documents" /></div>
              <div className="form-group full"><label>Co-Parent's Legal Name</label><input type="text" value={formData.coparent_legal_name} onChange={e => setFormData(prev => ({ ...prev, coparent_legal_name: e.target.value }))} placeholder="As it appears on court documents" /></div>
            </div>
          </div>

          <div className="form-section">
            <h3>Children</h3>
            <div className="children-inputs">
              {formData.children_names.map((name, i) => (
                <div key={i} className="child-input">
                  <input type="text" value={name} onChange={e => updateChild(i, e.target.value)} placeholder={`Child ${i + 1} name`} />
                  {formData.children_names.length > 1 && <button type="button" onClick={() => removeChild(i)} className="remove-btn">x</button>}
                </div>
              ))}
              <button type="button" onClick={addChild} className="add-child-btn">+ Add Child</button>
            </div>
          </div>

          <div className="form-actions">
            <button className="save-btn" onClick={handleSave} disabled={!formData.user_role || saving}>
              {saving ? "Saving..." : existingCase ? "Save Changes" : "Save Case Information"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .case-page { max-width: 700px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .page-header h1 { margin: 0; font-size: 28px; color: #1a3a2f; }
        .cancel-btn { background: none; border: 1px solid #ddd; color: #666; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
        .form-card { background: white; border-radius: 16px; padding: 24px; }
        .form-section { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid #eee; }
        .form-section:last-child { border-bottom: none; }
        .form-section h3 { margin: 0 0 8px; font-size: 16px; color: #1a3a2f; }
        .section-desc { margin: 0 0 16px; font-size: 13px; color: #888; }
        .role-options { display: flex; gap: 16px; }
        .role-option { flex: 1; padding: 20px; border: 2px solid #eee; border-radius: 12px; background: white; cursor: pointer; text-align: left; }
        .role-option:hover { border-color: #ccc; }
        .role-option.selected { border-color: #2dd4a8; background: #f0f9f6; }
        .role-option strong { display: block; color: #1a3a2f; margin-bottom: 4px; }
        .role-option span { font-size: 13px; color: #666; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full { grid-column: span 2; }
        .form-group label { font-size: 13px; color: #666; margin-bottom: 6px; }
        .form-group input, .form-group select { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #2dd4a8; }
        .children-inputs { display: flex; flex-direction: column; gap: 12px; }
        .child-input { display: flex; gap: 8px; }
        .child-input input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
        .remove-btn { width: 40px; background: #fee; border: none; border-radius: 8px; color: #c00; font-size: 20px; cursor: pointer; }
        .add-child-btn { background: none; border: 1px dashed #ccc; padding: 12px; border-radius: 8px; color: #666; cursor: pointer; }
        .form-actions { padding-top: 24px; }
        .save-btn { width: 100%; padding: 16px; background: #2dd4a8; border: none; border-radius: 10px; color: #1a3a2f; font-weight: 700; font-size: 16px; cursor: pointer; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 600px) { .role-options { flex-direction: column; } .form-grid { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } }
      `}</style>
    </AppLayout>
  );
}