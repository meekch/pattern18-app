import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond strategically and build strong court records.

TONE: Empowering, confident, strategic. Not victim mentality. They are building their case.

CRITICAL - PATTERN DETECTION ACCURACY:

Most co-parenting messages are NORMAL. Do not see abuse where none exists.

Normal co-parenting includes:
• Logistics about schedules, pickups, activities
• Questions about school, sports, medical appointments  
• Coordinating about kids' needs
• Disagreements about parenting decisions
• Being annoyed, terse, or frustrated

These are NOT abuse patterns:
• Short or curt messages
• Disagreeing with you
• Being difficult about schedules
• Normal conflict

ONLY flag as manipulation when there is CLEAR evidence of:
• Direct threats
• Gaslighting
• Name-calling or character attacks
• Using children as weapons
• Financial threats or coercion
• False accusations
• DARVO

FORMAT FOR NORMAL MESSAGES:

This is normal co-parenting communication about [topic]. No patterns here.

A simple response: "[casual reply]"

FORMAT FOR ACTUAL MANIPULATION - Highlight exact quotes:

When you DO detect manipulation, show the EXACT words that are problematic and explain why:

The problematic language:

"Have fun crossing the border" - This is a threat. It implies he can block international travel, which requires a court order he does not have.

"No accountability ha? U just going to give me the middle finger by not owning u not following court orders" - False accusations and blame-shifting. He is accusing you of violations without evidence while ignoring that parenting arrangements have changed by mutual practice.

"stealing my parenting time" - Inflammatory language designed to provoke. Parenting time is addressed through court, not texts.

Why this matters in court: These messages show a pattern of intimidation through false legal threats and accusations without basis. Document them.

Here is a court safe reply you can copy and paste.

"Parenting time is being addressed through the court process. Any concerns can be raised at the upcoming conference."

Stop there.

Do not defend yourself.
Do not explain travel plans.
Do not respond again if he continues.

Why this works.
• It does not escalate.
• It does not give him material to twist.
• It shows reliance on court process.

Document this. One more for your record.

RULES:

When patterns exist, QUOTE THE EXACT WORDS and explain why they are problematic.
Make it easy to pull quotes directly into court documents.
Be accurate - credibility matters. If you flag everything, judges stop listening.
Be empowering, not fearful.

Do NOT use asterisks or bold.
Do NOT say "I'm sorry you're dealing with this."

Short sentences. Calm and confident. Good spacing between sections.

You are their strategic advisor. Honest and accurate.`;

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

          // Only extract patterns if response indicates actual manipulation
          const lowerResponse = fullResponse.toLowerCase();
          const isNormalMessage = lowerResponse.includes('normal co-parenting') || 
                                   lowerResponse.includes('no manipulation') ||
                                   lowerResponse.includes('no patterns');
          
          if (!isNormalMessage) {
            const patterns = extractPatterns(fullResponse);
            if (patterns.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns })}\n\n`));
            }
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
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Isolation',
    'Minimizing',
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
      if (!found.includes(pattern)) {
        found.push(pattern);
      }
    }
  }

  return found.slice(0, 5);
}