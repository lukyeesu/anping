const fs = require('fs');
const path = require('path');

const filesToProcess = ['FinancePage.jsx', 'FinanceTableSection.jsx'];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '../src/pages', file);
  if(!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // The wrapper we need to fix
  const oldWrapper = '<div className="h-24 w-full flex items-center justify-center py-6 pb-12">';
  const newWrapper = '<div className="w-full flex flex-col gap-3 py-2 pb-6">';
  
  if (content.includes(oldWrapper)) {
    content = content.replace(oldWrapper, newWrapper);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed infinite loader wrapper in ${file}`);
  }
});
