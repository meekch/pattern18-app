"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get the hash fragment or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error
        const error = hashParams.get("error") || queryParams.get("error");
        if (error) {
          setStatus("Sign in error: " + error);
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Try to get session (handles the token exchange automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setStatus("Session error, redirecting...");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        if (session) {
          setStatus("Success! Redirecting...");
          router.push("/coach");
          return;
        }

        // If no session yet, listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            setStatus("Success! Redirecting...");
            router.push("/coach");
          }
        });

        // Also try exchanging code if present
        const code = queryParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Exchange error:", exchangeError);
          }
        }

        // Timeout fallback
        setTimeout(() => {
          setStatus("Taking too long, redirecting to login...");
          router.push("/login");
        }, 10000);

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("Error, redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)",
      color: "white",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>💚</div>
        <div style={{ fontSize: "18px" }}>{status}</div>
        <div style={{
          marginTop: "20px",
          width: "40px",
          height: "40px",
          border: "3px solid rgba(255,255,255,0.3)",
          borderTopColor: "white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "20px auto"
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}