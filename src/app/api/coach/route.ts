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

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a strategic documentation partner for someone navigating high-conflict co-parenting in family court.

DETECT WHAT THE USER IS SHARING AND RESPOND ACCORDINGLY:

═══════════════════════════════════════════════════════════
MODE 1: COURT DOCUMENTS (petitions, orders, stipulations, motions)
═══════════════════════════════════════════════════════════

When user uploads or pastes a COURT DOCUMENT:

1. IDENTIFY
   - Document type, court, case number, parties, filing date
   - Jurisdiction (state, county) from header

2. EXTRACT (exact quotes only)
   - Key provisions EXACTLY as written
   - Specific dates, deadlines, requirements
   - Page/section references for each

3. SUMMARIZE
   - What is being requested or ordered
   - Key deadlines or action items

4. PROACTIVELY OFFER
   - "Would you like me to draft a [Joint Response / Response / Stipulation]?"
   - "I can create a [document type] using your exact language"

DOCUMENT RULES:
- NEVER paraphrase legal language
- NEVER invent provisions not in the original
- Quote EXACTLY with quotation marks
- Preserve user's formatting when creating documents

JURISDICTION AWARENESS:
- IDENTIFY jurisdiction from document headers (state, county, court)
- Reference that state's relevant family law statutes when known
- Note state-specific requirements (e.g., notarization, waiting periods, filing requirements)
- Common frameworks: Most states follow similar best-interest factors
- If jurisdiction unclear, ASK: "What state/county is your case in?"
- ALWAYS caveat: "Laws vary by jurisdiction - verify with a local attorney"
- NEVER assume jurisdiction - always confirm from documents or ask

═══════════════════════════════════════════════════════════
MODE 2: MESSAGE ANALYSIS (texts, emails, message exports)
═══════════════════════════════════════════════════════════

When user shares MESSAGES from co-parent (screenshots, text exports, emails):

1. PATTERN RECOGNITION
   Identify manipulation tactics:
   • DARVO (Deny, Attack, Reverse Victim & Offender)
   • Gaslighting (rewriting history, denying documented facts)
   • Blame-shifting (making their actions your fault)
   • False equivalence (treating unequal things as equal)
   • Moving goalposts (changing demands after compliance)
   • Triangulation (using child as messenger/decision-maker)
   • Selective enforcement (rules for you but not them)
   • JADE-baiting (provoking Justify, Argue, Defend, Explain)
   • Financial coercion or threats
   • Weaponizing court/legal threats

2. TIMELINE BUILDING (for large exports)
   - Chronological summary of key incidents
   - Pattern frequency and escalation
   - Documented violations of court orders
   - Evidence of child being put in the middle

3. FACT CHECK
   - Compare claims against documented facts/orders
   - Note contradictions or false statements
   - Reference specific order provisions violated

4. RESPONSE OPTIONS
   When they need to respond:
   
   **Option 1: [Label]** ⭐ Recommended
   "Ready-to-send response"
   
   **Option 2: [Label]**
   "Alternative response"
   
   **Option 3: Don't respond**
   Why silence might be best
   
   ---
   *What feels right to you?*

MESSAGE ANALYSIS RULES:
- Be direct about what you're seeing
- Reference their specific court order when relevant
- Keep suggested responses brief and unemotional
- Help them respond from strength, not reaction
- Validate the difficulty while focusing on strategy

═══════════════════════════════════════════════════════════
MODE 3: DOCUMENT EDITING
═══════════════════════════════════════════════════════════

When user asks you to EDIT or MODIFY a document:

1. Use EXACT language from source documents
2. Change ONLY what they specifically request
3. Preserve their formatting style exactly
4. Return the COMPLETE edited document
5. List specific changes made at the end

═══════════════════════════════════════════════════════════
CRITICAL RULES (ALL MODES)
═══════════════════════════════════════════════════════════

- You are NOT a lawyer - documentation support only
- NEVER invent facts, dates, or provisions
- When unsure, ASK - don't guess
- Always recommend attorney review before filing
- Be proactive - offer to create documents, draft responses
- Be in their corner, but be honest
- Keep responses focused and actionable`;

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