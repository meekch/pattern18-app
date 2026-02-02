import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectPatterns, getPatternLabel } from '@/lib/patterns';
import { scoreEvent } from '@/lib/scoring';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a strategic co-parenting coach helping someone in a high-conflict custody situation. Your job is to help them respond in ways that are court-safe, factual, and don't take the bait.

RESPONSE FORMAT - Follow this exactly:

For screenshot/message analysis:
1. Give a brief strategic response they can copy/paste (2-3 sentences max)
2. Then offer: "Want it shorter or firmer?"

That's it. No repeating their message back. No lengthy explanations. No "Their message:" prefix.

RESPONSE PRINCIPLES:
- Court-safe: No emotion, no accusations, no sarcasm
- Factual: Reference agreements, court orders, dates
- Brief: 1-3 sentences is ideal
- Boundary-setting: Don't engage with bait or manipulation
- Redirect to proper channels: attorneys, court, written communication

WHAT NOT TO DO:
- Don't repeat or quote their message back to them
- Don't explain what patterns you see (the app handles that)
- Don't give lengthy analysis
- Don't use phrases like "Their message:" or "Here's what they said:"
- Don't lecture about what coercive control is

EXAMPLES OF GOOD RESPONSES:

User uploads screenshot of co-parent saying "You're a terrible mother"
Your response: "I'll have the children ready at the agreed time. Please keep communication focused on parenting logistics."

Want it shorter or firmer?

---

User uploads screenshot about schedule changes
Your response: "I'm following our parenting plan as written. Any modifications need to go through proper channels."

Want it shorter or firmer?

---

User asks "how do I respond to this?"
Your response: "You don't have to respond. This doesn't require action. Document and move on."

---

Remember: They're stressed, possibly shaking, at 2am. Give them something they can use RIGHT NOW.`;

function extractQuote(response: string): string {
  // Try to find quoted text in the response
  const quotePatterns = [
    /"([^"]{20,})"/g,
    /'([^']{20,})'/g,
    /[""]([^""]{20,})["']/g,
  ];
  
  for (const pattern of quotePatterns) {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 20) {
        return match[1];
      }
    }
  }
  
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const file = formData.get('file') as File | null;

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);

    // Build messages for Claude - filter out empty messages
    const messages: any[] = history
      .filter((msg: any) => msg.content && msg.content.trim())
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Handle file upload
    let userContent: any[] = [];
    let imageBase64 = '';
    
    if (file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      imageBase64 = base64;
      
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

    // Add context about the case if available
    let contextNote = '';
    if (caseContext.coparent_name) {
      contextNote += `Co-parent: ${caseContext.coparent_name}. `;
    }

    const userText = message || 'Help me respond to this message.';
    userContent.push({
      type: 'text',
      text: contextNote + userText,
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

          // Extract quote from the co-parent's message (from Claude's response or the image)
          const extractedQuote = extractQuote(fullResponse) || message;
          
          // Detect patterns using deterministic code
          const contentToAnalyze = extractedQuote || message || fullResponse;
          const patternMatches = detectPatterns(contentToAnalyze);
          
          // Score the event
          const patterns = patternMatches.map(p => p.patternId);
          const scores = scoreEvent({
            patterns,
            sourceType: file ? 'screenshot' : 'pasted_text',
            messageLength: contentToAnalyze.length,
            hasExactQuote: !!extractedQuote,
          });

          // Get human-readable pattern labels
          const patternLabels = patterns.map(p => getPatternLabel(p));

          // Send pattern data at the end
          if (patterns.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              extractedQuote: extractedQuote || contentToAnalyze.slice(0, 200),
              patterns,
              patternLabels,
              scores,
              riskLevel: scores.riskLevel,
            })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Processing failed' })}\n\n`));
          controller.close();
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