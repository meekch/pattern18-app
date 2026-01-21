import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  tag?: string;
  data: string; // base64 data URL
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Pattern 18's Court Document Specialist. You help survivors of coercive control prepare professional court documents.

## YOUR CAPABILITIES
1. Parse uploaded court orders, parenting plans, and legal documents to extract:
   - Case numbers, court names, judge names
   - Deadlines and hearing dates
   - Parenting time rules and schedules
   - Key provisions and requirements

2. Generate court-ready documents including:
   - Resolution Statements
   - Affidavits of Service
   - Declarations
   - Motions and Responses
   - Exhibit packets

3. Help users understand what documents they need and when

## CRITICAL RULES

### Document Accuracy
- Use EXACT information from uploaded documents
- Never fabricate case numbers, dates, or names
- Ask for clarification if information is missing

### Legal Formatting
- Use proper court document formatting
- Include case captions with correct party names
- Number paragraphs in declarations
- Include signature blocks and certificates of service

### File References
- When user uploads files, acknowledge what you received
- Reference files by their tag (e.g., "Exhibit A") when the user tags them
- Describe what you see in uploaded images/screenshots

### Tone
- Professional but supportive
- Direct and efficient
- Never dramatic or emotional in documents
- Facts only in legal documents

## WORKFLOW

1. UNDERSTAND: What document does the user need? For what hearing/deadline?

2. GATHER: What information do you have? What's missing?
   - Case info (from uploads or user input)
   - Evidence/exhibits (from uploads)
   - Deadlines and hearing dates
   - Party names and roles

3. DRAFT: Generate the document with:
   - Proper legal formatting
   - Correct case caption
   - All required sections
   - Signature blocks

4. ITERATE: User may request changes. Make them precisely.

5. FINALIZE: When user is satisfied, provide clear next steps for filing.

## WHEN GENERATING DOCUMENTS

Start with:
"I'll create [document type] for you. Based on what I have:
- Case: [case number if known]
- Court: [court if known]
- Hearing: [date if known]
- Your role: [Petitioner/Respondent if known]

Here's the draft:

---
[FULL DOCUMENT TEXT]
---

Let me know if you'd like any changes."

## COMMON DOCUMENTS

### Resolution Statement (Rule 76)
- Background section
- Issues in dispute
- Proposed orders (numbered)
- Agreements reached
- Certificate of service

### Affidavit of Service
- When and how service was completed
- Each method listed with date
- Declaration under penalty of perjury
- Exhibits showing proof (screenshots, receipts)

### Declaration
- Numbered paragraphs
- "I declare under penalty of perjury"
- Facts only, no opinions
- Reference exhibits by number

Remember: You're helping someone who is likely stressed and may be dealing with an abusive co-parent. Be efficient, accurate, and supportive.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, caseContext, files, uploadedFiles } = body as {
      message: string;
      history: Message[];
      caseContext: any;
      files: any[];
      uploadedFiles: UploadedFile[];
    };

    // Build context about uploaded files
    let filesContext = '';
    if (uploadedFiles && uploadedFiles.length > 0) {
      filesContext = '\n\n## UPLOADED FILES\n';
      uploadedFiles.forEach((file, i) => {
        filesContext += `${i + 1}. **${file.name}**`;
        if (file.tag) filesContext += ` (Tagged: "${file.tag}")`;
        filesContext += ` - ${file.type}\n`;
      });
    }

    // Build case context
    let caseInfo = '';
    if (caseContext) {
      caseInfo = '\n\n## CASE INFORMATION\n';
      if (caseContext.case_number) caseInfo += `Case Number: ${caseContext.case_number}\n`;
      if (caseContext.court) caseInfo += `Court: ${caseContext.court}\n`;
      if (caseContext.county) caseInfo += `County: ${caseContext.county}\n`;
      if (caseContext.state) caseInfo += `State: ${caseContext.state}\n`;
      if (caseContext.user_role) {
        caseInfo += `User's Role: ${caseContext.user_role === 'petitioner' ? 'Petitioner' : 'Respondent'}\n`;
      }
      if (caseContext.petitioner_name) caseInfo += `Petitioner: ${caseContext.petitioner_name}\n`;
      if (caseContext.respondent_name) caseInfo += `Respondent: ${caseContext.respondent_name}\n`;
      if (caseContext.coparent_name) caseInfo += `Co-parent referred to as: ${caseContext.coparent_name}\n`;
      if (caseContext.next_court_date) caseInfo += `Next Court Date: ${caseContext.next_court_date}\n`;
    }

    // Build messages array for Claude
    const claudeMessages: any[] = [];

    // Add history
    for (const msg of history) {
      claudeMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Build current message with any images
    const currentContent: any[] = [];

    // Add images from uploaded files
    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        if (file.type.startsWith('image/') && file.data) {
          // Extract base64 data from data URL
          const base64Match = file.data.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const mediaType = base64Match[1];
            const base64Data = base64Match[2];
            
            currentContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            });
            
            // Add context about this image
            currentContent.push({
              type: 'text',
              text: `[Above image is: ${file.name}${file.tag ? ` (Tagged: "${file.tag}")` : ''}]`
            });
          }
        }
      }
    }

    // Add the user's message with context
    currentContent.push({
      type: 'text',
      text: message + caseInfo + filesContext
    });

    claudeMessages.push({
      role: 'user',
      content: currentContent
    });

    // Call Claude
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    // Extract response text
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Check if we should generate a document file
    // (For now, we'll return the text and let the frontend handle generation)
    // In a future version, we could generate actual .docx files here

    return NextResponse.json({
      response: responseText,
      generatedDocument: null, // Will implement document generation
      documentName: null
    });

  } catch (error) {
    console.error('Court Prep API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}