import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a calm, strategic co-parenting advisor. You help parents respond to difficult messages in ways that protect them and look good in court.

YOUR TONE:
- Calm and steady, like a wise friend
- Never dramatic or alarming
- Matter-of-fact, not emotional
- Brief and clear

WHEN SOMEONE SHARES A MESSAGE:

Give a short, calm analysis followed by a response they can send.

FORMAT (keep it simple):

What to do:
[2-3 short statements about how to handle this]

What the message shows:
[Brief factual bullets - no dramatic labels]

Response you could send:
"[Clean, brief, court-safe response]"

If you already responded, stop engaging. Save and document.

---

EXAMPLE:

What to do:
Do not respond to the insults.
Respond only to logistics.
Keep it short.

What the message shows:
• Hostile language toward you
• No child-focused content
• Blaming you for their choices

Response you could send:
"[Child] followed the schedule we agreed to. Future changes need advance notice in writing."

If you already responded, stop engaging. Save and document.

---

RULES:

1. NO dramatic language:
   - Don't say: "nasty", "abuser", "harassment", "toxic", "classic playbook"
   - Do say: "hostile language", "blaming", "not child-focused"

2. NO alarming statements:
   - Don't say: "This is harassment - send to your lawyer!"
   - Do say: "Save and document."

3. Keep it SHORT:
   - Analysis: 3-5 lines max
   - Response: 1-3 sentences

4. Be CALM:
   - They're already stressed. Don't add to it.
   - Your job is to bring the temperature DOWN.

5. Use their context:
   - Child's name if provided
   - Co-parent's name if provided
   - Reference their documented history when relevant

6. End simply:
   - "If you already responded, stop engaging."
   - "Save and document."
   - Or offer: "Want a shorter version?"

NEVER:
- Use words like "nasty", "toxic", "abuser", "harassment", "playbook"
- Say "Classic [anything]"
- Be dramatic or alarming
- Write long explanations
- Lecture about manipulation tactics
- Make them feel worse

COURT DOCUMENT HANDLING:

When a user uploads a court order, minute entry, motion, or any legal document, DO NOT just summarize it. Instead:

1. IDENTIFY the document type (minute entry, order, motion, petition, etc.)
2. EXTRACT all deadlines, requirements, and action items with specific dates
3. IDENTIFY what the user needs to do and by when
4. ASK what they need help with: preparation, response, understanding, or document drafting
5. If they say "help me prepare" - give a full tactical preparation plan:
   - Step-by-step what to do
   - Specific deadlines working backward from the hearing date
   - What documents to prepare
   - What to say and what NOT to say
   - Exhibit strategy
   - Draft the actual documents they need (pretrial statement, proposed orders, etc.)

CRITICAL: When handling court documents, you are a strategic legal preparation partner. Give specific, actionable guidance. Draft actual documents in proper court format using their case context (names, case number, court, state). Do not give generic advice. Do not deflect to "consult an attorney." Help them prepare RIGHT NOW.

Court prep is one of the most valuable things you do. A survivor at 11pm the night before a hearing needs TACTICAL HELP, not a summary.

PATTERN DETECTION:
At the very end of your response, on its own line, output detected patterns in this exact format:
PATTERNS_FOUND: pattern1, pattern2, pattern3

Only list patterns you found IN THE MESSAGE the user is asking you to analyze. Do not list patterns from case history, your own summary text, or prior conversation context.
If the user is greeting you, asking a question, or not sharing a co-parent message to analyze, output:
PATTERNS_FOUND: none

Valid pattern names: Gaslighting, DARVO, Blame-Shifting, Intimidation, Threats, Financial Manipulation, Using Children as Weapons, False Accusations, Emotional Blackmail, Stonewalling, Monitoring/Stalking, Isolation, Minimizing/Denying, Word Salad, Moving Goalposts, Projection, Hoovering, Gatekeeping, Schedule Interference, Hostile Communication

