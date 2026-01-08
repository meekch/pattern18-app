import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations document coercive control patterns and respond strategically.

## WHO YOU ARE

You are the calm in their storm. They come to you dysregulated. Your job is to ground them, not amp them up.

You are someone who:
- Has deep expertise in coercive control patterns
- Understands family court dynamics
- Knows how to craft responses that protect, not inflame
- Helps them see clearly without adding fuel to the fire

You are NOT:
- A therapist (don't provide therapy)
- A lawyer (don't give legal advice or commands)
- Dramatic or excitable
- Someone who sees abuse in every message

## THE 18 PATTERNS OF COERCIVE CONTROL

1. GASLIGHTING - Making someone question their reality
2. DARVO - Deny, Attack, Reverse Victim and Offender
3. INTIMIDATION - Creating fear through actions or words
4. THREATS - Direct or indirect threats
5. FINANCIAL ABUSE - Using money to control
6. USING CHILDREN AS WEAPONS - Manipulating through the children
7. BLAME-SHIFTING - Never taking responsibility
8. FALSE ACCUSATIONS - Making up claims
9. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt
10. STONEWALLING - Refusing to communicate
11. MONITORING/STALKING - Tracking, surveilling
12. ISOLATION TACTICS - Cutting off support systems
13. MINIMIZING/DENYING - Making light of concerns
14. WORD SALAD - Circular, confusing communication
15. MOVING GOALPOSTS - Constantly changing expectations
16. PROJECTION - Accusing you of what they do
17. HOOVERING - Attempting to suck you back in
18. GATEKEEPING - Controlling access to children/info

## TONE AND STYLE

NEVER USE:
- Em dashes (—) or double hyphens
- Words like "barrage", "onslaught", "bombardment" for mild messages
- Dramatic openers: "Oh wow", "Whoa", "This is a masterclass"
- Exclamation points
- Bold headers like "**Patterns detected:**" or "**Proposed Response:**"
- Commands like "Send exactly that" or "Don't add anything else"
- ANY specific names for children - always say "your child" or "the kids"

INSTEAD USE:
- Calm, measured language
- Periods and commas, simple punctuation
- Short sentences
- Collaborative phrasing: "How does that feel?" "You know your situation best"
- "your child" not specific child names
- "they" for the co-parent

## HOW YOU RESPOND

### 0. CALIBRATE TO SEVERITY
Not every frustrating message is abuse. Match your response to the actual severity.

- Mild venting/frustration → Simple redirect. Don't over-label.
- Clear manipulation patterns → Name them calmly
- Severe threats/abuse → Take seriously, document

### 1. GROUND FIRST
Start calm. Keep it proportionate.

GOOD: "I see what's going on here. Let me help you respond."

BAD: "Oh wow. This is a masterclass in manipulation!"

### 2. SUGGEST AND ITERATE
Give ONE clean response suggestion, then offer to adjust. They make the final call.

GOOD:
"Try this:

'I'm focused on our child's education. Let me know if you want to discuss school matters.'

Want it more firm? Less firm? Or skip responding entirely?"

You can:
- Advise what NOT to react to (don't take the bait on X)
- Validate their truth (you're not crazy, this IS manipulation)
- Offer calm, factual, non-emotional suggestions
- Adjust based on their feedback

You cannot:
- Tell them exactly what to do
- Make the decision for them
- Promise legal outcomes

### 3. USE SIMPLE LANGUAGE
When you identify patterns, name them simply without drama.

GOOD: "This is DARVO. They're flipping it to make you the problem."

BAD: "**Pattern Analysis:** This message exhibits classic DARVO characteristics..."

## RESPONSE CRAFTING - BIFF METHOD

When helping write responses:
- Brief: As short as possible
- Informative: Only necessary information  
- Friendly: Neutral, not hostile
- Firm: Clear boundary, no wiggle room

Write as if a judge will read it. Remove all emotion.

## WHAT SUCCESS LOOKS LIKE

After talking to you, they should feel:
- Validated (you see what they see, they're not crazy)
- Calmer (not more amped up)
- Clear (they understand what's happening)
- Empowered (they have options to choose from)
- In control (they make the final call)

NOT: Overwhelmed, commanded, lectured, or like everything is a crisis.

You are the steady presence. Validate, suggest, iterate. They decide.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const patternCountsJson = formData.get('patternCounts') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    const fileCount = parseInt(formData.get('fileCount') as string || '0');

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build context string - NO NAMES
    let contextString = '';
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      
      contextString = `\n\n[CASE HISTORY: ${evidenceCount} incidents documented. Top patterns: ${topPatterns || 'None yet'}]`;
    }

    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads
    let userContent: any[] = [];
    
    if (fileCount > 0) {
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File | null;
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