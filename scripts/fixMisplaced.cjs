const fs = require('fs');
const path = require('path');
const d = path.join(__dirname, '../src', 'pages');

fs.readdirSync(d).forEach(f => {
    if (!f.endsWith('.jsx')) return;
    let p = path.join(d, f);
    let lines = fs.readFileSync(p, 'utf8').split('\n');
    let toMove = [];
    
    lines = lines.filter(l => {
        if (l.match(/^import [A-Z][a-zA-Z0-9]* from ['"].\/[A-Z][a-zA-Z0-9]*['"];/)) {
            toMove.push(l);
            return false;
        }
        return true;
    });
    
    if (toMove.length > 0) {
        lines.splice(2, 0, ...toMove);
        fs.writeFileSync(p, lines.join('\n'));
    }
});
console.log('Done');
