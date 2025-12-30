const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

const oldCode = `// Load pattern counts from evidence_timeline
        const { data: timelineData } = await supabase
          .from('evidence_timeline')
          .select('patterns_detected')
          .eq('user_id', session.user.id);

        if (timelineData) {
          const counts: Record<string, number> = {};
          timelineData.forEach(item => {
            (item.patterns_detected || []).forEach((pattern: string) => {
              const p = pattern.toLowerCase();
              counts[p] = (counts[p] || 0) + 1;
            });
          });
          setPatternCounts(counts);
        }`;

const newCode = `// Load pattern counts from evidence_timeline AND incidents
        const { data: timelineData } = await supabase
          .from('evidence_timeline')
          .select('patterns_detected')
          .eq('user_id', session.user.id);

        const { data: incidentsData } = await supabase
          .from('incidents')
          .select('patterns')
          .eq('user_id', session.user.id);

        const counts: Record<string, number> = {};
        
        // Count from evidence_timeline
        if (timelineData) {
          timelineData.forEach(item => {
            (item.patterns_detected || []).forEach((pattern: string) => {
              const p = pattern.toLowerCase();
              counts[p] = (counts[p] || 0) + 1;
            });
          });
        }
        
        // Count from incidents (bulk imports)
        if (incidentsData) {
          incidentsData.forEach(item => {
            (item.patterns || []).forEach((pattern: string) => {
              const p = pattern.toLowerCase();
              counts[p] = (counts[p] || 0) + 1;
            });
          });
        }
        
        setPatternCounts(counts);`;

c = c.replace(oldCode, newCode);
fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed pattern counts!');
