import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import StatCard from './StatCard';
import CalendarDay from './CalendarDay';
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

const Dashboard = ({ queueData = [], patientsData = [], isGlobalLoading, speak, currentBranch, branchesData = [], staffData = [], callAppScript, setQueueData, showToast }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const headerRef = React.useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [roomSelectorTarget, setRoomSelectorTarget] = useState(null);
  const [isRoomModalClosing, setIsRoomModalClosing] = useState(false);
  const [overviewDate, setOverviewDate] = useState(new Date());

  const activeBranch = branchesData.find(b => b.id === currentBranch);
  const availableRooms = activeBranch ? (activeBranch.rooms || []) : [];

  const closeRoomModal = () => {
    setIsRoomModalClosing(true);
    setTimeout(() => {
        setRoomSelectorTarget(null);
        setIsRoomModalClosing(false);
    }, 300);
  };

  const handleSpeakQueue = (appt, e) => {
    e.stopPropagation();
    if (isSpeaking) return;
    
    if (!currentBranch || currentBranch === 'all') {
        alert("กรุณาเลือกสาขาที่แถบข้างก่อน เพื่อระบุห้องตรวจ");
        return;
    }

    if (availableRooms.length === 0) {
        callPatient(appt, "");
        return;
    }

    setIsRoomModalClosing(false);
    setRoomSelectorTarget(appt);
  };

  const callPatient = (appt, roomName) => {
    setIsSpeaking(true);
    const idToUse = appt.id || appt.datetime;
    setSpeakingId(idToUse);
    
    // ปิด Modal ทันทีหรือจะใช้ closeRoomModal ก็ได้
    setRoomSelectorTarget(null);
    
    const rawName = appt.patientName || appt.name || '';
    const cleanName = rawName.replace(/^(นาย|นางสาว|นาง|นพ\.|พญ\.|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/g, '').trim();
    
    let textToSpeak = `ขอเชิญคุณ ${cleanName}`;
    if (roomName) textToSpeak += ` ที่ ${roomName} ค่ะ`;
    else textToSpeak += ` ที่เค้าเตอร์ค่ะ`;
    
    const onEnd = () => {
      setIsSpeaking(false);
      setSpeakingId(null);
    };

    speak(textToSpeak, onEnd);
  };

  const handleCompleteQueue = async (appt, e) => {
    if (e) e.stopPropagation();
    if (!appt.id) return;
    
    const updatedAppt = { ...appt, treated: true };
    setQueueData(prev => prev.map(item => item.id === appt.id ? updatedAppt : item));
    
    try {
      showToast('กำลังบันทึกสถานะคิว...', 'info');
      await callAppScript('SAVE_DATA', 'Queue', updatedAppt);
      showToast('บันทึกสถานะคิวเรียบร้อย', 'success');
    } catch(err) {
      console.error(err);
      showToast('ไม่สามารถซิงค์ข้อมูลกับฐานข้อมูลได้ กรุณาลองใหม่', 'warning');
    }
  };

  const handleUndoCompleteQueue = async (appt, e) => {
    if (e) e.stopPropagation();
    if (!appt.id) return;
    
    const updatedAppt = { ...appt, treated: false };
    setQueueData(prev => prev.map(item => item.id === appt.id ? updatedAppt : item));
    
    try {
      showToast('กำลังคืนสถานะคิว...', 'info');
      await callAppScript('SAVE_DATA', 'Queue', updatedAppt);
      showToast('คืนสถานะคิวเรียบร้อย', 'success');
    } catch(err) {
      console.error(err);
      showToast('ไม่สามารถซิงค์ข้อมูลกับฐานข้อมูลได้ กรุณาลองใหม่', 'warning');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ดักจับการ Scroll เฉพาะในหน้า Dashboard
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = rAFThrottle((e) => {
      const target = e.target || mainElement;
      if (headerRef.current) {
          if (target.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
          else headerRef.current.classList.remove('is-scrolled');
      }
    });

    // ตรวจสอบสถานะเริ่มต้นทันที
    setTimeout(() => {
        if (mainElement && headerRef.current) {
            if (mainElement.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
            else headerRef.current.classList.remove('is-scrolled');
        }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  const d = String(currentTime.getDate()).padStart(2, '0');
  const m = String(currentTime.getMonth() + 1).padStart(2, '0');
  const y = currentTime.getFullYear() + 543;

  // --- Calculate Dashboard Stats ---
  const todaysQueue = queueData.filter(appt => {
      const effectiveDt = getEffectiveApptDatetimeStr(appt);
      return isSameDay(effectiveDt, currentTime);
  });
  const pendingQueue = queueData.filter(appt => appt.status === 'pending' || appt.dealStatus === 'pending');
  
  // เรียงลำดับคิววันนี้ตามเวลา
  const sortedTodaysQueue = [...todaysQueue].sort((a, b) => {
      const effA = getEffectiveApptDatetimeStr(a);
      const effB = getEffectiveApptDatetimeStr(b);
      const timeA = effA.split(' ')[1] || '00:00';
      const timeB = effB.split(' ')[1] || '00:00';
      return timeA.localeCompare(timeB);
  });

  return (
    <div className="fade-in pb-10 w-full">
      
      {/* Sticky Header ย่อขนาดได้แบบ Glassmorphism (ควบคุมผ่าน CSS ล้วน) */}
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
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
        
        <div className={`w-full ${theme.card}`}>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 kanit-text flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-500" /> แนวโน้มการนัดหมาย (7 วันย้อนหลัง)</h3>
          <div className="h-64 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 kanit-text relative overflow-hidden">
            {isGlobalLoading ? <Loader2 className="w-8 h-8 animate-spin text-slate-300" /> : (() => {
                const points = [6,5,4,3,2,1,0].map((offset, idx) => {
                    const date = new Date();
                    date.setDate(date.getDate() - offset);
                    const count = queueData.filter(q => {
                        const effectiveDt = getEffectiveApptDatetimeStr(q);
                        return isSameDay(effectiveDt, date);
                    }).length;
                    const heightPercent = count === 0 ? 8 : Math.min(80, Math.max(12, count * 15));
                    // Elevate dot and line slightly above the bar volume for perfect visibility
                    const dotPercent = Math.min(95, heightPercent + 6);
                    return {
                        offset,
                        date,
                        count,
                        heightPercent,
                        dotPercent,
                        dateStr: `${date.getDate()}/${date.getMonth()+1}`
                    };
                });
                
                const linePath = points.map((p, idx) => {
                    const x = idx * 100 + 50;
                    const y = 160 - (p.dotPercent / 100) * 160;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                return (
                    <div className="flex flex-col justify-end h-full w-full p-4 sm:p-6 pt-10 relative">
                        {/* Chart Area */}
                        <div className="h-40 w-full relative">
                            {/* SVG Mixed Line Chart Overlay */}
                            <svg className="absolute left-0 right-0 top-0 h-full w-full pointer-events-none z-20" viewBox="0 0 700 160" preserveAspectRatio="none">
                                {/* Glow shadow for line */}
                                <path d={linePath} fill="none" stroke="rgba(14, 165, 233, 0.15)" strokeWidth="6.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                {/* Main Line */}
                                <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>

                            {/* Bar Columns Container */}
                            <div className="flex items-end h-full w-full relative">
                                {points.map((p, idx) => (
                                    <div key={p.offset} className="flex-1 flex items-end justify-center h-full relative group cursor-pointer z-10">
                                        {/* Beautiful Tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-md border border-slate-700/50 flex flex-col items-center">
                                            <span className="font-bold text-slate-300">{p.dateStr}</span>
                                            <span className="font-semibold text-sky-400">{p.count} นัดหมาย</span>
                                        </div>

                                        {/* Perfect Circle Dot */}
                                        <div className="absolute w-2.5 h-2.5 bg-white border-2 border-sky-500 rounded-full shadow-sm z-20 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: `${100 - p.dotPercent}%` }}></div>

                                        {/* Solid bar volume */}
                                        <div className="w-full max-w-[28px] sm:max-w-[36px] bg-sky-500 hover:bg-sky-600 rounded-t-xl transition-all relative" style={{ height: `${p.heightPercent}%` }}>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Labels Row */}
                        <div className="flex justify-between w-full mt-2">
                            {points.map((p, idx) => (
                                <span key={p.offset} className={`flex-1 text-center text-[10px] sm:text-xs font-medium font-data shrink-0 ${p.offset === 0 ? 'text-sky-600 font-bold' : 'text-slate-500'}`}>{p.dateStr}</span>
                            ))}
                        </div>
                    </div>
                );
            })()}
          </div>
        </div>

        {/* --- [NEW] ปฏิทินตารางการทำงานของพนักงาน (รายสัปดาห์) ในหน้าแดชบอร์ด --- */}
        {(() => {
            const handlePrevOverview = () => {
                const newDate = new Date(overviewDate);
                newDate.setDate(newDate.getDate() - 7);
                setOverviewDate(newDate);
            };
            const handleNextOverview = () => {
                const newDate = new Date(overviewDate);
                newDate.setDate(newDate.getDate() + 7);
                setOverviewDate(newDate);
            };

            const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

            const overviewLabel = (() => {
                const start = new Date(overviewDate);
                start.setDate(overviewDate.getDate() - overviewDate.getDay());
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                if (start.getMonth() === end.getMonth()) {
                    return `${start.getDate()} - ${end.getDate()} ${thaiMonths[start.getMonth()]} ${start.getFullYear() + 543}`;
                }
                return `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
            })();

            const renderDayCell = (currentDate, isCurrentMonth = true, cornerClass = '') => {
                const day = currentDate.getDate();
                const dateStr = `${String(day).padStart(2,'0')}/${String(currentDate.getMonth()+1).padStart(2,'0')}/${currentDate.getFullYear()+543}`;
                const dayOfWeek = currentDate.getDay();
                const isTodayDate = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                
                const isSelected = currentDate.getDate() === overviewDate.getDate() && currentDate.getMonth() === overviewDate.getMonth();

                const workingList = [];

                staffData.forEach(s => {
                    if (!s.schedule) return;
                    const specificData = s.schedule[dateStr];
                    let isWorking = false;
                    let timeStr = '';
                    let otHours = 0;

                    if (specificData !== undefined) {
                        isWorking = specificData.active;
                        if (isWorking) {
                            timeStr = `${specificData.start}-${specificData.end}`;
                            otHours = specificData.otHours || 0;
                        }
                    } else {
                        if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) {
                            isWorking = s.schedule[dayOfWeek].active;
                            if (isWorking) {
                                timeStr = `${s.schedule[dayOfWeek].start}-${s.schedule[dayOfWeek].end}`;
                                otHours = s.schedule[dayOfWeek].otHours || 0;
                            }
                        } else if (Array.isArray(s.schedule) && s.schedule.includes(dayOfWeek)) {
                            isWorking = true;
                            timeStr = 'ปกติ';
                        }
                    }

                    const shortName = s.name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.|ดร\.|นาย|นางสาว|นาง)/, '').trim().split(' ')[0];
                    if (isWorking) workingList.push({ id: s.id, name: shortName, timeStr, role: s.role, otHours });
                });

                return (
                    <div 
                        key={currentDate.getTime()} 
                        data-date={dateStr}
                        onClick={() => { 
                            setOverviewDate(currentDate); 
                        }}
                        className={`calendar-dropzone p-1 sm:p-1.5 cursor-pointer min-h-[120px] overflow-hidden flex flex-col gap-0.5 transition-all duration-200 group ${!isCurrentMonth ? 'opacity-40 bg-slate-50/20' : isTodayDate ? 'bg-indigo-50/10' : 'bg-white hover:bg-indigo-50/30'} ${isSelected ? 'ring-2 ring-inset ring-indigo-500 shadow-sm relative z-10 bg-white' : ''} ${cornerClass}`}
                        title="คลิกเพื่อดูรายละเอียดรายวัน"
                    >
                        <div className={`text-[10px] sm:text-xs xl:text-sm 2xl:text-base font-bold text-right mb-0.5 xl:mb-1 transition-colors ${isTodayDate || isSelected ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-500'}`}>{day}</div>
                        <div className="flex flex-col gap-0.5 xl:gap-1 overflow-y-auto custom-scrollbar flex-1 pr-0.5 no-drag-zone">
                            {workingList.map((ws, idx) => {
                                const colorClass = ws.role === 'doctor' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : ws.role === 'nurse' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-200';
                                return (
                                    <div key={idx} className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded border ${colorClass} truncate flex items-center justify-between gap-1`} title={`${ws.name} (${ws.timeStr})`}>
                                        <span className="font-bold truncate">{ws.name}</span>
                                        <span className="opacity-75 font-data text-[8px] sm:text-[9px] shrink-0">{ws.timeStr.split('-')[0]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            };

            const renderDayTimeline = () => {
                const day = overviewDate.getDate();
                const dateStr = `${String(day).padStart(2,'0')}/${String(overviewDate.getMonth()+1).padStart(2,'0')}/${overviewDate.getFullYear()+543}`;
                const dayOfWeek = overviewDate.getDay();

                const workingList = [];
                staffData.forEach(s => {
                    if (!s.schedule) return;
                    const specificData = s.schedule[dateStr];
                    let isWorking = false;
                    let start = '09:00';
                    let end = '20:00';
                    let otHours = 0;

                    if (specificData !== undefined) {
                        isWorking = specificData.active;
                        if (isWorking) { 
                           start = specificData.start || '09:00'; 
                           end = specificData.end || '20:00'; 
                           otHours = specificData.otHours || 0;
                        }
                    } else {
                        if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) {
                            isWorking = s.schedule[dayOfWeek].active;
                            if (isWorking) { 
                               start = s.schedule[dayOfWeek].start || '09:00'; 
                               end = s.schedule[dayOfWeek].end || '20:00'; 
                               otHours = s.schedule[dayOfWeek].otHours || 0;
                            }
                        } else if (Array.isArray(s.schedule) && s.schedule.includes(dayOfWeek)) {
                            isWorking = true;
                        }
                    }

                    if (isWorking) {
                        workingList.push({ ...s, start, end, otHours });
                    }
                });

                workingList.sort((a,b) => a.start.localeCompare(b.start));

                const hours = Array.from({ length: 19 }, (_, i) => i + 6); // 6 to 24 (18 ชั่วโมง)

                return (
                    <div className="calendar-dropzone border border-slate-100 rounded-xl overflow-hidden bg-white flex flex-col shadow-sm mt-4 relative outline-none" data-date={dateStr}>
                        <div className="overflow-x-auto custom-scrollbar flex-1 no-drag-zone">
                            <div className="min-w-[800px] flex flex-col">
                                <div className="flex border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 pointer-events-none">
                                    <div className="w-48 shrink-0 border-r border-slate-100 p-3 font-bold text-slate-500 text-xs kanit-text flex items-center justify-center">รายชื่อพนักงาน</div>
                                    <div className="flex-1 relative flex">
                                        {hours.slice(0, -1).map(h => (
                                            <div key={h} className="flex-1 border-r border-slate-100/50 text-center py-2 text-[10px] font-bold text-slate-400 font-data">
                                                {String(h).padStart(2,'0')}:00
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col bg-white relative">
                                    <div className="absolute inset-0 flex pointer-events-none pl-48">
                                        {hours.slice(0, -1).map(h => (
                                            <div key={h} className="flex-1 border-r border-slate-50"></div>
                                        ))}
                                    </div>

                                    {workingList.length === 0 ? (
                                        <div className="p-10 text-center text-slate-400 kanit-text text-sm">ไม่มีพนักงานลงกะในวันนี้</div>
                                    ) : (
                                        workingList.map(s => {
                                            const startHour = parseInt(s.start.split(':')[0]);
                                            const startMin = parseInt(s.start.split(':')[1] || 0);
                                            const endHour = parseInt(s.end.split(':')[0]);
                                            const endMin = parseInt(s.end.split(':')[1] || 0);

                                            const startPercent = Math.max(0, Math.min(100, ((startHour - 6 + (startMin / 60)) / 18) * 100));
                                            const endPercent = Math.max(0, Math.min(100, ((endHour - 6 + (endMin / 60)) / 18) * 100));
                                            const widthPercent = Math.max(2, endPercent - startPercent);

                                            const shortName = s.name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.|ดร\.|นาย|นางสาว|นาง)/, '').trim();
                                            const colorBarClass = s.role === 'doctor' ? 'bg-indigo-500 shadow-indigo-200' : s.role === 'nurse' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-sky-500 shadow-sky-200';

                                            return (
                                                <div key={s.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors items-center min-h-[52px]">
                                                    <div className="w-48 shrink-0 border-r border-slate-100 p-2.5 flex items-center gap-2">
                                                        {s.photo ? (
                                                            <img src={s.photo} alt={s.name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={14}/></div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-slate-700 kanit-text truncate">{shortName}</div>
                                                            <div className="text-[9px] text-slate-400 font-medium kanit-text truncate mt-0.5">{s.position || s.role}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 relative h-12 flex items-center pr-2">
                                                        <div 
                                                            className={`absolute h-7 rounded-lg ${colorBarClass} text-white flex flex-col justify-center px-2 shadow-sm pointer-events-none select-none`}
                                                            style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                                                        >
                                                            <span className="text-[9px] font-bold kanit-text truncate leading-none">{s.start}-{s.end} {s.otHours > 0 && `(OT ${s.otHours}ชม.)`}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            };

            return (
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-5 overflow-hidden flex flex-col">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
                        <div className="w-full lg:w-auto flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg kanit-text flex items-center gap-2">
                                    <CalendarDays className="text-indigo-500" /> ตารางการทำงานของพนักงาน (รายสัปดาห์)
                                </h3>
                                <p className="text-xs text-slate-500 kanit-text mt-0.5">ภาพรวมการเข้างานและวันหยุดของบุคลากรประจำสัปดาห์</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 ml-auto lg:ml-0">
                                <button 
                                    onClick={handlePrevOverview} 
                                    className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <ChevronLeft size={18}/>
                                </button>
                                
                                <div className="w-px h-4 bg-slate-100 mx-0.5"></div>
                                
                                <button 
                                    onClick={() => setOverviewDate(new Date())} 
                                    className="px-3 py-1.5 text-indigo-600 text-[10px] sm:text-xs font-bold hover:bg-indigo-50 rounded-lg transition-colors whitespace-nowrap kanit-text"
                                >
                                    วันนี้
                                </button>
                                
                                <div className="w-px h-4 bg-slate-100 mx-0.5"></div>
                                
                                <button 
                                    onClick={handleNextOverview} 
                                    className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <ChevronRight size={18}/>
                                </button>
                            </div>

                            <div className="hidden min-[450px]:flex items-center justify-center bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 min-w-[140px]">
                                <span className="font-bold text-indigo-700 text-xs sm:text-sm kanit-text truncate text-center w-full">
                                    {overviewLabel}
                                </span>
                            </div>
                        </div>
                        <div className="min-[450px]:hidden w-full flex items-center justify-center bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 mt-1">
                             <span className="font-bold text-indigo-700 text-xs kanit-text truncate">
                                 {overviewLabel}
                             </span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 shadow-sm">
                            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                                {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                                    <div key={d} className={`py-2 text-center text-xs sm:text-sm font-bold kanit-text ${i===0 || i===6 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-slate-100">
                                {Array.from({length: 7}, (_, i) => {
                                    const d = new Date(overviewDate);
                                    d.setDate(overviewDate.getDate() - overviewDate.getDay() + i);
                                    const isCurrentMonth = d.getMonth() === overviewDate.getMonth();
                                    const cornerClass = i === 0 ? 'rounded-bl-xl' : (i === 6 ? 'rounded-br-xl' : '');
                                    return renderDayCell(d, isCurrentMonth, cornerClass);
                                })}
                            </div>
                        </div>
                        
                        {renderDayTimeline()}
                    </div>
                </div>
            );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`order-2 lg:order-1 flex flex-col ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 kanit-text flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> รายการคิวที่เข้ารักษาแล้ว</h3>
              {(() => {
                const finishedTodaysQueue = sortedTodaysQueue.filter(appt => appt.treated === true);
                return (
                  <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-data">{finishedTodaysQueue.length} คิว</div>
                );
              })()}
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar p-2">
              {isGlobalLoading ? (
                 <div className="text-center py-10 text-slate-400 text-sm kanit-text flex flex-col items-center gap-3"><Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500"/> กำลังโหลดข้อมูล...</div>
              ) : (() => {
                 const finishedTodaysQueue = sortedTodaysQueue.filter(appt => appt.treated === true);
                 if (finishedTodaysQueue.length === 0) {
                    return <div className="text-center py-10 text-slate-400 text-sm kanit-text bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2"><Clock className="w-8 h-8 text-slate-300"/> ยังไม่มีคิวที่เข้ารักษาแล้ว</div>;
                 }
                 return finishedTodaysQueue.map((appt, i) => {
                   const effDt = getEffectiveApptDatetimeStr(appt);
                   const time = effDt.split(' ')[1] ? effDt.split(' ')[1].replace('น.', '').trim() : '-';
                   return (
                  <div key={appt.id || i} className="flex items-center gap-3 p-3 rounded-2xl transition-all border bg-emerald-50/30 border-emerald-100/50 cursor-default opacity-80">
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold font-data shrink-0 bg-emerald-100 text-emerald-600">
                      <span className="text-[9px] font-normal leading-none kanit-text mt-0.5">คิว</span>
                      <span className="leading-none mt-1 text-sm">{i+1}</span>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <p className="font-bold kanit-text truncate text-sm leading-tight text-slate-600 line-through">{appt.patientName || appt.name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-data mt-1.5 truncate"><Clock size={12} className="text-emerald-400 shrink-0" /> {time} น. <span className="text-slate-300 mx-0.5 shrink-0">|</span> <span className="truncate kanit-text">{appt.reason || appt.category || '-'}</span></p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 pr-2">
                      <button
                        onClick={(e) => handleUndoCompleteQueue(appt, e)}
                        className="p-2.5 rounded-xl transition-all bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 active:scale-95 shadow-sm border border-slate-200 hover:border-rose-200"
                        title="ดึงกลับไปที่คิววันนี้"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </div>

          <div className={`order-1 lg:order-2 flex flex-col ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 kanit-text flex items-center gap-2"><List className="w-5 h-5 text-sky-500" /> รายการคิววันนี้</h3>
              {(() => {
                const activeTodaysQueue = sortedTodaysQueue.filter(appt => !appt.treated);
                return (
                  <div className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-md font-data">เหลือ {activeTodaysQueue.length} คิว</div>
                );
              })()}
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar p-2">
              {isGlobalLoading ? (
                 <div className="text-center py-10 text-slate-400 text-sm kanit-text flex flex-col items-center gap-3"><Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500"/> กำลังโหลดข้อมูล...</div>
              ) : (() => {
                 const activeTodaysQueue = sortedTodaysQueue.filter(appt => !appt.treated);
                 if (activeTodaysQueue.length === 0) {
                    return <div className="text-center py-10 text-slate-400 text-sm kanit-text bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2"><CheckCircle2 className="w-8 h-8 text-emerald-400"/> ไม่มีคิวรอเรียกแล้ว</div>;
                 }
                 return activeTodaysQueue.map((appt, i) => {
                   const effDt = getEffectiveApptDatetimeStr(appt);
                   const time = effDt.split(' ')[1] ? effDt.split(' ')[1].replace('น.', '').trim() : '-';
                   const isThisSpeaking = speakingId === (appt.id || appt.datetime);
                   return (
                  <div key={appt.id || i} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isThisSpeaking ? 'bg-sky-50 border-sky-300 shadow-md transform scale-[1.02] relative z-10' : 'hover:bg-slate-50 border-slate-100/50 hover:border-sky-200'} group cursor-default`}>
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold font-data shrink-0 shadow-inner transition-colors ${isThisSpeaking ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-100'}`}>
                      <span className="text-[10px] font-normal leading-none kanit-text mt-0.5">คิว</span>
                      <span className="leading-none mt-1 text-lg">{i+1}</span>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <p className={`font-bold kanit-text truncate text-sm leading-tight transition-colors ${isThisSpeaking ? 'text-sky-700' : 'text-slate-700'}`}>{appt.patientName || appt.name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-data mt-1.5 truncate"><Clock size={12} className="text-sky-400 shrink-0" /> {time} น. <span className="text-slate-300 mx-0.5 shrink-0">|</span> <span className="truncate kanit-text">{appt.reason || appt.category || '-'}</span></p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button 
                        onClick={(e) => handleSpeakQueue(appt, e)}
                        disabled={isSpeaking}
                        className={`p-2.5 rounded-xl transition-all ${isThisSpeaking ? 'bg-sky-500 text-white animate-pulse shadow-md hover:bg-sky-600' : 'bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-600 active:scale-95 shadow-sm border border-slate-200 hover:border-sky-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        title="เรียกคิว (เสียง Google/TTS)"
                      >
                        {isThisSpeaking ? <Megaphone size={18} /> : <Volume2 size={18} />}
                      </button>
                      <button 
                        onClick={(e) => handleCompleteQueue(appt, e)}
                        className="p-2.5 rounded-xl transition-all bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 active:scale-95 shadow-sm border border-slate-200 hover:border-emerald-200"
                        title="เข้ารักษาแล้ว"
                      >
                        <CheckSquare size={18} />
                      </button>
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* --- [NEW] Room Selection Modal --- */}
      {roomSelectorTarget && createPortal(
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${isRoomModalClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl p-0 max-w-sm w-full shadow-2xl flex flex-col overflow-hidden ${isRoomModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">เลือกห้องตรวจ</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black kanit-text">ระบุห้องเรียกคิว</p>
                </div>
              </div>
              <button onClick={closeRoomModal} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-3 max-h-[60dvh] overflow-y-auto custom-scrollbar grid grid-cols-1 gap-1.5">
              {availableRooms.map((room, ridx) => (
                <button 
                  key={ridx}
                  onClick={() => callPatient(roomSelectorTarget, room)}
                  className="w-full text-left p-4 rounded-2xl hover:bg-sky-50 text-base font-bold text-slate-700 hover:text-sky-700 transition-all border border-transparent hover:border-sky-100 flex items-center gap-3 group active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-500 transition-colors">
                    <MapPin size={18} />
                  </div>
                  <span className="flex-1 truncate kanit-text">{room}</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} className="text-sky-500" />
                  </div>
                </button>
              ))}
              
              <button 
                onClick={() => callPatient(roomSelectorTarget, "")}
                className="w-full text-center py-4 rounded-2xl hover:bg-slate-50 text-sm font-medium text-slate-400 italic transition-colors kanit-text border border-dashed border-slate-200 mt-2"
              >
                ไม่ระบุห้อง (เรียกปกติ)
              </button>
            </div>

            <div className="p-4 bg-slate-50/30 border-t border-slate-50">
              <p className="text-[10px] text-center text-slate-400 kanit-text">คนไข้: {roomSelectorTarget.patientName || roomSelectorTarget.name}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;

