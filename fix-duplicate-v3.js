const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

const oldCode = `const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
    if (!user) return;
    setAutoSaveStatus('saving');
    try {
      const base64 = await new Promise<string>((resolve) => {`;

const newCode = `const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
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
        console.log('Duplicate screenshot detected');
        return;
      }
      
      const base64 = await new Promise<string>((resolve) => {`;

if (c.includes(oldCode)) {
  c = c.replace(oldCode, newCode);
  console.log('SUCCESS: Added duplicate detection!');
} else {
  console.log('FAILED: Could not find match');
}

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
