export const dynamic = 'force-dynamic';
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond to manipulative messages and build court documentation.

YOUR APPROACH:
Lead with court-ready responses. No drama. No emotion. No lengthy analysis first.

WHEN USER UPLOADS A SCREENSHOT OR MESSAGE:

IMMEDIATELY provide:

1. COURT-SAFE RESPONSE OPTIONS
Give 2-3 copy-paste responses they can send right now. Each should be:
- 1-2 sentences maximum
- Neutral and factual
- No emotion, no defense, no explanation
- Nothing the other party can twist or react to

Example responses:
"I am acting within the court order. I will not engage further on this topic."
"I do not agree with your characterization. Any concerns can be addressed through proper legal channels."
"This trip is during my parenting time per our order."

2. BRIEF TACTICAL ANALYSIS
In 2-3 sentences, clinically label what the message is doing:
- "This message contains: accusation, intimidation, record-building attempt."
- "Tactics present: false accusation about time, legal posturing, blame-shifting."

3. GUIDANCE (brief)
- "Do not explain or defend."
- "Do not respond more than once."
- "Your job is to create a clean record, not convince him."

4. OFFER NEXT STEPS
- "Want me to help you label this for your evidence file?"
- "I can draft an even shorter response if needed."
- "Want help deciding if no response is better here?"

FORMATTING:
- Short paragraphs only
- No bullet points or numbered lists in analysis
- Response options can be numbered for clarity
- No headers except "Response options:" when giving responses
- No bold text
- No em dashes

TONE:
- Clinical, not dramatic
- Calm, not reactive
- Strategic, not emotional
- Brief, not verbose

WHAT NOT TO DO:
- Don't say "Oh this gets worse" or "This is nasty"
- Don't use words like "theater", "weaponizing", "escalating badly"
- Don't ask multiple questions before giving responses
- Don't write lengthy analysis paragraphs
- Don't validate anger or add fuel
- Don't say "I understand your concerns" in suggested responses
- Don't include "this will be documented" in responses

PATTERN LABELING:
When you identify patterns, state them simply:
- "This contains a false accusation."
- "This is intimidation."
- "This is blame-shifting."

Not: "He's weaponizing the rules against you in a nasty escalation."

CRITICAL PATTERNS (mention severity):
Threats, violence, harm to child, kidnapping threats - flag as critical, offer safety resources

HIGH PATTERNS:
False accusations, intimidation, coercive control, parental alienation

MEDIUM PATTERNS:
Gaslighting, guilt-inducing language, DARVO, manipulation

STATE AWARENESS:
If you know their state, mention relevant law briefly. Example: "In Arizona, travel during your parenting time typically doesn't require advance notice unless your order specifically requires it."

CASE CONTEXT:
If you have their case history (pattern counts), mention it factually: "This is the 4th false accusation I've documented."

WHEN USER SAYS "HELP ME RESPOND":
Skip all analysis. Give them 2-3 copy-paste responses immediately. Keep each under 2 sentences.

---

FOR COURT DOCUMENTS (orders, motions, filings):

This is the ONE exception where you provide detailed, structured guidance:
- Read the entire document
- Explain what it means in plain English
- Give step-by-step action plan with deadlines
- Provide exact templates they can copy
- Warn about common mistakes

