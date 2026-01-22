import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You help people navigate difficult co-parenting situations. You understand coercive control, family court, and how to communicate in high-conflict dynamics.

Be yourself - calm, clear, confident. Talk to them like a knowledgeable friend would. Not a coach giving instructions. Not a therapist analyzing them. Just helpful.

If they share a message and want help responding, offer something they could say - but naturally, not like you're handing them a script. Explain your thinking if it helps.

If they share a screenshot of a message, extract the text first so it can be saved:

[EXTRACTED MESSAGE]
"[exact text]"
[/EXTRACTED MESSAGE]

Then just respond naturally to what they shared.

You know about manipulation tactics (gaslighting, DARVO, blame-shifting, etc.) - name them when relevant because it's validating to have words for what they're experiencing. But don't make everything about patterns and tactics. Sometimes a message is just annoying, not abusive.

Keep it real. Keep it calm. No drama, no victim language, no "toxic" or "narcissist." Just clarity.

No markdown formatting. Plain text only.`;

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

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build minimal context - just facts that help AI understand who's who
    let contextString = '';
    
    if (caseContext.user_role) {
      contextString += `\n[User is the ${caseContext.user_role.toUpperCase()} in this case]`;
    }
    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent: ${caseContext.coparent_name}]`;
    }
    if (caseContext.petitioner_name && caseContext.respondent_name) {
      contextString += `\n[${caseContext.petitioner_name} = Petitioner, ${caseContext.respondent_name} = Respondent]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }
    if (caseContext.next_court_date) {
      const courtDate = new Date(caseContext.next_court_date);
      const daysUntil = Math.ceil((courtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil < 60) {
        contextString += `\n[Court date: ${daysUntil} days away]`;
      }
    }

    // Detect if this looks like a co-parent message being shared (for pattern extraction)
    const isAnalyzingMessage = files.length > 0 || looksLikeSharedMessage(message, history);

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads - process all files
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

          // Extract patterns and message for saving (happens quietly)
          if (isAnalyzingMessage) {
            const patterns = extractPatterns(fullResponse);
            const extractedMessage = extractCoparentMessage(fullResponse);
            
            const metadata: any = {};
            if (patterns.length > 0) metadata.patterns = patterns;
            if (extractedMessage) metadata.extractedMessage = extractedMessage;
            
            if (Object.keys(metadata).length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `\n\nError: ${errorMsg}` })}\n\n`));
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

function looksLikeSharedMessage(message: string, history: any[]): boolean {
  const lower = message.toLowerCase();
  
  const shareIndicators = [
    'he said', 'she said', 'they said',
    'he sent', 'she sent', 'they sent',
    'he texted', 'she texted', 'they texted',
    'he wrote', 'she wrote', 'they wrote',
    'just got this', 'just received', 'got this message',
    'look what he', 'look what she',
    'how do i respond',
    'what should i say',
  ];
  
  const generalIndicators = [
    'what should i wear',
    'what to expect',
    'how do i prepare',
    'help me stay calm',
    'i have court',
    'my hearing',
    'i\'m feeling',
    'i need a moment',
    'overwhelmed',
    'scared',
    'anxious',
  ];
  
  for (const indicator of generalIndicators) {
    if (lower.includes(indicator)) {
      return false;
    }
  }
  
  for (const indicator of shareIndicators) {
    if (lower.includes(indicator)) {
      return true;
    }
  }
  
  // Long message with quotes = probably pasted content
  if (message.length > 200 && (message.includes('"') || message.includes('\n'))) {
    return true;
  }
  
  return false;
}

function extractPatterns(text: string): string[] {
  const patterns: Record<string, string[]> = {
    'Gaslighting': ['gaslighting', 'gaslight', 'question your reality'],
    'DARVO': ['darvo', 'deny, attack', 'reverse victim'],
    'Intimidation': ['intimidation', 'intimidating'],
    'Threats': ['threat', 'threatening'],
    'Financial Abuse': ['financial abuse', 'financial control', 'financial coercion'],
    'Using Children as Weapons': ['using children', 'children as weapons', 'kids as leverage'],
    'Blame-Shifting': ['blame-shifting', 'blame shifting', 'shifting blame'],
    'False Accusations': ['false accusations', 'false accusation'],
    'Emotional Blackmail': ['emotional blackmail', 'guilt trip'],
    'Stonewalling': ['stonewalling', 'silent treatment'],
    'Monitoring/Stalking': ['monitoring', 'stalking', 'tracking', 'surveillance'],
    'Isolation Tactics': ['isolation', 'isolating'],
    'Minimizing/Denying': ['minimizing', 'denying', 'downplaying'],
    'Word Salad': ['word salad', 'circular'],
    'Moving Goalposts': ['moving goalposts', 'moving the goal'],
    'Projection': ['projection', 'projecting'],
    'Hoovering': ['hoovering', 'love bombing'],
    'Gatekeeping': ['gatekeeping', 'withholding information'],
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

function extractCoparentMessage(text: string): string | null {
  const match = text.match(/\[EXTRACTED MESSAGE\]\s*"?([^"]*)"?\s*\[\/EXTRACTED MESSAGE\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}