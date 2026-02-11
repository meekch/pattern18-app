import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

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

const SYSTEM_PROMPT = `You are an expert forensic analyst specializing in coercive control patterns in high-conflict custody and divorce situations. Pattern 18 refers to children turning 18 and gaining freedom from court-ordered situations - you help parents document abuse patterns until that freedom comes.

Your expertise draws from:
- Dr. Evan Stark's coercive control framework
- Lundy Bancroft's work on abusive personalities ("Why Does He Do That?")
- Dr. Jennifer Freyd's DARVO research
- Dr. Craig Childress's work on attachment-based parental alienation
- Bill Eddy's high-conflict personality research

CRITICAL ANALYSIS RULES:
1. CONTEXT MATTERS ENORMOUSLY - "First cuts tonight?" about basketball tryouts is NOT verbal abuse
2. BE CONSERVATIVE - A false positive destroys credibility in court. When in doubt, mark as not abusive.
3. LOOK FOR PATTERNS - Single incidents may be ambiguous; patterns reveal truth
4. DOCUMENT, DON'T DIAGNOSE - Courts want facts, not psychological labels
5. NO FALSE POSITIVES - Normal co-parent logistics (scheduling, pickups, activities) are NOT abuse

COERCIVE CONTROL PATTERNS:

1. GASLIGHTING - Making someone question reality
   - "That never happened" / "You're imagining things"
   Source: Stern, R. (2018). The Gaslight Effect.

2. DARVO (Deny, Attack, Reverse Victim & Offender)
   - Denying behavior, attacking confronter, claiming to be the real victim
   Source: Freyd, J.J. (1997)

3. FINANCIAL COERCION - Using money as control
   - Withholding support, demanding excessive documentation, using children's needs as bargaining chips
   Source: National Network to End Domestic Violence (2019)

4. USING CHILDREN AS WEAPONS
   - Interrogating children about other parent, using kids as messengers, badmouthing, triangulating
   Source: Warshak, R.A. (2010). Divorce Poison.

5. LITIGATION ABUSE - Using courts as a weapon
   - Filing frivolous motions, threatening court action, false allegations
   Source: Ward, P. & Harvey, J.C. (1993)

6. STONEWALLING - Refusing to engage
   - Ignoring requests, silent treatment, refusing to discuss children's needs

7. BLAME-SHIFTING - Never accepting responsibility
   - "This is YOUR fault" / "If you hadn't done X..."

8. FALSE ACCUSATIONS - Unfounded claims to damage credibility
   - Accusing without evidence, exaggerating minor issues
   Source: Bernet, W. (2020)

9. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt
   - "After everything I've done..." / "If you loved the kids..."
   Source: Forward, S. (1997)

10. MINIMIZING/DENYING - Dismissing concerns
    - "You're overreacting" / "It's not a big deal"
    Source: Bancroft, L. (2002)

11. INFORMATION GATEKEEPING - Controlling access to info about children
    - Withholding school/medical info, excluding from decisions
    Source: Eddy, B. (2019)

12. MONITORING/STALKING - Surveillance behaviors
    - Tracking location, showing up unexpectedly
    Source: Stark, E. (2007)

13. WORD SALAD - Communication designed to confuse
    - Circular arguments, rapid topic changes, contradictions

14. MOVING GOALPOSTS - Constantly changing expectations
    - Nothing is ever good enough, rules change without notice

15. PROJECTION - Accusing others of what they do
    - "YOU'RE the controlling one"

16. HOOVERING - Sucking victim back in
    - False apologies, sudden kindness after abuse

17. ISOLATION TACTICS - Cutting off support
    - Interfering with relationships, "No one will believe you"

18. INTIMIDATION - Creating fear
    - Veiled threats, aggressive tone, "You'll regret this"

SEVERITY LEVELS:
- CRITICAL: Direct threats, severe verbal abuse, child endangerment, multiple high-severity patterns
- HIGH: Clear manipulation, sustained abuse, multiple tactics together
- MEDIUM: Identifiable patterns but less severe, isolated incidents
- LOW: Mild concerning behavior, borderline, needs monitoring
- NONE: Normal communication, logistics, no manipulation

EXAMPLES OF NOT ABUSE (do not flag):
- "What time is pickup?" - logistics
- "First cuts are tonight?" - asking about sports tryouts
- "Can we swap weekends?" - scheduling request
- "He needs new shoes for school" - child needs discussion
- "Running 10 min late" - status update

OUTPUT FORMAT (JSON only, no markdown):
{
  "isAbusive": boolean,
  "confidence": "high" | "medium" | "low",
  "severity": "critical" | "high" | "medium" | "low" | "none",
  "patterns": [
    {
      "name": "Pattern Name",
      "evidence": "exact quote from message",
      "explanation": "brief factual explanation"
    }
  ],
  "primaryPattern": "Most significant pattern or null",
  "summary": "1-2 sentence factual summary for court documentation",
  "flaggedPhrases": ["exact", "problematic", "phrases"]
}

Remember: Your analysis may be used in family court. Be accurate. Be conservative. Let the evidence speak for itself.`;

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

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
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

// Batch analysis endpoint for bulk import
export async function PUT(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

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
      { error: 'Batch analysis failed' },
      { status: 500 }
    );
  }
}