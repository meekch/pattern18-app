const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Find and replace the pattern loading section
c = c.replace(
  /\/\/ Load pattern counts from evidence_timeline\s+const \{ data: timelineData \} = await supabase\s+\.from\('evidence_timeline'\)\s+\.select\('patterns_detected'\)\s+\.eq\('user_id', session\.user\.id\);\s+if \(timelineData\) \{\s+const counts: Record<string, number> = \{\};\s+timelineData\.forEach\(item => \{\s+\(item\.patterns_detected \|\| \[\]\)\.forEach\(\(pattern: string\) => \{\s+const p = pattern\.toLowerCase\(\);\s+counts\[p\] = \(counts\[p\] \|\| 0\) \+ 1;\s+\}\);\s+\}\);\s+setPatternCounts\(counts\);\s+\}/,
  '// Load pattern counts from evidence_timeline AND incidents\n        const { data: timelineData } = await supabase\n          .from(\"evidence_timeline\")\n          .select(\"patterns_detected\")\n          .eq(\"user_id\", session.user.id);\n\n        const { data: incidentsData } = await supabase\n          .from(\"incidents\")\n          .select(\"patterns\")\n          .eq(\"user_id\", session.user.id);\n\n        const counts: Record<string, number> = {};\n        if (timelineData) {\n          timelineData.forEach(item => {\n            (item.patterns_detected || []).forEach((pattern: string) => {\n              const p = pattern.toLowerCase();\n              counts[p] = (counts[p] || 0) + 1;\n            });\n          });\n        }\n        if (incidentsData) {\n          incidentsData.forEach(item => {\n            (item.patterns || []).forEach((pattern: string) => {\n              const p = pattern.toLowerCase();\n              counts[p] = (counts[p] || 0) + 1;\n            });\n          });\n        }\n        setPatternCounts(counts);'
);

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed!');
