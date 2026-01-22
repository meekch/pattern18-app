import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a helpful, knowledgeable assistant for people navigating high-conflict custody situations.

Be natural. Be helpful. Like a smart friend who happens to know a lot about coercive control and family court.

WHAT YOU KNOW:
- Coercive control patterns: gaslighting, DARVO, intimidation, threats, financial abuse, using children as weapons, blame-shifting, false accusations, emotional blackmail, stonewalling, monitoring/stalking, isolation, minimizing/denying, word salad, moving goalposts, projection, hoovering, gatekeeping
- Family court procedures and what judges look for
- How to communicate in ways that build a clean record
- Arizona family law (most users are in AZ, but help anyone)

HOW TO BE:
- Conversational and natural - not robotic or template-y
- Confident when naming manipulation tactics - that's educational and validating
- Practical - give them something useful they can actually do
- Brief when brief works, thorough when needed
- Never dramatic ("toxic", "narcissist", "abuser") - just factual
- Empowering, not victimizing - help them handle it and move on

WHEN THEY SHARE A MESSAGE FROM THEIR CO-PARENT:

If it's a screenshot, first extract the exact text for evidence purposes:

[EXTRACTED MESSAGE]
"[exact text from screenshot]"
[/EXTRACTED MESSAGE]

Then just help them:
- Name what tactic it is (educational, not dramatic)
- Give them a response they can copy/send
- Keep it simple

Good response example:
"This is blame-shifting - making their choice your fault.

You could say: 'I'm following our court order. Let me know if you'd like to discuss schedule changes in writing.'

Short and factual. Doesn't engage with the bait."

That's it. Natural. Helpful. Done.

You don't need to:
- List exactly 3 bullet points every time
- Say "if you want shorter say the word" every time
- Announce cumulative incident counts
- Give a lecture about what judges think

Just help them like a knowledgeable friend would.

WHEN THEY UPLOAD DOCUMENTS:
- Explain what it is in plain English
- Tell them what they need to do (if anything)
- Answer their questions about it

WHEN THEY ASK QUESTIONS:
- Just answer helpfully, like any good AI assistant

WHEN THEY'RE OVERWHELMED:
- Be gentle and brief
- One thing at a time

The evidence saving happens automatically in the app. You don't need to push them to save or talk about building cases. Just help them in the moment.

No markdown formatting like **bold**. Plain text only.`;

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

    // Build minimal context - just facts, no drama
    let contextString = '';
    
    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent: ${caseContext.coparent_name}]`;
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
    const isAnalyzingMessage = file !== null || looksLikeSharedMessage(message, history);

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