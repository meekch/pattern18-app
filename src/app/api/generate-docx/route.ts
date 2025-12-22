import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber } from "docx";

// Parse text with **bold** markers into TextRun array
function parseTextWithBold(text: string, baseSize: number = 24): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  parts.forEach(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        size: baseSize,
        font: "Times New Roman"
      }));
    } else if (part) {
      // Regular text
      runs.push(new TextRun({
        text: part,
        size: baseSize,
        font: "Times New Roman"
      }));
    }
  });
  
  return runs.length > 0 ? runs : [new TextRun({ text: text, size: baseSize, font: "Times New Roman" })];
}

export async function POST(req: NextRequest) {
  try {
    const { content, documentType, caseInfo } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Clean markdown from content first
    let cleanContent = content
      .replace(/^#+\s/gm, '') // Remove # headers
      .replace(/^---$/gm, ''); // Remove hr lines

    // Parse the plain text content into paragraphs
    const lines = cleanContent.split('\n').filter((line: string) => line.trim() !== '');
    
    const children: Paragraph[] = [];
    
    lines.forEach((line: string, index: number) => {
      let trimmedLine = line.trim();
      
      // Check if line has bold markers
      const hasBold = trimmedLine.includes('**');
      
      // Clean line for detection (remove ** for checking)
      const cleanLine = trimmedLine.replace(/\*\*/g, '');
      
      // Detect headers/titles (all caps or specific patterns)
      const isTitle = index === 0 || 
        (cleanLine === cleanLine.toUpperCase() && cleanLine.length > 10) ||
        cleanLine.startsWith('DECLARATION OF') ||
        cleanLine.startsWith('EXHIBIT LIST') ||
        cleanLine.startsWith('PATTERN SUMMARY') ||
        cleanLine.startsWith('BEHAVIORAL PATTERN') ||
        cleanLine.startsWith('INCIDENT TIMELINE') ||
        cleanLine.startsWith('OVERVIEW') ||
        cleanLine.startsWith('FREQUENCY') ||
        cleanLine.startsWith('IMPACT') ||
        cleanLine.startsWith('SPECIFIC EXAMPLES') ||
        cleanLine.startsWith('SUPERIOR COURT');
      
      // Detect case caption elements
      const isCaseCaption = cleanLine.includes(' v. ') || 
        cleanLine.startsWith('Case No') ||
        cleanLine.startsWith('Case:') ||
        cleanLine === 'Petitioner,' ||
        cleanLine === 'Respondent.';
      
      // Detect numbered paragraphs
      const isNumberedParagraph = /^\d+\./.test(cleanLine);
      
      // Detect signature line
      const isSignatureLine = cleanLine.startsWith('____') || 
        cleanLine.startsWith('Executed on') ||
        cleanLine.includes('penalty of perjury');
      
      // Detect section headers (bold text that's a header)
      const isSectionHeader = hasBold && cleanLine.length < 60 && !cleanLine.includes(':') && index > 0;

      if (isTitle || isSectionHeader) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({ 
                text: cleanLine, 
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
                text: cleanLine, 
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
                text: cleanLine, 
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
                text: cleanLine, 
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
                text: cleanLine, 
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

    // Convert to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(buffer);

    // Return as downloadable file
    return new NextResponse(uint8Array, {
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