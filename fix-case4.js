const fs = require('fs');
let c = fs.readFileSync('src/app/court-docs/page.tsx', 'utf8');

const oldCode = \const { data, error } = await supabase
        .from("incidents")\;

const newCode = \// Load case context
      const { data: caseData } = await supabase
        .from("case_context")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (caseData) {
        const courtFull = [caseData.court, caseData.county ? caseData.county + " County" : "", caseData.state].filter(Boolean).join(", ");
        setCaseContext({
          caseNumber: caseData.case_number || "",
          courtName: courtFull || "",
          petitionerName: caseData.petitioner_name || "",
          respondentName: caseData.respondent_name || caseData.coparent_name || "",
          filingPurpose: "",
          userRole: caseData.user_role || "respondent"
        });
      }

      const { data, error } = await supabase
        .from("incidents")\;

c = c.replace(oldCode, newCode);
fs.writeFileSync('src/app/court-docs/page.tsx', c, 'utf8');
console.log('Done!');
