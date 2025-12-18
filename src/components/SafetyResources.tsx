"use client";

import { useState } from "react";

interface SafetyResourcesProps {
  isOpen: boolean;
  onClose: () => void;
  triggered?: boolean; // true if auto-triggered by keywords
}

export default function SafetyResources({ isOpen, onClose, triggered }: SafetyResourcesProps) {
  const [showFullResources, setShowFullResources] = useState(!triggered);

  if (!isOpen) return null;

  // Gentle check-in first (only if auto-triggered)
  if (triggered && !showFullResources) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px"
      }}>
        <div style={{
          background: "white",
          borderRadius: "24px",
          maxWidth: "400px",
          width: "100%",
          padding: "32px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💚</div>
          <h2 style={{ 
            margin: "0 0 12px", 
            fontSize: "22px", 
            fontWeight: "700",
            color: "#1a3a2f"
          }}>
            Just checking in
          </h2>
          <p style={{ 
            color: "#666", 
            fontSize: "15px", 
            lineHeight: 1.6,
            marginBottom: "24px"
          }}>
            I noticed some words that made me want to make sure you're okay. Are you safe right now?
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "16px 24px",
                background: "#1a3a2f",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              I'm okay, continue
            </button>
            <button
              onClick={() => setShowFullResources(true)}
              style={{
                padding: "16px 24px",
                background: "#f0fdf4",
                color: "#166534",
                border: "2px solid #bbf7d0",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Show me support resources
            </button>
          </div>
          
          <p style={{
            marginTop: "20px",
            fontSize: "13px",
            color: "#999",
            fontStyle: "italic"
          }}>
            If you're in immediate danger, call 911.
          </p>
        </div>
      </div>
    );
  }

  // Full resources view
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "20px",
        maxWidth: "480px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        position: "relative"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)",
          padding: "24px",
          borderRadius: "20px 20px 0 0",
          color: "white",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>💚</div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>
            Safety Resources
          </h2>
          <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "14px" }}>
            You're not alone. Help is available 24/7.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Emergency */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#dc2626",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px"
            }}>
              Immediate Emergency
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "#fef2f2",
                borderRadius: "12px",
                color: "#991b1b",
                fontWeight: "600",
                fontSize: "18px"
              }}
            >
              <span style={{ fontSize: "24px" }}>🚨</span>
              <div>
                <div>Call 911</div>
                <div style={{ fontSize: "14px", fontWeight: "normal", opacity: 0.8 }}>
                  For immediate danger
                </div>
              </div>
            </div>
          </div>

          {/* Hotlines */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px"
            }}>
              24/7 Support Hotlines
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#f0fdf4",
                  borderRadius: "12px",
                  color: "#166534"
                }}
              >
                <span style={{ fontSize: "24px" }}>💜</span>
                <div>
                  <div style={{ fontWeight: "600" }}>National Domestic Violence Hotline</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>1-800-799-7233 (SAFE)</div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#eff6ff",
                  borderRadius: "12px",
                  color: "#1e40af"
                }}
              >
                <span style={{ fontSize: "24px" }}>💬</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Crisis Text Line</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>Text HELLO to 741741</div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#faf5ff",
                  borderRadius: "12px",
                  color: "#6b21a8"
                }}
              >
                <span style={{ fontSize: "24px" }}>🤍</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Suicide & Crisis Lifeline</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>Call or text 988</div>
                </div>
              </div>

              <a
                href="https://www.thehotline.org/get-help/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#fefce8",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: "#854d0e"
                }}
              >
                <span style={{ fontSize: "24px" }}>🌐</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Online Chat Support</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>thehotline.org - Anonymous chat</div>
                </div>
              </a>
            </div>
          </div>

          {/* Safety Planning */}
          <div style={{
            background: "#f8fafc",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "20px"
          }}>
            <div style={{ fontWeight: "600", marginBottom: "8px", color: "#334155" }}>
              📋 Safety Planning Tips
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: "20px",
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.8
            }}>
              <li>Keep important documents in a safe place</li>
              <li>Have a trusted friend or family member you can call</li>
              <li>Know your local shelter's number</li>
              <li>Trust your instincts about your safety</li>
            </ul>
          </div>

          {/* Reminder */}
          <p style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
            marginBottom: "20px",
            fontStyle: "italic"
          }}>
            You are not alone. What's happening is not your fault.
          </p>

          <button
            onClick={() => {
              setShowFullResources(false);
              onClose();
            }}
            style={{
              width: "100%",
              padding: "16px",
              background: "#1a3a2f",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to detect crisis keywords - TIGHTENED to avoid false positives
export function detectCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const crisisKeywords = [
    // Suicidal ideation - specific phrases
    "kill myself", "want to die", "end my life", "suicide", "suicidal",
    "don't want to live", "dont want to live", "can't go on", "cant go on",
    "end it all", "better off dead", "wish i was dead", "wish i were dead",
    
    // Self-harm
    "hurt myself", "hurting myself", "cutting myself", "harm myself",
    
    // Immediate threat to life
    "going to kill me", "he's going to kill", "she's going to kill",
    "threatened to kill me", "said he would kill", "said she would kill",
    "has a gun", "has a knife", "pointing a weapon",
    
    // Active violence happening now
    "being beaten", "choking me right now", "strangling me", 
    "attacking me right now", "he's hitting me", "she's hitting me",
    
    // Trapped/hostage
    "i'm trapped", "im trapped", "held hostage", "won't let me leave",
    "locked me in", "can't escape", "cant escape",
    
    // Explicit fear for life
    "afraid for my life", "fear for my life", "going to die"
  ];

  return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
}