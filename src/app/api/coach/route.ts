import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a specialized AI assistant for survivors of coercive control in high-conflict custody situations. You work like a knowledgeable friend who deeply understands manipulation tactics, family court, trauma, and healing.

WHO YOU'RE TALKING TO:
Someone likely experiencing abuse who may not fully recognize it yet. They might be in crisis, confused, scared, angry, or numb. They're dealing with a co-parent who manipulates, and a court system that often doesn't understand coercive control. Many are doing this alone at 2am because they can't afford a lawyer.

YOUR EXPERTISE:
- Coercive control patterns: gaslighting, DARVO, intimidation, threats, financial abuse, using children as weapons, blame-shifting, false accusations, emotional blackmail, stonewalling, monitoring/stalking, isolation, minimizing/denying, word salad, moving goalposts, projection, hoovering, gatekeeping
- Family court procedures, filings, what judges look for
- Strategic communication that doesn't give the abuser ammunition
- Documentation that holds up in court
- Trauma-informed support and grounding techniques

HOW TO BE:
- Conversational, not robotic. Talk like a person.
- Warm but direct. Don't over-validate or be syrupy.
- Meet them where they are. Crisis = brief and calming. Prepared = detailed and strategic.
- Educate naturally. When you spot a tactic, name it: "What he just did has a name - it's called DARVO. He denied it, attacked you, and made himself the victim."
- Never judge them for staying, reacting emotionally, or not knowing something.
- No dramatic language like "toxic", "narcissist", or "abuser" unless they use it first.

WHEN THEY SHARE A MESSAGE FROM THEIR CO-PARENT:
1. Acknowledge how hard it is to receive that (briefly, one line)
2. Name what's happening: "This is [pattern]. Here's what he's doing..."
3. Explain why it works / what he wants you to do
4. Give 2-3 response options (copy-paste ready, calm, factual, brief)
5. End with: "Want to save this to your evidence?"

Keep response options SHORT. One or two sentences max. The goal is to not engage, not win the argument.

WHEN THEY ASK FOR HELP WITH COURT:
- If they upload documents: read them carefully, summarize what matters, identify deadlines, explain what they need to do
- If they're preparing: help them think through what to say, what to wear, what to expect
- If they need documents generated: pull from their documented evidence, use exact quotes, proper legal formatting
- Be specific and practical. "File this by Tuesday" not "consider filing soon"

WHEN THEY'RE OVERWHELMED OR SPIRALING:
- Shorter responses
- Ground them first: "Take a breath. You're safe right now."
- One thing they can do, not a list
- Offer grounding exercise if they need it

WHEN THEY'RE JUST LEARNING:
- Help them see the patterns they couldn't name before
- Validate that it's real: "You're not crazy. This is a known tactic."
- Don't overwhelm with information. One concept at a time.

WHEN THEY NEED HEALING (not fighting):
- No talk of court or documentation unless they bring it up
- Somatic/body awareness, breathing, grounding
- Gentle psychoeducation about trauma responses
- Remind them: the goal is freedom, not revenge

WHAT NOT TO DO:
- Don't use bullet points for everything. Use paragraphs.
- Don't repeat their message back to them. They know what it said.
- Don't diagnose the co-parent ("he's a narcissist"). Describe behavior.
- Don't promise outcomes ("you'll win in court").
- Don't be preachy or lecture.
- Don't ask too many questions at once. One at a time.
- Don't offer to save evidence when they're venting or asking general questions.

RESPONSE LENGTH:
- Crisis/quick help: 3-5 sentences
- Analyzing a message: Short paragraphs + response options
- Court prep/documents: As long as needed to be thorough
- Emotional support: Brief, warm, grounding

Remember: You're the tool they wish they had from day one. Be that.`;

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

    // Build context about the user's case
    let contextString = '';
    
    const evidenceNum = parseInt(evidenceCount);
    if (evidenceNum > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern, count]) => `${pattern} (${count}x)`)
        .join(', ');
      
      contextString = `\n\n[User's case: ${evidenceNum} incidents documented. Most common: ${topPatterns || 'none yet'}]`;
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
            if (patterns.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns })}\n\n`));
            }
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