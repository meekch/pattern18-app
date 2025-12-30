const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// 1. Add toast state after other useState declarations
// Find a good spot - after savingEvidence state
const oldSavingState = "const [savingEvidence, setSavingEvidence] = useState<string | null>(null);";
const newSavingState = `const [savingEvidence, setSavingEvidence] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);`;

c = c.replace(oldSavingState, newSavingState);

// 2. Add toast helper function
const toastHelper = `
  // Show toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
`;

// Insert after the state declarations
c = c.replace(
  'const [toastMessage, setToastMessage] = useState<string | null>(null);',
  'const [toastMessage, setToastMessage] = useState<string | null>(null);' + toastHelper
);

// 3. Update autoSaveToTimeline to show toast on duplicate
c = c.replace(
  `if (existing) {
          setAutoSaveStatus('idle');
          // Could show a toast here: "This screenshot was already saved"
          console.log('Duplicate screenshot detected, skipping save');
          return;
        }`,
  `if (existing) {
          setAutoSaveStatus('idle');
          showToast('This screenshot was already saved');
          return;
        }`
);

// 4. Add toast UI component before the closing </div> of container
// Find the style jsx section and add toast before it
const toastUI = `
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a3a2f',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: 14,
          fontWeight: 500
        }}>
          {toastMessage}
        </div>
      )}
`;

// Insert before <style jsx>
c = c.replace('<style jsx>{`', toastUI + '\n      <style jsx>{`');

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Added toast notification for duplicates!');
