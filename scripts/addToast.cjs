const fs = require('fs');
const path = require('path');

const helpersPath = path.join(__dirname, '../src/global/helpers.jsx');
let content = fs.readFileSync(helpersPath, 'utf8');
let lines = content.split(/\r?\n/);

if (content.includes('export const ToastContainer =')) {
    let s = content.indexOf('export const ToastContainer =');
    let e = content.indexOf('};', s);
    // Find the NEXT }; to be safe? No, just let it append if we already cleared it.
    // Wait, since cleanupApp.cjs removes ToastContainer from App.jsx,
    // extractHelpers.cjs will NOT extract it. So it won't exist!
}

if (!content.includes('const toastSubscribers = new Set()')) {
    // Inject imports at line 2
    if (!content.includes('import { createPortal }')) {
        lines.splice(1, 0, "import { createPortal } from 'react-dom';");
    }
    if (!content.includes('CheckCircle2, AlertTriangle, AlertCircle')) {
        lines.splice(1, 0, "import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';");
    }

    const toastCode = `
export const toastSubscribers = new Set();
export let globalToasts = [];

export const triggerGlobalToast = (message, type = 'success') => {
  const id = 'toast_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const newToast = { id, message, type, isClosing: false };
  
  if (globalToasts.length >= 4) {
    globalToasts[0] = { ...globalToasts[0], isClosing: true };
  }
  globalToasts = [...globalToasts, newToast];
  
  toastSubscribers.forEach(callback => callback(globalToasts));
  
  setTimeout(() => {
    globalToasts = globalToasts.map(t => t.id === id ? { ...t, isClosing: true } : t);
    toastSubscribers.forEach(callback => callback(globalToasts));
    
    setTimeout(() => {
      globalToasts = globalToasts.filter(t => t.id !== id);
      toastSubscribers.forEach(callback => callback(globalToasts));
    }, 300);
  }, 3000);
};

export const dismissGlobalToast = (id) => {
  globalToasts = globalToasts.map(t => t.id === id ? { ...t, isClosing: true } : t);
  toastSubscribers.forEach(callback => callback(globalToasts));
  
  setTimeout(() => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    toastSubscribers.forEach(callback => callback(globalToasts));
  }, 300);
};

export const ToastContainer = () => {
  const [toasts, setToasts] = React.useState([]);
  
  React.useEffect(() => {
    const handleToastChange = (newToasts) => {
      setToasts([...newToasts]);
    };
    
    toastSubscribers.add(handleToastChange);
    return () => {
      toastSubscribers.delete(handleToastChange);
    };
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={\`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-white
            transition-all duration-300 transform
            \${toast.isClosing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
            \${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 
              toast.type === 'error' ? 'bg-rose-600 border-rose-500' : 
              'bg-blue-600 border-blue-500'}
          \`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-white" /> :
           toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-white" /> :
           <AlertTriangle className="w-5 h-5 text-white" />}
          
          <p className="font-medium text-sm pr-6">{toast.message}</p>
          
          <button 
            onClick={() => dismissGlobalToast(toast.id)}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
};
`;
    lines.push(toastCode);
    fs.writeFileSync(helpersPath, lines.join('\n'), 'utf8');
}
