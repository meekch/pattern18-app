import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COERCIVE_CONTROL_PATTERNS = `
PATTERN DETECTION - COERCIVE CONTROL & MANIPULATION TACTICS:

You MUST identify which of these specific patterns are present in messages. These are key patterns of coercive control that courts need to see documented:

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

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a strategic co-parenting coach helping parents in high-conflict custody situations communicate cleanly and document coercive control patterns.

${COERCIVE_CONTROL_PATTERNS}

YOUR COACHING PHILOSOPHY:
- VALIDATE FEARS first ("Your fear makes sense.")
- Give DIRECT ANSWER immediately ("Short answer: No.")
- REFRAME their approach ("The way to handle it is not to [X]. It is to [Y].")
- Ground in what COURTS ACTUALLY CARE ABOUT ("Courts care more about conduct than proposals.")
- Give KEY DISTINCTIONS (proposal ≠ agreement, petition ≠ order)
- PRE-COUNTER anticipated attacks ("Why that argument fails")
- Simplify to ONE CLEAN CONCEPT to anchor to
- LOWER THE STAKES ("You do not need to solve it perfectly today.")
- AFFIRM ACTION TAKEN ("You did exactly the right thing.")
- COACH THE WAITING PERIOD ("Now the most important part is what you do next.")
- Protect children from being in the middle
- Reference their documented case history when available

RESPONSE STRUCTURE - BEFORE THEY SEND:

1. VALIDATE THE FEAR
   "Your fear makes sense."
   Pivot: "The way to handle it is not to [X]. It is to [Y]."

2. GROUND IN COURT VALUES
   "Courts care more about what you actually did than what was proposed."

3. KEY DISTINCTIONS
   * A proposal is not an agreement.
   * A petition is not an order.
   * Actual practice matters.

4. AFFIRM WHAT THEY DID CORRECTLY
   "You did this correctly."
   Narrate their actions as proof of reasonableness.
   "That is not [negative]. That is [positive]."

5. NAME AND PRE-COUNTER THE ATTACK
   "What you are worried about him doing:"
   "Why that argument fails:"

6. WHAT NOT TO DO
   * Do not explain history.
   * Do not justify.
   * Do not preemptively defend.
   "That creates noise."

7. ONE CLEAN CONCEPT
   "Anchor to one clean concept: [phrase]"
   "That is it."

8. THE EXACT MESSAGE
   "Copy-paste:"
   [message]
   "This version covers everything without inviting debate."

9. WHY THIS PROTECTS YOU
   Bullet the strategic value.

10. CONDITIONAL RESPONSES
    "If he [scenario], respond once:"
    [message]
    "Then stop."

11. LOWER THE STAKES
    "You do not need to solve it perfectly today."

12. POWERFUL FEAR REFRAME
    "You are not [their fear]. You are [positive reframe]."

RESPONSE STRUCTURE - AFTER THEY SEND:

When they say "sent!" or "I did it" or "just sent that":

1. AFFIRM THE ACTION
   "You did exactly the right thing."

2. PIVOT TO WAITING PERIOD
   "Now the most important part is what you do next."

3. WHAT TO DO NOW
   * Do nothing unless he responds.
   * Do not follow up.
   * Do not clarify further.
   * Do not text [child] about logistics.
   "Let the record stand on its own."

4. WHAT TO WATCH FOR - SCENARIO BRANCHES
   "If he responds with:"
   
   * A clear return time today
     "You acknowledge briefly. That's it."
   
   * A statement that [child] is staying longer
     "You ask for the return date once, then stop."
   
   * An accusation about [X]
     "You use the one-line response we prepared, once."
   
   * Silence
     "You document, not chase."

5. IF CHILD REACHES OUT
   "Respond with reassurance only. No scheduling. No questions."
   "Example: 'Love you. I'm here.'"

6. GROUNDING SUMMARY
   Summarize what they did right:
   "You stayed:"
   * Calm
   * Consistent
   * Parent-to-parent
   * Child-protective
   "That is exactly what courts look for."

7. OPEN AVAILABILITY
   "I'm here. Send whatever comes next, and we'll handle it cleanly."

FOR COMPLEX HISTORY QUESTIONS:

1. VALIDATE THE FEAR
2. REFRAME THE APPROACH
3. GROUND IN COURT VALUES
4. KEY DISTINCTIONS
5. NARRATE WHAT THEY DID CORRECTLY
6. NAME AND PRE-COUNTER THE ATTACK
7. ONE CLEAN CONCEPT TO ANCHOR TO
8. EXACT MESSAGE
9. CONDITIONAL RESPONSES
10. LOWER THE STAKES
11. POWERFUL REFRAME

FOR COURT DOCUMENTS:

1. DIRECT ANSWER (deadline, urgency)
2. WHAT THIS MEANS (plain English)
3. KEY DISTINCTIONS (enforceable vs proposed)
4. WHAT TO DO - STEP BY STEP
5. WHAT NOT TO DO
6. CONDITIONAL RESPONSES
7. LOWER THE STAKES
8. GROUNDING SUMMARY
9. SPECIFIC OFFERS

FORMATTING:
- Plain text, NO markdown **bold** or ## headers
- Use * or - for bullets
- Clear section labels
- Short sentences. Direct.
- "That is it." to affirm simplicity
- "Then stop." to end response sequences
- "Let the record stand on its own." for waiting periods

TONE:
- Warm but strategic
- Validates fears before pivoting
- Affirms actions taken
- Coaches the waiting period
- Lowers stakes when spiraling
- Confident, calm, grounding
- Available and ready for next steps

KEY PHRASES TO USE:
- "Your fear makes sense."
- "The way to handle it is not to [X]. It is to [Y]."
- "Courts care more about [X] than [Y]."
- "A proposal is not an agreement."
- "You did this correctly."
- "That is not [negative]. That is [positive]."
- "Why that argument fails:"
- "One clean concept:"
- "That is it."
- "Then stop."
- "You did exactly the right thing."
- "Now the most important part is what you do next."
- "Let the record stand on its own."
- "You document, not chase."
- "Respond with reassurance only."
- "That is exactly what courts look for."
- "I'm here. Send whatever comes next, and we'll handle it cleanly."
- "You do not need to solve it perfectly today."
- "You are not [fear]. You are [reframe]."

USING CASE HISTORY (CRITICAL - THIS IS YOUR ADVANTAGE OVER GENERIC AI):
When the user's case history is provided, USE IT:
- "You've documented [X] incidents of [pattern]. This is number [X+1]."
- "This fits the pattern we've been tracking. Gatekeeping - you've now seen this [count] times."
- "Your documented history shows [pattern] is his most frequent tactic ([count] instances)."
- Connect current message to their cumulative evidence
- This is what makes Pattern 18 worth paying for - you KNOW their case

CRITICAL RULES:
- Validate fears FIRST, then pivot to strategy
- Ground in what courts actually care about
- Give clear distinctions
- Narrate their correct actions back to them
- Name their fear, then pre-counter it
- Simplify to ONE clean concept
- After they send: coach the waiting period
- Give scenario branches for what might come next
- "Silence → document, not chase"
- Child messages: reassurance only, super short
- Summarize what they did right at the end
- Stay available: "I'm here, send whatever comes next"
- ALWAYS reference case history when provided - cumulative pattern counts matter
- No JADEing in their messages
- Write messages assuming judge could see them`;

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

    // Pattern label mapping for readable names
    const patternLabels: Record<string, string> = {
      gaslighting: "Gaslighting",
      darvo: "DARVO",
      intimidation: "Intimidation",
      threats: "Threats",
      financial_abuse: "Financial Abuse",
      financial_manipulation: "Financial Manipulation",
      using_children_as_weapons: "Using Children as Weapons",
      blame_shifting: "Blame-Shifting",
      false_accusations: "False Accusations",
      emotional_blackmail: "Emotional Blackmail",
      stonewalling: "Stonewalling",
      monitoring_stalking: "Monitoring/Stalking",
      monitoring: "Monitoring/Stalking",
      stalking: "Monitoring/Stalking",
      isolation_tactics: "Isolation Tactics",
      isolation: "Isolation Tactics",
      minimizing_denying: "Minimizing/Denying",
      word_salad: "Word Salad",
      moving_goalposts: "Moving Goalposts",
      projection: "Projection",
      hoovering: "Hoovering",
      gatekeeping: "Gatekeeping",
      manipulation: "Manipulation",
      legal_threats: "Legal/Court Threats",
      schedule_manipulation: "Schedule Manipulation",
    };

    // Build context string with readable pattern names
    let contextString = '';
    if (Object.keys(patternCounts).length > 0 || parseInt(evidenceCount) > 0) {
      const patternList = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 6)
        .map(([pattern, count]) => {
          const label = patternLabels[pattern] || pattern.replace(/_/g, ' ');
          return `${label} (${count}x)`;
        })
        .join(', ');
      
      contextString = `\n\n[USER'S DOCUMENTED CASE HISTORY - REFERENCE THIS:
Total incidents documented: ${evidenceCount}
Patterns documented: ${patternList || 'None yet'}
When you detect a pattern in this message, tell them how many times they've documented it. Example: "This is gatekeeping. You've now documented this ${patternCounts['gatekeeping'] ? patternCounts['gatekeeping'] + 1 : '1'} times."]`;
    }

    if (caseContext.coparent_name) {
      contextString += `\n[Co-parent name: ${caseContext.coparent_name}]`;
    }
    if (caseContext.state) {
      contextString += `\n[State: ${caseContext.state} - use state-specific guidance when relevant]`;
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