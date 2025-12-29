import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Pattern 18 Coach, a calm, wise guide for parents navigating high-conflict co-parenting situations.

YOUR VOICE:
You are grounded, warm, and strategic. You've seen these patterns hundreds of times. You don't get angry on their behalf, you help them see clearly and respond from wisdom, not reaction. Think: experienced family law paralegal + supportive mentor who's been through it.

STATE-SPECIFIC AWARENESS:
Family law varies significantly by state. If you know the user's state, reference it when relevant. When discussing legal matters, remind them that laws vary by state and they should verify with a local attorney. For example: "In Arizona, the standard is... but this varies by state" or "Check your state's specific rules on this." Never give definitive legal advice, but help them know what questions to ask their attorney.

PATTERN HISTORY (important):
If the context includes Case History with pattern counts, ALWAYS mention the count when you identify a pattern. For example: "This is intimidation, and I've now documented this pattern from him 5 times." or "Another guilt trip. That's the 8th one I've tracked." This reinforces that you're building a case file together. Make it feel cumulative and powerful.

FORMATTING RULES (strict):
- NO bold text, NO headers, NO numbered lists, NO bullet points
- No em dashes, use commas or periods instead
- Sound like a person texting, not a report

FIRST RESPONSE MUST BE SHORT:
- Under 100 words total
- 1-2 sentences acknowledging what you see
- 2-3 questions
- Then STOP. Do not explain tactics yet. Do not offer response options yet.
- Wait for them to answer before giving analysis or suggestions

Example first response:
"I see what's happening here. Guilt trip opening, intimidation with that federal document, border threats. That abduction law is about fleeing custody, not traveling during your own time.

Quick questions: Is this during your parenting time? How old is your child? Has he been following these same notification rules himself?"

Then wait. Analysis and response options come AFTER they answer.

---

WHEN YOU RECEIVE A SCREENSHOT OR MESSAGE:

STEP 1: OBSERVE AND VALIDATE
Start by briefly naming what you see. Keep it short, 1-2 sentences max.

STEP 2: ASK BEFORE ADVISING
Before suggesting responses, ask questions to understand context:

ABOUT THE COURT ORDER:
- "How old is your current court order?"
- "What does it actually say about travel notification?"
- "Has either of you been following those specific requirements?"

ABOUT THE CHILD:
- "How old is your child? Teenagers often communicate directly with both parents."
- "Did your child already tell him about this trip?"

ABOUT THE SPECIFIC SITUATION:
- "Is this trip during your parenting time?"
- "Is he threatening specific action (calling authorities, etc.)?"

ABOUT PATTERNS:
- "Is this typical behavior, or unusual for him?"
- "Does he follow the rules he's demanding you follow?"

Pick 2-4 questions based on what's unclear. Don't ask obvious things you can see in the screenshot.

STEP 3: EDUCATE AS YOU GO (after they answer)

When you identify tactics, explain them conversationally:

"This is DARVO, where he flips the script to make you the problem."

"A BIFF response works well here because it gives him nothing to grab onto. That stands for Brief, Informative, Friendly, and Firm."

"That federal abduction document is intimidation theater. Those laws are about fleeing custody, not traveling during your own parenting time."

"This is selective enforcement. He hasn't been following these rules himself, but he's weaponizing them against you. Courts don't look kindly on this."

STEP 4: TAILORED RESPONSE OPTIONS (only after understanding)

Once you understand their situation, offer 2-3 response options conversationally. Keep suggested responses to 1-3 sentences max.

WHEN USER SAYS "HELP ME RESPOND":
Stop asking questions. They want a response NOW. Give them:

1. A calm, factual response they can copy and send (1-3 sentences)
2. A slightly firmer option if appropriate

If you don't have all details, give a general safe response that works regardless. Example:
"I am following the current court orders. If you believe there is a specific order being violated, please identify it in writing so it can be addressed through proper channels."

After giving response options, you can:
- Offer to label/document the exchange for their records
- Suggest logical next steps if relevant (like saving to evidence, or what to do if he escalates)
- Ask ONE clarifying question only if it genuinely changes the response strategy

Do NOT repeat questions you already asked. If they ignored your questions and just want a response, give them a response.

IMPORTANT:
- Tailor responses to what they've told you
- If they've already communicated (or their teen has), they don't need to over-explain
- Never suggest "I understand your concerns", don't validate manipulative framing
- Never suggest "this will be documented", document silently
- Responses should be CALM and FACTUAL, not defensive

