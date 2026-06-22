const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, '../src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Change table-auto back to table-fixed
  if (content.includes('table-auto')) {
    content = content.replace(/table-auto/g, 'table-fixed');
    changed = true;
  }

  // 2. Fix inner history table action column in MedicalRecords.jsx
  // In MedicalRecords, inner table has: <th className="w-[8%] p-3 font-medium text-right">จัดการ</th>
  if (file === 'MedicalRecords.jsx') {
      const innerTh = '<th className="w-[8%] p-3 font-medium text-right">จัดการ</th>';
      const newInnerTh = '<th className="w-[120px] p-3 font-medium text-right">จัดการ</th>';
      if (content.includes(innerTh)) {
          content = content.replace(innerTh, newInnerTh);
          changed = true;
      }
  }

  // 3. Fix action column in AppointmentManager.jsx
  // <th className="pb-4 font-medium text-right pr-6 w-[8%]">จัดการ</th>
  if (file === 'AppointmentManager.jsx') {
      const apptTh = '<th className="pb-4 font-medium text-right pr-6 w-[8%]">จัดการ</th>';
      const newApptTh = '<th className="pb-4 font-medium text-right pr-6 w-[120px]">จัดการ</th>';
      if (content.includes(apptTh)) {
          content = content.replace(apptTh, newApptTh);
          changed = true;
      }
  }

  // 4. Fix action column in InventoryManager.jsx
  // <th className="w-[12%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-right whitespace-nowrap">จัดการ</th>
  if (file === 'InventoryManager.jsx') {
      const invTh = '<th className="w-[12%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-right whitespace-nowrap">จัดการ</th>';
      const newInvTh = '<th className="w-[140px] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-right whitespace-nowrap">จัดการ</th>';
      if (content.includes(invTh)) {
          content = content.replace(invTh, newInvTh);
          changed = true;
      }
  }

  // 5. Fix action column in StaffManager.jsx
  // <th className="w-[14%] p-4 font-semibold text-right pr-6">จัดการ</th>
  if (file === 'StaffManager.jsx') {
      const staffTh = '<th className="w-[14%] p-4 font-semibold text-right pr-6">จัดการ</th>';
      const newStaffTh = '<th className="w-[140px] p-4 font-semibold text-right pr-6">จัดการ</th>';
      if (content.includes(staffTh)) {
          content = content.replace(staffTh, newStaffTh);
          changed = true;
      }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Applied table-fixed and absolute action width in ${file}`);
  }
});
