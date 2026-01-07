import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType,
  HeadingLevel, ShadingType, PageBreak, PageNumber
} from 'docx';

export const runtime = 'nodejs';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pattern definitions for appendix - using neutral language
const PATTERN_DEFINITIONS: Record<string, { name: string; definition: string; source: string }> = {
  'Gaslighting': {
    name: 'Gaslighting',
    definition: 'A communication pattern where one party causes the other to question their own memory, perception, or judgment. Common indicators include denial of documented events, trivializing concerns, and shifting blame for miscommunication.',
    source: 'Stern, R. (2018). The Gaslight Effect.'
  },
  'DARVO': {
    name: 'DARVO (Deny, Attack, Reverse Victim and Offender)',
    definition: 'A response pattern involving denial of behavior, attack of the person raising concerns, and reversal of victim and offender roles. The responding party positions themselves as the wronged party.',
    source: 'Freyd, J.J. (1997). Violations of power, adaptive blindness and betrayal trauma theory.'
  },
  'Financial Manipulation': {
    name: 'Financial Coercion',
    definition: 'Using financial matters as leverage in co-parenting communications. Includes withholding information about expenses, demanding detailed accounting, or linking financial discussions to unrelated parenting matters.',
    source: 'National Network to End Domestic Violence (2019).'
  },
  'Financial Abuse': {
    name: 'Financial Coercion',
    definition: 'Using financial matters as leverage in co-parenting communications. Includes withholding information about expenses, demanding detailed accounting, or linking financial discussions to unrelated parenting matters.',
    source: 'National Network to End Domestic Violence (2019).'
  },
  'Using Children as Weapons': {
    name: 'Child Involvement in Adult Conflict',
    definition: 'Placing children in the middle of parental disputes. Includes using children as messengers, discussing adult matters with children, or making statements that may affect the child\'s relationship with the other parent.',
    source: 'Warshak, R.A. (2010). Divorce Poison.'
  },
  'Triangulating Child': {
    name: 'Child Involvement in Adult Conflict',
    definition: 'Involving children in communications between parents or using children to relay information. This pattern places children in adult disputes.',
    source: 'Warshak, R.A. (2010). Divorce Poison.'
  },
  'Threats': {
    name: 'Threats',
    definition: 'Statements implying negative consequences, loss, or harm intended to influence compliance. May include references to legal action, relationship changes, or other adverse outcomes.',
    source: 'Stark, E. (2007). Coercive Control.'
  },
  'Intimidation': {
    name: 'Intimidation',
    definition: 'Communication intended to create pressure or fear rather than facilitate resolution. May include aggressive tone, ultimatums, or statements designed to discourage response.',
    source: 'Bancroft, L. (2002). Why Does He Do That?'
  },
  'Blame-Shifting': {
    name: 'Blame-Shifting',
    definition: 'Consistently attributing responsibility for problems to the other party regardless of circumstances. Refusing to acknowledge any personal contribution to conflicts.',
    source: 'Bancroft, L. (2002). Why Does He Do That?'
  },
  'False Accusations': {
    name: 'False Accusations',
    definition: 'Making unfounded claims about behavior, character, or parenting without supporting evidence. May be used to damage reputation or gain positional advantage.',
    source: 'Bernet, W. (2020). Parental Alienation, DSM-5, and ICD-11.'
  },
  'Emotional Blackmail': {
    name: 'Emotional Blackmail',
    definition: 'Using fear, obligation, or guilt to influence the other party\'s behavior. May include threats of self-harm, withdrawal of affection, or leveraging children\'s emotions.',
    source: 'Forward, S. (1997). Emotional Blackmail.'
  },
  'Legal/Court Threats': {
    name: 'Litigation References',
    definition: 'Frequent references to legal action, court proceedings, or attorneys in routine parenting communications. Using the legal system as leverage in non-legal disputes.',
    source: 'Ward, D. & Harvey, J.C. (1993). Family Wars.'
  },
  'Stonewalling': {
    name: 'Stonewalling',
    definition: 'Refusing to communicate, engage, or respond to legitimate parenting requests. Using silence or non-response as a communication strategy.',
    source: 'Gottman, J. (1999). The Seven Principles for Making Marriage Work.'
  },
  'Gatekeeping': {
    name: 'Information Gatekeeping',
    definition: 'Controlling access to information about children, schedules, or decisions. Withholding school information, medical updates, or excluding from decisions that should be shared.',
    source: 'Eddy, B. (2019). BIFF: Quick Responses to High-Conflict People.'
  },
  'Monitoring/Stalking': {
    name: 'Monitoring Behavior',
    definition: 'Excessive tracking, surveillance, or monitoring. Includes demonstrating knowledge of activities that should be private or showing up unexpectedly.',
    source: 'Stark, E. (2007). Coercive Control.'
  },
  'Denying': {
    name: 'Denial',
    definition: 'Refusing to acknowledge documented events, prior agreements, or established facts. May include claiming conversations never occurred or agreements were never made.',
    source: 'Related to gaslighting - Stern, R. (2018).'
  },
  'Minimizing': {
    name: 'Minimizing',
    definition: 'Dismissing legitimate concerns as overreactions or making light of issues that affect parenting coordination.',
    source: 'Bancroft, L. (2002). Why Does He Do That?'
  },
  'Projection': {
    name: 'Projection',
    definition: 'Accusing the other party of behaviors or intentions that mirror one\'s own actions.',
    source: 'Psychology literature on defense mechanisms.'
  },
  'Moving Goalposts': {
    name: 'Changing Expectations',
    definition: 'Constantly changing requirements, expectations, or terms of agreements. Standards shift such that compliance becomes impossible.',
    source: 'Communication literature - various sources.'
  },
  'Hoovering': {
    name: 'Hoovering',
    definition: 'Attempting to re-engage after conflict through sudden niceness, gifts, or appeals to nostalgia. Often follows periods of tension.',
    source: 'Relationship literature - various sources.'
  },
  'Schedule Manipulation': {
    name: 'Schedule Disruption',
    definition: 'Unilaterally changing custody schedules, creating last-minute conflicts, or using scheduling as a point of ongoing dispute.',
    source: 'Custody conflict literature - various sources.'
  },
  'Word Salad': {
    name: 'Circular Communication',
    definition: 'Long, confusing messages that do not address the actual issue. May include contradictions, topic changes, or exhausting amounts of text.',
    source: 'Communication literature - various sources.'
  },
  'Verbal Abuse': {
    name: 'Verbal Attacks',
    definition: 'Direct attacks on character through insults, demeaning language, or degrading comments.',
    source: 'Evans, P. (2010). The Verbally Abusive Relationship.'
  },
  'Name-Calling/Verbal Abuse': {
    name: 'Verbal Attacks',
    definition: 'Direct attacks on character through insults, demeaning language, or degrading comments.',
    source: 'Evans, P. (2010). The Verbally Abusive Relationship.'
  },
};

