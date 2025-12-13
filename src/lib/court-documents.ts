// src/lib/court-documents.ts
// Pattern 18 Court Document Generator
// NOT LEGAL ADVICE - Organizational tool only

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Footer,
    AlignmentType,
    PageNumber,
    TabStopType,
    LevelFormat,
  } from "docx";
  
  // ============================================
  // CONFIGURATION
  // ============================================
  
  const COURT_CONFIG = {
    font: "Times New Roman",
    fontSize: 24, // 12pt in half-points
    margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
  };
  
  // ============================================
  // LEGAL DISCLAIMER
  // ============================================
  
  export const LEGAL_DISCLAIMER = `
  IMPORTANT LEGAL NOTICE
  
  Pattern 18 Coach is an ORGANIZATIONAL TOOL, not a law firm.
  
  - We do NOT provide legal advice
  - We are NOT a substitute for an attorney
  - Documents generated are STARTING POINTS for you to customize
  
  Before filing anything with a court:
  - Review and verify all content for accuracy
  - Check your local court rules and formatting requirements
  - Consider consulting with a licensed attorney
  
  Your state may have different requirements. Court rules vary by state, 
  county, and even judge. You are responsible for ensuring compliance.
  `.trim();
  
  // ============================================
  // TYPES
  // ============================================
  
  export interface Child {
    child_name: string;
    child_dob?: string;
    school_district?: string;
  }
  
  export interface BaseDocumentData {
    // Case info
    caseNumber: string;
    county: string;
    state: string;
    
    // Role
    userRole: "petitioner" | "respondent";
    
    // Parties
    petitionerName: string;
    respondentName: string;
    
    // User contact (whoever is using the system)
    userAddress: string;
    userCity: string;
    userState: string;
    userZip: string;
    userPhone: string;
    userEmail: string;
    
    // Children
    children: Child[];
    
    // Filing
    filingDate: string;
  }
  
  export interface ResponseData extends BaseDocumentData {
    opposingMotionTitle: string;
    opposingMotionDate: string;
    responsePoints: string[];
    supportingFacts: string[];
    evidenceReferences?: { exhibit: string; description: string }[];
    reliefRequested: string[];
  }
  
  export interface ContemptData extends BaseDocumentData {
    courtOrderDate: string;
    courtOrderProvisions: string[];
    violations: {
      title: string;
      date: string;
      provisionViolated: string;
      expected: string;
      actual: string;
      evidence?: string;
      childImpact?: string;
    }[];
    reliefRequested: string[];
  }
  
  export interface PatternAnalysisData extends BaseDocumentData {
    analysisTitle?: string;
    dateRange: string;
    patterns: {
      name: string;
      count: number;
      definition: string;
      examples: { date: string; quote: string }[];
    }[];
    summary: string;
  }
  
  export interface AffidavitData extends BaseDocumentData {
    affidavitTitle?: string;
    declarationStatements: string[];
    exhibitReferences?: string[];
  }
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  function getUserName(data: BaseDocumentData): string {
    return data.userRole === "petitioner" ? data.petitionerName : data.respondentName;
  }
  
  function getOtherPartyName(data: BaseDocumentData): string {
    return data.userRole === "petitioner" ? data.respondentName : data.petitionerName;
  }
  
  function getUserRoleLabel(data: BaseDocumentData): string {
    return data.userRole === "petitioner" ? "Petitioner" : "Respondent";
  }
  
  function getOtherPartyRoleLabel(data: BaseDocumentData): string {
    return data.userRole === "petitioner" ? "Respondent" : "Petitioner";
  }
  
  function getProPerLabel(data: BaseDocumentData): string {
    // Arizona uses "In Propria Persona", California uses "In Pro Per"
    const state = data.state.toLowerCase();
    if (state === "california" || state === "ca") {
      return "In Pro Per";
    }
    return "In Propria Persona";
  }
  
  function getChildrenText(children: Child[]): string {
    if (children.length === 0) return "the minor child";
    if (children.length === 1) return `the minor child, ${children[0].child_name}`;
    
    const names = children.map(c => c.child_name);
    if (names.length === 2) {
      return `the minor children, ${names[0]} and ${names[1]}`;
    }
    const last = names.pop();
    return `the minor children, ${names.join(", ")}, and ${last}`;
  }
  
  // ============================================
  // SHARED COMPONENTS
  // ============================================
  
  function createHeader(data: BaseDocumentData): Paragraph[] {
    const userName = getUserName(data);
    const roleLabel = getUserRoleLabel(data);
    
    return [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: userName.toUpperCase(),
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: data.userAddress,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: `${data.userCity}, ${data.userState} ${data.userZip}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: `Telephone: ${data.userPhone}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `Email: ${data.userEmail}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `${roleLabel}, ${getProPerLabel(data)}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
    ];
  }
  
  function createCourtTitle(data: BaseDocumentData): Paragraph[] {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `SUPERIOR COURT OF ${data.state.toUpperCase()}`,
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `IN AND FOR THE COUNTY OF ${data.county.toUpperCase()}`,
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
    ];
  }
  
  function createCaseCaption(data: BaseDocumentData): Paragraph[] {
    return [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: `${data.petitionerName.toUpperCase()},`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "Petitioner,",
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: "v.",
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: `${data.respondentName.toUpperCase()},`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        tabStops: [{ type: TabStopType.LEFT, position: 5760 }],
        children: [
          new TextRun({
            text: "Respondent.",
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
          new TextRun({
            text: `\tCase No. ${data.caseNumber}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
    ];
  }
  
  function createSignatureBlock(data: BaseDocumentData): Paragraph[] {
    const userName = getUserName(data);
    const roleLabel = getUserRoleLabel(data);
    
    return [
      new Paragraph({
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: "VERIFICATION",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "I declare under penalty of perjury that the statements in this document are true and correct to the best of my knowledge.",
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: `DATED: ${data.filingDate}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: "________________________________",
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: userName.toUpperCase(),
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${roleLabel}, ${getProPerLabel(data)}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: "─".repeat(50),
            font: COURT_CONFIG.font,
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "NOTICE: ",
            bold: true,
            font: COURT_CONFIG.font,
            size: 20,
          }),
          new TextRun({
            text: "This document was prepared using Pattern 18 Coach, an organizational tool. Pattern 18 is not a law firm and does not provide legal advice. Review all content, verify local court requirements, and consider consulting an attorney before filing.",
            font: COURT_CONFIG.font,
            size: 20,
            italics: true,
          }),
        ],
      }),
    ];
  }
  
  function createDocumentShell(
    title: string,
    data: BaseDocumentData,
    content: Paragraph[]
  ): Document {
    return new Document({
      styles: {
        default: {
          document: {
            run: { font: COURT_CONFIG.font, size: COURT_CONFIG.fontSize },
          },
        },
      },
      numbering: {
        config: [
          {
            reference: "main-list",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: COURT_CONFIG.margins,
              size: { width: 12240, height: 15840 },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: COURT_CONFIG.font,
                      size: COURT_CONFIG.fontSize,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            ...createHeader(data),
            ...createCourtTitle(data),
            ...createCaseCaption(data),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 400 },
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  font: COURT_CONFIG.font,
                  size: COURT_CONFIG.fontSize,
                }),
              ],
            }),
            ...content,
            ...createSignatureBlock(data),
          ],
        },
      ],
    });
  }
  
  // ============================================
  // DOCUMENT GENERATORS
  // ============================================
  
  export function generateResponseToMotion(data: ResponseData): Document {
    const userRole = getUserRoleLabel(data);
    const otherParty = getOtherPartyRoleLabel(data);
    const childrenText = getChildrenText(data.children);
    
    const content: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: `${userRole} respectfully submits this Response to ${otherParty}'s ${data.opposingMotionTitle} filed on ${data.opposingMotionDate}.`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "INTRODUCTION",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      ...data.responsePoints.map(
        (point) =>
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: point,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
      ),
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "STATEMENT OF FACTS",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      ...data.supportingFacts.map(
        (fact) =>
          new Paragraph({
            numbering: { reference: "main-list", level: 0 },
            children: [
              new TextRun({
                text: fact,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
      ),
    ];
  
    if (data.evidenceReferences && data.evidenceReferences.length > 0) {
      content.push(
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: "SUPPORTING EVIDENCE",
              bold: true,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        ...data.evidenceReferences.map(
          (ref) =>
            new Paragraph({
              indent: { left: 720 },
              children: [
                new TextRun({
                  text: `- ${ref.exhibit}: ${ref.description}`,
                  font: COURT_CONFIG.font,
                  size: COURT_CONFIG.fontSize,
                }),
              ],
            })
        )
      );
    }
  
    content.push(
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "RELIEF REQUESTED",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${userRole} respectfully requests the Court:`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      ...data.reliefRequested.map(
        (request) =>
          new Paragraph({
            numbering: { reference: "main-list", level: 0 },
            children: [
              new TextRun({
                text: request,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
      ),
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: `This relief serves the best interests of ${childrenText} and promotes stability.`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      })
    );
  
    return createDocumentShell(`${userRole.toUpperCase()}'S RESPONSE TO MOTION`, data, content);
  }
  
  export function generateMotionForContempt(data: ContemptData): Document {
    const userRole = getUserRoleLabel(data);
    const otherParty = getOtherPartyRoleLabel(data);
    const otherPartyName = getOtherPartyName(data);
    const childrenText = getChildrenText(data.children);
    
    const content: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: `${userRole} moves this Court to find ${otherParty} in contempt for willful violation of the Court's Order dated ${data.courtOrderDate}.`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "RELEVANT COURT ORDER PROVISIONS",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      ...data.courtOrderProvisions.map(
        (provision) =>
          new Paragraph({
            indent: { left: 720 },
            children: [
              new TextRun({
                text: `- ${provision}`,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
      ),
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "STATEMENT OF VIOLATIONS",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
    ];
  
    data.violations.forEach((violation, i) => {
      content.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: `Violation ${i + 1}: ${violation.title}`,
              bold: true,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Date: ${violation.date}`,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Order Provision Violated: ${violation.provisionViolated}`,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `What Should Have Happened: ${violation.expected}`,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `What Actually Happened: ${violation.actual}`,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        })
      );
  
      if (violation.evidence) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Supporting Evidence: ${violation.evidence}`,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
        );
      }
  
      if (violation.childImpact) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Impact on ${childrenText}: ${violation.childImpact}`,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
        );
      }
    });
  
    content.push(
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "ELEMENTS OF CONTEMPT",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        numbering: { reference: "main-list", level: 0 },
        children: [
          new TextRun({
            text: "A valid court order existed.",
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        numbering: { reference: "main-list", level: 0 },
        children: [
          new TextRun({
            text: `${otherParty} had knowledge of the order.`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        numbering: { reference: "main-list", level: 0 },
        children: [
          new TextRun({
            text: `${otherParty} had the ability to comply.`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        numbering: { reference: "main-list", level: 0 },
        children: [
          new TextRun({
            text: `${otherParty} willfully failed to comply.`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: "RELIEF REQUESTED",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      ...data.reliefRequested.map(
        (request) =>
          new Paragraph({
            numbering: { reference: "main-list", level: 0 },
            children: [
              new TextRun({
                text: request,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
      )
    );
  
    return createDocumentShell(`${userRole.toUpperCase()}'S MOTION FOR CONTEMPT`, data, content);
  }
  
  export function generatePatternAnalysis(data: PatternAnalysisData): Document {
    const childrenText = getChildrenText(data.children);
    
    const content: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Analysis Period: ${data.dateRange}`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: "PATTERNS IDENTIFIED",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
    ];
  
    data.patterns.forEach((pattern) => {
      content.push(
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: `${pattern.name} (${pattern.count} instances)`,
              bold: true,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        new Paragraph({
          indent: { left: 360 },
          children: [
            new TextRun({
              text: pattern.definition,
              italics: true,
              font: COURT_CONFIG.font,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 100 },
          children: [
            new TextRun({
              text: "Examples:",
              bold: true,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        ...pattern.examples.map(
          (example) =>
            new Paragraph({
              indent: { left: 720 },
              children: [
                new TextRun({
                  text: `${example.date}: `,
                  bold: true,
                  font: COURT_CONFIG.font,
                  size: COURT_CONFIG.fontSize,
                }),
                new TextRun({
                  text: `"${example.quote}"`,
                  font: COURT_CONFIG.font,
                  size: COURT_CONFIG.fontSize,
                }),
              ],
            })
        )
      );
    });
  
    content.push(
      new Paragraph({
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: "SUMMARY",
            bold: true,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: data.summary,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: "─".repeat(50),
            font: COURT_CONFIG.font,
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "PATTERN ANALYSIS NOTICE: ",
            bold: true,
            font: COURT_CONFIG.font,
            size: 20,
          }),
          new TextRun({
            text: "This analysis identifies potential communication patterns for organizational purposes. This is NOT a clinical diagnosis or legal determination. For clinical assessment, consult a licensed mental health professional.",
            italics: true,
            font: COURT_CONFIG.font,
            size: 20,
          }),
        ],
      })
    );
  
    return createDocumentShell(
      data.analysisTitle || "EXHIBIT: COMMUNICATION PATTERN ANALYSIS",
      data,
      content
    );
  }
  
  export function generateAffidavit(data: AffidavitData): Document {
    const userName = getUserName(data);
    const userRole = getUserRoleLabel(data);
    
    const content: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: `I, ${userName}, declare under penalty of perjury:`,
            font: COURT_CONFIG.font,
            size: COURT_CONFIG.fontSize,
          }),
        ],
      }),
      ...data.declarationStatements.map(
        (statement) =>
          new Paragraph({
            numbering: { reference: "main-list", level: 0 },
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: statement,
                font: COURT_CONFIG.font,
                size: COURT_CONFIG.fontSize,
              }),
            ],
          })
      ),
    ];
  
    if (data.exhibitReferences && data.exhibitReferences.length > 0) {
      content.push(
        new Paragraph({
          spacing: { before: 300 },
          children: [
            new TextRun({
              text: "ATTACHED EXHIBITS",
              bold: true,
              font: COURT_CONFIG.font,
              size: COURT_CONFIG.fontSize,
            }),
          ],
        }),
        ...data.exhibitReferences.map(
          (ref, i) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: `Exhibit ${String.fromCharCode(65 + i)}: ${ref}`,
                  font: COURT_CONFIG.font,
                  size: COURT_CONFIG.fontSize,
                }),
              ],
            })
        )
      );
    }
  
    return createDocumentShell(
      data.affidavitTitle || `AFFIDAVIT OF ${userName.toUpperCase()}`,
      data,
      content
    );
  }
  
  // ============================================
  // EXPORT TO BUFFER
  // ============================================
  
  export async function documentToBuffer(doc: Document): Promise<Buffer> {
    return await Packer.toBuffer(doc);
  }
  
  export { Packer };