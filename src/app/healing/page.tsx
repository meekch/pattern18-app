'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function HealingPage() {
  const router = useRouter();
  
  // Breathing exercise state
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [countdown, setCountdown] = useState(4);
  
  // Grounding exercise state
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingComplete, setGroundingComplete] = useState(false);
  
  // Active section
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Breathing exercise logic
  useEffect(() => {
    if (!breathingActive) return;
    
    const phases: ('inhale' | 'hold' | 'exhale' | 'rest')[] = ['inhale', 'hold', 'exhale', 'rest'];
    const durations = [4, 4, 4, 2]; // Box breathing with short rest
    
    let phaseIndex = 0;
    let count = durations[0];
    
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        phaseIndex = (phaseIndex + 1) % 4;
        if (phaseIndex === 0) {
          setBreathCount(prev => prev + 1);
        }
        setBreathPhase(phases[phaseIndex]);
        count = durations[phaseIndex];
        setCountdown(count);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [breathingActive]);

  const startBreathing = () => {
    setBreathingActive(true);
    setBreathPhase('inhale');
    setCountdown(4);
    setBreathCount(0);
  };

  const stopBreathing = () => {
    setBreathingActive(false);
    setBreathPhase('inhale');
    setCountdown(4);
  };

  // Grounding steps
  const groundingSteps = [
    { count: 5, sense: 'SEE', prompt: 'Name 5 things you can see right now', icon: '👁️' },
    { count: 4, sense: 'TOUCH', prompt: 'Name 4 things you can physically feel', icon: '✋' },
    { count: 3, sense: 'HEAR', prompt: 'Name 3 things you can hear', icon: '👂' },
    { count: 2, sense: 'SMELL', prompt: 'Name 2 things you can smell', icon: '👃' },
    { count: 1, sense: 'TASTE', prompt: 'Name 1 thing you can taste', icon: '👅' },
  ];

  const advanceGrounding = () => {
    if (groundingStep < 4) {
      setGroundingStep(prev => prev + 1);
    } else {
      setGroundingComplete(true);
    }
  };

  const resetGrounding = () => {
    setGroundingStep(0);
    setGroundingComplete(false);
  };

  // Affirmations for coercive control survivors
  const affirmations = [
    { text: "You are not crazy. What you experienced is real.", category: "validation" },
    { text: "Your nervous system is doing exactly what it's supposed to do.", category: "education" },
    { text: "You don't have to respond right now. Silence is a valid choice.", category: "boundaries" },
    { text: "Their chaos does not require your participation.", category: "boundaries" },
    { text: "You are breaking a cycle. That takes immense courage.", category: "empowerment" },
    { text: "Your body remembers what your mind tries to forget. That's not weakness.", category: "validation" },
    { text: "Healing is not linear. Hard days don't erase progress.", category: "healing" },
    { text: "You are documenting the truth. That matters.", category: "empowerment" },
    { text: "Your children are watching you choose yourself. That's the lesson.", category: "empowerment" },
    { text: "The goal is peace, not winning.", category: "wisdom" },
  ];

  const [currentAffirmation, setCurrentAffirmation] = useState(0);

  const nextAffirmation = () => {
    setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
  };

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>Healing Space</h1>
      </header>

      <div className="content">
        
        {/* Affirmation Card */}
        <div className="affirmation-card" onClick={nextAffirmation}>
          <div className="quote-mark">"</div>
          <p>{affirmations[currentAffirmation].text}</p>
          <span className="tap-hint">tap for another</span>
        </div>

        {/* Why This Matters - Nervous System Education */}
        <div className="section education">
          <h2>🧠 Why Your Body Reacts This Way</h2>
          <div className="education-content">
            <p className="intro">
              If you feel your heart race when you see their name, if your stomach drops when a message comes in, if you freeze or can't think straight during conflict... <strong>your nervous system is working exactly as designed.</strong>
            </p>
            
            <div className="nervous-system-box">
              <h3>Your Nervous System on High Alert</h3>
              <p>
                When you've experienced coercive control, your brain learns to scan for danger constantly. This isn't anxiety or weakness. It's your body trying to protect you based on real experiences.
              </p>
              
              <div className="response-types">
                <div className="response">
                  <span className="response-icon">⚔️</span>
                  <div>
                    <strong>Fight</strong>
                    <span>Arguing back, defending yourself, the urge to "win"</span>
                  </div>
                </div>
                <div className="response">
                  <span className="response-icon">🏃</span>
                  <div>
                    <strong>Flight</strong>
                    <span>Avoiding, escaping, wanting to run from the situation</span>
                  </div>
                </div>
                <div className="response">
                  <span className="response-icon">🧊</span>
                  <div>
                    <strong>Freeze</strong>
                    <span>Shutting down, can't think, feeling paralyzed</span>
                  </div>
                </div>
                <div className="response">
                  <span className="response-icon">🎭</span>
                  <div>
                    <strong>Fawn</strong>
                    <span>People-pleasing, giving in to keep peace, over-explaining</span>
                  </div>
                </div>
              </div>
              
              <p className="key-insight">
                <strong>The goal isn't to stop these responses.</strong> It's to recognize them, regulate your body first, then choose your response from a calm state.
              </p>
            </div>
            
            <div className="trauma-info">
              <h3>Why Documentation Helps Healing</h3>
              <p>
                When you document patterns, you're doing two things: building evidence AND validating your own reality. Gaslighting makes you doubt yourself. Seeing the patterns in black and white helps your brain trust what it knows.
              </p>
              <p className="highlight">
                You're not being dramatic. You're being strategic.
              </p>
            </div>
          </div>
        </div>

        {/* Box Breathing Exercise */}
        <div className="section breathing">
          <h2>🌿 Box Breathing</h2>
          <p className="section-desc">
            This technique activates your parasympathetic nervous system, the "rest and digest" mode that calms your body. Used by Navy SEALs for stress management.
          </p>
          
          <div className={`breath-circle ${breathingActive ? breathPhase : ''}`}>
            {breathingActive ? (
              <>
                <span className="breath-countdown">{countdown}</span>
                <span className="breath-text">
                  {breathPhase === 'inhale' && 'Breathe in'}
                  {breathPhase === 'hold' && 'Hold'}
                  {breathPhase === 'exhale' && 'Breathe out'}
                  {breathPhase === 'rest' && 'Rest'}
                </span>
              </>
            ) : (
              <span className="breath-text">Ready when you are</span>
            )}
          </div>
          
          {breathingActive && (
            <p className="breath-counter">Cycles completed: {breathCount}</p>
          )}
          
          <button
            className={`action-btn ${breathingActive ? 'stop' : ''}`}
            onClick={breathingActive ? stopBreathing : startBreathing}
          >
            {breathingActive ? 'Stop' : 'Start Breathing Exercise'}
          </button>
          
          <p className="pro-tip">
            <strong>Pro tip:</strong> Try 4 cycles before responding to a triggering message.
          </p>
        </div>

        {/* 5-4-3-2-1 Grounding */}
        <div className="section grounding">
          <h2>🌳 5-4-3-2-1 Grounding</h2>
          <p className="section-desc">
            When you feel panic rising or start to spiral, this technique brings you back to the present moment by engaging your senses.
          </p>
          
          {!groundingComplete ? (
            <div className="grounding-exercise">
              <div className="grounding-step">
                <span className="step-icon">{groundingSteps[groundingStep].icon}</span>
                <span className="step-count">{groundingSteps[groundingStep].count}</span>
                <span className="step-sense">{groundingSteps[groundingStep].sense}</span>
              </div>
              <p className="step-prompt">{groundingSteps[groundingStep].prompt}</p>
              
              <div className="grounding-progress">
                {groundingSteps.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`progress-dot ${idx <= groundingStep ? 'active' : ''} ${idx < groundingStep ? 'complete' : ''}`}
                  />
                ))}
              </div>
              
              <button className="action-btn" onClick={advanceGrounding}>
                {groundingStep < 4 ? "Done - Next" : "Complete"}
              </button>
            </div>
          ) : (
            <div className="grounding-complete">
              <span className="complete-icon">💚</span>
              <p>You're here. You're present. You're safe in this moment.</p>
              <button className="action-btn secondary" onClick={resetGrounding}>
                Start Over
              </button>
            </div>
          )}
        </div>

        {/* Quick Resets */}
        <div className="section quick-resets">
          <h2>⚡ Quick Resets</h2>
          <p className="section-desc">30-second techniques when you need to regulate fast.</p>
          
          <div className="reset-cards">
            <div className="reset-card">
              <span className="reset-icon">🧊</span>
              <h4>Cold Water Reset</h4>
              <p>Splash cold water on your face or hold ice cubes. Activates your dive reflex and slows heart rate instantly.</p>
            </div>
            
            <div className="reset-card">
              <span className="reset-icon">💪</span>
              <h4>Muscle Release</h4>
              <p>Squeeze your fists tight for 5 seconds, then release. Repeat 3x. Your body can't be tense and relaxed at once.</p>
            </div>
            
            <div className="reset-card">
              <span className="reset-icon">👣</span>
              <h4>Feet on Floor</h4>
              <p>Press your feet firmly into the ground. Feel the support beneath you. You are grounded. You are here.</p>
            </div>
            
            <div className="reset-card">
              <span className="reset-icon">🗣️</span>
              <h4>Name It to Tame It</h4>
              <p>Say out loud: "I notice I'm feeling [scared/angry/overwhelmed]." Naming emotions reduces their intensity.</p>
            </div>
          </div>
        </div>

        {/* Before You Respond */}
        <div className="section before-respond">
          <h2>⏸️ Before You Respond</h2>
          <div className="checklist">
            <p className="checklist-intro">Ask yourself:</p>
            <label className="check-item">
              <input type="checkbox" />
              <span>Have I taken 3 deep breaths?</span>
            </label>
            <label className="check-item">
              <input type="checkbox" />
              <span>Am I responding from calm or from fear?</span>
            </label>
            <label className="check-item">
              <input type="checkbox" />
              <span>Does this require a response at all?</span>
            </label>
            <label className="check-item">
              <input type="checkbox" />
              <span>Will this matter in court?</span>
            </label>
            <label className="check-item">
              <input type="checkbox" />
              <span>Is this about my child's needs or their control?</span>
            </label>
          </div>
          <p className="reminder">
            You can always respond later. "I'll get back to you" is a complete sentence.
          </p>
        </div>

        {/* Crisis Resources */}
        <div className="section crisis">
          <h2>🆘 Need More Support?</h2>
          <p className="section-desc">You don't have to do this alone.</p>
          
          <div className="resource-links">
            <a href="tel:1-800-799-7233" className="resource-btn">
              <span className="resource-icon">📞</span>
              <div>
                <strong>National DV Hotline</strong>
                <span>1-800-799-7233 (24/7)</span>
              </div>
            </a>
            <a href="sms:741741&body=HELLO" className="resource-btn">
              <span className="resource-icon">💬</span>
              <div>
                <strong>Crisis Text Line</strong>
                <span>Text HOME to 741741</span>
              </div>
            </a>
            <a href="https://www.thehotline.org/get-help/" target="_blank" className="resource-btn">
              <span className="resource-icon">💻</span>
              <div>
                <strong>Online Chat</strong>
                <span>thehotline.org</span>
              </div>
            </a>
          </div>
          
          <p className="safety-note">
            If you're in immediate danger, call 911.
          </p>
        </div>

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
        .back-btn {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        }
        .header h1 {
          font-size: 20px;
          margin: 0;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        /* Affirmation Card */
        .affirmation-card {
          background: white;
          border-radius: 16px;
          padding: 28px 24px;
          text-align: center;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: transform 0.2s;
        }
        .affirmation-card:active {
          transform: scale(0.98);
        }
        .quote-mark {
          font-size: 48px;
          color: #a7f3d0;
          font-family: Georgia, serif;
          line-height: 1;
          margin-bottom: -8px;
        }
        .affirmation-card p {
          font-size: 19px;
          color: #1a3a2f;
          line-height: 1.5;
          margin: 0 0 12px 0;
          font-weight: 500;
        }
        .tap-hint {
          font-size: 12px;
          color: #9ca3af;
        }
        
        /* Sections */
        .section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .section h2 {
          font-size: 20px;
          color: #1a3a2f;
          margin: 0 0 8px 0;
        }
        .section-desc {
          color: #6b7280;
          margin: 0 0 20px 0;
          font-size: 15px;
          line-height: 1.5;
        }
        
        /* Education Section */
        .education-content p {
          color: #4b5563;
          line-height: 1.7;
          margin: 0 0 16px 0;
        }
        .education-content .intro {
          font-size: 16px;
        }
        .education-content strong {
          color: #1a3a2f;
        }
        .nervous-system-box {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #059669;
        }
        .nervous-system-box h3 {
          color: #1a3a2f;
          font-size: 17px;
          margin: 0 0 12px 0;
        }
        .response-types {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 16px 0;
        }
        .response {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .response-icon {
          font-size: 24px;
          width: 32px;
          text-align: center;
        }
        .response div {
          flex: 1;
        }
        .response strong {
          display: block;
          color: #1a3a2f;
          font-size: 15px;
        }
        .response span {
          font-size: 14px;
          color: #6b7280;
        }
        .key-insight {
          background: white;
          padding: 14px;
          border-radius: 8px;
          margin-top: 16px;
          font-size: 15px;
        }
        .trauma-info {
          margin-top: 20px;
        }
        .trauma-info h3 {
          color: #1a3a2f;
          font-size: 17px;
          margin: 0 0 12px 0;
        }
        .highlight {
          background: linear-gradient(180deg, transparent 60%, #a7f3d0 60%);
          display: inline;
          font-weight: 600;
          color: #1a3a2f;
        }
        
        /* Breathing */
        .breath-circle {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 24px auto;
          transition: transform 0.5s ease-in-out;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
        }
        .breath-circle.inhale {
          transform: scale(1.15);
          background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
        }
        .breath-circle.hold {
          transform: scale(1.15);
        }
        .breath-circle.exhale {
          transform: scale(1);
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        }
        .breath-circle.rest {
          transform: scale(0.95);
        }
        .breath-countdown {
          font-size: 48px;
          font-weight: 700;
          color: #1a3a2f;
          line-height: 1;
        }
        .breath-text {
          color: #1a3a2f;
          font-weight: 600;
          font-size: 16px;
          margin-top: 4px;
        }
        .breath-counter {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin: 0 0 16px 0;
        }
        .pro-tip {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin: 16px 0 0 0;
          font-style: italic;
        }
        
        /* Action Buttons */
        .action-btn {
          display: block;
          width: 100%;
          padding: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:active {
          transform: scale(0.98);
        }
        .action-btn.stop {
          background: #dc2626;
        }
        .action-btn.secondary {
          background: white;
          color: #1a3a2f;
          border: 2px solid #1a3a2f;
        }
        
        /* Grounding */
        .grounding-exercise {
          text-align: center;
        }
        .grounding-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
        }
        .step-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .step-count {
          font-size: 64px;
          font-weight: 800;
          color: #1a3a2f;
          line-height: 1;
        }
        .step-sense {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #059669;
          margin-top: 4px;
        }
        .step-prompt {
          font-size: 17px;
          color: #4b5563;
          margin: 0 0 24px 0;
        }
        .grounding-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .progress-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #e5e7eb;
          transition: all 0.3s;
        }
        .progress-dot.active {
          background: #a7f3d0;
        }
        .progress-dot.complete {
          background: #059669;
        }
        .grounding-complete {
          text-align: center;
          padding: 32px 0;
        }
        .complete-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }
        .grounding-complete p {
          font-size: 18px;
          color: #1a3a2f;
          margin: 0 0 24px 0;
          font-weight: 500;
        }
        
        /* Quick Resets */
        .reset-cards {
          display: grid;
          gap: 12px;
        }
        .reset-card {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 16px;
        }
        .reset-icon {
          font-size: 28px;
          display: block;
          margin-bottom: 8px;
        }
        .reset-card h4 {
          color: #1a3a2f;
          margin: 0 0 6px 0;
          font-size: 16px;
        }
        .reset-card p {
          color: #4b5563;
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }
        
        /* Before You Respond */
        .checklist-intro {
          font-weight: 600;
          color: #1a3a2f;
          margin: 0 0 16px 0;
        }
        .check-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
        }
        .check-item:last-of-type {
          border-bottom: none;
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
        .reminder {
          background: #f0fdf4;
          padding: 14px;
          border-radius: 10px;
          margin-top: 16px;
          text-align: center;
          color: #1a3a2f;
          font-weight: 500;
          font-size: 15px;
        }
        
        /* Crisis Resources */
        .crisis {
          background: #f0fdf4;
          border: 2px solid #a7f3d0;
        }
        .resource-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .resource-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          border: 1px solid #d1fae5;
          transition: all 0.2s;
        }
        .resource-btn:active {
          transform: scale(0.98);
        }
        .resource-icon {
          font-size: 28px;
        }
        .resource-btn div {
          display: flex;
          flex-direction: column;
        }
        .resource-btn strong {
          color: #1a3a2f;
          font-size: 16px;
        }
        .resource-btn span {
          font-size: 14px;
          color: #6b7280;
        }
        .safety-note {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin: 16px 0 0 0;
        }
      `}</style>
    </div>
  );
}