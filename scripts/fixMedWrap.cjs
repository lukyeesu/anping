const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/MedicalRecords.jsx');
let c = fs.readFileSync(file, 'utf8');

// Replace padding for the last column th and td to give it more space
c = c.replace(
    '<th className="w-[10%] pt-6 pb-4 font-medium text-right pr-6 kanit-text">จัดการ</th>',
    '<th className="w-[10%] pt-6 pb-4 font-medium text-right pr-4 kanit-text">จัดการ</th>'
);

c = c.replace(
    '<td className="py-4 text-right pr-6">',
    '<td className="py-4 text-right pr-4">'
);

c = c.replaceAll(
    '<td className="py-4 pr-6"><div className="flex justify-end gap-2">',
    '<td className="py-4 pr-4"><div className="flex justify-end gap-1 flex-wrap sm:gap-2">'
);

// Replace the flex gap for the actual buttons
c = c.replace(
    '<div className="flex justify-end gap-2 transition-opacity">',
    '<div className="flex justify-end gap-1 flex-wrap sm:gap-2 transition-opacity">'
);

fs.writeFileSync(file, c);
console.log('Fixed MedicalRecords.jsx Manage column overlapping!');
