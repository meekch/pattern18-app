'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import FloatingCoach from '@/components/FloatingCoach';

const HEARING_TYPES: Record<string, { name: string; description: string; tips: string[] }> = {
  rmc: {
    name: 'Resolution Management Conference (RMC)',
    description: 'A meeting with the judge to discuss the status of your case and try to resolve issues without a trial.',
    tips: [
      'Be prepared to explain your main concerns briefly',
      'Bring documented evidence of patterns',
      'Know your "asks" - what you want the judge to order',
      'Stay calm and factual - let the evidence speak',
      'The judge may ask questions directly - answer concisely',
    ]
  },
  status: {
    name: 'Status Conference',
    description: 'A check-in hearing to review case progress and set timelines.',
    tips: [
      'Know what has happened since the last hearing',
      'Be ready to discuss scheduling',
      'Bring any new evidence of violations',
    ]
  },
  custody: {
    name: 'Custody Hearing',
    description: 'A hearing where the judge will make decisions about custody and parenting time.',
    tips: [
      'Focus on the children\'s best interests',
      'Document patterns of behavior, not single incidents',
      'Avoid emotional language - use facts',
      'Prepare a clear timeline of events',
    ]
  },
  motion: {
    name: 'Motion Hearing',
    description: 'A hearing on a specific request (motion) filed by you or the other party.',
    tips: [
      'Know exactly what the motion asks for',
      'Prepare your response or argument',
      'Bring supporting evidence',
    ]
  },
  trial: {
    name: 'Trial',
    description: 'A full hearing where both sides present evidence and testimony.',
    tips: [
      'Organize all exhibits in order',
      'Prepare your testimony',
      'Know your witness list',
      'Practice staying calm under cross-examination',
    ]
  },
  other: {
    name: 'Court Hearing',
    description: 'Prepare for your upcoming court appearance.',
    tips: [
      'Review all your documented evidence',
      'Know what outcome you\'re seeking',
      'Prepare to speak clearly and factually',
    ]
  }
};