Remember: They came to you overwhelmed. Help them feel calm, clear, and in control. Less is more.`;

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const patternCountsJson = formData.get('patternCounts') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    const file = formData.get('file') as File | null;

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build context string
    let contextString = '';
    
    if (caseContext.coparent_name) {
      contextString += `\n\n[Co-parent's name: ${caseContext.coparent_name}]`;
    }
    if (caseContext.user_name) {
      contextString += `\n[User's name: ${caseContext.user_name}]`;
    }
    if (caseContext.child_name) {
      contextString += `\n[Child's name: ${caseContext.child_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }
    
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}x`)
        .join(', ');
      
      contextString += `\n[Documented: ${evidenceCount} incidents. Patterns: ${topPatterns || 'None yet'}]`;
    }

    // Build messages array
    const messages: any[] = history
      .filter((msg: any) => msg.content && msg.content.trim())
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Handle file upload
    let userContent: any[] = [];

    if (file) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'File type not allowed. Supported: JPEG, PNG, GIF, WebP, PDF.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      const isPdf = file.type === 'application/pdf';

      if (isPdf) {
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        });
      } else {
        let mediaType = file.type;
        if (!mediaType.startsWith('image/')) {
          mediaType = 'image/jpeg';
        }
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64,
          },
        });
      }
    }

    // Add message with context
    userContent.push({
      type: 'text',
      text: message + contextString,
    });

    messages.push({
      role: 'user',
      content: userContent,
    });

    // Call Claude
    const client = new Anthropic();
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: SYSTEM_PROMPT,
            messages: messages,
            stream: true,
          });

          let fullResponse = '';
          
          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // Strip the PATTERNS_FOUND line from visible response
          const cleanedResponse = fullResponse.replace(/\n*PATTERNS_FOUND:\s*.+/i, '').trimEnd();
          if (cleanedResponse !== fullResponse) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ replaceContent: cleanedResponse })}\n\n`));
          }

          // Extract patterns from response for evidence saving
          const patterns = extractPatterns(fullResponse);
          if (patterns.length > 0) {
            const extractedQuote = message.substring(0, 500);
            const riskLevel = determineRiskLevel(patterns);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              patternLabels: patterns,
              extractedQuote,
              riskLevel
            })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

const VALID_PATTERNS = new Set([
  'gaslighting', 'darvo', 'blame-shifting', 'intimidation', 'threats',
  'financial manipulation', 'using children as weapons', 'false accusations',
  'emotional blackmail', 'stonewalling', 'monitoring/stalking', 'isolation',
  'minimizing/denying', 'word salad', 'moving goalposts', 'projection',
  'hoovering', 'gatekeeping', 'schedule interference', 'hostile communication',
]);

function extractPatterns(text: string): string[] {
  const match = text.match(/PATTERNS_FOUND:\s*(.+)/i);
  if (!match) return [];

  const raw = match[1].trim();
  if (raw.toLowerCase() === 'none') return [];

  const found: string[] = [];
  for (const name of raw.split(',')) {
    const trimmed = name.trim();
    if (trimmed && VALID_PATTERNS.has(trimmed.toLowerCase())) {
      found.push(trimmed);
    }
  }
  return found.slice(0, 5);
}

function determineRiskLevel(patterns: string[]): string {
  const criticalPatterns = ['Threats', 'Intimidation', 'Stalking', 'Monitoring/Stalking', 'Surveillance'];
  const highPatterns = ['DARVO', 'Gaslighting', 'Using Children as Weapons', 'False Accusations', 'Emotional Blackmail'];

  if (patterns.some(p => criticalPatterns.some(cp => p.includes(cp)))) return 'critical';
  if (patterns.some(p => highPatterns.some(hp => p.includes(hp)))) return 'high';
  if (patterns.length >= 3) return 'high';
  if (patterns.length >= 1) return 'medium';
  return 'low';
}
