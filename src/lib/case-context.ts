// src/lib/case-context.ts
// Loads all relevant case data for AI context

import { supabase } from "./supabase";

export interface CaseContext {
  // Basic case info
  caseNumber: string;
  county: string;
  state: string;
  userRole: "petitioner" | "respondent";
  userName: string;
  otherPartyName: string;
  children: {
    name: string;
    dob?: string;
    age?: number;
  }[];

  // Court orders and their provisions
  courtOrders: {
    id: string;
    title: string;
    date: string;
    provisions: string[];
    rawText?: string;
  }[];

  // Key provisions extracted
  keyProvisions: {
    custody: string | null;
    parentingSchedule: string | null;
    childSupport: string | null;
    communication: string | null;
    decisionMaking: string | null;
    exchanges: string | null;
    holidays: string | null;
    other: string[];
  };

  // Recent incidents
  recentIncidents: {
    id: string;
    date: string;
    type: string;
    description: string;
    patterns: string[];
  }[];

  // Recent communications
  recentCommunications: {
    id: string;
    date: string;
    direction: string;
    summary: string;
    patterns: string[];
  }[];

  // Prior violations (if any documented)
  priorViolations: {
    date: string;
    type: string;
    description: string;
    outcome?: string;
  }[];
}

export async function loadCaseContext(caseId?: string): Promise<CaseContext | null> {
  try {
    // Load case
    let caseQuery = supabase
      .from("user_cases")
      .select("*")
      .eq("is_active", true);

    if (caseId) {
      caseQuery = caseQuery.eq("id", caseId);
    }

    const { data: caseData, error: caseError } = await caseQuery.limit(1).single();

    if (!caseData || caseError) return null;

    // Load children
    const { data: childrenData } = await supabase
      .from("case_children")
      .select("*")
      .eq("case_id", caseData.id);

    // Load court orders/documents
    const { data: ordersData } = await supabase
      .from("court_documents")
      .select("*")
      .eq("case_id", caseData.id)
      .in("document_type", ["order", "decree", "judgment", "stipulation"])
      .order("filing_date", { ascending: false });

    // Load order provisions
    const { data: provisionsData } = await supabase
      .from("order_provisions")
      .select("*")
      .eq("case_id", caseData.id);

    // Load recent incidents (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: incidentsData } = await supabase
      .from("incidents")
      .select("*")
      .eq("case_id", caseData.id)
      .gte("incident_date", ninetyDaysAgo.toISOString())
      .order("incident_date", { ascending: false })
      .limit(20);

    // Load recent communications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: commsData } = await supabase
      .from("communications")
      .select("*")
      .eq("case_id", caseData.id)
      .gte("date", thirtyDaysAgo.toISOString())
      .order("date", { ascending: false })
      .limit(30);

    // Load documented violations
    const { data: violationsData } = await supabase
      .from("violations")
      .select("*")
      .eq("case_id", caseData.id)
      .order("violation_date", { ascending: false });

    // Build context object
    const userName = caseData.user_role === "petitioner" 
      ? caseData.petitioner_name 
      : caseData.respondent_name;
    
    const otherPartyName = caseData.user_role === "petitioner"
      ? caseData.respondent_name
      : caseData.petitioner_name;

    // Calculate children ages
    const children = (childrenData || []).map((c) => {
      let age: number | undefined;
      if (c.child_dob) {
        const dob = new Date(c.child_dob);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
      }
      return {
        name: c.child_name,
        dob: c.child_dob,
        age,
      };
    });

    // Extract key provisions by category
    const keyProvisions = {
      custody: null as string | null,
      parentingSchedule: null as string | null,
      childSupport: null as string | null,
      communication: null as string | null,
      decisionMaking: null as string | null,
      exchanges: null as string | null,
      holidays: null as string | null,
      other: [] as string[],
    };

    (provisionsData || []).forEach((p) => {
      const category = p.category?.toLowerCase() || "";
      const text = p.provision_text;

      if (category.includes("custody") || category.includes("legal decision")) {
        keyProvisions.custody = text;
      } else if (category.includes("schedule") || category.includes("parenting time")) {
        keyProvisions.parentingSchedule = text;
      } else if (category.includes("support") || category.includes("financial")) {
        keyProvisions.childSupport = text;
      } else if (category.includes("communication")) {
        keyProvisions.communication = text;
      } else if (category.includes("decision")) {
        keyProvisions.decisionMaking = text;
      } else if (category.includes("exchange") || category.includes("pickup") || category.includes("dropoff")) {
        keyProvisions.exchanges = text;
      } else if (category.includes("holiday")) {
        keyProvisions.holidays = text;
      } else {
        keyProvisions.other.push(text);
      }
    });

    return {
      caseNumber: caseData.case_number,
      county: caseData.county,
      state: caseData.state,
      userRole: caseData.user_role || "respondent",
      userName,
      otherPartyName,
      children,
      courtOrders: (ordersData || []).map((o) => ({
        id: o.id,
        title: o.title,
        date: o.filing_date,
        provisions: o.parsed_content?.provisions || [],
        rawText: o.parsed_content?.text,
      })),
      keyProvisions,
      recentIncidents: (incidentsData || []).map((i) => ({
        id: i.id,
        date: i.incident_date,
        type: i.incident_type,
        description: i.description,
        patterns: i.patterns_detected || [],
      })),
      recentCommunications: (commsData || []).map((c) => ({
        id: c.id,
        date: c.date,
        direction: c.direction,
        summary: c.summary || c.content?.substring(0, 200),
        patterns: c.patterns_detected || [],
      })),
      priorViolations: (violationsData || []).map((v) => ({
        date: v.violation_date,
        type: v.violation_type,
        description: v.description,
        outcome: v.outcome,
      })),
    };
  } catch (error) {
    console.error("Error loading case context:", error);
    return null;
  }
}

