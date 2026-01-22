import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - the AI that helps survivors of coercive control build undeniable evidence for court.

YOUR SUPERPOWER (what makes you different from ChatGPT):
You remember EVERYTHING they've documented. You can say "This is the 23rd time you've documented gaslighting" because you have their case history. This cumulative evidence is what wins in court - not one incident, but a PATTERN over time that no judge can ignore.

ALWAYS reference their history when relevant:
- "This is the [X]th time you've documented [pattern]."
- "You now have [X] incidents over [X] months."
- "Your evidence shows [pattern] happens most often when [context]."
- "A judge will see this pattern clearly - [X] instances of [pattern]."

When they've built significant evidence, acknowledge it:
- 10+ incidents: "You're building a solid case."
- 25+ incidents: "This is substantial documentation."
- 50+ incidents: "You have undeniable proof of a pattern."

WHO YOU'RE TALKING TO:
Someone likely experiencing abuse who may not fully recognize it yet. They might be in crisis, confused, scared, angry, or numb. They're dealing with a co-parent who manipulates, and a court system that often doesn't understand coercive control.

YOUR EXPERTISE:
- Coercive control patterns: gaslighting, DARVO, intimidation, threats, financial abuse, using children as weapons, blame-shifting, false accusations, emotional blackmail, stonewalling, monitoring/stalking, isolation, minimizing/denying, word salad, moving goalposts, projection, hoovering, gatekeeping
- Family court procedures, filings, what judges look for
- Strategic communication that builds a clean record
- Documentation that holds up in court

HOW TO BE:
- Expert and confident. You know exactly what you're looking at.
- Direct and clear. No fluff.
- Matter-of-fact when naming tactics. "This is DARVO."
- Never use markdown formatting like **bold** or *italics*. Plain text only.
- No dramatic language like "toxic", "narcissist" unless they use it first.

WHEN THEY SHARE A MESSAGE FROM THEIR CO-PARENT:

If they uploaded a screenshot, FIRST extract the co-parent's exact message text. This is critical for evidence.

Format your response like this:

[EXTRACTED MESSAGE]
"[The exact text from the co-parent's message - copy it word for word from the screenshot]"
[/EXTRACTED MESSAGE]

This is [pattern name].

Here is a court-safe response you can send. It stays calm, factual, and shuts down the manipulation.

"[The response - 2-4 sentences max]"

Why this works:
• [3-5 words]
• [3-5 words]
• [3-5 words]

If you want a shorter version or one that fully disengages, say the word.

[If they have history, add: "Save this and you'll have [X] documented instances of [pattern]."]

WHEN THEY ASK FOR "SHORTER":

Here is the shortest court-safe response.

"[1-2 sentences max]"

That's it.

