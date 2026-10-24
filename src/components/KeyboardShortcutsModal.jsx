import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Download, Smartphone, Laptop, CreditCard, Users, 
  Stethoscope, Receipt, Package, Calendar, Keyboard, X, Sparkles, 
  CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, Eye, RefreshCw
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
        title: 'เปิดหน้าต่างคู่มือนี้',
        desc: 'เปิดหรือปิดหน้าต่างคู่มือการใช้งานและแป้นพิมพ์ลัดของระบบ'
      }
    ]
  }
];

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('downloads'); // 'downloads', 'smartcard', 'features', 'shortcuts'

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
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800 kanit-text flex items-center gap-2">
                คู่มือการใช้ & ดาวน์โหลดแอปคลินิก
                <Sparkles size={16} className="text-amber-500 hidden sm:inline" />
              </h3>
              <p className="text-xs text-slate-500 kanit-text">
                อันผิงคลินิก (Anping Clinic) - วิธีใช้งานและดาวน์โหลดแอปพลิเคชัน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-4 sm:px-6 gap-1 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('downloads')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'downloads'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download size={15} />
            <span>ดาวน์โหลดแอป</span>
          </button>

          <button
            onClick={() => setActiveTab('smartcard')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'smartcard'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={15} />
            <span>เครื่องอ่านบัตรประชาชน</span>
          </button>

          <button
            onClick={() => setActiveTab('features')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'features'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope size={15} />
            <span>ระบบงานคลินิก</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Keyboard size={15} />
            <span>แป้นพิมพ์ลัด</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 text-left space-y-6">
          
          {/* TAB 1: DOWNLOADS */}
          {activeTab === 'downloads' && (
            <div className="space-y-5">
              <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="text-sky-600 shrink-0 mt-0.5" size={20} />
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed kanit-text">
                  <span className="font-bold text-sky-900 block mb-0.5">ติดตั้งง่าย ปลอดภัย และอัปเดตอัตโนมัติ</span>
                  เลือกติดตั้งแอปพลิเคชันให้เหมาะกับการใช้งานของคุณ ทั้งแบบแอปเต็มหน้าจอ และแบบตัวกลางสำหรับเว็บเบราว์เซอร์
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Card A: AnpingClinic.apk */}
                <div className="rounded-2xl border-2 border-sky-500/30 bg-gradient-to-b from-sky-50/40 to-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-sky-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider">
                    แนะนำ
                  </div>
                  <div>
                    <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 mb-3.5">
                      <Smartphone size={22} />
                    </div>
                    <h4 className="font-bold text-base text-slate-900 kanit-text flex items-center gap-1.5">
                      AnpingClinic
                      <span className="text-[11px] font-normal text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full font-mono">v1.5.1</span>
                    </h4>
                    <p className="text-xs text-slate-500 font-medium kanit-text mt-1">
                      แอปพลิเคชันเต็มรูปแบบ (All-in-One)
                    </p>
                    <ul className="text-xs text-slate-600 kanit-text space-y-1.5 mt-3.5">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>รันเต็มจอ ไร้แถบเบราว์เซอร์ ลื่นไหล 60FPS</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>มีระบบอ่านบัตรประชาชนในตัว เสียบสายอ่านได้ทันที</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>กล้องสแกนความเร็วสูง (Native Camera)</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>รองรับการอัปเดตเวอร์ชันใหม่อัตโนมัติในตัว</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <a
                      href="/AnpingClinic.apk"
                      download="AnpingClinic.apk"
                      className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs sm:text-sm kanit-text flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/20 hover:-translate-y-0.5"
                    >
                      <Download size={16} />
                      <span>ดาวน์โหลด AnpingClinic.apk</span>
                    </a>
                    <span className="block text-center text-[11px] text-slate-400 mt-1.5 font-medium">
                      ขนาดประมาณ 6.34 MB • สำหรับแท็บเล็ต/มือถือ Android
                    </span>
                  </div>
                </div>

                {/* Card B: anping-card-agent.apk */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 mb-3.5">
                      <CreditCard size={22} />
                    </div>
                    <h4 className="font-bold text-base text-slate-900 kanit-text flex items-center gap-1.5">
                      Anping Card Agent
                      <span className="text-[11px] font-normal text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">v1.4.7</span>
                    </h4>
                    <p className="text-xs text-slate-500 font-medium kanit-text mt-1">
                      โปรแกรมตัวกลางอ่านบัตร (Agent Only)
                    </p>
                    <ul className="text-xs text-slate-600 kanit-text space-y-1.5 mt-3.5">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span>สำหรับผู้ที่ต้องการใช้งานผ่าน Google Chrome / Edge</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span>ทำงานเป็น Background Service ส่งข้อมูลให้หน้าเว็บ</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span>มีหน้าจอตรวจสอบข้อมูลและทดสอบอ่านบัตร</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span>ปลอดภัย ออฟไลน์ 100% ไม่ส่งข้อมูลออกภายนอก</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <a
                      href="/anping-card-agent.apk"
                      download="anping-card-agent.apk"
                      className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm kanit-text flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/10 hover:-translate-y-0.5"
                    >
                      <Download size={16} />
                      <span>ดาวน์โหลด Card Agent.apk</span>
                    </a>
                    <span className="block text-center text-[11px] text-slate-400 mt-1.5 font-medium">
                      ขนาดประมาณ 6.17 MB • สำหรับรันเบื้องหลังควบคู่กับบราวเซอร์
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SMART CARD GUIDE */}
          {activeTab === 'smartcard' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 kanit-text flex items-center gap-2">
                  <CreditCard className="text-sky-500" size={18} />
                  วิธีใช้งานเครื่องอ่านบัตรประชาชน Smart Card
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed kanit-text">
                  ระบบรองรับเครื่องอ่านบัตรประชาชนมาตรฐาน USB CCID / OTG ทุกรุ่น สามารถเลือกใช้งานได้ 2 รูปแบบตามความสะดวก:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="font-bold text-xs sm:text-sm text-sky-700 kanit-text flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-mono">1</span>
                    แบบใช้งานผ่านแอป AnpingClinic (แนะนำที่สุด)
                  </div>
                  <p className="text-xs text-slate-600 kanit-text leading-relaxed pl-7">
                    ติดตั้งแอป <strong>AnpingClinic.apk</strong> บนแท็บเล็ต เสียบสายเครื่องอ่านบัตรผ่านพอร์ต USB-C/OTG เมื่อเสียบบัตรประชาชน ระบบจะดึงข้อมูลส่วนตัวและรูปถ่ายเข้าสู่ฟอร์มเวชระเบียนให้อัตโนมัติในทันที พร้อมเสียงแจ้งเตือน 1 ครั้ง
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="font-bold text-xs sm:text-sm text-indigo-700 kanit-text flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-mono">2</span>
                    แบบใช้งานผ่านเว็บเบราว์เซอร์ (Google Chrome / Edge)
                  </div>
                  <p className="text-xs text-slate-600 kanit-text leading-relaxed pl-7">
                    ติดตั้งแอป <strong>anping-card-agent.apk</strong> เปิดโปรแกรมทิ้งไว้ในเบื้องหลัง จากนั้นเปิดเว็บคลินิกบนเบราว์เซอร์ เสียบบัตรประชาชนแล้วกดปุ่ม <strong>"อ่านข้อมูลจากบัตร"</strong> เพื่อดึงข้อมูลเข้าสู่ฟอร์ม
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-emerald-800 kanit-text flex items-center gap-2">
                    <Eye size={16} className="text-emerald-600" />
                    ปุ่มดูข้อมูลบัตรฉบับเต็ม (Card Inspector)
                  </div>
                  <p className="text-xs text-emerald-900/80 kanit-text leading-relaxed">
                    เมื่ออ่านบัตรแล้ว ท่านสามารถกดปุ่ม <strong>"ดูข้อมูลบัตรฉบับเต็ม"</strong> เพื่อตรวจสอบรูปถ่ายใบหน้าขนาดใหญ่, เลขบัตร, ชื่อไทย-อังกฤษ, ที่อยู่ตามทะเบียนราษฎร์ครบทุกช่อง, วันออกบัตร/วันหมดอายุ และผู้ออกบัตร ได้อย่างครบถ้วน 100%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FEATURES GUIDE */}
          {activeTab === 'features' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Users size={18} className="text-sky-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบเวชระเบียน (Medical Records)</strong>
                  ค้นหาประวัติคนไข้ด้วยชื่อ เลขบัตร หรือเบอร์โทร, ลงทะเบียนคนไข้ใหม่ด้วยบัตรประชาชน, บันทึกประวัติแพ้ยา โรคประจำตัว และยินยอม PDPA
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Stethoscope size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบตรวจรักษา (OPD & Doctor)</strong>
                  บันทึกอาการสำคัญ (CC), วินิจฉัยโรค (Dx), สั่งยา, สั่งทำหัตถการ, และแนบรูปถ่ายติดตามอาการก่อน-หลังการรักษา
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Package size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบคอร์สการรักษา & คูปอง (Courses & Coupons)</strong>
                  บันทึกการซื้อแพ็กเกจคอร์ส, ตัดจำนวนครั้งการรักษาแบบ Realtime, และจัดการโปรโมชันส่วนลด
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Receipt size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบการเงิน & แคชเชียร์ (POS & Finance)</strong>
                  คิดเงิน, สแกนชำระผ่าน QR พร้อมเพย์ (PromptPay), ออกใบเสร็จรับเงิน ใบกำกับภาษี และสรุปยอดรายรับ-รายจ่าย
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Calendar size={18} className="text-purple-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบตารางนัดหมาย (Appointments)</strong>
                  ลงคิวนัดหมายล่วงหน้า, ปฏิทินแพทย์ประจำวัน, และส่งข้อความหรือโทรแจ้งเตือนคนไข้ก่อนถึงวันนัด
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
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
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 kanit-text shrink-0">
          <span className="text-[11px] sm:text-xs">
            กด <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono font-bold text-slate-700">Esc</kbd> เพื่อปิดหน้าต่าง
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
          >
            ปิดคู่มือ
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