export async function POST(request: NextRequest) {
  try {
    const { userId, includeExhibitOnly } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch incidents
    let query = supabase
      .from('incidents')
      .select('*')
      .eq('user_id', userId)
      .order('incident_date', { ascending: true });

    if (includeExhibitOnly) {
      query = query.eq('include_in_exhibit', true);
    }

    const { data: incidents, error } = await query;

    if (error) throw error;
    if (!incidents || incidents.length === 0) {
      return NextResponse.json({ error: 'No incidents found' }, { status: 404 });
    }

    // Fetch case context
    const { data: caseData } = await supabase
      .from('case_context')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Filter out incidents without a co-parent message
    const validIncidents = incidents.filter(i => i.coparent_message && i.coparent_message.trim());
    
    if (validIncidents.length === 0) {
      return NextResponse.json({ 
        error: 'No incidents with messages found. Make sure to include exact quotes when saving evidence.' 
      }, { status: 404 });
    }

    // Detect duplicate messages
    const messageHashes = new Map<string, number>();
    const processedIncidents = validIncidents.map((inc, idx) => {
      const msgHash = inc.coparent_message?.trim().substring(0, 100) || '';
      const prevIndex = messageHashes.get(msgHash);
      if (prevIndex !== undefined) {
        return { ...inc, isDuplicate: true, duplicateOfIndex: prevIndex + 1 };
      }
      messageHashes.set(msgHash, idx);
      return { ...inc, isDuplicate: false };
    });

    // Calculate statistics
    const stats = calculateStats(processedIncidents);
    const patternCounts = countPatterns(processedIncidents);
    const monthlyData = getMonthlyBreakdown(processedIncidents);

    // Generate document
    const doc = createExhibitDocument(processedIncidents, stats, patternCounts, monthlyData, caseData);

    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Pattern18_Exhibit_${new Date().toISOString().split('T')[0]}.docx"`,
      },
    });

  } catch (error: any) {
    console.error('Exhibit generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate exhibit' },
      { status: 500 }
    );
  }
}

