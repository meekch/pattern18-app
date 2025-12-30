const fs = require('fs');
let c = fs.readFileSync('src/app/court-docs/page.tsx', 'utf8');

// Find the loadIncidents function and add case context loading
const oldLoad = const loadIncidents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("user_id", session.user.id)
        .order("incident_date", { ascending: false });

      if (error) throw error;
      setIncidents(data || []);;

const newLoad = const loadIncidents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Load case context
      const { data: caseData } = await supabase
        .from("case_context")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (caseData) {
        setCaseContext({
          caseNumber: caseData.case_number || "",
          courtName: caseData.court || "",
          petitionerName: caseData.user_role === "petitioner" ? caseData.user_name : caseData.coparent_name || "",
          respondentName: caseData.user_role === "petitioner" ? caseData.coparent_name : caseData.user_name || "",
          filingPurpose: "",
          userRole: caseData.user_role || "respondent"
        });
      }

      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("user_id", session.user.id)
        .order("incident_date", { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
      console.log('Incidents data:', data?.[0]);;

c = c.replace(oldLoad, newLoad);
fs.writeFileSync('src/app/court-docs/page.tsx', c, 'utf8');
console.log('Added case context loading!');
