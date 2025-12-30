const fs = require('fs');
let c = fs.readFileSync('src/app/case-setup/page.tsx', 'utf8');

// Add new state variables after nextCourtDate
c = c.replace(
  "const [nextCourtDate, setNextCourtDate] = useState('');",
  const [nextCourtDate, setNextCourtDate] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [county, setCounty] = useState('');
  const [state, setState] = useState('');
  const [petitionerName, setPetitionerName] = useState('');
  const [respondentName, setRespondentName] = useState('');
);

// Update the load to populate these fields
c = c.replace(
  "setNextCourtDate(caseData.next_court_date || '');",
  setNextCourtDate(caseData.next_court_date || '');
          setCaseNumber(caseData.case_number || '');
          setCourtName(caseData.court || '');
          setCounty(caseData.county || '');
          setState(caseData.state || '');
          setPetitionerName(caseData.petitioner_name || '');
          setRespondentName(caseData.respondent_name || '');
);

// Update the save to include these fields
c = c.replace(
  wait supabase.from('case_context').upsert({
          user_id: user.id,
          user_role: userRole,
          coparent_name: coparentName || null,
          next_court_date: nextCourtDate || null,
          updated_at: new Date().toISOString(),,
  wait supabase.from('case_context').upsert({
          user_id: user.id,
          user_role: userRole,
          coparent_name: coparentName || null,
          next_court_date: nextCourtDate || null,
          case_number: caseNumber || null,
          court: courtName || null,
          county: county || null,
          state: state || null,
          petitioner_name: petitionerName || null,
          respondent_name: respondentName || null,
          updated_at: new Date().toISOString(),
);

fs.writeFileSync('src/app/case-setup/page.tsx', c, 'utf8');
console.log('Added case fields!');
