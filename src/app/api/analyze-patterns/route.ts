import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  text: string;
  sender: 'user' | 'coparent';
  timestamp?: string;
}

interface AnalysisResult {
  isAbusive: boolean;
  confidence: 'high' | 'medium' | 'low';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  patterns: {
    name: string;
    evidence: string;
    explanation: string;
  }[];
  primaryPattern: string | null;
  summary: string;
  flaggedPhrases: string[];
}

const SYSTEM_PROMPT = `You are an expert forensic analyst specializing in coercive control patterns in high-conflict custody and divorce situations. You have extensive training in:

- Dr. Evan Stark's coercive control framework
- Lundy Bancroft's work on abusive personalities
- Dr. Jennifer Freyd's DARVO research
- Family court dynamics and parental alienation

Your job is to analyze text message exchanges between co-parents and identify manipulation tactics with HIGH ACCURACY. Courts and families depend on your analysis being correct.

CRITICAL RULES:
1. DO NOT flag normal, benign communication as abuse
2. Context matters enormously - "cuts" in sports context ≠ verbal abuse
3. Be conservative - only flag clear patterns, not ambiguous messages
4. A false positive (flagging innocent message as abuse) is worse than a false negative
5. Consider the full context of the exchange, not just individual words

THE 18 COERCIVE CONTROL PATTERNS TO IDENTIFY:

1. GASLIGHTING - Making someone question their reality
   - Denying events that occurred
   - "That never happened" / "You're imagining things"
   - Rewriting history to confuse

2. DARVO (Deny, Attack, Reverse Victim & Offender)
   - Denying wrongdoing
   - Attacking the person who confronts them
   - Claiming THEY are the real victim

3. INTIMIDATION - Creating fear through tone/language
   - Veiled threats
   - Aggressive capitalization or punctuation
   - "You'll regret this" / "You have no idea what I'm capable of"

4. THREATS - Direct or indirect threats
   - Threatening custody action
   - Threatening to harm reputation
   - Threatening financial ruin

5. FINANCIAL ABUSE/COERCION - Using money as control
   - Withholding support
   - Demanding unreasonable accounting
   - Using expenses as punishment

6. USING CHILDREN AS WEAPONS - Weaponizing the kids
   - Badmouthing other parent to children
   - Using kids as messengers
   - Interrogating children about other parent
   - Triangulating child against other parent

7. BLAME-SHIFTING - Never taking responsibility
   - "This is YOUR fault"
   - Deflecting any accountability
   - Making everything about what you did wrong

8. FALSE ACCUSATIONS - Making unfounded claims
   - Accusing without evidence
   - Exaggerating minor issues
   - Manufacturing grievances

9. EMOTIONAL BLACKMAIL - Using FOG (Fear, Obligation, Guilt)
   - "After everything I've done for you"
   - Guilt-tripping about the children
   - Creating obligation

10. STONEWALLING - Refusing to engage
    - Ignoring reasonable requests
    - Silent treatment
    - Refusing to discuss important matters

11. MONITORING/STALKING - Surveillance behavior
    - Tracking location
    - Showing up unexpectedly
    - Knowing things they shouldn't

12. ISOLATION TACTICS - Cutting off support
    - Interfering with relationships
    - Badmouthing to mutual contacts
    - Creating wedges with family

13. MINIMIZING/DENYING - Dismissing concerns
    - "You're overreacting"
    - "It's not a big deal"
    - Mocking feelings

14. WORD SALAD - Confusing communication
    - Circular arguments
    - Changing topics rapidly
    - Making no logical sense to exhaust you

15. MOVING GOALPOSTS - Constantly changing expectations
    - Nothing is ever good enough
    - Rules change without notice
    - Can never satisfy requirements

16. PROJECTION - Accusing you of what they do
    - "YOU'RE the controlling one"
    - Accusing you of their behavior
    - Pre-emptive accusations

17. HOOVERING - Sucking you back in
    - False apologies
    - Sudden kindness after abuse
    - Love-bombing

18. GATEKEEPING - Controlling access
    - Withholding information about children
    - Blocking access to school/medical info
    - Excluding from decisions

SEVERITY LEVELS:
- CRITICAL: Direct threats, severe verbal abuse, clear child endangerment
- HIGH: Clear manipulation patterns, sustained abuse, multiple tactics
- MEDIUM: Identifiable patterns but less severe, isolated incidents
- LOW: Mild concerning behavior, borderline issues
- NONE: Normal communication, no abuse detected

OUTPUT FORMAT (JSON):
{
  "isAbusive": boolean,
  "confidence": "high" | "medium" | "low",
  "severity": "critical" | "high" | "medium" | "low" | "none",
  "patterns": [
    {
      "name": "Pattern Name",
      "evidence": "exact quote from message",
      "explanation": "why this demonstrates the pattern"
    }
  ],
  "primaryPattern": "Most significant pattern or null",
  "summary": "1-2 sentence summary for court documentation",
  "flaggedPhrases": ["exact", "problematic", "phrases"]
}

Remember: Your analysis may be used in court. Be accurate, be fair, and do not over-flag benign communication.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json() as {
      messages: Message[];
      context?: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Format messages for analysis
    const formattedMessages = messages.map(m => {
      const sender = m.sender === 'coparent' ? 'CO-PARENT' : 'USER';
      const time = m.timestamp ? ` (${new Date(m.timestamp).toLocaleString()})` : '';
      return `[${sender}${time}]: ${m.text}`;
    }).join('\n\n');

    const userPrompt = `Analyze this co-parent message exchange for coercive control patterns.

