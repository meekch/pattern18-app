'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BottomNavProps {
  active: 'coach' | 'case' | 'docs' | 'menu';
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const navItems = [
    { id: 'coach', label: 'Coach', icon: '💬', path: '/coach' },
    { id: 'case', label: 'My Case', icon: '📊', path: '/my-case' },
    { id: 'docs', label: 'Docs', icon: '📄', path: '/docs' },
    { id: 'menu', label: 'Menu', icon: '☰', path: null },
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

      {/* Slide-up Menu */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Menu</h3>
              <button className="close-btn" onClick={() => setShowMenu(false)}>✕</button>
            </div>
            
            {/* Quick Actions */}
            <div className="menu-section">
              <button onClick={() => { setShowMenu(false); router.push('/court-prep'); }} className="menu-item featured">
                <span className="menu-icon">⚖️</span>
                <div className="menu-text">
                  <span className="menu-title">Court Prep</span>
                  <span className="menu-desc">Prepare for your hearing</span>
                </div>
              </button>
              
              <button onClick={() => { setShowMenu(false); router.push('/healing'); }} className="menu-item featured">
                <span className="menu-icon">🌿</span>
                <div className="menu-text">
                  <span className="menu-title">Healing Space</span>
                  <span className="menu-desc">Breathing, grounding, support</span>
                </div>
              </button>
            </div>

            <div className="menu-divider" />

            {/* Settings & Tools */}
            <div className="menu-section">
              <button onClick={() => { setShowMenu(false); router.push('/case-setup'); }} className="menu-item">
                <span className="menu-icon">⚙️</span>
                <div className="menu-text">
                  <span className="menu-title">Case Settings</span>
                  <span className="menu-desc">Names, court date, case info</span>
                </div>
              </button>
              
              <button onClick={() => { setShowMenu(false); router.push('/evidence/upload'); }} className="menu-item">
                <span className="menu-icon">📤</span>
                <div className="menu-text">
                  <span className="menu-title">Bulk Import</span>
                  <span className="menu-desc">Import message history (CSV)</span>
                </div>
              </button>

              <button onClick={() => { setShowMenu(false); router.push('/faq'); }} className="menu-item">
                <span className="menu-icon">❓</span>
                <div className="menu-text">
                  <span className="menu-title">Help & FAQ</span>
                  <span className="menu-desc">Common questions answered</span>
                </div>
              </button>
            </div>

            <div className="menu-divider" />

            {/* Crisis Resources */}
            <div className="menu-section">
              <div className="safety-item">
                <div className="safety-header">
                  <span className="menu-icon">🆘</span>
                  <span className="safety-title">Crisis Resources</span>
                </div>
                <p className="safety-note">If you're in immediate danger, call 911</p>
                <div className="safety-links">
                  <a href="tel:1-800-799-7233">📞 DV Hotline: 1-800-799-7233</a>
                  <a href="sms:741741&body=HELLO">💬 Crisis Text: HELLO to 741741</a>
                </div>
              </div>
            </div>

            <div className="menu-divider" />

            {/* Account */}
            <div className="menu-section">
              <button onClick={() => { setShowMenu(false); router.push('/pricing'); }} className="menu-item">
                <span className="menu-icon">💳</span>
                <div className="menu-text">
                  <span className="menu-title">Subscription</span>
                  <span className="menu-desc">Manage your plan</span>
                </div>
              </button>
              
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
          padding: 8px 0 max(8px, env(safe-area-inset-bottom));
          z-index: 100;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          transition: color 0.2s;
        }
        .nav-item.active {
          color: #1a3a2f;
        }
        .nav-icon {
          font-size: 24px;
        }
        .nav-label {
          font-size: 11px;
          font-weight: 600;
        }
        
        /* Menu Overlay */
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
          max-height: 85vh;
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
          color: #1a3a2f;
        }
        .close-btn {
          background: #f3f4f6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 16px;
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
        .menu-item.featured {
          background: #f0fdf4;
          border: 1px solid #a7f3d0;
        }
        .menu-item.featured:hover {
          background: #dcfce7;
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
          color: #1a3a2f;
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
        
        /* Safety Resources */
        .safety-item {
          padding: 14px 12px;
          background: #fef2f2;
          border-radius: 12px;
          border: 1px solid #fecaca;
        }
        .safety-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .safety-title {
          font-weight: 600;
          color: #dc2626;
          font-size: 15px;
        }
        .safety-note {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #991b1b;
        }
        .safety-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .safety-links a {
          color: #1a3a2f;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .safety-links a:hover {
          background: #f9fafb;
        }
      `}</style>
    </>
  );
}