Use numbered steps and clear structure for court documents only.`;

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const contentType = request.headers.get('content-type') || '';

    let message: string = '';
    let fileCount = 0;
    let history: any[] = [];
    let caseContext: any = null;
    let patternCounts: Record<string, number> = {};
    let evidenceCount: number = 0;
    const imageContents: Anthropic.ImageBlockParam[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      message = body.message || '';
      history = body.history || [];
      caseContext = body.caseContext || null;
      patternCounts = body.patternCounts || {};
      evidenceCount = body.evidenceCount || 0;
    } else {
      const formData = await request.formData();
      message = formData.get("message") as string || '';
      fileCount = parseInt(formData.get("fileCount") as string) || 0;

      const historyStr = formData.get("history") as string;
      history = historyStr ? JSON.parse(historyStr) : [];

      const caseContextStr = formData.get("caseContext") as string;
      caseContext = caseContextStr ? JSON.parse(caseContextStr) : null;
      
      const patternCountsStr = formData.get("patternCounts") as string;
      patternCounts = patternCountsStr ? JSON.parse(patternCountsStr) : {};
      evidenceCount = parseInt(formData.get("evidenceCount") as string) || 0;
      
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        const bytes = await singleFile.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const fileName = singleFile.name.toLowerCase();
        const isPdf = singleFile.type === 'application/pdf' || fileName.endsWith('.pdf');

        if (isPdf) {
          imageContents.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          } as any);
        } else if (singleFile.type.startsWith('image/')) {
          let mediaType = singleFile.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
          if (mediaType === "image/jpg" as any) mediaType = "image/jpeg";
          const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
          if (!validTypes.includes(mediaType)) {
            const ext = fileName.split('.').pop();
            if (ext === 'jpg' || ext === 'jpeg') mediaType = "image/jpeg";
            else if (ext === 'png') mediaType = "image/png";
            else if (ext === 'gif') mediaType = "image/gif";
            else if (ext === 'webp') mediaType = "image/webp";
            else mediaType = "image/jpeg";
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

      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File | null;
        if (file && file.type.startsWith('image/')) {
          const bytes = await file.arrayBuffer();
          const base64 = Buffer.from(bytes).toString("base64");

          let mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
          if (mediaType === "image/jpg" as any) mediaType = "image/jpeg";

          const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
          if (!validTypes.includes(mediaType)) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'jpg' || ext === 'jpeg') mediaType = "image/jpeg";
            else if (ext === 'png') mediaType = "image/png";
            else if (ext === 'gif') mediaType = "image/gif";
            else if (ext === 'webp') mediaType = "image/webp";
            else mediaType = "image/jpeg";
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
    }

    const conversationMessages: Anthropic.MessageParam[] = [];

    for (const msg of history) {
      if ((msg.role === 'user' || msg.role === 'assistant') && msg.content && msg.content.trim()) {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    const userContent: Anthropic.ContentBlockParam[] = [];

    for (const img of imageContents) {
      userContent.push(img);
    }

    let contextPrefix = '';
    if (caseContext) {
      const parts = [];
      if (caseContext.coparentName || caseContext.coparent_name) parts.push(`Co-parent: ${caseContext.coparentName || caseContext.coparent_name}`);
      if (caseContext.childAge || caseContext.children_ages) parts.push(`Child age: ${caseContext.childAge || caseContext.children_ages}`);
      if (caseContext.userRole || caseContext.user_role) parts.push(`User is: ${caseContext.userRole || caseContext.user_role}`);
      if (caseContext.state) parts.push(`State: ${caseContext.state}`);
      if (parts.length > 0) {
        contextPrefix = `[Context: ${parts.join(', ')}]\n\n`;
      }
    }

    if (Object.keys(patternCounts).length > 0) {
      const patternList = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      contextPrefix += `[Case history: ${evidenceCount} incidents. Top patterns: ${patternList}]\n\n`;
    }

    userContent.push({
      type: "text",
      text: contextPrefix + message,
    });

    conversationMessages.push({
      role: "user",
      content: userContent,
    });

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let detectedPatterns: string[] = [];

        stream.on("text", (text) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          );

          const patternKeywords = [
            'threat', 'intimidation', 'false accusation', 'coercive control',
            'parental alienation', 'gaslighting', 'darvo', 'guilt trip',
            'manipulation', 'blame-shifting', 'stalking', 'financial abuse',
            'verbal abuse', 'contempt', 'baiting'
          ];

          const lowerText = text.toLowerCase();
          for (const pattern of patternKeywords) {
            if (lowerText.includes(pattern) && !detectedPatterns.includes(pattern)) {
              detectedPatterns.push(pattern);
            }
          }
        });

        stream.on("end", () => {
          if (detectedPatterns.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ patterns: detectedPatterns })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        });

        stream.on("error", (error) => {
          console.error("Stream error:", error);
          controller.error(error);
        });
      },
    });

    return new Response(readable, {
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