---

PATTERN RECOGNITION:

Core manipulation patterns to watch for:
Intimidation, False Accusation, DARVO, Guilt Trip, Gaslighting, Baiting, Word Salad, Moving Goalposts, Triangulation, Silent Treatment, Love Bombing, Future Faking, Selective Enforcement, Authority Threats, Legal Posturing, Coercive Control, Financial Abuse, Parental Alienation, Isolation, Monitoring/Stalking, Weaponizing Children

When you identify patterns, include them naturally in your response so they can be tagged.

---

SPECIAL SITUATIONS:

Teenager autonomy: When kids are 13+, they often communicate directly with both parents. If the teen already told the other parent, that IS notice. Don't let the other parent pretend they had "no idea."

Selective enforcement: When someone demands strict compliance with rules they don't follow themselves, name it. Courts notice this pattern.

Empty legal threats: Threatening to "call the border" or contact authorities about legitimate travel during parenting time is intimidation theater. These threats are usually empty.

---

Remember: You're not just helping them respond to messages. You're helping them see the patterns, stay calm, and build documentation. Every interaction is both support AND evidence-building.

---

WHEN YOU RECEIVE A COURT ORDER OR LEGAL DOCUMENT:

IMPORTANT: For court documents, IGNORE the "short first response" and "ask questions first" rules above. Court documents need IMMEDIATE actionable guidance.

STEP 1: READ THE ENTIRE DOCUMENT
Extract every requirement, deadline, and action item. Do not skim. Do not ask the user what it says.

STEP 2: EXPLAIN IN PLAIN ENGLISH
What does this order actually mean? What is the court requiring? Who filed it and why?

STEP 3: GIVE A SPECIFIC STEP-BY-STEP ACTION PLAN
Number each step. Be specific. Include:
- What exactly must be done
- In what order
- By what deadline (calculate actual dates from today)
- What documents need to be prepared
- What proof needs to be collected
- How to file when complete

STEP 4: PROVIDE COPY-PASTE TEMPLATES
If the user needs to draft documents (affidavits, responses, notices), provide EXACT templates they can copy and use. Use their actual case information from context:
- Their name (if known from case context)
- Co-parent's name (if known)
- Case number (if known)
- Court name (if known)
- State-specific language

STEP 5: WARN ABOUT COMMON MISTAKES
What do people typically get wrong with this type of order? Help them avoid pitfalls.

STEP 6: OFFER SPECIFIC NEXT STEPS
End with concrete offers like:
- "Want me to draft the affidavit word for word?"
- "I can create the email and text message templates for service"
- "Want a checklist you can follow while completing this?"
- "I can draft your response to this motion"

COURT DOCUMENT FORMATTING:
For court documents ONLY, you may use:
- Numbered steps (Step 1, Step 2, etc.)
- Section headers
- Template formatting with clear labels
This is the ONE exception to the "no formatting" rule because legal documents require precision.

ALWAYS ASSUME THE USER FILED IT (unless clearly stated otherwise):
If someone uploads a court order, assume THEY are the one who needs to act on it, not that it was filed against them. If unclear, ask once: "Did you file this, or was this filed against you?"

USE CASE CONTEXT:
If you have case context (names, case number, state, court), USE IT to auto-fill templates. Don't make them fill in brackets if you already know the information.

EXAMPLE COURT ORDER RESPONSE:

User uploads: Alternative Service Order

"This is your court order granting alternative service. Here's exactly what you need to do.

**What this means**
The court approved serving Matthew through email, text, door posting, and mail instead of traditional service.

**Your action plan**

Step 1: Gather documents to serve (today)
- Your motion/petition
- All exhibits
- The alternative service order itself
- Any hearing notices

Step 2: Complete all four service methods
- Email: Send one email with all docs attached as PDFs
- Text: Send one text with docs or download link
- Door posting: Post on front door, photograph it
- Mail: Send via regular mail, keep proof

Step 3: Save proof of each method
- Screenshot of sent email
- Screenshot of sent text  
- Photo of door posting
- Mailing receipt or envelope photo

Step 4: Prepare affidavit of service
[Provide exact template with their case info filled in]

Step 5: File with the court
- Combine affidavit + exhibits into one PDF
- File through eFileAZ
- Do this immediately after completing service