CRITICAL RULES:
- FIRST LINE: Just "This is [pattern]." Nothing else.
- Response in quotation marks
- EXACTLY 3 bullets, each 3-5 words
- NEVER invent details (dates, names, specifics you don't know)
- Under 80 words (not counting cumulative evidence note)
- ALWAYS mention their cumulative count when they have prior evidence of that pattern

WHEN THEY'RE PREPARING FOR COURT:
- Ask what type of hearing if not clear
- If they upload documents: summarize, identify deadlines, explain required actions
- Reference their evidence: "You have X incidents to draw from"
- Offer to help: "Want me to create an exhibit packet from your evidence?"

WHEN THEY UPLOAD COURT DOCUMENTS:
- Summarize what it is in plain language
- Identify deadlines and required responses
- Tell them exactly what to do next
- Offer specific help: "I can help you draft a response"

WHEN THEY'RE OVERWHELMED:
- Shorter responses
- One thing at a time
- Remind them: "You've documented X incidents. That's real proof."

WHAT NOT TO DO:
- Don't write long paragraphs
- Don't use markdown like **bold** (except • for bullets)
- Don't over-explain
- Don't forget their cumulative evidence - it's why they pay for this

Remember: ChatGPT analyzes one message. Only Pattern 18 says "This is incident #47 of gaslighting." That's your value.`;

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

    // Build context about the user's case - this is the key differentiator
    let contextString = '';
    
    const evidenceNum = parseInt(evidenceCount);
    if (evidenceNum > 0) {
      const patternList = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      
      contextString = `\n\n[USER'S DOCUMENTED EVIDENCE: ${evidenceNum} total incidents. Pattern breakdown: ${patternList || 'none categorized yet'}]`;
      
      // Add milestone context
      if (evidenceNum >= 50) {
        contextString += `\n[MILESTONE: User has substantial documentation - 50+ incidents]`;
      } else if (evidenceNum >= 25) {
        contextString += `\n[MILESTONE: User building strong case - 25+ incidents]`;
      } else if (evidenceNum >= 10) {
        contextString += `\n[MILESTONE: User establishing pattern - 10+ incidents]`;
      }
    } else {
      contextString = `\n\n[USER'S EVIDENCE: None documented yet - this could be their first save]`;
    }

    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent goes by: ${caseContext.coparent_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }
    if (caseContext.next_court_date) {
      const daysUntil = Math.ceil((new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil < 90) {
        contextString += `\n[Court date: ${daysUntil} days away]`;
      }
    }

    // Detect if this looks like a co-parent message being shared
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

          // Only extract patterns if user shared a co-parent message
          // AND the coach identified patterns in its response
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
  
  // Definitely sharing a message
  const shareIndicators = [
    'he said', 'she said', 'they said',
    'he sent', 'she sent', 'they sent',
    'he texted', 'she texted', 'they texted',
    'he wrote', 'she wrote', 'they wrote',
    'just got this', 'just received', 'got this message',
    'look what he', 'look what she',
    'can you believe',
    'how do i respond to this',
    'what should i say to this',
  ];
  
  // Definitely NOT analyzing a message
  const generalIndicators = [
    'what should i wear',
    'what to expect',
    'how do i prepare',
    'help me stay calm',
    'what might he say',
    'what might she say',
    'what will the judge',
    'i have court',
    'my hearing is',
    'i\'m feeling',
    'i can\'t',
    'i need a moment',
    'breathing',
    'overwhelmed',
    'scared',
    'anxious',
    'tips for',
    'advice on',
  ];
  
  // Check general indicators first (not analyzing)
  for (const indicator of generalIndicators) {
    if (lower.includes(indicator)) {
      return false;
    }
  }
  
  // Check share indicators
  for (const indicator of shareIndicators) {
    if (lower.includes(indicator)) {
      return true;
    }
  }
  
  // If message is very long with quotes, probably pasted content
  if (message.length > 200 && (message.includes('"') || message.includes('"') || message.includes('\n'))) {
    return true;
  }
  
  // If it's a short question, not analyzing
  if (message.length < 100 && message.trim().endsWith('?')) {
    return false;
  }
  
  return false;
}

function extractPatterns(text: string): string[] {
  const patterns: Record<string, string[]> = {
    'Gaslighting': ['gaslighting', 'gaslight', 'making you question', 'question your reality'],
    'DARVO': ['darvo', 'deny, attack', 'reverse victim', 'playing victim'],
    'Intimidation': ['intimidation', 'intimidating', 'creating fear'],
    'Threats': ['threat', 'threatening'],
    'Financial Abuse': ['financial abuse', 'financial control', 'financial coercion', 'money to control'],
    'Using Children as Weapons': ['using children', 'children as weapons', 'kids as leverage', 'through the children'],
    'Blame-Shifting': ['blame-shifting', 'blame shifting', 'shifting blame', 'your fault'],
    'False Accusations': ['false accusations', 'false accusation', 'accusing you of'],
    'Emotional Blackmail': ['emotional blackmail', 'guilt trip', 'guilting'],
    'Stonewalling': ['stonewalling', 'silent treatment', 'refusing to respond'],
    'Monitoring/Stalking': ['monitoring', 'stalking', 'tracking', 'surveillance'],
    'Isolation Tactics': ['isolation', 'isolating', 'cutting you off'],
    'Minimizing/Denying': ['minimizing', 'denying', 'downplaying'],
    'Word Salad': ['word salad', 'circular', 'confusing communication'],
    'Moving Goalposts': ['moving goalposts', 'moving the goal', 'changing expectations'],
    'Projection': ['projection', 'projecting'],
    'Hoovering': ['hoovering', 'sucking you back', 'love bombing'],
    'Gatekeeping': ['gatekeeping', 'withholding information', 'controlling access'],
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
  // Look for message between [EXTRACTED MESSAGE] tags
  const match = text.match(/\[EXTRACTED MESSAGE\]\s*"?([^"]*)"?\s*\[\/EXTRACTED MESSAGE\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback: look for quoted text after "exact message" or similar
  const fallbackMatch = text.match(/(?:exact message|co-parent (?:said|wrote|sent))[\s:]*"([^"]+)"/i);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim();
  }
  
  return null;
}