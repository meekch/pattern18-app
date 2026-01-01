import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType,
  HeadingLevel, ShadingType, PageBreak, PageNumber, LevelFormat
} from 'docx';

export const runtime = 'nodejs';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pattern definitions for appendix
const PATTERN_DEFINITIONS: Record<string, { name: string; definition: string; source: string }> = {
  'Gaslighting': {
    name: 'Gaslighting',
    definition: 'A form of psychological manipulation where the abuser causes the victim to question their own memory, perception, and sanity. Common tactics include denying events occurred, trivializing feelings, and shifting blame.',
    source: 'Stern, R. (2018). The Gaslight Effect.'
  },
  'DARVO': {
    name: 'DARVO (Deny, Attack, Reverse Victim and Offender)',
    definition: 'A manipulation strategy where the perpetrator denies the behavior, attacks the person confronting them, and reverses the roles of victim and offender. The abuser portrays themselves as the victim.',
    source: 'Freyd, J.J. (1997). Violations of power, adaptive blindness and betrayal trauma theory.'
  },
  'Financial Manipulation': {
    name: 'Financial Abuse/Coercion',
    definition: 'Using money or financial resources as a tool of control. Includes withholding funds, demanding detailed accounting, threatening financial ruin, or using financial obligations to manipulate behavior.',
    source: 'National Network to End Domestic Violence (2019).'
  },
  'Triangulating Child': {
    name: 'Using Children as Weapons',
    definition: 'Placing children in the middle of parental conflict, using them as messengers, interrogating them about the other parent, or attempting to damage the child\'s relationship with the other parent.',
    source: 'Warshak, R.A. (2010). Divorce Poison.'
  },
  'Name-Calling/Verbal Abuse': {
    name: 'Verbal Abuse',
    definition: 'Direct attacks on character through insults, demeaning language, profanity, or degrading comments designed to humiliate and diminish self-worth.',
    source: 'Evans, P. (2010). The Verbally Abusive Relationship.'
  },
  'False Accusations': {
    name: 'False Accusations',
    definition: 'Making unfounded claims about behavior, character, or parenting to damage reputation, gain legal advantage, or manipulate others\' perceptions.',
    source: 'Bernet, W. (2020). Parental Alienation, DSM-5, and ICD-11.'
  },
  'Emotional Blackmail': {
    name: 'Emotional Blackmail',
    definition: 'Using fear, obligation, and guilt (FOG) to control another person\'s behavior. Includes threats of self-harm, withdrawing affection, or leveraging the children\'s emotions.',
    source: 'Forward, S. (1997). Emotional Blackmail.'
  },
  'Legal/Court Threats': {
    name: 'Litigation Abuse',
    definition: 'Using the legal system as a weapon to harass, control, or financially drain the other parent through excessive motions, false allegations, or threats of legal action.',
    source: 'Ward, D. & Harvey, J.C. (1993). Family Wars: The Alienation of Children.'
  },
  'Minimizing/Mocking': {
    name: 'Minimizing and Denying',
    definition: 'Dismissing concerns as overreactions, denying problematic behavior occurred, or mocking the other person\'s experiences and feelings to avoid accountability.',
    source: 'Bancroft, L. (2002). Why Does He Do That?'
  },
  'Revisionist History': {
    name: 'Revisionist History',
    definition: 'Rewriting past events, agreements, or conversations to favor one\'s narrative. Includes claiming agreements were never made or that events occurred differently.',
    source: 'Related to gaslighting - Stern, R. (2018).'
  },
  'Information Gatekeeping': {
    name: 'Information Gatekeeping',
    definition: 'Controlling access to important information about children, finances, or decisions. Withholding school information, medical updates, or excluding from decisions.',
    source: 'Eddy, B. (2019). BIFF: Quick Responses to High-Conflict People.'
  },
  'Schedule Manipulation': {
    name: 'Schedule Manipulation',
    definition: 'Unilaterally changing custody schedules, refusing exchanges, creating last-minute conflicts, or using scheduling as a tool of control and punishment.',
    source: 'Custody conflict literature - various sources.'
  },
  'Surveillance/Monitoring': {
    name: 'Monitoring/Stalking Behavior',
    definition: 'Excessive tracking, surveillance, or monitoring of the other parent. Includes using technology to track location, showing up unexpectedly, or knowing information they shouldn\'t.',
    source: 'Stark, E. (2007). Coercive Control.'
  },
  'Victim Positioning': {
    name: 'Victim Positioning',
    definition: 'Consistently portraying oneself as the victim regardless of circumstances. Part of DARVO pattern where the actual aggressor claims to be persecuted.',
    source: 'Freyd, J.J. (1997).'
  },
  'Deadline/Urgency Pressure': {
    name: 'False Urgency',
    definition: 'Creating artificial time pressure to force decisions without adequate consideration. A manipulation tactic to prevent thoughtful responses.',
    source: 'Influence and manipulation literature - various sources.'
  },
};

