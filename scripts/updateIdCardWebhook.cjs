const fs = require('fs');
const p = 'หลังบ้าน v.5 LINE.js';
let content = fs.readFileSync(p, 'utf8');

const s1 = "return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');";
const r1 = `const patientsData = getData('Patients').data || [];
    appts.forEach(appt => {
      const p = patientsData.find(pat => pat.hn === appt.patientId || pat.id === appt.patientId);
      let idc = p && p.idCard ? String(p.idCard).replace(/\\D/g, '') : "0000";
      if (idc.length < 4) idc = "0000";
      appt._idCard4 = idc.slice(-4);
    });
    return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');`;

const s2 = "return buildAppointmentCarousel(appts, `นัดหมายของ ${hn}`);";
const r2 = `const patientsData = getData('Patients').data || [];
    appts.forEach(appt => {
      const p = patientsData.find(pat => pat.hn === appt.patientId || pat.id === appt.patientId);
      let idc = p && p.idCard ? String(p.idCard).replace(/\\D/g, '') : "0000";
      if (idc.length < 4) idc = "0000";
      appt._idCard4 = idc.slice(-4);
    });
    return buildAppointmentCarousel(appts, \`นัดหมายของ \${hn}\`);`;

const s3 = "uri\": `${WEBAPP_URL}?print_opd=${hn}_${appt.date || appt.rawDateTime || appt.datetime || ''}`";
const r3 = "uri\": `${WEBAPP_URL}?print_opd=${hn}_${appt._idCard4 || \"0000\"}_${appt.date || appt.rawDateTime || appt.datetime || ''}`";

content = content.replace(s1, r1);
content = content.replace(s2, r2);
content = content.replace(s3, r3);

fs.writeFileSync(p, content, 'utf8');
console.log('Done!');
