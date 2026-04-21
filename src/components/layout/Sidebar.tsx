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
            background: linear-gradient(180deg, #1A5F5A 0%, #1F2937 100%);
            color: white;
            z-index: 999;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease;
          }
          @media (max-width: 768px) {
            .sidebar {
              transform: translateX(-100%);
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
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .logo {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-icon {
            width: 40px;
            height: 40px;
            background: #2dd4a8;
            color: #1A5F5A;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
          }
          .logo-text {
            display: flex;
            flex-direction: column;
          }
          .logo-title {
            font-weight: 700;
            font-size: 16px;
          }
          .logo-subtitle {
            font-size: 11px;
            opacity: 0.7;
          }
          .close-btn {
            display: none;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
          }
          @media (max-width: 768px) {
            .close-btn { display: block; }
          }

          .nav {
            flex: 1;
            overflow-y: auto;
            padding: 16px 8px;
          }
          .nav-section {
            margin-bottom: 4px;
          }
          .nav-parent,
          .nav-item {
            width: 100%;
            padding: 12px 16px;
            background: none;
            border: none;
            border-radius: 8px;
            color: rgba(255,255,255,0.7);
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
            transition: all 0.2s;
          }
          .nav-parent:hover,
          .nav-item:hover {
            background: rgba(255,255,255,0.1);
            color: white;
          }
          .nav-parent.active,
          .nav-item.active {
            background: rgba(45, 212, 168, 0.2);
            color: #2dd4a8;
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
            transition: transform 0.2s;
          }
          .nav-arrow.expanded {
            transform: rotate(90deg);
          }
          .nav-children {
            padding-left: 20px;
          }
          .nav-children .nav-item {
            padding: 10px 16px;
            font-size: 13px;
          }
          .nav-children .nav-icon {
            font-size: 14px;
          }

          .sidebar-footer {
            padding: 16px;
            border-top: 1px solid rgba(255,255,255,0.1);
          }
          .help-card {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 12px;
            font-size: 12px;
          }
          .help-card p {
            margin: 0 0 4px;
            opacity: 0.7;
          }
          .help-card a {
            color: #2dd4a8;
            text-decoration: none;
          }
        `}</style>
      </aside>
    </>
  );
}