export default function CourtPrepPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [caseContext, setCaseContext] = useState<any>(null);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [exhibitCount, setExhibitCount] = useState(0);
  const [hearingType, setHearingType] = useState('rmc');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [coachInput, setCoachInput] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('checklist');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (caseData) {
        setCaseContext(caseData);
        if (caseData.hearing_type) {
          setHearingType(caseData.hearing_type);
        }
      }

      // Load evidence stats
      const { data: evidence } = await supabase
        .from('incidents')
        .select('id, include_in_exhibit')
        .eq('user_id', session.user.id);

      if (evidence) {
        setTotalIncidents(evidence.length);
        setExhibitCount(evidence.filter((e: any) => e.include_in_exhibit).length);
      }

      // Load saved checklist
      const savedChecklist = localStorage.getItem('courtPrepChecklist');
      if (savedChecklist) {
        setChecklist(JSON.parse(savedChecklist));
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const daysUntilCourt = caseContext?.next_court_date
    ? Math.ceil((new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const courtDateFormatted = caseContext?.next_court_date
    ? new Date(caseContext.next_court_date).toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const toggleCheck = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    localStorage.setItem('courtPrepChecklist', JSON.stringify(updated));
  };

  const sendToCoach = (prompt: string) => {
    sessionStorage.setItem('coachPrompt', prompt);
    router.push('/coach');
  };

  const hearingInfo = HEARING_TYPES[hearingType] || HEARING_TYPES.other;

  const checklistItems = [
    { key: 'review', label: `Review evidence (${totalIncidents} incidents)`, action: () => router.push('/evidence') },
    { key: 'select', label: `Select incidents for exhibit (${exhibitCount} selected)`, action: () => router.push('/evidence') },
    { key: 'generate', label: 'Generate exhibit packet', action: () => router.push('/generate-exhibit') },
    { key: 'print', label: 'Print documents (3 copies)', action: null },
    { key: 'statement', label: 'Prepare your statement', action: () => sendToCoach('Help me prepare a brief statement for my court hearing') },
    { key: 'asks', label: 'List your asks for the judge', action: () => sendToCoach('Help me create a list of specific asks for the judge at my hearing') },
    { key: 'practice', label: 'Practice staying calm', action: () => sendToCoach('Help me practice staying calm. Ask me questions like the judge might.') },
  ];

  const completedCount = checklistItems.filter(item => checklist[item.key]).length;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: '#f5f7f6' 
      }}>
        <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>⚖️</div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #fef3c7 0%, #f5f7f6 30%)',
      paddingBottom: 100 
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        background: '#1a3a2f',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => router.push('/my-case')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: 18, 
                cursor: 'pointer',
                padding: 0
              }}
            >
              ←
            </button>
            <h1 style={{ fontSize: 20, margin: 0 }}>Court Prep</h1>
          </div>
          <button 
            onClick={() => router.push('/case-setup')} 
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ⚙️
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        
        {/* Countdown Card */}
        {daysUntilCourt && daysUntilCourt > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: daysUntilCourt <= 7 ? '#fef2f2' : daysUntilCourt <= 14 ? '#fef3c7' : '#f0fdf4',
              padding: '8px 16px',
              borderRadius: 20,
              marginBottom: 12
            }}>
              <span style={{ fontSize: 20 }}>⚖️</span>
              <span style={{ 
                fontSize: 28, 
                fontWeight: 800,
                color: daysUntilCourt <= 7 ? '#dc2626' : daysUntilCourt <= 14 ? '#d97706' : '#059669'
              }}>
                {daysUntilCourt}
              </span>
              <span style={{ 
                fontSize: 14,
                color: '#6b7280'
              }}>
                days
              </span>
            </div>
            <div style={{ fontSize: 15, color: '#374151', marginBottom: 4 }}>
              {courtDateFormatted}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {hearingInfo.name}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ color: '#6b7280', marginBottom: 12 }}>No court date set</div>
            <button
              onClick={() => router.push('/case-setup')}
              style={{
                background: '#1a3a2f',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Set Court Date
            </button>
          </div>
        )}

        {/* Hearing Type Selector */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <label style={{ 
            display: 'block', 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#6b7280', 
            marginBottom: 8,
            letterSpacing: 0.5
          }}>
            HEARING TYPE
          </label>
          <select
            value={hearingType}
            onChange={(e) => setHearingType(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 15,
              color: '#1a3a2f',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="rmc">Resolution Management Conference (RMC)</option>
            <option value="status">Status Conference</option>
            <option value="custody">Custody Hearing</option>
            <option value="motion">Motion Hearing</option>
            <option value="trial">Trial</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Preparation Checklist */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'checklist' ? null : 'checklist')}
            style={{
              width: '100%',
              padding: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontWeight: 600, color: '#1a3a2f' }}>Preparation Checklist</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                fontSize: 13, 
                color: completedCount === checklistItems.length ? '#059669' : '#6b7280' 
              }}>
                {completedCount}/{checklistItems.length}
              </span>
              <span style={{ 
                color: '#9ca3af',
                transform: expandedSection === 'checklist' ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s'
              }}>
                ›
              </span>
            </div>
          </button>
          
          {expandedSection === 'checklist' && (
            <div style={{ padding: '0 16px 16px' }}>
              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  <button
                    onClick={() => toggleCheck(item.key)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: `2px solid ${checklist[item.key] ? '#059669' : '#d1d5db'}`,
                      background: checklist[item.key] ? '#059669' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {checklist[item.key] && (
                      <span style={{ color: 'white', fontSize: 14 }}>✓</span>
                    )}
                  </button>
                  <span 
                    style={{ 
                      flex: 1, 
                      fontSize: 14, 
                      color: checklist[item.key] ? '#9ca3af' : '#374151',
                      textDecoration: checklist[item.key] ? 'line-through' : 'none'
                    }}
                  >
                    {item.label}
                  </span>
                  {item.action && (
                    <button
                      onClick={item.action}
                      style={{
                        background: '#f3f4f6',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      Go →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What to Expect */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'expect' ? null : 'expect')}
            style={{
              width: '100%',
              padding: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <span style={{ fontWeight: 600, color: '#1a3a2f' }}>What to Expect</span>
            </div>
            <span style={{ 
              color: '#9ca3af',
              transform: expandedSection === 'expect' ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s'
            }}>
              ›
            </span>
          </button>
          
          {expandedSection === 'expect' && (
            <div style={{ padding: '0 16px 16px' }}>
              <p style={{ 
                fontSize: 14, 
                color: '#374151', 
                lineHeight: 1.6,
                margin: '0 0 16px'
              }}>
                {hearingInfo.description}
              </p>
              <div style={{ 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#6b7280', 
                marginBottom: 8 
              }}>
                TIPS:
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: 20, 
                color: '#374151',
                fontSize: 14,
                lineHeight: 1.8
              }}>
                {hearingInfo.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Coach Prompts */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#6b7280', 
            marginBottom: 12,
            letterSpacing: 0.5
          }}>
            ASK COACH
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'What will he likely argue?', prompt: 'Based on patterns of coercive control, what arguments might my co-parent make at the hearing and how should I counter them?' },
              { label: 'Help me stay calm', prompt: 'Give me grounding techniques and mantras I can use if I feel triggered during my court hearing' },
              { label: 'Practice my statement', prompt: 'Help me practice. Act as a judge and ask me to briefly explain my concerns about my custody situation. Then give me feedback.' },
              { label: 'What should I wear?', prompt: 'What should I wear to family court? What impression do I want to make?' },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => sendToCoach(item.prompt)}
                style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#166534',
                  fontWeight: 500
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Status */}
        <div 
          onClick={() => router.push('/evidence')}
          style={{
            background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
            borderRadius: 16,
            padding: 16,
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Your Evidence</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {exhibitCount} incidents ready for exhibit
            </div>
          </div>
          <div style={{
            background: '#059669',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600
          }}>
            Review →
          </div>
        </div>
      </main>

      {/* Floating Coach */}
      <FloatingCoach 
        courtDate={caseContext?.next_court_date}
        evidenceCount={totalIncidents}
        pageContext={`User is preparing for a ${hearingInfo.name} hearing${daysUntilCourt ? ` in ${daysUntilCourt} days` : ''}`}
      />

      <BottomNav active="case" />
    </div>
  );
}