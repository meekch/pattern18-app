"use client";
import { useRouter } from "next/navigation";
import BulkMessageUpload from "@/components/evidence/BulkMessageUpload";

export default function UploadPage() {
  const router = useRouter();
  return (
    <div style={{minHeight:"100vh",background:"var(--warm-white)"}}>
      <div style={{height:4,background:"var(--teal)"}} />
      <header style={{background:"var(--warm-white)",borderBottom:"1px solid var(--teal-border)",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"var(--charcoal)"}}>
        <button onClick={() => router.push("/evidence")} style={{background:"none",border:"none",color:"var(--teal)",cursor:"pointer",fontWeight:600}}>← Back to Evidence</button>
        <h1 style={{margin:0,fontSize:"18px",fontFamily:"var(--serif)",fontWeight:700}}>Import Messages</h1>
        <div style={{width:100}}></div>
      </header>
      <main style={{maxWidth:"800px",margin:"0 auto",padding:"24px"}}>
        <BulkMessageUpload />
      </main>
    </div>
  );
}
