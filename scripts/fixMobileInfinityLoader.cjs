const fs = require('fs');
const path = require('path');

const filesToProcess = ['FinancePage.jsx', 'FinanceTableSection.jsx'];

const oldBlock = `{isLoadingMore && (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                        <p className="text-xs font-bold text-slate-400 kanit-text animate-pulse">กำลังโหลดข้อมูลเพิ่มเติม...</p>
                      </div>
                    )}`;

// Wait, the indentations might not perfectly match. I'll use regex.
const regex = /\{isLoadingMore\s*&&\s*\(\s*<div[^>]*>\s*<Loader2[^>]*\/>\s*<p[^>]*>กำลังโหลดข้อมูลเพิ่มเติม...<\/p>\s*<\/div>\s*\)\s*\}/s;

const newBlock = `{isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                      <div key={\`skel-mob-fin-more-\${i}\`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Skeleton width="100px" height="20px" className="mb-2" />
                            <Skeleton width="150px" height="16px" />
                          </div>
                          <Skeleton width="60px" height="24px" rounded="rounded-full" />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                          <Skeleton width="80px" height="16px" />
                          <Skeleton width="100px" height="20px" />
                        </div>
                      </div>
                    ))}`;

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '../src/pages', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (regex.test(content)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(filePath, content);
    console.log(`Updated mobile infinity loading in ${file}`);
  }
});
