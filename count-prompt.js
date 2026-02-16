const fs = require('fs');
const src = fs.readFileSync('C:/Users/Huddy/pattern18-app/src/app/api/coach/route.ts', 'utf8');
const match = src.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
if (match) {
  const promptLength = match[1].length;
  console.log('SYSTEM_PROMPT length:', promptLength, 'characters');
  console.log('Approximate tokens (chars/4):', Math.ceil(promptLength/4));
} else {
  console.log('Could not extract SYSTEM_PROMPT');
}
