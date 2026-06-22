const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/global/helpers.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldUseModalRegex = /export const useModal = \(onClosedCallback\) => \{[\s\S]*?return \{ isOpen, isClosing, open, close, setIsOpen \};\n\};/m;

const newUseModal = `export const useModal = (onClosedCallback) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const id = useRef('modal_' + Date.now() + '_' + Math.floor(Math.random() * 1000)).current;

    const internalClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            if (onClosedCallback) onClosedCallback();
        }, 350); 
    };

    const open = () => {
        setIsOpen(true);
        setIsClosing(false);
        window.history.pushState({ modal: id }, '');
    };

    const close = () => {
        if (!isOpen) return;
        if (window.history.state && window.history.state.modal === id) {
            window.history.back();
        } else {
            internalClose();
        }
    };

    useEffect(() => {
        const handlePopState = () => {
            if (isOpen) {
                if (!window.history.state || window.history.state.modal !== id) {
                    internalClose();
                }
            }
        };

        if (isOpen) {
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen]);

    const setIsOpenWrapper = (val) => {
        if (val) {
            if (!isOpen) open();
        } else {
            if (isOpen) close();
        }
    };

    return { isOpen, isClosing, open, close, setIsOpen: setIsOpenWrapper };
};`;

content = content.replace(oldUseModalRegex, newUseModal);

fs.writeFileSync(filePath, content);
console.log("Updated useModal with popstate history tracking!");
