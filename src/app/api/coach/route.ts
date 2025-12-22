import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Pattern 18 Coach. A warm, supportive best friend who happens to be an expert in high-conflict custody and coercive control.

YOUR PERSONALITY:
- Talk like a supportive best friend, not a formal AI
- Be warm, direct, and real
- Use "I" statements: "I see what's happening here..."
- Keep responses SHORT unless they ask for detail
- Ask clarifying questions before giving advice
- NEVER use em dashes (—). Use periods or commas instead. Em dashes sound like AI.

FIRST MESSAGE APPROACH:
If someone just says "hi" or "hello" — keep it simple and warm:
"Hey, I'm glad you're here. What's going on today?"

That's it. Don't list your capabilities. Don't give a tour. Just be present.

WHEN THEY SHARE A MESSAGE OR SITUATION:
1. VALIDATE first (1 sentence): "I see exactly what's happening here."
2. NAME the tactic briefly: "This is classic [tactic]."
3. ASK what they need: "Do you need to respond, or can you let this one go?"

Only provide response options IF they ask or clearly need one.

RESPONSE STYLE:
- Short paragraphs, not bullet lists
- Conversational, not clinical
- Confident but not preachy
- Never say "I understand how difficult this must be" — that's hollow

TACTICAL KNOWLEDGE (use naturally, don't list):
- DARVO (Deny, Attack, Reverse Victim/Offender)
- Gaslighting, Baiting, Blame-shifting
- Word salad, Moving goalposts
- Triangulation, Future faking
- Litigation abuse, Schedule manipulation
- Parental alienation tactics

STRATEGIC PRINCIPLES:
- Default advice: Don't respond, or respond minimally
- Only address logistics, never emotions
- Every calm non-response is a win
- Document everything, react to nothing
- The goal is COURT, not the relationship

WHEN THEY NEED A RESPONSE TO SEND:
- Keep it brief, factual, emotionless
- BIFF style: Brief, Informative, Friendly, Firm
- No JADE (Justify, Argue, Defend, Explain)
- Example: "I can do Tuesday at 3pm for pickup. Let me know."

COURT DOCUMENTS:
When helping with court documents, be precise and professional. Use their exact case details. Never invent facts.

Remember: You're the friend who finally GETS IT. Who sees through the manipulation instantly. Who helps them stay calm when everything in them wants to react. Be that friend.`;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let userMessage = "";
    let fileContent: { type: string; source: any } | null = null;
    let conversationHistory: any[] = [];
    let storedCaseContext: any = null;
    let userId: string | null = null;
    let conversationId: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      userMessage = body.message || body.userInput || "";
      conversationHistory = body.history || body.conversationHistory || [];
      storedCaseContext = body.caseContext || null;
      userId = body.userId || null;
      conversationId = body.conversationId || null;

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
      userMessage = (formData.get("message") as string) || "";
      userId = (formData.get("userId") as string) || null;
      conversationId = (formData.get("conversationId") as string) || null;

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

        const isImage =
          fileType.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp)$/.test(fileName);
        const isPdf =
          fileType === "application/pdf" || fileName.endsWith(".pdf");

        if (!isImage && !isPdf) {
          return new Response(
            JSON.stringify({
              error: "Please upload an image (JPG, PNG) or PDF file.",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          return new Response(
            JSON.stringify({
              error: "File too large. Please use a file under 10MB.",
            }),
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
            userMessage =
              "I'm uploading a document. Please identify what type of document this is (court order, message export, motion, etc.). If it contains messages, analyze them for manipulation patterns. If it's a court document, extract the key details.";
          }
        } else {
          let mediaType = fileType;
          if (mediaType === "image/jpg") mediaType = "image/jpeg";
          if (!mediaType.startsWith("image/")) {
            const ext = fileName.split(".").pop();
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
            userMessage =
              "I'm uploading a screenshot of a message from my co-parent. Please: 1) Extract and show me the exact text from the screenshot, 2) Identify any manipulation patterns you see, 3) Tell me if I need to respond or can ignore it.";
          }
        }
      } else if (storedPdfBase64) {
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
Petitioner: ${storedCaseContext.petitionerName}
Respondent: ${storedCaseContext.respondentName}
User is: ${storedCaseContext.userRole}
Co-parent name: ${storedCaseContext.coparentName}]

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
        let fullResponse = "";

        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullResponse += chunk;
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
        }

        const patterns = extractPatterns(fullResponse);

        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              patterns: patterns,
              canSaveEvidence: patterns.length > 0,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Streaming error:", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
          )
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

function extractPatterns(response: string): string[] {
  const patternKeywords = [
    "bait",
    "provocation",
    "darvo",
    "gaslighting",
    "gaslight",
    "blame-shifting",
    "blame shifting",
    "word salad",
    "moving goalposts",
    "silent treatment",
    "stonewalling",
    "love bombing",
    "future faking",
    "triangulation",
    "financial abuse",
    "economic control",
    "litigation abuse",
    "court order weaponization",
    "weaponizing",
    "schedule manipulation",
    "information withholding",
    "parental alienation",
    "hoovering",
    "intermittent reinforcement",
    "flying monkeys",
    "projection",
    "smear campaign",
    "playing victim",
    "intimidation",
    "threats",
    "control",
    "manipulation",
  ];

  const found: string[] = [];
  const lowerResponse = response.toLowerCase();

  for (const pattern of patternKeywords) {
    if (lowerResponse.includes(pattern)) {
      let normalized = pattern
        .split(/[-\s]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (normalized === "Darvo") normalized = "DARVO";
      if (!found.includes(normalized)) {
        found.push(normalized);
      }
    }
  }

  return found;
}

export async function GET() {
  return new Response(
    JSON.stringify({ status: "Pattern 18 Coach API is running" }),
    { headers: { "Content-Type": "application/json" } }
  );
}