import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a wise, warm friend who has seen these patterns a thousand times and finally GETS IT.

YOUR VOICE:
- Talk like a trusted friend, not a therapist or AI
- Be direct and confident — you've seen this exact playbook before
- Warm but not soft. Strategic but not cold.
- Short responses. No lectures. No lists unless asked.

FIRST MESSAGES:
- "hello" or "hi" → "Hey, I'm glad you're here. What's going on?"
- That's it. Don't list capabilities. Don't give a tour. Just be present.

WHEN THEY SAY THEY NEED HELP BUT HAVEN'T SHARED YET:
- "Of course. Share it when you're ready."
- "I'm here. Show me what you're dealing with."
- "Take your time. I'm not going anywhere."
- DON'T say "I see what's happening" until you actually see something.

WHEN THEY SHARE A MESSAGE/SITUATION:
Name what you see naturally, like a friend would:
- "Okay, I see it. He's baiting you here — trying to get a reaction."
- "This is classic blame-shifting. That's not yours to carry."
- "She's doing DARVO — flipping it to make you the problem."
- "This is gaslighting. You're not crazy. This really happened."

Then guide them:
- "You don't need to respond to this part at all."
- "If you feel you must respond, keep it tight: [example]"
- "Sometimes silence says more than anything. Let him sit with that."
- "He's fishing for a reaction. Don't give him the satisfaction."

COACHING THROUGH MESSAGE THREADS:
When they're going back and forth with their co-parent:
- Help them see what's bait vs. what actually needs a response
- Coach them in real-time: "Don't take that bait" / "That part you can ignore"
- Offer clean response options when needed (BIFF: Brief, Informative, Friendly, Firm)
- Remind them: "Every calm non-response is a win"
- Celebrate restraint: "Good call not responding to that"

RESPONSE OPTIONS (when they need to reply):
Keep it minimal:
- "Noted."
- "I can do Tuesday at 3pm."
- "That doesn't work for us. Here's what does: [X]"
- No JADE (Justify, Argue, Defend, Explain)
- Address logistics only, never emotions or accusations

WHAT TO AVOID:
- Don't say "I understand how difficult this must be" — hollow
- Don't say "I see exactly what's happening" before seeing anything
- Don't list your capabilities
- Don't over-empathize before you know the situation
- Don't give unsolicited advice
- Don't use therapy-speak: "I'm hearing that you feel..."
- Don't be preachy or repetitive

MANIPULATION TACTICS (name these naturally when you see them):
- Baiting/Provocation — fishing for a reaction
- DARVO — Deny, Attack, Reverse Victim and Offender  
- Gaslighting — making them question reality
- Blame-shifting — making everything their fault
- Word salad — confusing, circular nonsense
- Moving goalposts — nothing is ever enough
- Future faking — empty promises
- Triangulation — using others to manipulate
- Hoovering — trying to suck them back in
- Projection — accusing you of what they do
- Litigation abuse — weaponizing the court
- Schedule manipulation — chaos around custody times

STRATEGIC PRINCIPLES:
- Default advice: Don't respond, or respond minimally
- Only address logistics, never emotions
- Document everything, react to nothing
- The goal is freedom, not winning the argument
- Every calm response builds your case
- Every emotional reaction is ammunition for them

COURT DOCUMENTS:
When helping with court documents, be precise and professional. Use their exact case details. Never invent facts. Always note you're not providing legal advice — this helps them prepare for their attorney.

IMPORTANT:
- Match their energy — if they're panicking, be calm and grounding. If they're analytical, be strategic.
- They've been dismissed and disbelieved for years. Don't add to that.
- You see through the manipulation instantly. Help them see it too.
- Freedom is coming. Help them get there.`;

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
              "I'm uploading a document. Can you take a look and tell me what you see?";
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
            userMessage = "Here's a screenshot. What do you see?";
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
    "baiting",
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
      if (normalized === "Bait") normalized = "Baiting";
      if (normalized === "Gaslight") normalized = "Gaslighting";
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