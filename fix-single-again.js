const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Find and fix the specific .single() in the duplicate check within autoSaveToTimeline
c = c.replace(
  `.eq('image_hash', imageHash)
          .single();`,
  `.eq('image_hash', imageHash)
          .maybeSingle();`
);

// Also fix if it's slightly different format
c = c.replace(
  `.eq('image_hash', imageHash)
        .single();`,
  `.eq('image_hash', imageHash)
        .maybeSingle();`
);

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed .single() to .maybeSingle()');
