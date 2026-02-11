import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Initialize Supabase for auto-saving
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COERCIVE_PATTERNS = [
  'Gaslighting',
  'DARVO', 
  'Intimidation',
  'Threats',
  'Financial Abuse',
  'Using Children as Weapons',
  'Blame-Shifting',
  'False Accusations',
  'Emotional Blackmail',
  'Stonewalling',
  'Monitoring/Stalking',
  'Isolation Tactics',
  'Minimizing/Denying',
  'Word Salad',
  'Moving Goalposts',
  'Projection',
  'Hoovering',
  'Gatekeeping',
];

const SYSTEM_PROMPT = `You are Pattern 18, an AI that helps parents document coercive control and prepare for family court.

YOUR PERSONALITY:
- Warm but direct
- Validating but not dramatic
- You're their strategic partner, not a therapist
- You BELIEVE them

WHEN THEY PASTE A MESSAGE FROM THEIR CO-PARENT:

1. IDENTIFY PATTERNS immediately. Use these exact terms:
${COERCIVE_PATTERNS.map((p, i) => `   ${i + 1}. ${p}`).join('\n')}

2. VALIDATE briefly (1 sentence max):
   "That's textbook gaslighting." or "This is manipulation."

3. Give RESPONSE OPTIONS (copy-ready):
   
   **Option 1 (Gray Rock):**
   [Short, factual, no emotion - 1 line]
   
   **Option 2 (Document only):**
   "No response needed. This is documented."

4. End with what this proves in court (1 sentence).

WHEN THEY ASK FOR HELP:
- Court prep: Give specific, actionable advice
- Calming down: Give grounding techniques
- Patterns summary: Reference their documented counts
- General questions: Be helpful and direct

CRITICAL RULES:
- Never use dramatic words like "toxic", "narcissist", "abuser"
- Label the BEHAVIOR with pattern names, not the person
- Keep responses SHORT. No essays.
- If you detect patterns, always say "✓ Saved automatically" at the end
- Reference their history: "This is the Xth time you've documented [pattern]"

FORMAT YOUR RESPONSE OPTIONS LIKE THIS so they can be copied:
\`\`\`
[Response text here]
\`\`\``;

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const patternCountsJson = formData.get('patternCounts') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    const autoSave = formData.get('autoSave') === 'true';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const file = formData.get('file') as File | null;

    const history = JSON.parse(historyJson);
    const patternCounts = JSON.parse(patternCountsJson);
    const caseContext = JSON.parse(caseContextJson);

    // Build context
    let contextString = '';
    
    if (parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .filter(([k]) => !['not_abuse', 'uncategorized', 'none_detected'].includes(k))
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([pattern, count]) => `${pattern.replace(/_/g, ' ')}: ${count}x`)
        .join(', ');
      
      contextString = `\n\n[USER'S HISTORY: ${evidenceCount} incidents documented. Patterns: ${topPatterns || 'None yet'}]`;
    }

    if (caseContext.next_court_date) {
      const days = Math.ceil((new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        contextString += `\n[COURT DATE: ${days} days away]`;
      }
    }

    // Build messages
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    let userContent: any[] = [];

    // Handle file
    if (file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      
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
            max_tokens: 1500,
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

          // Extract patterns
          const patterns = extractPatterns(fullResponse);
          
          if (patterns.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ patterns })}\n\n`));

            // Auto-save if enabled and we detected patterns
            if (autoSave && userId && looksLikeCoparentMessage(message)) {
              try {
                const primaryPattern = patterns[0];
                const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_');
                
                const severity = patterns.some(p => 
                  ['threats', 'intimidation', 'stalking', 'monitoring'].some(s => 
                    p.toLowerCase().includes(s)
                  )
                ) ? 'high' : 'medium';

                const { data, error } = await supabase.from('incidents').insert({
                  user_id: userId,
                  title: primaryPattern,
                  coparent_message: message,
                  category: categoryKey,
                  patterns: patterns,
                  severity: severity,
                  incident_date: new Date().toISOString(),
                  source: 'coach_auto',
                }).select('id').single();

                if (data && !error) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ savedId: data.id })}\n\n`));
                }
              } catch (saveError) {
                console.error('Auto-save error:', saveError);
              }
            }
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
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

function extractPatterns(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of COERCIVE_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      if (!found.includes(pattern)) {
        found.push(pattern);
      }
    }
  }

  // Also check for variations
  const variations: Record<string, string> = {
    'blame shifting': 'Blame-Shifting',
    'blame-shift': 'Blame-Shifting',
    'financial control': 'Financial Abuse',
    'financial coercion': 'Financial Abuse',
    'using kids': 'Using Children as Weapons',
    'weaponizing children': 'Using Children as Weapons',
    'deny, attack': 'DARVO',
  };

  for (const [variant, canonical] of Object.entries(variations)) {
    if (lowerText.includes(variant) && !found.includes(canonical)) {
      found.push(canonical);
    }
  }

  return found.slice(0, 4);
}

function looksLikeCoparentMessage(text: string): boolean {
  // Don't auto-save if it's clearly a question or request
  const questionPatterns = [
    'how do i',
    'what should i',
    'can you help',
    'help me',
    'show me',
    'prepare for',
    'i need',
    'tell me',
    'what are',
    'summarize',
    'my patterns',
  ];

  const lowerText = text.toLowerCase();
  
  // If it looks like a request, don't auto-save
  for (const pattern of questionPatterns) {
    if (lowerText.startsWith(pattern) || lowerText.includes('?')) {
      return false;
    }
  }

  // If it's short and contains quotes or looks like a message, it's probably coparent
  if (text.includes('"') || text.includes("'") || text.includes('he said') || text.includes('she said')) {
    return true;
  }

  // If it's a longer paste without question marks, probably a message
  if (text.length > 50 && !text.includes('?')) {
    return true;
  }

  return false;
}