'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

type HearingType = 'rmc' | 'evidentiary' | 'modifyParenting' | 'modifySupport' | 'mediation' | 'emergency' | 'status' | null;
type PrepStep = 'type' | 'basics' | 'checklist' | 'opening' | 'scenarios' | 'grounding' | 'ready';

export default function CourtPrepPage() {
  const router = useRouter();
  const [caseContext, setCaseContext] = useState<any>(null);
  const [hearingType, setHearingType] = useState<HearingType>(null);
  const [prepStep, setPrepStep] = useState<PrepStep>('type');
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTime, setHearingTime] = useState('');
  const [isVirtual, setIsVirtual] = useState(true);
  const [mainRequest, setMainRequest] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const loadContext = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const { data } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (data) setCaseContext(data);
    };
    loadContext();
  }, []);

  useEffect(() => {
    if (!breathingActive) return;
    
    const phases: ('in' | 'hold' | 'out')[] = ['in', 'hold', 'out'];
    let idx = 0;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % 3;
      setBreathPhase(phases[idx]);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [breathingActive]);

  const toggleCheck = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const hearingTypeInfo = {
    rmc: {
      name: 'Resolution Management Conference (RMC)',
      description: 'A conference to narrow issues and encourage agreement. No testimony, no exhibits.',
      tips: [
        'Keep it simple - focus on what you want, not history',
        'No evidence presentation',
        'Judge may suggest solutions or order temporary measures',
        'Be prepared if other party doesn\'t show'
      ]
    },
    evidentiary: {
      name: 'Evidentiary Hearing',
      description: 'A formal hearing where evidence and testimony are presented.',
      tips: [
        'Exhibits matter - have them organized',
        'You may testify under oath',
        'Stick to facts, not emotions',
        'Answer only the question asked'
      ]
    },
    modifyParenting: {
      name: 'Petition to Modify Parenting Time',
      description: 'Requesting changes to the current custody or parenting schedule.',
      tips: [
        'You must show "substantial and continuing change in circumstances"',
        'Focus on the child\'s best interests, not your convenience',
        'Document specific incidents that support the change',
        'Have a clear, specific proposal ready'
      ]
    },
    modifySupport: {
      name: 'Petition to Modify Child Support',
      description: 'Requesting changes to the current child support order.',
      tips: [
        'Bring current income documentation',
        'Know both parties\' incomes if possible',
        'Understand your state\'s child support guidelines',
        'Changes usually require 15%+ income change or major life event'
      ]
    },
    mediation: {
      name: 'Mediation',
      description: 'A facilitated negotiation to reach agreement. Mediator cannot force decisions.',
      tips: [
        'Know your bottom line before you go',
        'Focus on proposals, not blame',
        '"I can agree to X if Y" is powerful',
        'You can walk away if it\'s not working'
      ]
    },
    emergency: {
      name: 'Emergency Motion / Order of Protection',
      description: 'Urgent hearing for immediate safety concerns or time-sensitive issues.',
      tips: [
        'Focus only on the emergency - not history',
        'Bring specific evidence of immediate harm or risk',
        'Be prepared to explain why this can\'t wait',
        'Have a specific, temporary request ready'
      ]
    },
    status: {
      name: 'Status Conference',
      description: 'A check-in to see where the case stands and set next steps.',
      tips: [
        'Be brief about current status',
        'Have dates ready for scheduling',
        'Know what you need from the court',
        'This is administrative, not argumentative'
      ]
    }
  };

  const scenarios = [
    {
      id: 'agreement',
      question: '"Did you reach an agreement?"',
      answer: '"Yes, Your Honor. At the time of the resolution statement, we believed we had agreement. Since then, additional conflict occurred. I am now requesting a simpler plan that removes the areas causing conflict."',
      note: 'Stop after this. Don\'t explain the conflict.'
    },
    {
      id: 'no-show',
      question: 'If other parent doesn\'t show',
      answer: 'Say nothing. Let the judge note it. If asked: "I am prepared to proceed, Your Honor."',
      note: 'Their absence speaks for itself. Don\'t editorialize.'
    },
    {
      id: 'what-request',
      question: '"What are you requesting?"',
      answer: 'State your request in one sentence. Then stop. Example: "I am requesting [specific order] to reduce conflict and provide stability for the child."',
      note: 'Short. Specific. Child-focused.'
    },
    {
      id: 'hostile',
      question: 'If other parent gets hostile or attacks',
      answer: '"Your Honor, I\'d like to stay focused on the proposal before the court."',
      note: 'Do not defend. Redirect to structure.'
    },
    {
      id: 'why-now',
      question: '"Why bring this now?"',
      answer: '"Because the recent conflict confirmed the existing structure is not sustainable."',
      note: 'Don\'t describe the conflict. State the conclusion.'
    },
    {
      id: 'silence',
      question: 'When you don\'t know what to say',
      answer: 'Pause. Breathe. Say: "I need a moment to consider that, Your Honor."',
      note: 'Silence is fine. Thoughtful pause shows composure.'
    }
  ];

  const virtualChecklist = [
    { id: 'tech-link', label: 'Open the meeting link (Teams/Zoom)', category: 'tech' },
    { id: 'tech-audio', label: 'Test audio and camera', category: 'tech' },
    { id: 'tech-close', label: 'Close all other apps and tabs', category: 'tech' },
    { id: 'tech-phone', label: 'Phone on silent', category: 'tech' },
    { id: 'tech-power', label: 'Plugged into power', category: 'tech' },
    { id: 'doc-order', label: 'Proposed order open and ready', category: 'docs' },
    { id: 'doc-statement', label: 'Opening statement visible', category: 'docs' },
    { id: 'doc-scenarios', label: 'Scenario responses accessible', category: 'docs' },
    { id: 'setup-bg', label: 'Neutral background (blur or plain wall)', category: 'setup' },
    { id: 'setup-camera', label: 'Camera at eye level', category: 'setup' },
    { id: 'setup-light', label: 'Light in front of face (not behind)', category: 'setup' },
    { id: 'setup-clothes', label: 'Solid color top (navy, gray, cream)', category: 'setup' },
    { id: 'mental-read', label: 'Read opening statement once', category: 'mental' },
    { id: 'mental-breathe', label: 'Take 3 slow breaths', category: 'mental' },
    { id: 'mental-shoulders', label: 'Relax shoulders', category: 'mental' },
  ];

  const inPersonChecklist = [
    { id: 'doc-copies', label: 'Extra copies of proposed order (3)', category: 'docs' },
    { id: 'doc-statement', label: 'Opening statement printed', category: 'docs' },
    { id: 'doc-scenarios', label: 'Scenario card in folder', category: 'docs' },
    { id: 'setup-arrive', label: 'Arrive 20 minutes early', category: 'setup' },
    { id: 'setup-courtroom', label: 'Find correct courtroom', category: 'setup' },
    { id: 'setup-phone', label: 'Phone completely off', category: 'setup' },
    { id: 'setup-clothes', label: 'Professional attire (solid colors)', category: 'setup' },
    { id: 'mental-read', label: 'Read opening statement in car', category: 'mental' },
    { id: 'mental-breathe', label: 'Take 3 slow breaths before entering', category: 'mental' },
    { id: 'mental-shoulders', label: 'Relax shoulders', category: 'mental' },
  ];

  const checklist = isVirtual ? virtualChecklist : inPersonChecklist;

  const renderStep = () => {
    switch (prepStep) {
      case 'type':
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>What type of hearing?</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0', fontSize: '15px' }}>This changes how you prepare and what to expect.</p>
            
            {Object.entries(hearingTypeInfo).map(([key, info]) => (
              <button
                key={key}
                style={{
                  textAlign: 'left',
                  padding: '16px',
                  border: `2px solid ${hearingType === key ? '#059669' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  background: hearingType === key ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '12px',
                }}
                onClick={() => setHearingType(key as HearingType)}
              >
                <span style={{ display: 'block', color: '#1a3a2f', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{info.name}</span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{info.description}</span>
              </button>
            ))}
            
            {hearingType && (
              <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ color: '#1a3a2f', margin: '0 0 12px 0', fontSize: '15px' }}>Key things to know:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563', fontSize: '14px' }}>
                  {hearingTypeInfo[hearingType].tips.map((tip, i) => (
                    <li key={i} style={{ marginBottom: '8px' }}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              style={{
                width: '100%',
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: !hearingType ? '#9ca3af' : '#1a3a2f',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: !hearingType ? 'not-allowed' : 'pointer',
                marginTop: '16px',
              }}
              onClick={() => setPrepStep('basics')}
              disabled={!hearingType}
            >
              Continue
            </button>
          </div>
        );

      case 'basics':
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>Hearing details</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#1a3a2f', marginBottom: '8px' }}>When is it?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="date" 
                  style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '16px' }}
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                />
                <input 
                  type="time" 
                  style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '16px' }}
                  value={hearingTime}
                  onChange={(e) => setHearingTime(e.target.value)}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#1a3a2f', marginBottom: '8px' }}>Format</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  style={{ flex: 1, padding: '14px', border: `2px solid ${isVirtual ? '#059669' : '#e5e7eb'}`, borderRadius: '10px', background: isVirtual ? '#f0fdf4' : 'white', fontSize: '15px', cursor: 'pointer' }}
                  onClick={() => setIsVirtual(true)}
                >
                  💻 Virtual
                </button>
                <button 
                  style={{ flex: 1, padding: '14px', border: `2px solid ${!isVirtual ? '#059669' : '#e5e7eb'}`, borderRadius: '10px', background: !isVirtual ? '#f0fdf4' : 'white', fontSize: '15px', cursor: 'pointer' }}
                  onClick={() => setIsVirtual(false)}
                >
                  🏛️ In-Person
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#1a3a2f', marginBottom: '8px' }}>What are you asking for? (one sentence)</label>
              <textarea
                style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                value={mainRequest}
                onChange={(e) => setMainRequest(e.target.value)}
                placeholder="Example: A week-on-week-off schedule with no holiday overrides"
                rows={3}
              />
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '8px 0 0 0' }}>
                Keep it simple. This becomes your anchor.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button style={{ flex: 1, padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#6b7280' }} onClick={() => setPrepStep('type')}>Back</button>
              <button 
                style={{ flex: 2, padding: '16px', border: 'none', borderRadius: '12px', background: '#1a3a2f', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setPrepStep('checklist')}
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'checklist':
        const categories: Record<string, string> = {
          tech: '🔌 Tech Setup',
          docs: '📄 Documents',
          setup: '🪑 Your Setup',
          mental: '🧠 Mental Prep'
        };
        
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>{isVirtual ? '💻' : '🏛️'} Pre-Hearing Checklist</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0', fontSize: '15px' }}>Go through this 20 minutes before your hearing.</p>
            
            {Object.keys(categories).map(cat => {
              const items = checklist.filter(c => c.category === cat);
              if (items.length === 0) return null;
              
              return (
                <div key={cat} style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#1a3a2f', margin: '0 0 12px 0', fontSize: '15px' }}>
                    {categories[cat]}
                  </h4>
                  {items.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        style={{ width: '22px', height: '22px', accentColor: '#059669' }}
                        checked={checkedItems.has(item.id)}
                        onChange={() => toggleCheck(item.id)}
                      />
                      <span style={{ 
                        color: checkedItems.has(item.id) ? '#9ca3af' : '#4b5563',
                        textDecoration: checkedItems.has(item.id) ? 'line-through' : 'none',
                        fontSize: '15px'
                      }}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
            
            <div style={{ textAlign: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '10px', fontWeight: 600, color: '#059669' }}>
              {checkedItems.size} of {checklist.length} complete
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button style={{ flex: 1, padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#6b7280' }} onClick={() => setPrepStep('basics')}>Back</button>
              <button style={{ flex: 2, padding: '16px', border: 'none', borderRadius: '12px', background: '#1a3a2f', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setPrepStep('opening')}>
                Continue
              </button>
            </div>
          </div>
        );

      case 'opening':
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>Your Opening Statement</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0', fontSize: '15px' }}>Say this when the judge asks your position. Then stop.</p>
            
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #059669' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', marginBottom: '8px' }}>
                Template:
              </div>
              <p style={{ color: '#1a3a2f', fontSize: '17px', lineHeight: 1.6, margin: 0 }}>
                "Your Honor, I am requesting <span style={{ background: 'linear-gradient(180deg, transparent 60%, #a7f3d0 60%)' }}>
                  {mainRequest || '[your request]'}
                </span> to reduce conflict and provide stability for {caseContext?.children_names || 'my child'}."
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#1a3a2f', margin: '0 0 12px 0' }}>Rules for your opening:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563' }}>
                <li style={{ marginBottom: '8px' }}><strong>One paragraph max.</strong> Not your life story.</li>
                <li style={{ marginBottom: '8px' }}><strong>Child-focused.</strong> Not about punishing them.</li>
                <li style={{ marginBottom: '8px' }}><strong>Solution-oriented.</strong> Not problem-focused.</li>
                <li style={{ marginBottom: '8px' }}><strong>Stop when done.</strong> Silence is fine.</li>
              </ul>
            </div>
            
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '16px', border: '1px solid #fecaca' }}>
              <h4 style={{ color: '#dc2626', margin: '0 0 12px 0' }}>❌ Avoid these words:</h4>
              <div style={{ marginBottom: '12px' }}>
                {['abusive', 'narcissist', 'toxic', 'controlling', 'always', 'never'].map(word => (
                  <span key={word} style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', color: '#dc2626', border: '1px solid #fecaca', marginRight: '8px', marginBottom: '8px', display: 'inline-block' }}>{word}</span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                Emotional language undermines credibility. Let the facts speak.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button style={{ flex: 1, padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#6b7280' }} onClick={() => setPrepStep('checklist')}>Back</button>
              <button style={{ flex: 2, padding: '16px', border: 'none', borderRadius: '12px', background: '#1a3a2f', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setPrepStep('scenarios')}>
                Continue
              </button>
            </div>
          </div>
        );

      case 'scenarios':
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>What to Say When...</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0', fontSize: '15px' }}>Tap each scenario to see your response.</p>
            
            {scenarios.map(scenario => (
              <div 
                key={scenario.id}
                style={{ border: `2px solid ${expandedScenario === scenario.id ? '#059669' : '#e5e7eb'}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', marginBottom: '12px' }}
                onClick={() => setExpandedScenario(expandedScenario === scenario.id ? null : scenario.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', fontWeight: 500, color: '#1a3a2f' }}>
                  <span>💬</span>
                  <span style={{ flex: 1 }}>{scenario.question}</span>
                  <span style={{ color: '#9ca3af' }}>{expandedScenario === scenario.id ? '−' : '+'}</span>
                </div>
                {expandedScenario === scenario.id && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div style={{ padding: '16px 0' }}>
                      <strong style={{ color: '#059669', fontSize: '13px' }}>Say this:</strong>
                      <p style={{ margin: '8px 0 0 0', color: '#1a3a2f', fontSize: '15px', lineHeight: 1.5 }}>
                        {scenario.answer}
                      </p>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#4b5563' }}>
                      <strong style={{ color: '#1a3a2f' }}>Remember:</strong> {scenario.note}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button style={{ flex: 1, padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#6b7280' }} onClick={() => setPrepStep('opening')}>Back</button>
              <button style={{ flex: 2, padding: '16px', border: 'none', borderRadius: '12px', background: '#1a3a2f', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setPrepStep('grounding')}>
                Continue
              </button>
            </div>
          </div>
        );

      case 'grounding':
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>Ground Yourself</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0', fontSize: '15px' }}>Take 2 minutes before your hearing. You've prepared. Now settle your body.</p>
            
            {/* Why This Feels Wrong */}
            <div style={{ background: '#fefce8', borderRadius: '12px', padding: '20px', marginBottom: '24px', borderLeft: '4px solid #ca8a04' }}>
              <h4 style={{ color: '#854d0e', margin: '0 0 12px 0', fontSize: '16px' }}>💛 Why This Feels Wrong</h4>
              <p style={{ color: '#713f12', fontSize: '14px', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                You may feel like you're being forced to stay silent about what's really happening. That's not your imagination. Courts reward restraint, not truth. They measure structure, not harm.
              </p>
              <p style={{ color: '#713f12', fontSize: '14px', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                <strong>You are not lying. You are translating.</strong> You're converting lived reality into the only language the system accepts. That's not betrayal - it's strategy.
              </p>
              <p style={{ color: '#713f12', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                The truth will show itself through patterns, timelines, and documentation - not forbidden words. You are protecting your child by playing the long game.
              </p>
            </div>
            
            <div 
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '24px auto',
                transform: breathingActive && breathPhase !== 'out' ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 4s ease-in-out',
                cursor: 'pointer',
              }}
              onClick={() => setBreathingActive(!breathingActive)}
            >
              <span style={{ color: '#1a3a2f', fontWeight: 600, fontSize: '16px' }}>
                {breathingActive ? (
                  <>
                    {breathPhase === 'in' && 'Breathe in...'}
                    {breathPhase === 'hold' && 'Hold...'}
                    {breathPhase === 'out' && 'Breathe out...'}
                  </>
                ) : 'Tap to start'}
              </span>
            </div>
            
            <button 
              style={{ 
                width: '100%',
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: breathingActive ? '#dc2626' : '#1a3a2f',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '24px'
              }}
              onClick={() => setBreathingActive(!breathingActive)}
            >
              {breathingActive ? 'Stop' : 'Start Breathing'}
            </button>
            
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                Hold in your mind:
              </p>
              <p style={{ fontSize: '18px', color: '#1a3a2f', margin: 0, fontStyle: 'italic' }}>
                "I am asking for structure that protects my child."
              </p>
            </div>
            
            <h4 style={{ color: '#1a3a2f', margin: '0 0 12px 0' }}>If you feel triggered:</h4>
            <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '8px' }}>Press your feet into the floor</li>
              <li style={{ marginBottom: '8px' }}>Take one slow breath</li>
              <li style={{ marginBottom: '8px' }}>Say: "I'd like to stay focused on the proposal."</li>
            </ul>
            
            <h4 style={{ color: '#1a3a2f', margin: '0 0 12px 0' }}>Final reminders:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563' }}>
              <li style={{ marginBottom: '8px' }}>Speak slowly</li>
              <li style={{ marginBottom: '8px' }}>Answer only what's asked</li>
              <li style={{ marginBottom: '8px' }}>Stop when finished</li>
              <li style={{ marginBottom: '8px' }}>Their chaos is not your emergency</li>
            </ul>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button style={{ flex: 1, padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', color: '#6b7280' }} onClick={() => setPrepStep('scenarios')}>Back</button>
              <button 
                style={{ flex: 2, padding: '16px', border: 'none', borderRadius: '12px', background: '#059669', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }} 
                onClick={() => setPrepStep('ready')}
              >
                I'm Ready
              </button>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💚</div>
            <h2 style={{ color: '#1a3a2f', margin: '0 0 8px 0', fontSize: '22px' }}>You're Ready</h2>
            
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '20px', margin: '24px 0', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Hearing</span>
                <span style={{ color: '#1a3a2f', fontWeight: 500, fontSize: '14px' }}>{hearingType ? hearingTypeInfo[hearingType].name : ''}</span>
              </div>
              {hearingDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>When</span>
                  <span style={{ color: '#1a3a2f', fontWeight: 500 }}>
                    {new Date(hearingDate).toLocaleDateString()} {hearingTime && `at ${hearingTime}`}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Your Request</span>
                <span style={{ color: '#1a3a2f', fontWeight: 500, textAlign: 'right', maxWidth: '60%', fontSize: '14px' }}>
                  {mainRequest || 'Not specified'}
                </span>
              </div>
            </div>
            
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                One sentence to hold:
              </p>
              <p style={{ fontSize: '18px', color: '#1a3a2f', margin: 0, fontStyle: 'italic' }}>
                "I am asking for structure that reduces conflict and protects my child."
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <button 
                style={{ padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 500, cursor: 'pointer', color: '#1a3a2f' }}
                onClick={() => setPrepStep('scenarios')}
              >
                📋 Review Scenarios
              </button>
              <button 
                style={{ padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 500, cursor: 'pointer', color: '#1a3a2f' }}
                onClick={() => setPrepStep('grounding')}
              >
                🌿 Ground Again
              </button>
              <button 
                style={{ padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: 'white', fontSize: '15px', fontWeight: 500, cursor: 'pointer', color: '#1a3a2f' }}
                onClick={() => router.push('/coach')}
              >
                💬 Back to Coach
              </button>
            </div>
            
            <p style={{ color: '#6b7280', fontStyle: 'italic', margin: 0 }}>
              You showed up. You prepared. That's what good parents do.
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%)', paddingBottom: '100px' }}>
      <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: '#1a3a2f', color: 'white' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', padding: 0 }}>←</button>
        <h1 style={{ flex: 1, fontSize: '20px', margin: 0, fontWeight: 600 }}>Court Prep</h1>
        {prepStep !== 'type' && prepStep !== 'ready' && (
          <span style={{ fontSize: '14px', opacity: 0.8 }}>
            {['type', 'basics', 'checklist', 'opening', 'scenarios', 'grounding'].indexOf(prepStep)}/5
          </span>
        )}
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {renderStep()}
      </div>

      <BottomNav active="menu" />
    </div>
  );
}