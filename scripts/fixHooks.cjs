const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const pdpaBlock = `  if (pdpaToken && pdpaHn) {
      return <PdpaConsentForm token={pdpaToken} hn={pdpaHn} />;
  }`;

// Remove pdpaBlock from its current location
content = content.replace(pdpaBlock, '');

// Insert it right before the login check
const loginCheckBlock = `  if (!isLoggedIn || isGlobalLoading) {`;
content = content.replace(loginCheckBlock, pdpaBlock + '\n\n' + loginCheckBlock);

fs.writeFileSync(filePath, content);
console.log('Fixed Rules of Hooks by moving early return');
