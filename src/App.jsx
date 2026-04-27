import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, Users, CalendarRange, Calculator, 
  Package, BarChart3, Settings, Building2, Search, 
  Plus, X, CheckCircle2, AlertCircle, MapPin, Phone,
  Clock, Stethoscope, FileText, Pill, CreditCard, ShieldCheck, AlertOctagon,
  Pencil, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown, Loader2,
  User, Briefcase, Table as TableIcon, CalendarDays, LayoutList, List, Truck,
  ShoppingCart, Tag, Minus, Banknote, QrCode, Receipt, ScanText, Camera, Upload, History, Activity,
  TrendingUp, TrendingDown, Download, Filter, Printer, ShoppingBag, XCircle
} from 'lucide-react';

// --- สไตล์พื้นฐาน (Design Tokens) ---
const theme = {
  primary: 'bg-sky-500 text-white hover:bg-sky-600',
  primaryText: 'text-sky-500',
  primaryLight: 'bg-sky-50 text-sky-600',
  success: 'bg-emerald-500 text-white',
  successText: 'text-emerald-500',
  danger: 'bg-rose-500 text-white',
  dangerText: 'text-rose-500',
  warning: 'bg-amber-500 text-white',
  slate: 'text-slate-600',
  glassPanel: 'bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
  card: 'bg-white rounded-3xl shadow-sm border border-slate-100/50 p-7',
  input: 'w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all outline-none text-slate-700 text-base font-medium'
};

// --- จำลองข้อมูล (Mock Data) ---
const mockBranches = [
  { id: 'b1', name: 'สาขาหลัก (กรุงเทพ)' },
  { id: 'b2', name: 'สาขาเชียงใหม่' },
];

const mockPatients = [
  { id: 'HN001', name: 'สมชาย ใจดี', phone: '081-234-5678', lastVisit: '2023-10-25', branchId: 'b1' },
  { id: 'HN002', name: 'สมหญิง รักสวย', phone: '089-876-5432', lastVisit: '2023-10-26', branchId: 'b2' },
  { id: 'HN003', name: 'มีชัย ทำดี', phone: '082-333-4444', lastVisit: '2023-10-27', branchId: 'b1' },
];

// --- Map ไอคอนที่สามารถเลือกได้สำหรับระบบ POS ---
const POS_ICONS = {
  Stethoscope, Package, Pill, Briefcase, Users, Clock, CalendarDays, FileText, CreditCard, Tag, 
  Heart: Activity, Syringe: Plus, Scissors: Plus, // ใช้ไอคอนที่มีอยู่ทดแทนหรือขยายเพิ่มได้
  List, ShoppingCart, Truck
};

// -------------------------------------------------------------------------
// --- 1. ย้ายฟังก์ชันและ Component ย่อยออกมาไว้ด้านนอก เพื่อป้องกันการ Unmount ---
// -------------------------------------------------------------------------
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyu6OHkP7SYE9iDmA2XW5ErVAx0w8n99Kj_ZOocZgi-LcIEMsbfYqtRmbkCOhW1r1aoow/exec"; 
const VISION_API_KEY = "AIzaSyAlp6qqbUh0ti4fJ4ozGvqoIAOI0coRQBM"; // ใส่ Google Vision API Key ของคุณที่นี่เพื่อใช้งานระบบสแกนบัตร OCR

// --- ฟังก์ชันและ Component เสริมที่ขาดหายไป ---
const formatDate = (dateString) => {
  if (!dateString) return '-';
  if (typeof dateString === 'object') return '-';
  if (typeof dateString === 'string' && dateString.includes('/')) return dateString;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear() + 543;
  return `${d}/${m}/${y}`;
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  if (typeof dateString === 'object') return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear() + 543;
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min} น.`;
};

// --- ฟังก์ชันแยกส่วนชื่ออัตโนมัติแบบอัจฉริยะ ---
const parsePatientName = (fullName) => {
    let prefix = '';
    let gender = 'ไม่ระบุ';
    let rawName = (fullName || '').trim();
    
    // รองรับทั้งชื่อเต็มและตัวย่อ
    const knownPrefixes = [
        { p: 'นางสาว', g: 'หญิง', match: ['นางสาว', 'น.ส.', 'นส.'] },
        { p: 'นาย', g: 'ชาย', match: ['นาย'] },
        { p: 'นาง', g: 'หญิง', match: ['นาง'] },
        { p: 'ด.ช.', g: 'ชาย', match: ['ด.ช.', 'เด็กชาย', 'ดช.'] },
        { p: 'ด.ญ.', g: 'หญิง', match: ['ด.ญ.', 'เด็กหญิง', 'ดญ.'] },
        { p: 'พระ', g: 'ชาย', match: ['พระ'] }
    ];

    for (const kp of knownPrefixes) {
        let matched = false;
        for (const m of kp.match) {
            if (rawName.startsWith(m)) {
                prefix = kp.p;
                gender = kp.g;
                rawName = rawName.substring(m.length).trim();
                matched = true;
                break;
            }
        }
        if (matched) break;
    }

    // ลบช่องว่างที่เกินมาและแยกชื่อ-สกุล
    rawName = rawName.replace(/\s+/g, ' ').trim();
    const spaceIdx = rawName.indexOf(' ');
    let firstName = rawName;
    let lastName = '';
    if (spaceIdx > -1) {
        firstName = rawName.substring(0, spaceIdx);
        lastName = rawName.substring(spaceIdx + 1);
    }

    return { prefix, firstName, lastName, gender };
};

// --- ฟังก์ชันช่วยดึงชื่อเต็มและ ID ให้รองรับทั้งโครงสร้างเก่าและใหม่ ---
const getPatientFullName = (p) => {
   if (!p) return '-';
   if (p.firstName || p.lastName || p.prefix) {
       return `${p.prefix || ''}${p.firstName || ''} ${p.lastName || ''}`.trim();
   }
   return p.name || '-';
};

const generateNextHN = (patients) => {
  const currentYearTH = new Date().getFullYear() + 543;
  const yearSuffix = String(currentYearTH).slice(-2);
  
  if (!patients || patients.length === 0) return `HN${yearSuffix}-0001`;
  
  let maxNum = 0;
  patients.forEach(p => {
     const hnString = p.hn || p.id || '';
     // ดึงตัวเลขชุดสุดท้ายที่อยู่ท้ายสุดของ HN (รองรับทั้งแบบเก่า HN0001 และแบบใหม่ HN69-0001)
     const numMatch = hnString.match(/(\d+)$/);
     if (numMatch) {
         const num = parseInt(numMatch[1], 10);
         if (num > maxNum) maxNum = num;
     }
  });
  
  return `HN${yearSuffix}-${String(maxNum + 1).padStart(4, '0')}`;
};

const getAgeString = (dobStr) => {
  if (!dobStr || dobStr.length < 10) return '-';
  const parts = dobStr.split('/');
  if (parts.length === 3) {
    const dobDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (isNaN(dobDate.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - dobDate.getFullYear();
    let months = now.getMonth() - dobDate.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < dobDate.getDate())) { years--; months += 12; }
    return `${years} ปี ${months} เดือน`;
  }
  return '-';
};

const getPatientId = (p) => p ? (p.hn || p.id || '-') : '-';

// -------------------------------------------------------------------------
// --- [NEW] Common Components & Hooks สำหรับลดความซ้ำซ้อนและจัดการแอนิเมชัน ---
// -------------------------------------------------------------------------

/**
 * Hook สำหรับจัดการ Modal ที่มีแอนิเมชันปิด
 * @param {Function} onClosedCallback ฟังก์ชันที่จะเรียกหลังจากแอนิเมชันปิดเสร็จสิ้น (ถ้ามี)
 */
const useModal = (onClosedCallback) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const open = () => {
        setIsOpen(true);
        setIsClosing(false);
    };

    const close = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            if (onClosedCallback) onClosedCallback();
        }, 350); // ระยะเวลาสัมพันธ์กับ modal-animate-out (0.3s)
    };

    return { isOpen, isClosing, open, close, setIsOpen };
};

/**
 * Component สำหรับทำ Skeleton Loader (ก้อนกระพริบๆ)
 */
const Skeleton = ({ className = '', width, height, rounded = 'rounded-xl', circle }) => (
    <div 
        className={`bg-slate-200 animate-pulse ${circle ? 'rounded-full' : rounded} ${className}`}
        style={{ width: width, height: height }}
    />
);

/**
 * Component สำหรับ Modal ที่มีแอนิเมชันในตัว
 */
const AnimatedModal = ({ isOpen, isClosing, onClose, title, children, maxWidth = 'max-w-2xl', icon: Icon }) => {
    if (!isOpen) return null;

    const modalContent = (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
            <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full ${maxWidth} max-h-[85dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
                {/* Modal Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {Icon && (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">{title}</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
                        <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
                
                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

// --- เพิ่มฟังก์ชันหา string วันที่ล่าสุดสำหรับจัดเรียง ---
const getPatientLastVisitStr = (p) => {
    // ใช้ datetime จากประวัติการรักษาล่าสุด หรือถ้าไม่มีให้ใช้วันที่ลงทะเบียน (createdAt) หรือ lastVisit
    const dt = p.opdRecords && p.opdRecords.length > 0 ? p.opdRecords[0].datetime : (p.createdAt || p.lastVisit || '');
    if (!dt) return '000000000000';

    // 1. จัดการกรณีเป็น ISO String (เช่น 2023-10-25T09:30:00.000Z)
    if (dt.includes('T')) {
        const dateObj = new Date(dt);
        if (!isNaN(dateObj.getTime())) {
            const y = dateObj.getFullYear() + 543; // แปลงเป็น พ.ศ. ให้เรียงร่วมกับ format ไทยได้
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            const h = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            return `${y}${m}${d}${h}${min}`;
        }
    }

    // 2. แยกส่วนวันที่และเวลาออกจากกัน (สมมติ format: DD/MM/YYYY HH:mm น.)
    const parts = dt.split(' ');
    const dateStr = parts[0] || '';
    const timeStr = parts[1] ? parts[1].replace('น.', '').trim() : '00:00';

    let year = '0000', month = '00', day = '00';
    let hour = '00', minute = '00';

    // แยกวันที่
    if (dateStr.includes('/')) {
        const dParts = dateStr.split('/');
        if (dParts.length === 3) {
            day = dParts[0].padStart(2, '0');
            month = dParts[1].padStart(2, '0');
            year = dParts[2];
        }
    } else if (dateStr.includes('-')) { // รองรับ YYYY-MM-DD
        const dParts = dateStr.split('-');
        if (dParts.length === 3) {
            year = dParts[0];
            // ชดเชยปี ค.ศ. เป็น พ.ศ. ชั่วคราวเพื่อให้เรียงลำดับได้ถูกต้อง
            if (year.startsWith('20')) {
                year = String(parseInt(year, 10) + 543);
            }
            month = dParts[1].padStart(2, '0');
            day = dParts[2].padStart(2, '0');
        }
    } else {
        return dt; // Fallback
    }

    // แยกเวลา
    if (timeStr.includes(':')) {
        const tParts = timeStr.split(':');
        hour = (tParts[0] || '00').padStart(2, '0');
        minute = (tParts[1] || '00').padStart(2, '0');
    }

    // รวมเป็น String สำหรับจัดเรียง: YYYYMMDDHHmm
    return `${year}${month}${day}${hour}${minute}`;
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorStyles = { sky: 'text-sky-500 bg-sky-50', emerald: 'text-emerald-500 bg-emerald-50', rose: 'text-rose-500 bg-rose-50', slate: 'text-slate-500 bg-slate-50' };
  return (
    <div className={`${theme.card} flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`p-4 rounded-2xl ${colorStyles[color]}`}><Icon size={24} /></div>
      <div><p className="text-sm font-medium text-slate-500">{title}</p><p className="text-2xl font-bold text-slate-800 font-data">{value}</p></div>
    </div>
  );
};

const PlaceholderPage = ({ title, desc, icon: Icon }) => (
  <div className="h-full flex flex-col items-center justify-center text-center fade-in">
    <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center text-sky-400 mb-6 shadow-inner"><Icon size={48} /></div>
    <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">{title}</h1>
    <p className="text-slate-500 max-w-md mx-auto">{desc}</p>
    <div className="mt-8 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-sm">เชื่อมต่อฐานข้อมูลส่วนนี้ผ่าน Google Apps Script ได้ในอนาคต</div>
  </div>
);
// --- คอมโพเนนต์ Custom Dropdown สมัยใหม่ที่ใช้แทน <select> ---
const CustomSelect = ({ value, onChange, options, placeholder, className, disabled, compact, fullWidth, dropUp }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => (typeof o === 'object' ? String(o.value) : String(o)) === String(value));
    const displayLabel = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) : placeholder;

    return (
        <div className={`relative ${className || ''} ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
            <div
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                className={compact 
                    ? `flex items-center ${fullWidth ? 'w-full px-3 justify-between' : 'justify-center px-2.5'} gap-1 cursor-pointer outline-none bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg py-1.5 transition-all font-data shadow-sm`
                    : `w-full px-4 py-3 rounded-2xl bg-white border outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-left flex justify-between items-center font-data transition-all ${isOpen ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200'} ${disabled ? 'bg-slate-50 cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-700'}`
                }
            >
                <span className={`truncate ${compact ? 'font-bold text-slate-700 text-sm' : ''}`}>{String(displayLabel || (compact ? '' : 'เลือก'))}</span>
                {/* แก้ไข: ลบเงื่อนไข isOpen ออก เพื่อไม่ให้แสดงไอคอน ^ ในโหมด compact ป้องกันปุ่มขยับ */}
                {!compact && <ChevronDown className={`w-4 h-4 text-slate-400 pointer-events-none shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
            </div>
            {isOpen && !disabled && (
                <div className={`absolute z-[100] bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto custom-scrollbar animate-in fade-in duration-200 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} ${compact ? 'min-w-full w-max max-w-[90vw] max-h-48 left-0 origin-top zoom-in-95' : 'w-full max-h-48 origin-top zoom-in-95'}`}>
                    {options.length > 0 ? options.map((opt, i) => {
                        const val = typeof opt === 'object' ? opt.value : opt;
                        const lbl = typeof opt === 'object' ? opt.label : opt;
                        const isSelected = String(value) === String(val);
                        return (
                            <div
                                key={i}
                                onMouseDown={(e) => { e.preventDefault(); onChange(val); setIsOpen(false); }}
                                className={`px-4 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data transition-colors whitespace-nowrap ${compact ? 'text-sm py-2' : 'text-sm py-2.5'} ${isSelected ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                            >
                                {lbl}
                            </div>
                        );
                    }) : (
                        <div className="px-4 py-3 text-xs text-slate-400 italic text-center kanit-text">ไม่มีข้อมูล</div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- ข้อมูลสำหรับ Calendar View ---
const systemStatusTypes = [
  { value: 'confirmed', label: 'ยืนยันแล้ว', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'pending', label: 'รอยืนยัน', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'cancelled', label: 'ยกเลิก', color: 'bg-rose-100 text-rose-700 border-rose-200' }
];
const colorPresets = [];

// [UPDATED COMPONENT] Calendar View Implementation
const CalendarView = ({ activities, onEventClick, onDayClick, dealStatuses = [], transportStatuses = [] }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day', 'list'
  const [selectedDayDetails, setSelectedDayDetails] = useState(null); // Data for modal
  const [isDayModalClosing, setIsDayModalClosing] = useState(false); // State for modal closing animation
  
  const monthsTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const monthsShortTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const daysTH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const daysShortTH = ['อา','จ','อ','พ','พฤ','ศ','ส'];

  // Helper to resolve status for Calendar
  const resolveStatus = (value, list) => {
      const found = list.find(s => s.value === value);
      if (found) return { label: found.label, color: found.color, type: found.type };
      
      const sys = systemStatusTypes.find(s => s.value === value);
      if (sys) return { label: sys.label, color: sys.color, type: sys.value };

      return { label: value || '-', color: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  const changePeriod = (offset) => {
    const newDate = new Date(viewDate);
    if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + offset);
    } else if (viewMode === 'week' || viewMode === 'list') {
        newDate.setDate(newDate.getDate() + (offset * 7));
    } else if (viewMode === 'day') {
        newDate.setDate(newDate.getDate() + offset);
    }
    setViewDate(newDate);
  };

  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.getDate() === today.getDate() && 
           dateObj.getMonth() === today.getMonth() && 
           dateObj.getFullYear() === today.getFullYear();
  };

  // Group events by day using rawDeliveryStart
  const eventsMap = useMemo(() => {
    const map = {};
    activities.forEach(item => {
        const dateStr = item.rawDeliveryStart || item.rawDeliveryDateTime || item.rawDateTime;
        if(!dateStr) return;
        
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;

        // Key "YYYY-M-D"
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(item);
    });
    
    // Sort by time within each day
    Object.keys(map).forEach(key => {
        map[key].sort((a, b) => {
            const dateA = new Date(a.rawDeliveryStart || a.rawDateTime);
            const dateB = new Date(b.rawDeliveryStart || b.rawDateTime);
            return dateA - dateB;
        });
    });
    
    return map;
  }, [activities]);

  const getEventsForDate = (dateObj) => {
    const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
    return eventsMap[key] || [];
  };

  // --- Render Helpers ---
  const renderEventItem = (ev, idx, compact = false) => {
     const timeStr = ev.rawDeliveryStart 
        ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})
        : (ev.rawDateTime ? new Date(ev.rawDateTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '');

     const displayText = `${timeStr ? timeStr + ' ' : ''}${ev.name} (${ev.artist || '-'})`;
     const statusInfo = resolveStatus(ev.dealStatus, dealStatuses);
     let itemColor = statusInfo.color || 'bg-slate-50 border-slate-200 text-slate-600';
     
     let dotColor = 'bg-slate-400';
     const preset = colorPresets.find(p => p.value === itemColor);
     if (preset) {
         dotColor = preset.dot;
     } else {
         if (itemColor.includes('emerald') || itemColor.includes('green')) dotColor = 'bg-emerald-500';
         else if (itemColor.includes('blue') || itemColor.includes('sky') || itemColor.includes('indigo')) dotColor = 'bg-sky-500';
         else if (itemColor.includes('amber') || itemColor.includes('yellow') || itemColor.includes('orange')) dotColor = 'bg-amber-500';
         else if (itemColor.includes('rose') || itemColor.includes('red') || itemColor.includes('pink')) dotColor = 'bg-rose-500';
         else if (itemColor.includes('purple') || itemColor.includes('violet')) dotColor = 'bg-violet-500';
     }

     return (
       <button 
          key={idx} 
          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
          className={`text-left rounded-[4px] sm:rounded-md border transition-all w-full mb-0.5 sm:mb-1 flex items-center shrink-0 ${itemColor} leading-none
             ${compact ? 'p-0.5 sm:p-1 min-h-[18px] sm:h-auto gap-0.5 sm:gap-1 justify-start overflow-hidden' : 'px-1.5 py-1 sm:px-2 sm:py-1 h-auto min-h-[16px] sm:min-h-[26px] gap-1 truncate'}
          `}
          title={`${timeStr} ${ev.name} (${ev.artist})`}
       >
          <div className={`w-1.5 h-1.5 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${dotColor}`}></div>
          {/* เปลี่ยนจากซ่อนบนมือถือ (hidden) เป็น block พร้อมใส่ truncate ให้ตัดข้อความอัตโนมัติ */}
          <span className={`truncate font-medium tracking-tighter font-data ${compact ? 'block text-[8px] sm:text-[10px]' : 'text-[9px] sm:text-xs'}`}>
             {displayText}
          </span>
       </button>
     );
  };

  // --- Views ---
  const renderMonthView = () => {
      const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
      const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
      
      return (
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 shrink-0">
                {daysShortTH.map((d, i) => (
                    <div key={d} className={`py-2 sm:py-4 text-center text-[9px] sm:text-sm font-bold ${i===0 || i===6 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-50/20">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-b border-r border-slate-100 bg-slate-50/40 h-[60px] sm:h-[120px]"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                    const events = getEventsForDate(currentDate);
                    const isCurrent = isToday(currentDate);
                    
                    return (
                        <div 
                            key={day} 
                            onClick={() => setSelectedDayDetails({ date: currentDate, events })}
                            className={`border-b border-r border-slate-100 p-0.5 sm:p-2 flex flex-col gap-0.5 sm:gap-1.5 transition-colors hover:bg-slate-50 group h-[60px] sm:h-[120px] relative cursor-pointer ${isCurrent ? 'bg-sky-50/40' : 'bg-white'}`}
                        >
                            <div className="flex justify-between items-start p-0.5 sm:p-1 shrink-0">
                                <span className={`text-[10px] sm:text-sm font-bold w-4 h-4 sm:w-8 sm:h-8 flex items-center justify-center rounded-full ${isCurrent ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700'}`}>
                                    {day}
                                </span>
                                {events.length > 0 && <span className="text-[7px] sm:text-[10px] font-bold text-sky-500 bg-sky-50 px-1 sm:px-2 py-0.5 rounded-full border border-sky-100">+{events.length}</span>}
                            </div>
                            <div className="flex-1 flex flex-col gap-[1px] sm:gap-0.5 overflow-y-auto custom-scrollbar px-0 pr-0.5">
                                {events.map((ev, idx) => renderEventItem(ev, idx, true))}
                            </div>
                        </div>
                    );
                })}
                {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
                    <div key={`end-empty-${i}`} className="border-b border-r border-slate-100 bg-slate-50/40 h-[60px] sm:h-[120px]"></div>
                ))}
            </div>
        </div>
      );
  };

  const renderWeekView = () => {
      const startOfWeek = new Date(viewDate);
      startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
      const days = Array.from({length: 7}, (_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          return d;
      });

      return (
        <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[350px] relative">
             <div className="flex flex-col flex-1 h-full w-full">
                 <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 shrink-0">
                    {days.map((d, i) => {
                        const isCurrent = isToday(d);
                        return (
                            <div key={i} className={`py-2 sm:py-4 text-center border-r border-slate-100 last:border-0 ${i===0||i===6?'text-rose-500':'text-slate-600'}`}>
                                <div className="text-[9px] sm:text-xs font-bold opacity-70">{daysShortTH[i]}</div>
                                <div className={`text-sm sm:text-lg font-black ${isCurrent ? 'text-sky-500' : ''}`}>{d.getDate()}</div>
                            </div>
                        );
                    })}
                 </div>
                 
                 <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-white divide-x divide-slate-100 custom-scrollbar">
                     {days.map((d, i) => {
                         const events = getEventsForDate(d);
                         const isCurrent = isToday(d);
                         return (
                             <div 
                                key={i} 
                                onClick={() => setSelectedDayDetails({ date: d, events })}
                                className={`p-0.5 sm:p-2 flex flex-col gap-0.5 sm:gap-1 min-h-[200px] sm:min-h-[300px] hover:bg-slate-50 cursor-pointer overflow-y-auto custom-scrollbar ${isCurrent ? 'bg-sky-50/30' : ''}`}
                             >
                                 {events.map((ev, idx) => renderEventItem(ev, idx, true))}
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>
      );
  };

  const renderDayView = () => {
      const events = getEventsForDate(viewDate);
      const isCurrentDay = isToday(viewDate);
      
      return (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-3 sm:p-6 min-h-[400px]">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 shrink-0">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shadow-sm shrink-0 ${isCurrentDay ? 'bg-sky-500 text-white border-none' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase">{daysShortTH[viewDate.getDay()]}</span>
                      <span className="text-xl sm:text-2xl font-black leading-none">{viewDate.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{daysTH[viewDate.getDay()]}ที่ {viewDate.getDate()} {monthsTH[viewDate.getMonth()]} {viewDate.getFullYear()+543}</h3>
                      <p className="text-slate-500 text-xs sm:text-sm font-medium">{events.length} รายการนัดหมาย</p>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 space-y-2 sm:space-y-3">
                  {events.length > 0 ? events.map((ev, idx) => {
                      const statusInfo = resolveStatus(ev.dealStatus, dealStatuses);
                      return (
                      <div key={idx} onClick={() => onEventClick(ev)} className="flex items-stretch gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all cursor-pointer bg-white group">
                          <div className="w-16 sm:w-20 text-center shrink-0 flex flex-col items-center justify-center gap-1">
                              <span className="font-bold text-sky-600 bg-sky-50 px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs w-full sm:w-fit whitespace-nowrap truncate">
                                  {ev.hn || '-'}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-600 block mt-0.5 font-data">
                                  {ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-'}
                              </span>
                          </div>
                          <div className="w-1 bg-slate-100 rounded-full group-hover:bg-sky-400 transition-colors shrink-0"></div>
                          <div className="flex-1 min-w-0 py-0.5 sm:py-1 flex flex-col justify-center">
                              {/* ย้ายสถานะขึ้นมาไว้มุมขวาบนในบรรทัดเดียวกับชื่อคนไข้ */}
                              <div className="flex flex-row justify-between items-start mb-0.5 gap-1">
                                  <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate pr-1">{ev.name}</h4>
                                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit shrink-0 ${statusInfo.color}`}>
                                      {statusInfo.label}
                                  </span>
                              </div>
                              {/* เพิ่ม Action Call: เบอร์โทรศัพท์เป็นปุ่มสวยงามใต้ชื่อคนไข้ */}
                              {(ev.phone && (Array.isArray(ev.phone) ? ev.phone[0] : ev.phone)) ? (
                                  <a href={`tel:${Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold font-data text-[11px] sm:text-xs mt-0.5 w-fit bg-sky-50 px-2 py-0.5 rounded-md transition-colors">
                                      <Phone size={10} className="sm:w-3 sm:h-3" /> {Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}
                                  </a>
                              ) : null}
                              {/* เอาไอคอนออกทั้งหมด เหลือแต่ข้อความสะอาดตา */}
                              <p className="text-xs sm:text-sm text-slate-500 truncate flex items-center gap-1.5 mt-1.5">
                                  <span className="font-medium text-sky-600 truncate">แพทย์: {ev.artist || '-'}</span> 
                                  {ev.customer && (
                                      <>
                                          <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">|</span> 
                                          <span className="truncate">{ev.customer}</span>
                                      </>
                                  )}
                              </p>
                          </div>
                      </div>
                  )}) : (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                          <CalendarIcon className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-20" />
                          <p className="font-medium text-sm sm:text-base">ไม่มีรายการนัดหมายในวันนี้</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderListView = () => {
      const startOfWeek = new Date(viewDate);
      startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
      const days = Array.from({length: 7}, (_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          return d;
      });

      return (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-3 sm:p-6 overflow-y-auto custom-scrollbar min-h-[400px]">
              <h3 className="font-bold text-slate-800 mb-3 sm:mb-5 px-1 sm:px-2 flex items-center gap-2 text-sm sm:text-base">
                  <List className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" /> 
                  รายการประจำสัปดาห์
              </h3>
              <div className="space-y-4 sm:space-y-6">
                  {days.map((d, dayIdx) => {
                      const events = getEventsForDate(d);
                      const isCurrent = isToday(d);
                      
                      return (
                          <div key={dayIdx} className="space-y-2 sm:space-y-3">
                              <div className={`sticky top-0 z-10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-2 border-l-4 shadow-sm ${isCurrent ? 'bg-sky-50 border-sky-500 text-sky-700' : 'bg-slate-50 border-slate-300 text-slate-600'}`}>
                                  <span className="font-black w-5 sm:w-6 text-right text-base sm:text-lg">{d.getDate()}</span>
                                  <span className="font-bold text-xs sm:text-sm uppercase">{daysTH[d.getDay()]}</span>
                                  <div className="h-px bg-current opacity-10 flex-1 ml-1 sm:ml-2"></div>
                              </div>
                              <div className="pl-2 sm:pl-4 space-y-2 sm:space-y-3">
                                  {events.length > 0 ? events.map((ev, idx) => {
                                      const statusInfo = resolveStatus(ev.dealStatus, dealStatuses);
                                      return (
                                      <div key={idx} onClick={() => onEventClick(ev)} className="bg-white border border-slate-100 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl hover:shadow-md hover:border-sky-200 transition-all cursor-pointer flex items-stretch gap-2 sm:gap-4">
                                          <div className="text-xs font-bold text-slate-500 pt-1 w-14 sm:w-20 shrink-0 flex flex-col items-center justify-center gap-1.5">
                                              <span className="font-bold text-sky-600 bg-sky-50 px-1.5 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[9px] sm:text-xs w-full text-center truncate">
                                                  {ev.hn || '-'}
                                              </span>
                                              <span className="font-data text-[10px] sm:text-xs text-center">{ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-'} น.</span>
                                          </div>
                                          <div className="flex-1 min-w-0 border-l border-slate-100 pl-2 sm:pl-4 flex flex-col justify-center">
                                              {/* ปรับเลย์เอาต์มุมมองรายการให้เหมือนมุมมองวัน 100% */}
                                              <div className="flex flex-row justify-between items-start mb-0.5 gap-1">
                                                  <span className="font-bold text-slate-800 text-sm sm:text-base truncate pr-1">{ev.name}</span>
                                                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit shrink-0 ${statusInfo.color}`}>
                                                      {statusInfo.label}
                                                  </span>
                                              </div>
                                              {(ev.phone && (Array.isArray(ev.phone) ? ev.phone[0] : ev.phone)) ? (
                                                  <a href={`tel:${Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold font-data text-[11px] sm:text-xs mt-0.5 w-fit bg-sky-50 px-2 py-0.5 rounded-md transition-colors">
                                                      <Phone size={10} className="sm:w-3 sm:h-3" /> {Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}
                                                  </a>
                                              ) : null}
                                              <div className="text-[10px] sm:text-xs text-slate-500 mt-1.5 truncate flex items-center gap-1.5">
                                                  <span className="font-medium text-sky-600 truncate">แพทย์: {ev.artist || '-'}</span> 
                                                  {ev.customer && (
                                                      <>
                                                          <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">•</span> 
                                                          <span className="truncate">{ev.customer}</span>
                                                      </>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  )}) : <div className="text-xs sm:text-sm text-slate-400 pl-2 font-medium">ไม่มีรายการนัดหมาย</div>}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const closeDayDetailsModal = () => {
      setIsDayModalClosing(true);
      setTimeout(() => {
          setSelectedDayDetails(null);
          setIsDayModalClosing(false);
      }, 300);
  };

  const renderDayDetailsModal = () => {
      if (!selectedDayDetails) return null;
      const { date, events } = selectedDayDetails;

      const modalContent = (
        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 z-[90]">
            <div 
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm ${isDayModalClosing ? 'backdrop-animate-out' : 'animate-in fade-in duration-300'}`} 
                onClick={closeDayDetailsModal} 
            />
            <div className={`bg-white w-full max-w-5xl rounded-[1.5rem] sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80dvh] sm:max-h-[90dvh] ${isDayModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
                {/* แก้ไข UX/UI ส่วนหัว Modal รายการประจำวัน (จัดระเบียบ ให้อยู่กึ่งกลาง ไม่ล้นกรอบ) */}
                <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 gap-3 shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-sky-100 text-sky-600 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-inner shrink-0">
                            <span className="text-[8px] sm:text-[10px] font-bold uppercase leading-none">{daysShortTH[date.getDay()]}</span>
                            <span className="text-lg sm:text-2xl font-black leading-none mt-0.5">{date.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-xl font-bold text-slate-800 truncate leading-tight">รายการประจำวัน</h3>
                            <p className="text-slate-500 text-[10px] sm:text-sm font-medium truncate mt-0.5">{daysTH[date.getDay()]}ที่ {date.getDate()} {monthsTH[date.getMonth()]} {date.getFullYear()+543}</p>
                        </div>
                    </div>
                    <button onClick={closeDayDetailsModal} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition shadow-sm shrink-0">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar bg-slate-50/30">
                    {events.length > 0 ? (
                        <>
                            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                                <div className="overflow-x-auto overflow-y-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                                                <th className="p-4 font-bold w-[10%] text-center">HN/เวลา</th>
                                                <th className="p-4 font-bold w-[25%]">คนไข้/อาการ</th>
                                                <th className="p-4 font-bold w-[15%] text-center">เบอร์โทร</th>
                                                <th className="p-4 font-bold w-[20%]">แพทย์</th>
                                                <th className="p-4 font-bold w-[15%]">สถานะ</th>
                                                <th className="p-4 font-bold w-[15%] text-right">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {events.map((item, i) => {
                                                const time = item.rawDeliveryStart ? new Date(item.rawDeliveryStart).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-';
                                                const statusInfo = resolveStatus(item.dealStatus, dealStatuses);
                                                
                                                return (
                                                    <tr key={i} onClick={() => onEventClick(item)} className="hover:bg-sky-50/30 cursor-pointer transition-colors group">
                                                        <td className="p-4 font-bold text-slate-700 whitespace-nowrap align-top text-center">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className="font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg text-xs w-fit whitespace-nowrap">
                                                                    {item.hn || '-'}
                                                                </span>
                                                                <span className="mt-1 text-sm font-data">{time} น.</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <div className="font-bold text-slate-800">{item.name}</div>
                                                            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit mt-1.5">{item.category}</div>
                                                        </td>
                                                        <td className="p-4 align-top text-center">
                                                            <div className="flex justify-center">
                                                                {item.phone && item.phone[0] ? (
                                                                  <a href={`tel:${item.phone[0]}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center justify-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg w-fit transition-colors font-data">
                                                                    <Phone size={14} /> {item.phone[0]}
                                                                  </a>
                                                                ) : <span className="text-slate-400">-</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <div className="text-sm font-bold text-sky-600">{item.artist}</div>
                                                            <div className="text-xs text-slate-500 mt-1">{item.customer}</div>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <div className="flex flex-col gap-1.5 items-start">
                                                                <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${statusInfo.color}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.type === 'confirmed' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                                                    {statusInfo.label}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-top text-right">
                                                           <button onClick={(e) => { e.stopPropagation(); onEventClick(item); }} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไข"><Pencil size={18} /></button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {events.map((item, i) => {
                                    const time = item.rawDeliveryStart ? new Date(item.rawDeliveryStart).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-';
                                    const statusInfo = resolveStatus(item.dealStatus, dealStatuses);

                                    return (
                                        <div key={i} onClick={() => onEventClick(item)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 active:scale-95 transition-transform">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md text-[10px] w-fit whitespace-nowrap">{item.hn || '-'}</span>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                         <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                         <span className="text-xs font-bold text-slate-600 font-data">{time} น.</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 items-end shrink-0 ml-2">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${statusInfo.color}`}>
                                                        <div className={`w-1 h-1 rounded-full ${statusInfo.type === 'confirmed' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-1">
                                                <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{item.name}</h4>
                                                <div className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">{item.category}</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-semibold text-slate-400 mb-0.5">แพทย์</p>
                                                    <p className="font-bold text-sky-600 truncate">{item.artist}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-semibold text-slate-400 mb-0.5">คนไข้</p>
                                                    <p className="font-semibold text-slate-700 truncate">{item.customer}</p>
                                                </div>
                                                <div className="col-span-2 mt-0.5">
                                                    <p className="text-[9px] font-semibold text-slate-400 mb-0.5">เบอร์โทร</p>
                                                    {item.phone && item.phone.length > 0 && item.phone[0] ? (
                                                        <a href={`tel:${item.phone[0]}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-600 font-bold font-data text-[11px]">
                                                            <Phone size={12} /> {item.phone[0]}
                                                        </a>
                                                    ) : <span className="text-slate-400 text-[11px]">-</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-slate-400 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 border-dashed">
                            <div className="p-3 sm:p-4 bg-slate-50 rounded-full shadow-inner mb-3 sm:mb-4">
                                <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
                            </div>
                            <p className="font-bold text-sm sm:text-lg text-slate-500">ไม่มีรายการในวันนี้</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );

      return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
  };

  const getTitle = () => {
      if (viewMode === 'month') return `${monthsTH[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
      if (viewMode === 'day') return `${viewDate.getDate()} ${monthsTH[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
      if (viewMode === 'week' || viewMode === 'list') {
          const start = new Date(viewDate);
          start.setDate(start.getDate() - start.getDay());
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          if (start.getMonth() === end.getMonth()) {
              return `${start.getDate()} - ${end.getDate()} ${monthsTH[start.getMonth()]} ${start.getFullYear() + 543}`;
          } else {
              return `${start.getDate()} ${monthsShortTH[start.getMonth()]} - ${end.getDate()} ${monthsShortTH[end.getMonth()]} ${end.getFullYear() + 543}`;
          }
      }
  };

  return (
    <div className="space-y-3 sm:space-y-4 duration-500 flex flex-col h-full w-full">
       {renderDayDetailsModal()}

       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-2 sm:mb-4 bg-white/50 p-3 sm:p-4 rounded-[1.5rem] border border-slate-100/80 shadow-sm">
          {/* Title & Current Date Display */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner border border-sky-100/50">
                   <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 kanit-text leading-tight">ปฏิทินงาน</h2>
             </div>
             <div className="flex items-center gap-1.5 bg-sky-50/50 px-3 py-1.5 rounded-xl border border-sky-100/50 lg:bg-transparent lg:border-none lg:p-0">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></div>
                <p className="text-xs sm:text-sm font-bold text-sky-600 font-data tracking-tight uppercase">{getTitle()}</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
             {/* Mode Selector */}
             <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-sm shrink-0">
                 {[
                     { id: 'month', label: 'เดือน', icon: CalendarIcon },
                     { id: 'week', label: 'สัปดาห์', icon: TableIcon },
                     { id: 'day', label: 'วัน', icon: CalendarDays },
                     { id: 'list', label: 'รายการ', icon: LayoutList },
                 ].map(mode => (
                     <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id)}
                        className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            viewMode === mode.id 
                            ? 'bg-white text-sky-600 shadow-sm ring-1 ring-slate-200/50' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                     >
                         <mode.icon className="w-3.5 h-3.5 shrink-0" />
                         <span className="hidden min-[400px]:inline">{mode.label}</span>
                     </button>
                 ))}
             </div>

             {/* Date Controller (Navigation) */}
             <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 ml-auto lg:ml-0">
                <button onClick={() => changePeriod(-1)} className="p-1.5 sm:p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors" title="ก่อนหน้า"><ChevronLeft size={18}/></button>
                <div className="w-px h-4 bg-slate-100 mx-0.5"></div>
                <button onClick={() => setViewDate(new Date())} className="px-3 sm:px-4 py-1.5 text-sky-600 text-[10px] sm:text-xs font-bold hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap">วันนี้</button>
                <div className="w-px h-4 bg-slate-100 mx-0.5"></div>
                <button onClick={() => changePeriod(1)} className="p-1.5 sm:p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors" title="ถัดไป"><ChevronRight size={18}/></button>
             </div>
          </div>
       </div>

       {viewMode === 'month' && renderMonthView()}
       {viewMode === 'week' && renderWeekView()}
       {viewMode === 'day' && renderDayView()}
       {viewMode === 'list' && renderListView()}
    </div>
  );
};

// เพิ่ม prop setPatientsData เพื่อให้สามารถเพิ่มคนไข้ใหม่จากหน้านัดหมายได้
const AppointmentManager = ({ queueData, setQueueData, patientsData, setPatientsData, callAppScript, showToast, isGlobalLoading }) => {
  const [viewMode, setViewMode] = useState('table'); 
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- ใช้ Custom Hook แทนการประกาศ State แยกเอง ---
  const apptModal = useModal();
  const apptAlert = useModal();
  const apptCalendar = useModal();

  const [sweetAlert, setSweetAlert] = useState({ type: '', title: '', text: '', onConfirm: null });
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const filterRef = React.useRef(null);
  const sentinelRef = React.useRef(null);
  const headerRef = React.useRef(null);

  const initialApptState = { 
    hn: '', patientName: '', searchPatient: '', doctor: '', datetime: '', reason: '', status: 'pending',
    phones: [''], lineId: '', facebook: '', instagram: '', tiktok: '', serviceType: '', courses: []
  };
  const [formData, setFormData] = useState(initialApptState);

  const [showPatientSuggest, setShowPatientSuggest] = useState(false);
  const [showDoctorSuggest, setShowDoctorSuggest] = useState(false);
  const mockDoctors = ['นพ. สมชาย รักษาดี', 'พญ. สมหญิง เก่งกล้า', 'ทพ. ใจดี ยิ้มแย้ม'];

  const [apptCalDate, setApptCalDate] = useState(new Date());
  const [apptCalView, setApptCalView] = useState('days');
  const [apptYearPageStart, setApptYearPageStart] = useState(0);
  const [apptTime, setApptTime] = useState({ h: '09', m: '00' });
  const [apptCalendarPos, setApptCalendarPos] = useState({ top: 0, left: 0 });

  const apptDatetimeWrapperRef = React.useRef(null);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const convertThaiToISO = (thaiDateTimeStr) => {
      if (!thaiDateTimeStr) return null;
      try {
          const parts = thaiDateTimeStr.split(' ');
          const dateParts = parts[0].split('/');
          if (dateParts.length !== 3) return null;
          const d = parseInt(dateParts[0], 10);
          const m = parseInt(dateParts[1], 10) - 1;
          const y = parseInt(dateParts[2], 10) - 543;
          let h = 0, min = 0;
          if (parts[1]) {
              const timeParts = parts[1].replace('น.', '').trim().split(':');
              if (timeParts.length >= 2) {
                  h = parseInt(timeParts[0], 10);
                  min = parseInt(timeParts[1], 10);
              }
          }
          return new Date(y, m, d, h, min).toISOString();
      } catch(e) { return null; }
  };

  useEffect(() => {
    if (apptCalView === 'years') setApptYearPageStart(Math.floor((apptCalDate.getFullYear() + 543) / 12) * 12);
  }, [apptCalView, apptCalDate]);

  // Render Skeleton Rows (ยุบรวมโค้ดที่ซ้ำซ้อน)
  const renderSkeletonRows = (count) => (
    Array.from({ length: count }).map((_, i) => (
      <tr key={`skel-${i}`} className="border-b border-slate-50">
        <td className="py-4"><div className="flex flex-col items-center gap-2"><Skeleton width="64px" height="16px" /><Skeleton width="48px" height="12px" /></div></td>
        <td className="py-4"><Skeleton width="64px" height="16px" className="mx-auto" /></td>
        <td className="py-4 px-2"><Skeleton width="128px" height="16px" /></td>
        <td className="py-4"><Skeleton width="96px" height="32px" rounded="rounded-lg" className="mx-auto" /></td>
        <td className="py-4 px-2"><Skeleton width="96px" height="16px" /></td>
        <td className="py-4 px-2"><Skeleton width="128px" height="16px" /></td>
        <td className="py-4"><Skeleton width="64px" height="24px" circle className="mx-auto" /></td>
        <td className="py-4"><div className="flex justify-center gap-2"><Skeleton width="32px" height="32px" rounded="rounded-lg" /><Skeleton width="32px" height="32px" rounded="rounded-lg" /></div></td>
      </tr>
    ))
  );

  const renderSkeletonCards = (count) => (
    Array.from({ length: count }).map((_, i) => (
        <div key={`skel-mob-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1.5"><Skeleton width="64px" height="20px" /><Skeleton width="64px" height="20px" rounded="rounded-md" /></div>
            <div className="mb-3"><Skeleton width="160px" height="24px" className="mb-2" /><Skeleton width="96px" height="24px" rounded="rounded-lg" /></div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-2"><Skeleton width="20px" height="20px" circle /><Skeleton width="128px" height="16px" /></div>
                <div className="flex items-start gap-2"><Skeleton width="20px" height="20px" circle /><Skeleton width="192px" height="16px" /></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100"><Skeleton height="36px" rounded="rounded-xl" /><Skeleton height="36px" rounded="rounded-xl" /></div>
        </div>
    ))
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...initialApptState });
    setIsViewMode(false);
    apptModal.open();
  };

  const handleOpenEdit = (appt, isView = false) => {
    setEditingId(appt.id);
    setFormData({ 
        hn: appt.hn || '', 
        patientName: appt.patientName || appt.name || '', 
        searchPatient: appt.hn ? `${appt.hn} - ${appt.patientName || appt.name}` : (appt.patientName || appt.name || ''),
        doctor: appt.doctor || appt.artist || '', 
        datetime: appt.datetime || '', 
        reason: appt.reason || appt.category || '', 
        status: appt.status || appt.dealStatus || 'pending',
        phones: appt.phone ? (Array.isArray(appt.phone) ? appt.phone : [appt.phone]) : [''],
        lineId: appt.lineId || '',
        facebook: appt.facebook || '',
        instagram: appt.instagram || '',
        tiktok: appt.tiktok || '',
        serviceType: appt.serviceType || ''
    });
    setIsViewMode(isView);
    apptModal.open();
  };

  const handleDeleteAppt = (id) => {
      setSweetAlert({
        type: 'warning', title: 'ยืนยันการลบการนัดหมาย?', text: 'คุณแน่ใจหรือไม่ว่าต้องการลบการนัดหมายนี้?',
        onConfirm: async () => {
            apptAlert.close();
            setIsProcessing(true);
            try {
               await callAppScript('DELETE_DATA', 'Queue', { id });
               setQueueData(queueData.filter(a => a.id !== id));
               showToast('ลบข้อมูลการนัดหมายแล้ว', 'danger');
            } catch(e) { showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning'); }
            setIsProcessing(false);
        }
      });
      apptAlert.open();
  };

  const handleSaveAppt = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    let finalHn = formData.hn;
    
    if (!finalHn && formData.patientName) {
        finalHn = generateNextHN(patientsData);
        const parsed = parsePatientName(formData.patientName);
        const newPatientPayload = {
            id: finalHn, hn: finalHn, prefix: parsed.prefix, firstName: parsed.firstName, lastName: parsed.lastName, gender: parsed.gender,
            phone1: formData.phones[0] || '', lineId: formData.lineId, facebook: formData.facebook, instagram: formData.instagram, tiktok: formData.tiktok, createdAt: new Date().toISOString()
        };
        try {
            await callAppScript('SAVE_DATA', 'Patients', newPatientPayload);
            setPatientsData([newPatientPayload, ...patientsData]);
            showToast(`เพิ่มผู้ป่วยใหม่ ${finalHn} เข้าระบบแล้ว`, 'success');
        } catch (error) { console.error("Failed to auto-create patient", error); }
    }

    const isoDate = convertThaiToISO(formData.datetime);
    const payload = {
        id: editingId || `APPT${Date.now()}`, hn: finalHn, patientName: formData.patientName, datetime: formData.datetime, doctor: formData.doctor, reason: formData.reason, status: formData.status,
        phone: formData.phones, lineId: formData.lineId, facebook: formData.facebook, instagram: formData.instagram, tiktok: formData.tiktok, serviceType: formData.serviceType,
        rawDeliveryStart: isoDate, rawDateTime: isoDate, name: formData.patientName || finalHn, artist: formData.doctor, category: formData.reason, dealStatus: formData.status
    };
    
    try {
        await callAppScript('SAVE_DATA', 'Queue', payload); 
        if (editingId) setQueueData(queueData.map(a => a.id === editingId ? payload : a));
        else setQueueData([payload, ...queueData]);
        apptModal.close(); 
        showToast(editingId ? 'แก้ไขนัดหมายสำเร็จ' : 'เพิ่มนัดหมายสำเร็จ', 'success');
    } catch(e) { showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'warning'); }
    setIsProcessing(false);
  };

  // --- NEW LOGIC: นำข้อมูลคิวมาผสมกับข้อมูลคนไข้ล่าสุดจากฐานข้อมูล (Patients) ---
  // เมื่อมีการแก้ชื่อหรือเบอร์โทรในระบบเวชระเบียน หน้านัดหมายจะแสดงข้อมูลที่อัปเดตตามทันที
  const augmentedQueueData = useMemo(() => {
    return queueData.map(appt => {
      if (!appt.hn) return appt;
      
      // ไปดึงข้อมูลคนไข้ล่าสุดมาจาก patientsData โดยอิงจาก HN
      const patientInfo = patientsData.find(p => getPatientId(p) === appt.hn);
      
      if (patientInfo) {
          const latestName = getPatientFullName(patientInfo);
          const latestPhones = [patientInfo.phone1, patientInfo.phone2].filter(Boolean);
          
          return {
              ...appt,
              // เสียบทับข้อมูลที่จะแสดงผล ให้เป็นข้อมูลล่าสุดจากฐานข้อมูลคนไข้
              patientName: latestName,
              name: latestName, // สำหรับให้ Calendar นำไปแสดง
              phone: latestPhones.length > 0 ? latestPhones : appt.phone
          };
      }
      return appt; // ถ้าไม่พบประวัติคนไข้ ก็ใช้ข้อมูลดิบจากคิวเหมือนเดิม
    });
  }, [queueData, patientsData]);

  const filteredData = useMemo(() => {
    // เปลี่ยนจากใช้ queueData ตรงๆ เป็นใช้ข้อมูลที่ถูกอัปเดต (augmentedQueueData) แล้ว
    return augmentedQueueData.filter(a => 
      (a.patientName && a.patientName.includes(search)) || 
      (a.hn && a.hn.includes(search)) || 
      (a.doctor && a.doctor.includes(search)) ||
      (a.reason && a.reason.includes(search))
    ).sort((a, b) => new Date(b.rawDeliveryStart || 0) - new Date(a.rawDeliveryStart || 0));
  }, [augmentedQueueData, search]);

  useEffect(() => {
    setVisibleCount(20);
    setIsLoadingMore(false);
  }, [search, viewMode]);

  // ใช้ ResizeObserver เพื่อติดตามความสูงของ Header อย่างแม่นยำตลอดเวลาแม้ตอนเกิดแอนิเมชัน
  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            // ป้องกันการเซ็ตค่า Height เป็น 0 เมื่อ Component ถูกซ่อน (display: none)
            if (entry.target.offsetHeight > 0 && filterRef.current) {
                // เซ็ตค่าพิกัดให้ filterRef ทันทีโดยไม่ต้องผ่าน State (ป้องกัน Re-render กระตุก)
                filterRef.current.style.top = `${entry.target.offsetHeight}px`;
            }
        }
    });

    observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement || viewMode !== 'table') return;

    // --- เพิ่มการเช็คสถานะทันทีเมื่อโหลด Component ---
    setTimeout(() => {
        if (mainElement && headerRef.current) {
            if (mainElement.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
            else headerRef.current.classList.remove('is-scrolled');
            
            if (sentinelRef.current && filterRef.current) {
                const sentinelRect = sentinelRef.current.getBoundingClientRect();
                const headerRect = headerRef.current.getBoundingClientRect();
                if (sentinelRect.top <= headerRect.bottom + 2) filterRef.current.classList.add('is-stuck');
                else filterRef.current.classList.remove('is-stuck');
            }
        }
    }, 50);

    const handleScroll = (e) => {
      // ป้องกันไม่ให้คำนวณและอัปเดต ถ้า Component ถูกซ่อนอยู่
      if (!headerRef.current || headerRef.current.offsetHeight === 0) return;

      const { scrollTop, scrollHeight, clientHeight } = e.target;
      
      // อัปเดต CSS Class ของ Header โดยตรง
      if (scrollTop > 20) headerRef.current.classList.add('is-scrolled');
      else headerRef.current.classList.remove('is-scrolled');

      if (sentinelRef.current && filterRef.current) {
         const sentinelRect = sentinelRef.current.getBoundingClientRect();
         const headerRect = headerRef.current.getBoundingClientRect();

         // ใช้ Sentinel Element (ที่ไม่ได้เป็น sticky) มาคำนวณ เพื่อป้องกันค่า top เพี้ยนตอนติด Header
         if (sentinelRect.top <= headerRect.bottom + 2) {
             filterRef.current.classList.add('is-stuck');
         } else {
             filterRef.current.classList.remove('is-stuck');
         }
      }

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (visibleCount < filteredData.length && !isLoadingMore) {
           setIsLoadingMore(true);
           setTimeout(() => {
              setVisibleCount(prev => prev + 10);
              setIsLoadingMore(false);
           }, 1000);
        }
      }
    };
    
    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredData.length, isLoadingMore, viewMode]);

  const handleOpenApptCalendar = () => {
    if (apptDatetimeWrapperRef.current) {
      const rect = apptDatetimeWrapperRef.current.getBoundingClientRect();
      setApptCalendarPos({ top: rect.bottom, left: rect.left });
    }
    const dtStr = formData.datetime;
    const now = new Date();
    let d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let h = '09', min = '00';
    if (dtStr) {
      const parts = dtStr.split(' ');
      if (parts.length >= 2) {
          const dateParts = parts[0].split('/');
          if(dateParts.length === 3) {
              d = parseInt(dateParts[0], 10);
              m = parseInt(dateParts[1], 10) - 1;
              y = parseInt(dateParts[2], 10) - 543;
          }
          const timeParts = parts[1].split(':');
          if(timeParts.length === 2) {
              h = timeParts[0];
              min = timeParts[1].replace('น.', '').trim();
          }
      }
    }
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) setApptCalDate(new Date(y, m, d));
    else setApptCalDate(now);
    
    setApptTime({ h, m: min });
    setApptCalView('days');
    apptCalendar.open();
  };

  // ฟังก์ชันค้นหาและเลือกคนไข้
  const handlePatientSearchChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, searchPatient: val, patientName: val, hn: '' });
    setShowPatientSuggest(true);
  };

  const selectPatient = (p) => {
    const fullName = getPatientFullName(p);
    const pId = getPatientId(p);
    setFormData({
      ...formData,
      searchPatient: `${pId} - ${fullName}`,
      hn: pId,
      patientName: fullName,
      phones: p.phone || p.phone1 ? [p.phone || p.phone1] : ['']
    });
    setShowPatientSuggest(false);
  };

  // ฟังก์ชันจัดการเบอร์โทรศัพท์
  const handlePhoneChange = (index, value) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData({ ...formData, phones: newPhones });
  };
  const addPhone = () => setFormData({ ...formData, phones: [...formData.phones, ''] });
  const removePhone = (index) => setFormData({ ...formData, phones: formData.phones.filter((_, i) => i !== index) });



  // --- 1. Component Separation & 2. React.memo (via useMemo) ---
  // ป้องกันการ Re-render ตารางใหม่ทั้งหมดเมื่อ Header ทำแอนิเมชัน (isApptHeaderScrolled เปลี่ยนค่า)
  const memoizedApptTableRows = useMemo(() => {
    return filteredData.slice(0, visibleCount).map((appt, index) => {
        const dtParts = (appt.datetime || '').split(' ');
        const datePart = dtParts[0] || '-';
        const timePart = dtParts[1] ? dtParts[1].replace('น.', '').trim() : '';

        return (
        <tr key={`${appt.id || 'appt'}-${index}`} onClick={() => handleOpenEdit(appt, true)} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors text-sm align-middle cursor-pointer group font-data space-row-animation">
            <td className="py-4 text-slate-700 font-medium text-center">
                <div className="flex flex-col items-center justify-center gap-1">
                <span>{datePart}</span>
                {timePart && <span className="text-sm text-slate-500 font-medium">{timePart}</span>}
                </div>
            </td>
            <td className="py-4 text-sky-600 font-medium text-center kanit-text">{appt.hn}</td>
            <td className="py-4 text-slate-700 text-left px-2">{appt.patientName}</td>
            <td className="py-4 text-center">
                <div className="flex justify-center">
                {(Array.isArray(appt.phone) ? appt.phone[0] : appt.phone) ? (
                    <a href={`tel:${Array.isArray(appt.phone) ? appt.phone[0] : appt.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center justify-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg w-fit transition-colors">
                    <Phone size={14} /> {Array.isArray(appt.phone) ? appt.phone[0] : appt.phone}
                    </a>
                ) : <span className="text-slate-400">-</span>}
                </div>
            </td>
            <td className="py-4 text-slate-600 text-left px-2">{appt.doctor}</td>
            <td className="py-4 text-slate-500 text-left px-2 max-w-[200px] truncate">{appt.reason}</td>
            <td className="py-4 text-center kanit-text">
                <div className="flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                    appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                    appt.status === 'cancelled' ? 'bg-rose-100 text-rose-600' :
                    'bg-amber-100 text-amber-600'
                }`}>
                    {appt.status === 'confirmed' ? 'ยืนยันแล้ว' : appt.status === 'cancelled' ? 'ยกเลิก' : 'รอยืนยัน'}
                </span>
                </div>
            </td>
            <td className="py-4 text-center">
                <div className="flex justify-center gap-2 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(appt, false); }} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg"><Pencil size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteAppt(appt.id); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
            </td>
        </tr>
        )
    });
  }, [filteredData, visibleCount]); // 3. Virtualization Concept: โหลดเท่าที่จำเป็น (ตามค่า visibleCount)

  const memoizedApptMobileCards = useMemo(() => {
    return filteredData.slice(0, visibleCount).map((appt, index) => {
        const dtParts = (appt.datetime || '').split(' ');
        const datePart = dtParts[0] || '-';
        const timePart = dtParts[1] ? dtParts[1].replace('น.', '').trim() : '';
        return (
            <div key={`mobile-appt-${appt.id || index}`} onClick={() => handleOpenEdit(appt, true)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                
                {/* แถวที่ 1: รหัส HN, สถานะ และปุ่มจัดการ */}
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-3">
                        {/* ปรับให้ชิดซ้ายตรงกับชื่อคนไข้ และขยายตัวเลขให้เด่นชัดขึ้น */}
                        <span className="font-black text-sky-600 text-base kanit-text tracking-wide">{appt.hn}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                            appt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            appt.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                            {appt.status === 'confirmed' ? 'ยืนยันแล้ว' : appt.status === 'cancelled' ? 'ยกเลิก' : 'รอยืนยัน'}
                        </span>
                    </div>
                </div>

                {/* แถวที่ 2: ชื่อคนไข้ และ เบอร์โทรศัพท์ */}
                <div className="mb-3">
                    <h4 className="font-bold text-slate-800 text-lg font-data leading-tight">{appt.patientName}</h4>
                    <div className="mt-1.5">
                        {(Array.isArray(appt.phone) ? appt.phone[0] : appt.phone) ? (
                            <a href={`tel:${Array.isArray(appt.phone) ? appt.phone[0] : appt.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-sky-600 font-medium font-data text-[11px] sm:text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-fit transition-colors">
                                <Phone size={12} className="text-sky-500" /> {Array.isArray(appt.phone) ? appt.phone[0] : appt.phone}
                            </a>
                        ) : <span className="text-[10px] text-slate-400 block">- ไม่มีเบอร์ติดต่อ -</span>}
                    </div>
                </div>

                {/* แถวที่ 3: ข้อมูลนัดหมาย (จัดกลุ่มในกล่องสีเทาให้อ่านง่าย) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><Clock size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-600 font-data">{datePart}</span>
                            {timePart && <span className="text-sky-600 font-bold ml-1.5">{timePart}</span>}
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                       <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5"><Stethoscope size={10} /></div>
                       <div className="flex-1 min-w-0 pt-0.5">
                           <div className="flex items-center gap-1.5 mb-1">
                               <span className="font-medium text-slate-500">แพทย์:</span>
                               <span className="font-bold text-slate-700 truncate">{appt.doctor || '-'}</span>
                           </div>
                           <div className="flex items-start gap-1.5">
                               <span className="font-medium text-slate-500 shrink-0">อาการ:</span>
                               <span className="text-slate-600 font-data line-clamp-2 leading-snug">{appt.reason || '-'}</span>
                           </div>
                       </div>
                   </div>
                </div>

                {/* แถวที่ 4: ปุ่มจัดการ (ย้ายมาไว้ด้านล่าง สัดส่วน 1:1) */}
                <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAppt(appt.id); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Trash2 size={16} /> ลบ
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(appt, false); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Pencil size={16} /> แก้ไข
                    </button>
                </div>
            </div>
        );
    });
  }, [filteredData, visibleCount]);

  // --- 4. เพิ่ม React.memo (useMemo) ให้ปฏิทิน ป้องกันการเรนเดอร์ใหม่มหาศาลตอนเลื่อนจอ ---
  const memoizedCalendarView = useMemo(() => {
      return (
         <CalendarView 
            activities={augmentedQueueData} 
            onEventClick={(ev) => handleOpenEdit(ev.originalData || ev, true)} 
            onDayClick={(date) => console.log('Day clicked:', date)} 
            dealStatuses={systemStatusTypes} 
         />
      );
  }, [augmentedQueueData]); // อัปเดตปฏิทินเมื่อข้อมูลคิวหรือข้อมูลคนไข้มีการเปลี่ยนแปลง

  return (
    <>
      <div className="fade-in pb-10">
        
        {/* --- 1. Sticky Header ย่อขนาดได้ ปรับใช้ 60FPS CSS Variables --- */}
        <div ref={headerRef} className="sticky top-0 z-30 w-full pointer-events-none">
          <div className="w-full pointer-events-auto sticky-header-bg">
            <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
              <div>
                <h1 className="font-bold text-slate-800 tracking-tight sticky-header-title">ระบบนัดหมาย</h1>
                <p className="text-slate-500 sticky-header-desc">จัดการคิวนัดหมายของคนไข้และแพทย์</p>
              </div>
              <button onClick={handleOpenAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} sticky-header-btn`}>
                <Plus /> <span className="hidden sm:inline">เพิ่มนัดหมายใหม่</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- 2. ปฏิทิน --- */}
        {/* ลบ relative z-30 ออก เพื่อไม่ให้มันขัง Modal เอาไว้ข้างใต้ Header */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-2 mb-3">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100/50 shrink-0">
             {/* เรียกใช้งานปฏิทินที่ถูกล็อกการ Re-render เอาไว้แล้ว */}
             {memoizedCalendarView}
          </div>
        </div>

        {/* เพิ่ม Sentinel ตรงนี้ เพื่อเป็นตัวจับพิกัดที่แท้จริงแทนการจับที่ตัวฟิลเตอร์โดยตรง */}
        <div ref={sentinelRef} className="w-full h-px opacity-0 pointer-events-none -mt-px"></div>

        {/* --- 3. Sticky Filter ซ้อนกันเมื่อชน Header ปรับ z-index เป็น 20 --- */}
        <div ref={filterRef} className="sticky z-20 w-full pointer-events-none">
          <div className="w-full mx-auto pointer-events-none relative h-[88px] z-50">
            <div className="absolute left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm">
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ, รหัส HN, แพทย์ผู้นัด..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner" 
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 4. ตาราง --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden p-0 sm:p-0">
                <div className="px-2 sm:px-4 py-4">
                    {/* --- Desktop View (Table) --- */}
                    {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                    <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-100 text-sm">
                                <th className="pb-4 font-medium text-center">วันที่/เวลา</th>
                                <th className="pb-4 font-medium text-center">รหัส HN</th>
                                <th className="pb-4 font-medium text-left px-2">ชื่อคนไข้</th>
                                <th className="pb-4 font-medium text-center">เบอร์โทร</th>
                                <th className="pb-4 font-medium text-left px-2">แพทย์ผู้นัด</th>
                                <th className="pb-4 font-medium text-left px-2">อาการ</th>
                                <th className="pb-4 font-medium text-center">สถานะ</th>
                                <th className="pb-4 font-medium text-center">จัดการ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {isGlobalLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={`skel-${i}`} className="border-b border-slate-50">
                                    <td className="py-4"><div className="flex flex-col items-center gap-2"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div><div className="h-3 w-12 bg-slate-100 rounded animate-pulse"></div></div></td>
                                    <td className="py-4"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse mx-auto"></div></td>
                                    <td className="py-4"><div className="flex justify-center gap-2"><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                                  </tr>
                                ))
                              ) : memoizedApptTableRows}
                              {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                                  <tr key={`skel-more-${i}`} className="border-b border-slate-50">
                                    <td className="py-4"><div className="flex flex-col items-center gap-2"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div><div className="h-3 w-12 bg-slate-100 rounded animate-pulse"></div></div></td>
                                    <td className="py-4"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse mx-auto"></div></td>
                                    <td className="py-4"><div className="flex justify-center gap-2"><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                                  </tr>
                              ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Mobile View (Cards) --- */}
                    <div className="lg:hidden space-y-4 mt-2">
                        {isGlobalLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={`skel-mob-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-5 w-16 bg-slate-200 rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
                                        <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                                        <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                        <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <>
                                {memoizedApptMobileCards}
                                {!isGlobalLoading && filteredData.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 kanit-text bg-slate-50 rounded-2xl border border-slate-100 border-dashed">ไม่พบข้อมูลการนัดหมาย</div>
                                )}
                                {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                                    <div key={`skel-mob-more-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                                            <div className="h-5 w-16 bg-slate-200 rounded-md animate-pulse"></div>
                                        </div>
                                        <div className="mb-3">
                                            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
                                            <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
          </div>
        </div>
      </div>

      {apptModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${apptModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-2xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${apptModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                  {isViewMode ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : (editingId ? <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> : <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">{isViewMode ? 'รายละเอียดการนัดหมาย' : (editingId ? 'แก้ไขข้อมูลนัดหมาย' : 'เพิ่มนัดหมายใหม่')}</h3>
                  <p className="text-[10px] sm:text-sm text-slate-500 kanit-text truncate leading-tight mt-0.5">{isViewMode ? 'ข้อมูลการนัดหมายสำหรับเรียกดู' : 'ระบุรายละเอียดการนัดหมายคนไข้ล่วงหน้า'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* เหลือแค่ปุ่มปิด X ด้านบน */}
                <button onClick={apptModal.close} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
              <form id="appt-form" onSubmit={handleSaveAppt} className="pb-2">
                <fieldset disabled={isViewMode} className="space-y-5 border-none p-0 m-0 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* ค้นหา HN หรือ ชื่อคนไข้ (เพิ่ม z-index ป้องกัน Dropdown โดนช่องอื่นทับ) */}
                    <div className="md:col-span-2 relative" style={{ zIndex: 20 }}>
                        {/* แสดงคอร์สคงเหลือเมื่อเลือกคนไข้แล้ว (ในหน้านัดหมาย) */}
                        {formData.hn && (
                            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                        <span className="text-[11px] font-black text-indigo-700 kanit-text uppercase tracking-wider">คอร์ส/แพ็กเกจ คงเหลือ</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-400 font-data">HN: {formData.hn}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(() => {
                                        const p = patientsData.find(patient => (patient.id || patient.hn) === formData.hn);
                                        const courses = p?.courses?.filter(c => c.remainingSessions > 0) || [];
                                        if (courses.length === 0) return <span className="text-[10px] text-slate-400 kanit-text italic py-1">ไม่มีคอร์สคงเหลือในประวัติ</span>;
                                        return courses.map(c => (
                                            <div key={c.id} className="px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-[10px] font-bold text-indigo-600 kanit-text shadow-sm flex items-center gap-1.5">
                                                <Package size={12} className="text-indigo-400" />
                                                {c.name} ({c.remainingSessions}/{c.totalSessions})
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">ข้อมูลผู้ป่วย (ค้นหาด้วย HN หรือ ชื่อ) <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <input 
                              required 
                              type="text" 
                              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" 
                              value={formData.searchPatient} 
                              onChange={handlePatientSearchChange} 
                              onFocus={() => setShowPatientSuggest(true)}
                              onBlur={() => setTimeout(() => setShowPatientSuggest(false), 200)}
                              placeholder="พิมพ์ HN หรือ ชื่อคนไข้ (หากไม่พบระบบจะสร้างประวัติใหม่ให้อัตโนมัติ)" 
                           />
                           {showPatientSuggest && formData.searchPatient && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                                 {[...patientsData].filter(p => {
                                    const fName = getPatientFullName(p).toLowerCase();
                                    const fId = getPatientId(p).toLowerCase();
                                    const s = formData.searchPatient.toLowerCase();
                                    return fName.includes(s) || fId.includes(s);
                                 })
                                 .sort((a, b) => {
                                     const valA = getPatientLastVisitStr(a);
                                     const valB = getPatientLastVisitStr(b);
                                     if (valA < valB) return 1;
                                     if (valA > valB) return -1;
                                     return 0;
                                 })
                                 .slice(0, 5).map((p, i) => (
                                    <div key={i} onMouseDown={() => selectPatient(p)} className="px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 flex flex-col">
                                       <span className="font-semibold text-slate-800 text-sm font-data">{getPatientId(p)} - {getPatientFullName(p)}</span>
                                       <span className="text-xs text-slate-500 font-data">{p.phone || p.phone1 ? `📞 ${p.phone || p.phone1}` : 'ไม่มีเบอร์โทรศัพท์'}</span>
                                    </div>
                                 ))}
                                 {patientsData.filter(p => {
                                    const fName = getPatientFullName(p).toLowerCase();
                                    const fId = getPatientId(p).toLowerCase();
                                    const s = formData.searchPatient.toLowerCase();
                                    return fName.includes(s) || fId.includes(s);
                                 }).length === 0 && (
                                    <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2 kanit-text">
                                       <Plus size={16} className="text-sky-500" /> สร้างเป็นผู้ป่วยใหม่: "{formData.searchPatient}"
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">วันที่นัดหมาย <span className="text-rose-500">*</span></label>
                        <div ref={apptDatetimeWrapperRef} className="relative group">
                          <input required type="text" className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.datetime} onChange={(e) => setFormData({...formData, datetime: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." />
                          <button type="button" onClick={handleOpenApptCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>
                        </div>
                    </div>

                    {/* ค้นหาแพทย์ (เพิ่ม z-index) */}
                    <div className="relative" style={{ zIndex: 10 }}>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">แพทย์ผู้นัด</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" 
                            value={formData.doctor} 
                            onChange={(e) => setFormData({...formData, doctor: e.target.value})} 
                            onFocus={() => setShowDoctorSuggest(true)}
                            onBlur={() => setTimeout(() => setShowDoctorSuggest(false), 200)}
                            placeholder="ระบุชื่อแพทย์" 
                        />
                        {showDoctorSuggest && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                                {mockDoctors.filter(d => d.includes(formData.doctor)).map((doc, i) => (
                                    <div key={i} onMouseDown={() => setFormData({...formData, doctor: doc})} className="px-4 py-3 hover:bg-sky-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0 font-data">
                                        {doc}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">ประเภทบริการ</label>
                        <div className="relative">
                            <CustomSelect 
                                value={formData.serviceType} 
                                onChange={(val) => setFormData({...formData, serviceType: val})} 
                                options={[{value:'', label:'เลือกประเภทบริการ'}, 'ตรวจโรคทั่วไป', 'ทันตกรรม', 'ความงาม/ผิวพรรณ', 'ศัลยกรรม', 'ตรวจสุขภาพ', 'ติดตามอาการ']} 
                                disabled={isViewMode} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">สถานะนัดหมาย</label>
                        <div className="relative">
                            <CustomSelect 
                                value={formData.status} 
                                onChange={(val) => setFormData({...formData, status: val})} 
                                options={[{value:'pending', label:'🟡 รอยืนยัน (Pending)'}, {value:'confirmed', label:'🟢 ยืนยันแล้ว (Confirmed)'}, {value:'cancelled', label:'🔴 ยกเลิก (Cancelled)'}]} 
                                disabled={isViewMode} 
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">อาการ</label>
                        <textarea rows="2" className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm resize-none font-data" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} placeholder="เช่น ติดตามอาการ, ฟังผลเลือด..."></textarea>
                    </div>

                    {/* กลุ่มข้อมูลติดต่อเพิ่มเติม */}
                    <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-sky-600 mb-4 flex items-center gap-2 kanit-text"><Phone size={16} /> ข้อมูลการติดต่อ (Social & Phone)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                                <div className="space-y-2">
                                    {formData.phones.map((phone, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input required type="tel" className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={phone} onChange={(e) => handlePhoneChange(idx, e.target.value)} placeholder="08X-XXX-XXXX" />
                                            {formData.phones.length > 1 && !isViewMode && (
                                                <button type="button" onClick={() => removePhone(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    ))}
                                    {!isViewMode && (
                                        <button type="button" onClick={addPhone} className="text-xs font-medium text-sky-500 hover:text-sky-600 flex items-center gap-1 mt-1 kanit-text"><Plus size={14} /> เพิ่มเบอร์โทรศัพท์</button>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">Line ID</label>
                                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.lineId} onChange={(e) => setFormData({...formData, lineId: e.target.value})} placeholder="Line ID" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">Facebook</label>
                                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.facebook} onChange={(e) => setFormData({...formData, facebook: e.target.value})} placeholder="ชื่อ Facebook" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">Instagram</label>
                                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} placeholder="@username" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">TikTok</label>
                                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.tiktok} onChange={(e) => setFormData({...formData, tiktok: e.target.value})} placeholder="@username" />
                            </div>
                        </div>
                    </div>
                </div>
                </fieldset>
              </form>
            </div>
            
            {/* ย้ายปุ่ม Action ต่างๆ มารวมกันไว้ข้างล่างตรงนี้ทั้งหมด พร้อมทำเป็น flex-col-reverse บนมือถือ */}
            <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-row justify-end gap-2 sm:gap-3 bg-white shrink-0 w-full">
                {isViewMode ? (
                    <>
                       <button type="button" onClick={apptModal.close} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ปิดหน้าต่าง</button>
                       <button type="button" onClick={(e) => { e.preventDefault(); setIsViewMode(false); }} className={`flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 ${theme.primary} rounded-xl flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate`}><Pencil size={18} className="shrink-0" /> แก้ไขข้อมูล</button>
                    </>
                ) : (
                    <>
                       <button type="button" onClick={apptModal.close} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ยกเลิก</button>
                       <button type="submit" form="appt-form" disabled={isProcessing} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate">
                           {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div> : <CheckCircle2 size={18} className="shrink-0" />}
                           {editingId ? 'บันทึกการแก้ไข' : 'ยืนยันการนัดหมาย'}
                       </button>
                    </>
                )}
            </div>
          </div>
        </div>
      )}

      {apptCalendar.isOpen && (
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${apptCalendar.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={apptCalendar.close}></div>
          <div className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${apptCalendar.isClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
            
            {apptCalView === 'days' && (
              <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear(), apptCalDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setApptCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[apptCalDate.getMonth()]} {apptCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear(), apptCalDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {Array.from({ length: new Date(apptCalDate.getFullYear(), apptCalDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 sm:h-8"></div>)}
                  {Array.from({ length: new Date(apptCalDate.getFullYear(), apptCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const isSelected = apptCalDate.getDate() === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === apptCalDate.getMonth() && new Date().getFullYear() === apptCalDate.getFullYear();
                    return (
                      <button key={day} type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear(), apptCalDate.getMonth(), day))} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium font-data calendar-btn-anim ${isSelected ? 'cal-selected' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            )}
            
            {apptCalView === 'months' && (
              <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear() - 1, apptCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setApptCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl text-base sm:text-sm font-data">{apptCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear() + 1, apptCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setApptCalDate(new Date(apptCalDate.getFullYear(), i, 1)); setApptCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium kanit-text calendar-btn-anim ${apptCalDate.getMonth() === i ? 'cal-selected' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            
            {apptCalView === 'years' && (
                <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-6 px-1">
                  <button type="button" onClick={() => setApptYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{apptYearPageStart} - {apptYearPageStart + 11}</span>
                  <button type="button" onClick={() => setApptYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => apptYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setApptCalDate(new Date(y - 543, apptCalDate.getMonth(), 1)); setApptCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium font-data calendar-btn-anim ${(apptCalDate.getFullYear() + 543) === y ? 'cal-selected' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            {/* Time & Action Panel - ปรับเลย์เอาต์แนวนอนตามรูปภาพ (Mockup) */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-row items-center justify-between w-full gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <Clock size={16} className="text-sky-500 shrink-0" />
                    
                    <CustomSelect 
                        compact 
                        dropUp
                        value={apptTime.h} 
                        onChange={v => setApptTime({...apptTime, h: v})} 
                        options={Array.from({length:24}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                    
                    <span className="text-slate-400 font-bold kanit-text pb-0.5 shrink-0">:</span>
                    
                    <CustomSelect 
                        compact 
                        dropUp
                        value={apptTime.m} 
                        onChange={v => setApptTime({...apptTime, m: v})} 
                        options={Array.from({length:60}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                </div>
                
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setApptCalDate(now);
                          setApptTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0')});
                          setApptCalView('days');
                    }} className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors kanit-text shadow-sm whitespace-nowrap">ปัจจุบัน</button>
                    <button type="button" onClick={() => {
                          const d = String(apptCalDate.getDate()).padStart(2, '0');
                          const m = String(apptCalDate.getMonth() + 1).padStart(2, '0');
                          const y = apptCalDate.getFullYear() + 543;
                          setFormData({...formData, datetime: `${d}/${m}/${y} ${apptTime.h}:${apptTime.m} น.`});
                          apptCalendar.close();
                    }} className="px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20 transition-colors kanit-text whitespace-nowrap">ตกลง</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {apptAlert.isOpen && (
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${apptAlert.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full max-h-[80dvh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col items-center text-center ${apptAlert.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 kanit-text">{sweetAlert.title}</h3><p className="text-slate-500 mb-8 kanit-text">{sweetAlert.text}</p>
            <div className="flex gap-3 w-full"><button onClick={apptAlert.close} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">ยกเลิก</button><button onClick={sweetAlert.onConfirm} className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-colors shadow-lg shadow-rose-500/30 kanit-text">ยืนยันลบ</button></div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm fade-in">
          <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 modal-animate-in">
            <div className="relative w-16 h-16"><div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div><div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div></div>
            <p className="font-semibold text-slate-700 kanit-text">กำลังประมวลผล...</p>
          </div>
        </div>
      )}
    </>
  );
};

// เพิ่ม Props รับข้อมูลคิวและข้อมูลคนไข้เข้ามาคำนวณ
const Dashboard = ({ queueData = [], patientsData = [], isGlobalLoading }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const headerRef = React.useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ดักจับการ Scroll เฉพาะในหน้า Dashboard
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = (e) => {
      if (headerRef.current) {
          if (e.target.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
          else headerRef.current.classList.remove('is-scrolled');
      }
    };

    // ตรวจสอบสถานะเริ่มต้นทันที
    setTimeout(() => {
        if (mainElement && headerRef.current) {
            if (mainElement.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
            else headerRef.current.classList.remove('is-scrolled');
        }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  const d = String(currentTime.getDate()).padStart(2, '0');
  const m = String(currentTime.getMonth() + 1).padStart(2, '0');
  const y = currentTime.getFullYear() + 543;

  // --- Calculate Dashboard Stats ---
  const todayStr = `${d}/${m}/${y}`;
  const todaysQueue = queueData.filter(appt => {
      if(!appt.datetime) return false;
      return appt.datetime.split(' ')[0] === todayStr;
  });
  const pendingQueue = queueData.filter(appt => appt.status === 'pending' || appt.dealStatus === 'pending');
  
  // เรียงลำดับคิววันนี้ตามเวลา
  const sortedTodaysQueue = [...todaysQueue].sort((a, b) => {
      const timeA = a.datetime.split(' ')[1] || '00:00';
      const timeB = b.datetime.split(' ')[1] || '00:00';
      return timeA.localeCompare(timeB);
  });

  return (
    <div className="fade-in pb-10 w-full">
      
      {/* Sticky Header ย่อขนาดได้แบบ Glassmorphism (ควบคุมผ่าน CSS ล้วน) */}
      <div ref={headerRef} className="sticky top-0 z-30 w-full pointer-events-none">
        <div className="w-full pointer-events-auto sticky-header-bg">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title">ภาพรวมคลินิก</h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">ข้อมูลสรุปประจำวันของสาขานี้</p>
            </div>
            <div className="bg-sky-50 rounded-xl sm:rounded-2xl text-sky-600 font-medium flex items-center gap-1.5 sm:gap-2 font-data shrink-0 dash-date-badge">
              <CalendarRange className="hidden sm:block" />
              <span className="hidden sm:inline">{`${d}/${m}/${y}`}</span>
              <span className="hidden sm:inline">เวลา</span>
              <span>{currentTime.toLocaleTimeString('th-TH')} น.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="คนไข้ทั้งหมด" value={isGlobalLoading ? "-" : patientsData.length} icon={Users} color="sky" />
          <StatCard title="นัดหมายวันนี้" value={isGlobalLoading ? "-" : todaysQueue.length} icon={CalendarRange} color="emerald" />
          <StatCard title="รอยืนยัน" value={isGlobalLoading ? "-" : pendingQueue.length} icon={Clock} color="amber" />
          <StatCard title="สาขาที่เปิด" value="1" icon={Building2} color="slate" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 ${theme.card}`}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 kanit-text flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-500" /> แนวโน้มการนัดหมาย (7 วันย้อนหลัง)</h3>
            <div className="h-64 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 kanit-text relative overflow-hidden">
              {isGlobalLoading ? <Loader2 className="w-8 h-8 animate-spin text-slate-300" /> : (
                  <div className="flex items-end justify-center gap-2 sm:gap-4 h-full w-full p-6 pt-10">
                      {[6,5,4,3,2,1,0].map(offset => {
                          const date = new Date();
                          date.setDate(date.getDate() - offset);
                          const loopDateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543}`;
                          const count = queueData.filter(q => q.datetime && q.datetime.split(' ')[0] === loopDateStr).length;
                          // คำนวณความสูงขั้นต่ำ 10% ถ้ามีคิวจะขยับขึ้นตามสัดส่วน
                          const height = count === 0 ? '10%' : `${Math.min(100, Math.max(15, count * 20))}%`;
                          return (
                              <div key={offset} className="flex flex-col items-center gap-2 flex-1 max-w-[48px] group">
                                  <div className="w-full bg-sky-100/50 rounded-t-xl relative group-hover:bg-sky-200/80 transition-colors flex items-end justify-center" style={{ height }}>
                                      <div className="w-full bg-sky-500 rounded-t-xl transition-all shadow-sm" style={{ height: '50%' }}></div>
                                      <span className="absolute -top-6 text-xs font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity font-data bg-white px-2 py-0.5 rounded-md shadow-sm">{count}</span>
                                  </div>
                                  <span className={`text-[10px] sm:text-xs font-medium font-data ${offset === 0 ? 'text-sky-600 font-bold' : 'text-slate-500'}`}>{date.getDate()}/{date.getMonth()+1}</span>
                              </div>
                          );
                      })}
                  </div>
              )}
            </div>
          </div>
          <div className={theme.card}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 kanit-text flex items-center gap-2"><List className="w-5 h-5 text-sky-500" /> รายการคิววันนี้</h3>
            <div className="space-y-3 max-h-[256px] overflow-y-auto custom-scrollbar pr-2">
              {isGlobalLoading ? (
                 <div className="text-center py-10 text-slate-400 text-sm kanit-text flex flex-col items-center gap-3"><Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500"/> กำลังโหลดข้อมูล...</div>
              ) : sortedTodaysQueue.length === 0 ? (
                 <div className="text-center py-10 text-slate-400 text-sm kanit-text bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2"><CalendarRange className="w-8 h-8 text-slate-300"/> ไม่มีนัดหมายในวันนี้</div>
              ) : sortedTodaysQueue.map((appt, i) => {
                 const time = appt.datetime.split(' ')[1] ? appt.datetime.split(' ')[1].replace('น.', '').trim() : '-';
                 const statusType = appt.status || appt.dealStatus;
                 return (
                <div key={appt.id || i} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100/50 hover:border-sky-200 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex flex-col items-center justify-center font-bold font-data shrink-0 shadow-inner group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <span className="text-[9px] font-normal leading-none kanit-text">คิว</span>
                    <span className="leading-none mt-0.5 text-sm">{i+1}</span>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-bold text-slate-700 kanit-text truncate text-sm leading-tight">{appt.patientName || appt.name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 font-data mt-1 truncate"><Clock size={10} className="text-sky-400 shrink-0" /> {time} น. <span className="text-slate-300 mx-0.5 shrink-0">|</span> <span className="truncate kanit-text">{appt.reason || appt.category || '-'}</span></p>
                  </div>
                  <div className="shrink-0 pt-1 pl-1">
                      {statusType === 'confirmed' ? <CheckCircle2 size={16} className="text-emerald-500" title="ยืนยันแล้ว"/> : statusType === 'cancelled' ? <AlertCircle size={16} className="text-rose-500" title="ยกเลิก"/> : <AlertCircle size={16} className="text-amber-500" title="รอยืนยัน"/>}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- คอมโพเนนต์ Modal เวชระเบียน (แยกออกมาเพื่อประสิทธิภาพ) ---
const PatientModal = React.memo(({ 
    isOpen, isClosing, isViewMode, setIsViewMode, editingId, formData, setFormData, 
    calculatedAge, closeMedModal, handleSavePatient, handleSmartCardRead, 
    setIsScannerOpen, isProcessing, formatDateTime, theme, handleDobChange, 
    handleOpenCalendar, dobWrapperRef, posProducts, handleOpenOpdCalendar, 
    opdWrapperRef, showOpdForm, handleOpenOpdForm, isClosingOpdForm, 
    newOpdRecord, setNewOpdRecord, openTxDropdownIndex, setOpenTxDropdownIndex,
    handleCancelOpdForm, handleSaveOpdRecord, handleDeleteOpdRecord, 
    opdSectionRef, opdFormSectionRef, copyAddressToCurrent, 
    handlePatientPhoneChange, removePatientPhone, addPatientPhone, 
    showPrefixDropdown, setShowPrefixDropdown, formatDate, CustomSelect,
    isScanning, videoRef, handleCapture, handleSelectDate, thaiMonths, thaiMonthsShort,
    calDate, calView, setCalDate, setCalView, handlePrevMonth, handleNextMonth,
    blankDays, monthDays, opdCalDate, setOpdCalDate, opdCalView, setOpdCalView,
    opdYearPageStart, setOpdYearPageStart, opdTime, setOpdTime, isCalendarClosing,
    closeMedCalendar, isOpdCalendarClosing, closeMedOpdCalendar, sweetAlert, 
    isAlertClosing, closeMedAlert, editingOpdIndex, yearPageStart, setYearPageStart, CheckCircle2, Loader2, ScanText, X, FileText, Pencil, Plus, Users, CreditCard, Clock, MapPin, Package, Stethoscope, Phone, Trash2, CalendarIcon, User, UserPlus, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle
}) => {

  // --- เพิ่มฟังก์ชันสำหรับพิมพ์ใบประวัติการรักษา (OPD) ---
  const handlePrintOpdRecord = (record, index) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups');
        return;
    }

    // คำนวณครั้งที่เข้ารับการรักษา (สมมติว่ารายการล่าสุดอยู่บนสุด)
    const visitNumber = (formData.opdRecords ? formData.opdRecords.length : 1) - index;
    const dateStr = record.datetime ? record.datetime.split(' ')[0] : '-';
    
    // ตัดคำว่า HN ออกเพื่อความสวยงามตามแบบฟอร์ม
    const hnNumberOnly = (formData.hn || '').replace(/^HN/i, '');
    const fullName = `${formData.prefix ? formData.prefix + ' ' : ''}${formData.firstName || ''} ${formData.lastName || ''}`.trim();
    
    // ดึงที่อยู่ปัจจุบัน ถ้าไม่มีให้ใช้ตามบัตร ปชช.
    const addressStr = `${formData.curAddress || formData.address || ''} ${formData.curMoo || formData.moo ? 'ม.'+(formData.curMoo || formData.moo) : ''} ${formData.curRoad || formData.road ? 'ถ.'+(formData.curRoad || formData.road) : ''} ${formData.curSubDistrict || formData.subDistrict || ''} ${formData.curDistrict || formData.district || ''} ${formData.curProvince || formData.province || ''} ${formData.curZipcode || formData.zipcode || ''}`.trim();
    const phoneStr = formData.phones && formData.phones.length > 0 ? formData.phones[0] : '';

    // จัดการช่อง Checkbox ตามแบบฟอร์ม (ใช้การค้นหาคำในรายการการรักษา tx)
    const tcmItemsRow1 = ['ฝังเข็ม', 'ครอบแก้ว', 'อบโคม', 'รมยา', 'กัวซา'];
    const tcmItemsRow2 = ['มังกรไฟ', 'ทุนหนา', 'ยาจีน', 'แมะ', 'ฝังเข็มกระตุ้นไฟฟ้า'];
    
    const renderCheckbox = (name) => {
        const isChecked = Array.isArray(record.tx) ? record.tx.some(t => t && t.includes(name)) : (record.tx && record.tx.includes(name));
        const checkMark = isChecked ? '&#10003;' : '&nbsp;&nbsp;&nbsp;'; 
        if(name === 'ฝังเข็มกระตุ้นไฟฟ้า') {
             return `<div class="checkbox-item" style="align-items: flex-start;"><span class="box" style="margin-top: 2px;">${checkMark}</span> <div>ฝังเข็ม<br/>กระตุ้นไฟฟ้า</div></div>`;
        }
        return `<div class="checkbox-item"><span class="box">${checkMark}</span> ${name}</div>`;
    };

    const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบ OPD - ${formData.hn}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
            @page { size: A5 landscape; margin: 10mm; }
            .container { width: 100%; box-sizing: border-box; display: flex; flex-direction: column; height: 100%; }
            
            .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
            .clinic-info { line-height: 1.4; font-size: 12px; }
            .clinic-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            
            .doc-info { text-align: left; }
            .doc-info-row { display: flex; align-items: baseline; margin-bottom: 6px; font-weight: bold; }
            
            .row { display: flex; align-items: baseline; margin-bottom: 10px; width: 100%; }
            .label { white-space: nowrap; margin-right: 5px; font-weight: bold; }
            
            /* เทคนิคเส้นประแบบ Gradient ตามที่ผู้ใช้งานต้องการ */
            .value { 
              flex-grow: 1; 
              border: none;
              border-bottom: 1px solid transparent;
              border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
              text-align: center; 
              padding-bottom: 1px; 
              min-width: 20px; 
              margin-right: 10px; 
            }
            .value.left { text-align: left; padding-left: 5px; }
            .value:last-child { margin-right: 0; }
            .w-auto { flex-grow: 0; }
            
            .vitals { display: flex; align-items: baseline; margin-bottom: 12px; font-weight: bold; }
            .vitals .val-box { 
                border: none; border-bottom: 1px solid transparent;
                border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
                min-width: 40px; text-align: center; margin: 0 4px; padding-bottom: 1px; font-weight: normal; display: inline-block;
            }
            
            .cc-section { margin-bottom: 10px; flex-grow: 1; }
            .cc-title { font-weight: bold; margin-bottom: 4px; }
            .cc-content { min-height: 40px; padding-left: 10px; }
            
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 10px; border-top: 1px dotted #ccc; }
            .checkbox-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px 15px; font-size: 12px; flex-grow: 1; }
            .checkbox-item { display: flex; align-items: center; gap: 6px; }
            .box { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; text-align: center; line-height: 10px; font-size: 10px; font-weight: bold; flex-shrink: 0; }
            
            .signature { text-align: center; font-size: 12px; width: 180px; margin-left: 20px; }
            
            /* บังคับให้พิมพ์เส้นประออก 100% เป็นสีดำ */
            @media print {
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
               .value, .val-box {
                 border-image: repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 4px) 1 !important;
               }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="clinic-info">
                    <div class="clinic-name">ฟู่ ซิน ไถ คลินิก</div>
                    <div>79/47 ปากทางเข้าหมู่บ้านพรธิสาร 5 คลอง 7</div>
                    <div>ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110</div>
                    <div>โทร. 062-826-1696</div>
                </div>
                <div class="doc-info" style="width: 300px;">
                    <div class="doc-info-row" style="font-size: 20px; margin-bottom: 10px;">
                        <span style="margin-right: 15px;">HN</span>
                        <span>${hnNumberOnly}</span>
                    </div>
                    <div class="doc-info-row" style="font-size: 14px;">
                        <span>วันที่:</span>
                        <span class="value w-auto" style="width: 100px;">${dateStr}</span>
                        <span style="margin-left: 10px;">ครั้งที่:</span>
                        <span class="value w-auto" style="width: 40px;">${visitNumber}</span>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <span class="label">ชื่อผู้ป่วย:</span><span class="value left">${fullName}</span>
                <span class="label">ชื่อเล่น:</span><span class="value w-auto" style="width: 80px;">${formData.nickname || '-'}</span>
                <span class="label">เพศ:</span><span class="value w-auto" style="width: 60px;">${formData.gender || '-'}</span>
            </div>
            
            <div class="row">
                <span class="label">เลขบัตรประชาชน:</span><span class="value left" style="width: 140px; flex-grow: 0;">${formData.idCard || '-'}</span>
                <span class="label">อายุ:</span><span class="value w-auto" style="width: 100px;">${calculatedAge}</span>
                <span class="label">โทร:</span><span class="value">${phoneStr}</span>
            </div>
            
            <div class="row">
                <span class="label">ที่อยู่:</span><span class="value left">${addressStr}</span>
            </div>
            
            <div class="row">
                <span class="label">โรคประจำตัว:</span><span class="value left">${formData.underlyingDisease || 'ไม่มี'}</span>
                <span class="label">แพ้ยา/อาหาร:</span><span class="value left">${formData.allergies || 'ไม่มี'}</span>
            </div>
            
            <div class="vitals">
                T: <span class="val-box">${record.temp || ''}</span> °C &nbsp;&nbsp;&nbsp;
                P: <span class="val-box">${record.pulse || ''}</span> /min &nbsp;&nbsp;&nbsp;
                BP: <span class="val-box" style="min-width: 60px;">${record.bp || ''}</span> mmHg &nbsp;&nbsp;&nbsp;
                น้ำหนัก: <span class="val-box">${record.weight || ''}</span> kg &nbsp;&nbsp;&nbsp;
                ส่วนสูง: <span class="val-box">${record.height || ''}</span> cm
            </div>
            
            <div class="cc-section">
                <div class="cc-title">อาการสำคัญ:</div>
                <div class="cc-content">${(record.cc || '').replace(/\\n/g, '<br/>')}</div>
            </div>
            
            <div class="footer">
                <div class="checkbox-grid">
                    ${tcmItemsRow1.map(renderCheckbox).join('')}
                    ${tcmItemsRow2.map(renderCheckbox).join('')}
                </div>
                <div class="signature">
                    <div class="value" style="width: 100%; margin: 0 auto 5px auto;"></div>
                    (พจ. พงษ์สิทธิ์ แซ่อึ้ง)
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
      <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-5xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                {isViewMode ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : (editingId ? <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">{editingId ? `${formData.hn} - ${formData.prefix}${formData.firstName} ${formData.lastName}` : 'เพิ่มเวชระเบียนใหม่'}</h3>
              <p className="text-[10px] sm:text-sm text-slate-500 kanit-text truncate leading-tight mt-0.5">{isViewMode ? `อายุ ${calculatedAge} | ข้อมูลคนไข้สำหรับเรียกดู` : (editingId ? `อายุ ${calculatedAge} | แก้ไขข้อมูลเวชระเบียน` : 'กรอกข้อมูลคนไข้ให้ครบถ้วน')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button type="button" onClick={closeMedModal} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
          </div>
        </div>
        
        <div className="p-4 sm:p-5 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
          <form id="patient-form" onSubmit={handleSavePatient}>
            <fieldset disabled={isViewMode} className="space-y-5 sm:space-y-6 border-none p-0 m-0 min-w-0">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
              <div className="border-b border-sky-100 pb-3 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><Users size={20} /> ข้อมูลส่วนตัว</h4>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {!isViewMode && (
                    <>
                      <button 
                        type="button" 
                        onClick={handleSmartCardRead} 
                        disabled={isProcessing}
                        className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-emerald-100 shadow-sm disabled:opacity-50"
                      >
                        <CreditCard size={16} /> <span className="hidden sm:inline">อ่านข้อมูลจากบัตร</span><span className="sm:hidden">อ่านบัตร</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setIsScannerOpen(true)} 
                        className="text-xs sm:text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-indigo-100 shadow-sm"
                      >
                        <ScanText size={16} /> <span className="hidden sm:inline">สแกนจากกล้อง (OCR)</span><span className="sm:hidden">สแกนกล้อง</span>
                      </button>
                    </>
                  )}
                  <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 kanit-text">
                    <Clock size={16} className="text-slate-400" /><span>ลงทะเบียน: {formatDateTime(formData.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">HN <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} bg-slate-100 text-slate-500 cursor-not-allowed font-data`} value={formData.hn} disabled readOnly /></div>
                
                <div className="relative" style={{ zIndex: 30 }}>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">คำนำหน้า <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className={`${theme.input} font-data pr-10`} 
                      value={formData.prefix} 
                      onChange={(e) => setFormData({...formData, prefix: e.target.value})} 
                      disabled={isViewMode} 
                      placeholder="พิมพ์หรือเลือก" 
                      onFocus={() => setShowPrefixDropdown(true)} 
                      onBlur={() => setTimeout(() => setShowPrefixDropdown(false), 200)} 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={18} className={`transition-transform duration-200 ${showPrefixDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {showPrefixDropdown && !isViewMode && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                        {['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.', 'พระ', 'ดร.', 'นพ.', 'พญ.', 'ทพ.', 'ว่าที่ ร.ต.'].map(opt => (
                          <div 
                            key={opt} 
                            onMouseDown={(e) => { e.preventDefault(); setFormData({...formData, prefix: opt}); setShowPrefixDropdown(false); }} 
                            className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${formData.prefix === opt ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อ <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} /></div>
                <div className="md:col-span-2 lg:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">นามสกุล <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อเล่น</label><input type="text" className={`${theme.input} font-data`} value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} /></div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">วัน/เดือน/ปีเกิด <span className="text-rose-500">*</span></label>
                  <div ref={dobWrapperRef} className="relative group">
                    <input required type="text" className={`${theme.input} pr-12 font-data`} value={formData.dob} onChange={handleDobChange} placeholder="วว/ดด/ปปปป" maxLength="10" />
                    {!isViewMode && (<button type="button" onClick={handleOpenCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>)}
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อายุ</label><input type="text" className={`${theme.input} bg-slate-100 text-slate-500 font-data`} value={calculatedAge} disabled readOnly /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เพศ <span className="text-rose-500">*</span></label>
                  <CustomSelect value={formData.gender} onChange={(val) => setFormData({...formData, gender: val})} options={[{value:'', label:'เลือก'}, 'ชาย', 'หญิง', 'ไม่ระบุ']} disabled={isViewMode} />
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมายเลขบัตรประชาชน/พาสปอร์ต</label><input type="text" className={`${theme.input} font-data`} value={formData.idCard} onChange={(e) => setFormData({...formData, idCard: e.target.value})} maxLength="13" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">สัญชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เชื้อชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.ethnicity} onChange={(e) => setFormData({...formData, ethnicity: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ศาสนา</label><input type="text" className={`${theme.input} font-data`} value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาชีพ</label><input type="text" className={`${theme.input} font-data`} value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} /></div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><MapPin size={20} /> ข้อมูลติดต่อ</h4>
              <div className="mb-6">
                <h5 className="font-semibold text-slate-700 mb-3 kanit-text">ที่อยู่ตามบัตรประชาชน</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน / อาคาร</label><input type="text" className={`${theme.input} font-data`} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.moo} onChange={(e) => setFormData({...formData, moo: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.road} onChange={(e) => setFormData({...formData, road: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.subDistrict} onChange={(e) => setFormData({...formData, subDistrict: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.zipcode} onChange={(e) => setFormData({...formData, zipcode: e.target.value})} maxLength="5" disabled={isViewMode} /></div>
                </div>
              </div>
              <div className="h-px w-full bg-slate-100 my-6"></div>
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h5 className="font-semibold text-slate-700 kanit-text">ที่อยู่ปัจจุบัน <span className="text-slate-400 font-normal text-xs">(ที่สามารถติดต่อได้)</span></h5>
                  {!isViewMode && (
                    <button type="button" onClick={copyAddressToCurrent} className="text-xs bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-lg kanit-text transition-colors font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto">
                      <MapPin size={14} /> ใช้ที่อยู่เดียวกับบัตรประชาชน
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน / อาคาร</label><input type="text" className={`${theme.input} font-data`} value={formData.curAddress} onChange={(e) => setFormData({...formData, curAddress: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.curMoo} onChange={(e) => setFormData({...formData, curMoo: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.curRoad} onChange={(e) => setFormData({...formData, curRoad: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.curSubDistrict} onChange={(e) => setFormData({...formData, curSubDistrict: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.curDistrict} onChange={(e) => setFormData({...formData, curDistrict: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.curProvince} onChange={(e) => setFormData({...formData, curProvince: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.curZipcode} onChange={(e) => setFormData({...formData, curZipcode: e.target.value})} maxLength="5" disabled={isViewMode} /></div>
                </div>
              </div>
              <div className="h-px w-full bg-slate-100 my-6"></div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                <div className="space-y-3 max-w-md">
                    {formData.phones.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input 
                              required 
                              type="tel" 
                              className={`${theme.input} py-2.5 font-data`} 
                              value={phone} 
                              onChange={(e) => handlePatientPhoneChange(idx, e.target.value)} 
                              placeholder="08X-XXX-XXXX" 
                              disabled={isViewMode} 
                            />
                            {formData.phones.length > 1 && !isViewMode && (
                                <button type="button" onClick={() => removePatientPhone(idx)} className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-rose-100"><Trash2 size={20} /></button>
                            )}
                        </div>
                    ))}
                    {!isViewMode && (
                        <button type="button" onClick={addPatientPhone} className="text-xs sm:text-sm font-medium text-sky-500 hover:text-sky-600 flex items-center justify-center gap-1.5 mt-2 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition-colors kanit-text w-full sm:w-auto border border-sky-100">
                            <Plus size={16} /> เพิ่มเบอร์โทรศัพท์ติดต่อ
                        </button>
                    )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Phone size={20} /> ผู้ติดต่อกรณีฉุกเฉิน</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อผู้ติดต่อ</label><input type="text" className={`${theme.input} font-data`} value={formData.emName} onChange={(e) => setFormData({...formData, emName: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เกี่ยวข้องเป็น</label><input type="text" className={`${theme.input} font-data`} value={formData.emRelation} onChange={(e) => setFormData({...formData, emRelation: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label><input type="tel" className={`${theme.input} font-data`} value={formData.emPhone} onChange={(e) => setFormData({...formData, emPhone: e.target.value})} /></div>
                <div className="md:col-span-2 lg:col-span-3"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ที่ติดต่อได้</label><input type="text" className={`${theme.input} font-data`} value={formData.emAddress} onChange={(e) => setFormData({...formData, emAddress: e.target.value})} /></div>
              </div>
            </div>

            {isViewMode && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm relative z-10">
                <h4 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-3 mb-5 flex items-center gap-2 kanit-text">
                  <Package size={20} /> คอร์ส/แพ็กเกจ คงเหลือ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.courses && formData.courses.filter(c => c.remainingSessions > 0).length > 0 ? (
                    formData.courses.filter(c => c.remainingSessions > 0).map(course => (
                      <div key={course.id} className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100/50 px-2 py-0.5 rounded-md">คงเหลือ {course.remainingSessions}/{course.totalSessions}</div>
                          <div className="text-[10px] text-slate-400 font-data">{formatDate(course.purchasedAt)}</div>
                        </div>
                        <h5 className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{course.name}</h5>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-500" 
                            style={{ width: `${(course.remainingSessions / course.totalSessions) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="md:col-span-3 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-slate-400 kanit-text text-sm italic">ยังไม่มีคอร์สคงเหลือในขณะนี้</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Stethoscope size={20} /> ข้อมูลสุขภาพเบื้องต้น</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่เลือด</label>
                  <CustomSelect value={formData.bloodGroup} onChange={(val) => setFormData({...formData, bloodGroup: val})} options={[{value:'', label:'ไม่ทราบ'}, 'A', 'B', 'O', 'AB']} disabled={isViewMode} />
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาการสำคัญที่มาพบแพทย์ <span className="text-rose-500">*</span></label><textarea required rows="2" className={`${theme.input} resize-none font-data`} value={formData.chiefComplaint} onChange={(e) => setFormData({...formData, chiefComplaint: e.target.value})}></textarea></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ประวัติการแพ้อาหาร/ยา/สมุนไพร (ถ้ามี)</label><textarea rows="2" className={`${theme.input} resize-none font-data`} value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})}></textarea></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">โรคประจำตัว (ถ้ามี)</label><textarea rows="2" className={`${theme.input} resize-none font-data`} value={formData.underlyingDisease} onChange={(e) => setFormData({...formData, underlyingDisease: e.target.value})}></textarea></div>
              </div>
            </div>
            </fieldset>

            <div ref={opdSectionRef} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10 mt-6 sm:mt-8">
              <div className="border-b border-sky-100 pb-3 mb-5 flex justify-between items-center">
                <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><FileText size={20} /> ประวัติการรักษา (OPD)</h4>
                {!showOpdForm && (<button type="button" onClick={() => handleOpenOpdForm()} className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 sm:gap-2 kanit-text"><Plus size={16} /> <span className="hidden sm:inline">เพิ่มประวัติการรักษา</span><span className="sm:hidden">เพิ่ม</span></button>)}
              </div>
              {showOpdForm && (
                <div ref={opdFormSectionRef} className={`bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6 shadow-inner ${isClosingOpdForm ? 'fade-out-up' : 'fade-in-up'}`}>
                  <h5 className="font-semibold text-slate-700 mb-4 kanit-text">{editingOpdIndex !== null ? 'แก้ไขบันทึกการรักษา' : 'บันทึกการรักษาใหม่'}</h5>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">วันที่/เวลา</label>
                        <div ref={opdWrapperRef} className="relative group">
                          <input type="text" className={`${theme.input} bg-white py-2 text-sm pr-9 font-data`} value={newOpdRecord.datetime} onChange={(e) => setNewOpdRecord({...newOpdRecord, datetime: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." />
                          <button type="button" onClick={handleOpenOpdCalendar} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-500 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">แพทย์ผู้รักษา</label>
                        <input type="text" className={`${theme.input} bg-white py-2 text-sm font-data`} value={newOpdRecord.doctor} onChange={(e) => setNewOpdRecord({...newOpdRecord, doctor: e.target.value})} placeholder="ระบุชื่อแพทย์" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">อุณหภูมิ (°C)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.temp} onChange={(e) => setNewOpdRecord({...newOpdRecord, temp: e.target.value})} placeholder="36.5" /></div>
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">สัญญาณชีพ (/min)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.pulse} onChange={(e) => setNewOpdRecord({...newOpdRecord, pulse: e.target.value})} placeholder="80" /></div>
                       <div className="col-span-2 md:col-span-1"><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ความดัน</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.bp} onChange={(e) => setNewOpdRecord({...newOpdRecord, bp: e.target.value})} placeholder="120/80" /></div>
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">น้ำหนัก (kg)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.weight} onChange={(e) => setNewOpdRecord({...newOpdRecord, weight: e.target.value})} placeholder="60" /></div>
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ส่วนสูง (cm)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.height} onChange={(e) => setNewOpdRecord({...newOpdRecord, height: e.target.value})} placeholder="170" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">อาการสำคัญ (CC)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.cc} onChange={(e) => setNewOpdRecord({...newOpdRecord, cc: e.target.value})} placeholder="เช่น มีไข้ ไอ เจ็บคอ..."></textarea></div>
                      <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การวินิจฉัย (Dx)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.dx} onChange={(e) => setNewOpdRecord({...newOpdRecord, dx: e.target.value})} placeholder="เช่น Acute Pharyngitis..."></textarea></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การรักษาที่ให้</label>
                      <div className="flex flex-col gap-2">
                        {newOpdRecord.tx.map((treatment, txIndex) => (
                          <div key={txIndex} className="flex gap-2 items-stretch w-full">
                            <div className="relative flex-1" style={{ zIndex: 50 - txIndex }}>
                              <input 
                                  type="text"
                                  className={`${theme.input} bg-white py-2 text-sm font-data pr-10`}
                                  value={treatment} 
                                  onChange={(e) => {
                                      const updatedTx = [...newOpdRecord.tx];
                                      updatedTx[txIndex] = e.target.value;
                                      setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                  }} 
                                  onFocus={() => setOpenTxDropdownIndex(txIndex)}
                                  onBlur={() => setTimeout(() => { if (openTxDropdownIndex === txIndex) setOpenTxDropdownIndex(null) }, 200)}
                                  placeholder="พิมพ์ค้นหา หรือเลือกจากรายการ..."
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={18} className={`transition-transform duration-200 ${openTxDropdownIndex === txIndex ? 'rotate-180' : ''}`} />
                              </div>
                              {openTxDropdownIndex === txIndex && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                                  {posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).length > 0 ? (
                                      posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).map(p => (
                                        <div
                                          key={p.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            const updatedTx = [...newOpdRecord.tx];
                                            updatedTx[txIndex] = p.name;
                                            setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                            setOpenTxDropdownIndex(null);
                                          }}
                                          className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${treatment === p.name ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                                        >
                                          {p.name}
                                        </div>
                                      ))
                                  ) : (
                                      <div className="px-3 py-2.5 text-sm text-slate-400 font-data flex items-center gap-2 pointer-events-none">
                                          <Plus size={14} className="text-sky-500" /> พิมพ์เพื่อระบุการรักษาเพิ่มเติม...
                                      </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {newOpdRecord.tx.length > 1 && (
                              <button type="button" onClick={() => {
                                  const updatedTx = newOpdRecord.tx.filter((_, i) => i !== txIndex);
                                  setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                              }} className="px-3 bg-white text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors flex items-center justify-center shrink-0">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setNewOpdRecord({...newOpdRecord, tx: [...newOpdRecord.tx, '']})} className="px-4 py-2 mt-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-2xl text-sm font-semibold hover:bg-sky-100 whitespace-nowrap transition-colors flex items-center gap-1 self-start kanit-text">
                          <Plus size={16} /> เพิ่มรายการรักษา
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">หมายเหตุเพิ่มเติม</label>
                      <textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.note} onChange={(e) => setNewOpdRecord({...newOpdRecord, note: e.target.value})} placeholder="รายละเอียดหรือคำแนะนำเพิ่มเติม..."></textarea>
                    </div>
                  </div>
                  <div className="flex flex-row justify-end gap-2 mt-4 pt-4 border-t border-slate-200 w-full">
                    <button type="button" onClick={handleCancelOpdForm} className="flex-1 sm:flex-none px-2 sm:px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors kanit-text truncate">ยกเลิก</button>
                    <button type="button" onClick={handleSaveOpdRecord} className="flex-1 sm:flex-none px-2 sm:px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-xl font-medium shadow-md transition-colors kanit-text truncate">
                      {editingOpdIndex !== null ? 'บันทึกการแก้ไข' : 'ยืนยันการเพิ่ม'}
                    </button>
                  </div>
                </div>
              )}

              {formData.opdRecords && formData.opdRecords.length > 0 ? (
                <div className="border border-slate-100 rounded-xl bg-white overflow-hidden">
                  <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left border-collapse min-w-[800px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 kanit-text">
                          <th className="p-3 font-medium">วันที่/เวลา</th><th className="p-3 font-medium">Vitals</th><th className="p-3 font-medium">อาการ/วินิจฉัย</th><th className="p-3 font-medium">การรักษา</th><th className="p-3 font-medium">แพทย์</th><th className="p-3 font-medium text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.opdRecords.map((record, index) => (
                          <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/80 align-top font-data">
                            <td className="p-3 text-slate-700 whitespace-nowrap"><div className="font-semibold">{record.datetime ? record.datetime.split(' ')[0] : '-'}</div><div className="text-xs text-slate-500">{record.datetime ? record.datetime.split(' ').slice(1).join(' ') : ''}</div></td>
                            <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                              T: <span className="font-data font-semibold text-slate-700">{record.temp || '-'}</span> | PR: <span className="font-data font-semibold text-slate-700">{record.pulse || '-'}</span> | BP: <span className="font-data font-semibold text-slate-700">{record.bp || '-'}</span><br/>
                              W: <span className="font-data font-semibold text-slate-700">{record.weight || '-'}</span> | H: <span className="font-data font-semibold text-slate-700">{record.height || '-'}</span>
                            </td>
                            <td className="p-3 text-slate-700 max-w-[150px]">
                              <div className="text-sm font-semibold truncate" title={record.cc}>{record.cc || '-'}</div>
                              <div className="text-xs text-sky-600 font-medium truncate mt-0.5" title={record.dx}>{record.dx || '-'}</div>
                            </td>
                            <td className="p-3 text-slate-600 text-xs max-w-[150px]">
                              {Array.isArray(record.tx) ? (
                                record.tx.filter(t => t).map((t, idx) => (
                                  <span key={idx} className="inline-block px-2 py-1 bg-sky-50 text-sky-600 rounded-md mb-1 mr-1">{t}</span>
                                ))
                              ) : (
                                <span className="inline-block px-2 py-1 bg-sky-50 text-sky-600 rounded-md mb-1">{record.tx || '-'}</span>
                              )}
                              {record.note && <div className="truncate text-slate-400 mt-0.5" title={record.note}>* {record.note}</div>}
                            </td>
                            <td className="p-3 text-slate-700 whitespace-nowrap">{record.doctor || '-'}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => handleOpenOpdForm(index, record)} className="text-slate-400 hover:text-sky-600 p-1.5 bg-white hover:bg-sky-50 border border-slate-100 rounded-lg shadow-sm transition-colors" title="แก้ไข">
                                  <Pencil size={16} />
                                </button>
                                <button type="button" onClick={() => handleDeleteOpdRecord(index)} className="text-rose-400 hover:text-rose-600 p-1.5 bg-white hover:bg-rose-50 border border-slate-100 rounded-lg shadow-sm transition-colors" title="ลบ">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                      {formData.opdRecords.map((record, index) => (
                          <div key={`opd-mobile-${index}`} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors space-row-animation" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                              <div className="flex justify-between items-start">
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2">
                                          <CalendarIcon size={14} className="text-sky-500" />
                                          {record.datetime ? record.datetime.split(' ')[0] : '-'}
                                      </div>
                                      <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                          <Clock size={12} /> {record.datetime ? record.datetime.split(' ').slice(1).join(' ') : ''}
                                      </div>
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div>
                                      <span className="font-semibold text-slate-500">Vitals:</span>
                                      <span className="text-slate-600 ml-1 font-data">T:{record.temp||'-'} PR:{record.pulse||'-'} BP:{record.bp||'-'} W:{record.weight||'-'} H:{record.height||'-'}</span>
                                  </div>
                                  <div>
                                      <span className="font-semibold text-slate-500">อาการ (CC):</span>
                                      <span className="text-slate-700 ml-1 font-data">{record.cc || '-'}</span>
                                  </div>
                                  <div>
                                      <span className="font-semibold text-sky-600">วินิจฉัย (Dx):</span>
                                      <span className="text-slate-700 ml-1 font-data font-medium">{record.dx || '-'}</span>
                                  </div>
                                  <div>
                                      <span className="font-semibold text-emerald-600">การรักษา:</span>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                          {Array.isArray(record.tx) ? (
                                            record.tx.filter(t => t).map((t, idx) => (
                                              <span key={idx} className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">{t}</span>
                                            ))
                                          ) : (
                                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">{record.tx || '-'}</span>
                                          )}
                                      </div>
                                      {record.note && <div className="mt-1 text-slate-400 italic">* {record.note}</div>}
                                  </div>
                                  <div className="pt-2 mt-1 border-t border-slate-200/60 flex items-center justify-between">
                                      <span className="text-[10px] font-semibold text-slate-400">แพทย์ผู้รักษา</span>
                                      <span className="font-medium text-sky-600 font-data flex items-center gap-1"><User size={12}/> {record.doctor || '-'}</span>
                                  </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 pt-1">
                                  <button type="button" onClick={() => handlePrintOpdRecord(record, index)} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm">
                                      <Printer size={14} /> พิมพ์
                                  </button>
                                  <button type="button" onClick={() => handleDeleteOpdRecord(index)} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-white border border-slate-100 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm">
                                      <Trash2 size={14} /> ลบ
                                  </button>
                                  <button type="button" onClick={() => handleOpenOpdForm(index, record)} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-white border border-slate-100 hover:bg-sky-50 hover:border-sky-100 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm">
                                      <Pencil size={14} /> แก้ไข
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed kanit-text"><FileText size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-sm">ยังไม่มีประวัติการรักษา</p></div>
              )}
            </div>
          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-row justify-end gap-2 sm:gap-3 bg-white shrink-0 w-full">
            {isViewMode ? (
                <>
                   <button type="button" onClick={closeMedModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ปิดหน้าต่าง</button>
                   <button type="button" onClick={(e) => { e.preventDefault(); setIsViewMode(false); }} className={`flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 ${theme.primary} rounded-xl flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate`}><Pencil size={18} className="shrink-0" /> แก้ไขข้อมูล</button>
                </>
            ) : (
                <>
                   <button type="button" onClick={closeMedModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ยกเลิก</button>
                   <button type="submit" form="patient-form" disabled={isProcessing} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate">
                       {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div> : <CheckCircle2 size={18} className="shrink-0" />}
                       {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                   </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
});

const MedicalRecords = ({ patientsData, setPatientsData, currentBranch, callAppScript, showToast, isGlobalLoading, posProducts = [] }) => {
  // --- 1. State Declarations ---
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [isProcessing, setIsProcessing] = useState(false);
  const medModal = useModal();
  const medAlert = useModal();
  const [editingId, setEditingId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // --- States สำหรับระบบสแกนบัตร ปชช. ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = React.useRef(null);

  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false); // State ควบคุม Dropdown คำนำหน้า

  // --- 2. Derived State (Memos & Filtering) ---
  const filteredPatients = useMemo(() => {
    return patientsData.filter(p => {
      const pBranchId = p.branchId || 'b1';
      const s = search.toLowerCase();
      // ค้นหาให้ครอบคลุม (Case-insensitive)
      return ((p.firstName && p.firstName.toLowerCase().includes(s)) || (p.lastName && p.lastName.toLowerCase().includes(s)) || (p.id && p.id.toLowerCase().includes(s)) || (p.hn && p.hn.toLowerCase().includes(s)) || (p.idCard && p.idCard.includes(s)) || (p.phone && p.phone.includes(s))) &&
             (currentBranch === 'all' || pBranchId === currentBranch);
    });
  }, [patientsData, search, currentBranch]);

  const sortedPatients = useMemo(() => {
    let sortableItems = [...filteredPatients];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key] || '', bValue = b[sortConfig.key] || '';
        if (sortConfig.key === 'id') {
            aValue = a.id || a.hn || '';
            bValue = b.id || b.hn || '';
        }
        if (sortConfig.key === 'age') {
            aValue = a.dob ? a.dob.split('/').reverse().join('') : '';
            bValue = b.dob ? b.dob.split('/').reverse().join('') : '';
        }
        if (sortConfig.key === 'lastVisit') {
            const getIsoDateStr = (p) => {
                const dt = p.opdRecords && p.opdRecords.length > 0 ? p.opdRecords[0].datetime : (p.lastVisit || '');
                if (!dt) return '';
                const parts = dt.split(' ')[0].split('/');
                return parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : dt;
            };
            aValue = getIsoDateStr(a);
            bValue = getIsoDateStr(b);
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredPatients, sortConfig]);

  // สั่งให้เปิดกล้องจริงเมื่อเปิดหน้าต่างสแกน
  useEffect(() => {
    let stream = null;
    if (isScannerOpen && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.log("ไม่สามารถเปิดกล้องได้:", err);
          showToast('อุปกรณ์ไม่รองรับ หรือไม่ได้อนุญาตให้ใช้กล้อง', 'warning');
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScannerOpen]);

  const headerRef = React.useRef(null);
  const filterRef = React.useRef(null);

  const initialFormState = {
    hn: '', prefix: '', firstName: '', lastName: '', nickname: '', dob: '', gender: '', idCard: '', nationality: 'ไทย', ethnicity: 'ไทย', religion: 'พุทธ', occupation: '',
    address: '', moo: '', road: '', subDistrict: '', district: '', province: '', zipcode: '', 
    curAddress: '', curMoo: '', curRoad: '', curSubDistrict: '', curDistrict: '', curProvince: '', curZipcode: '', 
    phones: [''], emName: '', emRelation: '', emPhone: '', emAddress: '', 
    bloodGroup: '', chiefComplaint: '', allergies: '', underlyingDisease: '', createdAt: '', opdRecords: [],
    courses: []
  };
  
  const [formData, setFormData] = useState(initialFormState);
  
  const initialOpdState = { datetime: '', doctor: '', temp: '', pulse: '', bp: '', weight: '', height: '', cc: '', dx: '', tx: [''], note: '' };
  const [showOpdForm, setShowOpdForm] = useState(false);
  const [isClosingOpdForm, setIsClosingOpdForm] = useState(false);
  const [newOpdRecord, setNewOpdRecord] = useState(initialOpdState);
  const [editingOpdIndex, setEditingOpdIndex] = useState(null);
  const [openTxDropdownIndex, setOpenTxDropdownIndex] = useState(null); 

  const [showCalendar, setShowCalendar] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('days'); 
  const [yearPageStart, setYearPageStart] = useState(0);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });

  const [showOpdCalendar, setShowOpdCalendar] = useState(false);
  const [opdCalDate, setOpdCalDate] = useState(new Date());
  const [opdCalView, setOpdCalView] = useState('days');
  const [opdYearPageStart, setOpdYearPageStart] = useState(0);
  const [opdTime, setOpdTime] = useState({ h: '08', m: '00' });
  const [opdCalendarPos, setOpdCalendarPos] = useState({ top: 0, left: 0 });

  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [isOpdCalendarClosing, setIsOpdCalendarClosing] = useState(false);
  const [sweetAlert, setSweetAlert] = useState({ isOpen: false, type: '', title: '', text: '', onConfirm: null });
  const [isAlertClosing, setIsAlertClosing] = useState(false);

  // Fix: Use refs instead of direct DOM manipulation
  const dobWrapperRef = React.useRef(null);
  const opdWrapperRef = React.useRef(null);
  const opdSectionRef = React.useRef(null);
  const opdFormSectionRef = React.useRef(null);

  const closeMedModal = () => { medModal.close(); };
  const closeMedCalendar = () => { setIsCalendarClosing(true); setTimeout(() => { setShowCalendar(false); setIsCalendarClosing(false); }, 300); };
  const closeMedOpdCalendar = () => { setIsOpdCalendarClosing(true); setTimeout(() => { setShowOpdCalendar(false); setIsOpdCalendarClosing(false); }, 300); };
  const closeMedAlert = () => { setIsAlertClosing(true); setTimeout(() => { setSweetAlert(prev => ({...prev, isOpen: false})); setIsAlertClosing(false); }, 300); };

  // --- ฟังก์ชันจัดการเบอร์โทรศัพท์แบบไดนามิก ---
  const handlePatientPhoneChange = (index, value) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData({ ...formData, phones: newPhones });
  };
  const addPatientPhone = () => setFormData({ ...formData, phones: [...formData.phones, ''] });
  const removePatientPhone = (index) => setFormData({ ...formData, phones: formData.phones.filter((_, i) => i !== index) });

  // --- ฟังก์ชันคัดลอกที่อยู่ ---
  const copyAddressToCurrent = () => {
    setFormData({
      ...formData,
      curAddress: formData.address,
      curMoo: formData.moo,
      curRoad: formData.road,
      curSubDistrict: formData.subDistrict,
      curDistrict: formData.district,
      curProvince: formData.province,
      curZipcode: formData.zipcode
    });
  };

  // --- ฟังก์ชันเชื่อมต่อ Google Cloud Vision API (OCR) ของจริง ---
  const captureImageToBase64 = () => {
    const video = videoRef.current;
    if (!video) return null;
    // สร้าง Canvas จำลองเพื่อแคปภาพจากวิดีโอ
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // แปลงเป็น Base64
    const dataUrl = canvas.toDataURL('image/jpeg');
    return dataUrl.split(',')[1]; // ตัดส่วน header data:image/jpeg;base64, ออก
  };

  const parseIdCardText = (text) => {
    const lines = text.split('\n').map(line => line.trim());
    
    // เตรียมตัวแปรให้ครบทุกช่องตามที่คุณต้องการ (เพิ่ม gender และ road)
    let extractedData = { idCard: '', prefix: '', firstName: '', lastName: '', dob: '', gender: '', address: '', moo: '', road: '', subDistrict: '', district: '', province: '' };

    // 1. หาเลขบัตรประชาชน 13 หลัก
    const idMatch = text.replace(/\s/g, '').match(/\d{13}/);
    if (idMatch) extractedData.idCard = idMatch[0];

    // 2. หาชื่อ-นามสกุลไทย และ วิเคราะห์เพศ
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ชื่อตัวและชื่อสกุล') || line.match(/^(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.)/)) {
            let nameLine = line.replace('ชื่อตัวและชื่อสกุล', '').trim();
            if (!nameLine && i + 1 < lines.length) nameLine = lines[i+1].trim();
            
            const prefixMatch = nameLine.match(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/);
            if (prefixMatch) {
                let rawPrefix = prefixMatch[1];
                // แปลงตัวย่อ น.ส. เป็นคำเต็ม
                if (rawPrefix === 'น.ส.') rawPrefix = 'นางสาว';
                extractedData.prefix = rawPrefix;

                // กำหนดเพศอัตโนมัติจากคำนำหน้า
                if (['นาย', 'ด.ช.'].includes(rawPrefix)) {
                    extractedData.gender = 'ชาย';
                } else if (['นาง', 'นางสาว', 'ด.ญ.'].includes(rawPrefix)) {
                    extractedData.gender = 'หญิง';
                }

                const nameParts = nameLine.substring(prefixMatch[0].length).trim().split(/\s+/);
                if (nameParts.length >= 1) extractedData.firstName = nameParts[0];
                if (nameParts.length >= 2) extractedData.lastName = nameParts.slice(1).join(' ');
            }
            break;
        }
    }

    // 3. หาวันเกิด
    const dobMatch = text.match(/(?:เกิดวันที่|Date of Birth|เกิด)\s*(\d{1,2})\s+([ก-๙a-zA-Z.]+)\s+(\d{4})/);
    if (dobMatch) {
        const day = dobMatch[1].padStart(2, '0');
        const monthStr = dobMatch[2];
        const year = dobMatch[3];
        const thaiMonthsMap = {
            'ม.ค.': '01', 'มกราคม': '01', 'ก.พ.': '02', 'กุมภาพันธ์': '02', 'มี.ค.': '03', 'มีนาคม': '03', 'เม.ย.': '04', 'เมษายน': '04',
            'พ.ค.': '05', 'พฤษภาคม': '05', 'มิ.ย.': '06', 'มิถุนายน': '06', 'ก.ค.': '07', 'กรกฎาคม': '07', 'ส.ค.': '08', 'สิงหาคม': '08',
            'ก.ย.': '09', 'กันยายน': '09', 'ต.ค.': '10', 'ตุลาคม': '10', 'พ.ย.': '11', 'พฤศจิกายน': '11', 'ธ.ค.': '12', 'ธันวาคม': '12'
        };
        let month = '01';
        for (const [key, value] of Object.entries(thaiMonthsMap)) {
            if (monthStr.includes(key)) { month = value; break; }
        }
        extractedData.dob = `${day}/${month}/${year}`;
    }

    // 4. หาศาสนาและสัญชาติ (เพิ่มระบบสแกนข้อมูลส่วนนี้)
    const religionMatch = text.match(/ศาสนา\s*([ก-๙]+)/);
    if (religionMatch) {
        extractedData.religion = religionMatch[1].trim();
    }
    
    const nationalityMatch = text.match(/สัญชาติ\s*([ก-๙]+)/);
    if (nationalityMatch) {
        extractedData.nationality = nationalityMatch[1].trim();
    }

    // 5. หาที่อยู่แบบแม่นยำสูง (แยกส่วนด้วย Regex)
    const addressIndex = lines.findIndex(line => line.includes('ที่อยู่') || line.includes('Address'));
    if (addressIndex !== -1) {
        // รวบรวมข้อความที่อยู่ทั้งหมดเข้าด้วยกันก่อน
        let addressText = lines[addressIndex].replace(/ที่อยู่|Address/g, '').trim();
        let lineOffset = 1;
        while (addressIndex + lineOffset < lines.length) {
            const nextLine = lines[addressIndex + lineOffset];
            // หยุดเมื่อเจอฟิลด์อื่นที่ไม่ใช่ที่อยู่
            if (nextLine.includes('ศาสนา') || nextLine.match(/\d{13}/) || nextLine.includes('วันออกบัตร') || nextLine.includes('Date of Issue')) {
                break;
            }
            addressText += ' ' + nextLine.trim();
            lineOffset++;
        }
        
        // ลบช่องว่างส่วนเกิน
        addressText = addressText.replace(/\s+/g, ' ').trim();

        // สกัดข้อมูลแต่ละส่วน
        let provMatch = addressText.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/);
        if (provMatch) extractedData.province = provMatch[1];

        let distMatch = addressText.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s]+)/);
        if (distMatch) extractedData.district = distMatch[1];

        let subDistMatch = addressText.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s]+)/);
        if (subDistMatch) extractedData.subDistrict = subDistMatch[1];

        // เพิ่มการหา "ถนน"
        let roadMatch = addressText.match(/(?:ถนน|ถ\.)\s*([^\s]+)/);
        if (roadMatch) extractedData.road = roadMatch[1];

        let mooMatch = addressText.match(/หมู่(?:ที่)?\s*([^\s]+)/);
        if (mooMatch) extractedData.moo = mooMatch[1];

        // "บ้านเลขที่" คือส่วนแรกสุดก่อนที่จะถึงคำระบุโซน
        let houseMatch = addressText.split(/\s+(หมู่|ซอย|ตรอก|ถนน|ตำบล|แขวง|อำเภอ|เขต|จังหวัด)/)[0];
        if (houseMatch) {
            extractedData.address = houseMatch.replace(/^ที่อยู่\s*/, '').trim();
        }
    }

    setFormData(prev => ({ ...prev, ...extractedData }));
    setIsScannerOpen(false);
    showToast('ดึงข้อมูลจากบัตรประชาชน (OCR) สำเร็จ', 'success');
  };

  const handleRealScan = async () => {
    if (!VISION_API_KEY) {
        showToast('กรุณาตั้งค่า VISION_API_KEY ที่ส่วนบนของไฟล์ App.jsx ก่อนใช้งานระบบสแกน OCR', 'warning');
        return;
    }

    const base64Image = captureImageToBase64();
    if (!base64Image) {
        showToast('ไม่สามารถจับภาพจากกล้องได้', 'warning');
        return;
    }

    setIsScanning(true);

    try {
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", data.error);
            showToast(`API Error: ${data.error.message}`, 'danger');
        } else if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
            const text = data.responses[0].fullTextAnnotation.text;
            parseIdCardText(text); // โยนข้อความที่อ่านได้เข้าฟังก์ชันสกัดข้อมูล
        } else {
            showToast('ไม่พบข้อความบนบัตร กรุณาจัดบัตรให้อยู่ในกรอบ แสงสว่างเพียงพอ และสแกนใหม่', 'warning');
        }
    } catch (error) {
        console.error("OCR Request Error:", error);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Cloud Vision API', 'danger');
    } finally {
        setIsScanning(false);
    }
  };

  // --- ฟังก์ชันเชื่อมต่อกับโปรแกรมตัวกลางอ่านบัตร (Smart Card Reader) บน Localhost ---
  const handleSmartCardRead = async () => {
    setIsProcessing(true);
    try {
        // ยิง API ไปหาโปรแกรมตัวกลางในเครื่อง (Port 8181 หรือตามที่โปรแกรมตัวกลางกำหนด)
        // หมายเหตุ: ต้องมีโปรแกรม Agent รันอยู่ที่เครื่องคอมพิวเตอร์ของผู้ใช้
        const response = await fetch('http://localhost:8181/api/read-card', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // ใส่ timeout ป้องกันการรอนานเกินไปหากไม่ได้เปิดโปรแกรมตัวกลาง
            signal: AbortSignal.timeout(5000) 
        });

        if (!response.ok) {
            throw new Error('ไม่สามารถอ่านบัตรได้ กรุณาเสียบบัตรให้แน่น');
        }

        const data = await response.json();
        
        // ตัวอย่างการ Map ข้อมูลที่ได้จากโปรแกรมตัวกลาง (Format ขึ้นอยู่กับโปรแกรม Agent ที่ใช้)
        // สมมติว่า Agent ส่ง JSON กลับมาเป็น { pid, titleName, fname, lname, dob, address... }
        setFormData(prev => ({
            ...prev,
            idCard: data.pid || data.citizenId || '',
            prefix: data.titleName || data.titleTH || '',
            firstName: data.fname || data.firstNameTH || '',
            lastName: data.lname || data.lastNameTH || '',
            dob: data.dob ? `${data.dob.substring(6,8)}/${data.dob.substring(4,6)}/${data.dob.substring(0,4)}` : '', // แปลง YYYYMMDD เป็น DD/MM/YYYY
            gender: data.gender === '1' || data.gender === 'Male' ? 'ชาย' : (data.gender === '2' || data.gender === 'Female' ? 'หญิง' : 'ไม่ระบุ'),
            religion: data.religion || prev.religion, // <-- เพิ่มบรรทัดนี้เพื่ออัปเดตศาสนา
            address: data.address || data.houseNo || '',
            moo: data.moo || '',
            subDistrict: data.subDistrict || data.tumbol || '',
            district: data.district || data.amphur || '',
            province: data.province || '',
        }));

        showToast('ดึงข้อมูลจากบัตรประชาชนสำเร็จ', 'success');

    } catch (error) {
        console.error("Smart Card Reader Error:", error);
        if (error.name === 'TimeoutError' || error.message === 'Failed to fetch') {
            showToast('เชื่อมต่อเครื่องอ่านไม่ได้: ตรวจสอบว่าเปิดโปรแกรมอ่านบัตร (Agent) แล้วหรือยัง', 'danger');
        } else {
            showToast(`ไม่สามารถอ่านบัตรได้: ${error.message}`, 'warning');
        }
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Constants ---
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // --- 2. Helper Functions ---
  const handleDobChange = (e) => {
    // Fix: Prevent cursor jump on delete
    if (e.nativeEvent && e.nativeEvent.inputType && e.nativeEvent.inputType.includes('delete')) {
        setFormData({ ...formData, dob: e.target.value });
        return;
    }
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setFormData({ ...formData, dob: value });
  };

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });

  // เพิ่มฟังก์ชันพิมพ์เวชระเบียนเพื่อให้สามารถเรียกใช้งานได้ทั้งบน Desktop และ Mobile
  const handlePrintRecord = (patient) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
        return;
    }

    // ใช้วันที่ลงทะเบียนแทนวันที่ล่าสุด
    let regDateStr = '-';
    if (patient.createdAt) {
        const cd = new Date(patient.createdAt);
        if (!isNaN(cd.getTime())) {
            const cdDay = String(cd.getDate()).padStart(2, '0');
            const cdMonth = String(cd.getMonth() + 1).padStart(2, '0');
            const cdYear = cd.getFullYear() + 543;
            regDateStr = `${cdDay}/${cdMonth}/${cdYear}`;
        }
    } else {
        // สำรองหากไม่มี createdAt
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear() + 543;
        regDateStr = `${d}/${m}/${y}`;
    }

    const ageStr = patient.dob ? getAgeString(patient.dob) : '';
    const phone = Array.isArray(patient.phones) ? patient.phones[0] : (patient.phone || patient.phone1 || '');
    
    // ตัดคำว่า HN ออก เหลือแต่ตัวเลข
    const hnNumberOnly = (patient.hn || '').replace(/^HN/i, '');

    const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบเวชระเบียน - ${patient.hn}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #000; margin: 0; padding: 0; }
            @page { size: A5 landscape; margin: 10mm; }
            .container { width: 100%; box-sizing: border-box; }
            
            /* ลด margin-bottom เพื่อไม่ให้ล้นหน้ากระดาษ A5 */
            .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .clinic-info { line-height: 1.5; font-size: 12px; }
            .clinic-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .doc-info { text-align: right; line-height: 1.5; font-size: 14px; }
            .doc-info-row { display: flex; justify-content: flex-end; align-items: baseline; margin-bottom: 8px; }
            .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
            
            /* หัวใจสำคัญ: ใช้ align-items: baseline เพื่อให้ฐานของตัวอักษรข้อความและข้อมูลอยู่เส้นเดียวกันเป๊ะ */
            .row { display: flex; align-items: baseline; margin-bottom: 10px; width: 100%; }
            
            /* ถอด padding ที่ดันตัวหนังสือออก ให้ไหลตาม Baseline ธรรมชาติ */
            .label { white-space: nowrap; margin-right: 5px; }
            
            /* เส้นประให้อยู่ใต้ข้อมูลพอดีเป๊ะ */
            .value { 
              flex-grow: 1; 
              border: none;
              border-bottom: 1px solid transparent;
              border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
              text-align: center; 
              padding-bottom: 2px; /* ให้เส้นประห่างจากฐานตัวอักษรลงมา 2px */
              min-width: 40px; 
              margin-right: 10px; 
            }
            .value:last-child { margin-right: 0; }
            .w-auto { flex-grow: 0; }
            
            /* บังคับพิมพ์สี และกำหนดให้เส้นประเป็นสีดำสนิทตอนพิมพ์ */
            @media print {
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
               .value {
                 border-image: repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 4px) 1 !important;
               }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="clinic-info">
                    <div class="clinic-name">อันผิงคลินิก</div>
                    <div>79/47 ปากทางเข้าหมู่บ้านพรธิสาร 5 คลอง 7</div>
                    <div>ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110</div>
                    <div>โทร.062-826-1696</div>
                </div>
                <div class="doc-info">
                    <div class="doc-info-row">
                        <span style="width: 45px; text-align: right; margin-right: 5px; font-size: 16px;">HN</span>
                        <span class="value w-auto" style="width: 140px; margin-right: 0; font-size: 16px; text-align: left; padding-left: 8px;">${hnNumberOnly}</span>
                    </div>
                    <div class="doc-info-row">
                        <span style="width: 45px; text-align: right; margin-right: 5px;">วันที่</span>
                        <span class="value w-auto" style="width: 140px; margin-right: 0; text-align: left; padding-left: 8px;">${regDateStr}</span>
                    </div>
                </div>
            </div>
            <div class="title">ใบเวชระเบียน</div>
            <div class="row">
                <span class="label">ชื่อ</span><span class="value">${patient.prefix ? patient.prefix + ' ' : ''}${patient.firstName || ''}</span>
                <span class="label">นามสกุล</span><span class="value">${patient.lastName || ''}</span>
                <span class="label">ชื่อเล่น</span><span class="value w-auto" style="width: 100px;">${patient.nickname || ''}</span>
                <span class="label">วันเดือนปีเกิด</span><span class="value w-auto" style="width: 120px;">${patient.dob || ''}</span>
            </div>
            <div class="row">
                <span class="label">อายุ</span><span class="value w-auto" style="width: 140px;">${ageStr}</span>
                <span class="label">หมายเลขบัตรประชาชน</span><span class="value">${patient.idCard || ''}</span>
                <span class="label">ที่อยู่บ้านเลขที่</span><span class="value w-auto" style="width: 100px;">${patient.address || ''}</span>
                <span class="label">หมู่ที่</span><span class="value w-auto" style="width: 50px;">${patient.moo || ''}</span>
            </div>
            <div class="row">
                <span class="label">ถนน</span><span class="value">${patient.road || ''}</span>
                <span class="label">ตำบล</span><span class="value">${patient.subDistrict || ''}</span>
                <span class="label">อำเภอ</span><span class="value">${patient.district || ''}</span>
                <span class="label">จังหวัด</span><span class="value">${patient.province || ''}</span>
                <span class="label">รหัสไปรษณีย์</span><span class="value w-auto" style="width: 80px;">${patient.zipcode || ''}</span>
            </div>
            <div class="row">
                <span class="label">เบอร์โทรศัพท์</span><span class="value">${phone}</span>
                <span class="label">สัญชาติ</span><span class="value w-auto" style="width: 120px;">${patient.nationality || ''}</span>
                <span class="label">เชื้อชาติ</span><span class="value w-auto" style="width: 120px;">${patient.ethnicity || ''}</span>
            </div>
            <div class="row">
                <span class="label">ศาสนา</span><span class="value w-auto" style="width: 150px;">${patient.religion || ''}</span>
                <span class="label">อาชีพ</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.occupation || ''}</span>
            </div>
            <div class="row">
                <span class="label">ชื่อผู้ติดต่อได้กรณีฉุกเฉิน</span><span class="value">${patient.emName || ''}</span>
                <span class="label">เกี่ยวข้องเป็น</span><span class="value w-auto" style="width: 180px;">${patient.emRelation || ''}</span>
            </div>
            <div class="row">
                <span class="label">ที่อยู่ที่ติดต่อได้</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.emAddress || ''}</span>
                <span class="label">เบอร์โทรศัพท์</span><span class="value w-auto" style="width: 150px;">${patient.emPhone || ''}</span>
            </div>
            <div class="row">
                <span class="label">อาการที่จะตรวจ</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.chiefComplaint || ''}</span>
            </div>
            <div class="row">
                <span class="label">หมู่เลือด</span><span class="value w-auto" style="width: 100px;">${patient.bloodGroup || ''}</span>
                <span class="label">การแพ้ยา</span><span class="value">${patient.allergies || ''}</span>
                <span class="label">โรคประจำตัว</span><span class="value">${patient.underlyingDisease || ''}</span>
            </div>
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
  };

  // --- 3. Derived State (Memos & Filtering) ---
  const calculatedAge = useMemo(() => getAgeString(formData.dob), [formData.dob]);
  const blankDays = Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthDays = Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);


  useEffect(() => {
    setVisibleCount(20);
    setIsLoadingMore(false);
  }, [search, sortConfig, currentBranch]);

  // --- 4. Effects & Infinity Scroll Logic ---
  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            if (entry.target.offsetHeight > 0 && filterRef.current) {
                filterRef.current.style.top = `${entry.target.offsetHeight}px`;
            }
        }
    });

    observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Fix: Use ID instead of element selector
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      
      // ควบคุม Header และ Filter แบบ 60FPS ไปพร้อมกัน
      if (headerRef.current) {
          if (scrollTop > 20) headerRef.current.classList.add('is-scrolled');
          else headerRef.current.classList.remove('is-scrolled');
      }

      if (filterRef.current) {
          if (scrollTop > 20) filterRef.current.classList.add('is-stuck');
          else filterRef.current.classList.remove('is-stuck');
      }
      
      // เช็คว่าเลื่อนลงมาเกือบถึงล่างสุดหรือยัง (เหลืออีก 100px)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (visibleCount < sortedPatients.length && !isLoadingMore) {
           setIsLoadingMore(true);
           setTimeout(() => {
              setVisibleCount(prev => prev + 10);
              setIsLoadingMore(false);
           }, 1000);
        }
      }
    };

    setTimeout(() => {
        if (mainElement && mainElement.scrollTop > 20) {
            if (headerRef.current) headerRef.current.classList.add('is-scrolled');
            if (filterRef.current) filterRef.current.classList.add('is-stuck');
        }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [visibleCount, sortedPatients.length, isLoadingMore]);

  useEffect(() => {
    if (calView === 'years') setYearPageStart(Math.floor((calDate.getFullYear() + 543) / 12) * 12);
  }, [calView, calDate]);

  useEffect(() => {
    if (opdCalView === 'years') setOpdYearPageStart(Math.floor((opdCalDate.getFullYear() + 543) / 12) * 12);
  }, [opdCalView, opdCalDate]);

  // --- 5. Event Handlers ---
  const handleOpenCalendar = () => {
    if (dobWrapperRef.current) {
      const rect = dobWrapperRef.current.getBoundingClientRect();
      setCalendarPos({ top: rect.bottom, left: rect.left });
    }
    if (formData.dob?.length === 10) {
      const parts = formData.dob.split('/');
      const y = parseInt(parts[2], 10) - 543;
      if (!isNaN(y)) setCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
      else setCalDate(new Date());
    } else setCalDate(new Date());
    setCalView('days');
    setShowCalendar(true);
  };

  const handlePrevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  const handleSelectDate = (day) => {
    setFormData({ ...formData, dob: `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}` });
    closeMedCalendar();
  };

  const handleOpenEdit = (patient, isView = false) => {
    setEditingId(patient.id || patient.hn);

    // ใช้ฟังก์ชันอัจฉริยะวิเคราะห์ชื่อเผื่อข้อมูลในอดีตไม่มีการแยกช่องมาให้
    const parsed = parsePatientName(patient.name || '');

    // รองรับข้อมูลเบอร์โทรศัพท์จากระบบเก่า (phone1, phone2, หรือ phone แบบ string)
    let loadedPhones = [''];
    if (patient.phones && Array.isArray(patient.phones) && patient.phones.length > 0) {
      loadedPhones = patient.phones;
    } else if (patient.phone1 || patient.phone2) {
      loadedPhones = [patient.phone1, patient.phone2].filter(Boolean);
    } else if (patient.phone) {
      loadedPhones = Array.isArray(patient.phone) ? patient.phone : [patient.phone];
    }
    if (loadedPhones.length === 0) loadedPhones = [''];
    
    setFormData({ 
      ...initialFormState, ...patient, hn: patient.hn || patient.id,
      prefix: patient.prefix || parsed.prefix,
      firstName: patient.firstName || parsed.firstName, 
      lastName: patient.lastName || parsed.lastName, 
      gender: patient.gender || parsed.gender,
      phones: loadedPhones,
      createdAt: patient.createdAt || new Date().toISOString(), opdRecords: patient.opdRecords || []
    });
    setShowOpdForm(false); setEditingOpdIndex(null); setIsViewMode(isView); medModal.open();
    
    // เปลี่ยนเงื่อนไขให้เลื่อนลงไปที่ประวัติการรักษาเฉพาะตอนที่เข้ามาเพื่อดูรายละเอียด (isView = true) เท่านั้น
    if (isView) {
      setTimeout(() => {
        if (opdSectionRef.current) {
          opdSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    // Fix: Don't generate HN yet to prevent race condition, do it on save
    setFormData({ ...initialFormState, hn: '', createdAt: new Date().toISOString(), opdRecords: [] });
    setShowOpdForm(false); setEditingOpdIndex(null); setIsViewMode(false); medModal.open();
  };

  const handleOpenOpdCalendar = () => {
    if (opdWrapperRef.current) {
      const rect = opdWrapperRef.current.getBoundingClientRect();
      setOpdCalendarPos({ top: rect.bottom, left: rect.left });
    }

    const dtStr = newOpdRecord.datetime;
    const now = new Date();
    let d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let h = String(now.getHours()).padStart(2, '0'), min = String(now.getMinutes()).padStart(2, '0');
    
    if (dtStr) {
      const parts = dtStr.split(' ');
      if (parts.length >= 2) {
          const dateParts = parts[0].split('/');
          if(dateParts.length === 3) {
              d = parseInt(dateParts[0], 10);
              m = parseInt(dateParts[1], 10) - 1;
              y = parseInt(dateParts[2], 10) - 543;
          }
          const timeParts = parts[1].split(':');
          if(timeParts.length === 2) {
              h = timeParts[0];
              min = timeParts[1].replace('น.', '').trim();
          }
      }
    }
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) setOpdCalDate(new Date(y, m, d));
    else setOpdCalDate(now);
    
    setOpdTime({ h, m: min });
    setOpdCalView('days');
    setShowOpdCalendar(true);
  };

  // --- เพิ่มฟังก์ชันสำหรับพิมพ์ใบประวัติการรักษา (OPD) ---
  const handlePrintOpdRecord = (record, index) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
        return;
    }

    // คำนวณครั้งที่เข้ารับการรักษา (สมมติว่ารายการล่าสุดอยู่บนสุด)
    const visitNumber = (formData.opdRecords ? formData.opdRecords.length : 1) - index;
    const dateStr = record.datetime ? record.datetime.split(' ')[0] : '-';

    // ตัดคำว่า HN ออกเพื่อความสวยงามตามแบบฟอร์ม
    const hnNumberOnly = (formData.hn || '').replace(/^HN/i, '');
    const fullName = `${formData.prefix ? formData.prefix + ' ' : ''}${formData.firstName || ''} ${formData.lastName || ''}`.trim();

    // ดึงที่อยู่ปัจจุบัน ถ้าไม่มีให้ใช้ตามบัตร ปชช.
    const addressStr = `${formData.curAddress || formData.address || ''} ${formData.curMoo || formData.moo ? 'ม.'+(formData.curMoo || formData.moo) : ''} ${formData.curRoad || formData.road ? 'ถ.'+(formData.curRoad || formData.road) : ''} ${formData.curSubDistrict || formData.subDistrict || ''} ${formData.curDistrict || formData.district || ''} ${formData.curProvince || formData.province || ''} ${formData.curZipcode || formData.zipcode || ''}`.trim();
    const phoneStr = formData.phones && formData.phones.length > 0 ? formData.phones[0] : '';

    const txText = Array.isArray(record.tx) ? record.tx.filter(t => t).join(', ') : (record.tx || '-');

    const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบ OPD - ${formData.hn}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
            html, body { width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A5 landscape; margin: 10mm; }
            .container { width: 100%; height: 128mm; max-height: 128mm; box-sizing: border-box; display: flex; flex-direction: column; padding-bottom: 2px; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; }

            .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
            .clinic-info { line-height: 1.4; font-size: 12px; }
            .clinic-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }

            .doc-info { text-align: right; }
            .doc-info-row { display: flex; align-items: baseline; justify-content: flex-end; margin-bottom: 6px; font-weight: bold; }

            .row { display: flex; align-items: baseline; margin-bottom: 10px; width: 100%; }
            .label { white-space: nowrap; margin-right: 5px; font-weight: bold; }

            /* เทคนิคเส้นประแบบ Gradient ตามที่ผู้ใช้งานต้องการ */
            .value {
              flex-grow: 1;
              border: none;
              border-bottom: 1px solid transparent;
              border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
              text-align: center;
              padding-bottom: 1px;
              min-width: 20px;
              margin-right: 10px;
            }
            .value.left { text-align: left; padding-left: 5px; }
            .value:last-child { margin-right: 0; }
            .w-auto { flex-grow: 0; }

            .vitals { display: flex; align-items: baseline; margin-bottom: 12px; font-weight: bold; }
            .vitals .val-box {
                border: none; border-bottom: 1px solid transparent;
                border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
                min-width: 40px; text-align: center; margin: 0 4px; padding-bottom: 1px; font-weight: normal; display: inline-block;
            }

            .main-content { display: flex; flex-direction: row; gap: 20px; flex-grow: 1; margin-bottom: 10px; }
            .left-column { flex-grow: 1; display: flex; flex-direction: column; }
            .right-column { width: 220px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; margin-top: -35px; }

            .cc-section { flex: 1; display: flex; flex-direction: column; margin-bottom: 0px; }
            .cc-title { font-weight: bold; margin-bottom: 4px; }
            .cc-content { flex: 1; min-height: 30px; padding-left: 10px; }

            .tx-section { flex: 1.5; display: flex; flex-direction: column; margin-bottom: 0px; }
            .tx-title { font-weight: bold; margin-bottom: 4px; }
            .tx-content { flex: 1; min-height: 40px; padding-left: 10px; }

            .footer { display: flex; justify-content: flex-end; align-items: flex-end; padding-top: 10px; border-top: 1px dotted #ccc; }
            .signature { text-align: center; font-size: 12px; width: 100%; margin-top: 30px; margin-bottom: 0px; padding-bottom: 2px; }
            .body-diagram { width: 100%; height: auto; max-height: 240px; object-fit: contain; }            /* บังคับให้พิมพ์เส้นประออก 100% เป็นสีดำ */            @media print {
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
               .value, .val-box {
                 border-image: repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 4px) 1 !important;
               }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="clinic-info">
                    <div class="clinic-name">ฟู่ ซิน ไถ คลินิก</div>
                    <div>79/47 ปากทางเข้าหมู่บ้านพรธิสาร 5 คลอง 7</div>
                    <div>ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110</div>
                    <div>โทร. 062-826-1696</div>
                </div>
                <div class="doc-info" style="width: 300px;">
                    <div class="doc-info-row" style="font-size: 20px; margin-bottom: 10px;">
                        <span style="margin-right: 15px;">HN</span>
                        <span>${hnNumberOnly}</span>
                    </div>
                    <div class="doc-info-row" style="font-size: 14px;">
                        <span>วันที่:</span>
                        <span class="value w-auto" style="width: 100px; text-align: center;">${dateStr}</span>
                        <span style="margin-left: 10px;">ครั้งที่:</span>
                        <span class="value w-auto" style="width: 40px; text-align: center;">${visitNumber}</span>
                    </div>
                </div>
            </div>

            <div class="row">
                <span class="label">ชื่อผู้ป่วย:</span><span class="value left">${fullName}</span>
                <span class="label">ชื่อเล่น:</span><span class="value w-auto" style="width: 80px;">${formData.nickname || '-'}</span>
                <span class="label">เพศ:</span><span class="value w-auto" style="width: 60px;">${formData.gender || '-'}</span>
            </div>

            <div class="row">
                <span class="label">เลขบัตรประชาชน:</span><span class="value left" style="width: 140px; flex-grow: 0;">${formData.idCard || '-'}</span>
                <span class="label">อายุ:</span><span class="value w-auto" style="width: 100px;">${calculatedAge}</span>
                <span class="label">โทร:</span><span class="value">${phoneStr}</span>
            </div>

            <div class="row">
                <span class="label">ที่อยู่:</span><span class="value left">${addressStr}</span>
            </div>

            <div class="row">
                <span class="label">โรคประจำตัว:</span><span class="value left">${formData.underlyingDisease || 'ไม่มี'}</span>
                <span class="label">แพ้ยา/อาหาร:</span><span class="value left">${formData.allergies || 'ไม่มี'}</span>
            </div>

            <div class="vitals">
                T: <span class="val-box">${record.temp || ''}</span> °C &nbsp;&nbsp;&nbsp;
                P: <span class="val-box">${record.pulse || ''}</span> /min &nbsp;&nbsp;&nbsp;
                BP: <span class="val-box" style="min-width: 60px;">${record.bp || ''}</span> mmHg &nbsp;&nbsp;&nbsp;
                น้ำหนัก: <span class="val-box">${record.weight || ''}</span> kg &nbsp;&nbsp;&nbsp;
                ส่วนสูง: <span class="val-box">${record.height || ''}</span> cm
            </div>

            <div class="main-content">
                <div class="left-column">
                    <div class="cc-section">
                        <div class="cc-title">อาการสำคัญ:</div>
                        <div class="cc-content">${(record.cc || '').replace(/\n/g, '<br/>')}</div>
                    </div>
                    
                    <div class="tx-section">
                        <div class="tx-title">การรักษาที่ให้:</div>
                        <div class="tx-content">${txText}</div>
                    </div>
                </div>
                <div class="right-column">
                    <img src="${window.location.origin}/Body Diagram.svg" class="body-diagram" alt="Body Diagram" />
                    <div class="signature">
                        <div class="value" style="width: 100%; margin: 0 auto 5px auto;"></div>
                        (พจ. พงษ์สิทธิ์ แซ่อึ้ง)
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
    }, 500);
  };
  const handleOpenOpdForm = (index = null, record = null) => {
    if (index !== null && record) { 
      setEditingOpdIndex(index); 
      setNewOpdRecord({
        ...record,
        tx: Array.isArray(record.tx) ? record.tx : (record.tx ? [record.tx] : [''])
      }); 
    } 
    else { 
      setEditingOpdIndex(null); 
      setNewOpdRecord({ ...initialOpdState, datetime: formatDateTime(new Date().toISOString()), tx: [''] }); 
    }
    setShowOpdForm(true);

    setTimeout(() => {
      if (opdFormSectionRef.current) {
        // เปลี่ยนจาก block: 'center' เป็น 'start' เพื่อให้ส่วนหัวของฟอร์มชิดขอบบนพอดี
        opdFormSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250); // เพิ่มเวลาหน่วงเล็กน้อยเพื่อให้แน่ใจว่าฟอร์ม render เสร็จและแอนิเมชันเริ่มแล้ว
  };

  const handleCancelOpdForm = () => {
    setIsClosingOpdForm(true); 
    
    setTimeout(() => {
      setShowOpdForm(false);
      setEditingOpdIndex(null);
      setIsClosingOpdForm(false);
      
      if (opdSectionRef.current) {
        opdSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250); 
  };

  const handleSaveOpdRecord = async () => {
    let newRecords = [...(formData.opdRecords || [])];
    if (editingOpdIndex !== null) newRecords[editingOpdIndex] = newOpdRecord;
    else newRecords = [newOpdRecord, ...newRecords];
    
    const updatedFormData = { ...formData, opdRecords: newRecords };
    setFormData(updatedFormData);

    setIsClosingOpdForm(true); 
    setTimeout(() => {
      setShowOpdForm(false);
      setEditingOpdIndex(null);
      setIsClosingOpdForm(false);
    }, 250);
    
    setIsProcessing(true);

    setTimeout(() => {
      if (opdSectionRef.current) {
        opdSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    const combinedData = {
      ...updatedFormData,
      name: `${updatedFormData.prefix}${updatedFormData.firstName} ${updatedFormData.lastName}`.trim(),
      phone: updatedFormData.phones && updatedFormData.phones.length > 0 ? updatedFormData.phones[0] : '', // อัปเดตการดึง phone
      id: editingId || updatedFormData.hn
    };

    try {
      await callAppScript('SAVE_DATA', 'Patients', combinedData);
      setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
      setIsProcessing(false);
      showToast('บันทึกประวัติการรักษาเรียบร้อยแล้ว', 'success');
    } catch (error) {
      setIsProcessing(false);
      showToast('เกิดข้อผิดพลาดในการบันทึกประวัติการรักษา', 'warning');
    }
  };

  const handleDeleteOpdRecord = (index) => {
    setSweetAlert({
      isOpen: true,
      type: 'warning',
      title: 'ยืนยันการลบประวัติ?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการรักษานี้?',
      onConfirm: async () => {
        closeMedAlert();
        setIsProcessing(true);
        
        const newRecords = [...(formData.opdRecords || [])];
        newRecords.splice(index, 1);
        
        const updatedFormData = { ...formData, opdRecords: newRecords };
        setFormData(updatedFormData);

        const combinedData = {
          ...updatedFormData,
          name: `${updatedFormData.prefix}${updatedFormData.firstName} ${updatedFormData.lastName}`.trim(),
          phone: updatedFormData.phones && updatedFormData.phones.length > 0 ? updatedFormData.phones[0] : '', // อัปเดตการดึง phone
          id: editingId || updatedFormData.hn
        };

        try {
          await callAppScript('SAVE_DATA', 'Patients', combinedData);
          setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
          setIsProcessing(false);
          showToast('ลบประวัติการรักษาเรียบร้อยแล้ว', 'danger');
        } catch (error) {
          setIsProcessing(false);
          showToast('เกิดข้อผิดพลาดในการลบประวัติการรักษา', 'warning');
        }
      }
    });
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();

    // --- เพิ่มการตรวจสอบเลขบัตรประชาชนซ้ำ ---
    if (formData.idCard && formData.idCard.trim() !== '') {
        const isDuplicate = patientsData.some(p => 
            p.idCard === formData.idCard && (p.hn || p.id) !== editingId
        );
        if (isDuplicate) {
            showToast('ไม่สามารถบันทึกได้ เนื่องจากเลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว', 'warning');
            return; // หยุดการทำงาน ไม่ให้บันทึกต่อ
        }
    }
    // ------------------------------------

    setIsProcessing(true);

    // Fix: Generate HN at save time to avoid duplicate HN race condition
    const currentHn = editingId || formData.hn || generateNextHN(patientsData);
    const combinedData = {
      ...formData,
      name: `${formData.prefix}${formData.firstName} ${formData.lastName}`.trim(),
      phone: formData.phones && formData.phones.length > 0 ? formData.phones[0] : '', // อัปเดตให้ดึงเบอร์หลักไปแสดงผลตาราง
      phone1: formData.phones && formData.phones.length > 0 ? formData.phones[0] : '', // เผื่อระบบเก่าดึง phone1 ไปใช้
      hn: currentHn
    };
    delete combinedData.id;

    try {
      await callAppScript('SAVE_DATA', 'Patients', combinedData);
      
      if (editingId) {
        setPatientsData(patientsData.map(p => (p.hn || p.id) === editingId ? { ...p, ...combinedData } : p));
      } else {
        const newPatient = { ...combinedData, lastVisit: new Date().toISOString().split('T')[0], branchId: currentBranch === 'all' ? 'b1' : currentBranch };
        setPatientsData([newPatient, ...patientsData]);
      }
      
      setIsProcessing(false);
      closeMedModal();
      showToast(editingId ? 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว' : 'เพิ่มข้อมูลผู้ป่วยใหม่เรียบร้อยแล้ว', 'success');
      
    } catch (error) {
      setIsProcessing(false);
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'warning');
    }
  };

  const handleDeleteClick = (patient) => {
    const patientHn = patient.hn || patient.id;
    setSweetAlert({
      isOpen: true,
      type: 'warning',
      title: 'ยืนยันการลบข้อมูล?',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติของ ${getPatientFullName(patient)}? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        closeMedAlert();
        setIsProcessing(true);
        try {
          await callAppScript('DELETE_DATA', 'Patients', { hn: patientHn, id: patientHn });
          setPatientsData(patientsData.filter(p => (p.hn || p.id) !== patientHn));
          setIsProcessing(false);
          showToast('ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว', 'danger');
        } catch (error) {
          setIsProcessing(false);
          showToast('ลบข้อมูลไม่สำเร็จ', 'warning');
        }
      }
    });
  };

  // --- 1. Component Separation & 2. React.memo (via useMemo) ---
  // การใช้ useMemo ห่อหุ้มการเรนเดอร์ตาราง จะทำหน้าที่เหมือน React.memo และแยก Component ออกมาในตัว
  // เพื่อป้องกันไม่ให้เบราว์เซอร์ต้องวาดข้อมูล 600 แถวใหม่ทุกครั้งที่ Header มีการขยับ (isRecordsScrolled เปลี่ยน)
  const memoizedPatientTableRows = useMemo(() => {
    return sortedPatients.slice(0, visibleCount).map((patient, index) => (
      <tr key={`${getPatientId(patient)}-${index}`} onClick={() => handleOpenEdit(patient, true)} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group cursor-pointer text-sm last:border-0 font-data space-row-animation">
        <td className="py-4 pl-6 font-medium text-sky-600 kanit-text">{getPatientId(patient)}</td><td className="py-4 text-slate-700 font-medium font-data">{getPatientFullName(patient)}</td>
        <td className="py-4 text-slate-500">{patient.gender || '-'}</td><td className="py-4 text-slate-500">{patient.dob ? getAgeString(patient.dob).split(' ')[0] + ' ปี' : '-'}</td>
        <td className="py-4 text-slate-500">{patient.idCard || '-'}</td><td className="py-4 text-slate-500">{patient.phone || patient.phone1 || '-'}</td>
        <td className="py-4 text-slate-500">{patient.opdRecords && patient.opdRecords.length > 0 ? patient.opdRecords[0].datetime.split(' ')[0] : formatDate(patient.lastVisit)}</td>
        <td className="py-4 text-center text-slate-500">{patient.opdRecords ? patient.opdRecords.length : 0}</td>
        <td className="py-4 text-right pr-6">
          <div className="flex justify-end gap-2 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); handlePrintRecord(patient); }} className="p-2 text-sky-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="พิมพ์ใบเวชระเบียน"><Printer size={18} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient, false); }} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไขข้อมูล"><Pencil size={18} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="ลบข้อมูล"><Trash2 size={18} /></button>
          </div>
        </td>
      </tr>
    ));
  }, [sortedPatients, visibleCount]); // อัปเดตตารางเฉพาะตอนข้อมูลเปลี่ยนหรือเลื่อนโหลดเพิ่มเท่านั้น (Virtualization Concept)

  const memoizedPatientMobileCards = useMemo(() => {
    return sortedPatients.slice(0, visibleCount).map((patient, index) => {
        const phoneNum = patient.phone || patient.phone1;
        const ageStr = patient.dob ? getAgeString(patient.dob).split(' ')[0] + ' ปี' : '-';
        const lastVisitStr = patient.opdRecords && patient.opdRecords.length > 0 ? patient.opdRecords[0].datetime.split(' ')[0] : formatDate(patient.lastVisit);
        
        // เพิ่มตัวแปรเช็คผู้ป่วยใหม่ เพื่อทำป้ายสถานะให้หน้าตาเหมือนหน้านัดหมาย
        const isNewPatient = !(patient.opdRecords && patient.opdRecords.length > 0);
        
        return (
            <div key={`mobile-${getPatientId(patient)}-${index}`} onClick={() => handleOpenEdit(patient, true)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                
                {/* แถวที่ 1: รหัส HN, ป้ายสถานะ และปุ่มจัดการ */}
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2.5">
                        <span className="font-black text-sky-600 text-base kanit-text tracking-wide">{getPatientId(patient)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${isNewPatient ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            {isNewPatient ? 'ผู้ป่วยใหม่' : 'ผู้ป่วยเก่า'}
                        </span>
                    </div>
                    <div className="text-right whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <span className="font-medium text-slate-500 text-[10px] sm:text-xs kanit-text">รับการรักษา</span>
                        <span className="font-bold text-sky-600 text-xs sm:text-sm font-data mx-1">{patient.opdRecords ? patient.opdRecords.length : 0}</span>
                        <span className="font-medium text-slate-500 text-[10px] sm:text-xs kanit-text">ครั้ง</span>
                    </div>
                </div>

                {/* แถวที่ 2: ชื่อคนไข้ และ เบอร์โทรศัพท์ */}
                <div className="mb-3">
                    <h4 className="font-bold text-slate-800 text-lg font-data leading-tight">{getPatientFullName(patient)}</h4>
                    <div className="mt-1.5">
                        {phoneNum ? (
                            <a href={`tel:${phoneNum}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-sky-600 font-medium font-data text-[11px] sm:text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-fit transition-colors">
                                <Phone size={12} className="text-sky-500" /> {phoneNum}
                            </a>
                        ) : <span className="text-[10px] text-slate-400 block">- ไม่มีเบอร์ติดต่อ -</span>}
                    </div>
                </div>

                {/* แถวที่ 3: ข้อมูลส่วนตัวอื่นๆ (จัดกลุ่มในกล่องสีเทาให้เหมือนกล่องนัดหมาย) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><User size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-500">เพศ:</span>
                            <span className="font-bold text-slate-700 ml-1.5">{patient.gender || '-'}</span>
                            <span className="text-slate-300 mx-2">|</span>
                            <span className="font-medium text-slate-500">อายุ:</span>
                            <span className="font-bold text-slate-700 ml-1.5">{ageStr}</span>
                        </div>
                    </div>
                    {patient.idCard && (
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><CreditCard size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-500">เลขบัตรฯ:</span>
                            <span className="font-bold text-slate-700 ml-1.5 font-data">{patient.idCard}</span>
                        </div>
                    </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><Clock size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-500">รับบริการล่าสุด:</span>
                            <span className="font-bold text-sky-600 ml-1.5 font-data">{lastVisitStr}</span>
                        </div>
                    </div>
                </div>

                {/* แถวที่ 4: ปุ่มจัดการ (แก้ไขเป็น grid-cols-3 และเพิ่มปุ่มพิมพ์) */}
                <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); handlePrintRecord(patient); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Printer size={16} /> พิมพ์
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient, false); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Pencil size={16} /> แก้ไข
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Trash2 size={16} /> ลบ
                    </button>
                </div>
            </div>
        );
    });
  }, [sortedPatients, visibleCount]);

  return (
    <>
      <div className="fade-in pb-10">
        
        {/* --- 1. Sticky Header --- */}
        <div ref={headerRef} className="sticky top-0 z-30 w-full pointer-events-none">
          <div className="w-full pointer-events-auto sticky-header-bg">
            <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
              <div>
                <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title">ระบบเวชระเบียน</h1>
                <p className="text-slate-500 kanit-text sticky-header-desc">จัดการข้อมูลคนไข้ ศูนย์รวมข้อมูลทุกสาขา</p>
              </div>
              <button onClick={handleOpenAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} kanit-text sticky-header-btn`}>
                <Plus /> <span className="hidden sm:inline">เพิ่มประวัติใหม่</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- 2. Sticky Filter ลอยอิสระ และสแนปติดใต้ Header เมื่อเลื่อน --- */}
        <div ref={filterRef} className="glass-filter-wrapper sticky z-20 w-full pointer-events-none">
          <div className="w-full mx-auto pointer-events-none relative h-[88px] z-50">
            <div className="absolute left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm">
              <div className="relative w-full">
                <input type="text" placeholder="ค้นหาชื่อ, รหัส HN, เบอร์โทร หรือเลขบัตรประชาชน..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data" />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. ตาราง --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden p-0 sm:p-0">
              <div className="px-2 sm:px-4 py-4">
                
                {/* --- Desktop View (Table) --- */}
                {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100 text-sm">
                        <th className="pt-6 pb-4 font-medium pl-6 cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text" onClick={() => requestSort('id')}><div className="flex items-center gap-1">รหัส HN <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'id' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th>
                        <th className="pt-6 pb-4 font-medium text-left kanit-text">ชื่อคนไข้</th>
                        <th className="pt-6 pb-4 font-medium text-left kanit-text">เพศ</th>
                        <th className="pt-6 pb-4 font-medium text-left kanit-text">อายุ</th>
                        <th className="pt-6 pb-4 font-medium cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text" onClick={() => requestSort('idCard')}><div className="flex items-center gap-1">เลขบัตรประชาชน <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'idCard' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th>
                        <th className="pt-6 pb-4 font-medium cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text" onClick={() => requestSort('phone')}><div className="flex items-center gap-1">เบอร์ติดต่อ <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'phone' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th>
                        <th className="pt-6 pb-4 font-medium cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text" onClick={() => requestSort('lastVisit')}><div className="flex items-center gap-1">รับบริการล่าสุด <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'lastVisit' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th>
                        <th className="pt-6 pb-4 font-medium text-center kanit-text">การรักษา(ครั้ง)</th>
                        <th className="pt-6 pb-4 font-medium text-right pr-6 kanit-text">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isGlobalLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={`skel-med-${i}`} className="border-b border-slate-50">
                            <td className="py-4 pl-6"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-10 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                            <td className="py-4 pr-6"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                          </tr>
                        ))
                      ) : memoizedPatientTableRows}
                      {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                          <tr key={`skel-med-more-${i}`} className="border-b border-slate-50">
                            <td className="py-4 pl-6"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-10 bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                            <td className="py-4 pr-6"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* --- Mobile View (Cards) --- */}
                <div className="lg:hidden space-y-4 mt-2">
                    {isGlobalLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={`skel-med-mob-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                                    <div className="h-5 w-16 bg-slate-200 rounded-md animate-pulse"></div>
                                </div>
                                <div className="mb-3">
                                    <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
                                    <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-28 bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            {memoizedPatientMobileCards}
                            {!isGlobalLoading && sortedPatients.length === 0 && (
                                <div className="text-center py-10 text-slate-400 kanit-text bg-slate-50 rounded-2xl border border-slate-100 border-dashed">ไม่พบข้อมูลผู้ป่วย</div>
                            )}
                            {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                                <div key={`skel-med-mob-more-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="h-5 w-16 bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-5 w-16 bg-slate-200 rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
                                        <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
              </div>
          </div>
        </div>
      </div>

      {medModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${medModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-5xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${medModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            {/* แก้ไข UX/UI ส่วนหัว Modal เวชระเบียน */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                    {isViewMode ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : (editingId ? <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-2xl font-bold text-slate-800 kanit-text truncate leading-tight">{editingId ? `${formData.hn} - ${formData.prefix}${formData.firstName} ${formData.lastName} (การรักษา ${formData.opdRecords ? formData.opdRecords.length : 0} ครั้ง)` : 'เพิ่มเวชระเบียนใหม่'}</h3>
                  <p className="text-[10px] sm:text-sm text-slate-500 kanit-text truncate leading-tight mt-0.5">{isViewMode ? `อายุ ${calculatedAge} | ข้อมูลผู้ป่วยสำหรับเรียกดู` : (editingId ? `อายุ ${calculatedAge} | แก้ไขข้อมูลเวชระเบียน` : 'กรอกข้อมูลผู้ป่วยให้ครบถ้วน')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* เหลือแค่ปุ่มปิด X ด้านบน */}
                <button type="button" onClick={closeMedModal} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
              </div>
            </div>
            
            {/* เอาคลาสเว้นระยะด้านล่างที่เหลือทิ้งไว้ออกเหมือนกัน */}
            <div className="p-4 sm:p-5 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
              <form id="patient-form" onSubmit={handleSavePatient}>
                <fieldset disabled={isViewMode} className="space-y-5 sm:space-y-6 border-none p-0 m-0 min-w-0">
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
                  <div className="border-b border-sky-100 pb-3 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><Users size={20} /> ข้อมูลส่วนตัว</h4>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {!isViewMode && (
                        <>
                          {/* ปุ่มอ่านบัตรจากเครื่อง Smart Card Reader (เพิ่มใหม่) */}
                          <button 
                            type="button" 
                            onClick={handleSmartCardRead} 
                            disabled={isProcessing}
                            className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-emerald-100 shadow-sm disabled:opacity-50"
                          >
                            <CreditCard size={16} /> <span className="hidden sm:inline">อ่านข้อมูลจากบัตร</span><span className="sm:hidden">อ่านบัตร</span>
                          </button>

                          {/* ปุ่มสแกนกล้อง (OCR) เดิม */}
                          <button 
                            type="button" 
                            onClick={() => setIsScannerOpen(true)} 
                            className="text-xs sm:text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-indigo-100 shadow-sm"
                          >
                            <ScanText size={16} /> <span className="hidden sm:inline">สแกนจากกล้อง (OCR)</span><span className="sm:hidden">สแกนกล้อง</span>
                          </button>
                        </>
                      )}
                      <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 kanit-text">
                        <Clock size={16} className="text-slate-400" /><span>ลงทะเบียน: {formatDateTime(formData.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">HN <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} bg-slate-100 text-slate-500 cursor-not-allowed font-data`} value={formData.hn} disabled readOnly /></div>
                    
                    <div className="relative" style={{ zIndex: 30 }}>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">คำนำหน้า <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input 
                          required 
                          type="text" 
                          className={`${theme.input} font-data pr-10`} 
                          value={formData.prefix} 
                          onChange={(e) => setFormData({...formData, prefix: e.target.value})} 
                          disabled={isViewMode} 
                          placeholder="พิมพ์หรือเลือก" 
                          onFocus={() => setShowPrefixDropdown(true)} 
                          onBlur={() => setTimeout(() => setShowPrefixDropdown(false), 200)} 
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={18} className={`transition-transform duration-200 ${showPrefixDropdown ? 'rotate-180' : ''}`} />
                        </div>
                        {showPrefixDropdown && !isViewMode && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                            {['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.', 'พระ', 'ดร.', 'นพ.', 'พญ.', 'ทพ.', 'ว่าที่ ร.ต.'].map(opt => (
                              <div 
                                key={opt} 
                                onMouseDown={(e) => { e.preventDefault(); setFormData({...formData, prefix: opt}); setShowPrefixDropdown(false); }} 
                                className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${formData.prefix === opt ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อ <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} /></div>
                    <div className="md:col-span-2 lg:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">นามสกุล <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อเล่น</label><input type="text" className={`${theme.input} font-data`} value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} /></div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">วัน/เดือน/ปีเกิด <span className="text-rose-500">*</span></label>
                      <div ref={dobWrapperRef} className="relative group">
                        <input required type="text" className={`${theme.input} pr-12 font-data`} value={formData.dob} onChange={handleDobChange} placeholder="วว/ดด/ปปปป" maxLength="10" />
                        {!isViewMode && (<button type="button" onClick={handleOpenCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>)}
                      </div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อายุ</label><input type="text" className={`${theme.input} bg-slate-100 text-slate-500 font-data`} value={calculatedAge} disabled readOnly /></div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เพศ <span className="text-rose-500">*</span></label>
                      <CustomSelect value={formData.gender} onChange={(val) => setFormData({...formData, gender: val})} options={[{value:'', label:'เลือก'}, 'ชาย', 'หญิง', 'ไม่ระบุ']} disabled={isViewMode} />
                    </div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมายเลขบัตรประชาชน/พาสปอร์ต</label><input type="text" className={`${theme.input} font-data`} value={formData.idCard} onChange={(e) => setFormData({...formData, idCard: e.target.value})} maxLength="13" /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">สัญชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เชื้อชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.ethnicity} onChange={(e) => setFormData({...formData, ethnicity: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ศาสนา</label><input type="text" className={`${theme.input} font-data`} value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาชีพ</label><input type="text" className={`${theme.input} font-data`} value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} /></div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
                  <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><MapPin size={20} /> ข้อมูลติดต่อ</h4>
                  
                  {/* --- ส่วนที่ 1: ที่อยู่ตามบัตรประชาชน --- */}
                  <div className="mb-6">
                    <h5 className="font-semibold text-slate-700 mb-3 kanit-text">ที่อยู่ตามบัตรประชาชน</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน / อาคาร</label><input type="text" className={`${theme.input} font-data`} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.moo} onChange={(e) => setFormData({...formData, moo: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.road} onChange={(e) => setFormData({...formData, road: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.subDistrict} onChange={(e) => setFormData({...formData, subDistrict: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.zipcode} onChange={(e) => setFormData({...formData, zipcode: e.target.value})} maxLength="5" disabled={isViewMode} /></div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-100 my-6"></div>

                  {/* --- ส่วนที่ 2: ที่อยู่ปัจจุบัน --- */}
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <h5 className="font-semibold text-slate-700 kanit-text">ที่อยู่ปัจจุบัน <span className="text-slate-400 font-normal text-xs">(ที่สามารถติดต่อได้)</span></h5>
                      {!isViewMode && (
                        <button type="button" onClick={copyAddressToCurrent} className="text-xs bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-lg kanit-text transition-colors font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto">
                          <MapPin size={14} /> ใช้ที่อยู่เดียวกับบัตรประชาชน
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน / อาคาร</label><input type="text" className={`${theme.input} font-data`} value={formData.curAddress} onChange={(e) => setFormData({...formData, curAddress: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.curMoo} onChange={(e) => setFormData({...formData, curMoo: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.curRoad} onChange={(e) => setFormData({...formData, curRoad: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.curSubDistrict} onChange={(e) => setFormData({...formData, curSubDistrict: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.curDistrict} onChange={(e) => setFormData({...formData, curDistrict: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.curProvince} onChange={(e) => setFormData({...formData, curProvince: e.target.value})} disabled={isViewMode} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.curZipcode} onChange={(e) => setFormData({...formData, curZipcode: e.target.value})} maxLength="5" disabled={isViewMode} /></div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-100 my-6"></div>

                  {/* --- ส่วนที่ 3: เบอร์โทรศัพท์ (Dynamic) --- */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                    <div className="space-y-3 max-w-md">
                        {formData.phones.map((phone, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input 
                                  required 
                                  type="tel" 
                                  className={`${theme.input} py-2.5 font-data`} 
                                  value={phone} 
                                  onChange={(e) => handlePatientPhoneChange(idx, e.target.value)} 
                                  placeholder="08X-XXX-XXXX" 
                                  disabled={isViewMode} 
                                />
                                {formData.phones.length > 1 && !isViewMode && (
                                    <button type="button" onClick={() => removePatientPhone(idx)} className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-rose-100"><Trash2 size={20} /></button>
                                )}
                            </div>
                        ))}
                        {!isViewMode && (
                            <button type="button" onClick={addPatientPhone} className="text-xs sm:text-sm font-medium text-sky-500 hover:text-sky-600 flex items-center justify-center gap-1.5 mt-2 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition-colors kanit-text w-full sm:w-auto border border-sky-100">
                                <Plus size={16} /> เพิ่มเบอร์โทรศัพท์ติดต่อ
                            </button>
                        )}
                    </div>
                  </div>

                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Phone size={20} /> ผู้ติดต่อกรณีฉุกเฉิน</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อผู้ติดต่อ</label><input type="text" className={`${theme.input} font-data`} value={formData.emName} onChange={(e) => setFormData({...formData, emName: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เกี่ยวข้องเป็น</label><input type="text" className={`${theme.input} font-data`} value={formData.emRelation} onChange={(e) => setFormData({...formData, emRelation: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label><input type="tel" className={`${theme.input} font-data`} value={formData.emPhone} onChange={(e) => setFormData({...formData, emPhone: e.target.value})} /></div>
                    <div className="md:col-span-2 lg:col-span-3"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ที่ติดต่อได้</label><input type="text" className={`${theme.input} font-data`} value={formData.emAddress} onChange={(e) => setFormData({...formData, emAddress: e.target.value})} /></div>
                  </div>
                </div>

                {/* --- ส่วนที่แสดงเฉพาะในโหมดดูข้อมูล (View Mode): คอร์สคงเหลือ --- */}
                {isViewMode && (
                  <div className="bg-white p-4 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm relative z-10">
                    <h4 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-3 mb-5 flex items-center gap-2 kanit-text">
                      <Package size={20} /> คอร์ส/แพ็กเกจ คงเหลือ
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formData.courses && formData.courses.filter(c => c.remainingSessions > 0).length > 0 ? (
                        formData.courses.filter(c => c.remainingSessions > 0).map(course => (
                          <div key={course.id} className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 flex flex-col gap-2 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100/50 px-2 py-0.5 rounded-md">คงเหลือ {course.remainingSessions}/{course.totalSessions}</div>
                              <div className="text-[10px] text-slate-400 font-data">{formatDate(course.purchasedAt)}</div>
                            </div>
                            <h5 className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{course.name}</h5>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className="bg-indigo-500 h-full transition-all duration-500" 
                                style={{ width: `${(course.remainingSessions / course.totalSessions) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="md:col-span-3 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           <p className="text-slate-400 kanit-text text-sm italic">ยังไม่มีคอร์สคงเหลือในขณะนี้</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">                  <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Stethoscope size={20} /> ข้อมูลสุขภาพเบื้องต้น</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่เลือด</label>
                      <CustomSelect value={formData.bloodGroup} onChange={(val) => setFormData({...formData, bloodGroup: val})} options={[{value:'', label:'ไม่ทราบ'}, 'A', 'B', 'O', 'AB']} disabled={isViewMode} />
                    </div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาการสำคัญที่มาพบแพทย์ <span className="text-rose-500">*</span></label><textarea required rows="2" className={`${theme.input} resize-none font-data`} value={formData.chiefComplaint} onChange={(e) => setFormData({...formData, chiefComplaint: e.target.value})}></textarea></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ประวัติการแพ้อาหาร/ยา/สมุนไพร (ถ้ามี)</label><textarea rows="2" className={`${theme.input} resize-none font-data`} value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})}></textarea></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">โรคประจำตัว (ถ้ามี)</label><textarea rows="2" className={`${theme.input} resize-none font-data`} value={formData.underlyingDisease} onChange={(e) => setFormData({...formData, underlyingDisease: e.target.value})}></textarea></div>
                  </div>
                </div>
                </fieldset>

                <div ref={opdSectionRef} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10 mt-6 sm:mt-8">
                  <div className="border-b border-sky-100 pb-3 mb-5 flex justify-between items-center">
                    <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><FileText size={20} /> ประวัติการรักษา (OPD)</h4>
                    {!showOpdForm && (<button type="button" onClick={() => handleOpenOpdForm()} className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 sm:gap-2 kanit-text"><Plus size={16} /> <span className="hidden sm:inline">เพิ่มประวัติการรักษา</span><span className="sm:hidden">เพิ่ม</span></button>)}
                  </div>
                  {showOpdForm && (
                    <div ref={opdFormSectionRef} className={`bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6 shadow-inner ${isClosingOpdForm ? 'fade-out-up' : 'fade-in-up'}`}>
                      <h5 className="font-semibold text-slate-700 mb-4 kanit-text">{editingOpdIndex !== null ? 'แก้ไขบันทึกการรักษา' : 'บันทึกการรักษาใหม่'}</h5>
                      
                      <div className="flex flex-col gap-4">
                        {/* แถวที่ 1: วันที่/เวลา, แพทย์ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">วันที่/เวลา</label>
                            <div ref={opdWrapperRef} className="relative group">
                              <input type="text" className={`${theme.input} bg-white py-2 text-sm pr-9 font-data`} value={newOpdRecord.datetime} onChange={(e) => setNewOpdRecord({...newOpdRecord, datetime: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." />
                              <button type="button" onClick={handleOpenOpdCalendar} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-500 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">แพทย์ผู้รักษา</label>
                            <input type="text" className={`${theme.input} bg-white py-2 text-sm font-data`} value={newOpdRecord.doctor} onChange={(e) => setNewOpdRecord({...newOpdRecord, doctor: e.target.value})} placeholder="ระบุชื่อแพทย์" />
                          </div>
                        </div>

                        {/* แถวที่ 2: Vitals ปรับลด Grid สำหรับหน้าจอมือถือให้อ่านง่ายขึ้น */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">อุณหภูมิ (°C)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.temp} onChange={(e) => setNewOpdRecord({...newOpdRecord, temp: e.target.value})} placeholder="36.5" /></div>
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">สัญญาณชีพ (/min)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.pulse} onChange={(e) => setNewOpdRecord({...newOpdRecord, pulse: e.target.value})} placeholder="80" /></div>
                           <div className="col-span-2 md:col-span-1"><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ความดัน</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.bp} onChange={(e) => setNewOpdRecord({...newOpdRecord, bp: e.target.value})} placeholder="120/80" /></div>
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">น้ำหนัก (kg)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.weight} onChange={(e) => setNewOpdRecord({...newOpdRecord, weight: e.target.value})} placeholder="60" /></div>
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ส่วนสูง (cm)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.height} onChange={(e) => setNewOpdRecord({...newOpdRecord, height: e.target.value})} placeholder="170" /></div>
                        </div>

                        {/* แถวที่ 3: CC, Dx */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">อาการสำคัญ (CC)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.cc} onChange={(e) => setNewOpdRecord({...newOpdRecord, cc: e.target.value})} placeholder="เช่น มีไข้ ไอ เจ็บคอ..."></textarea></div>
                          <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การวินิจฉัย (Dx)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.dx} onChange={(e) => setNewOpdRecord({...newOpdRecord, dx: e.target.value})} placeholder="เช่น Acute Pharyngitis..."></textarea></div>
                        </div>

                        {/* แถวที่ 4: Tx */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การรักษาที่ให้</label>
                          <div className="flex flex-col gap-2">
                            {newOpdRecord.tx.map((treatment, txIndex) => (
                              <div key={txIndex} className="flex gap-2 items-stretch w-full">
                                {/* ใช้ z-index คำนวณตาม index เพื่อให้ dropdown ของรายการบน ทับรายการล่าง */}
                                <div className="relative flex-1" style={{ zIndex: 50 - txIndex }}>
                                  <input 
                                      type="text"
                                      className={`${theme.input} bg-white py-2 text-sm font-data pr-10`}
                                      value={treatment} 
                                      onChange={(e) => {
                                          const updatedTx = [...newOpdRecord.tx];
                                          updatedTx[txIndex] = e.target.value;
                                          setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                      }} 
                                      onFocus={() => setOpenTxDropdownIndex(txIndex)}
                                      onBlur={() => setTimeout(() => { if (openTxDropdownIndex === txIndex) setOpenTxDropdownIndex(null) }, 200)}
                                      placeholder="พิมพ์ค้นหา หรือเลือกจากรายการ..."
                                  />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={18} className={`transition-transform duration-200 ${openTxDropdownIndex === txIndex ? 'rotate-180' : ''}`} />
                                  </div>
                                  
                                  {openTxDropdownIndex === txIndex && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                                      {posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).length > 0 ? (
                                          posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).map(p => (
                                            <div
                                              key={p.id}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                const updatedTx = [...newOpdRecord.tx];
                                                updatedTx[txIndex] = p.name;
                                                setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                                setOpenTxDropdownIndex(null);
                                              }}
                                              className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${treatment === p.name ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                                            >
                                              {p.name}
                                            </div>
                                          ))
                                      ) : (
                                          <div className="px-3 py-2.5 text-sm text-slate-400 font-data flex items-center gap-2 pointer-events-none">
                                              <Plus size={14} className="text-sky-500" /> พิมพ์เพื่อระบุการรักษาเพิ่มเติม...
                                          </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {newOpdRecord.tx.length > 1 && (
                                  <button type="button" onClick={() => {
                                      const updatedTx = newOpdRecord.tx.filter((_, i) => i !== txIndex);
                                      setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                  }} className="px-3 bg-white text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors flex items-center justify-center shrink-0">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={() => setNewOpdRecord({...newOpdRecord, tx: [...newOpdRecord.tx, '']})} className="px-4 py-2 mt-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-2xl text-sm font-semibold hover:bg-sky-100 whitespace-nowrap transition-colors flex items-center gap-1 self-start kanit-text">
                              <Plus size={16} /> เพิ่มรายการรักษา
                            </button>
                          </div>
                        </div>

                        {/* แถวที่ 5: Note */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">หมายเหตุเพิ่มเติม</label>
                          <textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.note} onChange={(e) => setNewOpdRecord({...newOpdRecord, note: e.target.value})} placeholder="รายละเอียดหรือคำแนะนำเพิ่มเติม..."></textarea>
                        </div>
                      </div>
                      
                      <div className="flex flex-row justify-end gap-2 mt-4 pt-4 border-t border-slate-200 w-full">
                        <button type="button" onClick={handleCancelOpdForm} className="flex-1 sm:flex-none px-2 sm:px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors kanit-text truncate">ยกเลิก</button>
                        <button type="button" onClick={handleSaveOpdRecord} className="flex-1 sm:flex-none px-2 sm:px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-xl font-medium shadow-md transition-colors kanit-text truncate">
                          {editingOpdIndex !== null ? 'บันทึกการแก้ไข' : 'ยืนยันการเพิ่ม'}
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.opdRecords && formData.opdRecords.length > 0 ? (
                    <div className="border border-slate-100 rounded-xl bg-white overflow-hidden">
                      {/* --- Desktop View (Table) --- */}
                      {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                      <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse min-w-[800px] text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 kanit-text">
                              <th className="p-3 font-medium">วันที่/เวลา</th><th className="p-3 font-medium">Vitals</th><th className="p-3 font-medium">อาการ/วินิจฉัย</th><th className="p-3 font-medium">การรักษา</th><th className="p-3 font-medium">แพทย์</th><th className="p-3 font-medium text-right">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.opdRecords.map((record, index) => (
                              <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/80 align-top font-data">
                                <td className="p-3 text-slate-700 whitespace-nowrap"><div className="font-semibold">{record.datetime ? record.datetime.split(' ')[0] : '-'}</div><div className="text-xs text-slate-500">{record.datetime ? record.datetime.split(' ').slice(1).join(' ') : ''}</div></td>
                                <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                                  T: <span className="font-data font-semibold text-slate-700">{record.temp || '-'}</span> | PR: <span className="font-data font-semibold text-slate-700">{record.pulse || '-'}</span> | BP: <span className="font-data font-semibold text-slate-700">{record.bp || '-'}</span><br/>
                                  W: <span className="font-data font-semibold text-slate-700">{record.weight || '-'}</span> | H: <span className="font-data font-semibold text-slate-700">{record.height || '-'}</span>
                                </td>
                                <td className="p-3 text-slate-700 max-w-[150px]">
                                  <div className="text-sm font-semibold truncate" title={record.cc}>{record.cc || '-'}</div>
                                  <div className="text-xs text-sky-600 font-medium truncate mt-0.5" title={record.dx}>{record.dx || '-'}</div>
                                </td>
                                <td className="p-3 text-slate-600 text-xs max-w-[150px]">
                                  {Array.isArray(record.tx) ? (
                                    record.tx.filter(t => t).map((t, idx) => (
                                      <span key={idx} className="inline-block px-2 py-1 bg-sky-50 text-sky-600 rounded-md mb-1 mr-1">{t}</span>
                                    ))
                                  ) : (
                                    <span className="inline-block px-2 py-1 bg-sky-50 text-sky-600 rounded-md mb-1">{record.tx || '-'}</span>
                                  )}
                                  {record.note && <div className="truncate text-slate-400 mt-0.5" title={record.note}>* {record.note}</div>}
                                </td>
                                <td className="p-3 text-slate-700 whitespace-nowrap">{record.doctor || '-'}</td>
                                <td className="p-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button type="button" onClick={() => handlePrintOpdRecord(record, index)} className="text-sky-600 p-1.5 bg-sky-50 border border-sky-100 rounded-lg shadow-sm transition-colors hover:bg-sky-100" title="พิมพ์ใบ OPD">
                                      <Printer size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleOpenOpdForm(index, record)} className="text-slate-400 hover:text-sky-600 p-1.5 bg-white hover:bg-sky-50 border border-slate-100 rounded-lg shadow-sm transition-colors" title="แก้ไข">
                                      <Pencil size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleDeleteOpdRecord(index)} className="text-rose-400 hover:text-rose-600 p-1.5 bg-white hover:bg-rose-50 border border-slate-100 rounded-lg shadow-sm transition-colors" title="ลบ">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* --- Mobile View (Cards) --- */}
                      <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                          {formData.opdRecords.map((record, index) => (
                              <div key={`opd-mobile-${index}`} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors space-row-animation" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <div className="font-bold text-slate-800 flex items-center gap-2">
                                              <CalendarIcon size={14} className="text-sky-500" />
                                              {record.datetime ? record.datetime.split(' ')[0] : '-'}
                                          </div>
                                          <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                              <Clock size={12} /> {record.datetime ? record.datetime.split(' ').slice(1).join(' ') : ''}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <div>
                                          <span className="font-semibold text-slate-500">Vitals:</span>
                                          <span className="text-slate-600 ml-1 font-data">T:{record.temp||'-'} PR:{record.pulse||'-'} BP:{record.bp||'-'} W:{record.weight||'-'} H:{record.height||'-'}</span>
                                      </div>
                                      <div>
                                          <span className="font-semibold text-slate-500">อาการ (CC):</span>
                                          <span className="text-slate-700 ml-1 font-data">{record.cc || '-'}</span>
                                      </div>
                                      <div>
                                          <span className="font-semibold text-sky-600">วินิจฉัย (Dx):</span>
                                          <span className="text-slate-700 ml-1 font-data font-medium">{record.dx || '-'}</span>
                                      </div>
                                      <div>
                                          <span className="font-semibold text-emerald-600">การรักษา:</span>
                                          <div className="mt-1 flex flex-wrap gap-1">
                                              {Array.isArray(record.tx) ? (
                                                record.tx.filter(t => t).map((t, idx) => (
                                                  <span key={idx} className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">{t}</span>
                                                ))
                                              ) : (
                                                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">{record.tx || '-'}</span>
                                              )}
                                          </div>
                                          {record.note && <div className="mt-1 text-slate-400 italic">* {record.note}</div>}
                                      </div>
                                      <div className="pt-2 mt-1 border-t border-slate-200/60 flex items-center justify-between">
                                          <span className="text-[10px] font-semibold text-slate-400">แพทย์ผู้รักษา</span>
                                          <span className="font-medium text-sky-600 font-data flex items-center gap-1"><User size={12}/> {record.doctor || '-'}</span>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 pt-1">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintOpdRecord(record, index); }} className="flex items-center justify-center gap-2 py-2 text-sky-600 bg-sky-50 border border-sky-100 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm hover:bg-sky-100">
                                          <Printer size={14} /> พิมพ์
                                      </button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOpdRecord(index); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-white border border-slate-100 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm">
                                          <Trash2 size={14} /> ลบ
                                      </button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenOpdForm(index, record); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-white border border-slate-100 hover:bg-sky-50 hover:border-sky-100 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm">
                                          <Pencil size={14} /> แก้ไข
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed kanit-text"><FileText size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-sm">ยังไม่มีประวัติการรักษา</p></div>
                  )}
                </div>
              </form>
            </div>

            {/* ย้ายปุ่ม Action ต่างๆ มารวมกันไว้ข้างล่างตรงนี้ทั้งหมด พร้อมทำเป็น flex-col-reverse บนมือถือ */}
            <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-row justify-end gap-2 sm:gap-3 bg-white shrink-0 w-full">
                {isViewMode ? (
                    <>
                       <button type="button" onClick={closeMedModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ปิดหน้าต่าง</button>
                       <button type="button" onClick={(e) => { e.preventDefault(); setIsViewMode(false); }} className={`flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 ${theme.primary} rounded-xl flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate`}><Pencil size={18} className="shrink-0" /> แก้ไขข้อมูล</button>
                    </>
                ) : (
                    <>
                       <button type="button" onClick={closeMedModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ยกเลิก</button>
                       <button type="submit" form="patient-form" disabled={isProcessing} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate">
                           {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div> : <CheckCircle2 size={18} className="shrink-0" />}
                           {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                       </button>
                    </>
                )}
            </div>
          </div>
        </div>
      )}

      {showCalendar && (
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeMedCalendar}></div>
          <div className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
            {calView === 'days' && (
              <>
                <div className="flex justify-between items-center mb-4"><button type="button" onClick={handlePrevMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><button type="button" onClick={() => setCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[calDate.getMonth()]} {calDate.getFullYear() + 543}</button><button type="button" onClick={handleNextMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}</div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">{blankDays.map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 sm:h-8"></div>)}{monthDays.map(day => {
                  const isSelected = formData.dob === `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}`;
                  const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();
                  return (<button key={day} type="button" onClick={() => handleSelectDate(day)} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 transform scale-110' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>)
                })}</div>
              </>
            )}
            {calView === 'months' && (
              <>
                <div className="flex justify-between items-center mb-6"><button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{calDate.getFullYear() + 543}</button><button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-3 gap-2">{thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${calDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}</div>
              </>
            )}
            {calView === 'years' && (
              <>
                <div className="flex justify-between items-center mb-6"><button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{yearPageStart} - {yearPageStart + 11}</span><button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-3 gap-2">{Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(calDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- ปฏิทินประวัติการรักษา (OPD Calendar) --- */}
      {showOpdCalendar && (
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isOpdCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeMedOpdCalendar}></div>
          <div className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white/95 backdrop-blur-xl sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isOpdCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
            {opdCalView === 'days' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setOpdCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[opdCalDate.getMonth()]} {opdCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-[10px] font-bold uppercase tracking-wider kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {Array.from({ length: new Date(opdCalDate.getFullYear(), opdCalDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 h-8"></div>)}
                  {Array.from({ length: new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const isSelected = opdCalDate.getDate() === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === opdCalDate.getMonth() && new Date().getFullYear() === opdCalDate.getFullYear();
                    return (
                      <button key={day} type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth(), day))} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            )}
            {opdCalView === 'months' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear() - 1, opdCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setOpdCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl text-base sm:text-sm font-data">{opdCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear() + 1, opdCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setOpdCalDate(new Date(opdCalDate.getFullYear(), i, 1)); setOpdCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-bold transition-all kanit-text ${opdCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            {opdCalView === 'years' && (
                <div className="space-y-3">
                <div className="flex justify-between items-center mb-4 px-1">
                  <button type="button" onClick={() => setOpdYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 text-base sm:text-sm font-data">{opdYearPageStart} - {opdYearPageStart + 11}</span>
                  <button type="button" onClick={() => setOpdYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => opdYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setOpdCalDate(new Date(y - 543, opdCalDate.getMonth(), 1)); setOpdCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-bold transition-all font-data ${(opdCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            {/* Time & Action Panel - ปรับเลย์เอาต์แนวนอนตามรูปภาพ (Mockup) */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-row items-center justify-between w-full gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <Clock size={16} className="text-sky-500 shrink-0" />
                    
                    <CustomSelect 
                        compact 
                        value={opdTime.h} 
                        onChange={v => setOpdTime({...opdTime, h: v})} 
                        options={Array.from({length:24}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                    
                    <span className="text-slate-400 font-bold kanit-text pb-0.5 shrink-0">:</span>
                    
                    <CustomSelect 
                        compact 
                        value={opdTime.m} 
                        onChange={v => setOpdTime({...opdTime, m: v})} 
                        options={Array.from({length:60}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                </div>
                
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setOpdCalDate(now);
                          setOpdTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0')});
                          setOpdCalView('days');
                    }} className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors kanit-text shadow-sm whitespace-nowrap">ปัจจุบัน</button>
                    <button type="button" onClick={() => {
                          const d = String(opdCalDate.getDate()).padStart(2, '0');
                          const m = String(opdCalDate.getMonth() + 1).padStart(2, '0');
                          const y = opdCalDate.getFullYear() + 543;
                          setNewOpdRecord({...newOpdRecord, datetime: `${d}/${m}/${y} ${opdTime.h}:${opdTime.m} น.`});
                          closeMedOpdCalendar();
                    }} className="px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20 transition-colors kanit-text whitespace-nowrap">ตกลง</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {sweetAlert.isOpen && (
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${isAlertClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full max-h-[80dvh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col items-center text-center ${isAlertClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 kanit-text">{sweetAlert.title}</h3><p className="text-slate-500 mb-8 kanit-text">{sweetAlert.text}</p>
            <div className="flex gap-3 w-full"><button onClick={closeMedAlert} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">ยกเลิก</button><button onClick={sweetAlert.onConfirm} className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-colors shadow-lg shadow-rose-500/30 kanit-text">ยืนยันลบ</button></div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm fade-in">
          <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 modal-animate-in">
            <div className="relative w-16 h-16"><div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div><div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div></div>
            <p className="font-semibold text-slate-700 kanit-text">กำลังประมวลผล...</p>
          </div>
        </div>
      )}

      {/* --- Modal สแกนบัตรประชาชน (Smart ID / OCR) --- */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col modal-animate-in">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 kanit-text flex items-center gap-2 text-lg">
                <ScanText className="text-indigo-500" /> สแกนบัตรประชาชน
              </h3>
              <button 
                onClick={() => !isScanning && setIsScannerOpen(false)} 
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
                disabled={isScanning}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Camera Area */}
            <div className="p-6 bg-slate-800 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              {/* Animated Background Scan Line (Pure CSS) */}
              {!isScanning && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_15px_3px_rgba(99,102,241,0.5)] animate-[scanLine_2s_ease-in-out_infinite] z-20"></div>
              )}

              {/* Target Frame - ให้แสดงผลตลอดเวลาเพื่อไม่ให้วิดีโอดับเมื่อกำลังสแกน */}
              <div className="w-full max-w-[320px] aspect-[1.58/1] border-2 border-slate-600 rounded-xl relative flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10 shadow-2xl overflow-hidden">
                {/* Corners */}
                <div className="absolute top-[-2px] left-[-2px] w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl z-20"></div>
                <div className="absolute top-[-2px] right-[-2px] w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl z-20"></div>
                <div className="absolute bottom-[-2px] left-[-2px] w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl z-20"></div>
                <div className="absolute bottom-[-2px] right-[-2px] w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl z-20"></div>
                
                {/* แสดงภาพจากกล้องจริง */}
                <video autoPlay playsInline muted ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-0"></video>
                
                {!videoRef.current?.srcObject && <Camera size={48} className="text-slate-400 opacity-50 z-10" />}
                
                {/* Scanner Overlay Content (แสดงเมื่อกำลังสแกนทับบนวิดีโอ) */}
                {isScanning ? (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="font-bold text-white kanit-text text-sm animate-pulse">กำลังประมวลผล OCR...</p>
                  </div>
                ) : (
                  <div className="absolute bottom-3 right-4 w-12 h-16 border border-slate-600/50 rounded-md bg-slate-800/50 flex flex-col items-center justify-center gap-1 opacity-50 z-20">
                      <div className="w-4 h-4 rounded-full bg-slate-600/50"></div>
                      <div className="w-8 h-1 bg-slate-600/50 rounded-full"></div>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-5 kanit-text font-medium z-10 bg-slate-900/60 px-4 py-1.5 rounded-full">จัดวางบัตรประชาชนให้อยู่ในกรอบ</p>
            </div>
            
            {/* Actions (เอาปุ่มอัปโหลดออกและให้ปุ่มเริ่มสแกนเต็มจอ) */}
            <div className="p-4 bg-white">
              <button 
                onClick={handleRealScan} 
                disabled={isScanning}
                className="w-full py-3.5 bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 kanit-text hover:bg-indigo-600 shadow-md shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {isScanning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div> : <ScanText size={18}/>}
                {isScanning ? 'กำลังสแกน...' : 'เริ่มสแกน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

// --- ระบบ POS (Point of Sale) ---
// แก้ไข: เพิ่ม Props สำหรับคลังสินค้าเพื่อตัดสต็อกอัตโนมัติ
const POSSystem = ({ 
    products = [], setProducts, 
    patientsData = [], setPatientsData, 
    posHistoryData = [], setPosHistoryData, 
    inventoryData = [], setInventoryData,
    setInventoryLogsData,
    currentBranch,
    branchesData = [],
    showToast, callAppScript, isGlobalLoading 
}) => {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [discount, setDiscount] = useState(0);
  
  // --- แก้ไข: ให้ดึงค่าเริ่มต้นจาก LocalStorage ---
  const [discountType, setDiscountType] = useState(() => {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('pos_discountType')) || 'amount';
  }); // 'amount' or 'percent'
  
  // --- เพิ่ม State สำหรับการคิดภาษี (ดึงจาก LocalStorage) ---
  const [taxMode, setTaxMode] = useState(() => {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('pos_taxMode')) || 'none';
  }); // 'include' (รวม VAT), 'exclude' (แยก VAT), 'none' (ไม่คิด VAT)
  
  const [vatRate, setVatRate] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pos_vatRate') : null;
    return saved !== null ? Number(saved) : 7;
  }); // ค่าเริ่มต้น 7%

  // --- เพิ่ม: บันทึกการตั้งค่าลง LocalStorage ทันทีที่มีการเปลี่ยนค่า ---
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pos_discountType', discountType);
      localStorage.setItem('pos_taxMode', taxMode);
      localStorage.setItem('pos_vatRate', vatRate.toString());
    }
  }, [discountType, taxMode, vatRate]);
  
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // --- ใช้ Custom Hooks จัดการ Modal แทน State แยก ---
  const checkoutModal = useModal();
  const historyModal = useModal();
  const manageModal = useModal();
  const posAlert = useModal();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // --- เพิ่ม State สำหรับ Infinite Scroll ของประวัติการขาย ---
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(25);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);

  // --- เพิ่ม State สำหรับดูและแก้ไขรายละเอียดบิล ---
  const [selectedHistoryTxn, setSelectedHistoryTxn] = useState(null);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyEditForm, setHistoryEditForm] = useState(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // --- เพิ่ม State ควบคุมการเปิดปิดตะกร้าบนมือถือ ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // แก้ไข: เพิ่ม Effect สำหรับรีเซ็ตสถานะตะกร้ามือถือเมื่อขยายหน้าจอ (Resize Bug Fix)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileCartOpen) {
        setIsMobileCartOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileCartOpen]);

  // --- States สำหรับการจัดการสินค้า POS ---
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isManageClosing, setIsManageClosing] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isProcessingProduct, setIsProcessingProduct] = useState(false);
  const initialProductForm = { id: '', name: '', type: '', price: '', stockManaged: false, icon: 'Package', isCourse: false, courseSessions: 1 };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [sweetAlert, setSweetAlert] = useState({ isOpen: false, type: '', title: '', text: '', onConfirm: null });

  const closeAlert = () => { setSweetAlert(prev => ({...prev, isOpen: false})); };

  // --- ฟังก์ชันเมื่อเลือกคนไข้ ให้ดึงประวัติล่าสุดมาใส่ตะกร้า ---
  const handleSelectPatient = (patientId, patientLabel) => {
    setSelectedPatientId(patientId);
    setPatientSearchTerm(patientLabel);
    setIsPatientDropdownOpen(false);

    let newCartItems = []; // เริ่มต้นด้วยตะกร้าว่างเปล่าเสมอเพื่อล้างของเก่า

    if (patientId) {
      const patient = patientsData.find(p => (p.id || p.hn) === patientId);
      // เช็คว่าคนไข้มีประวัติการรักษา (OPD) หรือไม่
      if (patient && patient.opdRecords && patient.opdRecords.length > 0) {
        const latestOpd = patient.opdRecords[0]; // ดึงประวัติใบล่าสุด (index 0)

        // 1. นำการรักษา (Tx) มาเทียบกับ Catalog สินค้า POS
        if (latestOpd.tx) {
          const treatments = Array.isArray(latestOpd.tx) ? latestOpd.tx : [latestOpd.tx];
          treatments.forEach(tName => {
            if (!tName) return;
            const matchedProduct = products.find(p => p.name === tName);
            if (matchedProduct) {
              const existing = newCartItems.find(item => item.product.id === matchedProduct.id);
              if (existing) existing.quantity += 1;
              else newCartItems.push({ product: matchedProduct, quantity: 1 });
            } else {
              // หากการรักษานั้นไม่ได้ถูกตั้งค่าไว้ใน POS ให้สร้างเป็นรายการชั่วคราวแจ้งเตือน
              newCartItems.push({
                product: {
                  id: `TEMP_TX_${Date.now()}_${Math.random()}`,
                  name: tName,
                  price: 0,
                  type: 'รายการจากแพทย์ (รอระบุราคา/รหัส)',
                  icon: 'Stethoscope',
                  isTemp: true
                },
                quantity: 1
              });
            }
          });
        }

        // 2. นำหมายเหตุ (Note) มาใส่ตะกร้าด้วยในฐานะข้อความแจ้งเตือน (ราคา 0 บาท)
        if (latestOpd.note) {
          newCartItems.push({
            product: {
              id: `NOTE_${Date.now()}`,
              name: `หมายเหตุแพทย์: ${latestOpd.note}`,
              price: 0,
              type: 'ข้อความแจ้งเตือน',
              icon: 'FileText',
              isNote: true
            },
            quantity: 1
          });
        }
      }
    }

    // แทนที่ตะกร้าเดิมด้วยรายการใหม่ทั้งหมด (เคลียร์ของเก่า)
    setCart(newCartItems);

    if (patientId && newCartItems.length > 0) {
      showToast('ล้างตะกร้าและดึงรายการล่าสุดมาใส่ให้แล้ว', 'success');
    } else if (patientId) {
      showToast('ล้างตะกร้า เริ่มบิลใหม่สำหรับคนไข้ที่เลือก', 'success');
    } else {
      showToast('ล้างตะกร้า เริ่มบิลสำหรับลูกค้าทั่วไป', 'success');
    }
  };

  // ดึงรายการหมวดหมู่ที่มีทั้งหมดจากข้อมูล Products
  const categories = ['ทั้งหมด', ...new Set(products.map(p => p.type))];

  // กรองสินค้าตามคำค้นหาและหมวดหมู่
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = activeCategory === 'ทั้งหมด' || p.type === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, activeCategory]);

  // ฟังก์ชันจัดการตะกร้า
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0); // ล้างเฉพาะมูลค่าส่วนลด
    setSelectedPatientId('');
    setPatientSearchTerm('');
    // นำการรีเซ็ต setTaxMode และ setVatRate ออก เพื่อให้จำค่าเดิมไว้ใช้กับบิลถัดไป
    setIsSummaryExpanded(false); // พับส่วนคิดเงินเก็บลงเมื่อล้างตะกร้า
    setIsMobileCartOpen(false); // ปิดตะกร้าบนมือถือกลับไปหน้าเลือกสินค้า
  };

  // คำนวณยอดเงินและภาษีแบบละเอียด
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountAmount = discountType === 'percent' ? (subtotal * (discount / 100)) : Number(discount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  let vatAmount = 0;
  let priceExcludingVat = afterDiscount;
  let grandTotal = afterDiscount;

  if (taxMode === 'exclude') {
    // แยก VAT (บวกเพิ่มจากยอด)
    vatAmount = afterDiscount * (vatRate / 100);
    grandTotal = afterDiscount + vatAmount;
  } else if (taxMode === 'include') {
    // รวม VAT (ถอด VAT ออกจากยอด)
    vatAmount = afterDiscount - (afterDiscount * 100 / (100 + vatRate));
    priceExcludingVat = afterDiscount - vatAmount;
    grandTotal = afterDiscount;
  }

  // Format ค่าเงิน
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  // จัดการการชำระเงิน
  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('ตะกร้าสินค้าว่างเปล่า', 'warning');
      return;
    }
    checkoutModal.open();
    setCheckoutSuccess(false);
  };

  // แก้ไข: เปลี่ยนเป็นการทำงานแบบ Asynchronous และส่งข้อมูลไปบันทึกผ่าน API
  const confirmPayment = async () => {
    setIsProcessingPayment(true);
    
    // สร้าง Payload ข้อมูลบิลเพื่อส่งไปบันทึกในฐานข้อมูล
    const receiptId = `REC${Date.now()}`; // สร้าง ID บิลแบบง่ายๆ
    const transactionData = {
        id: receiptId,
        patientId: selectedPatientId,
        patientName: patientSearchTerm || 'ลูกค้าทั่วไป (ไม่ระบุ)',
        branchId: currentBranch === 'all' ? 'b1' : currentBranch, // บันทึกว่าขายที่สาขาไหน
        items: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            total: item.product.price * item.quantity
        })),
        subtotal: subtotal,
        discountValue: discount,
        discountType: discountType,
        discountAmount: discountAmount,
        taxMode: taxMode,
        vatRate: vatRate,
        vatAmount: vatAmount,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod,
        status: 'completed',
        createdAt: new Date().toISOString()
    };

    try {
        // ส่งข้อมูลไปบันทึกลงชีตชื่อ 'POS_Transactions' (เปลี่ยนชื่อได้ตามต้องการ)
        await callAppScript('SAVE_DATA', 'POS_Transactions', transactionData);
        
        // --- ระบบตัดสต็อกอัตโนมัติ (Automatic Stock Deduction - FEFO: First Expired First Out) ---
        const targetBranch = currentBranch === 'all' ? 'b1' : currentBranch;
        
        for (const item of cart) {
            if (item.product.stockManaged) {
                // ดึงรายการสต็อกทั้งหมดของสินค้านี้ในสาขานี้ และเรียงลำดับตามวันหมดอายุ (FEFO)
                const productStocks = inventoryData
                    .filter(inv => inv.productId === item.product.id && inv.branchId === targetBranch)
                    .sort((a, b) => {
                        if (!a.expireDate) return 1;
                        if (!b.expireDate) return -1;
                        // แปลง วว/ดด/ปปปป เป็น Date object (รองรับปี พ.ศ. โดย -543)
                        const parseDate = (d) => {
                            const [day, month, year] = d.split('/').map(Number);
                            return new Date(year - 543, month - 1, day);
                        };
                        return parseDate(a.expireDate) - parseDate(b.expireDate);
                    });

                let remainingToDeduct = item.quantity;

                for (const stockItem of productStocks) {
                    if (remainingToDeduct <= 0) break;

                    const deductAmount = Math.min(stockItem.quantity, remainingToDeduct);
                    if (deductAmount <= 0) continue;

                    const newQty = stockItem.quantity - deductAmount;
                    remainingToDeduct -= deductAmount;

                    const updatedStock = { ...stockItem, quantity: newQty };
                    
                    // บันทึกการอัปเดตสต็อกรายล็อต
                    await callAppScript('SAVE_DATA', 'Inventory', updatedStock);
                    
                    // สร้าง Log การตัดสต็อกรายล็อต
                    const branchName = branchesData.find(b => b.id === targetBranch)?.name || targetBranch;
                    const logPayload = {
                        id: `LOG${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        productId: item.product.id,
                        branchId: targetBranch,
                        type: 'SALE',
                        amount: deductAmount,
                        balance: newQty,
                        reason: `ขายสินค้า (บิล: ${receiptId})`,
                        note: `ล็อต: ${stockItem.lotNo || 'N/A'}, สาขา: ${branchName}`,
                        lotNo: stockItem.lotNo,
                        expireDate: stockItem.expireDate,
                        timestamp: new Date().toISOString()
                    };
                    await callAppScript('SAVE_DATA', 'InventoryLogs', logPayload);

                    // อัปเดต State สต็อกและ Log ทันที
                    setInventoryData(prev => prev.map(s => s.id === stockItem.id ? updatedStock : s));
                    setInventoryLogsData(prev => [logPayload, ...prev]);
                }

                // กรณีสต็อกไม่พอ (หักจนติดลบในล็อตสุดท้าย หรือแจ้งเตือน)
                if (remainingToDeduct > 0) {
                    console.warn(`Stock insufficient for ${item.product.name}. Remaining to deduct: ${remainingToDeduct}`);
                    // อาจจะเลือกหักจากล็อตสุดท้ายให้ติดลบ หรือแจ้งเตือนผู้ใช้
                }
            }
        }

        // --- เพิ่มระบบจัดการคอร์ส/แพ็กเกจ ---
        if (selectedPatientId && patientsData.length > 0) {
            const currentPatient = patientsData.find(p => (p.id || p.hn) === selectedPatientId);
            if (currentPatient) {
                let updatedCourses = currentPatient.courses ? [...currentPatient.courses] : [];
                let hasChanges = false;

                cart.forEach(item => {
                    // 1. กรณีซื้อคอร์สใหม่ (สินค้าปกติที่มี flag isCourse และไม่ใช่การตัดยอด)
                    if (item.product.isCourse && !item.product.isRedeem) {
                        for (let i = 0; i < item.quantity; i++) {
                            updatedCourses.push({
                                id: `CRS${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                productId: item.product.id,
                                name: item.product.name,
                                totalSessions: Number(item.product.courseSessions) || 1,
                                remainingSessions: Number(item.product.courseSessions) || 1,
                                purchasedAt: new Date().toISOString()
                            });
                        }
                        hasChanges = true;
                    }
                    
                    // 2. กรณีตัดคอร์ส (Redeem)
                    if (item.product.isRedeem && item.product.courseId) {
                        updatedCourses = updatedCourses.map(c => {
                            if (c.id === item.product.courseId) {
                                return { ...c, remainingSessions: Math.max(0, c.remainingSessions - item.quantity) };
                            }
                            return c;
                        });
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    const updatedPatient = { ...currentPatient, courses: updatedCourses };
                    await callAppScript('SAVE_DATA', 'Patients', updatedPatient);
                    if (setPatientsData) {
                        setPatientsData(prev => prev.map(p => (p.id || p.hn) === selectedPatientId ? updatedPatient : p));
                    }
                }
            }
        }

        // อัปเดต State ประวัติการขายทันทีเพื่อให้แสดงใน Modal
        if (setPosHistoryData) {
            setPosHistoryData(prev => [transactionData, ...prev]);
        }
        
        setIsProcessingPayment(false);
        setCheckoutSuccess(true);
        setIsMobileCartOpen(false); // ปิดหน้าตะกร้ามือถือเมื่อชำระเงินสำเร็จ
        showToast('ทำรายการชำระเงินและบันทึกข้อมูลสำเร็จ', 'success');
    } catch (error) {
        console.error("POS Transaction Error:", error);
        setIsProcessingPayment(false);
        showToast('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่', 'warning');
    }
  };

  const closeCheckoutAndReset = () => {
    checkoutModal.close();
    setTimeout(() => {
      if (checkoutSuccess) {
        clearCart();
      }
      setCheckoutSuccess(false);
    }, 300);
  };

  const closeHistoryModal = () => {
    historyModal.close();
    setTimeout(() => {
      setVisibleHistoryCount(25); // รีเซ็ตจำนวนการแสดงผลกลับเป็นค่าเริ่มต้นเมื่อปิดหน้าต่าง
      setSelectedHistoryTxn(null); // รีเซ็ตบิลที่เลือกดูอยู่
      setIsEditingHistory(false);
    }, 300);
  };

  // --- ฟังก์ชันจัดการดูและแก้ไขบิลย้อนหลัง ---
  const handleViewHistoryTxn = (txn) => {
    setSelectedHistoryTxn(txn);
    setHistoryEditForm(null);
    setIsEditingHistory(false);
    
    // สั่งให้คอนเทนเนอร์เลื่อนกลับขึ้นไปบนสุดเสมอเมื่อเปิดดูรายละเอียดบิล
    setTimeout(() => {
      const scrollContainer = document.getElementById('pos-history-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }, 50);
  };

  const handleBackToHistoryList = () => {
    setSelectedHistoryTxn(null);
    setIsEditingHistory(false);
  };

  const handleEditTxn = () => {
    setHistoryEditForm({ ...selectedHistoryTxn });
    setIsEditingHistory(true);
  };

  const handleSaveTxnEdit = async () => {
    setIsSavingHistory(true);
    try {
        await callAppScript('SAVE_DATA', 'POS_Transactions', historyEditForm);
        // อัปเดตข้อมูลในตารางหลัก
        if (setPosHistoryData) {
            setPosHistoryData(prev => prev.map(t => t.id === historyEditForm.id ? historyEditForm : t));
        }
        // อัปเดตข้อมูลในหน้าดูรายละเอียด
        setSelectedHistoryTxn(historyEditForm);
        setIsEditingHistory(false);
        showToast('บันทึกการแก้ไขบิลสำเร็จ', 'success');
    } catch (error) {
        console.error(error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'warning');
    } finally {
        setIsSavingHistory(false);
    }
  };

  // --- ฟังก์ชันจัดการการเลื่อน (Scroll) เพื่อโหลดข้อมูลเพิ่ม (Infinite Scroll) ---
  const handleHistoryScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // ตรวจสอบว่าเลื่อนลงมาเกือบสุดหรือยัง (เหลืออีก 50px)
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (visibleHistoryCount < (posHistoryData?.length || 0) && !isHistoryLoadingMore) {
        setIsHistoryLoadingMore(true);
        setTimeout(() => {
          setVisibleHistoryCount(prev => prev + 25);
          setIsHistoryLoadingMore(false);
        }, 800); // หน่วงเวลาเล็กน้อยให้เห็น Loading Skeleton
      }
    }
  };

  const closeManageModal = () => {
    setIsManageClosing(true);
    setTimeout(() => {
      setIsManageModalOpen(false);
      setIsManageClosing(false);
    }, 300);
  };

  const handleOpenAddProduct = () => {
      setProductForm({ ...initialProductForm });
      setIsEditFormOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
      setProductForm({ 
        ...initialProductForm, 
        ...prod, 
        isCourse: !!prod.isCourse, 
        courseSessions: prod.courseSessions || 1 
      });
      setIsEditFormOpen(true);
  };

  const handleSaveProduct = async (e) => {
      e.preventDefault();
      setIsProcessingProduct(true);
      
      const payload = {
          ...productForm,
          id: productForm.id || `ITM${Date.now()}`,
          price: Number(productForm.price),
          courseSessions: Number(productForm.courseSessions) || 1
      };

      try {
          // บันทึกลงชีต setting_pos
          await callAppScript('SAVE_DATA', 'setting_pos', payload);
          
          if (productForm.id) {
              setProducts(products.map(p => p.id === productForm.id ? payload : p));
              showToast('อัปเดตรายการสำเร็จ', 'success');
          } else {
              setProducts([payload, ...products]);
              showToast('เพิ่มรายการใหม่สำเร็จ', 'success');
          }
          setIsEditFormOpen(false);
      } catch (error) {
          showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'warning');
      }
      setIsProcessingProduct(false);
  };

  const handleDeleteProduct = (prod) => {
      setSweetAlert({
          isOpen: true, type: 'warning', title: 'ยืนยันการลบรายการ?',
          text: `คุณต้องการลบ "${prod.name}" ใช่หรือไม่?`,
          onConfirm: async () => {
              closeAlert();
              setIsProcessingProduct(true);
              try {
                  await callAppScript('DELETE_DATA', 'setting_pos', { id: prod.id });
                  setProducts(products.filter(p => p.id !== prod.id));
                  showToast('ลบรายการสำเร็จ', 'danger');
              } catch (error) {
                  showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning');
              }
              setIsProcessingProduct(false);
          }
      });
  };

  // สร้างตัวเลือกสำหรับ CustomSelect โดยเรียงลำดับจากประวัติการรักษาล่าสุด (หรือลงทะเบียนล่าสุด) ก่อน
  const patientOptions = useMemo(() => {
    const sortedPatients = [...patientsData].sort((a, b) => {
        const valA = getPatientLastVisitStr(a);
        const valB = getPatientLastVisitStr(b);
        if (valA < valB) return 1;  // ค่าน้อยกว่า (เก่ากว่า) ให้อยู่ข้างล่าง
        if (valA > valB) return -1; // ค่ามากกว่า (ใหม่กว่า) ให้อยู่ข้างบน
        return 0;
    });
    
    return [
      { value: '', label: 'เลือกลูกค้าทั่วไป (ไม่ระบุ)' },
      ...sortedPatients.map(p => ({ value: p.id || p.hn, label: `${p.hn || p.id} - ${getPatientFullName(p)}` }))
    ];
  }, [patientsData]);

  return (
    <>
      <style>{`
        @media (max-height: 500px) and (orientation: landscape) {
          .pos-header { margin-bottom: 0.5rem !important; }
          .pos-header h1 { font-size: 1.1rem !important; }
          .pos-header button { padding: 0.25rem 0.5rem !important; font-size: 0.75rem !important; }
          .pos-search-bar { padding: 0.5rem !important; }
          .pos-search-bar .relative { margin-bottom: 0.5rem !important; }
          .pos-search-bar input { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; }
          .pos-product-grid { padding: 0.5rem !important; }
          .pos-product-card { padding: 0.75rem !important; }
          .pos-product-card .w-12 { width: 2rem !important; height: 2rem !important; margin-bottom: 0.5rem !important; }
          .pos-product-card .w-14 { width: 2rem !important; height: 2rem !important; margin-bottom: 0.5rem !important; }
          .pos-product-card h3 { font-size: 0.85rem !important; }
          .pos-cart-header { padding: 0.5rem !important; }
          .pos-cart-items { padding: 0.5rem !important; }
          .pos-summary-toggle { py: 0.25rem !important; }
          .pos-summary-content { padding: 0.5rem !important; }
          .pos-checkout-btn { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        }
      `}</style>
      {/* แก้ไข: เพิ่ม z-[70] เมื่อเปิดตะกร้าบนมือถือ เพื่อยกเลเยอร์ให้ลอยข้าม Header และ Navbar */}
      <div className={`absolute inset-0 flex flex-col p-3 sm:p-4 lg:p-6 xl:p-8 fade-in ${isMobileCartOpen ? 'z-[70]' : ''}`}>
        
        {/* Header ของ POS */}
        <div className="pos-header flex flex-row justify-between items-center gap-2 sm:gap-4 mb-3 sm:mb-4 shrink-0 w-full">
          <div className="flex flex-col items-start">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text tracking-tight flex items-center gap-2 leading-none">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 shrink-0" /> 
              <span>ระบบ POS</span>
              {/* แสดงผลแนวนอนบน Desktop */}
              <span className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-lg">จุดรับชำระเงิน</span>
            </h1>
            {/* แสดงผลบรรทัดล่างบน Mobile */}
            <span className="sm:hidden text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1.5 ml-7">จุดรับชำระเงิน</span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => historyModal.open()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors shadow-sm kanit-text text-[11px] sm:text-sm font-medium"
            >
              <History size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">ประวัติการขาย</span><span className="sm:hidden">ประวัติ</span>
            </button>
          </div>
        </div>

        {/* Main Content: 2 Columns แบบพอดีหน้าจอ (ปรับเป็น md เพื่อให้แท็บเล็ตแนวตั้งแสดงผลแบบ 2 ฝั่งได้) */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 lg:gap-6 min-h-0 relative">
          
          {/* Left Column: Product Catalog (ซ่อนบนมือถือถ้าตะกร้าเปิดอยู่) */}
          <div className={`flex-[6] md:flex-1 flex flex-col bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100/50 overflow-hidden min-h-0 ${isMobileCartOpen ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Search & Filter Bar */}
            <div className="pos-search-bar p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="relative mb-4">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="ค้นหารหัส, ชื่อสินค้า หรือบริการ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl text-base outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors font-data shadow-sm"
                />
              </div>
              
              {/* Category Pills */}
              <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-2.5 pt-1 -mx-1 px-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold kanit-text transition-all shrink-0 ${
                      activeCategory === cat 
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="pos-product-grid flex-1 p-4 sm:p-6 pb-24 lg:pb-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {isGlobalLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-5 auto-rows-max">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`skel-pos-${i}`} className="bg-white p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col h-full">
                      <div className="w-14 h-14 bg-slate-200 rounded-2xl mb-4 animate-pulse shrink-0"></div>
                      <div className="flex-1 flex flex-col justify-between w-full">
                        <div className="mb-2">
                          <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-end justify-between mt-auto w-full pt-2">
                          <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 min-[450px]:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5 auto-rows-max">
                  {filteredProducts.map((product, index) => {
                    const Icon = typeof product.icon === 'string' ? (POS_ICONS[product.icon] || Package) : (product.icon || Package);
                    return (
                      <button 
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="pos-product-card bg-white p-5 sm:p-6 rounded-[1.5rem] border border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 transition-all flex flex-col h-full text-left group active:scale-[0.98] space-row-animation"
                        style={{ animationDelay: `${(index % 20) * 30}ms` }}
                      >
                        <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                          <Icon className="w-7 h-7" strokeWidth={2} />
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between w-full">
                          <div className="mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5 truncate">{product.type}</span>
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base kanit-text line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
                          </div>
                          
                          <div className="flex items-end justify-between mt-auto w-full pt-2 border-t border-slate-50">
                            <div className="font-bold text-sky-600 text-base sm:text-lg font-data leading-none">
                              {formatCurrency(product.price)}
                            </div>
                            {product.stockManaged && (
                              <div className="text-xs text-slate-400 font-bold kanit-text mb-0.5 shrink-0 ml-1 bg-slate-50 px-1.5 py-0.5 rounded">
                                {product.stock !== undefined ? product.stock : 20}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                  <Search className="w-14 h-14 mb-4 opacity-10" />
                  <p className="kanit-text font-bold text-sm sm:text-base italic">ไม่พบรายการที่ค้นหา</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart Area (บน Desktop และ Tablet แสดงด้านขวา, บนมือถือแสดงเต็มจอเมื่อกดปุ่ม) */}
          <div className={`flex-[4] md:flex-none md:min-h-0 w-full md:w-[280px] lg:w-[350px] xl:w-[400px] flex-col bg-slate-50 md:bg-white md:rounded-3xl md:shadow-sm md:border md:border-slate-100/50 overflow-hidden shrink-0 ${isMobileCartOpen ? 'fixed inset-0 z-[70] flex bg-white animate-in slide-in-from-bottom-4 duration-300' : 'hidden md:flex'}`}>
          
            {/* Mobile Cart Header (แสดงเฉพาะบนมือถือเมื่อเปิดตะกร้า) */}
            <div className="md:hidden p-5 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 shadow-sm z-10">
               <h2 className="font-bold text-slate-800 kanit-text flex items-center gap-3 text-xl">
                 <ShoppingCart className="text-sky-500" /> ตะกร้าสินค้า
               </h2>
               <button onClick={() => setIsMobileCartOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"><X size={24}/></button>
            </div>

            {/* Cart Header & Patient Select */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-white md:bg-slate-50/50 shrink-0">
              <h2 className="hidden md:flex font-bold text-slate-800 kanit-text items-center gap-2 mb-3 sm:mb-4 text-base sm:text-lg">
                <ShoppingCart className="w-5 h-5 text-sky-500" /> รายการบิล
            </h2>
            <div className="relative w-full">
              <div className="flex items-center w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all shadow-sm">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                <input 
                  type="text"
                  className="w-full bg-transparent outline-none text-sm sm:text-base font-data text-slate-700"
                  placeholder="ค้นหาชื่อ หรือ HN ลูกค้า..."
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setSelectedPatientId('');
                    setIsPatientDropdownOpen(true);
                  }}
                  onFocus={() => setIsPatientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsPatientDropdownOpen(false), 200)}
                />
                {selectedPatientId && (
                  <button 
                    onClick={() => { setSelectedPatientId(''); setPatientSearchTerm(''); setIsPatientDropdownOpen(false); }} 
                    className="text-slate-400 hover:text-rose-500 ml-2 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {isPatientDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div 
                      onMouseDown={(e) => { e.preventDefault(); handleSelectPatient('', ''); }}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 font-data text-sm sm:text-base ${!selectedPatientId ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-500'}`}
                    >
                       ลูกค้าทั่วไป (ไม่ระบุ)
                    </div>
                    {patientOptions.filter(p => p.value !== '' && p.label.toLowerCase().includes(patientSearchTerm.toLowerCase())).length === 0 && patientSearchTerm && (
                        <div className="px-4 py-3 text-slate-400 text-sm sm:text-base text-center font-data">
                            ไม่พบข้อมูลลูกค้า
                        </div>
                    )}
                    {patientOptions.filter(p => p.value !== '' && p.label.toLowerCase().includes(patientSearchTerm.toLowerCase())).map((opt) => (
                        <div
                            key={opt.value}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectPatient(opt.value, opt.label); }}
                            className={`px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data transition-colors text-sm sm:text-base ${selectedPatientId === opt.value ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* คอร์สคงเหลือของลูกค้า (แสดงเฉพาะเมื่อเลือกลูกค้า) */}
          {selectedPatientId && (
            <div className="px-3 sm:px-4 py-2 bg-indigo-50/30 border-b border-indigo-100 shrink-0 overflow-x-auto custom-scrollbar no-drag-zone">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] font-bold text-indigo-700 kanit-text uppercase tracking-wider">คอร์สคงเหลือ</span>
              </div>
              <div className="flex gap-2 pb-1">
                {(() => {
                  const patient = patientsData.find(p => (p.id || p.hn) === selectedPatientId);
                  const activeCourses = patient?.courses?.filter(c => c.remainingSessions > 0) || [];

                  if (activeCourses.length === 0) {
                    return <div className="text-[10px] text-slate-400 kanit-text py-1 italic">ไม่มีคอร์สคงเหลือ</div>;
                  }

                  return activeCourses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => {
                        // ตรวจสอบก่อนว่ามีการกดตัดคอร์สนี้ไปในตะกร้าหรือยัง
                        const isAlreadyInCart = cart.some(item => item.product.courseId === course.id);
                        if (isAlreadyInCart) {
                          showToast('รายการนี้อยู่ในตะกร้าแล้ว', 'warning');
                          return;
                        }

                        const courseProduct = products.find(p => p.id === course.productId) || {
                          id: course.productId,
                          name: course.name,
                          price: 0,
                          type: 'คอร์สเดิม',
                          icon: 'Package'
                        };

                        // เพิ่มรายการตัดคอร์สเข้าตะกร้า
                        const redeemItem = {
                          product: { 
                            ...courseProduct, 
                            id: `REDEEM_${course.id}`, 
                            price: 0, 
                            isRedeem: true, 
                            courseId: course.id,
                            name: `ตัดรอบ: ${course.name} (${course.remainingSessions}/${course.totalSessions})`
                          },
                          quantity: 1
                        };
                        setCart(prev => [...prev, redeemItem]);
                        showToast(`เพิ่มการตัดคอร์ส ${course.name} เข้าตะกร้า`, 'success');
                      }}
                      className="shrink-0 px-3 py-2 bg-white border border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm active:scale-95 text-left group"
                    >
                      <div className="text-[10px] font-bold text-slate-400 kanit-text group-hover:text-indigo-500 transition-colors">คงเหลือ {course.remainingSessions}/{course.totalSessions}</div>
                      <div className="text-xs font-bold text-slate-700 kanit-text truncate max-w-[120px]">{course.name}</div>
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 bg-slate-50/20">
            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item, idx) => {
                  const CartItemIcon = typeof item.product.icon === 'string' ? (POS_ICONS[item.product.icon] || Package) : (item.product.icon || Package);
                  return (
                   <div key={item.product.id} className={`bg-white p-3.5 sm:p-4 rounded-[1.5rem] border ${item.product.isNote ? 'border-amber-200 bg-amber-50/50' : item.product.isRedeem ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'} shadow-sm flex items-start gap-4 space-row-animation`} style={{ animationDelay: `${idx * 40}ms` }}>
                     <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${item.product.isNote ? 'bg-amber-100 text-amber-500' : item.product.isRedeem ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                        <CartItemIcon size={20} className="sm:w-6 sm:h-6" />
                     </div>
                     <div className="flex-1 min-w-0 pt-0.5">
                       <div className="flex justify-between items-start gap-3">
                         <h4 className={`font-bold text-sm sm:text-base kanit-text leading-tight line-clamp-2 ${item.product.isNote ? 'text-amber-700' : item.product.isRedeem ? 'text-indigo-700' : 'text-slate-800'}`}>
                           {item.product.isRedeem && <span className="mr-2 px-2 py-0.5 bg-indigo-500 text-white text-[10px] rounded-lg uppercase font-black tracking-tighter">ตัดคอร์ส</span>}
                           {item.product.name}
                         </h4>
                         <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 -mr-1.5 -mt-1.5"><X size={18} /></button>
                       </div>

                      {item.product.isTemp ? (
                        <div className="text-rose-500 font-bold text-xs kanit-text mt-1.5">ยังไม่มีราคาในระบบ กรุณาตั้งค่า/เลือกรหัสใหม่</div>
                      ) : !item.product.isNote ? (
                        <div className={`font-bold text-xs sm:text-sm font-data mt-1.5 ${item.product.isRedeem ? 'text-indigo-500' : 'text-sky-600'}`}>
                          {item.product.isRedeem ? 'FREE (REDEEM)' : formatCurrency(item.product.price)}
                        </div>
                      ) : null}

                       {/* Qty Controls (ซ่อนเฉพาะรายการที่เป็นหมายเหตุ) */}
                       {!item.product.isNote && (
                         <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50/80">
                           <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-100 p-1">
                             <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-slate-500 shadow-sm hover:text-sky-500 hover:bg-sky-50 transition-all"><Minus size={14}/></button>
                             <span className="font-bold text-sm sm:text-base text-slate-700 w-8 text-center font-data">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-slate-500 shadow-sm hover:text-sky-500 hover:bg-sky-50 transition-all"><Plus size={14}/></button>
                           </div>
                           <div className="font-bold text-slate-800 text-sm sm:text-base font-data">
                             {formatCurrency(item.product.price * item.quantity)}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                   );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 opacity-50"><ShoppingCart size={32} /></div>
                <p className="kanit-text font-bold text-sm sm:text-base italic">ยังไม่มีรายการในบิล</p>
              </div>
            )}
          </div>
          {/* Cart Summary & Checkout */}
          <div className="bg-white shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] z-20 flex flex-col lg:rounded-t-3xl xl:rounded-t-[2rem] relative border-t border-slate-100">
            
            {/* Toggle Tab - ชิดขอบบน ไม่มีพื้นหลัง โฮเวอร์เป็นสีฟ้าขอบมน */}
            <div 
              className="w-full flex justify-center items-center py-2 sm:py-2.5 bg-transparent hover:bg-sky-50 text-slate-400 hover:text-sky-500 cursor-pointer transition-colors lg:rounded-t-3xl xl:rounded-t-[2rem]"
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              title={isSummaryExpanded ? "ย่อรายละเอียด" : "ขยายเพื่อดูหรือตั้งค่าส่วนลด/ภาษี"}
            >
              <div className="flex items-center gap-1.5 kanit-text font-bold text-[11px] sm:text-xs tracking-wide">
                {isSummaryExpanded ? <ChevronDown size={14} className="sm:w-4 sm:h-4 text-sky-500" /> : <ChevronUp size={14} className="sm:w-4 sm:h-4 text-sky-500" />}
                <span>{isSummaryExpanded ? 'ย่อรายละเอียดส่วนลดและภาษี' : 'ตั้งค่าส่วนลดและภาษี'}</span>
                {/* แจ้งเตือนกระพริบเมื่อมีการตั้งค่าไว้แต่ถูกพับอยู่ */}
                {!isSummaryExpanded && (discountAmount > 0 || vatAmount > 0) && (
                   <span className="flex h-2 w-2 relative ml-0.5">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                   </span>
                )}
              </div>
            </div>

            <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 sm:pt-2 flex flex-col">
              
              {/* Collapsible Summary Lines (ซ่อน/แสดงด้วย Grid Transition) */}
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isSummaryExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-2.5 sm:space-y-3 pb-3 font-data text-xs sm:text-sm">
                    {/* รวมเป็นเงิน */}
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="kanit-text font-medium">รวมเป็นเงิน</span>
                      <span className="font-bold">{formatCurrency(subtotal)}</span>
                    </div>

                    {/* ส่วนลดเพิ่มเติม */}
                    <div className="flex justify-between items-center">
                      <span className="kanit-text font-medium text-slate-700 flex items-center gap-1">
                        ส่วนลดเพิ่มเติม
                        {discountType === 'percent' && discount > 0 && <span className="text-rose-500 font-bold text-[10px] sm:text-xs">({discount}%)</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={discount || ''}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-16 sm:w-20 px-2 py-1 text-right text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-400 font-data transition-colors"
                          placeholder="0.00"
                        />
                        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden h-[26px] sm:h-[28px]">
                          <button onClick={() => setDiscountType('amount')} className={`px-2 text-[10px] sm:text-xs font-bold font-data transition-colors ${discountType === 'amount' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>฿</button>
                          <div className="w-px bg-slate-200"></div>
                          <button onClick={() => setDiscountType('percent')} className={`px-2 text-[10px] sm:text-xs font-bold font-data transition-colors ${discountType === 'percent' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>%</button>
                        </div>
                      </div>
                    </div>

                    {/* ส่วนลดรวมทั้งหมด */}
                    <div className="flex justify-between items-center text-rose-500 font-medium">
                      <span className="kanit-text">ส่วนลดรวมทั้งหมด</span>
                      <span className="font-bold">- {formatCurrency(discountAmount)}</span>
                    </div>

                    <div className="h-px w-full bg-slate-100 my-1.5"></div>

                    {/* ยอดหลังหักส่วนลด */}
                    <div className="flex justify-between items-center text-slate-700 font-medium">
                      <span className="kanit-text">ยอดหลังหักส่วนลด</span>
                      <span className="font-bold">{formatCurrency(afterDiscount)}</span>
                    </div>

                    {/* การคิดภาษี (Radio Buttons) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                      <span className="kanit-text font-bold text-slate-800">การคิดภาษี</span>
                      <div className="flex items-center gap-3 text-[10px] sm:text-xs kanit-text">
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input type="radio" name="taxMode" value="include" checked={taxMode === 'include'} onChange={() => setTaxMode('include')} className="hidden" />
                          <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${taxMode === 'include' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                            {taxMode === 'include' && <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-sky-500" />}
                          </div>
                          <span className={`transition-colors ${taxMode === 'include' ? 'text-sky-600 font-bold' : 'text-slate-600 group-hover:text-sky-500'}`}>รวม VAT</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input type="radio" name="taxMode" value="exclude" checked={taxMode === 'exclude'} onChange={() => setTaxMode('exclude')} className="hidden" />
                          <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${taxMode === 'exclude' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                            {taxMode === 'exclude' && <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-sky-500" />}
                          </div>
                          <span className={`transition-colors ${taxMode === 'exclude' ? 'text-sky-600 font-bold' : 'text-slate-600 group-hover:text-sky-500'}`}>แยก VAT</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input type="radio" name="taxMode" value="none" checked={taxMode === 'none'} onChange={() => setTaxMode('none')} className="hidden" />
                          <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${taxMode === 'none' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                            {taxMode === 'none' && <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-sky-500" />}
                          </div>
                          <span className={`transition-colors ${taxMode === 'none' ? 'text-sky-600 font-bold' : 'text-slate-600 group-hover:text-sky-500'}`}>ไม่คิด VAT</span>
                        </label>
                      </div>
                    </div>

                    {/* ราคาไม่รวมภาษีมูลค่าเพิ่ม */}
                    <div className={`flex justify-between items-center text-slate-700 font-medium transition-opacity ${taxMode === 'none' ? 'opacity-40 select-none' : ''}`}>
                      <span className="kanit-text">ราคาไม่รวมภาษีมูลค่าเพิ่ม</span>
                      <span className="font-bold">{formatCurrency(priceExcludingVat)}</span>
                    </div>

                    {/* ภาษีมูลค่าเพิ่ม + Input % */}
                    <div className={`flex justify-between items-center text-slate-700 font-medium transition-opacity ${taxMode === 'none' ? 'opacity-40 select-none pointer-events-none' : ''}`}>
                      <div className="flex items-center gap-2">
                          <span className="kanit-text">ภาษีมูลค่าเพิ่ม</span>
                          <div className="flex items-center gap-1">
                              <input
                                  type="number"
                                  value={vatRate}
                                  onChange={(e) => setVatRate(Number(e.target.value))}
                                  disabled={taxMode === 'none'}
                                  className="w-12 sm:w-14 px-1 py-0.5 text-center text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-400 font-data disabled:bg-slate-50 transition-colors"
                              />
                              <span className="text-xs sm:text-sm">%</span>
                          </div>
                      </div>
                      <span className="font-bold">{formatCurrency(vatAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Always Visible: ยอดสุทธิ (เปลี่ยนเป็นส่วนแสดงผลเฉยๆ) */}
              <div className={`flex justify-between items-center text-lg sm:text-xl font-black text-slate-800 mb-3 select-none transition-all ${isSummaryExpanded ? 'pt-3 border-t border-slate-100' : ''}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="kanit-text">ยอดสุทธิ</span>
                  {/* Indicator แจ้งเตือนเมื่อถูกย่อและมีการตั้งค่าส่วนลด/ภาษี */}
                  {!isSummaryExpanded && (discountAmount > 0 || vatAmount > 0) && (
                     <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md kanit-text border border-amber-100 animate-in fade-in">
                        มีส่วนลด/ภาษี
                     </span>
                  )}
                </div>
                <span className="font-data text-sky-600">{formatCurrency(grandTotal)}</span>
              </div>

              {/* Checkout Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 hover:text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="ล้างตะกร้า"
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={`flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-lg shadow-md transition-all active:scale-[0.98] kanit-text disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
                    cart.length > 0 ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30' : 'bg-slate-100 text-slate-400 shadow-none'
                  }`}
                >
                  ชำระเงิน {cart.length > 0 ? formatCurrency(grandTotal) : ''}
                </button>
              </div>
            </div>
          </div>
          
          </div> {/* End of Right Column */}

          {/* --- Floating Mobile Cart Button (แสดงเฉพาะบนมือถือตอนอยู่หน้าเลือกสินค้า) --- */}
          {!isMobileCartOpen && (
            <div className="md:hidden fixed bottom-[76px] left-4 right-4 z-40 transition-all duration-300">
              <button 
                onClick={() => setIsMobileCartOpen(true)}
                className={`w-full p-4 rounded-2xl shadow-xl flex items-center justify-between transition-all active:scale-95 ${cart.length > 0 ? 'bg-sky-500 text-white shadow-sky-500/30' : 'bg-white text-slate-600 border border-slate-200 shadow-slate-200/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cart.length > 0 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <ShoppingCart size={24} />
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <p className={`text-[10px] font-black kanit-text leading-none mb-1.5 uppercase tracking-widest ${cart.length > 0 ? 'text-sky-100' : 'text-slate-400'}`}>
                      ตะกร้าสินค้า ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                    </p>
                    <p className={`text-lg font-bold font-data leading-none ${cart.length > 0 ? 'text-white' : 'text-slate-600'}`}>
                      {formatCurrency(grandTotal)}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 kanit-text font-black text-sm ${cart.length > 0 ? 'bg-white/20 pl-4 pr-2.5 py-2 rounded-xl' : 'opacity-50'}`}>
                   <span>{cart.length > 0 ? 'ดูบิล' : 'เปิดตะกร้า'}</span>
                   <ChevronRight size={18} />
                </div>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${checkoutModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col ${checkoutModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <Banknote size={20} className="text-sky-500"/> ชำระเงิน
              </h3>
              <button onClick={closeCheckoutAndReset} className="text-slate-400 hover:bg-white p-1 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6">
               <div className="text-center mb-6">
                  <p className="text-sm text-slate-500 font-medium kanit-text mb-1">ยอดที่ต้องชำระ</p>
                  <h2 className="text-4xl font-black text-sky-500 font-data tracking-tight">{formatCurrency(grandTotal)}</h2>
               </div>

               <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700 kanit-text">เลือกวิธีชำระเงิน</label>
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => setPaymentMethod('cash')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all kanit-text font-medium ${paymentMethod === 'cash' ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <Banknote size={24} /> เงินสด
                     </button>
                     <button onClick={() => setPaymentMethod('transfer')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all kanit-text font-medium ${paymentMethod === 'transfer' ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <QrCode size={24} /> โอนเงิน (QR)
                     </button>
                     <button onClick={() => setPaymentMethod('credit')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all kanit-text font-medium col-span-2 ${paymentMethod === 'credit' ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <CreditCard size={24} /> บัตรเครดิต
                     </button>
                  </div>
               </div>

               {checkoutSuccess ? (
                  <div className="mt-8 flex flex-col items-center animate-in fade-in zoom-in slide-in-from-bottom-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 size={32} />
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg kanit-text">ทำรายการสำเร็จ</h4>
                      <p className="text-slate-500 text-sm kanit-text">บันทึกข้อมูลการขายเรียบร้อยแล้ว</p>
                      <button onClick={closeCheckoutAndReset} className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors kanit-text">เสร็จสิ้น</button>
                  </div>
               ) : (
                  <button 
                     onClick={confirmPayment}
                     disabled={isProcessingPayment}
                     className="mt-8 w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-md shadow-sky-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 kanit-text text-lg"
                  >
                     {isProcessingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : <Receipt size={20} />}
                     {isProcessingPayment ? 'กำลังบันทึก...' : 'ยืนยันการรับเงิน'}
                  </button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${historyModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-4xl rounded-[1.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${historyModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0 z-10">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <History size={20} className="text-sky-500"/> ประวัติการทำรายการ (POS)
              </h3>
              <button onClick={closeHistoryModal} className="text-slate-400 hover:text-slate-600 hover:bg-white p-1.5 sm:p-2 rounded-full transition-colors shadow-sm border border-transparent hover:border-slate-200"><X size={20} className="sm:w-5 sm:h-5"/></button>
            </div>
            
            {/* เพิ่ม id="pos-history-scroll-container" เพื่อให้ฟังก์ชันหาเจอและสั่ง scroll กลับไปบนสุดได้ */}
            <div id="pos-history-scroll-container" className="p-0 sm:p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30" onScroll={!selectedHistoryTxn ? handleHistoryScroll : undefined}>
                {isGlobalLoading ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden m-4 sm:m-0">
                        <div className="overflow-x-auto overflow-y-hidden">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text">
                                        <th className="p-4 font-bold">วันที่/เวลา</th><th className="p-4 font-bold">เลขที่บิล</th><th className="p-4 font-bold">ลูกค้า</th><th className="p-4 font-bold text-right">ยอดรวม</th><th className="p-4 font-bold text-center">วิธีชำระ</th><th className="p-4 font-bold text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skel-hist-${idx}`} className="border-b border-slate-50"><td className="p-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-6 w-16 bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td><td className="p-4"><div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse mx-auto"></div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : selectedHistoryTxn ? (
                    // --- View Details & Edit View ---
                    <div className="bg-white sm:rounded-2xl sm:border border-slate-100 sm:shadow-sm overflow-hidden fade-in min-h-full flex flex-col">
                         {/* Header ของหน้ารายละเอียด */}
                         <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={handleBackToHistoryList} className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200">
                                    <ChevronLeft size={20} className="sm:w-5 sm:h-5" />
                                </button>
                                <div>
                                    <h4 className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight">รายละเอียดบิล</h4>
                                    <p className="text-[10px] sm:text-xs text-sky-600 font-bold font-data mt-0.5">{selectedHistoryTxn.id}</p>
                                </div>
                            </div>
                            <div>
                                {!isEditingHistory ? (
                                    <button onClick={handleEditTxn} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                        <Pencil size={14} className="sm:w-[16px] sm:h-[16px]" /> แก้ไขข้อมูล
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsEditingHistory(false)} disabled={isSavingHistory} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors text-[11px] sm:text-sm font-bold kanit-text disabled:opacity-50">
                                            ยกเลิก
                                        </button>
                                        <button onClick={handleSaveTxnEdit} disabled={isSavingHistory} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-500 text-white hover:bg-sky-600 rounded-xl transition-all active:scale-95 shadow-md shadow-sky-500/20 text-[11px] sm:text-sm font-bold kanit-text disabled:opacity-50">
                                            {isSavingHistory ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={14} className="sm:w-[16px] sm:h-[16px]" />} บันทึก
                                        </button>
                                    </div>
                                )}
                            </div>
                         </div>

                         {/* Body ของหน้ารายละเอียด */}
                         <div className="p-4 sm:p-6 flex-1 flex flex-col">
                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className={`p-4 rounded-xl border ${isEditingHistory ? 'bg-sky-50/30 border-sky-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><User size={12}/></div>
                                        <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">ข้อมูลลูกค้า & วันที่</p>
                                    </div>
                                    {isEditingHistory ? (
                                        <div className="space-y-3 mt-1 relative z-20">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 kanit-text">ชื่อลูกค้า</label>
                                                <input type="text" className={`${theme.input} py-2 px-3 text-sm font-data`} value={historyEditForm.patientName} onChange={e => setHistoryEditForm({...historyEditForm, patientName: e.target.value})} placeholder="ลูกค้าทั่วไป (ไม่ระบุ)" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pl-1">
                                            <p className="font-bold text-slate-800 text-sm sm:text-base kanit-text">{selectedHistoryTxn.patientName || 'ลูกค้าทั่วไป (ไม่ระบุ)'}</p>
                                            <p className="text-xs text-slate-500 font-data mt-1.5 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {formatDateTime(selectedHistoryTxn.createdAt)}</p>
                                        </div>
                                    )}
                                </div>
                                <div className={`p-4 rounded-xl border ${isEditingHistory ? 'bg-sky-50/30 border-sky-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><CreditCard size={12}/></div>
                                        <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">สถานะ & การชำระเงิน</p>
                                    </div>
                                    {isEditingHistory ? (
                                        <div className="grid grid-cols-2 gap-3 mt-1 relative z-10">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 kanit-text">สถานะบิล</label>
                                                <CustomSelect 
                                                    compact
                                                    value={historyEditForm.status} 
                                                    onChange={val => setHistoryEditForm({...historyEditForm, status: val})}
                                                    options={[{value:'completed', label:'🟢 สำเร็จ'}, {value:'cancelled', label:'🔴 ยกเลิก (Void)'}]}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 kanit-text">วิธีชำระเงิน</label>
                                                <CustomSelect 
                                                    compact
                                                    value={historyEditForm.paymentMethod} 
                                                    onChange={val => setHistoryEditForm({...historyEditForm, paymentMethod: val})}
                                                    options={[{value:'cash', label:'💵 เงินสด'}, {value:'transfer', label:'📱 โอนเงิน'}, {value:'credit', label:'💳 บัตรเครดิต'}]}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 pl-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 w-16">สถานะ:</span>
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold kanit-text ${selectedHistoryTxn.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : selectedHistoryTxn.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {selectedHistoryTxn.status === 'completed' ? 'สำเร็จ' : selectedHistoryTxn.status === 'cancelled' ? 'ยกเลิก (Void)' : selectedHistoryTxn.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 w-16">ช่องทาง:</span>
                                                <span className="px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-600 kanit-text flex items-center gap-1.5 shadow-sm">
                                                    {selectedHistoryTxn.paymentMethod === 'cash' ? <><Banknote size={12}/> เงินสด</> : selectedHistoryTxn.paymentMethod === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : selectedHistoryTxn.paymentMethod === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : selectedHistoryTxn.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <h5 className="font-bold text-slate-700 kanit-text mb-3 flex items-center gap-2"><ShoppingCart size={16} className="text-sky-500" /> รายการสินค้า ({selectedHistoryTxn.items?.length || 0})</h5>
                            <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 flex-1 min-h-[200px]">
                                {/* Desktop Table */}
                                <div className="hidden sm:block overflow-x-auto h-full">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium kanit-text sticky top-0">
                                                <th className="p-3 w-12 text-center">#</th>
                                                <th className="p-3">รายการสินค้า / บริการ</th>
                                                <th className="p-3 text-center w-24">จำนวน</th>
                                                <th className="p-3 text-right w-32">ราคา/หน่วย</th>
                                                <th className="p-3 text-right w-32">รวม (บาท)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(selectedHistoryTxn.items || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-data text-sm">
                                                    <td className="p-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                                                    <td className="p-3 text-slate-700 font-bold kanit-text">{item.name}</td>
                                                    <td className="p-3 text-center font-semibold">{item.quantity}</td>
                                                    <td className="p-3 text-right text-slate-500">{formatCurrency(item.price)}</td>
                                                    <td className="p-3 text-right font-bold text-sky-600">{formatCurrency(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile List */}
                                <div className="sm:hidden flex flex-col divide-y divide-slate-50 overflow-y-auto max-h-[300px] custom-scrollbar bg-slate-50/30">
                                    {(selectedHistoryTxn.items || []).map((item, idx) => (
                                        <div key={idx} className="p-3 flex flex-col gap-1 bg-white">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="font-bold text-slate-800 text-sm kanit-text leading-tight">{item.name}</div>
                                                <div className="font-bold text-sky-600 text-sm font-data shrink-0">{formatCurrency(item.total)}</div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-data text-slate-500 mt-1">
                                                <div>จำนวน {item.quantity} รายการ</div>
                                                <div>{formatCurrency(item.price)} / หน่วย</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shrink-0">
                                <div className="w-full sm:w-auto">
                                    <div className="text-[10px] sm:text-xs text-slate-400 kanit-text mb-1 flex items-center gap-1.5"><FileText size={12}/> รหัสอ้างอิง: {selectedHistoryTxn.id}</div>
                                </div>
                                <div className="w-full sm:w-72 space-y-2 text-sm font-data">
                                    <div className="flex justify-between text-slate-600"><span className="kanit-text">รวมเป็นเงิน</span><span className="font-semibold">{formatCurrency(selectedHistoryTxn.subtotal)}</span></div>
                                    {selectedHistoryTxn.discountAmount > 0 && (
                                        <div className="flex justify-between text-rose-500"><span className="kanit-text">ส่วนลด {selectedHistoryTxn.discountType === 'percent' ? `(${selectedHistoryTxn.discountValue}%)` : ''}</span><span className="font-semibold">- {formatCurrency(selectedHistoryTxn.discountAmount)}</span></div>
                                    )}
                                    {selectedHistoryTxn.vatAmount > 0 && (
                                        <div className="flex justify-between text-slate-600"><span className="kanit-text">ภาษี ({selectedHistoryTxn.taxMode === 'include' ? 'รวม' : 'แยก'})</span><span className="font-semibold">{formatCurrency(selectedHistoryTxn.vatAmount)}</span></div>
                                    )}
                                    <div className="h-px bg-slate-200/60 my-2"></div>
                                    <div className="flex justify-between items-end text-xl sm:text-2xl font-black text-sky-600 kanit-text"><span className="text-base sm:text-lg">ยอดสุทธิ</span><span className="font-data tracking-tight">{formatCurrency(selectedHistoryTxn.grandTotal)}</span></div>
                                </div>
                            </div>
                         </div>
                    </div>
                ) : posHistoryData && posHistoryData.length > 0 ? (
                    // --- Existing List View ---
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden m-4 sm:m-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto overflow-y-hidden">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text">
                                        <th className="p-4 font-bold">วันที่/เวลา</th><th className="p-4 font-bold">เลขที่บิล</th><th className="p-4 font-bold">ลูกค้า</th><th className="p-4 font-bold text-right">ยอดรวม</th><th className="p-4 font-bold text-center">วิธีชำระ</th><th className="p-4 font-bold text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* ใช้ .slice เพื่อจำกัดจำนวนการแสดงผลแบบ Infinite Scroll */}
                                    {posHistoryData.slice(0, visibleHistoryCount).map((txn, idx) => (
                                        <tr key={txn.id || idx} onClick={() => handleViewHistoryTxn(txn)} className="hover:bg-sky-50/50 cursor-pointer transition-colors font-data text-sm space-row-animation group" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                                            <td className="p-4 text-slate-600">{formatDateTime(txn.createdAt)}</td>
                                            <td className="p-4 font-bold text-sky-600 kanit-text group-hover:text-sky-700">{txn.id}</td>
                                            <td className="p-4 text-slate-800 kanit-text font-medium">{txn.patientName || '-'}</td>
                                            <td className="p-4 font-bold text-slate-800 text-right">{formatCurrency(txn.grandTotal)}</td>
                                            <td className="p-4 text-center">
                                                <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg kanit-text font-semibold flex items-center justify-center gap-1.5 w-fit mx-auto border border-slate-200 shadow-sm">
                                                    {txn.paymentMethod === 'cash' ? <><Banknote size={12}/> เงินสด</> : txn.paymentMethod === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : txn.paymentMethod === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : txn.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full kanit-text ${txn.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : txn.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                    {txn.status === 'completed' ? 'สำเร็จ' : txn.status === 'cancelled' ? 'ยกเลิก' : txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {isHistoryLoadingMore && Array.from({ length: 3 }).map((_, idx) => (
                                        <tr key={`skel-hist-more-${idx}`} className="border-b border-slate-50"><td className="p-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-6 w-16 bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td><td className="p-4"><div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse mx-auto"></div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-slate-50/50">
                            {posHistoryData.slice(0, visibleHistoryCount).map((txn, idx) => (
                                <div key={txn.id || idx} onClick={() => handleViewHistoryTxn(txn)} className="p-4 bg-white hover:bg-sky-50/50 cursor-pointer transition-colors space-row-animation active:scale-[0.98]" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                                    <div className="flex justify-between items-start mb-2.5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sky-600 kanit-text text-sm bg-sky-50 px-2 py-0.5 rounded-md w-fit">{txn.id}</span>
                                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 font-data"><Clock size={12}/> {formatDateTime(txn.createdAt)}</div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md kanit-text shrink-0 ${txn.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : txn.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                            {txn.status === 'completed' ? 'สำเร็จ' : txn.status === 'cancelled' ? 'ยกเลิก' : txn.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-xs font-semibold text-slate-400 kanit-text">ลูกค้า</div>
                                            <div className="text-sm font-bold text-slate-700 kanit-text line-clamp-1">{txn.patientName || '-'}</div>
                                        </div>
                                        <div className="text-right flex flex-col gap-1 shrink-0">
                                            <div className="text-[10px] text-slate-400 kanit-text font-semibold flex items-center justify-end gap-1.5">
                                                {txn.paymentMethod === 'cash' ? <Banknote size={12}/> : txn.paymentMethod === 'transfer' ? <QrCode size={12}/> : <CreditCard size={12}/>}
                                                {txn.paymentMethod === 'cash' ? 'เงินสด' : txn.paymentMethod === 'transfer' ? 'โอนเงิน' : txn.paymentMethod === 'credit' ? 'บัตรเครดิต' : txn.paymentMethod}
                                            </div>
                                            <div className="font-black text-sky-600 font-data text-lg leading-none">{formatCurrency(txn.grandTotal)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isHistoryLoadingMore && Array.from({ length: 3 }).map((_, idx) => (
                                <div key={`skel-mob-${idx}`} className="p-4 bg-white flex flex-col gap-3 border-b border-slate-100">
                                    <div className="flex justify-between"><div className="h-5 w-24 bg-slate-200 rounded animate-pulse"></div><div className="h-5 w-16 bg-slate-200 rounded-md animate-pulse"></div></div>
                                    <div className="flex justify-between items-end mt-2"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div><div className="h-6 w-20 bg-slate-200 rounded animate-pulse"></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 min-h-[300px] p-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                            <Receipt size={32} className="text-slate-300" />
                        </div>
                        <p className="kanit-text font-bold text-lg text-slate-500 mb-1">ยังไม่มีข้อมูลประวัติการขาย</p>
                        <p className="text-sm kanit-text">รายการบิลที่ชำระเงินสำเร็จจะแสดงที่นี่</p>
                    </div>
                )}
            </div>
            
            {/* ซ่อนปุ่มปิดด้านล่างเมื่ออยู่ในโหมดดูรายละเอียด เพราะมีปุ่ม Back ด้านบนแล้ว */}
            {!selectedHistoryTxn && (
                <div className="p-3 sm:p-4 border-t border-slate-100 bg-white text-right shrink-0 z-10">
                    <button onClick={closeHistoryModal} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold kanit-text hover:bg-slate-200 transition-colors">ปิดหน้าต่าง</button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Modal และ Alert จัดการสินค้าถูกย้ายไปยัง CatalogManager แล้ว */}
    </>
  );
};

// --- ระบบฐานข้อมูลรายการ (Catalog Manager) ---
const CatalogManager = ({ products = [], setProducts, callAppScript, showToast, isGlobalLoading }) => {
  const [search, setSearch] = useState('');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isEditFormClosing, setIsEditFormClosing] = useState(false);
  const [isProcessingProduct, setIsProcessingProduct] = useState(false);
  const initialProductForm = { id: '', name: '', type: '', price: '', stockManaged: false, icon: 'Package', isCourse: false, courseSessions: 1 };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [sweetAlert, setSweetAlert] = useState({ isOpen: false, type: '', title: '', text: '', onConfirm: null });

  const headerRef = React.useRef(null);
  const filterRef = React.useRef(null);

  // ใช้ ResizeObserver เพื่อติดตามความสูงของ Header อย่างแม่นยำตลอดเวลาแม้ตอนเกิดแอนิเมชัน
  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            // ป้องกันการเซ็ตค่า Height เป็น 0 เมื่อ Component ถูกซ่อน (display: none)
            if (entry.target.offsetHeight > 0 && filterRef.current) {
                // เซ็ตค่าพิกัดให้ filterRef ทันทีโดยไม่ต้องผ่าน State (ป้องกัน Re-render กระตุก)
                filterRef.current.style.top = `${entry.target.offsetHeight}px`;
            }
        }
    });

    observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  // --- ระบบ Sticky เลียนแบบเวชระเบียน ---
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = (e) => {
      const { scrollTop } = e.target;
      if (headerRef.current) {
        if (scrollTop > 20) headerRef.current.classList.add('is-scrolled');
        else headerRef.current.classList.remove('is-scrolled');
      }
      if (filterRef.current) {
        if (scrollTop > 20) filterRef.current.classList.add('is-stuck');
        else filterRef.current.classList.remove('is-stuck');
      }
    };

    setTimeout(() => {
        if (mainElement && mainElement.scrollTop > 20) {
            if (headerRef.current) headerRef.current.classList.add('is-scrolled');
            if (filterRef.current) filterRef.current.classList.add('is-stuck');
        }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  const closeAlert = () => setSweetAlert(prev => ({...prev, isOpen: false}));

  const closeEditForm = () => {
    setIsEditFormClosing(true);
    setTimeout(() => {
        setIsEditFormOpen(false);
        setIsEditFormClosing(false);
    }, 300);
  };

  const handleOpenAddProduct = () => {
      setProductForm({ ...initialProductForm });
      setIsEditFormOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
      setProductForm({ 
        ...initialProductForm, 
        ...prod, 
        isCourse: !!prod.isCourse, 
        courseSessions: prod.courseSessions || 1 
      });
      setIsEditFormOpen(true);
  };

  const handleSaveProduct = async (e) => {
      e.preventDefault();
      setIsProcessingProduct(true);
      
      const payload = {
          ...productForm,
          id: productForm.id || `ITM${Date.now()}`,
          price: Number(productForm.price),
          courseSessions: Number(productForm.courseSessions) || 1
      };

      try {
          await callAppScript('SAVE_DATA', 'setting_pos', payload);
          if (productForm.id) {
              setProducts(products.map(p => p.id === productForm.id ? payload : p));
              showToast('อัปเดตรายการสำเร็จ', 'success');
          } else {
              setProducts([payload, ...products]);
              showToast('เพิ่มรายการใหม่สำเร็จ', 'success');
          }
          closeEditForm();
      } catch (error) {
          showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'warning');
      }
      setIsProcessingProduct(false);
  };

  const handleDeleteProduct = (prod) => {
      setSweetAlert({
          isOpen: true, type: 'warning', title: 'ยืนยันการลบรายการ?',
          text: `คุณต้องการลบ "${prod.name}" ใช่หรือไม่?`,
          onConfirm: async () => {
              closeAlert();
              setIsProcessingProduct(true);
              try {
                  await callAppScript('DELETE_DATA', 'setting_pos', { id: prod.id });
                  setProducts(products.filter(p => p.id !== prod.id));
                  showToast('ลบรายการสำเร็จ', 'danger');
              } catch (error) {
                  showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning');
              }
              setIsProcessingProduct(false);
          }
      });
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.type)));
  }, [products]);

  return (
    <div className="fade-in pb-10 relative">
      
      {/* --- 1. Sticky Header --- */}
      <div ref={headerRef} className="sticky top-0 z-30 w-full pointer-events-none">
        <div className="w-full pointer-events-auto sticky-header-bg">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-2">
                <Tag className="text-sky-500" /> สินค้า/บริการ
              </h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">จัดการสินค้า, บริการ, คอร์ส และแพ็กเกจ ทั้งหมดในคลินิก</p>
            </div>
            <div className="flex gap-2">
              {!isEditFormOpen && (
                <button onClick={handleOpenAddProduct} className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 bg-sky-500 text-white hover:bg-sky-600 kanit-text sticky-header-btn">
                  <Plus size={18} /> <span className="hidden sm:inline">เพิ่มรายการใหม่</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. Sticky Filter ลอยอิสระ และสแนปติดใต้ Header เมื่อเลื่อน --- */}
      <div ref={filterRef} className="glass-filter-wrapper sticky z-20 w-full pointer-events-none">
        <div className="w-full mx-auto pointer-events-none relative h-[88px] z-50">
          {/* แก้ไข flex-col เป็น flex-row แถวเดียว และปรับ gap */}
          <div className="absolute left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-row justify-between items-center gap-2 sm:gap-4">
            {/* ใส่ flex-1 และ min-w-0 เพื่อให้ช่องค้นหายืดขยายจนสุด */}
            <div className="relative flex-1 min-w-0 w-full">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือหมวดหมู่..." 
                className="w-full pl-10 pr-3 sm:pl-11 sm:pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data truncate"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
            </div>
            {/* ใส่ shrink-0 ป้องกันไม่ให้ปุ่มโดนบีบจนข้อความตกบรรทัด */}
            <div className="text-xs sm:text-sm font-bold text-slate-500 kanit-text whitespace-nowrap bg-white px-3 py-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 shadow-sm pointer-events-auto shrink-0">
              ทั้งหมด {filteredProducts.length} รายการ
            </div>
          </div>
        </div>
      </div>

      {/* --- 3. ตาราง/เนื้อหา --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 mb-12">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map((prod) => {
              const PIcon = typeof prod.icon === 'string' ? (POS_ICONS[prod.icon] || Package) : (prod.icon || Package);
              return (
                <div key={prod.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/5 transition-all group relative overflow-hidden">
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shrink-0 border border-sky-100 shadow-inner">
                      <PIcon size={28} />
                    </div>
                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => handleOpenEditProduct(prod)} className="p-2.5 bg-white text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-slate-100 shadow-sm"><Pencil size={16} /></button>
                      <button onClick={() => handleDeleteProduct(prod)} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100 shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="min-w-0 relative z-10">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black kanit-text truncate uppercase border border-slate-200/50">{prod.type}</span>
                        {prod.stockManaged && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-lg text-[10px] font-black kanit-text uppercase border border-indigo-100">ตัดสต็อก</span>}
                        {prod.isCourse && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black kanit-text uppercase border border-amber-100">คอร์ส ({prod.courseSessions})</span>}
                    </div>
                    <h4 className="font-bold text-slate-800 text-base kanit-text line-clamp-2 leading-tight mb-3">{prod.name}</h4>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                        <span className="text-xl font-black text-sky-600 font-data">฿{Number(prod.price).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] p-16 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><Search size={40} className="text-slate-200" /></div>
            <p className="kanit-text font-bold text-xl text-slate-400">ไม่พบรายการที่ค้นหา</p>
            {search && <button onClick={() => setSearch('')} className="text-sky-500 font-bold kanit-text hover:underline text-sm">ล้างการค้นหา "{search}"</button>}
          </div>
        )}
      </div>

      {isEditFormOpen && createPortal(
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${isEditFormClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isEditFormClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Tag size={20} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-xl kanit-text">{productForm.id ? 'แก้ไขข้อมูลรายการ' : 'เพิ่มข้อมูลรายการใหม่'}</h4>
                </div>
                <button type="button" onClick={closeEditForm} disabled={isProcessingProduct} className="text-slate-400 hover:bg-white p-2 rounded-xl transition-colors shadow-sm border border-transparent hover:border-slate-200"><X size={20}/></button>
            </div>
            
            <form id="catalog-form" onSubmit={handleSaveProduct} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 bg-slate-50/30">
                <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">ชื่อรายการ <span className="text-rose-500">*</span></label>
                                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="เช่น เลเซอร์ฝ้า, ครีมกันแดด" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">ราคา (บาท) <span className="text-rose-500">*</span></label>
                                <input required type="number" min="0" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data font-bold text-sky-600 text-lg" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="0.00" />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">หมวดหมู่ <span className="text-rose-500">*</span></label>
                            <input required type="text" list="category-options" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data" value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})} placeholder="พิมพ์หมวดหมู่ หรือเลือกจากรายการ" />
                            <datalist id="category-options">
                                {categories.filter(c => c !== 'ทั้งหมด').map((cat, idx) => <option key={idx} value={cat} />)}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">เลือกไอคอน <span className="text-rose-500">*</span></label>
                            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {Object.keys(POS_ICONS).map(iconKey => {
                                    const CurrentIcon = POS_ICONS[iconKey];
                                    const isSelected = productForm.icon === iconKey;
                                    return (
                                        <button 
                                            key={iconKey} type="button" 
                                            onClick={() => setProductForm({...productForm, icon: iconKey})}
                                            className={`aspect-square flex items-center justify-center rounded-xl transition-all ${isSelected ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110 z-10' : 'bg-white text-slate-500 hover:bg-sky-50 border border-slate-200 hover:border-sky-200'}`}
                                        >
                                            <CurrentIcon size={24} />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div onClick={() => setProductForm({...productForm, stockManaged: !productForm.stockManaged})} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${productForm.stockManaged ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="checkbox" className="w-5 h-5 mt-0.5 accent-indigo-500 rounded cursor-pointer pointer-events-none" checked={productForm.stockManaged} readOnly />
                                <div>
                                    <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">จัดการสต็อก (สินค้า)</label>
                                    <p className="text-xs text-slate-500 mt-1 kanit-text">รายการนี้เป็นสิ่งของที่ต้องนับจำนวน มีการรับเข้า และตัดจ่าย</p>
                                </div>
                            </div>
                            <div onClick={() => setProductForm({...productForm, isCourse: !productForm.isCourse})} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${productForm.isCourse ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="checkbox" className="w-5 h-5 mt-0.5 accent-amber-500 rounded cursor-pointer pointer-events-none" checked={productForm.isCourse} readOnly />
                                <div>
                                    <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">คอร์ส / แพ็กเกจ</label>
                                    <p className="text-xs text-slate-500 mt-1 kanit-text">รายการนี้มีจำนวนครั้งที่ต้องตัดเมื่อมาใช้บริการ</p>
                                </div>
                            </div>
                        </div>

                        {productForm.isCourse && (
                            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/60 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-amber-700 mb-2 kanit-text">จำนวนครั้งทั้งหมด (Total Sessions) <span className="text-rose-500">*</span></label>
                                <div className="flex items-center gap-3">
                                    <input required type="number" min="1" className="w-full max-w-[200px] px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-data font-bold text-amber-700 text-lg text-center" value={productForm.courseSessions} onChange={e => setProductForm({...productForm, courseSessions: e.target.value})} placeholder="1" />
                                    <span className="font-bold text-amber-600 kanit-text">ครั้ง</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex gap-4">
                  <button type="button" onClick={closeEditForm} className="flex-[1] py-4 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold kanit-text hover:bg-slate-200 transition-colors">ยกเลิก</button>
                  <button type="submit" disabled={isProcessingProduct} className="flex-[2] py-4 bg-sky-500 text-white rounded-2xl font-bold shadow-xl shadow-sky-500/30 kanit-text hover:bg-sky-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-lg">
                      {isProcessingProduct ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />} ยืนยันการบันทึก
                  </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {sweetAlert.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center modal-animate-in">
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 kanit-text">{sweetAlert.title}</h3><p className="text-slate-500 mb-8 kanit-text">{sweetAlert.text}</p>
            <div className="flex gap-3 w-full"><button onClick={closeAlert} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">ยกเลิก</button><button onClick={sweetAlert.onConfirm} className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-colors shadow-lg shadow-rose-500/30 kanit-text">ยืนยัน</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ระบบจัดการสาขา (Branch Manager) ---
const BranchManager = ({ branchesData = [], setBranchesData, showToast, callAppScript, isGlobalLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const initialForm = { id: '', name: '', address: '', phone: '', manager: '', status: 'active' };
  const [formData, setFormData] = useState(initialForm);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => { setIsModalOpen(false); setIsClosing(false); }, 300);
  };

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({ ...initialForm, id: `b${branchesData.length + 1}` });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({ ...branch });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await callAppScript('SAVE_DATA', 'Branches', formData);
      if (editingBranch) {
        setBranchesData(prev => prev.map(b => b.id === formData.id ? formData : b));
      } else {
        setBranchesData(prev => [...prev, formData]);
      }
      showToast('บันทึกข้อมูลสาขาสำเร็จ', 'success');
      closeModal();
    } catch (err) {
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-500" /> จัดการสาขา
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 kanit-text mt-1">ตั้งค่าและจัดการข้อมูลสาขาทั้งหมดของคลินิก</p>
        </div>
        <button onClick={handleOpenAdd} className="w-full md:w-auto px-5 py-2.5 bg-sky-500 text-white rounded-xl font-bold kanit-text hover:bg-sky-600 transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2">
          <Plus size={18} /> เพิ่มสาขาใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isGlobalLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
             <Loader2 className="w-10 h-10 animate-spin opacity-20" />
             <p className="kanit-text text-sm italic">กำลังโหลดข้อมูลสาขา...</p>
          </div>
        ) : branchesData.length > 0 ? (
          branchesData.map((branch, idx) => (
            <div key={branch.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-sky-100/50 transition-colors"></div>
               
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shadow-inner">
                     <Building2 size={24} />
                   </div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${branch.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                     {branch.status === 'active' ? 'เปิดบริการ' : 'ปิดชั่วคราว'}
                   </span>
                 </div>
                 
                 <h3 className="text-lg font-bold text-slate-800 kanit-text mb-1">{branch.name}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">ID: {branch.id}</p>
                 
                 <div className="space-y-2.5 mb-6">
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <MapPin size={14} className="shrink-0" />
                       <p className="text-xs kanit-text line-clamp-1">{branch.address || 'ไม่ระบุที่อยู่'}</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <Phone size={14} className="shrink-0" />
                       <p className="text-xs font-data">{branch.phone || 'ไม่ระบุเบอร์โทร'}</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <User size={14} className="shrink-0" />
                       <p className="text-xs kanit-text">ผู้จัดการ: {branch.manager || 'ไม่ระบุ'}</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(branch)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold kanit-text hover:bg-sky-50 hover:text-sky-600 transition-colors border border-slate-100">
                       แก้ไขข้อมูล
                    </button>
                    <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
                       <Trash2 size={16} />
                    </button>
                 </div>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
             <Building2 size={64} className="opacity-10 mb-4" />
             <p className="kanit-text text-lg font-bold">ยังไม่มีข้อมูลสาขา</p>
             <p className="kanit-text text-sm italic">กดปุ่ม "เพิ่มสาขาใหม่" เพื่อเริ่มต้น</p>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className={`bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
             <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <Building2 size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold text-slate-800 kanit-text">{editingBranch ? 'แก้ไขข้อมูลสาขา' : 'เพิ่มสาขาใหม่'}</h3>
                      <p className="text-xs text-slate-400 kanit-text uppercase tracking-widest mt-0.5">Branch Configuration</p>
                   </div>
                </div>
                <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm border border-slate-100 transition-colors"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                   <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">รหัสสาขา</label>
                      <input required type="text" className={`${theme.input} !py-2.5 font-data uppercase`} value={formData.id} onChange={e => setFormData({...formData, id: e.target.value.toLowerCase()})} disabled={!!editingBranch} />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ชื่อสาขา <span className="text-rose-500">*</span></label>
                      <input required type="text" className={`${theme.input} !py-2.5 font-data`} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="เช่น สาขาสุขุมวิท" />
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ที่อยู่สาขา</label>
                   <textarea className={`${theme.input} !py-2.5 font-data min-h-[80px] resize-none`} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="เลขที่, ถนน, ตำบล, อำเภอ..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์</label>
                      <input type="tel" className={`${theme.input} !py-2.5 font-data`} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="02-XXX-XXXX" />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ผู้จัดการสาขา</label>
                      <input type="text" className={`${theme.input} !py-2.5 font-data`} value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} placeholder="ชื่อ-นามสกุล" />
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">สถานะการให้บริการ</label>
                   <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 border border-slate-100">
                      <button type="button" onClick={() => setFormData({...formData, status: 'active'})} className={`flex-1 py-2 rounded-xl text-xs font-bold kanit-text transition-all ${formData.status === 'active' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>เปิดบริการ</button>
                      <button type="button" onClick={() => setFormData({...formData, status: 'inactive'})} className={`flex-1 py-2 rounded-xl text-xs font-bold kanit-text transition-all ${formData.status === 'inactive' ? 'bg-white text-rose-500 shadow-sm border border-rose-100' : 'text-slate-400 hover:text-slate-600'}`}>ปิดชั่วคราว</button>
                   </div>
                </div>

                <div className="pt-4">
                   <button type="submit" disabled={isProcessing} className="w-full py-4 bg-sky-500 text-white rounded-[1.5rem] font-bold shadow-xl shadow-sky-500/20 hover:bg-sky-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 kanit-text text-lg">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 size={24} />} 
                      {editingBranch ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูลสาขา'}
                   </button>
                </div>
             </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// --- ระบบคลังสินค้า (Inventory Manager) ---
const InventoryManager = ({
    inventoryData = [], setInventoryData,
    inventoryLogsData = [], setInventoryLogsData,
    posProducts = [], branchesData = [],
    showToast, callAppScript, isGlobalLoading,
    currentBranch
}) => {
  const [search, setSearch] = useState('');
  const [activeBranch, setActiveBranch] = useState(currentBranch === 'all' ? 'ทั้งหมด' : currentBranch);

  useEffect(() => {
    setActiveBranch(currentBranch === 'all' ? 'ทั้งหมด' : currentBranch);
  }, [currentBranch]);

  const [isModalOpen, setIsModalOpen] = useState(false);  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isAdjustClosing, setIsAdjustClosing] = useState(false);

  // Log Modal States
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLogClosing, setIsLogClosing] = useState(false);
  const [selectedProductLogs, setSelectedProductLogs] = useState([]);
  const [logProductInfo, setLogProductInfo] = useState(null);

  // Lot Modal States
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [isLotClosing, setIsLotClosing] = useState(false);
  const [selectedLotItem, setSelectedLotItem] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Closing logic with animation ---
  const closeModal = () => {
    setIsModalClosing(true);
    setTimeout(() => { setIsModalOpen(false); setIsModalClosing(false); }, 300);
  };
  const closeAdjustModal = () => {
    setIsAdjustClosing(true);
    setTimeout(() => { setIsAdjustModalOpen(false); setIsAdjustClosing(false); }, 300);
  };
  const closeLogModal = () => {
    setIsLogClosing(true);
    setTimeout(() => { setIsLogModalOpen(false); setIsLogClosing(false); }, 300);
  };
  const closeLotModal = () => {
    setIsLotClosing(true);
    setTimeout(() => { setIsLotModalOpen(false); setIsLotClosing(false); }, 300);
  };

  // --- Calendar states for Expire Date ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('days'); // 'days', 'months', 'years'
  const [yearPageStart, setYearPageStart] = useState(0);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState('form_expire'); // 'form_expire', 'adjust_expire', 'adjust_receive'
  const expireDateWrapperRef = React.useRef(null);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const closeCalendar = () => {
    setIsCalendarClosing(true);
    setTimeout(() => { setShowCalendar(false); setIsCalendarClosing(false); }, 300);
  };

  const handleOpenCalendar = () => {
    setCalendarTarget('form_expire');
    const targetDate = formData.expireDate;
    if (targetDate && targetDate.includes('/')) {
        const parts = targetDate.split('/');
        const y = parseInt(parts[2], 10) - 543;
        if (!isNaN(y)) setCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
    } else {
        setCalDate(new Date());
    }
    setCalView('days');
    setShowCalendar(true);
  };

  const handleOpenCalendarForAdjust = (field) => { // 'expireDate' or 'receiveDate'
    setCalendarTarget(field === 'expireDate' ? 'adjust_expire' : 'adjust_receive');
    const targetDate = field === 'expireDate' ? adjustData.expireDate : adjustData.receiveDate;
    
    if (targetDate && targetDate.includes('/')) {
        const parts = targetDate.split('/');
        const y = parseInt(parts[2], 10) - 543;
        if (!isNaN(y)) setCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
    } else {
        setCalDate(new Date());
    }
    setCalView('days');
    setShowCalendar(true);
  };

  const handleDaySelect = (day) => {
    const d = String(day).padStart(2, '0');
    const m = String(calDate.getMonth() + 1).padStart(2, '0');
    const y = calDate.getFullYear() + 543;
    const dateStr = `${d}/${m}/${y}`;
    
    if (calendarTarget === 'adjust_expire') {
        setAdjustData({ ...adjustData, expireDate: dateStr });
    } else if (calendarTarget === 'adjust_receive') {
        setAdjustData({ ...adjustData, receiveDate: dateStr });
    } else {
        setFormData({ ...formData, expireDate: dateStr });
    }
    closeCalendar();
  };

  const handlePrevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));

  useEffect(() => {
    if (calView === 'years') setYearPageStart(Math.floor((calDate.getFullYear() + 543) / 12) * 12);
  }, [calView, calDate]);

  // Form states
  const initialForm = { 
    id: '', 
    productId: '', 
    minStock: 5, 
    receiveDate: new Date().toISOString().split('T')[0], // เพิ่มวันที่รับเข้าเริ่มต้น
    expireDate: '', 
    lotNo: '',
    branchAssignments: [] // จะถูกเติมอัตโนมัติเมื่อเปิด Modal
  };
  const [formData, setFormData] = useState(initialForm);
  const [adjustData, setAdjustData] = useState({ type: 'add', amount: 1, reason: '', branchId: '', lotNo: '', expireDate: '', receiveDate: '' });

  const addBranchAssignment = () => {
    // ป้องกันการเพิ่มสาขาซ้ำในลิสต์
    const currentBranchIds = formData.branchAssignments.map(b => b.branchId);
    const availableBranch = branches.find(b => !currentBranchIds.includes(b.id));
    
    if (!availableBranch) {
        showToast('เลือกสาขาครบถ้วนแล้ว', 'warning');
        return;
    }

    setFormData(prev => ({
      ...prev,
      branchAssignments: [...prev.branchAssignments, { branchId: availableBranch.id, quantity: 0, isNew: true }]
    }));
  };

  const removeBranchAssignment = (index) => {
    setFormData(prev => ({
      ...prev,
      branchAssignments: prev.branchAssignments.filter((_, i) => i !== index)
    }));
  };

  const updateBranchAssignment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      branchAssignments: prev.branchAssignments.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const branches = branchesData;

  // แก้ไข: ปรับปรุง Logic การรวมข้อมูลให้รองรับการแยกตามล็อต (Lot-specific View)
  const joinedData = useMemo(() => {
    const manageableProducts = posProducts.filter(p => p.stockManaged);
    const results = [];

    manageableProducts.forEach(product => {
      const productStocks = inventoryData.filter(i => i.productId === product.id);
      
      // กรณีเลือกสาขาเจาะจง
      if (activeBranch !== 'ทั้งหมด') {
        const branchStocks = productStocks.filter(i => i.branchId === activeBranch);
        
        if (branchStocks.length === 0) {
          // ถ้ายังไม่มีสต็อกเลย ให้โชว์แถวว่าง 1 แถวสำหรับสาขานั้น
          results.push({ 
            id: `AUTO_${product.id}_${activeBranch}`,
            productId: product.id,
            branchId: activeBranch,
            quantity: 0,
            minStock: 5,
            receiveDate: '',
            expireDate: '',
            lotNo: '',
            product: product,
            isGrouped: false
          });
        } else {
          // รวบรวมข้อมูลให้เป็นแบบ Group เสมอ เพื่อความเป็นระเบียบและรวม Lot ไว้ในปุ่ม
          const totalQty = branchStocks.reduce((sum, s) => sum + Number(s.quantity), 0);
          const minStock = branchStocks.length > 0 ? Math.max(...branchStocks.map(s => s.minStock)) : 5;
          
          results.push({
            id: `GROUPED_${product.id}_${activeBranch}`,
            productId: product.id,
            branchId: activeBranch,
            quantity: totalQty,
            minStock: minStock,
            product: product,
            isGrouped: true,
            stocks: branchStocks
          });
        }
      } else {
        // กรณีดู "ทุกสาขา" (ยังคงรวมยอดต่อสินค้าเพื่อให้ดูง่าย แต่เก็บข้อมูลล็อตไว้ข้างใน)
        const totalQty = productStocks.reduce((sum, s) => sum + Number(s.quantity), 0);
        const minStock = productStocks.length > 0 ? Math.max(...productStocks.map(s => s.minStock)) : 5;
        
        results.push({
          id: `GROUPED_${product.id}`,
          productId: product.id,
          branchId: 'ทุกสาขา',
          quantity: totalQty,
          minStock: minStock,
          product: product,
          isGrouped: true,
          stocks: productStocks // เก็บข้อมูลดิบของทุกสาขาและทุกล็อตไว้
        });
      }
    });

    return results;
  }, [inventoryData, posProducts, activeBranch]);

  const filteredData = useMemo(() => {
    return joinedData.filter(item => {
      const matchSearch = item.product.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.productId && item.productId.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [joinedData, search]);

  // สถิติสต็อก
  const stats = useMemo(() => {
    const today = new Date();
    let total = 0, low = 0, out = 0, expired = 0, nearExpiry = 0;

    filteredData.forEach(item => {
      total++;
      if (item.quantity <= 0) {
        out++;
      } else {
        if (item.quantity <= item.minStock) low++;

        // เช็ควันหมดอายุ
        const checkExpiration = (stockItem) => {
          if (!stockItem.expireDate || !stockItem.expireDate.includes('/') || stockItem.quantity <= 0) return { isExpired: false, isNear: false };
          const parts = stockItem.expireDate.split('/');
          if (parts.length !== 3) return { isExpired: false, isNear: false };
          const expDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          const monthsDiff = (expDate.getFullYear() - today.getFullYear()) * 12 + (expDate.getMonth() - today.getMonth());
          
          if (expDate < today) return { isExpired: true, isNear: false };
          if (monthsDiff <= 3) return { isExpired: false, isNear: true };
          return { isExpired: false, isNear: false };
        };

        if (item.isGrouped) {
          let prodHasExpired = false;
          let prodHasNear = false;
          item.stocks.forEach(s => {
            const { isExpired, isNear } = checkExpiration(s);
            if (isExpired) prodHasExpired = true;
            if (isNear) prodHasNear = true;
          });
          if (prodHasExpired) expired++;
          if (prodHasNear) nearExpiry++;
        } else {
          const { isExpired, isNear } = checkExpiration(item);
          if (isExpired) expired++;
          if (isNear) nearExpiry++;
        }
      }
    });

    return { total, low, out, expired, nearExpiry };
  }, [filteredData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ 
        ...initialForm, 
        branchAssignments: [{ branchId: activeBranch === 'ทั้งหมด' ? 'b1' : activeBranch, quantity: 0, isNew: true }] 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    
    // ดึงข้อมูลทุกสาขาของสินค้านี้มาแสดงใน Modal (ไร้รอยต่อ)
    const allProductStocks = inventoryData.filter(i => i.productId === item.productId);
    const assignments = allProductStocks.map(s => ({
        id: s.id,
        branchId: s.branchId,
        quantity: s.quantity
    }));

    // ถ้ายังไม่มีสาขาไหนเลย ให้ใส่สาขาปัจจุบันเป็นค่าเริ่มต้น
    if (assignments.length === 0) {
        assignments.push({ branchId: activeBranch === 'ทั้งหมด' ? 'b1' : activeBranch, quantity: 0, isNew: true });
    }

    // ใช้ข้อมูลจากแถวแรกเป็นค่าพื้นฐาน (กรณี grouped จะดึงจากข้อมูลที่มี)
    const baseInfo = allProductStocks[0] || item;

    setFormData({
      id: item.productId, 
      productId: item.productId,
      minStock: baseInfo.minStock || 5,
      receiveDate: baseInfo.receiveDate || new Date().toISOString().split('T')[0],
      expireDate: baseInfo.expireDate || '',
      lotNo: baseInfo.lotNo || '',
      branchAssignments: assignments
    });
    setIsModalOpen(true);
  };

  const handleOpenAdjust = (item) => {
    // กำหนดสาขาเริ่มต้น: ถ้าเป็นสาขา "ทั้งหมด" ให้พยายามเอาจากข้อมูลดิบก่อน (หรือค่าเริ่มต้น b1)
    const defaultBranch = activeBranch === 'ทั้งหมด' 
        ? (item.stocks?.[0]?.branchId || 'b1') 
        : activeBranch;

    // ค้นหาข้อมูลสต็อกปัจจุบันของสาขาที่เลือก เพื่อเอาล็อตและวันหมดอายุมาแสดงเริ่มต้น
    const existingStock = item.isGrouped 
        ? item.stocks.find(s => s.branchId === defaultBranch)
        : item;

    setAdjustItem(item);
    setAdjustData({ 
        type: 'add', 
        amount: 1, 
        reason: '', 
        branchId: defaultBranch,
        lotNo: existingStock?.lotNo || '',
        expireDate: existingStock?.expireDate || '',
        receiveDate: existingStock?.receiveDate || new Date().toISOString().split('T')[0]
    });
    setIsAdjustModalOpen(true);
  };

  const handleOpenLotModal = (item) => {
    setSelectedLotItem(item);
    setIsLotModalOpen(true);
  };

  // ฟังก์ชันเปิดดูประวัติ (Log)
  const handleOpenLogs = (item) => {
    // แก้ไข: ถ้าเป็นโหมดรวมยอด (isGrouped) ให้กรองเฉพาะรหัสสินค้า เพื่อโชว์ประวัติของทุกสาขา
    const logs = inventoryLogsData.filter(l => {
        const matchProduct = l.productId === item.productId;
        const matchBranch = item.isGrouped ? true : l.branchId === item.branchId;
        return matchProduct && matchBranch;
    });
    setSelectedProductLogs(logs);
    setLogProductInfo(item.product);
    setIsLogModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const results = [];
      const logs = [];

      for (const assignment of formData.branchAssignments) {
          // ใช้ ID เดิมของสาขานั้นๆ ถ้ามี หรือสร้างใหม่ถ้าเป็นสาขาที่เพิ่งเพิ่ม
          const finalId = assignment.id || `STK${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const isNew = !assignment.id;
          
          const payload = {
            id: finalId,
            productId: formData.productId,
            branchId: assignment.branchId,
            quantity: Number(assignment.quantity),
            minStock: Number(formData.minStock),
            receiveDate: formData.receiveDate,
            expireDate: formData.expireDate,
            lotNo: formData.lotNo
          };
          
          await callAppScript('SAVE_DATA', 'Inventory', payload);
          
          // บันทึก Log เฉพาะเมื่อมีการเปลี่ยนแปลงจำนวน (หรือเป็นรายการใหม่)
          // เพื่อความปลอดภัย ให้สร้าง Log เสมอสำหรับการตั้งค่าเริ่มต้น/แก้ไข
          const logPayload = {
              id: `LOG${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              productId: payload.productId,
              branchId: payload.branchId,
              type: 'MANUAL',
              amount: payload.quantity,
              balance: payload.quantity,
              reason: isNew ? 'ตั้งค่าเริ่มต้นสาขาใหม่' : 'อัปเดตข้อมูลรวมศูนย์',
              timestamp: new Date().toISOString()
          };
          await callAppScript('SAVE_DATA', 'InventoryLogs', logPayload);
          
          results.push(payload);
          logs.push(logPayload);
      }

      setInventoryData(prev => {
          let next = [...prev];
          results.forEach(res => {
              const idx = next.findIndex(i => i.id === res.id);
              if (idx !== -1) next[idx] = res;
              else next.push(res);
          });
          return next;
      });

      setInventoryLogsData(prev => [...logs, ...prev]);
      
      showToast('บันทึกข้อมูลและกระจายสต็อกสำเร็จ', 'success');
      closeModal();
    } catch (err) {
      console.error("Inventory Save Error:", err);
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const amount = Number(adjustData.amount);
      const isAdd = adjustData.type === 'add';
      const targetBranchId = adjustData.branchId;
      const targetLotNo = adjustData.lotNo;

      // ค้นหาข้อมูลสต็อกปัจจุบันของสาขา และ ล็อต ที่เลือก
      const existingStock = inventoryData.find(i => 
        i.productId === adjustItem.productId && 
        i.branchId === targetBranchId &&
        (i.lotNo || '') === (targetLotNo || '')
      );
      
      const currentQty = existingStock ? Number(existingStock.quantity) : 0;
      const newQty = isAdd ? currentQty + amount : Math.max(0, currentQty - amount);

      // ใช้ ID เดิมถ้ามี หรือสร้างใหม่
      const finalId = existingStock?.id || `STK${Date.now()}`;
      const payload = {
          id: finalId,
          productId: adjustItem.productId,
          branchId: targetBranchId,
          quantity: newQty,
          minStock: existingStock?.minStock || adjustItem.minStock || 5,
          expireDate: adjustData.expireDate,
          lotNo: targetLotNo,
          receiveDate: adjustData.receiveDate
      };

      await callAppScript('SAVE_DATA', 'Inventory', payload);

      // สร้าง Log
      const logPayload = {
          id: `LOG${Date.now()}`,
          productId: adjustItem.productId,
          branchId: targetBranchId,
          type: isAdd ? 'IN' : 'OUT',
          amount: amount,
          balance: newQty,
          reason: adjustData.reason || (isAdd ? 'รับเข้า (ปกติ)' : 'จ่ายออก/ปรับปรุง'),
          lotNo: targetLotNo,
          expireDate: adjustData.expireDate,
          receiveDate: adjustData.receiveDate,
          timestamp: new Date().toISOString()
      };
      await callAppScript('SAVE_DATA', 'InventoryLogs', logPayload);

      setInventoryData(prev => {
          const exists = prev.some(i => i.id === finalId);
          if (exists) return prev.map(i => i.id === finalId ? payload : i);
          return [payload, ...prev];
      });
      setInventoryLogsData(prev => [logPayload, ...prev]);

      showToast(`ปรับปรุงสต็อกสำเร็จ (ยอดใหม่: ${newQty})`, 'success');
      closeAdjustModal();
    } catch (err) {
      console.error("Adjustment Error:", err);
      showToast('ไม่สามารถปรับปรุงสต็อกได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 kanit-text flex items-center gap-3">
            <Package className="w-7 h-7 text-sky-500" /> ระบบคลังสินค้า
          </h2>
          <p className="text-sm sm:text-base text-slate-500 kanit-text mt-1.5">จัดการสต๊อกยา เวชภัณฑ์ และสินค้าทุกสาขา</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-full md:w-auto px-6 py-3.5 bg-sky-500 text-white rounded-2xl font-bold kanit-text hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2.5 text-base"
        >
          <Plus size={20} /> เพิ่มรายการสต็อก
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shrink-0"><Package size={22} className="sm:w-6 sm:h-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate" title="รายการทั้งหมด">รายการทั้งหมด</p>
            <p className="text-lg sm:text-xl font-bold text-slate-800 font-data truncate">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0"><AlertTriangle size={22} className="sm:w-6 sm:h-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate" title="สต็อกใกล้หมด">สต็อกใกล้หมด</p>
            <p className="text-lg sm:text-xl font-bold text-amber-600 font-data truncate">{stats.low}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0"><X size={22} className="sm:w-6 sm:h-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate" title="สินค้าหมด">สินค้าหมด</p>
            <p className="text-lg sm:text-xl font-bold text-rose-600 font-data truncate">{stats.out}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0"><AlertOctagon size={22} className="sm:w-6 sm:h-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate" title="หมดอายุ">หมดอายุ</p>
            <p className="text-lg sm:text-xl font-bold text-rose-700 font-data truncate">{stats.expired}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 overflow-hidden col-span-2 lg:col-span-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0"><Clock size={22} className="sm:w-6 sm:h-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate" title="ใกล้หมดอายุ">ใกล้หมดอายุ</p>
            <p className="text-lg sm:text-xl font-bold text-amber-700 font-data truncate">{stats.nearExpiry}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-8 flex flex-col sm:flex-row gap-5 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อสินค้า หรือรหัส..." 
            className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-base font-data shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[240px] shrink-0">
          <CustomSelect 
            value={activeBranch}
            onChange={val => setActiveBranch(val)}
            options={[{ id: 'ทั้งหมด', name: 'ทุกสาขา (รวมยอด)' }, ...branches].map(b => ({ value: b.id, label: b.name }))}
            placeholder="เลือกสาขา"
            className="w-full bg-slate-50 border-slate-100 rounded-2xl"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {isGlobalLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="w-12 h-12 animate-spin opacity-20" />
            <p className="kanit-text text-base italic">กำลังโหลดข้อมูลคลังสินค้า...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider whitespace-nowrap">สินค้า / เวชภัณฑ์</th>
                  <th className="px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">สาขาที่เปิด</th>
                  <th className="px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">ล็อต & วันหมดอายุ</th>
                  <th className="px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">คงเหลือ</th>
                  <th className="px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">ความปลอดภัย</th>
                  <th className="px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item, idx) => {
                  const Icon = POS_ICONS[item.product.icon] || Package;
                  const isLow = item.quantity <= item.minStock && item.quantity > 0;
                  const isOut = item.quantity <= 0;
                  
                  // Logic ตรวจสอบวันหมดอายุ (Safety Check) และนับจำนวนล็อต
                  let expiryStatus = 'normal'; // 'normal', 'warning', 'danger'
                  let expiredLots = 0;
                  let warningLots = 0;
                  
                  const checkDate = (dateStr, qty) => {
                      if (!dateStr || !dateStr.includes('/') || Number(qty) <= 0) return 'normal';
                      const parts = dateStr.split('/');
                      const expDate = new Date(parseInt(parts[2])-543, parseInt(parts[1])-1, parseInt(parts[0]));
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      
                      // เปลี่ยนเป็นคำนวณหาจำนวนวันเพื่อความแม่นยำ 100%
                      const timeDiff = expDate.getTime() - today.getTime();
                      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                      
                      if (daysDiff <= 0) return 'danger';
                      if (daysDiff <= 90) return 'warning';
                      return 'normal';
                  };

                  if (item.isGrouped && item.stocks) {
                      // นับเฉพาะล็อตที่ไม่ซ้ำกัน (ป้องกันกรณีกระจายหลายสาขาแต่เป็นล็อตเดียวกัน) และมีสินค้าเหลืออยู่
                      const uniqueLots = [];
                      item.stocks.forEach(s => {
                          if (Number(s.quantity) > 0) {
                              const lotKey = s.lotNo ? `${s.lotNo}_${s.expireDate}` : s.id;
                              if (!uniqueLots.find(u => u.key === lotKey)) {
                                  uniqueLots.push({ key: lotKey, expireDate: s.expireDate, quantity: s.quantity });
                              }
                          }
                      });

                      uniqueLots.forEach(u => {
                          const status = checkDate(u.expireDate, u.quantity);
                          if (status === 'danger') expiredLots++;
                          else if (status === 'warning') warningLots++;
                      });
                      
                      if (expiredLots > 0) expiryStatus = 'danger';
                      else if (warningLots > 0) expiryStatus = 'warning';
                  } else {
                      expiryStatus = checkDate(item.expireDate, item.quantity);
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleOpenLogs(item)}>
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOut ? 'bg-rose-50 text-rose-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'}`}>
                            <Icon size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 kanit-text text-base truncate leading-tight">{item.product.name}</p>
                            <p className="text-xs text-slate-400 font-data tracking-tight mt-1.5 whitespace-nowrap">{item.productId} | {item.product.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-5 text-center">
                        {item.isGrouped ? (
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {Array.from(new Set(item.stocks.map(s => s.branchId))).map(bId => {
                                        const bName = branches.find(b => b.id === bId)?.name || bId;
                                        return (
                                            <span key={bId} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase border border-indigo-100 whitespace-nowrap">
                                                {bName}
                                            </span>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 kanit-text whitespace-nowrap">รวมจาก {item.stocks.length} ล็อต</p>
                            </div>
                        ) : (
                            <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold kanit-text uppercase whitespace-nowrap">
                                {branches.find(b => b.id === item.branchId)?.name || item.branchId}
                            </span>
                        )}
                      </td>
                      <td className="px-7 py-5 text-center">
                        {item.isGrouped ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenLotModal(item); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold kanit-text transition-colors border border-indigo-100 shadow-sm whitespace-nowrap"
                            >
                                <Package size={14} /> ดูข้อมูลล็อต ({item.stocks.length})
                            </button>
                        ) : item.expireDate || item.lotNo ? (
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-sm font-bold font-data whitespace-nowrap ${expiryStatus === 'danger' ? 'text-rose-600' : expiryStatus === 'warning' ? 'text-amber-600' : 'text-slate-600'}`}>
                                    EXP: {item.expireDate || '-'}
                                </span>
                                <span className="text-xs text-slate-400 font-data tracking-tighter uppercase whitespace-nowrap">LOT: {item.lotNo || '-'}</span>
                            </div>
                        ) : <span className="text-slate-300 text-sm whitespace-nowrap">-</span>}
                      </td>
                      <td className="px-7 py-5 text-center">
                        <p className={`font-bold text-xl font-data whitespace-nowrap ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-slate-700'}`}>
                          {item.quantity}
                        </p>
                        <p className="text-xs text-slate-400 kanit-text mt-0.5 font-medium whitespace-nowrap">ขั้นต่ำ: {item.minStock}</p>
                      </td>
                      <td className="px-7 py-5 text-center">
                        {expiryStatus === 'danger' ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-rose-500 px-3 py-1.5 rounded-xl animate-pulse shadow-md shadow-rose-500/30 whitespace-nowrap">
                                <AlertOctagon size={14} /> {item.isGrouped && expiredLots > 0 ? `หมดอายุ (${expiredLots} ล็อต)` : 'หมดอายุ/ห้ามจ่าย'}
                            </div>
                        ) : expiryStatus === 'warning' ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 whitespace-nowrap">
                                <Clock size={14} /> {item.isGrouped && warningLots > 0 ? `ใกล้หมดอายุ (${warningLots} ล็อต)` : 'ใกล้หมดอายุ'}
                            </div>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 whitespace-nowrap">
                            <X size={14} /> สินค้าหมด
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 whitespace-nowrap">
                            <AlertTriangle size={14} /> สต็อกต่ำ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 whitespace-nowrap">
                            <CheckCircle2 size={14} /> ปลอดภัย
                          </span>
                        )}
                      </td>
                      <td className="px-7 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-drag-zone">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenLogs(item); }}
                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100"
                            title="ดูประวัติ"
                          >
                            <History size={20} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenAdjust(item); }}
                            className="p-2.5 text-sky-500 hover:bg-sky-50 rounded-xl transition-colors border border-transparent hover:border-sky-100"
                            title="ปรับสต็อก"
                          >
                            <ArrowUpDown size={20} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                            className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                            title="แก้ไข"
                          >
                            <Pencil size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <Package size={32} className="opacity-20" />
            </div>
            <p className="kanit-text text-sm italic">ไม่พบข้อมูลสต็อกที่ต้องการ</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isModalClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className={`bg-white rounded-3xl w-full max-w-md max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">{editingItem ? 'แก้ไขรายการสต็อก' : 'เพิ่มรายการสต็อกใหม่'}</h3>
                  <p className="text-xs text-slate-500 kanit-text">จัดการข้อมูลพื้นฐานและจำนวนขั้นต่ำ</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 kanit-text uppercase">สินค้า / บริการ <span className="text-rose-500">*</span></label>
                <CustomSelect 
                  placeholder="เลือกสินค้าจาก POS"
                  value={formData.productId}
                  onChange={val => setFormData({...formData, productId: val})}
                  options={posProducts.map(p => ({ value: p.id, label: `${p.name} (${p.id})` }))}
                  className="w-full"
                />
              </div>

              {/* ส่วนการจัดการสาขาแบบ Array (เหมือนเพิ่มเบอร์โทร) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 ml-1 kanit-text uppercase">ข้อมูลสต็อกรายสาขา <span className="text-rose-500">*</span></label>
                <div className="space-y-2.5">
                  {formData.branchAssignments.map((assignment, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <CustomSelect 
                          value={assignment.branchId}
                          onChange={val => updateBranchAssignment(idx, 'branchId', val)}
                          options={branches.map(b => ({ value: b.id, label: b.name }))}
                          className="w-full"
                          compact
                        />
                      </div>
                      <div className="w-[100px]">
                        <input 
                          required type="number" min="0" 
                          className={`${theme.input} !py-2.5 font-data text-center`}
                          value={assignment.quantity}
                          onChange={e => updateBranchAssignment(idx, 'quantity', e.target.value)}
                          placeholder="จำนวน"
                        />
                      </div>
                      {formData.branchAssignments.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeBranchAssignment(idx)}
                          className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={addBranchAssignment}
                  className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1.5 mt-2 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition-colors kanit-text border border-sky-100/50"
                >
                  <Plus size={14} /> เพิ่มสาขาอื่น
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 kanit-text uppercase">แจ้งเตือนขั้นต่ำ <span className="text-rose-500">*</span></label>
                  <input 
                    required type="number" min="1" className={theme.input}
                    value={formData.minStock}
                    onChange={e => setFormData({...formData, minStock: e.target.value})}
                  />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="button" onClick={handleSaveItem} disabled={isProcessing} className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold shadow-md shadow-sky-500/30 kanit-text hover:bg-sky-600 transition-colors flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 size={18} />} ยืนยัน
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Custom Calendar Portal for Inventory --- */}
      {showCalendar && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeCalendar}></div>
          <div className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
            
            {calView === 'days' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={handlePrevMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[calDate.getMonth()]} {calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={handleNextMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 h-8"></div>)}
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const dateStr = `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}`;
                    
                    let isSelected = false;
                    if (calendarTarget === 'adjust_expire') isSelected = adjustData.expireDate === dateStr;
                    else if (calendarTarget === 'adjust_receive') isSelected = adjustData.receiveDate === dateStr;
                    else isSelected = formData.expireDate === dateStr;

                    const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();
                    return (<button key={day} type="button" onClick={() => handleDaySelect(day)} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 transform scale-110' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>)
                  })}
                </div>
              </>
            )}

            {calView === 'months' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => (
                    <button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${calDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>
                  ))}
                </div>
              </>
            )}

            {calView === 'years' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{yearPageStart} - {yearPageStart + 11}</span>
                  <button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (
                    <button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(calDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Adjustment Modal */}
      {isAdjustModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isAdjustClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeAdjustModal}></div>
          <div className={`bg-white rounded-[2rem] w-full max-w-2xl max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isAdjustClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                  <ArrowUpDown size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 kanit-text leading-tight">ปรับปรุงสต็อกสินค้า</h3>
                  <p className="text-sm text-slate-500 kanit-text mt-0.5">{adjustItem?.product.name} <span className="mx-2 text-slate-300">|</span> <span className="font-data">{adjustItem?.productId}</span></p>
                </div>
              </div>
              <button onClick={closeAdjustModal} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveAdjustment} className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Column: ข้อมูลพื้นฐานและล็อต */}
                <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-sky-500 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">ข้อมูลสาขาและคลัง</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase tracking-wider">ทำรายการที่สาขา</label>
                        <CustomSelect 
                          value={adjustData.branchId}
                          onChange={val => {
                            const branchStocks = inventoryData.filter(i => i.productId === adjustItem?.productId && i.branchId === val);
                            const firstStock = branchStocks[0];
                            setAdjustData({
                                ...adjustData, 
                                branchId: val,
                                lotNo: firstStock?.lotNo || '',
                                expireDate: firstStock?.expireDate || '',
                                receiveDate: firstStock?.receiveDate || new Date().toISOString().split('T')[0]
                            });
                          }}
                          options={branches.map(b => ({ value: b.id, label: b.name }))}
                          className="w-full"
                          compact
                          fullWidth
                        />
                      </div>
                      
                      <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-sky-600 kanit-text uppercase mb-1">คงเหลือล็อตที่เลือก</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-sky-700 font-data">
                            {inventoryData.find(i => 
                              i.productId === adjustItem?.productId && 
                              i.branchId === adjustData.branchId &&
                              (i.lotNo || '') === (adjustData.lotNo || '')
                            )?.quantity || 0}
                          </span>
                          <span className="text-sm font-bold text-sky-600 kanit-text">รายการ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">การจัดการล็อต</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase tracking-wider">เลือกล็อตเดิมที่มี</label>
                        <CustomSelect 
                          placeholder="เลือกจากล็อตเดิม..."
                          value={adjustData.lotNo}
                          compact
                          fullWidth
                          onChange={val => {
                              const stock = inventoryData.find(i => i.productId === adjustItem?.productId && i.branchId === adjustData.branchId && i.lotNo === val);
                              setAdjustData({ 
                                  ...adjustData, 
                                  lotNo: val, 
                                  expireDate: stock?.expireDate || '',
                                  receiveDate: stock?.receiveDate || adjustData.receiveDate
                              });
                          }}
                          options={[
                              ...inventoryData
                                  .filter(i => i.productId === adjustItem?.productId && i.branchId === adjustData.branchId)
                                  .map(i => ({ value: i.lotNo, label: `${i.lotNo || 'N/A'} (เหลือ ${i.quantity})` }))
                          ]}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase tracking-wider">ระบุล็อตใหม่</label>
                        <input 
                          type="text" className={`${theme.input} !py-3 font-data uppercase text-sm`} 
                          value={adjustData.lotNo} 
                          onChange={e => {
                              const newLot = e.target.value.toUpperCase();
                              const stock = inventoryData.find(i => i.productId === adjustItem?.productId && i.branchId === adjustData.branchId && i.lotNo === newLot);
                              setAdjustData({
                                  ...adjustData, 
                                  lotNo: newLot, 
                                  expireDate: stock?.expireDate || adjustData.expireDate,
                                  receiveDate: stock?.receiveDate || adjustData.receiveDate
                              });
                          }} 
                          placeholder="พิมพ์ชื่อล็อตใหม่..." 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: วันที่และจำนวน */}
                <div className="p-6 bg-slate-50/30 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">วันที่สำคัญ</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">วันที่รับเข้าสินค้า</label>
                        <div className="relative group">
                          <input 
                            type="text" className={`${theme.input} !py-3 pr-10 font-data text-sm group-hover:border-sky-300 transition-colors`} 
                            value={adjustData.receiveDate} 
                            onChange={e => setAdjustData({...adjustData, receiveDate: e.target.value})} 
                            placeholder="วว/ดด/ปปปป" 
                          />
                          <button type="button" onClick={() => handleOpenCalendarForAdjust('receiveDate')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-500 transition-colors">
                            <CalendarIcon size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">วันหมดอายุของล็อต</label>
                        <div className="relative group">
                          <input 
                            type="text" className={`${theme.input} !py-3 pr-10 font-data text-sm group-hover:border-amber-300 transition-colors`} 
                            value={adjustData.expireDate} 
                            onChange={e => setAdjustData({...adjustData, expireDate: e.target.value})} 
                            placeholder="วว/ดด/ปปปป" 
                          />
                          <button type="button" onClick={() => handleOpenCalendarForAdjust('expireDate')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                            <CalendarIcon size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">การปรับปรุงจำนวน</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1.5">
                        <button 
                          type="button" 
                          onClick={() => setAdjustData({...adjustData, type: 'add'})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black kanit-text transition-all flex items-center justify-center gap-2 ${adjustData.type === 'add' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-white'}`}
                        >
                          <Plus size={18} /> รับเข้า
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setAdjustData({...adjustData, type: 'sub'})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black kanit-text transition-all flex items-center justify-center gap-2 ${adjustData.type === 'sub' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:bg-white'}`}
                        >
                          <Minus size={18} /> จ่ายออก
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">จำนวน <span className="text-rose-500">*</span></label>
                          <div className="relative">
                            <input 
                              required type="number" min="1" 
                              className={`${theme.input} !py-3.5 font-data text-2xl font-black text-center ${adjustData.type === 'add' ? 'text-emerald-600 border-emerald-100 focus:border-emerald-500' : 'text-rose-600 border-rose-100 focus:border-rose-500'}`}
                              value={adjustData.amount}
                              onChange={e => setAdjustData({...adjustData, amount: e.target.value})}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 kanit-text font-bold text-[10px] uppercase">Amount</div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">หมายเหตุ</label>
                          <input 
                            type="text" className={`${theme.input} !py-3.5 text-sm`}
                            placeholder="ระบุเหตุผล..."
                            value={adjustData.reason}
                            onChange={e => setAdjustData({...adjustData, reason: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
                <button type="button" onClick={closeAdjustModal} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold kanit-text hover:bg-slate-100 transition-all">ยกเลิก</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] py-4 bg-sky-500 text-white rounded-2xl font-black shadow-xl shadow-sky-500/30 hover:bg-sky-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 text-lg kanit-text">
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 size={24} />} บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Lot Modal */}
      {isLotModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isLotClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeLotModal}></div>
          <div className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isLotClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">ข้อมูลรายการแต่ละล็อต</h3>
                  <p className="text-xs text-slate-500 kanit-text truncate max-w-[200px]">{selectedLotItem?.product.name}</p>
                </div>
              </div>
              <button onClick={closeLotModal} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto custom-scrollbar max-h-[60vh]">
              {selectedLotItem && selectedLotItem.stocks && selectedLotItem.stocks.length > 0 ? (
                <div className="flex flex-col divide-y divide-slate-50">
                  {selectedLotItem.stocks.sort((a,b) => {
                     const parseD = (dStr) => {
                         if (!dStr || !dStr.includes('/')) return new Date(9999, 11, 31).getTime(); // ถ้าไม่มีวันหมดอายุให้ไปอยู่ล่างสุด
                         const p = dStr.split('/');
                         return new Date(parseInt(p[2], 10) - 543, parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
                     };
                     return parseD(a.expireDate) - parseD(b.expireDate);
                  }).map((s, si) => {
                     const branchName = branchesData.find(b => b.id === s.branchId)?.name || s.branchId;
                     // ตรวจสอบวันหมดอายุ
                     let expiryStatus = 'ok';
                     if (s.expireDate) {
                        const parts = s.expireDate.split('/');
                        if (parts.length === 3) {
                            const expDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                            const today = new Date();
                            const timeDiff = expDate.getTime() - today.getTime();
                            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                            if (daysDiff <= 0) expiryStatus = 'danger';
                            else if (daysDiff <= 90) expiryStatus = 'warning';
                        }
                     }
                     return (
                      <div key={si} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase border border-indigo-100">
                               {branchName}
                             </span>
                             {s.receiveDate && (
                                <span className="text-[10px] text-slate-400 font-medium kanit-text flex items-center gap-1">
                                   <Clock size={10} /> รับเข้า: {s.receiveDate}
                                </span>
                             )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ล็อต (LOT)</span>
                               <span className="text-sm font-black text-slate-700 font-data">{s.lotNo || '-'}</span>
                             </div>
                             <div className="w-px h-6 bg-slate-200"></div>
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันหมดอายุ (EXP)</span>
                               <span className={`text-sm font-black font-data flex items-center gap-1 ${expiryStatus === 'danger' ? 'text-rose-600' : expiryStatus === 'warning' ? 'text-amber-500' : 'text-slate-700'}`}>
                                  {s.expireDate || '-'}
                                  {expiryStatus === 'danger' && <AlertOctagon size={12} className="text-rose-500 animate-pulse" />}
                                  {expiryStatus === 'warning' && <AlertTriangle size={12} className="text-amber-500" />}
                               </span>
                             </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider kanit-text">คงเหลือ</span>
                          <span className="text-2xl font-black text-sky-600 font-data">{s.quantity}</span>
                        </div>
                      </div>
                     );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 kanit-text">ไม่มีข้อมูลล็อตสำหรับรายการนี้</div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={closeLotModal} className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-bold kanit-text transition-colors shadow-sm">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Log Modal */}
      {isLogModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isLogClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeLogModal}></div>
          <div className={`bg-white rounded-3xl w-full max-w-2xl max-h-[85dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isLogClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">ประวัติการเคลื่อนไหวสต็อก</h3>
                  <p className="text-xs text-slate-500 kanit-text truncate max-w-[250px]">{logProductInfo?.name}</p>
                </div>
              </div>
              <button onClick={closeLogModal} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/30">
              {selectedProductLogs.length > 0 ? (
                <div className="space-y-3">
                  {selectedProductLogs.map((log, idx) => (
                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-indigo-200 transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            log.type === 'SALE' ? 'bg-amber-50 text-amber-500' :
                            log.type === 'IN' ? 'bg-emerald-50 text-emerald-500' :
                            log.type === 'OUT' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'
                        }`}>
                            {log.type === 'SALE' ? <Calculator size={18} /> :
                             log.type === 'IN' ? <Plus size={18} /> :
                             log.type === 'OUT' ? <Minus size={18} /> : <Settings size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                log.type === 'SALE' ? 'bg-amber-100 text-amber-600' :
                                log.type === 'IN' ? 'bg-emerald-100 text-emerald-600' :
                                log.type === 'OUT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                             }`}>
                                {log.type === 'SALE' ? 'ขายสินค้า' :
                                 log.type === 'IN' ? 'รับเข้า' :
                                 log.type === 'OUT' ? 'จ่ายออก' : 'ปรับปรุง'}
                             </span>
                             <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[9px] font-black uppercase border border-indigo-100">
                                {branches.find(b => b.id === log.branchId)?.name || log.branchId}
                             </span>
                             <span className="text-[10px] text-slate-400 font-data">{formatDateTime(log.timestamp)}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 kanit-text mt-1">{log.reason}</p>
                          {(log.lotNo || log.expireDate) && (
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {log.lotNo && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase border border-slate-200">
                                  LOT: {log.lotNo}
                                </span>
                              )}
                              {log.expireDate && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase border border-amber-100">
                                  EXP: {log.expireDate}
                                </span>
                              )}
                            </div>
                          )}
                          {log.note && <p className="text-[11px] text-slate-400 kanit-text italic mt-0.5">{log.note}</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-black ${
                                log.type === 'IN' ? 'text-emerald-500' : 
                                log.type === 'MANUAL' ? 'text-sky-500' : 'text-rose-500'
                            }`}>
                                {log.type === 'IN' || (log.type === 'MANUAL' && log.amount > 0) ? '+' : '-'}{log.amount}
                            </span>
                            <span className="text-[10px] text-slate-400 kanit-text font-medium">รายการ</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 kanit-text">คงเหลือ: <span className="text-slate-600 font-data">{log.balance}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <History size={48} className="opacity-10 mb-3" />
                  <p className="kanit-text text-sm italic">ยังไม่มีประวัติความเคลื่อนไหว</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
                <button onClick={closeLogModal} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text hover:bg-slate-100 transition-colors shadow-sm">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const FinancePage = ({ 
  currentBranch, 
  financeData = [], 
  setFinanceData, 
  posHistoryData = [], 
  branchesData = [], 
  isGlobalLoading, 
  callAppScript, 
  showToast, 
  setPosHistoryData,
  patientsData = [],
  posProducts = []
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [filterBranch, setFilterBranch] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const headerRef = useRef(null);

  // POS Edit States
  const [isPosEditModalOpen, setIsPosEditModalOpen] = useState(false);
  const [posEditForm, setPosEditForm] = useState(null);
  const [isSavingPos, setIsSavingPos] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);

  // Detail Modal States
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const sweetAlert = useModal();
  const [alertConfig, setAlertConfig] = useState({ type: '', title: '', text: '', onConfirm: null });

  const calendarModal = useModal();
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('days');
  const [yearPageStart, setYearPageStart] = useState(0);
  
  // --- เพิ่ม State และ Ref สำหรับปฏิทินแบบกำหนดเอง (เพิ่มวินาทีเข้าไปด้วย) ---
  const [calTime, setCalTime] = useState({ h: '09', m: '00', s: '00' });
  const dateWrapperRef = useRef(null);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // ฟังก์ชันเปิดและตั้งค่าให้ปฏิทินแสดงผลตรงกับวันที่ที่กรอกไว้
  const handleOpenCalendar = () => {
    const dtStr = formData.date;
    const now = new Date();
    let d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let h = String(now.getHours()).padStart(2, '0'), min = String(now.getMinutes()).padStart(2, '0'), sec = String(now.getSeconds()).padStart(2, '0');
    
    if (dtStr) {
      const parts = dtStr.split(' ');
      if (parts.length >= 2) {
          const dateParts = parts[0].split('/');
          if(dateParts.length === 3) {
              d = parseInt(dateParts[0], 10);
              m = parseInt(dateParts[1], 10) - 1;
              y = parseInt(dateParts[2], 10) - 543;
          }
          const timeParts = parts[1].replace('น.', '').trim().split(':');
          if(timeParts.length >= 2) {
              h = timeParts[0];
              min = timeParts[1];
              if(timeParts.length >= 3) sec = timeParts[2];
          }
      }
    }
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) setCalDate(new Date(y, m, d));
    else setCalDate(now);
    
    setCalTime({ h, m: min, s: sec });
    setCalView('days');
    calendarModal.open();
  };

  useEffect(() => {
    if (calView === 'years') setYearPageStart(Math.floor((calDate.getFullYear() + 543) / 12) * 12);
  }, [calView, calDate]);
  // ----------------------------------------------

  const [formData, setFormData] = useState({
    id: '',
    date: '', // Will be set on open
    type: 'income',
    category: '',
    amount: '',
    method: 'cash',
    reference: '',
    note: '',
    branchId: currentBranch || 'all'
  });

  const handleOpenAdd = () => {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear() + 543;
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      
      setFormData({
        id: '',
        date: `${d}/${m}/${y} ${hh}:${mm}:${ss}`,
        type: 'income',
        category: '',
        amount: '',
        method: 'cash',
        reference: '',
        note: '',
        branchId: currentBranch || 'all'
      });
      setIsModalOpen(true);
  };

  // --- POS Editing Helper Functions ---
  const handleSavePosEdit = async () => {
    if (!posEditForm) return;
    setIsSavingPos(true);
    try {
      const calculatedAmount = posEditForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const updatedTx = {
        ...posEditForm,
        // อัปเดตทุกฟิลด์ที่อาจถูกนำไปใช้คำนวณยอดรวมในหน้าการเงิน (allTransactions)
        amount: calculatedAmount,
        total: calculatedAmount,
        netTotal: calculatedAmount,
        grandTotal: calculatedAmount,
        items: posEditForm.items,
        // บันทึกชื่อในรูปแบบ HN - Name ลงในฐานข้อมูลเลยตามคำขอ
        patientName: patientSearchQuery 
      };
      
      const res = await callAppScript('SAVE_DATA', 'POS_Transactions', updatedTx);
      if (res.status === 'success') {
        // อัปเดต posHistoryData ใน State (เพื่อให้หน้าจอเปลี่ยนตามทันที)
        setPosHistoryData(prev => prev.map(p => p.id === updatedTx.id ? updatedTx : p));
        showToast('แก้ไขรายการ POS สำเร็จ', 'success');
        setIsPosEditModalOpen(false);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    } finally {
      setIsSavingPos(false);
    }
  };

  const handlePosItemChange = (index, field, value) => {
    setPosEditForm(prev => {
      const newItems = [...prev.items];
      if (field === 'id') {
        const product = posProducts.find(p => p.id === value);
        if (product) {
          newItems[index] = { 
            ...newItems[index], 
            id: product.id, 
            name: product.name, 
            price: product.price,
            total: product.price * newItems[index].quantity
          };
        }
      } else {
        newItems[index] = { 
          ...newItems[index], 
          [field]: value,
          total: field === 'price' ? value * newItems[index].quantity : 
                 field === 'quantity' ? newItems[index].price * value : 
                 newItems[index].total
        };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleRemovePosItem = (index) => {
    setPosEditForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const handleAddPosItem = () => {
    setPosEditForm(prev => {
      const newItem = { id: '', name: '', price: 0, quantity: 1, total: 0 };
      return { ...prev, items: [...prev.items, newItem] };
    });
  };

  const searchPatients = (query) => {
    setPatientSearchQuery(query);
    if (query.length >= 2) {
      setShowPatientResults(true);
    } else {
      setShowPatientResults(false);
    }
  };

  const selectPatient = (patient) => {
    const hnStr = patient.hn || patient.id;
    const nameStr = `${patient.firstName} ${patient.lastName}`.trim();
    const combinedName = `${hnStr} - ${nameStr}`;
    setPosEditForm(prev => ({
      ...prev,
      patientId: hnStr,
      patientName: combinedName
    }));
    setPatientSearchQuery(combinedName);
    setShowPatientResults(false);
  };

  const filteredPatients = useMemo(() => {
    if (patientSearchQuery.length < 2) return [];
    const q = patientSearchQuery.toLowerCase();
    return patientsData.filter(p => 
      (p.hn && p.hn.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q)) ||
      (p.firstName && p.firstName.toLowerCase().includes(q)) ||
      (p.lastName && p.lastName.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    ).slice(0, 10);
  }, [patientsData, patientSearchQuery]);

  const allTransactions = useMemo(() => {
    const posTx = posHistoryData.map(tx => ({
      id: tx.id || tx.receiptNo || Math.random().toString(),
      date: tx.datetime || tx.timestamp || tx.createdAt || new Date().toISOString(),
      type: 'income',
      amount: parseFloat(tx.total || tx.netTotal || tx.grandTotal || tx.amount || 0),
      method: tx.paymentMethod || 'cash',
      category: 'รายได้จาก/ขาย POS',
      note: tx.patientName ? `${tx.patientName}` : 'ทั่วไป (ไม่ระบุ)',
      status: tx.status || 'completed',
      isAuto: true,
      branchId: tx.branchId || 'all',
      rawTx: tx
    }));

    return [...posTx, ...financeData].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [posHistoryData, financeData]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const matchSearch = tx.note.includes(search) || tx.category.includes(search) || tx.id.includes(search);
      let matchType = true;
      if (filterType === 'income') matchType = tx.type === 'income';
      else if (filterType === 'expense') matchType = tx.type === 'expense';
      else if (filterType === 'pos') matchType = tx.isAuto === true;
      else if (filterType === 'manual') matchType = !tx.isAuto;

      const matchBranch = filterBranch === 'all' || tx.branchId === filterBranch || tx.branchId === 'all';

      return matchSearch && matchType && matchBranch;
    });
  }, [allTransactions, search, filterType, filterBranch]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') totalIncome += tx.amount;
      if (tx.type === 'expense') totalExpense += tx.amount;
    });
    
    // คำนวณเปอร์เซ็นต์ (ป้องกัน error หารด้วย 0 กรณีไม่มีรายรับ)
    const costPercent = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
    const marginPercent = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    return {
      balance: totalIncome - totalExpense,
      income: totalIncome,
      expense: totalExpense,
      transactionsCount: filteredTransactions.length,
      costPercent,
      marginPercent
    };
  }, [filteredTransactions]);

  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = (e) => {
      if (headerRef.current) {
          if (e.target.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
          else headerRef.current.classList.remove('is-scrolled');
      }
    };

    setTimeout(() => {
        if (mainElement && headerRef.current) {
            if (mainElement.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
            else headerRef.current.classList.remove('is-scrolled');
        }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Set default branch when opening modal
  useEffect(() => {
     if(isModalOpen) {
         setFormData(prev => ({ ...prev, branchId: currentBranch || 'all' }));
     }
  }, [isModalOpen, currentBranch]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch { return dateStr; }
  };

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('th-TH');
    } catch { return ''; }
  };

  const getDynamicTextClass = (amountStr) => {
    const len = amountStr.length;
    // ปรับลดขนาดลงตามความยาวของข้อความ ป้องกันการล้นและบังคับให้อยู่บรรทัดเดียว
    if (len >= 18) return 'text-lg sm:text-xl lg:text-lg xl:text-xl tracking-tighter';
    if (len >= 14) return 'text-xl sm:text-2xl lg:text-xl xl:text-2xl tracking-tighter';
    return 'text-2xl sm:text-3xl lg:text-2xl xl:text-3xl tracking-tight';
  };

  const handleEditTransaction = (tx) => {
      if (tx.isAuto) {
        // ค้นหาต้นฉบับจาก posHistoryData โดยใช้ tx.id
        const originalTx = posHistoryData.find(p => p.id === tx.id);
        if (originalTx) {
          setPosEditForm({
            ...originalTx,
            items: originalTx.items ? [...originalTx.items] : []
          });
          setPatientSearchQuery(originalTx.patientName || '');
          setIsPosEditModalOpen(true);
        } else {
          showToast('ไม่พบข้อมูลต้นฉบับจาก POS', 'warning');
        }
        return;
      }

      // แปลง ISO Date กลับเป็น format ไทย เพื่อให้ปฏิทินแบบกำหนดเองอ่านค่าได้ถูกต้อง
      let editDateStr = '';
      if (tx.date && tx.date.includes('/')) {
          editDateStr = tx.date;
      } else if (tx.date) {
          const dObj = new Date(tx.date);
          if (!isNaN(dObj.getTime())) {
              const d = String(dObj.getDate()).padStart(2, '0');
              const m = String(dObj.getMonth() + 1).padStart(2, '0');
              const y = dObj.getFullYear() + 543;
              const hh = String(dObj.getHours()).padStart(2, '0');
              const mm = String(dObj.getMinutes()).padStart(2, '0');
              const ss = String(dObj.getSeconds()).padStart(2, '0');
              editDateStr = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
          } else {
              editDateStr = tx.date;
          }
      }

      setFormData({
         id: tx.id,
         date: editDateStr,
         type: tx.type,
         category: tx.category,
         amount: tx.amount,
         method: tx.method,
         reference: tx.reference || '',
         note: tx.note || '',
         branchId: tx.branchId || currentBranch || 'all'
      });
      setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (tx) => {
      if (tx.isAuto) {
        // ถ้าเป็น POS ให้เปิด Modal แก้ไขขึ้นมาเพื่อให้เลือกยกเลิกรายการแทน หรือจัดการผ่าน Modal เดียวกัน
        handleEditTransaction(tx);
        return;
      }
      setAlertConfig({
        type: 'warning',
        title: 'ยืนยันการลบรายการ?',
        text: `คุณต้องการลบรายการ "${tx.category}" จำนวน ${formatCurrency(tx.amount)} ใช่หรือไม่?`,
        onConfirm: async () => {
            sweetAlert.close();
            setIsProcessing(true);
            try {
                const sheetName = tx.type === 'income' ? 'Finance_Revenue' : 'Finance_Expenses';
                await callAppScript('DELETE_DATA', sheetName, { id: tx.id });
                setFinanceData(prev => prev.filter(item => item.id !== tx.id));
                showToast('ลบรายการสำเร็จ', 'danger');
            } catch (err) {
                showToast('เกิดข้อผิดพลาดในการลบรายการ', 'danger');
            } finally {
                setIsProcessing(false);
            }
        }
      });
      sweetAlert.open();
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    setIsProcessing(true);
    const isEdit = !!formData.id;

    // --- แปลงวันที่แบบไทยกลับเป็น ISO ก่อนบันทึก ---
    const convertThaiToISO = (thaiDateTimeStr) => {
        if (!thaiDateTimeStr) return new Date().toISOString();
        if (thaiDateTimeStr.includes('T')) return thaiDateTimeStr;
        try {
            const parts = thaiDateTimeStr.split(' ');
            const dateParts = parts[0].split('/');
            if (dateParts.length !== 3) return new Date().toISOString();
            const d = parseInt(dateParts[0], 10);
            const m = parseInt(dateParts[1], 10) - 1;
            let y = parseInt(dateParts[2], 10);
            if (y > 2500) y -= 543;
            let h = 0, min = 0, sec = 0;
            if (parts[1]) {
                const timeParts = parts[1].replace('น.', '').trim().split(':');
                if (timeParts.length >= 2) {
                    h = parseInt(timeParts[0], 10);
                    min = parseInt(timeParts[1], 10);
                    if (timeParts.length >= 3) sec = parseInt(timeParts[2], 10);
                }
            }
            const localDate = new Date(y, m, d, h, min, sec);
            return localDate.toISOString();
        } catch(e) { return new Date().toISOString(); }
    };
    
    const isoDate = convertThaiToISO(formData.date);
    // --------------------------------------------------

    const newTx = {
      id: isEdit ? formData.id : `${formData.type === 'income' ? 'INC' : 'EXP'}-${Date.now()}`,
      date: isoDate, // บันทึกเป็น ISO เสมอเพื่อให้ระบบเรียงลำดับทำงานได้
      type: formData.type,
      amount: parseFloat(formData.amount),
      method: formData.method,
      category: formData.category,
      note: formData.note,
      status: 'completed',
      isAuto: false,
      branchId: formData.branchId
    };

    try {
      const sheetName = newTx.type === 'income' ? 'Finance_Revenue' : 'Finance_Expenses';
      await callAppScript('SAVE_DATA', sheetName, newTx);
      
      if (isEdit) {
         setFinanceData(prev => prev.map(item => item.id === newTx.id ? newTx : item));
      } else {
         setFinanceData(prev => [newTx, ...prev]);
      }

      showToast(isEdit ? 'แก้ไขรายการสำเร็จ' : 'บันทึกรายการสำเร็จ', 'success');
      setIsModalOpen(false);
      setFormData({
        id: '',
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: '',
        amount: '',
        method: 'cash',
        reference: '',
        note: '',
        branchId: currentBranch || 'all'
      });
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailModal = (tx) => {
      setSelectedTxn(tx);
      setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
      setIsDetailModalOpen(false);
      setSelectedTxn(null);
  };

  return (
    <div className="fade-in pb-10 w-full">
      {/* Header */}
      <div ref={headerRef} className="sticky top-0 z-30 w-full pointer-events-none">
        <div className="w-full pointer-events-auto sticky-header-bg">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight sticky-header-title kanit-text">ระบบการเงิน (Finance)</h1>
              <p className="text-slate-500 sticky-header-desc kanit-text">ภาพรวมรายรับรายจ่าย และระบบเชื่อมโยงอัตโนมัติ</p>
            </div>
            <button type="button" onClick={handleOpenAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} sticky-header-btn px-4 py-2 sm:px-6 sm:py-3`}>
              <Plus size={20} /> <span className="hidden sm:inline kanit-text">เพิ่มรายการ</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4">
        
        {/* Stats Section */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            {/* Card 1: รายรับ */}
            <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-3xl border border-emerald-100/80 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-3 z-10 mb-2">
                <div className="w-10 h-10 bg-emerald-100/80 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingUp size={20} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-emerald-700 kanit-text tracking-wide">รายรับ</h3>
              </div>
              <div className="z-10 w-full overflow-hidden">
                {isGlobalLoading ? <Skeleton width="150px" height="32px" className="mb-1" /> : <h2 className={`font-black text-emerald-800 font-data mb-1 whitespace-nowrap ${getDynamicTextClass(formatCurrency(stats.income))}`} title={formatCurrency(stats.income)}>{formatCurrency(stats.income)}</h2>}
              </div>
              {!isGlobalLoading && (
                <div className="text-[10px] sm:text-xs text-emerald-600/80 font-medium kanit-text z-10 mt-1">
                  จาก {stats.transactionsCount || 0} รายการ
                </div>
              )}
            </div>
            
            {/* Card 2: รายจ่าย */}
            <div className="bg-rose-50/70 p-4 sm:p-5 rounded-3xl border border-rose-100/80 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md hover:border-rose-200 transition-all">
              <div className="flex items-center gap-3 z-10 mb-2">
                <div className="w-10 h-10 bg-rose-100/80 text-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingDown size={20} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-rose-700 kanit-text tracking-wide">รายจ่าย</h3>
              </div>
              <div className="z-10 w-full overflow-hidden">
                {isGlobalLoading ? <Skeleton width="150px" height="32px" className="mb-1" /> : <h2 className={`font-black text-rose-800 font-data mb-1 whitespace-nowrap ${getDynamicTextClass(formatCurrency(stats.expense))}`} title={formatCurrency(stats.expense)}>{formatCurrency(stats.expense)}</h2>}
              </div>
              {!isGlobalLoading && (
                <div className="text-[10px] sm:text-xs text-rose-600/80 font-medium kanit-text z-10 mt-1">
                  Cost: {Number(stats.costPercent || 0).toFixed(2)}%
                </div>
              )}
            </div>

            {/* Card 3: กำไรสุทธิ */}
            <div className="bg-sky-50/70 p-4 sm:p-5 rounded-3xl border border-sky-100/80 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md hover:border-sky-200 transition-all">
              <div className="flex items-center gap-3 z-10 mb-2">
                <div className="w-10 h-10 bg-sky-100/80 text-sky-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Banknote size={20} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-sky-700 kanit-text tracking-wide">กำไรสุทธิ</h3>
              </div>
              <div className="z-10 w-full overflow-hidden">
                {isGlobalLoading ? <Skeleton width="150px" height="32px" className="mb-1" /> : <h2 className={`font-black font-data mb-1 whitespace-nowrap ${stats.balance < 0 ? 'text-rose-600' : 'text-sky-800'} ${getDynamicTextClass(formatCurrency(stats.balance))}`} title={formatCurrency(stats.balance)}>{formatCurrency(stats.balance)}</h2>}
              </div>
              {!isGlobalLoading && (
                <div className="text-[10px] sm:text-xs text-sky-600/80 font-medium kanit-text z-10 mt-1">
                  Margin: {Number(stats.marginPercent || 0).toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-100/50">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="ค้นหารายการ, หมวดหมู่, หรือ Note..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all font-data"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
             <select 
               value={filterType} 
               onChange={(e) => setFilterType(e.target.value)} 
               className="px-3 py-2 rounded-lg text-sm font-semibold kanit-text bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-600 cursor-pointer"
             >
               <option value="all">ทั้งหมด</option>
               <option value="income">รายรับ</option>
               <option value="expense">รายจ่าย</option>
               <option value="pos">POS</option>
               <option value="manual">Manual</option>
             </select>
             
             <select 
               value={filterBranch} 
               onChange={(e) => setFilterBranch(e.target.value)} 
               className="px-3 py-2 rounded-lg text-sm font-semibold kanit-text bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-600 cursor-pointer"
             >
               <option value="all">ทุกสาขา</option>
               {branchesData && branchesData.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm">
                  <th className="p-4 font-medium text-center w-[120px] kanit-text">วันที่/เวลา</th>
                  <th className="p-4 font-medium kanit-text w-[120px]">เลขที่บิล</th>
                  <th className="p-4 font-medium kanit-text">รายละเอียด</th>
                  <th className="p-4 font-medium kanit-text">ประเภท/หมวดหมู่</th>
                  <th className="p-4 font-medium text-center kanit-text w-[120px]">ช่องทาง</th>
                  <th className="p-4 font-medium text-right w-[150px] kanit-text">จำนวนเงิน</th>
                  <th className="p-4 font-medium text-center w-[100px] kanit-text">สถานะ</th>
                  <th className="p-4 font-medium text-center w-[100px] kanit-text">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isGlobalLoading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`}>
                      <td className="p-4"><Skeleton width="80px" height="16px" className="mx-auto mb-1" /><Skeleton width="60px" height="12px" className="mx-auto" /></td>
                      <td className="p-4"><Skeleton width="80px" height="16px" /></td>
                      <td className="p-4"><Skeleton width="150px" height="16px" /></td>
                      <td className="p-4"><Skeleton width="120px" height="16px"/></td>
                      <td className="p-4"><Skeleton width="60px" height="24px" rounded="rounded-full" className="mx-auto" /></td>
                      <td className="p-4 text-right"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                      <td className="p-4"><Skeleton width="60px" height="24px" rounded="rounded-full" className="mx-auto" /></td>
                      <td className="p-4"><div className="flex gap-2 justify-center"><Skeleton width="24px" height="24px" rounded="rounded-lg"/><Skeleton width="24px" height="24px" rounded="rounded-lg"/></div></td>
                    </tr>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx, i) => (
                    <tr key={i} onClick={() => openDetailModal(tx)} className="hover:bg-sky-50/50 transition-colors group cursor-pointer">
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-data text-slate-800 kanit-text font-medium">{formatDate(tx.date)}</span>
                          <span className="text-xs font-data text-slate-500 mt-0.5">{formatTime(tx.date)} น.</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-bold text-sky-600 kanit-text">{tx.id}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-700 font-data line-clamp-2 leading-tight" title={tx.note}>{tx.note}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start justify-center">
                          {!tx.isAuto && <span className="text-sm font-bold text-slate-800 kanit-text">{tx.category}</span>}
                          {tx.isAuto && <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-md w-fit kanit-text border border-sky-100">ระบบ POS</span>}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                         <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-data uppercase tracking-wider flex items-center justify-center gap-1.5 w-fit mx-auto border border-slate-200 shadow-sm">
                           {tx.method === 'cash' ? <><Banknote size={12}/> เงินสด</> : tx.method === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : tx.method === 'credit_card' || tx.method === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : tx.method}
                         </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-base font-bold font-data ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold kanit-text ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                           <CheckCircle2 size={12} /> {tx.status === 'completed' ? 'สำเร็จ' : tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                         <div className="flex items-center justify-center gap-1">
                             <button onClick={() => handleEditTransaction(tx)} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไข">
                                <Pencil size={16}/>
                             </button>
                             <button onClick={() => handleDeleteTransaction(tx)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ">
                                <Trash2 size={16}/>
                             </button>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-slate-400">
                      <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="kanit-text font-medium text-lg">ไม่มีรายการในระบบ</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedTxn && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm fade-in">
           <div className="bg-white rounded-[1.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden modal-animate-in">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                 <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${selectedTxn.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                       {selectedTxn.isAuto ? <History size={20} className="text-sky-500" /> : <Receipt size={20} />}
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">{selectedTxn.isAuto ? 'ประวัติการทำรายการ (POS)' : 'รายละเอียดรายการ'}</h3>
                       <p className="text-xs text-slate-500 kanit-text mt-0.5">{selectedTxn.id}</p>
                    </div>
                 </div>
                 <button onClick={closeDetailModal} className="p-2 text-slate-400 hover:bg-white hover:shadow-sm rounded-full transition-all"><X size={20} /></button>
              </div>

              {selectedTxn.isAuto ? (
                 <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-white">
                      {/* Info Grid for POS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                              <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><User size={12}/></div>
                                  <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">ข้อมูลลูกค้า & วันที่</p>
                              </div>
                              <div className="pl-1">
                                  <p className="font-bold text-slate-800 text-sm sm:text-base kanit-text">{selectedTxn.rawTx.patientName || 'ลูกค้าทั่วไป (ไม่ระบุ)'}</p>
                                  <p className="text-xs text-slate-500 font-data mt-1.5 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {formatDate(selectedTxn.date)} {formatTime(selectedTxn.date)} น.</p>
                              </div>
                          </div>
                          <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                              <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><CreditCard size={12}/></div>
                                  <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">สถานะ & การชำระเงิน</p>
                              </div>
                              <div className="flex flex-col gap-2 pl-1">
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500 w-16">สถานะ:</span>
                                      <span className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold kanit-text ${selectedTxn.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : selectedTxn.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                          {selectedTxn.status === 'completed' ? 'สำเร็จ' : selectedTxn.status === 'cancelled' ? 'ยกเลิก (Void)' : selectedTxn.status}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500 w-16">ช่องทาง:</span>
                                      <span className="px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-600 kanit-text flex items-center gap-1.5 shadow-sm">
                                          {selectedTxn.method === 'cash' ? <><Banknote size={12}/> เงินสด</> : selectedTxn.method === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : selectedTxn.method === 'credit' || selectedTxn.method === 'credit_card' ? <><CreditCard size={12}/> บัตรเครดิต</> : selectedTxn.method}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Items List */}
                      <h5 className="font-bold text-slate-700 kanit-text mb-3 flex items-center gap-2"><ShoppingCart size={16} className="text-sky-500" /> รายการสินค้า ({selectedTxn.rawTx.items?.length || 0})</h5>
                      <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 flex-1 min-h-[200px]">
                          {/* Desktop Table */}
                          <div className="hidden sm:block overflow-x-auto h-full">
                              <table className="w-full text-left border-collapse min-w-[500px]">
                                  <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium kanit-text sticky top-0">
                                          <th className="p-3 w-12 text-center">#</th>
                                          <th className="p-3">รายการสินค้า / บริการ</th>
                                          <th className="p-3 text-center w-24">จำนวน</th>
                                          <th className="p-3 text-right w-32">ราคา/หน่วย</th>
                                          <th className="p-3 text-right w-32">รวม (บาท)</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {(selectedTxn.rawTx.items || []).map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-data text-sm">
                                              <td className="p-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                                              <td className="p-3 text-slate-700 font-bold kanit-text">{item.name}</td>
                                              <td className="p-3 text-center font-semibold">{item.quantity}</td>
                                              <td className="p-3 text-right text-slate-500">{formatCurrency(item.price)}</td>
                                              <td className="p-3 text-right font-bold text-sky-600">{formatCurrency(item.total)}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          {/* Mobile List */}
                          <div className="sm:hidden flex flex-col divide-y divide-slate-50 overflow-y-auto max-h-[300px] custom-scrollbar bg-slate-50/30">
                              {(selectedTxn.rawTx.items || []).map((item, idx) => (
                                  <div key={idx} className="p-3 flex flex-col gap-1 bg-white">
                                      <div className="flex justify-between items-start gap-2">
                                          <div className="font-bold text-slate-800 text-sm kanit-text leading-tight">{item.name}</div>
                                          <div className="font-bold text-sky-600 text-sm font-data shrink-0">{formatCurrency(item.total)}</div>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-data text-slate-500 mt-1">
                                          <div>จำนวน {item.quantity} รายการ</div>
                                          <div>{formatCurrency(item.price)} / หน่วย</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Summary */}
                      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shrink-0">
                          <div className="w-full sm:w-auto">
                              <div className="text-[10px] sm:text-xs text-slate-400 kanit-text mb-1 flex items-center gap-1.5"><FileText size={12}/> รหัสอ้างอิง: {selectedTxn.id}</div>
                          </div>
                          <div className="w-full sm:w-72 space-y-2 text-sm font-data">
                              <div className="flex justify-between text-slate-600"><span className="kanit-text">รวมเป็นเงิน</span><span className="font-semibold">{formatCurrency(selectedTxn.rawTx.subtotal)}</span></div>
                              {selectedTxn.rawTx.discountAmount > 0 && (
                                  <div className="flex justify-between text-rose-500"><span className="kanit-text">ส่วนลด {selectedTxn.rawTx.discountType === 'percent' ? `(${selectedTxn.rawTx.discountValue}%)` : ''}</span><span className="font-semibold">- {formatCurrency(selectedTxn.rawTx.discountAmount)}</span></div>
                              )}
                              {selectedTxn.rawTx.vatAmount > 0 && (
                                  <div className="flex justify-between text-slate-600"><span className="kanit-text">ภาษี ({selectedTxn.rawTx.taxMode === 'include' ? 'รวม' : 'แยก'})</span><span className="font-semibold">{formatCurrency(selectedTxn.rawTx.vatAmount)}</span></div>
                              )}
                              <div className="h-px bg-slate-200/60 my-2"></div>
                              <div className="flex justify-between items-end text-xl sm:text-2xl font-black text-sky-600 kanit-text"><span className="text-base sm:text-lg">ยอดสุทธิ</span><span className="font-data tracking-tight">{formatCurrency(selectedTxn.rawTx.grandTotal)}</span></div>
                          </div>
                      </div>
                 </div>
              ) : (
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl border bg-white border-slate-100 shadow-sm">
                          <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider kanit-text">วันที่และเวลา</span>
                              <span className="text-sm font-bold text-slate-800 font-data flex items-center gap-1.5"><Clock size={14} className="text-sky-500"/> {formatDate(selectedTxn.date)} {formatTime(selectedTxn.date)} น.</span>
                          </div>
                      </div>
                      <div className="p-4 rounded-xl border bg-white border-slate-100 shadow-sm">
                          <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider kanit-text">สาขา</span>
                              <span className="text-sm font-bold text-slate-800 kanit-text">
                                  {selectedTxn.branchId === 'all' ? 'ทุกสาขา (ส่วนกลาง)' : branchesData.find(b => b.id === selectedTxn.branchId)?.name || selectedTxn.branchId}
                              </span>
                          </div>
                      </div>
                      <div className="md:col-span-2 p-4 rounded-xl border bg-white border-slate-100 shadow-sm">
                          <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider kanit-text">รายละเอียด / หมายเหตุ</span>
                              <span className="text-sm font-medium text-slate-800 kanit-text">{selectedTxn.note || '-'}</span>
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col items-end">
                      <div className="w-full sm:w-72 space-y-2 text-sm font-data">
                          <div className="flex justify-between items-end text-xl sm:text-2xl font-black text-sky-600 kanit-text"><span className="text-base sm:text-lg">ยอดรวมสุทธิ</span><span className="font-data tracking-tight">{formatCurrency(selectedTxn.amount)}</span></div>
                      </div>
                  </div>
                </div>
              )}

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={closeDetailModal} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors kanit-text shadow-sm">ปิดหน้าต่าง</button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* Add Manual Transaction Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm fade-in">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden modal-animate-in">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
                       <Banknote size={20} />
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">เพิ่มรายการ</h3>
                       <p className="text-xs text-slate-500 kanit-text mt-0.5">บันทึกรายรับหรือรายจ่ายแบบกำหนดเอง</p>
                    </div>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:shadow-sm rounded-full transition-all"><X size={20} /></button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                 <form id="finance-form" onSubmit={handleSaveTransaction} className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-3 mb-2">
                       <div onClick={() => setFormData({...formData, type: 'income'})} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formData.type === 'income' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}><TrendingUp size={20} /></div>
                          <span className={`font-bold kanit-text ${formData.type === 'income' ? 'text-emerald-700' : 'text-slate-500'}`}>รายรับ</span>
                       </div>
                       <div onClick={() => setFormData({...formData, type: 'expense'})} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formData.type === 'expense' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-slate-100 text-slate-400'}`}><TrendingDown size={20} /></div>
                          <span className={`font-bold kanit-text ${formData.type === 'expense' ? 'text-rose-700' : 'text-slate-500'}`}>รายจ่าย</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">เลขที่รายการ</label>
                          <input type="text" value={formData.id || `${formData.type === 'income' ? 'INC' : 'EXP'}-รอการบันทึก`} disabled className={theme.input + " bg-slate-100 text-slate-500 font-data cursor-not-allowed"} />
                       </div>
                       <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">วันที่ทำรายการ <span className="text-rose-500">*</span></label>
                          <div ref={dateWrapperRef} className="relative group">
                             <input required type="text" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={theme.input + " font-data pr-12"} placeholder="DD/MM/YYYY HH:mm:ss" />
                             <button type="button" onClick={handleOpenCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>
                          </div>
                       </div>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">สาขา <span className="text-rose-500">*</span></label>
                       <select value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} className={theme.input + " font-data appearance-none cursor-pointer"}>
                          <option value="all">ทุกสาขา (ส่วนกลาง)</option>
                          {branchesData && branchesData.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                       </select>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">หมวดหมู่ <span className="text-rose-500">*</span></label>
                       <input required type="text" placeholder="เช่น ค่าเช่า, ค่าน้ำไฟ, รายได้พิเศษ" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={theme.input + " font-data"} />
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">จำนวนเงิน (บาท) <span className="text-rose-500">*</span></label>
                       <div className="relative">
                          <input required type="number" min="0" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className={theme.input + " font-data pr-12 text-lg font-bold"} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold kanit-text">฿</span>
                       </div>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">ช่องทางการชำระ <span className="text-rose-500">*</span></label>
                       <select value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})} className={theme.input + " font-data appearance-none cursor-pointer"}>
                          <option value="cash">เงินสด</option>
                          <option value="transfer">โอนเงินเข้าบัญชี</option>
                          <option value="credit_card">บัตรเครดิต</option>
                          <option value="other">อื่นๆ</option>
                       </select>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-slate-600 mb-1.5 kanit-text">บันทึกเพิ่มเติม</label>
                       <textarea rows="2" placeholder="รายละเอียดเพิ่มเติม..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className={theme.input + " font-data resize-none"}></textarea>
                    </div>

                 </form>
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm kanit-text">ยกเลิก</button>
                 <button type="submit" form="finance-form" disabled={isProcessing} className="px-6 py-2.5 rounded-xl font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-md shadow-sky-500/20 kanit-text flex items-center gap-2">
                    {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={18} />} บันทึกรายการ
                 </button>
              </div>
              </div>
              </div>,
              document.body
              )}

      {/* --- POS Edit Modal Portal --- */}
      {isPosEditModalOpen && posEditForm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md fade-in">
          <div className="absolute inset-0" onClick={() => setIsPosEditModalOpen(false)}></div>
          <div className="relative z-[210] w-full max-w-2xl bg-white rounded-[2rem] border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden modal-animate-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600 shadow-sm">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 kanit-text">แก้ไขรายการขาย (POS)</h3>
                  <p className="text-xs text-slate-500 font-data uppercase tracking-wider">{posEditForm.id}</p>
                </div>
              </div>
              <button onClick={() => setIsPosEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-6">
              {/* Section 1: Customer Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-sky-500 shadow-sm border border-sky-100">
                    <User size={18} />
                  </div>
                  <h4 className="font-bold text-slate-700 kanit-text">ข้อมูลลูกค้า</h4>
                </div>
                <div className="relative">
                  <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">ค้นหาลูกค้า (HN, ชื่อ, เบอร์โทร)</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={patientSearchQuery} 
                      onChange={(e) => searchPatients(e.target.value)}
                      onFocus={() => patientSearchQuery.length >= 2 && setShowPatientResults(true)}
                      onBlur={() => setTimeout(() => setShowPatientResults(false), 200)}
                      placeholder="พิมพ์เพื่อค้นหาลูกค้า..."
                      className="w-full px-4 py-3 pl-11 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                    
                    {/* Search Results Dropdown - Matching POS Style */}
                    {showPatientResults && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[220] overflow-hidden modal-animate-in">
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                          {filteredPatients
                          .sort((a, b) => {
                              const valA = getPatientLastVisitStr(a);
                              const valB = getPatientLastVisitStr(b);
                              if (valA < valB) return 1;
                              if (valA > valB) return -1;
                              return 0;
                          })
                          .map(p => (
                            <button 
                              key={p.id}
                              onClick={() => selectPatient(p)}
                              className="w-full p-4 flex items-center gap-4 hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                            >
                              <div className="min-w-[56px] h-9 px-2 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0 font-bold font-data text-[10px] shadow-inner border border-slate-200/50">
                                {p.hn || 'NEW'}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-slate-800 kanit-text truncate text-sm">{p.firstName} {p.lastName}</p>
                                <p className="text-[11px] text-slate-500 font-data">{p.phone || 'ไม่มีเบอร์โทร'}</p>
                              </div>
                              <ChevronRight className="text-slate-300" size={16} />
                            </button>
                          ))}
                          {filteredPatients.length === 0 && patientSearchQuery.length >= 2 && (
                            <div className="p-4 text-center text-slate-400 kanit-text text-sm italic">
                              ไม่พบข้อมูลผู้ป่วย: "{patientSearchQuery}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {posEditForm.patientId && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-[11px] font-bold w-fit shadow-sm animate-in fade-in zoom-in-95">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="font-data">HN: {posEditForm.patientId} | {posEditForm.patientName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Items List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-sky-500 shadow-sm border border-sky-100">
                        <ShoppingBag size={18} />
                    </div>
                    <h4 className="font-bold text-slate-700 kanit-text">รายการสินค้าและบริการ</h4>
                  </div>
                  <button 
                    onClick={handleAddPosItem}
                    className="text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 kanit-text shadow-sm hover:shadow active:scale-95"
                  >
                    <Plus size={14} /> เพิ่มรายการ
                  </button>
                </div>

                <div className="space-y-3">
                  {posEditForm.items.map((item, idx) => (
                    <div key={idx} className="group p-4 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-slate-50 hover:border-sky-200 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center relative">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 kanit-text uppercase tracking-widest">สินค้า / บริการ</label>
                        <CustomSelect 
                          value={item.id} 
                          onChange={(val) => handlePosItemChange(idx, 'id', val)}
                          options={posProducts.map(p => ({ value: p.id, label: `${p.name} (${formatCurrency(p.price)}฿)` }))}
                          placeholder="เลือกสินค้า..."
                          className="w-full"
                        />
                      </div>
                      <div className="flex gap-4 w-full sm:w-auto">
                        <div className="w-20">
                            <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 kanit-text uppercase tracking-widest text-center">จำนวน</label>
                            <input 
                            type="number" 
                            min="1"
                            value={item.quantity} 
                            onChange={(e) => handlePosItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2.5 rounded-2xl bg-white border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data text-center shadow-sm"
                            />
                        </div>
                        <div className="w-28 text-right">
                            <label className="block text-[10px] font-black text-slate-400 mb-1 mr-1 kanit-text uppercase tracking-widest">ราคา/หน่วย</label>
                            <input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => handlePosItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2.5 rounded-2xl bg-white border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data text-right shadow-sm"
                            />
                        </div>
                      </div>
                      <div className="hidden sm:block min-w-[100px] text-right">
                        <label className="block text-[10px] font-black text-slate-400 mb-1 mr-1 kanit-text uppercase tracking-widest">ยอดรวม</label>
                        <div className="py-2.5 font-black text-slate-700 font-data text-lg">{formatCurrency(item.total)}฿</div>
                      </div>
                      <button 
                        onClick={() => handleRemovePosItem(idx)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all absolute top-2 right-2 sm:static sm:mt-5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  
                  {posEditForm.items.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-400 kanit-text text-sm flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <ShoppingCart size={32} className="opacity-20" />
                      </div>
                      ยังไม่มีรายการสินค้า กรุณาเพิ่มรายการ
                    </div>
                  )}
                </div>

                {/* Summary Box */}
                <div className="mt-4 p-5 bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl flex justify-between items-center text-white shadow-lg shadow-sky-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Activity size={20} />
                    </div>
                    <span className="font-bold kanit-text">ยอดรวมสุทธิทั้งสิ้น</span>
                  </div>
                  <span className="text-3xl font-black font-data">
                    {formatCurrency(posEditForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}฿
                  </span>
                </div>
              </div>

              {/* Section 3: Status & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2.5 ml-1 kanit-text uppercase tracking-widest">สถานะการชำระเงิน</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                        {id: 'completed', label: 'ชำระเงินแล้ว', color: 'emerald', icon: CheckCircle2},
                        {id: 'cancelled', label: 'ยกเลิกรายการ', color: 'rose', icon: XCircle}
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setPosEditForm({...posEditForm, status: st.id})}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-xs kanit-text transition-all ${
                          posEditForm.status === st.id
                            ? st.id === 'completed' 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                              : 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/25'
                            : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <st.icon size={16} />
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2.5 ml-1 kanit-text uppercase tracking-widest">ช่องทางชำระเงิน</label>
                  <CustomSelect 
                    value={posEditForm.paymentMethod} 
                    onChange={(val) => setPosEditForm({...posEditForm, paymentMethod: val})}
                    options={[
                        {value: 'cash', label: '💵 เงินสด'},
                        {value: 'transfer', label: '📱 โอนเงินเข้าบัญชี'},
                        {value: 'credit', label: '💳 บัตรเครดิต'}
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Section 4: Extra Note */}
              <div className="pt-4">
                <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">หมายเหตุเพิ่มเติม</label>
                <textarea 
                  rows="3" 
                  value={posEditForm.note || ''} 
                  onChange={(e) => setPosEditForm({...posEditForm, note: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data resize-none transition-all"
                  placeholder="ใส่บันทึกเพิ่มเติมได้ที่นี่..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 shrink-0">
              <button 
                onClick={() => setIsPosEditModalOpen(false)}
                className="px-6 py-3 rounded-2xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm kanit-text"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSavePosEdit}
                disabled={isSavingPos || posEditForm.items.length === 0}
                className="px-8 py-3 rounded-2xl font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/25 kanit-text flex items-center gap-2"
              >
                {isSavingPos ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={18} />} บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Custom Calendar Portal (ใช้ร่วมกับการกำหนดวันที่ทำรายการ) --- */}
      {calendarModal.isOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${calendarModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={calendarModal.close}></div>
          <div className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${calendarModal.isClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
            
            {calView === 'days' && (
              <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[calDate.getMonth()]} {calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 sm:h-8"></div>)}
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const isSelected = calDate.getDate() === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();
                    return (
                      <button key={day} type="button" onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth(), day))} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium font-data calendar-btn-anim ${isSelected ? 'cal-selected' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            )}
            
            {calView === 'months' && (
              <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl text-base sm:text-sm font-data">{calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium kanit-text calendar-btn-anim ${calDate.getMonth() === i ? 'cal-selected' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            
            {calView === 'years' && (
                <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-6 px-1">
                  <button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{yearPageStart} - {yearPageStart + 11}</span>
                  <button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium font-data calendar-btn-anim ${(calDate.getFullYear() + 543) === y ? 'cal-selected' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            {/* --- แก้ไข: เปลี่ยน Layout ตรงนี้เป็นแนวตั้ง (flex-col) สำหรับหน้า Finance --- */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3 w-full">
                
                {/* แถวที่ 1: กล่องเลือกเวลา (กว้างเต็ม) */}
                <div className="flex items-center justify-center gap-1.5 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm w-full">
                    <Clock size={16} className="text-sky-500 shrink-0 mr-1" />
                    
                    <CustomSelect 
                        compact dropUp
                        value={calTime.h} 
                        onChange={v => setCalTime({...calTime, h: v})} 
                        options={Array.from({length:24}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                    
                    <span className="text-slate-400 font-bold kanit-text pb-0.5 shrink-0">:</span>
                    
                    <CustomSelect 
                        compact dropUp
                        value={calTime.m} 
                        onChange={v => setCalTime({...calTime, m: v})} 
                        options={Array.from({length:60}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                    
                    <span className="text-slate-400 font-bold kanit-text pb-0.5 shrink-0">:</span>
                    
                    <CustomSelect 
                        compact dropUp
                        value={calTime.s} 
                        onChange={v => setCalTime({...calTime, s: v})} 
                        options={Array.from({length:60}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                </div>
                
                {/* แถวที่ 2: ปุ่มกด ปัจจุบัน/ตกลง (จัดสัดส่วนใหม่ให้กดง่าย) */}
                <div className="flex gap-2 w-full">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setCalDate(now);
                          setCalTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0'), s: String(now.getSeconds()).padStart(2,'0')});
                          setCalView('days');
                    }} className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors kanit-text shadow-sm whitespace-nowrap">
                        ปัจจุบัน
                    </button>
                    
                    <button type="button" onClick={() => {
                          const d = String(calDate.getDate()).padStart(2, '0');
                          const m = String(calDate.getMonth() + 1).padStart(2, '0');
                          const y = calDate.getFullYear() + 543;
                          setFormData({...formData, date: `${d}/${m}/${y} ${calTime.h}:${calTime.m}:${calTime.s}`});
                          calendarModal.close();
                    }} className="flex-[2] px-4 py-2.5 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20 transition-colors kanit-text whitespace-nowrap">
                        ตกลง
                    </button>
                </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Alert Modal */}
      {sweetAlert.isOpen && createPortal(
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${sweetAlert.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center ${sweetAlert.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 kanit-text">{alertConfig.title}</h3>
            <p className="text-slate-500 mb-8 kanit-text">{alertConfig.text}</p>
            <div className="flex gap-3 w-full">
              <button onClick={sweetAlert.close} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">ยกเลิก</button>
              <button onClick={alertConfig.onConfirm} className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-colors shadow-lg shadow-rose-500/30 kanit-text">ยืนยัน</button>
            </div>
          </div>
        </div>,
        document.body
      )}
              </div>
              );
              };

export default function App() {
  // --- แก้ไข: จดจำหน้าปัจจุบันใน LocalStorage (รีเฟรชแล้วอยู่หน้าเดิม ยกเว้นตั้งค่า) ---
  const [currentTab, setCurrentTab] = useState(() => {
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

  // บันทึกหน้าปัจจุบันลง LocalStorage ทุกครั้งที่มีการเปลี่ยนหน้า
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('clinic_currentTab', currentTab);
    }
  }, [currentTab]);

  const [currentBranch, setCurrentBranch] = useState('b1');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // --- เพิ่ม State สำหรับ Draggable Expandable Sidebar ---
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sidebarExpanded') : null;
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  // ตรวจสอบขนาดหน้าจอเพื่อตั้งค่า isMobile (เฉพาะส่วนรอยต่อ 768px)
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const checkMobile = () => {
      const currentWidth = window.innerWidth;
      const wasMobile = lastWidth < 768;
      const isNowMobile = currentWidth < 768;
      if (wasMobile !== isNowMobile) {
        setIsMobile(isNowMobile);
        if (isNowMobile) setIsSidebarExpanded(false);
      }
      lastWidth = currentWidth;
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // เลิกใช้ State แต่เปลี่ยนมาใช้ Ref เพื่อควบคุม DOM โดยตรง (ป้องกันการ Re-render)
  const sidebarRef = React.useRef(null);
  const dragStartX = React.useRef(null);
  const hasDragged = React.useRef(false); // เพิ่มตัวแปรเช็คว่าเป็นการลากหรือไม่ เพื่อป้องกันคลิกพลาด

  const SIDEBAR_MIN_WIDTH = isMobile ? 0 : 84;
  const SIDEBAR_MAX_WIDTH = 256;
  const sidebarBaseWidth = isSidebarExpanded ? SIDEBAR_MAX_WIDTH : SIDEBAR_MIN_WIDTH;
  const baseProgress = isSidebarExpanded ? 1 : 0;

  // บันทึกสถานะลง LocalStorage เมื่อมีการเปลี่ยนแปลง (เฉพาะ PC)
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && !isMobile) {
      localStorage.setItem('sidebarExpanded', JSON.stringify(isSidebarExpanded));
    }
  }, [isSidebarExpanded, isMobile]);

  // ดักจับ Event ขณะกำลังลากแบบ 60FPS (Bypass React State)
  useEffect(() => {
    // ยกเลิกการลากบนมือถือทั้งหมดเพื่อแก้ปัญหา CPU/GPU กินหนัก
    if (isMobile) return;

    // คืนค่า Base เมื่อหยุดลาก (เพื่อให้ Transition ของ CSS ทำงานได้ต่อ)
    if (!isDraggingSidebar) {
      if (sidebarRef.current) {
        sidebarRef.current.style.setProperty('--sidebar-width', `${sidebarBaseWidth}px`);
        sidebarRef.current.style.setProperty('--drag-progress', baseProgress);
      }
    }

    const handleMouseMove = (e) => {
      if (dragStartX.current === null) return;
      const clientX = e.clientX;
      const offset = clientX - dragStartX.current;
      
      // ถ้าลากเกิน 5px ให้ถือว่าตั้งใจลาก และเข้าสู่โหมดลาก
      if (Math.abs(offset) > 5 && !hasDragged.current) {
         hasDragged.current = true;
         setIsDraggingSidebar(true);
      }

      if (!hasDragged.current) return;

      let newWidth, progress;
      // บน PC: ลากจาก MIN_WIDTH ถึง MAX_WIDTH
      newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, sidebarBaseWidth + offset));
      progress = (newWidth - SIDEBAR_MIN_WIDTH) / (SIDEBAR_MAX_WIDTH - SIDEBAR_MIN_WIDTH);
      
      // *อัปเดต CSS Variables ตรงๆ โดยไม่แตะ React State* = ไม่กระตุก 60FPS
      if (sidebarRef.current) {
        sidebarRef.current.style.setProperty('--sidebar-width', `${newWidth}px`);
        sidebarRef.current.style.setProperty('--drag-progress', progress);
      }
    };

    const handleMouseUp = (e) => {
      if (dragStartX.current === null) return;

      const clientX = e.clientX;
      const offset = clientX - dragStartX.current;

      dragStartX.current = null;
      
      if (hasDragged.current) {
         setIsDraggingSidebar(false); // เรียกปิดเมื่อลากเสร็จ
         setTimeout(() => { hasDragged.current = false; }, 50);

         // Snap Logic
         if (!isSidebarExpanded && offset > 50) setIsSidebarExpanded(true);
         else if (isSidebarExpanded && offset < -50) setIsSidebarExpanded(false);
      } else {
         // แค่คลิก ไม่ได้ลาก (เคลียร์สถานะอย่างเดียว ไม่ต้อง Snap Logic)
         setTimeout(() => { hasDragged.current = false; }, 50);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSidebar, isSidebarExpanded, sidebarBaseWidth, baseProgress, isMobile]);

  // ฟังก์ชันเริ่มจับการลาก (ตรวจสอบพื้นที่ป้องกันการลากมั่ว) - เฉพาะ PC
  const startSidebarDrag = (e) => {
    if (isMobile) return;
    if (e.target.closest('.no-drag-zone')) return;
    hasDragged.current = false;
    dragStartX.current = e.clientX;
  };

  // --- เพิ่มระบบจำตำแหน่ง Scroll ของแต่ละหน้า ---
  const mainRef = React.useRef(null);
  const scrollPositions = React.useRef({});

  const handleTabClick = (tabId) => {
    if (hasDragged.current) return;
    
    // บันทึกตำแหน่ง Scroll ปัจจุบันก่อนเปลี่ยนหน้า
    if (mainRef.current) {
      scrollPositions.current[currentTab] = mainRef.current.scrollTop;
    }
    setCurrentTab(tabId);
    if (isMobile) setIsSidebarExpanded(false); // พับเก็บอัตโนมัติเมื่อกดเลือกเมนู (เฉพาะ Mobile)
  };

  // ใช้ useLayoutEffect เพื่อเซ็ตตำแหน่ง Scroll ก่อนเบราว์เซอร์วาดหน้าจอ (ป้องกันภาพกระตุก)
  React.useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = scrollPositions.current[currentTab] || 0;
    }
  }, [currentTab]);

  const [patientsData, setPatientsData] = useState(GOOGLE_SCRIPT_URL ? [] : mockPatients);
  const [branchesData, setBranchesData] = useState(GOOGLE_SCRIPT_URL ? [] : mockBranches); // เพิ่ม State จัดการสาขา
  const [queueData, setQueueData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryLogsData, setInventoryLogsData] = useState([]); // เพิ่ม State เก็บประวัติคลังสินค้า
  const [posHistoryData, setPosHistoryData] = useState([]); // เพิ่ม State เก็บประวัติ POS
  const [financeData, setFinanceData] = useState([]); // เพิ่ม State เก็บประวัติการเงิน
  const [posProducts, setPosProducts] = useState([]); // เปลี่ยนจาก mockProducts เป็นอาร์เรย์ว่าง เพื่อรอดึงข้อมูลของจริง
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // แจ้งเตือนแบบ State ปลอดภัยที่สุด แสดงบนสุดและไม่ทำให้จอโหลดใหม่ซ้อน
  const [toast, setToast] = useState(null);
  const [isToastClosing, setIsToastClosing] = useState(false);
  const toastTimerRef = React.useRef(null);
  const toastCloseTimerRef = React.useRef(null);

  const showToast = (message, type = 'success') => {
    // ล้าง Timer เก่าออกถ้ามีการกดรัวๆ
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastCloseTimerRef.current) clearTimeout(toastCloseTimerRef.current);

    setToast({ message, type });
    setIsToastClosing(false); // เริ่มแอนิเมชันขาเข้า

    toastTimerRef.current = setTimeout(() => {
      setIsToastClosing(true); // เริ่มแอนิเมชันขาออก
      
      toastCloseTimerRef.current = setTimeout(() => {
        setToast(null); // ลบออกจาก DOM หลังแอนิเมชันเล่นจบ
        setIsToastClosing(false);
      }, 300); // หน่วงเวลาให้แอนิเมชัน slide-up เล่นจบก่อน
    }, 3000);
  };

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 20);
  };

  const callAppScript = async (action, sheetName, data = null) => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, sheetName, payload: data }), redirect: 'follow' });
      const result = await response.json();
      if (result.status === 'error') throw new Error(result.message);
      return result;
    } catch (error) { throw error; }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!GOOGLE_SCRIPT_URL || isDataFetched) return;
      setIsGlobalLoading(true);
      try {
        // ใช้ Promise.all เพื่อดึงข้อมูลทุกอย่างขนานกัน (Parallel Fetching) ช่วยลดเวลาโหลดเริ่มต้นได้อย่างมาก
        const [
          resPatients,
          resQueue,
          resPos,
          resInventory,
          resInvLogs,
          resPosItems,
          resBranches,
          resFinanceRevenue,
          resFinanceExpenses
        ] = await Promise.all([
          callAppScript('GET_DATA', 'Patients'),
          callAppScript('GET_DATA', 'Queue'),
          callAppScript('GET_DATA', 'POS_Transactions'),
          callAppScript('GET_DATA', 'Inventory'),
          callAppScript('GET_DATA', 'InventoryLogs'),
          callAppScript('GET_DATA', 'setting_pos'),
          callAppScript('GET_DATA', 'Branches'),
          callAppScript('GET_DATA', 'Finance_Revenue'),
          callAppScript('GET_DATA', 'Finance_Expenses')
        ]);

        if (resPatients?.status === 'success') { 
          setPatientsData(resPatients.data && resPatients.data.length > 0 ? resPatients.data.reverse() : []); 
        }

        if (resBranches?.status === 'success') {
          setBranchesData(resBranches.data && resBranches.data.length > 0 ? resBranches.data : mockBranches);
        }
        
        if (resQueue?.status === 'success') {
          setQueueData(resQueue.data && resQueue.data.length > 0 ? resQueue.data.reverse() : []);
        }

        if (resPos?.status === 'success') {
          setPosHistoryData(resPos.data && resPos.data.length > 0 ? resPos.data.reverse() : []);
        }

        if (resInventory?.status === 'success') {
          setInventoryData(resInventory.data || []);
        }

        if (resInvLogs?.status === 'success') {
          setInventoryLogsData(resInvLogs.data && resInvLogs.data.length > 0 ? resInvLogs.data.reverse() : []);
        }

        if (resPosItems?.status === 'success' && resPosItems.data?.length > 0) {
          setPosProducts(resPosItems.data);
        }

        const combinedFinanceData = [];
        if (resFinanceRevenue?.status === 'success' && resFinanceRevenue.data) {
           combinedFinanceData.push(...resFinanceRevenue.data);
        }
        if (resFinanceExpenses?.status === 'success' && resFinanceExpenses.data) {
           combinedFinanceData.push(...resFinanceExpenses.data);
        }
        setFinanceData(combinedFinanceData.sort((a, b) => new Date(b.date) - new Date(a.date)));

      } catch (error) { 
        console.error("Initial Fetch Error:", error);
        showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลเริ่มต้นได้', 'warning'); 
      } 
      finally { setIsDataFetched(true); setIsGlobalLoading(false); }
    };
    fetchInitialData();
  }, [isDataFetched]);

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'records', label: 'เวชระเบียน', icon: Users },
    { id: 'queue', label: 'นัดหมาย', icon: CalendarRange },
    { id: 'pos', label: 'POS', icon: Calculator },
    { id: 'catalog', label: 'สินค้า/บริการ', icon: Tag },
    { id: 'inventory', label: 'คลังสินค้า', icon: Package },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
    { id: 'finance', label: 'การเงิน', icon: Banknote },
    { id: 'branches', label: 'จัดการสาขา', icon: Building2 },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  // คำนวณตัวแปรสำหรับ Navbar มือถือล่วงหน้า เพื่อดึงค่า Index ไปคำนวณระยะการสไลด์
  const mobileNavItems = navItems.slice(0, 5);
  const activeNavIndex = mobileNavItems.findIndex(item => item.id === currentTab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-sky-200 selection:text-sky-900">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-200/40 blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/30 blur-[100px] pointer-events-none z-0"></div>

      {/* แก้ไขกลับมาเป็น h-screen เพราะ 100dvh อาจทำให้หน้าจอยุบตัวบนบาง Browser */}
      <div className="flex h-screen overflow-hidden w-full flex-col md:flex-row relative">
        
        {/* Backdrop สำหรับ Mobile เมื่อกางเมนู (ใช้ CSS Transition ธรรมดา ไม่กิน CPU) */}
        <div 
          className={`md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarExpanded(false)}
        />

        {/* Mobile Slide Menu (สร้างแยกมาต่างหาก ทำงานด้วย CSS Transform ล้วนๆ ลื่นไหล 100%) */}
        <aside 
          className={`md:hidden fixed inset-y-0 left-0 z-[60] w-[260px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarExpanded ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-6 flex items-center min-h-[89px] border-b border-slate-100/50 shrink-0">
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/30">
              <Stethoscope size={24} />
            </div>
            <div className="whitespace-nowrap min-w-[150px]">
              <h2 className="font-bold text-slate-800 leading-tight kanit-text ml-3">Clinic<span className="text-sky-500">Hub</span></h2>
              <p className="text-xs text-slate-400 kanit-text ml-3">Management System</p>
            </div>
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-4 relative min-h-[72px] flex items-center justify-center shrink-0">
              <CustomSelect
                  value={currentBranch}
                  onChange={(val) => setCurrentBranch(val)}
                  options={[{value: 'all', label: 'ดูข้อมูลทุกสาขารวม'}, ...branchesData.map(b => ({value: b.id, label: b.name}))]}
                  className="w-full bg-slate-50 border-slate-100 rounded-xl focus-within:bg-white"
              />            
            </div>
            
            <nav className="flex-1 px-3 py-2 flex flex-col overflow-y-auto custom-scrollbar gap-1">
              {navItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id)} 
                  className={`flex items-center py-3 px-3 w-full rounded-2xl transition-all duration-200 kanit-text ${currentTab === item.id ? 'bg-sky-500 shadow-md shadow-sky-500/20 text-white font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <div className="shrink-0 w-6 flex items-center justify-center">
                    <item.icon size={20} className={currentTab === item.id ? 'opacity-100' : 'opacity-70'} />
                  </div>
                  <span className="whitespace-nowrap ml-3 flex items-center text-left">
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100/50 min-h-[80px] flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ring-2 ring-white">
                <User size={18} />
              </div>
              <div className="text-left whitespace-nowrap">
                <p className="text-xs font-semibold text-slate-700 kanit-text">Admin User</p>
                <p className="text-[10px] text-slate-400 kanit-text">ออนไลน์</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Desktop Sidebar (ใช้ระบบลากแบบเดิมของ PC) */}
        <aside 
          ref={sidebarRef}
          onMouseDown={startSidebarDrag}
          style={{ 
            '--sidebar-width': `${sidebarBaseWidth}px`,
            '--drag-progress': baseProgress,
            width: 'var(--sidebar-width)'
          }}
          className={`hidden md:flex flex-col h-full relative select-none shrink-0 overflow-hidden ${!isDraggingSidebar ? 'transition-[width] duration-300 ease-in-out' : ''} ${theme.glassPanel} border-r border-slate-200/50 z-[52]`}
        >
          <div className="p-6 flex items-center min-h-[89px] border-b border-slate-100/50 overflow-hidden shrink-0">
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/30">
              <Stethoscope size={24} />
            </div>
            <div 
              style={{ opacity: 'var(--drag-progress)', transform: `translateX(calc((1 - var(--drag-progress)) * -20px))` }}
              className={`whitespace-nowrap min-w-[150px] ${!isDraggingSidebar ? 'transition-all duration-300' : ''} ${!isSidebarExpanded && !isDraggingSidebar ? 'pointer-events-none' : ''}`}
            >
              <h2 className="font-bold text-slate-800 leading-tight kanit-text ml-3">Clinic<span className="text-sky-500">Hub</span></h2>
              <p className="text-xs text-slate-400 kanit-text ml-3">Management System</p>
            </div>
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-4 relative z-[60] min-h-[72px] flex items-center justify-center shrink-0 no-drag-zone">
              <div 
                className={`w-full absolute px-4 ${!isDraggingSidebar ? 'transition-all duration-300' : ''} ${!isSidebarExpanded && !isDraggingSidebar ? 'pointer-events-none' : ''}`}
                style={{ opacity: 'var(--drag-progress)' }}
              >
                <CustomSelect
                    value={currentBranch}
                    onChange={(val) => setCurrentBranch(val)}
                    options={[{value: 'all', label: 'ดูข้อมูลทุกสาขารวม'}, ...branchesData.map(b => ({value: b.id, label: b.name}))]}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl focus-within:bg-white"
                />            
              </div>
              <div 
                className={`absolute ${!isDraggingSidebar ? 'transition-all duration-300' : ''} ${isSidebarExpanded && !isDraggingSidebar ? 'pointer-events-none' : ''}`}
                style={{ opacity: 'calc(1 - var(--drag-progress))' }}
              >
                <div title="เลือกสาขา" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100 hover:bg-sky-50 hover:text-sky-600 transition-colors cursor-pointer">
                  <Building2 size={20} />
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-2 flex flex-col overflow-y-auto overflow-x-hidden relative gap-1 custom-scrollbar">
              {navItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id)} 
                  title={!isSidebarExpanded && !isDraggingSidebar ? item.label : undefined}
                  className={`flex items-center py-3 rounded-2xl transition-all duration-200 kanit-text overflow-hidden ${isSidebarExpanded || isDraggingSidebar ? 'w-full px-3' : 'w-[52px] justify-center mx-auto'} ${currentTab === item.id ? 'bg-sky-500 shadow-md shadow-sky-500/20 text-white font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <div className="shrink-0 w-6 flex items-center justify-center">
                    <item.icon size={20} className={currentTab === item.id ? 'opacity-100' : 'opacity-70'} />
                  </div>
                  <span 
                    style={{ 
                      opacity: 'var(--drag-progress)', 
                      maxWidth: 'calc(var(--drag-progress) * 200px)', 
                      marginLeft: 'calc(var(--drag-progress) * 12px)' 
                    }}
                    className={`whitespace-nowrap overflow-hidden flex items-center text-left ${!isDraggingSidebar ? 'transition-all duration-300' : ''}`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100/50 overflow-hidden min-h-[80px] flex items-center justify-center relative shrink-0">
              <div 
                className={`absolute w-full px-4 flex items-center gap-3 ${!isDraggingSidebar ? 'transition-all duration-300' : ''} ${!isSidebarExpanded && !isDraggingSidebar ? 'pointer-events-none' : ''}`}
                style={{ opacity: 'var(--drag-progress)' }}
              >
                <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Users size={16} /></div>
                <div className="text-left whitespace-nowrap min-w-[100px]">
                  <p className="text-xs font-semibold text-slate-700 kanit-text">Admin User</p>
                  <p className="text-[10px] text-slate-400 kanit-text">ออนไลน์</p>
                </div>
              </div>
              <div 
                className={`absolute ${!isDraggingSidebar ? 'transition-all duration-300' : ''} ${isSidebarExpanded && !isDraggingSidebar ? 'pointer-events-none' : ''}`}
                style={{ opacity: 'calc(1 - var(--drag-progress))' }}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ring-2 ring-white">
                  <User size={18} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* --- Mobile Top Header --- */}
        <header className="md:hidden flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 shrink-0 shadow-sm relative">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setIsSidebarExpanded(true)} className="w-10 h-10 flex items-center justify-center text-slate-500 active:scale-90 transition-transform">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/30">
                <Stethoscope size={18} />
              </div>
            </button>
            <div>
              <h2 className="text-lg font-black kanit-text tracking-tight mt-0.5">Clinic<span className="text-sky-500">Hub</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-700 kanit-text leading-none">Admin User</p>
              <p className="text-[9px] text-emerald-500 kanit-text mt-0.5 font-medium">ออนไลน์</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner ring-2 ring-white">
              <User size={16} />
            </div>
          </div>
        </header>

        {/* เพิ่ม ref={mainRef} ให้กล่องหลัก ปลด z-20 ออกเพื่อให้ Modal ทำงานอิสระ */}
        <main id="main-scroll-container" ref={mainRef} className="flex-1 flex flex-col overflow-y-auto pb-24 md:pb-0 w-full relative custom-scrollbar" style={{ overflowAnchor: 'none' }}>
          <div className="flex-1 flex flex-col w-full min-h-full">
            {/* Fix: Render all tabs with display:none to preserve scroll and states (fixes unmount memory leak & scroll jump) */}
            <div style={{ display: currentTab === 'dashboard' ? 'block' : 'none' }} className="w-full">
                <Dashboard queueData={queueData} patientsData={patientsData} isGlobalLoading={isGlobalLoading} />
            </div>
            <div style={{ display: currentTab === 'records' ? 'block' : 'none' }} className="w-full">
                {/* ส่ง posProducts เข้าไปให้ MedicalRecords ใช้งาน */}
                <MedicalRecords patientsData={patientsData} setPatientsData={setPatientsData} currentBranch={currentBranch} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} posProducts={posProducts} />
            </div>
            <div style={{ display: currentTab === 'queue' ? 'block' : 'none' }} className="w-full">
                <AppointmentManager queueData={queueData} setQueueData={setQueueData} patientsData={patientsData} setPatientsData={setPatientsData} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} />
            </div>
                        <div style={{ display: currentTab === 'catalog' ? 'block' : 'none' }} className="w-full">
                <CatalogManager products={posProducts} setProducts={setPosProducts} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} />
            </div>
<div style={{ display: currentTab === 'pos' ? 'flex' : 'none' }} className="flex-1 w-full relative">
               {/* แก้ไข: ส่ง Props posProducts และข้อมูลสต็อกลงไปให้ POSSystem ใช้งาน */}
                <POSSystem 
                    products={posProducts} 
                    setProducts={setPosProducts} 
                    patientsData={patientsData} 
                    setPatientsData={setPatientsData} 
                    posHistoryData={posHistoryData} 
                    setPosHistoryData={setPosHistoryData} 
                    inventoryData={inventoryData}
                    setInventoryData={setInventoryData}
                    setInventoryLogsData={setInventoryLogsData}
                    currentBranch={currentBranch}
                    branchesData={branchesData}
                    showToast={showToast} 
                    callAppScript={callAppScript} 
                    isGlobalLoading={isGlobalLoading} 
                />
            </div>
            <div style={{ display: currentTab === 'finance' ? 'block' : 'none' }} className="w-full mx-auto px-0 py-0">
               <FinancePage 
                 currentBranch={currentBranch} 
                 financeData={financeData} 
                 setFinanceData={setFinanceData} 
                 posHistoryData={posHistoryData} 
                 branchesData={branchesData} 
                 isGlobalLoading={isGlobalLoading} 
                 callAppScript={callAppScript} 
                 showToast={showToast} 
                 setPosHistoryData={setPosHistoryData}
                 patientsData={patientsData}
                 posProducts={posProducts}
               />
            </div>            <div style={{ display: currentTab === 'inventory' ? 'block' : 'none' }} className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8">
                <InventoryManager 
                    inventoryData={inventoryData} 
                    setInventoryData={setInventoryData} 
                    inventoryLogsData={inventoryLogsData}
                    setInventoryLogsData={setInventoryLogsData}
                    posProducts={posProducts} 
                    branchesData={branchesData}
                    showToast={showToast} 
                    callAppScript={callAppScript} 
                    isGlobalLoading={isGlobalLoading} 
                    currentBranch={currentBranch}
                />
            </div>
            {currentTab === 'reports' && <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><PlaceholderPage title="รายงานระดับองค์กร" desc="ดูสถิติ รายได้ และประสิทธิภาพการทำงานของคลินิก" icon={BarChart3} /></div>}
            <div style={{ display: currentTab === 'branches' ? 'block' : 'none' }} className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8">
                <BranchManager 
                    branchesData={branchesData} 
                    setBranchesData={setBranchesData} 
                    showToast={showToast} 
                    callAppScript={callAppScript} 
                    isGlobalLoading={isGlobalLoading} 
                />
            </div>
            {currentTab === 'settings' && <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><PlaceholderPage title="ตั้งค่าระบบ" desc="ตั้งค่าข้อมูลคลินิก ผู้ใช้งาน และสิทธิ์การเข้าถึง" icon={Settings} /></div>}
          </div>

          {/* ปรับแก้ Navbar มือถือ: Liquid Tab Bar Animation (Sliding Bubble) เพิ่มขอบมนด้านบน */}
          <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border border-b-0 border-slate-200/80 rounded-t-[1.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[calc(max(0.5rem,env(safe-area-inset-bottom)))] pt-2 px-2 z-[45]">
            <div className="relative flex w-full max-w-sm mx-auto h-14">
                {/* กล่องใส่ก้อน Bubble สีสันที่เลื่อนไปมา ปรับเวลาเป็น 500ms และใช้ ease-in-out เพื่อความนุ่มนวลสูงสุด (ไม่เด้งและไม่กระชาก) */}
                <div 
                  className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none transition-transform duration-500 ease-in-out" 
                  style={{ 
                    width: `calc(100% / ${mobileNavItems.length})`, // กว้าง 1 สล็อต
                    transform: `translateX(calc(${activeNavIndex} * 100%))`, // เลื่อนไปตาม Index
                    opacity: activeNavIndex !== -1 ? 1 : 0
                  }} 
                >
                  {/* ตัวก้อนวงกลมจริง ๆ */}
                  <div className="w-12 h-12 bg-gradient-to-tr from-sky-400 to-sky-600 rounded-full shadow-lg shadow-sky-500/40" />
                </div>

                {/* Nav Buttons: ปุ่มล่องหนอยู่ชั้นบนสุด (z-10) ไว้รับการกดคลิก */}
                {mobileNavItems.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                        <button 
                            key={item.id} 
                            onClick={() => handleTabClick(item.id)} 
                            className={`relative z-10 flex-1 flex items-center justify-center transition-colors duration-500 ${isActive ? 'text-white' : 'text-slate-400 hover:text-sky-500'}`}
                        >
                            <item.icon 
                                size={24} 
                                strokeWidth={isActive ? 2.5 : 2} 
                                /* ปรับแอนิเมชันของไอคอนให้ลื่นไหลสอดคล้องกับวงกลม */
                                className={`transition-transform duration-500 ease-in-out ${isActive ? 'scale-110' : 'scale-100'}`}
                            />
                        </button>
                    );
                })}
            </div>
          </div>
        </main> 

      </div>

      {toast && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[9999] w-max max-w-[90vw] sm:max-w-md"
          style={{ top: 'max(1rem, env(safe-area-inset-top))', marginTop: '0.5rem' }}
        >
          <div className={`flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-full sm:rounded-2xl shadow-2xl backdrop-blur-xl border text-white ${
              toast.type === 'success' ? 'bg-emerald-500/95 border-emerald-400 shadow-emerald-500/20' : 
              toast.type === 'warning' ? 'bg-amber-500/95 border-amber-400 shadow-amber-500/20' : 
              'bg-rose-500/95 border-rose-400 shadow-rose-500/20'
          } ${isToastClosing ? 'toast-animate-out' : 'toast-animate-in'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : 
             toast.type === 'warning' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : 
             <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
            <span className="font-medium kanit-text text-xs sm:text-sm leading-tight break-words">{toast.message}</span>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        
        /* 1. โครงสร้างเว็บและ UI ทั่วไปใช้ Kanit เป็นค่าเริ่มต้น */
        body { font-family: 'Kanit', sans-serif; }
        h1, h2, h3, h4, h5, h6, button, th, label, .nav-item, .kanit-text { font-family: 'Kanit', sans-serif !important; }
        
        /* 2. ข้อมูล เนื้อหา และฟอร์มรับข้อมูล ใช้ Leelawadee UI (และคลาส .font-data เผื่อไว้ใช้ระบุเฉพาะจุด) */
        td, input, select, textarea, .font-data { font-family: 'Leelawadee UI', 'Segoe UI', Tahoma, sans-serif !important; }

        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        
        /* --- ทำให้ Modal ทุกตัวเด้งใหญ่ขึ้นและลดลงแบบ Smooth เหมือนกันทั้งหมด --- */
        .scale-in, .modal-animate-in, .sweet-alert-pop { 
            animation: bounceIn 0.45s ease-out forwards !important; 
            transform-origin: center;
        }
        
        /* เพิ่ม Animation ตอนปิดให้เด้งขึ้นและหดลง พร้อมกับฉากหลังที่ค่อยๆ จาง */
        .modal-animate-out { 
            animation: bounceOut 0.3s ease-in-out forwards !important; 
            transform-origin: center;
        }
        .backdrop-animate-out {
            animation: fadeOut 0.3s ease-out forwards !important;
        }

        /* แอนิเมชันตอนสลับมุมมอง (วัน/เดือน/ปี) ภายในปฏิทิน */
        .calendar-view-anim {
            animation: scaleFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* แอนิเมชันปุ่มวันที่ (กดแล้วยุบ, เลือกแล้วเด้ง) */
        .calendar-btn-anim {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .calendar-btn-anim:active {
            transform: scale(0.75) !important;
        }
        .cal-selected {
            background-color: #0ea5e9 !important;
            color: white !important;
            transform: scale(1.15) !important;
            box-shadow: 0 4px 14px -2px rgba(14, 165, 233, 0.4) !important;
        }

        /* กำหนดจังหวะการเด้ง (ใหญ่ขึ้นไปที่ 1.05 แล้วหดลงมาที่ 0.98 ก่อนหยุดที่ 1.0) */
        @keyframes bounceIn { 
            0% { transform: scale(0.6); opacity: 0; } 
            55% { transform: scale(1.05); opacity: 1; } 
            80% { transform: scale(0.98); opacity: 1; }
            100% { transform: scale(1); opacity: 1; } 
        }
        
        /* กำหนดจังหวะตอนปิด (เด้งขยายไปที่ 1.05 แล้วค่อยๆ หดและจางหายไปที่ 0.5) */
        @keyframes bounceOut { 
            0% { transform: scale(1); opacity: 1; } 
            30% { transform: scale(1.05); opacity: 1; } 
            100% { transform: scale(0.5); opacity: 0; } 
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes scaleFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }

        /* --- Animation สำหรับ Toast (Slide Down & Fade) --- */
        @keyframes toastSlideDown {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastSlideUp {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        .toast-animate-in { animation: toastSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .toast-animate-out { animation: toastSlideUp 0.3s ease-in forwards; }
        
        /* Animation สำหรับกรอบสแกนบัตร */
        @keyframes scanLine {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(300px); opacity: 0; }
        }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
        .fade-in-up { animation: fadeInUp 0.25s ease-out forwards; }
        .fade-out-up { animation: fadeOutUp 0.25s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* --- Animation แบบ Bottom Sheet สำหรับมือถือ (One UI Style) --- */
        @media (max-width: 639px) {
          .mobile-bottom-sheet {
            position: fixed !important;
            top: auto !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            transform: none !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            border-top-left-radius: 2rem !important;
            border-top-right-radius: 2rem !important;
            animation: slideUpBottomSheet 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important;
            padding-bottom: calc(max(1.5rem, env(safe-area-inset-bottom))) !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.15) !important;
          }
          .mobile-bottom-sheet.closing {
            animation: slideDownBottomSheet 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important;
          }
        }
        @keyframes slideUpBottomSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideDownBottomSheet {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }

        /* กำหนดจุดเริ่มต้นและจุดสิ้นสุดของการเคลื่อนไหว */
        @keyframes spaceRowEnter {
          0% {
            opacity: 0;
            transform: translateY(20px); /* เริ่มต้น: โปร่งใส และอยู่ต่ำลงไป 20px */
          }
          100% {
            opacity: 1;
            transform: translateY(0); /* สิ้นสุด: ชัดเจน 100% และกลับมาตำแหน่งปกติ */
          }
        }

        /* คลาสที่จะเอาไปใส่ให้แต่ละแถว */
        .space-row-animation {
          opacity: 0; /* ซ่อนไว้ก่อนที่แอนิเมชันจะเริ่ม */
          
          /* เล่นแอนิเมชันนาน 0.8 วินาที ใช้ cubic-bezier เพื่อความนุ่มนวลแบบหน่วงปลาย */
          animation: spaceRowEnter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; 
          
          /* บอกเบราว์เซอร์ล่วงหน้าว่าจะมีการเปลี่ยน 2 ค่านี้ เพื่อให้ประมวลผลลื่นไหลขึ้น (Hardware Acceleration) */
          will-change: transform, opacity; 
        }

        /* --- CSS-Based 60FPS Sticky Header Animations --- */
        .sticky-header-bg { transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease; border-bottom: 1px solid transparent; background-color: transparent; will-change: background-color, backdrop-filter; }
        .is-scrolled .sticky-header-bg { background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-color: rgba(226, 232, 240, 0.8); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }

        .sticky-header-inner { transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding-top: 1rem; padding-bottom: 1rem; will-change: padding; }
        @media (min-width: 768px) { .sticky-header-inner { padding-top: 2rem; } }
        .is-scrolled .sticky-header-inner { padding-top: 1rem; padding-bottom: 0.5rem; }
        @media (min-width: 640px) { .is-scrolled .sticky-header-inner { padding-bottom: 0.75rem; } }

        .sticky-header-title { transition: font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1), line-height 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 1.5rem; line-height: 2rem; margin: 0; will-change: font-size, line-height; }
        @media (min-width: 640px) { .sticky-header-title { font-size: 1.875rem; line-height: 2.25rem; } }
        .is-scrolled .sticky-header-title { font-size: 1.25rem; line-height: 1.75rem; }
        @media (min-width: 640px) { .is-scrolled .sticky-header-title { font-size: 1.5rem; line-height: 2rem; } }

        .sticky-header-desc { transition: opacity 0.25s ease, max-height 0.3s ease, margin-top 0.3s ease; opacity: 1; max-height: 50px; margin-top: 0.25rem; overflow: hidden; will-change: opacity, max-height, margin-top; }
        .is-scrolled .sticky-header-desc { opacity: 0; max-height: 0; margin-top: 0; }

        .sticky-header-btn { transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 0.75rem; will-change: padding, font-size; }
        @media (min-width: 640px) { .sticky-header-btn { padding: 0.75rem 1.5rem; font-size: 1rem; } }
        .is-scrolled .sticky-header-btn { padding: 0.625rem; font-size: 0.875rem; }
        .sticky-header-btn svg { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: 20px; height: 20px; will-change: width, height; }
        .is-scrolled .sticky-header-btn svg { width: 18px; height: 18px; }

        .dash-date-badge { transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 0.375rem 0.75rem; font-size: 0.875rem; will-change: padding, font-size; }
        @media (min-width: 640px) { .dash-date-badge { padding: 0.5rem 1rem; font-size: 1rem; } }
        .dash-date-badge svg { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: 18px; height: 18px; will-change: width, height; }
        .is-scrolled .dash-date-badge { font-size: 0.75rem; }
        .is-scrolled .dash-date-badge svg { width: 14px; height: 14px; }

        .sticky-filter-inner { transition: width 0.3s ease, margin 0.3s ease, padding 0.3s ease, border-radius 0.3s ease, border-color 0.3s ease; width: calc(100% - 2rem); margin-top: 0.5rem; padding: 1rem; border-radius: 2rem; border-width: 1px; will-change: width, margin, padding, border-radius; }
        @media (min-width: 768px) { .sticky-filter-inner { width: calc(100% - 4rem); } }
        @media (min-width: 1536px) { .sticky-filter-inner { width: calc(100% - 6rem); } }
        .is-stuck .sticky-filter-inner { width: 100%; margin-top: 0; padding-top: 0.75rem; padding-bottom: 0.75rem; padding-left: 1rem; padding-right: 1rem; border-radius: 0 0 2rem 2rem; border-top-color: transparent; border-left-color: transparent; border-right-color: transparent; }
        @media (min-width: 768px) { .is-stuck .sticky-filter-inner { padding-left: 2rem; padding-right: 2rem; } }
        @media (min-width: 1536px) { .is-stuck .sticky-filter-inner { padding-left: 3rem; padding-right: 3rem; } }
      `}} />
    </div>
  );
}