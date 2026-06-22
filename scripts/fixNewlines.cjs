const fs = require('fs');
const p = 'src/App.jsx';
let content = fs.readFileSync(p, 'utf8');

// Replace the literal \n\n that was written by mistake
content = content.replace('useState([]);\\n\\n  // --- Auto Print', 'useState([]);\\n\\n  // --- Auto Print');
// Actually, let's just do:
content = content.split('\\\\n\\\\n').join('\\n\\n');

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed literal newlines');
