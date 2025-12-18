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
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check where to redirect after auth
        const next = queryParams.get("next") || "/coach";
        
        // Check for error
        const error = hashParams.get("error") || queryParams.get("error");
        if (error) {
          setStatus("Sign in error: " + error);
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Check for recovery type (password reset)
        const type = hashParams.get("type") || queryParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // Handle password recovery
        if (type === "recovery" && accessToken) {
          setStatus("Verifying reset link...");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          
          if (sessionError) {
            setStatus("Invalid reset link");
            setTimeout(() => router.push("/login"), 2000);
            return;
          }
          
          setStatus("Redirecting to reset password...");
          router.push("/auth/reset-password");
          return;
        }

        // Try to get existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setStatus("Session error, redirecting...");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        if (session) {
          setStatus("Success! Redirecting...");
          router.push(next);
          return;
        }

        // Listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") {
            setStatus("Redirecting to reset password...");
            router.push("/auth/reset-password");
          } else if (event === "SIGNED_IN" && session) {
            setStatus("Success! Redirecting...");
            router.push(next);
          }
        });

        // Try exchanging code if present
        const code = queryParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Exchange error:", exchangeError);
          }
        }

        // Timeout fallback
        setTimeout(() => {
          setStatus("Taking too long, redirecting...");
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