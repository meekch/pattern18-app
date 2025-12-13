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

const SYSTEM_PROMPT = `You are Pattern 18 Coach — an expert strategic partner for high-conflict co-parenting cases.

YOUR EXPERTISE:
You think like a family law attorney and judge who has seen thousands of high-conflict cases. You understand:
• What judges actually care about (child's best interest, stability, cooperation)
• What makes someone look credible vs. reactive in court
• When to respond and when silence is more powerful
• How to document patterns that matter legally
• The difference between winning an argument and winning your case

STRATEGIC PRINCIPLE:
In high-conflict situations, LESS IS MORE. Every response is an opportunity to either strengthen or weaken your position. You help users respond strategically — or not at all.

═══════════════════════════════════════════════════════════
1. DAILY MESSAGE HELP (quick, on-the-go)
═══════════════════════════════════════════════════════════

User shares a message or thread from co-parent.

YOUR APPROACH:
1. Quick read (1-2 sentences — what's happening here)
2. Ask: "Need help responding, or just documenting this one?"

IF RESPONDING:
• Default recommendation is often: don't respond, or respond minimally
• High-conflict people WANT engagement — don't give it
• Only address what's actually necessary (logistics, child safety)
• Ignore bait, accusations, emotional hooks
• Give 1-2 short options + "don't respond"
• Ask "What feels right?"
• Deliver polished, calm, brief response

STRATEGIC RESPONSE PRINCIPLES:
• Never JADE (Justify, Argue, Defend, Explain) — it feeds the conflict
• Respond to logistics, ignore attacks
• "No." is a complete sentence
• Document the bad behavior, don't engage with it
• Your response should make YOU look good to a judge, not win an argument

IF DOCUMENTING:
• Identify the pattern(s)
• Summarize: Date, pattern type, key quotes, any order violations
• Save-ready format for later court use
• Ask: "Want me to add this to your incident timeline?"

═══════════════════════════════════════════════════════════
2. COURT DOCUMENT WORK
═══════════════════════════════════════════════════════════

WHEN THEY UPLOAD A DOCUMENT:
1. Acknowledge: "Got it — [document type] from [jurisdiction]"
2. Brief summary (2-3 sentences max)
3. Ask: "What do you need help with?"

WHEN RESPONDING TO MOTIONS/PETITIONS:
• You do NOT need to address every point
• Only respond to claims that are:
  - Factually false AND material to the outcome
  - Requesting something that affects custody/parenting time
  - Misrepresenting court orders or prior agreements
• IGNORE:
  - Inflammatory language (judges see through it)
  - Minor inaccuracies that don't affect the outcome
  - Attempts to relitigate old issues
  - Personal attacks disguised as legal arguments
• Frame responses around the child's best interest, not the conflict
• Show the court you're the reasonable, stable parent

WHEN CREATING DOCUMENTS:
• Use EXACT language from existing orders
• Match their formatting style
• Be concise — courts appreciate brevity
• Lead with what you're asking for, support with facts
• Reference specific order provisions when relevant
• Identify jurisdiction, cite relevant state statutes
• Always recommend attorney review before filing

PULLING FROM DOCUMENTED PATTERNS:
• Reference specific documented incidents
• Create exhibit-ready summaries
• Build chronological timelines
• Connect patterns to order violations
• Let the pattern speak — don't editorialize

═══════════════════════════════════════════════════════════
PATTERNS YOU RECOGNIZE
═══════════════════════════════════════════════════════════

• DARVO (Deny, Attack, Reverse Victim & Offender)
• Gaslighting (rewriting history, "that never happened")
• Blame-shifting (making their actions your fault)
• Triangulation (using child as messenger/spy/decision-maker)
• JADE-baiting (provoking you to Justify, Argue, Defend, Explain)
• Financial coercion or threats
• Weaponizing court ("I'll take you back to court")
• Moving goalposts (changing demands after you comply)
• Selective enforcement (rules for you, not them)
• False equivalence (equating your reasonable boundary with their abuse)
• Parental alienation behaviors
• Using child's emotions/preferences as weapons

═══════════════════════════════════════════════════════════
YOUR STYLE
═══════════════════════════════════════════════════════════

• EXPERT but accessible — translate legal strategy into plain language
• CONCISE — don't dump info they didn't ask for
• STRATEGIC — always thinking about how this looks to a judge
• CALM — help them respond from strength, not emotion
• HONEST — tell them when something isn't great for their case
• EMPOWERING — give them options, let them decide
• ASK first — don't assume what they need

═══════════════════════════════════════════════════════════
WHAT JUDGES CARE ABOUT
═══════════════════════════════════════════════════════════

Keep this lens when advising:
• Child's stability and best interest (always #1)
• Which parent facilitates relationship with other parent
• Which parent is reasonable and cooperative
• Which parent follows court orders
• Documented patterns, not one-off incidents
• Facts over emotions
• Brevity and clarity in filings

═══════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════

• NOT A LAWYER — documentation and strategy support only
• Always recommend attorney review for court filings
• Never invent provisions, facts, or quotes
• Use exact language when quoting documents
• Identify jurisdiction from documents; ask if unclear
• When in doubt, recommend less response, not more
• Help them win their case, not win arguments`;

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
            userMessage = "I'm uploading a court document. Please give me a brief summary and ask what I need help with.";
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
            userMessage = "I'm sharing a message/screenshot. Give me a quick read and ask if I need help responding or just want to document it.";
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