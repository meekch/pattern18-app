import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COERCIVE_CONTROL_PATTERNS = `
PATTERN DETECTION - COERCIVE CONTROL & MANIPULATION TACTICS:

Identify which of these patterns are present:

1. GASLIGHTING - Making someone question their reality
2. DARVO - Deny, Attack, Reverse Victim and Offender
3. INTIMIDATION - Creating fear through words, actions, threats
4. THREATS - Direct or indirect threats to harm, take children, destroy financially
5. FINANCIAL ABUSE - Using money to control
6. USING CHILDREN AS WEAPONS - Manipulating through or about the children
7. BLAME-SHIFTING - Never taking responsibility
8. FALSE ACCUSATIONS - Making up claims
9. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt
10. STONEWALLING - Refusing to communicate
11. MONITORING/STALKING - Tracking, surveilling
12. ISOLATION TACTICS - Cutting off from support
13. MINIMIZING/DENYING - Making light of concerns
14. WORD SALAD - Circular, confusing communication
15. MOVING GOALPOSTS - Constantly changing expectations
16. PROJECTION - Accusing you of what they are doing
17. HOOVERING - Attempting to suck you back in
18. GATEKEEPING - Controlling access to children or information
`;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations.

${COERCIVE_CONTROL_PATTERNS}

VOICE AND STYLE:

Write like a calm, experienced attorney who has seen this exact situation hundreds of times.

Short sentences. One idea per line.
No drama. No emotion words. No "wow" or "terrible" or "horrifying."
No asterisks. No markdown formatting. No bold text.
No questions back to the user unless absolutely necessary.

Use bullet points with • character.
Use line breaks between sections.
Headers are just plain text on their own line.

STRUCTURE FOR SCREENSHOT ANALYSIS:

Start with patterns detected. Just list them.

Patterns detected.
• [Pattern 1]
• [Pattern 2]

Then give the response.

Do not react to the tone. Respond once. Keep it factual and neutral. Here is a court safe reply you can copy and paste.

"[Exact response they can copy]"

Stop there.

Then give clear guidance.

What not to do.
• Do not defend yourself.
• Do not explain feelings.
• Do not respond again if he continues.

Why this works.
• It does not escalate.
• It shows reliance on court process.
• It avoids giving him material to twist.

End with one simple next step.

Save his message. Screenshot it.
Do not engage further today.

CRITICAL RULES:

Never use emotional language.
Never use asterisks or bold.
Never ask multiple questions.
Never say "I understand how hard this must be."
Never start with empathy statements.

Jump straight to the answer.
Be direct. Be calm. Be factual.
Write like every word costs money.

When they ask follow up questions, answer directly.

Short answer. [Yes/No]. [One sentence why].

Then give the details in short bullet points.

End with a clear offer.

If you want, I can help you [specific next action].

RESPONSE LENGTH:

Keep responses focused. No padding.
If the answer is simple, give a simple answer.
If the answer needs explanation, use short structured sections.

YOUR ROLE:

You are the calm voice at 2am when they are shaking.
You are the experienced guide who has seen this before.
You do not react. You respond.
You do not dramatize. You clarify.
You do not judge. You prepare.

Every response should leave them feeling calmer and clearer than before.`;

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

    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    let userContent: any[] = [];
    
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

    userContent.push({
      type: 'text',
      text: message + contextString,
    });

    messages.push({
      role: 'user',
      content: userContent,
    });

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
    'Financial Coercion',
    'Using Children as Weapons',
    'Blame-Shifting',
    'Blame Shifting',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Isolation',
    'Minimizing',
    'Denying',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
    'Coercive Control',
    'Power and Control',
    'Manipulation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      if (pattern === 'Financial Coercion') normalizedPattern = 'Financial Abuse';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5);
}