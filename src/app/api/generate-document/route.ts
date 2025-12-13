import { NextRequest, NextResponse } from "next/server";
import {
  generateResponseToMotion,
  generateMotionForContempt,
  generatePatternAnalysis,
  generateAffidavit,
  documentToBuffer,
  LEGAL_DISCLAIMER,
  ResponseData,
  ContemptData,
  PatternAnalysisData,
  AffidavitData,
} from "@/lib/court-documents";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentType, data } = body;

    if (!documentType || !data) {
      return NextResponse.json(
        { error: "Missing documentType or data" },
        { status: 400 }
      );
    }

    let document;
    let filename;

    switch (documentType) {
      case "response":
        document = generateResponseToMotion(data as ResponseData);
        filename = "Response-to-Motion.docx";
        break;

      case "contempt":
        document = generateMotionForContempt(data as ContemptData);
        filename = "Motion-for-Contempt.docx";
        break;

      case "pattern-analysis":
        document = generatePatternAnalysis(data as PatternAnalysisData);
        filename = "Pattern-Analysis-Exhibit.docx";
        break;

      case "affidavit":
        document = generateAffidavit(data as AffidavitData);
        filename = "Affidavit.docx";
        break;

      default:
        return NextResponse.json(
          { error: `Unknown document type: ${documentType}` },
          { status: 400 }
        );
    }

    const buffer = await documentToBuffer(document);

return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Document generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    disclaimer: LEGAL_DISCLAIMER,
    availableDocuments: [
      { type: "response", name: "Response to Motion", description: "Respond to a motion filed by the other party" },
      { type: "contempt", name: "Motion for Contempt", description: "Document violations of court orders" },
      { type: "pattern-analysis", name: "Pattern Analysis Exhibit", description: "AI-generated summary of communication patterns" },
      { type: "affidavit", name: "Affidavit/Declaration", description: "Sworn statement supporting a motion" },
    ],
    notice: "Pattern 18 is NOT a law firm. Documents are for organizational purposes only. Consult an attorney before filing.",
  });
}