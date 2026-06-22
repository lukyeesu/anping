const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/ReportsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace table definition
content = content.replace(
  '<table className="table-auto w-full text-left border-collapse min-w-[800px]">',
  '<table className="w-full text-left border-collapse min-w-[900px] table-auto">'
);

// Replace thead row
const oldThead = `<tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm kanit-text"><th className="w-[12%] p-4 text-center pl-6"><button onClick={toggleSelectAll} className="flex items-center justify-center w-full">{isAllSelected ? <CheckSquare size={20} className="text-sky-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>}</button></th><th className="p-4 font-medium w-[12%]">วันที่ / เวลา</th><th className="p-4 font-medium w-[16%]">ประเภท</th><th className="p-4 font-medium w-[18%]">รหัสอ้างอิง</th><th className="p-4 font-medium w-[46%]">ชื่อลูกค้า</th><th className="p-4 font-medium text-right pr-6 w-[100px] min-w-[100px]">พิมพ์</th></tr>`;
const newThead = `<tr className="text-slate-500 border-b border-slate-100 text-sm"><th className="w-[80px] pt-6 pb-4 text-center pl-6"><button onClick={toggleSelectAll} className="flex items-center justify-center w-full">{isAllSelected ? <CheckSquare size={20} className="text-sky-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>}</button></th><th className="w-[15%] pt-6 pb-4 font-medium text-left kanit-text">วันที่ / เวลา</th><th className="w-[15%] pt-6 pb-4 font-medium text-left kanit-text">ประเภท</th><th className="w-[20%] pt-6 pb-4 font-medium text-left kanit-text">รหัสอ้างอิง</th><th className="w-[40%] pt-6 pb-4 font-medium text-left kanit-text">ชื่อลูกค้า</th><th className="w-[100px] min-w-[100px] pt-6 pb-4 font-medium text-right pr-6 kanit-text">พิมพ์</th></tr>`;
content = content.replace(oldThead, newThead);

// Skeletons
content = content.replace(
  /<td className="p-4 text-center pl-6">/g,
  '<td className="py-4 pl-6">'
);
content = content.replace(
  /<td className="p-4">/g,
  '<td className="py-4 pr-4">' // Let's add pr-4 so middle columns don't touch!
);
content = content.replace(
  /<td className="p-4 text-right pr-6">/g,
  '<td className="py-4 text-right pr-6">'
);

// We need to also fix the data mapping parts that weren't caught by the exact string replacements
// visibleDocs map:
// 1st col
content = content.replace(
  /<td className="py-4 pl-6"><div className="flex items-center justify-center">/g,
  '<td className="py-4 pl-6 text-center"><div className="flex items-center justify-center">'
);

fs.writeFileSync(filePath, content);
console.log('Desktop Layout Fixed!');
