const fs = require('fs');
let c = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Fix the upload modal emojis
// Main modal icon (thought bubble -> plus/add)
c = c.replace(/<span className="upload-emoji">.*?<\/span>\s*<h2>What do you have\?/s, '<span className="upload-emoji">➕</span>\n                    <h2>What do you have?');

// Screenshot option
c = c.replace(/<div className="option-icon">.*?<\/div>\s*<div className="option-text">\s*<strong>Screenshot<\/strong>/s, '<div className="option-icon">📸</div>\n                      <div className="option-text">\n                        <strong>Screenshot</strong>');

// Paste text option  
c = c.replace(/<div className="option-icon">.*?<\/div>\s*<div className="option-text">\s*<strong>Paste text<\/strong>/s, '<div className="option-icon">📋</div>\n                      <div className="option-text">\n                        <strong>Paste text</strong>');

// Court order option
c = c.replace(/<div className="option-icon">.*?<\/div>\s*<div className="option-text">\s*<strong>Court order/s, '<div className="option-icon">⚖️</div>\n                      <div className="option-text">\n                        <strong>Court order');

// Message history option
c = c.replace(/<div className="option-icon">.*?<\/div>\s*<div className="option-text">\s*<strong>Message history<\/strong>/s, '<div className="option-icon">💬</div>\n                      <div className="option-text">\n                        <strong>Message history</strong>');

fs.writeFileSync('src/app/coach/page.tsx', c, 'utf8');
console.log('Fixed upload modal emojis!');
