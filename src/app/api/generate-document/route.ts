import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber } from "docx";

export async function POST(req: NextRequest) {
  try {
    const { content, documentType, caseInfo } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Parse the plain text content into paragraphs
    const lines = content.split('\n').filter((line: string) => line.trim() !== '');
    
    const children: Paragraph[] = [];
    
    lines.forEach((line: string, index: number) => {
      const trimmedLine = line.trim();
      
      // Detect headers/titles (all caps or specific patterns)
      const isTitle = index === 0 || 
        trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 10 ||
        trimmedLine.startsWith('DECLARATION OF') ||
        trimmedLine.startsWith('EXHIBIT LIST') ||
        trimmedLine.startsWith('PATTERN SUMMARY') ||
        trimmedLine.startsWith('INCIDENT TIMELINE') ||
        trimmedLine.startsWith('SUPERIOR COURT');
      
      // Detect case caption elements
      const isCaseCaption = trimmedLine.includes(' v. ') || 
        trimmedLine.startsWith('Case No') ||
        trimmedLine === 'Petitioner,' ||
        trimmedLine === 'Respondent.';
      
      // Detect numbered paragraphs
      const isNumberedParagraph = /^\d+\./.test(trimmedLine);
      
      // Detect signature line
      const isSignatureLine = trimmedLine.startsWith('____') || 
        trimmedLine.startsWith('Executed on') ||
        trimmedLine.includes('penalty of perjury');

      if (isTitle) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({ 
                text: trimmedLine, 
                bold: true, 
                size: 28,
                font: "Times New Roman"
              })
            ]
          })
        );
      } else if (isCaseCaption) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ 
                text: trimmedLine, 
                size: 24,
                font: "Times New Roman"
              })
            ]
          })
        );
      } else if (isNumberedParagraph) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            indent: { firstLine: 720 },
            children: [
              new TextRun({ 
                text: trimmedLine, 
                size: 24,
                font: "Times New Roman"
              })
            ]
          })
        );
      } else if (isSignatureLine) {
        children.push(
          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [
              new TextRun({ 
                text: trimmedLine, 
                size: 24,
                font: "Times New Roman"
              })
            ]
          })
        );
      } else {
        // Regular paragraph
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({ 
                text: trimmedLine, 
                size: 24,
                font: "Times New Roman"
              })
            ]
          })
        );
      }
    });

    // Create the document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24 // 12pt
            }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ 
                    text: caseInfo?.caseNumber || '',
                    size: 20,
                    font: "Times New Roman"
                  })
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
                  new TextRun({ text: "Page ", size: 20, font: "Times New Roman" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 20, font: "Times New Roman" }),
                  new TextRun({ text: " of ", size: 20, font: "Times New Roman" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 20, font: "Times New Roman" })
                ]
              })
            ]
          })
        },
        children: children
      }]
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${documentType || 'document'}-${new Date().toISOString().split('T')[0]}.docx"`
      }
    });

  } catch (error) {
    console.error('DOCX generation error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}