const fs = require('fs');
let c = fs.readFileSync('src/app/case-setup/page.tsx', 'utf8');

// 1. Add state variables after nextCourtDate
const oldState = "const [nextCourtDate, setNextCourtDate] = useState('');";
const newState = const [nextCourtDate, setNextCourtDate] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [county, setCounty] = useState('');
  const [stateName, setStateName] = useState('');
  const [petitionerName, setPetitionerName] = useState('');
  const [respondentName, setRespondentName] = useState('');;

c = c.replace(oldState, newState);

// 2. Load these values from database
const oldLoad = "setNextCourtDate(caseData.next_court_date || '');";
const newLoad = setNextCourtDate(caseData.next_court_date || '');
          setCaseNumber(caseData.case_number || '');
          setCourtName(caseData.court || '');
          setCounty(caseData.county || '');
          setStateName(caseData.state || '');
          setPetitionerName(caseData.petitioner_name || '');
          setRespondentName(caseData.respondent_name || '');;

c = c.replace(oldLoad, newLoad);

// 3. Update save to include these fields
const oldSave = wait supabase.from('case_context').upsert({
          user_id: user.id,
          user_role: userRole,
          coparent_name: coparentName || null,
          next_court_date: nextCourtDate || null,
          updated_at: new Date().toISOString(),;

const newSave = wait supabase.from('case_context').upsert({
          user_id: user.id,
          user_role: userRole,
          coparent_name: coparentName || null,
          next_court_date: nextCourtDate || null,
          case_number: caseNumber || null,
          court: courtName || null,
          county: county || null,
          state: stateName || null,
          petitioner_name: petitionerName || null,
          respondent_name: respondentName || null,
          updated_at: new Date().toISOString(),;

c = c.replace(oldSave, newSave);

fs.writeFileSync('src/app/case-setup/page.tsx', c, 'utf8');
console.log('Step 1 done - state and save updated!');
