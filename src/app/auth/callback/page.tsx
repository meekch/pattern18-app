"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error
        const error = hashParams.get("error") || queryParams.get("error");
        if (error) {
          setStatus("Error: " + error);
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Check for recovery type FIRST (password reset)
        const type = hashParams.get("type") || queryParams.get("type");
        
        if (type === "recovery") {
          setStatus("Password reset verified. Redirecting...");
          
          // Handle tokens if present
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          
          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
          }
          
          // Always go to reset password page for recovery type
          router.push("/auth/reset-password");
          return;
        }

        // Set up auth state listener BEFORE exchanging code
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth event:", event);
          
          if (event === "PASSWORD_RECOVERY") {
            setStatus("Redirecting to reset password...");
            router.push("/auth/reset-password");
          } else if (event === "SIGNED_IN" && session) {
            setStatus("Success! Redirecting...");
            router.push("/coach");
          }
        });

        // Try exchanging code if present
        const code = queryParams.get("code");
        if (code) {
          setStatus("Verifying...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error("Exchange error:", exchangeError);
            setStatus("Verification failed. Redirecting to login...");
            setTimeout(() => router.push("/login"), 2000);
            return;
          }
          
          // Check if this was a recovery/reset
          // The session user might have recovery info
          if (data.session) {
            // Give the auth state listener a moment to fire
            setTimeout(() => {
              // If we're still here, redirect to coach
              router.push("/coach");
            }, 1000);
          }
          return;
        }

        // Handle tokens in hash (some flows put them there)
        const accessToken = hashParams.get("access_token");
        if (accessToken) {
          const refreshToken = hashParams.get("refresh_token");
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          
          // Give listener time to fire
          setTimeout(() => {
            router.push("/coach");
          }, 1000);
          return;
        }

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/coach");
          return;
        }

        // Timeout fallback
        setTimeout(() => {
          setStatus("Taking too long. Redirecting to login...");
          router.push("/login");
        }, 10000);

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("Error. Redirecting to login...");
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