const fs = require('fs');
let c = fs.readFileSync('src/app/court-docs/page.tsx', 'utf8');

const oldBtn = '<div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>';

const newBtn = '<div style={{ position: "sticky", bottom: 0, background: "white", padding: "16px 0", marginTop: 24, display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", zIndex: 50 }}>';

c = c.replace(oldBtn, newBtn);
fs.writeFileSync('src/app/court-docs/page.tsx', c, 'utf8');
console.log('Made button sticky!');
