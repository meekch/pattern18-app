"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

interface DashboardStats {
  totalIncidents: number;
  criticalCount: number;
  highCount: number;
  thisWeekCount: number;
  patternCount: number;
  topPatterns: { name: string; count: number }[];
  recentIncidents: any[];
  pendingDeadlines: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [caseSetup, setCaseSetup] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    criticalCount: 0,
    highCount: 0,
    thisWeekCount: 0,
    patternCount: 0,
    topPatterns: [],
    recentIncidents: [],
    pendingDeadlines: []
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Check case setup
      const { data: caseData } = await supabase
        .from("user_cases")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      
      setCaseSetup(!!caseData);

      // Load stats
      try {
        const res = await fetch(`/api/incidents?userId=${session.user.id}`);
        const data = await res.json();
        
        if (data.incidents) {
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          const thisWeekIncidents = data.incidents.filter((i: any) => {
            const date = new Date(i.incident_date || i.created_at);
            return date >= weekAgo;
          });

          // Top patterns
          const patternCounts: Record<string, number> = {};
          data.incidents.forEach((i: any) => {
            i.patterns?.forEach((p: string) => {
              patternCounts[p] = (patternCounts[p] || 0) + 1;
            });
          });
          const topPatterns = Object.entries(patternCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setStats({
            totalIncidents: data.total || data.incidents.length,
            criticalCount: data.incidents.filter((i: any) => i.severity === 'critical').length,
            highCount: data.incidents.filter((i: any) => i.severity === 'high').length,
            thisWeekCount: thisWeekIncidents.length,
            patternCount: Object.keys(patternCounts).length,
            topPatterns,
            recentIncidents: data.incidents.slice(0, 5),
            pendingDeadlines: []
          });
        }
      } catch (e) {
        console.error(e);
      }
      
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <AppLayout>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh'}}>
          Loading...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="dashboard">
        {/* Welcome / Onboarding Banner */}
        {!caseSetup && (
          <div className="onboarding-banner">
            <div className="onboarding-content">
              <h2>👋 Welcome to Pattern 18</h2>
              <p>Let's get your case set up so you can start documenting and building your evidence.</p>
              <div className="onboarding-steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <span>Set up case info</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span>Import message history</span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span>Upload court documents</span>
                </div>
              </div>
            </div>
            <button onClick={() => router.push("/case-setup")} className="start-btn">
              Get Started →
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>What do you need?</h2>
          <div className="action-cards">
            <button className="action-card red" onClick={() => router.push("/log")}>
              <span className="action-icon">🆘</span>
              <span className="action-label">Log Something Now</span>
              <span className="action-desc">Capture an incident quickly</span>
            </button>
            <button className="action-card green" onClick={() => router.push("/documents/generate")}>
              <span className="action-icon">📄</span>
              <span className="action-label">Build Document</span>
              <span className="action-desc">Motion, response, or exhibit</span>
            </button>
            <button className="action-card blue" onClick={() => router.push("/evidence")}>
              <span className="action-icon">📁</span>
              <span className="action-label">View Evidence</span>
              <span className="action-desc">{stats.totalIncidents} documented incidents</span>
            </button>
            <button className="action-card purple" onClick={() => router.push("/coach")}>
              <span className="action-icon">💬</span>
              <span className="action-label">Talk to Coach</span>
              <span className="action-desc">Get strategic guidance</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalIncidents}</div>
              <div className="stat-label">Total Incidents</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-value">{stats.criticalCount}</div>
              <div className="stat-label">Critical</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.thisWeekCount}</div>
              <div className="stat-label">This Week</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.patternCount}</div>
              <div className="stat-label">Patterns</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="two-col">
          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Incidents</h3>
              <button onClick={() => router.push("/evidence")}>View All →</button>
            </div>
            <div className="recent-list">
              {stats.recentIncidents.length === 0 ? (
                <p className="empty-text">No incidents logged yet</p>
              ) : (
                stats.recentIncidents.map((inc: any) => (
                  <div key={inc.id} className="recent-item">
                    <div className="recent-date">
                      {new Date(inc.incident_date || inc.created_at).toLocaleDateString()}
                    </div>
                    <div className="recent-title">{inc.title || 'Incident'}</div>
                    {inc.severity === 'critical' && (
                      <span className="badge critical">Critical</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Patterns */}
          <div className="card">
            <div className="card-header">
              <h3>Top Patterns</h3>
              <button onClick={() => router.push("/evidence/patterns")}>View All →</button>
            </div>
            <div className="patterns-list">
              {stats.topPatterns.length === 0 ? (
                <p className="empty-text">No patterns detected yet</p>
              ) : (
                stats.topPatterns.map((p, i) => (
                  <div key={p.name} className="pattern-row">
                    <span className="pattern-rank">#{i + 1}</span>
                    <span className="pattern-name">{p.name}</span>
                    <span className="pattern-count">{p.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {stats.pendingDeadlines.length > 0 && (
          <div className="card deadlines-card">
            <div className="card-header">
              <h3>⏰ Upcoming Deadlines</h3>
            </div>
            <div className="deadlines-list">
              {stats.pendingDeadlines.map((d: any) => (
                <div key={d.id} className="deadline-item">
                  <span className="deadline-date">{d.date}</span>
                  <span className="deadline-title">{d.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }

        .onboarding-banner {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          border-radius: 16px;
          padding: 32px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 24px;
        }
        .onboarding-content h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }
        .onboarding-content p {
          margin: 0 0 20px;
          opacity: 0.9;
          font-size: 14px;
        }
        .onboarding-steps {
          display: flex;
          gap: 24px;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .step-number {
          width: 24px;
          height: 24px;
          background: #2dd4a8;
          color: #1a3a2f;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        }
        .start-btn {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          padding: 14px 32px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          white-space: nowrap;
        }

        .quick-actions {
          margin-bottom: 32px;
        }
        .quick-actions h2 {
          margin: 0 0 16px;
          font-size: 18px;
          color: #333;
        }
        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .action-card {
          background: white;
          border: none;
          border-radius: 14px;
          padding: 24px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .action-card.red { border-left: 4px solid #e74c3c; }
        .action-card.green { border-left: 4px solid #2dd4a8; }
        .action-card.blue { border-left: 4px solid #3498db; }
        .action-card.purple { border-left: 4px solid #9b59b6; }
        .action-icon {
          font-size: 28px;
          display: block;
          margin-bottom: 12px;
        }
        .action-label {
          font-weight: 700;
          font-size: 15px;
          color: #1a3a2f;
          display: block;
          margin-bottom: 4px;
        }
        .action-desc {
          font-size: 13px;
          color: #666;
        }

        .stats-section {
          margin-bottom: 32px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .stat-card.critical .stat-value {
          color: #dc2626;
        }
        .stat-label {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }

        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (max-width: 768px) {
          .two-col {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 20px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .card-header h3 {
          margin: 0;
          font-size: 15px;
          color: #333;
        }
        .card-header button {
          background: none;
          border: none;
          color: #2dd4a8;
          font-size: 13px;
          cursor: pointer;
        }

        .empty-text {
          color: #999;
          font-size: 13px;
          text-align: center;
          padding: 20px;
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .recent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8f8f8;
          border-radius: 8px;
        }
        .recent-date {
          font-size: 12px;
          color: #999;
          min-width: 80px;
        }
        .recent-title {
          flex: 1;
          font-size: 13px;
          color: #333;
        }
        .badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .badge.critical {
          background: #fee;
          color: #c00;
        }

        .patterns-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pattern-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pattern-rank {
          font-size: 12px;
          color: #999;
          width: 24px;
        }
        .pattern-name {
          flex: 1;
          font-size: 13px;
        }
        .pattern-count {
          background: #1a3a2f;
          color: white;
          font-size: 11px;
          padding: 2px 10px;
          border-radius: 10px;
        }

        .deadlines-card {
          border-left: 4px solid #e74c3c;
        }
      `}</style>
    </AppLayout>
  );
}