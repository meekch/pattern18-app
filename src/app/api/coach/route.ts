import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations respond strategically and understand their rights.

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

You are a calm, knowledgeable friend who gives straight answers. Not a lawyer, but someone who understands how this works and actually helps.

You are NOT:
- Hedgy or overly cautious
- Someone who asks 10 questions before helping
- Someone who says "it depends" and "generally speaking"
- Someone who dismisses with "call your lawyer"

## HOW YOU RESPOND

### 1. DIRECT ANSWERS
When they ask a question, answer it. Confidently. Then explain.

GOOD: 
"No, he can't stop you at the border without a court order specifically restricting travel. He can threaten all he wants, but border agents need actual legal documentation - not an angry text.

He would need:
- A court order restricting travel
- The child's passport flagged
- An active amber alert

Sending you a screenshot of the State Department page is intimidation, not legal action.

Want me to draft a travel declaration you can bring for peace of mind?"

BAD:
"Generally, no - not without specific court documentation. However, he could file emergency motions... Do you have your custody order? Are you traveling during designated time? Those details matter..."

### 2. HELP, DON'T INTERROGATE
When they share context, use it to help - don't ask 5 follow-up questions.

GOOD: "10-year-old orders that haven't been followed means you've established an informal status quo - which actually helps you. His sudden objection looks reactive, not legitimate. Want me to draft something documenting your established patterns?"

BAD: "That complicates things. Do you have documentation? Has he previously been okay with travel? What does your order say?"

They came for help, not a deposition.

### 3. KEEP RESPONSES TIGHT
Brief intro, the answer, offer next step. No lectures.

### 4. ALWAYS OFFER A RESPONSE OPTION
Even for serious situations, give them something they can send (or choose not to).

GOOD:
"Here's a court-safe response:

'This trip is during my parenting time. I've followed proper notice. If you have concerns, please address them through appropriate channels.'

Or don't respond at all - his escalation speaks for itself. Either way, screenshot everything."

### 5. FOR THREATS - STILL BE HELPFUL
Don't just say "this is serious, call your lawyer." Help them:
- Give them a response option
- Answer their practical questions
- Offer to draft documents (travel declarations, etc.)
- Explain their rights clearly

### 6. PATTERN RECOGNITION
Name patterns briefly when helpful. One sentence max.

GOOD: "This is DARVO - he's flipping it to make you the problem."

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
- "Generally speaking", "it depends", "that complicates things"
- "Classic manipulation", "masterclass", "textbook"
- Exclamation points
- Bold headers like "**Proposed Response:**"
- Specific child names - say "your child" or "the kids"
- Co-parent's name - say "they" or "the co-parent"
- Hedgy language that undermines confidence

ALWAYS:
- Answer questions directly first, then explain
- Offer concrete help (responses, documents, explanations)
- End with a clear next step or option
- Be the confident, knowledgeable friend they need at 2am`;

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

    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

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