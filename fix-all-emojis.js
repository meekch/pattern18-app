const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Fix all corrupted emojis
const fixes = [
  ['ðŸ'†', '💆'],
  ['ðŸ"Œ', '📌'],
  ['ðŸ"¥', '🔥'],
  ['ðŸ'›', '💛'],
  ['ðŸ'ï¸', '👁️'],
  ['ðŸ'‚', '👂'],
  ['ðŸ'ƒ', '👃'],
  ['ðŸ'…', '👅'],
  ['ðŸ"Š', '📊'],
  ['ðŸ'ª', '💪'],
  ['ðŸ†', '🏆'],
  ['ðŸ''', '👑'],
  ['ðŸ"‹', '📋'],
  ['ðŸ'¬', '💬'],
  ['ðŸ"±', '📱'],
  ['ðŸ'­', '💭'],
  ['ðŸ›', '🐛'],
  ['ðŸ"¸', '📸'],
  ['ðŸ"', '📝'],
  ['ðŸ"¦', '📦'],
  ['ðŸ¤"', '🤔'],
  ['ðŸŒ¬ï¸', '🌬️'],
  ['ðŸ§˜', '🧘'],
  ['ðŸ™', '🙏'],
  ['âœï¸', '✏️'],
];

let count = 0;
for (const [bad, good] of fixes) {
  if (c.includes(bad)) {
    c = c.split(bad).join(good);
    count++;
    console.log(`Fixed: ${bad} -> ${good}`);
  }
}

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log(`\nFixed ${count} emoji types`);
