import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const client = new Anthropic();

async function loadCaseContext() {
  try {
    const { data: caseData } = await supabase
      .from("user_cases")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!caseData) return null;

    const { data: children } = await supabase
      .from("case_children")
      .select("*")
      .eq("case_id", caseData.id);

    const { data: documents } = await supabase
      .from("court_documents")
      .select("*")
      .eq("case_id", caseData.id)
      .order("filing_date", { ascending: false });

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .eq("case_id", caseData.id)
      .gte("incident_date", thirtyDaysAgo.toISOString())
      .order("incident_date", { ascending: false })
      .limit(20);

    return {
      case: caseData,
      children: children || [],
      orders: documents || [],
      provisions: provisions || [],
      incidents: incidents || [],
    };
  } catch (err) {
    console.error("Error loading case context:", err);
    return null;
  }
}

function formatCaseContext(context: any) {
  if (!context) return "No case data loaded yet.";

  const c = context.case;
  const userName = c.user_role === "petitioner" ? c.petitioner_name : c.respondent_name;
  const otherParty = c.user_role === "petitioner" ? c.respondent_name : c.petitioner_name;

  let prompt = `
=== USER'S CASE ===
Case: ${c.case_number}
Court: ${c.county} County, ${c.state}
User: ${userName} (${c.user_role})
Co-parent: ${otherParty}
Children: ${context.children.map((ch: any) => `${ch.child_name} (${ch.age})`).join(", ") || "Not specified"}

=== COURT ORDERS ===
${context.orders.map((o: any) => `• ${o.title} (Filed: ${o.filing_date || "Unknown"})`).join("\n") || "No orders uploaded yet."}

=== KEY PROVISIONS ===
`;

  if (context.provisions.length > 0) {
    const byCategory: Record<string, any[]> = {};
    context.provisions.forEach((p: any) => {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    });

    Object.entries(byCategory).forEach(([category, provs]) => {
      prompt += `\n${category.toUpperCase()}:\n`;
      provs.forEach((p: any) => {
        prompt += `  [Section ${p.section_reference || "N/A"}] ${p.provision_text}\n`;
      });
    });
  } else {
    prompt += "No provisions extracted yet.\n";
  }

  if (context.incidents && context.incidents.length > 0) {
    prompt += `\n=== RECENT INCIDENTS (Last 30 Days) ===\n`;
    context.incidents.forEach((i: any) => {
      prompt += `• ${i.incident_date}: ${i.incident_type} - ${i.description?.substring(0, 150)}...\n`;
    });
  }

  return prompt;
}

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a strategic documentation partner for someone navigating high-conflict co-parenting. You've helped them for years. You know their case, their order, their patterns.

YOUR APPROACH:
When they share a message from their co-parent, you:
1. IMMEDIATELY identify manipulation patterns (DARVO, gaslighting, blame-shifting, false accusations)
2. Reference their SPECIFIC court order provisions that apply
3. Show them the facts vs. the claims
4. Give them response OPTIONS with your recommendation
5. Always include "don't respond" as an option when appropriate
6. Ask "What feels right to you?" — empowering THEM to decide
7. Provide polished, ready-to-send responses when they're ready

MANIPULATION PATTERNS YOU RECOGNIZE:
- DARVO (Deny, Attack, Reverse Victim & Offender)
- Gaslighting (rewriting history, denying documented facts)
- Blame-shifting (making their actions your fault)
- False equivalence (treating unequal things as equal)
- Moving goalposts (changing demands after you meet them)
- Triangulation (using the child as messenger)
- Selective enforcement (rules apply to you but not them)
- JADE-baiting (trying to make you Justify, Argue, Defend, Explain)

YOUR TONE:
- Direct and clear — no corporate fluff
- Warm but strategic — you're in their corner
- Calm — help them respond from strength, not emotion
- Honest — tell them when they don't need to respond at all

RESPONSE FORMAT:
When analyzing a message, structure your response like this:

**[PATTERN NAME] detected** — one line explaining what they're doing

**What I'm seeing:**
- Bullet points breaking down the manipulation tactics

