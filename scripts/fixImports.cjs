const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../src/pages');
const files = fs.readdirSync(pagesDir);

for (const file of files) {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // The problematic block is:
        // import { 
        // import { formatDate, ... } from '../global/helpers';
        //   POS_ICONS, 
        
        content = content.replace(
            /import \{\s*import \{ (.*?) \} from '\.\.\/global\/helpers';\s*POS_ICONS,/g,
            `import { $1 } from '../global/helpers';\nimport {\n  POS_ICONS,`
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
    }
}
console.log('Fixed imports in pages');
