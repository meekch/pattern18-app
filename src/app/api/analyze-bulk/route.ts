import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for large imports

const ANALYSIS_PROMPT = `You are an expert in coercive control patterns in high-conflict custody situations. Analyze these messages from a co-parent and identify patterns of manipulation, control, and abuse.

PATTERNS TO LOOK FOR:

1. FINANCIAL COERCION - Using money as leverage, punishment, or control
   - Payment demands tied to compliance
   - Framing costs as "your fault"
   - Money used as punishment for disagreement

2. USING CHILDREN AS WEAPONS - Putting child in the middle
   - Making child the decision-maker ("ask him", "he'll tell you")
   - Shifting adult responsibility to child
   - Using child as messenger or go-between

3. LEGAL INTIMIDATION - Weaponizing courts
   - Threatening court action during disagreements
   - Referencing lawyers, judges, filings as leverage
   - Using legal language to scare or pressure

4. ESCALATION PATTERNS - Conflict spikes
   - Escalation around holidays or exchanges
   - Rapid intensification during disagreements
   - Calm → pressure → threats cycle

5. MONITORING/CONTROL - Surveillance behavior
   - Phone access, tracking, account control
   - Needing to know whereabouts
   - Using access to information as leverage

6. GASLIGHTING - Reality denial
   - "That never happened"
   - Making them question their memory
   - Rewriting history

7. BLAME-SHIFTING - Never taking responsibility
   - "This is your fault"
   - "You made me do this"
   - Everything is the other parent's problem

8. INTIMIDATION - Creating fear
   - Veiled threats
   - Aggressive language
   - References to consequences

IMPORTANT INSTRUCTIONS:
- Count specific instances with dates
- Quote exact message text as evidence
- Focus on PATTERNS over time, not isolated incidents
- Be specific about which messages show which patterns
- A single message can show multiple patterns
- Normal co-parenting logistics are NOT patterns - only flag actual manipulation

OUTPUT FORMAT (JSON):
{
  "summary": {
    "totalMessagesAnalyzed": number,
    "messagesWithPatterns": number,
    "dateRange": "start - end",
    "topPatterns": ["pattern1", "pattern2", ...],
    "overallSeverity": "low" | "medium" | "high" | "critical"
  },
  "patterns": [
    {
      "name": "Pattern Name",
      "count": number,
      "severity": "low" | "medium" | "high" | "critical",
      "description": "What this pattern shows",
      "courtRelevance": "Why this matters to a judge",
      "examples": [
        {
          "date": "YYYY-MM-DD",
          "quote": "exact message text",
          "analysis": "why this is this pattern"
        }
      ]
    }
  ],
  "incidents": [
    {
      "title": "Brief title",
      "date": "YYYY-MM-DD",
      "patterns": ["pattern1", "pattern2"],
      "severity": "low" | "medium" | "high" | "critical",
      "messages": [
        {
          "timestamp": "ISO string",
          "sender": "coparent" | "user",
          "text": "message text"
        }
      ],
      "quotableText": "The most damning quote for court",
      "courtNotes": "How to present this to a judge"
    }
  ],
  "courtStrategy": {
    "strongestEvidence": ["incident titles"],
    "exhibitRecommendations": [
      {
        "exhibitNumber": "A",
        "title": "Neutral exhibit title",
        "purpose": "What it proves",
        "dateRange": "dates covered"
      }
    ],
    "oneLineSummary": "Single sentence pattern summary for judge"
  }
}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, coparentName } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Format messages for analysis
    const formattedMessages = messages
      .filter((m: any) => m.text && m.text.trim())
      .map((m: any) => {
        const date = m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : 'Unknown date';
        const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
        const sender = m.sender === 'user' ? 'You' : (m.senderName || coparentName || 'Co-parent');
        return `[${date} ${time}] ${sender}: ${m.text}`;
      })
      .join('\n');

    // Split into chunks if too large (Claude has context limits)
    const MAX_CHARS = 150000; // Leave room for prompt and response
    let messagesToAnalyze = formattedMessages;
    
    if (formattedMessages.length > MAX_CHARS) {
      // Take most recent messages if too large
      const lines = formattedMessages.split('\n');
      let chars = 0;
      const recentLines: string[] = [];
      for (let i = lines.length - 1; i >= 0 && chars < MAX_CHARS; i--) {
        chars += lines[i].length + 1;
        recentLines.unshift(lines[i]);
      }
      messagesToAnalyze = recentLines.join('\n');
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `${ANALYSIS_PROMPT}

MESSAGES TO ANALYZE:
${messagesToAnalyze}

Remember: Output ONLY valid JSON.`
        }
      ]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse JSON response
    let analysis;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        responseText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response was:', responseText.substring(0, 500));
      return NextResponse.json({ 
        error: 'Failed to parse analysis',
        rawResponse: responseText.substring(0, 1000)
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis,
      messagesAnalyzed: messages.length
    });

  } catch (error) {
    console.error('Bulk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze messages' },
      { status: 500 }
    );
  }
}