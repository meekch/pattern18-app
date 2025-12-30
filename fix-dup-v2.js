const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

const oldCode = `if (type === 'screenshot') {
        promptMessage = "I'm uploading a screenshot of a message. Please extract the text, identify any manipulation patterns, and tell me if I need to respond.";
      }`;

const newCode = `if (type === 'screenshot') {
        // Check for duplicate BEFORE calling AI
        const imageHash = await generateImageHash(file);
        const { data: existingDup } = await supabase
          .from('evidence_timeline')
          .select('id, coaching_summary')
          .eq('user_id', user.id)
          .eq('image_hash', imageHash)
          .maybeSingle();
        
        if (existingDup) {
          // Skip AI call, show previous analysis
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { 
              ...m, 
              content: "I've already analyzed this screenshot. Here's what I found before:\\n\\n" + (existingDup.coaching_summary || "This screenshot is already in your evidence."),
              isLoading: false 
            } : m
          ));
          setIsLoading(false);
          return;
        }
        
        promptMessage = "I'm uploading a screenshot of a message. Please extract the text, identify any manipulation patterns, and tell me if I need to respond.";
      }`;

if (c.includes(oldCode)) {
  c = c.replace(oldCode, newCode);
  console.log('SUCCESS: Added duplicate check before AI call');
} else {
  console.log('FAILED: Could not find exact match');
  console.log('Trying alternative...');
  
  // Try simpler replacement
  const simpleOld = `if (type === 'screenshot') {
        promptMessage = "I'm uploading a screenshot`;
  
  if (c.includes(simpleOld)) {
    c = c.replace(simpleOld, `if (type === 'screenshot') {
        // Check for duplicate BEFORE calling AI
        const imageHash = await generateImageHash(file);
        const { data: existingDup } = await supabase
          .from('evidence_timeline')
          .select('id, coaching_summary')
          .eq('user_id', user.id)
          .eq('image_hash', imageHash)
          .maybeSingle();
        
        if (existingDup) {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: "I've already analyzed this screenshot.", isLoading: false } : m
          ));
          setIsLoading(false);
          return;
        }
        
        promptMessage = "I'm uploading a screenshot`);
    console.log('SUCCESS with alternative');
  } else {
    console.log('Alternative also failed');
  }
}

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
