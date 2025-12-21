'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalIncidents: number;
  totalEvidence: number;
  patternsDetected: { [key: string]: number };
  recentActivity: { date: string; type: string; description: string }[];
  daysUntilCourt: number | null;
  courtDate: string | null;
  morningStreak: number;
  eveningStreak: number;
  daysOnPlatform: number;
}

const motivationalQuotes = [
  { quote: "You're not documenting drama. You're building freedom.", author: "Pattern 18" },
  { quote: "Every calm response is evidence of your strength.", author: "Pattern 18" },
  { quote: "The truth doesn't need to be loud. It just needs to be documented.", author: "Pattern 18" },
  { quote: "You're not crazy. You're not dramatic. You're paying attention.", author: "Pattern 18" },
  { quote: "Healing yourself is the greatest gift you can give your children.", author: "Pattern 18" },
  { quote: "Their chaos is not your emergency.", author: "Pattern 18" },
  { quote: "You survived 100% of your worst days. You'll survive this too.", author: "Pattern 18" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    totalEvidence: 0,
    patternsDetected: {},
    recentActivity: [],
    daysUntilCourt: null,
    courtDate: null,
    morningStreak: 0,
    eveningStreak: 0,
    daysOnPlatform: 0,
  });
  const [quote, setQuote] = useState(motivationalQuotes[0]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      // Set random quote
      setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
      
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]);
      }
      
      const daysOnPlatform = profile?.created_at 
        ? Math.ceil((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 1;
      
      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      let daysUntilCourt = null;
      let courtDate = null;
      if (caseData?.nextCourtDate) {
        const days = Math.ceil((new Date(caseData.nextCourtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days > 0) {
          daysUntilCourt = days;
          courtDate = caseData.nextCourtDate;
        }
      }
      
      // Load incidents count and patterns
      const { data: incidents } = await supabase
        .from('incidents')
        .select('patterns, created_at')
        .eq('user_id', session.user.id);
      
      const patternsDetected: { [key: string]: number } = {};
      incidents?.forEach(inc => {
        if (inc.patterns && Array.isArray(inc.patterns)) {
          inc.patterns.forEach((p: string) => {
            patternsDetected[p] = (patternsDetected[p] || 0) + 1;
          });
        }
      });
      
      // Load evidence count
      const { count: evidenceCount } = await supabase
        .from('evidence')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      // Load healing preferences for streaks
      const { data: healingPrefs } = await supabase
        .from('healing_preferences')
        .select('morning_streak, evening_streak')
        .eq('user_id', session.user.id)
        .single();
      
      // Build recent activity
      const recentActivity: { date: string; type: string; description: string }[] = [];
      
      // Add recent incidents
      const recentIncidents = incidents
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      
      recentIncidents?.forEach(inc => {
        recentActivity.push({
          date: inc.created_at,
          type: 'incident',
          description: `Documented ${inc.patterns?.[0] || 'incident'}`,
        });
      });
      
      setStats({
        totalIncidents: incidents?.length || 0,
        totalEvidence: (evidenceCount || 0) + (incidents?.length || 0),
        patternsDetected,
        recentActivity: recentActivity.slice(0, 5),
        daysUntilCourt,
        courtDate,
        morningStreak: healingPrefs?.morning_streak || 0,
        eveningStreak: healingPrefs?.evening_streak || 0,
        daysOnPlatform,
      });
      
      setLoading(false);
    };
    
    init();
  }, [router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTopPatterns = () => {
    return Object.entries(stats.patternsDetected)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-logo">18</div>
        <p>Loading your progress...</p>
        <style jsx>{`
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #1a3a2f 0%, #2d5a47 100%);
          }
          .loading-logo {
            font-size: 64px;
            font-weight: 700;
            color: white;
            background: rgba(255,255,255,0.15);
            padding: 20px 32px;
            border-radius: 16px;
            margin-bottom: 20px;
          }
          .loading p { color: rgba(255,255,255,0.7); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="logo">18</span>
          <span className="brand-name">Pattern 18</span>
        </div>
        <button onClick={() => router.push('/coach')} className="coach-btn">
          💬 Coach
        </button>
      </header>

      <div className="content">
        {/* Greeting Section */}
        <section className="greeting-section">
          <h1>{getGreeting()}{userName ? `, ${userName}` : ''} 💚</h1>
          <p className="greeting-sub">Day {stats.daysOnPlatform} of building your case</p>
        </section>

        {/* Court Countdown */}
        {stats.daysUntilCourt && (
          <section className="court-countdown" onClick={() => router.push('/case-setup')}>
            <div className="countdown-content">
              <span className="countdown-number">{stats.daysUntilCourt}</span>
              <div className="countdown-text">
                <span className="countdown-label">days until court</span>
                <span className="countdown-date">
                  {new Date(stats.courtDate!).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
            <span className="countdown-arrow">→</span>
          </section>
        )}

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card primary" onClick={() => router.push('/evidence')}>
            <span className="stat-icon">📁</span>
            <span className="stat-number">{stats.totalEvidence}</span>
            <span className="stat-label">Documented</span>
          </div>
          <div className="stat-card" onClick={() => router.push('/evidence')}>
            <span className="stat-icon">🎯</span>
            <span className="stat-number">{Object.keys(stats.patternsDetected).length}</span>
            <span className="stat-label">Pattern Types</span>
          </div>
          <div className="stat-card" onClick={() => router.push('/healing')}>
            <span className="stat-icon">🌅</span>
            <span className="stat-number">{stats.morningStreak}</span>
            <span className="stat-label">Morning Streak</span>
          </div>
          <div className="stat-card" onClick={() => router.push('/healing')}>
            <span className="stat-icon">🌙</span>
            <span className="stat-number">{stats.eveningStreak}</span>
            <span className="stat-label">Evening Streak</span>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card" onClick={() => router.push('/coach')}>
              <span className="action-icon">💬</span>
              <span className="action-label">Talk to Coach</span>
            </button>
            <button className="action-card" onClick={() => router.push('/message-parser')}>
              <span className="action-icon">📱</span>
              <span className="action-label">Analyze Messages</span>
            </button>
            <button className="action-card" onClick={() => router.push('/evidence')}>
              <span className="action-icon">📁</span>
              <span className="action-label">View Docs</span>
            </button>
            <button className="action-card court" onClick={() => router.push('/court-docs')}>
              <span className="action-icon">⚖️</span>
              <span className="action-label">Court Prep</span>
            </button>
          </div>
        </section>

        {/* Pattern Breakdown */}
        {getTopPatterns().length > 0 && (
          <section className="patterns-section">
            <h2>Patterns You've Documented</h2>
            <p className="section-sub">This is your evidence of their behavior over time</p>
            <div className="patterns-list">
              {getTopPatterns().map(([pattern, count]) => (
                <div key={pattern} className="pattern-row">
                  <span className="pattern-name">{pattern}</span>
                  <div className="pattern-bar-container">
                    <div 
                      className="pattern-bar-fill"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(stats.patternsDetected))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="pattern-count">{count}</span>
                </div>
              ))}
            </div>
            <p className="patterns-insight">
              💡 Courts look for patterns, not isolated incidents. You're building exactly what they need to see.
            </p>
          </section>
        )}

        {/* Recent Activity */}
        {stats.recentActivity.length > 0 && (
          <section className="activity-section">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              {stats.recentActivity.map((activity, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-dot" />
                  <div className="activity-content">
                    <span className="activity-desc">{activity.description}</span>
                    <span className="activity-date">{formatDate(activity.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Motivational Quote */}
        <section className="quote-section">
          <blockquote>"{quote.quote}"</blockquote>
          <cite>— {quote.author}</cite>
        </section>

        {/* Bottom CTA */}
        <section className="bottom-cta">
          <button className="cta-primary" onClick={() => router.push('/coach')}>
            💬 What's happening right now?
          </button>
          <p className="cta-sub">Your coach is ready 24/7</p>
        </section>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className="nav-item active">
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/coach')}>
          <span>💬</span>
          <span>Coach</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/evidence')}>
          <span>📁</span>
          <span>Docs</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/healing')}>
          <span>🌿</span>
          <span>Heal</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/case-setup')}>
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </nav>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
          padding-bottom: 80px;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          background: rgba(255,255,255,0.15);
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
        }
        .brand-name {
          font-weight: 600;
        }
        .coach-btn {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 14px;
          cursor: pointer;
        }

        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Greeting */
        .greeting-section {
          margin-bottom: 20px;
        }
        .greeting-section h1 {
          font-size: 28px;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .greeting-sub {
          color: #666;
          font-size: 15px;
        }

        /* Court Countdown */
        .court-countdown {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .court-countdown:hover {
          transform: scale(1.01);
        }
        .countdown-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .countdown-number {
          font-size: 48px;
          font-weight: 700;
          color: #92400e;
        }
        .countdown-text {
          display: flex;
          flex-direction: column;
        }
        .countdown-label {
          font-weight: 600;
          color: #92400e;
          font-size: 16px;
        }
        .countdown-date {
          color: #a16207;
          font-size: 14px;
        }
        .countdown-arrow {
          color: #92400e;
          font-size: 24px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .stat-card:hover {
          transform: scale(1.02);
        }
        .stat-card.primary {
          background: #1a3a2f;
          color: white;
        }
        .stat-icon {
          font-size: 24px;
          display: block;
          margin-bottom: 8px;
        }
        .stat-number {
          font-size: 32px;
          font-weight: 700;
          display: block;
        }
        .stat-label {
          font-size: 13px;
          opacity: 0.8;
        }

        /* Quick Actions */
        .quick-actions {
          margin-bottom: 24px;
        }
        .quick-actions h2 {
          font-size: 18px;
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .action-card {
          background: white;
          border: none;
          border-radius: 12px;
          padding: 16px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-card:hover {
          background: #f0fdf4;
          transform: translateY(-2px);
        }
        .action-card.court {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        }
        .action-card.court:hover {
          background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
        }
        .action-icon {
          font-size: 24px;
          display: block;
          margin-bottom: 6px;
        }
        .action-label {
          font-size: 11px;
          color: #444;
          font-weight: 500;
        }

        /* Patterns Section */
        .patterns-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .patterns-section h2 {
          font-size: 18px;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .section-sub {
          color: #666;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .patterns-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pattern-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pattern-name {
          width: 120px;
          font-size: 13px;
          color: #444;
          flex-shrink: 0;
        }
        .pattern-bar-container {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        .pattern-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #14b8a6, #0d9488);
          border-radius: 4px;
          transition: width 0.5s;
        }
        .pattern-count {
          width: 28px;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
          color: #1a3a2f;
        }
        .patterns-insight {
          margin-top: 16px;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 8px;
          font-size: 13px;
          color: #065f46;
          line-height: 1.5;
        }

        /* Activity Section */
        .activity-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .activity-section h2 {
          font-size: 18px;
          color: #1a3a2f;
          margin-bottom: 16px;
        }
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .activity-dot {
          width: 8px;
          height: 8px;
          background: #14b8a6;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .activity-content {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .activity-desc {
          font-size: 14px;
          color: #444;
        }
        .activity-date {
          font-size: 12px;
          color: #999;
        }

        /* Quote Section */
        .quote-section {
          background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        .quote-section blockquote {
          font-size: 18px;
          color: #065f46;
          font-style: italic;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .quote-section cite {
          font-size: 14px;
          color: #14b8a6;
          font-style: normal;
        }

        /* Bottom CTA */
        .bottom-cta {
          text-align: center;
          padding: 20px 0;
        }
        .cta-primary {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .cta-primary:hover {
          transform: scale(1.02);
        }
        .cta-sub {
          color: #666;
          font-size: 14px;
          margin-top: 12px;
        }

        /* Bottom Nav */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          display: flex;
          justify-content: space-around;
          padding: 10px 0 20px;
          border-top: 1px solid #eee;
        }
        .nav-item {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #666;
          font-size: 11px;
          cursor: pointer;
          padding: 8px 16px;
        }
        .nav-item span:first-child {
          font-size: 20px;
        }
        .nav-item.active {
          color: #1a3a2f;
        }

        @media (max-width: 480px) {
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .countdown-number {
            font-size: 36px;
          }
          .pattern-name {
            width: 90px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}