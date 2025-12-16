"use client";

import { useState } from "react";

interface SafetyResourcesProps {
  isOpen: boolean;
  onClose: () => void;
  triggered?: boolean; // true if auto-triggered by keywords
}

export default function SafetyResources({ isOpen, onClose, triggered }: SafetyResourcesProps) {
  if (!isOpen) return null;

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
          background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          padding: "24px",
          borderRadius: "20px 20px 0 0",
          color: "white",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🤍</div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>
            {triggered ? "We're Here For You" : "Safety Resources"}
          </h2>
          {triggered && (
            <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "14px" }}>
              It sounds like you might be going through something difficult.
            </p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {triggered && (
            <p style={{
              background: "#fef2f2",
              padding: "16px",
              borderRadius: "12px",
              color: "#991b1b",
              fontSize: "15px",
              marginBottom: "20px",
              lineHeight: 1.6
            }}>
              Your safety matters. If you're in immediate danger, please call 911. 
              Otherwise, these resources are available 24/7.
            </p>
          )}

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
            <a
              href="tel:911"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "#fef2f2",
                borderRadius: "12px",
                textDecoration: "none",
                color: "#991b1b",
                fontWeight: "600",
                fontSize: "18px"
              }}
            >
              <span style={{ fontSize: "24px" }}>🚨</span>
              Call 911
            </a>
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
              <a
                href="tel:1-800-799-7233"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#f0fdf4",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: "#166534"
                }}
              >
                <span style={{ fontSize: "24px" }}>💜</span>
                <div>
                  <div style={{ fontWeight: "600" }}>National Domestic Violence Hotline</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>1-800-799-7233 (SAFE)</div>
                </div>
              </a>

              <a
                href="sms:741741?body=HELLO"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#eff6ff",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: "#1e40af"
                }}
              >
                <span style={{ fontSize: "24px" }}>💬</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Crisis Text Line</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>Text HELLO to 741741</div>
                </div>
              </a>

              <a
                href="tel:988"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "#faf5ff",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: "#6b21a8"
                }}
              >
                <span style={{ fontSize: "24px" }}>🤍</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Suicide & Crisis Lifeline</div>
                  <div style={{ fontSize: "14px", opacity: 0.8 }}>Call or text 988</div>
                </div>
              </a>

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
            onClick={onClose}
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

// Helper function to detect crisis keywords
export function detectCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const crisisKeywords = [
    // Immediate danger
    "help me", "i need help", "please help",
    "in danger", "not safe", "unsafe", "i'm scared", "im scared", "i am scared",
    "he's going to", "she's going to", "going to hurt", "going to kill",
    "threatened to kill", "threatened me", "threatening",
    
    // Physical violence
    "hit me", "hits me", "hitting me", "beat me", "beating me", "beaten",
    "choked me", "choking me", "strangled", "strangling",
    "hurt me", "hurting me", "hurts me", "attacked me", "attacking",
    "punched", "kicked", "slapped", "pushed me",
    
    // Weapons
    "has a gun", "has a knife", "weapon", "threatened with",
    
    // Suicide/self-harm
    "kill myself", "want to die", "suicide", "suicidal",
    "self harm", "self-harm", "hurt myself", "cutting myself",
    "don't want to live", "end my life", "end it all",
    
    // Trapped/controlled
    "won't let me leave", "can't leave", "trapped", "locked in",
    "took my keys", "took my phone", "controlling",
    
    // Fear expressions
    "afraid for my life", "fear for my life", "terrified",
    "he scares me", "she scares me", "i'm terrified"
  ];

  return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
}
