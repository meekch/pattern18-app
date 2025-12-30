const fs = require('fs');
let c = fs.readFileSync('src/app/case-setup/page.tsx', 'utf8');

// Add showManualEntry state if not already there
if (!c.includes('showManualEntry')) {
  c = c.replace(
    'const [respondentName, setRespondentName] = useState',
    'const [showManualEntry, setShowManualEntry] = useState(false);\n  const [respondentName, setRespondentName] = useState'
  );
}

// Replace the empty state section
const oldSection = `{!extractedData.caseNumber && !extractedData.courtName && (
            <div className="card empty">
              <div className="empty-icon">📄</div>
              <h3>No Court Orders Uploaded Yet</h3>
              <p>Upload a court order and we'll automatically extract your case details.</p>
              <button onClick={() => router.push('/evidence/upload')} className="upload-btn">
                Upload Court Order
              </button>
            </div>
          )}`;

const newSection = `{!extractedData.caseNumber && !extractedData.courtName && (
            <div className="card case-details">
              <h2>📋 Case Details</h2>
              {!showManualEntry ? (
                <div className="empty-state">
                  <p>Add your case information for accurate court documents</p>
                  <div className="action-buttons">
                    <button onClick={() => router.push('/evidence/upload')} className="upload-btn">
                      Upload Court Order
                    </button>
                    <button onClick={() => setShowManualEntry(true)} className="manual-btn">
                      Enter Manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="manual-entry">
                  <div className="field">
                    <label>Case Number</label>
                    <input type="text" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="e.g., FC2024-001234" />
                  </div>
                  <div className="field">
                    <label>Court Name</label>
                    <input type="text" value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder="e.g., Superior Court" />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>County</label>
                      <input type="text" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="e.g., Maricopa" />
                    </div>
                    <div className="field">
                      <label>State</label>
                      <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g., Arizona" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Petitioner Name</label>
                    <p className="field-help">The person who filed the original petition</p>
                    <input type="text" value={petitionerName} onChange={(e) => setPetitionerName(e.target.value)} placeholder="Full legal name" />
                  </div>
                  <div className="field">
                    <label>Respondent Name</label>
                    <p className="field-help">The other party in the case</p>
                    <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Full legal name" />
                  </div>
                </div>
              )}
            </div>
          )}`;

// Try to replace - handle different emoji encodings
if (c.includes('No Court Orders Uploaded Yet')) {
  // Find and replace the whole block
  c = c.replace(/\{!extractedData\.caseNumber && !extractedData\.courtName && \(\s*<div className="card empty">[\s\S]*?<\/div>\s*\)\}/m, newSection);
}

fs.writeFileSync('src/app/case-setup/page.tsx', c, 'utf8');
console.log('Updated case-setup page!');