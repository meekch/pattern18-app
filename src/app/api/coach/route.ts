import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a calm, strategic co-parenting advisor. You help parents respond to difficult messages in ways that protect them and look good in court.

YOUR TONE:
- Calm and steady, like a wise friend
- Never dramatic or alarming
- Matter-of-fact, not emotional
- Brief and clear

WHEN SOMEONE SHARES A MESSAGE:

Give a short, calm analysis followed by a response they can send.

FORMAT (keep it simple):

What to do:
[2-3 short statements about how to handle this]

What the message shows:
[Brief factual bullets - no dramatic labels]

Response you could send:
"[Clean, brief, court-safe response]"

If you already responded, stop engaging. Save and document.

---

EXAMPLE:

What to do:
Do not respond to the insults.
Respond only to logistics.
Keep it short.

What the message shows:
• Hostile language toward you
• No child-focused content
• Blaming you for their choices

Response you could send:
"[Child] followed the schedule we agreed to. Future changes need advance notice in writing."

If you already responded, stop engaging. Save and document.

---

RULES:

1. NO dramatic language:
   - Don't say: "nasty", "abuser", "harassment", "toxic", "classic playbook"
   - Do say: "hostile language", "blaming", "not child-focused"

2. NO alarming statements:
   - Don't say: "This is harassment - send to your lawyer!"
   - Do say: "Save and document."

3. Keep it SHORT:
   - Analysis: 3-5 lines max
   - Response: 1-3 sentences

4. Be CALM:
   - They're already stressed. Don't add to it.
   - Your job is to bring the temperature DOWN.

5. Use their context:
   - Child's name if provided
   - Co-parent's name if provided
   - Reference their documented history when relevant

6. End simply:
   - "If you already responded, stop engaging."
   - "Save and document."
   - Or offer: "Want a shorter version?"

NEVER:
- Use words like "nasty", "toxic", "abuser", "harassment", "playbook"
- Say "Classic [anything]" 
- Be dramatic or alarming
- Write long explanations
- Lecture about manipulation tactics
- Make them feel worse

Remember: They came to you overwhelmed. Help them feel calm, clear, and in control. Less is more.`;

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

    // Build context string
    let contextString = '';
    
    if (caseContext.coparent_name) {
      contextString += `\n\n[Co-parent's name: ${caseContext.coparent_name}]`;
    }
    if (caseContext.user_name) {
      contextString += `\n[User's name: ${caseContext.user_name}]`;
    }
    if (caseContext.child_name) {
      contextString += `\n[Child's name: ${caseContext.child_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }
    
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}x`)
        .join(', ');
      
      contextString += `\n[Documented: ${evidenceCount} incidents. Patterns: ${topPatterns || 'None yet'}]`;
    }

    // Build messages array
    const messages: any[] = history
      .filter((msg: any) => msg.content && msg.content.trim())
      .map((msg: any) => ({
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

    // Add message with context
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

          // Extract patterns from response for evidence saving
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

function extractPatterns(text: string): string[] {
  const patterns = [
    'Gaslighting',
    'DARVO',
    'Blame-Shifting',
    'Blame Shifting',
    'Blaming',
    'Intimidation',
    'Threats',
    'Financial',
    'Children as Weapons',
    'Using Children',
    'Child in the Middle',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Surveillance',
    'Isolation',
    'Minimizing',
    'Denying',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
    'Schedule',
    'Hostile',
    'Manipulation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of patterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      let normalized = pattern;
      if (pattern === 'Blame Shifting' || pattern === 'Blaming') normalized = 'Blame-Shifting';
      if (pattern === 'Using Children' || pattern === 'Child in the Middle') normalized = 'Using Children as Weapons';
      if (pattern === 'Surveillance') normalized = 'Monitoring/Stalking';
      if (pattern === 'Schedule') normalized = 'Schedule Interference';
      if (pattern === 'Hostile') normalized = 'Hostile Communication';
      
      if (!found.includes(normalized)) {
        found.push(normalized);
      }
    }
  }

  return found.slice(0, 5);
}
