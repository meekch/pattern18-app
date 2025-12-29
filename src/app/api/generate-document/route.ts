export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Client initialized in handler

interface FormattedIncident {
  num: number;
  date: string;
  patterns: string;
  description: string;
  severity: string;
}

export async function POST(req: NextRequest) {
  // Client initialized in handler
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
        // Pattern definitions for court education
        const patternDefinitions: Record<string, string> = {
          'Gaslighting': 'Making the victim question their own reality, memory, or perception of events.',
          'DARVO': 'Deny, Attack, Reverse Victim and Offender. A manipulation tactic where the abuser denies the behavior, attacks the person confronting them, and reverses roles to claim they are the real victim.',
          'Blame-Shifting': 'Deflecting responsibility for harmful actions onto the victim or others.',
          'Financial Manipulation': 'Using money, assets, or financial resources to control, punish, or create dependency.',
          'Name-Calling/Verbal Abuse': 'Using degrading language, insults, or derogatory terms to demean and control.',
          'Minimizing/Mocking': 'Dismissing concerns as unimportant or ridiculing the other person\'s feelings and experiences.',
          'Legal/Court Threats': 'Using threats of legal action or court proceedings as intimidation tactics.',
          'False Accusations': 'Making untrue claims to damage reputation or gain advantage in legal proceedings.',
          'Triangulating Child': 'Involving children in adult conflicts or using them as messengers or pawns.',
          'Information Gatekeeping': 'Withholding important information to maintain control or create dependency.',
          'Baiting': 'Intentionally provoking an emotional reaction to make the victim appear unstable.',
          'Word Salad': 'Using confusing, circular, or contradictory language to disorient and frustrate.',
          'Future Faking': 'Making promises about future behavior with no intention of following through.',
          'Silent Treatment': 'Refusing to communicate as a form of punishment or control.',
          'Love Bombing': 'Excessive flattery or affection used to manipulate or regain control.',
          'Hoovering': 'Attempts to suck a person back into a toxic relationship cycle.',
          'Projection': 'Accusing the victim of behaviors the abuser themselves is engaging in.',
          'Moving Goalposts': 'Constantly changing expectations so the victim can never succeed.',
          'Parental Alienation': 'Systematic campaign to damage the child\'s relationship with the other parent.',
          'Schedule Manipulation': 'Using custody schedules and timing as a means of control or punishment.'
        };

        // Group incidents by pattern - simple count
        const patternData: Record<string, { count: number; severity: string }> = {};
        
        incidents.forEach((inc: any) => {
          (inc.patterns || []).forEach((p: string) => {
            if (!patternData[p]) {
              patternData[p] = { count: 0, severity: 'LOW' };
            }
            patternData[p].count++;
          });
        });

        // Calculate severity based on frequency and pattern type
        const highSeverityPatterns = ['Parental Alienation', 'Triangulating Child', 'False Accusations', 'Legal/Court Threats'];
        const mediumSeverityPatterns = ['Gaslighting', 'DARVO', 'Financial Manipulation', 'Name-Calling/Verbal Abuse'];
        
        Object.keys(patternData).forEach(p => {
          const count = patternData[p].count;
          const isHighType = highSeverityPatterns.some(hp => p.toLowerCase().includes(hp.toLowerCase()));
          const isMedType = mediumSeverityPatterns.some(mp => p.toLowerCase().includes(mp.toLowerCase()));
          
          if (count >= 5 || (count >= 2 && isHighType)) {
            patternData[p].severity = 'HIGH';
          } else if (count >= 3 || (count >= 1 && isMedType)) {
            patternData[p].severity = 'MEDIUM';
          } else {
            patternData[p].severity = 'LOW';
          }
        });

        // Sort by severity then count
        const sortedPatterns = Object.entries(patternData).sort((a, b) => {
          const severityOrder: Record<string, number> = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
          if (severityOrder[a[1].severity] !== severityOrder[b[1].severity]) {
            return severityOrder[a[1].severity] - severityOrder[b[1].severity];
          }
          return b[1].count - a[1].count;
        });

        // Build pattern details - simple counts and definitions
        const patternDetails = sortedPatterns.map(([pattern, data]) => {
          const definition = patternDefinitions[pattern] || 'A documented manipulation or control tactic.';
          return `${pattern}: ${data.count} incidents (${data.severity} severity)
Definition: ${definition}`;
        }).join('\n\n');

        systemPrompt = `You create professional behavioral pattern summaries for family court. 
Output PLAIN TEXT only. No markdown, no asterisks, no # symbols. Never use em dashes.
Present documented patterns clearly with definitions so judges understand what tactics are being used.
Be factual and objective.`;

        userPrompt = `Create a pattern summary for ${court}.
${caseNumber ? `Case Number: ${caseNumber}` : ''}
${userName} v. ${otherParty}

Total Documented Incidents: ${incidents.length}

PATTERNS IDENTIFIED:
${patternDetails}

Generate a professional document with these sections:

1. EXECUTIVE SUMMARY
   Brief overview of total incidents and pattern types found.

2. METHODOLOGY
   Include: "Patterns identified using criteria from recognized experts including Dr. Evan Stark (Coercive Control), Lundy Bancroft (Why Does He Do That?), Dr. Jennifer Freyd (DARVO), and Dr. Robin Stern (The Gaslight Effect)."

3. PATTERN ANALYSIS
   For each pattern found:
   - Pattern name and severity (HIGH/MEDIUM/LOW)
   - Definition of what this tactic is
   - Number of documented occurrences
   - Brief explanation of how this pattern manifests

4. CUMULATIVE IMPACT
   How these patterns work together, impact on targeted parent and children.

5. CONCLUSION
   Summary statement about the documented pattern of behavior.

6. DISCLAIMER
   "This summary analyzes documented communications for behavioral patterns. Pattern identifications are based on established research criteria. This is not legal advice."

Keep it concise and professional. Plain text only.`;
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







