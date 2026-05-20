const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

const getAgeStringCode = `export const getAgeString = (dobStr) => {
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
};`;

const bahtTextCode = `export const bahtText = (amount) => {
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
};`;

const formatCurrencyPrintCode = `export const formatCurrencyPrint = (amount) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);`;

const printRecordMatch = content.match(/const handlePrintRecord = \(patient\) => \{[\s\S]*?(const html = `[\s\S]*?`);\s*printWindow\.document\.write/);
const printOpdMatch = content.match(/const handlePrintOpdRecord = \(record, index\) => \{[\s\S]*?(const html = `[\s\S]*?`);\s*printWindow\.document\.write/);
const printReceiptMatch = content.match(/const handlePrintReceipt = \(txn, format = 'A4'\) => \{[\s\S]*?(const html = format === 'A4' \? `[\s\S]*?`;)\s*printWindow\.document\.write/);

let templatesCode = getAgeStringCode + '\n\n' + bahtTextCode + '\n\n' + formatCurrencyPrintCode + '\n\n';

if (printRecordMatch) {
    const htmlBody = printRecordMatch[1].substring(13, printRecordMatch[1].length - 2); // extract inside string
    templatesCode += `export const generatePatientRecordHtml = (patient, hnNumberOnly, regDateStr, ageStr, phone) => {
    return \`${htmlBody}\`;
};\n\n`;
}

if (printOpdMatch) {
    const htmlBody = printOpdMatch[1].substring(13, printOpdMatch[1].length - 2);
    templatesCode += `export const generateOpdRecordHtml = (formData, record, visitNumber, hnNumberOnly, dateStr, fullName, calculatedAge, phoneStr, addressStr, tcmItemsRow1, tcmItemsRow2, renderCheckbox) => {
    return \`${htmlBody}\`;
};\n\n`;
}

if (printReceiptMatch) {
    const htmlBody = printReceiptMatch[1].substring(13, printReceiptMatch[1].length - 1);
    templatesCode += `export const generateReceiptHtml = (txn, format, clinicName, clinicAddress, clinicPhone, taxId, receiptNo, dateStr, customerName, customerHN, customerAddress, customerTaxId, customerPhone, cashierName, itemsHtml, subtotal, discountAmount, taxMode, vatRate, vatAmount, grandTotal, paymentMethodThai, priceExcludingVat, afterDiscount, hasVatableItems) => {
    return ${htmlBody};
};\n\n`;
}

fs.writeFileSync('src/utils/printTemplates.js', templatesCode);
console.log('Successfully wrote templates based on original source.');
