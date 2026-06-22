const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/MedicalRecords.jsx');
let c = fs.readFileSync(file, 'utf8');

// Remove table-fixed from main table
c = c.replace(
    'min-w-[1400px] table-fixed',
    'min-w-[1100px] table-auto'
);

// Remove table-fixed from inner table
c = c.replace(
    'table-fixed w-full text-left border-collapse min-w-[800px] text-sm',
    'table-auto w-full text-left border-collapse min-w-[800px] text-sm'
);

// We can keep the w-[X%] on th, table-auto will use them as a guide but allow columns to stretch if needed

fs.writeFileSync(file, c);
console.log('Removed table-fixed from MedicalRecords.jsx!');
