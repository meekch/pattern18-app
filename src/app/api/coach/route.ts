import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Minimal prompt - let Claude be Claude
const SYSTEM_PROMPT = `You help people with co-parenting and family court matters. Be helpful, accurate, and natural.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const fileCount = parseInt(formData.get('fileCount') as string || '0');
    
    // Collect all files
    const files: File[] = [];
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file${i}`) as File | null;
      if (file) files.push(file);
    }

    const history = JSON.parse(historyJson);

    // Build messages array from history
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build user content with files
    let userContent: any[] = [];
    
    // Add all files
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
    if (message || userContent.length === 0) {
      userContent.push({
        type: 'text',
        text: message || 'What can you tell me about these documents?',
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
            max_tokens: 4000,
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

          // Extract patterns quietly for saving (not displayed)
          const patterns = extractPatterns(fullResponse);
          if (patterns.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `Error: ${errorMsg}` })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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

// Quiet pattern detection for background saving
function extractPatterns(text: string): string[] {
  const patterns: Record<string, string[]> = {
    'Gaslighting': ['gaslighting', 'gaslight'],
    'DARVO': ['darvo'],
    'Intimidation': ['intimidation', 'intimidating'],
    'Threats': ['threat', 'threatening'],
    'Financial Abuse': ['financial abuse', 'financial control'],
    'Using Children as Weapons': ['using children', 'children as weapons'],
    'Blame-Shifting': ['blame-shifting', 'blame shifting'],
    'False Accusations': ['false accusations'],
    'Emotional Blackmail': ['emotional blackmail'],
    'Stonewalling': ['stonewalling', 'silent treatment'],
    'Monitoring/Stalking': ['monitoring', 'stalking', 'tracking'],
    'Isolation': ['isolation', 'isolating'],
    'Minimizing': ['minimizing', 'denying'],
    'Word Salad': ['word salad'],
    'Moving Goalposts': ['moving goalposts'],
    'Projection': ['projection'],
    'Hoovering': ['hoovering'],
    'Gatekeeping': ['gatekeeping'],
  };

  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const [patternName, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        if (!found.includes(patternName)) {
          found.push(patternName);
        }
        break;
      }
    }
  }

  return found.slice(0, 5);
}