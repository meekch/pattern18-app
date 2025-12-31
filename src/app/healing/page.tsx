'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function HealPage() {
  const router = useRouter();
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  const startBreathing = () => {
    setBreathingActive(true);
    let phase = 0;
    const phases: ('inhale' | 'hold' | 'exhale')[] = ['inhale', 'hold', 'exhale'];
    const durations = [4000, 4000, 4000]; // 4-4-4 breathing
    
    const cycle = () => {
      setBreathPhase(phases[phase % 3]);
      setTimeout(() => {
        phase++;
        if (breathingActive) cycle();
      }, durations[phase % 3]);
    };
    cycle();
  };

  const stopBreathing = () => {
    setBreathingActive(false);
  };

  const affirmations = [
    "You are doing the right thing by documenting.",
    "Your child is lucky to have a parent who fights for them.",
    "This situation is hard. You are handling it.",
    "You don't have to respond right now.",
    "Their chaos does not require your response.",
    "You are building a record. Every piece matters.",
    "Breathe. You've survived 100% of your hardest days.",
  ];

  const [currentAffirmation] = useState(
    affirmations[Math.floor(Math.random() * affirmations.length)]
  );

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>Take a Moment</h1>
      </header>

      <div className="content">
        {/* Affirmation */}
        <div className="affirmation-card">
          <div className="quote-mark">"</div>
          <p>{currentAffirmation}</p>
        </div>

        {/* Breathing Exercise */}
        <div className="section">
          <h2>🌿 Breathing Exercise</h2>
          <p>4-4-4 breathing helps calm your nervous system</p>
          
          <div className={`breath-circle ${breathingActive ? breathPhase : ''}`}>
            {breathingActive ? (
              <span className="breath-text">
                {breathPhase === 'inhale' && 'Breathe in...'}
                {breathPhase === 'hold' && 'Hold...'}
                {breathPhase === 'exhale' && 'Breathe out...'}
              </span>
            ) : (
              <span className="breath-text">Tap to start</span>
            )}
          </div>
          
          <button 
            className={`breath-btn ${breathingActive ? 'active' : ''}`}
            onClick={breathingActive ? stopBreathing : startBreathing}
          >
            {breathingActive ? 'Stop' : 'Start Breathing Exercise'}
          </button>
        </div>

        {/* Grounding */}
        <div className="section">
          <h2>🌳 5-4-3-2-1 Grounding</h2>
          <p>When you feel overwhelmed, name:</p>
          <ul className="grounding-list">
            <li><strong>5</strong> things you can see</li>
            <li><strong>4</strong> things you can touch</li>
            <li><strong>3</strong> things you can hear</li>
            <li><strong>2</strong> things you can smell</li>
            <li><strong>1</strong> thing you can taste</li>
          </ul>
        </div>

        {/* Crisis Resources */}
        <div className="section crisis">
          <h2>💜 Need More Support?</h2>
          <div className="resource-links">
            <a href="tel:1-800-799-7233" className="resource-btn">
              <span>📞</span>
              <div>
                <strong>National DV Hotline</strong>
                <span>1-800-799-7233</span>
              </div>
            </a>
            <a href="sms:22522&body=HELLO" className="resource-btn">
              <span>💬</span>
              <div>
                <strong>Crisis Text Line</strong>
                <span>Text HOME to 741741</span>
              </div>
            </a>
          </div>
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
        .affirmation-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          position: relative;
        }
        .quote-mark {
          font-size: 48px;
          color: #d1fae5;
          font-family: Georgia, serif;
          line-height: 1;
          margin-bottom: -10px;
        }
        .affirmation-card p {
          font-size: 18px;
          color: #1a3a2f;
          line-height: 1.5;
          margin: 0;
          font-style: italic;
        }
        .section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .section h2 {
          font-size: 18px;
          color: #1a3a2f;
          margin: 0 0 8px 0;
        }
        .section > p {
          color: #6b7280;
          margin: 0 0 16px 0;
          font-size: 14px;
        }
        .breath-circle {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px auto;
          transition: transform 4s ease-in-out;
        }
        .breath-circle.inhale {
          transform: scale(1.2);
        }
        .breath-circle.hold {
          transform: scale(1.2);
        }
        .breath-circle.exhale {
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
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .breath-btn.active {
          background: #dc2626;
        }
        .grounding-list {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }
        .grounding-list li {
          margin-bottom: 8px;
        }
        .grounding-list strong {
          color: #1a3a2f;
          font-size: 18px;
        }
        .section.crisis {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
        }
        .section.crisis h2 {
          color: #7c3aed;
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
          padding: 14px;
          background: white;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          border: 1px solid #e9d5ff;
        }
        .resource-btn span:first-child {
          font-size: 24px;
        }
        .resource-btn div {
          display: flex;
          flex-direction: column;
        }
        .resource-btn strong {
          color: #1a3a2f;
        }
        .resource-btn span:last-child {
          font-size: 13px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}