const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const filePath = path.join(projectDir, 'หลังบ้าน v.4 LINE.js');
let v4Content = fs.readFileSync(filePath, 'utf8');

const regex = /const LINE_ACCESS_TOKEN = "ใส่_LINE_CHANNEL_ACCESS_TOKEN_ที่นี่"; \/\/ ⚠️ ต้องใส่ Token ของ LINE OA/g;

const replacement = `// ⚠️ ดึง Token อัตโนมัติจากหน้าตั้งค่าของเว็บแอป (ชีต Settings)
function getLineToken() {
  const settings = getData('Settings').data || [];
  const tokenRecord = settings.find(s => s.id === 'integration_tokens');
  if (tokenRecord && tokenRecord.values && tokenRecord.values.line) {
    return tokenRecord.values.line;
  }
  return ""; 
}`;

v4Content = v4Content.replace(regex, replacement);

const regexFetch = /"Authorization": "Bearer " \+ LINE_ACCESS_TOKEN/g;
const replacementFetch = `"Authorization": "Bearer " + getLineToken()`;
v4Content = v4Content.replace(regexFetch, replacementFetch);

fs.writeFileSync(filePath, v4Content);
console.log('Updated v4 LINE.js to fetch token dynamically!');
