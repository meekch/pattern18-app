import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // Build system prompt with case context
    let systemPrompt = `You help people navigate co-parenting and family court situations. Be helpful, warm, and natural.

CRITICAL RULES:
1. When analyzing a screenshot or message, ALWAYS ASK "Is this from your co-parent or is this your message?" before analyzing. Never assume.
2. Only identify manipulation patterns in the CO-PARENT's messages, never the user's. The user is the survivor.
3. If the user shares their own message, help them refine it or confirm it looks good. Never call their message manipulative.
4. Keep responses conversational. No markdown formatting (no ** or ## or bullet points unless specifically helpful).
5. Be direct and practical. This person may be reading at 2am with shaking hands.`;

    // Add case context if available
    if (caseContext.user_role) {
      const userRole = caseContext.user_role === 'petitioner' ? 'Petitioner' : 'Respondent';
      const coparentRole = caseContext.user_role === 'petitioner' ? 'Respondent' : 'Petitioner';
      systemPrompt += `\n\nCASE CONTEXT:
- The user is the ${userRole} in their case
- Their co-parent is the ${coparentRole}`;
      
      if (caseContext.coparent_name) {
        systemPrompt += `\n- Co-parent's name or reference: ${caseContext.coparent_name}`;
      }
      if (caseContext.state) {
        systemPrompt += `\n- State: ${caseContext.state}`;
      }
    }

    // Add evidence stats if they have history
    if (parseInt(evidenceCount) > 0 && Object.keys(patternCounts).length > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern, count]) => `${pattern} (${count}x)`)
        .join(', ');
      
      systemPrompt += `\n\nDOCUMENTATION HISTORY:
- ${evidenceCount} incidents documented so far
- Most frequent patterns: ${topPatterns}
- You can reference this when relevant (e.g., "This is consistent with the gaslighting pattern you've documented 12 times")`;
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

    userContent.push({
      type: 'text',
      text: message,
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
            system: systemPrompt,
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

          // Silently extract patterns for evidence tagging (background feature)
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

// Silent pattern extraction for automatic evidence tagging
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
    'Monitoring/Stalking',
    'Isolation Tactics',
    'Minimizing/Denying',
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

  // Also catch variations
  if (lowerText.includes('blame shifting') && !found.includes('Blame-Shifting')) {
    found.push('Blame-Shifting');
  }
  if ((lowerText.includes('monitoring') || lowerText.includes('stalking')) && !found.includes('Monitoring/Stalking')) {
    found.push('Monitoring/Stalking');
  }
  if ((lowerText.includes('minimizing') || lowerText.includes('denying')) && !found.includes('Minimizing/Denying')) {
    found.push('Minimizing/Denying');
  }
  if (lowerText.includes('isolation') && !found.includes('Isolation Tactics')) {
    found.push('Isolation Tactics');
  }

  return found.slice(0, 5);
}