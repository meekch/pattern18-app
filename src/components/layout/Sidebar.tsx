"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Capture",
    icon: "✏️",
    children: [
      { label: "Bulk Import", icon: "📤", path: "/evidence/upload" },
    ]
  },
  { 
    label: "Evidence", 
    icon: "📁",
    children: [
      { label: "All Incidents", icon: "📋", path: "/evidence" },
      { label: "By Pattern", icon: "🏷️", path: "/evidence/patterns" },
      { label: "Timeline", icon: "📅", path: "/evidence/timeline" },
    ]
  },
  { 
    label: "Documents", 
    icon: "📄",
    children: [
      { label: "Generate New", icon: "✨", path: "/documents/generate" },
      { label: "Their Filings", icon: "📥", path: "/documents/theirs" },
      { label: "My Filings", icon: "📤", path: "/documents/mine" },
    ]
  },
  { label: "AI Coach", icon: "💬", path: "/coach" },
  { label: "Case Setup", icon: "⚙️", path: "/case-setup" },
];

export default function Sidebar({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(["Capture", "Evidence", "Documents"]);

  const toggleSection = (label: string) => {
    setExpandedSections(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const isActive = (path: string) => pathname === path;
  const isParentActive = (children?: NavItem[]) => 
    children?.some(child => child.path && pathname.startsWith(child.path));

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">18</span>
            <div className="logo-text">
              <span className="logo-title">Pattern18</span>
              <span className="logo-subtitle">Strategic Partner</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Navigation */}
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <div key={item.label} className="nav-section">
              {item.children ? (
                <>
                  <button 
                    className={`nav-parent ${isParentActive(item.children) ? 'active' : ''}`}
                    onClick={() => toggleSection(item.label)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    <span className={`nav-arrow ${expandedSections.includes(item.label) ? 'expanded' : ''}`}>
                      ›
                    </span>
                  </button>
                  {expandedSections.includes(item.label) && (
                    <div className="nav-children">
                      {item.children.map((child) => (
                        <button
                          key={child.path}
                          className={`nav-item ${isActive(child.path!) ? 'active' : ''}`}
                          onClick={() => navigate(child.path!)}
                        >
                          <span className="nav-icon">{child.icon}</span>
                          <span className="nav-label">{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className={`nav-item top-level ${isActive(item.path!) ? 'active' : ''}`}
                  onClick={() => navigate(item.path!)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="help-card">
            <p>Need help?</p>
            <a href="/resources">View Resources →</a>
          </div>
        </div>

        <style jsx>{`
          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 998;
            display: none;
          }
          @media (max-width: 768px) {
            .sidebar-overlay { display: block; }
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 260px;
            background: var(--warm-white);
            border-right: 1px solid var(--teal-border);
            color: var(--charcoal);
            z-index: 999;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease;
            font-family: var(--sans);
          }
          @media (max-width: 768px) {
            .sidebar {
              transform: translateX(-100%);
              box-shadow: 0 0 40px rgba(31, 41, 55, 0.15);
            }
            .sidebar.open {
              transform: translateX(0);
            }
          }

          .sidebar-header {
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--teal-border);
          }
          .logo {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-icon {
            width: 40px;
            height: 40px;
            background: var(--teal);
            color: var(--warm-white);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--serif);
            font-weight: 800;
            font-size: 18px;
            flex-shrink: 0;
          }
          .logo-text {
            display: flex;
            flex-direction: column;
          }
          .logo-title {
            font-family: var(--serif);
            font-weight: 700;
            font-size: 17px;
            color: var(--charcoal);
          }
          .logo-subtitle {
            font-size: 11px;
            color: var(--charcoal-70);
          }
          .close-btn {
            display: none;
            background: none;
            border: none;
            color: var(--charcoal);
            font-size: 24px;
            cursor: pointer;
          }
          @media (max-width: 768px) {
            .close-btn { display: block; }
          }

          .nav {
            flex: 1;
            overflow-y: auto;
            padding: 16px 10px;
          }
          .nav-section {
            margin-bottom: 4px;
          }
          .nav-parent,
          .nav-item {
            width: 100%;
            padding: 11px 14px;
            background: none;
            border: none;
            border-radius: 8px;
            color: var(--charcoal);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .nav-parent:hover,
          .nav-item:hover {
            background: var(--teal-tint);
            color: var(--deep-teal);
          }
          .nav-parent.active,
          .nav-item.active {
            background: var(--teal-tint);
            color: var(--deep-teal);
            font-weight: 600;
          }
          .nav-item.top-level {
            font-weight: 500;
          }
          .nav-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
          }
          .nav-label {
            flex: 1;
          }
          .nav-arrow {
            font-size: 16px;
            color: var(--charcoal-50);
            transition: transform 0.2s;
          }
          .nav-arrow.expanded {
            transform: rotate(90deg);
            color: var(--teal);
          }
          .nav-children {
            padding-left: 20px;
          }
          .nav-children .nav-item {
            padding: 9px 14px;
            font-size: 13px;
            color: var(--charcoal-70);
          }
          .nav-children .nav-icon {
            font-size: 14px;
          }

          .sidebar-footer {
            padding: 16px;
            border-top: 1px solid var(--teal-border);
          }
          .help-card {
            background: var(--teal-tint);
            border-radius: 10px;
            padding: 14px;
            font-size: 12px;
          }
          .help-card p {
            margin: 0 0 4px;
            color: var(--charcoal-70);
            font-weight: 500;
          }
          .help-card a {
            color: var(--teal);
            text-decoration: none;
            font-weight: 600;
          }
          .help-card a:hover {
            color: var(--deep-teal);
            text-decoration: underline;
          }
        `}</style>
      </aside>
    </>
  );
}