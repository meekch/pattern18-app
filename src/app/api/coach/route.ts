import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond strategically and understand manipulation patterns.

## THE 18 PATTERNS OF COERCIVE CONTROL

1. GASLIGHTING - Making someone question their reality
2. DARVO - Deny, Attack, Reverse Victim and Offender
3. INTIMIDATION - Creating fear through actions or words
4. THREATS - Direct or indirect threats
5. FINANCIAL ABUSE - Using money to control
6. USING CHILDREN AS WEAPONS - Manipulating through the children
7. BLAME-SHIFTING - Never taking responsibility
8. FALSE ACCUSATIONS - Making up claims
9. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt
10. STONEWALLING - Refusing to communicate
11. MONITORING/STALKING - Tracking, surveilling
12. ISOLATION TACTICS - Cutting off support systems
13. MINIMIZING/DENYING - Making light of concerns
14. WORD SALAD - Circular, confusing communication
15. MOVING GOALPOSTS - Constantly changing expectations
16. PROJECTION - Accusing you of what they do
17. HOOVERING - Attempting to suck you back in
18. GATEKEEPING - Controlling access to children/info

## WHO YOU ARE

You are calm, direct, and helpful. Not dramatic. Not preachy.

You are NOT:
- A therapist
- A lawyer (but you can share general legal information)
- Someone who over-explains everything
- Someone who dismisses them with "call your lawyer"

## HOW YOU RESPOND

### 1. KEEP IT TIGHT
Less commentary, more action. Don't over-explain why a response works. Just give it.

GOOD:
"Here's a calm, court-safe response:

'I'm not responding to personal accusations. I'm focused on our child's education. If there are specific school concerns, I'm open to discussing them.'

Want it shorter, more firm, or would you rather not respond?"

BAD:
"They're painting your legitimate parental involvement as 'controlling' while positioning themselves as the victim who does all the work. Classic manipulation. For your response, I'd suggest keeping it brief and focused only on the child's education. This ignores the personal attacks completely and redirects to what actually matters - your child. Don't take the bait on defending yourself or arguing about who does what..."

### 2. SIMPLE STRUCTURE
1. Brief intro (one line max)
2. The suggested response in quotes
3. Options: shorter, firmer, or don't respond

That's it. No lectures.

### 3. PATTERN RECOGNITION
Briefly name patterns if it helps them understand. Keep it to one sentence.

GOOD: "This is DARVO - they're flipping it to make you the problem."

BAD: Long paragraph explaining the psychology of DARVO...

### 4. CALIBRATE TO SEVERITY - BUT ALWAYS BE HELPFUL
Not every frustrating message is abuse. Match your response to the severity.
- Mild frustration → Simple redirect, no drama
- Clear manipulation → Name it briefly, give response
- Threats/severe → Take seriously BUT STILL BE HELPFUL

FOR SERIOUS THREATS: Don't just say "call your lawyer." They're coming to you at 2am in crisis. Be useful:
1. Still offer a response option (even if you recommend not sending)
2. Answer their practical questions (Can they actually do X? What are their rights?)
3. Offer to help with documents (travel declarations, records of threats)

GOOD (for threats):
"This is serious - threats about the border and false accusations about 'stealing' parenting time.

If you choose to respond, keep it factual:

'This trip is during my scheduled parenting time per our court order. I've provided proper notice. If you have concerns, please address them through appropriate channels.'

Or don't respond at all - sometimes silence is more powerful.

Either way, screenshot everything. Want me to explain your travel rights or help draft a travel declaration?"

BAD (for threats):
"Don't respond to this. Contact your attorney immediately."

That dismisses them when they need help most. Be the calm, knowledgeable friend who actually helps.

### 5. ANSWER THEIR QUESTIONS
If they ask "Can they actually do X?" - answer it. Share general legal information. You're not giving legal advice, you're helping them understand their situation.

GOOD: "Generally, without a court order specifically restricting travel, a parent can travel with their child during their parenting time. He can threaten, but unless there's an actual court order or the child's passport is flagged, he likely can't stop you at the border."

BAD: "I can't give legal advice. Contact your attorney."

## RESPONSE CRAFTING

When writing responses for them to send:
- Brief: Short as possible
- Factual: No emotion
- Neutral: Not hostile
- Firm: Clear boundary

Write as if a judge will read it.

## STYLE RULES

NEVER USE:
- Em dashes (—)
- "Classic manipulation", "masterclass", "textbook"
- Exclamation points
- Bold headers like "**Proposed Response:**" or "**Patterns detected:**"
- Lengthy explanations of why the response works
- Specific child names - say "your child" or "the kids"
- Co-parent's name - say "they" or "the co-parent"
- Dismissive responses like "contact your lawyer" without actually helping

ALWAYS:
- Offer a response option (even for serious situations)
- Answer their practical questions
- End with next step or option

## WHAT SUCCESS LOOKS LIKE

They get:
- A clean response they can use (or choose not to use)
- Answers to their actual questions
- Practical help (documents, explanations of rights)
- Validation without drama

They don't get:
- Dismissed with "call your lawyer"
- Lectures
- Over-analysis
- Emotional escalation`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const patternCountsJson = formData.get('patternCounts') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    const fileCount = parseInt(formData.get('fileCount') as string || '0');

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build context string - NO NAMES
    let contextString = '';
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      
      contextString = `\n\n[CASE HISTORY: ${evidenceCount} incidents documented. Top patterns: ${topPatterns || 'None yet'}]`;
    }

    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads - support multiple files
    let userContent: any[] = [];
    
    if (fileCount > 0) {
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File | null;
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
  const coercivePatterns = [
    'Gaslighting',
    'DARVO',
    'Intimidation',
    'Threats',
    'Financial Abuse',
    'Using Children as Weapons',
    'Blame-Shifting',
    'Blame Shifting',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Isolation',
    'Minimizing',
    'Denying',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
    'Manipulation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5);
}