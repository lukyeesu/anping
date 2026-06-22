const fs = require('fs');
const p = 'หลังบ้าน v.5 LINE.js';
let content = fs.readFileSync(p, 'utf8');

// 1. Add formatCompactDate function
const formatCompactDateCode = `
function formatCompactDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  return \`\${d.getFullYear()}\${pad(d.getMonth()+1)}\${pad(d.getDate())}\${pad(d.getHours())}\${pad(d.getMinutes())}\${pad(d.getSeconds())}\`;
}
`;
if (!content.includes('function formatCompactDate')) {
   content = content.replace('// -------------------------------------------------------------', formatCompactDateCode + '\\n// -------------------------------------------------------------');
}

// 2. Replace Patient Card Flex URI
content = content.replace(
  'uri": `${WEBAPP_URL}?print_opd=${hn}_${idCard4}`',
  'uri": `${WEBAPP_URL}?print_opd=${hn}${idCard4}`'
);

// 3. Replace Appointment Carousel URI
content = content.replace(
  'uri": `${WEBAPP_URL}?print_opd=${hn}_${appt._idCard4 || "0000"}_${appt.date || appt.rawDateTime || appt.datetime || \\'\\'}`',
  'uri": `${WEBAPP_URL}?print_opd=${hn}${appt._idCard4 || "0000"}${formatCompactDate(appt.date || appt.rawDateTime || appt.datetime)}`'
);

fs.writeFileSync(p, content, 'utf8');
console.log('Updated LINE webhook for mashed param');
