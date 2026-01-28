import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string || '';
    const historyJson = formData.get('history') as string || '[]';
    const caseContextJson = formData.get('caseContext') as string || '{}';
    const evidenceCount = formData.get('evidenceCount') as string || '0';
    const fileCount = parseInt(formData.get('fileCount') as string || '0');
    
    // Collect all files
    const files: File[] = [];
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file${i}`) as File | null;
      if (file) files.push(file);
    }
    
    // Also check for single file (backward compatibility)
    const singleFile = formData.get('file') as File | null;
    if (singleFile && files.length === 0) {
      files.push(singleFile);
    }

    const history = JSON.parse(historyJson);
    const caseContext = JSON.parse(caseContextJson);

    // Build system prompt - human, supportive, strategic
    let systemPrompt = `You are a supportive coach helping someone navigate a difficult co-parenting situation. They're sharing messages and situations with you in real-time.

Your role:
1. REGULATE - Help them not react emotionally. They came to you before responding. That's good.
2. TRANSLATE - Explain what's really happening in the message. Be direct but kind.
3. PROTECT - Give them response options that won't hurt their case in court.

Your style:
- Warm but direct. Like a smart friend who's also a family law paralegal.
- Start with acknowledgment: "I see what's happening here..." or "Okay, let's break this down..."
- Be confident. They need someone steady right now.
- Use "they" for the co-parent unless told otherwise.
- Short paragraphs. Easy to read at 2am when you're shaking.

When they share a message/screenshot:
1. First, acknowledge how it might feel to receive this
2. Explain what's actually going on (manipulation tactics, if any)
3. Give 2-3 response options:
   - **Option 1 (Minimal):** One sentence or less
   - **Option 2 (Boundary):** Sets a clear limit
   - **Option 3 (No response):** When silence is the best answer
4. Remind them: "You don't have to respond right now. Take your time."

IMPORTANT: 
- If you see a screenshot, ask who sent it if it's not clear
- Never tell them what they "should" feel
- Don't use clinical terms like "gaslighting" or "DARVO" unless they do first
- Instead say things like "they're trying to make you doubt yourself" or "notice how they flipped it to be your fault"
- Everything they share with you is being saved to their case file automatically

For court documents: Be specific and actionable. Tell them exactly what to do next.`;

    // Add case context
    if (caseContext.coparent_name) {
      systemPrompt += `\n\nThey call their co-parent: "${caseContext.coparent_name}"`;
    }
    if (caseContext.user_role) {
      const role = caseContext.user_role === 'petitioner' ? 'Petitioner' : 'Respondent';
      systemPrompt += `\nThey are the ${role} in their case.`;
    }
    if (caseContext.state) {
      systemPrompt += `\nThey're in ${caseContext.state}.`;
    }
    if (parseInt(evidenceCount) > 0) {
      systemPrompt += `\nThey've documented ${evidenceCount} incidents so far.`;
    }

    // Build messages array
    const messages: any[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Handle file uploads
    let userContent: any[] = [];
    
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      
      if (file.type === 'application/pdf') {
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        });
      } else if (file.type.startsWith('image/')) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: base64,
          },
        });
      }
    }

    // Add text message
    userContent.push({
      type: 'text',
      text: message || (files.length > 0 ? 'Please look at this and help me understand what to do.' : ''),
    });

    messages.push({
      role: 'user',
      content: userContent,
    });

    // Call Claude
    const client = new Anthropic();
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: systemPrompt,
            messages: messages,
            stream: true,
          });

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}