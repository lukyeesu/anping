const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The block to move
const printBlockStart = '// --- Auto Print OPD from URL (LINE Webhook) ---';
const printBlockEnd = '}, [patientsData, branchesData, currentBranch]);';

const startIndex = content.indexOf(printBlockStart);
if (startIndex !== -1) {
  const endIndex = content.indexOf(printBlockEnd, startIndex) + printBlockEnd.length;
  const block = content.substring(startIndex, endIndex);
  
  // Remove block from current position
  content = content.replace(block, '');
  
  // Find the right place to insert it
  const anchor = 'const [patientsData, setPatientsData] = useState(GOOGLE_SCRIPT_URL ? [] : mockPatients);';
  const anchorIdx = content.indexOf(anchor);
  
  if (anchorIdx !== -1) {
    // Find the end of the state declarations, or just insert it after the anchor
    const lines = content.split('\\n');
    let insertLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const [patientsData, setPatientsData]')) {
        insertLineIdx = i + 10; // just skip down a bit past other states
        break;
      }
    }
    
    if (insertLineIdx !== -1) {
      lines.splice(insertLineIdx, 0, block);
      fs.writeFileSync(filePath, lines.join('\\n'));
      console.log('Moved auto-print logic to after state declarations');
    }
  }
}
