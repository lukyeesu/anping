const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/ReportsManager.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldMobileBlockRegex = /<div className="md:hidden flex flex-col divide-y divide-slate-100">[\s\S]*?(?=<\/div>\s*<div className="h-10 w-full flex flex-col justify-start"><\/div>\s*<\/div>)/;

const newMobileBlock = `<div className="md:hidden space-y-3 mt-2">
              {isGlobalLoading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                    <div key={\`skel-rep-mob-\${i}\`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 bg-slate-200 rounded animate-pulse shrink-0"></div>
                                <div className="w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div>
                            </div>
                            <div className="w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-md shrink-0"></div>
                        </div>
                        <div className="mb-3 px-1">
                            <div className="w-full max-w-[160px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div className="w-[100px] h-[24px] bg-slate-200 animate-pulse rounded-full"></div>
                            <div className="w-[70px] h-[30px] bg-slate-200 animate-pulse rounded-lg"></div>
                        </div>
                    </div>
                 ))
              ) : visibleDocs.length > 0 ? visibleDocs.map(doc => {
                  const isSelected = selectedDocs.includes(doc.id);
                  const d = new Date(doc.timestamp);
                  return (
                    <div key={doc.id} onClick={() => toggleSelection(doc.id)} className={\`bg-white p-4 rounded-2xl border shadow-sm flex flex-col cursor-pointer transition-all active:scale-[0.98] \${isSelected ? 'border-sky-300 ring-2 ring-sky-100 bg-sky-50/10' : 'border-slate-100 hover:border-sky-200 hover:shadow-md'}\`}>
                        <div className="flex justify-between items-start mb-2.5">
                            <div className="flex items-center gap-2.5">
                                {isSelected ? <CheckSquare size={20} className="text-sky-500 shrink-0" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded shrink-0"></div>}
                                <span className="font-bold text-slate-500 kanit-text text-[11px] sm:text-xs bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 truncate max-w-[120px]">{doc.refNo}</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-data shrink-0"><Clock size={12} className="shrink-0"/> {d.toLocaleDateString('th-TH')} {d.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div className="mb-3 px-1">
                            <div className="font-bold text-slate-800 text-sm kanit-text line-clamp-1">{doc.patientName}</div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center shrink-0">
                                {getDocBadge(doc.type, doc.typeLabel)}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-sky-600 bg-white hover:bg-sky-50 rounded-lg transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-200 shrink-0">
                                <Printer size={14} /> พิมพ์
                            </button>
                        </div>
                    </div>
                  )
              }) : (<div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed"><Printer size={40} className="mx-auto mb-3 opacity-30" /><p className="kanit-text font-bold text-sm">ไม่มีข้อมูลเอกสาร</p></div>)}
              
              {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                  <div key={\`skel-rep-mob-more-\${i}\`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 bg-slate-200 rounded animate-pulse shrink-0"></div>
                              <div className="w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div>
                          </div>
                          <div className="w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-md shrink-0"></div>
                      </div>
                      <div className="mb-3 px-1">
                          <div className="w-full max-w-[160px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="w-[100px] h-[24px] bg-slate-200 animate-pulse rounded-full"></div>
                          <div className="w-[70px] h-[30px] bg-slate-200 animate-pulse rounded-lg"></div>
                      </div>
                  </div>
              ))}
            </div>`;

if (oldMobileBlockRegex.test(content)) {
  content = content.replace(oldMobileBlockRegex, newMobileBlock + '\n            ');
  fs.writeFileSync(filePath, content);
  console.log('Mobile layout updated successfully');
} else {
  console.log('Regex did not match!');
}
