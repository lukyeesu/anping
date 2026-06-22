const fs = require('fs');
const path = require('path');

const filesToProcess = ['FinancePage.jsx', 'FinanceTableSection.jsx'];

const regex = /\{isLoadingMore\s*&&\s*Array\.from\(\{ length: 2 \}\)\.map\(\(_, i\) => \(\s*<div key=\{`skel-mob-fin-more-\$\{i\}`\} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">\s*<div className="flex justify-between items-start mb-2">\s*<div>\s*<Skeleton width="100px" height="20px" className="mb-2" \/>\s*<Skeleton width="150px" height="16px" \/>\s*<\/div>\s*<Skeleton width="60px" height="24px" rounded="rounded-full" \/>\s*<\/div>\s*<div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">\s*<Skeleton width="80px" height="16px" \/>\s*<Skeleton width="100px" height="20px" \/>\s*<\/div>\s*<\/div>\s*\)\)\}/g;

const newBlock = `{isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                      <div key={\`skel-mob-fin-more-\${i}\`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-center mb-1.5"><Skeleton width="64px" height="20px" /><Skeleton width="64px" height="20px" rounded="rounded-md" /></div>
                          <div className="mb-3"><Skeleton width="160px" height="24px" className="mb-2" /><Skeleton width="96px" height="24px" rounded="rounded-lg" /></div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                              <div className="flex items-center gap-2"><Skeleton width="20px" height="20px" circle /><Skeleton width="128px" height="16px" /></div>
                          </div>
                      </div>
                    ))}`;

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '../src/pages', file);
  if(!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (regex.test(content)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(filePath, content);
    console.log(`Updated mobile infinity loading structure in ${file}`);
  }
});
