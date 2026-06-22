const fs = require('fs');
const path = require('path');

const filesToProcess = ['FinancePage.jsx', 'FinanceTableSection.jsx'];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '../src/pages', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace <Skeleton width="X" height="Y" [className="..."] [rounded="..."] [circle] />
  // We need a complex regex to match the attributes, or we can just parse it loosely.
  
  // Since JSX can be tricky, let's just do a string replacement for the most common ones.
  // Actually, we can use a regex that captures all attributes.
  const skelRegex = /<Skeleton\s+([^>]+)\/>/g;
  
  content = content.replace(skelRegex, (match, attrs) => {
    changed = true;
    let width = '';
    let height = '';
    let className = '';
    let rounded = 'rounded-xl';
    let circle = false;

    // extract width
    let wMatch = attrs.match(/width="([^"]+)"/);
    if (wMatch) width = wMatch[1];

    // extract height
    let hMatch = attrs.match(/height="([^"]+)"/);
    if (hMatch) height = hMatch[1];

    // extract className
    let cMatch = attrs.match(/className="([^"]+)"/);
    if (cMatch) className = cMatch[1];

    // extract rounded
    let rMatch = attrs.match(/rounded="([^"]+)"/);
    if (rMatch) rounded = rMatch[1];

    // extract circle
    if (attrs.includes('circle')) {
        circle = true;
        rounded = 'rounded-full';
    }

    // Build the div
    let cls = `w-full max-w-[${width}] h-[${height}] bg-slate-200 animate-pulse ${rounded}`;
    if (className) cls += ` ${className}`;

    // Clean up spaces
    cls = cls.replace(/\s+/g, ' ').trim();

    // Since we can't use arbitrary h-[Xpx] if we don't have tailwind JIT sometimes?
    // Wait, Anping Clinic uses Tailwind JIT (h-[16px] is valid).
    // Let's use it.
    
    return `<div className="${cls}"></div>`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Replaced Skeletons with raw divs in ${file}`);
  }
});
