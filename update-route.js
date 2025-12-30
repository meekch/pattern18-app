const fs = require('fs');
const content = import { NextRequest, NextResponse } from "next/server";
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
}

const PROMPTS = {
  declaration: \You are a legal document assistant helping a pro se litigant prepare a declaration for family court.

CRITICAL RULES:
1. USE THE EXACT DATES PROVIDED - never change or generalize dates
2. QUOTE MESSAGES EXACTLY as provided - put them in quotation marks
3. ASSIGN EXHIBIT NUMBERS sequentially (Exhibit A-1, A-2, etc.)
4. STATE FACTS ONLY - do not interpret or add emotional language
5. Let the facts speak for themselves - judges draw their own conclusions

STRUCTURE:
- Proper court heading with case info if provided
- "I, [name], declare under penalty of perjury that the following is true and correct:"
- Numbered paragraphs, one incident per paragraph
- Each paragraph should include:
  * The exact date and time if available
  * What communication platform was used (text, email, etc.)
  * The EXACT quote from the message
  * Reference to exhibit number
  * Brief factual context (what prompted the message) if known
- Signature block at end

EXAMPLE FORMAT:
"5. On July 15, 2024, at approximately 3:42 PM, Respondent sent me the following text message:

'You're such a terrible mother, no wonder he doesn't want to be around you.'

This message was sent after I requested the return of our child's medication. (See Exhibit A-5)"

DO NOT:
- Use phrases like "hostile environment," "harmful behavior," "detrimental"
- Interpret the co-parent's motives
- Add emotional characterizations
- Change or summarize the actual quotes
- Use the same date for different incidents unless they actually occurred on the same date\,

  timeline: \You are creating a chronological evidence timeline for family court.

CRITICAL RULES:
1. USE EXACT DATES as provided - never change them
2. QUOTE MESSAGES EXACTLY in quotation marks
3. List in chronological order (oldest to newest)
4. Assign exhibit numbers sequentially
5. Keep descriptions factual and brief

FORMAT:
Date | Exhibit # | Type | Exact Quote or Description

EXAMPLE:
July 10, 2024 | A-1 | Text Message | "Just dropped at Tumbleweed"
July 11, 2024 | A-2 | Text Message | "I didn't check until then and it was scheduled until 8:15"
July 15, 2024 | A-3 | Text Message | "You're such a terrible mother"

Include a summary section at the end noting:
- Total number of documented incidents
- Date range covered
- Most frequent pattern types observed\,

  pattern_summary: \You are creating a pattern analysis document for family court.

CRITICAL RULES:
1. Group incidents by pattern type
2. USE EXACT DATES for each example
3. QUOTE MESSAGES EXACTLY
4. Count occurrences of each pattern
5. Show escalation over time if present

FORMAT:
For each pattern type:
1. Pattern name and total count
2. Date range when pattern occurred
3. 2-3 specific examples with exact quotes and dates
4. Brief factual description of the pattern

DO NOT interpret motives or add emotional language. Let the quotes speak for themselves.\,

  exhibit_list: \You are creating a formal exhibit list for family court submission.

CRITICAL RULES:
1. Number exhibits sequentially (A-1, A-2, etc.)
2. USE EXACT DATES as provided
3. Include brief description and first line of quote
4. Note the communication type

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
Prepared by: [name if provided]
Date Prepared: [current date]\
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

    // Sort incidents by date (oldest first)
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
      
      let exactMessage = "";
      if (inc.messages_json && inc.messages_json.length > 0) {
        exactMessage = inc.messages_json.map((msg) => {
          const msgTime = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          }) : "";
          return \[\\]: "\"\;
        }).join("\\n");
      } else if (inc.coparent_message) {
        exactMessage = \"\"\;
      }
      
      return \INCIDENT \ (Exhibit A-\):
EXACT DATE: \
Category: \
Severity: \
Patterns: \

EXACT MESSAGE:
\\;
    }).join("\\n\\n===\\n\\n");

    const yourRole = caseContext.userRole || "respondent";
    const yourTitle = yourRole === "petitioner" ? "Petitioner" : "Respondent";
    const otherTitle = yourRole === "petitioner" ? "Respondent" : "Petitioner";
    
    const contextInfo = \CASE INFORMATION:
Court: \
Case Number: \
\ (You): \
\: \
Your Role: \
Purpose: \

Total Incidents: \
Date Range: \ to \\;

    const userMessage = \Generate a \ using EXACT information below.

IMPORTANT: Use EXACT DATES and EXACT QUOTES. Do not change anything.

\

===

INCIDENTS:

\

===

Generate the complete document now.\;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt
    });

    const document = response.content[0].type === "text" 
      ? response.content[0].text 
      : "Error generating document";

    return NextResponse.json({ success: true, document, docType, incidentCount: incidents.length });

  } catch (error) {
    console.error("Document generation error:", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
};

fs.writeFileSync('src/app/api/generate-document/route.ts', content, 'utf8');
console.log('Updated generate-document route!');
