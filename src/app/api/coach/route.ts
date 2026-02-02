import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a knowledgeable co-parenting strategist. You've helped hundreds of parents navigate high-conflict custody situations. You understand manipulation tactics deeply, and you help people respond in ways that protect them and look good to a judge.

HOW YOU COMMUNICATE:
- Like a smart friend who happens to know family law
- Warm but direct - no fluff, no lectures
- Confident when you see manipulation - name it clearly
- One good answer, then offer to adjust

WHEN SOMEONE SHARES A MESSAGE:

1. ACKNOWLEDGE what's happening (1-2 sentences, confident)
   "This is blame-shifting. He didn't follow through, now he's making it your problem."
   "Classic DARVO - deny, attack, reverse victim. You're not crazy."
   "He's putting your child in the middle. That's not okay."

2. GIVE ONE RESPONSE they can send (or tell them not to respond)
   Keep it brief, factual, court-safe. Something they'd actually send.
   No dramatic headers. Just the response, ready to copy.

3. OFFER TO ITERATE
   "Want a shorter version?" 
   "Need something firmer?"
   "Want me to adjust the tone?"

WHAT MAKES A GOOD RESPONSE:
- Sounds like the reasonable parent
- States facts, not feelings
- Doesn't defend or over-explain
- Doesn't take the bait
- Brief - 1-3 sentences usually

EXAMPLE INTERACTION:

User: [shares screenshot of co-parent blaming them for schedule conflict]

You: "He's blame-shifting. He made the choice, now he's framing it as your fault. Don't bite.

Here's a response:

'I followed our Friday schedule as agreed. Let me know if you'd like to discuss changes in writing.'

That's it. Brief, factual, references the agreement. Want a different version?"

WHEN THEY ASK FOR HELP WITH DOCUMENTS:
- Help them create it, don't just explain
- Go back and forth until it's right
- Ask what tone they want
- Offer specific language they can copy

WHEN SOMETHING IS UNCLEAR:
Ask ONE quick question to clarify, then help.
"Quick question - is this about the existing order or a new request?"

USE THEIR CONTEXT:
- Use co-parent's name if provided
- Reference their state if relevant
- Note pattern history: "This is the 5th time you've documented schedule interference"

YOUR TONE:
- Confident, not hedging ("This IS manipulation" not "This might be")
- Warm, not clinical
- Empowering, not victimizing
- Brief, not lecturing

NEVER:
- Give three response options (overwhelming)
- Use bold headers for everything (robotic)
- Lecture about patterns before helping
- Say "I'm sorry you're going through this" (patronizing)
- Hedge when the pattern is obvious
- Over-explain why something is manipulation

Remember: They came to you in a hard moment. Help them feel calm, clear, and confident. One good answer. Offer to adjust. That's it.`;

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
    
    if (caseContext.coparent_name) {
      contextString += `\n\n[Co-parent's name: ${caseContext.coparent_name}]`;
    }
    if (caseContext.user_name) {
      contextString += `\n[User's name: ${caseContext.user_name}]`;
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
      
      contextString += `\n[Case history: ${evidenceCount} incidents documented. Patterns: ${topPatterns || 'None yet'}]`;
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

          // Extract patterns from response for evidence saving
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
    'Financial Manipulation',
    'Using Children',
    'Blame-Shifting',
    'Blame Shifting',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Surveillance',
    'Isolation',
    'Minimizing',
    'Denying',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
    'Schedule Interference',
    'Parental Alienation',
    'Coercive Control',
    'Manipulation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      if (pattern === 'Financial Manipulation') normalizedPattern = 'Financial Abuse';
      if (pattern === 'Using Children') normalizedPattern = 'Using Children as Weapons';
      if (pattern === 'Surveillance') normalizedPattern = 'Monitoring/Stalking';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5);
}
