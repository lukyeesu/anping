const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/MedicalRecords.jsx');
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    '<th className="w-[10%] pt-6 pb-4 font-medium text-right pr-4 kanit-text">จัดการ</th>',
    '<th className="w-[140px] pt-6 pb-4 font-medium text-right pr-4 kanit-text">จัดการ</th>'
);

fs.writeFileSync(file, c);
console.log('Fixed MedicalRecords.jsx Manage column absolute width!');
