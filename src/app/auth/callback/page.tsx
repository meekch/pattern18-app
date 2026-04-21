"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

async function getRedirectPath(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .single();

  const status = profile?.subscription_status;
  if (status === "active" || status === "trialing") {
    return "/coach";
  }
  return "/subscribe";
}

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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Auth event:", event);

          if (event === "PASSWORD_RECOVERY") {
            setStatus("Redirecting to reset password...");
            router.push("/auth/reset-password");
          } else if (event === "SIGNED_IN" && session) {
            setStatus("Success! Redirecting...");
            const path = await getRedirectPath(session.user.id);
            router.push(path);
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

          if (data.session) {
            setTimeout(async () => {
              const path = await getRedirectPath(data.session!.user.id);
              router.push(path);
            }, 1000);
          }
          return;
        }

        // Handle tokens in hash (some flows put them there)
        const accessToken = hashParams.get("access_token");
        if (accessToken) {
          const refreshToken = hashParams.get("refresh_token");
          const { data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          setTimeout(async () => {
            if (data.session) {
              const path = await getRedirectPath(data.session.user.id);
              router.push(path);
            } else {
              router.push("/subscribe");
            }
          }, 1000);
          return;
        }

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const path = await getRedirectPath(session.user.id);
          router.push(path);
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
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FAFAF7",
      color: "#1F2937",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          background: "#2F9D94",
          color: "#FAFAF7",
          width: "56px",
          height: "56px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 800,
          fontSize: "26px",
          margin: "0 auto 20px"
        }}>18</div>
        <div style={{ fontSize: "18px" }}>{status}</div>
        <div style={{
          marginTop: "20px",
          width: "32px",
          height: "32px",
          border: "3px solid rgba(47,157,148,0.2)",
          borderTopColor: "#2F9D94",
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
