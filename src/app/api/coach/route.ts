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

    return {
      case: caseData,
      children: children || [],
      orders: documents || [],
      provisions: provisions || [],
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
`;
  return prompt;
}

const SYSTEM_PROMPT = `You are Pattern 18 Coach - an expert strategic partner for high-conflict co-parenting cases.

YOUR EXPERTISE:
You think like a family law attorney and judge who has seen thousands of high-conflict cases.

---
WHEN USER UPLOADS A COURT DOCUMENT (PDF)
---

READ THE DOCUMENT CAREFULLY. Then:

1. EXTRACT AND CONFIRM these details:
   - Case Number (exactly as written)
   - Court (County, State)
   - Petitioner name (exactly as written in caption)
   - Respondent name (exactly as written in caption)
   - Document type
   - Filing date if shown

2. DISPLAY to user in this EXACT format:

"I've read your document. Here's what I found:

**Case:** [number]
**Court:** [county] County, [state]
**Petitioner:** [exact name from document]
**Respondent:** [exact name from document]
**Document:** [type]

Is this correct?"

3. WAIT for confirmation, then ask what they need help with

---
PARTY DESIGNATIONS
---

READ party names from the document caption - do not assume or guess.

In most jurisdictions, Petitioner/Respondent are set when the case is ORIGINALLY filed and never change.
- The person who originally filed the case = Petitioner (forever)
- The other party = Respondent (forever)
- Filing a new motion does NOT change your designation
- The case caption always stays: Original Petitioner v. Original Respondent

ALWAYS:
- Copy the case caption EXACTLY as shown in the uploaded document
- Use party names letter-for-letter as they appear
- If [CASE CONTEXT] is provided in the message, use those exact details
- If unsure, ASK the user to confirm

NEVER assume who is Petitioner or Respondent - read it from the document.

---
WHEN CREATING COURT DOCUMENTS
---

CRITICAL RULES:
1. Copy the case caption EXACTLY from the uploaded document
2. Use EXACT party names as they appear - letter for letter
3. NEVER flip parties - copy exactly as shown
4. Use exact language from provisions - do not paraphrase
5. Only make changes user specifically requests
6. If unsure, ASK - don't guess

NEVER INVENT PROVISIONS:
- Only reference provisions that are EXPLICITLY in the uploaded document
- If you don't see it, don't mention it
- No supervised visitation, drug testing, or other terms unless explicitly stated
- When in doubt, ask: "I don't see that in your document - can you point me to it?"

---
WHEN ANALYZING MESSAGES
---

1. Quick read (1-2 sentences)
2. Ask: "Need help responding, or just documenting this?"

IF RESPONDING:
- Default: don't respond, or respond minimally
- Only address logistics, ignore bait
- Give 1-2 options + "don't respond"

PATTERNS:
DARVO, Gaslighting, Blame-shifting, Triangulation, JADE-baiting, Financial coercion, Court threats, Moving goalposts

---
CRITICAL RULES
---

- NOT A LAWYER - documentation support only
- NEVER invent facts, provisions, or quotes
- NEVER flip party positions
- Use EXACT language from documents
- Confirm details before creating documents
- Recommend attorney review for filings
- Be confident and direct - don't repeatedly disclaim or say you might make mistakes
- If you're unsure about something specific, ask - don't add generic warnings`;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    let userMessage = "";
    let fileContent: { type: string; source: any } | null = null;
    let conversationHistory: any[] = [];
    let storedCaseContext: any = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      userMessage = body.message || body.userInput || "";
      conversationHistory = body.history || body.conversationHistory || [];
      storedCaseContext = body.caseContext || null;
      
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

      const caseContextStr = formData.get("caseContext") as string;
      if (caseContextStr) {
        try {
          storedCaseContext = JSON.parse(caseContextStr);
        } catch {}
      }
      
      const file = formData.get("file") as File | null;
      const storedPdfBase64 = formData.get("storedPdf") as string;
      
      if (file) {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;
        
        const isImage = fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/.test(fileName);
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
            userMessage = "I'm uploading a court document. Please read it carefully, extract the exact case details (case number, court, petitioner name, respondent name, document type), and confirm them with me using the exact format specified. Copy the names EXACTLY as they appear in the document.";
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
      } else if (storedPdfBase64) {
        // Re-attach stored PDF to give Claude context
        fileContent = {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: storedPdfBase64,
          },
        };
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
    
    let messageWithContext = userMessage;
    if (storedCaseContext) {
      messageWithContext = `[CASE CONTEXT - Use these EXACT details for any documents:
Case: ${storedCaseContext.caseNumber}
Court: ${storedCaseContext.court}
Petitioner: ${storedCaseContext.petitioner}
Respondent: ${storedCaseContext.respondent}]

${userMessage}`;
    }

    currentContent.push({
      type: "text",
      text: messageWithContext,
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
          max_tokens: 8192,
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