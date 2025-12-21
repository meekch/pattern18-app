import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    
    let fileContent: any;
    
    if (isPdf) {
      fileContent = {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      };
    } else {
      // Assume image
      let mediaType = file.type;
      if (!mediaType.startsWith("image/")) {
        const ext = fileName.split(".").pop();
        if (ext === "jpg" || ext === "jpeg") mediaType = "image/jpeg";
        else if (ext === "png") mediaType = "image/png";
        else mediaType = "image/jpeg";
      }
      
      fileContent = {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      };
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            fileContent,
            {
              type: "text",
              text: `You are a legal document analyzer helping a family court litigant understand their court documents.

Analyze this court document and extract the following in JSON format:

{
  "title": "The title/name of this document (e.g., 'Order to Appear', 'Motion to Modify Parenting Time')",
  "type": "order" | "motion" | "response" | "declaration" | "other",
  "date_filed": "YYYY-MM-DD if visible, or null",
  "summary": "2-3 sentence plain English summary of what this document says/means",
  "deadlines": [
    {
      "id": "unique_id",
      "description": "What needs to happen",
      "date": "YYYY-MM-DD",
      "type": "response" | "hearing" | "filing" | "service" | "other"
    }
  ],
  "tasks": [
    {
      "id": "unique_id",
      "description": "Specific action item the person needs to take",
      "due_date": "YYYY-MM-DD if applicable, or null",
      "completed": false,
      "resources": ["optional helpful resources or suggestions"]
    }
  ],
  "resources": [
    {
      "name": "Resource name",
      "description": "Why this might be helpful"
    }
  ],
  "key_requirements": ["List of important requirements or conditions mentioned"],
  "warnings": ["Any critical warnings or things to be careful about"]
}

Important guidelines:
- Calculate actual dates based on today's date and any "within X days" requirements
- Today's date is ${new Date().toISOString().split('T')[0]}
- Be specific about action items - don't be vague
- For deadlines, count calendar days unless the document specifies business days
- Include practical resources like "process servers", "court clerk office", "self-help center" where relevant
- If this is an Order to Appear or similar, include tasks for: getting the other party served, preparing a response, gathering evidence, etc.
- Generate unique IDs for each task and deadline (use format like "task_1", "deadline_1")
- Keep the summary in plain, accessible language - avoid legal jargon

Respond with ONLY the JSON object, no other text.`
            }
          ]
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }

    try {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Return a basic structure if parsing fails
      return NextResponse.json({
        title: "Court Document",
        type: "other",
        summary: "Document uploaded successfully. Please review and add details manually.",
        deadlines: [],
        tasks: [],
        resources: [],
      });
    }

    return NextResponse.json({
      title: "Court Document",
      type: "other", 
      summary: "Document uploaded successfully.",
      deadlines: [],
      tasks: [],
    });

  } catch (error) {
    console.error("Order analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}