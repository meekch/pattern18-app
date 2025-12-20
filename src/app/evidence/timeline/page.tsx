"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

export default function TimelinePage() {
  const router = useRouter();
  return (
    <AppLayout>
      <div style={{textAlign:"center",padding:"80px 20px",maxWidth:"500px",margin:"0 auto"}}>
        <div style={{fontSize:"64px",marginBottom:"24px"}}>📅</div>
        <h1 style={{margin:"0 0 12px",color:"#1a3a2f"}}>Timeline View</h1>
        <p style={{color:"#666",marginBottom:"32px"}}>Visual timeline of incidents coming soon.</p>
        <button onClick={() => router.push("/evidence")} style={{background:"#1a3a2f",color:"white",border:"none",padding:"12px 24px",borderRadius:"8px",cursor:"pointer"}}>Back to All Incidents</button>
      </div>
    </AppLayout>
  );
}
