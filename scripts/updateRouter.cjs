const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports for react-router-dom
if (!content.includes('react-router-dom')) {
  content = content.replace(
    /import React,[^\n]+;/,
    "$& \nimport { useLocation, useNavigate } from 'react-router-dom';"
  );
}

// 2. Replace the currentTab useState and useEffect block with react-router logic
const oldStateBlock = `  const [currentTab, setCurrentTab] = useState(() => {
    // เช็คว่าทำงานบน Browser และมี localStorage ให้ใช้
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTab = localStorage.getItem('clinic_currentTab');
      if (savedTab) {
        // ถ้าหน้าล่าสุดก่อนรีเฟรชคือ 'settings' ให้กลับไป 'dashboard'
        return savedTab === 'settings' ? 'dashboard' : savedTab;
      }
    }
    return 'dashboard'; // ค่าเริ่มต้น
  });

  // บันทึก currentTab ลง localStorage เมื่อมีการเปลี่ยนหน้า (ยกเว้น settings)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('clinic_currentTab', currentTab);
    }
  }, [currentTab]);`;

const newRouterBlock = `  const location = useLocation();
  const navigate = useNavigate();

  const pathToTab = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/exec_dashboard': 'exec_dashboard',
    '/records': 'records',
    '/queue': 'queue',
    '/catalog': 'catalog',
    '/pos': 'pos',
    '/finance': 'finance',
    '/inventory': 'inventory',
    '/staff': 'staff',
    '/branch': 'branch',
    '/reports': 'reports',
    '/settings': 'settings',
    '/profile': 'profile'
  };

  const currentTab = pathToTab[location.pathname] || 'dashboard';

  const setCurrentTab = (tabId) => {
    const path = '/' + (tabId === 'dashboard' ? '' : tabId);
    navigate(path);
  };`;

content = content.replace(oldStateBlock, newRouterBlock);

fs.writeFileSync(filePath, content);
console.log('Successfully updated App.jsx to use react-router-dom');
