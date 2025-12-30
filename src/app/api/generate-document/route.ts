import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = 'force-dynamic';

interface Incident {
  id: string;
  title: string;
  category: string;
  patterns: string[];
  severity: string;
  incident_date: string;
  message_count?: number;
  evidence_strength?: string;
  coparent_message?: string;
  messages_json?: any[];
}

interface CaseContext {
  caseNumber?: string;
  courtName?: string;
  petitionerName?: string;
  respondentName?: string;
  filingPurpose?: string;
  userRole?: "petitioner" | "respondent";
}

const PROMPTS = {
  declaration: `You are a legal document assistant helping a pro se litigant prepare a declaration for family court.

Generate a formal declaration based on the incidents provided. The declaration should:
1. Start with proper heading (if case details provided)
2. Include "I, [name], declare under penalty of perjury:"
3. Number each paragraph
4. State facts objectively without emotional language
5. Reference specific dates and incidents
6. Note patterns of behavior where applicable
7. End with signature block and date line

Keep language factual, specific, and court-appropriate. Avoid inflammatory language.
Focus on documented facts, not interpretations.`,

  timeline: `You are a legal document assistant creating a chronological timeline for family court.

Generate a clear timeline based on the incidents provided. The timeline should:
1. List events in chronological order
2. Include specific dates
3. Briefly describe each incident
4. Note severity and patterns where relevant
5. Be concise but complete
6. Use neutral, factual language

Format as a clean, scannable list that an attorney or judge can quickly review.`,

  pattern_summary: `You are a legal document assistant analyzing communication patterns for family court.

Generate a pattern analysis based on the incidents provided. The summary should:
1. Identify recurring patterns of behavior
2. Count occurrences of each pattern
3. Provide specific examples for each pattern
4. Note escalation over time if present
5. Use clinical/professional terminology
6. Reference specific dates and incidents

This document helps demonstrate systematic behavior rather than isolated incidents.`,

  exhibit_list: `You are a legal document assistant creating an exhibit list for family court.

Generate a formal exhibit list based on the incidents provided. The list should:
1. Number each exhibit sequentially
2. Provide brief description of each item
3. Include date of incident
4. Note what the exhibit demonstrates
5. Follow standard court formatting

This will serve as an index for evidence submitted to the court.`
};

export async function POST(request: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  try {
    const body = await request.json();
    const { docType, incidents, caseContext } = body as {
      docType: keyof typeof PROMPTS;
      incidents: Incident[];
      caseContext: CaseContext;
    };

    if (!docType || !incidents || incidents.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = PROMPTS[docType] || PROMPTS.declaration;

    // Format incidents for the prompt
    const incidentsSummary = incidents.map((inc, i) => {
      const date = new Date(inc.incident_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      
      return `
INCIDENT ${i + 1}:
Date: ${date}
Category: ${inc.category}
Severity: ${inc.severity}
Patterns Detected: ${inc.patterns?.join(", ") || "None specified"}
Message/Content: "${inc.coparent_message || inc.messages_json?.[0]?.text || inc.title}"
${inc.message_count && inc.message_count > 1 ? `Additional messages in thread: ${inc.message_count - 1}` : ""}
`.trim();
    }).join("\n\n---\n\n");

    // Format case context
    const contextInfo = `
CASE INFORMATION:
${caseContext.courtName ? `Court: ${caseContext.courtName}` : ""}
${caseContext.caseNumber ? `Case Number: ${caseContext.caseNumber}` : ""}
${caseContext.petitionerName ? `Declarant/Your Name: ${caseContext.petitionerName}` : ""}
${caseContext.respondentName ? `Other Party: ${caseContext.respondentName}` : ""}
${caseContext.userRole ? `Your Role: ${caseContext.userRole}` : ""}
${caseContext.filingPurpose ? `Purpose: ${caseContext.filingPurpose}` : ""}

Total Incidents: ${incidents.length}
Date Range: ${new Date(incidents[incidents.length - 1]?.incident_date).toLocaleDateString()} to ${new Date(incidents[0]?.incident_date).toLocaleDateString()}
`.trim();

    const userMessage = `Please generate a ${docType.replace("_", " ")} document based on the following information:

${contextInfo}

---

INCIDENTS TO INCLUDE:

${incidentsSummary}

---

Generate the complete document now. Make it professional and court-ready.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ],
      system: systemPrompt
    });

    const document = response.content[0].type === "text" 
      ? response.content[0].text 
      : "Error generating document";

    return NextResponse.json({ 
      success: true,
      document,
      docType,
      incidentCount: incidents.length
    });

  } catch (error) {
    console.error("Document generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}