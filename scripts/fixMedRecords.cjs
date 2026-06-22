const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/MedicalRecords.jsx');
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    'min-w-[1100px] table-fixed',
    'min-w-[1250px] table-fixed'
);

c = c.replace(
    'kanit-text w-[12%]" onClick={() => requestSort(\'id\')}',
    'kanit-text w-[11%]" onClick={() => requestSort(\'id\')}'
);

c = c.replace(
    '<th className="w-[16%] pt-6 pb-4 font-medium text-left kanit-text">ชื่อคนไข้</th>',
    '<th className="w-[15%] pt-6 pb-4 font-medium text-left kanit-text">ชื่อคนไข้</th>'
);

c = c.replace(
    'kanit-text w-[15%]" onClick={() => requestSort(\'idCard\')}',
    'kanit-text w-[13%]" onClick={() => requestSort(\'idCard\')}'
);

c = c.replace(
    'kanit-text w-[10%]" onClick={() => requestSort(\'phone\')}',
    'kanit-text w-[11%]" onClick={() => requestSort(\'phone\')}'
);

c = c.replace(
    '<th className="w-[11%] pt-6 pb-4 font-medium text-center kanit-text">การรักษา(ครั้ง)</th>',
    '<th className="w-[10%] pt-6 pb-4 font-medium text-center kanit-text">การรักษา(ครั้ง)</th>'
);

c = c.replace(
    '<th className="w-[11%] pt-6 pb-4 font-medium text-center kanit-text">สถานะการยินยอม</th>',
    '<th className="w-[10%] pt-6 pb-4 font-medium text-center kanit-text">สถานะการยินยอม</th>'
);

c = c.replace(
    '<th className="w-[6%] pt-6 pb-4 font-medium text-right pr-6 kanit-text">จัดการ</th>',
    '<th className="w-[10%] pt-6 pb-4 font-medium text-right pr-6 kanit-text">จัดการ</th>'
);

fs.writeFileSync(file, c);
console.log('Fixed MedicalRecords.jsx column widths!');
