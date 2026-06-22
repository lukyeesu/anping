const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');

let s1 = c.indexOf('const POS_ICONS = {');
if (s1 > -1) {
    let e1 = c.indexOf('};', s1) + 2;
    c = c.slice(0, s1) + c.slice(e1);
}

c = c.replace('const GOOGLE_SCRIPT_URL = "/api/db";', '');
c = c.replace('const LOCAL_VISION_API_KEY = null;', '');

let s2 = c.indexOf('// --- เพิ่มตัวแปร Global สำหรับชื่อเดือนภาษาไทย ---');
if (s2 > -1) {
    let e2 = c.indexOf('// --- สิ้นสุดการเพิ่มตัวแปร ---', s2);
    if (e2 > -1) {
        c = c.slice(0, s2) + c.slice(e2 + 33);
    } else {
        // Fallback
        c = c.replace(/const monthsTH = \[.*?\];/s, '');
        c = c.replace(/const monthsShortTH = \[.*?\];/s, '');
        c = c.replace(/const daysTH = \[.*?\];/s, '');
        c = c.replace(/const daysShortTH = \[.*?\];/s, '');
    }
}

let s3 = c.indexOf('const systemStatusTypes = [');
if (s3 > -1) {
    let e3 = c.indexOf('];', s3) + 2;
    c = c.slice(0, s3) + c.slice(e3);
}

let s4 = c.indexOf('const colorPresets = [');
if (s4 > -1) {
    let e4 = c.indexOf('];', s4) + 2;
    c = c.slice(0, s4) + c.slice(e4);
}

c = c.replace('const EMPTY_ARRAY = [];', '');

let s5 = c.indexOf('export const triggerGlobalToast =');
if (s5 > -1) {
    let e5 = c.indexOf('// --- [NEW] Restore Mock Data');
    if (e5 > -1) {
        c = c.slice(0, s5) + c.slice(e5);
    }
}

let s6 = c.indexOf('let globalToasts = [];');
if (s6 > -1) {
    let e6 = c.indexOf('export const triggerGlobalToast =');
    if (e6 > -1) {
        c = c.slice(0, s6) + c.slice(e6);
    }
}

let s7 = c.indexOf('const ToastContainer = () => {');
if (s7 > -1) {
    let e7 = c.indexOf('const getDynamicTextSize = (valStr) => {');
    if (e7 > -1) {
        c = c.slice(0, s7) + c.slice(e7);
    }
}

fs.writeFileSync('src/App.jsx', c);
console.log('App cleanup done');
