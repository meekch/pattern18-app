import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PATTERN_ANALYSIS_PROMPT = `Analyze this message from a high-conflict co-parenting situation. Identify which coercive control patterns are present.

THE 18 PATTERNS OF COERCIVE CONTROL:

1. GASLIGHTING - Making someone question their reality ("That never happened", "You're imagining things")
2. DARVO - Deny, Attack, Reverse Victim and Offender
3. INTIMIDATION - Creating fear through aggressive language, veiled threats
4. THREATS - Direct or indirect threats to harm, take children, destroy financially
5. FINANCIAL ABUSE - Using money to control, withholding support, demanding accounting
6. USING CHILDREN AS WEAPONS - Badmouthing, using kids as messengers, alienating behaviors
7. BLAME-SHIFTING - Never taking responsibility, everything is your fault
8. FALSE ACCUSATIONS - Making up claims without basis
9. EMOTIONAL BLACKMAIL - Using fear, obligation, guilt to control
10. STONEWALLING - Refusing to communicate or engage
11. MONITORING/STALKING - Tracking, surveilling, knowing things they shouldn't
12. ISOLATION TACTICS - Cutting off from support systems
13. MINIMIZING/DENYING - Making light of concerns ("You're overreacting")
14. WORD SALAD - Circular, confusing communication designed to exhaust
15. MOVING GOALPOSTS - Constantly changing expectations or agreements
16. PROJECTION - Accusing you of what they are doing
17. HOOVERING - Attempting to suck you back in (sudden niceness, promises)
18. GATEKEEPING - Controlling access to children, information, or resources

MESSAGE TO ANALYZE:
"""
{MESSAGE}
"""

Respond with ONLY a JSON object:
{
  "primary_pattern": "The main pattern (use exact name from list above, e.g., 'Gaslighting', 'DARVO', 'Blame-Shifting')",
  "all_patterns": ["Array of all patterns detected"],
  "severity": "low" | "medium" | "high" | "critical",
  "reasoning": "One sentence explaining why"
}

If no clear coercive pattern is present, use:
{
  "primary_pattern": "None Detected",
  "all_patterns": [],
  "severity": "low",
  "reasoning": "This appears to be normal communication without manipulation tactics"
}`;

export async function POST(req: NextRequest) {
  try {
    const { userId, batchSize = 10, offset = 0 } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch batch of incidents
    const { data: incidents, error: fetchError } = await supabaseAdmin
      .from('incidents')
      .select('id, coparent_message, messages_json, category, patterns')
      .eq('user_id', userId)
      .order('incident_date', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!incidents || incidents.length === 0) {
      return NextResponse.json({ 
        done: true, 
        processed: 0,
        message: 'No more incidents to process' 
      });
    }

    const client = new Anthropic();
    const results = [];

    for (const incident of incidents) {
      // Get the message content
      const messageContent = incident.coparent_message || 
        incident.messages_json?.[0]?.text || 
        '';

      if (!messageContent || messageContent.length < 10) {
        results.push({ id: incident.id, skipped: true, reason: 'No message content' });
        continue;
      }

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: PATTERN_ANALYSIS_PROMPT.replace('{MESSAGE}', messageContent)
          }]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          results.push({ id: incident.id, error: 'No text response' });
          continue;
        }

        // Parse JSON response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          results.push({ id: incident.id, error: 'Could not parse response' });
          continue;
        }

        const analysis = JSON.parse(jsonMatch[0]);
        
        // Convert pattern to category key
        const categoryKey = analysis.primary_pattern
          .toLowerCase()
          .replace(/[\s\/]+/g, '_')
          .replace(/-/g, '_');

        // Update the incident
        const { error: updateError } = await supabaseAdmin
          .from('incidents')
          .update({
            category: categoryKey,
            patterns: analysis.all_patterns,
            severity: analysis.severity,
          })
          .eq('id', incident.id);

        if (updateError) {
          results.push({ id: incident.id, error: updateError.message });
        } else {
          results.push({ 
            id: incident.id, 
            success: true, 
            pattern: analysis.primary_pattern,
            allPatterns: analysis.all_patterns,
            severity: analysis.severity
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err: any) {
        results.push({ id: incident.id, error: err.message });
      }
    }

    // Get total count for progress
    const { count } = await supabaseAdmin
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return NextResponse.json({
      done: incidents.length < batchSize,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      skipped: results.filter(r => r.skipped).length,
      errors: results.filter(r => r.error).length,
      results,
      nextOffset: offset + batchSize,
      total: count,
      progress: Math.round(((offset + incidents.length) / (count || 1)) * 100)
    });

  } catch (error: any) {
    console.error('Re-analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to re-analyze' },
      { status: 500 }
    );
  }
}