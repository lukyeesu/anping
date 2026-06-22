const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/MedicalRecords.jsx');
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    'min-w-[1250px] table-fixed',
    'min-w-[1400px] table-fixed'
);

// Revert the flex-wrap and gap changes back to gap-2
c = c.replaceAll(
    '<td className="py-4 pr-4"><div className="flex justify-end gap-1 flex-wrap sm:gap-2">',
    '<td className="py-4 pr-4"><div className="flex justify-end gap-2 transition-opacity">'
);

c = c.replaceAll(
    '<div className="flex justify-end gap-1 flex-wrap sm:gap-2 transition-opacity">',
    '<div className="flex justify-end gap-2 transition-opacity">'
);

fs.writeFileSync(file, c);
console.log('Fixed MedicalRecords.jsx Manage column single line scrolling!');
