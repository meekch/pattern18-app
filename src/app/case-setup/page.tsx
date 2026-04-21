'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CaseSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Essential fields
  const [userRole, setUserRole] = useState<'petitioner' | 'respondent' | null>(null);
  const [coparentName, setCoparentName] = useState('');
  const [nextCourtDate, setNextCourtDate] = useState('');

  // Manual entry fields
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [county, setCounty] = useState('');
  const [stateName, setStateName] = useState('');
  const [petitionerName, setPetitionerName] = useState('');
  const [respondentName, setRespondentName] = useState('');

  // Auto-extracted fields (read-only, from court orders)
  const [extractedData, setExtractedData] = useState<{
    caseNumber?: string;
    courtName?: string;
    county?: string;
    state?: string;
    judgeName?: string;
    petitionerName?: string;
    respondentName?: string;
  }>({});

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load existing case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (caseData) {
        setUserRole(caseData.user_role || null);
        setCoparentName(caseData.coparent_name || '');
        setNextCourtDate(caseData.next_court_date || '');
        setCaseNumber(caseData.case_number || '');
        setCourtName(caseData.court || '');
        setCounty(caseData.county || '');
        setStateName(caseData.state || '');
        setPetitionerName(caseData.petitioner_name || '');
        setRespondentName(caseData.respondent_name || '');
        
        // Show manual entry if they have data
        if (caseData.case_number || caseData.court || caseData.petitioner_name) {
          setShowManualEntry(true);
        }

        setExtractedData({
          caseNumber: caseData.case_number,
          courtName: caseData.court,
          county: caseData.county,
          state: caseData.state,
          judgeName: caseData.judge_name,
          petitionerName: caseData.petitioner_name,
          respondentName: caseData.respondent_name,
        });
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await supabase.from('case_context').upsert({
        user_id: user.id,
        user_role: userRole,
        coparent_name: coparentName || null,
        next_court_date: nextCourtDate || null,
        case_number: caseNumber || null,
        court: courtName || null,
        county: county || null,
        state: stateName || null,
        petitioner_name: petitionerName || null,
        respondent_name: respondentName || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Show success briefly then go to coach
      setTimeout(() => router.push('/coach'), 500);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const daysUntilCourt = nextCourtDate
    ? Math.ceil((new Date(nextCourtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner">ðŸ’š</div>
        <style jsx>{`
          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #FAFAF7;
          }
          .spinner {
            font-size: 48px;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.push('/coach')} className="back-btn">
        ← Back
        </button>
        <h1>My Case</h1>
      </header>

      <div className="content">
        {/* Essential Info Card */}
        <div className="card essential">
          <h2>Essential Info</h2>
          <p className="card-desc">This is all we need from you. Everything else can be extracted from your court orders.</p>

          {/* Role Selection */}
          <div className="field">
            <label>Your Role in This Case *</label>
            <p className="field-help">Who filed the <strong>original</strong> case that started this custody matter? They are the Petitioner — their name appears first on all court documents. This stays the same even when you file motions later.</p>
            <div className="role-buttons">
              <button
                className={`role-btn ${userRole === 'petitioner' ? 'selected' : ''}`}
                onClick={() => setUserRole('petitioner')}
              >
                <strong>I am the PETITIONER</strong>
                <span>I filed the original case</span>
              </button>
              <button
                className={`role-btn ${userRole === 'respondent' ? 'selected' : ''}`}
                onClick={() => setUserRole('respondent')}
              >
                <strong>I am the RESPONDENT</strong>
                <span>They filed the original case</span>
              </button>
            </div>
          </div>

          {/* Co-parent Name */}
          <div className="field">
            <label>What should I call your co-parent?</label>
            <p className="field-help">This helps personalize our conversations. Use whatever feels right.</p>
            <input
              type="text"
              value={coparentName}
              onChange={(e) => setCoparentName(e.target.value)}
              placeholder="e.g., their dad, my ex, co-parent"
            />
          </div>

          {/* Next Court Date */}
          <div className="field">
            <label>Next Court Date</label>
            <p className="field-help">We'll help you prepare and show a countdown.</p>
            <input
              type="date"
              value={nextCourtDate}
              onChange={(e) => setNextCourtDate(e.target.value)}
            />
            {daysUntilCourt && daysUntilCourt > 0 && (
              <div className="court-countdown">
                <span className="days">{daysUntilCourt}</span>
                <span className="label">days until court</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !userRole}
            className="save-btn"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>

        {/* Case Details Card */}
        <div className="card case-details">
          <h2>Case Details</h2>
          
          {!showManualEntry ? (
            <div className="empty-state">
              <p className="card-desc">Add your case information for accurate court documents</p>
              <div className="action-buttons">
                <button onClick={() => router.push('/upload-order')} className="upload-btn">
                  Upload Court Order
                </button>
                <button onClick={() => setShowManualEntry(true)} className="manual-btn">
                  Enter Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="manual-entry">
              <p className="card-desc">Enter your case details for court document generation</p>
              
              <div className="field">
                <label>Case Number</label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g., FC2024-001234"
                />
              </div>

              <div className="field">
                <label>Court Name</label>
                <input
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder="e.g., Superior Court"
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>County</label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="e.g., Maricopa"
                  />
                </div>
                <div className="field">
                  <label>State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g., Arizona"
                  />
                </div>
              </div>

              <div className="field">
                <label>Petitioner Name</label>
                <p className="field-help">The person who filed the original petition</p>
                <input
                  type="text"
                  value={petitionerName}
                  onChange={(e) => setPetitionerName(e.target.value)}
                  placeholder="Full legal name as on court documents"
                />
              </div>

              <div className="field">
                <label>Respondent Name</label>
                <p className="field-help">The other party in the case</p>
                <input
                  type="text"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="Full legal name as on court documents"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #EAF5F3 0%, #FAFAF7 100%);
        }
        .header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .back-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: #1F2937;
          cursor: pointer;
        }
        .header h1 {
          font-size: 24px;
          color: #1F2937;
          margin: 0;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 20px 40px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .card h2 {
          font-size: 20px;
          color: #1F2937;
          margin: 0 0 8px 0;
        }
        .card-desc {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .field {
          margin-bottom: 20px;
        }
        .field label {
          display: block;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 6px;
        }
        .field-help {
          font-size: 13px;
          color: #888;
          margin: 0 0 8px 0;
        }
        .field input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          box-sizing: border-box;
        }
        .field input:focus {
          outline: none;
          border-color: #2F9D94;
        }
        .role-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .role-btn {
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          text-align: left;
        }
        .role-btn.selected {
          border-color: #1F2937;
          background: #EAF5F3;
        }
        .role-btn strong {
          display: block;
          color: #1F2937;
          margin-bottom: 4px;
        }
        .role-btn span {
          font-size: 13px;
          color: #666;
        }
        .court-countdown {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fef3c7;
          padding: 8px 16px;
          border-radius: 20px;
          margin-top: 12px;
        }
        .court-countdown .days {
          font-size: 20px;
          font-weight: 700;
          color: #92400e;
        }
        .court-countdown .label {
          color: #92400e;
          font-size: 14px;
        }
        .save-btn {
          width: 100%;
          padding: 16px;
          background: #1F2937;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .empty-state {
          text-align: center;
          padding: 20px 0;
        }
        .action-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 16px;
        }
        .upload-btn {
          padding: 14px 24px;
          background: #1F2937;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .manual-btn {
          padding: 14px 24px;
          background: white;
          color: #1F2937;
          border: 2px solid #1F2937;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .manual-btn:hover {
          background: #EAF5F3;
        }
        .manual-entry {
          text-align: left;
        }
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 640px) {
          .role-buttons {
            grid-template-columns: 1fr;
          }
          .field-row {
            grid-template-columns: 1fr;
          }
          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}