const fs = require('fs');
let c = fs.readFileSync('src/app/case-setup/page.tsx', 'utf8');

// Add new state variables after nextCourtDate
c = c.replace(
  "const [nextCourtDate, setNextCourtDate] = useState('');",
  "const [nextCourtDate, setNextCourtDate] = useState('');\n  const [caseNumber, setCaseNumber] = useState('');\n  const [courtName, setCourtName] = useState('');\n  const [county, setCounty] = useState('');\n  const [stateName, setStateName] = useState('');\n  const [petitionerName, setPetitionerName] = useState('');\n  const [respondentName, setRespondentName] = useState('');"
);

fs.writeFileSync('src/app/case-setup/page.tsx', c, 'utf8');
console.log('Added state variables!');
