const fs = require('fs');
const p = 'src/App.jsx';
let content = fs.readFileSync(p, 'utf8');

const s = `      if (combinedParam && !printOpdHn) {
        if (combinedParam.includes('_')) {
           const parts = combinedParam.split('_');
           printOpdHn = parts[0];
           printOpdDate = parts.slice(1).join('_');
        } else {
           printOpdHn = combinedParam;
        }
      }
      
      if (printOpdHn) {
        window.__autoPrintDone = true; // prevent loop
        const patient = patientsData.find(p => p.hn === printOpdHn || p.id === printOpdHn);
        if (patient) {`;

const r = `      let printOpdId4 = null;
      if (combinedParam && !printOpdHn) {
        if (combinedParam.includes('_')) {
           const parts = combinedParam.split('_');
           printOpdHn = parts[0];
           if (parts.length >= 2 && /^\\d{4}$/.test(parts[1])) {
             printOpdId4 = parts[1];
             printOpdDate = parts.slice(2).join('_');
           } else {
             printOpdDate = parts.slice(1).join('_');
           }
        } else {
           printOpdHn = combinedParam;
        }
      }
      
      if (printOpdHn) {
        window.__autoPrintDone = true; // prevent loop
        const patient = patientsData.find(p => p.hn === printOpdHn || p.id === printOpdHn);
        
        if (patient) {
          // Verify ID Card (Security feature to prevent HN guessing)
          let actualIdc = patient.idCard ? String(patient.idCard).replace(/\\D/g, '') : "0000";
          if (actualIdc.length < 4) actualIdc = "0000";
          const actualId4 = actualIdc.slice(-4);
          
          if (!printOpdId4 || printOpdId4 !== actualId4) {
             document.open();
             document.write('<div style="font-family:sans-serif;text-align:center;margin-top:20%;color:#ef4444;"><h2>⚠️ ปฏิเสธการเข้าถึง (Access Denied)</h2><p>ลิงก์ไม่ถูกต้อง หรือรหัสยืนยันตัวตนไม่ตรงกับฐานข้อมูล</p></div>');
             document.close();
             return;
          }`;

content = content.replace(s, r);
fs.writeFileSync(p, content, 'utf8');
console.log('Done security check update');
