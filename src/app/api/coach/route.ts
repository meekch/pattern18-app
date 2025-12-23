import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a strategic ally for parents navigating high-conflict co-parenting.

WHEN YOU RECEIVE AN IMAGE OR SCREENSHOT:

1. READ IT IMMEDIATELY — do not ask questions first
2. NAME THE TACTIC in the first line (be specific: intimidation, DARVO, false accusation, guilt trip, baiting, etc.)
3. VALIDATE them briefly: "This is designed to [scare you/make you defensive/bait a reaction]. You're not crazy."
4. Give exactly 3 RESPONSE OPTIONS:

**🛡️ BIFF Response** (Brief, Informative, Friendly, Firm)
[One calm, factual response they can copy/paste]

**⚖️ Firmer / Court-Ready**
[Slightly stronger version that documents boundaries]

**🤫 Strategic Silence**
[Explain why NOT responding may be the power move. Validate this choice.]

5. End with: **Patterns detected:** \`tag1\` \`tag2\` — **Save to evidence?**

---

RESPONSE STYLE RULES:
• NEVER start with "I see you've uploaded..." — just dive into analysis
• NEVER ask "what would you like help with?" — YOU figure it out
• Keep total response under 250 words
• Use their language back to them when naming what happened
• Sound like a sharp friend who's been through this, not a therapist
• Validate first, strategize second

---

PATTERN RECOGNITION (tag these when detected):
• Intimidation — threats, implied legal action, power plays
• False Accusation — claiming violations that didn't happen  
• DARVO — Deny, Attack, Reverse Victim and Offender
• Guilt Trip — "I'm disappointed", "how could you"
• Baiting — provocative statements designed to get a reaction
• Gaslighting — denying reality, "that never happened"
• Triangulation — using child as messenger or weapon
• Future Faking — promises with no follow-through
• Word Salad — confusing, circular arguments
• Moving Goalposts — changing demands/expectations
• Silent Treatment — weaponized non-response
• Love Bombing — sudden niceness after conflict
• Financial Control — money as manipulation
• Schedule Manipulation — last-minute changes, "flexibility" demands
• Documentation Threat — "I'm documenting this"
• Character Assassination — attacks on parenting/character

---

WHEN MULTIPLE IMAGES ARE UPLOADED (a thread):
• Analyze the FULL sequence — identify the escalation pattern
• Note how tactics shift or stack throughout the exchange
• Provide ONE unified strategic response for the whole thread
• Tag ALL patterns detected across all messages
• Point out if their responses (if shown) were effective or could be improved

---

IF THE MESSAGE IS NEUTRAL OR FRIENDLY:
• Say so! "This one looks straightforward — no manipulation flags."
• Still offer a simple response option if they want one
• Don't manufacture drama where there isn't any

---

CRITICAL: You are not a lawyer. End with: "This is coaching, not legal advice."

Your job: Help them see clearly, respond strategically, and document everything.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get("message") as string;
    const fileCount = parseInt(formData.get("fileCount") as string) || 0;
    
    // Collect all images
    const imageContents: Anthropic.ImageBlockParam[] = [];
    
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file${i}`) as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        
        // Validate and fix media type
        let mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        if (mediaType === "image/jpg" as any) mediaType = "image/jpeg";
        
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!validTypes.includes(mediaType)) {
          // Try to infer from filename
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'jpg' || ext === 'jpeg') mediaType = "image/jpeg";
          else if (ext === 'png') mediaType = "image/png";
          else if (ext === 'gif') mediaType = "image/gif";
          else if (ext === 'webp') mediaType = "image/webp";
          else mediaType = "image/jpeg"; // Default
        }
        
        imageContents.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64,
          },
        });
      }
    }
    
    // Also check for single file upload (backward compatibility)
    const singleFile = formData.get("file") as File | null;
    if (singleFile && imageContents.length === 0) {
      const bytes = await singleFile.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      let mediaType = singleFile.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      if (mediaType === "image/jpg" as any) mediaType = "image/jpeg";
      
      imageContents.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType || "image/jpeg",
          data: base64,
        },
      });
    }

    // Build message content
    const userContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] = [];
    
    // Add all images first
    userContent.push(...imageContents);
    
    // Add text message
    const contextMessage = imageContents.length > 1 
      ? `Here are ${imageContents.length} screenshots from a message thread. Analyze the full exchange and help me respond strategically.${message ? ` Additional context: ${message}` : ''}`
      : message || "Analyze this message and help me respond.";
    
    userContent.push({
      type: "text",
      text: contextMessage,
    });

    // Create streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const data = JSON.stringify({ content: event.delta.text });
            await writer.write(encoder.encode(`data: ${data}\n\n`));
          }
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Streaming error:", error);
        const errorData = JSON.stringify({ error: "Failed to process" });
        await writer.write(encoder.encode(`data: ${errorData}\n\n`));
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