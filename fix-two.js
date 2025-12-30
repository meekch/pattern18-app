const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
c = c.replace(/ðŸ"Ž/g, '📎');
c = c.replace(/ðŸ" /g, '📁 ');
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed paperclip and folder!');