export async function POST(request: NextRequest) {
  try {
    const { userId, includeExhibitOnly, caseInfo } = await request.json();

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

    // Fetch case info
    const { data: caseData } = await supabase
      .from('case_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Calculate statistics
    const stats = calculateStats(incidents);
    const patternCounts = countPatterns(incidents);
    const monthlyData = getMonthlyBreakdown(incidents);

    // Generate document
    const doc = createExhibitDocument(incidents, stats, patternCounts, monthlyData, caseData || caseInfo);

    // Convert to buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    // Return as downloadable file
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
  const daySpan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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

function createExhibitDocument(
  incidents: any[],
  stats: any,
  patternCounts: Record<string, number>,
  monthlyData: Record<string, number>,
  caseInfo: any
) {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

  const caseName = caseInfo?.case_name || 'Case Documentation';
  const caseNumber = caseInfo?.case_number || '';
  const userName = caseInfo?.user_name || 'Petitioner';
  const coparentName = caseInfo?.coparent_name || 'Respondent';

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
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        },
        {
          reference: 'numbered-list',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        }
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
                new TextRun({ text: `${caseName}`, size: 18, color: '6b7280' }),
                new TextRun({ text: caseNumber ? ` | ${caseNumber}` : '', size: 18, color: '6b7280' })
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
                new TextRun({ text: ' | Generated by Pattern 18', size: 18, color: '9ca3af' })
              ]
            })
          ]
        })
      },
      children: [
        // TITLE PAGE
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'EXHIBIT', size: 72, bold: true, color: '1a3a2f' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: 'DOCUMENTED PATTERN OF COERCIVE CONTROL', size: 32, bold: true, color: '374151' })]
        }),
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: caseName, size: 28, color: '4b5563' })]
        }),
        caseNumber ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: `Case No. ${caseNumber}`, size: 24, color: '6b7280' })]
        }) : new Paragraph({}),
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `${userName} v. ${coparentName}`, size: 24, italics: true, color: '6b7280' })]
        }),
        new Paragraph({ spacing: { before: 1500 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Documentation Period: ${formatDate(stats.startDate)} – ${formatDate(stats.endDate)}`, size: 22, color: '6b7280' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: `(${stats.daySpan} days)`, size: 20, color: '9ca3af' })]
        }),
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 20, color: '9ca3af' })]
        }),

        // PAGE BREAK
        new Paragraph({ children: [new PageBreak()] }),

        // EXECUTIVE SUMMARY
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('EXECUTIVE SUMMARY')]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `This exhibit documents `, size: 22 }),
            new TextRun({ text: `${stats.total} incidents`, bold: true, size: 22 }),
            new TextRun({ text: ` of concerning behavior by ${coparentName} over a period of `, size: 22 }),
            new TextRun({ text: `${stats.daySpan} days`, bold: true, size: 22 }),
            new TextRun({ text: `. Analysis reveals `, size: 22 }),
            new TextRun({ text: `${stats.uniquePatterns} distinct patterns`, bold: true, size: 22 }),
            new TextRun({ text: ` of coercive control and manipulation.`, size: 22 }),
          ]
        }),

        // SEVERITY SUMMARY TABLE
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun('Severity Breakdown')]
        }),
        createSeverityTable(stats, cellBorders),

        // PATTERN BREAKDOWN
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400 },
          children: [new TextRun('Pattern Breakdown')]
        }),
        createPatternTable(patternCounts, cellBorders),

        // MONTHLY TIMELINE
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400 },
          children: [new TextRun('Monthly Timeline')]
        }),
        createMonthlyTable(monthlyData, cellBorders),

        // PAGE BREAK
        new Paragraph({ children: [new PageBreak()] }),

        // DETAILED EVIDENCE
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('DOCUMENTED INCIDENTS')]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: `The following ${stats.total} incidents are presented in chronological order. Each incident includes the date, detected manipulation patterns, severity assessment, and relevant message content.`, size: 22, color: '6b7280' })]
        }),

        // All incidents
        ...incidents.flatMap((incident, index) => createIncidentSection(incident, index + 1, cellBorders)),

        // PAGE BREAK
        new Paragraph({ children: [new PageBreak()] }),

        // APPENDIX: PATTERN DEFINITIONS
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('APPENDIX: PATTERN DEFINITIONS')]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: 'The following definitions are based on peer-reviewed research and established clinical literature on coercive control, domestic abuse, and high-conflict custody situations.', size: 22, color: '6b7280' })]
        }),

        // Pattern definitions
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

        // CLOSING
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '— End of Exhibit —', size: 22, italics: true, color: '9ca3af' })]
        }),
      ]
    }]
  });
}

function createSeverityTable(stats: any, cellBorders: any) {
  const headerShading = { fill: '1a3a2f', type: ShadingType.CLEAR };
  const criticalShading = { fill: 'fef2f2', type: ShadingType.CLEAR };
  const highShading = { fill: 'fff7ed', type: ShadingType.CLEAR };
  const mediumShading = { fill: 'fefce8', type: ShadingType.CLEAR };
  const lowShading = { fill: 'f9fafb', type: ShadingType.CLEAR };

  return new Table({
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(label =>
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            width: { size: 2340, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: label, bold: true, color: 'ffffff', size: 20 })]
            })]
          })
        )
      }),
      new TableRow({
        children: [
          { count: stats.critical, shading: criticalShading, color: 'dc2626' },
          { count: stats.high, shading: highShading, color: 'ea580c' },
          { count: stats.medium, shading: mediumShading, color: 'ca8a04' },
          { count: stats.low, shading: lowShading, color: '6b7280' },
        ].map(({ count, shading, color }) =>
          new TableCell({
            borders: cellBorders,
            shading,
            width: { size: 2340, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${count}`, bold: true, color, size: 36 })]
            })]
          })
        )
      })
    ]
  });
}