**Your order says:** (if relevant)
Quote the specific provision with section reference

**The facts:**
Brief, factual counter to any false claims

**Your options:**

**Option 1: [Label]** ⭐ Recommended
"Ready-to-send response here"

**Option 2: [Label]**  
"Alternative response here"

**Option 3: Don't respond**
Brief explanation of why silence might be the right move

---
*What feels right to you?*

CRITICAL RULES:
- NEVER tell them what to do legally — you're not a lawyer
- ALWAYS reference their specific order provisions when relevant
- Keep responses SHORT — they're dealing with enough already
- When they ask for a "final version to send" — give them ONLY the polished message
- You can analyze screenshots and images of text messages
- When analyzing images, read ALL the text carefully and analyze patterns
- When analyzing PDFs or documents, extract key provisions, deadlines, and concerning language

YOU ARE NOT:
- A therapist (though you're supportive)
- A lawyer (you don't give legal advice)
- Neutral (you're strategically on their side)

You ARE:
- Their strategic partner
- Pattern recognition expert
- Documentation coach
- Response strategist
- The calm in their storm`;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    let userMessage = "";
    let fileContent: { type: string; source: any } | null = null;
    let conversationHistory: any[] = [];

    if (contentType.includes("application/json")) {
      const body = await request.json();
      userMessage = body.message || body.userInput || "";
      conversationHistory = body.history || body.conversationHistory || [];
      
      if (body.image) {
        fileContent = {
          type: "image",
          source: {
            type: "base64",
            media_type: body.imageType || "image/jpeg",
            data: body.image.replace(/^data:image\/\w+;base64,/, ""),
          },
        };
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      userMessage = formData.get("message") as string || "";
      
      const historyStr = formData.get("history") as string;
      if (historyStr) {
        try {
          conversationHistory = JSON.parse(historyStr);
        } catch {}
      }
      
      const file = formData.get("file") as File | null;
      if (file) {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;
        
        const isImage = fileType.startsWith("image/") || 
          /\.(jpg|jpeg|png|gif|webp)$/.test(fileName);
        const isPdf = fileType === "application/pdf" || fileName.endsWith(".pdf");
        
        if (!isImage && !isPdf) {
          return new Response(
            JSON.stringify({ error: "Please upload an image (JPG, PNG) or PDF file." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        
        if (file.size > 10 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: "File too large. Please use a file under 10MB." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        
        console.log("Processing file:", { name: file.name, type: fileType, size: file.size });
        
        if (isPdf) {
          fileContent = {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          };
          if (!userMessage) {
            userMessage = "Analyze this document and extract key information relevant to my custody case. Identify provisions, deadlines, requests, and any concerning language.";
          }
        } else {
          let mediaType = fileType;
          if (mediaType === "image/jpg") mediaType = "image/jpeg";
          if (!mediaType.startsWith("image/")) {
            const ext = fileName.split('.').pop();
            if (ext === "jpg" || ext === "jpeg") mediaType = "image/jpeg";
            else if (ext === "png") mediaType = "image/png";
            else if (ext === "gif") mediaType = "image/gif";
            else if (ext === "webp") mediaType = "image/webp";
            else mediaType = "image/jpeg";
          }
          
          fileContent = {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          };
          if (!userMessage) {
            userMessage = "Analyze this image and identify any manipulation patterns, concerning behavior, or relevant details for my case.";
          }
        }
      }
    }

    if (!userMessage && !fileContent) {
      return new Response(
        JSON.stringify({ error: "Message or file required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const caseContext = await loadCaseContext();
    const contextPrompt = formatCaseContext(caseContext);

    const messages: any[] = [];

    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    const currentContent: any[] = [];
    
    if (fileContent) {
      currentContent.push(fileContent);
    }
    
    currentContent.push({
      type: "text",
      text: userMessage,
    });

    messages.push({
      role: "user",
      content: currentContent,
    });

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT + "\n\n" + contextPrompt,
          messages,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
        }

        await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (error) {
        console.error("Streaming error:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Coach API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ status: "Pattern 18 Coach API is running" }),
    { headers: { "Content-Type": "application/json" } }
  );
}