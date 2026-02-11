import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DetectedPattern {
  pattern: string;
  severity: 'medium' | 'high' | 'critical';
  quote: string;
  explanation: string;
}

const ANALYSIS_PROMPT = `Analyze this co-parenting message thread for coercive control patterns.

CRITICAL RULES:
1. Most co-parenting messages are NORMAL - don't force patterns where none exist
2. Only identify patterns perpetrated BY THE CO-PARENT (🔴) against the user (🟢)
3. User's responses are NOT patterns - they're defensive/coping
4. If co-parent ACCUSES user of something, that's potentially a FALSE ACCUSATION by them
5. Questions about schedules, activities, logistics = NORMAL
6. Extract EXACT quotes that demonstrate each pattern

WHAT IS NORMAL (not abuse):
- "First cuts are tonight?" = asking about basketball tryouts
- "What time is pickup?" = logistics
- "Did he finish his homework?" = parenting question
- Brief disagreements handled civilly
- Sharing schedules and information

WHAT IS ABUSE:
- Accusations without evidence ("you're gatekeeping", "you always")
- Threats (legal, financial, custody-related)
- Name-calling, insults, put-downs
- Using children as weapons or messengers
- Financial control or manipulation
- Intimidation, creating fear
- DARVO - flipping victim/offender

THREAD:
{THREAD}

Respond with JSON only:
{
  "isAbusive": true/false,
  "category": "normal|concerning|abusive",
  "confidence": "low|medium|high",
  "patterns": [
    {
      "pattern": "Pattern Name",
      "severity": "medium|high|critical",
      "quote": "exact words from co-parent that show this",
      "explanation": "One sentence explaining why this is this pattern"
    }
  ],
  "summary": "One sentence summary of what happened in this thread",
  "primaryPattern": "The main pattern, or 'None' if normal communication"
}

Be CONSERVATIVE. Normal co-parenting is not abuse. When in doubt, mark as normal.`;

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { incidentId } = await req.json();

    if (!incidentId) {
      return NextResponse.json({ error: 'Missing incidentId' }, { status: 400 });
    }

    // Fetch incident
    const { data: incident, error: fetchError } = await supabaseAdmin
      .from('incidents')
      .select('id, messages_json, coparent_message, incident_date')
      .eq('id', incidentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Get messages
    const messages = incident.messages_json || [];
    if (messages.length === 0 && incident.coparent_message) {
      messages.push({
        text: incident.coparent_message,
        timestamp: incident.incident_date,
        sender: 'coparent'
      });
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages to analyze' }, { status: 400 });
    }

    // Format thread
    const threadText = messages.map((msg: any) => {
      const time = new Date(msg.timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      const icon = msg.sender === 'coparent' ? '🔴 Co-parent' : '🟢 You';
      return `${icon} ${time}\n${msg.text}`;
    }).join('\n\n');

    // Analyze with Claude
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{THREAD}', threadText)
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Determine new values
    const newCategory = analysis.primaryPattern === 'None' 
      ? 'none_detected'
      : analysis.primaryPattern?.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_') || 'none_detected';
    
    const newPatterns = analysis.patterns?.map((p: DetectedPattern) => p.pattern) || [];
    
    const newSeverity = analysis.category === 'abusive' 
      ? (analysis.patterns?.some((p: DetectedPattern) => p.severity === 'critical') ? 'critical' : 'high')
      : analysis.category === 'concerning' 
        ? 'medium' 
        : 'low';

    // Update incident
    const { error: updateError } = await supabaseAdmin
      .from('incidents')
      .update({
        category: newCategory,
        patterns: newPatterns,
        severity: newSeverity,
        pattern_details: analysis.patterns || [],
        ai_summary: analysis.summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', incidentId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        category: analysis.category,
        isAbusive: analysis.isAbusive,
        patterns: analysis.patterns,
        summary: analysis.summary,
        newSeverity,
        newCategory
      }
    });

  } catch (error) {
    console.error('Re-analyze error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}