const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/FinancePage.jsx');
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    '<th className="w-[13%] p-4 font-medium text-center w-[120px] kanit-text">วันที่/เวลา</th>',
    '<th className="w-[13%] p-4 font-medium text-left pl-6 w-[120px] kanit-text">วันที่/เวลา</th>'
);

c = c.replace(
    '<th className="w-[9%] p-4 font-medium text-center w-[100px] kanit-text">ดำเนินการ</th>',
    '<th className="w-[9%] p-4 font-medium text-right pr-6 w-[100px] kanit-text">ดำเนินการ</th>'
);

c = c.replaceAll(
    '<td className="p-4"><Skeleton width="80px" height="16px" className="mx-auto mb-1" /><Skeleton width="60px" height="12px" className="mx-auto" /></td>',
    '<td className="p-4 pl-6"><Skeleton width="80px" height="16px" className="mb-1" /><Skeleton width="60px" height="12px" /></td>'
);

c = c.replaceAll(
    '<td className="p-4"><div className="flex gap-2 justify-center"><Skeleton width="24px" height="24px" rounded="rounded-lg"/><Skeleton width="24px" height="24px" rounded="rounded-lg"/></div></td>',
    '<td className="p-4 pr-6"><div className="flex gap-2 justify-end"><Skeleton width="24px" height="24px" rounded="rounded-lg"/><Skeleton width="24px" height="24px" rounded="rounded-lg"/></div></td>'
);

c = c.replaceAll(
    '<td className="p-4"><div className="flex gap-2 justify-center"><Skeleton width="24px" height="24px" rounded="rounded-lg"/><Skeleton width="24px" height="24px" \nrounded="rounded-lg"/></div></td>',
    '<td className="p-4 pr-6"><div className="flex gap-2 justify-end"><Skeleton width="24px" height="24px" rounded="rounded-lg"/><Skeleton width="24px" height="24px" rounded="rounded-lg"/></div></td>'
);

c = c.replace(
    '<td className="p-4 text-center">\n                              <div className="flex flex-col items-center">\n                                <span className="text-sm font-data text-slate-800 kanit-text font-medium">{formatDate(tx.date)}</span>\n                              </div>\n                            </td>',
    '<td className="p-4 pl-6 text-left">\n                              <div className="flex flex-col items-start">\n                                <span className="text-sm font-data text-slate-800 kanit-text font-medium">{formatDate(tx.date)}</span>\n                              </div>\n                            </td>'
);

c = c.replace(
    '<td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>\n                               <div className="flex items-center justify-center gap-1">',
    '<td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>\n                               <div className="flex items-center justify-end gap-1">'
);

fs.writeFileSync(file, c);
console.log('Fixed FinancePage.jsx columns!');
