const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
c = c.replace('ðŸ"Ž', '📎');
c = c.replace('ðŸ" ', '📁 ');
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed!');
