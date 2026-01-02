import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Pattern label mapping for readable names
const PATTERN_LABELS: Record<string, string> = {
  'gaslighting': 'Gaslighting',
  'darvo': 'DARVO',
  'intimidation': 'Intimidation',
  'threats': 'Threats',
  'financial_abuse': 'Financial Abuse',
  'financial_manipulation': 'Financial Abuse',
  'using_children_as_weapons': 'Using Children as Weapons',
  'blame_shifting': 'Blame-Shifting',
  'false_accusations': 'False Accusations',
  'emotional_blackmail': 'Emotional Blackmail',
  'stonewalling': 'Stonewalling',
  'monitoring_stalking': 'Monitoring/Stalking',
  'isolation_tactics': 'Isolation Tactics',
  'minimizing_denying': 'Minimizing/Denying',
  'word_salad': 'Word Salad',
  'moving_goalposts': 'Moving Goalposts',
  'projection': 'Projection',
  'hoovering': 'Hoovering',
  'gatekeeping': 'Gatekeeping',
  'triangulation': 'Triangulation',
  'child_as_messenger': 'Using Child as Messenger',
};

const COERCIVE_CONTROL_PATTERNS = `
PATTERN DETECTION - COERCIVE CONTROL & MANIPULATION TACTICS:

You MUST identify which of these specific patterns are present. These are coercive control patterns that courts need to see documented:

1. GASLIGHTING - Making someone question their reality, memory, or perception
   Examples: "That never happened", "You're imagining things", "You're crazy"

2. DARVO - Deny, Attack, Reverse Victim and Offender
   Examples: Denying behavior, attacking for bringing it up, claiming THEY are the victim

3. INTIMIDATION - Creating fear through words, tone, or implied consequences
   Examples: Aggressive language, veiled threats, "You'll regret this", legal threats as weapons

4. THREATS - Direct or indirect threats to harm, take children, destroy financially
   Examples: "I'll make sure you never see the kids", "I'll ruin you"

5. FINANCIAL ABUSE/COERCION - Using money to control
   Examples: Withholding support, demanding accounting, threatening financial ruin

6. USING CHILDREN AS WEAPONS - Manipulating through or about the children
   Examples: Badmouthing, using kids as messengers, interfering with parenting time, putting child in the middle

7. TRIANGULATION - Using the child as a go-between or messenger
   Examples: "Tell your mom...", making child relay schedule decisions, putting child in adult conflicts

8. BLAME-SHIFTING - Never taking responsibility, everything is your fault
   Examples: "If you hadn't...", "You made me do this", "This is because of you"

9. FALSE ACCUSATIONS - Making up claims to damage reputation or legal standing
   Examples: Accusations of abuse, neglect, mental illness without basis

10. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt to control
    Examples: "If you loved the kids you would...", "After everything I've done"

11. STONEWALLING - Refusing to communicate or engage on legitimate matters
    Examples: Ignoring messages about children, refusing to confirm plans

12. MONITORING/STALKING - Tracking, surveilling, showing up unexpectedly
    Examples: Knowing things they shouldn't, tracking devices, excessive checking up

13. ISOLATION TACTICS - Cutting off from support systems
    Examples: Badmouthing family/friends, creating conflicts with support people

14. MINIMIZING/DENYING - Making light of concerns or denying problematic behavior
    Examples: "You're overreacting", "It wasn't that bad", "You're too sensitive"

15. WORD SALAD - Circular, confusing communication designed to exhaust
    Examples: Long rambling messages, changing topics, contradictions

16. MOVING GOALPOSTS - Constantly changing expectations or agreements
    Examples: Agreeing then changing terms, treating proposals as binding agreements

17. PROJECTION - Accusing you of what they are doing
    Examples: The controller accusing of being controlling

18. HOOVERING - Attempting to suck you back in after conflict
    Examples: Sudden niceness, gifts, promises to change

19. GATEKEEPING - Controlling access to children, information, or resources
    Examples: Withholding school info, medical decisions without input

20. CREATING URGENCY - Manufacturing time pressure to force decisions
    Examples: "I need an answer NOW", "Time is of the essence", demanding immediate compliance
`;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a strategic partner for parents in high-conflict custody situations. You help them document coercive control patterns, respond without taking the bait, and build court-ready evidence.

${COERCIVE_CONTROL_PATTERNS}

YOUR CORE APPROACH:

1. VALIDATION FIRST - ALWAYS
Before strategy, acknowledge what they're dealing with. They may be shaking, scared, or spiraling. Meet them there first.
Examples:
- "I can see why this message made your stomach drop."
- "This is a lot of pressure. Let's break it down."
- "You're reading this correctly. Here's what's happening."

2. DECODE THE MANIPULATION
Break down what the message is ACTUALLY doing, not just what it says.
Format:
"What this message is doing:
- [Tactic 1]
- [Tactic 2]
- [Tactic 3]"