${context ? `CONTEXT: ${context}\n\n` : ''}MESSAGE EXCHANGE:
${formattedMessages}

Provide your analysis in the specified JSON format. Be accurate - do not flag normal communication as abuse.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    let analysis: AnalysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content.text;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.text);
      // Return a safe default if parsing fails
      analysis = {
        isAbusive: false,
        confidence: 'low',
        severity: 'none',
        patterns: [],
        primaryPattern: null,
        summary: 'Unable to analyze - please review manually',
        flaggedPhrases: []
      };
    }

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error: any) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

// Batch analysis endpoint for bulk import
export async function PUT(request: NextRequest) {
  try {
    const { incidents } = await request.json() as {
      incidents: {
        id: string;
        messages: Message[];
        context?: string;
      }[];
    };

    if (!incidents || incidents.length === 0) {
      return NextResponse.json({ error: 'Incidents required' }, { status: 400 });
    }

    const results: Record<string, AnalysisResult> = {};

    // Process in smaller batches to avoid timeout
    for (const incident of incidents) {
      try {
        const formattedMessages = incident.messages.map(m => {
          const sender = m.sender === 'coparent' ? 'CO-PARENT' : 'USER';
          return `[${sender}]: ${m.text}`;
        }).join('\n\n');

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [
            { 
              role: 'user', 
              content: `Analyze this co-parent exchange for coercive control patterns. Return JSON only.

${incident.context ? `Context: ${incident.context}\n\n` : ''}Messages:
${formattedMessages}`
            }
          ],
          system: SYSTEM_PROMPT,
        });

        const content = response.content[0];
        if (content.type === 'text') {
          let jsonStr = content.text;
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1];
          }
          results[incident.id] = JSON.parse(jsonStr.trim());
        }
      } catch (err) {
        console.error(`Failed to analyze incident ${incident.id}:`, err);
        results[incident.id] = {
          isAbusive: false,
          confidence: 'low',
          severity: 'none',
          patterns: [],
          primaryPattern: null,
          summary: 'Analysis failed - review manually',
          flaggedPhrases: []
        };
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Batch analysis failed' },
      { status: 500 }
    );
  }
}