function calculateStats(incidents: any[]) {
  const critical = incidents.filter(i => i.severity === 'critical').length;
  const high = incidents.filter(i => i.severity === 'high').length;
  const medium = incidents.filter(i => i.severity === 'medium').length;
  const low = incidents.filter(i => i.severity === 'low').length;

  const dates = incidents.map(i => new Date(i.incident_date)).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const daySpan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  return {
    total: incidents.length,
    critical,
    high,
    medium,
    low,
    startDate,
    endDate,
    daySpan,
    uniquePatterns: new Set(incidents.flatMap(i => i.patterns || [])).size,
  };
}

function countPatterns(incidents: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const incident of incidents) {
    for (const pattern of incident.patterns || []) {
      counts[pattern] = (counts[pattern] || 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1])
  );
}

function getMonthlyBreakdown(incidents: any[]): Record<string, number> {
  const monthly: Record<string, number> = {};
  for (const incident of incidents) {
    const date = new Date(incident.incident_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + 1;
  }
  return monthly;
}

function getContextCategory(incident: any): string {
  const category = incident.category?.toLowerCase() || '';
  const patterns = (incident.patterns || []).map((p: string) => p.toLowerCase());
  
  if (category.includes('schedule') || patterns.some((p: string) => p.includes('schedule'))) {
    return 'Parenting time dispute';
  }
  if (category.includes('financial') || patterns.some((p: string) => p.includes('financial'))) {
    return 'Financial matter';
  }
  if (category.includes('legal') || category.includes('court') || patterns.some((p: string) => p.includes('legal') || p.includes('court'))) {
    return 'Court-related matter';
  }
  if (category.includes('holiday')) {
    return 'Holiday scheduling';
  }
  if (category.includes('medical') || category.includes('school')) {
    return 'Child welfare matter';
  }
  return 'Co-parenting communication';
}

function createExhibitDocument(
  incidents: any[],
  stats: any,
  patternCounts: Record<string, number>,
  monthlyData: Record<string, number>,
  caseInfo: any
) {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  // Determine names based on user_role
  const userRole = caseInfo?.user_role || 'respondent';
  const petitionerName = caseInfo?.petitioner_name || '';
  const respondentName = caseInfo?.respondent_name || '';
  const coparentName = caseInfo?.coparent_name || '';
  
  let otherPartyName: string;
  if (userRole === 'petitioner') {
    otherPartyName = respondentName || coparentName || 'Respondent';
  } else {
    otherPartyName = petitionerName || coparentName || 'Petitioner';
  }

  const caseNumber = caseInfo?.case_number || '';
  const courtName = caseInfo?.court || 'Superior Court';
  const county = caseInfo?.county || '';
  const state = caseInfo?.state || '';
  
  // Build case name
  let caseName = '';
  if (petitionerName && respondentName) {
    caseName = `${petitionerName} v. ${respondentName}`;
  } else {
    caseName = 'In the Matter of Parenting Time';
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 }
        }
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: { size: 48, bold: true, color: '1a3a2f', font: 'Arial' },
          paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER }
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, color: '1a3a2f', font: 'Arial' },
          paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, color: '374151', font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
        },
      ]
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: caseName, size: 18, color: '6b7280' }),
                new TextRun({ text: caseNumber ? ` | Case No. ${caseNumber}` : '', size: 18, color: '6b7280' })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 18, color: '6b7280' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '6b7280' }),
                new TextRun({ text: ' of ', size: 18, color: '6b7280' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '6b7280' }),
                new TextRun({ text: ' | Prepared by Pattern 18', size: 18, color: '9ca3af' })
              ]
            })
          ]
        })
      },
      children: [
        // ==================== COVER PAGE ====================
        new Paragraph({ spacing: { before: 1200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'EXHIBIT ___', size: 56, bold: true, color: '1a3a2f' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: 'DOCUMENTED COMMUNICATION PATTERNS', size: 28, bold: true, color: '374151' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: 'RELATED TO PARENTING TIME AND CO-PARENTING DISPUTES', size: 24, color: '374151' })]
        }),
        new Paragraph({ spacing: { before: 800 } }),
        
        // Court info
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: courtName, size: 24, color: '4b5563' })]
        }),
        (county || state) ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 50 },
          children: [new TextRun({ text: [county, state].filter(Boolean).join(', '), size: 22, color: '6b7280' })]
        }) : new Paragraph({}),
        caseNumber ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: `Case No. ${caseNumber}`, size: 24, color: '6b7280' })]
        }) : new Paragraph({}),
        
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: caseName, size: 26, bold: true, color: '1a3a2f' })]
        }),
        
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Prepared By', size: 20, color: '9ca3af' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 50 },
          children: [new TextRun({ text: 'Pattern 18', size: 24, bold: true, color: '1a3a2f' })]
        }),
        
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Documentation Period: ${formatDate(stats.startDate)} through ${formatDate(stats.endDate)}`, size: 20, color: '6b7280' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 20, color: '9ca3af' })]
        }),

        // ==================== PAGE BREAK ====================
        new Paragraph({ children: [new PageBreak()] }),

        // ==================== EXECUTIVE SUMMARY ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('EXECUTIVE SUMMARY')]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `This exhibit documents ${stats.total} written communications occurring over a ${stats.daySpan}-day period from ${formatDate(stats.startDate)} through ${formatDate(stats.endDate)}. All communications occurred in the context of parenting time, holiday scheduling, or court-related matters.`, size: 22 }),
          ]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `Analysis identifies repeated communication patterns associated with high-conflict custody dynamics. These patterns recur across multiple messages and escalate around holidays, schedule transitions, and pending court events.`, size: 22 }),
          ]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `This exhibit is provided to assist the Court in evaluating patterns across time rather than isolated exchanges.`, size: 22 }),
          ]
        }),

        // ==================== COURT RELEVANCE ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400 },
          children: [new TextRun('COURT RELEVANCE AND CHILD IMPACT')]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: 'The documented communications are relevant to parenting time determinations for the following reasons:', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• All communications occurred during active parenting time disputes', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• The child is directly referenced or involved in scheduling decisions', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• The communications escalate around holidays and court proceedings', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• The patterns interfere with cooperative co-parenting', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: 'These patterns support consideration of a simplified parenting structure designed to reduce negotiation and limit child exposure to adult conflict.', size: 22 })]
        }),

        // ==================== SUMMARY STATISTICS ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun('Summary Statistics')]
        }),
        createSummaryTable(stats, patternCounts, cellBorders),

        // ==================== PAGE BREAK ====================
        new Paragraph({ children: [new PageBreak()] }),

        // ==================== TIMELINE SUMMARY (ONE PAGE) ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('TIMELINE SUMMARY')]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: 'The following timeline provides a compressed view of documented communications for rapid review.', size: 22, color: '6b7280' })]
        }),
        createTimelineTable(incidents, cellBorders),

        // ==================== PAGE BREAK ====================
        new Paragraph({ children: [new PageBreak()] }),

        // ==================== INCIDENT SUMMARIES ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('INCIDENT SUMMARIES')]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: `The following ${stats.total} incidents are presented in chronological order. Each incident includes the date, context, direct quote, and detected communication patterns.`, size: 22, color: '6b7280' })]
        }),

        // All incidents
        ...incidents.flatMap((incident, index) => createIncidentSection(incident, index + 1, otherPartyName)),

        // ==================== PAGE BREAK ====================
        new Paragraph({ children: [new PageBreak()] }),

        // ==================== PATTERN DEFINITIONS ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('APPENDIX: PATTERN DEFINITIONS')]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: 'The following definitions are based on peer-reviewed research and established clinical literature on high-conflict custody dynamics.', size: 22, color: '6b7280' })]
        }),

        ...Object.entries(patternCounts).flatMap(([pattern]) => {
          const def = PATTERN_DEFINITIONS[pattern];
          if (!def) return [];
          return [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun(def.name)]
            }),
            new Paragraph({
              spacing: { after: 100 },
              children: [new TextRun({ text: def.definition, size: 22 })]
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: `Source: ${def.source}`, size: 20, italics: true, color: '6b7280' })]
            }),
          ];
        }),

        // ==================== DISCLAIMER ====================
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('DISCLAIMER')]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: 'This exhibit documents observed communication patterns based on written exchanges. It does not assert medical diagnoses or legal conclusions. Pattern labels are provided for analytical clarity based on established research cited herein.', size: 22 })]
        }),

        // ==================== PURPOSE OF SUBMISSION ====================
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400 },
          children: [new TextRun('PURPOSE OF SUBMISSION')]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: 'This exhibit is submitted to assist the Court in:', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• Identifying recurring communication patterns', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• Understanding escalation around parenting time disputes', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• Evaluating the need for conflict-reducing parenting structures', size: 22 })]
        }),
        new Paragraph({
          spacing: { after: 300 },
          indent: { left: 360 },
          children: [new TextRun({ text: '• Reducing child involvement in adult decision-making', size: 22 })]
        }),

        // ==================== END ====================
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '— End of Exhibit —', size: 22, italics: true, color: '9ca3af' })]
        }),
      ]
    }]
  });
}

function createSummaryTable(stats: any, patternCounts: Record<string, number>, cellBorders: any) {
  const headerShading = { fill: 'f3f4f6', type: ShadingType.CLEAR };
  
  const topPatterns = Object.entries(patternCounts).slice(0, 5);
  
  return new Table({
    columnWidths: [4500, 4500],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true, size: 22 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true, size: 22 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Total Incidents', size: 22 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: `${stats.total}`, size: 22, bold: true })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Documentation Period', size: 22 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: `${stats.daySpan} days`, size: 22 })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'High Severity', size: 22 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: `${stats.critical + stats.high}`, size: 22, color: 'dc2626' })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Patterns Detected', size: 22 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: `${stats.uniquePatterns}`, size: 22 })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Most Frequent Pattern', size: 22 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: topPatterns[0] ? `${topPatterns[0][0]} (${topPatterns[0][1]}x)` : 'N/A', size: 22 })] })] })
        ]
      }),
    ]
  });
}

function createTimelineTable(incidents: any[], cellBorders: any) {
  const headerShading = { fill: '1a3a2f', type: ShadingType.CLEAR };
  
  return new Table({
    columnWidths: [2000, 3500, 3500],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Date', bold: true, color: 'ffffff', size: 20 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Context', bold: true, color: 'ffffff', size: 20 })] })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Patterns Detected', bold: true, color: 'ffffff', size: 20 })] })]
          })
        ]
      }),
      ...incidents.map((inc, idx) => {
        const date = new Date(inc.incident_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const context = getContextCategory(inc);
        const patterns = (inc.patterns || []).slice(0, 2).join(', ') || 'None';
        const isDuplicate = inc.isDuplicate;
        
        return new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              children: [new Paragraph({ children: [new TextRun({ text: dateStr, size: 20 })] })]
            }),
            new TableCell({
              borders: cellBorders,
              children: [new Paragraph({ children: [new TextRun({ text: isDuplicate ? 'Pattern recurrence' : context, size: 20, italics: isDuplicate })] })]
            }),
            new TableCell({
              borders: cellBorders,
              children: [new Paragraph({ children: [new TextRun({ text: patterns, size: 20 })] })]
            })
          ]
        });
      })
    ]
  });
}

function createIncidentSection(incident: any, index: number, otherPartyName: string) {
  const date = new Date(incident.incident_date);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const severityColors: Record<string, string> = {
    critical: 'dc2626',
    high: 'ea580c',
    medium: 'ca8a04',
    low: '6b7280'
  };

  const patterns = incident.patterns || [];
  const severity = incident.severity || 'medium';
  const coparentMessage = incident.coparent_message || '';
  const context = getContextCategory(incident);
  const isDuplicate = incident.isDuplicate;
  const duplicateOfIndex = incident.duplicateOfIndex;

  if (!coparentMessage.trim()) {
    return [];
  }

  const elements: Paragraph[] = [
    // Incident header
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({ text: `INCIDENT ${index}`, bold: true, size: 24 }),
      ]
    }),
    
    // Date
    new Paragraph({
      spacing: { before: 100 },
      children: [
        new TextRun({ text: 'Date: ', bold: true, size: 20, color: '6b7280' }),
        new TextRun({ text: dateStr, size: 20 }),
      ]
    }),
    
    // Context
    new Paragraph({
      spacing: { before: 50 },
      children: [
        new TextRun({ text: 'Context: ', bold: true, size: 20, color: '6b7280' }),
        new TextRun({ text: context, size: 20 }),
      ]
    }),
    
    // Source
    new Paragraph({
      spacing: { before: 50 },
      children: [
        new TextRun({ text: 'Source: ', bold: true, size: 20, color: '6b7280' }),
        new TextRun({ text: `Written communication from ${otherPartyName}`, size: 20 }),
      ]
    }),
  ];

  // Handle duplicates differently
  if (isDuplicate && duplicateOfIndex) {
    elements.push(
      new Paragraph({
        spacing: { before: 150, after: 100 },
        shading: { fill: 'fef3c7', type: ShadingType.CLEAR },
        children: [
          new TextRun({ text: 'Pattern Recurrence Note: ', bold: true, size: 20 }),
          new TextRun({ text: `This communication repeats the same statements made in Incident #${duplicateOfIndex}, reinforcing previously identified patterns.`, size: 20 }),
        ]
      })
    );
  } else {
    // Direct Quote
    elements.push(
      new Paragraph({
        spacing: { before: 150 },
        children: [
          new TextRun({ text: 'Direct Quote:', bold: true, size: 20, color: '6b7280' }),
        ]
      }),
      new Paragraph({
        spacing: { before: 50, after: 100 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `"${coparentMessage}"`, size: 22 }),
        ]
      })
    );
  }

  // Detected patterns
  elements.push(
    new Paragraph({
      spacing: { before: 100 },
      children: [
        new TextRun({ text: 'Detected Communication Patterns: ', bold: true, size: 20, color: '6b7280' }),
        new TextRun({ text: patterns.length > 0 ? patterns.join(', ') : 'None detected', size: 20 }),
      ]
    }),
    
    // Severity
    new Paragraph({
      spacing: { before: 50, after: 300 },
      children: [
        new TextRun({ text: 'Severity Assessment: ', bold: true, size: 20, color: '6b7280' }),
        new TextRun({ text: severity.charAt(0).toUpperCase() + severity.slice(1), size: 20, color: severityColors[severity], bold: true }),
      ]
    })
  );

  return elements;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}