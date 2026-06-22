const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/ReportsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Desktop Header Updates
content = content.replace(
  '<th className="w-[15%] p-4 text-center">',
  '<th className="w-[12%] p-4 text-center pl-6">'
);
content = content.replace(
  '<th className="p-4 font-medium text-center w-[8%]">พิมพ์</th>',
  '<th className="p-4 font-medium text-right pr-6 w-[100px] min-w-[100px]">พิมพ์</th>'
);

// Desktop Skeleton Updates
content = content.replace(
  '<td className="p-4 text-center"><div className="h-5 w-full max-w-[20px] bg-slate-200 rounded mx-auto animate-pulse"></div></td>',
  '<td className="p-4 text-center pl-6"><div className="h-5 w-full max-w-[20px] bg-slate-200 rounded mx-auto animate-pulse"></div></td>'
);
content = content.replace(
  '<td className="p-4 text-center"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg mx-auto animate-pulse"></div></td>',
  '<td className="p-4 text-right pr-6"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg ml-auto animate-pulse"></div></td>'
);

// Infinity Skeleton Desktop Updates
content = content.replace(
  '<td className="p-4 text-center"><div className="h-5 w-full max-w-[20px] bg-slate-100 rounded mx-auto animate-pulse"></div></td>',
  '<td className="p-4 text-center pl-6"><div className="h-5 w-full max-w-[20px] bg-slate-100 rounded mx-auto animate-pulse"></div></td>'
);
content = content.replace(
  '<td className="p-4 text-center"><div className="h-8 w-full max-w-[32px] bg-slate-100 rounded-lg mx-auto animate-pulse"></div></td>',
  '<td className="p-4 text-right pr-6"><div className="h-8 w-full max-w-[32px] bg-slate-100 rounded-lg ml-auto animate-pulse"></div></td>'
);


// Desktop Data Map Updates
content = content.replace(
  '<td className="p-4 text-center"><div className="flex items-center justify-center">',
  '<td className="p-4 text-center pl-6"><div className="flex items-center justify-center">'
);
content = content.replace(
  '<td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="p-2 text-slate-400 hover:text-sky-600 transition-colors"><Printer \nsize={16}/></button></td>',
  '<td className="p-4 text-right pr-6"><button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="p-2 text-slate-400 hover:text-sky-600 transition-colors"><Printer \nsize={16}/></button></td>'
);
// Sometimes it doesn't have \n
content = content.replace(
  '<td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="p-2 text-slate-400 hover:text-sky-600 transition-colors"><Printer size={16}/></button></td>',
  '<td className="p-4 text-right pr-6"><button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="p-2 text-slate-400 hover:text-sky-600 transition-colors"><Printer size={16}/></button></td>'
);

fs.writeFileSync(filePath, content);
console.log('Desktop layout updated in ReportsManager');
