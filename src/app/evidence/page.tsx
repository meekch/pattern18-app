"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Incident {
  id: string;
  title?: string;
  coparent_message: string | null;
  patterns: string[];
  severity: string;
  incident_date: string;
  created_at: string;
}

export default function EvidenceDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patternSummary, setPatternSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      try {
        const res = await fetch(`/api/incidents?userId=${session.user.id}`);
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
          setPatternSummary(data.patternSummary || {});
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#1a3a2f",color:"white"}}>Loading...</div>;

  return (
    <div style={{minHeight:"100vh",background:"#f8faf9"}}>
      <header style={{background:"linear-gradient(135deg,#1a3a2f,#0d1f18)",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"white"}}>
        <button onClick={() => router.push("/coach")} style={{background:"none",border:"none",color:"white",cursor:"pointer"}}>Back</button>
        <h1 style={{margin:0,fontSize:"18px"}}>Evidence Dashboard</h1>
        <button onClick={() => router.push("/evidence/upload")} style={{background:"#2dd4a8",border:"none",padding:"8px 16px",borderRadius:"6px",cursor:"pointer"}}>Import</button>
      </header>
      <main style={{maxWidth:"900px",margin:"0 auto",padding:"20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"20px"}}>
          <div style={{background:"white",borderRadius:"12px",padding:"20px",textAlign:"center"}}><div style={{fontSize:"32px",fontWeight:700}}>{incidents.length}</div><div style={{color:"#666"}}>Incidents</div></div>
          <div style={{background:"white",borderRadius:"12px",padding:"20px",textAlign:"center"}}><div style={{fontSize:"32px",fontWeight:700,color:"#dc3545"}}>{incidents.filter(i=>i.severity==="critical").length}</div><div style={{color:"#666"}}>Critical</div></div>
          <div style={{background:"white",borderRadius:"12px",padding:"20px",textAlign:"center"}}><div style={{fontSize:"32px",fontWeight:700}}>{Object.keys(patternSummary).length}</div><div style={{color:"#666"}}>Patterns</div></div>
        </div>
        <div style={{background:"white",borderRadius:"12px",padding:"20px"}}>
          <h2 style={{margin:"0 0 16px",fontSize:"16px"}}>Incidents</h2>
          {incidents.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px"}}><p>No incidents yet.</p><button onClick={() => router.push("/evidence/upload")} style={{background:"#1a3a2f",color:"white",border:"none",padding:"12px 24px",borderRadius:"8px",cursor:"pointer"}}>Import Messages</button></div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {incidents.map((inc) => (
                <div key={inc.id} style={{border:"1px solid #eee",borderRadius:"10px",padding:"16px"}}>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"8px"}}>
                    <span style={{fontSize:"12px",color:"#999"}}>{new Date(inc.incident_date || inc.created_at).toLocaleDateString()}</span>
                    {inc.severity === "critical" && <span style={{fontSize:"10px",background:"#fee",color:"#c00",padding:"2px 8px",borderRadius:"10px"}}>Critical</span>}
                  </div>
                  {inc.title && <div style={{fontWeight:600,marginBottom:"6px"}}>{inc.title}</div>}
                  <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>{inc.patterns?.slice(0,5).map((p,i) => <span key={i} style={{background:"#1a3a2f",color:"white",padding:"2px 8px",borderRadius:"10px",fontSize:"10px"}}>{p}</span>)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