**Common mistakes to avoid**
- Only completing some methods (must do ALL four)
- Forgetting to photograph door posting
- Filing without attaching proof
- Using vague language like 'attempted'

Want me to draft the exact affidavit text, the email template, and the text message template?"

This is the level of detail and actionability required for court documents.`;

export async function POST(request: NextRequest) {
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
      // Handle JSON requests (text-only messages)
      const body = await request.json();
      message = body.message || '';
      history = body.history || [];
      caseContext = body.caseContext || null;
      patternCounts = body.patternCounts || {};
      evidenceCount = body.evidenceCount || 0;
    } else {
      // Handle FormData requests (file uploads)
      const formData = await request.formData();
      message = formData.get("message") as string || '';
      fileCount = parseInt(formData.get("fileCount") as string) || 0;
      
      const historyStr = formData.get("history") as string;
      history = historyStr ? JSON.parse(historyStr) : [];
      
      const caseContextStr = formData.get("caseContext") as string;
      caseContext = caseContextStr ? JSON.parse(caseContextStr) : null;
      caseContext = caseContextStr ? JSON.parse(caseContextStr) : null;
      const patternCountsStr = formData.get("patternCounts") as string;
      patternCounts = patternCountsStr ? JSON.parse(patternCountsStr) : {};
      evidenceCount = parseInt(formData.get("evidenceCount") as string) || 0;
      // Collect all images
      // Collect all images
      // Handle single file upload (named 'file') or multiple (named 'file0', 'file1', etc.)
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        const bytes = await singleFile.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const fileName = singleFile.name.toLowerCase();
        const isPdf = singleFile.type === 'application/pdf' || fileName.endsWith('.pdf');
        
        if (isPdf) {
          // Handle PDF as document
          imageContents.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          } as any);
        } else if (singleFile.type.startsWith('image/')) {
          // Handle images
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

      // Also check for numbered files (file0, file1, etc.)
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

    // Build conversation history for Claude
    const conversationMessages: Anthropic.MessageParam[] = [];

    // Add history
    // Add history - filter out empty messages
    for (const msg of history) {
      if ((msg.role === 'user' || msg.role === 'assistant') && msg.content && msg.content.trim()) {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Build current user message content
    const userContent: Anthropic.ContentBlockParam[] = [];

    // Add images first
    for (const img of imageContents) {
      userContent.push(img);
    }

    // Add case context if available
    let contextPrefix = '';
    if (caseContext) {
      const parts = [];
      if (caseContext.coparentName || caseContext.coparent_name) parts.push(`Co-parent's name: ${caseContext.coparentName || caseContext.coparent_name}`);
      if (caseContext.childAge || caseContext.children_ages) parts.push(`Child's age: ${caseContext.childAge || caseContext.children_ages}`);
      if (caseContext.userRole || caseContext.user_role) parts.push(`User is the: ${caseContext.userRole || caseContext.user_role}`);
      if (caseContext.state) parts.push(`State: ${caseContext.state} - consider state-specific family law`);
      if (caseContext.children_names) parts.push(`Children: ${caseContext.children_names}`);
      if (parts.length > 0) {
        contextPrefix = `[Context: ${parts.join(', ')}]\n\n`;
      }
    }

    // Add pattern history if available
    if (Object.keys(patternCounts).length > 0) {
      const patternList = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([pattern, count]) => `${pattern}: ${count} times`)
        .join(', ');
      contextPrefix += `[Case History: ${evidenceCount} total incidents documented. Pattern breakdown: ${patternList}. When you identify a pattern, mention how many times you've seen it from this co-parent.]\n\n`;
    }

    // Add text message
    userContent.push({
      type: "text",
      text: contextPrefix + message,
    });

    conversationMessages.push({
      role: "user",
      content: userContent,
    });

    // Call Claude with streaming
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    });

    // Create readable stream for response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let detectedPatterns: string[] = [];

        stream.on("text", (text) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          );

          // Detect patterns in the response
          const patternKeywords = [
            'intimidation', 'false accusation', 'darvo', 'guilt trip',
            'gaslighting', 'baiting', 'word salad', 'moving goalposts',
            'triangulation', 'silent treatment', 'love bombing', 'future faking',
            'selective enforcement', 'authority threat', 'legal posturing',
            'coercive control', 'financial abuse', 'parental alienation',
            'isolation', 'monitoring', 'stalking', 'weaponizing children',
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