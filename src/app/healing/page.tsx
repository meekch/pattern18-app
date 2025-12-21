'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface HealingPreferences {
  morningIntention: boolean;
  morningTime: string;
  eveningRelease: boolean;
  eveningTime: string;
  weeklyChallenge: boolean;
  gentleNudges: boolean;
  healingEducation: boolean;
}

const defaultPreferences: HealingPreferences = {
  morningIntention: false,
  morningTime: '07:00',
  eveningRelease: false,
  eveningTime: '21:00',
  weeklyChallenge: false,
  gentleNudges: true,
  healingEducation: true,
};

const healingEducation = {
  morningIntention: {
    title: "Why Morning Intentions Work",
    science: "Your brain is most receptive to new thought patterns in the first 20 minutes after waking. This is when your subconscious mind is still accessible, making it the perfect time to set intentions that override old trauma responses.",
    benefit: "By starting each day with intentional thoughts, you're literally rewiring neural pathways - replacing hypervigilance with grounded presence.",
    forKids: "When you start calm, your kids feel it. Children are emotional sponges. Your regulated nervous system teaches their nervous system how to be calm."
  },
  eveningRelease: {
    title: "Why Evening Release Matters",
    science: "Unprocessed stress gets stored in your body overnight and compounds. The amygdala (your brain's alarm system) stays activated, disrupting sleep and keeping you in fight-or-flight.",
    benefit: "A simple release practice tells your nervous system 'the day is done, we survived, we're safe.' This allows your body to enter true rest and repair mode.",
    forKids: "Better sleep means more patience tomorrow. The version of you that sleeps well is the parent your kids deserve to see."
  },
  weeklyChallenge: {
    title: "Why Consistent Practice Changes Everything",
    science: "Neuroplasticity - your brain's ability to rewire - requires repetition. It takes 21-66 days to form new neural pathways. Weekly challenges break this into manageable pieces.",
    benefit: "Each small win builds evidence that YOU are in control of your healing. Not them. Not the court. You.",
    forKids: "Your kids are watching you grow. They're learning that hard things can be overcome. This is the greatest gift."
  },
  gentleNudges: {
    title: "Why Gentle Accountability Helps",
    science: "Isolation is a trauma response AND a narcissist's tool. Your brain may have learned that reaching out is unsafe. Gentle nudges retrain your nervous system that connection is safe.",
    benefit: "Sometimes you need someone to check in. Not to judge. Just to remind you that you matter and your healing matters.",
    forKids: "You can't do this alone. Accepting support models healthy interdependence for your children."
  },
};

const weeklyThemes = [
  { 
    week: 1, 
    title: "Gray Rock Foundations", 
    focus: "Becoming boring to the narcissist",
    practices: ["Flat responses", "No emotional reactions", "Information diet"],
    why: "Narcissists feed on emotional reactions. Gray rock starves them while protecting your energy."
  },
  { 
    week: 2, 
    title: "Documenting Without Drowning", 
    focus: "Evidence building without re-traumatization",
    practices: ["Quick capture methods", "Emotional detachment from content", "Celebrating documentation wins"],
    why: "Your documentation is building freedom. Each entry is a step toward the life you deserve."
  },
  { 
    week: 3, 
    title: "Body-Based Healing", 
    focus: "Releasing trauma stored in the body",
    practices: ["Daily body scans", "Shake practices", "Somatic awareness"],
    why: "Trauma lives in the body, not just the mind. Your body has been holding so much. Let it release."
  },
  { 
    week: 4, 
    title: "Reclaiming Your Identity", 
    focus: "Remembering who you were before them",
    practices: ["Joy inventory", "Values reconnection", "Future visioning"],
    why: "They tried to erase you. But you're still here. And you're about to remember how powerful you are."
  },
];

