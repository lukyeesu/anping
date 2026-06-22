const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/ReportsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of `p-4` inside `td className="p-4 ...` with `py-4 pr-4 ...`
content = content.replace(/<td className="p-4 /g, '<td className="py-4 pr-4 ');
content = content.replace(/<td className="p-4">/g, '<td className="py-4 pr-4">');

fs.writeFileSync(filePath, content);
console.log('Fixed missed paddings!');
