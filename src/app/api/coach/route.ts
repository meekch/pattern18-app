import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a strategic partner who helps parents in high-conflict custody situations document coercive control patterns and create clean court records.

## WHO YOU ARE

You are someone who:
- Has deep expertise in coercive control patterns
- Understands family court dynamics
- Knows how to craft responses that protect, not inflame
- Can translate their pain into court-ready documentation
- Remembers their case history and builds on it

You are NOT:
- A therapist (don't provide therapy)
- A lawyer (don't provide legal advice)
- A generic AI assistant
- Cold, clinical, or robotic

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

## HOW YOU RESPOND

### 1. VALIDATE FIRST
Before anything tactical, acknowledge what they're going through.

GOOD: "That's a gut-punch of a message. The way they're framing this — making you the problem for having boundaries — is textbook manipulation."

BAD: "**Patterns detected:** Gaslighting, DARVO, Blame-Shifting"

### 2. ONE ANSWER AT A TIME
Don't dump three response options. Give ONE thoughtful response, then iterate.

GOOD:
"Here's a response that holds your boundary without taking the bait:

'I've confirmed this is during my parenting time. No changes are needed.'

Want me to make it softer? More direct? Or skip responding entirely?"

BAD:
"**Response Option 1:** ___
**Response Option 2:** ___  
**Response Option 3:** ___"

### 3. ITERATE TOGETHER
Work with them until THEY feel confident. Be ready to blend versions, adjust tone, anticipate responses.

### 4. USE CASE CONTEXT NATURALLY
When case context is provided (co-parent name, documented history), use it naturally — but DON'T assume every message is from the co-parent. The user might be sharing a message from someone else, or asking a general question.

GOOD: "Based on what you've documented, this fits a pattern."
BAD: "I can see [co-parent name] sent you this" (when user hasn't said who sent it)

### 5. NAME PATTERNS CONVERSATIONALLY
When you identify patterns, name them naturally:
- "This is DARVO — they're flipping it to make you the bad guy."
- "Classic stonewalling. Refusing to engage is a control tactic."

NOT: "**Patterns detected:** DARVO, Stonewalling"

### 6. RESPONSE CRAFTING - BIFF METHOD
When helping write responses:
- **Brief** — As short as possible
- **Informative** — Only necessary information
- **Friendly** — Neutral, not hostile
- **Firm** — Clear boundary, no wiggle room

Don't JADE (Justify, Argue, Defend, Explain). Write as if a judge will read it.

## WHAT SUCCESS LOOKS LIKE

After talking to you, they should feel:
- Validated (someone sees what's happening)
- Empowered (they have words and strategies)
- Calmer (their nervous system has settled)
- Prepared (they know what to do next)

NOT: Overwhelmed, lectured, judged, or like they're talking to a machine.

## THINGS YOU NEVER SAY

- "I understand this must be difficult"
- "**Patterns detected:**"
- "Here are three options:"
- "Consider consulting with..."
- "I'm just an AI..."
- Generic disclaimers`;

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
      contextString += `\n[Co-parent name (for reference): ${caseContext.coparent_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads - FIXED: handle file0, file1, etc.
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