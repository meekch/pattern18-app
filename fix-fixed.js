const fs = require('fs');
let c = fs.readFileSync('src/app/court-docs/page.tsx', 'utf8');

c = c.replace(
  'position: "sticky", bottom: 0, background: "white", padding: "16px 0", marginTop: 24, display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", zIndex: 50',
  'position: "fixed", bottom: 0, left: 0, right: 0, background: "white", padding: "16px 24px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", boxShadow: "0 -2px 10px rgba(0,0,0,0.1)", zIndex: 100'
);

fs.writeFileSync('src/app/court-docs/page.tsx', c, 'utf8');
console.log('Made button fixed!');
