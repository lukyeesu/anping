import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CalendarDay from './CalendarDay';
import { systemStatusTypes, colorPresets, EMPTY_ARRAY, monthsTH, monthsShortTH, daysTH, daysShortTH } from '../global/constants';
import { rAFThrottle, formatDate, formatDateTime, formatStatNumber, getDynamicTextSize, parsePatientName, getPatientFullName, generateNextHN, getAgeString, getPatientId, useModal, useSwipeDown, getPatientLastVisitStr, formatCurPrint, bahtTextPrint, globalGenerateInformedConsentHtml, globalGenerateRecordHtml, globalGenerateOpdHtml, globalGenerateMedicalCertificateHtml, globalGenerateReceiptHtml, getEffectiveApptStatus, getEffectiveApptDatetimeStr, getEffectiveApptIsoDate, parseThaiDateToISO, parseAnyDate, isSameDay, formatFinTime, formatFinCurrency, getFinDynamicTextClass } from '../global/helpers';
import { 
  LayoutDashboard, Users, CalendarRange, Calculator, 
  Package, BarChart3, Settings, Building2, Search, 
  Plus, X, CheckCircle2, AlertCircle, MapPin, Phone,
  Clock, Stethoscope, FileText, Pill, CreditCard, ShieldCheck, AlertOctagon,
  Pencil, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown, Loader2,
  User, Briefcase, Table as TableIcon, CalendarDays, LayoutList, List, Truck,
  ShoppingCart, Tag, Minus, Banknote, QrCode, Receipt, ScanText, Camera, Upload, History, Activity,
  TrendingUp, TrendingDown, Download, Filter, Printer, ShoppingBag, XCircle,
  UserCog, BadgeCheck, Wallet, CalendarClock, DollarSign, Award, CalendarX2, HeartPulse, UserPlus, Mail, CheckSquare, Volume2, Megaphone, Link, ExternalLink, LogOut,
  Lock, Home, Save, UserCheck, Key, RotateCcw
} from 'lucide-react';
import { theme } from '../global/theme';

