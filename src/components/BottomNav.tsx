'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FeedbackForm from './FeedbackForm';

interface BottomNavProps {
  active: 'coach' | 'case' | 'healing' | 'docs' | 'menu';
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const navItems = [
    { id: 'coach',   label: 'Coach',   icon: '💬', path: '/coach' },
    { id: 'case',    label: 'My Case', icon: '📁', path: '/case-file' },
    { id: 'healing', label: 'Healing', icon: '🌿', path: '/healing' },
    { id: 'docs',    label: 'Docs',    icon: '📄', path: '/docs' },
    { id: 'menu',    label: 'Menu',    icon: '☰', path: null },
  ];

  const handleNav = (item: typeof navItems[0]) => {
    if (item.id === 'menu') {
      setShowMenu(true);
    } else if (item.path) {
      router.push(item.path);
    }
  };

  return (
    <>
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Menu</h3>
              <button className="close-btn" onClick={() => setShowMenu(false)}>✕</button>
            </div>
            
            {/* Case & Evidence */}
            <div className="menu-section">
              <button onClick={() => { setShowMenu(false); router.push('/case-setup'); }} className="menu-item">
                <span className="menu-icon">⚙️</span>
                <div className="menu-text">
                  <span className="menu-title">Case Settings</span>
                  <span className="menu-desc">Names, case number, court info</span>
                </div>
              </button>
              
              <button onClick={() => { setShowMenu(false); router.push('/case-file/upload'); }} className="menu-item">
                <span className="menu-icon">📤</span>
                <div className="menu-text">
                  <span className="menu-title">Add to Case File</span>
                  <span className="menu-desc">Upload screenshots, docs, evidence</span>
                </div>
              </button>

              <button onClick={() => { setShowMenu(false); router.push('/evidence/upload'); }} className="menu-item">
                <span className="menu-icon">📋</span>
                <div className="menu-text">
                  <span className="menu-title">Bulk Import</span>
                  <span className="menu-desc">Import message history (CSV)</span>
                </div>
              </button>
            </div>

            <div className="menu-divider" />

            {/* Support & Wellness */}
            <div className="menu-section">
              <button onClick={() => { setShowMenu(false); router.push('/getting-started'); }} className="menu-item">
                <span className="menu-icon">❓</span>
                <div className="menu-text">
                  <span className="menu-title">Getting Started</span>
                  <span className="menu-desc">How to use Pattern18</span>
                </div>
              </button>

              <button onClick={() => { setShowMenu(false); setShowFeedbackForm(true); }} className="menu-item">
                <span className="menu-icon">💡</span>
                <div className="menu-text">
                  <span className="menu-title">Send Feedback</span>
                  <span className="menu-desc">Tell Christy what&apos;s working or what isn&apos;t</span>
                </div>
              </button>
            </div>

            <div className="menu-divider" />

            {/* Account */}
            <div className="menu-section">
              <button onClick={async () => { 
                const { supabase } = await import('@/lib/supabase');
                await supabase.auth.signOut(); 
                router.push('/login'); 
              }} className="menu-item logout">
                <span className="menu-icon">🚪</span>
                <div className="menu-text">
                  <span className="menu-title">Log Out</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedbackForm
        open={showFeedbackForm}
        onClose={() => setShowFeedbackForm(false)}
      />

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 6px 0 max(6px, env(safe-area-inset-bottom));
          z-index: 100;
        }
        .nav-item {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 4px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          transition: color 0.2s;
        }
        .nav-item.active {
          color: #2F9D94;
        }
        .nav-icon {
          font-size: 22px;
          line-height: 1;
        }
        .nav-label {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        @media (min-width: 480px) {
          .nav-icon { font-size: 24px; }
          .nav-label { font-size: 11.5px; }
          .nav-item { padding: 8px 8px; gap: 4px; }
        }
        
        .menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 200;
          display: flex;
          align-items: flex-end;
        }
        .menu-sheet {
          width: 100%;
          max-height: 80vh;
          background: white;
          border-radius: 20px 20px 0 0;
          padding: 20px;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
          overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .menu-header h3 {
          margin: 0;
          font-size: 20px;
          color: #1F2937;
        }
        .close-btn {
          background: #f3f4f6;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 16px;
          cursor: pointer;
          color: #6b7280;
        }
        .menu-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 12px;
          background: none;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background 0.2s;
        }
        .menu-item:hover {
          background: #f3f4f6;
        }
        .menu-item.logout {
          color: #dc2626;
        }
        .menu-icon {
          font-size: 24px;
        }
        .menu-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .menu-title {
          font-weight: 600;
          color: #1F2937;
          font-size: 15px;
        }
        .menu-item.logout .menu-title {
          color: #dc2626;
        }
        .menu-desc {
          font-size: 13px;
          color: #9ca3af;
        }
        .menu-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 12px 0;
        }
      `}</style>
    </>
  );
}