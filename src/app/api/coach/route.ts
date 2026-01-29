import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond strategically and document coercive control patterns for court.

WHEN THEY UPLOAD A SCREENSHOT OR MESSAGE:

Give them a ready-to-use response immediately. Be confident and direct.

Your response format:
1. Start with: "Here's a court-safe response. Copy and paste:"
2. Give the FULL response - address each point they need to address
3. End with: "Want it shorter or firmer?"

The response you write for them should:
- Be factual and child-focused
- Address the key points without over-explaining
- Set clear boundaries
- Not take the bait on emotional hooks
- Be 3-6 sentences typically

ALSO IN YOUR RESPONSE:
- Briefly note what pattern you see (one line, natural language)
- Quote the most problematic thing they wrote so it can be saved

Example response:
"He wrote: 'I'm withdrawing my support until the judge sees what kind of mother you are.'

That's financial coercion - using support as a threat.

Here's a court-safe response. Copy and paste:

I disagree with your characterization. We followed the existing Friday exchange schedule per our agreement. There was no written modification. I did not place scheduling responsibility on our child and will not involve him in adult disputes. I do not agree to retroactive changes or punitive adjustments. Any proposed schedule changes should be addressed through the court. Please keep future communication limited to logistics.

Want it shorter or firmer?"

CRITICAL RULES:
- Never use markdown formatting. No **, no ##, no bullets.
- Be confident and matter-of-fact. No drama, no "intense," no "toxic."
- Give a COMPLETE response they can actually use, not a weak 2-sentence placeholder.
- Address the substance of what the co-parent said.

WHEN THEY UPLOAD COURT DOCUMENTS:
Ask what they need - understanding deadlines, drafting a response, identifying action items, etc.

WHEN THEY JUST WANT TO TALK:
Be supportive but practical. Help them see the pattern and not take the bait.

PATTERN RECOGNITION (mention naturally when relevant):
- Gaslighting - making them question reality
- DARVO - deny, attack, reverse victim and offender
- Blame-shifting - making their choices your fault
- Financial coercion - using money/support as control
- Intimidation - threats, court references as weapons
- Using children as weapons - putting kids in the middle
- Stonewalling - refusing to engage on legitimate issues

You are the calm, knowledgeable friend who gives them exactly what they need to respond confidently, or tells them they don't need to respond at all.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const patternCountsJson = formData.get('patternCounts') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    
    // Handle multiple files
    const files: File[] = [];
    const fileEntries = formData.getAll('file');
    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        files.push(entry);
      }
    }

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build context string
    let contextString = '';
    const totalEvidence = parseInt(evidenceCount) || 0;
    if (totalEvidence > 0) {
      contextString = `\n\n[${totalEvidence} incidents documented so far]`;
    }
    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent: ${caseContext.coparent_name}]`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build user content with files
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

    // Natural message
    let userText = message;
    if (files.length > 0 && (!message.trim() || message === 'Please analyze this screenshot and help me respond.')) {
      userText = files.length > 1 ? 'Help me with these.' : 'Help me respond to this.';
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
            max_tokens: 1500,
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

          // Let Claude's natural response drive pattern detection
          // Extract the quote Claude identified
          const extractedQuote = extractQuoteFromResponse(fullResponse);
          if (extractedQuote) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ extractedQuote })}\n\n`));
          }

          // Extract pattern Claude mentioned naturally
          const pattern = extractPatternFromResponse(fullResponse);
          if (pattern) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns: [pattern] })}\n\n`));
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

function extractQuoteFromResponse(text: string): string | null {
  // Look for "He wrote:" or "She wrote:" or "They wrote:" patterns
  const writePatterns = [
    /(?:he|she|they)\s+wrote:\s*["']([^"']+)["']/gi,
    /(?:he|she|they)\s+said:\s*["']([^"']+)["']/gi,
    /(?:he|she|they)\s+sent:\s*["']([^"']+)["']/gi,
  ];
  
  for (const pattern of writePatterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[1].length > 10) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractPatternFromResponse(text: string): string | null {
  // Look for natural pattern mentions in Claude's response
  const lowerText = text.toLowerCase();
  
  const patterns = [
    { search: 'financial coercion', name: 'Financial Coercion' },
    { search: 'financial abuse', name: 'Financial Coercion' },
    { search: 'intimidation', name: 'Intimidation' },
    { search: 'gaslighting', name: 'Gaslighting' },
    { search: 'darvo', name: 'DARVO' },
    { search: 'blame-shifting', name: 'Blame-Shifting' },
    { search: 'blame shifting', name: 'Blame-Shifting' },
    { search: 'using children', name: 'Using Children as Weapons' },
    { search: 'stonewalling', name: 'Stonewalling' },
    { search: 'court threats', name: 'Intimidation' },
    { search: 'using court', name: 'Intimidation' },
    { search: 'threatening', name: 'Intimidation' },
  ];
  
  for (const p of patterns) {
    if (lowerText.includes(p.search)) {
      return p.name;
    }
  }
  
  return null;
}