const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('print_opd_hn')) {
  const insertCode = `
  // --- Auto Print OPD from URL (LINE Webhook) ---
  useEffect(() => {
    if (patientsData.length > 0 && !window.__autoPrintDone) {
      const printOpdHn = urlParams.get('print_opd_hn');
      const printOpdDate = urlParams.get('print_opd_date'); // ISO string date 
      
      if (printOpdHn) {
        window.__autoPrintDone = true; // prevent loop
        const patient = patientsData.find(p => p.hn === printOpdHn || p.id === printOpdHn);
        if (patient) {
          let targetRecord = null;
          let visitNumber = 1;
          
          if (patient.opdRecords && patient.opdRecords.length > 0) {
            // Find record matching the appointment date closely
            if (printOpdDate) {
               const targetDate = new Date(printOpdDate).toLocaleDateString('th-TH');
               const idx = patient.opdRecords.findIndex(r => {
                  try {
                    const rDateStr = new Date(r.date || r.createdAt).toLocaleDateString('th-TH');
                    return rDateStr === targetDate;
                  } catch(e) { return false; }
               });
               
               if (idx !== -1) {
                 targetRecord = patient.opdRecords[idx];
                 visitNumber = patient.opdRecords.length - idx;
               }
            }
            if (!targetRecord) {
                 targetRecord = patient.opdRecords[0]; // fallback to latest
                 visitNumber = patient.opdRecords.length;
            }
          }
          
          if (!targetRecord) {
             targetRecord = { date: printOpdDate || new Date().toISOString() };
             visitNumber = 1;
          }
          
          const html = globalGenerateOpdHtml(patient, targetRecord, visitNumber, branchesData, currentBranch);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 800);
          }
        }
      }
    }
  }, [patientsData, branchesData, currentBranch]);
`;

  // Find a good place to insert, like after 'useEffect(() => {' for fetchQueueForMonth
  // Better yet, just find 'const [isGlobalLoading' and insert it somewhere after the useState declarations.
  const anchor = 'const [isGlobalLoading, setIsGlobalLoading] = useState(true);';
  content = content.replace(anchor, anchor + '\n' + insertCode);
  fs.writeFileSync(filePath, content);
  console.log('Injected auto-print logic into App.jsx');
} else {
  console.log('Auto-print logic already exists');
}
