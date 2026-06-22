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

// 2. Add ID Card Extraction in buildPatientCardFlex
content = content.replace(
  'function buildPatientCardFlex(patient) {\\n  const fullName',
  'function buildPatientCardFlex(patient) {\\n  let idc = patient.idCard ? String(patient.idCard).replace(/\\\\D/g, "") : "0000";\\n  if (idc.length < 4) idc = "0000";\\n  const idCard4 = idc.slice(-4);\\n  const fullName'
);

// 3. Update Patient Card URI
content = content.replace(
  'uri": `${WEBAPP_URL}?print_opd=${hn}`',
  'uri": `${WEBAPP_URL}?print_opd=${hn}${idCard4}`'
);

// 4. Update getAppointmentsForDay
const getDayStart = "return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');";
const getDayRep = `const patientsData = getData('Patients').data || [];
  appts.forEach(appt => {
    const p = patientsData.find(pat => pat.hn === appt.patientId || pat.id === appt.patientId);
    let idc = p && p.idCard ? String(p.idCard).replace(/\\D/g, '') : "0000";
    if (idc.length < 4) idc = "0000";
    appt._idCard4 = idc.slice(-4);
  });
  return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');`;
content = content.replace(getDayStart, getDayRep);

// 5. Update getAppointmentsForPatient
const getPatStart = "return buildAppointmentCarousel(appts, `นัดหมายของ ${hn}`);";
const getPatRep = `const patientsData = getData('Patients').data || [];
  appts.forEach(appt => {
    const p = patientsData.find(pat => pat.hn === appt.patientId || pat.id === appt.patientId);
    let idc = p && p.idCard ? String(p.idCard).replace(/\\D/g, '') : "0000";
    if (idc.length < 4) idc = "0000";
    appt._idCard4 = idc.slice(-4);
  });
  return buildAppointmentCarousel(appts, \`นัดหมายของ \${hn}\`);`;
content = content.replace(getPatStart, getPatRep);

// 6. Update Appointment URI
content = content.replace(
  'uri": `${WEBAPP_URL}?print_opd=${hn}_${appt.date || appt.rawDateTime || appt.datetime || \\'\\'}`',
  'uri": `${WEBAPP_URL}?print_opd=${hn}${appt._idCard4 || "0000"}${formatCompactDate(appt.date || appt.rawDateTime || appt.datetime)}`'
);

fs.writeFileSync(p, content, 'utf8');
console.log('Webhook regenerated correctly');
