"use client";

import { useState } from "react";

interface SafetyResourcesProps {
  isOpen: boolean;
  onClose: () => void;
  triggered?: boolean;
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
          borderRadius: "16px",
          maxWidth: "400px",
          width: "100%",
          padding: "32px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
        }}>
          <h2 style={{
            margin: "0 0 12px",
            fontSize: "20px",
            fontWeight: "600",
            color: "#1F2937"
          }}>
            Checking in
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
                padding: "14px 24px",
                background: "#1F2937",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              I'm okay, continue
            </button>
            <button
              onClick={() => setShowFullResources(true)}
              style={{
                padding: "14px 24px",
                background: "#f5f5f5",
                color: "#333",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              Show me support resources
            </button>
          </div>

          <p style={{
            marginTop: "20px",
            fontSize: "13px",
            color: "#999"
          }}>
            If you're in immediate danger, call 911.
          </p>
        </div>
      </div>
    );
  }

  // Full resources view - clean and professional
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        maxWidth: "440px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        position: "relative"
      }}>
        {/* Header - simple, not gradient */}
        <div style={{
          padding: "24px 24px 16px",
          borderBottom: "1px solid #eee"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: "18px", 
              fontWeight: "600",
              color: "#1F2937"
            }}>
              Support Resources
            </h2>
            <button
              onClick={() => {
                setShowFullResources(false);
                onClose();
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#999",
                cursor: "pointer",
                padding: "0",
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          
          {/* Emergency */}
          <a
            href="tel:911"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px",
              background: "#fef2f2",
              borderRadius: "10px",
              marginBottom: "20px",
              textDecoration: "none",
              color: "#b91c1c"
            }}
          >
            <div style={{
              width: "40px",
              height: "40px",
              background: "#fee2e2",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: "700"
            }}>
              911
            </div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "15px" }}>Emergency</div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>Immediate danger</div>
            </div>
          </a>

          {/* Hotlines */}
          <div style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "12px"
          }}>
            24/7 Hotlines
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            <a
              href="tel:1-800-799-7233"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                background: "#f9fafb",
                borderRadius: "10px",
                textDecoration: "none",
                color: "#333"
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                background: "#1F2937",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                📞
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>National DV Hotline</div>
                <div style={{ fontSize: "13px", color: "#666" }}>1-800-799-7233</div>
              </div>
            </a>

            <a
              href="sms:741741&body=HELLO"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                background: "#f9fafb",
                borderRadius: "10px",
                textDecoration: "none",
                color: "#333"
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                background: "#1F2937",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                💬
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>Crisis Text Line</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Text HELLO to 741741</div>
              </div>
            </a>

            <a
              href="tel:988"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                background: "#f9fafb",
                borderRadius: "10px",
                textDecoration: "none",
                color: "#333"
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                background: "#1F2937",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "14px",
                fontWeight: "700"
              }}>
                988
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>Suicide & Crisis Lifeline</div>
                <div style={{ fontSize: "13px", color: "#666" }}>Call or text 988</div>
              </div>
            </a>

            <a
              href="https://www.thehotline.org/get-help/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                background: "#f9fafb",
                borderRadius: "10px",
                textDecoration: "none",
                color: "#333"
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                background: "#1F2937",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                🌐
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>Online Chat</div>
                <div style={{ fontSize: "13px", color: "#666" }}>thehotline.org</div>
              </div>
            </a>
          </div>

          {/* Safety Planning - concise */}
          <div style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "10px"
          }}>
            Safety Planning
          </div>
          <div style={{
            background: "#f9fafb",
            padding: "14px 16px",
            borderRadius: "10px",
            marginBottom: "20px"
          }}>
            <ul style={{
              margin: 0,
              paddingLeft: "18px",
              color: "#555",
              fontSize: "13px",
              lineHeight: 1.8
            }}>
              <li>Keep important documents somewhere safe</li>
              <li>Have a trusted person you can call</li>
              <li>Know your local shelter's number</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setShowFullResources(false);
              onClose();
            }}
            style={{
              width: "100%",
              padding: "14px",
              background: "#1F2937",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
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

// Helper function to detect crisis keywords
export function detectCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const crisisKeywords = [
    "kill myself", "want to die", "end my life", "suicide", "suicidal",
    "don't want to live", "dont want to live", "can't go on", "cant go on",
    "end it all", "better off dead", "wish i was dead", "wish i were dead",
    "hurt myself", "hurting myself", "cutting myself", "harm myself",
    "going to kill me", "he's going to kill", "she's going to kill",
    "threatened to kill me", "said he would kill", "said she would kill",
    "has a gun", "has a knife", "pointing a weapon",
    "being beaten", "choking me right now", "strangling me",
    "attacking me right now", "he's hitting me", "she's hitting me",
    "i'm trapped", "im trapped", "held hostage", "won't let me leave",
    "locked me in", "can't escape", "cant escape",
    "afraid for my life", "fear for my life", "going to die"
  ];

  return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
}