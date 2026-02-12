import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  Document, Packer, Paragraph, TextRun, Footer,
  AlignmentType, PageNumber,
} from 'docx';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  try {
    const { documentContent, documentTitle, caseContext } = await req.json();

    if (!documentContent) {
      return NextResponse.json({ error: 'No document content provided' }, { status: 400 });
    }

    const userRole = caseContext?.user_role || caseContext?.userRole || 'respondent';
    const petitionerName = caseContext?.petitioner_name || caseContext?.petitionerName || '';
    const respondentName = caseContext?.respondent_name || caseContext?.respondentName || '';
    const caseNumber = caseContext?.case_number || caseContext?.caseNumber || '';
    const courtName = caseContext?.court || 'Superior Court';
    const county = caseContext?.county || '';
    const state = caseContext?.state || '';
    const userName = userRole === 'petitioner' ? petitionerName : respondentName;
    const roleLabel = userRole === 'petitioner' ? 'Petitioner, Pro Se' : 'Respondent, Pro Se';

    const FONT = 'Times New Roman';
    const BODY_SIZE = 24; // 12pt
    const CAPTION_SIZE = 24;
    const TITLE_SIZE = 28; // 14pt
    const LINE_SPACING = 480; // double spacing

    // Build caption paragraphs
    const captionParagraphs: Paragraph[] = [];

    if (state || courtName) {
      captionParagraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: `${courtName.toUpperCase()}${state ? ` OF ${state.toUpperCase()}` : ''}`, font: FONT, size: CAPTION_SIZE, bold: true })],
      }));
    }
    if (county) {
      captionParagraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `${county.toUpperCase()} COUNTY`, font: FONT, size: CAPTION_SIZE, bold: true })],
      }));
    }

    // Party names and case number
    if (petitionerName || respondentName || caseNumber) {
      captionParagraphs.push(new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: petitionerName || '[PETITIONER]', font: FONT, size: BODY_SIZE })],
      }));
      captionParagraphs.push(new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: '     Petitioner,', font: FONT, size: BODY_SIZE }),
          new TextRun({ text: `          Case No. ${caseNumber || '[CASE NUMBER]'}`, font: FONT, size: BODY_SIZE }),
        ],
      }));
      captionParagraphs.push(new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: 'vs.', font: FONT, size: BODY_SIZE })],
      }));
      captionParagraphs.push(new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: respondentName || '[RESPONDENT]', font: FONT, size: BODY_SIZE })],
      }));
      captionParagraphs.push(new Paragraph({
        spacing: { after: 400 },
        children: [new TextRun({ text: '     Respondent.', font: FONT, size: BODY_SIZE })],
      }));
    }

    // Document title
    const title = documentTitle || 'DOCUMENT';
    captionParagraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: TITLE_SIZE, bold: true, underline: {} })],
    }));

    // Parse document content into paragraphs
    const contentParagraphs = documentContent.split('\n').map((line: string) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return new Paragraph({ spacing: { after: 0, line: LINE_SPACING }, children: [] });
      }

      // Detect section headers (ALL CAPS lines)
      const isHeader = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);

      if (isHeader) {
        return new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200, line: LINE_SPACING },
          children: [new TextRun({ text: trimmed, font: FONT, size: BODY_SIZE, bold: true })],
        });
      }

      return new Paragraph({
        spacing: { after: 0, line: LINE_SPACING },
        children: [new TextRun({ text: trimmed, font: FONT, size: BODY_SIZE })],
      });
    });

    // Signature block
    const signatureBlock: Paragraph[] = [
      new Paragraph({ spacing: { before: 600, after: 0 }, children: [] }),
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: 'Respectfully submitted,', font: FONT, size: BODY_SIZE })],
      }),
      new Paragraph({ spacing: { after: 0 }, children: [] }),
      new Paragraph({ spacing: { after: 0 }, children: [] }),
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: '________________________________', font: FONT, size: BODY_SIZE })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: userName || '[YOUR NAME]', font: FONT, size: BODY_SIZE })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: roleLabel, font: FONT, size: BODY_SIZE })],
      }),
    ];

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: FONT, size: BODY_SIZE },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twips
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 }),
              ],
            })],
          }),
        },
        children: [
          ...captionParagraphs,
          ...contentParagraphs,
          ...signatureBlock,
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.docx`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Coach document error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
