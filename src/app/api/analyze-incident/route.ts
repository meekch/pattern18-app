export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Client initialized in handler

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

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ patterns: [], severity: 'low' });
    }

    try {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          patterns: parsed.patterns || [],
          severity: parsed.severity || 'low',
          analysis: parsed.brief_analysis || '',
        });
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }

    return NextResponse.json({ patterns: [], severity: 'low' });
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ patterns: [], severity: 'low' });
  }
}






