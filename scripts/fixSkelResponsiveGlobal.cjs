const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, '../src/pages');

const filesToProcess = ['AppointmentManager.jsx', 'InventoryManager.jsx', 'StaffManager.jsx'];

const widthMap = {
    'w-12': 'w-full max-w-[48px]',
    'w-16': 'w-full max-w-[64px]',
    'w-20': 'w-full max-w-[80px]',
    'w-24': 'w-full max-w-[96px]',
    'w-28': 'w-full max-w-[112px]',
    'w-32': 'w-full max-w-[128px]',
    'w-40': 'w-full max-w-[160px]'
};

filesToProcess.forEach(file => {
    const filePath = path.join(pagesDir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    Object.keys(widthMap).forEach(oldW => {
        const newW = widthMap[oldW];
        // We look for 'h-something w-XX bg-slate-200 ... animate-pulse'
        // Using a simple replace all if it's inside an animate-pulse block
        // To be safe, we just replace `oldW` with `newW` only if the line contains `animate-pulse`
        
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('animate-pulse') && lines[i].includes(oldW)) {
                // Ensure we only replace the width class and not part of another class like 'sm:w-12'
                const regex = new RegExp(`\\b${oldW}\\b`, 'g');
                lines[i] = lines[i].replace(regex, newW);
                changed = true;
            }
        }
        content = lines.join('\n');
    });
    
    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated skeleton responsiveness in ${file}`);
    }
});
