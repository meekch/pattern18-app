import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond strategically and document patterns.

WHEN THEY UPLOAD A SCREENSHOT OR PASTE A MESSAGE:

Give them a response immediately. Don't ask what they need - they uploaded it because they want help.

Format:
1. One brief line about the situation (optional, no drama)
2. A clean response they can copy and paste
3. Offer to adjust

Example response:
"Here's a court-safe response. Copy and paste:

'I disagree with your characterization. We followed the existing Friday exchange schedule. There was no written agreement changing it. Please direct future communication to logistics only.'

Want it shorter or firmer?"

CRITICAL RULES:
- Never use markdown. No **, no ##, no bullets, no numbered lists.
- Never add drama or emotional language. No "intense," "toxic," "horrible," "abusive monster."
- Keep it SHORT. The response itself should be 2-4 sentences max.
- If no response is needed, say so briefly and why.
- Always offer to adjust: shorter, firmer, softer.

EXTRACTING THE QUOTE:
When you see their message, state what they wrote so it can be saved:
"He wrote: '[exact quote from screenshot]'"

Put this naturally in your response, like:
"He wrote: 'I'm withdrawing my support until the judge sees what kind of mother you are.' That's financial coercion - using money as a threat. Here's a response..."

PATTERN NAMES (use briefly when relevant):
Gaslighting, DARVO, Blame-shifting, Financial coercion, Intimidation, Using children as weapons, Stonewalling

WHEN THEY UPLOAD COURT DOCUMENTS:
Ask what they need help with - deadlines, understanding it, drafting a response, etc.

WHAT NOT TO DO:
- Don't ask "what do you need" for screenshots - just give a response
- Don't dump analysis or pattern lectures
- Don't be dramatic or emotional
- Don't give multiple options unless asked
- Don't use any markdown formatting

Be the calm friend who gives them exactly what they need to copy, paste, and move on with their day.`;

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

    // Build context string - keep it minimal
    let contextString = '';
    
    const totalEvidence = parseInt(evidenceCount) || 0;
    if (totalEvidence > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      
      contextString = `\n\n[Context: ${totalEvidence} incidents documented. Top patterns: ${topPatterns || 'none yet'}]`;
    }

    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent: ${caseContext.coparent_name}]`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
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

    // Natural message instead of robotic prompt
    let userText = message;
    if (file && (message === 'Please analyze this screenshot and help me respond.' || !message.trim())) {
      userText = 'I just got this.';
    }

    userContent.push({
      type: 'text',
      text: userText + contextString,
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
            max_tokens: 1000,
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

          // Extract quoted co-parent message
          const extractedQuote = extractCoparentQuote(fullResponse);
          if (extractedQuote) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ extractedQuote })}\n\n`));
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
    { match: 'gaslighting', normalized: 'Gaslighting' },
    { match: 'darvo', normalized: 'DARVO' },
    { match: 'blame-shifting', normalized: 'Blame-Shifting' },
    { match: 'blame shifting', normalized: 'Blame-Shifting' },
    { match: 'financial coercion', normalized: 'Financial Coercion' },
    { match: 'financial abuse', normalized: 'Financial Coercion' },
    { match: 'intimidation', normalized: 'Intimidation' },
    { match: 'threat', normalized: 'Intimidation' },
    { match: 'using children', normalized: 'Using Children as Weapons' },
    { match: 'children as weapons', normalized: 'Using Children as Weapons' },
    { match: 'stonewalling', normalized: 'Stonewalling' },
    { match: 'false accusations', normalized: 'False Accusations' },
    { match: 'emotional blackmail', normalized: 'Emotional Blackmail' },
    { match: 'monitoring', normalized: 'Monitoring/Stalking' },
    { match: 'stalking', normalized: 'Monitoring/Stalking' },
    { match: 'isolation', normalized: 'Isolation' },
    { match: 'minimizing', normalized: 'Minimizing/Denying' },
    { match: 'word salad', normalized: 'Word Salad' },
    { match: 'moving goalposts', normalized: 'Moving Goalposts' },
    { match: 'projection', normalized: 'Projection' },
    { match: 'hoovering', normalized: 'Hoovering' },
    { match: 'gatekeeping', normalized: 'Gatekeeping' },
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.match) && !found.includes(pattern.normalized)) {
      found.push(pattern.normalized);
    }
  }

  return found.slice(0, 4);
}

function extractCoparentQuote(text: string): string | null {
  // Look for patterns where coach quoted the co-parent's message
  const patterns = [
    /(?:he|she|they|co-?parent)\s+(?:wrote|said|sent|texted|messaged):\s*['"]([^'"]+)['"]/gi,
    /I captured:\s*['"]([^'"]+)['"]/gi,
    /['"]([^'"]{30,})['"]/g,
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      for (const match of matches) {
        const quote = match[1]?.trim();
        if (quote && quote.length > 15) {
          // Filter out suggested responses
          const lowerQuote = quote.toLowerCase();
          if (!lowerQuote.startsWith('the exchange') && 
              !lowerQuote.startsWith('the custody') &&
              !lowerQuote.startsWith('per our') &&
              !lowerQuote.startsWith('i will') &&
              !lowerQuote.includes('please confirm') &&
              !lowerQuote.includes('let me know')) {
            return quote;
          }
        }
      }
    }
  }
  
  return null;
}