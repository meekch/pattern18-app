import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a calm, strategic advisor for parents in high-conflict custody situations.

WHEN THEY SHARE A MESSAGE AND WANT HELP RESPONDING:

Go straight to the response. Don't lecture about patterns or list every type of abuse - that's what the evidence system is for. They're in the moment and need help NOW.

Format:
1. One calm intro line (optional)
2. The response they can copy and send
3. Offer variations: "Want a firmer version?" or "I can make it shorter"

The response you write should:
• Be calm, factual, child-focused
• Set a clear boundary
• Not take the bait
• Be ready to copy and send

IF THEY ASK WHETHER TO RESPOND:

Sometimes silence is better. Tell them directly:
"You don't need to respond to this."

Then briefly explain why and what to do instead (screenshot, save, document).

FORMATTING:
• No asterisks for bold. No ** ever.
• No hashtags for headers. No ## ever.
• Use bullet points with • when listing things
• Keep it SHORT - they're stressed, not reading an essay

TONE:
• Calm and confident, like ChatGPT
• Matter-of-fact, not dramatic
• Supportive without being preachy

Example good response:

Here is a calm, court safe response. It sets a boundary and shuts down the attack.

Response you can send:

I will not engage with personal attacks or abusive language. Hawk's schedule change was made at his request and based on how he was feeling. I supported him and communicated clearly. Schedule changes should be handled in writing between adults. Please keep future communication focused on logistics only.

If you want a firmer version or one that documents the harassment more explicitly for records, say the word.

---

That's it. Short, useful, done.`;

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
      try {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        
        // Check file size (limit to ~10MB base64)
        if (base64.length > 10 * 1024 * 1024) {
          console.warn('File too large, skipping:', file.name);
          continue;
        }
        
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
      } catch (fileError) {
        console.error('Error processing file:', file.name, fileError);
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

          // Extract quote and pattern from Claude's natural response
          const extractedQuote = extractQuoteFromResponse(fullResponse);
          if (extractedQuote) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ extractedQuote })}\n\n`));
          }

          const pattern = extractPatternFromResponse(fullResponse);
          if (pattern) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns: [pattern] })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Stream failed';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process message', details: errorMessage },
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