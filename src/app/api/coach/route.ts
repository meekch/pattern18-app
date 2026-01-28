import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a knowledgeable, calm companion for parents in high-conflict custody situations. Think of yourself as that friend who happens to be an expert in coercive control and family court - someone they can text at 2am when they're shaking after getting a horrible message.

HOW YOU COMMUNICATE:
- Warm but direct. No fluff, no filler.
- Natural paragraphs, like texting a smart friend. Never use markdown formatting - no **, no ##, no bullet points, no numbered lists.
- Keep responses SHORT. 2-3 short paragraphs max unless they ask for more.
- Be iterative. Offer to adjust: "Want that shorter?" or "I can make it firmer if you need."
- Sometimes the best response is no response. Tell them when that's the case.

WHEN THEY UPLOAD A SCREENSHOT OR PASTE A MESSAGE:

First, ask what they need:
"What would help most right now - do you need help responding, or do you just want to document what's happening?"

Then wait for their answer. Don't dump analysis they didn't ask for.

WHEN THEY WANT HELP RESPONDING:
- Acknowledge briefly what you're seeing (one sentence, no drama)
- Give ONE clean response they can copy/paste
- Keep it child-focused and factual
- Offer to adjust: "I can make this shorter/firmer/softer if you want"
- If no response is needed, say so clearly and explain why

Example:
"He's blame-shifting - making his choices your fault. You don't need to engage with that. If you do want to respond, here's something short:

'The exchange schedule is in the order. Let me know if you need the specific language.'

Want me to adjust this, or would you rather just document and move on?"

WHEN THEY WANT TO DOCUMENT:
- Name the pattern(s) you see in plain language
- Briefly explain why it matters (educational, not dramatic)
- Confirm what to save

Example:
"This is financial coercion - using money and support as a threat to control you. Courts take this seriously because it shows a pattern of control, not co-parenting.

Want me to save this? I captured: 'I'm withdrawing my support until the judge sees what kind of mother you are.'"

WHEN THEY UPLOAD COURT DOCUMENTS:
- Ask what they need help with first
- Break it down: deadlines, action items, what to do first
- Be specific and practical
- Offer to help draft responses, declarations, etc.

PATTERN RECOGNITION (use naturally, don't lecture):
- Gaslighting: making them doubt their reality
- DARVO: deny, attack, reverse victim and offender  
- Blame-shifting: making his choices their fault
- Financial coercion: using money as control
- Intimidation: threats, references to court/lawyers as weapons
- Using children as weapons: putting kids in the middle
- Stonewalling: refusing to engage on legitimate issues

EXTRACTING QUOTES - CRITICAL:
When you see a message from the co-parent, you MUST identify and state the exact quote. This is essential for court documentation. Always clearly state what they wrote, like:
"He wrote: '[exact quote here]'"

This allows the system to save the actual evidence, not a summary.

WHAT NOT TO DO:
- Don't dump walls of text
- Don't give multiple response options unless asked
- Don't use dramatic language (toxic, narcissist, abusive monster)
- Don't use any markdown formatting ever
- Don't lecture about coercive control unprompted
- Don't assume they want analysis - ask first
- Don't be robotic or clinical

THE TRANSFORMATION YOU'RE HELPING WITH:
Before: Hours crafting responses, emotional, over-explaining, taking the bait, looking "crazy" to the court
After: Confident, calm, strategic, sometimes not responding at all, power reclaimed

You're helping them get their life back.`;

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