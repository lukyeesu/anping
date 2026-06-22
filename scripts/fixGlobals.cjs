const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const pagesDir = path.join(srcDir, 'pages');

const fixFile = (filePath, isApp) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split(/\r?\n/);

    const helpersImport = isApp ? "'./global/helpers'" : "'../global/helpers'";
    const constantsImport = isApp ? "'./global/constants'" : "'../global/constants'";

    if (content.includes('triggerGlobalToast') && !content.includes('triggerGlobalToast }')) {
        lines.splice(2, 0, "import { triggerGlobalToast } from " + helpersImport + ";");
    }
    
    if (content.includes('ToastContainer') && !content.includes('ToastContainer }')) {
        lines.splice(2, 0, "import { ToastContainer } from " + helpersImport + ";");
    }

    const constsToImport = [];
    const checkConst = (name) => {
        if (content.includes(name) && !content.includes(name + ' }')) constsToImport.push(name);
    };

    checkConst('systemStatusTypes');
    checkConst('colorPresets');
    checkConst('EMPTY_ARRAY');
    checkConst('POS_ICONS');
    checkConst('GOOGLE_SCRIPT_URL');
    checkConst('LOCAL_VISION_API_KEY');
    checkConst('monthsTH');
    checkConst('monthsShortTH');
    checkConst('daysTH');
    checkConst('daysShortTH');
    
    if (constsToImport.length > 0) {
        lines.splice(2, 0, "import { " + constsToImport.join(', ') + " } from " + constantsImport + ";");
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
};

const appJsxPath = path.join(srcDir, 'App.jsx');
fixFile(appJsxPath, true);

const files = fs.readdirSync(pagesDir);
files.forEach(f => {
    if (f.endsWith('.jsx')) fixFile(path.join(pagesDir, f), false);
});
console.log('Fixed missing globals imports');
