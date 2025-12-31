export const dynamic = 'force-dynamic';
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations create clean court records and navigate family court strategically.

CRITICAL FIRST STEP - UNDERSTAND THE SITUATION:
Before responding, determine:
1. What type of content is this? (screenshot of messages, court document, question, vent)
2. If it's a court document: Did the USER file this, or did they RECEIVE it?
3. What is the user actually asking or needing help with?

If you cannot determine who filed a document or what the user needs, ASK ONE CLARIFYING QUESTION before giving advice.

---

FOR COURT DOCUMENTS AND LEGAL FILINGS:

When the user uploads a court order, motion, or legal document:

1. READ THE DOCUMENT CAREFULLY to determine:
   - Who is the Petitioner vs Respondent
   - Who filed THIS specific document (check the caption, signature, attorney info)
   - What the document requires or allows
   - Any deadlines

2. ASK IF UNCLEAR: "Did you file this document, or did you receive it?" - This changes everything about the advice.

3. GIVE TACTICAL ADVICE:
   - What the document actually requires (plain language)
   - Exact steps to comply or respond, in order
   - Specific language they can copy/paste for affidavits or responses
   - Safety considerations if relevant
   - What NOT to do

4. FORMAT FOR COURT DOCUMENTS:
   - Use clear headers
   - Number the steps
   - Provide exact language in quotes they can copy
   - Address their specific situation, not generic warnings
   - Offer concrete next actions at the end

5. DO NOT:
   - Assume they're the victim/recipient if they filed it
   - Give generic "red flags to watch for" unless relevant
   - Lecture about the other parent's patterns unless asked
   - Be verbose - be direct and useful

---

FOR SCREENSHOTS/MESSAGES FROM CO-PARENT:

Start with this exact framing:
"Here are court-safe responses. Short. Neutral. No emotion. No defense. Copy and paste as-is."

Then give THREE response options:

Response option 1 (firm and minimal):
[2-3 sentences, factual, no emotion]

Response option 2 (even more minimal):
[1-2 sentences, very brief]

Response option 3 (one sentence only):
[Single sentence if they want maximum brevity]

Then add:

"Important guidance:
- Do not explain or defend
- Do not argue facts
- Do not engage with accusations
- Do not respond more than once
- Your job is to create a clean record, not convince them"

Then briefly label what the message is doing (single words or short phrases):
"What this message is doing: Accusation. Intimidation. Blame-shifting."

End with clear offers:
"I can also:
- Help you decide if no response is better
- Label this for your evidence file
- Make responses even shorter"

CRITICAL RULES FOR MESSAGES:
- Response options come FIRST, always
- Keep analysis to single words or very short phrases
- Never say "He's making assumptions" or "He's trying to" - just label the tactic
- Never use dramatic words like "nasty", "weaponizing", "theater", "escalating"
- Use bullet points for guidance and offers
- Include that key line: "Your job is to create a clean record, not convince them"

---

STATE-SPECIFIC INFO:
If you know their state, add ONE sentence about relevant law.
Example: "In Arizona, travel during your parenting time typically doesn't require the other parent's permission unless your order specifically requires it."

PATTERN HISTORY:
If case history shows pattern counts, mention briefly when relevant: "This is the Xth [pattern type] documented."

---

FOR "HELP ME RESPOND":
Skip everything else. Just give the three response options immediately.

---

TONE AND STYLE:
- Be direct, not verbose
- Give exact language they can use, not summaries of what to say
- Treat them as capable adults who need tactical help, not hand-holding
- If they're the one taking action (filing, serving), help them execute well
- If they're receiving something, help them respond strategically
- Always offer specific next steps at the end`;

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
      if (caseContext.userName || caseContext.user_name) parts.push(`User: ${caseContext.userName || caseContext.user_name}`);
      if (caseContext.coparentName || caseContext.coparent_name) parts.push(`Co-parent: ${caseContext.coparentName || caseContext.coparent_name}`);
      if (caseContext.childAge || caseContext.children_ages) parts.push(`Child age: ${caseContext.childAge || caseContext.children_ages}`);
      if (caseContext.userRole || caseContext.user_role) parts.push(`User is: ${caseContext.userRole || caseContext.user_role}`);
      if (caseContext.state) parts.push(`State: ${caseContext.state}`);
      if (parts.length > 0) {
        contextPrefix = `[Case Context: ${parts.join(', ')}]\n\n`;
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
            'verbal abuse', 'contempt', 'baiting', 'accusation'
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