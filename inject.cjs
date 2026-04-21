const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');
const catalogStr = fs.readFileSync('catalog.txt', 'utf8');

// Inject CatalogManager component before BranchManager
if (!code.includes('const CatalogManager =')) {
    code = code.replace('// --- ระบบจัดการสาขา (Branch Manager) ---', catalogStr + '\n// --- ระบบจัดการสาขา (Branch Manager) ---');
}

// Update Tab Rendering
if (!code.includes("currentTab === 'catalog'")) {
    const catalogRender = `            <div style={{ display: currentTab === 'catalog' ? 'block' : 'none' }} className="w-full h-full bg-[#f8fafc]">
                <CatalogManager products={posProducts} setProducts={setPosProducts} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} />
            </div>\n`;
    code = code.replace('<div style={{ display: currentTab === \'pos\' ? \'flex\' : \'none\' }} className="flex-1 w-full relative">', catalogRender + '<div style={{ display: currentTab === \'pos\' ? \'flex\' : \'none\' }} className="flex-1 w-full relative">');
}

fs.writeFileSync('src/App.jsx', code);
