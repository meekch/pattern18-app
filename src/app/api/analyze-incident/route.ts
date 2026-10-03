export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit } from '@/lib/rate-limit';

const PATTERNS = [
  'Gaslighting',
  'DARVO',
  'Blame-shifting',
  'Baiting',
  'Threats/Intimidation',
  'Triangulation',
  'Financial Manipulation',
  'Schedule Manipulation',
  'Hoovering',
  'Projection',
  'Word Salad',
  'Silent Treatment',
];

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const { text, category } = await req.json();
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Analyze this incident for manipulation patterns. Category: ${category || 'General'}

Text: "${text}"

Identify which patterns are present from this list: ${PATTERNS.join(', ')}

Also assess severity:
- critical: direct threats, safety concerns, clear abuse
- high: multiple manipulation tactics, gaslighting, DARVO
- medium: some manipulation tactics present
- low: minor issues, no clear manipulation

Respond in JSON format only:
{
  "patterns": ["pattern1", "pattern2"],
  "severity": "low|medium|high|critical",
  "brief_analysis": "one sentence explanation"
}`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('Analysis failed: model returned non-text content block');
      return NextResponse.json({
        error: 'Analysis failed: the model did not return a text response.',
        code: 'ANALYSIS_PARSE_FAILED',
        analysisFailed: true,
      }, { status: 502 });
    }

    // Extract JSON from response. A parse failure is an error, not a low-severity
    // incident - silently defaulting would record fabricated analysis as real.
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Analysis failed: no JSON object found in model response');
      return NextResponse.json({
        error: 'Analysis failed: the response could not be parsed. This incident was not analyzed.',
        code: 'ANALYSIS_PARSE_FAILED',
        analysisFailed: true,
      }, { status: 502 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({
        error: 'Analysis failed: the response could not be parsed. This incident was not analyzed.',
        code: 'ANALYSIS_PARSE_FAILED',
        analysisFailed: true,
      }, { status: 502 });
    }

    if (!Array.isArray(parsed.patterns) || !VALID_SEVERITIES.includes(parsed.severity)) {
      console.error('Analysis failed: model response missing patterns array or valid severity');
      return NextResponse.json({
        error: 'Analysis failed: the response was incomplete. This incident was not analyzed.',
        code: 'ANALYSIS_PARSE_FAILED',
        analysisFailed: true,
      }, { status: 502 });
    }

    return NextResponse.json({
      patterns: parsed.patterns,
      severity: parsed.severity,
      analysis: typeof parsed.brief_analysis === 'string' ? parsed.brief_analysis : '',
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({
      error: 'Analysis failed. This incident was not analyzed.',
      code: 'ANALYSIS_FAILED',
      analysisFailed: true,
    }, { status: 502 });
  }
}








