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
    const fileCount = parseInt(formData.get('fileCount') as string || '0');
    
    // Collect all files
    const files: File[] = [];
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file${i}`) as File | null;
      if (file) files.push(file);
    }
    
    // Also check for single file (backward compatibility)
    const singleFile = formData.get('file') as File | null;
    if (singleFile && files.length === 0) {
      files.push(singleFile);
    }

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build system prompt with case context
    let systemPrompt = `You help people navigate co-parenting and family court situations.

Be confident, clear, and accurate. Read documents carefully to get the facts right.

Your approach:
- State what each document IS and what it MEANS for them
- Identify who filed by reading signatures and content, not assuming
- Highlight their strengths and current position
- Give numbered next steps in priority order
- Ask logical follow-up questions to guide them further
- Offer specific next actions: "Want me to help you prepare X?" or "Should we practice Y?"

Use short paragraphs, bullets, and bold headers for easy scanning.

For text message screenshots: Ask who sent it before analyzing.`;

    // Add case context if available
    if (caseContext.user_role || caseContext.coparent_name || caseContext.state) {
      systemPrompt += `\n\nUser's case context:`;
      if (caseContext.user_role) {
        const userRole = caseContext.user_role === 'petitioner' ? 'Petitioner' : 'Respondent';
        systemPrompt += `\n- User is the ${userRole} (from original case filing)`;
      }
      if (caseContext.coparent_name) {
        systemPrompt += `\n- Co-parent: ${caseContext.coparent_name}`;
      }
      if (caseContext.state) {
        systemPrompt += `\n- State: ${caseContext.state}`;
      }
    }

    // Add evidence stats if they have history
    if (parseInt(evidenceCount) > 0) {
      systemPrompt += `\n- ${evidenceCount} incidents documented in their case`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads (multiple files supported)
    let userContent: any[] = [];
    
    for (const file of files) {
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