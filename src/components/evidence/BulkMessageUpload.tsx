import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const EXTRACTION_PROMPT = `Extract all text messages from this PDF document. This appears to be an export of text messages or chat history.

Return the content as plain text, preserving:
- Sender names/identifiers
- Timestamps if present
- The message content
- The order of messages

Format each message on its own line like:
[Timestamp if available] Sender: Message content

If this doesn't appear to be a message export, just extract all the text content as-is.

Return ONLY the extracted text, no commentary.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Use Claude to extract text from PDF
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const extractedText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be scanned or image-based. Try a CSV export instead.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      pages: 1, // Claude doesn't return page count
      info: { extractedBy: 'claude' }
    });

  } catch (error: any) {
    console.error('PDF extraction error:', error);
    
    // Check for specific Claude errors
    if (error.message?.includes('Could not process')) {
      return NextResponse.json(
        { error: 'This PDF cannot be read. It may be password-protected or corrupted. Try a CSV export instead.' },
        { status: 422 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to extract text from PDF. Please try a CSV export instead.' },
      { status: 500 }
    );
  }
}