const fs = require('fs');
let c = fs.readFileSync('src/app/case-setup/page.tsx', 'utf8');

// Find the closing of the court countdown section and add new fields after it
const afterCourtDate = <span className="label">days until court</span>
                </div>
              )}
            </div>;

const newFields = <span className="label">days until court</span>
                </div>
              )}
            </div>

          {/* Case Information */}
          <div className="field">
            <label>Case Number</label>
            <p className="field-help">Found on any court document (e.g., FC2024-001234)</p>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., FC2024-001234"
            />
          </div>

          <div className="field">
            <label>Court Name</label>
            <p className="field-help">The court handling your case</p>
            <input
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="e.g., Superior Court"
            />
          </div>

          <div className="field-row" style={{display: 'flex', gap: '16px'}}>
            <div className="field" style={{flex: 1}}>
              <label>County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g., Maricopa"
              />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., Arizona"
              />
            </div>
          </div>

          <div className="field">
            <label>Petitioner Name</label>
            <p className="field-help">The person who filed the original petition</p>
            <input
              type="text"
              value={petitionerName}
              onChange={(e) => setPetitionerName(e.target.value)}
              placeholder="Full legal name"
            />
          </div>

          <div className="field">
            <label>Respondent Name</label>
            <p className="field-help">The other party in the case</p>
            <input
              type="text"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              placeholder="Full legal name"
            />
          </div>;

c = c.replace(afterCourtDate, newFields);

fs.writeFileSync('src/app/case-setup/page.tsx', c, 'utf8');
console.log('Added case info fields UI!');
