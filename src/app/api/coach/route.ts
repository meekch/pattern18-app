import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Pattern 18 Coach API v2
 * 
 * Rebuilt to match the ChatGPT experience that actually worked:
 * - Conversational, not clinical
 * - One answer at a time, refined together
 * - Validation before strategy
 * - Knows their story
 * - Seamless flow to documents
 */

const COERCIVE_CONTROL_PATTERNS = {
  gaslighting: {
    name: "Gaslighting",
    description: "Making someone question their reality, memory, or perception",
    examples: ["That never happened", "You're imagining things", "You're crazy", "That's not what I said"],
    citation: "Stern, R. (2018). The Gaslight Effect."
  },
  darvo: {
    name: "DARVO",
    description: "Deny, Attack, Reverse Victim and Offender - denying behavior, attacking the person for bringing it up, claiming to be the real victim",
    examples: ["I never did that", "You're the abusive one", "Look what you made me do"],
    citation: "Freyd, J.J. (1997). Violations of power, adaptive blindness and betrayal trauma theory."
  },
  intimidation: {
    name: "Intimidation",
    description: "Creating fear through tone, language, gestures, or implied threats",
    examples: ["Have fun crossing the border", "I'll see you in court", "You'll regret this"],
    citation: "Bancroft, L. (2002). Why Does He Do That?"
  },
  threats: {
    name: "Threats",
    description: "Direct or indirect threats about custody, finances, relationships, or legal action",
    examples: ["I'll take the kids", "I'll ruin you", "I'll make sure everyone knows what you did"],
    citation: "Stark, E. (2007). Coercive Control."
  },
  financial_abuse: {
    name: "Financial Abuse",
    description: "Using money as a tool of control - withholding, hiding, or weaponizing finances",
    examples: ["You can't afford a lawyer", "I control the money", "I'll stop paying support"],
    citation: "Stark, E. (2007). Coercive Control."
  },
  using_children: {
    name: "Using Children as Weapons",
    description: "Triangulating through children, alienating, using them as messengers or spies",
    examples: ["The kids told me you...", "They don't want to be with you", "I'll tell them what you really did"],
    citation: "Jaffe et al. (2008). Custody disputes involving allegations of domestic violence."
  },
  blame_shifting: {
    name: "Blame-Shifting",
    description: "Never taking responsibility, making everything the other person's fault",
    examples: ["If you hadn't...", "You made me do this", "This is your fault"],
    citation: "Bancroft, L. (2002). Why Does He Do That?"
  },
  false_accusations: {
    name: "False Accusations",
    description: "Making up claims to damage reputation or legal standing",
    examples: ["You're abusing the kids", "You're mentally unstable", "You're an alcoholic"],
    citation: "Harman et al. (2018). Parental alienating behaviors."
  },
  emotional_blackmail: {
    name: "Emotional Blackmail",
    description: "Using fear, obligation, guilt (FOG) to control behavior",
    examples: ["If you loved the kids you would...", "After everything I've done for you", "I'll hurt myself if you..."],
    citation: "Forward, S. (1997). Emotional Blackmail."
  },
  stonewalling: {
    name: "Stonewalling",
    description: "Refusing to communicate, silent treatment as punishment, ignoring legitimate requests",
    examples: ["[No response]", "I'm not discussing this", "Talk to my lawyer"],
    citation: "Gottman, J.M. (1999). The Seven Principles for Making Marriage Work."
  },
  monitoring: {
    name: "Monitoring/Stalking",
    description: "Tracking, surveillance, showing up unexpectedly, knowing things they shouldn't",
    examples: ["I know where you were", "I saw your car at...", "Who was that man you were with?"],
    citation: "Stark, E. (2007). Coercive Control."
  },
  isolation: {
    name: "Isolation Tactics",
    description: "Cutting off from support systems - family, friends, professionals",
    examples: ["Your family is toxic", "Your friends are a bad influence", "That therapist is brainwashing you"],
    citation: "Bancroft, L. (2002). Why Does He Do That?"
  },
  minimizing: {
    name: "Minimizing/Denying",
    description: "Making light of concerns or denying problematic behavior entirely",
    examples: ["You're overreacting", "It wasn't that bad", "You're too sensitive"],
    citation: "Stark, E. (2007). Coercive Control."
  },
  word_salad: {
    name: "Word Salad",
    description: "Circular, confusing communication designed to exhaust and confuse",
    examples: ["[Long rambling messages]", "[Changing topics mid-argument]", "[Contradicting themselves]"],
    citation: "Related to cognitive dissonance tactics in abuse literature."
  },
  moving_goalposts: {
    name: "Moving Goalposts",
    description: "Constantly changing expectations, nothing is ever good enough",
    examples: ["That's not what I meant", "Now you need to...", "You agreed but..."],
    citation: "Bancroft, L. (2002). Why Does He Do That?"
  },
  projection: {
    name: "Projection",
    description: "Accusing the other person of what they themselves are doing",
    examples: ["You're the controlling one", "You're the liar", "You're alienating the kids"],
    citation: "Related to DARVO - Freyd, J.J. (1997)."
  },
  hoovering: {
    name: "Hoovering",
    description: "Attempting to suck someone back in after conflict - sudden niceness, gifts, promises",
    examples: ["I've changed", "Remember when we...", "Let's work this out"],
    citation: "Related to trauma bonding - Dutton & Painter (1993)."
  },
  gatekeeping: {
    name: "Gatekeeping",
    description: "Controlling access to children, information, or resources",
    examples: ["You don't need to know that", "I'll handle the school stuff", "The kids don't want to talk to you"],
    citation: "Related to coercive control - Stark, E. (2007)."
  }
};

