import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You help people navigate difficult co-parenting situations. You understand coercive control, family court, and how to communicate in high-conflict dynamics.

Be yourself - calm, clear, confident. Talk to them like a knowledgeable friend would. Not a coach giving instructions. Not a therapist analyzing them. Just helpful.

When they share a screenshot or message, first check if it's clear who sent it. If you can't tell from context, just ask: "Is this something they sent you, or something you're thinking of sending?"

If they share a message FROM their co-parent and want help responding:
- Offer something they could say - naturally, not like a script
- Explain your thinking if it helps them understand why
- Keep responses calm, factual, brief

You know about manipulation tactics (gaslighting, DARVO, blame-shifting, etc.) - name them when relevant because it's validating to have words for what they're experiencing. But don't make everything about patterns and tactics. Sometimes a message is just annoying, not abusive.

When reading documents, just report what they say accurately. Don't assume or guess - read the names and details from the document itself.

Keep it real. Keep it calm. No drama, no victim language, no "toxic" or "narcissist." Just clarity.

No markdown formatting. No bold headers. Plain text only.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    
    // Get all files (supports multiple)
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'file' && value instanceof File) {
        files.push(value);
      }
    }

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);

    // Build context
    let contextString = '';
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

    // Handle file uploads (multiple supported)
    let userContent: any[] = [];
    
    for (const file of files) {
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
      } else if (file.type.startsWith('image/')) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: base64,
          },
        });
      }
    }

    // Add text message
    let textContent = message || '';
    if (contextString) {
      textContent += contextString;
    }
    
    if (textContent || userContent.length === 0) {
      userContent.push({
        type: 'text',
        text: textContent || 'What can you tell me about this?',
      });
    }

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

          // Extract patterns quietly for tagging (not for display)
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

// Quiet pattern extraction for background tagging
function extractPatterns(text: string): string[] {
  const patterns = [
    'Gaslighting', 'DARVO', 'Intimidation', 'Threats',
    'Financial Abuse', 'Using Children as Weapons', 'Blame-Shifting',
    'False Accusations', 'Emotional Blackmail', 'Stonewalling',
    'Monitoring', 'Stalking', 'Isolation', 'Minimizing', 'Denying',
    'Word Salad', 'Moving Goalposts', 'Projection', 'Hoovering', 'Gatekeeping'
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of patterns) {
    if (lowerText.includes(pattern.toLowerCase()) && !found.includes(pattern)) {
      found.push(pattern);
    }
  }

  return found.slice(0, 5);
}