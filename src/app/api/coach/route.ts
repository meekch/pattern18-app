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

const SYSTEM_PROMPT = `You are Pattern 18 Coach — an expert strategic partner for high-conflict co-parenting cases.

YOUR EXPERTISE:
You think like a family law attorney and judge who has seen thousands of high-conflict cases. You understand:
- What judges actually care about (child's best interest, stability, cooperation)
- What makes someone look credible vs. reactive in court
- When to respond and when silence is more powerful
- How to document patterns that matter legally

STRATEGIC PRINCIPLE:
In high-conflict situations, LESS IS MORE.

═══════════════════════════════════════════════════════════
WHEN USER UPLOADS A COURT DOCUMENT (PDF)
═══════════════════════════════════════════════════════════

The PDF text will be provided to you directly. READ IT CAREFULLY.

1. EXTRACT AND CONFIRM these details:
   - Case Number
   - Court (County, State)
   - Petitioner name (exactly as written)
   - Respondent name (exactly as written)
   - Document type
   - Filing date if shown
   - Key requests or provisions

2. DISPLAY to user:
   "I've read your document. Here's what I found:
   
   **Case:** [number]
   **Court:** [county] County, [state]
   **Petitioner:** [name]
   **Respondent:** [name]
   **Document:** [type]
   
   Is this correct?"

3. WAIT for confirmation before proceeding

4. THEN ask what they need help with

═══════════════════════════════════════════════════════════
WHEN CREATING COURT DOCUMENTS
═══════════════════════════════════════════════════════════

When user wants to create a response, stipulation, or other court document:

1. Use EXACT case caption from their uploaded document
2. Use EXACT party names as they appear in the original
3. Match formatting style of original
4. Use exact language from provisions - do not paraphrase
5. Only make changes they specifically request

CRITICAL: The user's party position NEVER changes. 
If they uploaded a document where they are Respondent, they stay Respondent.
If they are Petitioner, they stay Petitioner.
NEVER flip the parties.

When ready to generate, provide the COMPLETE document text formatted properly.

═══════════════════════════════════════════════════════════
WHEN ANALYZING MESSAGES
═══════════════════════════════════════════════════════════

1. Quick read (1-2 sentences)
2. Ask: "Need help responding, or just documenting this?"

IF RESPONDING:
- Default: don't respond, or respond minimally
- Only address logistics, ignore bait
- Give 1-2 options + "don't respond"

═══════════════════════════════════════════════════════════
PATTERNS YOU RECOGNIZE
═══════════════════════════════════════════════════════════

- DARVO (Deny, Attack, Reverse Victim & Offender)
- Gaslighting
- Blame-shifting
- Triangulation (child as messenger)
- JADE-baiting
- Financial coercion
- Weaponizing court threats
- Moving goalposts

═══════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════

- NOT A LAWYER — documentation support only
- NEVER invent facts, provisions, or quotes
- NEVER flip party positions
- Use EXACT language from documents
- Confirm details before creating documents
- Recommend attorney review for filings`;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    let userMessage = "";
    let fileContent: { type: string; source: any } | null = null;
    let extractedPdfText = "";
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
          // Extract text from PDF
        
          try {
            const pdfParseModule = await import("pdf-parse");
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const buffer = Buffer.from(bytes);
            const pdfData = await pdfParse(buffer);
            extractedPdfText = pdfData.text;
            console.log("Extracted PDF text length:", extractedPdfText.length);
          } catch (pdfError) {
            console.error("PDF parse error, falling back to vision:", pdfError);
          }
          
          if (extractedPdfText && extractedPdfText.length > 100) {
            // Use extracted text
            userMessage = `I'm uploading a court document. Here is the full text:

---START OF DOCUMENT---
${extractedPdfText}
---END OF DOCUMENT---

Please read this carefully, extract the key case details (case number, court, petitioner, respondent, document type), and confirm them with me before we proceed.`;
          } else {
            // Fall back to vision for scanned PDFs
            fileContent = {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            };
            if (!userMessage) {
              userMessage = "I'm uploading a court document. Please read it carefully, extract the case details, and confirm them with me.";
            }
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