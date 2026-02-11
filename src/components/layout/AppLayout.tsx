"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface UserStats {
  totalIncidents: number;
  criticalCount: number;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({ totalIncidents: 0, criticalCount: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      loadStats(session.user.id);
    };
    checkAuth();
  }, [router]);

  const loadStats = async (userId: string) => {
    try {
      const res = await fetch(`/api/incidents?userId=${userId}`);
      const data = await res.json();
      if (data.incidents) {
        setStats({
          totalIncidents: data.total || data.incidents.length,
          criticalCount: data.incidents.filter((i: any) => i.severity === 'critical').length,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="main-wrapper">
        {/* Top Bar */}
        <header className="top-bar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          
          <div className="top-bar-stats">
            <div className="stat-pill">
              <span className="stat-number">{stats.totalIncidents}</span>
              <span className="stat-label">Evidence</span>
            </div>
            {stats.criticalCount > 0 && (
              <div className="stat-pill critical">
                <span className="stat-number">{stats.criticalCount}</span>
                <span className="stat-label">Critical</span>
              </div>
            )}
          </div>

          <div className="top-bar-actions">
            <button className="user-btn">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>
      </div>

      <style jsx>{`
        .app-layout {
          min-height: 100vh;
          background: #f8faf9;
        }

        .main-wrapper {
          margin-left: 260px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 768px) {
          .main-wrapper {
            margin-left: 0;
          }
        }

        .top-bar {
          background: white;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #333;
        }
        @media (max-width: 768px) {
          .menu-btn { display: block; }
        }

        .top-bar-stats {
          display: flex;
          gap: 12px;
        }
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f0f9f6;
          padding: 6px 14px;
          border-radius: 20px;
        }
        .stat-pill.critical {
          background: #fee2e2;
        }
        .stat-number {
          font-weight: 700;
          color: #1a3a2f;
        }
        .stat-pill.critical .stat-number {
          color: #dc2626;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
        }

        .top-bar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #1a3a2f;
          color: white;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        .main-content {
          flex: 1;
          padding: 24px;
        }
        @media (max-width: 768px) {
          .main-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}