'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CaseSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Essential fields only
  const [userRole, setUserRole] = useState<'petitioner' | 'respondent' | null>(null);
  const [coparentName, setCoparentName] = useState('');
  const [nextCourtDate, setNextCourtDate] = useState('');
  
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
        setExtractedData({
          caseNumber: caseData.case_number,
          courtName: caseData.court_name,
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
        <div className="spinner">💚</div>
        <style jsx>{`
          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .spinner {
            font-size: 48px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <button onClick={() => router.push('/coach')} className="back-btn">
          ← Back to Coach
        </button>
        <h1>Case Settings</h1>
        <div className="spacer" />
      </header>

      <div className="content">
        {/* Essential Info Card */}
        <div className="card essential">
          <h2>⚡ Essential Info</h2>
          <p className="card-desc">This is all we need from you. Everything else can be extracted from your court orders.</p>

          {/* Role Selection */}
          <div className="field">
            <label>Your Role in This Case *</label>
            <p className="field-help">This is determined by who filed the original petition and never changes.</p>
            <div className="role-buttons">
              <button
                className={`role-btn ${userRole === 'petitioner' ? 'selected' : ''}`}
                onClick={() => setUserRole('petitioner')}
              >
                <strong>I am the PETITIONER</strong>
                <span>I filed the original petition</span>
              </button>
              <button
                className={`role-btn ${userRole === 'respondent' ? 'selected' : ''}`}
                onClick={() => setUserRole('respondent')}
              >
                <strong>I am the RESPONDENT</strong>
                <span>They filed the original petition</span>
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

        {/* Extracted Info Card */}
        {(extractedData.caseNumber || extractedData.courtName) && (
          <div className="card extracted">
            <h2>📋 Extracted from Your Court Orders</h2>
            <p className="card-desc">This information was automatically extracted. Upload a court order to update it.</p>

            <div className="extracted-grid">
              {extractedData.caseNumber && (
                <div className="extracted-item">
                  <span className="extracted-label">Case Number</span>
                  <span className="extracted-value">{extractedData.caseNumber}</span>
                </div>
              )}
              {extractedData.courtName && (
                <div className="extracted-item">
                  <span className="extracted-label">Court</span>
                  <span className="extracted-value">{extractedData.courtName}</span>
                </div>
              )}
              {extractedData.county && extractedData.state && (
                <div className="extracted-item">
                  <span className="extracted-label">Location</span>
                  <span className="extracted-value">{extractedData.county}, {extractedData.state}</span>
                </div>
              )}
              {extractedData.judgeName && (
                <div className="extracted-item">
                  <span className="extracted-label">Judge</span>
                  <span className="extracted-value">{extractedData.judgeName}</span>
                </div>
              )}
              {extractedData.petitionerName && (
                <div className="extracted-item">
                  <span className="extracted-label">Petitioner</span>
                  <span className="extracted-value">{extractedData.petitionerName}</span>
                </div>
              )}
              {extractedData.respondentName && (
                <div className="extracted-item">
                  <span className="extracted-label">Respondent</span>
                  <span className="extracted-value">{extractedData.respondentName}</span>
                </div>
              )}
            </div>

            <button onClick={() => router.push('/evidence/upload')} className="upload-btn">
              📄 Upload Court Order to Update
            </button>
          </div>
        )}

        {/* No extracted data yet */}
        {!extractedData.caseNumber && !extractedData.courtName && (
          <div className="card empty">
            <div className="empty-icon">📄</div>
            <h3>No Court Orders Uploaded Yet</h3>
            <p>Upload a court order and we'll automatically extract your case details.</p>
            <button onClick={() => router.push('/evidence/upload')} className="upload-btn">
              Upload Court Order
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #1a3a2f;
          color: white;
        }

        .header h1 {
          font-size: 18px;
          font-weight: 600;
        }

        .back-btn {
          background: none;
          border: none;
          color: white;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .spacer {
          width: 100px;
        }

        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .card h2 {
          font-size: 20px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }

        .card-desc {
          color: #666;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .field {
          margin-bottom: 24px;
        }

        .field label {
          display: block;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 4px;
        }

        .field-help {
          color: #888;
          font-size: 13px;
          margin-bottom: 12px;
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
          transition: all 0.2s;
        }

        .role-btn:hover {
          border-color: #14b8a6;
        }

        .role-btn.selected {
          border-color: #14b8a6;
          background: #f0fdfa;
        }

        .role-btn strong {
          display: block;
          color: #1a3a2f;
          margin-bottom: 4px;
        }

        .role-btn span {
          font-size: 13px;
          color: #666;
        }

        .field input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .field input:focus {
          outline: none;
          border-color: #14b8a6;
        }

        .court-countdown {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px 16px;
          background: #fef3c7;
          border-radius: 20px;
        }

        .court-countdown .days {
          background: #f59e0b;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
        }

        .court-countdown .label {
          color: #92400e;
          font-size: 14px;
        }

        .save-btn {
          width: 100%;
          padding: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          background: #2d5a4a;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .extracted-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .extracted-item {
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .extracted-label {
          display: block;
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
        }

        .extracted-value {
          font-weight: 500;
          color: #1a3a2f;
        }

        .upload-btn {
          width: 100%;
          padding: 12px;
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 10px;
          color: #666;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-btn:hover {
          border-color: #14b8a6;
          color: #14b8a6;
        }

        .card.empty {
          text-align: center;
          padding: 40px 24px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .card.empty h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }

        .card.empty p {
          color: #666;
          margin-bottom: 20px;
        }

        @media (max-width: 640px) {
          .role-buttons {
            grid-template-columns: 1fr;
          }

          .extracted-grid {
            grid-template-columns: 1fr;
          }

          .header h1 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}