function createPatternTable(patternCounts: Record<string, number>, cellBorders: any) {
  const headerShading = { fill: 'f3f4f6', type: ShadingType.CLEAR };

  return new Table({
    columnWidths: [6000, 3360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            width: { size: 6000, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: 'Pattern', bold: true, size: 20 })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            width: { size: 3360, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Incidents', bold: true, size: 20 })]
            })]
          })
        ]
      }),
      ...Object.entries(patternCounts).map(([pattern, count]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              width: { size: 6000, type: WidthType.DXA },
              children: [new Paragraph({
                children: [new TextRun({ text: pattern, size: 22 })]
              })]
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 3360, type: WidthType.DXA },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${count}`, size: 22, bold: true })]
              })]
            })
          ]
        })
      )
    ]
  });
}

function createMonthlyTable(monthlyData: Record<string, number>, cellBorders: any) {
  const headerShading = { fill: 'f3f4f6', type: ShadingType.CLEAR };

  return new Table({
    columnWidths: [6000, 3360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            width: { size: 6000, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({ text: 'Month', bold: true, size: 20 })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            shading: headerShading,
            width: { size: 3360, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Incidents', bold: true, size: 20 })]
            })]
          })
        ]
      }),
      ...Object.entries(monthlyData).map(([month, count]) => {
        const [year, m] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              width: { size: 6000, type: WidthType.DXA },
              children: [new Paragraph({
                children: [new TextRun({ text: monthName, size: 22 })]
              })]
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 3360, type: WidthType.DXA },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${count}`, size: 22, bold: true })]
              })]
            })
          ]
        });
      })
    ]
  });
}

function createIncidentSection(incident: any, index: number, cellBorders: any) {
  const date = new Date(incident.incident_date);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const severityColors: Record<string, string> = {
    critical: 'dc2626',
    high: 'ea580c',
    medium: 'ca8a04',
    low: '6b7280'
  };

  const severityBg: Record<string, any> = {
    critical: { fill: 'fef2f2', type: ShadingType.CLEAR },
    high: { fill: 'fff7ed', type: ShadingType.CLEAR },
    medium: { fill: 'fefce8', type: ShadingType.CLEAR },
    low: { fill: 'f9fafb', type: ShadingType.CLEAR }
  };

  const patterns = incident.patterns || [];
  const severity = incident.severity || 'medium';
  const message = incident.coparent_message || incident.messages_json?.[0]?.text || 'No message content';

  const elements: Paragraph[] = [
    // Incident header
    new Paragraph({
      spacing: { before: 400 },
      shading: severityBg[severity],
      children: [
        new TextRun({ text: `Incident #${index}`, bold: true, size: 24 }),
        new TextRun({ text: '  |  ', color: '9ca3af', size: 22 }),
        new TextRun({ text: dateStr, size: 22, color: '6b7280' }),
        new TextRun({ text: '  |  ', color: '9ca3af', size: 22 }),
        new TextRun({ text: severity.toUpperCase(), bold: true, size: 20, color: severityColors[severity] }),
      ]
    }),

    // Patterns
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({ text: 'Patterns: ', bold: true, size: 20, color: '6b7280' }),
        new TextRun({ text: patterns.length > 0 ? patterns.join(', ') : 'None detected', size: 20, color: '374151' }),
      ]
    }),

    // Message content
    new Paragraph({
      spacing: { before: 100 },
      children: [new TextRun({ text: 'Message:', bold: true, size: 20, color: '6b7280' })]
    }),
    new Paragraph({
      spacing: { after: 300 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: '"', size: 22, italics: true, color: '6b7280' }),
        new TextRun({ text: message.substring(0, 500) + (message.length > 500 ? '...' : ''), size: 22, italics: true }),
        new TextRun({ text: '"', size: 22, italics: true, color: '6b7280' }),
      ]
    }),
  ];

  return elements;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}