const fs = require('fs');
let c = fs.readFileSync('src/components/evidence/BulkMessageUpload.tsx', 'utf8');
c = c.replace('CSV export from iMazing (PDF coming soon)', 'CSV or PDF message export');
c = c.replace('✓ Detects 18 manipulation patterns', '✓ Detects manipulation patterns');
fs.writeFileSync('src/components/evidence/BulkMessageUpload.tsx', c, 'utf8');
console.log('Fixed!');
