import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = 'force-dynamic';

interface Message {
  text: string;
  timestamp: string;
  sender: string;
}

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
  messages_json?: Message[];
}

interface CaseContext {
  caseNumber?: string;
  courtName?: string;
  petitionerName?: string;
  respondentName?: string;
  filingPurpose?: string;
  userRole?: "petitioner" | "respondent";
  userName?: string;
  coparentName?: string;
}

const PROMPTS = {
  declaration: `You are a legal document assistant helping a pro se litigant prepare a declaration for family court.

CRITICAL FORMATTING RULES:
- Output PLAIN TEXT ONLY - no markdown, no asterisks, no bold formatting
- Use standard legal document formatting (numbered paragraphs, proper headings)
- NO ** or __ or other markdown syntax

CRITICAL CONTENT RULES:
1. USE THE EXACT DATES PROVIDED - never change or generalize dates
2. QUOTE MESSAGES EXACTLY as provided - put them in quotation marks
3. ASSIGN EXHIBIT NUMBERS sequentially (Exhibit A-1, A-2, etc.)
4. STATE FACTS ONLY - do not interpret or add emotional language
5. Let the facts speak for themselves - judges draw their own conclusions
6. USE THE ACTUAL PARTY NAMES PROVIDED - never use generic "Petitioner" or "Respondent" placeholders

STRUCTURE:
- Proper court heading with case info and actual names
- "I, [ACTUAL NAME], declare under penalty of perjury that the following is true and correct:"
- Numbered paragraphs, one incident per paragraph
- Each paragraph should include:
  * The exact date and time if available
  * What communication platform was used (text, email, etc.)
  * The EXACT quote from the message
  * Reference to exhibit number
  * Brief factual context (what prompted the message) if known
- Signature block at end with actual name

DO NOT:
- Use markdown formatting (**, __, etc.)
- Use phrases like "hostile environment," "harmful behavior," "detrimental"
- Interpret the co-parent's motives
- Add emotional characterizations
- Change or summarize the actual quotes
- Use generic placeholders instead of actual names provided`,

  timeline: `You are creating a chronological evidence timeline for family court.

CRITICAL FORMATTING RULES:
- Output PLAIN TEXT ONLY - no markdown, no asterisks, no bold formatting
- Use simple table format with | separators
- NO ** or __ or other markdown syntax

CRITICAL CONTENT RULES:
1. USE EXACT DATES as provided - never change them
2. QUOTE MESSAGES EXACTLY in quotation marks
3. List in chronological order (oldest to newest)
4. Assign exhibit numbers sequentially
5. Keep descriptions factual and brief
6. USE THE ACTUAL PARTY NAMES PROVIDED

FORMAT:
Date | Exhibit # | Type | Exact Quote or Description
-----|-----------|------|---------------------------

Include a summary section at the end noting:
- Total number of documented incidents
- Date range covered
- Most frequent pattern types observed`,

  pattern_summary: `You are creating a pattern analysis document for family court.

CRITICAL FORMATTING RULES:
- Output PLAIN TEXT ONLY - no markdown, no asterisks, no bold formatting
- Use standard headings without markdown
- NO ** or __ or other markdown syntax

CRITICAL CONTENT RULES:
1. Group incidents by pattern type
2. USE EXACT DATES for each example
3. QUOTE MESSAGES EXACTLY
4. Count occurrences of each pattern
5. Show escalation over time if present
6. USE THE ACTUAL PARTY NAMES PROVIDED

FORMAT:
For each pattern type:
1. Pattern name and total count (as plain heading)
2. Date range when pattern occurred
3. 2-3 specific examples with exact quotes and dates
4. Brief factual description of the pattern

DO NOT interpret motives or add emotional language. Let the quotes speak for themselves.`,

  exhibit_list: `You are creating a formal exhibit list for family court submission.

CRITICAL FORMATTING RULES:
- Output PLAIN TEXT ONLY - no markdown, no asterisks, no bold formatting
- Use standard legal document formatting
- NO ** or __ or other markdown syntax

CRITICAL CONTENT RULES:
1. Number exhibits sequentially (A-1, A-2, etc.)
2. USE EXACT DATES as provided
3. Include brief description and first line of quote
4. Note the communication type
5. USE THE ACTUAL PARTY NAMES PROVIDED

FORMAT:
EXHIBIT LIST

Exhibit A-1
Date: [exact date]
Type: Text Message
Description: Communication regarding [topic]
Preview: "[first 50 characters of message]..."

End with:
Total Exhibits: [number]
Date Range: [start] to [end]
Prepared by: [actual name]
Date Prepared: [current date]`
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

    // Sort incidents by date (oldest first for chronological documents)
    const sortedIncidents = [...incidents].sort((a, b) => 
      new Date(a.incident_date).getTime() - new Date(b.incident_date).getTime()
    );

    // Format incidents with EXACT quotes and real dates
    const incidentsSummary = sortedIncidents.map((inc, i) => {
      const date = new Date(inc.incident_date);
      const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      
      // Get the exact message text
      let exactMessage = "";
      if (inc.messages_json && inc.messages_json.length > 0) {
        exactMessage = inc.messages_json.map((msg, idx) => {
          const msgTime = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          }) : "";
          return `[${msg.sender || "Co-parent"}${msgTime ? " at " + msgTime : ""}]: "${msg.text}"`;
        }).join("\n");
      } else if (inc.coparent_message) {
        exactMessage = `"${inc.coparent_message}"`;
      }
      
      return `
INCIDENT ${i + 1} (Exhibit A-${i + 1}):
EXACT DATE: ${formattedDate}
Category: ${inc.category?.replace(/_/g, " ") || "Communication"}
Severity: ${inc.severity || "medium"}
Patterns Identified: ${inc.patterns?.join(", ") || "None specified"}
Number of Messages: ${inc.message_count || 1}

EXACT MESSAGE CONTENT (quote verbatim):
${exactMessage || "[No message text available]"}
`.trim();
    }).join("\n\n===================================\n\n");

    // Determine actual names based on user role
    const userRole = caseContext.userRole || "petitioner";
    const isUserPetitioner = userRole === "petitioner";
    
    // Get actual names - use provided names or fallback
    const yourName = caseContext.userName || 
      (isUserPetitioner ? caseContext.petitionerName : caseContext.respondentName) || 
      "[YOUR NAME]";
    
    const otherPartyName = caseContext.coparentName ||
      (isUserPetitioner ? caseContext.respondentName : caseContext.petitionerName) || 
      "[OTHER PARTY NAME]";

    // For court documents, determine legal titles
    const yourTitle = isUserPetitioner ? "Petitioner" : "Respondent";
    const otherTitle = isUserPetitioner ? "Respondent" : "Petitioner";
    
    const contextInfo = `
CASE INFORMATION:
Court: ${caseContext.courtName || "[COURT NAME]"}
Case Number: ${caseContext.caseNumber || "[CASE NUMBER]"}

PARTIES (USE THESE EXACT NAMES IN THE DOCUMENT):
You (${yourTitle}): ${yourName}
Other Party (${otherTitle}): ${otherPartyName}

Your Role in Case: ${yourTitle}
Purpose of Document: ${caseContext.filingPurpose || "Documentation of communication patterns"}

EVIDENCE SUMMARY:
Total Incidents: ${incidents.length}
Date Range: ${new Date(sortedIncidents[0]?.incident_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} to ${new Date(sortedIncidents[sortedIncidents.length - 1]?.incident_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
Critical Severity: ${incidents.filter(i => i.severity === "critical").length}
High Severity: ${incidents.filter(i => i.severity === "high").length}
`.trim();

    const userMessage = `Generate a ${docType.replace("_", " ")} document using the EXACT information below.

CRITICAL INSTRUCTIONS: 
- Output PLAIN TEXT ONLY - absolutely NO markdown formatting (no **, no __, no # headers)
- Use the EXACT DATES provided for each incident - do not change them
- Quote messages EXACTLY as written - do not paraphrase
- Assign exhibit numbers A-1, A-2, etc. in chronological order
- State facts only - no interpretations or emotional language
- USE THE ACTUAL NAMES PROVIDED: "${yourName}" for you and "${otherPartyName}" for the other party
- Do NOT use generic "Petitioner" or "Respondent" - use the actual names

${contextInfo}

===================================

INCIDENTS (in chronological order):

${incidentsSummary}

===================================

Generate the complete ${docType.replace("_", " ")} document now. Use exact quotes, dates, and the actual party names provided. Output plain text only with no markdown.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ],
      system: systemPrompt
    });

    let document = response.content[0].type === "text" 
      ? response.content[0].text 
      : "Error generating document";

    // Strip any remaining markdown that slipped through
    document = document
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/__(.*?)__/g, '$1')       // Remove __bold__
      .replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
      .replace(/_(.*?)_/g, '$1')         // Remove _italic_
      .replace(/^### /gm, '')            // Remove ### headers
      .replace(/^## /gm, '')             // Remove ## headers
      .replace(/^# /gm, '');             // Remove # headers

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