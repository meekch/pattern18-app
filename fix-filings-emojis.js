const fs = require('fs');
let c = fs.readFileSync('src/app/filings/page.tsx', 'utf8');

// Fix all corrupted emojis
c = c.replace(/ðŸ"œ/g, '📜');
c = c.replace(/ðŸ"„/g, '📄');
c = c.replace(/ðŸ"/g, '📝');
c = c.replace(/ðŸ"Ž/g, '📎');
c = c.replace(/ðŸ"¤/g, '📤');
c = c.replace(/ðŸ"¥/g, '📥');
c = c.replace(/ðŸ"‹/g, '📋');
c = c.replace(/ðŸ'¾/g, '💾');
c = c.replace(/ðŸ"—/g, '🔗');
c = c.replace(/ðŸ'¬/g, '💬');

fs.writeFileSync('src/app/filings/page.tsx', c, 'utf8');
console.log('Fixed emojis in filings page!');
