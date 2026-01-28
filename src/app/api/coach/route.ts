import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Initialize Supabase with service role for server-side operations
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const patternCountsJson = formData.get('patternCounts') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    const userId = formData.get('userId') as string || '';
    const fileCount = parseInt(formData.get('fileCount') as string || '0');
    
    // Collect all files
    const files: File[] = [];
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file${i}`) as File | null;
      if (file) files.push(file);
    }
    
    // Also check for single file (backward compatibility)
    const singleFile = formData.get('file') as File | null;
    if (singleFile && files.length === 0) {
      files.push(singleFile);
    }

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);
    const patternCounts = JSON.parse(patternCountsJson);

    // Build system prompt
    let systemPrompt = `You help people navigate co-parenting and family court situations.

Be confident, clear, and warm. Read documents carefully to get the facts right.

Your approach:
- State what each document IS and what it MEANS for them
- Identify who filed by reading signatures and content, not assuming
- Highlight their strengths and current position
- Give numbered next steps in priority order
- Ask logical follow-up questions to guide them further

Use short paragraphs, bullets when helpful, and bold headers for easy scanning.

IMPORTANT FOR TEXT MESSAGE SCREENSHOTS:
- First determine WHO sent the message - look at the bubble color/position
- If you can't tell who sent it, ASK: "Which message would you like me to help you respond to?"
- NEVER analyze the user's own messages as if they were from the co-parent
- Only flag coercive patterns in messages FROM the co-parent

COERCIVE CONTROL PATTERNS to watch for (in co-parent messages only):
${COERCIVE_PATTERNS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

When you detect patterns, mention them naturally: "This message shows [Pattern] because..."
Don't be dramatic or use inflammatory language. Just name the tactic and give practical help.`;

    // Add case context if available
    if (caseContext.user_role || caseContext.coparent_name || caseContext.state) {
      systemPrompt += `\n\nUser's case context:`;
      if (caseContext.user_role) {
        const userRole = caseContext.user_role === 'petitioner' ? 'Petitioner' : 'Respondent';
        systemPrompt += `\n- User is the ${userRole} (from original case filing)`;
      }
      if (caseContext.coparent_name) {
        systemPrompt += `\n- Co-parent: ${caseContext.coparent_name}`;
      }
      if (caseContext.state) {
        systemPrompt += `\n- State: ${caseContext.state}`;
      }
    }

    // Add evidence stats
    if (parseInt(evidenceCount) > 0) {
      const topPatterns = Object.entries(patternCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern, count]) => `${pattern}: ${count}`)
        .join(', ');
      systemPrompt += `\n- ${evidenceCount} incidents documented (top patterns: ${topPatterns || 'none'})`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads
    let userContent: any[] = [];
    let hasImages = false;
    const imageData: { base64: string; mediaType: string }[] = [];
    
    for (const file of files) {
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
        hasImages = true;
        const mediaType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
        imageData.push({ base64, mediaType });
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
      text: message,
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
            system: systemPrompt,
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

          // Auto-save if we have patterns, a user ID, and it's clearly analyzing a co-parent message
          const askedForClarification = fullResponse.toLowerCase().includes('which message') || 
                                        fullResponse.toLowerCase().includes('who sent') ||
                                        fullResponse.toLowerCase().includes('which one');
          
          if (patterns.length > 0 && userId && !askedForClarification && hasImages) {
            try {
              // Quick extraction call to get the quote
              // Build extraction content
              const extractionContent: any[] = [];
              for (const img of imageData) {
                extractionContent.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: img.base64
                  }
                });
              }
              extractionContent.push({
                type: 'text',
                text: `User said: "${message}"\n\nAssistant response: "${fullResponse.slice(0, 500)}..."`
              });

              const extractionResponse = await client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: `Extract the co-parent's message text from the conversation. Return ONLY a JSON object:
{"quote": "exact text of co-parent message", "date": "YYYY-MM-DD or null"}
If you cannot determine the co-parent's message, return: {"quote": null, "date": null}`,
                messages: [
                  {
                    role: 'user',
                    content: imageData.length > 0 ? extractionContent : `User said: "${message}"\n\nAssistant response: "${fullResponse.slice(0, 500)}..."`
                  }
                ],
              });

              const extractText = extractionResponse.content[0].type === 'text' 
                ? extractionResponse.content[0].text 
                : '';
              
              const jsonMatch = extractText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);
                
                if (extracted.quote) {
                  // Determine severity
                  const highSeverityPatterns = ['Threats', 'Intimidation', 'Monitoring/Stalking', 'Using Children as Weapons'];
                  const criticalPatterns = ['Threats'];
                  const severity = patterns.some(p => criticalPatterns.includes(p)) ? 'critical'
                    : patterns.some(p => highSeverityPatterns.includes(p)) ? 'high'
                    : 'medium';

                  const primaryPattern = patterns[0];
                  const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');

                  // Save to database
                  const { data: savedIncident, error } = await supabase
                    .from('incidents')
                    .insert({
                      user_id: userId,
                      title: primaryPattern,
                      coparent_message: extracted.quote,
                      category: categoryKey,
                      patterns: patterns,
                      severity: severity,
                      incident_date: extracted.date 
                        ? new Date(extracted.date).toISOString()
                        : new Date().toISOString(),
                      source: 'coach',
                    })
                    .select('id')
                    .single();

                  if (!error && savedIncident) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      saved: true, 
                      incidentId: savedIncident.id,
                      quote: extracted.quote.slice(0, 100),
                      severity: severity
                    })}\n\n`));
                  }
                }
              }
            } catch (extractError) {
              console.error('Auto-save extraction error:', extractError);
              // Don't fail the main request
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
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
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

  // Catch variations
  if (lowerText.includes('blame shifting') && !found.includes('Blame-Shifting')) {
    found.push('Blame-Shifting');
  }
  if ((lowerText.includes('monitoring') || lowerText.includes('stalking')) && !found.includes('Monitoring/Stalking')) {
    found.push('Monitoring/Stalking');
  }
  if ((lowerText.includes('minimizing') || lowerText.includes('denying')) && !found.includes('Minimizing/Denying')) {
    found.push('Minimizing/Denying');
  }
  if (lowerText.includes('isolation') && !found.includes('Isolation Tactics')) {
    found.push('Isolation Tactics');
  }
  if (lowerText.includes('financial') && (lowerText.includes('abuse') || lowerText.includes('manipulation') || lowerText.includes('coercion')) && !found.includes('Financial Abuse')) {
    found.push('Financial Abuse');
  }

  return found.slice(0, 5);
}