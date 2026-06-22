const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const pagesDir = path.join(srcDir, 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
const components = files.map(f => f.replace('.jsx', ''));

for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const pageLines = content.split(/\r?\n/);
    
    const componentName = file.replace('.jsx', '');

    let needsCreatePortal = false;
    if (content.includes('createPortal') && !content.includes('import { createPortal }')) {
        needsCreatePortal = true;
    }

    if (needsCreatePortal) {
        pageLines.splice(2, 0, "import { createPortal } from 'react-dom';");
    }

    // Check for other components used in this file
    const importsToAdd = [];
    for (const comp of components) {
        if (comp !== componentName) {
            // Very basic heuristic: if it appears in the code, it's probably used as a component
            // To be safer, we check for `<ComponentName` or `ComponentName(` or `[ComponentName]` etc.
            // A simple regex: a non-alphanumeric char followed by ComponentName followed by a non-alphanumeric char
            if (content.includes(` ${comp}`) || content.includes(`<${comp}`) || content.includes(`${comp}(`) || content.includes(`[${comp}]`) || content.includes(`{${comp}}`)) {
                // Check if not already imported
                if (!content.includes(`import ${comp} from './${comp}'`)) {
                    importsToAdd.push(comp);
                }
            }
        }
    }

    for (const comp of importsToAdd) {
        pageLines.splice(2, 0, `import ${comp} from './${comp}';`);
    }

    if (needsCreatePortal || importsToAdd.length > 0) {
        fs.writeFileSync(filePath, pageLines.join('\n'), 'utf8');
    }
}
console.log('Fixed cross-component imports');
