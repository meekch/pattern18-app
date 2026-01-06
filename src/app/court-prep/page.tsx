'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

type HearingType = 'rmc' | 'evidentiary' | 'mediation' | 'status' | null;
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

  // Breathing exercise
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
      id: 'details',
      question: 'If judge asks for details you don\'t want to share',
      answer: '"Your Honor, I\'d prefer to keep this focused on the structural solution rather than relitigating specific incidents."',
      note: 'You can redirect. You don\'t have to answer everything.'
    },
    {
      id: 'compromise',
      question: '"Can you compromise on this?"',
      answer: '"I am open to alternatives that maintain predictability and reduce conflict. I am not able to agree to [specific thing] because [brief child-focused reason]."',
      note: 'Show flexibility on method, firmness on boundaries.'
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
    { id: 'setup-bg', label: 'Neutral background (light blur or plain wall)', category: 'setup' },
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
    { id: 'doc-evidence', label: 'Evidence organized if needed', category: 'docs' },
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
          <div className="step-content">
            <h2>What type of hearing?</h2>
            <p className="step-desc">This changes how you prepare and what to expect.</p>
            
            <div className="hearing-types">
              {Object.entries(hearingTypeInfo).map(([key, info]) => (
                <button
                  key={key}
                  className={`type-btn ${hearingType === key ? 'selected' : ''}`}
                  onClick={() => setHearingType(key as HearingType)}
                >
                  <strong>{info.name}</strong>
                  <span>{info.description}</span>
                </button>
              ))}
            </div>
            
            {hearingType && (
              <div className="type-tips">
                <h4>Key things to know:</h4>
                <ul>
                  {hearingTypeInfo[hearingType].tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              className="next-btn"
              onClick={() => setPrepStep('basics')}
              disabled={!hearingType}
            >
              Continue
            </button>
          </div>
        );

      case 'basics':
        return (
          <div className="step-content">
            <h2>Hearing details</h2>
            
            <div className="form-group">
              <label>When is it?</label>
              <div className="date-time-row">
                <input 
                  type="date" 
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                />
                <input 
                  type="time" 
                  value={hearingTime}
                  onChange={(e) => setHearingTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Format</label>
              <div className="toggle-row">
                <button 
                  className={`toggle-btn ${isVirtual ? 'active' : ''}`}
                  onClick={() => setIsVirtual(true)}
                >
                  💻 Virtual
                </button>
                <button 
                  className={`toggle-btn ${!isVirtual ? 'active' : ''}`}
                  onClick={() => setIsVirtual(false)}
                >
                  🏛️ In-Person
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>What are you asking for? (one sentence)</label>
              <textarea
                value={mainRequest}
                onChange={(e) => setMainRequest(e.target.value)}
                placeholder="Example: A week-on-week-off schedule with no holiday overrides"
                rows={3}
              />
              <p className="help-text">Keep it simple. This becomes your anchor.</p>
            </div>
            
            <div className="btn-row">
              <button className="back-btn" onClick={() => setPrepStep('type')}>Back</button>
              <button 
                className="next-btn"
                onClick={() => setPrepStep('checklist')}
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className="step-content">
            <h2>{isVirtual ? '💻' : '🏛️'} Pre-Hearing Checklist</h2>
            <p className="step-desc">Go through this 20 minutes before your hearing.</p>
            
            {['tech', 'docs', 'setup', 'mental'].map(category => {
              const items = checklist.filter(c => c.category === category);
              if (items.length === 0) return null;
              
              const labels: Record<string, string> = {
                tech: '🔌 Tech Setup',
                docs: '📄 Documents',
                setup: '🪑 Your Setup',
                mental: '🧠 Mental Prep'
              };
              
              return (
                <div key={category} className="checklist-section">
                  <h4>{labels[category]}</h4>
                  {items.map(item => (
                    <label key={item.id} className="check-item">
                      <input 
                        type="checkbox"
                        checked={checkedItems.has(item.id)}
                        onChange={() => toggleCheck(item.id)}
                      />
                      <span className={checkedItems.has(item.id) ? 'checked' : ''}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
            
            <div className="checklist-progress">
              {checkedItems.size} of {checklist.length} complete
            </div>
            
            <div className="btn-row">
              <button className="back-btn" onClick={() => setPrepStep('basics')}>Back</button>
              <button className="next-btn" onClick={() => setPrepStep('opening')}>
                Continue
              </button>
            </div>
          </div>
        );

      case 'opening':
        return (
          <div className="step-content">
            <h2>Your Opening Statement</h2>
            <p className="step-desc">Say this when the judge asks your position. Then stop.</p>
            
            <div className="opening-template">
              <div className="template-label">Template:</div>
              <p className="template-text">
                "Your Honor, I am requesting <span className="highlight">{mainRequest || '[your request]'}</span> to reduce conflict and provide stability for {caseContext?.children_names || 'my child'}."
              </p>
            </div>
            
            <div className="opening-rules">
              <h4>Rules for your opening:</h4>
              <ul>
                <li><strong>One paragraph max.</strong> Not your life story.</li>
                <li><strong>Child-focused.</strong> Not about punishing them.</li>
                <li><strong>Solution-oriented.</strong> Not problem-focused.</li>
                <li><strong>Stop when done.</strong> Silence is fine.</li>
              </ul>
            </div>
            
            <div className="avoid-box">
              <h4>❌ Avoid these words:</h4>
              <div className="avoid-words">
                <span>abusive</span>
                <span>narcissist</span>
                <span>toxic</span>
                <span>controlling</span>
                <span>always</span>
                <span>never</span>
              </div>
              <p>Emotional language undermines credibility. Let the facts speak.</p>
            </div>
            
            <div className="btn-row">
              <button className="back-btn" onClick={() => setPrepStep('checklist')}>Back</button>
              <button className="next-btn" onClick={() => setPrepStep('scenarios')}>
                Continue
              </button>
            </div>
          </div>
        );

      case 'scenarios':
        return (
          <div className="step-content">
            <h2>What to Say When...</h2>
            <p className="step-desc">Tap each scenario to see your response.</p>
            
            <div className="scenarios">
              {scenarios.map(scenario => (
                <div 
                  key={scenario.id}
                  className={`scenario-card ${expandedScenario === scenario.id ? 'expanded' : ''}`}
                  onClick={() => setExpandedScenario(
                    expandedScenario === scenario.id ? null : scenario.id
                  )}
                >
                  <div className="scenario-question">
                    <span className="scenario-icon">💬</span>
                    {scenario.question}
                    <span className="expand-icon">{expandedScenario === scenario.id ? '−' : '+'}</span>
                  </div>
                  {expandedScenario === scenario.id && (
                    <div className="scenario-answer">
                      <div className="say-this">
                        <strong>Say this:</strong>
                        <p>{scenario.answer}</p>
                      </div>
                      <div className="scenario-note">
                        <strong>Remember:</strong> {scenario.note}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="btn-row">
              <button className="back-btn" onClick={() => setPrepStep('opening')}>Back</button>
              <button className="next-btn" onClick={() => setPrepStep('grounding')}>
                Continue
              </button>
            </div>
          </div>
        );

      case 'grounding':
        return (
          <div className="step-content">
            <h2>Ground Yourself</h2>
            <p className="step-desc">Take 2 minutes before your hearing. You've prepared. Now settle your body.</p>
            
            <div className={`breath-circle ${breathingActive ? breathPhase : ''}`}>
              {breathingActive ? (
                <span className="breath-text">
                  {breathPhase === 'in' && 'Breathe in...'}
                  {breathPhase === 'hold' && 'Hold...'}
                  {breathPhase === 'out' && 'Breathe out...'}
                </span>
              ) : (
                <span className="breath-text">Tap to start</span>
              )}
            </div>
            
            <button 
              className={`breath-btn ${breathingActive ? 'stop' : ''}`}
              onClick={() => setBreathingActive(!breathingActive)}
            >
              {breathingActive ? 'Stop' : 'Start Breathing'}
            </button>
            
            <div className="grounding-reminders">
              <h4>Hold in your mind:</h4>
              <div className="reminder-card">
                <p>"I am asking for structure that protects my child."</p>
              </div>
              
              <h4>If you feel triggered:</h4>
              <ul>
                <li>Press your feet into the floor</li>
                <li>Take one slow breath</li>
                <li>Say: "I'd like to stay focused on the proposal."</li>
              </ul>
              
              <h4>Final reminders:</h4>
              <ul>
                <li>Speak slowly</li>
                <li>Answer only what's asked</li>
                <li>Stop when finished</li>
                <li>Their chaos is not your emergency</li>
              </ul>
            </div>
            
            <div className="btn-row">
              <button className="back-btn" onClick={() => setPrepStep('scenarios')}>Back</button>
              <button className="next-btn ready" onClick={() => setPrepStep('ready')}>
                I'm Ready
              </button>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="step-content ready-screen">
            <div className="ready-icon">💚</div>
            <h2>You're Ready</h2>
            
            <div className="ready-summary">
              <div className="summary-item">
                <span className="summary-label">Hearing</span>
                <span className="summary-value">{hearingType ? hearingTypeInfo[hearingType].name : ''}</span>
              </div>
              {hearingDate && (
                <div className="summary-item">
                  <span className="summary-label">When</span>
                  <span className="summary-value">
                    {new Date(hearingDate).toLocaleDateString()} {hearingTime && `at ${hearingTime}`}
                  </span>
                </div>
              )}
              <div className="summary-item">
                <span className="summary-label">Your Request</span>
                <span className="summary-value">{mainRequest || 'Not specified'}</span>
              </div>
            </div>
            
            <div className="ready-reminder">
              <p><strong>One sentence to hold:</strong></p>
              <p className="anchor-sentence">
                "I am asking for structure that reduces conflict and protects my child."
              </p>
            </div>
            
            <div className="ready-actions">
              <button className="action-btn" onClick={() => setPrepStep('scenarios')}>
                📋 Review Scenarios
              </button>
              <button className="action-btn" onClick={() => setPrepStep('grounding')}>
                🌿 Ground Again
              </button>
              <button className="action-btn" onClick={() => router.push('/coach')}>
                💬 Back to Coach
              </button>
            </div>
            
            <p className="final-message">
              You showed up. You prepared. That's what good parents do.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-arrow">←</button>
        <h1>Court Prep</h1>
        <div className="step-indicator">
          {prepStep !== 'type' && prepStep !== 'ready' && (
            <span>{['type', 'basics', 'checklist', 'opening', 'scenarios', 'grounding'].indexOf(prepStep)}/5</span>
          )}
        </div>
      </header>

      <div className="content">
        {renderStep()}
      </div>

      <BottomNav active="menu" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
          padding-bottom: 100px;
        }
        .header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: #1a3a2f;
          color: white;
        }
        .back-arrow {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
        }
        .header h1 {
          flex: 1;
          font-size: 20px;
          margin: 0;
        }
        .step-indicator {
          font-size: 14px;
          opacity: 0.8;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .step-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .step-content h2 {
          color: #1a3a2f;
          margin: 0 0 8px 0;
          font-size: 22px;
        }
        .step-desc {
          color: #6b7280;
          margin: 0 0 24px 0;
          font-size: 15px;
        }
        
        /* Hearing Types */
        .hearing-types {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .type-btn {
          text-align: left;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .type-btn:hover {
          border-color: #1a3a2f;
        }
        .type-btn.selected {
          border-color: #059669;
          background: #f0fdf4;
        }
        .type-btn strong {
          display: block;
          color: #1a3a2f;
          font-size: 15px;
          margin-bottom: 4px;
        }
        .type-btn span {
          font-size: 13px;
          color: #6b7280;
        }
        .type-tips {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .type-tips h4 {
          color: #1a3a2f;
          margin: 0 0 12px 0;
          font-size: 15px;
        }
        .type-tips ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
          font-size: 14px;
        }
        .type-tips li {
          margin-bottom: 8px;
        }
        
        /* Form */
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .date-time-row {
          display: flex;
          gap: 12px;
        }
        .date-time-row input {
          flex: 1;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 16px;
        }
        .toggle-row {
          display: flex;
          gap: 12px;
        }
        .toggle-btn {
          flex: 1;
          padding: 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 15px;
          cursor: pointer;
        }
        .toggle-btn.active {
          border-color: #059669;
          background: #f0fdf4;
        }
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          resize: none;
          box-sizing: border-box;
        }
        .help-text {
          font-size: 13px;
          color: #9ca3af;
          margin: 8px 0 0 0;
        }
        
        /* Buttons */
        .btn-row {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .back-btn {
          flex: 1;
          padding: 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          color: #6b7280;
        }
        .next-btn {
          flex: 2;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: #1a3a2f;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .next-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .next-btn.ready {
          background: #059669;
        }
        
        /* Checklist */
        .checklist-section {
          margin-bottom: 20px;
        }
        .checklist-section h4 {
          color: #1a3a2f;
          margin: 0 0 12px 0;
          font-size: 15px;
        }
        .check-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
        }
        .check-item input {
          width: 22px;
          height: 22px;
          accent-color: #059669;
        }
        .check-item span {
          color: #4b5563;
          font-size: 15px;
        }
        .check-item span.checked {
          text-decoration: line-through;
          color: #9ca3af;
        }
        .checklist-progress {
          text-align: center;
          padding: 16px;
          background: #f0fdf4;
          border-radius: 10px;
          font-weight: 600;
          color: #059669;
        }
        
        /* Opening */
        .opening-template {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          border-left: 4px solid #059669;
        }
        .template-label {
          font-size: 12px;
          font-weight: 600;
          color: #059669;
          margin-bottom: 8px;
        }
        .template-text {
          color: #1a3a2f;
          font-size: 17px;
          line-height: 1.6;
          margin: 0;
        }
        .highlight {
          background: linear-gradient(180deg, transparent 60%, #a7f3d0 60%);
        }
        .opening-rules {
          margin-bottom: 20px;
        }
        .opening-rules h4 {
          color: #1a3a2f;
          margin: 0 0 12px 0;
        }
        .opening-rules ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }
        .opening-rules li {
          margin-bottom: 8px;
        }
        .avoid-box {
          background: #fef2f2;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #fecaca;
        }
        .avoid-box h4 {
          color: #dc2626;
          margin: 0 0 12px 0;
        }
        .avoid-words {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .avoid-words span {
          background: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .avoid-box p {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }
        
        /* Scenarios */
        .scenarios {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .scenario-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
        }
        .scenario-card.expanded {
          border-color: #059669;
        }
        .scenario-question {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          font-weight: 500;
          color: #1a3a2f;
        }
        .scenario-icon {
          font-size: 20px;
        }
        .expand-icon {
          margin-left: auto;
          font-size: 20px;
          color: #9ca3af;
        }
        .scenario-answer {
          padding: 0 16px 16px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .say-this {
          padding: 16px 0;
        }
        .say-this strong {
          color: #059669;
          font-size: 13px;
        }
        .say-this p {
          margin: 8px 0 0 0;
          color: #1a3a2f;
          font-size: 15px;
          line-height: 1.5;
        }
        .scenario-note {
          background: #f0fdf4;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          color: #4b5563;
        }
        .scenario-note strong {
          color: #1a3a2f;
        }
        
        /* Grounding */
        .breath-circle {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 24px auto;
          transition: transform 4s ease-in-out;
          cursor: pointer;
        }
        .breath-circle.in {
          transform: scale(1.15);
        }
        .breath-circle.hold {
          transform: scale(1.15);
        }
        .breath-circle.out {
          transform: scale(1);
        }
        .breath-text {
          color: #1a3a2f;
          font-weight: 600;
          font-size: 16px;
        }
        .breath-btn {
          display: block;
          width: 100%;
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 24px;
        }
        .breath-btn.stop {
          background: #dc2626;
        }
        .grounding-reminders h4 {
          color: #1a3a2f;
          margin: 20px 0 12px 0;
          font-size: 15px;
        }
        .grounding-reminders ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }
        .grounding-reminders li {
          margin-bottom: 8px;
        }
        .reminder-card {
          background: #f0fdf4;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }
        .reminder-card p {
          margin: 0;
          font-size: 17px;
          color: #1a3a2f;
          font-weight: 500;
          font-style: italic;
        }
        
        /* Ready Screen */
        .ready-screen {
          text-align: center;
        }
        .ready-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .ready-summary {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          margin: 24px 0;
          text-align: left;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-item:last-child {
          border-bottom: none;
        }
        .summary-label {
          color: #6b7280;
          font-size: 14px;
        }
        .summary-value {
          color: #1a3a2f;
          font-weight: 500;
          text-align: right;
          max-width: 60%;
        }
        .ready-reminder {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .ready-reminder p:first-child {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #059669;
        }
        .anchor-sentence {
          font-size: 18px;
          color: #1a3a2f;
          margin: 0;
          font-style: italic;
        }
        .ready-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .action-btn {
          padding: 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          color: #1a3a2f;
        }
        .action-btn:hover {
          border-color: #1a3a2f;
        }
        .final-message {
          color: #6b7280;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
}