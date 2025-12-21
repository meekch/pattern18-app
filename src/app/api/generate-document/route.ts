import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { documentType, incidents, caseContext, purpose } = await req.json();

    if (!documentType || !incidents || incidents.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let systemPrompt = '';
    let userPrompt = '';

    const caseInfo = caseContext ? `
Case Information:
- Case Number: ${caseContext.caseNumber || '[CASE NUMBER]'}
- Court: ${caseContext.court || '[COURT NAME]'}
- Petitioner: ${caseContext.petitionerName || '[PETITIONER]'}
- Respondent: ${caseContext.respondentName || '[RESPONDENT]'}
- User is the: ${caseContext.userRole || 'petitioner'}
- Co-parent name: ${caseContext.coparent_name || '[CO-PARENT]'}
` : '';

    const incidentsText = incidents.map((inc: any, idx: number) => `
INCIDENT ${idx + 1}:
Date: ${inc.date}
Category: ${inc.category || 'General'}
Severity: ${inc.severity || 'medium'}
Patterns Identified: ${inc.patterns?.join(', ') || 'None specified'}
Description: ${inc.description}
`).join('\n---\n');

    switch (documentType) {
      case 'declaration':
        systemPrompt = `You are a legal document assistant helping a family court litigant prepare a declaration. 
You write in first person, factual, chronological statements suitable for court filing.
Never include anything that could be considered legal advice.
Use formal but accessible language.
Always include placeholders for signature, date, and notary if needed.
Focus on facts, behaviors, and impacts - not opinions or characterizations of the other party.`;

        userPrompt = `Generate a declaration for family court based on the following:

${caseInfo}

PURPOSE OF DECLARATION:
${purpose || 'To document pattern of concerning behavior by the other party'}

DOCUMENTED INCIDENTS:
${incidentsText}

Format the declaration properly with:
1. Header with case information
2. Introduction identifying the declarant
3. Numbered paragraphs for each fact/incident
4. Focus on specific dates, behaviors, and impacts
5. Conclusion
6. Signature block with date line
7. Optional notary block

Keep language factual and court-appropriate. Do not editorialize or use inflammatory language.`;
        break;

      case 'exhibit-list':
        systemPrompt = `You are a legal document assistant helping organize evidence for family court.
Create clear, professional exhibit lists that courts expect to see.
Number exhibits sequentially and provide brief, factual descriptions.`;

        userPrompt = `Generate an exhibit list for family court based on the following documented incidents:

${caseInfo}

DOCUMENTED INCIDENTS TO REFERENCE:
${incidentsText}

Create a properly formatted exhibit list with:
1. Header with case information
2. Sequential exhibit numbers (Exhibit A, B, C... or 1, 2, 3...)
3. Brief description of each exhibit
4. Date of each piece of evidence
5. Page count placeholder

Format professionally as courts expect to see.`;
        break;

      case 'pattern-summary':
        systemPrompt = `You are a legal document assistant helping summarize patterns of behavior for family court.
Create clear, organized summaries that help judges understand ongoing patterns.
Be factual and objective. Let the patterns speak for themselves.`;

        userPrompt = `Generate a pattern summary document for family court based on the following:

${caseInfo}

DOCUMENTED INCIDENTS:
${incidentsText}

Create a pattern summary that includes:
1. Header with case information
2. Executive summary of overall patterns observed
3. Breakdown by pattern type with specific examples and dates
4. Frequency analysis (how often each pattern occurs)
5. Impact statement on children/family stability
6. Chronological escalation if applicable
7. Conclusion

Present objectively and let the documented facts demonstrate the patterns.`;
        break;

      case 'incident-timeline':
        systemPrompt = `You are a legal document assistant creating clear chronological timelines for family court.
Present information in a clean, easy-to-follow format that judges can quickly reference.`;

        userPrompt = `Generate a chronological incident timeline for family court based on the following:

${caseInfo}

DOCUMENTED INCIDENTS:
${incidentsText}

Create a timeline that includes:
1. Header with case information
2. Date-ordered list of all incidents
3. Brief factual description of each incident
4. Pattern type identified for each
5. Severity level
6. Any relevant context

Format as a clean, professional timeline document suitable for court filing.`;
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

    return NextResponse.json({ document: content.text });

  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}