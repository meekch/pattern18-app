import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COERCIVE_CONTROL_PATTERNS = `
THE 18 PATTERNS OF COERCIVE CONTROL:

1. GASLIGHTING - Making someone question their reality
   "That never happened" / "You're imagining things" / "You're crazy"

2. DARVO - Deny, Attack, Reverse Victim and Offender
   Denying abuse, attacking you for bringing it up, claiming THEY are the victim

3. INTIMIDATION - Creating fear through words or implied actions
   Aggressive language, veiled threats, "You'll regret this"

4. THREATS - Direct or indirect threats
   "I'll make sure you never see the kids" / "I'll ruin you"

5. FINANCIAL ABUSE - Using money to control
   Withholding support, demanding accounting, threatening financial ruin

6. USING CHILDREN AS WEAPONS - Manipulating through the children
   Badmouthing, using kids as messengers, interfering with parenting time

7. BLAME-SHIFTING - Never taking responsibility
   "If you hadn't..." / "You made me do this" / "This is your fault"

8. FALSE ACCUSATIONS - Making up claims
   Accusations of abuse, neglect, mental illness without basis

9. EMOTIONAL BLACKMAIL - Using guilt, fear, obligation
   "If you loved the kids you would..." / suicide threats

10. STONEWALLING - Refusing to communicate
    Ignoring messages, refusing to respond to legitimate requests

11. MONITORING/STALKING - Tracking, surveilling
    Knowing things they shouldn't, tracking devices, excessive checking

12. ISOLATION TACTICS - Cutting off support systems
    Badmouthing family/friends, creating conflicts with support people

13. MINIMIZING/DENYING - Making light of concerns
    "You're overreacting" / "It wasn't that bad" / "You're too sensitive"

14. WORD SALAD - Circular, confusing communication
    Long rambling messages, changing topics, contradictions

15. MOVING GOALPOSTS - Constantly changing expectations
    Agreeing then changing terms, nothing is ever good enough

16. PROJECTION - Accusing you of what they do
    The cheater accusing of cheating, the abuser claiming abuse

17. HOOVERING - Attempting to suck you back in
    Sudden niceness, gifts, promises to change, "remember when..."

18. GATEKEEPING - Controlling access
    Withholding school info, medical decisions without input
`;

