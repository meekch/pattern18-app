import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const HOLIDAYS = [
  { name: 'christmas', month: 12, days: [23, 24, 25, 26, 27] },
  { name: 'thanksgiving', month: 11, days: [21, 22, 23, 24, 25, 26, 27, 28] },
  { name: 'easter', month: 4, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { name: 'july4', month: 7, days: [2, 3, 4, 5, 6] },
  { name: 'newyear', month: 1, days: [1, 2, 3] },
  { name: 'memorial_day', month: 5, days: [25, 26, 27, 28, 29, 30, 31] },
  { name: 'labor_day', month: 9, days: [1, 2, 3, 4, 5, 6, 7] },
];

function getEventCluster(date: Date): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  for (const holiday of HOLIDAYS) {
    if (month === holiday.month && holiday.days.includes(day)) {
      return `${holiday.name}_${year}`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string || 'other';
    const providedDate = formData.get('dateOfContent') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const client = new Anthropic();
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    let content: any[] = [];
    let systemPrompt = '';

    // Build prompt based on file type
    if (file.type.startsWith('image/')) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.type,
          data: base64,
        },
      });
    } else if (file.type === 'application/pdf') {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      });
    }

    // Different prompts based on file type
    if (fileType === 'message') {
      systemPrompt = `You are analyzing a screenshot or image of text messages for a family court case.

Extract the following and respond in JSON only:
{
  "messages": [
    {
      "sender": "coparent" or "user" or "unknown",
      "text": "exact quote",
      "timestamp": "ISO date if visible, null if not"
    }
  ],
  "primaryQuote": "the most significant/concerning message from the co-parent, exact text",
  "messageDate": "ISO date of the messages if visible",
  "isFlagged": true/false,
  "flagReason": "one sentence explaining why flagged, in plain language" or null
}

Flag as true if ANY message contains:
- Threats (direct or veiled)
- Name-calling or degrading language
- Involving children inappropriately
- Financial manipulation or pressure
- Monitoring behavior ("I saw you...", "I know you...")
- Attempts to control
- Ultimatums or "I promise" threats

For flagReason, use plain language like:
- "Contains a threat involving the child"
- "Uses degrading language"
- "Monitors your location or activities"
Do NOT use clinical terms like "gaslighting" or "DARVO".

If you cannot determine who sent a message, mark sender as "unknown".
Respond with ONLY valid JSON, no other text.`;

    } else if (fileType === 'court_doc') {
      systemPrompt = `You are analyzing a court document for a family court case.

Extract the following and respond in JSON only:
{
  "documentType": "motion", "order", "petition", "response", "declaration", "other",
  "caseNumber": "extracted case number or null",
  "courtName": "court name or null",
  "filingDate": "ISO date or null",
  "petitionerName": "name or null",
  "respondentName": "name or null",
  "filedBy": "petitioner" or "respondent" or "unknown",
  "deadlines": [
    {"description": "what's due", "date": "ISO date"}
  ],
  "keyRequirements": ["list of important requirements or orders"],
  "summary": "2-3 sentence summary of what this document is and what it means"
}

Respond with ONLY valid JSON, no other text.`;

    } else if (fileType === 'finance') {
      systemPrompt = `You are analyzing a financial document for a family court case.

Extract the following and respond in JSON only:
{
  "documentType": "bank_statement", "pay_stub", "tax_return", "receipt", "other",
  "dateRange": {"start": "ISO date", "end": "ISO date"} or null,
  "totalIncome": number or null,
  "supportPayments": [
    {"date": "ISO date", "amount": number, "description": "text"}
  ],
  "missedPayments": ["list of dates where expected support was missing"],
  "flaggedTransactions": [
    {"date": "ISO date", "amount": number, "description": "why flagged"}
  ],
  "summary": "1-2 sentence summary"
}

Flag transactions that might be relevant to a custody/support case.
Respond with ONLY valid JSON, no other text.`;

    } else {
      systemPrompt = `You are analyzing a document for a family court case.

Extract the following and respond in JSON only:
{
  "documentType": "description of what this is",
  "date": "ISO date if identifiable",
  "summary": "2-3 sentence summary of the content",
  "relevantQuotes": ["any quotes that might be relevant to a custody case"],
  "isFlagged": true/false,
  "flagReason": "reason if flagged"
}

Respond with ONLY valid JSON, no other text.`;
    }

    content.push({
      type: 'text',
      text: 'Analyze this document and extract the requested information.',
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    });

    // Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    let parsed: any = {};
    try {
      // Clean up response - remove any markdown code blocks
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText);
      parsed = {};
    }

    // Build result based on file type
    let result: any = {
      extractedText: responseText,
      parsedData: parsed,
    };

    if (fileType === 'message') {
      result.quoteText = parsed.primaryQuote || (parsed.messages?.[0]?.text);
      result.sender = parsed.messages?.[0]?.sender || 'unknown';
      result.messageDate = parsed.messageDate || providedDate || null;
      result.isFlagged = parsed.isFlagged || false;
      result.flagReason = parsed.flagReason || null;
      
      // Determine event cluster
      if (result.messageDate) {
        const date = new Date(result.messageDate);
        result.eventCluster = getEventCluster(date);
      }
    } else if (fileType === 'court_doc') {
      result.dateOfContent = parsed.filingDate || providedDate || null;
      // Court docs aren't flagged the same way
      result.isFlagged = false;
    } else if (fileType === 'finance') {
      result.dateOfContent = parsed.dateRange?.start || providedDate || null;
      result.isFlagged = (parsed.missedPayments?.length > 0) || (parsed.flaggedTransactions?.length > 0);
      result.flagReason = parsed.missedPayments?.length > 0 
        ? `${parsed.missedPayments.length} missed support payment(s)` 
        : null;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Parse file error:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}