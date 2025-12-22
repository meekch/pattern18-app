import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface FormattedIncident {
  num: number;
  date: string;
  patterns: string;
  description: string;
  severity: string;
}

export async function POST(req: NextRequest) {
  try {
    const { documentType, incidents, caseContext, purpose } = await req.json();

    if (!documentType || !incidents || incidents.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build case info - use real data, not placeholders
    const petitionerName = caseContext?.petitionerName || 'the Petitioner';
    const respondentName = caseContext?.respondentName || caseContext?.coparent_name || 'the Respondent';
    const caseNumber = caseContext?.caseNumber || '';
    const court = caseContext?.court || 'Superior Court';
    const county = caseContext?.county || 'Maricopa County';
    const userRole = caseContext?.userRole || 'petitioner';
    const userName = userRole === 'petitioner' ? petitionerName : respondentName;
    const otherParty = userRole === 'petitioner' ? respondentName : petitionerName;

    // Format incidents with ACTUAL content
    const incidentsFormatted: FormattedIncident[] = incidents.map((inc: any, idx: number) => {
      const date = new Date(inc.date).toLocaleDateString('en-US', { 
        month: 'long', day: 'numeric', year: 'numeric' 
      });
      const patterns = inc.patterns?.length > 0 ? inc.patterns.join(', ') : '';
      const description = inc.description || '';
      
      return {
        num: idx + 1,
        date,
        patterns,
        description: description.slice(0, 1000),
        severity: inc.severity || 'medium'
      };
    });

    let systemPrompt = '';
    let userPrompt = '';

    switch (documentType) {
      case 'declaration':
        systemPrompt = `You are helping a family court litigant prepare a declaration. 

CRITICAL RULES:
- Output PLAIN TEXT only. No markdown, no asterisks, no # symbols.
- Use the ACTUAL incident descriptions provided. Do not generalize or use placeholders.
- Write in first person from the declarant's perspective.
- Be factual and specific. Include actual dates and descriptions from the incidents.
- Do not say "TO BE INSERTED" or use any brackets for missing info.
- If information is missing, write around it naturally.
- Each numbered paragraph should contain REAL facts from the incidents provided.
- Never use em dashes. Use periods or commas instead.
- Do not add placeholder instructions like "[SPECIFIC DETAILS TO BE INSERTED]"`;

        userPrompt = `Generate a declaration for ${userName} to file in ${court}, ${county}, Arizona.
${caseNumber ? `Case Number: ${caseNumber}` : ''}

The other party is: ${otherParty}
${userName} is the ${userRole}.

PURPOSE: ${purpose || 'To document concerning behavior patterns by ' + otherParty}

HERE ARE THE ACTUAL DOCUMENTED INCIDENTS TO INCLUDE (use these exact details in the declaration):

${incidentsFormatted.map((inc: FormattedIncident) => `
INCIDENT ${inc.num} - ${inc.date}:
${inc.description}
${inc.patterns ? `Patterns identified: ${inc.patterns}` : ''}
`).join('\n---\n')}

Generate a complete declaration with:
1. Proper court header (plain text, no markdown)
2. "I, ${userName}, declare under penalty of perjury that the following is true and correct:"
3. Numbered paragraphs using the ACTUAL incident details above. Write out what happened based on each incident description. Do not generalize.
4. Include the specific dates, specific behaviors, and specific impacts from the incidents.
5. A conclusion paragraph.
6. Signature line: "Executed on [DATE], at [CITY], Arizona." followed by a signature line.

Output plain text only. No formatting symbols. No placeholder text.`;
        break;

      case 'exhibit-list':
        systemPrompt = `You create exhibit lists for family court. Output PLAIN TEXT only. No markdown, no asterisks, no # symbols. Never use em dashes.`;

        userPrompt = `Create an exhibit list for a family court case.

Court: ${court}, ${county}
${caseNumber ? `Case Number: ${caseNumber}` : ''}
${userName} v. ${otherParty}

Create exhibits from these documented incidents:

${incidentsFormatted.map((inc: FormattedIncident) => `
${inc.date}: ${inc.description.slice(0, 200)}
Patterns: ${inc.patterns || 'Communication issues'}
`).join('\n')}

Format as:

EXHIBIT LIST

Exhibit 1: [Date] - [Brief description based on actual incident]
Exhibit 2: [Date] - [Brief description based on actual incident]
etc.

Plain text only. Use the actual incident descriptions provided.`;
        break;

      case 'pattern-summary':
        systemPrompt = `You summarize behavioral patterns for family court. Output PLAIN TEXT only. No markdown. Be factual, let patterns speak for themselves. Never use em dashes.`;

        // Group incidents by pattern
        const patternCounts: Record<string, number> = {};
        incidents.forEach((inc: any) => {
          (inc.patterns || []).forEach((p: string) => {
            patternCounts[p] = (patternCounts[p] || 0) + 1;
          });
        });

        userPrompt = `Create a pattern summary for ${court}.
${caseNumber ? `Case Number: ${caseNumber}` : ''}
${userName} v. ${otherParty}

PATTERN FREQUENCY:
${Object.entries(patternCounts).map(([p, count]) => `- ${p}: ${count} occurrences`).join('\n')}

DOCUMENTED INCIDENTS:
${incidentsFormatted.map((inc: FormattedIncident) => `
${inc.date}: ${inc.description.slice(0, 300)}
Patterns: ${inc.patterns}
`).join('\n')}

Create a summary showing:
1. Overview of patterns observed
2. Specific examples with dates from the incidents above
3. Frequency of each pattern type
4. Impact on family/children

Plain text only, no markdown. Use actual incident details.`;
        break;

      case 'incident-timeline':
        systemPrompt = `You create chronological timelines for family court. Output PLAIN TEXT only. No markdown symbols. Never use em dashes.`;

        userPrompt = `Create a chronological timeline for ${court}.
${caseNumber ? `Case Number: ${caseNumber}` : ''}
${userName} v. ${otherParty}

INCIDENTS (already in date order):
${incidentsFormatted.map((inc: FormattedIncident) => `
${inc.date}
${inc.description}
Patterns: ${inc.patterns || 'N/A'}
Severity: ${inc.severity}
`).join('\n---\n')}

Format as a clean timeline:

INCIDENT TIMELINE
${userName} v. ${otherParty}
${caseNumber ? `Case No. ${caseNumber}` : ''}

[Date]: [What happened based on the actual description provided]
Pattern: [Pattern type if identified]

Use the actual incident descriptions. Plain text only.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    // Clean any remaining markdown that might slip through
    let cleanText = content.text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s/gm, '')
      .replace(/^---$/gm, '')
      .replace(/—/g, ' - ');

    return NextResponse.json({ document: cleanText });

  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}