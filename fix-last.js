const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
// Fix remaining corrupted chars - using regex for any corrupted patterns
c = c.replace(/ðŸ"Ž/g, '📎');
c = c.replace(/ðŸ"\□/g, '📁');
c = c.replace(/ðŸ"—/g, '📁');
c = c.replace(/ð[^']{1,6}/g, function(match) {
  // Map common corrupted patterns
  if (match.includes('Ž')) return '📎';
  if (match.includes('□') || match.includes('—')) return '📁';
  return match;
});
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Done!');
