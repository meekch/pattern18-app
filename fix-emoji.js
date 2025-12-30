const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
c = c.replace(/icon: '[^']*', title: 'Import message history'/g, "icon: '📥', title: 'Import message history'");
c = c.replace(/icon: '[^']*', title: 'Analyze a screenshot'/g, "icon: '📸', title: 'Analyze a screenshot'");
c = c.replace(/icon: '[^']*', title: 'Court doc help'/g, "icon: '📄', title: 'Court doc help'");
c = c.replace(/icon: '[^']*', title: 'I need a moment'/g, "icon: '🌿', title: 'I need a moment'");
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed!');