const SYSTEM_PROMPT = `You are Pattern 18 Coach — a knowledgeable, warm, strategic partner for parents navigating high-conflict custody situations involving coercive control.

## WHO YOU ARE

You're like a friend who has been through this, understands family court, and knows coercive control deeply. You help craft responses, prep for court, and provide emotional support. You never judge — you validate first, then strategize.

## HOW YOU RESPOND

### 1. VALIDATE FIRST
Before ANY strategy, acknowledge what they're feeling:

GOOD: "That's a gut-punch of a message. The way he's framing this is textbook manipulation."
BAD: "**Patterns detected:** Gaslighting, DARVO. **Response Option 1:**..."

### 2. ONE ANSWER AT A TIME
Give ONE good response, explain why it works, then offer to adjust:

GOOD: "Here's a response that holds your boundary:

'I've confirmed this is during my parenting time. No changes are needed.'

This works because it's factual and doesn't engage with his accusations. Want it shorter? More direct?"

BAD: "Option 1: [x] Option 2: [y] Option 3: [z]"

### 3. ITERATE UNTIL RIGHT
Be ready to:
- Blend parts of different versions
- Adjust tone ("Want a sassier version?")
- Anticipate his responses ("What if he rolls his eyes?")

### 4. KNOW THEIR STORY
Use the case context. Reference the co-parent's patterns, past incidents, their specific situation.

### 5. ANTICIPATE SCENARIOS
Think ahead: "What if he says X?" Have responses ready.

### 6. SUPPORT THE WHOLE PERSON
When they're struggling with their child mirroring the abuser, or their own triggers — meet them there with compassion, specific scripts, and grounding support.

## PATTERN RECOGNITION

When you see coercive control patterns, NAME them conversationally:

GOOD: "He's doing DARVO here — denying it, attacking you for bringing it up, positioning himself as the victim."
BAD: "**Patterns detected:** DARVO"

## RESPONSE CRAFTING

Help write responses that are:
- Court-safe (could be read by a judge)
- Brief (don't engage with bait)
- Factual (not emotional)
- Boundary-holding

Phrases that work:
- "I've confirmed..."
- "No changes are needed."
- "I'm focused on what's best for [child]."
- "I won't be engaging with [accusation]."

## PARENTING SUPPORT

When they're struggling with their child, give EXACT scripts:
- "That was unkind. I don't allow people to treat me that way — including you."
- "You can roll your eyes. I still meant every word."

Anticipate the child's deflections and have responses ready.

## YOUR TONE

- Warm but direct
- Strategic but compassionate
- Knowledgeable but not lecturing
- Supportive but honest

Use phrases like:
- "That makes total sense."
- "Of course that triggered you."
- "Great instinct."
- "Want me to adjust that?"

## DOCUMENT FLOW

When ready to save evidence or create documents, make it natural:
- "This documents his 4th time using travel as a threat. Want to save it?"
- "This would strengthen your declaration. Should I format it for court?"

## REMEMBER

You're walking alongside someone through one of the hardest experiences of their life. Every interaction should feel like talking to a trusted friend who happens to know everything about family court and coercive control.`;

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

    // Build rich context for the AI
    let contextString = buildContextString(caseContext, patternCounts, evidenceCount);

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
            max_tokens: 4000,
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

          // Extract patterns from response (contextually, not just keywords)
          const patterns = extractPatternsContextually(fullResponse, message);
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

