const fs = require('fs');
const p = 'หลังบ้าน v.5 LINE.js';
let content = fs.readFileSync(p, 'utf8');

if (!content.includes('function formatCompactDate')) {
  content = content.replace('// -------------------------------------------------------------', 
  \`function formatCompactDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  return \\\`\\\${d.getFullYear()}\\\${pad(d.getMonth()+1)}\\\${pad(d.getDate())}\\\${pad(d.getHours())}\\\${pad(d.getMinutes())}\\\${pad(d.getSeconds())}\\\`;
}
// -------------------------------------------------------------\`);
}

content = content.replace(
  'function buildPatientCardFlex(patient) {\\n  const fullName',
  'function buildPatientCardFlex(patient) {\\n  let idc = patient.idCard ? String(patient.idCard).replace(/\\\\D/g, "") : "0000";\\n  if (idc.length < 4) idc = "0000";\\n  const idCard4 = idc.slice(-4);\\n  const fullName'
);

content = content.replace(
  'uri": `${WEBAPP_URL}?print_opd=${hn}`',
  'uri": `${WEBAPP_URL}?print_opd=${hn}${idCard4}`'
);

content = content.replace(
  "return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');",
  \`const patientsData = getData('Patients').data || [];
  appts.forEach(appt => {
    const p = patientsData.find(pat => pat.hn === appt.patientId || pat.id === appt.patientId);
    let idc = p && p.idCard ? String(p.idCard).replace(/\\\\D/g, '') : "0000";
    if (idc.length < 4) idc = "0000";
    appt._idCard4 = idc.slice(-4);
  });
  return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');\`
);

content = content.replace(
  "return buildAppointmentCarousel(appts, \`นัดหมายของ \${hn}\`);",
  \`const patientsData = getData('Patients').data || [];
  appts.forEach(appt => {
    const p = patientsData.find(pat => pat.hn === appt.patientId || pat.id === appt.patientId);
    let idc = p && p.idCard ? String(p.idCard).replace(/\\\\D/g, '') : "0000";
    if (idc.length < 4) idc = "0000";
    appt._idCard4 = idc.slice(-4);
  });
  return buildAppointmentCarousel(appts, \\\`นัดหมายของ \\\${hn}\\\`);\`
);

content = content.replace(
  "uri\\\": \\`\${WEBAPP_URL}?print_opd=\${hn}_\${appt.date || appt.rawDateTime || appt.datetime || ''}\\`",
  "uri\\\": \\`\${WEBAPP_URL}?print_opd=\${hn}\${appt._idCard4 || \\\"0000\\\"}\${formatCompactDate(appt.date || appt.rawDateTime || appt.datetime)}\\`"
);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed Webhook cleanly');
