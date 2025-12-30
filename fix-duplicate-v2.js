const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Find and replace with exact indentation
const oldStart = `const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
      if (!user) return;
      setAutoSaveStatus('saving');
      try {
        const base64 = await new Promise<string>((resolve) => {`;

const newStart = `const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
      if (!user) return;
      setAutoSaveStatus('saving');
      try {
        // Generate hash for duplicate detection
        const imageHash = await generateImageHash(file);
        
        // Check for existing duplicate
        const { data: existing } = await supabase
          .from('evidence_timeline')
          .select('id')
          .eq('user_id', user.id)
          .eq('image_hash', imageHash)
          .single();
        
        if (existing) {
          setAutoSaveStatus('idle');
          console.log('Duplicate detected');
          return;
        }
        
        const base64 = await new Promise<string>((resolve) => {`;

if (c.includes(oldStart)) {
  c = c.replace(oldStart, newStart);
  console.log('SUCCESS: Added duplicate detection');
} else {
  console.log('Could not find match - checking alternative...');
  // Try a simpler replacement
  if (c.includes('setAutoSaveStatus(\'saving\');\n      try {\n        const base64')) {
    c = c.replace(
      "setAutoSaveStatus('saving');\n      try {\n        const base64",
      `setAutoSaveStatus('saving');
      try {
        // Generate hash for duplicate detection
        const imageHash = await generateImageHash(file);
        
        // Check for existing duplicate  
        const { data: existing } = await supabase
          .from('evidence_timeline')
          .select('id')
          .eq('user_id', user.id)
          .eq('image_hash', imageHash)
          .single();
        
        if (existing) {
          setAutoSaveStatus('idle');
          console.log('Duplicate detected');
          return;
        }
        
        const base64`
    );
    console.log('SUCCESS with alternative match');
  } else {
    console.log('FAILED - manual edit needed');
  }
}

// Add image_hash to insert
if (!c.includes('image_hash: imageHash')) {
  c = c.replace(
    'reviewed: false,\n        });',
    'reviewed: false,\n          image_hash: imageHash,\n        });'
  );
  console.log('Added image_hash to insert');
}

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
