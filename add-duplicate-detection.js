const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// 1. Add hash generation function after the imports
const hashFunction = `
// Generate simple hash for duplicate detection
const generateImageHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
`;

// Find a good place to insert - after the interfaces/before the component
c = c.replace(
  'export default function CoachPage()',
  hashFunction + '\nexport default function CoachPage()'
);

// 2. Update autoSaveToTimeline to check for duplicates
const oldAutoSave = `const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
      if (!user) return;
      setAutoSaveStatus('saving');
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });`;

const newAutoSave = `const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
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
          // Could show a toast here: "This screenshot was already saved"
          console.log('Duplicate screenshot detected, skipping save');
          return;
        }
        
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });`;

c = c.replace(oldAutoSave, newAutoSave);

// 3. Add image_hash to the insert
const oldInsert = `await supabase.from('evidence_timeline').insert({
          user_id: user.id,
          screenshot_urls: urlData?.publicUrl ? [urlData.publicUrl] : [],
          patterns_detected: patterns,
          coaching_summary: aiResponse,
          co_parent_name: caseContext?.coparentName || null,
          incident_date: new Date().toISOString(),
          auto_saved: true,
          needs_review: true,
          reviewed: false,
        });`;

const newInsert = `await supabase.from('evidence_timeline').insert({
          user_id: user.id,
          screenshot_urls: urlData?.publicUrl ? [urlData.publicUrl] : [],
          patterns_detected: patterns,
          coaching_summary: aiResponse,
          co_parent_name: caseContext?.coparentName || null,
          incident_date: new Date().toISOString(),
          auto_saved: true,
          needs_review: true,
          reviewed: false,
          image_hash: imageHash,
        });`;

c = c.replace(oldInsert, newInsert);

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Added duplicate screenshot detection!');
