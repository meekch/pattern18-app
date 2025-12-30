const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Fix: Change .single() to .maybeSingle() for duplicate check
c = c.replace(
  `.eq('image_hash', imageHash)
          .single();`,
  `.eq('image_hash', imageHash)
          .maybeSingle();`
);

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed! Changed .single() to .maybeSingle()');