const CalendarView = ({ activities, onEventClick, onDayClick, dealStatuses = [], transportStatuses = [], staffData = [], onEventDrop, onMonthChange, isLoading, roleLabels = {}, staffCategories = [] }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); 
  const [selectedDayDetails, setSelectedDayDetails] = useState(null); 
  const [isDayModalClosing, setIsDayModalClosing] = useState(false); 
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalDate, setStaffModalDate] = useState(null);

  const handleDayClick = React.useCallback((day, events) => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      setSelectedDayDetails({ date, events });
  }, [viewDate]);

  const handleShowStaff = React.useCallback((day) => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      setStaffModalDate(date);
      setShowStaffModal(true);
  }, [viewDate]);

  const doctorsOnDutyMap = useMemo(() => {
      const map = {};
      const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
          const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
          const dateStr = `${String(d).padStart(2,'0')}/\ ${String(viewDate.getMonth()+1).padStart(2,'0')}/${viewDate.getFullYear()+543}`.replace('/ ', '/');
          const dayOfWeek = currentDate.getDay();
          
          map[d] = staffData.filter(s => {
              if (s.role !== 'doctor' || !s.schedule) return false;
              const specificData = s.schedule[dateStr];
              if (specificData !== undefined) return specificData.active;
              if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) return s.schedule[dayOfWeek].active;
              if (Array.isArray(s.schedule)) return s.schedule.includes(dayOfWeek);
              return false;
          });
      }
      return map;
  }, [viewDate, staffData]);


  // --- [LAZY LOADING] เมื่อเปลี่ยนเดือน ให้แจ้งคอมโพเนนต์แม่เพื่อโหลดข้อมูลเพิ่ม ---
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(viewDate.getFullYear(), viewDate.getMonth());
    }
  }, [viewDate.getFullYear(), viewDate.getMonth(), onMonthChange]);
  const [viewModeState, setViewModeState] = useState('month'); // Fallback if name conflict
  
  const closeStaffModal = () => setShowStaffModal(false);
  const staffSwipeHandlers = useSwipeDown(closeStaffModal);

  // --- [PERFORMANCE OPTIMIZATION 1] ใช้ Ref เก็บฟังก์ชัน เพื่อป้องกัน Stale Closures และไม่ทำให้ React ล้างแคชปฏิทินทิ้ง ---
  const onEventClickRef = useRef(onEventClick);
  const onEventDropRef = useRef(onEventDrop);
  const onDayClickRef = useRef(onDayClick);

  useEffect(() => {
      onEventClickRef.current = onEventClick;
      onEventDropRef.current = onEventDrop;
      onDayClickRef.current = onDayClick;
  }, [onEventClick, onEventDrop, onDayClick]);

  // --- ระบบ Custom Drag & Drop Engine (ทำงานแบบ 60FPS ล้วนโดยไม่แตะ React State) ---
  const dragState = useRef({
    isDragging: false, element: null, clone: null, eventData: null,
    startX: 0, startY: 0, offsetX: 0, offsetY: 0, shiftY: 0, currentDropzone: null, holdTimer: null
  });

  // ใช้ useCallback หุ้มเพื่อให้ Pointer Down นิ่งสนิทตลอดการใช้งาน 
  const handlePointerDown = React.useCallback((e, ev) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; 
    e.stopPropagation();

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    if (dragState.current.holdTimer) clearTimeout(dragState.current.holdTimer);

    if (dragState.current.clone && dragState.current.clone.parentNode) {
        dragState.current.clone.parentNode.removeChild(dragState.current.clone);
    }

    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const shiftY = isTouch ? 45 : 15;

    dragState.current = {
      isDragging: false, element: target, clone: null, eventData: ev,
      startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      shiftY: shiftY,
      currentDropzone: null, holdTimer: null
    };

    const startDragging = () => {
      const state = dragState.current;
      state.isDragging = true;
      document.body.classList.add('is-custom-dragging');

      const clone = target.cloneNode(true);
      clone.classList.remove('hover:opacity-80', 'active:cursor-grabbing');

      clone.style.width = `${target.offsetWidth}px`;
      clone.style.height = `${target.offsetHeight}px`;
      clone.style.position = 'fixed';
      clone.style.zIndex = '999999';
      clone.style.opacity = '1'; 
      clone.style.pointerEvents = 'none'; 
      clone.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 2px #0ea5e9';
      clone.style.margin = '0';
      clone.style.left = '0px';
      clone.style.top = '0px';
      
      clone.style.transform = `translate3d(${state.startX - state.offsetX}px, ${state.startY - state.offsetY - state.shiftY}px, 0) scale(1.15)`;
      clone.style.transition = 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)';
      
      setTimeout(() => {
          if (dragState.current.clone) {
              dragState.current.clone.style.transition = 'none'; 
          }
      }, 150);

      document.body.appendChild(clone);
      state.clone = clone;
      target.style.opacity = '0.15'; 
      
      if (navigator.vibrate && isTouch) navigator.vibrate(50);
    };

    if (isTouch) {
      dragState.current.holdTimer = setTimeout(startDragging, 200);
    }

    const handlePointerMove = (moveEvent) => {
      const state = dragState.current;
      if (!state.element) return;

      const dx = Math.abs(moveEvent.clientX - state.startX);
      const dy = Math.abs(moveEvent.clientY - state.startY);

      if (!state.isDragging && (dx > 5 || dy > 5)) {
        if (state.holdTimer) clearTimeout(state.holdTimer);
        if (e.pointerType === 'mouse') startDragging();
        else { dragState.current.element = null; return; }
      }

      if (state.isDragging) {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        
        if (state.clone) {
          state.clone.style.transform = `translate3d(${moveEvent.clientX - state.offsetX}px, ${moveEvent.clientY - state.offsetY - state.shiftY}px, 0) scale(1.15)`;
        }

        const elementsUnder = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
        const dropzoneEl = elementsUnder.find(el => el.classList && el.classList.contains('calendar-dropzone'));

        if (state.currentDropzone !== dropzoneEl) {
          if (state.currentDropzone) state.currentDropzone.classList.remove('dropzone-active');
          if (dropzoneEl) dropzoneEl.classList.add('dropzone-active');
          state.currentDropzone = dropzoneEl;
        }
      }
    };

    const handlePointerUp = (upEvent) => {
      const state = dragState.current;
      if (state.holdTimer) clearTimeout(state.holdTimer);

      let wasDragging = state.isDragging; 

      if (state.isDragging) {
        if (state.currentDropzone) {
          const dateStr = state.currentDropzone.getAttribute('data-date');
          // เลี่ยงใช้ onEventDrop ตรงๆ ให้เรียกผ่าน Ref เพื่อความเร็ว
          if (dateStr && onEventDropRef.current) {
            const [d, m, y] = dateStr.split('/');
            const dateObj = new Date(y - 543, m - 1, d);
            onEventDropRef.current(state.eventData.id, dateObj);
          }
        }
      } else {
        const dx = Math.abs(upEvent.clientX - state.startX);
        const dy = Math.abs(upEvent.clientY - state.startY);
        if (dx < 5 && dy < 5 && state.eventData) {
          if (onEventClickRef.current) onEventClickRef.current(state.eventData);
        }
      }

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);

      if (state.clone && state.clone.parentNode) state.clone.parentNode.removeChild(state.clone);
      if (state.element) state.element.style.opacity = '1';
      if (state.currentDropzone) state.currentDropzone.classList.remove('dropzone-active');
      document.body.classList.remove('is-custom-dragging');
      dragState.current = { isDragging: false, element: null, clone: null, eventData: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, shiftY: 0, currentDropzone: null, holdTimer: null };

      if (wasDragging) {
          const preventClick = (eClick) => {
              eClick.stopPropagation();
              eClick.preventDefault();
              window.removeEventListener('click', preventClick, true);
          };
          window.addEventListener('click', preventClick, true);
          setTimeout(() => window.removeEventListener('click', preventClick, true), 100);
      }
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  }, []);

  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const monthsShortTH = thaiMonthsShort;
  const daysTH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const daysShortTH = ['อา','จ','อ','พ','พฤ','ศ','ส'];

  const resolveStatus = (value, list) => {
      const found = list.find(s => s.value === value);
      if (found) return { label: found.label, color: found.color, type: found.type };
      const sys = systemStatusTypes.find(s => s.value === value);
      if (sys) return { label: sys.label, color: sys.color, type: sys.value };
      return { label: value || '-', color: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  const changePeriod = (offset) => {
    const newDate = new Date(viewDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + offset);
    else if (viewMode === 'week' || viewMode === 'list') newDate.setDate(newDate.getDate() + (offset * 7));
    else if (viewMode === 'day') newDate.setDate(newDate.getDate() + offset);
    setViewDate(newDate);
  };

  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
  };

  // --- [PERFORMANCE OPTIMIZATION] กรองข้อมูลให้เหลือเฉพาะเดือนที่กำลังดูอยู่ ---
  const filteredActivitiesForMonth = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // ขยายขอบเขตออกไปเล็กน้อย (เผื่อวันต้นเดือน/ปลายเดือนที่ติดมาใน Grid)
    const paddingStart = new Date(startOfMonth);
    paddingStart.setDate(paddingStart.getDate() - 7);
    const paddingEnd = new Date(endOfMonth);
    paddingEnd.setDate(paddingEnd.getDate() + 7);

    const getEventDateStr = (item) => {
        // ถ้ามี rawPostponedDate (คำนวณจาก save) ให้ใช้เลย
        if (item.rawPostponedDate) return item.rawPostponedDate;
        // ค้นหาวันที่เลื่อนนัดล่าสุดจาก postpone fields
        let lastPostponeDate = null;
        for (let i = 4; i >= 1; i--) {
            const pDate = item[`postpone${i}_date`];
            if (pDate) {
                lastPostponeDate = parseThaiDateToISO(pDate);
                break;
            }
        }
        if (lastPostponeDate) return lastPostponeDate;
        return item.rawDeliveryStart || item.rawDeliveryDateTime || item.rawDateTime;
    };

    return activities.filter(item => {
        const dateStr = getEventDateStr(item);
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= paddingStart && d <= paddingEnd;
    });
  }, [activities, viewDate]);

  const eventsMap = useMemo(() => {
    const map = {};
    const getEventDateStr = (item) => {
        if (item.rawPostponedDate) return item.rawPostponedDate;
        let lastPostponeDate = null;
        for (let i = 4; i >= 1; i--) {
            const pDate = item[`postpone${i}_date`];
            if (pDate) {
                lastPostponeDate = parseThaiDateToISO(pDate);
                break;
            }
        }
        if (lastPostponeDate) return lastPostponeDate;
        return item.rawDeliveryStart || item.rawDeliveryDateTime || item.rawDateTime;
    };

    filteredActivitiesForMonth.forEach(item => {
        const dateStr = getEventDateStr(item);
        if(!dateStr) return;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(item);
    });
    Object.keys(map).forEach(key => {
        map[key].sort((a, b) => new Date(getEventDateStr(a)) - new Date(getEventDateStr(b)));
    });
    return map;
  }, [filteredActivitiesForMonth]);

  const getEventsForDate = (dateObj) => {
    const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
    return eventsMap[key] || [];
  };

  const getDoctorOnDutyStatus = (dateObj) => {
      const dayOfWeek = dateObj.getDay(); 
      const dateStr = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()+543}`;
      const doctorsOnDuty = staffData.filter(s => {
          if (s.role !== 'doctor' || !s.schedule) return false;
          const specificData = s.schedule[dateStr];
          if (specificData !== undefined) return specificData.active;
          if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) return s.schedule[dayOfWeek].active;
          if (Array.isArray(s.schedule)) return s.schedule.includes(dayOfWeek);
          return false;
      });
      return doctorsOnDuty;
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
        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 z-[160] fade-in">
            <div 
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm ${isDayModalClosing ? 'backdrop-animate-out' : 'animate-in fade-in duration-300'}`} 
                onClick={closeDayDetailsModal} 
            />
            <div className={`bg-white w-full max-w-5xl rounded-[1.5rem] sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80dvh] sm:max-h-[90dvh] ${isDayModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
                <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 gap-3 shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-sky-100 text-sky-600 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-inner shrink-0 mt-1 sm:mt-0">
                            <span className="text-[8px] sm:text-[10px] font-bold uppercase leading-none">{daysShortTH[date.getDay()]}</span>
                            <span className="text-lg sm:text-2xl font-black leading-none mt-0.5">{date.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 pr-2">
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-xl font-bold text-slate-800 truncate leading-tight">รายการประจำวัน</h3>
                                <p className="text-slate-500 text-[10px] sm:text-sm font-medium truncate mt-0.5">{daysTH[date.getDay()]}ที่ {date.getDate()} {monthsTH[date.getMonth()]} {date.getFullYear()+543}</p>
                            </div>
                            <button 
                                onClick={() => { setStaffModalDate(date); setShowStaffModal(true); }}
                                className="flex items-center w-fit gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border transition-all hover:shadow-sm active:scale-95 cursor-pointer shrink-0 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                title="คลิกเพื่อดูรายชื่อพนักงานที่เข้างานวันนี้"
                            >
                                <Users size={14} className="sm:w-[16px] sm:h-[16px]" />
                                <span className="text-[10px] sm:text-xs font-bold kanit-text">บุคลากรเข้างาน</span>
                            </button>
                        </div>
                    </div>
                    <button onClick={closeDayDetailsModal} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition shadow-sm shrink-0 self-start">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar bg-slate-50/30">
                   {events.length > 0 ? (
                       <>
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto overflow-y-hidden">
                                <table className="table-auto w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text"><th className="p-4 font-bold w-[10%] text-center">HN/เวลา</th><th className="p-4 font-bold w-[25%]">คนไข้/อาการ</th><th className="p-4 font-bold w-[15%] text-center">เบอร์โทร</th><th className="p-4 font-bold w-[20%]">แพทย์</th><th className="p-4 font-bold w-[15%]">สถานะ</th><th className="p-4 font-bold w-[15%] text-right">จัดการ</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {events.map((ev, idx) => {
                                            const statusInfo = resolveStatus(getEffectiveApptStatus(ev), dealStatuses);
                                            const timeStr = ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : (ev.rawDateTime ? new Date(ev.rawDateTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '-');
                                            return (
                                                <tr key={ev.id || idx} onClick={() => onEventClickRef.current && onEventClickRef.current(ev)} className="hover:bg-sky-50/30 cursor-pointer transition-colors group">
                                                    <td className="p-4 font-bold text-slate-700 whitespace-nowrap align-top text-center">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className="font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg text-xs w-fit whitespace-nowrap">{ev.hn || '-'}</span>
                                                            <span className="mt-1 text-sm font-data">{timeStr} น.</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="font-bold text-slate-800 flex items-center flex-wrap gap-1">{ev.name} {(Number(ev.postponeCount) > 0 || ev.postpone1_date || ev.postponedDate) && <span title="นัดหมายนี้เคยถูกเลื่อนมาแล้ว" className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md align-middle font-bold kanit-text"><Clock size={10} /> เคยเลื่อนนัด</span>}</div>
                                                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit mt-1.5 truncate max-w-[200px]">{ev.category || '-'}</div>
                                                    </td>
                                                    <td className="p-4 align-top text-center">
                                                        <div className="flex justify-center">
                                                            {(ev.phone && (Array.isArray(ev.phone) ? ev.phone[0] : ev.phone)) ? (
                                                                <a href={`tel:${Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center justify-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg w-fit transition-colors font-data">
                                                                    <Phone size={14} /> {Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}
                                                                </a>
                                                            ) : <span className="text-slate-400">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="text-sm font-bold text-sky-600">{ev.artist || '-'}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{ev.customer ? `Sale: ${ev.customer}` : ''}</div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-col gap-1.5 items-start">
                                                            <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${statusInfo.color}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-400').replace('-50', '-500')}`}></div>
                                                                {statusInfo.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top text-right">
                                                        <button className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไข">
                                                            <Pencil size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="md:hidden space-y-3">
                            {events.map((ev, idx) => {
                                const statusInfo = resolveStatus(getEffectiveApptStatus(ev), dealStatuses);
                                const timeStr = ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : (ev.rawDateTime ? new Date(ev.rawDateTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '-');
                                return (
                                    <div key={ev.id || idx} onClick={() => onEventClickRef.current && onEventClickRef.current(ev)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 active:scale-95 transition-transform cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md text-[10px] w-fit whitespace-nowrap">{ev.hn || '-'}</span>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600 font-data">{timeStr} น.</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end shrink-0 ml-2">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${statusInfo.color}`}>
                                                    <div className={`w-1 h-1 rounded-full ${statusInfo.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-400').replace('-50', '-500')}`}></div>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <h4 className="font-bold text-slate-800 text-sm line-clamp-2 flex items-center flex-wrap gap-1">{ev.name} {(Number(ev.postponeCount) > 0 || ev.postpone1_date || ev.postponedDate) && <span title="นัดหมายนี้เคยถูกเลื่อนมาแล้ว" className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md align-middle font-bold kanit-text"><Clock size={10} /> เคยเลื่อนนัด</span>}</h4>
                                            <div className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1 truncate max-w-full">{ev.category || '-'}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-semibold text-slate-400 mb-0.5">แพทย์</p>
                                                <p className="font-bold text-sky-600 truncate">{ev.artist || '-'}</p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-semibold text-slate-400 mb-0.5">คนไข้</p>
                                                <p className="font-semibold text-slate-700 truncate">{ev.customer || '-'}</p>
                                            </div>
                                            {(ev.phone && (Array.isArray(ev.phone) ? ev.phone[0] : ev.phone)) && (
                                                <div className="col-span-2 mt-0.5">
                                                    <p className="text-[9px] font-semibold text-slate-400 mb-0.5">เบอร์โทร</p>
                                                    <a href={`tel:${Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-600 font-bold font-data text-[11px] sm:text-xs mt-0.5 w-fit bg-sky-50 px-2 py-0.5 rounded-md transition-colors">
                                                        <Phone size={10} className="sm:w-3 sm:h-3" /> {Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                       </>
                   ) : (
                       <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                           <CalendarIcon size={48} className="opacity-20 mb-4" />
                           <p className="kanit-text font-bold text-lg">ไม่มีรายการนัดหมาย</p>
                       </div>
                   )}
                </div>
            </div>
        </div>
      );

      return createPortal(modalContent, document.body);
  };

  const renderStaffScheduleModal = () => {
      // (คงโค้ดเดิมไว้ เพื่อไม่ให้กระทบ Modal ของการเข้างาน)
      if (!showStaffModal || !staffModalDate) return null;

      const dayOfWeek = staffModalDate.getDay();
      const dateStr = `${String(staffModalDate.getDate()).padStart(2,'0')}/${String(staffModalDate.getMonth()+1).padStart(2,'0')}/${staffModalDate.getFullYear()+543}`;

      const workingStaff = staffData.filter(s => {
          if (!s.schedule) return false;
          const specificData = s.schedule[dateStr];
          if (specificData !== undefined) return specificData.active;
          if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) return s.schedule[dayOfWeek].active;
          if (Array.isArray(s.schedule)) return s.schedule.includes(dayOfWeek);
          return false;
      });

      // จัดกลุ่มพนักงานตามตำแหน่งแบบไดนามิก โดยใช้ staffCategories (บทบาท) แทน role (สิทธิ์เข้าระบบ)
      const categoriesList = (staffCategories && staffCategories.length > 0) ? staffCategories : ['แพทย์', 'สต๊าฟ/พนักงาน'];
      const categoryLabels = {};
      const groupedStaff = {};
      
      categoriesList.forEach(cat => {
          const val = cat === 'แพทย์' ? 'doctor' : cat === 'สต๊าฟ/พนักงาน' ? 'staff' : cat;
          categoryLabels[val] = cat;
          groupedStaff[val] = workingStaff.filter(s => s.category === val || s.category === cat);
      });
      
      // รวบรวมพนักงานที่มีบทบาทอื่นนอกเหนือจากที่กำหนด
      const mappedCats = Object.keys(categoryLabels);
      const otherStaff = workingStaff.filter(s => !mappedCats.includes(s.category) && !categoriesList.includes(s.category));
      if (otherStaff.length > 0) {
          groupedStaff['other'] = otherStaff;
          categoryLabels['other'] = 'อื่นๆ';
      }

      const roleColors = {
          doctor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          nurse: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          sale: 'text-amber-600 bg-amber-50 border-amber-200',
          admin: 'text-slate-600 bg-slate-100 border-slate-200',
          staff: 'text-sky-600 bg-sky-50 border-sky-200'
      };
      
      Object.keys(categoryLabels).forEach(key => {
          if (!roleColors[key]) {
              roleColors[key] = 'text-sky-600 bg-sky-50 border-sky-200';
          }
      });
      if (!roleColors['other']) {
          roleColors['other'] = 'text-slate-600 bg-slate-100 border-slate-200';
      }

      const modalContent = (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm fade-in">
              <div className="absolute inset-0" onClick={closeStaffModal}></div>
              <div ref={staffSwipeHandlers.ref} style={staffSwipeHandlers.style} className="bg-white rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden modal-animate-in relative z-10 mobile-bottom-sheet">
                  <div className="py-4 -mt-4 mb-2 sm:hidden flex justify-center w-full touch-none cursor-grab active:cursor-grabbing shrink-0">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full pointer-events-none"></div>
                  </div>
                  
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shadow-inner">
                              <Users size={20} className="sm:w-6 sm:h-6" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 kanit-text text-base sm:text-lg">บุคลากรที่เข้างาน</h3>
                              <p className="text-[10px] sm:text-xs text-slate-500 font-medium kanit-text">{daysTH[dayOfWeek]}ที่ {staffModalDate.getDate()} {thaiMonths[staffModalDate.getMonth()]} {staffModalDate.getFullYear()+543}</p>
                          </div>
                      </div>
                      <button onClick={closeStaffModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                      {workingStaff.length > 0 ? (
                          <div className="space-y-6">
                              {Object.keys(groupedStaff).map(roleKey => {
                                  const staffs = groupedStaff[roleKey];
                                  if (!staffs || staffs.length === 0) return null;
                                  return (
                                      <div key={roleKey} className="space-y-3">
                                          <h4 className="font-bold text-slate-700 kanit-text text-sm flex items-center gap-2 border-b border-slate-200/60 pb-2">
                                              <span className={`w-2 h-2 rounded-full ${roleColors[roleKey]?.split(' ')[1] || 'bg-sky-400'}`}></span>
                                              {categoryLabels[roleKey] || roleKey} ({staffs.length})
                                          </h4>
                                          <div className="grid grid-cols-1 gap-2.5">
                                              {staffs.map(s => {
                                                  let timeStr = 'เวลาทำงานปกติ';
                                                  if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) {
                                                      timeStr = `${s.schedule[dayOfWeek].start} - ${s.schedule[dayOfWeek].end} น.`;
                                                  }
                                                  const specificData = s.schedule[dateStr];
                                                  if (specificData !== undefined) {
                                                      timeStr = `${specificData.start} - ${specificData.end} น.`;
                                                  }
                                                  return (
                                                      <div key={s.id} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center justify-between gap-3 hover:border-sky-200 transition-colors">
                                                          <div className="flex items-center gap-3 min-w-0">
                                                              {s.photo ? (
                                                                  <img src={s.photo} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm" />
                                                              ) : (
                                                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm text-lg ${roleKey==='doctor'?'bg-indigo-400':roleKey==='nurse'?'bg-emerald-400':roleKey==='sale'?'bg-amber-400':'bg-slate-400'}`}>{s.name.charAt(0)}</div>
                                                              )}
                                                              <div className="min-w-0">
                                                                  <p className="font-bold text-slate-800 kanit-text text-sm truncate leading-tight">{s.name}</p>
                                                                  <div className="text-[10px] text-slate-500 font-data truncate mt-0.5 flex items-center gap-1">
                                                                      <Phone size={10} className="text-slate-400 shrink-0" /> {s.phone || 'ไม่มีเบอร์ติดต่อ'}
                                                                  </div>
                                                              </div>
                                                          </div>
                                                          <div className="shrink-0 text-right">
                                                              <div className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center justify-center gap-1 whitespace-nowrap ${roleColors[roleKey]}`}>
                                                                  <Clock size={10} className="shrink-0" /> {timeStr}
                                                              </div>
                                                          </div>
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      ) : (
                          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                              <Users size={40} className="mx-auto mb-3 opacity-20" />
                              <p className="kanit-text font-bold text-sm">ไม่มีพนักงานลงตารางงานในวันนี้</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
      return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
  };

  // --- [PERFORMANCE OPTIMIZATION 2] Memoize ฟังก์ชันวาดกล่องนัดหมาย ---
  // ใช้ useCallback เพื่อป้องกันการสร้างฟังก์ชันใหม่ในหน่วยความจำทุกครั้งที่เมาส์ขยับ
  const renderEventItem = React.useCallback((ev, idx, compact = false) => {
     // พยายามหลีกเลี่ยงการ New Date ใหม่เยอะๆ (รับค่าเวลาที่ดึงง่ายๆ ไว้ล่วงหน้า)
     const timeStr = ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : (ev.rawDateTime ? new Date(ev.rawDateTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '');
     const displayText = `${timeStr ? timeStr + ' ' : ''}${ev.name} (${ev.artist || '-'})`;
     const statusInfo = resolveStatus(getEffectiveApptStatus(ev), dealStatuses);
     let itemColor = statusInfo.color || 'bg-slate-50 border-slate-200 text-slate-600';
     
     let dotColor = 'bg-slate-400';
     const preset = colorPresets.find(p => p.value === itemColor);
     if (preset) dotColor = preset.dot;
     else {
         if (itemColor.includes('emerald') || itemColor.includes('green')) dotColor = 'bg-emerald-500';
         else if (itemColor.includes('blue') || itemColor.includes('sky') || itemColor.includes('indigo')) dotColor = 'bg-sky-500';
         else if (itemColor.includes('amber') || itemColor.includes('yellow') || itemColor.includes('orange')) dotColor = 'bg-amber-500';
         else if (itemColor.includes('rose') || itemColor.includes('red') || itemColor.includes('pink')) dotColor = 'bg-rose-500';
         else if (itemColor.includes('purple') || itemColor.includes('violet')) dotColor = 'bg-violet-500';
     }

     return (
       <div 
          key={ev.id || idx} 
          onPointerDown={(e) => handlePointerDown(e, ev)}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'pan-y', userSelect: 'none' }} 
          className={`text-left rounded-[4px] sm:rounded-md border transition-colors w-full mb-0.5 sm:mb-1 xl:mb-1.5 flex items-center shrink-0 cursor-grab active:cursor-grabbing hover:opacity-80 ${itemColor} leading-none select-none
             ${compact ? 'p-0.5 sm:p-1 xl:p-1.5 min-h-[18px] sm:h-auto gap-0.5 sm:gap-1 xl:gap-1.5 justify-start overflow-hidden' : 'px-1.5 py-1 sm:px-2 sm:py-1 xl:px-3 xl:py-1.5 h-auto min-h-[16px] sm:min-h-[26px] xl:min-h-[32px] gap-1 xl:gap-2 truncate'}
          `}
          title={`${timeStr} ${ev.name} (${ev.artist})`}
       >
          <div className={`rounded-full shrink-0 ${dotColor} ${compact ? 'w-1.5 h-1.5 sm:w-1.5 sm:h-1.5 xl:w-2 xl:h-2' : 'w-1.5 h-1.5 sm:w-2 sm:h-2 xl:w-2.5 xl:h-2.5'}`}></div>
          <span className={`truncate flex items-center font-medium tracking-tighter font-data ${compact ? 'text-[8px] sm:text-[10px] xl:text-xs 2xl:text-[13px]' : 'text-[9px] sm:text-xs xl:text-sm 2xl:text-base'}`}>
             {displayText}
             {(Number(ev.postponeCount) > 0 || ev.postpone1_date || ev.postponedDate) && <span title="เคยเลื่อนนัด" className="inline-flex shrink-0 items-center bg-amber-100 text-amber-700 ml-1.5 px-1 py-0.5 rounded text-[8px] sm:text-[9px] leading-none border border-amber-200/50"><Clock size={8} className="mr-0.5" /> เลื่อน</span>}
          </span>
       </div>
     );
  }, [dealStatuses, handlePointerDown]);

  // --- [PERFORMANCE OPTIMIZATION 3] ห่อหุ้ม Grid ด้วย useMemo ---
  // ถัดจากนี้ปฏิทินในแต่ละแบบจะถูกเรนเดอร์ใหม่ *ต่อเมื่อ* วันที่ ข้อมูลนัด หรือข้อมูลหมอเปลี่ยนเท่านั้น
  // ถ้าแค่เปิด Modal หรือกดอะไรยิบย่อย มันจะดึง Cache มาโชว์เลย ทำให้เปิดปุ๊บติดปั๊บ 60FPS
  
  const monthViewContent = useMemo(() => {
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
                {(() => {
                    const emptyEndCount = (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7;
                    const totalCells = firstDayOfMonth + daysInMonth + emptyEndCount;
                    const cells = [];
                    for (let i = 0; i < firstDayOfMonth; i++) cells.push({ type: 'empty', key: `empty-start-${i}` });
                    for (let i = 1; i <= daysInMonth; i++) cells.push({ type: 'day', day: i, key: `day-${i}` });
                    for (let i = 0; i < emptyEndCount; i++) cells.push({ type: 'empty', key: `empty-end-${i}` });

                    return cells.map((cell, index) => {
                        let cornerClass = '';
                        if (index === totalCells - 7) cornerClass = 'rounded-bl-2xl sm:rounded-bl-3xl';
                        if (index === totalCells - 1) cornerClass = 'rounded-br-2xl sm:rounded-br-3xl';

                        if (cell.type === 'empty') {
                            return <div key={cell.key} className={`border-b border-r border-slate-100 bg-slate-50/40 aspect-[1/2] sm:aspect-square ${cornerClass}`}></div>;
                        }

                        const day = cell.day;
                        const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                        const events = eventsMap[`${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`] || EMPTY_ARRAY;
                        const isCurrent = isToday(currentDate);
                        const dateStr = `${String(day).padStart(2,'0')}/${String(viewDate.getMonth()+1).padStart(2,'0')}/${viewDate.getFullYear()+543}`;
                        
                        const docsOnThisDay = doctorsOnDutyMap[day] || EMPTY_ARRAY;
                        
                        return (
                            <CalendarDay 
                                key={day} 
                                day={day}
                                events={events}
                                isCurrent={isCurrent}
                                dateStr={dateStr}
                                cornerClass={cornerClass}
                                docsOnThisDay={docsOnThisDay}
                                onDayClick={handleDayClick}
                                onShowStaff={handleShowStaff}
                                renderEventItem={renderEventItem}
                                isLoading={isLoading}
                            />
                        );
                    });
                })()}
            </div>
        </div>
      );
  }, [viewDate, eventsMap, staffData, onDayClick, renderEventItem, isLoading]);

  const weekViewContent = useMemo(() => {
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
                         const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`;
                         const cornerClass = i === 0 ? 'rounded-bl-2xl sm:rounded-bl-3xl' : (i === 6 ? 'rounded-br-2xl sm:rounded-br-3xl' : '');

                         return (
                             <div 
                                key={i} 
                                data-date={dateStr}
                                onClick={() => setSelectedDayDetails({ date: d, events })}
                                className={`calendar-dropzone p-0.5 sm:p-2 flex flex-col gap-0.5 sm:gap-1 min-h-[120px] sm:min-h-[300px] hover:bg-slate-50 cursor-pointer overflow-y-auto custom-scrollbar transition-colors relative ${isCurrent ? 'bg-sky-50/30' : ''} ${cornerClass}`}
                             >
                                 <div className="flex flex-col gap-1 w-full h-full">
                                     {events.map((ev, idx) => renderEventItem(ev, idx, true))}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>
      );
  }, [viewDate, eventsMap, renderEventItem]);

  const dayViewContent = useMemo(() => {
      const events = getEventsForDate(viewDate);
      const isCurrentDay = isToday(viewDate);
      const docsOnDuty = getDoctorOnDutyStatus(viewDate);
      const hasDoctor = docsOnDuty.length > 0;
      
      return (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-3 sm:p-6 min-h-[400px]">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 shrink-0 border-b border-slate-100 pb-4 justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shadow-sm shrink-0 ${isCurrentDay ? 'bg-sky-500 text-white border-none' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}>
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase">{daysShortTH[viewDate.getDay()]}</span>
                          <span className="text-xl sm:text-2xl font-black leading-none">{viewDate.getDate()}</span>
                      </div>
                      <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{daysTH[viewDate.getDay()]}ที่ {viewDate.getDate()} {thaiMonths[viewDate.getMonth()]} {viewDate.getFullYear()+543}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm font-medium">{events.length} รายการนัดหมาย</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => { setStaffModalDate(viewDate); setShowStaffModal(true); }}
                      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:shadow-sm active:scale-95 cursor-pointer ${hasDoctor ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'}`}
                      title="คลิกเพื่อดูรายชื่อพนักงานที่เข้างานวันนี้"
                  >
                      {hasDoctor ? <BadgeCheck size={18} /> : <CalendarX2 size={18} />}
                      <span className="text-xs font-bold kanit-text">{hasDoctor ? `มีแพทย์ประจำกะ (${docsOnDuty.length} ท่าน)` : 'ไม่มีแพทย์ลงตารางวันนี้'}</span>
                  </button>
              </div>
              <button 
                  onClick={() => { setStaffModalDate(viewDate); setShowStaffModal(true); }}
                  className={`sm:hidden flex w-full items-center justify-center gap-2 px-3 py-2 mb-3 rounded-lg border transition-colors active:bg-opacity-70 ${hasDoctor ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
              >
                  {hasDoctor ? <BadgeCheck size={16} /> : <CalendarX2 size={16} />}
                  <span className="text-[11px] font-bold kanit-text">{hasDoctor ? `มีแพทย์ประจำกะ (${docsOnDuty.length} ท่าน)` : 'ไม่มีแพทย์ลงตารางวันนี้'}</span>
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 space-y-2 sm:space-y-3">
                  {events.length > 0 ? events.map((ev, idx) => {
                      const statusInfo = resolveStatus(getEffectiveApptStatus(ev), dealStatuses);
                      return (
                      <div key={idx} onClick={() => onEventClickRef.current && onEventClickRef.current(ev)} className="flex items-stretch gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all cursor-pointer bg-white group">
                          <div className="w-16 sm:w-20 text-center shrink-0 flex flex-col items-center justify-center gap-1">
                              <span className="font-bold text-sky-600 bg-sky-50 px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs w-full sm:w-fit whitespace-nowrap truncate">{ev.hn || '-'}</span>
                              <span className="text-xs sm:text-sm font-bold text-slate-600 block mt-0.5 font-data">{ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                          </div>
                          <div className="w-1 bg-slate-100 rounded-full group-hover:bg-sky-400 transition-colors shrink-0"></div>
                          <div className="flex-1 min-w-0 py-0.5 sm:py-1 flex flex-col justify-center">
                              <div className="flex flex-row justify-between items-start mb-0.5 gap-1">
                                  <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate pr-1">{ev.name}</h4>
                                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit shrink-0 ${statusInfo.color}`}>{statusInfo.label}</span>
                              </div>
                              {(ev.phone && (Array.isArray(ev.phone) ? ev.phone[0] : ev.phone)) ? (
                                  <a href={`tel:${Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold font-data text-[11px] sm:text-xs mt-0.5 w-fit bg-sky-50 px-2 py-0.5 rounded-md transition-colors">
                                      <Phone size={10} className="sm:w-3 sm:h-3" /> {Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}
                                  </a>
                              ) : null}
                              <p className="text-xs sm:text-sm text-slate-500 truncate flex items-center gap-1.5 mt-1.5">
                                  <span className="font-medium text-sky-600 truncate">แพทย์: {ev.artist || '-'}</span> 
                                  {ev.customer && <><span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">|</span> <span className="truncate">{ev.customer}</span></>}
                              </p>
                          </div>
                      </div>
                  )}) : (
                      <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-slate-400 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 border-dashed">
                          <div className="p-3 sm:p-4 bg-slate-50 rounded-full shadow-inner mb-3 sm:mb-4"><CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" /></div>
                          <p className="font-bold text-sm sm:text-lg text-slate-500">ไม่มีรายการในวันนี้</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }, [viewDate, eventsMap, staffData]);

  const listViewContent = useMemo(() => {
      const startOfWeek = new Date(viewDate);
      startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
      const days = Array.from({length: 7}, (_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          return d;
      });

      return (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-3 sm:p-6 overflow-y-auto custom-scrollbar min-h-[400px]">
              <h3 className="font-bold text-slate-800 mb-3 sm:mb-5 px-1 sm:px-2 flex items-center gap-2 text-sm sm:text-base"><List className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" /> รายการประจำสัปดาห์</h3>
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
                                      const statusInfo = resolveStatus(getEffectiveApptStatus(ev), dealStatuses);
                                      return (
                                      <div key={ev.id || idx} onClick={() => onEventClickRef.current && onEventClickRef.current(ev)} className="bg-white border border-slate-100 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl hover:shadow-md hover:border-sky-200 transition-all cursor-pointer flex items-stretch gap-2 sm:gap-4">
                                          <div className="text-xs font-bold text-slate-500 pt-1 w-14 sm:w-20 shrink-0 flex flex-col items-center justify-center gap-1.5">
                                              <span className="font-bold text-sky-600 bg-sky-50 px-1.5 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[9px] sm:text-xs w-full text-center truncate">{ev.hn || '-'}</span>
                                              <span className="font-data text-[10px] sm:text-xs text-center">{ev.rawDeliveryStart ? new Date(ev.rawDeliveryStart).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : '-'} น.</span>
                                          </div>
                                          <div className="flex-1 min-w-0 border-l border-slate-100 pl-2 sm:pl-4 flex flex-col justify-center">
                                              <div className="flex flex-row justify-between items-start mb-0.5 gap-1">
                                                  <span className="font-bold text-slate-800 text-sm sm:text-base truncate pr-1">{ev.name}</span>
                                                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit shrink-0 ${statusInfo.color}`}>{statusInfo.label}</span>
                                              </div>
                                              {(ev.phone && (Array.isArray(ev.phone) ? ev.phone[0] : ev.phone)) ? (
                                                  <a href={`tel:${Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold font-data text-[11px] sm:text-xs mt-0.5 w-fit bg-sky-50 px-2 py-0.5 rounded-md transition-colors"><Phone size={10} className="sm:w-3 sm:h-3" /> {Array.isArray(ev.phone) ? ev.phone[0] : ev.phone}</a>
                                              ) : null}
                                              <div className="text-[10px] sm:text-xs text-slate-500 mt-1.5 truncate flex items-center gap-1.5">
                                                  <span className="font-medium text-sky-600 truncate">แพทย์: {ev.artist || '-'}</span> 
                                                  {ev.customer && <><span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">•</span> <span className="truncate">{ev.customer}</span></>}
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
  }, [viewDate, eventsMap]);

  const getTitle = () => {
      if (viewMode === 'month') return `${thaiMonths[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
      if (viewMode === 'day') return `${viewDate.getDate()} ${thaiMonths[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
      if (viewMode === 'week' || viewMode === 'list') {
          const start = new Date(viewDate);
          start.setDate(start.getDate() - start.getDay());
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          if (start.getMonth() === end.getMonth()) {
              return `${start.getDate()} - ${end.getDate()} ${thaiMonths[start.getMonth()]} ${start.getFullYear() + 543}`;
          } else {
              return `${start.getDate()} ${monthsShortTH[start.getMonth()]} - ${end.getDate()} ${monthsShortTH[end.getMonth()]} ${end.getFullYear() + 543}`;
          }
      }
  };

  return (
    <div className="space-y-4 duration-500 flex flex-col h-full w-full relative z-10 fade-in">
       {renderDayDetailsModal()}
       {renderStaffScheduleModal()}
       
       <style>{`
          /* CSS กฎเหล็กเพื่อให้ Custom Drag & Drop ทำงานได้อย่างสมบูรณ์และไม่มีดีเลย์ */
          body.is-custom-dragging { touch-action: none !important; overflow: hidden !important; }
          body.is-custom-dragging * { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }
          
          /* ป้องกันการกระพริบเมื่อเมาส์ลากผ่านของข้างในช่องวันที่ */
          body.is-custom-dragging .calendar-dropzone * { pointer-events: none !important; }
          
          .calendar-dropzone { position: relative; }
          
          /* วาดกรอบสีฟ้า 4 ด้านเป๊ะๆ ให้อยู่ด้านบนสุดเวลาเมาส์ลากผ่าน */
          .calendar-dropzone.dropzone-active::after {
              content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
              border: 2px solid #0ea5e9 !important; background-color: rgba(224, 242, 254, 0.4) !important;
              z-index: 50 !important; pointer-events: none !important;
              box-shadow: inset 0 0 12px rgba(14, 165, 233, 0.25) !important; border-radius: inherit; 
          }
       `}</style>

       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/50 p-4 rounded-[1.5rem] border border-slate-100/80 shadow-sm">
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
             <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner border border-sky-100/50"><CalendarIcon className="w-6 h-6" /></div>
                 <div>
                     <h2 className="text-xl font-bold text-slate-800 kanit-text leading-tight">ปฏิทินงาน</h2>
                 </div>
             </div>
             <div className="flex items-center gap-1.5 bg-sky-50/50 px-3 py-1.5 rounded-xl border border-sky-100/50 lg:bg-transparent lg:border-none lg:p-0">
                <div className="w-full max-w-[6px] h-1.5 rounded-full bg-sky-400 animate-pulse"></div>
                <p className="text-xs sm:text-sm font-bold text-sky-600 font-data tracking-tight uppercase">{getTitle()}</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
             <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-sm shrink-0">
                 {[{ id: 'month', label: 'เดือน', icon: CalendarIcon }, { id: 'week', label: 'สัปดาห์', icon: TableIcon }, { id: 'day', label: 'วัน', icon: CalendarDays }, { id: 'list', label: 'รายการ', icon: LayoutList }].map(mode => (
                     <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${viewMode === mode.id ? 'bg-white text-sky-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                         <mode.icon size={14} className="shrink-0" /><span className="hidden sm:inline">{mode.label}</span>
                     </button>
                 ))}
             </div>
             <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 ml-auto lg:ml-0">
                <button onClick={() => changePeriod(-1)} className="p-1.5 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"><ChevronLeft size={16}/></button>
                <div className="w-px h-4 bg-slate-100 mx-1"></div>
                <button onClick={() => setViewDate(new Date())} className="px-3 py-1.5 text-sky-600 text-xs font-bold hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap">วันนี้</button>
                <div className="w-px h-4 bg-slate-100 mx-1"></div>
                <button onClick={() => changePeriod(1)} className="p-1.5 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"><ChevronRight size={16}/></button>
             </div>
          </div>
       </div>

       {viewMode === 'month' && monthViewContent}
       {viewMode === 'week' && weekViewContent}
       {viewMode === 'day' && dayViewContent}
       {viewMode === 'list' && listViewContent}
    </div>
  );
};

export default CalendarView;

