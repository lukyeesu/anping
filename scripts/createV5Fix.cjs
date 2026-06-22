const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const filePath = path.join(projectDir, 'หลังบ้าน v.5 LINE.js');
let v5Content = fs.readFileSync(filePath, 'utf8');

// Replace pixel paddings with standard Line Flex padding names
v5Content = v5Content.replace(/"paddingAll": "20px"/g, '"paddingAll": "lg"');
v5Content = v5Content.replace(/"paddingAll": "16px"/g, '"paddingAll": "md"');
v5Content = v5Content.replace(/"paddingAll": "12px"/g, '"paddingAll": "sm"');

fs.writeFileSync(filePath, v5Content);
console.log('Fixed padding in v.5 LINE.js');
