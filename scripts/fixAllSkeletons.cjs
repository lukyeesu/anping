const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, '../src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const twMap = {
    '1': 4, '1.5': 6, '2': 8, '2.5': 10, '3': 12, '3.5': 14, '4': 16, '5': 20, 
    '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '11': 44, '12': 48, '14': 56, 
    '16': 64, '20': 80, '24': 96, '28': 112, '32': 128, '36': 144, '40': 160, 
    '44': 176, '48': 192, '52': 208, '56': 224, '60': 240, '64': 256, '72': 288, 
    '80': 320, '96': 384
};

files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Split by lines to only process lines with animate-pulse
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('animate-pulse') && !lines[i].includes('max-w-[')) {
            // Find all w-\d+(\.\d+)? classes
            lines[i] = lines[i].replace(/\bw-(\d+(?:\.\d+)?)\b/g, (match, p1) => {
                if (twMap[p1]) {
                    changed = true;
                    return `w-full max-w-[${twMap[p1]}px]`;
                }
                return match;
            });
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Updated all skeletons in ${file}`);
    }
});
