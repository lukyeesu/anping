import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, Users, CalendarRange, Calculator, 
  Package, BarChart3, Settings, Building2, Search, 
  Plus, X, CheckCircle2, AlertCircle, MapPin, Phone,
  Clock, Stethoscope, FileText, Pill, CreditCard,
  Pencil, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowUpDown, Loader2,
  User, Briefcase, Table as TableIcon, CalendarDays, LayoutList, List, Truck
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
  card: 'bg-white rounded-3xl shadow-sm border border-slate-100/50 p-6',
  input: 'w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all outline-none text-slate-700'
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

// -------------------------------------------------------------------------
// --- 1. ย้ายฟังก์ชันและ Component ย่อยออกมาไว้ด้านนอก เพื่อป้องกันการ Unmount ---
// -------------------------------------------------------------------------
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyu6OHkP7SYE9iDmA2XW5ErVAx0w8n99Kj_ZOocZgi-LcIEMsbfYqtRmbkCOhW1r1aoow/exec"; 

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

const getPatientId = (p) => p ? (p.hn || p.id || '-') : '-';

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
                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
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

       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 mb-1 sm:mb-2">
          {/* Title */}
          <div className="w-full xl:w-auto">
             <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" /> ปฏิทินงาน
             </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full xl:w-auto xl:items-center">
             {/* Mode Selector */}
             <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg sm:rounded-xl w-full sm:w-auto border border-slate-200/60 shadow-sm shrink-0">
                 {[
                     { id: 'month', label: 'เดือน', icon: CalendarIcon },
                     { id: 'week', label: 'สัปดาห์', icon: TableIcon },
                     { id: 'day', label: 'วัน', icon: CalendarDays },
                     { id: 'list', label: 'รายการ', icon: LayoutList },
                 ].map(mode => (
                     <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id)}
                        className={`px-1.5 sm:px-3 py-1.5 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                            viewMode === mode.id 
                            ? 'bg-white text-sky-600 shadow-sm ring-1 ring-slate-200/50' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                     >
                         <mode.icon className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                         <span className="hidden min-[360px]:inline">{mode.label}</span>
                     </button>
                 ))}
             </div>

             {/* Date Controller */}
             <div className="flex items-center justify-between bg-white p-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                <button onClick={() => changePeriod(-1)} className="p-1.5 sm:p-2 hover:bg-sky-50 hover:text-sky-600 rounded-lg text-slate-400 transition-colors shrink-0"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                <span className="text-xs sm:text-sm font-bold text-slate-700 min-w-[120px] sm:min-w-[140px] text-center select-none truncate px-1 flex-1">
                    {getTitle()}
                </span>
                <div className="flex items-center shrink-0">
                    <button onClick={() => changePeriod(1)} className="p-1.5 sm:p-2 hover:bg-sky-50 hover:text-sky-600 rounded-lg text-slate-400 transition-colors"><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                    <div className="w-px h-5 sm:h-6 bg-slate-100 mx-1 sm:mx-2"></div>
                    <button onClick={() => setViewDate(new Date())} className="mr-0.5 sm:mr-1 px-3 sm:px-4 py-1 sm:py-1.5 bg-sky-50 text-sky-600 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap">วันนี้</button>
                </div>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isViewMode, setIsViewMode] = useState(false);
  const [sweetAlert, setSweetAlert] = useState({ isOpen: false, type: '', title: '', text: '', onConfirm: null });

  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterStuck, setIsFilterStuck] = useState(false);
  const filterRef = React.useRef(null);
  const sentinelRef = React.useRef(null); // เพิ่ม Sentinel Ref สำหรับจับพิกัด

  // --- New States for Sticky Header & Filter ---
  const [isApptHeaderScrolled, setIsApptHeaderScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = React.useRef(null);

  // อัปเดต State ให้รองรับฟิลด์ใหม่ๆ
  const initialApptState = { 
    hn: '', 
    patientName: '', 
    searchPatient: '', // ใช้สำหรับแสดงในช่องค้นหาคนไข้
    doctor: '', 
    datetime: '', 
    reason: '', 
    status: 'pending',
    phones: [''],
    lineId: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    serviceType: ''
  };
  const [formData, setFormData] = useState(initialApptState);

  // State สำหรับ Dropdown ค้นหา
  const [showPatientSuggest, setShowPatientSuggest] = useState(false);
  const [showDoctorSuggest, setShowDoctorSuggest] = useState(false);

  // Mock รายชื่อแพทย์สำหรับระบบ Suggest
  const mockDoctors = ['นพ. สมชาย รักษาดี', 'พญ. สมหญิง เก่งกล้า', 'ทพ. ใจดี ยิ้มแย้ม'];

  const [showApptCalendar, setShowApptCalendar] = useState(false);
  const [apptCalDate, setApptCalDate] = useState(new Date());
  const [apptCalView, setApptCalView] = useState('days');
  const [apptYearPageStart, setApptYearPageStart] = useState(0);
  const [apptTime, setApptTime] = useState({ h: '09', m: '00' });
  const [apptCalendarPos, setApptCalendarPos] = useState({ top: 0, left: 0 });

  // --- State สำหรับแอนิเมชันปิด Modal ของ AppointmentManager ---
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isApptCalClosing, setIsApptCalClosing] = useState(false);
  const [isAlertClosing, setIsAlertClosing] = useState(false);

  // Fix: Add ref for Calendar wrapper to replace document.getElementById
  const apptDatetimeWrapperRef = React.useRef(null);

  const closeApptModal = () => { setIsModalClosing(true); setTimeout(() => { setIsModalOpen(false); setIsModalClosing(false); }, 300); };
  const closeApptCalendar = () => { setIsApptCalClosing(true); setTimeout(() => { setShowApptCalendar(false); setIsApptCalClosing(false); }, 300); };
  const closeApptAlert = () => { setIsAlertClosing(true); setTimeout(() => { setSweetAlert(prev => ({...prev, isOpen: false})); setIsAlertClosing(false); }, 300); };

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  useEffect(() => {
    if (apptCalView === 'years') setApptYearPageStart(Math.floor((apptCalDate.getFullYear() + 543) / 12) * 12);
  }, [apptCalView, apptCalDate]);

  // ฟังก์ชันสร้าง HN ใหม่กรณีไม่พบคนไข้ในระบบ
  const generateNextHN = (patients) => {
    if (!patients || patients.length === 0) return 'HN0001';
    let maxNum = 0;
    patients.forEach(p => {
       const numMatch = getPatientId(p).match(/\d+/);
       if (numMatch && parseInt(numMatch[0], 10) > maxNum) maxNum = parseInt(numMatch[0], 10);
    });
    return `HN${String(maxNum + 1).padStart(4, '0')}`;
  };

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

  const filteredData = useMemo(() => {
    return queueData.filter(a => 
      (a.patientName && a.patientName.includes(search)) || 
      (a.hn && a.hn.includes(search)) || 
      (a.doctor && a.doctor.includes(search)) ||
      (a.reason && a.reason.includes(search))
    ).sort((a, b) => new Date(b.rawDeliveryStart || 0) - new Date(a.rawDeliveryStart || 0));
  }, [queueData, search]);

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
            if (entry.target.offsetHeight > 0) {
                setHeaderHeight(entry.target.offsetHeight);
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
        if (mainElement && headerRef.current && headerRef.current.offsetHeight > 0) {
            setIsApptHeaderScrolled(mainElement.scrollTop > 20);
            if (sentinelRef.current) {
                const sentinelRect = sentinelRef.current.getBoundingClientRect();
                const headerRect = headerRef.current.getBoundingClientRect();
                // เช็คว่าขอบบนของ Sentinel ชนกับ ขอบล่างของเฮดเดอร์หรือยัง
                setIsFilterStuck(sentinelRect.top <= headerRect.bottom + 2);
            }
        }
    }, 50);

    const handleScroll = (e) => {
      // ป้องกันไม่ให้คำนวณและอัปเดต State ถ้า Component ถูกซ่อนอยู่
      if (!headerRef.current || headerRef.current.offsetHeight === 0) return;

      const { scrollTop, scrollHeight, clientHeight } = e.target;
      
      setIsApptHeaderScrolled(scrollTop > 20);

      if (sentinelRef.current && headerRef.current) {
         const sentinelRect = sentinelRef.current.getBoundingClientRect();
         const headerRect = headerRef.current.getBoundingClientRect();

         // ใช้ Sentinel Element (ที่ไม่ได้เป็น sticky) มาคำนวณ เพื่อป้องกันค่า top เพี้ยนตอนติด Header
         if (sentinelRect.top <= headerRect.bottom + 2) {
             setIsFilterStuck(true);
         } else {
             setIsFilterStuck(false);
         }
      }

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (visibleCount < filteredData.length && !isLoadingMore) {
           setIsLoadingMore(true);
           setTimeout(() => {
              setVisibleCount(prev => prev + 20);
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
    setShowApptCalendar(true);
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

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...initialApptState });
    setIsViewMode(false);
    setIsModalOpen(true);
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
    setIsModalOpen(true);
  };

  const handleDeleteAppt = (id) => {
      setSweetAlert({
        isOpen: true,
        type: 'warning',
        title: 'ยืนยันการลบการนัดหมาย?',
        text: 'คุณแน่ใจหรือไม่ว่าต้องการลบการนัดหมายนี้?',
        onConfirm: async () => {
            closeApptAlert(); 
            setIsProcessing(true);
            try {
               await callAppScript('DELETE_DATA', 'Queue', { id });
               setQueueData(queueData.filter(a => a.id !== id));
               showToast('ลบสำเร็จ', 'success');
            } catch(e) {
               showToast('ลบไม่สำเร็จ', 'error');
            }
            setIsProcessing(false);
        }
      });
  };

  const handleSaveAppt = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    let finalHn = formData.hn;
    
    // 5. หากไม่ค้นหาและไม่มีผู้ป่วย (ไม่มี HN แต่มีชื่อ) ให้เพิ่มผู้ป่วยเข้าระบบ
    if (!finalHn && formData.patientName) {
        // Fix: Generate HN at save time to avoid duplicate HN race condition
        finalHn = generateNextHN(patientsData);
        
        // แยกคำนำหน้า ชื่อ นามสกุล และเพศ อัตโนมัติ
        const parsed = parsePatientName(formData.patientName);

        const newPatientPayload = {
            id: finalHn,
            hn: finalHn,
            prefix: parsed.prefix,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            gender: parsed.gender,
            phone1: formData.phones[0] || '',
            lineId: formData.lineId,
            facebook: formData.facebook,
            instagram: formData.instagram,
            tiktok: formData.tiktok,
            createdAt: new Date().toISOString()
        };
        try {
            await callAppScript('SAVE_DATA', 'Patients', newPatientPayload);
            setPatientsData([newPatientPayload, ...patientsData]);
            showToast(`เพิ่มผู้ป่วยใหม่ ${finalHn} เข้าระบบแล้ว`, 'success');
        } catch (error) {
            console.error("Failed to auto-create patient", error);
        }
    }

    const isoDate = convertThaiToISO(formData.datetime);

    const payload = {
        id: editingId || `APPT${Date.now()}`,
        hn: finalHn,
        patientName: formData.patientName,
        datetime: formData.datetime,
        doctor: formData.doctor,
        reason: formData.reason,
        status: formData.status,
        phone: formData.phones, 
        lineId: formData.lineId,
        facebook: formData.facebook,
        instagram: formData.instagram,
        tiktok: formData.tiktok,
        serviceType: formData.serviceType,
        rawDeliveryStart: isoDate,
        rawDateTime: isoDate,
        name: formData.patientName || finalHn,
        artist: formData.doctor,
        category: formData.reason,
        dealStatus: formData.status
    };
    
    try {
        await callAppScript('SAVE_DATA', 'Queue', payload); 
        if (editingId) setQueueData(queueData.map(a => a.id === editingId ? payload : a));
        else setQueueData([payload, ...queueData]);
        
        closeApptModal(); 
        showToast(editingId ? 'แก้ไขนัดหมายสำเร็จ' : 'เพิ่มนัดหมายสำเร็จ', 'success');
    } catch(e) {
        showToast('บันทึกไม่สำเร็จ', 'error');
    }
    setIsProcessing(false);
  };

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
            <div key={`mobile-appt-${appt.id || index}`} onClick={() => handleOpenEdit(appt, true)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]" style={{ animationDelay: `${(index % 20) * 50}ms` }}>
                
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
            activities={queueData} 
            onEventClick={(ev) => handleOpenEdit(ev.originalData || ev, true)} 
            onDayClick={(date) => console.log('Day clicked:', date)} 
            dealStatuses={systemStatusTypes} 
         />
      );
  }, [queueData]); // เรนเดอร์ปฏิทินใหม่เฉพาะตอนข้อมูลนัดหมายมีการเพิ่ม/ลบ/แก้ไข เท่านั้น!

  return (
    <>
      <div className="fade-in pb-10">
        
        {/* --- 1. Sticky Header ย่อขนาดได้ ปรับ z-index เป็น 30 --- */}
        <div ref={headerRef} className="sticky top-0 z-30 w-full pointer-events-none transition-all duration-300">
          {/* ปรับปรุงตรงนี้ให้เป็น Glassmorphism effect เมื่อ Scroll หน้าจอ */}
          <div className={`w-full pointer-events-auto transition-all duration-500 ease-out ${isApptHeaderScrolled ? 'bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]' : 'bg-transparent'}`}>
            <div className={`w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 transition-all duration-300 ${isApptHeaderScrolled ? 'pt-4 pb-2 sm:pb-3' : 'pt-4 md:pt-8 pb-4'}`}>
              <div>
                <h1 className={`font-bold text-slate-800 tracking-tight transition-all duration-300 ${isApptHeaderScrolled ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>ระบบนัดหมาย</h1>
                <p className={`text-slate-500 mt-1 transition-all duration-300 text-xs sm:text-base ${isApptHeaderScrolled ? 'opacity-0 h-0 overflow-hidden m-0' : 'opacity-100 h-auto'}`}>จัดการคิวนัดหมายของคนไข้และแพทย์</p>
              </div>
              <button onClick={handleOpenAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} ${isApptHeaderScrolled ? 'p-2.5 sm:px-6 sm:py-3 text-sm' : 'p-3 sm:px-6 sm:py-3'}`}>
                <Plus size={isApptHeaderScrolled ? 18 : 20} /> <span className="hidden sm:inline">เพิ่มนัดหมายใหม่</span>
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
        <div ref={filterRef} className="sticky z-20 w-full pointer-events-none transition-all duration-300" style={{ top: headerHeight }}>
          <div className="w-full mx-auto pointer-events-none relative h-[88px] z-50">
            <div className={`absolute left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 transition-all duration-300 ease-in-out pointer-events-auto origin-top ${isFilterStuck ? 'w-full mt-0 py-3 px-4 md:px-8 2xl:px-12 border-b shadow-sm rounded-b-[2rem] rounded-t-none' : 'w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] 2xl:w-[calc(100%-6rem)] mt-2 p-4 rounded-[2rem] border shadow-sm'}`}>
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
            {isGlobalLoading ? (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-4 p-12 bg-white h-[30vh]">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
                  <p className="font-medium text-slate-500">กำลังเตรียมข้อมูล...</p>
                </div>
            ) : (
                <div className="px-2 sm:px-4 py-4">
                    {/* --- Desktop View (Table) --- */}
                    <div className="hidden lg:block overflow-x-auto">
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
                              {memoizedApptTableRows}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Mobile View (Cards) --- */}
                    <div className="lg:hidden space-y-4 mt-2">
                        {memoizedApptMobileCards}
                        {filteredData.length === 0 && (
                            <div className="text-center py-10 text-slate-400 kanit-text bg-slate-50 rounded-2xl border border-slate-100 border-dashed">ไม่พบข้อมูลการนัดหมาย</div>
                        )}
                    </div>

                    {isLoadingMore && (
                       <div className="w-full py-8 text-center fade-in">
                           <div className="flex flex-col items-center justify-center gap-3">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                              <span className="text-sm font-medium text-slate-500 kanit-text">กำลังโหลดข้อมูลเพิ่มเติม...</span>
                           </div>
                       </div>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${isModalClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-2xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
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
                <button onClick={closeApptModal} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
              <form id="appt-form" onSubmit={handleSaveAppt} className="pb-2">
                <fieldset disabled={isViewMode} className="space-y-5 border-none p-0 m-0 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* ค้นหา HN หรือ ชื่อคนไข้ (เพิ่ม z-index ป้องกัน Dropdown โดนช่องอื่นทับ) */}
                    <div className="md:col-span-2 relative" style={{ zIndex: 20 }}>
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
                                 {patientsData.filter(p => {
                                    const fName = getPatientFullName(p).toLowerCase();
                                    const fId = getPatientId(p).toLowerCase();
                                    const s = formData.searchPatient.toLowerCase();
                                    return fName.includes(s) || fId.includes(s);
                                 }).slice(0, 5).map((p, i) => (
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
                        <select className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm appearance-none cursor-pointer font-data" value={formData.serviceType} onChange={(e) => setFormData({...formData, serviceType: e.target.value})}>
                            <option value="">เลือกประเภทบริการ</option>
                            <option value="ตรวจโรคทั่วไป">ตรวจโรคทั่วไป</option>
                            <option value="ทันตกรรม">ทันตกรรม</option>
                            <option value="ความงาม/ผิวพรรณ">ความงาม/ผิวพรรณ</option>
                            <option value="ศัลยกรรม">ศัลยกรรม</option>
                            <option value="ตรวจสุขภาพ">ตรวจสุขภาพ</option>
                            <option value="ติดตามอาการ">ติดตามอาการ</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">สถานะนัดหมาย</label>
                        <select className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-medium appearance-none cursor-pointer font-data" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                            <option value="pending">🟡 รอยืนยัน (Pending)</option>
                            <option value="confirmed">🟢 ยืนยันแล้ว (Confirmed)</option>
                            <option value="cancelled">🔴 ยกเลิก (Cancelled)</option>
                        </select>
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
                       <button type="button" onClick={closeApptModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ปิดหน้าต่าง</button>
                       <button type="button" onClick={(e) => { e.preventDefault(); setIsViewMode(false); }} className={`flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 ${theme.primary} rounded-xl flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate`}><Pencil size={18} className="shrink-0" /> แก้ไขข้อมูล</button>
                    </>
                ) : (
                    <>
                       <button type="button" onClick={closeApptModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ยกเลิก</button>
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

      {showApptCalendar && (
        <div className="fixed inset-0 z-[110]">
          <div className={`absolute inset-0 bg-slate-900/10 backdrop-blur-sm ${isApptCalClosing ? 'backdrop-animate-out' : 'fade-in'}`} onClick={closeApptCalendar}></div>
          <div className={`absolute z-[115] w-[300px] max-w-[85vw] max-h-[80dvh] overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 p-4 sm:p-5 origin-top-left ${isApptCalClosing ? 'modal-animate-out' : 'modal-animate-in'}`} style={{ top: apptCalendarPos.top + 8, left: Math.min(apptCalendarPos.left, window.innerWidth - 310) }}>
            {apptCalView === 'days' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear(), apptCalDate.getMonth() - 1, 1))} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setApptCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1 rounded-xl hover:bg-slate-50 transition-colors text-sm kanit-text">{thaiMonths[apptCalDate.getMonth()]} {apptCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear(), apptCalDate.getMonth() + 1, 1))} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (<div key={d} className={`text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {Array.from({ length: new Date(apptCalDate.getFullYear(), apptCalDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-8 h-8"></div>)}
                  {Array.from({ length: new Date(apptCalDate.getFullYear(), apptCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const isSelected = apptCalDate.getDate() === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === apptCalDate.getMonth() && new Date().getFullYear() === apptCalDate.getFullYear();
                    return (
                      <button key={day} type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear(), apptCalDate.getMonth(), day))} className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md' : isToday ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            )}
            {apptCalView === 'months' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear() - 1, apptCalDate.getMonth(), 1))} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setApptCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1 rounded-xl text-sm font-data">{apptCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setApptCalDate(new Date(apptCalDate.getFullYear() + 1, apptCalDate.getMonth(), 1))} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setApptCalDate(new Date(apptCalDate.getFullYear(), i, 1)); setApptCalView('days');}} className={`py-3 rounded-2xl text-xs font-bold transition-all kanit-text ${apptCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            {apptCalView === 'years' && (
                <div className="space-y-3">
                <div className="flex justify-between items-center mb-2 px-1">
                  <button type="button" onClick={() => setApptYearPageStart(y => y - 12)} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={18} /></button>
                  <span className="font-bold text-slate-800 text-sm font-data">{apptYearPageStart} - {apptYearPageStart + 11}</span>
                  <button type="button" onClick={() => setApptYearPageStart(y => y + 12)} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => apptYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setApptCalDate(new Date(y - 543, apptCalDate.getMonth(), 1)); setApptCalView('months');}} className={`py-3 rounded-2xl text-xs font-bold transition-all font-data ${(apptCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200">
                    <Clock size={14} className="text-sky-500" />
                    <select className="bg-transparent text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center w-8 font-data" value={apptTime.h} onChange={e => setApptTime({...apptTime, h: e.target.value})}>
                        {Array.from({length:24}, (_,i)=>String(i).padStart(2,'0')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-slate-400 font-bold kanit-text">:</span>
                    <select className="bg-transparent text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center w-8 font-data" value={apptTime.m} onChange={e => setApptTime({...apptTime, m: e.target.value})}>
                        {Array.from({length:60}, (_,i)=>String(i).padStart(2,'0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                
                <div className="flex gap-1.5">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setApptCalDate(now);
                          setApptTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0')});
                          setApptCalView('days');
                    }} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors kanit-text">ปัจจุบัน</button>
                    <button type="button" onClick={() => {
                          const d = String(apptCalDate.getDate()).padStart(2, '0');
                          const m = String(apptCalDate.getMonth() + 1).padStart(2, '0');
                          const y = apptCalDate.getFullYear() + 543;
                          setFormData({...formData, datetime: `${d}/${m}/${y} ${apptTime.h}:${apptTime.m} น.`});
                          closeApptCalendar();
                    }} className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg shadow-md transition-colors kanit-text">ตกลง</button>
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
            <div className="flex gap-3 w-full"><button onClick={closeApptAlert} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">ยกเลิก</button><button onClick={sweetAlert.onConfirm} className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-colors shadow-lg shadow-rose-500/30 kanit-text">ยืนยันลบ</button></div>
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

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const d = String(currentTime.getDate()).padStart(2, '0');
  const m = String(currentTime.getMonth() + 1).padStart(2, '0');
  const y = currentTime.getFullYear() + 543;
  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight kanit-text">ภาพรวมคลินิก</h1>
          <p className="text-slate-500 mt-1 kanit-text">ข้อมูลสรุปประจำวันของสาขานี้</p>
        </div>
        <div className="px-4 py-2 bg-sky-50 rounded-2xl text-sky-600 font-medium flex items-center gap-2 font-data">
          <CalendarRange size={18} />{`${d}/${m}/${y}`} เวลา {currentTime.toLocaleTimeString('th-TH')} น.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="คิววันนี้" value={GOOGLE_SCRIPT_URL ? "0" : "24"} icon={Users} color="sky" />
        <StatCard title="รายได้ (บาท)" value={GOOGLE_SCRIPT_URL ? "0" : "45,200"} icon={CreditCard} color="emerald" />
        <StatCard title="สินค้าใกล้หมด" value={GOOGLE_SCRIPT_URL ? "0" : "5"} icon={AlertCircle} color="rose" />
        <StatCard title="สาขาที่เปิด" value={GOOGLE_SCRIPT_URL ? "0" : "2"} icon={MapPin} color="slate" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${theme.card}`}>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 kanit-text">แนวโน้มคนไข้ {GOOGLE_SCRIPT_URL ? '' : '(จำลอง)'}</h3>
          <div className="h-64 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 kanit-text">
            {GOOGLE_SCRIPT_URL ? 'ไม่มีข้อมูลสถิติ' : '[ กราฟแสดงแนวโน้มคนไข้ ]'}
          </div>
        </div>
        <div className={theme.card}>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 kanit-text">คิวถัดไป</h3>
          <div className="space-y-4">
            {GOOGLE_SCRIPT_URL ? <div className="text-center py-8 text-slate-400 text-sm kanit-text">ไม่มีคิวถัดไป</div> : [1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold font-data">{i}</div>
                <div><p className="font-semibold text-slate-700 kanit-text">คุณลูกค้า ท่านที่ {i}</p><p className="text-sm text-slate-500 flex items-center gap-1 font-data"><Clock size={14} /> 10:{i * 15} น. - <span className="kanit-text">ตรวจทั่วไป</span></p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MedicalRecords = ({ patientsData, setPatientsData, currentBranch, callAppScript, showToast, isGlobalLoading }) => {
  // --- 1. State Declarations ---
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [sweetAlert, setSweetAlert] = useState({ isOpen: false, type: '', title: '', text: '', onConfirm: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false); 
  
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRecordsScrolled, setIsRecordsScrolled] = useState(false);

  const initialFormState = {
    hn: '', prefix: '', firstName: '', lastName: '', nickname: '', dob: '', gender: '', idCard: '', nationality: 'ไทย', ethnicity: 'ไทย', religion: 'พุทธ', occupation: '',
    address: '', moo: '', road: '', subDistrict: '', district: '', province: '', zipcode: '', phone1: '', phone2: '', emName: '', emRelation: '', emPhone: '', emAddress: '',
    bloodGroup: '', chiefComplaint: '', allergies: '', underlyingDisease: '', createdAt: '', opdRecords: []
  };
  
  const [formData, setFormData] = useState(initialFormState);
  
  const initialOpdState = { datetime: '', doctor: '', temp: '', pulse: '', bp: '', weight: '', height: '', cc: '', dx: '', tx: [''], note: '' };
  const [showOpdForm, setShowOpdForm] = useState(false);
  const [isClosingOpdForm, setIsClosingOpdForm] = useState(false);
  const [newOpdRecord, setNewOpdRecord] = useState(initialOpdState);
  const [editingOpdIndex, setEditingOpdIndex] = useState(null);

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
  const [isAlertClosing, setIsAlertClosing] = useState(false);

  // Fix: Use refs instead of direct DOM manipulation
  const dobWrapperRef = React.useRef(null);
  const opdWrapperRef = React.useRef(null);
  const opdSectionRef = React.useRef(null);
  const opdFormSectionRef = React.useRef(null);

  const closeMedModal = () => { setIsModalClosing(true); setTimeout(() => { setIsModalOpen(false); setIsModalClosing(false); }, 300); };
  const closeMedCalendar = () => { setIsCalendarClosing(true); setTimeout(() => { setShowCalendar(false); setIsCalendarClosing(false); }, 300); };
  const closeMedOpdCalendar = () => { setIsOpdCalendarClosing(true); setTimeout(() => { setShowOpdCalendar(false); setIsOpdCalendarClosing(false); }, 300); };
  const closeMedAlert = () => { setIsAlertClosing(true); setTimeout(() => { setSweetAlert(prev => ({...prev, isOpen: false})); setIsAlertClosing(false); }, 300); };

  // --- Constants ---
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // --- 2. Helper Functions ---
  const generateNextHN = (patients) => {
    if (!patients || patients.length === 0) return 'HN0001';
    let maxNum = 0;
    patients.forEach(p => {
       const numMatch = (p.hn || p.id || '').match(/\d+/);
       if (numMatch && parseInt(numMatch[0], 10) > maxNum) maxNum = parseInt(numMatch[0], 10);
    });
    return `HN${String(maxNum + 1).padStart(4, '0')}`;
  };

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

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });

  // --- 3. Derived State (Memos & Filtering) ---
  const calculatedAge = useMemo(() => getAgeString(formData.dob), [formData.dob]);
  const blankDays = Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthDays = Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

  const filteredPatients = patientsData.filter(p => {
    const pBranchId = p.branchId || 'b1'; 
    return ((p.name && p.name.includes(search)) || (p.id && p.id.includes(search)) || (p.hn && p.hn.includes(search)) || (p.idCard && p.idCard.includes(search)) || (p.phone && p.phone.includes(search))) && 
           (currentBranch === 'all' || pBranchId === currentBranch);
  });

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
            // Fix Date Sorting Bug: Convert DD/MM/YYYY to YYYYMMDD for correct string comparison
            aValue = a.dob ? a.dob.split('/').reverse().join('') : '';
            bValue = b.dob ? b.dob.split('/').reverse().join('') : '';
        }
        if (sortConfig.key === 'lastVisit') {
            // Fix Date Sorting Bug: Convert DD/MM/YYYY to YYYYMMDD for correct string comparison
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

  // --- 4. Effects & Infinity Scroll Logic ---
  useEffect(() => {
    // Fix: Use ID instead of element selector
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      
      setIsRecordsScrolled(scrollTop > 20);
      
      // เช็คว่าเลื่อนลงมาเกือบถึงล่างสุดหรือยัง (เหลืออีก 100px)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        // เช็คว่ายังมีข้อมูลเหลือให้แสดง และไม่ได้กำลังโหลดอยู่
        if (visibleCount < sortedPatients.length && !isLoadingMore) {
           setIsLoadingMore(true);
           
           // หน่วงเวลา 1 วินาทีให้ดูเหมือนกำลังโหลด
           setTimeout(() => {
              setVisibleCount(prev => prev + 20); // โหลดเพิ่มทีละ 20 รายการ
              setIsLoadingMore(false);
           }, 1000);
        }
      }
    };

    mainElement.addEventListener('scroll', handleScroll);
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
    
    setFormData({ 
      ...initialFormState, ...patient, hn: patient.hn || patient.id,
      prefix: patient.prefix || parsed.prefix,
      firstName: patient.firstName || parsed.firstName, 
      lastName: patient.lastName || parsed.lastName, 
      gender: patient.gender || parsed.gender,
      phone1: patient.phone1 || patient.phone || '',
      createdAt: patient.createdAt || new Date().toISOString(), opdRecords: patient.opdRecords || []
    });
    setShowOpdForm(false); setEditingOpdIndex(null); setIsViewMode(isView); setIsModalOpen(true);
    
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
    setShowOpdForm(false); setEditingOpdIndex(null); setIsViewMode(false); setIsModalOpen(true);
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
      phone: updatedFormData.phone1,
      id: editingId || updatedFormData.hn
    };

    try {
      await callAppScript('SAVE_DATA', 'Patients', combinedData);
      setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
      setIsProcessing(false);
      showToast('บันทึกประวัติการรักษาเรียบร้อยแล้ว', 'success');
    } catch (error) {
      setIsProcessing(false);
      showToast('เกิดข้อผิดพลาดในการบันทึกประวัติการรักษา', 'error');
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
          phone: updatedFormData.phone1,
          id: editingId || updatedFormData.hn
        };

        try {
          await callAppScript('SAVE_DATA', 'Patients', combinedData);
          setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
          setIsProcessing(false);
          showToast('ลบประวัติการรักษาเรียบร้อยแล้ว', 'success');
        } catch (error) {
          setIsProcessing(false);
          showToast('เกิดข้อผิดพลาดในการลบประวัติการรักษา', 'error');
        }
      }
    });
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Fix: Generate HN at save time to avoid duplicate HN race condition
    const currentHn = editingId || formData.hn || generateNextHN(patientsData);
    const combinedData = {
      ...formData,
      name: `${formData.prefix}${formData.firstName} ${formData.lastName}`.trim(),
      phone: formData.phone1,
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
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
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
          showToast('ลบข้อมูลเรียบร้อยแล้ว', 'success');
        } catch (error) {
          setIsProcessing(false);
          showToast('ลบข้อมูลไม่สำเร็จ', 'error');
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
        <td className="py-4 text-right pr-6">
          <div className="flex justify-end gap-2 transition-opacity">
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
            <div key={`mobile-${getPatientId(patient)}-${index}`} onClick={() => handleOpenEdit(patient, true)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]" style={{ animationDelay: `${(index % 20) * 50}ms` }}>
                
                {/* แถวที่ 1: รหัส HN, ป้ายสถานะ และปุ่มจัดการ */}
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2.5">
                        <span className="font-black text-sky-600 text-base kanit-text tracking-wide">{getPatientId(patient)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${isNewPatient ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            {isNewPatient ? 'ผู้ป่วยใหม่' : 'ผู้ป่วยเก่า'}
                        </span>
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

                {/* แถวที่ 4: ปุ่มจัดการ (ย้ายมาไว้ด้านล่าง สัดส่วน 1:1) */}
                <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Trash2 size={16} /> ลบ
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient, false); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Pencil size={16} /> แก้ไข
                    </button>
                </div>
            </div>
        );
    });
  }, [sortedPatients, visibleCount]);

  return (
    <>
      <div className="fade-in pb-10">
        <div className="sticky top-0 z-30 w-full pointer-events-none transition-all duration-300">
          <div className={`w-full pointer-events-auto transition-all duration-500 ease-out ${isRecordsScrolled ? 'bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]' : 'bg-transparent'}`}>
            {/* เปลี่ยน max-w-7xl เป็น w-full และเพิ่ม 2xl:px-12 ให้เท่ากับหน้านัดหมาย */}
            <div className={`w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 transition-all duration-300 ${isRecordsScrolled ? 'pt-4 pb-2 sm:pb-3' : 'pt-4 md:pt-8 pb-4'}`}>
              <div>
                <h1 className={`font-bold text-slate-800 tracking-tight kanit-text transition-all duration-300 ${isRecordsScrolled ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>ระบบเวชระเบียน</h1>
                <p className={`text-slate-500 mt-1 kanit-text transition-all duration-300 text-xs sm:text-base ${isRecordsScrolled ? 'opacity-0 h-0 overflow-hidden m-0' : 'opacity-100 h-auto'}`}>จัดการข้อมูลคนไข้ ศูนย์รวมข้อมูลทุกสาขา</p>
              </div>
              <button onClick={handleOpenAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} kanit-text ${isRecordsScrolled ? 'p-2.5 sm:px-6 sm:py-3 text-sm' : 'p-3 sm:px-6 sm:py-3'}`}>
                <Plus size={isRecordsScrolled ? 18 : 20} /> <span className="hidden sm:inline">เพิ่มประวัติใหม่</span>
              </button>
            </div>
          </div>
          
          {/* เปลี่ยน max-w-7xl เป็น w-full */}
          <div className="w-full mx-auto pointer-events-none relative h-[88px] z-50">
            {/* ปรับแก้โครงสร้างให้เหมือน Sticky Search ของหน้านัดหมาย เพื่อให้แสดงผลลอยและยืดได้ถูกต้อง */}
            <div className={`absolute left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 transition-all duration-300 ease-in-out pointer-events-auto origin-top ${isRecordsScrolled ? 'w-full mt-0 py-3 px-4 md:px-8 2xl:px-12 border-b shadow-sm rounded-b-[2rem] rounded-t-none' : 'w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] 2xl:w-[calc(100%-6rem)] mt-2 p-4 rounded-[2rem] border shadow-sm'}`}>
              <div className="relative w-full">
                <input type="text" placeholder="ค้นหาชื่อ, รหัส HN, เบอร์โทร หรือเลขบัตรประชาชน..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data" />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* แก้ไข: ลบ theme.card ออก และปรับ mt-4 ให้กล่องกว้างเท่ากับหน้านัดหมายเป๊ะๆ */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden p-0 sm:p-0">
            {isGlobalLoading ? (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-4 p-12 h-[30vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div><p className="font-medium text-slate-500 kanit-text">กำลังเตรียมข้อมูล...</p>
              </div>
            ) : (
              <div className="px-2 sm:px-4 py-4">
                
                {/* --- Desktop View (Table) --- */}
                <div className="hidden lg:block overflow-x-auto">
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
                        <th className="pt-6 pb-4 font-medium text-right pr-6 kanit-text">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memoizedPatientTableRows}
                    </tbody>
                  </table>
                </div>

                {/* --- Mobile View (Cards) --- */}
                <div className="lg:hidden space-y-4 mt-2">
                    {memoizedPatientMobileCards}
                    {sortedPatients.length === 0 && (
                        <div className="text-center py-10 text-slate-400 kanit-text bg-slate-50 rounded-2xl border border-slate-100 border-dashed">ไม่พบข้อมูลผู้ป่วย</div>
                    )}
                </div>

                {isLoadingMore && (
                   <div className="w-full py-8 text-center fade-in">
                       <div className="flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                          <span className="text-sm font-medium text-slate-500 kanit-text">กำลังโหลดข้อมูลเพิ่มเติม...</span>
                       </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${isModalClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-5xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            {/* แก้ไข UX/UI ส่วนหัว Modal เวชระเบียน */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                    {isViewMode ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : (editingId ? <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">{editingId ? `${formData.hn} - ${formData.prefix}${formData.firstName} ${formData.lastName}` : 'เพิ่มเวชระเบียนใหม่'}</h3>
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
                    <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 kanit-text"><Clock size={16} className="text-slate-400" /><span>ลงทะเบียน: {formatDateTime(formData.createdAt)}</span></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">HN <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} bg-slate-100 text-slate-500 cursor-not-allowed font-data`} value={formData.hn} disabled readOnly /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">คำนำหน้า <span className="text-rose-500">*</span></label><select required className={`${theme.input} appearance-none cursor-pointer font-data`} value={formData.prefix} onChange={(e) => setFormData({...formData, prefix: e.target.value})}><option value="">เลือก</option><option value="นาย">นาย</option><option value="นาง">นาง</option><option value="นางสาว">นางสาว</option><option value="ด.ช.">ด.ช.</option><option value="ด.ญ.">ด.ญ.</option><option value="พระ">พระ</option></select></div>
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
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เพศ <span className="text-rose-500">*</span></label><select required className={`${theme.input} appearance-none cursor-pointer font-data`} value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}><option value="">เลือก</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option><option value="ไม่ระบุ">ไม่ระบุ</option></select></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมายเลขบัตรประชาชน/พาสปอร์ต</label><input type="text" className={`${theme.input} font-data`} value={formData.idCard} onChange={(e) => setFormData({...formData, idCard: e.target.value})} maxLength="13" /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">สัญชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เชื้อชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.ethnicity} onChange={(e) => setFormData({...formData, ethnicity: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ศาสนา</label><input type="text" className={`${theme.input} font-data`} value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาชีพ</label><input type="text" className={`${theme.input} font-data`} value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} /></div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
                  <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><MapPin size={20} /> ข้อมูลติดต่อ</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่)</label><input type="text" className={`${theme.input} font-data`} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่</label><input type="text" className={`${theme.input} font-data`} value={formData.moo} onChange={(e) => setFormData({...formData, moo: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.road} onChange={(e) => setFormData({...formData, road: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.subDistrict} onChange={(e) => setFormData({...formData, subDistrict: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.zipcode} onChange={(e) => setFormData({...formData, zipcode: e.target.value})} maxLength="5" /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ 1 <span className="text-rose-500">*</span></label><input required type="tel" className={`${theme.input} font-data`} value={formData.phone1} onChange={(e) => setFormData({...formData, phone1: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ 2</label><input type="tel" className={`${theme.input} font-data`} value={formData.phone2} onChange={(e) => setFormData({...formData, phone2: e.target.value})} /></div>
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

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
                  <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Stethoscope size={20} /> ข้อมูลสุขภาพเบื้องต้น</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่เลือด</label><select className={`${theme.input} appearance-none cursor-pointer font-data`} value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}><option value="">ไม่ทราบ</option><option value="A">A</option><option value="B">B</option><option value="O">O</option><option value="AB">AB</option></select></div>
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
                                <div className="relative flex-1">
                                  <select className={`${theme.input} bg-white py-2 text-sm appearance-none cursor-pointer pr-10 font-data`} value={treatment} onChange={(e) => {
                                      const updatedTx = [...newOpdRecord.tx];
                                      updatedTx[txIndex] = e.target.value;
                                      setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                  }}>
                                    <option value="">เลือกการรักษา</option>
                                    <option value="ซักประวัติ/ตรวจร่างกาย">ซักประวัติ/ตรวจร่างกาย</option>
                                    <option value="จ่ายยา">จ่ายยา</option>
                                    <option value="ฉีดยา">ฉีดยา</option>
                                    <option value="ทำแผล">ทำแผล</option>
                                    <option value="เจาะเลือด/ส่งตรวจแล็บ">เจาะเลือด/ส่งตรวจแล็บ</option>
                                    <option value="เอกซเรย์">เอกซเรย์</option>
                                    <option value="ส่งต่อผู้ป่วย (Refer)">ส่งต่อผู้ป่วย (Refer)</option>
                                    <option value="ให้คำปรึกษา/แนะนำ">ให้คำปรึกษา/แนะนำ</option>
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                  </div>
                                </div>
                                {newOpdRecord.tx.length > 1 && (
                                  <button type="button" onClick={() => {
                                      const updatedTx = newOpdRecord.tx.filter((_, i) => i !== txIndex);
                                      setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                  }} className="px-3 bg-white text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors flex items-center justify-center">
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
                      <div className="hidden lg:block overflow-x-auto">
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

                      {/* --- Mobile View (Cards) --- */}
                      <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                          {formData.opdRecords.map((record, index) => (
                              <div key={`opd-mobile-${index}`} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors space-row-animation" style={{ animationDelay: `${(index % 20) * 50}ms` }}>
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

                                  {/* ปุ่มจัดการ (ย้ายมาไว้ด้านล่าง สัดส่วน 1:1) */}
                                  <div className="grid grid-cols-2 gap-2 pt-1">
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
        <div className="fixed inset-0 z-[110]">
          <div className={`absolute inset-0 bg-slate-900/10 backdrop-blur-sm ${isCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`} onClick={closeMedCalendar}></div>
          <div className={`absolute z-[115] w-[300px] max-w-[85vw] max-h-[80dvh] overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 p-4 sm:p-5 origin-top-left ${isCalendarClosing ? 'modal-animate-out' : 'modal-animate-in'}`} style={{ top: calendarPos.top + 8, left: Math.min(calendarPos.left, window.innerWidth - 310) }}>
            {calView === 'days' && (
              <>
                <div className="flex justify-between items-center mb-4"><button type="button" onClick={handlePrevMonth} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><button type="button" onClick={() => setCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors kanit-text">{thaiMonths[calDate.getMonth()]} {calDate.getFullYear() + 543}</button><button type="button" onClick={handleNextMonth} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}</div>
                <div className="grid grid-cols-7 gap-1 text-center">{blankDays.map(b => <div key={`blank-${b}`} className="w-8 h-8"></div>)}{monthDays.map(day => {
                  const isSelected = formData.dob === `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}`;
                  const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();
                  return (<button key={day} type="button" onClick={() => handleSelectDate(day)} className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 transform scale-110' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>)
                })}</div>
              </>
            )}
            {calView === 'months' && (
              <>
                <div className="flex justify-between items-center mb-6"><button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors font-data">{calDate.getFullYear() + 543}</button><button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-3 gap-2">{thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 rounded-2xl text-sm font-medium transition-all kanit-text ${calDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}</div>
              </>
            )}
            {calView === 'years' && (
              <>
                <div className="flex justify-between items-center mb-6"><button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><span className="font-bold text-slate-800 px-3 py-1.5 font-data">{yearPageStart} - {yearPageStart + 11}</span><button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-3 gap-2">{Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 rounded-2xl text-sm font-medium transition-all font-data ${(calDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- ปฏิทินประวัติการรักษา (OPD Calendar) แสดงผลชั้นบนสุด ทะลุ Modal --- */}
      {showOpdCalendar && (
        <div className="fixed inset-0 z-[110]">
          <div className={`absolute inset-0 bg-slate-900/10 backdrop-blur-sm ${isOpdCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`} onClick={closeMedOpdCalendar}></div>
          <div className={`absolute z-[115] w-[300px] max-w-[85vw] max-h-[80dvh] overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 p-4 sm:p-5 origin-top-left ${isOpdCalendarClosing ? 'modal-animate-out' : 'modal-animate-in'}`} style={{ top: opdCalendarPos.top + 8, left: Math.min(opdCalendarPos.left, window.innerWidth - 310) }}>
            {opdCalView === 'days' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() - 1, 1))} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setOpdCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1 rounded-xl hover:bg-slate-50 transition-colors text-sm kanit-text">{thaiMonths[opdCalDate.getMonth()]} {opdCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() + 1, 1))} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (<div key={d} className={`text-[10px] font-bold uppercase tracking-wider kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {Array.from({ length: new Date(opdCalDate.getFullYear(), opdCalDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-8 h-8"></div>)}
                  {Array.from({ length: new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const isSelected = opdCalDate.getDate() === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === opdCalDate.getMonth() && new Date().getFullYear() === opdCalDate.getFullYear();
                    return (
                      <button key={day} type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth(), day))} className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            )}
            {opdCalView === 'months' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear() - 1, opdCalDate.getMonth(), 1))} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setOpdCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1 rounded-xl text-sm font-data">{opdCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear() + 1, opdCalDate.getMonth(), 1))} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setOpdCalDate(new Date(opdCalDate.getFullYear(), i, 1)); setOpdCalView('days');}} className={`py-3 rounded-2xl text-xs font-bold transition-all kanit-text ${opdCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            {opdCalView === 'years' && (
                <div className="space-y-3">
                <div className="flex justify-between items-center mb-2 px-1">
                  <button type="button" onClick={() => setOpdYearPageStart(y => y - 12)} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={18} /></button>
                  <span className="font-bold text-slate-800 text-sm font-data">{opdYearPageStart} - {opdYearPageStart + 11}</span>
                  <button type="button" onClick={() => setOpdYearPageStart(y => y + 12)} className="p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => opdYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setOpdCalDate(new Date(y - 543, opdCalDate.getMonth(), 1)); setOpdCalView('months');}} className={`py-3 rounded-2xl text-xs font-bold transition-all font-data ${(opdCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            {/* Time & Action Panel */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200">
                    <Clock size={14} className="text-sky-500" />
                    <select className="bg-transparent text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center w-8 font-data" value={opdTime.h} onChange={e => setOpdTime({...opdTime, h: e.target.value})}>
                        {Array.from({length:24}, (_,i)=>String(i).padStart(2,'0')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-slate-400 font-bold kanit-text">:</span>
                    <select className="bg-transparent text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center w-8 font-data" value={opdTime.m} onChange={e => setOpdTime({...opdTime, m: e.target.value})}>
                        {Array.from({length:60}, (_,i)=>String(i).padStart(2,'0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                
                <div className="flex gap-1.5">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setOpdCalDate(now);
                          setOpdTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0')});
                          setOpdCalView('days');
                    }} className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors kanit-text">ปัจจุบัน</button>
                    <button type="button" onClick={() => {
                          const d = String(opdCalDate.getDate()).padStart(2, '0');
                          const m = String(opdCalDate.getMonth() + 1).padStart(2, '0');
                          const y = opdCalDate.getFullYear() + 543;
                          setNewOpdRecord({...newOpdRecord, datetime: `${d}/${m}/${y} ${opdTime.h}:${opdTime.m} น.`});
                          closeMedOpdCalendar();
                    }} className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg shadow-md transition-colors kanit-text">ตกลง</button>
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
    </>
  );
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currentBranch, setCurrentBranch] = useState('b1');
  const [isScrolled, setIsScrolled] = useState(false);

  // --- เพิ่มระบบจำตำแหน่ง Scroll ของแต่ละหน้า ---
  const mainRef = React.useRef(null);
  const scrollPositions = React.useRef({});

  const handleTabClick = (tabId) => {
    // บันทึกตำแหน่ง Scroll ปัจจุบันก่อนเปลี่ยนหน้า
    if (mainRef.current) {
      scrollPositions.current[currentTab] = mainRef.current.scrollTop;
    }
    setCurrentTab(tabId);
  };

  // ใช้ useLayoutEffect เพื่อเซ็ตตำแหน่ง Scroll ก่อนเบราว์เซอร์วาดหน้าจอ (ป้องกันภาพกระตุก)
  React.useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = scrollPositions.current[currentTab] || 0;
    }
  }, [currentTab]);

  const [patientsData, setPatientsData] = useState(GOOGLE_SCRIPT_URL ? [] : mockPatients);
  const [queueData, setQueueData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // แจ้งเตือนแบบ State ปลอดภัยที่สุด แสดงบนสุดและไม่ทำให้จอโหลดใหม่ซ้อน
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
        const resPatients = await callAppScript('GET_DATA', 'Patients');
        // แก้ไข: เอา .slice(0, 20) ออก เพื่อดึงข้อมูลทั้งหมดมาให้ Infinity Scroll ทำหน้าที่แบ่งหน้าเอง
        if (resPatients && resPatients.status === 'success') { 
          setPatientsData(resPatients.data && resPatients.data.length > 0 ? resPatients.data.reverse() : []); 
        }
        
        // เพิ่มคำสั่งดึงข้อมูลตารางนัดหมาย (Queue)
        const resQueue = await callAppScript('GET_DATA', 'Queue');
        if (resQueue && resQueue.status === 'success') {
          setQueueData(resQueue.data && resQueue.data.length > 0 ? resQueue.data.reverse() : []);
        }

      } catch (error) { showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลเริ่มต้นได้', 'error'); } 
      finally { setIsDataFetched(true); setIsGlobalLoading(false); }
    };
    fetchInitialData();
  }, [isDataFetched]);

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'records', label: 'เวชระเบียน', icon: Users },
    { id: 'queue', label: 'นัดหมาย', icon: CalendarRange },
    { id: 'pos', label: 'POS', icon: Calculator },
    { id: 'inventory', label: 'คลังสินค้า', icon: Package },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
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

      {/* แก้ไข: เพิ่ม flex-col md:flex-row เพื่อให้รองรับ Header แนวนอนบนมือถือ */}
      <div className="flex h-screen overflow-hidden w-full flex-col md:flex-row relative">
        
        <aside className={`hidden md:flex flex-col w-64 ${theme.glassPanel} relative z-40 border-r border-slate-200/50 shrink-0`}>
          <div className="p-6 flex items-center gap-3 border-b border-slate-100/50">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/30"><Stethoscope size={24} /></div>
            <div><h2 className="font-bold text-slate-800 leading-tight kanit-text">Clinic<span className="text-sky-500">Hub</span></h2><p className="text-xs text-slate-400 kanit-text">Management System</p></div>
          </div>
          <div className="px-4 py-4">
            <select value={currentBranch} onChange={(e) => setCurrentBranch(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-sm rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none cursor-pointer kanit-text"><option value="all">ดูข้อมูลทุกสาขารวม</option>{GOOGLE_SCRIPT_URL ? null : mockBranches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}</select>
          </div>
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (<button key={item.id} onClick={() => handleTabClick(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 kanit-text ${currentTab === item.id ? 'bg-sky-500 shadow-md shadow-sky-500/20 text-white font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><item.icon size={20} className={currentTab === item.id ? 'opacity-100' : 'opacity-70'} />{item.label}</button>))}
          </nav>
          <div className="p-4 border-t border-slate-100/50">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Users size={16} /></div><div className="text-left"><p className="text-xs font-semibold text-slate-700 kanit-text">Admin User</p><p className="text-[10px] text-slate-400 kanit-text">ออนไลน์</p></div></div>
          </div>
        </aside>

        {/* --- Mobile Top Header --- */}
        <header className="md:hidden flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 shrink-0 shadow-sm relative">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/30">
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg leading-none kanit-text tracking-tight mt-0.5">Clinic<span className="text-sky-500">Hub</span></h2>
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
        <main id="main-scroll-container" ref={mainRef} className="flex-1 overflow-y-auto pb-24 md:pb-0 w-full relative custom-scrollbar" style={{ overflowAnchor: 'none' }}>
          <div className="min-h-full">
            {/* Fix: Render all tabs with display:none to preserve scroll and states (fixes unmount memory leak & scroll jump) */}
            <div style={{ display: currentTab === 'dashboard' ? 'block' : 'none' }}>
                <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><Dashboard /></div>
            </div>
            <div style={{ display: currentTab === 'records' ? 'block' : 'none' }}>
                <MedicalRecords patientsData={patientsData} setPatientsData={setPatientsData} currentBranch={currentBranch} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} />
            </div>
            <div style={{ display: currentTab === 'queue' ? 'block' : 'none' }}>
                <AppointmentManager queueData={queueData} setQueueData={setQueueData} patientsData={patientsData} setPatientsData={setPatientsData} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} />
            </div>
            {currentTab === 'pos' && <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><PlaceholderPage title="ระบบ POS (การเงิน)" desc="ออกบิล รับชำระเงิน และจัดการใบเสร็จ" icon={Calculator} /></div>}
            {currentTab === 'inventory' && <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><PlaceholderPage title="ระบบคลังสินค้า" desc="จัดการสต๊อกยาและเวชภัณฑ์ (เช็คข้ามสาขาได้)" icon={Package} /></div>}
            {currentTab === 'reports' && <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><PlaceholderPage title="รายงานระดับองค์กร" desc="ดูสถิติ รายได้ และประสิทธิภาพการทำงานของคลินิก" icon={BarChart3} /></div>}
            {currentTab === 'branches' && <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8"><PlaceholderPage title="จัดการสาขา" desc="ตั้งค่า เพิ่ม/ลด ข้อมูลของแต่ละสาขา" icon={Building2} /></div>}
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
          className="fixed left-1/2 -translate-x-1/2 z-[9999] fade-in w-[90vw] sm:w-auto max-w-sm sm:max-w-md"
          style={{ top: 'max(1rem, env(safe-area-inset-top))', marginTop: '0.5rem' }}
        >
          <div className={`flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${toast.type === 'success' ? 'bg-emerald-500/95 border-emerald-400' : 'bg-rose-500/95 border-rose-400'} text-white`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> : <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />}
            <span className="font-medium kanit-text text-sm sm:text-base leading-tight break-words">{toast.message}</span>
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

        /* กำหนดจังหวะการเด้ง (ใหญ่ขึ้นไปที่ 1.05 แล้วหดลงมาที่ 0.98 ก่อนหยุดที่ 1.0) */
        @keyframes bounceIn { 
            0% { transform: scale(0.6); opacity: 0; } 
            55% { transform: scale(1.05); opacity: 1; } 
            80% { transform: scale(0.98); opacity: 1; }
            100% { transform: scale(1); opacity: 1; } 
        }30
        
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

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
        .fade-in-up { animation: fadeInUp 0.25s ease-out forwards; }
        .fade-out-up { animation: fadeOutUp 0.25s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

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
      `}} />
    </div>
  );
}