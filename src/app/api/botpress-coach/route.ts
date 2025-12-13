import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Pattern 18 Coach, helping with high-conflict co-parenting situations. You are NOT a lawyer. Reference the user's court order provisions when available. Be warm and supportive.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Load case context
    let contextPrompt = "NO CASE DATA FOUND.";
    
    const { data: caseData } = await supabase
      .from("user_cases")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (caseData) {
      const { data: documents } = await supabase
        .from("court_documents")
        .select("*")
        .eq("case_id", caseData.id);

      let provisions: any[] = [];
      if (documents && documents.length > 0) {
        const docIds = documents.map((d) => d.id);
        const { data: provData } = await supabase
          .from("order_provisions")
          .select("*")
          .in("court_document_id", docIds)
          .eq("is_active", true);
        if (provData) provisions = provData;
      }

      contextPrompt = `USER CASE: ${caseData.case_number}\n`;
      if (provisions.length > 0) {
        provisions.forEach((p) => {
          contextPrompt += `${p.category}: ${p.provision_text}\n`;
        });
      }
    }

    const messages = [
      ...conversationHistory.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT + "\n\n" + contextPrompt,
      messages,
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      reply: responseText,
      hasCase: !!caseData,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ reply: "Error occurred", error: true }, { status: 500 });
  }
}