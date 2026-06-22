const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/ReportsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace table
content = content.replace(
  /<table className="[^"]*">/,
  '<table className="w-full text-left border-collapse min-w-[800px] table-auto">'
);

// Replace thead
const oldTheadRegex = /<thead[\s\S]*?<\/thead>/;
const newThead = `<thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm kanit-text"><th className="p-4 w-16 text-center"><button onClick={toggleSelectAll} className="flex items-center justify-center w-full">{isAllSelected ? <CheckSquare size={20} className="text-sky-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>}</button></th><th className="p-4 font-medium w-[12%]">วันที่ / เวลา</th><th className="p-4 font-medium w-[16%]">ประเภท</th><th className="p-4 font-medium w-[18%]">รหัสอ้างอิง</th><th className="p-4 font-medium w-[46%]">ชื่อลูกค้า</th><th className="p-4 font-medium text-center w-[8%]">พิมพ์</th></tr>
                </thead>`;
content = content.replace(oldTheadRegex, newThead);

// Replace skeleton td classes
content = content.replace(/<td className="py-4 pl-6">/g, '<td className="p-4 text-center">');
content = content.replace(/<td className="py-4 pr-4">/g, '<td className="p-4">');
content = content.replace(/<td className="py-4 text-right pr-6">/g, '<td className="p-4 text-center">');

// Replace map data td classes
content = content.replace(/<td className="py-4 pl-6 text-center">/g, '<td className="p-4 text-center">');
content = content.replace(/<td className="py-4 pr-4 text-slate-600 font-medium">/g, '<td className="p-4 text-slate-600 font-medium">');
content = content.replace(/<td className="py-4 pr-4">{getDocBadge/g, '<td className="p-4">{getDocBadge');
content = content.replace(/<td className="py-4 pr-4 font-bold text-slate-700/g, '<td className="p-4 font-bold text-slate-700');
content = content.replace(/<td className="py-4 pr-4 text-slate-800 kanit-text/g, '<td className="p-4 text-slate-800 kanit-text');

fs.writeFileSync(filePath, content);
console.log('Restored exact table layout requested by user!');
