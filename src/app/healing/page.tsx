'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const AFFIRMATIONS = [
  "You are not crazy. What you experienced is real.",
  "Your body is trying to protect you. This reaction makes sense.",
  "You don't have to respond right now.",
  "This feeling will pass. It always does.",
  "You have survived 100% of your hardest days.",
  "Safety is available to you right now, in this moment.",
  "You are allowed to take up space.",
  "You don't owe anyone an explanation.",
  "Your peace matters more than their approval.",
  "One breath at a time.",
];

const GROUNDING_STEPS = [
  { count: 5, sense: "SEE", icon: "👀", color: "#a7f3d0" },
  { count: 4, sense: "TOUCH", icon: "✋", color: "#bae6fd" },
  { count: 3, sense: "HEAR", icon: "👂", color: "#ddd6fe" },
  { count: 2, sense: "SMELL", icon: "🌿", color: "#fde68a" },
  { count: 1, sense: "TASTE", icon: "💧", color: "#fecaca" },
];

export default function HealingPage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<'home' | 'breathe' | 'ground' | 'affirm' | 'learn'>('home');
  
  // Breathing state - Cyclic Sighing
  const [breathPhase, setBreathPhase] = useState<'ready' | 'inhale1' | 'inhale2' | 'exhale' | 'rest'>('ready');
  const [cycleCount, setCycleCount] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const breathTimeout = useRef<NodeJS.Timeout | null>(null);

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingComplete, setGroundingComplete] = useState(false);
  
  // Affirmation state
  const [affirmationIndex, setAffirmationIndex] = useState(0);

  useEffect(() => {
    setAffirmationIndex(Math.floor(Math.random() * AFFIRMATIONS.length));
    return () => {
      if (breathTimeout.current) clearTimeout(breathTimeout.current);
    };
  }, []);

  // Cyclic Sighing - Stanford protocol
  const runBreathCycle = () => {
    setBreathPhase('inhale1');
    breathTimeout.current = setTimeout(() => {
      setBreathPhase('inhale2');
      breathTimeout.current = setTimeout(() => {
        setBreathPhase('exhale');
        breathTimeout.current = setTimeout(() => {
          setBreathPhase('rest');
          setCycleCount(prev => prev + 1);
          breathTimeout.current = setTimeout(() => {
            if (isBreathing) runBreathCycle();
          }, 1500);
        }, 6000);
      }, 1500);
    }, 2500);
  };

  const startBreathing = () => {
    setIsBreathing(true);
    setCycleCount(0);
    runBreathCycle();
  };

  const stopBreathing = () => {
    setIsBreathing(false);
    setBreathPhase('ready');
    if (breathTimeout.current) clearTimeout(breathTimeout.current);
  };

  useEffect(() => {
    if (!isBreathing && breathPhase !== 'ready') setBreathPhase('ready');
  }, [isBreathing]);

  const nextAffirmation = () => {
    setAffirmationIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
  };

  const nextGroundingStep = () => {
    if (groundingStep < GROUNDING_STEPS.length - 1) {
      setGroundingStep(prev => prev + 1);
    } else {
      setGroundingComplete(true);
    }
  };

  const resetGrounding = () => {
    setGroundingStep(0);
    setGroundingComplete(false);
    setActiveMode('home');
  };

  const getBreathText = () => {
    switch (breathPhase) {
      case 'ready': return 'tap to begin';
      case 'inhale1': return 'breathe in';
      case 'inhale2': return 'sip more air';
      case 'exhale': return 'slowly out';
      case 'rest': return 'rest';
      default: return '';
    }
  };

  const getCircleScale = () => {
    switch (breathPhase) {
      case 'inhale1': return 1.15;
      case 'inhale2': return 1.35;
      case 'exhale': return 1;
      default: return 1;
    }
  };

  return (
    <div className="container">
      {/* HOME */}
      {activeMode === 'home' && (
        <>
          <div className="scene">
            <div className="scene-gradient" />
            <div className="scene-content">
              <h1>Take a moment</h1>
              <p>What do you need right now?</p>
            </div>
          </div>

          <div className="tools-container">
            <button className="tool-btn breathe-btn" onClick={() => setActiveMode('breathe')}>
              <span className="tool-emoji">🫁</span>
              <span className="tool-name">Breathe</span>
              <span className="tool-desc">Reduce stress quickly</span>
            </button>

            <button className="tool-btn ground-btn" onClick={() => setActiveMode('ground')}>
              <span className="tool-emoji">🌿</span>
              <span className="tool-name">Ground</span>
              <span className="tool-desc">Come back to the present</span>
            </button>

            <button className="tool-btn affirm-btn" onClick={() => setActiveMode('affirm')}>
              <span className="tool-emoji">💚</span>
              <span className="tool-name">Remind Me</span>
              <span className="tool-desc">Words you need to hear</span>
            </button>

            <button className="tool-btn learn-btn" onClick={() => setActiveMode('learn')}>
              <span className="tool-emoji">🧠</span>
              <span className="tool-name">Why This Helps</span>
              <span className="tool-desc">Understand your body</span>
            </button>
          </div>

          <div className="home-footer">
            <p>You don't have to respond right now.</p>
          </div>
        </>
      )}

      {/* BREATHE - Cyclic Sighing */}
      {activeMode === 'breathe' && (
        <div className="fullscreen breathe-screen">
          <button className="back-btn" onClick={() => { stopBreathing(); setActiveMode('home'); }}>←</button>
          
          <div className="breathe-content">
            <div className="breathe-label">cyclic sighing</div>
            
            <div 
              className={`breath-orb ${isBreathing ? 'active' : ''}`}
              style={{ transform: `scale(${getCircleScale()})` }}
              onClick={() => !isBreathing && startBreathing()}
            >
              <span className="breath-text">{getBreathText()}</span>
            </div>

            <div className="breath-guide">
              {!isBreathing ? (
                <p>Double inhale through your nose.<br/>Long exhale through your mouth.</p>
              ) : (
                <p className="breath-count">{cycleCount} breath{cycleCount !== 1 ? 's' : ''}</p>
              )}
            </div>

            {isBreathing && (
              <button className="done-btn" onClick={stopBreathing}>
                I feel better
              </button>
            )}
          </div>

          <div className="breathe-footer">
            <p>Stanford research found 5 min of cyclic sighing improved mood more than meditation. (Balban et al., 2023)</p>
          </div>
        </div>
      )}

      {/* GROUND - 5-4-3-2-1 */}
      {activeMode === 'ground' && (
        <div className="fullscreen ground-screen">
          <button className="back-btn" onClick={resetGrounding}>←</button>
          
          {!groundingComplete ? (
            <div className="ground-content">
              <div className="ground-label">5-4-3-2-1 grounding</div>
              
              <div 
                className="ground-card"
                style={{ backgroundColor: GROUNDING_STEPS[groundingStep].color }}
                onClick={nextGroundingStep}
              >
                <span className="ground-emoji">{GROUNDING_STEPS[groundingStep].icon}</span>
                <span className="ground-number">{GROUNDING_STEPS[groundingStep].count}</span>
                <span className="ground-sense">things you can {GROUNDING_STEPS[groundingStep].sense}</span>
              </div>

              <div className="ground-dots">
                {GROUNDING_STEPS.map((_, i) => (
                  <div key={i} className={`dot ${i <= groundingStep ? 'filled' : ''}`} />
                ))}
              </div>

              <p className="ground-hint">tap when ready for next</p>
            </div>
          ) : (
            <div className="ground-content complete">
              <span className="complete-emoji">✨</span>
              <h2>You did it</h2>
              <p>Notice how you feel now.<br/>You can come back anytime.</p>
              <button className="done-btn" onClick={resetGrounding}>Done</button>
            </div>
          )}
        </div>
      )}

      {/* AFFIRM */}
      {activeMode === 'affirm' && (
        <div className="fullscreen affirm-screen" onClick={nextAffirmation}>
          <button className="back-btn light" onClick={(e) => { e.stopPropagation(); setActiveMode('home'); }}>←</button>
          
          <div className="affirm-content">
            <span className="affirm-heart">💚</span>
            <p className="affirm-text">{AFFIRMATIONS[affirmationIndex]}</p>
            <span className="affirm-hint">tap for another</span>
          </div>
        </div>
      )}

      {/* LEARN - The Science */}
      {activeMode === 'learn' && (
        <div className="fullscreen learn-screen">
          <button className="back-btn" onClick={() => setActiveMode('home')}>←</button>
          
          <div className="learn-content">
            <h2>Why your body reacts this way</h2>
            
            <div className="learn-section">
              <p>
                When you see their name and your heart races, when your stomach drops 
                at a message notification, when you freeze during conflict — 
                <strong> your nervous system is doing exactly what it evolved to do.</strong>
              </p>
              <p>
                This isn't weakness. It's protection. Your body learned from real experiences 
                that this person isn't safe, and it's trying to keep you alive.
              </p>
            </div>

            <div className="learn-section">
              <h3>The stress response</h3>
              <div className="state safe">
                <strong>🟢 Calm / Safe</strong>
                <p>Clear thinking, steady heart rate, able to respond thoughtfully</p>
              </div>
              <div className="state fight">
                <strong>🟡 Fight or Flight</strong>
                <p>Racing heart, urge to argue or run, hypervigilance — your sympathetic nervous system is activated</p>
              </div>
              <div className="state freeze">
                <strong>🔴 Freeze or Shutdown</strong>
                <p>Numb, foggy, disconnected, unable to think — your body is conserving energy</p>
              </div>
            </div>

            <div className="learn-section">
              <h3>Why these tools work</h3>
              <p>
                You can't think your way out of a stress response — it's faster 
                than conscious thought. But you can send signals of safety through your body.
              </p>
              <p>
                <strong>Breathing:</strong> Extended exhales activate your parasympathetic 
                nervous system ("rest and digest"), slowing your heart rate and reducing cortisol. 
                A Stanford study found cyclic sighing outperformed meditation for stress relief.
              </p>
              <p>
                <strong>Grounding:</strong> Engaging your senses redirects your brain 
                from internal distress to present-moment awareness — interrupting the fear response 
                and reducing activity in brain regions associated with rumination.
              </p>
            </div>

            <div className="learn-footer">
              <p><strong>Research sources:</strong> Balban et al. (2023), Cell Reports Medicine (Stanford breathing study); 
              Grabbe & Miller-Karas (2018) on grounding; van der Kolk, "The Body Keeps the Score."</p>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="menu" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #1a3a2f 0%, #0d1f18 40%, #1a3a2f 100%);
          padding-bottom: max(100px, calc(80px + env(safe-area-inset-bottom)));
        }

        /* HOME */
        .scene {
          position: relative;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .scene-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(167, 243, 208, 0.15) 0%, transparent 70%);
        }
        .scene-content {
          position: relative;
          text-align: center;
          color: white;
        }
        .scene-content h1 {
          font-size: 28px;
          font-weight: 300;
          margin: 0 0 8px;
          letter-spacing: 0.5px;
        }
        .scene-content p {
          font-size: 16px;
          opacity: 0.7;
          margin: 0;
        }

        .tools-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 0 24px;
          max-width: 400px;
          margin: 0 auto;
        }
        .tool-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        }
        .tool-btn:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-2px);
        }
        .tool-emoji {
          font-size: 36px;
          margin-bottom: 12px;
        }
        .tool-name {
          font-size: 15px;
          font-weight: 600;
          color: white;
          margin-bottom: 4px;
        }
        .tool-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          text-align: center;
        }

        .home-footer {
          text-align: center;
          padding: 32px 24px;
        }
        .home-footer p {
          color: rgba(255,255,255,0.4);
          font-size: 14px;
          margin: 0;
        }

        /* FULLSCREEN MODES */
        .fullscreen {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          z-index: 200;
        }
        .back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 20px;
          cursor: pointer;
          z-index: 10;
        }
        .back-btn.light {
          background: rgba(0,0,0,0.1);
        }

        /* BREATHE */
        .breathe-screen {
          background: linear-gradient(180deg, #1e4a3f 0%, #0d1f18 100%);
          align-items: center;
          justify-content: center;
        }
        .breathe-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .breathe-label {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 48px;
        }
        .breath-orb {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #6ee7b7, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 2.5s ease-in-out;
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.3);
        }
        .breath-orb.active {
          cursor: default;
        }
        .breath-text {
          color: white;
          font-size: 18px;
          font-weight: 500;
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .breath-guide {
          margin-top: 32px;
          color: rgba(255,255,255,0.6);
          font-size: 15px;
          line-height: 1.6;
        }
        .breath-count {
          font-size: 16px;
          color: rgba(255,255,255,0.5);
        }
        .done-btn {
          margin-top: 40px;
          padding: 14px 32px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 30px;
          color: white;
          font-size: 15px;
          cursor: pointer;
        }
        .breathe-footer {
          position: absolute;
          bottom: 100px;
          left: 0;
          right: 0;
          text-align: center;
          padding: 0 32px;
        }
        .breathe-footer p {
          color: rgba(255,255,255,0.3);
          font-size: 13px;
        }

        /* GROUND */
        .ground-screen {
          background: linear-gradient(180deg, #1a3a2f 0%, #0d1f18 100%);
          align-items: center;
          justify-content: center;
        }
        .ground-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 24px;
        }
        .ground-content.complete {
          color: white;
        }
        .ground-content.complete h2 {
          font-size: 28px;
          font-weight: 300;
          margin: 16px 0;
        }
        .ground-content.complete p {
          color: rgba(255,255,255,0.6);
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .complete-emoji {
          font-size: 64px;
        }
        .ground-label {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 32px;
        }
        .ground-card {
          width: 220px;
          height: 260px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.3s, background-color 0.5s;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .ground-card:active {
          transform: scale(0.98);
        }
        .ground-emoji {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .ground-number {
          font-size: 80px;
          font-weight: 200;
          color: rgba(0,0,0,0.7);
          line-height: 1;
        }
        .ground-sense {
          font-size: 16px;
          color: rgba(0,0,0,0.5);
          margin-top: 8px;
        }
        .ground-dots {
          display: flex;
          gap: 8px;
          margin-top: 32px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          transition: background 0.3s;
        }
        .dot.filled {
          background: white;
        }
        .ground-hint {
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          margin-top: 24px;
        }

        /* AFFIRM */
        .affirm-screen {
          background: linear-gradient(180deg, #065f46 0%, #064e3b 100%);
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .affirm-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 32px;
        }
        .affirm-heart {
          font-size: 56px;
          margin-bottom: 24px;
        }
        .affirm-text {
          font-size: 26px;
          font-weight: 400;
          color: white;
          line-height: 1.4;
          margin: 0 0 32px;
          max-width: 320px;
        }
        .affirm-hint {
          color: rgba(255,255,255,0.4);
          font-size: 14px;
        }

        /* LEARN */
        .learn-screen {
          background: #f5f7f6;
          overflow-y: auto;
          padding-bottom: max(100px, calc(80px + env(safe-area-inset-bottom)));
        }
        .learn-content {
          max-width: 500px;
          margin: 0 auto;
          padding: 80px 24px 40px;
        }
        .learn-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a3a2f;
          margin: 0 0 24px;
        }
        .learn-section {
          margin-bottom: 32px;
        }
        .learn-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1a3a2f;
          margin: 0 0 16px;
        }
        .learn-section p {
          font-size: 15px;
          color: #4b5563;
          line-height: 1.7;
          margin: 0 0 12px;
        }
        .state {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .state strong {
          font-size: 14px;
        }
        .state p {
          font-size: 13px;
          margin: 4px 0 0;
          color: #6b7280;
        }
        .state.safe { background: #d1fae5; }
        .state.fight { background: #fef3c7; }
        .state.freeze { background: #fee2e2; }
        .learn-footer {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .learn-footer p {
          font-size: 12px;
          color: #9ca3af;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}