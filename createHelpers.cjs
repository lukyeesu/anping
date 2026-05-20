const fs = require('fs');

const content = fs.readFileSync('src/utils/printTemplates.js', 'utf8');
const appContent = fs.readFileSync('src/App.jsx', 'utf8');

const printRecordMatch = appContent.match(/const handlePrintRecord = \(patient\) => \{([\s\S]*?)const html = `([\s\S]*?)`;\s*printWindow\.document\.write/);
const printOpdMatch = appContent.match(/const handlePrintOpdRecord = \(record, index\) => \{([\s\S]*?)const html = `([\s\S]*?)`;\s*printWindow\.document\.write/);
const printReceiptMatch = appContent.match(/const handlePrintReceipt = \(txn, format = 'A4'\) => \{([\s\S]*?)const html = format === 'A4' \? `([\s\S]*?)` : `([\s\S]*?)`;\s*printWindow\.document\.write/);


let finalHelpers = `import { getAgeString, formatCurrencyPrint, bahtText } from './utils'; // we'll embed them here instead for simplicity

export const getAgeString = (dobStr) => {
  if (!dobStr || dobStr.length < 10) return '-';
  const parts = dobStr.split('/');
  if (parts.length === 3) {
    const dobDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (isNaN(dobDate.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - dobDate.getFullYear();
    let months = now.getMonth() - dobDate.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < dobDate.getDate())) { years--; months += 12; }
    return \`\${years} ปี \${months} เดือน\`;
  }
  return '-';
};

export const formatCurrencyPrint = (amount) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

export const bahtText = (amount) => {
    if (!amount || amount === 0) return 'ศูนย์บาทถ้วน';
    const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    let numberStr = Math.abs(amount).toFixed(2).toString();
    let [integerPart, fractionalPart] = numberStr.split('.');
    const convertToText = (str) => {
        let text = '';
        for (let i = 0; i < str.length; i++) {
            let n = parseInt(str[i]);
            let pos = str.length - i - 1;
            if (n === 0) continue;
            if (n === 1 && pos === 0 && str.length > 1 && str[i-1] !== '0') text += 'เอ็ด';
            else if (n === 2 && pos === 1) text += 'ยี่สิบ';
            else if (n === 1 && pos === 1) text += 'สิบ';
            else text += numbers[n] + positions[pos];
        }
        return text;
    };
    let result = convertToText(integerPart) + 'บาท';
    if (fractionalPart === '00') result += 'ถ้วน';
    else result += convertToText(fractionalPart) + 'สตางค์';
    return result;
};

`;

if (printRecordMatch) {
    let logic = printRecordMatch[1].replace(/const printWindow[\s\S]*?return;\s*\}/, '');
    let html = printRecordMatch[2];
    
    finalHelpers += `export const generatePatientRecordHtml = (patient) => {
${logic}
    return \`${html}\`;
};\n\n`;
}

if (printOpdMatch) {
    let logic = printOpdMatch[1].replace(/const printWindow[\s\S]*?return;\s*\}/, '');
    let html = printOpdMatch[2];
    
    finalHelpers += `export const generateOpdRecordHtml = (formData, record, visitNumber) => {
${logic.replace(/const visitNumber =.*?;\n/, '')}
    return \`${html}\`;
};\n\n`;
}

if (printReceiptMatch) {
    let logic = printReceiptMatch[1].replace(/const printWindow[\s\S]*?return;\s*\}/, '');
    let htmlA4 = printReceiptMatch[2];
    let html80 = printReceiptMatch[3];
    
    finalHelpers += `export const generateReceiptHtml = (txn, format = 'A4', patientsData = [], posProducts = []) => {
${logic}
    return format === 'A4' ? \`${htmlA4}\` : \`${html80}\`;
};\n\n`;
}

fs.writeFileSync('src/utils/printTemplates.js', finalHelpers.replace("import { getAgeString, formatCurrencyPrint, bahtText } from './utils'; // we'll embed them here instead for simplicity", ""));
console.log('Helpers properly written with logic!');
