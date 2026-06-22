import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';
import CalendarView from './CalendarView';
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

const AppointmentManager = ({ queueData, setQueueData, patientsData, setPatientsData, staffData = [], callAppScript, showToast, isGlobalLoading, fetchQueueForMonth, isQueueFetching, showGlobalAlert, globalAlert, roleLabels = {}, dealStatuses = [], staffCategories = [], currentUser }) => {
  const [viewMode, setViewMode] = useState('table'); 
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // --- ใช้ Custom Hook แทนการประกาศ State แยกเอง ---
  const apptModal = useModal();
    const apptCalendar = useModal();
  const apptSwipeProps = useSwipeDown(apptCalendar.close);

    const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const headerRef = React.useRef(null);
  const filterRef = React.useRef(null);
  const apptDatetimeWrapperRef = React.useRef(null);
  const apptPostponedDatetimeWrapperRef = React.useRef(null);
  const [apptCalendarPos, setApptCalendarPos] = useState({ top: 0, left: 0 });
  const [activeDateField, setActiveDateField] = useState('datetime');

  const initialApptState = { 
    hn: '', patientName: '', searchPatient: '', doctor: '', datetime: '', reason: '', status: 'pending',
    phones: [''], lineId: '', facebook: '', instagram: '', tiktok: '', serviceType: '', courses: [],
    postponeCount: 0,
    postpone1_date: '', postpone1_status: '',
    postpone2_date: '', postpone2_status: '',
    postpone3_date: '', postpone3_status: '',
    postpone4_date: '', postpone4_status: '',
    createdAt: ''
  };
  const [formData, setFormData] = useState(initialApptState);

  const [showPatientSuggest, setShowPatientSuggest] = useState(false);
  const [showDoctorSuggest, setShowDoctorSuggest] = useState(false);
  const allDoctors = useMemo(() => {
    return staffData.filter(s => s.role === 'doctor' || s.category === 'doctor');
  }, [staffData]);
  const currentUserIsDoctor = currentUser && (currentUser.role === 'doctor' || currentUser.category === 'doctor');

  const [apptCalDate, setApptCalDate] = useState(new Date());
  const [apptCalView, setApptCalView] = useState('days');
  const [apptYearPageStart, setApptYearPageStart] = useState(0);
  const [apptTime, setApptTime] = useState({ h: '09', m: '00' });

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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

  const getStatusInfo = (statusVal) => {
    const found = dealStatuses.find(s => s.value === statusVal);
    if (found) {
      return {
        label: found.label,
        colorClass: found.color
      };
    }
    if (statusVal === 'confirmed') return { label: 'ยืนยันแล้ว', colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (statusVal === 'cancelled') return { label: 'ยกเลิก', colorClass: 'bg-rose-100 text-rose-700 border-rose-200' };
    if (statusVal === 'pending') return { label: 'รอยืนยัน', colorClass: 'bg-amber-100 text-amber-700 border-amber-200' };
    
    return {
      label: statusVal || '-',
      colorClass: 'bg-slate-100 text-slate-500 border-slate-200'
    };
  };

  useEffect(() => {
    if (apptCalView === 'years') setApptYearPageStart(Math.floor((apptCalDate.getFullYear() + 543) / 12) * 12);
  }, [apptCalView, apptCalDate]);

  // เปลี่ยนชื่อฟังก์ชันเป็นของ AppointmentManager โดยเฉพาะ ป้องกันการชนกันของ Global Scope
  const handleOpenApptAdd = () => {
    setEditingId(null);
    setFormData({ 
      ...initialApptState, 
      doctor: currentUserIsDoctor ? currentUser.name : '' 
    });
    setIsViewMode(false);
    apptModal.open();
  };

  // เปลี่ยนชื่อฟังก์ชันเป็นของ AppointmentManager โดยเฉพาะ ป้องกันการชนกันของ Global Scope
  const handleOpenApptEdit = (appt, isView = false) => {
    setEditingId(appt.id);
    setFormData({ 
        hn: appt.hn || '', 
        patientName: appt.patientName || appt.name || '', 
        searchPatient: appt.hn ? `${appt.hn} - ${appt.patientName || appt.name}` : (appt.patientName || appt.name || ''),
        doctor: appt.doctor || appt.artist || (currentUserIsDoctor ? currentUser.name : ''), 
        datetime: appt.datetime || '', 
        reason: appt.reason || appt.category || '', 
        status: appt.status || appt.dealStatus || 'pending',
        phones: appt.phone ? (Array.isArray(appt.phone) ? appt.phone : [appt.phone]) : [''],
        lineId: appt.lineId || '',
        facebook: appt.facebook || '',
        instagram: appt.instagram || '',
        tiktok: appt.tiktok || '',
        serviceType: appt.serviceType || '',
        postponeCount: Number(appt.postponeCount || 0),
        postpone1_date: appt.postpone1_date || '',
        postpone1_status: appt.postpone1_status || '',
        postpone2_date: appt.postpone2_date || '',
        postpone2_status: appt.postpone2_status || '',
        postpone3_date: appt.postpone3_date || '',
        postpone3_status: appt.postpone3_status || '',
        postpone4_date: appt.postpone4_date || '',
        postpone4_status: appt.postpone4_status || '',
        createdAt: appt.createdAt || appt.timestamp || appt.Timestamp || appt.created_at || ''
    });
    setIsViewMode(isView);
    apptModal.open();
  };

  const handleDeleteAppt = (id) => {
      showGlobalAlert({
        type: 'warning', title: 'ยืนยันการลบการนัดหมาย?', text: 'คุณแน่ใจหรือไม่ว่าต้องการลบการนัดหมายนี้?',
        onConfirm: async () => {
            globalAlert.setIsOpen(false);
            setIsProcessing(true);
            try {
               await callAppScript('DELETE_DATA', 'Queue', { id });
               setQueueData(queueData.filter(a => a.id !== id));
               showToast('ลบข้อมูลการนัดหมายแล้ว', 'danger');
            } catch(e) { showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning'); }
            setIsProcessing(false);
        }
      });
        };

  const handleEventDrop = async (eventId, newDate) => {
      const appt = queueData.find(a => a.id === eventId);
      if (!appt) return;

      const apptStatus = appt.status || appt.dealStatus;
      const isPostponed = apptStatus === 'postponed';

      const effectiveDt = getEffectiveApptDatetimeStr(appt);
      const oldTime = effectiveDt ? (effectiveDt.split(' ')[1] || '09:00 น.') : '09:00 น.';

      const d = String(newDate.getDate()).padStart(2, '0');
      const m = String(newDate.getMonth() + 1).padStart(2, '0');
      const y = newDate.getFullYear() + 543;
      const newDatetimeStr = `${d}/${m}/${y} ${oldTime}`;
      const isoDate = convertThaiToISO(newDatetimeStr);

      let updatedAppt;
      if (isPostponed) {
          const prevPostponedDate = appt.postponedDate || '';
          let finalPostponedCount = Number(appt.postponedCount || 0);
          let finalPostponeHistory = appt.postponeHistory || '';
          
          if (newDatetimeStr !== prevPostponedDate) {
              finalPostponedCount += 1;
              const logEntry = prevPostponedDate || appt.datetime;
              if (finalPostponeHistory) {
                  finalPostponeHistory += ` | ${logEntry}`;
              } else {
                  finalPostponeHistory = logEntry;
              }
          }

          updatedAppt = {
              ...appt,
              postponedDate: newDatetimeStr,
              rawPostponedDate: isoDate,
              postponedCount: finalPostponedCount,
              postponeHistory: finalPostponeHistory
          };
      } else {
          updatedAppt = { ...appt, datetime: newDatetimeStr, rawDeliveryStart: isoDate, rawDateTime: isoDate };
      }

      setQueueData(prev => prev.map(a => a.id === eventId ? updatedAppt : a));
      showToast(`เลื่อนนัดหมายไปวันที่ ${d}/${m}/${y} แล้ว`, 'success');

      try {
          await callAppScript('SAVE_DATA', 'Queue', updatedAppt);
      } catch(e) {
          showToast('บันทึกการเลื่อนนัดไม่สำเร็จ ข้อมูลอาจไม่ตรงกับเซิร์ฟเวอร์', 'warning');
      }
  };

  const handleSaveAppt = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    let doctorName = formData.doctor;
    if (currentUserIsDoctor) {
        doctorName = currentUser.name;
    } else {
        if (!doctorName) {
            showToast('กรุณาเลือกแพทย์ผู้นัด', 'warning');
            setIsProcessing(false);
            return;
        }
    }

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
    
    // คำนวณ postponeCount จากจำนวนครั้งที่เลื่อนนัดจริง
    let calcPostponeCount = 0;
    if (formData.status === 'postponed' && formData.postpone1_date) calcPostponeCount = 1;
    if (formData.postpone1_status === 'postponed' && formData.postpone2_date) calcPostponeCount = 2;
    if (formData.postpone2_status === 'postponed' && formData.postpone3_date) calcPostponeCount = 3;
    if (formData.postpone3_status === 'postponed' && formData.postpone4_date) calcPostponeCount = 4;

    // หาสถานะล่าสุดและวันที่ล่าสุด (สำหรับ calendar)
    let effectiveStatus = formData.status;
    let effectiveDate = isoDate;
    for (let i = 1; i <= 4; i++) {
        const pDate = formData[`postpone${i}_date`];
        const pStatus = formData[`postpone${i}_status`];
        if (pDate) {
            effectiveDate = convertThaiToISO(pDate);
            if (pStatus) effectiveStatus = pStatus;
        } else break;
    }

    const creationTime = editingId ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString();
    const payload = {
        id: editingId || `APPT${Date.now()}`, hn: finalHn, patientName: formData.patientName, datetime: formData.datetime, doctor: doctorName, reason: formData.reason, status: formData.status,
        phone: formData.phones, lineId: formData.lineId, facebook: formData.facebook, instagram: formData.instagram, tiktok: formData.tiktok, serviceType: formData.serviceType,
        rawDeliveryStart: isoDate, rawDateTime: isoDate, name: formData.patientName || finalHn, artist: doctorName, category: formData.reason, dealStatus: effectiveStatus,
        // ข้อมูลเลื่อนนัด
        postponeCount: calcPostponeCount,
        postpone1_date: formData.postpone1_date || '', postpone1_status: formData.postpone1_status || '',
        postpone2_date: formData.postpone2_date || '', postpone2_status: formData.postpone2_status || '',
        postpone3_date: formData.postpone3_date || '', postpone3_status: formData.postpone3_status || '',
        postpone4_date: formData.postpone4_date || '', postpone4_status: formData.postpone4_status || '',
        // วันที่ล่าสุดสำหรับปฏิทิน (effective date)
        rawPostponedDate: calcPostponeCount > 0 ? effectiveDate : '',
        // Timestamp วันที่สร้างนัดหมาย
        createdAt: creationTime,
        timestamp: creationTime,
        Timestamp: creationTime,
        created_at: creationTime,
        createDate: creationTime,
        create_date: creationTime,
        createdAtDate: creationTime
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

  const augmentedQueueData = useMemo(() => {
    return queueData.map(appt => {
      if (!appt.hn) return appt;
      const patientInfo = patientsData.find(p => getPatientId(p) === appt.hn);
      if (patientInfo) {
          const latestName = getPatientFullName(patientInfo);
          const latestPhones = [patientInfo.phone1, patientInfo.phone2].filter(Boolean);
          return {
              ...appt,
              patientName: latestName,
              name: latestName, 
              phone: latestPhones.length > 0 ? latestPhones : appt.phone
          };
      }
      return appt; 
    });
  }, [queueData, patientsData]);

  const filteredData = useMemo(() => {
    return augmentedQueueData.filter(a => 
      (a.patientName && a.patientName.includes(search)) || 
      (a.hn && a.hn.includes(search)) || 
      (a.doctor && a.doctor.includes(search)) ||
      (a.reason && a.reason.includes(search))
    ).sort((a, b) => {
      const dateA = getEffectiveApptIsoDate(a);
      const dateB = getEffectiveApptIsoDate(b);
      return new Date(dateB || 0) - new Date(dateA || 0);
    });
  }, [augmentedQueueData, search]);

  // --- [NEW] สรุปยอดสำหรับระบบนัดหมาย ---
  const stats = useMemo(() => {
    let total = augmentedQueueData.length;
    let todayCount = 0;
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;

    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()+543}`;

    augmentedQueueData.forEach(appt => {
        const effectiveDt = getEffectiveApptDatetimeStr(appt);
        if (effectiveDt && effectiveDt.split(' ')[0] === todayStr) {
            todayCount++;
        }
        if (appt.status === 'pending' || appt.dealStatus === 'pending') pending++;
        else if (appt.status === 'confirmed' || appt.dealStatus === 'confirmed') confirmed++;
        else if (appt.status === 'cancelled' || appt.dealStatus === 'cancelled') cancelled++;
    });

    return { total, todayCount, pending, confirmed, cancelled };
  }, [augmentedQueueData]);

  useEffect(() => {
    setVisibleCount(20);
    setIsLoadingMore(false);
  }, [search, viewMode]);

  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement || viewMode !== 'table') return;

    // --- เพิ่มการเช็คสถานะทันทีเมื่อโหลด Component ---
    setTimeout(() => {
        if (mainElement && headerRef.current) {
            if (mainElement.scrollTop > 20) {
                headerRef.current.classList.add('is-scrolled');
                if (filterRef.current) filterRef.current.classList.add('is-scrolled');
            } else {
                headerRef.current.classList.remove('is-scrolled');
                if (filterRef.current) filterRef.current.classList.remove('is-scrolled');
            }
        }
    }, 50);

    const handleScroll = rAFThrottle((e) => {
      // ป้องกันไม่ให้คำนวณและอัปเดต ถ้า Component ถูกซ่อนอยู่
      if (!headerRef.current || headerRef.current.offsetHeight === 0) return;

      const target = e.target || mainElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      
      // 1. อัปเดต Header ทันทีเมื่อเลื่อนเกิน 20px
      if (scrollTop > 20) {
          headerRef.current.classList.add('is-scrolled');
      } else {
          headerRef.current.classList.remove('is-scrolled');
      }

      // 2. อัปเดต Filter ขยายขนาด "เฉพาะตอนที่เลื่อนมาชน Header พอดีเป๊ะ"
      if (filterRef.current && headerRef.current) {
          const headerRect = headerRef.current.getBoundingClientRect();
          const filterRect = filterRef.current.getBoundingClientRect();
          
          if (filterRect.top <= headerRect.bottom + 5) {
              filterRef.current.classList.add('is-scrolled');
          } else {
              filterRef.current.classList.remove('is-scrolled');
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
    });
    
    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredData.length, isLoadingMore, viewMode]);

  const handleOpenApptCalendar = (fieldName = 'datetime', refElement = null) => {
    setActiveDateField(fieldName);
    const targetRef = refElement || apptDatetimeWrapperRef.current;
    if (targetRef) {
      const rect = targetRef.getBoundingClientRect();
      setApptCalendarPos({ top: rect.bottom, left: rect.left });
    }
    const dtStr = formData[fieldName] || '';
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
        const effectiveDt = getEffectiveApptDatetimeStr(appt);
        const dtParts = effectiveDt.split(' ');
        const datePart = dtParts[0] || '-';
        const timePart = dtParts[1] ? dtParts[1].replace('น.', '').trim() : '';

        return (
        <tr key={`${appt.id || 'appt'}-${index}`} onClick={() => handleOpenApptEdit(appt, true)} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors text-sm align-middle cursor-pointer group font-data space-row-animation">
            <td className="py-4 pl-6 text-slate-700 font-medium text-left">
                <div className="flex flex-col items-start gap-1">
                <span>{datePart}</span>
                {timePart && <span className="text-sm text-slate-500 font-medium">{timePart}</span>}
                </div>
            </td>
            <td className="py-4 text-sky-600 font-medium text-center kanit-text">{appt.hn}</td>
            <td className="py-4 text-slate-700 text-left px-2">
                <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold">{appt.patientName}</span>
                    {(Number(appt.postponeCount) > 0 || appt.postpone1_date || appt.postponedDate) && <span title="นัดหมายนี้เคยถูกเลื่อนมาแล้ว" className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-md align-middle font-bold kanit-text"><Clock size={12} /> เคยเลื่อนนัด</span>}
                </div>
            </td>
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
                  {(() => {
                    const info = getStatusInfo(getEffectiveApptStatus(appt));
                    return (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${info.colorClass}`}>
                        {info.label}
                      </span>
                    );
                  })()}
                </div>
            </td>
            <td className="py-4 text-center">
                <div className="flex justify-center gap-2 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); handleOpenApptEdit(appt, false); }} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg"><Pencil size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteAppt(appt.id); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
            </td>
        </tr>
        )
    });
  }, [filteredData, visibleCount]); // 3. Virtualization Concept: โหลดเท่าที่จำเป็น (ตามค่า visibleCount)

  const memoizedApptMobileCards = useMemo(() => {
    return filteredData.slice(0, visibleCount).map((appt, index) => {
        const effectiveDt = getEffectiveApptDatetimeStr(appt);
        const dtParts = effectiveDt.split(' ');
        const datePart = dtParts[0] || '-';
        const timePart = dtParts[1] ? dtParts[1].replace('น.', '').trim() : '';
        return (
            <div key={`mobile-appt-${appt.id || index}`} onClick={() => handleOpenApptEdit(appt, true)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                
                {/* แถวที่ 1: รหัส HN, สถานะ และปุ่มจัดการ */}
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-3">
                        <span className="font-black text-sky-600 text-base kanit-text tracking-wide">{appt.hn}</span>
                        {(() => {
                          const info = getStatusInfo(getEffectiveApptStatus(appt));
                          return (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${info.colorClass}`}>
                              {info.label}
                            </span>
                          );
                        })()}
                    </div>
                </div>

                {/* แถวที่ 2: ชื่อคนไข้ และ เบอร์โทรศัพท์ */}
                <div className="mb-3">
                    <h4 className="font-bold text-slate-800 text-lg font-data leading-tight flex items-center flex-wrap gap-2">{appt.patientName} {(Number(appt.postponeCount) > 0 || appt.postpone1_date || appt.postponedDate) && <span title="นัดหมายนี้เคยถูกเลื่อนมาแล้ว" className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-md align-middle font-bold kanit-text"><Clock size={12} /> เคยเลื่อนนัด</span>}</h4>
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
                    <button onClick={(e) => { e.stopPropagation(); handleOpenApptEdit(appt, false); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-sm kanit-text">
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
            onEventClick={(ev) => handleOpenApptEdit(ev.originalData || ev, true)} 
            onDayClick={(date) => console.log('Day clicked:', date)} 
            dealStatuses={dealStatuses} 
            staffData={staffData}
            onEventDrop={handleEventDrop}
            onMonthChange={fetchQueueForMonth}
            isLoading={isQueueFetching}
            roleLabels={roleLabels}
         />
      );
  }, [augmentedQueueData, staffData, fetchQueueForMonth, isQueueFetching, roleLabels, dealStatuses]); // อัปเดตปฏิทินเมื่อข้อมูลหรือสถานะการโหลดเปลี่ยน

  return (
    <>
      <div className="fade-in pb-10 w-full relative">
        
        {/* --- 1. Sticky Header --- */}
        <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
          <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
            <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
              <div>
                <h1 className="font-bold text-slate-800 tracking-tight sticky-header-title">ระบบนัดหมาย</h1>
                <p className="text-slate-500 sticky-header-desc">จัดการคิวนัดหมายของคนไข้และแพทย์</p>
              </div>
              <button onClick={handleOpenApptAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} sticky-header-btn`}>
                <Plus /> <span className="hidden sm:inline">เพิ่มนัดหมายใหม่</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- 2. Stats Section (ปรับเลย์เอาต์เหลือ 4 การ์ด) --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 mb-0 relative z-20 pointer-events-auto">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><CalendarClock size={20} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="นัดหมายวันนี้">นัดหมายวันนี้</p>
                  </div>
                </div>
                <div className="relative z-10 mt-auto w-full">
                  <p className={`font-black text-indigo-600 font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(stats.todayCount))}`}>{formatStatNumber(stats.todayCount)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><CheckCircle2 size={20} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="ยืนยันแล้ว">ยืนยันแล้ว</p>
                  </div>
                </div>
                <div className="relative z-10 mt-auto w-full">
                  <p className={`font-black text-emerald-600 font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(stats.confirmed))}`}>{formatStatNumber(stats.confirmed)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Clock size={20} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="รอยืนยัน">รอยืนยัน</p>
                  </div>
                </div>
                <div className="relative z-10 mt-auto w-full">
                  <p className={`font-black text-amber-600 font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(stats.pending))}`}>{formatStatNumber(stats.pending)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-amber-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-rose-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><XCircle size={20} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="ยกเลิก">ยกเลิก</p>
                  </div>
                </div>
                <div className="relative z-10 mt-auto w-full">
                  <p className={`font-black text-rose-600 font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(stats.cancelled))}`}>{formatStatNumber(stats.cancelled)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-rose-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>
           </div>
        </div>

        {/* --- 3. ปฏิทิน --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 sm:mt-5 mb-0 relative z-20 pointer-events-auto">
             {/* เรียกใช้งานปฏิทินที่ถูกล็อกการ Re-render เอาไว้แล้ว และตกแต่งกล่องไปในตัว CalendarView เลย */}
             {memoizedCalendarView}
        </div>

        {/* --- 4. Filter Component (กึ่งกลาง Distribute Vertically) --- */}
        <div 
           ref={filterRef}
           className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-5 sm:my-6 sticky-filter-appt" 
        >
            <div className="w-full mx-auto pointer-events-none relative h-[60px] sm:h-[76px] z-50">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-row items-center px-4 md:px-8 2xl:px-12 py-3 sm:py-4 transition-all">
                <div className="relative w-full">
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อ, รหัส HN, แพทย์ผู้นัด..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="w-full pl-11 pr-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data truncate" 
                  />
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
        </div>

        {/* --- 5. ตาราง --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden p-0 sm:p-0">
                <div className="px-2 sm:px-4 py-4">
                    {/* --- Desktop View (Table) --- */}
                    {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                    <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse min-w-[900px] table-auto">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-100 text-sm"><th className="pb-4 font-medium pl-6 text-left w-[12%]">วันที่/เวลา</th><th className="pb-4 font-medium text-center w-[10%]">รหัส HN</th><th className="pb-4 font-medium text-left px-2 w-[18%]">ชื่อคนไข้</th><th className="pb-4 font-medium text-center w-[12%]">เบอร์โทร</th><th className="pb-4 font-medium text-left px-2 w-[15%]">แพทย์ผู้นัด</th><th className="pb-4 font-medium text-left px-2 w-[15%]">อาการ</th><th className="pb-4 font-medium text-center w-[10%]">สถานะ</th><th className="pb-4 font-medium text-right pr-6 w-[120px]">จัดการ</th></tr>
                            </thead>
                            <tbody>
                              {isGlobalLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={`skel-${i}`} className="border-b border-slate-50">
                                    <td className="py-4 pl-6"><div className="flex flex-col items-start gap-2"><div className="h-4 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div><div className="h-3 w-full max-w-[48px] bg-slate-100 rounded animate-pulse"></div></div></td>
                                    <td className="py-4"><div className="h-4 w-full max-w-[64px] bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-8 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-full animate-pulse mx-auto"></div></td>
                                    <td className="py-4 pr-6"><div className="flex justify-end gap-2"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                                  </tr>
                                ))
                              ) : memoizedApptTableRows}
                              {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                                  <tr key={`skel-more-${i}`} className="border-b border-slate-50">
                                    <td className="py-4 pl-6"><div className="flex flex-col items-start gap-2"><div className="h-4 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div><div className="h-3 w-full max-w-[48px] bg-slate-100 rounded animate-pulse"></div></div></td>
                                    <td className="py-4"><div className="h-4 w-full max-w-[64px] bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-8 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4 px-2"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td>
                                    <td className="py-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-full animate-pulse mx-auto"></div></td>
                                    <td className="py-4 pr-6"><div className="flex justify-end gap-2"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div></div></td>
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
                                        <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="h-6 w-full max-w-[160px] bg-slate-200 rounded animate-pulse mb-2"></div>
                                        <div className="h-6 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse"></div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-full max-w-[192px] bg-slate-200 rounded animate-pulse"></div>
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
                                            <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div>
                                            <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded-md animate-pulse"></div>
                                        </div>
                                        <div className="mb-3">
                                            <div className="h-6 w-full max-w-[160px] bg-slate-200 rounded animate-pulse mb-2"></div>
                                            <div className="h-6 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse"></div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                                <div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                                <div className="h-4 w-full max-w-[192px] bg-slate-200 rounded animate-pulse"></div>
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
        <div className={`fixed inset-0 z-[170] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${apptModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
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
                {formData.createdAt && (
                  <div className="hidden sm:flex text-[11px] font-medium text-slate-500 items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 kanit-text shadow-sm shrink-0">
                    <Clock size={14} className="text-slate-400" />
                    <span>นัดเมื่อ: {formatDateTime(formData.createdAt)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* เหลือแค่ปุ่มปิด X ด้านบน */}
                <button onClick={apptModal.close} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
              <form id="appt-form" onSubmit={handleSaveAppt} className="pb-2">
                {formData.createdAt && (
                  <div className="mb-4 sm:hidden flex text-[11px] font-medium text-slate-500 items-center justify-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 kanit-text shadow-sm w-max mx-auto">
                    <Clock size={14} className="text-slate-400" />
                    <span>นัดเมื่อ: {formatDateTime(formData.createdAt)}</span>
                  </div>
                )}
                <fieldset disabled={isViewMode} className="space-y-5 border-none p-0 m-0 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* ค้นหา HN หรือ ชื่อคนไข้ (เพิ่ม z-index ป้องกัน Dropdown โดนช่องอื่นทับ) */}
                    <div className="md:col-span-2 relative" style={{ zIndex: 20 }}>
                        {/* แสดงคอร์สคงเหลือเมื่อเลือกคนไข้แล้ว (ในหน้านัดหมาย) */}
                        {formData.hn && (
                            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-full max-w-[8px] h-2 rounded-full bg-indigo-500 animate-pulse"></div>
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
                                       <span className="text-xs text-slate-500 font-data flex items-center gap-1">{p.phone || p.phone1 ? <><Phone size={12} className="text-sky-500" /> {p.phone || p.phone1}</> : 'ไม่มีเบอร์โทรศัพท์'}</span>
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
                          <input required type="text" className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.datetime} onChange={(e) => setFormData({...formData, datetime: e.target.value})} onClick={() => handleOpenApptCalendar('datetime')} placeholder="DD/MM/YYYY HH:mm น." />
                          <button type="button" onClick={() => handleOpenApptCalendar('datetime')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>
                        </div>
                    </div>

                    {/* แพทย์ผู้นัด (เพิ่ม z-index) */}
                    <div className="relative" style={{ zIndex: 10 }}>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">แพทย์ผู้นัด <span className="text-rose-500">*</span></label>
                        {currentUserIsDoctor ? (
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200 outline-none text-sm font-data" 
                                value={currentUser?.name || ''} 
                                readOnly 
                            />
                        ) : (
                            <CustomSelect 
                                value={formData.doctor} 
                                onChange={(val) => setFormData({...formData, doctor: val})} 
                                options={allDoctors.map(doc => doc.name)} 
                                placeholder="เลือกแพทย์ผู้นัด"
                            />
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
                                options={dealStatuses} 
                                disabled={isViewMode} 
                            />
                        </div>
                    </div>

                    {/* === ส่วนเลื่อนนัด (แสดงเมื่อสถานะเป็น "เลื่อนนัด") === */}
                    {formData.status === 'postponed' && (
                      <div className="md:col-span-2 mt-1">
                        <div className="bg-violet-50/60 border border-violet-200 rounded-2xl p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-violet-700 flex items-center gap-2 kanit-text">
                              <CalendarClock size={16} /> ประวัติการเลื่อนนัด
                            </h4>
                            {(() => {
                              let count = 0;
                              for (let i = 1; i <= 4; i++) { if (formData[`postpone${i}_date`]) count = i; }
                              return count > 0 ? (
                                <span className="text-xs font-bold text-white bg-violet-500 px-2.5 py-1 rounded-full kanit-text">
                                  เลื่อนแล้ว {count} ครั้ง
                                </span>
                              ) : null;
                            })()}
                          </div>

                          {/* ครั้งที่ 1 */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                              <span className="text-xs font-semibold text-violet-600 kanit-text">เลื่อนครั้งที่ 1</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                              <div className="relative">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">วันที่เลื่อนนัด <span className="text-rose-500">*</span></label>
                                <div className="relative group">
                                  <input required type="text" className="w-full px-3 py-2.5 pr-10 rounded-xl bg-white border border-violet-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-data" value={formData.postpone1_date} onChange={(e) => setFormData({...formData, postpone1_date: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." disabled={isViewMode} />
                                  <button type="button" onClick={() => handleOpenApptCalendar('postpone1_date')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">สถานะใหม่ <span className="text-rose-500">*</span></label>
                                <CustomSelect value={formData.postpone1_status} onChange={(val) => setFormData({...formData, postpone1_status: val})} options={dealStatuses} disabled={isViewMode} />
                              </div>
                            </div>
                          </div>

                          {/* ครั้งที่ 2 */}
                          {formData.postpone1_status === 'postponed' && (
                            <div className="space-y-3 pt-3 border-t border-violet-200/60">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                                <span className="text-xs font-semibold text-violet-600 kanit-text">เลื่อนครั้งที่ 2</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                <div className="relative">
                                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">วันที่เลื่อนนัด <span className="text-rose-500">*</span></label>
                                  <div className="relative group">
                                    <input required type="text" className="w-full px-3 py-2.5 pr-10 rounded-xl bg-white border border-violet-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-data" value={formData.postpone2_date} onChange={(e) => setFormData({...formData, postpone2_date: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." disabled={isViewMode} />
                                    <button type="button" onClick={() => handleOpenApptCalendar('postpone2_date')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">สถานะใหม่ <span className="text-rose-500">*</span></label>
                                  <CustomSelect value={formData.postpone2_status} onChange={(val) => setFormData({...formData, postpone2_status: val})} options={dealStatuses} disabled={isViewMode} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ครั้งที่ 3 */}
                          {formData.postpone2_status === 'postponed' && (
                            <div className="space-y-3 pt-3 border-t border-violet-200/60">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
                                <span className="text-xs font-semibold text-violet-600 kanit-text">เลื่อนครั้งที่ 3</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                <div className="relative">
                                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">วันที่เลื่อนนัด <span className="text-rose-500">*</span></label>
                                  <div className="relative group">
                                    <input required type="text" className="w-full px-3 py-2.5 pr-10 rounded-xl bg-white border border-violet-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-data" value={formData.postpone3_date} onChange={(e) => setFormData({...formData, postpone3_date: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." disabled={isViewMode} />
                                    <button type="button" onClick={() => handleOpenApptCalendar('postpone3_date')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">สถานะใหม่ <span className="text-rose-500">*</span></label>
                                  <CustomSelect value={formData.postpone3_status} onChange={(val) => setFormData({...formData, postpone3_status: val})} options={dealStatuses} disabled={isViewMode} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ครั้งที่ 4 (สูงสุด) */}
                          {formData.postpone3_status === 'postponed' && (
                            <div className="space-y-3 pt-3 border-t border-violet-200/60">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">4</div>
                                <span className="text-xs font-semibold text-rose-600 kanit-text">เลื่อนครั้งที่ 4 (สูงสุด)</span>
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 kanit-text">ครั้งสุดท้าย</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                <div className="relative">
                                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">วันที่เลื่อนนัด <span className="text-rose-500">*</span></label>
                                  <div className="relative group">
                                    <input required type="text" className="w-full px-3 py-2.5 pr-10 rounded-xl bg-white border border-rose-200 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-data" value={formData.postpone4_date} onChange={(e) => setFormData({...formData, postpone4_date: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." disabled={isViewMode} />
                                    <button type="button" onClick={() => handleOpenApptCalendar('postpone4_date')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">สถานะสุดท้าย <span className="text-rose-500">*</span></label>
                                  <CustomSelect value={formData.postpone4_status} onChange={(val) => setFormData({...formData, postpone4_status: val})} options={dealStatuses.filter(s => s.value !== 'postponed')} disabled={isViewMode} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">อาการ</label>
                        <textarea rows="2" className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm resize-none font-data" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} placeholder="เช่น ติดตามอาการ, ฟังผลเลือด..."></textarea>
                    </div>
                </div>
                </fieldset>

                {/* กลุ่มข้อมูลติดต่อเพิ่มเติม (อยู่นอก fieldset เพื่อให้ลิงก์โทรศัพท์/โซเชียลคลิกได้สมบูรณ์) */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-sky-600 mb-4 flex items-center gap-2 kanit-text"><Phone size={16} /> ข้อมูลการติดต่อ (Social & Phone)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                            <div className="space-y-2">
                                {formData.phones.map((phone, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        {isViewMode ? (
                                            phone ? (
                                                <a 
                                                    href={`tel:${phone}`} 
                                                    className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 hover:text-sky-800 transition-all font-data text-sm font-semibold group"
                                                >
                                                    <span>{phone}</span>
                                                    <span className="flex items-center gap-1.5 text-xs text-sky-500 group-hover:text-sky-600 kanit-text font-medium bg-sky-100/50 px-2.5 py-1 rounded-lg">
                                                        <Phone size={14} className="animate-pulse" />
                                                        กดเพื่อโทรออก
                                                    </span>
                                                </a>
                                            ) : (
                                                <div className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 text-sm font-data italic">ไม่มีข้อมูลเบอร์โทรศัพท์</div>
                                            )
                                        ) : (
                                            <>
                                                <input required type="tel" className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={phone} onChange={(e) => handlePhoneChange(idx, e.target.value)} placeholder="08X-XXX-XXXX" />
                                                {formData.phones.length > 1 && (
                                                    <button type="button" onClick={() => removePhone(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                                                )}
                                            </>
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
                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" value={formData.lineId} onChange={(e) => setFormData({...formData, lineId: e.target.value})} placeholder="Line ID" disabled={isViewMode} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">Facebook</label>
                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" value={formData.facebook} onChange={(e) => setFormData({...formData, facebook: e.target.value})} placeholder="ชื่อ Facebook" disabled={isViewMode} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">Instagram</label>
                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} placeholder="@username" disabled={isViewMode} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1 kanit-text">TikTok</label>
                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" value={formData.tiktok} onChange={(e) => setFormData({...formData, tiktok: e.target.value})} placeholder="@username" disabled={isViewMode} />
                        </div>
                    </div>
                </div>
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
        <div className={`fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${apptCalendar.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={apptCalendar.close}></div>
          <div 
            ref={apptSwipeProps.ref} 
            style={apptSwipeProps.style} 
            className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${apptCalendar.isClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-1 pb-4 -mt-2 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
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
                          const formatted = `${d}/${m}/${y} ${apptTime.h}:${apptTime.m} น.`;
                          setFormData({...formData, [activeDateField]: formatted});
                          apptCalendar.close();
                    }} className="px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20 transition-colors kanit-text whitespace-nowrap">ตกลง</button>
                </div>
            </div>
          </div>
        </div>
      )}

      

      {isProcessing && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm fade-in">
          <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 modal-animate-in">
            <div className="relative w-16 h-16"><div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div><div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div></div>
            <p className="font-semibold text-slate-700 kanit-text">กำลังประมวลผล...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentManager;


