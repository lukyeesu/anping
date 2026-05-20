const fs = require('fs');
const acorn = require('acorn');
try {
  const content = fs.readFileSync('src/utils/printTemplates.js', 'utf8');
  acorn.parse(content, {ecmaVersion: 2020, sourceType: 'module'});
  console.log('Syntax OK');
} catch (e) {
  console.error(e);
}