// Format case context for AI prompt
export function formatCaseContextForAI(context: CaseContext): string {
  let prompt = `
=== CASE INFORMATION ===
Case Number: ${context.caseNumber}
Court: ${context.county} County, ${context.state}
User Role: ${context.userRole}
User Name: ${context.userName}
Other Party: ${context.otherPartyName}

=== CHILDREN ===
${context.children.map((c) => `- ${c.name}${c.age ? ` (age ${c.age})` : ""}`).join("\n") || "No children on file"}

=== CURRENT COURT ORDERS ===
${context.courtOrders.length > 0 
  ? context.courtOrders.map((o) => `- ${o.title} (${o.date})`).join("\n")
  : "No court orders uploaded yet"}

=== KEY ORDER PROVISIONS ===
${context.keyProvisions.custody ? `Custody: ${context.keyProvisions.custody}` : ""}
${context.keyProvisions.parentingSchedule ? `Parenting Schedule: ${context.keyProvisions.parentingSchedule}` : ""}
${context.keyProvisions.childSupport ? `Child Support: ${context.keyProvisions.childSupport}` : ""}
${context.keyProvisions.communication ? `Communication: ${context.keyProvisions.communication}` : ""}
${context.keyProvisions.exchanges ? `Exchanges: ${context.keyProvisions.exchanges}` : ""}
${context.keyProvisions.holidays ? `Holidays: ${context.keyProvisions.holidays}` : ""}
${context.keyProvisions.other.length > 0 ? `Other Provisions:\n${context.keyProvisions.other.map(p => `  - ${p}`).join("\n")}` : ""}

=== RECENT INCIDENTS (Last 90 Days) ===
${context.recentIncidents.length > 0
  ? context.recentIncidents.map((i) => 
      `- ${i.date}: ${i.type} - ${i.description}${i.patterns.length > 0 ? ` [Patterns: ${i.patterns.join(", ")}]` : ""}`
    ).join("\n")
  : "No recent incidents documented"}

=== PRIOR DOCUMENTED VIOLATIONS ===
${context.priorViolations.length > 0
  ? context.priorViolations.map((v) => 
      `- ${v.date}: ${v.type} - ${v.description}${v.outcome ? ` (Outcome: ${v.outcome})` : ""}`
    ).join("\n")
  : "No prior violations documented"}

=== RECENT COMMUNICATION PATTERNS ===
${context.recentCommunications.length > 0
  ? `${context.recentCommunications.length} communications in last 30 days. Patterns detected: ${
      [...new Set(context.recentCommunications.flatMap(c => c.patterns))].join(", ") || "None"
    }`
  : "No recent communications logged"}
`;

  return prompt.trim();
}