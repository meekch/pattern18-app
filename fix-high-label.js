const fs = require('fs');
let c = fs.readFileSync('src/app/evidence/page.tsx', 'utf8');

// Fix the label
c = c.replace('{ key: "high+", label: "High+ Only" }', '{ key: "high+", label: "High & Critical" }');
c = c.replace('<div style={{ fontSize: 13, color: "#6b7280" }}>High+</div>', '<div style={{ fontSize: 13, color: "#6b7280" }}>High & Critical</div>');

fs.writeFileSync('src/app/evidence/page.tsx', c, 'utf8');
console.log('Fixed High+ label!');
