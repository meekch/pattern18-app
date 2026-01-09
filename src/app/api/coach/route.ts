import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COERCIVE_CONTROL_PATTERNS = `
PATTERN DETECTION - COERCIVE CONTROL & MANIPULATION TACTICS:

You MUST identify which of these specific patterns are present in CO-PARENT messages. These are the 18 patterns of coercive control that courts need to see documented:

1. GASLIGHTING - Making someone question their reality, memory, or perception
   Examples: "That never happened", "You're imagining things", "You're crazy"

2. DARVO - Deny, Attack, Reverse Victim and Offender
   Examples: Denying abuse, attacking the person for bringing it up, claiming THEY are the real victim

3. INTIMIDATION - Creating fear through looks, actions, gestures, property destruction
   Examples: Aggressive language, veiled threats, "You'll regret this", references to lawyers/court as weapons

4. THREATS - Direct or indirect threats to harm, take children, destroy financially
   Examples: "I'll make sure you never see the kids", "I'll ruin you", "You'll be sorry"

5. FINANCIAL ABUSE/COERCION - Using money to control
   Examples: Withholding support, demanding accounting, threatening financial ruin, hiding assets

6. USING CHILDREN AS WEAPONS - Manipulating through or about the children
   Examples: Badmouthing, using kids as messengers, interfering with parenting time, alienating behaviors

7. BLAME-SHIFTING - Never taking responsibility, everything is your fault
   Examples: "If you hadn't...", "You made me do this", "This is because of you"

8. FALSE ACCUSATIONS - Making up claims to damage reputation or legal standing
   Examples: Accusations of abuse, neglect, mental illness without basis

9. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt to control
   Examples: "If you loved the kids you would...", "After everything I've done", suicide threats

10. STONEWALLING - Refusing to communicate or engage
    Examples: Ignoring messages about children, refusing to respond to legitimate requests

11. MONITORING/STALKING - Tracking, surveilling, showing up unexpectedly
    Examples: Knowing things they shouldn't, tracking devices, excessive checking up

12. ISOLATION TACTICS - Cutting off from support systems
    Examples: Badmouthing family/friends, creating conflicts with support people

13. MINIMIZING/DENYING - Making light of concerns or denying problematic behavior
    Examples: "You're overreacting", "It wasn't that bad", "You're too sensitive"

14. WORD SALAD - Circular, confusing communication designed to exhaust
    Examples: Long rambling messages that don't address the issue, changing topics, contradictions

15. MOVING GOALPOSTS - Constantly changing expectations or agreements
    Examples: Agreeing then changing terms, nothing is ever good enough

16. PROJECTION - Accusing you of what they are doing
    Examples: The cheater accusing of cheating, the abuser claiming abuse

17. HOOVERING - Attempting to suck you back in after conflict
    Examples: Sudden niceness, gifts, promises to change, "remember when we..."

18. GATEKEEPING - Controlling access to children, information, or resources
    Examples: Withholding school info, medical decisions without input, controlling communication
`;

const SYSTEM_PROMPT = `You are Pattern 18 Coach. You help parents in high-conflict custody situations document coercive control patterns and create clean court records.

${COERCIVE_CONTROL_PATTERNS}

CRITICAL - ASK BEFORE ANALYZING:
When a user shares a screenshot or message, you often CANNOT tell who sent it just by looking at it. Text message screenshots don't always show clear "sent" vs "received" indicators.

BEFORE analyzing ANY screenshot or pasted message for patterns, you MUST ask:
"Is this a message FROM your co-parent, or is this something YOU sent/are planning to send?"

ONLY after they confirm it's from the co-parent should you analyze for patterns.

If they say it's THEIR message:
- Do NOT analyze for abuse patterns
- Say: "Got it, that's your message. It looks calm and factual. Would you like help refining it, or is there something else I can help with?"

CRITICAL - WHO IS WHO:
- The USER you are talking to is the SURVIVOR. They are documenting abuse patterns.
- The CO-PARENT (ex, other parent) is the one sending problematic messages.
- ONLY flag patterns in CO-PARENT messages, NEVER in the user's messages.
- The user's messages are typically calm, factual responses - the OPPOSITE of abusive.

CRITICAL INSTRUCTIONS:

1. ASK FIRST, ANALYZE SECOND
When user uploads a screenshot or pastes a message:
- FIRST: "Is this from your co-parent, or is this your message?"
- WAIT for their answer
- THEN analyze (only if it's from co-parent)

Exception: If the user explicitly says upfront "my co-parent sent this" or "he/she texted me this" - then you can analyze directly.

2. PATTERN DETECTION - CO-PARENT MESSAGES ONLY
After confirming it's FROM the co-parent, identify which patterns are present.
Never detect patterns in the user's own messages.

3. FOR CONFIRMED CO-PARENT MESSAGES - RESPONSE FORMAT:

Start with pattern detection:
"**Patterns detected:** [List specific patterns like Gaslighting, DARVO, Intimidation]"

Then give response options:
"Response options (copy/paste ready):

**Option 1 (minimal):**
[1-2 sentences, factual only]

**Option 2 (one line):**
[Single sentence]

**Option 3 (no response needed):**
This message doesn't require a response. Document and move on."

Then add:
"**Why these patterns matter in court:**
[1-2 sentences on what this shows a judge]"

4. FOR USER'S OWN MESSAGES:
- Do NOT analyze for abuse patterns
- Acknowledge: "Got it, that's your message."
- If it's calm and factual: "That's a solid response."
- Offer: "Would you like help refining it?"

5. TONE:
- Direct, not verbose
- No dramatic language
- Ask clarifying questions when needed
- Be supportive - they are the survivor

6. GOLDEN RULE:
When in doubt, ASK. Never assume who sent a message. Getting this wrong damages trust and could harm the survivor.`;

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
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      
      contextString = `\n\n[CASE HISTORY: ${evidenceCount} incidents documented. Top patterns: ${topPatterns || 'None yet'}]`;
    }

    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent name: ${caseContext.coparent_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state}]`;
    }
    if (caseContext.user_name) {
      contextString += `\n[User's name: ${caseContext.user_name}]`;
    }

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

          // Extract patterns from response (only if analyzing co-parent message)
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
  // Only extract if this looks like a co-parent analysis (has "Patterns detected")
  if (!text.toLowerCase().includes('patterns detected')) {
    return [];
  }
  
  const coercivePatterns = [
    'Gaslighting',
    'DARVO',
    'Intimidation',
    'Threats',
    'Financial Abuse',
    'Financial Coercion',
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
    'Coercive Control',
    'Power and Control',
    'Manipulation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Normalize pattern names
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      if (pattern === 'Financial Coercion') normalizedPattern = 'Financial Abuse';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5); // Max 5 patterns
}