const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const printBlockStart = '// --- Auto Print OPD from URL (LINE Webhook) ---';
const printBlockEnd = '}, [patientsData, branchesData, currentBranch]);';

const startIndex = content.indexOf(printBlockStart);
if (startIndex !== -1) {
  const endIndex = content.indexOf(printBlockEnd, startIndex) + printBlockEnd.length;
  // include preceding newline or characters if needed, but simple replace is fine
  const blockToMove = content.substring(startIndex, endIndex);
  
  // Remove the block from its current bad location
  content = content.replace(blockToMove, '');
  // also clean up any stray '\n' right at the very end of the file
  content = content.replace(/\\n$/, ''); 

  // Now, let's insert it inside App().
  // Look for: const [posHistoryData, setPosHistoryData] = useState([]);
  const safeAnchor = 'const [posHistoryData, setPosHistoryData] = useState([]);';
  
  if (content.includes(safeAnchor)) {
    content = content.replace(safeAnchor, safeAnchor + '\\n\\n  ' + blockToMove);
    fs.writeFileSync(filePath, content);
    console.log('Fixed syntax error by moving useEffect safely inside the component.');
  } else {
    console.log('safeAnchor not found!');
  }
} else {
  console.log('print block not found!');
}
