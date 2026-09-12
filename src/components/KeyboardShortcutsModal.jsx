import React, { useEffect } from 'react';
import { 
  Keyboard, X, Sparkles 
} from 'lucide-react';

const SHORTCUT_GROUPS = [
  {
    title: 'การค้นหาและการควบคุมหน้าต่าง',
    items: [
      {
        keys: ['Esc'],
        title: 'ปิด Modal / ล้างข้อความค้นหา',
        desc: 'กดครั้งแรกเพื่อล้างข้อความในช่องค้นหา หรือกดเพื่อปิดหน้าต่างป๊อปอัป / Modal ที่เปิดอยู่'
      },
      {
        keys: ['Ctrl', 'K'],
        altKeys: ['/'],
        title: 'ค้นหาด่วน (Quick Search)',
        desc: 'โฟกัสไปยังช่องค้นหาของหน้าปัจจุบันทันที เพื่อพิมพ์ค้นหาต่อได้เลย'
      },
      {
        keys: ['Enter'],
        title: 'บันทึก / ยืนยันข้อมูล',
        desc: 'กดบันทึกข้อมูลใน Modal หรือฟอร์มปัจจุบัน (ยกเว้นขณะพิมพ์ในช่องหมายเหตุหรือข้อความยาว)'
      }
    ]
  },
  {
    title: 'การจัดการข้อมูลและทำงานด่วน',
    items: [
      {
        keys: ['Alt', 'S'],
        title: 'บันทึกข้อมูลทันที (Save)',
        desc: 'สั่งกดปุ่มบันทึกของฟอร์มหรือการตั้งค่าปัจจุบันทันที โดยไม่ต้องเลื่อนหาปุ่ม'
      },
      {
        keys: ['Alt', 'N'],
        altKeys: ['F2'],
        title: 'เพิ่มรายการใหม่ด่วน (New Item)',
        desc: 'กดปุ่มเพิ่มนัดหมายใหม่, ลงทะเบียนคนไข้, เพิ่มสินค้า หรือบันทึกรายรับ-จ่าย ตามหน้าที่เปิดอยู่'
      }
    ]
  },
  {
    title: 'คู่มือและความช่วยเหลือ',
    items: [
      {
        keys: ['Shift', '?'],
        altKeys: ['Ctrl', '/'],
        title: 'เปิดหน้าต่างคีย์ลัดนี้',
        desc: 'เปิดหรือปิดหน้าต่างดูรายการแป้นพิมพ์ลัดทั้งหมดในระบบ'
      }
    ]
  }
];

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Keyboard size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800 kanit-text flex items-center gap-2">
                แป้นพิมพ์ลัด (Keyboard Shortcuts)
                <Sparkles size={16} className="text-amber-500 hidden sm:inline" />
              </h3>
              <p className="text-xs text-slate-500 kanit-text">
                ทำงานสะดวกรวดเร็วโดยไม่ต้องเอื้อมมือไปจับเมาส์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-left">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2.5">
              <div className="text-xs font-bold text-sky-600 kanit-text tracking-wide uppercase">
                {group.title}
              </div>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 kanit-text">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 kanit-text mt-0.5 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-black text-slate-700 shadow-2xs">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-slate-300 text-xs font-bold">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {item.altKeys && (
                        <>
                          <span className="text-slate-300 text-xs px-0.5">หรือ</span>
                          <div className="flex items-center gap-1">
                            {item.altKeys.map((k, kIdx) => (
                              <kbd key={kIdx} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-black text-slate-700 shadow-2xs">
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 kanit-text shrink-0">
          <span>💡 กด <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono font-bold text-slate-700">Esc</kbd> เพื่อปิดหน้านี้</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-xs"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
