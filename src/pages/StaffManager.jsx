import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';
import CalendarDay from './CalendarDay';
import AnimatedModal from './AnimatedModal';
import { daysTH } from '../global/constants';
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

const StaffManager = ({ staffData = [], setStaffData, financeData = [], setFinanceData, posHistoryData = [], branchesData = [], callAppScript, showToast, isGlobalLoading, showGlobalAlert, globalAlert, staffPrefixes = [], staffCategories = [], roleLabels = {}, gdriveTokens }) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const staffModal = useModal();
  const scheduleModal = useModal();
  const payrollModal = useModal();
      const [editingId, setEditingId] = useState(null);
  
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalDate, setStaffModalDate] = useState(null);
  const closeStaffModal = () => setShowStaffModal(false);
  const staffSwipeHandlers = useSwipeDown(closeStaffModal);

  const dragStaffState = useRef({
    isDragging: false, element: null, clone: null, eventData: null,
    startX: 0, startY: 0, offsetX: 0, offsetY: 0, shiftY: 0, currentDropzone: null, holdTimer: null
  });

  const handleStaffDrop = async (dragData, toDateStr) => {
    if (dragData.fromDate === toDateStr) return; 

    const staffToUpdate = staffData.find(s => s.id === dragData.staffId);
    if (!staffToUpdate) return;

    let newSchedule = { ...(staffToUpdate.schedule || {}) };
    newSchedule[dragData.fromDate] = { active: false }; 
    newSchedule[toDateStr] = { 
        active: true, 
        start: dragData.start || '09:00', 
        end: dragData.end || '20:00' 
    };

    const updatedStaff = { ...staffToUpdate, schedule: newSchedule };
    
    // --- Optimistic UI Update: เปลี่ยนแปลงหน้าจอทันทีไม่ต้องรอโหลด ---
    setStaffData(prev => prev.map(s => s.id === dragData.staffId ? updatedStaff : s));
    
    setIsProcessing(true);
    try {
        if (callAppScript) await callAppScript('SAVE_DATA', 'Staff', updatedStaff);
        showToast(`ย้ายกะทำงานของ ${staffToUpdate.name.split(' ')[0]} สำเร็จ`, 'success');
    } catch (error) {
        showToast('ย้ายตารางงานไม่สำเร็จ', 'danger');
        // หากเซิร์ฟเวอร์มีปัญหา ให้ย้อนกลับการกระทำ
        setStaffData(prev => prev.map(s => s.id === dragData.staffId ? staffToUpdate : s));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleStaffPointerDown = (e, ev) => {
    e.stopPropagation();
    if (isProcessing) return; // ป้องกันคลิกซ้อนตอนกำลังโหลด
    if (e.pointerType === 'mouse' && e.button !== 0) return; 

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    if (dragStaffState.current.holdTimer) clearTimeout(dragStaffState.current.holdTimer);

    if (dragStaffState.current.clone && dragStaffState.current.clone.parentNode) {
        dragStaffState.current.clone.parentNode.removeChild(dragStaffState.current.clone);
    }

    const isTouch = e.pointerType === 'touch';
    const shiftY = isTouch ? 45 : 15;

    dragStaffState.current = {
      isDragging: false, element: target, clone: null, eventData: ev,
      startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      shiftY: shiftY,
      currentDropzone: null, holdTimer: null
    };

    const startDragging = () => {
      const state = dragStaffState.current;
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
          if (dragStaffState.current.clone) dragStaffState.current.clone.style.transition = 'none';
      }, 150);

      document.body.appendChild(clone);
      state.clone = clone;
      target.style.opacity = '0.15';
      
      if (navigator.vibrate && isTouch) navigator.vibrate(50);
    };

    if (e.pointerType === 'touch') {
      dragStaffState.current.holdTimer = setTimeout(startDragging, 200);
    }

    const handlePointerMove = (moveEvent) => {
      const state = dragStaffState.current;
      if (!state.element) return;

      const dx = Math.abs(moveEvent.clientX - state.startX);
      const dy = Math.abs(moveEvent.clientY - state.startY);

      if (!state.isDragging && (dx > 5 || dy > 5)) {
        if (state.holdTimer) clearTimeout(state.holdTimer);
        if (e.pointerType === 'mouse') startDragging();
        else { dragStaffState.current.element = null; return; }
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
      const state = dragStaffState.current;
      if (state.holdTimer) clearTimeout(state.holdTimer);

      let wasDragging = state.isDragging; // --- จำสถานะว่าเพิ่งลากเสร็จ ---

      if (state.isDragging) {
        if (state.currentDropzone) {
          const dateStr = state.currentDropzone.getAttribute('data-date');
          if (dateStr) {
             handleStaffDrop(state.eventData, dateStr);
          }
        }
      }

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);

      if (state.clone && state.clone.parentNode) state.clone.parentNode.removeChild(state.clone);
      if (state.element) state.element.style.opacity = '1';
      if (state.currentDropzone) state.currentDropzone.classList.remove('dropzone-active');
      document.body.classList.remove('is-custom-dragging');
      dragStaffState.current = { isDragging: false, element: null, clone: null, eventData: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, shiftY: 0, currentDropzone: null, holdTimer: null };

      // --- [FIX] บล็อกการ Click หากเพิ่งวางรายการเพื่อไม่ให้ Modal เปิดซ้อน ---
      if (wasDragging) {
          const preventClick = (e) => {
              e.stopPropagation();
              e.preventDefault();
              window.removeEventListener('click', preventClick, true);
          };
          window.addEventListener('click', preventClick, true);
          setTimeout(() => window.removeEventListener('click', preventClick, true), 100);
      }
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  const activeTimelineDrag = useRef(null);

  const formatTimeNum = (num) => {
      const h = Math.floor(num);
      const m = Math.round((num - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const parseTimeStr = (str) => {
      if (!str) return 0;
      const [h, m] = str.split(':').map(Number);
      return h + (m / 60);
  };

  const handleTimelinePointerDown = (e, staff, dateStr, actionType) => {
      e.stopPropagation();
      if (isProcessing) return; // ป้องกันลาก/คลิกซ้อน
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const blockEl = e.currentTarget.closest('.timeline-block');
      if (!blockEl) return;

      const containerWidth = blockEl.parentElement.offsetWidth;
      const pixelsPerHour = containerWidth / 18; 

      activeTimelineDrag.current = {
          staffId: staff.id,
          dateStr,
          actionType, 
          startX: e.clientX,
          origStartNum: parseTimeStr(staff.start),
          origEndNum: parseTimeStr(staff.end),
          blockEl,
          pixelsPerHour,
          currentStartNum: parseTimeStr(staff.start),
          currentEndNum: parseTimeStr(staff.end)
      };

      document.body.classList.add('is-custom-dragging');
      blockEl.style.transition = 'none'; 
      blockEl.classList.add('z-50', 'ring-2', 'ring-indigo-400', 'shadow-lg');

      document.addEventListener('pointermove', handleTimelinePointerMove);
      document.addEventListener('pointerup', handleTimelinePointerUp);
      document.addEventListener('pointercancel', handleTimelinePointerUp);
  };

  const handleTimelinePointerMove = (e) => {
      const state = activeTimelineDrag.current;
      if (!state) return;

      const deltaX = e.clientX - state.startX;
      let deltaHours = deltaX / state.pixelsPerHour;
      
      deltaHours = Math.round(deltaHours * 2) / 2;

      let newStart = state.origStartNum;
      let newEnd = state.origEndNum;

      if (state.actionType === 'move') {
          newStart = Math.max(6, Math.min(24 - (state.origEndNum - state.origStartNum), state.origStartNum + deltaHours));
          newEnd = newStart + (state.origEndNum - state.origStartNum);
      } else if (state.actionType === 'resize-start') {
          newStart = Math.max(6, Math.min(state.origEndNum - 0.5, state.origStartNum + deltaHours));
      } else if (state.actionType === 'resize-end') {
          newEnd = Math.max(state.origStartNum + 0.5, Math.min(24, state.origEndNum + deltaHours));
      }

      state.currentStartNum = newStart;
      state.currentEndNum = newEnd;

      const leftPercent = ((newStart - 6) / 18) * 100;
      const widthPercent = ((newEnd - newStart) / 18) * 100;
      
      state.blockEl.style.left = `${leftPercent}%`;
      state.blockEl.style.width = `${widthPercent}%`;
      
      const textEl = state.blockEl.querySelector('.timeline-text');
      if (textEl) textEl.textContent = `${formatTimeNum(newStart)} - ${formatTimeNum(newEnd)}`;
  };

  const handleTimelinePointerUp = async (e) => {
      const state = activeTimelineDrag.current;
      if (!state) return;

      let wasDragged = (state.currentStartNum !== state.origStartNum || state.currentEndNum !== state.origEndNum);

      document.removeEventListener('pointermove', handleTimelinePointerMove);
      document.removeEventListener('pointerup', handleTimelinePointerUp);
      document.removeEventListener('pointercancel', handleTimelinePointerUp);

      document.body.classList.remove('is-custom-dragging');
      if (state.blockEl) {
          state.blockEl.style.transition = ''; 
          state.blockEl.classList.remove('z-50', 'ring-2', 'ring-indigo-400', 'shadow-lg');
      }

      // เคลียร์ State การลากทันที เพื่อป้องกันการอ้างอิงผิดพลาดถ้ามีการคลิกซ้อนรัวๆ
      activeTimelineDrag.current = null;

      // --- [FIX] บล็อกการ Click หากยืดหดหรือเลื่อนเวลา ---
      if (wasDragged) {
          const preventClick = (eClick) => {
              eClick.stopPropagation();
              eClick.preventDefault();
              window.removeEventListener('click', preventClick, true);
          };
          window.addEventListener('click', preventClick, true);
          setTimeout(() => window.removeEventListener('click', preventClick, true), 100);
      }

      if (wasDragged) {
          const newStartStr = formatTimeNum(state.currentStartNum);
          const newEndStr = formatTimeNum(state.currentEndNum);

          const staffToUpdate = staffData.find(s => s.id === state.staffId);
          if (staffToUpdate) {
              const newSchedule = { ...(staffToUpdate.schedule || {}) };
              const existingData = newSchedule[state.dateStr] || {};
              newSchedule[state.dateStr] = {
                  ...existingData,
                  active: true,
                  start: newStartStr,
                  end: newEndStr
              };

              const updatedStaff = { ...staffToUpdate, schedule: newSchedule };
              
              // --- Optimistic UI Update: อัปเดตตารางเวลาใหม่ให้ผู้ใช้เห็นทันที ---
              setStaffData(prev => prev.map(s => s.id === state.staffId ? updatedStaff : s));

              setIsProcessing(true);
              try {
                  if (callAppScript) await callAppScript('SAVE_DATA', 'Staff', updatedStaff);
                  showToast('อัปเดตเวลาทำงานสำเร็จ', 'success');
              } catch (error) {
                  showToast('อัปเดตไม่สำเร็จ กรุณาลองใหม่', 'danger');
                  // Revert กลับเป็นเวลาเดิมหากเกิดข้อผิดพลาด
                  setStaffData(prev => prev.map(s => s.id === state.staffId ? staffToUpdate : s));
              } finally {
                  setIsProcessing(false);
              }
          }
      }
  };

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = React.useRef(null);
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);

  const [showDobCalendar, setShowDobCalendar] = useState(false);
  const [dobCalDate, setDobCalDate] = useState(new Date());
  const [dobCalView, setDobCalView] = useState('days');
  const [dobYearPageStart, setDobYearPageStart] = useState(0);
  const [isDobCalendarClosing, setIsDobCalendarClosing] = useState(false);
  const dobWrapperRef = React.useRef(null);

  const closeDobCalendar = () => {
      setIsDobCalendarClosing(true);
      setTimeout(() => { setShowDobCalendar(false); setIsDobCalendarClosing(false); }, 300);
  };
  const dobCalSwipeProps = useSwipeDown(closeDobCalendar);

  const handleDobChange = (e) => {
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

  // --- ฟังก์ชันจัดการปฏิทินวันเกิดที่ขาดหายไป ---
  const handlePrevDobMonth = () => setDobCalDate(new Date(dobCalDate.getFullYear(), dobCalDate.getMonth() - 1, 1));
  const handleNextDobMonth = () => setDobCalDate(new Date(dobCalDate.getFullYear(), dobCalDate.getMonth() + 1, 1));

  const handleSelectDobDate = (day) => {
      const dateStr = `${String(day).padStart(2, '0')}/${String(dobCalDate.getMonth() + 1).padStart(2, '0')}/${dobCalDate.getFullYear() + 543}`;
      setFormData({ ...formData, dob: dateStr });
      closeDobCalendar();
  };

  const blankDobDays = Array.from({ length: new Date(dobCalDate.getFullYear(), dobCalDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthDobDays = Array.from({ length: new Date(dobCalDate.getFullYear(), dobCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
  
  useEffect(() => {
    if (dobCalView === 'years') setDobYearPageStart(Math.floor((dobCalDate.getFullYear() + 543) / 12) * 12);
  }, [dobCalView, dobCalDate]);
  // ----------------------------------------------------

  // --- States สำหรับปฏิทินช่วงเวลาการจ่ายเงิน (Payroll Range Calendar) ---
  const [showPayrollCalendar, setShowPayrollCalendar] = useState(false);
  const [payrollCalDate, setPayrollCalDate] = useState(new Date());
  const [payrollCalView, setPayrollCalView] = useState('days');
  const [payrollYearPageStart, setPayrollYearPageStart] = useState(0);
  const [isPayrollCalendarClosing, setIsPayrollCalendarClosing] = useState(false);

  const [payrollStartDate, setPayrollStartDate] = useState(null);
  const [payrollEndDate, setPayrollEndDate] = useState(null);

  const closePayrollCalendar = () => {
      setIsPayrollCalendarClosing(true);
      setTimeout(() => { setShowPayrollCalendar(false); setIsPayrollCalendarClosing(false); }, 300);
  };
  const payrollCalSwipeProps = useSwipeDown(closePayrollCalendar);

  const handleOpenPayrollCalendar = () => {
      setPayrollStartDate(payrollConfig.startDate);
      setPayrollEndDate(payrollConfig.endDate);
      if (payrollConfig.startDate) {
          setPayrollCalDate(new Date(payrollConfig.startDate));
      } else {
          setPayrollCalDate(new Date());
      }
      setPayrollCalView('days');
      setShowPayrollCalendar(true);
  };

  const handlePrevPayrollMonth = () => setPayrollCalDate(new Date(payrollCalDate.getFullYear(), payrollCalDate.getMonth() - 1, 1));
  const handleNextPayrollMonth = () => setPayrollCalDate(new Date(payrollCalDate.getFullYear(), payrollCalDate.getMonth() + 1, 1));
  
  const handleSelectPayrollDate = (day) => {
      const selectedDate = new Date(payrollCalDate.getFullYear(), payrollCalDate.getMonth(), day);
      selectedDate.setHours(0,0,0,0);

      if (!payrollStartDate || (payrollStartDate && payrollEndDate)) {
          // เริ่มเลือกใหม่
          setPayrollStartDate(selectedDate);
          setPayrollEndDate(null);
      } else {
          // เลือกวันสิ้นสุด
          if (selectedDate >= payrollStartDate) {
              setPayrollEndDate(selectedDate);
          } else {
              setPayrollStartDate(selectedDate);
              setPayrollEndDate(null);
          }
      }
  };

  const confirmPayrollRange = () => {
      if (payrollStartDate && payrollEndDate) {
          setPayrollConfig({
              ...payrollConfig,
              startDate: payrollStartDate,
              endDate: payrollEndDate
          });
          closePayrollCalendar();
      } else {
          showToast('กรุณาเลือกทั้งวันเริ่มต้นและวันสิ้นสุด', 'warning');
      }
  };

  const formatRangeDateStr = (dateObj) => {
      if (!dateObj) return '';
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear() + 543;
      return `${d}/${m}/${y}`;
  };

  useEffect(() => {
      if (payrollCalView === 'years') setPayrollYearPageStart(Math.floor((payrollCalDate.getFullYear() + 543) / 12) * 12);
  }, [payrollCalView, payrollCalDate]);

  const blankPayrollDays = Array.from({ length: new Date(payrollCalDate.getFullYear(), payrollCalDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthPayrollDays = Array.from({ length: new Date(payrollCalDate.getFullYear(), payrollCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const daysTH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  // เปิดกล้องเมื่อเปิด Scanner
  useEffect(() => {
    let active = true;
    let stream = null;
    if (isScannerOpen && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          if (!active) {
            s.getTracks().forEach(track => track.stop());
            return;
          }
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => { showToast('อุปกรณ์ไม่รองรับ หรือไม่ได้อนุญาตให้ใช้กล้อง', 'warning'); });
    }
    return () => {
      active = false;
      if (videoRef.current) {
          try { videoRef.current.srcObject = null; } catch (e) {}
      }
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScannerOpen]);
  
  // Form พนักงาน
  const initialForm = { 
    id: '', empCode: '', username: '', password: '', category: 'staff', position: '', email: '',
    prefix: '', firstName: '', lastName: '', name: '', role: 'nurse', phone: '', idCard: '', dob: '', gender: '', licenseNumber: '',
    nationality: 'ไทย', ethnicity: 'ไทย', religion: 'พุทธ',
    address: '', moo: '', road: '', subDistrict: '', district: '', province: '', zipcode: '',
    curAddress: '', curMoo: '', curRoad: '', curSubDistrict: '', curDistrict: '', curProvince: '', curZipcode: '',
    emName: '', emRelation: '', emPhone: '', emAddress: '',
    baseSalary: 0, commissionRate: 0, commissionType: 'percent', commissionCondition: 'all', commissionThreshold: 0, otRate: 0, branchId: 'b1', schedule: {}, photo: '' 
  };
  const [formData, setFormData] = useState(initialForm);

  // Form ตารางงาน
  const initialSchedule = {
      0: { active: false, start: '09:00', end: '20:00' },
      1: { active: true, start: '09:00', end: '20:00' },
      2: { active: true, start: '09:00', end: '20:00' },
      3: { active: true, start: '09:00', end: '20:00' },
      4: { active: true, start: '09:00', end: '20:00' },
      5: { active: true, start: '09:00', end: '20:00' },
      6: { active: false, start: '09:00', end: '20:00' }
  };
  const [selectedScheduleStaff, setSelectedScheduleStaff] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(initialSchedule);

  // --- States สำหรับปฏิทินตารางงานพิเศษ ---
  const [schedCalDate, setSchedCalDate] = useState(new Date());
  const [schedSelectedDate, setSchedSelectedDate] = useState(new Date());
  const [overviewDate, setOverviewDate] = useState(new Date()); // เพิ่มตัวแปรนี้สำหรับปฏิทินภาพรวมรายเดือน
  const [overviewViewMode, setOverviewViewMode] = useState('month'); // 'month' หรือ 'week'

  // Form จ่ายเงินเดือน/ค่าคอม
  const [selectedPayrollStaff, setSelectedPayrollStaff] = useState(null);
  const [payrollForm, setPayrollForm] = useState({ salary: 0, commission: 0, bonus: 0, socialSecurity: 0, customDeductions: [], total: 0, note: '' });

  const [payrollConfig, setPayrollConfig] = useState({
      periodType: 'all',
      startDate: null,
      endDate: null
  });

  // --- State สำหรับดูโปรไฟล์และรูปภาพพนักงาน ---
  const [viewProfileStaff, setViewProfileStaff] = useState(null);
  const [isProfileClosing, setIsProfileClosing] = useState(false);
  const [viewImageSrc, setViewImageSrc] = useState(null);
  const [isImageClosing, setIsImageClosing] = useState(false);

  const closeProfileModal = () => {
      setIsProfileClosing(true);
      setTimeout(() => { setViewProfileStaff(null); setIsProfileClosing(false); }, 300);
  };

  const closeImageViewer = () => {
      setIsImageClosing(true);
      setTimeout(() => { setViewImageSrc(null); setIsImageClosing(false); }, 300);
  };

  const unpaidDatesMemo = useMemo(() => {
      if (!selectedPayrollStaff) return [];
      let unpaid = [];
      const today = new Date();
      today.setHours(0,0,0,0);
      
      Object.keys(selectedPayrollStaff.schedule || {}).forEach(dateStr => {
          const sData = selectedPayrollStaff.schedule[dateStr];
          if (sData && sData.active && !sData.isPaid) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                  const dateObj = new Date(parseInt(parts[2])-543, parseInt(parts[1])-1, parseInt(parts[0]));
                  dateObj.setHours(0,0,0,0);
                  if (dateObj <= today) {
                      if (payrollConfig.periodType === 'all') {
                          unpaid.push({ dateStr, dateObj, data: sData });
                      } else if (payrollConfig.periodType === 'range') {
                          if (payrollConfig.startDate && payrollConfig.endDate) {
                             const start = new Date(payrollConfig.startDate);
                             start.setHours(0,0,0,0);
                             const end = new Date(payrollConfig.endDate);
                             end.setHours(23,59,59,999);
                             if (dateObj >= start && dateObj <= end) {
                                unpaid.push({ dateStr, dateObj, data: sData });
                             }
                          }
                      }
                  }
              }
          }
      });
      return unpaid;
  }, [selectedPayrollStaff, payrollConfig]);

  useEffect(() => {
      if (!selectedPayrollStaff || !payrollModal.isOpen) return;
      const empType = selectedPayrollStaff.employmentType || 'monthly';
      const baseRate = Number(selectedPayrollStaff.baseSalary) || 0;
      
      let totalBasePay = 0;
      let totalOtHours = 0;
      
      if (empType === 'monthly') {
          if (payrollConfig.periodType === 'all') {
              totalBasePay = baseRate;
          } else {
              totalBasePay = Number((baseRate / 30).toFixed(2)) * unpaidDatesMemo.length;
          }
      } else if (empType === 'daily') {
          totalBasePay = unpaidDatesMemo.length * baseRate;
      } else if (empType === 'hourly') {
          let totalHours = 0;
          unpaidDatesMemo.forEach(item => {
              const startNum = parseTimeStr(item.data.start || '09:00');
              const endNum = parseTimeStr(item.data.end || '20:00');
              totalHours += Math.max(0, endNum - startNum);
          });
          totalBasePay = totalHours * baseRate;
      }
      
      unpaidDatesMemo.forEach(item => {
          totalOtHours += Number(item.data.otHours) || 0;
      });
      
      const currentOtRate = payrollForm.otRate !== undefined ? payrollForm.otRate : (Number(selectedPayrollStaff.otRate) || 0);
      const otTotal = totalOtHours * currentOtRate;
      
      setPayrollForm(prev => ({
          ...prev,
          salary: totalBasePay,
          otHours: totalOtHours,
          otTotal: otTotal,
          otRate: currentOtRate,
          note: `จ่ายเงินเดือน (${empType === 'monthly' ? 'รายเดือน' : empType === 'daily' ? 'รายวัน' : 'Part-time'})\nรอบ: ${payrollConfig.periodType === 'all' ? 'ทั้งหมดที่ค้างจ่าย' : 'ระบุช่วงเวลา'}\nวันทำงานที่ค้างจ่าย: ${unpaidDatesMemo.length} วัน`
      }));
  }, [unpaidDatesMemo, selectedPayrollStaff, payrollModal.isOpen, payrollConfig.periodType]);

  // --- Modal สำหรับแสดงรายชื่อพนักงานที่เข้ากะ ---
  const renderStaffScheduleModal = () => {
      if (!showStaffModal || !staffModalDate) return null;

      const dayOfWeek = staffModalDate.getDay();
      const dateStr = `${String(staffModalDate.getDate()).padStart(2,'0')}/${String(staffModalDate.getMonth()+1).padStart(2,'0')}/${staffModalDate.getFullYear()+543}`;

      // ดึงพนักงาน "ทั้งหมด" ที่ตั้งค่าว่าทำงานในวันนี้
      const workingStaff = staffData.filter(s => {
          if (!s.schedule) return false;
          const specificData = s.schedule[dateStr];
          if (specificData !== undefined) return specificData.active;
          if (typeof s.schedule === 'object' && s.schedule[dayOfWeek]) return s.schedule[dayOfWeek].active;
          if (Array.isArray(s.schedule)) return s.schedule.includes(dayOfWeek);
          return false;
      });

      // จัดกลุ่มพนักงานตามตำแหน่ง
      // จัดกลุ่มพนักงานตามตำแหน่งแบบไดนามิก
      const displayRoleLabels = roleLabels || { doctor: 'แพทย์ (Doctor)', nurse: 'พยาบาล/ผู้ช่วย (Nurse)', sale: 'พนักงานขาย/ที่ปรึกษา', admin: 'แอดมิน/จัดการทั่วไป' };
      const groupedStaff = {};
      Object.keys(displayRoleLabels).forEach(key => {
          groupedStaff[key] = workingStaff.filter(s => s.role === key);
      });
      // รวบรวมพนักงานที่มีบทบาทอื่นนอกเหนือจากที่กำหนด
      const otherStaff = workingStaff.filter(s => !Object.keys(displayRoleLabels).includes(s.role));
      if (otherStaff.length > 0) {
          groupedStaff['other'] = otherStaff;
      }

      const roleColors = {
          doctor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          nurse: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          sale: 'text-amber-600 bg-amber-50 border-amber-200',
          admin: 'text-slate-600 bg-slate-100 border-slate-200'
      };
      Object.keys(displayRoleLabels).forEach(key => {
          if (!roleColors[key]) {
              roleColors[key] = 'text-sky-600 bg-sky-50 border-sky-200';
          }
      });
      if (!roleColors['other']) {
          roleColors['other'] = 'text-sky-600 bg-sky-50 border-sky-200';
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
                                              {displayRoleLabels[roleKey] || roleKey} ({staffs.length})
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

  // --- ฟังก์ชันจัดการปฏิทินวันเกิด ---
  const handleOpenDobCalendar = () => {
    if (formData.dob?.length === 10) {
      const parts = formData.dob.split('/');
      const y = parseInt(parts[2], 10) - 543;
      if (!isNaN(y)) setDobCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
      else setDobCalDate(new Date());
    } else setDobCalDate(new Date());
    setDobCalView('days');
    setShowDobCalendar(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB', 'warning');
        return;
      }

      if (!gdriveTokens?.generalDriveFolderId) {
        showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลเพื่อจัดเก็บหลักฐานได้ กรุณาตั้งค่าการเชื่อมต่อในหน้า Settings ก่อน', 'danger');
        return;
      }

      setIsProcessing(true);
      showToast('กำลังอัปโหลดรูปภาพ...', 'success');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1]; 
        
        try {
            // ส่งข้อมูลไปยัง Google Apps Script เพื่ออัปโหลดลง Drive
            const response = await callAppScript('UPLOAD_FILE', 'Staff', {
                fileName: `STAFF_${Date.now()}_${file.name}`,
                mimeType: file.type,
                data: base64Data,
                // กำหนด ID ของโฟลเดอร์ Google Drive ปลายทาง
                folderId: gdriveTokens.generalDriveFolderId
            });

            if (response.status === 'success' && response.fileUrl) {
                // อัปเดตข้อมูลพนักงานเป็น URL แทน Base64 (ใช้ prev เพื่อป้องกันข้อมูลที่กำลังพิมพ์อยู่หาย)
                setFormData(prev => ({ ...prev, photo: response.fileUrl }));
                showToast('อัปโหลดรูปภาพสำเร็จ (อย่าลืมกดปุ่มบันทึกข้อมูลด้านล่าง)', 'success');
            } else {
                throw new Error(response.message || 'ไม่สามารถรับ URL ของรูปภาพได้');
            }
        } catch (error) {
            console.error("Upload error:", error);
            showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message, 'danger');
        } finally {
            setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const copyAddressToCurrent = () => {
    setFormData({
      ...formData, curAddress: formData.address, curMoo: formData.moo, curRoad: formData.road,
      curSubDistrict: formData.subDistrict, curDistrict: formData.district, curProvince: formData.province, curZipcode: formData.zipcode
    });
  };

  // --- ฟังก์ชัน OCR และ Smart Card (คัดลอกและปรับปรุงจากระบบเวชระเบียนเพื่อให้ทำงานสมบูรณ์) ---
  const captureImageToBase64 = () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg').split(',')[1]; 
  };

  const parseIdCardText = (text) => {
    const lines = text.split('\n').map(line => line.trim());
    let extractedData = { idCard: '', prefix: '', firstName: '', lastName: '', dob: '', gender: '', address: '', moo: '', road: '', subDistrict: '', district: '', province: '', religion: '', nationality: '' };
    
    // 1. หาเลขบัตรประชาชน
    const idMatch = text.replace(/\s/g, '').match(/\d{13}/);
    if (idMatch) extractedData.idCard = idMatch[0];

    // 2. หาชื่อ-นามสกุลไทย และ เพศ
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ชื่อตัวและชื่อสกุล') || line.match(/^(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.)/)) {
            let nameLine = line.replace('ชื่อตัวและชื่อสกุล', '').trim();
            if (!nameLine && i + 1 < lines.length) nameLine = lines[i+1].trim();
            
            const prefixMatch = nameLine.match(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/);
            if (prefixMatch) {
                let rawPrefix = prefixMatch[1];
                if (rawPrefix === 'น.ส.') rawPrefix = 'นางสาว';
                extractedData.prefix = rawPrefix;
                
                if (['นาย', 'ด.ช.'].includes(rawPrefix)) extractedData.gender = 'ชาย';
                else if (['นาง', 'นางสาว', 'ด.ญ.'].includes(rawPrefix)) extractedData.gender = 'หญิง';
                
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
        const thaiMonthsMap = { 'ม.ค.': '01', 'มกราคม': '01', 'ก.พ.': '02', 'กุมภาพันธ์': '02', 'มี.ค.': '03', 'มีนาคม': '03', 'เม.ย.': '04', 'เมษายน': '04', 'พ.ค.': '05', 'พฤษภาคม': '05', 'มิ.ย.': '06', 'มิถุนายน': '06', 'ก.ค.': '07', 'กรกฎาคม': '07', 'ส.ค.': '08', 'สิงหาคม': '08', 'ก.ย.': '09', 'กันยายน': '09', 'ต.ค.': '10', 'ตุลาคม': '10', 'พ.ย.': '11', 'พฤศจิกายน': '11', 'ธ.ค.': '12', 'ธันวาคม': '12' };
        let month = '01';
        for (const [key, value] of Object.entries(thaiMonthsMap)) { if (monthStr.includes(key)) { month = value; break; } }
        extractedData.dob = `${day}/${month}/${year}`;
    }

    // 4. หาศาสนาและสัญชาติ
    const religionMatch = text.match(/ศาสนา\s*([ก-๙]+)/);
    if (religionMatch) extractedData.religion = religionMatch[1].trim();
    const nationalityMatch = text.match(/สัญชาติ\s*([ก-๙]+)/);
    if (nationalityMatch) extractedData.nationality = nationalityMatch[1].trim();

    // 5. หาที่อยู่
    const addressIndex = lines.findIndex(line => line.includes('ที่อยู่') || line.includes('Address'));
    if (addressIndex !== -1) {
        let addressText = lines[addressIndex].replace(/ที่อยู่|Address/g, '').trim();
        let lineOffset = 1;
        while (addressIndex + lineOffset < lines.length) {
            const nextLine = lines[addressIndex + lineOffset];
            if (nextLine.includes('ศาสนา') || nextLine.match(/\d{13}/) || nextLine.includes('วันออกบัตร') || nextLine.includes('Date of Issue')) break;
            addressText += ' ' + nextLine.trim(); 
            lineOffset++;
        }
        addressText = addressText.replace(/\s+/g, ' ').trim();
        let provMatch = addressText.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/); if (provMatch) extractedData.province = provMatch[1];
        let distMatch = addressText.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s]+)/); if (distMatch) extractedData.district = distMatch[1];
        let subDistMatch = addressText.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s]+)/); if (subDistMatch) extractedData.subDistrict = subDistMatch[1];
        let roadMatch = addressText.match(/(?:ถนน|ถ\.)\s*([^\s]+)/); if (roadMatch) extractedData.road = roadMatch[1];
        let mooMatch = addressText.match(/หมู่(?:ที่)?\s*([^\s]+)/); if (mooMatch) extractedData.moo = mooMatch[1];
        let houseMatch = addressText.split(/\s+(หมู่|ซอย|ตรอก|ถนน|ตำบล|แขวง|อำเภอ|เขต|จังหวัด)/)[0];
        if (houseMatch) extractedData.address = houseMatch.replace(/^ที่อยู่\s*/, '').trim();
    }
    
    setIsScannerOpen(false);
    setTimeout(() => {
        setFormData(prev => ({ ...prev, ...extractedData }));
        showToast('ดึงข้อมูลจากบัตรประชาชน (OCR) สำเร็จ', 'success');
    }, 300);
  };

  const handleRealScan = async () => {
    const base64Image = captureImageToBase64();
    if (!base64Image) { showToast('ไม่สามารถจับภาพได้', 'warning'); return; }
    
    // Freeze the video frame to prevent GPU compositing flickers on mobile
    if (videoRef.current) {
        try { videoRef.current.pause(); } catch (e) { console.log(e); }
    }
    
    setIsScanning(true);
    try {
        const response = await fetch('/api/vision', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ requests: [{ image: { content: base64Image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }) 
        });
        const data = await response.json();
        
        if (data.error) {
            showToast(`API Error: ${data.error.message}`, 'danger');
            if (videoRef.current) { try { videoRef.current.play(); } catch (e) {} }
        } else if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
            parseIdCardText(data.responses[0].fullTextAnnotation.text); 
        } else {
            showToast('ไม่พบข้อความ กรุณาจัดบัตรให้ชัดเจนและสแกนใหม่', 'warning');
            if (videoRef.current) { try { videoRef.current.play(); } catch (e) {} }
        }
    } catch (error) { 
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Cloud Vision API', 'danger'); 
        if (videoRef.current) { try { videoRef.current.play(); } catch (e) {} }
    } finally { 
        setIsScanning(false); 
    }
  };

  const handleSmartCardRead = async () => {
    setIsProcessing(true);
    try {
        const response = await fetch('http://localhost:8181/api/read-card', { 
            method: 'GET', 
            headers: { 'Content-Type': 'application/json' }, 
            signal: AbortSignal.timeout(5000) 
        });
        
        if (!response.ok) throw new Error('ไม่สามารถอ่านบัตรได้ กรุณาเสียบบัตรให้แน่น');
        
        const data = await response.json();
        setFormData(prev => ({
            ...prev, 
            idCard: data.pid || data.citizenId || '', 
            prefix: data.titleName || data.titleTH || '', 
            firstName: data.fname || data.firstNameTH || '', 
            lastName: data.lname || data.lastNameTH || '',
            dob: data.dob ? `${data.dob.substring(6,8)}/${data.dob.substring(4,6)}/${data.dob.substring(0,4)}` : '',
            gender: data.gender === '1' || data.gender === 'Male' ? 'ชาย' : (data.gender === '2' || data.gender === 'Female' ? 'หญิง' : 'ไม่ระบุ'),
            religion: data.religion || prev.religion,
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

  const roleMap = useMemo(() => {
    const defaultMap = {
      'doctor': { label: 'แพทย์ (Doctor)', color: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: Stethoscope },
      'nurse': { label: 'พยาบาล/ผู้ช่วย (Nurse)', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: HeartPulse || Plus },
      'sale': { label: 'พนักงานขาย (Sale)', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: Tag },
      'admin': { label: 'แอดมิน (Admin)', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Settings },
    };
    const map = {};
    Object.entries(roleLabels || {
      admin: 'แอดมิน (Admin)',
      doctor: 'แพทย์ (Doctor)',
      nurse: 'พยาบาล/ผู้ช่วย (Nurse)',
      sale: 'พนักงานขาย/ที่ปรึกษา (Sale)'
    }).forEach(([key, label]) => {
      if (defaultMap[key]) {
        map[key] = defaultMap[key];
      } else {
        map[key] = {
          label: label,
          color: 'bg-sky-50 text-sky-600 border-sky-200',
          icon: UserCog
        };
      }
    });
    return map;
  }, [roleLabels]);

  const daysMap = [
    { val: 1, label: 'จันทร์', short: 'จ', color: 'bg-yellow-100 text-yellow-700' },
    { val: 2, label: 'อังคาร', short: 'อ', color: 'bg-pink-100 text-pink-700' },
    { val: 3, label: 'พุธ', short: 'พ', color: 'bg-green-100 text-green-700' },
    { val: 4, label: 'พฤหัส', short: 'พฤ', color: 'bg-orange-100 text-orange-700' },
    { val: 5, label: 'ศุกร์', short: 'ศ', color: 'bg-blue-100 text-blue-700' },
    { val: 6, label: 'เสาร์', short: 'ส', color: 'bg-purple-100 text-purple-700' },
    { val: 0, label: 'อาทิตย์', short: 'อา', color: 'bg-red-100 text-red-700' }
  ];

  const filteredStaff = useMemo(() => {
    return staffData.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search));
      const matchRole = filterRole === 'all' || s.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [staffData, search, filterRole]);

  const stats = useMemo(() => {
    const today = new Date().getDay();
    const doctors = staffData.filter(s => s.role === 'doctor').length;
    const workingToday = staffData.filter(s => {
       if (Array.isArray(s.schedule)) return s.schedule.includes(today);
       if (typeof s.schedule === 'object' && s.schedule[today]) return s.schedule[today].active;
       return false;
    }).length;
    return { total: staffData.length, doctors, workingToday };
  }, [staffData]);

  // --- Handlers ---
  const handleOpenAdd = () => {
    setEditingId(null);
    
    // คำนวณรหัสพนักงานอัตโนมัติ (EM001, EM002...)
    let maxNum = 0;
    staffData.forEach(s => {
        if (s.empCode && s.empCode.toUpperCase().startsWith('EM')) {
            const numMatch = s.empCode.match(/\d+$/);
            if (numMatch) {
                const num = parseInt(numMatch[0], 10);
                if (num > maxNum) maxNum = num;
            }
        }
    });
    const nextEmpCode = `EM${String(maxNum + 1).padStart(3, '0')}`;
    
    setFormData({ ...initialForm, empCode: nextEmpCode });
    staffModal.open();
  };

  const handleOpenEdit = (staff) => {
    setEditingId(staff.id);
    const parsed = parsePatientName(staff.name || '');
    setFormData({ 
       ...initialForm, 
       ...staff, 
       prefix: staff.prefix || parsed.prefix,
       firstName: staff.firstName || parsed.firstName,
       lastName: staff.lastName || parsed.lastName,
       employmentType: staff.employmentType || 'monthly',
       baseSalary: staff.baseSalary || 0, 
       commissionRate: staff.commissionRate || 0,
       otRate: staff.otRate || 0
    });
    staffModal.open();
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const finalId = editingId || `STF${Date.now()}`;
    const fullName = `${formData.prefix}${formData.firstName} ${formData.lastName}`.trim();
    
    const payload = {
       ...formData,
       id: finalId,
       name: fullName || formData.name,
       employmentType: formData.employmentType,
       baseSalary: Number(formData.baseSalary),
       commissionRate: Number(formData.commissionRate),
       otRate: Number(formData.otRate),
       createdAt: editingId ? formData.createdAt : new Date().toISOString()
    };

    try {
      if (callAppScript) {
        await callAppScript('SAVE_DATA', 'Staff', payload);
      }
      if (editingId) {
         setStaffData(prev => prev.map(s => s.id === editingId ? payload : s));
         showToast('อัปเดตข้อมูลพนักงานสำเร็จ', 'success');
      } else {
         setStaffData(prev => [payload, ...prev]);
         showToast('เพิ่มพนักงานใหม่สำเร็จ', 'success');
      }
      staffModal.close();
    } catch(err) {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (staff) => {
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบพนักงาน',
      text: `คุณต้องการลบข้อมูลพนักงาน "${staff.name}" ใช่หรือไม่?`,
      onConfirm: async () => {
         globalAlert.setIsOpen(false);
         setIsProcessing(true);
         try {
           if (callAppScript) {
             await callAppScript('DELETE_DATA', 'Staff', { id: staff.id });
           }
           setStaffData(prev => prev.filter(s => s.id !== staff.id));
           showToast('ลบพนักงานสำเร็จ', 'danger');
         } catch(err) {
           showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning');
         } finally {
           setIsProcessing(false);
         }
      }
    });
      };

  // --- Schedule ---
  const handleOpenSchedule = (staff) => {
    setSelectedScheduleStaff(staff);
    setSchedCalDate(new Date());
    setSchedSelectedDate(new Date());
    if (Array.isArray(staff.schedule)) {
        let converted = { ...initialSchedule };
        Object.keys(converted).forEach(day => { converted[day].active = false; });
        staff.schedule.forEach(day => {
            if (converted[day]) converted[day].active = true;
        });
        setScheduleForm(converted);
    } else {
        setScheduleForm(staff.schedule || initialSchedule);
    }
    scheduleModal.open();
  };

  const handleSaveSchedule = async () => {
    setIsProcessing(true);
    const updatedStaff = { ...selectedScheduleStaff, schedule: scheduleForm };
    try {
      if (callAppScript) {
        await callAppScript('SAVE_DATA', 'Staff', updatedStaff);
      }
      setStaffData(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
      showToast('อัปเดตตารางงานสำเร็จ', 'success');
      scheduleModal.close();
    } catch(err) {
      showToast('เกิดข้อผิดพลาด', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Payroll ---
  const handleOpenPayroll = (staff) => {
    setSelectedPayrollStaff(staff);
    setPayrollConfig({
        periodType: 'all',
        startDate: null,
        endDate: null
    });
    setPayrollStartDate(null);
    setPayrollEndDate(null);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const mySales = posHistoryData.filter(tx => 
        tx.sellerId === staff.id && 
        tx.status === 'completed' &&
        new Date(tx.createdAt || tx.date) > thirtyDaysAgo
    );
    
    const calculatedCommission = mySales.reduce((sum, tx) => sum + (Number(tx.commissionAmount) || 0), 0);

    setPayrollForm({
       salary: 0,
       commission: calculatedCommission,
       otHours: 0,
       otRate: Number(staff.otRate) || 0,
       otTotal: 0,
       bonus: 0,
       socialSecurity: 0,
       customDeductions: [],
       total: 0,
       note: ''
    });

    payrollModal.open();
  };

  // ฟังก์ชันจัดการรายการหักอื่นๆ แบบ Dynamic
  const handleAddCustomDeduction = () => {
      setPayrollForm(prev => ({ ...prev, customDeductions: [...prev.customDeductions, { description: '', amount: 0 }] }));
  };

  const handleRemoveCustomDeduction = (index) => {
      setPayrollForm(prev => ({ ...prev, customDeductions: prev.customDeductions.filter((_, i) => i !== index) }));
  };

  const handleCustomDeductionChange = (index, field, value) => {
      setPayrollForm(prev => {
          const newDeductions = [...prev.customDeductions];
          newDeductions[index] = { ...newDeductions[index], [field]: value };
          return { ...prev, customDeductions: newDeductions };
      });
  };

  useEffect(() => {
     const s = Number(payrollForm.salary) || 0;
     const c = Number(payrollForm.commission) || 0;
     const ot = Number(payrollForm.otTotal) || 0;
     const b = Number(payrollForm.bonus) || 0;
     const ss = Number(payrollForm.socialSecurity) || 0;
     const customDedTotal = (payrollForm.customDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
     
     setPayrollForm(prev => ({ ...prev, total: (s + c + ot + b) - (ss + customDedTotal) }));
  }, [payrollForm.salary, payrollForm.commission, payrollForm.otTotal, payrollForm.bonus, payrollForm.socialSecurity, payrollForm.customDeductions]);

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // สร้าง String บันทึกรายละเอียดการหักเงินให้บัญชีอ่านง่าย
    let deductionDetails = [];
    if (Number(payrollForm.socialSecurity) > 0) deductionDetails.push(`ประกันสังคม: ${payrollForm.socialSecurity}`);
    (payrollForm.customDeductions || []).forEach(d => {
        if (d.description || Number(d.amount) > 0) {
            deductionDetails.push(`${d.description || 'หักอื่นๆ'}: ${d.amount}`);
        }
    });
    const deductionStr = deductionDetails.length > 0 ? `\nรายการหัก: ${deductionDetails.join(' | ')}` : '';

    const financePayload = {
       id: `EXP-PR-${Date.now()}`,
       date: new Date().toISOString(),
       type: 'expense',
       category: 'เงินเดือน/ค่าตอบแทนพนักงาน',
       amount: payrollForm.total,
       subtotal: payrollForm.total,
       discountAmount: 0,
       vatAmount: 0,
       method: 'transfer', 
       status: 'completed',
       isAuto: false,
       branchId: selectedPayrollStaff.branchId || 'b1',
       patientId: selectedPayrollStaff.id, // เก็บ ID พนักงานไว้ใช้อ้างอิงตอนลบบิล
       reference: JSON.stringify(unpaidDatesMemo.map(item => item.dateStr)), // เก็บวันที่จ่ายเงินเอาไว้เพื่อใช้ในการคืนค่า (Revert) หากมีการลบบิล
       note: `จ่ายให้: ${selectedPayrollStaff.name}\nรายรับ: ค่าจ้างพื้นฐาน ${payrollForm.salary}, ค่าคอม ${payrollForm.commission}, OT ${payrollForm.otTotal} (${payrollForm.otHours||0}ชม. x ${payrollForm.otRate||0}฿), โบนัส ${payrollForm.bonus}${deductionStr}\nหมายเหตุ: ${payrollForm.note}`,
       items: [{ name: `เงินเดือน/ค่าตอบแทน (${selectedPayrollStaff.name})`, quantity: 1, price: payrollForm.total, total: payrollForm.total }]
    };

    // Update staff schedule to mark paid
    const newSchedule = { ...(selectedPayrollStaff.schedule || {}) };
    unpaidDatesMemo.forEach(item => {
        if (newSchedule[item.dateStr]) {
            newSchedule[item.dateStr] = { ...newSchedule[item.dateStr], isPaid: true };
        }
    });

    const updatedStaff = { ...selectedPayrollStaff, schedule: newSchedule };

    try {
      if (callAppScript) {
        await callAppScript('SAVE_DATA', 'Staff', updatedStaff);
        await callAppScript('SAVE_DATA', 'Finance_Expenses', financePayload);
      }
      if (setFinanceData) {
         setFinanceData(prev => [financePayload, ...prev]);
      }
      setStaffData(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));

      showToast('บันทึกการจ่ายเงินเดือนและอัปเดตสถานะวันทำงานแล้ว', 'success');
      payrollModal.close();
    } catch (err) {
      showToast('ไม่สามารถบันทึกได้', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(amount) || 0);

  return (
    <div className="fade-in pb-10 flex flex-col h-full w-full">
      {renderStaffScheduleModal()}
      {/* แก้ไข: เปลี่ยนจาก transform เป็น top */}
      <div className="sticky z-30 w-full pointer-events-none mb-4 transition-all duration-300 ease-in-out" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm px-4 md:px-8 2xl:px-12 py-4 flex flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text flex items-center gap-2">
              <UserCog className="text-sky-500" /> จัดการพนักงาน
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm kanit-text mt-0.5">จัดการข้อมูล, ตารางงาน และค่าคอมมิชชั่น</p>
          </div>
          <button onClick={handleOpenAdd} disabled={isGlobalLoading} className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 kanit-text text-sm sm:text-base pointer-events-auto ${isGlobalLoading ? 'bg-slate-300 text-white cursor-not-allowed shadow-none' : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20 active:scale-95'}`}>
            <Plus size={18} /> <span className="hidden sm:inline">เพิ่มพนักงาน</span>
          </button>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 space-y-4">
        {/* Stats (ปรับ Layout ใหม่) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
           <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-sky-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 text-sky-500 border border-sky-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <Users size={20} className="sm:w-6 sm:h-6" />
                 </div>
                 <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider leading-tight line-clamp-2" title="พนักงานทั้งหมด">พนักงานทั้งหมด</p>
                 </div>
              </div>
              <div className="relative z-10 mt-auto w-full">
                 <p className={`font-black text-slate-800 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.total))}`}>{formatStatNumber(stats.total)}</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
           </div>
           <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <Stethoscope size={20} className="sm:w-6 sm:h-6" />
                 </div>
                 <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="แพทย์ประจำ">แพทย์ประจำ</p>
                 </div>
              </div>
              <div className="relative z-10 mt-auto w-full">
                 <p className={`font-black text-slate-800 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.doctors))}`}>{formatStatNumber(stats.doctors)}</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
           </div>
           <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <CalendarClock size={20} className="sm:w-6 sm:h-6" />
                 </div>
                 <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="เข้ากะวันนี้">เข้ากะวันนี้</p>
                 </div>
              </div>
              <div className="relative z-10 mt-auto w-full">
                 <p className={`font-black text-emerald-600 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.workingToday))}`}>{formatStatNumber(stats.workingToday)}</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
           </div>
        </div>

        {/* --- NEW: ปฏิทินภาพรวมการทำงานของพนักงาน --- */}
        {(() => {
            const handlePrevOverview = () => {
                const newDate = new Date(overviewDate);
                if (overviewViewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
                else if (overviewViewMode === 'week') newDate.setDate(newDate.getDate() - 7);
                else newDate.setDate(newDate.getDate() - 1); // สำหรับมุมมองวัน
                setOverviewDate(newDate);
            };
            const handleNextOverview = () => {
                const newDate = new Date(overviewDate);
                if (overviewViewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
                else if (overviewViewMode === 'week') newDate.setDate(newDate.getDate() + 7);
                else newDate.setDate(newDate.getDate() + 1); // สำหรับมุมมองวัน
                setOverviewDate(newDate);
            };

            const overviewLabel = overviewViewMode === 'month'
                ? `${thaiMonths[overviewDate.getMonth()]} ${overviewDate.getFullYear() + 543}`
                : overviewViewMode === 'week' ? (() => {
                    const start = new Date(overviewDate);
                    start.setDate(overviewDate.getDate() - overviewDate.getDay());
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    if (start.getMonth() === end.getMonth()) {
                        return `${start.getDate()} - ${end.getDate()} ${thaiMonths[start.getMonth()]} ${start.getFullYear() + 543}`;
                    }
                    return `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
                })()
                : `${overviewDate.getDate()} ${thaiMonths[overviewDate.getMonth()]} ${overviewDate.getFullYear() + 543}`;

            const renderDayCell = (currentDate, isCurrentMonth = true, cornerClass = '') => {
                const day = currentDate.getDate();
                const dateStr = `${String(day).padStart(2,'0')}/${String(currentDate.getMonth()+1).padStart(2,'0')}/${currentDate.getFullYear()+543}`;
                const dayOfWeek = currentDate.getDay();
                const isTodayDate = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                
                // ตรวจสอบว่าช่องนี้คือวันที่กำลังถูกเลือกดูรายละเอียดอยู่หรือไม่ (เฉพาะในโหมดสัปดาห์)
                const isSelected = overviewViewMode === 'week' && currentDate.getDate() === overviewDate.getDate() && currentDate.getMonth() === overviewDate.getMonth();

                const workingList = [];
                const offList = [];

                staffData.forEach(s => {
                    if (!s.schedule) return;
                    const specificData = s.schedule[dateStr];
                    let isWorking = false;
                    let isExplicitlyOff = false;
                    let timeStr = '';
                    let otHours = 0; // เพิ่มตัวแปรดึงค่า OT

                    if (specificData !== undefined) {
                        isWorking = specificData.active;
                        isExplicitlyOff = !specificData.active;
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
                    else if (isExplicitlyOff) offList.push({ id: s.id, name: shortName });
                });

                return (
                    <div 
                        key={currentDate.getTime()} 
                        data-date={dateStr}
                        onClick={() => { 
                            if (isProcessing) return;
                            setOverviewDate(currentDate); 
                            if (overviewViewMode === 'month') setOverviewViewMode('week'); 
                        }}
                        className={`calendar-dropzone p-1 sm:p-1.5 cursor-pointer ${overviewViewMode==='week' ? 'min-h-[120px]' : 'aspect-[1/2] sm:aspect-square'} overflow-hidden flex flex-col gap-0.5 transition-all duration-200 group ${!isCurrentMonth ? 'opacity-40 bg-slate-50/20' : isTodayDate ? 'bg-indigo-50/10' : 'bg-white hover:bg-indigo-50/30'} ${isSelected ? 'ring-2 ring-inset ring-indigo-500 shadow-sm relative z-10 bg-white' : ''} ${cornerClass}`}
                        title="คลิกเพื่อดูรายละเอียดรายวัน"
                    >
                        <div className={`text-[10px] sm:text-xs xl:text-sm 2xl:text-base font-bold text-right mb-0.5 xl:mb-1 transition-colors ${isTodayDate || isSelected ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-500'}`}>{day}</div>
                        <div className="flex flex-col gap-0.5 xl:gap-1 overflow-y-auto custom-scrollbar flex-1 pr-0.5 no-drag-zone">
                            {workingList.map(ws => {
                                const colorClass = ws.role === 'doctor' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : ws.role === 'nurse' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-200';
                                return (
                                    <div 
                                        key={ws.id} 
                                        onPointerDown={(e) => handleStaffPointerDown(e, { staffId: ws.id, fromDate: dateStr, start: ws.start, end: ws.end })}
                                        style={{ touchAction: 'pan-y', userSelect: 'none' }}
                                        className={`text-[8px] sm:text-[10px] xl:text-xs 2xl:text-[13px] px-1 py-0.5 xl:px-1.5 xl:py-1 rounded border kanit-text font-medium leading-tight ${colorClass} flex flex-col xl:flex-row xl:justify-between xl:items-center gap-0.5 xl:gap-1.5 select-none ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-grab active:cursor-grabbing hover:opacity-80'}`} 
                                        title={`ลากเพื่อย้ายกะ ${ws.name} (${ws.timeStr})${Number(ws.otHours) > 0 ? ` +OT ${ws.otHours} ชม.` : ''}`}
                                    >
                                        <span className="truncate font-bold pointer-events-none">{ws.name}</span>
                                        <div className="flex items-center gap-1 shrink-0 pointer-events-none">
                                            <span className="opacity-80 text-[7px] sm:text-[8px] xl:text-[10px] 2xl:text-[11px]">{ws.timeStr}</span>
                                            {Number(ws.otHours) > 0 && (
                                                <span className="bg-amber-400 text-white px-1 py-0.5 rounded-[3px] text-[6px] sm:text-[7px] xl:text-[8px] font-black leading-none tracking-wider shadow-sm">+OT</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {offList.map(os => (
                                <div key={`off-${os.id}`} className="text-[8px] sm:text-[10px] xl:text-xs 2xl:text-[13px] px-1 py-0.5 xl:px-1.5 xl:py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded truncate kanit-text font-medium leading-tight line-through opacity-70 select-none pointer-events-none" title={`${os.name} (หยุด)`}>
                                    {os.name}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            };

            // --- มุมมองวัน (Timeline 06:00 - 24:00) ---
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
                    let otHours = 0; // เพิ่มตัวแปรสำหรับเก็บชั่วโมง OT

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

                // เรียงลำดับตามเวลาเข้างาน
                workingList.sort((a,b) => a.start.localeCompare(b.start));

                const hours = Array.from({ length: 19 }, (_, i) => i + 6); // 6 to 24 (18 ชั่วโมง)

                return (
                    <div className="calendar-dropzone border border-slate-100 rounded-xl overflow-hidden bg-white flex flex-col shadow-sm mt-4 relative" data-date={dateStr}>
                        <div className="overflow-x-auto custom-scrollbar flex-1 no-drag-zone">
                            <div className="min-w-[800px] flex flex-col">
                                {/* Time Header */}
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

                                {/* Timeline Rows */}
                                <div className="flex flex-col bg-white relative">
                                    {/* Background Grid Lines */}
                                    <div className="absolute inset-0 flex pointer-events-none pl-48">
                                        {hours.slice(0, -1).map(h => (
                                            <div key={h} className="flex-1 border-r border-slate-50"></div>
                                        ))}
                                    </div>

                                    {workingList.length > 0 ? workingList.map((ws, idx) => {
                                        let sTime = Math.max(6, parseTimeStr(ws.start));
                                        let eTime = Math.min(24, parseTimeStr(ws.end));
                                        if (eTime < sTime) eTime = sTime;

                                        const left = ((sTime - 6) / 18) * 100;
                                        const width = ((eTime - sTime) / 18) * 100;

                                        const rInfo = roleMap[ws.role] || roleMap['admin'];

                                        // --- การคำนวณและวาด Timeline สำหรับ OT ---
                                        let hasOt = false;
                                        let otWidth = 0;
                                        let otEndNum = eTime;

                                        if (ws.otHours && Number(ws.otHours) > 0) {
                                            hasOt = true;
                                            const otHoursNum = Number(ws.otHours);
                                            otEndNum = Math.min(24, eTime + otHoursNum); // ป้องกันไม่ให้เกินเที่ยงคืน 24.00
                                            otWidth = ((otEndNum - eTime) / 18) * 100;
                                        }

                                        return (
                                            <div key={ws.id || idx} className="flex border-b border-slate-50 hover:bg-slate-50/50 transition-colors group relative z-10">
                                                <div className="w-48 shrink-0 border-r border-slate-100 p-2.5 flex items-center gap-2.5 bg-white group-hover:bg-slate-50/50 transition-colors pointer-events-none">
                                                    {ws.photo ? (
                                                        <img src={ws.photo} className="w-8 h-8 rounded-full object-cover border border-slate-200" alt="Profile"/>
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${ws.role==='doctor'?'bg-indigo-400':ws.role==='nurse'?'bg-emerald-400':ws.role==='sale'?'bg-amber-400':'bg-slate-400'}`}>
                                                            {ws.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                           <div className="text-xs font-bold text-slate-700 kanit-text truncate" title={ws.name}>{ws.name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.|ดร\.|นาย|นางสาว|นาง)/, '').trim().split(' ')[0]}</div>
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-data truncate">{ws.start} - {ws.end} น.</div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 relative flex items-center py-2">
                                                    {/* บล็อคเวลาทำงานปกติ */}
                                                    <div 
                                                        className={`timeline-block absolute h-8 rounded-l-lg shadow-sm border flex items-center transition-all ${rInfo.color} ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}
                                                        style={{ 
                                                            left: `${left}%`, 
                                                            width: `${width}%`, 
                                                            minWidth: '40px', 
                                                            touchAction: 'pan-y', 
                                                            borderTopRightRadius: hasOt ? '0' : '0.5rem', 
                                                            borderBottomRightRadius: hasOt ? '0' : '0.5rem', 
                                                            borderRightWidth: hasOt ? '0' : '1px' 
                                                        }}
                                                        title={`ปรับแต่งเวลา ${ws.name} (${ws.start} - ${ws.end} น.)`}
                                                    >
                                                        {/* ขอบลากยืดหดด้านซ้าย (Start Time) */}
                                                        <div 
                                                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 z-10 rounded-l-lg flex flex-col justify-center items-center opacity-0 group-hover:opacity-100"
                                                            onPointerDown={(e) => handleTimelinePointerDown(e, ws, dateStr, 'resize-start')}
                                                        >
                                                            <div className="w-[1px] h-3 bg-current opacity-50"></div>
                                                        </div>
                                                        
                                                        {/* ขอบลากเลื่อนตรงกลาง (Move Entire Block) */}
                                                        <div 
                                                            className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing px-2.5 overflow-hidden select-none"
                                                            onPointerDown={(e) => handleTimelinePointerDown(e, ws, dateStr, 'move')}
                                                        >
                                                            <span className="timeline-text text-[10px] sm:text-xs font-bold kanit-text truncate tracking-wide pointer-events-none w-full text-center">
                                                                {ws.start} - {ws.end}
                                                            </span>
                                                        </div>

                                                        {/* ขอบลากยืดหดด้านขวา (End Time) จะซ่อนถ้ามี OT ต่อท้าย */}
                                                        {!hasOt && (
                                                            <div 
                                                                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 z-10 rounded-r-lg flex flex-col justify-center items-center opacity-0 group-hover:opacity-100"
                                                                onPointerDown={(e) => handleTimelinePointerDown(e, ws, dateStr, 'resize-end')}
                                                            >
                                                                <div className="w-[1px] h-3 bg-current opacity-50"></div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* บล็อคแสดงเวลา OT (ต่อท้ายบล็อคปกติ) */}
                                                    {hasOt && otWidth > 0 && (
                                                        <div 
                                                            className="absolute h-8 rounded-r-lg shadow-sm border border-amber-300 bg-amber-100 text-amber-700 flex items-center justify-center overflow-hidden z-[5] pointer-events-none"
                                                            style={{ left: `${left + width}%`, width: `${otWidth}%` }}
                                                            title={`โอที (OT) จนถึง ${formatTimeNum(otEndNum)} น.`}
                                                        >
                                                            {otWidth > 3 && (
                                                                <span className="text-[9px] font-bold kanit-text truncate px-1">
                                                                    +OT {formatTimeNum(otEndNum)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    }) : (
                                        <div className="p-10 text-center text-slate-400 kanit-text text-sm">ไม่มีพนักงานลงกะในวันนี้</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            };

            return (
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-5 overflow-hidden flex flex-col mb-2">
                    {/* --- จัด Layout ส่วนหัวปฏิทินใหม่ให้เป็นระเบียบ --- */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
                        <div className="w-full lg:w-auto flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg kanit-text flex items-center gap-2">
                                    <CalendarDays className="text-indigo-500" /> ตารางการทำงานของพนักงาน
                                </h3>
                                <p className="text-xs text-slate-500 kanit-text mt-0.5">ภาพรวมการเข้างานและวันหยุดของบุคลากร</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                            {/* ปุ่มสลับโหมด เดือน/สัปดาห์ (ถอดปุ่ม 'วัน' ออก) */}
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-sm shrink-0">
                                <button 
                                    onClick={() => setOverviewViewMode('month')} 
                                    className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold kanit-text flex items-center gap-1.5 transition-all ${overviewViewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <CalendarIcon className="w-3.5 h-3.5" /> <span className="hidden min-[400px]:inline">เดือน</span>
                                </button>
                                <button 
                                    onClick={() => setOverviewViewMode('week')} 
                                    className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold kanit-text flex items-center gap-1.5 transition-all ${overviewViewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <TableIcon className="w-3.5 h-3.5" /> <span className="hidden min-[400px]:inline">สัปดาห์</span>
                                </button>
                            </div>

                            {/* ปุ่มเลื่อนวันที่ และปุ่ม "วันนี้" */}
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

                            {/* แสดงข้อความวันที่ปัจจุบัน (ซ่อนบนมือถือจอเล็กสุดเพื่อประหยัดพื้นที่) */}
                            <div className="hidden min-[450px]:flex items-center justify-center bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 min-w-[140px]">
                                <span className="font-bold text-indigo-700 text-xs sm:text-sm kanit-text truncate text-center w-full">
                                    {overviewLabel}
                                </span>
                            </div>
                        </div>
                        {/* แสดงข้อความวันที่บนมือถือจอเล็ก (ไหลลงมาบรรทัดใหม่) */}
                        <div className="min-[450px]:hidden w-full flex items-center justify-center bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 mt-1">
                             <span className="font-bold text-indigo-700 text-xs kanit-text truncate">
                                 {overviewLabel}
                             </span>
                        </div>
                    </div>

                    {/* การแสดงผลสลับระหว่าง เดือน กับ สัปดาห์+ไทม์ไลน์ */}
                    {overviewViewMode === 'month' ? (
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                                {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                                    <div key={d} className={`py-2 text-center text-xs sm:text-sm font-bold kanit-text ${i===0 || i===6 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-l border-t border-slate-100">
                                {(() => {
                                    const daysInMonth = new Date(overviewDate.getFullYear(), overviewDate.getMonth() + 1, 0).getDate();
                                    const firstDayOfMonth = new Date(overviewDate.getFullYear(), overviewDate.getMonth(), 1).getDay();
                                    const emptyEndCount = (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7;
                                    const totalCells = firstDayOfMonth + daysInMonth + emptyEndCount;
                                    const cells = [];
                                    for (let i = 0; i < firstDayOfMonth; i++) cells.push({ type: 'empty', key: `empty-start-${i}` });
                                    for (let i = 1; i <= daysInMonth; i++) cells.push({ type: 'day', day: i, key: `day-${i}` });
                                    for (let i = 0; i < emptyEndCount; i++) cells.push({ type: 'empty', key: `empty-end-${i}` });

                                    return cells.map((cell, index) => {
                                        let cornerClass = '';
                                        if (index === totalCells - 7) cornerClass = 'rounded-bl-xl';
                                        if (index === totalCells - 1) cornerClass = 'rounded-br-xl';

                                        if (cell.type === 'empty') {
                                            return <div key={cell.key} className={`bg-slate-50/40 aspect-[1/2] sm:aspect-square ${cornerClass}`}></div>;
                                        }
                                        const currentDate = new Date(overviewDate.getFullYear(), overviewDate.getMonth(), cell.day);
                                        return renderDayCell(currentDate, true, cornerClass);
                                    });
                                })()}
                            </div>
                        </div>
                    ) : (
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
                            
                            {/* แสดง Timeline รายชั่วโมงของวันที่เลือกไว้ด้านล่าง */}
                            {renderDayTimeline()}
                        </div>
                    )}
                </div>
            );
        })()}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm z-20">
           <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="ค้นหาชื่อ, เบอร์โทร..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-colors font-data" />
           </div>
           <div className="w-full sm:w-48 relative shrink-0">
             <CustomSelect 
                value={filterRole} 
                onChange={(val) => setFilterRole(val)} 
                options={[
                  {value: 'all', label: 'ทุกตำแหน่ง'},
                  ...Object.entries(roleLabels || {
                    admin: 'แอดมิน (Admin)',
                    doctor: 'แพทย์ (Doctor)',
                    nurse: 'พยาบาล/ผู้ช่วย (Nurse)',
                    sale: 'พนักงานขาย/ที่ปรึกษา (Sale)'
                  }).map(([key, label]) => ({ value: key, label: label }))
                ]}
                compact fullWidth className="w-full"
             />
           </div>
        </div>

        {/* Table/List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-[400px]">
           <div className="hidden lg:block overflow-x-auto">
               <table className="table-auto w-full text-left border-collapse min-w-[900px]">
                   <thead>
                       <tr className="bg-slate-50/80 border-b border-slate-100 kanit-text text-slate-500 text-sm"><th className="w-[16%] p-4 font-semibold pl-6">พนักงาน</th><th className="w-[16%] p-4 font-semibold text-center">บทบาท/ตำแหน่ง</th><th className="w-[16%] p-4 font-semibold">ตารางงาน (วัน)</th><th className="w-[19%] p-4 font-semibold text-right">เงินเดือนฐาน</th><th className="w-[19%] p-4 font-semibold text-center">ค่าคอมฯ</th><th className="w-[140px] p-4 font-semibold text-right pr-6">จัดการ</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                       {isGlobalLoading ? (
                           Array.from({ length: 5 }).map((_, i) => (
                               <tr key={`skel-staff-desk-${i}`} className="border-b border-slate-50">
                                   <td className="p-4 pl-6">
                                       <div className="flex items-center gap-3">
                                           <div className="w-full max-w-[40px] h-10 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
                                           <div className="flex flex-col gap-1.5 w-full">
                                               <div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div>
                                               <div className="h-3 w-full max-w-[80px] bg-slate-100 rounded animate-pulse"></div>
                                           </div>
                                       </div>
                                   </td>
                                   <td className="p-4 text-center">
                                       <div className="h-6 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div>
                                   </td>
                                   <td className="p-4">
                                       <div className="flex gap-1.5">
                                           <div className="w-full max-w-[24px] h-6 bg-slate-200 rounded animate-pulse"></div>
                                           <div className="w-full max-w-[24px] h-6 bg-slate-200 rounded animate-pulse"></div>
                                           <div className="w-full max-w-[24px] h-6 bg-slate-200 rounded animate-pulse"></div>
                                       </div>
                                   </td>
                                   <td className="p-4 text-right">
                                       <div className="h-4 w-full max-w-[80px] bg-slate-200 rounded animate-pulse ml-auto"></div>
                                   </td>
                                   <td className="p-4 text-center">
                                       <div className="h-6 w-full max-w-[48px] bg-slate-200 rounded-md animate-pulse mx-auto"></div>
                                   </td>
                                   <td className="p-4 pr-6 text-right">
                                       <div className="flex justify-end gap-1.5">
                                           <div className="w-full max-w-[32px] h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                                           <div className="w-full max-w-[32px] h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                                           <div className="w-full max-w-[32px] h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                                           <div className="w-full max-w-[32px] h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                                       </div>
                                   </td>
                               </tr>
                           ))
                       ) : filteredStaff.length > 0 ? filteredStaff.map((s, i) => {
                           const rInfo = roleMap[s.role] || roleMap['admin'];
                           const RoleIcon = rInfo.icon;
                           
                           let activeDays = [];
                           if (Array.isArray(s.schedule)) {
                               activeDays = s.schedule;
                           } else if (typeof s.schedule === 'object') {
                               activeDays = Object.keys(s.schedule).filter(k => s.schedule[k].active).map(Number);
                           }

                           return (
                           <tr key={s.id} onClick={() => setViewProfileStaff(s)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer space-row-animation">
                               <td className="p-4 pl-6">
                                   <div className="flex items-center gap-3">
                                       {s.photo ? (
                                           <img src={s.photo} alt={s.name} onClick={(e) => { e.stopPropagation(); setViewImageSrc(s.photo); }} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 hover:scale-110 transition-transform cursor-zoom-in" />
                                       ) : (
                                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm ${s.role==='doctor'?'bg-indigo-400':s.role==='nurse'?'bg-emerald-400':s.role==='sale'?'bg-amber-400':'bg-slate-400'}`}>
                                               {s.name.charAt(0)}
                                           </div>
                                       )}
                                       <div>
                                           <p className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight">{s.name}</p>
                                           <p className="text-xs text-slate-500 font-data flex items-center gap-1"><Phone size={10}/> {s.phone || '-'}</p>
                                       </div>
                                   </div>
                               </td>
                               <td className="p-4 text-center">
                                   <div className="flex flex-col items-center gap-1">
                                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold kanit-text border shadow-sm w-fit mx-auto ${rInfo.color}`}>
                                           <RoleIcon size={12} /> {s.category === 'doctor' ? 'แพทย์' : (s.category === 'staff' ? 'พนักงาน' : (s.category || 'ไม่ระบุบทบาท'))}
                                       </span>
                                       {s.position && <span className="text-[11px] font-medium text-slate-500 max-w-[120px] truncate" title={s.position}>{s.position}</span>}
                                   </div>
                               </td>
                               <td className="p-4">
                                   <div className="flex flex-wrap gap-1">
                                       {activeDays.length > 0 ? daysMap.map(d => activeDays.includes(d.val) ? <span key={d.val} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${d.color}`}>{d.short}</span> : null) : <span className="text-xs text-slate-400">- ไม่ระบุ -</span>}
                                   </div>
                               </td>
                               <td className="p-4 text-right font-data font-bold text-slate-700">
                                   {formatCurrency(s.baseSalary)}
                               </td>
                               <td className="p-4 text-center">
                                   {s.commissionRate > 0 ? (
                                      <span className="bg-sky-50 text-sky-600 px-2 py-1 rounded-md text-xs font-black font-data border border-sky-100">{s.commissionRate}%</span>
                                   ) : <span className="text-slate-300">-</span>}
                               </td>
                               <td className="p-4 pr-6 text-right">
                                   <div className="flex items-center justify-end gap-1 transition-opacity no-drag-zone">
                                       <button onClick={(e) => { e.stopPropagation(); handleOpenPayroll(s); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="จ่ายเงินเดือน"><Wallet size={18}/></button>
                                       <button onClick={(e) => { e.stopPropagation(); handleOpenSchedule(s); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="จัดตารางงาน"><CalendarClock size={18}/></button>
                                       <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg" title="แก้ไข"><Pencil size={18}/></button>
                                       <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg" title="ลบ"><Trash2 size={18}/></button>
                                   </div>
                               </td>
                           </tr>
                       )}) : (
                           <tr><td colSpan="6" className="p-10 text-center text-slate-400 kanit-text">ไม่พบข้อมูลพนักงาน</td></tr>
                       )}
                   </tbody>
               </table>
           </div>
           
           {/* Mobile view (Cards) */}
           <div className="lg:hidden space-y-4 mt-3">
               {isGlobalLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                       <div key={`skel-staff-mob-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                           <div className="flex justify-between items-start gap-2">
                               <div className="flex items-center gap-3 w-full">
                                   <div className="w-full max-w-[48px] h-12 sm:w-14 sm:h-14 bg-slate-200 rounded-xl animate-pulse shrink-0"></div>
                                   <div className="flex flex-col gap-1.5 w-full">
                                       <div className="h-5 w-full max-w-[128px] sm:w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div>
                                       <div className="h-3 w-full max-w-[80px] sm:w-full max-w-[96px] bg-slate-100 rounded animate-pulse"></div>
                                   </div>
                               </div>
                               <div className="h-6 w-full max-w-[80px] bg-slate-200 rounded-md animate-pulse shrink-0"></div>
                           </div>
                           <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 flex flex-col gap-2 mt-1">
                               <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                   <div className="h-8 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div>
                                   <div className="h-8 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div>
                               </div>
                               <div className="pt-1 flex gap-1.5">
                                   <div className="w-full max-w-[24px] h-6 bg-slate-200 rounded-md animate-pulse"></div>
                                   <div className="w-full max-w-[24px] h-6 bg-slate-200 rounded-md animate-pulse"></div>
                                   <div className="w-full max-w-[24px] h-6 bg-slate-200 rounded-md animate-pulse"></div>
                               </div>
                           </div>
                           <div className="grid grid-cols-4 gap-2 pt-2 mt-1 border-t border-slate-100">
                               <div className="col-span-2 h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                               <div className="col-span-2 h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                               <div className="col-span-2 h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                               <div className="col-span-2 h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                           </div>
                       </div>
                   ))
               ) : filteredStaff.length > 0 ? filteredStaff.map((s, idx) => {
                   const rInfo = roleMap[s.role] || roleMap['admin'];
                   const RoleIcon = rInfo.icon;
                   
                   let activeDays = [];
                   if (Array.isArray(s.schedule)) {
                       activeDays = s.schedule;
                   } else if (typeof s.schedule === 'object') {
                       activeDays = Object.keys(s.schedule).filter(k => s.schedule[k].active).map(Number);
                   }

                   return (
                       <div key={s.id} onClick={() => setViewProfileStaff(s)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 space-row-animation active:scale-[0.98] transition-transform cursor-pointer hover:border-sky-300 hover:shadow-md" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                           
                           {/* แถวที่ 1: รูปภาพ, ชื่อ, เบอร์โทร และ ตำแหน่ง */}
                           <div className="flex justify-between items-start gap-2">
                               <div className="flex items-center gap-3">
                                   {s.photo ? (
                                       <img src={s.photo} alt={s.name} onClick={(e) => { e.stopPropagation(); setViewImageSrc(s.photo); }} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-sm border border-slate-200 shrink-0 hover:scale-105 transition-transform cursor-zoom-in" />
                                   ) : (
                                       <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-sm shrink-0 ${s.role==='doctor'?'bg-indigo-400':s.role==='nurse'?'bg-emerald-400':s.role==='sale'?'bg-amber-400':'bg-slate-400'}`}>
                                           {s.name.charAt(0)}
                                       </div>
                                   )}
                                   <div className="flex flex-col">
                                       <p className="font-bold text-slate-800 kanit-text text-base sm:text-lg leading-tight">{s.name}</p>
                                       <div className="flex items-center gap-1.5 mt-1">
                                           <Phone size={12} className="text-sky-500" />
                                           <p className="text-xs text-slate-500 font-data">{s.phone || 'ไม่มีเบอร์โทร'}</p>
                                       </div>
                                   </div>
                               </div>
                               <div className="flex flex-col items-end gap-1 shrink-0">
                                   <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold kanit-text border shadow-sm ${rInfo.color}`}>
                                       <RoleIcon size={12} /> <span className="hidden sm:inline">{s.category === 'doctor' ? 'แพทย์' : (s.category === 'staff' ? 'พนักงาน' : (s.category || 'ไม่ระบุบทบาท'))}</span>
                                       <span className="sm:hidden">{s.category === 'doctor' ? 'แพทย์' : (s.category === 'staff' ? 'พนักงาน' : (s.category || 'บทบาท').substring(0, 5))}</span>
                                   </span>
                                   {s.position && <span className="text-[10px] font-medium text-slate-500 max-w-[100px] truncate" title={s.position}>{s.position}</span>}
                               </div>
                           </div>

                           {/* แถวที่ 2: ข้อมูลเงินเดือน และ วันทำงาน (จัดในกล่องสีเทา) */}
                           <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 flex flex-col gap-2 mt-1">
                               <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                   <div className="flex flex-col">
                                       <span className="text-[10px] font-bold text-slate-400 kanit-text uppercase tracking-wider">เงินเดือนฐาน</span>
                                       <span className="text-sm sm:text-base font-black font-data text-slate-700">{formatCurrency(s.baseSalary)}</span>
                                   </div>
                                   <div className="flex flex-col items-end">
                                       <span className="text-[10px] font-bold text-slate-400 kanit-text uppercase tracking-wider">ค่าคอมมิชชั่น</span>
                                       {s.commissionRate > 0 ? <span className="text-sm sm:text-base font-black font-data text-sky-600">{s.commissionRate}%</span> : <span className="text-xs font-medium text-slate-400">- ไม่ระบุ -</span>}
                                   </div>
                               </div>
                               <div className="pt-1">
                                   <span className="text-[10px] font-bold text-slate-400 kanit-text uppercase tracking-wider block mb-1.5">วันเข้ากะประจำ</span>
                                   <div className="flex flex-wrap gap-1.5">
                                       {activeDays.length > 0 ? daysMap.map(d => activeDays.includes(d.val) ? <span key={d.val} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm border border-transparent ${d.color.replace('bg-', 'bg-').replace('text-', 'border-').replace('-100', '-200')}`}>{d.short}</span> : null) : <span className="text-xs font-medium text-slate-400 italic">- ไม่ระบุ -</span>}
                                   </div>
                               </div>
                           </div>

                           {/* แถวที่ 3: ปุ่มจัดการ */}
                           <div className="grid grid-cols-4 gap-2 pt-2 mt-1 border-t border-slate-100 no-drag-zone">
                               <button onClick={(e) => { e.stopPropagation(); handleOpenPayroll(s); }} className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold kanit-text transition-colors border border-emerald-100 shadow-sm">
                                   <Wallet size={14}/> จ่ายเงิน
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); handleOpenSchedule(s); }} className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-colors border border-indigo-100 shadow-sm">
                                   <CalendarClock size={14}/> ตารางงาน
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }} className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold kanit-text transition-colors border border-slate-200 shadow-sm">
                                   <Pencil size={14}/> แก้ไขข้อมูล
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-rose-50 text-rose-500 rounded-xl text-xs font-bold kanit-text transition-colors border border-slate-200 hover:border-rose-200 shadow-sm">
                                   <Trash2 size={14}/> ลบพนักงาน
                               </button>
                           </div>
                       </div>
                   )
               }) : (
                   <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-100 border-dashed rounded-2xl kanit-text">
                       ไม่พบข้อมูลพนักงาน
                   </div>
               )}
           </div>
        </div>
      </div>

      {/* --- Modal: Add/Edit Staff --- */}
      <AnimatedModal isOpen={staffModal.isOpen} isClosing={staffModal.isClosing} onClose={staffModal.close} title={editingId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'} icon={UserCog} maxWidth="max-w-5xl">
        <form onSubmit={handleSaveStaff} className="p-4 sm:p-6 space-y-6">
           
           <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative z-[50]">
              <div className="border-b border-sky-100 pb-3 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><UserCog size={20} /> ข้อมูลพื้นฐานพนักงาน</h4>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button type="button" onClick={handleSmartCardRead} disabled={isProcessing} className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-emerald-100 shadow-sm disabled:opacity-50">
                    <CreditCard size={16} /> <span className="hidden sm:inline">อ่านข้อมูลจากบัตร</span><span className="sm:hidden">อ่านบัตร</span>
                  </button>
                  <button type="button" onClick={() => setIsScannerOpen(true)} className="text-xs sm:text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-indigo-100 shadow-sm">
                    <ScanText size={16} /> <span className="hidden sm:inline">สแกนจากกล้อง (OCR)</span><span className="sm:hidden">สแกนกล้อง</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mb-6 items-center sm:items-start">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center overflow-hidden group">
                          {formData.photo ? (
                              <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                              <User size={40} className="text-slate-300" />
                          )}
                          <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <Upload size={20} className="mb-1" />
                              <span className="text-[10px] font-bold kanit-text">อัปโหลดรูป</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          </label>
                      </div>
                      <span className="text-[10px] text-slate-400 kanit-text">ขนาดไม่เกิน 5MB</span>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                      {/* บัญชีผู้ใช้ */}
                      <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div><label className="block text-xs font-bold text-slate-500 kanit-text uppercase mb-1.5 ml-1">รหัสพนักงาน</label><input type="text" className={`${theme.input} !py-2.5 font-data bg-slate-100 text-slate-500 cursor-not-allowed`} value={formData.empCode || ''} disabled readOnly placeholder="ระบบจะสร้างให้อัตโนมัติ" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 kanit-text uppercase mb-1.5 ml-1">ID พนักงาน (Username)</label><input type="text" className={`${theme.input} !py-2.5 font-data`} value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="สำหรับเข้าสู่ระบบ" /></div>
                          <div>
                              {editingId ? (
                                  <div className="flex flex-col h-full justify-end">
                                      <button type="button" onClick={() => showToast('ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่าน (Token 15 นาที) ไปยังอีเมลพนักงานแล้ว', 'success')} className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-xl font-bold kanit-text text-[13px] transition-colors shadow-sm">
                                          ส่งลิงก์รีเซ็ตรหัสผ่าน
                                      </button>
                                  </div>
                              ) : (
                                  <div><label className="block text-xs font-bold text-slate-500 kanit-text uppercase mb-1.5 ml-1">รหัสผ่านเริ่มต้น <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} !py-2.5 font-data`} value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="กำหนดรหัสผ่าน" /></div>
                              )}
                          </div>
                      </div>

                      <div className="relative" style={{ zIndex: 50 }}>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">คำนำหน้า <span className="text-rose-500">*</span></label>
                        <div className="relative" id="prefix-dropdown-container">
                          <input required type="text" className={`${theme.input} font-data pr-10`} value={formData.prefix} onChange={(e) => setFormData({...formData, prefix: e.target.value})} placeholder="พิมพ์หรือเลือก" onFocus={() => setShowPrefixDropdown(true)} onBlur={() => setTimeout(() => setShowPrefixDropdown(false), 200)} />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={18} className={`transition-transform duration-200 ${showPrefixDropdown ? 'rotate-180' : ''}`} />
                          </div>
                          {showPrefixDropdown && (() => {
                            const el = document.getElementById('prefix-dropdown-container');
                            if (!el) return null;
                            const rect = el.getBoundingClientRect();
                            const shouldDropUp = window.innerHeight - rect.bottom < 220;
                            return createPortal(
                              <div className="fixed z-[99999] bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in duration-200" style={{ 
                                top: shouldDropUp ? 'auto' : rect.bottom + 4,
                                bottom: shouldDropUp ? (window.innerHeight - rect.top + 4) : 'auto', 
                                left: rect.left,
                                width: rect.width,
                                transformOrigin: shouldDropUp ? 'bottom center' : 'top center'
                              }}>
                                {(staffPrefixes || ['นาย', 'นาง', 'นางสาว', 'ดร.', 'นพ.', 'พญ.', 'ทพ.', 'ทพญ.']).map(opt => (
                                  <div key={opt} onMouseDown={(e) => { e.preventDefault(); setFormData({...formData, prefix: opt}); setShowPrefixDropdown(false); }} className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${formData.prefix === opt ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}>
                                    {opt}
                                  </div>
                                ))}
                              </div>,
                              document.body
                            );
                          })()}
                        </div>
                      </div>

                      <div className="lg:col-span-1 relative" style={{ zIndex: 45 }}><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อ <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} /></div>
                      <div className="lg:col-span-1 relative" style={{ zIndex: 45 }}><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">นามสกุล <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} /></div>
                      
                      <div className="relative" style={{ zIndex: 40 }}>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">บทบาท <span className="text-rose-500">*</span></label>
                        <CustomSelect value={formData.category} onChange={(val) => setFormData({...formData, category: val})} options={((staffCategories && staffCategories.length > 0) ? staffCategories : ['แพทย์', 'สต๊าฟ/พนักงาน']).map(cat => ({ value: cat === 'แพทย์' ? 'doctor' : cat === 'สต๊าฟ/พนักงาน' ? 'staff' : cat, label: cat }))} />
                      </div>

                      <div className="relative" style={{ zIndex: 40 }}>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ตำแหน่งงาน</label>
                        <input type="text" className={`${theme.input} font-data`} value={formData.position || ''} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="เช่น แพทย์แผนจีน, ผู้ช่วย..." />
                      </div>

                      <div className="relative" style={{ zIndex: 38 }}>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">สิทธิ์เข้าระบบ <span className="text-rose-500">*</span></label>
                        <CustomSelect value={formData.role} onChange={(val) => setFormData({...formData, role: val})} options={Object.entries(roleLabels || {
                          admin: 'แอดมิน (Admin)',
                          doctor: 'แพทย์ (Doctor)',
                          nurse: 'พยาบาล/ผู้ช่วย (Nurse)',
                          sale: 'พนักงานขาย/ที่ปรึกษา (Sale)'
                        }).map(([key, label]) => ({ value: key, label: label }))} />
                      </div>
                      
                      <div className="relative" style={{ zIndex: 35 }}><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label><input required type="tel" className={`${theme.input} font-data`} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
                      <div className="relative" style={{ zIndex: 35 }}><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อีเมล</label><input type="email" className={`${theme.input} font-data`} value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" /></div>
                      <div className="relative" style={{ zIndex: 35 }}><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เลขบัตรประชาชน</label><input type="text" className={`${theme.input} font-data`} value={formData.idCard} onChange={(e) => setFormData({...formData, idCard: e.target.value})} maxLength="13" /></div>
                      <div className="relative" style={{ zIndex: 35 }}><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เลขที่ใบประกอบโรคศิลป์</label><input type="text" className={`${theme.input} font-data`} value={formData.licenseNumber || ''} onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})} /></div>
                      
                      <div className="relative" style={{ zIndex: 30 }}>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">วันเกิด</label>
                        <div ref={dobWrapperRef} className="relative group">
                          <input type="text" className={`${theme.input} pr-12 font-data`} value={formData.dob} onChange={handleDobChange} placeholder="DD/MM/YYYY" maxLength="10" />
                          <button type="button" onClick={handleOpenDobCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>
                        </div>
                      </div>
                      <div className="relative" style={{ zIndex: 30 }}>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เพศ</label>
                        <CustomSelect value={formData.gender} onChange={(val) => setFormData({...formData, gender: val})} options={[{value:'', label:'เลือก'}, 'ชาย', 'หญิง', 'ไม่ระบุ']} />
                      </div>
                  </div>
              </div>
           </div>

           <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-[40]">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><MapPin size={20} /> ข้อมูลที่อยู่</h4>
              <div className="mb-6">
                <h5 className="font-semibold text-slate-700 mb-3 kanit-text">ที่อยู่ตามบัตรประชาชน</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน</label><input type="text" className={`${theme.input} font-data`} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.moo} onChange={(e) => setFormData({...formData, moo: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.road} onChange={(e) => setFormData({...formData, road: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.subDistrict} onChange={(e) => setFormData({...formData, subDistrict: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.zipcode} onChange={(e) => setFormData({...formData, zipcode: e.target.value})} maxLength="5" /></div>
                </div>
              </div>
              <div className="h-px w-full bg-slate-100 my-6"></div>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h5 className="font-semibold text-slate-700 kanit-text">ที่อยู่ปัจจุบัน <span className="text-slate-400 font-normal text-xs">(ที่พักอาศัย)</span></h5>
                  <button type="button" onClick={copyAddressToCurrent} className="text-xs bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-lg kanit-text transition-colors font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto"><MapPin size={14} /> ใช้ที่อยู่เดียวกับบัตรประชาชน</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน</label><input type="text" className={`${theme.input} font-data`} value={formData.curAddress} onChange={(e) => setFormData({...formData, curAddress: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.curMoo} onChange={(e) => setFormData({...formData, curMoo: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.curRoad} onChange={(e) => setFormData({...formData, curRoad: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.curSubDistrict} onChange={(e) => setFormData({...formData, curSubDistrict: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.curDistrict} onChange={(e) => setFormData({...formData, curDistrict: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.curProvince} onChange={(e) => setFormData({...formData, curProvince: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.curZipcode} onChange={(e) => setFormData({...formData, curZipcode: e.target.value})} maxLength="5" /></div>
                </div>
              </div>
           </div>

           <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-[30]">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Phone size={20} /> ผู้ติดต่อกรณีฉุกเฉิน</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อผู้ติดต่อ</label><input type="text" className={`${theme.input} font-data`} value={formData.emName} onChange={(e) => setFormData({...formData, emName: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เกี่ยวข้องเป็น</label><input type="text" className={`${theme.input} font-data`} value={formData.emRelation} onChange={(e) => setFormData({...formData, emRelation: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label><input type="tel" className={`${theme.input} font-data`} value={formData.emPhone} onChange={(e) => setFormData({...formData, emPhone: e.target.value})} /></div>
                <div className="md:col-span-2 lg:col-span-3"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ที่ติดต่อได้</label><input type="text" className={`${theme.input} font-data`} value={formData.emAddress} onChange={(e) => setFormData({...formData, emAddress: e.target.value})} /></div>
              </div>
           </div>

           <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative z-[20]">
              <h4 className="font-bold text-emerald-600 kanit-text border-b border-emerald-100 pb-3 mb-5 flex items-center gap-2"><DollarSign size={20} /> ข้อมูลค่าตอบแทน</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1 kanit-text">ประเภทการจ้างงาน</label>
                        <CustomSelect 
                            value={formData.employmentType}
                            onChange={(val) => setFormData({...formData, employmentType: val})}
                            options={[
                                {value: 'monthly', label: 'รายเดือน'},
                                {value: 'daily', label: 'รายวัน'},
                                {value: 'hourly', label: 'Part-time (รายชั่วโมง)'}
                            ]}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1 kanit-text">
                           {formData.employmentType === 'monthly' ? 'เงินเดือนฐาน (Base Salary)' : 
                            formData.employmentType === 'daily' ? 'ค่าแรงรายวัน' : 'ค่าแรงรายชั่วโมง'}
                        </label>
                        <input type="number" min="0" className={`${theme.input} !py-3 text-base font-data font-bold text-slate-700 bg-emerald-50/30 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20`} value={formData.baseSalary} onChange={e=>setFormData({...formData, baseSalary: e.target.value})} placeholder="0" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1 kanit-text">เรท OT (บาท/ชม.)</label>
                        <input type="number" min="0" className={`${theme.input} !py-3 text-base font-data font-bold text-slate-700 bg-emerald-50/30 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20`} value={formData.otRate || 0} onChange={e=>setFormData({...formData, otRate: e.target.value})} placeholder="0" />
                     </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="relative" style={{ zIndex: 15 }}>
                        <label className="block text-sm font-bold text-slate-600 mb-1 kanit-text">เงื่อนไขค่าคอมมิชชั่น</label>
                        <CustomSelect
                            value={formData.commissionCondition}
                            onChange={(val) => setFormData({...formData, commissionCondition: val})}
                            options={[
                                {value: 'all', label: 'ให้ทุกบิลการขาย'},
                                {value: 'threshold', label: 'ให้ตั้งแต่บิลที่กำหนด (ต่อวัน)'}
                            ]}
                        />
                    </div>

                    {formData.commissionCondition === 'threshold' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1 kanit-text">เริ่มให้ค่าคอมตั้งแต่คนที่ (บิลที่)</label>
                            <input type="number" min="1" className={`${theme.input} !py-2.5 font-data`} value={formData.commissionThreshold} onChange={e=>setFormData({...formData, commissionThreshold: e.target.value})} placeholder="เช่น เริ่มคนที่ 4 ใส่เลข 4" />
                            <p className="text-[10px] text-slate-400 mt-1 kanit-text">ระบบจะนับจำนวนบิลสำเร็จของพนักงานคนนี้ในวันนั้นๆ หากนับถึงยอดที่ตั้งไว้ จะคำนวณค่าคอมให้ในบิลนี้</p>
                        </div>
                    )}

                    <div className="relative" style={{ zIndex: 10 }}>
                        <label className="block text-sm font-bold text-slate-600 mb-1 kanit-text">อัตราค่าคอมมิชชั่น</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input type="number" min="0" step="0.01" className={`${theme.input} !py-3 pr-8 text-base font-data font-bold text-sky-600 bg-sky-50/30 border-sky-100 focus:border-sky-500 focus:ring-sky-500/20`} value={formData.commissionRate} onChange={e=>setFormData({...formData, commissionRate: e.target.value})} placeholder="0.00" />
                            </div>
                            <div className="w-[100px] shrink-0">
                                <CustomSelect
                                    value={formData.commissionType}
                                    onChange={(val) => setFormData({...formData, commissionType: val})}
                                    options={[{value: 'percent', label: '%'}, {value: 'amount', label: 'บาท'}]}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 kanit-text">* คำนวณอัตโนมัติเมื่อเลือกพนักงานคนนี้เป็นผู้ขายในหน้า POS</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex gap-3 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-8 z-[60] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={staffModal.close} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors kanit-text">ยกเลิก</button>
              <button type="submit" disabled={isProcessing} className="flex-[2] py-3 bg-sky-500 text-white rounded-xl font-bold shadow-md shadow-sky-500/30 hover:bg-sky-600 transition-all flex justify-center items-center gap-2 kanit-text">
                 {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 size={18}/>} บันทึกข้อมูล
              </button>
           </div>
        </form>
      </AnimatedModal>

      {/* --- Modal: Schedule (ปฏิทินตารางงานเต็มรูปแบบ) --- */}
      {scheduleModal.isOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm ${scheduleModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={scheduleModal.close}></div>
          <div className={`bg-white sm:rounded-[2rem] w-full h-[100dvh] sm:h-auto max-w-5xl sm:max-h-[90dvh] shadow-2xl flex flex-col transform sm:border border-slate-100 relative overflow-hidden ${scheduleModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
             
             {/* Header (Fixed Top) */}
             <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md shrink-0 z-20 gap-3 shadow-sm sm:shadow-none">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                      <CalendarClock size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">ปฏิทินตารางการทำงาน</h3>
                      <p className="text-[10px] sm:text-sm text-slate-500 kanit-text truncate mt-0.5">จัดการกะและวันหยุดพนักงาน</p>
                   </div>
                </div>
                <button onClick={scheduleModal.close} className="p-1.5 sm:p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors border border-slate-200 shrink-0 shadow-sm">
                   <X size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
             </div>

             {/* Body (Scrollable Split Pane) */}
             <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row bg-slate-50/30 w-full relative custom-scrollbar">
                
                {/* Left Panel: Calendar Grid */}
                <div className="flex-[3] p-4 sm:p-6 lg:border-r border-slate-200 lg:overflow-y-auto custom-scrollbar flex flex-col relative z-10">
                   {/* Staff Info */}
                   <div className="mb-4 sm:mb-6 flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                      {selectedScheduleStaff?.photo ? (
                          <img src={selectedScheduleStaff.photo} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" alt="Profile" />
                      ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky-100 text-sky-600 rounded-full flex justify-center items-center text-xl font-black shrink-0">{selectedScheduleStaff?.name?.charAt(0)}</div>
                      )}
                      <div className="text-left min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 text-base sm:text-lg kanit-text truncate leading-tight">{selectedScheduleStaff?.name}</h3>
                          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold kanit-text border shadow-sm ${roleMap[selectedScheduleStaff?.role]?.color || 'bg-slate-100 text-slate-600'}`}>
                              {roleMap[selectedScheduleStaff?.role]?.label.split(' ')[0]}
                          </span>
                      </div>
                   </div>

                   {/* Calendar Box */}
                   <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm shrink-0">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5 pb-4 border-b border-slate-100">
                           <h4 className="font-bold text-slate-700 text-sm sm:text-base kanit-text flex items-center gap-2"><CalendarIcon size={18} className="text-indigo-500 hidden sm:block" /> ปฏิทินเดือนนี้</h4>
                           <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-1.5 py-1.5 border border-slate-100 w-full sm:w-auto justify-between sm:justify-start">
                              <button type="button" onClick={() => setSchedCalDate(new Date(schedCalDate.getFullYear(), schedCalDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-transparent hover:border-slate-200 shrink-0"><ChevronLeft size={16}/></button>
                              <span className="font-bold text-indigo-700 text-xs sm:text-sm kanit-text w-24 sm:w-28 text-center">{thaiMonths[schedCalDate.getMonth()]} {schedCalDate.getFullYear() + 543}</span>
                              <button type="button" onClick={() => setSchedCalDate(new Date(schedCalDate.getFullYear(), schedCalDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-transparent hover:border-slate-200 shrink-0"><ChevronRight size={16}/></button>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
                           {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d,i) => <div key={i} className={`text-[10px] sm:text-xs font-bold kanit-text ${i===0||i===6?'text-rose-500':'text-slate-500'}`}>{d}</div>)}
                       </div>
                       
                       <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2">
                           {Array.from({ length: new Date(schedCalDate.getFullYear(), schedCalDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="aspect-square"></div>)}
                           {Array.from({ length: new Date(schedCalDate.getFullYear(), schedCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                               const dateStr = `${String(day).padStart(2,'0')}/${String(schedCalDate.getMonth()+1).padStart(2,'0')}/${schedCalDate.getFullYear()+543}`;
                               const isSelected = schedSelectedDate.getDate() === day && schedSelectedDate.getMonth() === schedCalDate.getMonth() && schedSelectedDate.getFullYear() === schedCalDate.getFullYear();
                               
                               const sData = scheduleForm[dateStr];
                               
                               let isWorking = false;
                               let isExplicitlyOff = false;
                               let timeStr = '';
                               let isPaid = false;

                               if (sData !== undefined) {
                                   isWorking = sData.active;
                                   isExplicitlyOff = !sData.active;
                                   timeStr = isWorking ? `${sData.start}` : 'หยุด';
                                   isPaid = sData.isPaid;
                               }

                               let btnClass = 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-100';
                               let dotClass = '';
                               if (isWorking) {
                                   if (isPaid) {
                                       btnClass = 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'; // Paid
                                       dotClass = 'bg-emerald-500';
                                   } else {
                                       const dObj = new Date(schedCalDate.getFullYear(), schedCalDate.getMonth(), day);
                                       const today = new Date();
                                       today.setHours(0,0,0,0);
                                       if (dObj <= today) {
                                           btnClass = 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'; // Unpaid, Past/Today
                                           dotClass = 'bg-amber-500';
                                       } else {
                                           btnClass = 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'; // Future
                                           dotClass = 'bg-indigo-500';
                                       }
                                   }
                               }
                               else if (isExplicitlyOff) {
                                   btnClass = 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
                                   dotClass = 'bg-rose-500';
                               }

                               if (isSelected) btnClass += ' ring-2 ring-indigo-500 shadow-md scale-[1.08] sm:scale-105 z-10 border-transparent';

                               return (
                                   <button 
                                       key={day} type="button" 
                                       onClick={() => {
                                           setSchedSelectedDate(new Date(schedCalDate.getFullYear(), schedCalDate.getMonth(), day));
                                           // เลื่อนลงไปที่ Editor อัตโนมัติบนหน้าจอมือถือ
                                           if (window.innerWidth < 1024) {
                                               setTimeout(() => {
                                                   document.getElementById('schedule-editor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                               }, 100);
                                           }
                                       }}
                                       className={`aspect-square w-full rounded-xl flex flex-col items-center justify-center relative transition-all border ${btnClass}`}
                                   >
                                       <span className={`font-black text-sm sm:text-base font-data leading-none ${isSelected ? 'text-indigo-700' : ''}`}>{day}</span>
                                       
                                       {/* แสดงข้อความเวลาบน PC */}
                                       {(isWorking || isExplicitlyOff) && (
                                           <span className={`hidden sm:inline-block text-[9px] font-bold kanit-text mt-1 px-1 rounded ${isPaid ? 'bg-emerald-500 text-white' : isWorking ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}>
                                              {timeStr}
                                           </span>
                                       )}

                                       {/* แสดงจุดสี (Dot) บนหน้าจอมือถือแทนข้อความเพื่อความประหยัดพื้นที่ */}
                                       {(isWorking || isExplicitlyOff) && (
                                           <span className={`sm:hidden w-1.5 h-1.5 rounded-full mt-1 ${dotClass}`}></span>
                                       )}
                                   </button>
                               );
                           })}
                       </div>
                       
                       {/* Legend */}
                       <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap justify-center gap-3 sm:gap-4">
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-[10px] sm:text-[11px] text-slate-500 font-medium kanit-text">จ่ายเงินแล้ว</span></div>
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div><span className="text-[10px] sm:text-[11px] text-slate-500 font-medium kanit-text">ค้างจ่าย (ทำงานแล้ว)</span></div>
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div><span className="text-[10px] sm:text-[11px] text-slate-500 font-medium kanit-text">รอเข้ากะ (อนาคต)</span></div>
                           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div><span className="text-[10px] sm:text-[11px] text-slate-500 font-medium kanit-text">วันหยุด</span></div>
                       </div>
                   </div>
                </div>

                {/* Right Panel: Editor */}
                <div id="schedule-editor-panel" className="flex-[2] p-4 sm:p-6 lg:bg-white flex flex-col min-h-fit lg:min-h-0 lg:overflow-y-auto custom-scrollbar pb-8 lg:pb-6 relative z-0">
                   {(() => {
                       const dateStr = `${String(schedSelectedDate.getDate()).padStart(2,'0')}/${String(schedSelectedDate.getMonth()+1).padStart(2,'0')}/${schedSelectedDate.getFullYear()+543}`;
                       const sData = scheduleForm[dateStr];

                       let currentActive = false;
                       let currentExplicitlyOff = false;
                       let currentStart = '09:00';
                       let currentEnd = '20:00';
                       let currentOtHours = 0;
                       let currentIsPaid = false;

                       if (sData !== undefined) {
                           currentActive = sData.active;
                           currentExplicitlyOff = !sData.active;
                           if (sData.start) currentStart = sData.start;
                           if (sData.end) currentEnd = sData.end;
                           if (sData.otHours) currentOtHours = sData.otHours;
                           if (sData.isPaid) currentIsPaid = sData.isPaid;
                       }

                       return (
                           <div className="flex flex-col h-full bg-white lg:bg-transparent p-5 lg:p-0 rounded-[1.5rem] shadow-sm lg:shadow-none border border-slate-100 lg:border-none">
                               <div className="text-center mb-5 sm:mb-6 pb-4 border-b border-slate-100 shrink-0">
                                   <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                       <CalendarDays size={24} className="sm:w-7 sm:h-7" />
                                   </div>
                                   <h4 className="font-bold text-slate-800 text-base sm:text-lg kanit-text leading-tight">จัดการวันที่ {schedSelectedDate.getDate()}</h4>
                                   <p className="text-xs sm:text-sm text-slate-500 kanit-text">{thaiMonths[schedSelectedDate.getMonth()]} {schedSelectedDate.getFullYear() + 543}</p>
                                   
                                   {currentIsPaid && (
                                       <div className="mt-3 text-[10px] sm:text-xs bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 justify-center kanit-text font-bold">
                                           <CheckCircle2 size={14} /> วันนี้ทำจ่ายเงินเดือนไปแล้ว (หากแก้ไขจะไม่มีผลย้อนหลัง)
                                       </div>
                                   )}
                               </div>

                               <div className="space-y-4 sm:space-y-5 shrink-0">
                                   <div>
                                       <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest kanit-text text-center mb-2 sm:mb-3">กำหนดสถานะการทำงาน</label>
                                       
                                       <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                          <button 
                                             type="button"
                                             onClick={() => setScheduleForm(prev => ({...prev, [dateStr]: { active: true, start: currentStart, end: currentEnd, otHours: currentOtHours, isPaid: currentIsPaid }}))}
                                             className={`py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm kanit-text transition-all border-2 flex flex-col items-center justify-center gap-1.5 active:scale-95 ${currentActive ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
                                          >
                                             <CheckCircle2 size={20} className="sm:w-6 sm:h-6" /> เข้างาน (ทำกะ)
                                          </button>
                                          <button 
                                             type="button"
                                             onClick={() => setScheduleForm(prev => ({...prev, [dateStr]: { active: false, isPaid: currentIsPaid }}))}
                                             className={`py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm kanit-text transition-all border-2 flex flex-col items-center justify-center gap-1.5 active:scale-95 ${currentExplicitlyOff ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30' : 'bg-white text-rose-500 border-rose-100 hover:bg-rose-50'}`}
                                          >
                                             <XCircle size={20} className="sm:w-6 sm:h-6" /> วันหยุดพัก
                                          </button>
                                       </div>
                                   </div>

                                   <div className={`space-y-4 transition-all duration-300 ${currentActive ? 'opacity-100' : 'opacity-40 pointer-events-none filter grayscale'}`}>
                                       <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                           <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest kanit-text text-center">กำหนดเวลาเข้า-ออกงาน</label>
                                           <div className="flex flex-col sm:flex-row items-center gap-3">
                                               <div className="flex-1 w-full relative">
                                                   <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-bold text-slate-400 rounded border border-slate-100">เวลาเข้า</label>
                                                   <input 
                                                       type="time" className={`${theme.input} !py-3 font-data text-sm sm:text-base font-bold text-center bg-white border-slate-200 focus:border-sky-400 w-full`}
                                                       value={currentStart}
                                                       onChange={(e) => setScheduleForm(prev => ({...prev, [dateStr]: { active: true, start: e.target.value, end: currentEnd, otHours: currentOtHours, isPaid: currentIsPaid }}))}
                                                   />
                                               </div>
                                               <span className="text-slate-300 font-bold hidden sm:block">-</span>
                                               <div className="flex-1 w-full relative">
                                                   <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-bold text-slate-400 rounded border border-slate-100">เวลาออก</label>
                                                   <input 
                                                       type="time" className={`${theme.input} !py-3 font-data text-sm sm:text-base font-bold text-center bg-white border-slate-200 focus:border-sky-400 w-full`}
                                                       value={currentEnd}
                                                       onChange={(e) => setScheduleForm(prev => ({...prev, [dateStr]: { active: true, start: currentStart, end: e.target.value, otHours: currentOtHours, isPaid: currentIsPaid }}))}
                                                   />
                                               </div>
                                           </div>
                                       </div>

                                       <div className="p-4 sm:p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-3 mt-3">
                                           <label className="block text-[10px] sm:text-[11px] font-black text-amber-500 uppercase tracking-widest kanit-text text-center">ทำล่วงเวลา (OT)</label>
                                           <div className="flex items-center gap-3">
                                               <input 
                                                   type="number" min="0" step="0.5" className={`${theme.input} !py-3 font-data text-sm sm:text-base font-bold text-center bg-white border-amber-200 focus:border-amber-400 w-full`}
                                                   value={currentOtHours || ''}
                                                   onChange={(e) => setScheduleForm(prev => ({...prev, [dateStr]: { active: true, start: currentStart, end: currentEnd, otHours: e.target.value, isPaid: currentIsPaid }}))}
                                                   placeholder="เช่น 1.5, 2"
                                               />
                                               <span className="text-amber-600 font-bold kanit-text whitespace-nowrap">ชั่วโมง</span>
                                           </div>
                                       </div>
                                   </div>
                               </div>

                               <div className="pt-4 mt-6 sm:mt-auto border-t border-slate-100 shrink-0">
                                   <button 
                                      onClick={() => {
                                          const newForm = {...scheduleForm};
                                          delete newForm[dateStr];
                                          setScheduleForm(newForm);
                                      }}
                                      className={`w-full py-3 sm:py-3.5 border font-bold kanit-text text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${!currentActive && !currentExplicitlyOff ? 'bg-slate-50 text-slate-300 border-transparent pointer-events-none' : 'bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 shadow-sm active:scale-95'}`}
                                   >
                                     <Trash2 size={16} /> ล้างค่าในวันนี้ (ไม่ระบุสถานะ)
                                   </button>
                               </div>
                           </div>
                       )
                   })()}
                </div>
             </div>

             {/* Footer (Fixed at bottom) */}
             <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-row justify-end gap-2 sm:gap-3 shrink-0 z-20 w-full shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                <button onClick={scheduleModal.close} className="flex-1 sm:flex-none px-2 sm:px-6 py-3.5 sm:py-3.5 bg-slate-100 border border-transparent text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors kanit-text text-sm sm:text-base truncate">
                    ยกเลิก
                </button>
                <button onClick={handleSaveSchedule} disabled={isProcessing} className="flex-1 sm:flex-none px-2 sm:px-8 py-3.5 sm:py-3.5 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all flex items-center justify-center gap-1 sm:gap-2 kanit-text text-sm sm:text-base active:scale-95 truncate">
                    {isProcessing ? <Loader2 className="w-5 h-5 sm:w-5 sm:h-5 animate-spin shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />} บันทึก<span className="hidden sm:inline">ตารางงาน</span>
                </button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Modal: Payroll --- */}
      <AnimatedModal isOpen={payrollModal.isOpen} isClosing={payrollModal.isClosing} onClose={payrollModal.close} title="จ่ายเงินเดือน / ค่าตอบแทน" icon={Wallet}>
         <form onSubmit={handleSavePayroll} className="p-4 sm:p-6">
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-5">
               {selectedPayrollStaff?.photo ? (
                   <img src={selectedPayrollStaff.photo} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-emerald-200" alt="Profile" />
               ) : (
                   <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500 font-black text-xl shadow-sm">{selectedPayrollStaff?.name?.charAt(0)}</div>
               )}
               <div>
                  <h4 className="font-bold text-emerald-800 kanit-text text-lg leading-tight">{selectedPayrollStaff?.name}</h4>
                  <p className="text-[10px] sm:text-xs text-emerald-600/80 kanit-text mt-0.5">ประเภท: <span className="font-bold">{selectedPayrollStaff?.employmentType === 'monthly' ? 'รายเดือน' : selectedPayrollStaff?.employmentType === 'daily' ? 'รายวัน' : 'Part-time'}</span> | อัตราคอมมิชชั่น: <span className="font-bold">{selectedPayrollStaff?.commissionRate || 0}%</span></p>
               </div>
            </div>

            {/* --- Selection Config --- */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm mb-5 relative z-20">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">รอบการจ่ายเงิน</label>
                        <CustomSelect 
                            value={payrollConfig.periodType}
                            onChange={(val) => {
                                setPayrollConfig({...payrollConfig, periodType: val});
                                if (val === 'range' && !payrollConfig.startDate) {
                                    handleOpenPayrollCalendar();
                                }
                            }}
                            options={[
                                {value: 'all', label: 'ทั้งหมดที่ค้างจ่าย'},
                                {value: 'range', label: 'ระบุช่วงเวลา (วันที่ - วันที่)'}
                            ]}
                        />
                    </div>
                    {payrollConfig.periodType === 'range' && (
                        <div className="flex-1 w-full animate-in fade-in zoom-in-95 duration-200">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">เลือกช่วงวันที่</label>
                            <div className="relative group">
                                <div 
                                    className="w-full px-4 py-2.5 sm:py-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-data outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner cursor-pointer flex justify-between items-center hover:bg-slate-50"
                                    onClick={handleOpenPayrollCalendar}
                                >
                                    <span className={payrollConfig.startDate && payrollConfig.endDate ? "font-bold text-sky-700" : "text-slate-400"}>
                                        {payrollConfig.startDate && payrollConfig.endDate 
                                         ? `${formatRangeDateStr(payrollConfig.startDate)} - ${formatRangeDateStr(payrollConfig.endDate)}` 
                                         : 'คลิกเพื่อเลือกช่วงเวลา'}
                                    </span>
                                    <CalendarIcon size={18} className="text-slate-400" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl border border-amber-200/60 font-medium kanit-text text-sm">
                    <Clock size={16} /> พบวันทำงานที่ <span className="font-bold underline">ค้างจ่ายเงิน</span> ทั้งสิ้น: <span className="font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md text-base ml-1">{unpaidDatesMemo.length}</span> วัน
                </div>
            </div>

            <div className="space-y-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
               <div className="flex justify-between items-center bg-slate-50/50 p-2 sm:p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-col pl-1">
                      <label className="text-sm font-bold text-slate-700 kanit-text">ค่าจ้างพื้นฐาน</label>
                      <span className="text-[10px] text-slate-500 font-data">({selectedPayrollStaff?.employmentType === 'monthly' ? 'เงินเดือนฐาน' : selectedPayrollStaff?.employmentType === 'daily' ? `${unpaidDatesMemo.length} วัน x ${selectedPayrollStaff?.baseSalary}฿` : 'ตามชั่วโมงทำงาน'})</span>
                  </div>
                  <input type="number" className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-right font-data font-bold focus:border-sky-500 outline-none transition-all shadow-sm" value={payrollForm.salary} onChange={e => setPayrollForm({...payrollForm, salary: e.target.value})} />
               </div>
               <div className="flex justify-between items-center bg-slate-50/50 p-2 sm:p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-col pl-1">
                      <label className="text-sm font-bold text-slate-700 kanit-text">ค่าล่วงเวลา (OT)</label>
                      <span className="text-[10px] text-slate-500 font-data">({payrollForm.otHours || 0} ชม. x เรท {payrollForm.otRate || 0} ฿)</span>
                  </div>
                  <input type="number" className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-right font-data font-bold text-sky-600 focus:border-sky-500 outline-none transition-all shadow-sm" value={payrollForm.otTotal} onChange={e => setPayrollForm({...payrollForm, otTotal: e.target.value})} />
               </div>
               <div className="flex justify-between items-center bg-slate-50/50 p-2 sm:p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-col pl-1">
                      <label className="text-sm font-bold text-slate-700 kanit-text">ค่าคอมมิชชั่น</label>
                      <span className="text-[10px] text-slate-500 font-data">(จากการขาย {selectedPayrollStaff?.commissionRate || 0}%)</span>
                  </div>
                  <input type="number" className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-right font-data font-bold text-sky-600 focus:border-sky-500 outline-none transition-all shadow-sm" value={payrollForm.commission} onChange={e => setPayrollForm({...payrollForm, commission: e.target.value})} />
               </div>
               <div className="flex justify-between items-center bg-slate-50/50 p-2 sm:p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-col pl-1">
                      <label className="text-sm font-bold text-slate-700 kanit-text">โบนัส / ค่าตอบแทนพิเศษ</label>
                  </div>
                  <input type="number" className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-right font-data font-bold text-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm" placeholder="0" value={payrollForm.bonus} onChange={e => setPayrollForm({...payrollForm, bonus: e.target.value})} />
               </div>

               <div className="h-px bg-slate-100 my-2"></div>

               <div className="flex justify-between items-center bg-rose-50/30 p-2 sm:p-3 rounded-xl border border-rose-100/50">
                  <label className="text-sm font-bold text-rose-600 kanit-text pl-1">หักประกันสังคม</label>
                  <input type="number" className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-right font-data font-bold text-rose-500 focus:border-rose-500 outline-none transition-all shadow-sm" placeholder="0" value={payrollForm.socialSecurity} onChange={e => setPayrollForm({...payrollForm, socialSecurity: e.target.value})} />
               </div>

               {payrollForm.customDeductions && payrollForm.customDeductions.length > 0 && (
                  <div className="space-y-2 mt-2">
                      {payrollForm.customDeductions.map((item, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-rose-50/30 p-2 sm:p-3 rounded-xl border border-rose-100/50 items-start sm:items-center justify-between animate-in fade-in zoom-in-95 duration-200">
                              <input 
                                  type="text" 
                                  className="w-full flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-data outline-none focus:border-rose-500 transition-colors" 
                                  placeholder="รายละเอียด เช่น มาสาย, ทำของพัง..." 
                                  value={item.description} 
                                  onChange={e => handleCustomDeductionChange(idx, 'description', e.target.value)} 
                              />
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <input 
                                      type="number" 
                                      className="w-full sm:w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-right font-data font-bold text-rose-500 focus:border-rose-500 outline-none transition-colors shadow-sm" 
                                      placeholder="จำนวนเงิน" 
                                      value={item.amount} 
                                      onChange={e => handleCustomDeductionChange(idx, 'amount', e.target.value)} 
                                  />
                                  <button type="button" onClick={() => handleRemoveCustomDeduction(idx)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0 border border-transparent hover:border-rose-100">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
               )}

               <div className="pt-1">
                   <button type="button" onClick={handleAddCustomDeduction} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-colors kanit-text border border-rose-100/50 shadow-sm active:scale-95">
                       <Plus size={14} /> เพิ่มรายการหักอื่นๆ
                   </button>
               </div>

               <div className="h-px bg-slate-100 my-4"></div>
               <div className="flex justify-between items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="text-lg font-black text-slate-800 kanit-text">ยอดรับสุทธิ</label>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-500 font-data tracking-tight leading-none">{formatCurrency(payrollForm.total)}</span>
               </div>
            </div>
            
            <div className="mt-4">
               <label className="block text-xs font-bold text-slate-500 mb-1 kanit-text">หมายเหตุการจ่ายเงิน (จะบันทึกลงหน้ารายจ่ายด้วย)</label>
               <textarea className={`${theme.input} !py-2.5 text-sm resize-none h-20 bg-slate-50 border-slate-200 focus:bg-white`} value={payrollForm.note} onChange={e=>setPayrollForm({...payrollForm, note: e.target.value})} placeholder="รายละเอียดเพิ่มเติม..." />
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex gap-3 p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-8 z-[60] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <button type="button" onClick={payrollModal.close} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">ยกเลิก</button>
               <button type="submit" disabled={isProcessing} className="flex-[2] py-3.5 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex justify-center items-center gap-2">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 size={20}/>} ยืนยันอนุมัติจ่าย
               </button>
            </div>
         </form>
      </AnimatedModal>

      {/* Modal สำหรับกล้อง (Staff Manager) */}
      {isScannerOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/75 fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col modal-animate-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 kanit-text flex items-center gap-2 text-lg">
                <ScanText className="text-indigo-500" /> สแกนบัตรประชาชน
              </h3>
              <button type="button" onClick={() => !isScanning && setIsScannerOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors" disabled={isScanning}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-800 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                <div className="w-[85%] aspect-[8.5/5.4] border-2 border-white/50 rounded-2xl relative z-10 overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* มุมกล้อง (Corners) */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                    
                    {/* แอนิเมชันเส้นสแกน */}
                    {isScanning && (
                        <div className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_5px_rgba(99,102,241,0.5)]" style={{ animation: 'scanLine 2s linear infinite' }}></div>
                    )}
                </div>
                
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-0"></video>
                
                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/60 transition-all duration-300 ${isScanning ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-3" />
                    <p className="text-white font-bold kanit-text">กำลังประมวลผล OCR...</p>
                    <p className="text-indigo-200 text-xs mt-1 kanit-text">กรุณารอสักครู่</p>
                </div>
            </div>
            
            <div className="p-5 bg-white flex flex-col gap-3">
              <p className="text-sm text-slate-500 text-center kanit-text">จัดวางบัตรประชาชนให้อยู่ในกรอบ และมีแสงสว่างเพียงพอ</p>
              <button 
                  type="button"
                  onClick={handleRealScan} 
                  disabled={isScanning}
                  className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 kanit-text text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isScanning ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />} 
                  {isScanning ? 'กำลังสแกน...' : 'ถ่ายภาพและดึงข้อมูล'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Modal: Dob Calendar --- */}
      {showDobCalendar && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isDobCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeDobCalendar}></div>
          <div 
            ref={dobCalSwipeProps.ref} 
            style={dobCalSwipeProps.style}
            className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isDobCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-1 pb-4 -mt-2 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            {dobCalView === 'days' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={handlePrevDobMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setDobCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[dobCalDate.getMonth()]} {dobCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={handleNextDobMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {blankDobDays.map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 sm:h-8"></div>)}
                  {monthDobDays.map(day => {
                    const dateStr = `${String(day).padStart(2, '0')}/${String(dobCalDate.getMonth() + 1).padStart(2, '0')}/${dobCalDate.getFullYear() + 543}`;
                    const isSelected = formData.dob === dateStr;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === dobCalDate.getMonth() && new Date().getFullYear() === dobCalDate.getFullYear();
                    return (<button key={day} type="button" onClick={() => handleSelectDobDate(day)} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 transform scale-110' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>)
                  })}
                </div>
              </>
            )}

            {dobCalView === 'months' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setDobCalDate(new Date(dobCalDate.getFullYear() - 1, dobCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setDobCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{dobCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setDobCalDate(new Date(dobCalDate.getFullYear() + 1, dobCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (
                    <button key={m} type="button" onClick={() => {setDobCalDate(new Date(dobCalDate.getFullYear(), i, 1)); setDobCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${dobCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>
                  ))}
                </div>
              </>
            )}

            {dobCalView === 'years' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setDobYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{dobYearPageStart} - {dobYearPageStart + 11}</span>
                  <button type="button" onClick={() => setDobYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => dobYearPageStart + i).map(y => (
                    <button key={y} type="button" onClick={() => {setDobCalDate(new Date(y - 543, dobCalDate.getMonth(), 1)); setDobCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(dobCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* --- Modal: Payroll Date Range Calendar --- */}
      {showPayrollCalendar && createPortal(
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isPayrollCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closePayrollCalendar}></div>
          <div 
            ref={payrollCalSwipeProps.ref} 
            style={payrollCalSwipeProps.style}
            className={`relative z-[210] w-full max-w-[360px] sm:max-w-[380px] bg-white sm:rounded-[1.5rem] border border-slate-100 shadow-2xl flex flex-col ${isPayrollCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-3 pb-3 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
              {payrollCalView === 'days' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <button type="button" onClick={handlePrevPayrollMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setPayrollCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[payrollCalDate.getMonth()]} {payrollCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={handleNextPayrollMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>

                  {/* แสดงช่วงวันที่ที่เลือก */}
                  <div className="mb-4 bg-sky-50 p-3 rounded-xl border border-sky-100 flex items-center justify-between">
                      <div className="flex flex-col">
                          <span className="text-[10px] text-sky-600 font-bold kanit-text uppercase">เริ่มต้น</span>
                          <span className="text-sm font-black text-sky-800 font-data">{payrollStartDate ? formatRangeDateStr(payrollStartDate) : '-'}</span>
                      </div>
                      <div className="text-sky-300"><ChevronRight size={16} /></div>
                      <div className="flex flex-col text-right">
                          <span className="text-[10px] text-sky-600 font-bold kanit-text uppercase">สิ้นสุด</span>
                          <span className="text-sm font-black text-sky-800 font-data">{payrollEndDate ? formatRangeDateStr(payrollEndDate) : '-'}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center mb-2">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
                    {blankPayrollDays.map(b => <div key={`blank-${b}`} className="w-full aspect-square"></div>)}
                    {monthPayrollDays.map(day => {
                      const selectedDate = new Date(payrollCalDate.getFullYear(), payrollCalDate.getMonth(), day);
                      selectedDate.setHours(0,0,0,0);
                      
                      const hasBothDates = payrollStartDate && payrollEndDate;
                      const isSelectedStart = payrollStartDate && selectedDate.getTime() === payrollStartDate.getTime();
                      const isSelectedEnd = payrollEndDate && selectedDate.getTime() === payrollEndDate.getTime();
                      const isInRange = hasBothDates && selectedDate > payrollStartDate && selectedDate < payrollEndDate;
                      const isToday = new Date().setHours(0,0,0,0) === selectedDate.getTime();

                      return (
                        <div key={day} className="w-full flex items-center justify-center relative my-0.5">
                            {hasBothDates && isSelectedStart && payrollStartDate.getTime() !== payrollEndDate.getTime() && (
                                <div className="absolute right-0 w-1/2 h-10 sm:h-8 bg-sky-100 my-auto"></div>
                            )}
                            {hasBothDates && isSelectedEnd && payrollStartDate.getTime() !== payrollEndDate.getTime() && (
                                <div className="absolute left-0 w-1/2 h-10 sm:h-8 bg-sky-100 my-auto"></div>
                            )}
                            {isInRange && (
                                <div className="absolute w-full h-10 sm:h-8 bg-sky-100 my-auto"></div>
                            )}
                            
                            <button 
                                type="button" 
                                onClick={() => handleSelectPayrollDate(day)} 
                                className={`relative w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-xl flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data 
                                ${isSelectedStart || isSelectedEnd ? 'bg-sky-500 text-white shadow-md z-10' : 
                                  isInRange ? 'text-sky-800' : 
                                  isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                                {day}
                            </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {payrollCalView === 'months' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setPayrollCalDate(new Date(payrollCalDate.getFullYear() - 1, payrollCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setPayrollCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{payrollCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={() => setPayrollCalDate(new Date(payrollCalDate.getFullYear() + 1, payrollCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setPayrollCalDate(new Date(payrollCalDate.getFullYear(), i, 1)); setPayrollCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${payrollCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                  </div>
                </>
              )}

              {payrollCalView === 'years' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setPayrollYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{payrollYearPageStart} - {payrollYearPageStart + 11}</span>
                    <button type="button" onClick={() => setPayrollYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({length: 12}, (_, i) => payrollYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setPayrollCalDate(new Date(y - 543, payrollCalDate.getMonth(), 1)); setPayrollCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(payrollCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 w-full rounded-b-[1.5rem]">
                <button type="button" onClick={closePayrollCalendar} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text transition-colors shadow-sm text-sm">
                    ยกเลิก
                </button>
                <button type="button" onClick={confirmPayrollRange} className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-md shadow-sky-500/20 kanit-text transition-colors text-sm">
                    ยืนยันช่วงเวลา
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Modal: Profile Viewer --- */}
      {viewProfileStaff && createPortal(
        <div className={`fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm ${isProfileClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
            <div className="absolute inset-0" onClick={closeProfileModal}></div>
            <div className={`bg-white rounded-[2rem] sm:rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full sm:max-h-[90dvh] overflow-hidden relative z-10 ${isProfileClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
                
                {/* ปุ่มปิด: แยกออกมาให้ลอยอยู่หน้าสุด (Z-Index สูงสุด) และไม่เลื่อนหาย */}
                <button onClick={closeProfileModal} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/5 hover:bg-black/10 text-slate-500 hover:text-slate-800 rounded-full backdrop-blur-md transition-colors z-[60] shadow-sm border border-black/5">
                    <X size={20} />
                </button>

                {/* กล่อง Scroll หลัก: มัดรวม Header และเนื้อหาไว้ด้วยกัน */}
                <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative">
                    
                    {/* Header Background: ปรับสีฟ้าไล่ไปขาว (บนลงล่าง) */}
                    <div className="h-28 sm:h-36 bg-gradient-to-b from-sky-400 via-sky-100 to-white w-full relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    </div>

                    {/* ส่วนเนื้อหา: ใช้ relative z-10 เพื่อให้อยู่เหนือ Header เสมอ */}
                    <div className="px-5 sm:px-8 pb-6 sm:pb-8 relative z-10">
                        {/* Profile Header Info */}
                        <div className="flex flex-row items-end gap-4 sm:gap-6 mb-6 sm:mb-8 px-1 sm:px-0">
                            
                            {/* รูปภาพโปรไฟล์: จัดให้อยู่แถวเดียวกับชื่อเสมอ */}
                            <div className="relative shrink-0 -mt-16 sm:-mt-20">
                                {viewProfileStaff.photo ? (
                                    <img src={viewProfileStaff.photo} alt={viewProfileStaff.name} onClick={() => setViewImageSrc(viewProfileStaff.photo)} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-[4px] sm:border-[6px] border-white bg-white shadow-md cursor-zoom-in hover:scale-105 transition-transform" />
                                ) : (
                                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full border-[4px] sm:border-[6px] border-white bg-white shadow-md flex items-center justify-center font-bold text-4xl sm:text-5xl text-white ${viewProfileStaff.role==='doctor'?'bg-indigo-400':viewProfileStaff.role==='nurse'?'bg-emerald-400':viewProfileStaff.role==='sale'?'bg-amber-400':'bg-slate-400'}`}>
                                        {viewProfileStaff.name?.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* ชื่อและข้อมูลเบื้องต้น */}
                            <div className="flex-1 min-w-0 pb-1 sm:pb-3">
                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 kanit-text leading-tight truncate" title={viewProfileStaff.name}>
                                    {viewProfileStaff.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:mt-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold kanit-text border shadow-sm ${roleMap[viewProfileStaff.role]?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {roleMap[viewProfileStaff.role] ? React.createElement(roleMap[viewProfileStaff.role].icon, { size: 14 }) : null}
                                        {viewProfileStaff.position || roleMap[viewProfileStaff.role]?.label || 'ไม่ระบุตำแหน่ง'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 kanit-text shadow-sm">
                                        <Building2 size={14} className="text-slate-400 shrink-0" /> <span className="truncate">{branchesData.find(b => b.id === viewProfileStaff.branchId)?.name || 'ทุกสาขา'}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ข้อมูลรายละเอียดพนักงาน (Grid) */}
                        <div className="space-y-4 sm:space-y-5">
                            <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 kanit-text mb-4 flex items-center gap-2 pb-2 border-b border-slate-200/60"><User size={18} className="text-sky-500" /> ข้อมูลส่วนตัว & การติดต่อ</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4 pl-1">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">รหัสพนักงาน</p>
                                        <p className="text-sm font-black text-slate-700 font-data">{viewProfileStaff.empCode || '-'}</p>
                                    </div>
                                    <div className="col-span-1 sm:col-span-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">อีเมล</p>
                                        <p className="text-sm font-bold text-slate-700 font-data truncate">{viewProfileStaff.email || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">บทบาท</p>
                                        <p className="text-sm font-bold text-slate-700 kanit-text">{viewProfileStaff.category === 'doctor' ? 'แพทย์' : viewProfileStaff.category === 'staff' ? 'สต๊าฟ/พนักงาน' : '-'}</p>
                                    </div>
                                    <div className="col-span-1 sm:col-span-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">เบอร์โทรศัพท์</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-slate-700 font-data">{viewProfileStaff.phone || '-'}</p>
                                            {viewProfileStaff.phone && (
                                                <a href={`tel:${viewProfileStaff.phone}`} className="p-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm">
                                                    <Phone size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">เลขบัตรประชาชน</p>
                                        <p className="text-sm font-black text-slate-700 font-data">{viewProfileStaff.idCard || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">วันเกิด</p>
                                        <p className="text-sm font-bold text-slate-700 font-data flex items-center gap-1.5 whitespace-nowrap">
                                            {viewProfileStaff.dob || '-'} 
                                            <span className="text-[10px] text-slate-400 font-medium kanit-text bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-sm">{viewProfileStaff.dob ? getAgeString(viewProfileStaff.dob) : ''}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">เพศ</p>
                                        <p className="text-sm font-bold text-slate-700 kanit-text">{viewProfileStaff.gender || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">สัญชาติ</p>
                                        <p className="text-sm font-bold text-slate-700 kanit-text">{viewProfileStaff.nationality || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">เชื้อชาติ</p>
                                        <p className="text-sm font-bold text-slate-700 kanit-text">{viewProfileStaff.ethnicity || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1">ศาสนา</p>
                                        <p className="text-sm font-bold text-slate-700 kanit-text">{viewProfileStaff.religion || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50/30 p-5 rounded-[1.5rem] border border-emerald-100/80 shadow-sm">
                                <h4 className="text-sm font-bold text-emerald-800 kanit-text mb-4 flex items-center gap-2 pb-2 border-b border-emerald-200/60"><DollarSign size={18} className="text-emerald-500" /> ข้อมูลการจ้างงาน</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4 pl-1">
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest kanit-text mb-1">ประเภท</p>
                                        <p className="text-sm font-black text-emerald-800 kanit-text bg-white px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm w-fit">{viewProfileStaff.employmentType === 'monthly' ? 'รายเดือน' : viewProfileStaff.employmentType === 'daily' ? 'รายวัน' : 'Part-time'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest kanit-text mb-1">เงินเดือนฐาน</p>
                                        <p className="text-sm font-black text-emerald-700 font-data">{formatCurrency(viewProfileStaff.baseSalary)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest kanit-text mb-1">เรท OT (ชม.)</p>
                                        <p className="text-sm font-bold text-emerald-800 font-data">{viewProfileStaff.otRate > 0 ? `${viewProfileStaff.otRate} ฿` : '-'}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3 pt-4 border-t border-emerald-100/60 mt-1">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest kanit-text mb-1.5">ค่าคอมมิชชั่น</p>
                                            <p className="text-sm font-bold text-emerald-800 kanit-text flex items-center gap-2">
                                                <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm text-emerald-700 font-data">{viewProfileStaff.commissionRate > 0 ? `${viewProfileStaff.commissionRate}${viewProfileStaff.commissionType === 'percent' ? '%' : '฿'}` : 'ไม่มี'}</span>
                                                {viewProfileStaff.commissionRate > 0 && <span className="text-xs text-emerald-600 font-medium">{viewProfileStaff.commissionCondition === 'threshold' ? `(เริ่มคำนวณตั้งแต่บิลที่ ${viewProfileStaff.commissionThreshold})` : '(รับค่าคอมในทุกบิล)'}</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 kanit-text mb-4 flex items-center gap-2 pb-2 border-b border-slate-200/60"><MapPin size={18} className="text-sky-500" /> ที่อยู่ & ติดต่อฉุกเฉิน</h4>
                                <div className="space-y-5 pl-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1.5">ที่อยู่ตามบัตรประชาชน</p>
                                            <p className="text-sm font-medium text-slate-700 kanit-text bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm leading-relaxed min-h-[60px]">
                                                {`${viewProfileStaff.address || ''} ${viewProfileStaff.moo ? 'ม.'+viewProfileStaff.moo : ''} ${viewProfileStaff.road ? 'ถ.'+viewProfileStaff.road : ''} ${viewProfileStaff.subDistrict || ''} ${viewProfileStaff.district || ''} ${viewProfileStaff.province || ''} ${viewProfileStaff.zipcode || ''}`.trim() || '- ไม่ระบุ -'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest kanit-text mb-1.5">ที่อยู่ปัจจุบัน (ที่พักอาศัย)</p>
                                            <p className="text-sm font-medium text-slate-700 kanit-text bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm leading-relaxed min-h-[60px]">
                                                {`${viewProfileStaff.curAddress || ''} ${viewProfileStaff.curMoo ? 'ม.'+viewProfileStaff.curMoo : ''} ${viewProfileStaff.curRoad ? 'ถ.'+viewProfileStaff.curRoad : ''} ${viewProfileStaff.curSubDistrict || ''} ${viewProfileStaff.curDistrict || ''} ${viewProfileStaff.curProvince || ''} ${viewProfileStaff.curZipcode || ''}`.trim() || '- ไม่ระบุ -'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest kanit-text mb-2.5 flex items-center gap-1.5"><AlertCircle size={12}/> ผู้ติดต่อฉุกเฉิน</p>
                                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-white p-3 rounded-lg border border-rose-50">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-slate-400 block kanit-text">ชื่อ-สกุล</span>
                                                <span className="text-sm font-bold text-slate-700">{viewProfileStaff.emName || '-'}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-slate-400 block kanit-text">เกี่ยวข้องเป็น</span>
                                                <span className="text-sm font-bold text-slate-700">{viewProfileStaff.emRelation || '-'}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-slate-400 block kanit-text">เบอร์โทรศัพท์</span>
                                                <span className="text-sm font-black text-rose-600 font-data">{viewProfileStaff.emPhone || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ปุ่มปิดด้านล่าง (Footer) */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex justify-end shrink-0 w-full z-20">
                    <button onClick={closeProfileModal} className="w-full sm:w-auto px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors kanit-text">
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* --- Alert Modal --- */}
      
    </div>
  );
};

export default StaffManager;


