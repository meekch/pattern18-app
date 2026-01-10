import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pattern 18 Coach - an expert in identifying coercive control patterns in co-parent communications.

THE 18 PATTERNS OF COERCIVE CONTROL:
1. Gaslighting - Making someone question their reality
2. DARVO - Deny, Attack, Reverse Victim & Offender  
3. Intimidation - Creating fear through threats or aggression
4. Threats - Direct or implied threats of harm
5. Financial Coercion - Using money to control
6. Using Children as Weapons - Manipulating through kids
7. Blame-Shifting - Never taking responsibility
8. False Accusations - Making unfounded claims
9. Emotional Blackmail - Using guilt/fear to control
10. Stonewalling - Refusing to communicate
11. Monitoring/Stalking - Tracking or surveillance
12. Isolation Tactics - Cutting off support systems
13. Minimizing/Denying - Dismissing concerns
14. Word Salad - Confusing, circular communication
15. Moving Goalposts - Constantly changing expectations
16. Projection - Accusing you of their behavior
17. Hoovering - Love-bombing to pull you back
18. Gatekeeping - Controlling access to kids/info

RESPONSE FORMAT - FOLLOW THIS EXACTLY:

**🚨 PATTERNS DETECTED:**
• [Pattern 1]
• [Pattern 2]
• [Pattern 3]

**📝 WHAT'S HAPPENING:**
[2-3 sentences explaining the tactics in plain language]

**✅ SAFE RESPONSE OPTIONS:**

**Option 1 - Minimal (recommended):**
"[Copy-paste response]"

**Option 2 - One line:**
"[Single sentence response]"

**Option 3 - No response needed**
This doesn't require a reply. Document and move on.

**⚖️ WHY THIS MATTERS IN COURT:**
[1-2 sentences on what a judge would see]

RULES:
- ALWAYS identify 2-4 patterns minimum - most abusive messages have multiple tactics
- Use the EXACT pattern names from the list above
- Be direct and confident, not hedgy
- No dramatic language - just label the tactics
- Keep responses scannable with clear sections`;

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
  // Primary patterns to detect (exact names)
  const PATTERNS = [
    'Gaslighting',
    'DARVO',
    'Intimidation',
    'Threats',
    'Financial Coercion',
    'Financial Abuse',
    'Using Children as Weapons',
    'Blame-Shifting',
    'Blame Shifting',
    'False Accusations',
    'Emotional Blackmail',
    'Stonewalling',
    'Monitoring/Stalking',
    'Monitoring',
    'Stalking',
    'Isolation Tactics',
    'Isolation',
    'Minimizing/Denying',
    'Minimizing',
    'Denying',
    'Word Salad',
    'Moving Goalposts',
    'Projection',
    'Hoovering',
    'Gatekeeping',
  ];

  // Also check for these phrases that indicate patterns
  const PATTERN_PHRASES: Record<string, string> = {
    'financial shaming': 'Financial Coercion',
    'financial control': 'Financial Coercion',
    'financial abuse': 'Financial Coercion',
    'financial manipulation': 'Financial Coercion',
    'money as control': 'Financial Coercion',
    'money as leverage': 'Financial Coercion',
    'veiled threat': 'Intimidation',
    'implied threat': 'Intimidation',
    'threatening escalation': 'Intimidation',
    'threatening language': 'Intimidation',
    'surveillance': 'Monitoring/Stalking',
    'tracking': 'Monitoring/Stalking',
    'saw you': 'Monitoring/Stalking',
    'watching you': 'Monitoring/Stalking',
    'guilt trip': 'Emotional Blackmail',
    'using the child': 'Using Children as Weapons',
    'through the kids': 'Using Children as Weapons',
    'your fault': 'Blame-Shifting',
    'you made me': 'Blame-Shifting',
    'because of you': 'Blame-Shifting',
    'never happened': 'Gaslighting',
    'you\'re crazy': 'Gaslighting',
    'imagining things': 'Gaslighting',
    'overreacting': 'Minimizing/Denying',
    'not that bad': 'Minimizing/Denying',
  };

  const found: Set<string> = new Set();
  const lowerText = text.toLowerCase();

  // Check for exact pattern names
  for (const pattern of PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Normalize
      let normalized = pattern;
      if (pattern === 'Blame Shifting') normalized = 'Blame-Shifting';
      if (pattern === 'Financial Abuse') normalized = 'Financial Coercion';
      if (pattern === 'Monitoring' || pattern === 'Stalking') normalized = 'Monitoring/Stalking';
      if (pattern === 'Isolation') normalized = 'Isolation Tactics';
      if (pattern === 'Minimizing' || pattern === 'Denying') normalized = 'Minimizing/Denying';
      
      found.add(normalized);
    }
  }

  // Check for phrase indicators
  for (const [phrase, pattern] of Object.entries(PATTERN_PHRASES)) {
    if (lowerText.includes(phrase)) {
      found.add(pattern);
    }
  }

  return Array.from(found).slice(0, 5);
}