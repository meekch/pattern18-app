"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

interface PatternGroup {
  pattern: string;
  count: number;
  incidents: any[];
  severity: { critical: number; high: number; medium: number };
}

export default function PatternsByPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patternGroups, setPatternGroups] = useState<PatternGroup[]>([]);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch(`/api/incidents?userId=${session.user.id}`);
        const data = await res.json();
        
        if (data.incidents) {
          // Group by pattern
          const groups: Record<string, PatternGroup> = {};
          
          data.incidents.forEach((inc: any) => {
            inc.patterns?.forEach((pattern: string) => {
              if (!groups[pattern]) {
                groups[pattern] = {
                  pattern,
                  count: 0,
                  incidents: [],
                  severity: { critical: 0, high: 0, medium: 0 }
                };
              }
              groups[pattern].count++;
              groups[pattern].incidents.push(inc);
              if (inc.severity === 'critical') groups[pattern].severity.critical++;
              else if (inc.severity === 'high') groups[pattern].severity.high++;
              else groups[pattern].severity.medium++;
            });
          });
          
          // Sort by count descending
          const sorted = Object.values(groups).sort((a, b) => b.count - a.count);
          setPatternGroups(sorted);
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
      <div className="patterns-page">
        <div className="page-header">
          <h1>🏷️ Evidence by Pattern</h1>
          <p>{patternGroups.length} patterns documented</p>
        </div>

        <div className="patterns-list">
          {patternGroups.map((group) => (
            <div key={group.pattern} className="pattern-card">
              <button 
                className="pattern-header"
                onClick={() => setExpandedPattern(
                  expandedPattern === group.pattern ? null : group.pattern
                )}
              >
                <div className="pattern-info">
                  <span className="pattern-name">{group.pattern}</span>
                  <div className="pattern-meta">
                    <span className="count">{group.count} incidents</span>
                    {group.severity.critical > 0 && (
                      <span className="severity critical">{group.severity.critical} critical</span>
                    )}
                    {group.severity.high > 0 && (
                      <span className="severity high">{group.severity.high} high</span>
                    )}
                  </div>
                </div>
                <span className="expand-icon">
                  {expandedPattern === group.pattern ? '▼' : '▶'}
                </span>
              </button>
              
              {expandedPattern === group.pattern && (
                <div className="pattern-incidents">
                  {group.incidents.map((inc) => (
                    <div key={inc.id} className="incident-row">
                      <span className="incident-date">
                        {new Date(inc.incident_date || inc.created_at).toLocaleDateString()}
                      </span>
                      <span className="incident-title">{inc.title || 'Incident'}</span>
                      {inc.severity === 'critical' && <span className="badge critical">Critical</span>}
                      {inc.severity === 'high' && <span className="badge high">High</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .patterns-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 24px;
        }
        .page-header h1 {
          margin: 0 0 4px;
          font-size: 28px;
          color: #1a3a2f;
        }
        .page-header p {
          margin: 0;
          color: #666;
        }

        .patterns-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pattern-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }

        .pattern-header {
          width: 100%;
          padding: 20px;
          background: none;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: left;
        }
        .pattern-header:hover {
          background: #f8f8f8;
        }

        .pattern-name {
          font-size: 16px;
          font-weight: 600;
          color: #1a3a2f;
          display: block;
          margin-bottom: 4px;
        }
        .pattern-meta {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .count {
          font-size: 13px;
          color: #666;
        }
        .severity {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .severity.critical {
          background: #fee;
          color: #c00;
        }
        .severity.high {
          background: #fff3e0;
          color: #e65100;
        }

        .expand-icon {
          color: #999;
          font-size: 12px;
        }

        .pattern-incidents {
          border-top: 1px solid #eee;
          padding: 12px 20px;
          background: #f8f9fa;
        }
        .incident-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
        .incident-row:last-child {
          border-bottom: none;
        }
        .incident-date {
          font-size: 12px;
          color: #999;
          min-width: 90px;
        }
        .incident-title {
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
        .badge.high {
          background: #fff3e0;
          color: #e65100;
        }
      `}</style>
    </AppLayout>
  );
}