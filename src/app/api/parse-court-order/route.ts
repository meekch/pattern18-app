import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXTRACTION_PROMPT = `You are a legal document analyst. Extract key information from this court order/custody document.

Return a JSON object with these fields (use null if not found):

{
  "case_number": "The case/docket number",
  "court_name": "Full name of the court",
  "county": "County name",
  "state": "State name",
  "judge_name": "Judge's name if mentioned",
  "petitioner_name": "Petitioner's full name",
  "respondent_name": "Respondent's full name",
  "document_type": "Type of document (e.g., 'Custody Order', 'Parenting Plan', 'Modification Order', 'Temporary Order')",
  "filing_date": "Date filed (YYYY-MM-DD format)",
  "effective_date": "When order takes effect (YYYY-MM-DD format)",
  "key_dates": [
    {"date": "YYYY-MM-DD", "description": "What happens on this date"}
  ],
  "custody_arrangement": "Brief summary of custody terms if present",
  "parenting_time": "Brief summary of visitation schedule if present",
  "key_provisions": ["List of important provisions or requirements"],
  "summary": "2-3 sentence summary of what this document is and its main purpose"
}

Be precise with names and dates. If something is unclear or not present, use null.
Only return the JSON object, no other text.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Convert file to base64 for Claude
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Send to Claude for extraction (using PDF support)
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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

    // Parse Claude's response
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    let extractedData;
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      return NextResponse.json({ 
        error: 'Failed to parse document. Please try again or upload a clearer scan.' 
      }, { status: 422 });
    }

    // Upload PDF to Supabase Storage
    const fileName = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const { error: uploadError } = await supabase.storage
      .from('court-documents')
      .upload(fileName, Buffer.from(bytes), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue without storage - still save the extracted data
    }

    // Save to court_documents table
    const documentRecord = {
      user_id: userId,
      title: extractedData.document_type || file.name.replace('.pdf', ''),
      type: extractedData.document_type || 'Court Order',
      case_number: extractedData.case_number,
      court_name: extractedData.court_name,
      county: extractedData.county,
      state: extractedData.state,
      judge_name: extractedData.judge_name,
      petitioner_name: extractedData.petitioner_name,
      respondent_name: extractedData.respondent_name,
      filing_date: extractedData.filing_date,
      effective_date: extractedData.effective_date,
      key_dates: extractedData.key_dates,
      custody_arrangement: extractedData.custody_arrangement,
      parenting_time: extractedData.parenting_time,
      key_provisions: extractedData.key_provisions,
      summary: extractedData.summary,
      file_path: uploadError ? null : fileName,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    };

    const { data: savedDoc, error: dbError } = await supabase
      .from('court_documents')
      .insert(documentRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save document. Please try again.' 
      }, { status: 500 });
    }

    // Also update case_context if we extracted useful info
    if (extractedData.case_number || extractedData.petitioner_name || extractedData.respondent_name) {
      const { data: existingContext } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', userId)
        .single();

      const updates: Record<string, any> = {};
      
      // Only update if field is empty in existing context
      if (!existingContext?.case_number && extractedData.case_number) {
        updates.case_number = extractedData.case_number;
      }
      if (!existingContext?.court && extractedData.court_name) {
        updates.court = extractedData.court_name;
      }
      if (!existingContext?.county && extractedData.county) {
        updates.county = extractedData.county;
      }
      if (!existingContext?.state && extractedData.state) {
        updates.state = extractedData.state;
      }
      if (!existingContext?.petitioner_name && extractedData.petitioner_name) {
        updates.petitioner_name = extractedData.petitioner_name;
      }
      if (!existingContext?.respondent_name && extractedData.respondent_name) {
        updates.respondent_name = extractedData.respondent_name;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        
        await supabase
          .from('case_context')
          .upsert({ 
            user_id: userId, 
            ...updates 
          }, { onConflict: 'user_id' });
      }
    }

    return NextResponse.json({
      success: true,
      document: savedDoc,
      extracted: extractedData,
      caseContextUpdated: true,
    });

  } catch (error) {
    console.error('Parse court order error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}