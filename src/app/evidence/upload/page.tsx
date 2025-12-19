"use client";
import { useRouter } from "next/navigation";
import BulkMessageUpload from "@/components/evidence/BulkMessageUpload";

export default function UploadPage() {
  const router = useRouter();
  return (
    <div style={{minHeight:"100vh",background:"#f8faf9"}}>
      <header style={{background:"linear-gradient(135deg,#1a3a2f,#0d1f18)",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"white"}}>
        <button onClick={() => router.push("/evidence")} style={{background:"none",border:"none",color:"white",cursor:"pointer"}}>Back to Evidence</button>
        <h1 style={{margin:0,fontSize:"18px"}}>Import Messages</h1>
        <div style={{width:100}}></div>
      </header>
      <main style={{maxWidth:"800px",margin:"0 auto",padding:"24px"}}>
        <BulkMessageUpload />
      </main>
    </div>
  );
}
