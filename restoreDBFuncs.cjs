const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const files = fs.readdirSync(projectDir);
const v3File = files.find(f => f.includes('v.3'));
const v5File = files.find(f => f.includes('v.5 LINE.js'));

if (v3File && v5File) {
  const v3Content = fs.readFileSync(path.join(projectDir, v3File), 'utf8');
  let v5Content = fs.readFileSync(path.join(projectDir, v5File), 'utf8');

  // Extract everything from initSheet to the end
  const splitIndex = v3Content.indexOf('// สร้างชีตและหัวคอลัมน์ให้อัตโนมัติ');
  if (splitIndex !== -1) {
    const dbFunctions = v3Content.substring(splitIndex);
    
    // Check if v5 already has them
    if (!v5Content.includes('function initSheet')) {
      v5Content = v5Content + '\n\n' + dbFunctions;
      fs.writeFileSync(path.join(projectDir, v5File), v5Content);
      console.log('Restored missing database functions to v.5 successfully!');
    } else {
      console.log('Functions already exist in v.5');
    }
  } else {
    console.log('Could not find split point in v.3');
  }
} else {
  console.log('Could not find v.3 or v.5 files');
}
