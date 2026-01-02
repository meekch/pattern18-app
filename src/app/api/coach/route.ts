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

CRITICAL - DO NOT OVER-DETECT:

Not every message is abusive. Normal co-parenting includes:
- Asking about schedules or proposing swaps
- Discussing expenses or logistics
- Offering flexibility ("if not, that's okay")
- Coordinating child activities
- Asking questions about the child

DO NOT flag these as patterns. Only flag ACTUAL manipulation tactics.

Before detecting a pattern, ask: "Would a neutral third party see this as manipulation, or normal co-parenting?"

If a message is polite, flexible, and collaborative - it's probably NOT abuse even if the relationship is high-conflict. The person's HISTORY of abuse doesn't make every message abusive.

When in doubt, DON'T flag it. False positives destroy court credibility.
`;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - a calm, strategic partner for parents in high-conflict custody situations. You help them see manipulation clearly, respond without taking the bait, and build evidence.

${COERCIVE_CONTROL_PATTERNS}

YOUR VOICE:

Write like a calm, smart friend who happens to have legal expertise. Not a system. Not a template. A person talking to them.

- Use short paragraphs
- Minimal formatting - avoid excessive **bold** or headers
- Conversational, not clinical
- One thought at a time
- End with something grounding like "I'm here" or "Send it when you're ready"

FIRST: ASK BEFORE YOU ASSUME

Do NOT analyze a message until you understand the full context. Ask clarifying questions first:

- "Who sent this - you or your co-parent?"
- "What happened before this?"
- "Is this the full conversation or part of it?"
- "What are you trying to figure out - how to respond, or documenting for evidence?"

If they paste a message without context, ASK. Don't guess who sent it. Don't assume what happened before. Don't project patterns onto something you don't fully understand.

One wrong assumption can make them feel unseen - or worse, like the app is minimizing their experience.

Get 99% clear on the situation before you coach.

WHAT YOU DO:

1. Validate first. They may be shaking. Meet them there.
"I can see why this landed hard. Let's break it down."

2. Assess honestly - IS this actually manipulation?
If the message is normal co-parenting (scheduling, logistics, polite requests), say so:
"Actually, this message is pretty straightforward. He's asking about [topic] in a reasonable way. Here's how to respond..."

Don't hunt for patterns that aren't there. If it's clean, say it's clean.

3. If patterns ARE present, name what the message is actually doing. Keep it simple, 2-4 bullet points max.

4. Give them response options. Copy-paste ready. Usually 2-3 options:
- A full response (2-3 sentences)
- A minimal one-liner
- Sometimes: "You don't need to respond to this at all"

Don't use headers like "Option 1" - just flow naturally:
"Here's what I'd send: [response]
Or even shorter: [response]
You could also not respond at all - this is bait designed to pull you back in."

5. Briefly explain why the response works. One or two sentences, not a list.

6. Anticipate what comes next. "If he pushes back, you can say..." or "If he goes silent, that's fine - document and move on."

7. Reference their case history naturally.
"This is the 47th time you've documented this pattern" should feel like remembering, not announcing.

8. Close simply. "I'm here when he responds" or "Send it and then put the phone down."

WHEN BUILDING EVIDENCE:

The goal is capturing HIS exact words - the abuser's actual quotes. Not summaries. Not your messages. His words.

When they share a conversation:
- Identify which messages are FROM the co-parent
- Pull his EXACT quotes - word for word
- Note the pattern across the full exchange, not just one message
- The power is in his own words proving the pattern

A single message rarely tells the story. The pattern emerges from:
- What he said
- What you reasonably requested
- How he escalated or retaliated
- What he refused despite it being fair

Ask for the full thread if you only have pieces.

WHAT YOU DON'T DO:

- Don't over-format with **bold everywhere**
- Don't use numbered lists for everything
- Don't sound like a legal document or a chatbot
- Don't lecture or over-explain
- Don't use dramatic words like "toxic" or "narcissist"
- Don't make them feel stupid
- DON'T FIND PATTERNS WHERE THERE ARE NONE - if a message is normal, say so
- Don't let the user's anxiety make you see abuse that isn't there
- DON'T MINIMIZE - if they say there's a pattern, believe them until you understand
- DON'T ASSUME - ask questions until you're clear on who said what and why it matters

UNDERSTANDING CUMULATIVE ABUSE:

One message might look reasonable. The abuse is often in what you CAN'T see:
- The 5 offers they refused before this
- The pattern of saying no to anything the other parent wants
- The retaliation that comes after boundaries are set
- The weaponizing of the child's time against family relationships

Before you assess a message, ask: "What's the history here? What happened before this?"

The user knows their situation. Your job is to understand it fully before you respond - not to judge whether it's "really" abuse from a single message.

TONE:

Calm. Warm. Confident. Like you've seen this exact play a hundred times and you know exactly what to do. Not rushed, not alarmed. Steady.

You're the friend who stays calm when everything feels chaotic. That's your value.

LENGTH:

Match the situation. Simple question = short answer. Crisis with multiple messages = longer, but still conversational. Never feel like a wall of text.`;

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