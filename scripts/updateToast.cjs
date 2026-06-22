const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/global/helpers.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const newToastContainer = `export const ToastContainer = () => {
  const [toasts, setToasts] = React.useState([]);
  
  React.useEffect(() => {
    const handleUpdate = (newToasts) => {
      setToasts([...newToasts]);
    };
    // สมัครรับการแจ้งเตือน
    toastSubscribers.add(handleUpdate);
    setToasts([...globalToasts]);
    return () => {
      toastSubscribers.delete(handleUpdate);
    };
  }, []);
  
  // ใช้ createPortal เพื่อให้ Toast ลอยอยู่เหนือสุดของ DOM (z-index สูงสุด)
  return createPortal(
    <>
      <style>{\`
        @keyframes toastSlideDown {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastSlideUp {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        .toast-animate-in { 
            animation: toastSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
        }
        .toast-animate-out { 
            animation: toastSlideUp 0.3s ease-in forwards; 
        }
        .toast-wrapper-active {
            opacity: 1;
            transform: translateY(0);
            margin-bottom: 0.5rem;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toast-wrapper-closing {
            opacity: 0 !important;
            transform: translateY(-10px);
            margin-bottom: 0px !important;
            pointer-events: none;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      \`}</style>
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-[100000] w-max max-w-[90vw] sm:max-w-md flex flex-col pointer-events-none"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {toasts.map((t) => (
          <div 
            key={t.id}
            onClick={() => dismissGlobalToast(t.id)}
            className={\`pointer-events-auto cursor-pointer \${t.isClosing ? 'toast-wrapper-closing' : 'toast-wrapper-active'}\`}
          >
            <div 
              key={\`inner_\${t.id}\`}
              className={\`flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-full sm:rounded-2xl shadow-xl border text-white \${
                t.type === 'success' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-500/10' : 
                t.type === 'warning' ? 'bg-amber-600 border-amber-500 shadow-amber-500/10' : 
                'bg-rose-600 border-rose-500 shadow-rose-500/10'
              } \${t.isClosing ? 'toast-animate-out' : 'toast-animate-in'}\`}
            >
              {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : 
               t.type === 'warning' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : 
               <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
              <span className="font-medium kanit-text text-xs sm:text-sm leading-tight break-words">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </>,
    document.body
  );
};`;

const oldRegex = /export const ToastContainer = \(\) => \{[\s\S]*?document\.body\n  \);\n\};/m;
content = content.replace(oldRegex, newToastContainer);

fs.writeFileSync(filePath, content);
console.log("Replaced ToastContainer with new styling and logic");