export default function HealingSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<HealingPreferences>(defaultPreferences);
  const [showEducation, setShowEducation] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load preferences
      const { data } = await supabase
        .from('healing_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setPreferences({
          morningIntention: data.morning_intention || false,
          morningTime: data.morning_time || '07:00',
          eveningRelease: data.evening_release || false,
          eveningTime: data.evening_time || '21:00',
          weeklyChallenge: data.weekly_challenge || false,
          gentleNudges: data.gentle_nudges ?? true,
          healingEducation: data.healing_education ?? true,
        });
        setCurrentWeek(data.current_week || 1);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const savePreferences = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('healing_preferences')
      .upsert({
        user_id: user.id,
        morning_intention: preferences.morningIntention,
        morning_time: preferences.morningTime,
        evening_release: preferences.eveningRelease,
        evening_time: preferences.eveningTime,
        weekly_challenge: preferences.weeklyChallenge,
        gentle_nudges: preferences.gentleNudges,
        healing_education: preferences.healingEducation,
        current_week: currentWeek,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    setSaving(false);
    if (!error) {
      // Show success feedback
    }
  };

  const togglePreference = (key: keyof HealingPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="loading">
        <span>🌿</span>
        <p>Loading your healing journey...</p>
        <style jsx>{`
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .loading span { font-size: 48px; margin-bottom: 16px; }
          .loading p { color: #666; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>🌿 Your Healing Journey</h1>
        <div style={{ width: 60 }} />
      </header>

      <div className="content">
        <div className="intro">
          <p>
            <strong>Healing is not linear, but it is possible.</strong>
          </p>
          <p>
            These practices are designed by trauma-informed experts who specialize in 
            recovery from narcissistic abuse. Each one is backed by neuroscience and 
            proven to help rewire your brain from survival mode back to thriving.
          </p>
          <p className="highlight">
            Remember: Healing yourself is the greatest gift you can give your children. 
            They learn what's possible by watching you rise.
          </p>
        </div>

        {/* Morning Intention */}
        <div className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">🌅</div>
            <div className="setting-info">
              <h3>Morning Intention</h3>
              <p>Start each day grounded and intentional</p>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={preferences.morningIntention}
                onChange={() => togglePreference('morningIntention')}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {preferences.morningIntention && (
            <div className="setting-expanded">
              <div className="time-picker">
                <label>Remind me at:</label>
                <input 
                  type="time" 
                  value={preferences.morningTime}
                  onChange={(e) => setPreferences(prev => ({ ...prev, morningTime: e.target.value }))}
                />
              </div>
            </div>
          )}
          
          <button className="learn-more" onClick={() => setShowEducation(showEducation === 'morning' ? null : 'morning')}>
            {showEducation === 'morning' ? 'Hide' : 'Why this works'} →
          </button>
          
          {showEducation === 'morning' && (
            <div className="education">
              <h4>{healingEducation.morningIntention.title}</h4>
              <div className="edu-section">
                <span className="edu-label">The Science:</span>
                <p>{healingEducation.morningIntention.science}</p>
              </div>
              <div className="edu-section">
                <span className="edu-label">The Benefit:</span>
                <p>{healingEducation.morningIntention.benefit}</p>
              </div>
              <div className="edu-section kids">
                <span className="edu-label">For Your Kids:</span>
                <p>{healingEducation.morningIntention.forKids}</p>
              </div>
            </div>
          )}
        </div>

        {/* Evening Release */}
        <div className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">🌙</div>
            <div className="setting-info">
              <h3>Evening Release</h3>
              <p>Let go of the day and prepare for rest</p>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={preferences.eveningRelease}
                onChange={() => togglePreference('eveningRelease')}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {preferences.eveningRelease && (
            <div className="setting-expanded">
              <div className="time-picker">
                <label>Remind me at:</label>
                <input 
                  type="time" 
                  value={preferences.eveningTime}
                  onChange={(e) => setPreferences(prev => ({ ...prev, eveningTime: e.target.value }))}
                />
              </div>
            </div>
          )}
          
          <button className="learn-more" onClick={() => setShowEducation(showEducation === 'evening' ? null : 'evening')}>
            {showEducation === 'evening' ? 'Hide' : 'Why this works'} →
          </button>
          
          {showEducation === 'evening' && (
            <div className="education">
              <h4>{healingEducation.eveningRelease.title}</h4>
              <div className="edu-section">
                <span className="edu-label">The Science:</span>
                <p>{healingEducation.eveningRelease.science}</p>
              </div>
              <div className="edu-section">
                <span className="edu-label">The Benefit:</span>
                <p>{healingEducation.eveningRelease.benefit}</p>
              </div>
              <div className="edu-section kids">
                <span className="edu-label">For Your Kids:</span>
                <p>{healingEducation.eveningRelease.forKids}</p>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Challenge */}
        <div className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">📅</div>
            <div className="setting-info">
              <h3>Weekly Healing Challenge</h3>
              <p>4-week program to rewire your responses</p>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={preferences.weeklyChallenge}
                onChange={() => togglePreference('weeklyChallenge')}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {preferences.weeklyChallenge && (
            <div className="setting-expanded">
              <div className="week-selector">
                <label>Current week:</label>
                <div className="week-buttons">
                  {[1, 2, 3, 4].map(w => (
                    <button 
                      key={w}
                      className={`week-btn ${currentWeek === w ? 'active' : ''}`}
                      onClick={() => setCurrentWeek(w)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div className="current-theme">
                <h4>Week {currentWeek}: {weeklyThemes[currentWeek - 1].title}</h4>
                <p className="theme-focus">{weeklyThemes[currentWeek - 1].focus}</p>
                <div className="practices">
                  {weeklyThemes[currentWeek - 1].practices.map((p, i) => (
                    <span key={i} className="practice-tag">{p}</span>
                  ))}
                </div>
                <p className="theme-why">{weeklyThemes[currentWeek - 1].why}</p>
              </div>
            </div>
          )}
          
          <button className="learn-more" onClick={() => setShowEducation(showEducation === 'weekly' ? null : 'weekly')}>
            {showEducation === 'weekly' ? 'Hide' : 'Why this works'} →
          </button>
          
          {showEducation === 'weekly' && (
            <div className="education">
              <h4>{healingEducation.weeklyChallenge.title}</h4>
              <div className="edu-section">
                <span className="edu-label">The Science:</span>
                <p>{healingEducation.weeklyChallenge.science}</p>
              </div>
              <div className="edu-section">
                <span className="edu-label">The Benefit:</span>
                <p>{healingEducation.weeklyChallenge.benefit}</p>
              </div>
              <div className="edu-section kids">
                <span className="edu-label">For Your Kids:</span>
                <p>{healingEducation.weeklyChallenge.forKids}</p>
              </div>
            </div>
          )}
        </div>

        {/* Gentle Nudges */}
        <div className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">💚</div>
            <div className="setting-info">
              <h3>Gentle Nudges</h3>
              <p>Check-ins when we haven't seen you</p>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={preferences.gentleNudges}
                onChange={() => togglePreference('gentleNudges')}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <button className="learn-more" onClick={() => setShowEducation(showEducation === 'nudges' ? null : 'nudges')}>
            {showEducation === 'nudges' ? 'Hide' : 'Why this works'} →
          </button>
          
          {showEducation === 'nudges' && (
            <div className="education">
              <h4>{healingEducation.gentleNudges.title}</h4>
              <div className="edu-section">
                <span className="edu-label">The Science:</span>
                <p>{healingEducation.gentleNudges.science}</p>
              </div>
              <div className="edu-section">
                <span className="edu-label">The Benefit:</span>
                <p>{healingEducation.gentleNudges.benefit}</p>
              </div>
              <div className="edu-section kids">
                <span className="edu-label">For Your Kids:</span>
                <p>{healingEducation.gentleNudges.forKids}</p>
              </div>
            </div>
          )}
        </div>

        <button className="save-btn" onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : '💚 Save My Healing Preferences'}
        </button>

        <div className="footer-message">
          <p>
            "The wound is the place where the light enters you." - Rumi
          </p>
          <p>
            You are not broken. You are breaking through.
          </p>
        </div>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
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
          font-size: 15px;
          cursor: pointer;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .intro {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          line-height: 1.7;
        }
        .intro p {
          margin-bottom: 12px;
          color: #444;
        }
        .intro .highlight {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          padding: 16px;
          border-radius: 12px;
          color: #065f46;
          font-weight: 500;
          margin-bottom: 0;
        }
        .setting-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .setting-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .setting-icon {
          font-size: 32px;
        }
        .setting-info {
          flex: 1;
        }
        .setting-info h3 {
          font-size: 16px;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .setting-info p {
          font-size: 13px;
          color: #666;
        }
        
        /* Toggle switch */
        .toggle {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 28px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .toggle input:checked + .slider {
          background-color: #14b8a6;
        }
        .toggle input:checked + .slider:before {
          transform: translateX(24px);
        }

        .setting-expanded {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }
        .time-picker {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .time-picker label {
          font-size: 14px;
          color: #666;
        }
        .time-picker input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
        }
        .week-selector {
          margin-bottom: 16px;
        }
        .week-selector label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        .week-buttons {
          display: flex;
          gap: 8px;
        }
        .week-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #ddd;
          background: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .week-btn.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }
        .current-theme {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
        }
        .current-theme h4 {
          color: #1a3a2f;
          margin-bottom: 6px;
        }
        .theme-focus {
          color: #666;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .practices {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .practice-tag {
          background: #d1fae5;
          color: #065f46;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
        }
        .theme-why {
          color: #555;
          font-style: italic;
          font-size: 14px;
          line-height: 1.5;
        }
        .learn-more {
          background: none;
          border: none;
          color: #14b8a6;
          font-size: 13px;
          cursor: pointer;
          margin-top: 12px;
          padding: 0;
        }
        .education {
          margin-top: 16px;
          padding: 16px;
          background: #f0fdf4;
          border-radius: 12px;
        }
        .education h4 {
          color: #1a3a2f;
          margin-bottom: 14px;
          font-size: 15px;
        }
        .edu-section {
          margin-bottom: 14px;
        }
        .edu-section:last-child {
          margin-bottom: 0;
        }
        .edu-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #14b8a6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .edu-section p {
          font-size: 14px;
          color: #444;
          line-height: 1.6;
        }
        .edu-section.kids {
          background: #fef9c3;
          padding: 12px;
          border-radius: 8px;
        }
        .edu-section.kids .edu-label {
          color: #a16207;
        }
        .edu-section.kids p {
          color: #854d0e;
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
          margin: 24px 0;
        }
        .save-btn:disabled {
          opacity: 0.7;
        }
        .footer-message {
          text-align: center;
          padding: 20px;
        }
        .footer-message p {
          color: #666;
          font-style: italic;
          line-height: 1.6;
          margin-bottom: 8px;
        }
        .footer-message p:last-child {
          color: #14b8a6;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}