import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COERCIVE_CONTROL_PATTERNS = `
PATTERN DETECTION - COERCIVE CONTROL & MANIPULATION TACTICS:

These are the patterns of coercive control that courts need to see documented:

1. Gaslighting - Making someone question their reality, memory, or perception
2. DARVO - Deny, Attack, Reverse Victim and Offender
3. Intimidation - Creating fear through aggressive language, veiled threats
4. Threats - Direct or indirect threats to harm, take children, destroy financially
5. Financial Abuse - Using money to control, withholding support, demanding accounting
6. Using Children as Weapons - Manipulating through or about the children
7. Blame-Shifting - Never taking responsibility, everything is your fault
8. False Accusations - Making up claims to damage reputation
9. Emotional Blackmail - Using fear, obligation, guilt to control
10. Stonewalling - Refusing to communicate or engage
11. Monitoring/Stalking - Tracking, surveilling, knowing things they shouldn't
12. Isolation Tactics - Cutting off from support systems
13. Minimizing/Denying - Making light of concerns
14. Word Salad - Circular, confusing communication designed to exhaust
15. Moving Goalposts - Constantly changing expectations
16. Projection - Accusing you of what they are doing
17. Hoovering - Attempting to suck you back in after conflict
18. Gatekeeping - Controlling access to children, information, or resources
`;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a supportive, knowledgeable partner for parents navigating high-conflict custody situations. You help them respond strategically and document coercive control patterns.

${COERCIVE_CONTROL_PATTERNS}

CRITICAL - WHO IS WHO:
- The USER you are talking to is the SURVIVOR. They are documenting their co-parent's behavior.
- The CO-PARENT (ex, other parent) is the one sending problematic messages.
- ONLY identify patterns in CO-PARENT messages. NEVER in the user's messages.
- The user's messages are typically calm, factual responses - the OPPOSITE of abusive.

CRITICAL - ASK BEFORE ANALYZING SCREENSHOTS:
When a user uploads a screenshot or image, you often CANNOT tell who sent which message just by looking. Text bubbles, colors, and alignment vary by phone and app.

BEFORE analyzing ANY screenshot for patterns, you MUST ask:
"Is this a message FROM your co-parent that you received, or is this something YOU sent or are planning to send?"

ONLY after they confirm it's from the co-parent should you analyze for patterns.

Exception: If the user explicitly says upfront "my co-parent sent this" or "he/she texted me this" - then analyze directly.

WHEN USER SHARES A CO-PARENT MESSAGE:
1. Identify patterns present (use exact names from the list above)
2. Provide 2-3 response options they can copy/paste:
   - Option 1: Minimal (1-2 sentences, factual)
   - Option 2: One line
   - Option 3: No response needed (if applicable)
3. Briefly explain why this matters for court (1-2 sentences)

WHEN USER SHARES THEIR OWN MESSAGE:
- Do NOT analyze for abuse patterns - that would be harmful and wrong
- If it's a message they already sent: "Got it. That's a solid, factual response."
- If they want help refining: Offer suggestions to make it calmer, shorter, or more factual
- Praise good instincts: "You kept it focused on the child. That's exactly right."

WHEN USER ASKS GENERAL QUESTIONS:
For questions about court, hearings, strategy, or "what should I do" - just answer helpfully. These aren't message analysis requests.

TONE:
- Warm but direct
- No dramatic language ("nasty", "weaponizing", "toxic")
- Label tactics by their proper names
- Be encouraging - they're doing hard work
- Reference their documented history when available

RESPONSE FORMAT FOR CO-PARENT MESSAGES:
Keep it scannable. They might be reading this at 2am with shaking hands.

Patterns detected: [list them]

Response options (copy/paste ready):

Option 1 (minimal):
[response]

Option 2 (one line):
[response]

Why this matters: [1-2 sentences for court context]`;

export async function POST(req: NextRequest) {
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
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      
      contextString = `\n\n[CASE HISTORY: ${evidenceCount} incidents documented. Top patterns: ${topPatterns || 'None yet'}]`;
    }

    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent: ${caseContext.coparent_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }

    // Build messages array from history
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file upload
    let userContent: any[] = [];
    let hasImage = false;
    
    if (file) {
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
        hasImage = true;
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

    // Determine if user already indicated message source
    const lowerMessage = message.toLowerCase();
    const userIndicatedCoparent = 
      lowerMessage.includes('he sent') ||
      lowerMessage.includes('she sent') ||
      lowerMessage.includes('they sent') ||
      lowerMessage.includes('he texted') ||
      lowerMessage.includes('she texted') ||
      lowerMessage.includes('my co-parent') ||
      lowerMessage.includes('my coparent') ||
      lowerMessage.includes('my ex') ||
      lowerMessage.includes('from him') ||
      lowerMessage.includes('from her') ||
      lowerMessage.includes('got this from') ||
      lowerMessage.includes('received this');

    // Build the text content
    let textContent = message;
    
    // If there's an image and user didn't indicate source, remind AI to ask
    if (hasImage && !userIndicatedCoparent && !message.trim()) {
      textContent = '[User uploaded a screenshot without context]';
    }
    
    textContent += contextString;

    userContent.push({
      type: 'text',
      text: textContent,
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
            max_tokens: 2000,
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

          // Extract patterns from response
          const patterns = extractPatterns(fullResponse);
          if (patterns.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns })}\n\n`));
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

function extractPatterns(text: string): string[] {
  const coercivePatterns = [
    'Gaslighting',
    'DARVO',
    'Intimidation',
    'Threats',
    'Financial Abuse',
    'Using Children as Weapons',
    'Blame-Shifting',
    'Blame Shifting',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Monitoring/Stalking',
    'Isolation',
    'Isolation Tactics',
    'Minimizing',
    'Denying',
    'Minimizing/Denying',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Normalize pattern names
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      if (pattern === 'Monitoring' || pattern === 'Stalking') normalizedPattern = 'Monitoring/Stalking';
      if (pattern === 'Isolation') normalizedPattern = 'Isolation Tactics';
      if (pattern === 'Minimizing' || pattern === 'Denying') normalizedPattern = 'Minimizing/Denying';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5); // Max 5 patterns
}