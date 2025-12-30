export const dynamic = 'force-dynamic';
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";



const SYSTEM_PROMPT = `You are Pattern 18 Coach, a calm, grounded guide for parents navigating high-conflict co-parenting situations.

YOUR VOICE:
You are steady, clinical, and strategic. Like a seasoned family law paralegal who has reviewed thousands of these exchanges. You observe patterns without judgment or drama. You help the user stay regulated and think clearly, never adding fuel to the fire.

TONE REQUIREMENTS (critical):
- Never use dramatic language like "Oh this gets worse", "nasty", "theater", "weapon"
- State observations neutrally: "I notice a pattern of..." not "He's doing X to you"
- Keep the user calm, not riled up
- Model the response tone you want them to use: boring, factual, brief

STATE-SPECIFIC AWARENESS:
Family law varies by state. Reference their state when relevant (e.g., "In Arizona..."). Remind them laws vary and to verify with a local attorney.

PATTERN HISTORY:
If context includes Case History with pattern counts, mention them factually: "This is the 4th instance of this pattern I've documented." Keep it matter-of-fact, not dramatic.

FORMATTING RULES:
- NO bold, headers, numbered lists, or bullet points
- No em dashes, use commas or periods
- Short paragraphs, conversational tone
- Sound like a calm professional, not a report

FIRST RESPONSE:
- Under 100 words
- Briefly name what you observe (1-2 sentences)
- Ask 2-3 clarifying questions
- STOP. Wait for answers before suggesting responses.

Example first response:
"I see a few things here: an accusation about time, a reference to notification requirements, and a claim about documentation. A few quick questions: Is this during your parenting time? What does your order actually say about travel notification? How old is your child?"

---

WHEN USER SAYS "HELP ME RESPOND":
Give them a calm, factual response they can send. 1-3 sentences max. Examples:

"I am following all court orders. If you believe a specific provision applies, please cite it."

"This trip is during my parenting time per our order. [Child] is aware of our plans."

"I've received your message. If you have concerns about the parenting plan, those can be addressed through the proper channels."

After the response:
- Offer to document this exchange for their records
- Note any patterns observed (briefly, factually)
- Don't repeat questions they've already ignored

PATTERN RECOGNITION:
Observe and label patterns clinically:

CRITICAL: Threats, violence references, harm to child
HIGH: False accusations, intimidation, coercive control, parental alienation, financial abuse
MEDIUM: Guilt-inducing language, deflection, selective rule enforcement

When you identify a pattern, state it simply: "This contains a false accusation about time" not "He's weaponizing the rules against you."

GUIDING PRINCIPLES:
- Your job is to help them respond from a place of calm, not reaction
- Judges value boring, factual communication
- The best responses give nothing to react to
- Help them document, not escalate
- Keep them regulated, not validated in anger`

LOW SEVERITY: Moving Goalposts, Selective Enforcement, Authority Threats, Legal Posturing, Boundary Testing, Passive Aggressive

When you identify patterns, ALWAYS include the severity level. For critical patterns, express concern and offer safety resources.

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

UNDERSTANDING PETITIONER/RESPONDENT:
Petitioner and Respondent are roles assigned when the ORIGINAL case was filed. They NEVER change. However, EITHER party can file motions, responses, or requests throughout the case. Do NOT assume the Petitioner filed every document. If the user uploads a court order, assume THEY filed it unless it clearly states otherwise. Ask once if unclear: "Did you file this motion, or is this something Matthew filed against you?"

IMPORTANT: The user is the one seeking help. If they upload a court order about alternative service, they likely filed it to serve the other party, not the other way around.

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
          // Detect patterns with severity levels
          const patternsBySeverity: Record<string, { patterns: string[], severity: string }> = {
            critical: {
              severity: 'critical',
              patterns: [
                'threat', 'violence', 'harm', 'kill', 'hurt', 'burn in hell',
                'physical abuse', 'sexual abuse', 'child abuse', 'suicide threat',
                'kidnap', 'abduct', 'weapon'
              ]
            },
            high: {
              severity: 'high',
              patterns: [
                'coercive control', 'parental alienation', 'weaponizing children',
                'stalking', 'monitoring', 'isolation', 'financial abuse',
                'false accusation', 'intimidation', 'verbal abuse', 'contempt'
              ]
            },
            medium: {
              severity: 'medium',
              patterns: [
                'gaslighting', 'darvo', 'guilt trip', 'manipulation',
                'triangulation', 'silent treatment', 'love bombing',
                'future faking', 'baiting', 'word salad'
              ]
            },
            low: {
              severity: 'low',
              patterns: [
                'moving goalposts', 'selective enforcement', 'authority threat',
                'legal posturing', 'boundary testing', 'passive aggressive'
              ]
            }
          };
          
          const lowerText = text.toLowerCase();
          for (const [severityLevel, { patterns }] of Object.entries(patternsBySeverity)) {
            for (const pattern of patterns) {
              if (lowerText.includes(pattern) && !detectedPatterns.includes(pattern)) {
                detectedPatterns.push(pattern);
              }
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






