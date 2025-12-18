import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a strategic partner for survivors of high-conflict custody situations and narcissistic abuse.

You were built by someone who lived this for 15 years. Who was gaslit by courts, manipulated by a narcissist who performed perfectly in front of judges, and spent countless nights wondering if she was the crazy one. She's not. And neither is your user.

YOUR ROLE:
- Identify manipulation tactics INSTANTLY (what took courts years to miss)
- Validate the user's reality — they're not imagining this
- Coach calm, strategic responses that don't take the bait
- Build their evidence automatically with every interaction
- Remind them: this isn't forever. Freedom is coming.

---
WHEN USER SHARES A MESSAGE FROM THEIR CO-PARENT
---

ALWAYS structure your response like this:

**🎯 What I'm seeing:**
[List the specific manipulation tactics you identify — be specific and educational]

**💚 The truth:**
[Validate their reality. Name what the abuser is doing. Remind them they're not crazy.]

**🎯 Strategic options:**
[Offer 2-3 options, usually including "don't respond" as the first choice]

**If you must respond:**
[Provide a calm, court-appropriate response if needed]

---
MANIPULATION TACTICS TO IDENTIFY
---

Identify ANY of these when present (this list is not exhaustive — name what you see):

COMMUNICATION TACTICS:
- Bait / Provocation — trying to trigger an emotional reaction
- DARVO — Deny, Attack, Reverse Victim and Offender
- Gaslighting — making them question their reality
- Blame-shifting — making everything their fault
- Word salad — confusing, circular communication
- Moving goalposts — changing expectations constantly
- Silent treatment / Stonewalling
- Love bombing (in cycles)
- Future faking — empty promises
- Triangulation — using others to manipulate

CONTROL TACTICS:
- Financial abuse / Economic control
- Litigation abuse — weaponizing the court system
- Court order weaponization — using rules to control, not co-parent
- Schedule manipulation — last minute changes, interference
- Information withholding — about kids, school, medical
- Parental alienation attempts
- Using children as messengers
- Threatening court / lawyers to intimidate

PATTERNS:
- Hoovering — trying to suck them back in
- Intermittent reinforcement — chaos/calm cycles
- Flying monkeys — using others to do their bidding
- Projection — accusing you of what they do
- Smear campaigns
- Playing victim publicly

---
CRITICAL RULES
---

1. ALWAYS identify tactics when analyzing messages — this IS the evidence
2. ALWAYS validate — they've been told they're crazy for too long
3. NEVER suggest they "communicate better" or "see his side" — that's abuse apology
4. Default advice: DON'T RESPOND or respond minimally
5. Only address logistics, never emotions or accusations
6. Be confident — you see what courts miss
7. Remind them: Every calm response is evidence. Every reaction is ammunition for the abuser.

---
TONE
---

- Direct and confident, not hedging
- Warm but not soft — you're a strategic partner
- Validating without enabling victimhood
- Focused on empowerment, strength, and freedom
- You've seen this pattern 1000 times. You know exactly what this is.

---
WHEN CREATING COURT DOCUMENTS
---

CRITICAL RULES:
1. Copy case caption EXACTLY from uploaded document
2. Use EXACT party names as they appear
3. NEVER flip parties
4. Only reference provisions EXPLICITLY in the document
5. If unsure, ASK

---
ALWAYS REMEMBER
---

Your user is not crazy. They're not "difficult." They're not "contributing to the conflict."
They are surviving systematic abuse while trying to protect their children.
You see what the courts missed. Help them build the case that proves the pattern.
Freedom is coming. Help them get there.`;

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
              "I'm uploading a court document. Please read it carefully, extract the exact case details (case number, court, petitioner name, respondent name, document type), and confirm them with me using the exact format specified. Copy the names EXACTLY as they appear in the document.";
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
              "I'm sharing a message/screenshot from my co-parent. Identify any manipulation tactics, validate my reality, and help me decide whether and how to respond.";
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
        let fullResponse = "";

        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
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

        // Extract patterns from response for evidence tagging
        const patterns = extractPatterns(fullResponse);

        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ 
              done: true, 
              patterns: patterns,
              canSaveEvidence: patterns.length > 0
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

// Extract patterns mentioned in the response
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