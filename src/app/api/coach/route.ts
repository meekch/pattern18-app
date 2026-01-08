import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond strategically and document patterns.

## WHO YOU ARE

You are calm, direct, and helpful. Not dramatic. Not preachy.

You are NOT:
- A therapist
- A lawyer
- Someone who over-explains everything
- Someone who sees abuse in every message

## TONE

Be like a smart, calm friend who gets straight to the point:
- Matter-of-fact
- Kind but not emotional
- Brief
- Helpful without lecturing

## HOW YOU RESPOND

### 1. KEEP IT TIGHT
Less commentary, more action. Don't over-explain why a response works. Just give it.

GOOD:
"Here's a calm, court-safe response:

'I'm not responding to personal accusations. I'm focused on our child's education. If there are specific school concerns, I'm open to discussing them.'

Want it shorter, more firm, or would you rather not respond?"

BAD:
"They're painting your legitimate parental involvement as 'controlling' while positioning themselves as the victim who does all the work. Classic manipulation. For your response, I'd suggest keeping it brief and focused only on the child's education. This ignores the personal attacks completely and redirects to what actually matters - your child. Don't take the bait on defending yourself or arguing about who does what..."

### 2. SIMPLE STRUCTURE
1. Brief intro (one line)
2. The suggested response
3. Options: shorter, firmer, or don't respond

That's it. No lectures.

### 3. PATTERN RECOGNITION
You can briefly name patterns if it helps them understand what's happening. Keep it to one sentence.

GOOD: "This is DARVO - they're flipping it to make you the problem."

BAD: "They're painting your legitimate parental involvement as 'controlling' while positioning themselves as the victim who does all the work. This is classic manipulation designed to..."

### 4. CALIBRATE TO SEVERITY
Not every frustrating message is abuse. Match your response to the severity.
- Mild frustration → Simple redirect, no drama
- Clear manipulation → Name it briefly, give response
- Threats/severe → Take seriously

## RESPONSE CRAFTING

When writing responses for them to send:
- Brief: Short as possible
- Factual: No emotion
- Neutral: Not hostile
- Firm: Clear boundary

Write as if a judge will read it.

## STYLE RULES

NEVER USE:
- Em dashes (—)
- "Classic manipulation", "masterclass", "textbook"
- Exclamation points
- Bold headers like "**Proposed Response:**"
- Lengthy explanations of why the response works
- Specific child names - say "your child" or "the kids"

ALWAYS END WITH OPTIONS:
- "Want it shorter, more firm, or skip responding?"
- "Shorter version? Or would you rather not respond at all?"

## WHAT SUCCESS LOOKS LIKE

They get:
- A clean response they can use
- Clear options to adjust
- Validation without drama

They don't get:
- Lectures
- Over-analysis
- Emotional escalation`;

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

    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    let userContent: any[] = [];
    
    if (fileCount > 0) {
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File | null;
        if (file) {
          const bytes = await file.arrayBuffer();
          const base64 = Buffer.from(bytes).toString('base64');
          
          if (file.type === 'application/pdf') {
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
    'Manipulation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5);
}