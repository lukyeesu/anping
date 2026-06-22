const fs = require('fs');
const p = 'src/App.jsx';
let content = fs.readFileSync(p, 'utf8');

const s = `      if (combinedParam && !printOpdHn) {
        if (combinedParam.includes('_')) {
           const parts = combinedParam.split('_');
           printOpdHn = parts[0];
           if (parts.length >= 2 && /^\\d{4}$/.test(parts[1])) {
             printOpdId4 = parts[1];
             printOpdDate = parts.slice(2).join('_');
           } else {
             printOpdDate = parts.slice(1).join('_');
           }
        } else {
           printOpdHn = combinedParam;
        }
      }`;

const r = `      if (combinedParam && !printOpdHn) {
        if (combinedParam.includes('_')) {
           const parts = combinedParam.split('_');
           printOpdHn = parts[0];
           if (parts.length >= 2 && /^\\d{4}$/.test(parts[1])) {
             printOpdId4 = parts[1];
             printOpdDate = parts.slice(2).join('_');
           } else {
             printOpdDate = parts.slice(1).join('_');
           }
        } else {
           const matchDate = combinedParam.match(/(\\d{4})(\\d{14})$/);
           const matchNoDate = combinedParam.match(/(\\d{4})$/);
           if (matchDate) {
                printOpdHn = combinedParam.slice(0, -18);
                printOpdId4 = matchDate[1];
                const dstr = matchDate[2];
                printOpdDate = \`\${dstr.slice(0,4)}-\${dstr.slice(4,6)}-\${dstr.slice(6,8)}T\${dstr.slice(8,10)}:\${dstr.slice(10,12)}:\${dstr.slice(12,14)}\`;
           } else if (matchNoDate) {
                printOpdHn = combinedParam.slice(0, -4);
                printOpdId4 = matchNoDate[1];
           } else {
                printOpdHn = combinedParam;
           }
        }
      }`;

content = content.replace(s, r);
fs.writeFileSync(p, content, 'utf8');
console.log('App.jsx parsed continuous string');
