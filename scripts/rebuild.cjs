const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    // 1. Restore App.jsx from git
    console.log('Restoring App.jsx from git...');
    execSync('git checkout HEAD src/App.jsx', { stdio: 'inherit' });
    
    // 2. Clear pages directory
    const pagesDir = path.join(__dirname, '../src/pages');
    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
    } else {
        fs.readdirSync(pagesDir).forEach(f => {
            if (f.endsWith('.jsx')) fs.unlinkSync(path.join(pagesDir, f));
        });
    }

    // 3. Clear helpers.jsx
    const helpersPath = path.join(__dirname, '../src/global/helpers.jsx');
    if (fs.existsSync(helpersPath)) {
        fs.unlinkSync(helpersPath);
    }
    
    // 4. Run scripts
    console.log('Running splitAll.cjs...');
    execSync('node scripts/splitAll.cjs', { stdio: 'inherit' });
    
    console.log('Running cleanupApp.cjs...');
    execSync('node scripts/cleanupApp.cjs', { stdio: 'inherit' });
    
    console.log('Running extractHelpers.cjs...');
    execSync('node scripts/extractHelpers.cjs', { stdio: 'inherit' });
    
    console.log('Running addToast.cjs...');
    execSync('node scripts/addToast.cjs', { stdio: 'inherit' });
    
    console.log('Running fixCrossImports.cjs...');
    execSync('node scripts/fixCrossImports.cjs', { stdio: 'inherit' });
    
    console.log('Running fixGlobals.cjs...');
    execSync('node scripts/fixGlobals.cjs', { stdio: 'inherit' });
    
    console.log('Running fixMisplaced.cjs...');
    execSync('node scripts/fixMisplaced.cjs', { stdio: 'inherit' });

    console.log('Build...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('ALL DONE AND PERFECT!');
} catch (e) {
    console.error('Error during rebuild:', e.message);
}
