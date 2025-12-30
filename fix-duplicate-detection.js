const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Find and replace the autoSaveToTimeline function opening
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
          showToast('This screenshot was already saved');
          return;
        }
        
        const base64 = await new Promise<string>((resolve) => {`;

if (c.includes('const imageHash = await generateImageHash')) {
  console.log('Duplicate detection already added');
} else {
  c = c.replace(oldStart, newStart);
}

// Add image_hash to insert if not there
if (!c.includes('image_hash: imageHash')) {
  c = c.replace(
    `reviewed: false,
        });`,
    `reviewed: false,
          image_hash: imageHash,
        });`
  );
}

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Done! Check if changes applied.');
