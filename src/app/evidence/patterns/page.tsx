"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

export default function PatternsByPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patternGroups, setPatternGroups] = useState<any[]>([]);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      try {
        const res = await fetch(`/api/incidents?userId=${session.user.id}`);
        const data = await res.json();
        if (data.incidents) {
          const groups: Record<string, any> = {};
          data.incidents.forEach((inc: any) => {
            inc.patterns?.forEach((pattern: string) => {
              if (!groups[pattern]) groups[pattern] = { pattern, count: 0, incidents: [] };
              groups[pattern].count++;
              groups[pattern].incidents.push(inc);
            });
          });
          setPatternGroups(Object.values(groups).sort((a, b) => b.count - a.count));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return <AppLayout><div style={{textAlign:"center",padding:"80px"}}>Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{maxWidth:"900px",margin:"0 auto"}}>
        <h1 style={{fontSize:"28px",color:"#1a3a2f",marginBottom:"24px"}}>Evidence by Pattern</h1>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {patternGroups.map((g) => (
            <div key={g.pattern} style={{background:"white",borderRadius:"12px",overflow:"hidden"}}>
              <button onClick={() => setExpandedPattern(expandedPattern === g.pattern ? null : g.pattern)} style={{width:"100%",padding:"20px",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left"}}>
                <div>
                  <div style={{fontWeight:600,color:"#1a3a2f"}}>{g.pattern}</div>
                  <div style={{fontSize:"13px",color:"#666"}}>{g.count} incidents</div>
                </div>
                <span>{expandedPattern === g.pattern ? "▼" : "▶"}</span>
              </button>
              {expandedPattern === g.pattern && (
                <div style={{borderTop:"1px solid #eee",padding:"12px 20px",background:"#f8f9fa"}}>
                  {g.incidents.map((inc: any) => (
                    <div key={inc.id} style={{padding:"10px 0",borderBottom:"1px solid #eee",display:"flex",gap:"12px"}}>
                      <span style={{fontSize:"12px",color:"#999"}}>{new Date(inc.incident_date || inc.created_at).toLocaleDateString()}</span>
                      <span style={{flex:1,fontSize:"13px"}}>{inc.title || "Incident"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
