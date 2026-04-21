'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Case fields
  const [userRole, setUserRole] = useState<'petitioner' | 'respondent' | null>(null);
  const [coparentName, setCoparentName] = useState('');
  const [nextCourtDate, setNextCourtDate] = useState('');
  const [hearingType, setHearingType] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (caseData) {
        setUserRole(caseData.user_role || null);
        setCoparentName(caseData.coparent_name || '');
        setNextCourtDate(caseData.next_court_date || '');
        setHearingType(caseData.hearing_type || '');
        setCaseNumber(caseData.case_number || '');
        setCourtName(caseData.court || '');
        setUserName(caseData.petitioner_name || caseData.respondent_name || '');
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const updateData: any = {
        user_id: user.id,
        user_role: userRole,
        coparent_name: coparentName || null,
        next_court_date: nextCourtDate || null,
        hearing_type: hearingType || null,
        case_number: caseNumber || null,
        court: courtName || null,
        updated_at: new Date().toISOString(),
      };

      // Set name based on role
      if (userRole === 'petitioner') {
        updateData.petitioner_name = userName || null;
      } else if (userRole === 'respondent') {
        updateData.respondent_name = userName || null;
      }

      await supabase.from('case_context').upsert(updateData, { onConflict: 'user_id' });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const daysUntilCourt = nextCourtDate
    ? Math.ceil((new Date(nextCourtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa'
      }}>
        <div style={{ fontSize: 48 }}>⚙️</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1F2937', margin: 0 }}>Settings</h1>
      </header>

      <main style={{ maxWidth: 500, margin: '0 auto', padding: 20 }}>
        
        {/* Court Date - Most Important */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', margin: '0 0 16px', letterSpacing: 0.5 }}>
            COURT DATE
          </h2>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Next Court Date
            </label>
            <input
              type="date"
              value={nextCourtDate}
              onChange={(e) => setNextCourtDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
            {daysUntilCourt && daysUntilCourt > 0 && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                background: daysUntilCourt <= 7 ? '#fef2f2' : '#fef3c7',
                borderRadius: 8,
                fontSize: 14,
                color: daysUntilCourt <= 7 ? '#dc2626' : '#d97706',
                fontWeight: 600
              }}>
                {daysUntilCourt} days until court
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Hearing Type
            </label>
            <select
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 16,
                background: 'white',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select type...</option>
              <option value="rmc">Resolution Management Conference (RMC)</option>
              <option value="status">Status Conference</option>
              <option value="custody">Custody Hearing</option>
              <option value="motion">Motion Hearing</option>
              <option value="trial">Trial</option>
            </select>
          </div>
        </div>

        {/* Case Info */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', margin: '0 0 16px', letterSpacing: 0.5 }}>
            CASE INFO
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Your Name (as on court docs)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your full legal name"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Your Role
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setUserRole('petitioner')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${userRole === 'petitioner' ? '#1F2937' : '#e5e7eb'}`,
                  borderRadius: 10,
                  background: userRole === 'petitioner' ? '#EAF5F3' : 'white',
                  cursor: 'pointer',
                  fontWeight: userRole === 'petitioner' ? 600 : 400
                }}
              >
                Petitioner
              </button>
              <button
                onClick={() => setUserRole('respondent')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${userRole === 'respondent' ? '#1F2937' : '#e5e7eb'}`,
                  borderRadius: 10,
                  background: userRole === 'respondent' ? '#EAF5F3' : 'white',
                  cursor: 'pointer',
                  fontWeight: userRole === 'respondent' ? 600 : 400
                }}
              >
                Respondent
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Co-parent Name
            </label>
            <input
              type="text"
              value={coparentName}
              onChange={(e) => setCoparentName(e.target.value)}
              placeholder="Their name"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Case Number
            </label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., FC2024-001234"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
              Court Name
            </label>
            <input
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="e.g., Maricopa Superior Court"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px',
            background: saved ? '#2F9D94' : '#1F2937',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            marginBottom: 16
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>

        {/* Other Actions */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <button
            onClick={() => router.push('/evidence')}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #f3f4f6',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>📁 View All Evidence</span>
            <span style={{ color: '#9ca3af' }}>→</span>
          </button>
          
          <button
            onClick={() => router.push('/evidence/upload')}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #f3f4f6',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>📤 Bulk Import Messages</span>
            <span style={{ color: '#9ca3af' }}>→</span>
          </button>

          <button
            onClick={() => window.open('mailto:support@pattern18.com?subject=Feedback', '_blank')}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #f3f4f6',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>💬 Send Feedback</span>
            <span style={{ color: '#9ca3af' }}>→</span>
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 15,
              color: '#dc2626'
            }}
          >
            🚪 Log Out
          </button>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: 24, 
          color: '#9ca3af',
          fontSize: 13 
        }}>
          Pattern18 • Built by survivors, for survivors
        </div>
      </main>
    </div>
  );
}