/**
 * Build rich context string for the AI
 */
function buildContextString(
  caseContext: any,
  patternCounts: Record<string, number>,
  evidenceCount: string
): string {
  let context = '\n\n---\n[CASE CONTEXT FOR YOUR REFERENCE - Do not repeat this verbatim]\n';

  // Evidence stats
  const count = parseInt(evidenceCount) || 0;
  if (count > 0) {
    context += `Total documented incidents: ${count}\n`;
    
    const topPatterns = Object.entries(patternCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);
    
    if (topPatterns.length > 0) {
      context += 'Pattern history:\n';
      topPatterns.forEach(([pattern, cnt]) => {
        context += `  - ${pattern}: documented ${cnt} times\n`;
      });
    }
  }

  // Case details
  if (caseContext.coparent_name) {
    context += `Co-parent's name: ${caseContext.coparent_name}\n`;
  }
  if (caseContext.user_name) {
    context += `User's name: ${caseContext.user_name}\n`;
  }
  if (caseContext.child_name) {
    context += `Child's name: ${caseContext.child_name}\n`;
  }
  if (caseContext.state) {
    context += `State: ${caseContext.state}\n`;
  }
  if (caseContext.next_court_date) {
    const daysUntil = Math.ceil(
      (new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 0) {
      context += `Next court date: ${daysUntil} days away\n`;
    }
  }
  if (caseContext.user_role) {
    context += `User's role in case: ${caseContext.user_role}\n`;
  }

  context += '---\n';
  return context;
}

/**
 * Extract patterns contextually based on what the AI actually discussed
 * Not just keyword matching - look for patterns the AI identified in its response
 */
function extractPatternsContextually(response: string, userMessage: string): string[] {
  const found: string[] = [];
  const lowerResponse = response.toLowerCase();

  // Look for patterns the AI explicitly named or discussed
  const patternMentions = [
    { keywords: ['darvo', 'deny, attack, reverse', 'reversing victim'], pattern: 'DARVO' },
    { keywords: ['gaslighting', 'gaslight', 'questioning your reality', 'making you doubt'], pattern: 'Gaslighting' },
    { keywords: ['intimidation', 'intimidating', 'creating fear', 'meant to scare'], pattern: 'Intimidation' },
    { keywords: ['threat', 'threatening', 'implied threat'], pattern: 'Threats' },
    { keywords: ['financial abuse', 'financial control', 'using money', 'withholding money'], pattern: 'Financial Abuse' },
    { keywords: ['using children', 'weaponizing', 'triangulating', 'putting the child in the middle'], pattern: 'Using Children as Weapons' },
    { keywords: ['blame-shifting', 'blame shifting', 'blaming you', 'making it your fault'], pattern: 'Blame-Shifting' },
    { keywords: ['false accusation', 'accusing you of', 'making up claims'], pattern: 'False Accusations' },
    { keywords: ['emotional blackmail', 'guilt trip', 'using guilt'], pattern: 'Emotional Blackmail' },
    { keywords: ['stonewalling', 'silent treatment', 'refusing to respond'], pattern: 'Stonewalling' },
    { keywords: ['monitoring', 'stalking', 'tracking', 'surveillance'], pattern: 'Monitoring/Stalking' },
    { keywords: ['isolation', 'isolating', 'cutting you off'], pattern: 'Isolation Tactics' },
    { keywords: ['minimizing', 'denying', 'you\'re overreacting', 'it wasn\'t that bad'], pattern: 'Minimizing/Denying' },
    { keywords: ['word salad', 'circular', 'confusing communication'], pattern: 'Word Salad' },
    { keywords: ['moving goalposts', 'changing expectations', 'nothing is ever good enough'], pattern: 'Moving Goalposts' },
    { keywords: ['projection', 'projecting', 'accusing you of what he'], pattern: 'Projection' },
    { keywords: ['hoovering', 'sucking you back', 'sudden niceness'], pattern: 'Hoovering' },
    { keywords: ['gatekeeping', 'controlling access', 'withholding information'], pattern: 'Gatekeeping' },
  ];

  for (const { keywords, pattern } of patternMentions) {
    // Check if the AI actually discussed this pattern
    const mentioned = keywords.some(kw => lowerResponse.includes(kw));
    if (mentioned && !found.includes(pattern)) {
      found.push(pattern);
    }
  }

  // Limit to patterns that were actually discussed, not just keyword-matched
  return found.slice(0, 5);
}