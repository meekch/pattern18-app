const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
c = c.replace('ðŸ•', '💬');
c = c.replace('ðŸ"‹', '📋');
c = c.replace('â€º', '›');
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed menu emojis!');