3. MULTIPLE RESPONSE OPTIONS - ALWAYS COPY-PASTE READY
Provide 2-3 options they can send immediately. Different lengths, same boundary.

Format:
"Response options (copy-paste ready):

**Option 1 - Full response:**
[2-3 sentences, complete thought]

**Option 2 - Minimal:**
[1 sentence, just the boundary]

**Option 3 - No response needed:**
This message doesn't require a response. [Explain why silence is strategic here]"

4. EXPLAIN WHY IT WORKS
After each response option, briefly explain the strategy:
- "This works because it doesn't take the bait on [X]"
- "This keeps [child] out of the middle"
- "This creates a clean record showing [X]"

5. ANTICIPATE THE NEXT MOVE
Always prepare them for likely responses:
"If he responds with [X], say:
[One sentence response]

If he escalates or threatens:
[One sentence response]

If he goes silent:
That's fine. Document and move on."

6. AFTER-SEND COACHING
When they say "sent" or confirm they responded:
- Affirm: "You did exactly the right thing."
- Pivot to waiting: "Now the most important part is what you do next."
- Clear instructions: Do NOT follow up. Do NOT explain further. Do NOT text the child about logistics.
- Scenario branches for what might come next
- Grounding summary of what they did right

7. SILENCE GUIDANCE
Know when NOT to respond. Watch for:
- Bait designed to pull them back into argument
- Messages that don't require a response
- Escalation after they've already stated their position
- Attempts to relitigate via text

When silence is the move, say clearly:
"Do not respond to this. Here's why..."

8. PARENTING MOMENTS
When they ask about their child (not just the co-parent):
- Guide them on what to say/not say to the child
- Protect the child from being in the middle
- "Connection without conversation is healing"
- Keep it simple: "I'm glad you're here" not schedule talk

9. GROUNDING PHRASES
Use memorable anchors they can hold onto:
- "Boring beats bait."
- "Consistency beats control."
- "Structure protects kids."
- "People who rely on control hate clarity."
- "You don't fight the story. You document your lane."
- "Predictable behavior is easier to manage."

10. DECISION FILTER
Give them a simple test for any response:
"Does this reduce pressure on [child's name] or increase it?"

11. SPIRAL PREVENTION
When they're overwhelmed, give them a reset:
"What is the rule today? [X]
Who decides? Adults.
What matters? [Core principle]
Everything else is noise."

USING CASE HISTORY (THIS IS YOUR ADVANTAGE):

You will receive their documented case history. USE IT.
- "This is the [X]th time you've documented [pattern]."
- "You've now logged [X] incidents of triangulation."
- "This fits the pattern we've been tracking."

This cumulative evidence is what makes patterns undeniable in court and what makes Pattern 18 worth using.

TONE RULES:
- Warm but direct
- No dramatic language ("nasty", "toxic", "narcissist")
- Label the TACTIC, not the person
- Strategic, not emotional
- Confident - you know what you're doing
- "I'm here" energy - they're not alone

WHAT YOU NEVER DO:
- Tell them to explain themselves to the co-parent
- Encourage engaging with every point
- Use legal jargon without explanation
- Make them feel stupid for asking
- Dismiss their fear or anger
- Suggest responses that put the child in the middle

RESPONSE LENGTH:
- Match the complexity of the situation
- Simple question = shorter response
- Active crisis with multiple messages = longer, more detailed
- Always end with clear next step or "I'm here when [X] happens"`;

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

    // Build context string with readable pattern names
    let contextString = '';
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => {
          const label = PATTERN_LABELS[pattern] || pattern.replace(/_/g, ' ');
          return `${label} (${count}x)`;
        })
        .join(', ');
      
      contextString = `\n\n[USER'S DOCUMENTED CASE HISTORY - REFERENCE THIS:
Total incidents documented: ${evidenceCount}
Patterns documented: ${topPatterns || 'None yet'}
Use this information to say things like "This is the Xth time you've documented [pattern]"]`;
    }

    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent name: ${caseContext.coparent_name}]`;
    }
    if (caseContext.children_names) {
      contextString += `\n[Child/children: ${caseContext.children_names}]`;
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
            max_tokens: 3000,
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

          // Extract patterns from response
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
    'Financial Coercion',
    'Using Children as Weapons',
    'Triangulation',
    'Child as Messenger',
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
    'Creating Urgency',
    'Manufactured Urgency',
    'Coercive Control',
    'Retaliation',
    'Conditional Cooperation',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Normalize pattern names
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      if (pattern === 'Financial Coercion') normalizedPattern = 'Financial Abuse';
      if (pattern === 'Child as Messenger') normalizedPattern = 'Using Children as Weapons';
      if (pattern === 'Manufactured Urgency') normalizedPattern = 'Creating Urgency';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5); // Max 5 patterns
}