const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, '../src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const badRegex = /w-full max-w-\[(\d+)(?:\.\d+)?px\](\/\d+)/g;
  content = content.replace(badRegex, (match, p1, p2) => {
    const twVal = parseInt(p1) / 4;
    changed = true;
    return 'w-' + twVal + p2;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed fractions in ' + file);
  }
});
