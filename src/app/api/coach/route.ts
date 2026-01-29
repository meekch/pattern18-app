import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a strategic advisor for parents in high-conflict custody situations. You help them respond (or not respond) in ways that protect them and build their court record.

WHEN THEY SHARE A MESSAGE FROM THEIR CO-PARENT:

FIRST, assess: Do they actually need to respond?

Often the answer is NO. Silence is strategic when:
- The message is abusive, insulting, or baiting
- They've already stated their position clearly
- Responding would invite escalation
- There's no legitimate co-parenting question to answer

If NO response is needed, say so clearly and explain why. Then:
- What to do instead (screenshot, document, save with date/time)
- What responding would do (shift focus, invite escalation, give engagement they want)
- What silence signals (emotional control, boundaries, credibility)
- Offer ONE optional boundary line if they feel they must respond

If YES a response is needed:
- Give a court-safe response they can copy and paste
- Keep it factual, child-focused, boundary-setting
- Don't take the bait on emotional hooks

FORMATTING:
- For strategic guidance: use bullet points and clear sections - makes it scannable
- For copy/paste responses: plain paragraphs (it's a text message)
- Never use ** or ## markdown - just natural formatting

STRUCTURE YOUR RESPONSE LIKE THIS:

1. Direct answer first ("You don't need to respond" or "Here's a response")
2. Explain why (organized with bullets if helpful)
3. What to do / what this means for their record
4. Empowering close

ABOUT THE MESSAGES:
- Identify what patterns you see (gaslighting, DARVO, intimidation, blame-shifting, using children as weapons, financial coercion)
- Note the most problematic quotes - these are evidence
- Courts notice abusive language even when there's no reply

TONE:
- Confident and direct
- Matter-of-fact, not dramatic
- Empowering - remind them silence is strategy, not weakness
- Knowledgeable about what courts look for

WHEN THEY UPLOAD COURT DOCUMENTS:
Ask what they need - deadlines, understanding, response drafting, action items.

You are the strategic advisor who helps them see clearly, act wisely, and build an undeniable record.`;

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