const fs = require('fs');
let c = fs.readFileSync('src/app/court-docs/page.tsx', 'utf8');

// Find and replace the loadIncidents function
const oldPattern = /const loadIncidents = async \(\) => \{\s*try \{\s*const \{ data: \{ session \} \} = await supabase\.auth\.getSession\(\);\s*if \(!session\) \{\s*router\.push\("\/login"\);\s*return;\s*\}\s*const \{ data, error \} = await supabase/;

const newCode = \const loadIncidents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Load case context from database
      const { data: caseData } = await supabase
        .from("case_context")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (caseData) {
        setCaseContext({
          caseNumber: caseData.case_number || "",
          courtName: caseData.court ? \\\\\\\\\\\\\\\ : "",
          petitionerName: caseData.petitioner_name || "",
          respondentName: caseData.respondent_name || caseData.coparent_name || "",
          filingPurpose: "",
          userRole: caseData.user_role || "respondent"
        });
      }

      const { data, error } = await supabase\;

c = c.replace(oldPattern, newCode);
fs.writeFileSync('src/app/court-docs/page.tsx', c, 'utf8');
console.log('Updated!');