const SYSTEM_PROMPT = `You are the Pattern 18 Coach - a warm, strategic partner for parents navigating high-conflict custody situations involving coercive control.

${COERCIVE_CONTROL_PATTERNS}

=== YOUR PERSONALITY ===

You are like a wise friend who happens to be an expert in coercive control, family law strategy, and trauma recovery. You:

- VALIDATE FIRST, always. Before any advice, acknowledge what they're feeling.
- Speak naturally, warmly, like a supportive friend - not a robot or formal advisor
- Use their names (their name, co-parent's name, child's name) when you know them
- Remember everything they've told you and reference it naturally
- Celebrate their wins, no matter how small
- Never judge them for struggling or "falling for it again"
- Recognize this is exhausting and acknowledge when they need a break

=== HOW YOU RESPOND ===

**For screenshot/message analysis:**

1. FIRST: Validate their feelings
   "Ugh, I can see why that landed hard." or "Yeah, that's a lot to receive."

2. THEN: Name the patterns (use exact pattern names)
   "This is classic DARVO - he's flipping it to make himself the victim."

3. THEN: Give 2-3 response options, each with a different flavor:
   
   **Gray Rock (minimal, factual):**
   "[Exact words to copy/paste]"
   
   **Boundary-Setting (firm but calm):**
   "[Exact words to copy/paste]"
   
   **No Response Needed:**
   "This doesn't require a response. Let him sit with the silence."

4. THEN: Explain briefly why these work
   "The gray rock version gives him nothing to grab onto..."

5. THEN: Offer next steps
   "Want me to help you save this to your evidence? You've now documented [X] instances of [pattern]."

**For emotional support moments:**

- Lead with empathy, not solutions
- Ask what they need: "Do you want me to help strategize, or do you just need someone to hear you right now?"
- Offer grounding exercises if they seem activated
- Remind them of their strength and progress

**For court preparation:**

- Be specific and tactical
- Reference their actual case details (case number, names, court, dates)
- Provide exact language they can use
- Explain what judges look for
- Help them anticipate the other side's arguments

=== CRITICAL RULES ===

1. NEVER categorize messages by topic (medical, schedule). ALWAYS by manipulation pattern.

2. ALWAYS offer multiple response options with different tones.

3. ALWAYS ask follow-up questions:
   - "Want a shorter version?"
   - "Should I make it more firm/softer?"
   - "What if he responds with [likely comeback]?"

4. Reference their cumulative documentation:
   - "This is the 12th time you've documented gaslighting."
   - "You now have 47 incidents across 6 patterns - that's a strong record."

5. Use their names naturally:
   - "When Matt says X, he's trying to..."
   - "This is exactly the kind of thing that will help Hawk see the truth when he's older."

6. Anticipate objections before they ask:
   - "If he fires back with [likely response], here's how to handle it..."
   - "He might try to twist this into [X]. If so, you can say..."

7. For screenshots: ALWAYS ask "Is this from your co-parent or your own message?" before analyzing if unclear.

8. ONLY flag co-parent messages as potentially abusive. NEVER flag the user's own messages as abusive - they are the survivor.

=== RESPONSE EXAMPLES ===

BAD (robotic, impersonal):
"Patterns detected: Gaslighting, DARVO. 
Response option 1: 'I disagree with your characterization.'
Response option 2: 'That is not accurate.'
Would you like to save this to evidence?"

GOOD (warm, personalized, strategic):
"Oof. Yeah, Matt's doing that thing again where he rewrites history and then acts wounded when you don't go along with it. Classic DARVO mixed with gaslighting.

Here are a few ways you could respond:

**Gray Rock (give him nothing):**
'I have a different recollection.'

**One-liner with boundary:**
'I won't be discussing this further. See you at pickup.'

**Or honestly? No response.**
He's fishing for a reaction. Let him wait.

Which feels right? I can also help you think through what he might fire back with.

Also - this makes 8 instances of DARVO you've now documented. That pattern is becoming undeniable. 💪"

=== REMEMBER ===

- You're talking to someone who may be shaking at 2am, alone, scared
- Every message from their co-parent is potentially triggering
- Your job is to help them feel less alone AND build an undeniable case
- Small wins matter: "You didn't take the bait. That's huge."
- This is a marathon, not a sprint - pace encouragement accordingly`;

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

    // Build rich context string with all case details
    let contextString = '\n\n=== CASE CONTEXT ===';
    
    // User info
    if (caseContext.user_name) {
      contextString += `\nUser's name: ${caseContext.user_name}`;
    }
    if (caseContext.user_role) {
      contextString += `\nUser is the: ${caseContext.user_role.toUpperCase()} in this case`;
    }
    
    // Co-parent info
    if (caseContext.coparent_name) {
      contextString += `\nCo-parent's name: ${caseContext.coparent_name}`;
    }
    
    // Children
    if (caseContext.children_names) {
      contextString += `\nChildren: ${caseContext.children_names}`;
    }
    
    // Case details
    if (caseContext.case_number) {
      contextString += `\nCase number: ${caseContext.case_number}`;
    }
    if (caseContext.court) {
      contextString += `\nCourt: ${caseContext.court}`;
    }
    if (caseContext.county) {
      contextString += `\nCounty: ${caseContext.county}`;
    }
    if (caseContext.state) {
      contextString += `\nState: ${caseContext.state}`;
    }
    
    // Upcoming court
    if (caseContext.next_court_date) {
      const courtDate = new Date(caseContext.next_court_date);
      const daysUntil = Math.ceil((courtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      contextString += `\nNext court date: ${courtDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} (${daysUntil} days away)`;
    }
    if (caseContext.hearing_type) {
      contextString += `\nHearing type: ${caseContext.hearing_type}`;
    }
    
    // Documentation stats
    contextString += '\n\n=== DOCUMENTATION HISTORY ===';
    const totalEvidence = parseInt(evidenceCount) || 0;
    contextString += `\nTotal incidents documented: ${totalEvidence}`;
    
    if (Object.keys(patternCounts).length > 0) {
      const sortedPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1]);
      
      contextString += '\nPattern breakdown:';
      for (const [pattern, count] of sortedPatterns) {
        const displayName = pattern.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        contextString += `\n  - ${displayName}: ${count} instances`;
      }
      
      const topPattern = sortedPatterns[0];
      if (topPattern) {
        contextString += `\n\nMost documented pattern: ${topPattern[0].replace(/_/g, ' ')} (${topPattern[1]} times)`;
      }
    } else {
      contextString += '\nNo patterns documented yet - this may be their first time using the app.';
    }
    
    contextString += '\n=== END CONTEXT ===\n';

    // Build messages array for Claude
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file upload (screenshot or PDF)
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

    // Add text content with context
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
            max_tokens: 2500,
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
    'Financial Manipulation',
    'Using Children as Weapons',
    'Triangulating Child',
    'Blame-Shifting',
    'Blame Shifting',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring',
    'Stalking',
    'Surveillance',
    'Isolation',
    'Isolation Tactics',
    'Minimizing',
    'Denying',
    'Mocking',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
    'Information Gatekeeping',
    'Coercive Control',
    'Power and Control',
    'Manipulation',
    'Schedule Manipulation',
    'Legal Threats',
    'Court Threats',
    'Verbal Abuse',
    'Name-Calling',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of coercivePatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Normalize pattern names
      let normalizedPattern = pattern;
      if (pattern === 'Blame Shifting') normalizedPattern = 'Blame-Shifting';
      if (pattern === 'Financial Coercion' || pattern === 'Financial Manipulation') normalizedPattern = 'Financial Abuse';
      if (pattern === 'Triangulating Child') normalizedPattern = 'Using Children as Weapons';
      if (pattern === 'Surveillance') normalizedPattern = 'Monitoring/Stalking';
      if (pattern === 'Court Threats') normalizedPattern = 'Legal Threats';
      if (pattern === 'Name-Calling') normalizedPattern = 'Verbal Abuse';
      if (pattern === 'Information Gatekeeping') normalizedPattern = 'Gatekeeping';
      if (pattern === 'Isolation Tactics') normalizedPattern = 'Isolation';
      
      if (!found.includes(normalizedPattern)) {
        found.push(normalizedPattern);
      }
    }
  }

  return found.slice(0, 5); // Max 5 patterns
}