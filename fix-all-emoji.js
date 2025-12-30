const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
// Fix all corrupted emojis
c = c.replace(/ðŸ'š/g, '💚');
c = c.replace(/ðŸ"[^\w]/g, '📁');
c = c.replace(/ðŸ"Ž/g, '📎');
c = c.replace(/â˜°/g, '☰');
c = c.replace(/âž¤/g, '➤');
c = c.replace(/Ã—/g, '×');
c = c.replace(/ðŸ'š|ð.*?š/g, '💚');
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('All emojis fixed!');
