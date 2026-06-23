import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Skeleton from './Skeleton';
import MedicalRecords from './MedicalRecords';
import CustomSelect from './CustomSelect';
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
  posProducts = [],
  staffData = [],
  setStaffData,
  handlePrintReceipt, // <-- เพิ่มบรรทัดนี้เพื่อรับค่าฟังก์ชันพิมพ์ใบเสร็จ
  showGlobalAlert,
  globalAlert
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [filterBranch, setFilterBranch] = useState('all');
  
  // --- [NEW/MODIFIED] State สำหรับ Filter รวมกลุ่มแบบใหม่ ---
  const [timeFilterMode, setTimeFilterMode] = useState('all'); // 'all', 'month', 'year', 'range'
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // --- [NEW] State สำหรับ Modal ปฏิทินเลือกช่วงเวลา ---
  const [showFinRangeCalendar, setShowFinRangeCalendar] = useState(false);
  const [finRangeCalDate, setFinRangeCalDate] = useState(new Date());
  const [finRangeCalView, setFinRangeCalView] = useState('days');
  const [finRangeYearPageStart, setFinRangeYearPageStart] = useState(0);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [isFinRangeClosing, setIsFinRangeClosing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- State for Mobile Filters ---
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // [FIX] Manage 'filter-expanded' imperatively to avoid React overwriting 'is-scrolled'
  useEffect(() => {
    if (filterRef.current) {
        if (showMobileFilters) {
            filterRef.current.classList.add('filter-expanded');
        } else {
            filterRef.current.classList.remove('filter-expanded');
        }
    }
  }, [showMobileFilters]);

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('th-TH');
    } catch { return ''; }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
  };

  const getDynamicTextClass = (amountStr) => {
    if (!amountStr) return 'text-2xl sm:text-3xl lg:text-2xl xl:text-3xl tracking-tight';
    const len = String(amountStr).length;
    if (len >= 18) return 'text-lg sm:text-xl lg:text-lg xl:text-xl tracking-tighter';
    if (len >= 14) return 'text-xl sm:text-2xl lg:text-xl xl:text-2xl tracking-tighter';
    return 'text-2xl sm:text-3xl lg:text-2xl xl:text-3xl tracking-tight';
  };

  const headerRef = useRef(null);
  const filterRef = useRef(null);

  // POS Edit States
  const [isPosEditModalOpen, setIsPosEditModalOpen] = useState(false);
  const [isPosEditClosing, setIsPosEditClosing] = useState(false);
  const [posEditForm, setPosEditForm] = useState(null);
  const [isSavingPos, setIsSavingPos] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);

  // Detail Modal States
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);  const [isAlertClosing, setIsAlertClosing] = useState(false);

  const closeFinAlert = () => {
      setIsAlertClosing(true);
      setTimeout(() => {
          globalAlert.close();
      }, 300);
  };

  const calendarModal = useModal();
  const finCalSwipeProps = useSwipeDown(calendarModal.close);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('days');
  const [yearPageStart, setYearPageStart] = useState(0);
  
  // --- เพิ่ม State และ Ref สำหรับปฏิทินแบบกำหนดเอง (เพิ่มวินาทีเข้าไปด้วย) ---
  const [calTime, setCalTime] = useState({ h: '09', m: '00', s: '00' });
  const dateWrapperRef = useRef(null);
  const posDateWrapperRef = useRef(null);
  const [calendarTarget, setCalendarTarget] = useState('manual');

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // --- [NEW] ฟังก์ชันสำหรับจัดการปฏิทินเลือกช่วงเวลา ---
  const closeFinRangeCalendar = () => {
      setIsFinRangeClosing(true);
      setTimeout(() => { setShowFinRangeCalendar(false); setIsFinRangeClosing(false); }, 300);
  };
  const finRangeSwipeProps = useSwipeDown(closeFinRangeCalendar);

  const handleOpenFinRange = () => {
      setTempStartDate(dateRange.start);
      setTempEndDate(dateRange.end);
      if (dateRange.start) {
          setFinRangeCalDate(new Date(dateRange.start));
      } else {
          setFinRangeCalDate(new Date());
      }
      setFinRangeCalView('days');
      setShowFinRangeCalendar(true);
  };

  const handleSelectFinRangeDate = (day) => {
      const selectedDate = new Date(finRangeCalDate.getFullYear(), finRangeCalDate.getMonth(), day);
      selectedDate.setHours(0,0,0,0);

      if (!tempStartDate || (tempStartDate && tempEndDate)) {
          setTempStartDate(selectedDate);
          setTempEndDate(null);
      } else {
          if (selectedDate >= tempStartDate) {
              setTempEndDate(selectedDate);
          } else {
              setTempStartDate(selectedDate);
              setTempEndDate(null);
          }
      }
  };

  const confirmFinRange = () => {
      if (tempStartDate && tempEndDate) {
          setDateRange({ start: tempStartDate, end: new Date(tempEndDate.getTime() + 86399999) }); // เซ็ตเวลา end ให้สุดวัน
          setTimeFilterMode('range'); // บังคับโหมดเป็นช่วงเวลาเมื่อกดยืนยัน
          closeFinRangeCalendar();
      } else {
          showToast('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด', 'warning');
      }
  };

  const clearFinRange = () => {
      setDateRange({ start: null, end: null });
      // ถ้ายกเลิกช่วงเวลา ให้กลับไปเป็นโหมด "ทุกเวลา"
      setTimeFilterMode('all');
  };

  const formatRangeStr = (dateObj) => {
      if (!dateObj) return '';
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear() + 543;
      return `${d}/${m}/${y}`;
  };

  useEffect(() => {
      if (finRangeCalView === 'years') setFinRangeYearPageStart(Math.floor((finRangeCalDate.getFullYear() + 543) / 12) * 12);
  }, [finRangeCalView, finRangeCalDate]);

  const blankFinRangeDays = Array.from({ length: new Date(finRangeCalDate.getFullYear(), finRangeCalDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthFinRangeDays = Array.from({ length: new Date(finRangeCalDate.getFullYear(), finRangeCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

  // ข้อมูลสำหรับ Dropdown เดือนและปี
  const monthOptions = [
      {value: 'all', label: 'ทุกเดือน'},
      ...thaiMonths.map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))
  ];
  
  const currentY = new Date().getFullYear();
  // --- [MODIFIED] ปรับขยายปีให้มีล่วงหน้า 2 ปี และย้อนหลังไปอีก 12 ปี (รวม 15 ตัวเลือก) ---
  const yearOptions = [
      {value: 'all', label: 'ทุกปี'},
      ...Array.from({length: 15}, (_, i) => {
          const y = currentY + 2 - i; // เริ่มต้นที่ปีปัจจุบัน + 2 แล้วค่อยๆ ลบทีละ 1
          return { value: String(y), label: String(y + 543) };
      })
  ];
  // ---------------------------------------------------

  // ฟังก์ชันเปิดและตั้งค่าให้ปฏิทินแสดงผลตรงกับวันที่ที่กรอกไว้
  const handleOpenCalendar = () => {
    setCalendarTarget('manual');
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

  const handleOpenPosCalendar = () => {
    setCalendarTarget('pos');
    const dtStr = posEditForm.displayDate;
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
    amount: 0,
    items: [{ name: '', quantity: 1, price: '', total: 0 }],
    method: 'cash',
    reference: '',
    note: '',
    branchId: currentBranch || 'all',
    patientId: '',
    patientName: '',
    discount: 0,
    discountType: 'amount',
    taxMode: 'none',
    vatRate: 7
  });

  const handleAddItem = () => {
      setFormData(prev => ({
          ...prev,
          items: [...(prev.items || []), { name: '', quantity: 1, price: '', total: 0 }]
      }));
  };

  const handleRemoveItem = (index) => {
      setFormData(prev => {
          const newItems = (prev.items || []).filter((_, i) => i !== index);
          const newAmount = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
          return { ...prev, items: newItems, amount: newAmount };
      });
  };

  const handleItemChange = (index, field, value) => {
      setFormData(prev => {
          const newItems = [...(prev.items || [])];
          if (!newItems[index]) return prev;
          newItems[index] = { ...newItems[index], [field]: value };
          if (field === 'quantity' || field === 'price') {
              const qty = Number(newItems[index].quantity) || 0;
              const price = Number(newItems[index].price) || 0;
              newItems[index].total = qty * price;
          }
          if (field === 'name') {
              // Try to find product and autofill price if not set
              const matchedProduct = posProducts.find(p => p.name === value);
              if (matchedProduct) {
                  newItems[index].isVatable = !!matchedProduct.isVatable;
                  if (!newItems[index].price || newItems[index].price === 0) {
                      newItems[index].price = matchedProduct.price;
                      const qty = Number(newItems[index].quantity) || 1;
                      newItems[index].total = qty * matchedProduct.price;
                  }
              } else {
                  newItems[index].isVatable = false;
              }
          }
          const newAmount = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
          return { ...prev, items: newItems, amount: newAmount };
      });
  };

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
        amount: 0,
        items: [{ name: '', quantity: 1, price: '', total: 0 }],
        method: 'cash',
        reference: '',
        note: '',
        branchId: currentBranch || 'all',
        patientId: '',
        patientName: '',
        discount: 0,
        discountType: 'amount',
        taxMode: 'none',
        vatRate: 7
      });
      setPatientSearchQuery('');
      setIsModalClosing(false); // Reset closing state
      setIsModalOpen(true);
  };

  // --- Closing Helpers ---
  const closeManualModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsModalClosing(false);
    }, 300);
  };

  const closePosEditModal = () => {
    setIsPosEditClosing(true);
    setTimeout(() => {
      setIsPosEditModalOpen(false);
      setIsPosEditClosing(false);
    }, 300);
  };

  const closeDetailModal = () => {
      setIsDetailClosing(true);
      setTimeout(() => {
          setIsDetailModalOpen(false);
          setSelectedTxn(null);
          setIsDetailClosing(false);
      }, 300);
  };

  // --- POS Editing Helper Functions ---
  const handleSavePosEdit = async () => {
    if (!posEditForm) return;
    setIsSavingPos(true);
    try {
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

      const newIsoDate = convertThaiToISO(posEditForm.displayDate);

      // --- [MODIFIED] คำนวณยอดเงินรวมใหม่ทั้งหมด (รวมส่วนลดและภาษี) ก่อนบันทึก ---
      const financeSubtotal = posEditForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const financeDiscountAmount = posEditForm.discountType === 'percent' ? (financeSubtotal * ((Number(posEditForm.discountValue) || 0) / 100)) : (Number(posEditForm.discountValue) || 0);
      const financeAfterDiscount = Math.max(0, financeSubtotal - financeDiscountAmount);

      let totalVatable = 0;
      posEditForm.items.forEach(item => {
           // ใช้ค่า isVatable ที่ฝังมากับรายการ หรือค้นหาจาก posProducts ถ้าไม่มี
           const isVat = item.isVatable !== undefined ? item.isVatable : (posProducts.find(p => p.id === item.id || p.name === item.name)?.isVatable || false);
           if (isVat) totalVatable += (item.price * item.quantity);
      });

      // กระจายส่วนลดเข้าก้อน Vatable (Prorate)
      const vatableRatio = financeSubtotal > 0 ? (totalVatable / financeSubtotal) : 0;
      const vatableDiscount = financeDiscountAmount * vatableRatio;
      const netVatable = Math.max(0, totalVatable - vatableDiscount);

      let financeVatAmount = 0;
      let financeGrandTotal = financeAfterDiscount;

      if (posEditForm.taxMode === 'exclude') {
          financeVatAmount = netVatable * ((Number(posEditForm.vatRate) || 7) / 100);
          financeGrandTotal = financeAfterDiscount + financeVatAmount;
      } else if (posEditForm.taxMode === 'include') {
          financeVatAmount = netVatable - (netVatable * 100 / (100 + (Number(posEditForm.vatRate) || 7)));
          financeGrandTotal = financeAfterDiscount;
      }

      const updatedTx = {
        ...posEditForm,
        createdAt: newIsoDate,
        date: newIsoDate,
        subtotal: financeSubtotal,
        discountAmount: financeDiscountAmount,
        vatAmount: financeVatAmount,
        amount: financeGrandTotal,
        total: financeGrandTotal,
        netTotal: financeGrandTotal,
        grandTotal: financeGrandTotal,
        items: posEditForm.items,
        patientName: patientSearchQuery 
      };
      delete updatedTx.displayDate;
      // ----------------------------------------------------------------------
      
      const res = await callAppScript('SAVE_DATA', 'POS_Transactions', updatedTx);
      if (res.status === 'success') {
        // อัปเดต posHistoryData ใน State (เพื่อให้หน้าจอเปลี่ยนตามทันที)
        setPosHistoryData(prev => prev.map(p => p.id === updatedTx.id ? updatedTx : p));
        showToast('แก้ไขรายการ POS สำเร็จ', 'success');
        closePosEditModal();
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
            total: product.price * newItems[index].quantity,
            isVatable: !!product.isVatable
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
        if (field === 'name') {
           const product = posProducts.find(p => p.name === value);
           newItems[index].isVatable = product ? !!product.isVatable : false;
        }
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
      const newItem = { id: '', name: '', price: 0, quantity: 1, total: 0, isVatable: false };
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
    let result = patientsData;
    if (patientSearchQuery) {
        const q = patientSearchQuery.toLowerCase();
        result = patientsData.filter(p =>
          (p.hn && p.hn.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.firstName && p.firstName.toLowerCase().includes(q)) ||
          (p.lastName && p.lastName.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q))
        );
    }

    // Sort by recent visit descending and take top 15
    return result.sort((a, b) => {
        const valA = getPatientLastVisitStr(a);
        const valB = getPatientLastVisitStr(b);
        if (valA < valB) return 1;
        if (valA > valB) return -1;
        return 0;
    }).slice(0, 15);
  }, [patientsData, patientSearchQuery]);
  const allTransactions = useMemo(() => {
    const posTx = posHistoryData.map(tx => {
      const txDate = tx.datetime || tx.timestamp || tx.createdAt || new Date().toISOString();
      return {
        id: tx.id || tx.receiptNo || Math.random().toString(),
        date: txDate,
        timestamp: new Date(txDate).getTime(),
        type: 'income',
        amount: parseFloat(tx.total || tx.netTotal || tx.grandTotal || tx.amount || 0),
        method: tx.paymentMethod || 'cash',
        category: 'รายได้จาก/ขาย POS',
        note: tx.patientName ? `${tx.patientName}` : 'ทั่วไป (ไม่ระบุ)',
        status: tx.status || 'completed',
        isAuto: true,
        branchId: tx.branchId || 'all',
        rawTx: tx
      };
    });

    const finTx = financeData.map(tx => ({
        ...tx,
        timestamp: new Date(tx.date).getTime()
    }));

    return [...posTx, ...finTx].sort((a, b) => b.timestamp - a.timestamp);
  }, [posHistoryData, financeData]);

  const filteredTransactions = useMemo(() => {
    const s = search.toLowerCase();
    return allTransactions.filter(tx => {
      const matchSearch = tx.note.toLowerCase().includes(s) || tx.category.toLowerCase().includes(s) || tx.id.toLowerCase().includes(s);
      let matchType = true;
      if (filterType === 'income') matchType = tx.type === 'income';
      else if (filterType === 'expense') matchType = tx.type === 'expense';
      else if (filterType === 'pos') matchType = tx.isAuto === true;
      else if (filterType === 'manual') matchType = !tx.isAuto;

      const matchBranch = filterBranch === 'all' || tx.branchId === filterBranch || tx.branchId === 'all';

      // --- ตรวจสอบการกรองเวลาจากโหมดที่เลือก (Grouped Logic) ---
      let txDateObj = new Date(tx.timestamp);
      let matchTime = true;
      if (timeFilterMode === 'month') {
          matchTime = String(txDateObj.getMonth() + 1).padStart(2, '0') === filterMonth && String(txDateObj.getFullYear()) === filterYear;
      } else if (timeFilterMode === 'year') {
          matchTime = String(txDateObj.getFullYear()) === filterYear;
      } else if (timeFilterMode === 'range' && dateRange.start && dateRange.end) {
          matchTime = txDateObj >= dateRange.start && txDateObj <= dateRange.end;
      }

      return matchSearch && matchType && matchBranch && matchTime;
    });
  }, [allTransactions, search, filterType, filterBranch, timeFilterMode, filterMonth, filterYear, dateRange]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let validTransactionsCount = 0;

    filteredTransactions.forEach(tx => {
      // ไม่นำบิลที่ถูกยกเลิก (cancelled) มารวมในยอดสรุปการเงิน
      if (tx.status !== 'cancelled') {
        validTransactionsCount++;
        if (tx.type === 'income') totalIncome += tx.amount;
        if (tx.type === 'expense') totalExpense += tx.amount;
      }
    });
    
    // คำนวณเปอร์เซ็นต์ (ป้องกัน error หารด้วย 0 กรณีไม่มีรายรับ)
    const costPercent = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
    const marginPercent = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    return {
      balance: totalIncome - totalExpense,
      income: totalIncome,
      expense: totalExpense,
      transactionsCount: validTransactionsCount,
      costPercent,
      marginPercent
    };
  }, [filteredTransactions]);

  const handleEditTransaction = (tx) => {
      if (tx.isAuto) {
        const originalTx = posHistoryData.find(p => p.id === tx.id || p.receiptNo === tx.id);
        if (originalTx) {
          let editDateStr = '';
          const txDateToUse = originalTx.createdAt || originalTx.date || tx.date;
          if (txDateToUse) {
              const dObj = new Date(txDateToUse);
              if (!isNaN(dObj.getTime())) {
                  const d = String(dObj.getDate()).padStart(2, '0');
                  const m = String(dObj.getMonth() + 1).padStart(2, '0');
                  const y = dObj.getFullYear() + 543;
                  const hh = String(dObj.getHours()).padStart(2, '0');
                  const mm = String(dObj.getMinutes()).padStart(2, '0');
                  const ss = String(dObj.getSeconds()).padStart(2, '0');
                  editDateStr = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
              } else {
                  editDateStr = txDateToUse;
              }
          }

          setPosEditForm({
            ...originalTx,
            displayDate: editDateStr,
            items: originalTx.items ? [...originalTx.items] : []
          });
          setPatientSearchQuery(originalTx.patientName || '');
          setIsPosEditClosing(false);
          setIsPosEditModalOpen(true);
        } else {
          showToast('ไม่พบข้อมูลต้นฉบับจาก POS', 'warning');
        }
        return;
      }

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
         items: tx.items && tx.items.length > 0 ? tx.items : [{ name: tx.category || 'รายการเดิม', quantity: 1, price: tx.amount || 0, total: tx.amount || 0 }],
         method: tx.method,
         reference: tx.reference || '',
         note: tx.note || '',
         branchId: tx.branchId || currentBranch || 'all',
         patientId: tx.patientId || '',
         patientName: tx.patientName || '',
         discount: tx.discountValue || 0,
         discountType: tx.discountType || 'amount',
         taxMode: tx.taxMode || 'none',
         vatRate: tx.vatRate || 7
      });
      setIsModalClosing(false);
      setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (tx) => {
      if (tx.isAuto) {
        showToast('รายการจากระบบ POS ไม่สามารถลบได้ กรุณากด "แก้ไข" และเปลี่ยนสถานะบิลเป็น "ยกเลิก (Void)" แทน', 'warning');
        return;
      }
      showGlobalAlert({
        type: 'warning',
        title: 'ยืนยันการลบรายการ?',
        text: `คุณต้องการลบรายการ "${tx.category}" จำนวน ${formatCurrency(tx.amount)} ใช่หรือไม่?`,
        onConfirm: async () => {
            globalAlert.setIsOpen(false);
            setIsProcessing(true);
            try {
                const sheetName = tx.type === 'income' ? 'Finance_Revenue' : 'Finance_Expenses';
                await callAppScript('DELETE_DATA', sheetName, { id: tx.id });
                setFinanceData(prev => prev.filter(item => item.id !== tx.id));

                if (tx.id.startsWith('EXP-PR-') && tx.patientId) {
                    const staffToUpdate = staffData.find(s => s.id === tx.patientId);
                    if (staffToUpdate) {
                        let paidDatesToRevert = [];
                        try {
                            if (tx.reference) paidDatesToRevert = JSON.parse(tx.reference);
                        } catch (e) {}

                        if (paidDatesToRevert.length > 0) {
                            const newSchedule = { ...(staffToUpdate.schedule || {}) };
                            paidDatesToRevert.forEach(dateStr => {
                                if (newSchedule[dateStr]) {
                                    newSchedule[dateStr] = { ...newSchedule[dateStr], isPaid: false };
                                }
                            });
                            const updatedStaff = { ...staffToUpdate, schedule: newSchedule };
                            await callAppScript('SAVE_DATA', 'Staff', updatedStaff);
                            if (setStaffData) {
                                setStaffData(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
                            }
                        }
                    }
                }
                showToast('ลบรายการสำเร็จ', 'danger');
            } catch (err) {
                showToast('เกิดข้อผิดพลาดในการลบรายการ', 'danger');
            } finally {
                setIsProcessing(false);
            }
        }
      });
        };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.items || formData.items.length === 0 || formData.items.some(i => !i.name || i.price === '')) {
      showToast('กรุณากรอกข้อมูลและรายการให้ครบถ้วน', 'warning');
      return;
    }

    setIsProcessing(true);
    const isEdit = !!formData.id;

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

    const financeSubtotal = formData.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const financeDiscountAmount = formData.discountType === 'percent' ? (financeSubtotal * ((Number(formData.discount) || 0) / 100)) : (Number(formData.discount) || 0);
    const financeAfterDiscount = Math.max(0, financeSubtotal - financeDiscountAmount);

    let totalVatable = 0;
    formData.items.forEach(item => {
        const isVat = item.isVatable !== undefined ? item.isVatable : (posProducts.find(p => p.name === item.name)?.isVatable || false);
        if (isVat) totalVatable += (Number(item.total) || 0);
    });

    const vatableRatio = financeSubtotal > 0 ? (totalVatable / financeSubtotal) : 0;
    const vatableDiscount = financeDiscountAmount * vatableRatio;
    const netVatable = Math.max(0, totalVatable - vatableDiscount);

    let financeVatAmount = 0;
    let financeGrandTotal = financeAfterDiscount;

    if (formData.taxMode === 'exclude') {
        financeVatAmount = netVatable * ((Number(formData.vatRate) || 7) / 100);
        financeGrandTotal = financeAfterDiscount + financeVatAmount;
    } else if (formData.taxMode === 'include') {
        financeVatAmount = netVatable - (netVatable * 100 / (100 + (Number(formData.vatRate) || 7)));
        financeGrandTotal = financeAfterDiscount;
    }

    const newTx = {
      id: isEdit ? formData.id : `${formData.type === 'income' ? 'INC' : 'EXP'}-${Date.now()}`,
      date: isoDate,
      type: formData.type,
      amount: financeGrandTotal,
      subtotal: financeSubtotal,
      discountValue: Number(formData.discount) || 0,
      discountType: formData.discountType,
      discountAmount: financeDiscountAmount,
      taxMode: formData.taxMode,
      vatRate: Number(formData.vatRate) || 7,
      vatAmount: financeVatAmount,
      method: formData.method,
      category: formData.category,
      note: formData.note,
      status: 'completed',
      isAuto: false,
      branchId: formData.branchId,
      items: formData.items,
      patientId: formData.patientId,
      patientName: formData.patientName
    };

    try {
      const sheetName = newTx.type === 'income' ? 'Finance_Revenue' : 'Finance_Expenses';
      const res = await callAppScript('SAVE_DATA', sheetName, newTx);

      if (res.status === 'success') {
          if (isEdit) {
            setFinanceData(prev => prev.map(item => item.id === newTx.id ? newTx : item));
          } else {
            setFinanceData(prev => [newTx, ...prev]);
          }
          showToast(isEdit ? 'แก้ไขรายการสำเร็จ' : 'บันทึกรายการสำเร็จ', 'success');
          closeManualModal();
      } else {
          throw new Error(res.message);
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailModal = (tx) => {
      setSelectedTxn(tx);
      setIsDetailModalOpen(true);
  };

  // --- [FIXED] Infinity Scroll Logic (Matched with MedicalRecords 100%) ---
  const [visibleCount, setVisibleCount] = useState(30);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setVisibleCount(30);
    setIsLoadingMore(false);
  }, [search, filterType, filterBranch, timeFilterMode, filterMonth, filterYear, dateRange]);

  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = rAFThrottle((e) => {
      // ป้องกันการคำนวณและอัปเดต ถ้า Component ถูกซ่อนอยู่
      if (!headerRef.current || headerRef.current.offsetHeight === 0) return;

      const target = e.target || mainElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      
      // 1. จัดการ Sticky Header
      if (scrollTop > 20) {
          headerRef.current.classList.add('is-scrolled');
      } else {
          headerRef.current.classList.remove('is-scrolled');
      }

      // 2. จัดการ Sticky Filter
      if (filterRef.current && headerRef.current) {
          const headerRect = headerRef.current.getBoundingClientRect();
          const filterRect = filterRef.current.getBoundingClientRect();
          if (filterRect.top <= headerRect.bottom + 1) {
              filterRef.current.classList.add('is-scrolled');
          } else {
              filterRef.current.classList.remove('is-scrolled');
          }
      }

      // 3. ตรวจสอบการโหลดข้อมูลเพิ่ม (ระยะ 100px จากท้าย)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (visibleCount < filteredTransactions.length && !isLoadingMore) {
           setIsLoadingMore(true);
           setTimeout(() => {
              setVisibleCount(prev => prev + 10);
              setIsLoadingMore(false);
           }, 1000);
        }
      }
    });

    // ตั้งค่าสถานะเริ่มต้น
    setTimeout(() => {
        // ล้างคลาสที่อาจค้างอยู่จากการสลับหน้าจอ (Tab switching) 
        if (headerRef.current) headerRef.current.classList.remove('is-scrolled');
        if (filterRef.current) {
            filterRef.current.classList.remove('is-scrolled');
            if (filterRef.current.classList.contains('filter-expanded')) filterRef.current.classList.remove('filter-expanded');
        }
        // บังคับให้เกิด Event Scroll 1 ครั้ง เพื่อให้ handleScroll คำนวณขนาดและตำแหน่งใหม่ให้ถูกต้อง
        if (mainElement) mainElement.dispatchEvent(new Event('scroll'));
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredTransactions.length, isLoadingMore]);
  // -----------------------------

  return (
    <div className="fade-in pb-10 relative flex flex-col h-full w-full">
      {/* --- 1. Sticky Header --- */}
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
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

      {/* --- 2. Stats Section --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 mb-0 relative z-20 pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-0">
          {/* Card 1: รายรับ */}
          <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-3xl border border-emerald-100/80 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-3 z-10 mb-2">
              <div className="w-10 h-10 bg-emerald-100/80 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <TrendingUp size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-700 kanit-text tracking-wide">รายรับ</h3>
            </div>
            <div className="z-10 w-full overflow-hidden">
              {isGlobalLoading ? <div className="w-full max-w-[150px] h-[32px] bg-slate-200 animate-pulse rounded-xl mb-1"></div> : <h2 className={`font-black text-emerald-800 font-data mb-1 whitespace-nowrap ${getDynamicTextClass(formatCurrency(stats.income))}`} title={formatCurrency(stats.income)}>{formatCurrency(stats.income)}</h2>}
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
              {isGlobalLoading ? <div className="w-full max-w-[150px] h-[32px] bg-slate-200 animate-pulse rounded-xl mb-1"></div> : <h2 className={`font-black text-rose-800 font-data mb-1 whitespace-nowrap ${getDynamicTextClass(formatCurrency(stats.expense))}`} title={formatCurrency(stats.expense)}>{formatCurrency(stats.expense)}</h2>}
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
              {isGlobalLoading ? <div className="w-full max-w-[150px] h-[32px] bg-slate-200 animate-pulse rounded-xl mb-1"></div> : <h2 className={`font-black font-data mb-1 whitespace-nowrap ${stats.balance < 0 ? 'text-rose-600' : 'text-sky-800'} ${getDynamicTextClass(formatCurrency(stats.balance))}`} title={formatCurrency(stats.balance)}>{formatCurrency(stats.balance)}</h2>}
            </div>
            {!isGlobalLoading && (
              <div className="text-[10px] sm:text-xs text-sky-600/80 font-medium kanit-text z-10 mt-1">
                Margin: {Number(stats.marginPercent || 0).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- 3. Filter Component --- */}
      <div ref={filterRef} className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-5 sm:my-6 sticky-filter-appt">
        <div className="w-full mx-auto pointer-events-none relative h-[76px] sm:h-[92px] z-50">
          <div className={`absolute top-[6px] left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-col gap-2 px-4 md:px-8 2xl:px-12 py-3 sm:py-4 transition-all duration-300 ${showMobileFilters ? 'ease-out' : 'ease-in'}`}>
            <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 w-full">
               <div className="relative flex-1 min-w-0 w-full">
                  <input 
                    type="text" 
                    placeholder="ค้นหารายการ, หมวดหมู่..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-3 sm:pl-11 sm:pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-400 shadow-inner font-data truncate"
                  />
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
               </div>
               
               <button 
                 onClick={() => setShowMobileFilters(!showMobileFilters)} 
                 className={`lg:hidden p-2.5 rounded-xl border transition-colors shrink-0 ${showMobileFilters || filterType !== 'all' || filterBranch !== 'all' || timeFilterMode !== 'all' ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
               >
                  {showMobileFilters ? <ChevronUp size={18} /> : <Filter size={18} />}
               </button>

               <div className="hidden lg:flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
                 <div className="w-[100px] relative">
                   <CustomSelect 
                     value={filterType} 
                     onChange={(val) => setFilterType(val)} 
                     options={[
                       {value: 'all', label: 'ทั้งหมด'},
                       {value: 'income', label: 'รายรับ'},
                       {value: 'expense', label: 'รายจ่าย'},
                       {value: 'pos', label: 'POS'},
                       {value: 'manual', label: 'Manual'}
                     ]}
                     compact fullWidth className="w-full"
                   />
                 </div>
                 
                 <div className="w-[110px] relative">
                   <CustomSelect 
                     value={filterBranch} 
                     onChange={(val) => setFilterBranch(val)} 
                     options={[
                       {value: 'all', label: 'ทุกสาขา'},
                       ...(branchesData || []).map(b => ({value: b.id, label: b.name}))
                     ]}
                     compact fullWidth className="w-full"
                   />
                 </div>

                 <div className="flex items-stretch bg-white border border-slate-200 rounded-xl shadow-sm h-[36px] z-[45]">
                    <div className="w-[110px] border-r border-slate-100 bg-slate-50/80 rounded-l-xl relative">
                        <CustomSelect 
                            value={timeFilterMode} 
                            onChange={(val) => { setTimeFilterMode(val); if(val !== 'range') setDateRange({start:null,end:null}); }} 
                            options={[{value:'all',label:'📅 ทุกเวลา'},{value:'month',label:'🗓️ รายเดือน'},{value:'year',label:'📆 รายปี'},{value:'range',label:'🗓️ กำหนดเอง'}]} 
                            compact fullWidth 
                            className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[36px] [&>div:first-child]:!justify-start [&>div:first-child]:!pl-3" 
                        />
                    </div>
                    <div className="flex items-center min-w-[170px] relative transition-all duration-200">
                        {timeFilterMode === 'all' && <div className="w-full text-center text-[11px] font-bold text-slate-400 kanit-text px-3 uppercase tracking-wider bg-white rounded-r-xl h-full flex items-center justify-center">แสดงทั้งหมด</div>}
                        {timeFilterMode === 'month' && (
                            <div className="flex w-full divide-x divide-slate-100 h-full bg-white rounded-r-xl">
                                <div className="flex-[3] relative h-full"><CustomSelect value={filterMonth} onChange={setFilterMonth} options={monthOptions.filter(o=>o.value!=='all')} compact fullWidth className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[36px]" /></div>
                                <div className="flex-[2] relative h-full"><CustomSelect value={filterYear} onChange={setFilterYear} options={yearOptions.filter(o=>o.value!=='all')} compact fullWidth className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[36px]" /></div>
                            </div>
                        )}
                        {timeFilterMode === 'year' && (
                            <div className="w-full relative h-full bg-white rounded-r-xl"><CustomSelect value={filterYear} onChange={setFilterYear} options={yearOptions.filter(o=>o.value!=='all')} compact fullWidth className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[36px]" /></div>
                        )}
                        {timeFilterMode === 'range' && (
                            <div className="flex items-center justify-between w-full h-full px-2 gap-1 bg-white rounded-r-xl relative z-[45]">
                                <button onClick={handleOpenFinRange} className={`text-xs font-bold kanit-text px-2 py-1 rounded-lg transition-colors truncate flex-1 text-left flex items-center gap-1.5 ${dateRange.start ? 'text-sky-700 bg-sky-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                                    {dateRange.start && dateRange.end ? `${formatRangeStr(dateRange.start)} - ${formatRangeStr(dateRange.end)}` : 'คลิกเลือกวันที่'}
                                </button>
                                {dateRange.start ? <button onClick={clearFinRange} className="text-slate-300 hover:text-rose-500 p-1 shrink-0 transition-colors bg-white"><X size={14}/></button> : <CalendarIcon size={14} className="text-slate-300 shrink-0 mr-1" />}
                            </div>
                        )}
                    </div>
                 </div>
               </div>
            </div>

            <div className={`lg:hidden grid transition-[grid-template-rows,opacity] ${showMobileFilters ? 'grid-rows-[1fr] opacity-100 ease-out duration-500' : 'grid-rows-[0fr] opacity-0 pointer-events-none ease-in duration-300'}`}>
               <div className={showMobileFilters ? 'overflow-visible' : 'overflow-hidden'}>
                 <div className={`flex flex-col gap-2 pt-3 mt-1 border-t border-slate-100 relative z-[60] transition-transform ${showMobileFilters ? 'translate-y-0 ease-out duration-500' : '-translate-y-4 ease-in duration-300'}`}>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <div className="relative">
                       <CustomSelect value={filterType} onChange={(val) => setFilterType(val)} options={[{value: 'all', label: 'ทั้งหมด'}, {value: 'income', label: 'รายรับ'}, {value: 'expense', label: 'รายจ่าย'}, {value: 'pos', label: 'POS'}, {value: 'manual', label: 'Manual'}]} compact fullWidth className="w-full" />
                     </div>
                     <div className="relative">
                       <CustomSelect value={filterBranch} onChange={(val) => setFilterBranch(val)} options={[{value: 'all', label: 'ทุกสาขา'}, ...(branchesData || []).map(b => ({value: b.id, label: b.name}))]} compact fullWidth className="w-full" />
                     </div>
                   </div>
                   
                   <div className="flex items-stretch bg-white border border-slate-200 rounded-xl shadow-sm h-[40px] sm:h-[48px] z-[45]">
                      <div className="w-[100px] sm:w-[130px] border-r border-slate-100 bg-slate-50/80 rounded-l-xl relative">
                          <CustomSelect 
                              value={timeFilterMode} 
                              onChange={(val) => { setTimeFilterMode(val); if(val !== 'range') setDateRange({start:null,end:null}); }} 
                              options={[{value:'all',label:'📅 ทุกเวลา'},{value:'month',label:'🗓️ รายเดือน'},{value:'year',label:'📆 รายปี'},{value:'range',label:'🗓️ กำหนดเอง'}]} 
                              compact fullWidth 
                              className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[40px] sm:[&>div:first-child]:!min-h-[48px] [&>div:first-child]:!justify-start [&>div:first-child]:!pl-2" 
                          />
                      </div>
                      <div className="flex items-center min-w-0 flex-1 relative transition-all duration-200">
                          {timeFilterMode === 'all' && <div className="w-full text-center text-[10px] sm:text-xs font-bold text-slate-400 kanit-text px-2 uppercase tracking-wider bg-white rounded-r-xl h-full flex items-center justify-center">แสดงข้อมูลทั้งหมด</div>}
                          {timeFilterMode === 'month' && (
                              <div className="flex w-full divide-x divide-slate-100 h-full bg-white rounded-r-xl">
                                  <div className="flex-[3] relative h-full"><CustomSelect value={filterMonth} onChange={setFilterMonth} options={monthOptions.filter(o=>o.value!=='all')} compact fullWidth className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[40px] sm:[&>div:first-child]:!min-h-[48px]" /></div>
                                  <div className="flex-[2] relative h-full"><CustomSelect value={filterYear} onChange={setFilterYear} options={yearOptions.filter(o=>o.value!=='all')} compact fullWidth className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[40px] sm:[&>div:first-child]:!min-h-[48px]" /></div>
                              </div>
                          )}
                          {timeFilterMode === 'year' && (
                              <div className="w-full relative h-full bg-white rounded-r-xl"><CustomSelect value={filterYear} onChange={setFilterYear} options={yearOptions.filter(o=>o.value!=='all')} compact fullWidth className="w-full h-full [&>div:first-child]:!border-0 [&>div:first-child]:!bg-transparent [&>div:first-child]:!shadow-none [&>div:first-child]:!rounded-none [&>div:first-child]:!min-h-[40px] sm:[&>div:first-child]:!min-h-[48px]" /></div>
                          )}
                          {timeFilterMode === 'range' && (
                              <div className="flex items-center justify-between w-full h-full px-2 gap-1 bg-white rounded-r-xl relative z-[45]">
                                  <button onClick={handleOpenFinRange} className={`text-[11px] sm:text-sm font-bold kanit-text px-2 py-1.5 rounded-lg transition-colors truncate flex-1 text-left flex items-center gap-1.5 ${dateRange.start ? 'text-sky-700 bg-sky-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                                      {dateRange.start && dateRange.end ? `${formatRangeStr(dateRange.start)} - ${formatRangeStr(dateRange.end)}` : 'คลิกเลือกวันที่'}
                                  </button>
                                  {dateRange.start ? <button onClick={clearFinRange} className="text-slate-400 hover:text-rose-500 p-2 shrink-0 transition-colors bg-white"><X size={14}/></button> : <CalendarIcon size={14} className="text-slate-300 shrink-0 mr-1" />}
                              </div>
                          )}
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 4. Content Section --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-12 flex-1 flex flex-col pointer-events-auto z-10">
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-2 sm:px-4 py-4">
              {/* --- Desktop View (Table) --- */}
              <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                <table className="table-auto w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm"><th className="w-[13%] p-4 font-medium text-left pl-6 w-[120px] kanit-text">วันที่/เวลา</th><th className="w-[11%] p-4 font-medium kanit-text w-[120px]">เลขที่บิล</th><th className="w-[21%] p-4 font-medium kanit-text">รายละเอียด</th><th className="w-[11%] p-4 font-medium kanit-text">ประเภท/หมวดหมู่</th><th className="w-[11%] p-4 font-medium text-center kanit-text w-[120px]">ช่องทาง</th><th className="w-[13%] p-4 font-medium text-right w-[150px] kanit-text">จำนวนเงิน</th><th className="w-[11%] p-4 font-medium text-center w-[100px] kanit-text">สถานะ</th><th className="w-[9%] p-4 font-medium text-right pr-6 w-[100px] kanit-text">ดำเนินการ</th></tr>
                  </thead>
                  <tbody className="">
                    {isGlobalLoading ? (
                       Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`skel-${i}`} className="border-b border-slate-50 last:border-0">
                          <td className="p-4 pl-6"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl mb-1"></div><div className="w-full max-w-[60px] h-[12px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[150px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[120px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                          <td className="p-4 text-right"><div className="w-full max-w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-xl ml-auto"></div></td>
                          <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                          <td className="p-4 pr-6"><div className="flex gap-2 justify-end"><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div></td>
                        </tr>
                      ))
                    ) : visibleTransactions.length > 0 ? (
                      visibleTransactions.map((tx) => (
                        <tr key={tx.id} onClick={() => openDetailModal(tx)} className="border-b border-slate-50 last:border-0 hover:bg-sky-50/50 transition-colors group cursor-pointer">
                          <td className="p-4 pl-6 text-left">
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-data text-slate-800 kanit-text font-medium">{formatDate(tx.date)}</span>
                              <span className="text-xs font-data text-slate-500 mt-0.5">{formatTime(tx.date)} น.</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-bold text-sky-600 kanit-text">{tx.id}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {tx.patientName && (
                                <span className="text-sm text-slate-800 font-data line-clamp-1" title={tx.patientName}>
                                  {tx.patientName}
                                </span>
                              )}
                              <span className={`font-data line-clamp-2 leading-tight ${tx.patientName ? 'text-xs text-slate-500' : 'text-sm text-slate-700'}`} title={tx.note || '-'}>
                                {tx.note || '-'}
                              </span>
                            </div>
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
                          <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                             <div className="flex items-center justify-end gap-1">
                                 <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx, 'A4'); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="พิมพ์ใบเสร็จ">
                                    <Printer size={16}/>
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleEditTransaction(tx); }} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไข">
                                    <Pencil size={16}/>
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ">
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
                    
                    {/* Infinity Loading Skeleton (Desktop) */}
                    {isLoadingMore && Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`skel-fin-more-${i}`} className="border-b border-slate-50 last:border-0">
                          <td className="p-4 pl-6"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl mb-1"></div><div className="w-full max-w-[60px] h-[12px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[150px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[120px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                          <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                          <td className="p-4 text-right"><div className="w-full max-w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-xl ml-auto"></div></td>
                          <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                          <td className="p-4 pr-6"><div className="flex gap-2 justify-end"><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- Mobile View (Cards) --- */}
              <div className="lg:hidden space-y-3 mt-2">
                {isGlobalLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={`skel-mob-fin-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center mb-1.5"><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div></div>
                        <div className="mb-3"><div className="w-full max-w-[160px] h-[24px] bg-slate-200 animate-pulse rounded-xl mb-2"></div><div className="w-full max-w-[96px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                            <div className="flex items-center gap-2"><div className="w-full max-w-[20px] h-[20px] bg-slate-200 animate-pulse rounded-full"></div><div className="w-full max-w-[128px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></div>
                        </div>
                    </div>
                  ))
                ) : visibleTransactions.length > 0 ? (
                  visibleTransactions.map((tx) => (
                    <div key={tx.id} onClick={() => openDetailModal(tx)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]">
                        <div className="flex justify-between items-start mb-2.5">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-sky-600 kanit-text text-xs bg-sky-50 px-2 py-0.5 rounded-md w-fit truncate max-w-[180px]">{tx.id}</span>
                                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 font-data mt-0.5"><Clock size={12} className="text-slate-400"/> {formatDate(tx.date)} {formatTime(tx.date)} น.</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md kanit-text shrink-0 border ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {tx.status === 'completed' ? 'สำเร็จ' : tx.status}
                            </span>
                        </div>
                        
                        <div className="mb-1">
                            {tx.patientName ? (
                                <div className="font-bold text-slate-800 text-sm kanit-text line-clamp-1">{tx.patientName}</div>
                            ) : null}
                            <div className={`text-xs ${tx.patientName ? 'text-slate-500' : 'text-slate-800 font-bold'} kanit-text line-clamp-2 mt-1`}>
                                {tx.note || '-'}
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex flex-col gap-1.5 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                    {!tx.isAuto ? (
                                        <span className="text-[11px] font-bold text-slate-700 kanit-text truncate">{tx.category}</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-md kanit-text border border-sky-200">ระบบ POS</span>
                                    )}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 kanit-text flex items-center gap-1.5">
                                    {tx.method === 'cash' ? <><Banknote size={12}/> เงินสด</> : tx.method === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : tx.method === 'credit_card' || tx.method === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : <><Package size={12}/> {tx.method}</>}
                                </div>
                            </div>
                            <div className="text-right flex flex-col gap-1 shrink-0">
                                <div className={`font-black font-data text-lg leading-none tracking-tight ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        </div>

                        {/* Actions Row */}
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                            <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx, 'A4'); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-100">
                                <Printer size={14} /> พิมพ์
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleEditTransaction(tx); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-100">
                                <Pencil size={14} /> แก้ไข
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-100">
                                <Trash2 size={14} /> ลบ
                            </button>
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="kanit-text font-bold text-sm">ไม่มีรายการในระบบ</p>
                  </div>
                )}

                {/* --- [NEW] Infinite Scroll Sentinel --- */}
                {/* --- [FIXED] Infinite Scroll Sentinel (Matches MedicalRecords) --- */}
                <div className="w-full flex flex-col gap-3 py-2 pb-6">
                  {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                      <div key={`skel-mob-fin-more-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-center mb-1.5"><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div></div>
                          <div className="mb-3"><div className="w-full max-w-[160px] h-[24px] bg-slate-200 animate-pulse rounded-xl mb-2"></div><div className="w-full max-w-[96px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                              <div className="flex items-center gap-2"><div className="w-full max-w-[20px] h-[20px] bg-slate-200 animate-pulse rounded-full"></div><div className="w-full max-w-[128px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></div>
                          </div>
                      </div>
                    ))}
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedTxn && createPortal(
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm ${isDetailClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
           <div className={`bg-white rounded-[1.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden ${isDetailClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10 shrink-0">
                 <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${selectedTxn.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                       {selectedTxn.isAuto ? <History size={20} className="text-sky-500" /> : <Receipt size={20} />}
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight">{selectedTxn.isAuto ? 'ประวัติการทำรายการ (POS)' : 'รายละเอียดรายการ'}</h4>
                       <p className="text-[10px] sm:text-xs text-sky-600 font-bold font-data mt-0.5">{selectedTxn.id}</p>
                    </div>
                 </div>
                 <button type="button" onClick={closeDetailModal} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              {selectedTxn.isAuto ? (
                 <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar bg-white">
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
                      <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 w-full">
                          {/* Desktop Table */}
                          <div className="hidden sm:block overflow-x-auto w-full">
                              <table className="table-auto w-full text-left border-collapse min-w-[500px]">
                                  <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium kanit-text sticky top-0"><th className="w-[16%] p-3 text-center">#</th><th className="w-[32%] p-3">รายการสินค้า / บริการ</th><th className="w-[16%] p-3 text-center ">จำนวน</th><th className="w-[19%] p-3 text-right ">ราคา/หน่วย</th><th className="w-[17%] p-3 text-right ">รวม (บาท)</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {(selectedTxn.rawTx.items || []).map((item, idx) => (
                                          <tr key={`pos-item-${idx}`} className="hover:bg-slate-50/50 transition-colors font-data text-sm">
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
                          <div className="sm:hidden flex flex-col divide-y divide-slate-50 bg-slate-50/30">
                              {(selectedTxn.rawTx.items || []).map((item, idx) => (
                                  <div key={`pos-mob-item-${idx}`} className="p-3 flex flex-col gap-1 bg-white">
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
                      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
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
                              <div className="flex justify-between items-end text-xl sm:text-2xl font-black text-sky-600 kanit-text"><span className="text-base sm:text-lg">ยอดสุทธิ</span><span className="font-data tracking-tight">{formatCurrency(selectedTxn.rawTx?.grandTotal || selectedTxn.amount)}</span></div>
                          </div>
                      </div>
                 </div>
              ) : (
                 <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar bg-white">
                      {/* Info Grid for Manual */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                              <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><User size={12}/></div>
                                  <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">ข้อมูลลูกค้า & วันที่</p>
                              </div>
                              <div className="pl-1">
                                  <p className="font-bold text-slate-800 text-sm sm:text-base kanit-text">{selectedTxn.patientName || 'ลูกค้าทั่วไป (ไม่ระบุ)'}</p>
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
                                          {selectedTxn.method === 'cash' ? <><Banknote size={12}/> เงินสด</> : selectedTxn.method === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : selectedTxn.method === 'credit_card' || selectedTxn.method === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : <><Package size={12}/> อื่นๆ</>}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Items List */}
                      <h5 className="font-bold text-slate-700 kanit-text mb-3 flex items-center gap-2"><ShoppingCart size={16} className="text-sky-500" /> รายการสินค้า ({selectedTxn.items?.length || 1})</h5>
                      <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 w-full">
                          {/* Desktop Table */}
                          <div className="hidden sm:block overflow-x-auto w-full">
                              <table className="table-auto w-full text-left border-collapse min-w-[500px]">
                                  <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium kanit-text sticky top-0"><th className="w-[16%] p-3 text-center">#</th><th className="w-[32%] p-3">รายการสินค้า / บริการ</th><th className="w-[16%] p-3 text-center ">จำนวน</th><th className="w-[19%] p-3 text-right ">ราคา/หน่วย</th><th className="w-[17%] p-3 text-right ">รวม (บาท)</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {(selectedTxn.items && selectedTxn.items.length > 0 ? selectedTxn.items : [{name: selectedTxn.category || 'รายการเดิม', quantity: 1, price: selectedTxn.amount, total: selectedTxn.amount}]).map((item, idx) => (
                                          <tr key={`txn-item-${idx}`} className="hover:bg-slate-50/50 transition-colors font-data text-sm">
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
                          <div className="sm:hidden flex flex-col divide-y divide-slate-50 bg-slate-50/30">
                              {(selectedTxn.items && selectedTxn.items.length > 0 ? selectedTxn.items : [{name: selectedTxn.category || 'รายการเดิม', quantity: 1, price: selectedTxn.amount, total: selectedTxn.amount}]).map((item, idx) => (
                                  <div key={`txn-mob-item-${idx}`} className="p-3 flex flex-col gap-1 bg-white">
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

                      {/* Note / Details for Manual */}
                      {selectedTxn.note && (
                          <div className="mb-6">
                              <h5 className="font-bold text-slate-700 kanit-text mb-2 flex items-center gap-2"><FileText size={16} className="text-slate-400" /> รายละเอียด / หมายเหตุ</h5>
                              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-600 kanit-text whitespace-pre-wrap">
                                  {selectedTxn.note}
                              </div>
                          </div>
                      )}

                      {/* Summary */}
                      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                          <div className="w-full sm:w-auto">
                              <div className="text-[10px] sm:text-xs text-slate-400 kanit-text mb-1 flex items-center gap-1.5"><FileText size={12}/> รหัสอ้างอิง: {selectedTxn.id}</div>
                              <div className="text-[10px] sm:text-xs text-slate-400 kanit-text mb-1 flex items-center gap-1.5"><MapPin size={12}/> สาขา: {selectedTxn.branchId === 'all' ? 'ทุกสาขา (ส่วนกลาง)' : branchesData.find(b => b.id === selectedTxn.branchId)?.name || selectedTxn.branchId}</div>
                          </div>
                          <div className="w-full sm:w-72 space-y-2 text-sm font-data">
                              <div className="flex justify-between text-slate-600"><span className="kanit-text">รวมเป็นเงิน</span><span className="font-semibold">{formatCurrency(selectedTxn.subtotal || selectedTxn.amount)}</span></div>
                              {selectedTxn.discountAmount > 0 && (
                                  <div className="flex justify-between text-rose-500"><span className="kanit-text">ส่วนลด {selectedTxn.discountType === 'percent' ? `(${selectedTxn.discountValue}%)` : ''}</span><span className="font-semibold">- {formatCurrency(selectedTxn.discountAmount)}</span></div>
                              )}
                              {selectedTxn.vatAmount > 0 && (
                                  <div className="flex justify-between text-slate-600"><span className="kanit-text">ภาษี ({selectedTxn.taxMode === 'include' ? 'รวม' : 'แยก'})</span><span className="font-semibold">{formatCurrency(selectedTxn.vatAmount)}</span></div>
                              )}
                              <div className="h-px bg-slate-200/60 my-2"></div>
                              <div className="flex justify-between items-end text-xl sm:text-2xl font-black text-sky-600 kanit-text">
                                  <span className="text-base sm:text-lg">ยอดสุทธิ</span>
                                  <span className="font-data tracking-tight">{formatCurrency(selectedTxn.grandTotal || selectedTxn.amount)}</span>
                              </div>
                          </div>
                      </div>
                 </div>
              )}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-3 shrink-0">
                 <div className="w-full sm:w-auto">
                     <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintReceipt(selectedTxn, 'A4'); }} className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm kanit-text flex items-center justify-center gap-2">
                        <Printer size={18} /> <span className="hidden sm:inline">พิมพ์ใบเสร็จ</span>
                     </button>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                     <button type="button" onClick={closeDetailModal} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm kanit-text">ปิดหน้าต่าง</button>
                     <button type="button" onClick={(e) => { 
                         e.preventDefault();
                         e.stopPropagation();
                         const txToEdit = selectedTxn; // ล็อกข้อมูลบิลนี้เอาไว้ก่อน
                         closeDetailModal(); // สั่งปิดหน้าต่างนี้
                         // หน่วงเวลา 350ms ให้หน้าต่างเก่าปิดสนิท แล้วค่อยเปิดฟอร์มแก้ไข
                         setTimeout(() => handleEditTransaction(txToEdit), 350); 
                     }} className="flex-[1.5] sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-md shadow-sky-500/20 kanit-text flex items-center justify-center gap-2">
                        <Pencil size={18} /> <span className="hidden sm:inline">แก้ไขข้อมูล</span>
                     </button>
                 </div>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* Add Manual Transaction Modal */}
      {isModalOpen && createPortal(
         <div className={`fixed inset-0 z-[100] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm ${isModalClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
            <div className={`bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                 <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${formData.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                       {formData.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 kanit-text">{formData.id ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h3>
                       <p className="text-xs text-slate-500 font-data uppercase tracking-wider">Manual Transaction</p>
                    </div>
                 </div>
                 <button type="button" onClick={closeManualModal} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                 <form id="finance-form" onSubmit={handleSaveTransaction} className="space-y-4">

                    {/* ข้อมูลพื้นฐาน */}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                       <div onClick={() => setFormData({...formData, type: 'income'})} className={`p-4 rounded-3xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formData.type === 'income' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}><TrendingUp size={20} /></div>
                          <span className={`font-bold kanit-text ${formData.type === 'income' ? 'text-emerald-700' : 'text-slate-500'}`}>รายรับ</span>
                       </div>
                       <div onClick={() => setFormData({...formData, type: 'expense'})} className={`p-4 rounded-3xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${formData.type === 'expense' ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-slate-100 text-slate-400'}`}><TrendingDown size={20} /></div>
                          <span className={`font-bold kanit-text ${formData.type === 'expense' ? 'text-rose-700' : 'text-slate-500'}`}>รายจ่าย</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">เลขที่รายการ</label>
                          <input type="text" value={formData.id || `${formData.type === 'income' ? 'INC' : 'EXP'}-รอการบันทึก`} disabled className="w-full px-4 py-3 rounded-2xl bg-slate-100 border border-slate-100 text-slate-500 text-sm font-data cursor-not-allowed transition-all" />
                       </div>
                       <div>
                          <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">วันที่ทำรายการ <span className="text-rose-500">*</span></label>
                          <div ref={dateWrapperRef} className="relative group">
                             <input required type="text" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 pr-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data transition-all" placeholder="DD/MM/YYYY HH:mm:ss" />
                             <button type="button" onClick={handleOpenCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"><CalendarIcon size={20} /></button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                             <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">สาขา <span className="text-rose-500">*</span></label>
                             <CustomSelect
                                 value={formData.branchId}
                                 onChange={(val) => setFormData({...formData, branchId: val})}
                                 options={[{value: 'all', label: 'ทุกสาขา (ส่วนกลาง)'}, ...(branchesData || []).map(b => ({value: b.id, label: b.name}))]}
                                 className="w-full"
                             />
                          </div>
                          <div>
                             <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">หมวดหมู่ <span className="text-rose-500">*</span></label>
                             <input required type="text" placeholder="เช่น ค่าเช่า, ค่าน้ำไฟ" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data transition-all" />
                          </div>
                       </div>

                       <div>
                          <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">ค้นหาลูกค้า/คนไข้ (HN, ชื่อ, เบอร์โทร)</label>
                          <div className="relative group">
                             <input
                                type="text"
                                value={patientSearchQuery}
                                onChange={(e) => searchPatients(e.target.value)}
                                onFocus={() => setShowPatientResults(true)}                                onBlur={() => setTimeout(() => setShowPatientResults(false), 200)}
                                placeholder="พิมพ์เพื่อค้นหาลูกค้า..."
                                className="w-full px-4 py-3 pl-11 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data transition-all"
                             />
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />

                             {showPatientResults && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[220] overflow-hidden modal-animate-in">
                                   <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                      {filteredPatients.map((p, pidx) => (
                                         <button
                                            key={p.id || `p-${pidx}`}
                                            type="button"
                                            onMouseDown={(e) => {
                                               e.preventDefault(); // Prevent onBlur from firing before click
                                               const hnStr = p.hn || p.id;
                                               const nameStr = `${p.firstName} ${p.lastName}`.trim();
                                               const combinedName = `${hnStr} - ${nameStr}`;
                                               setFormData({...formData, patientId: hnStr, patientName: combinedName});
                                               setPatientSearchQuery(combinedName);
                                               setShowPatientResults(false);
                                            }}
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
                                   </div>
                                </div>
                             )}
                          </div>
                          {formData.patientId && (
                             <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-[11px] font-bold w-fit shadow-sm animate-in fade-in zoom-in-95">
                                <div className="w-full max-w-[8px] h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="font-data">HN: {formData.patientId} | {formData.patientName}</span>
                                <button type="button" onClick={() => { setFormData({...formData, patientId: '', patientName: ''}); setPatientSearchQuery(''); }} className="ml-2 text-emerald-400 hover:text-rose-500 transition-colors"><X size={14} /></button>
                             </div>
                          )}
                       </div>
                    </div>                    {/* รายการสินค้า/บริการ */}
                    <div className="bg-slate-50/50 p-4 sm:p-5 rounded-3xl border border-slate-100 flex flex-col mt-4">
                       <div className="flex items-center justify-between mb-3">
                          <label className="block text-[11px] font-black text-slate-400 kanit-text uppercase tracking-widest">รายการสินค้าและบริการ <span className="text-rose-500">*</span></label>
                          <button
                             type="button"
                             onClick={handleAddItem}
                             className="text-xs font-bold text-sky-600 bg-sky-100 hover:bg-sky-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 kanit-text shadow-sm hover:shadow active:scale-95"
                          >
                             <Plus size={14} /> เพิ่มรายการ
                          </button>
                       </div>

                       <div className="space-y-3">
                          {(formData.items || []).map((item, idx) => {
                             const isVat = item.isVatable !== undefined ? item.isVatable : posProducts?.find(p => p.name === item.name)?.isVatable;
                             return (
                             <div key={idx} className="p-3 sm:p-4 bg-white border border-slate-100 rounded-3xl hover:border-sky-200 transition-all shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center relative group">
                                <div className="flex-1 w-full relative">
                                   <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 kanit-text uppercase tracking-widest flex items-center gap-1.5">
                                      รายละเอียด
                                      {isVat && <span className="text-[9px] px-1 py-0.5 bg-sky-50 text-sky-600 rounded font-bold border border-sky-200 tracking-tight leading-none">(V) คิดภาษี</span>}
                                   </label>
                                   <input
                                      type="text"
                                      required
                                      value={item.name}
                                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                      placeholder="ค้นหา หรือพิมพ์เอง"
                                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-transparent outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-data peer"
                                   />
                                   {/* Custom Dropdown */}
                                   <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[220] overflow-hidden hidden peer-focus:block hover:block modal-animate-in">
                                      <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                         {posProducts?.filter(p => !item.name || p.name.toLowerCase().includes(item.name.toLowerCase())).map(p => (
                                            <button
                                               key={p.id}
                                               type="button"
                                               onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  handleItemChange(idx, 'name', p.name);
                                                  handleItemChange(idx, 'price', p.price);
                                               }}
                                               className="w-full p-3 flex items-center justify-between hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                                            >
                                               <div className="font-bold text-slate-700 kanit-text text-sm truncate pr-2 flex items-center gap-1.5">
                                                  {p.name}
                                                  {p.isVatable && <span className="px-1.5 py-0.5 bg-sky-50 text-sky-600 text-[9px] rounded border border-sky-100 font-bold uppercase tracking-tighter shrink-0 leading-none">+VAT</span>}
                                               </div>
                                               <div className="text-xs font-black text-sky-500 font-data shrink-0">{formatCurrency(p.price)} ฿</div>
                                            </button>
                                         ))}
                                         {posProducts?.filter(p => !item.name || p.name.toLowerCase().includes(item.name.toLowerCase())).length === 0 && (
                                             <div className="p-4 text-center text-sm text-slate-400 kanit-text">
                                                 สามารถพิมพ์ชื่อรายการเองได้เลย
                                             </div>
                                         )}
                                      </div>
                                   </div>
                                </div>
                                <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                                   <div className="w-20">
                                      <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 kanit-text uppercase tracking-widest text-center">จำนวน</label>
                                      <input
                                         type="number"
                                         min="1"
                                         required
                                         value={item.quantity}
                                         onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                         className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-transparent outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-data text-center"
                                      />
                                   </div>
                                   <div className="w-24 text-right">
                                      <label className="block text-[10px] font-black text-slate-400 mb-1 mr-1 kanit-text uppercase tracking-widest">ราคา</label>
                                      <input
                                         type="number"
                                         min="0"
                                         step="0.01"
                                         required
                                         value={item.price}
                                         onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                                         className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-transparent outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-data text-right"
                                      />
                                   </div>
                                </div>
                                <div className="hidden sm:block min-w-[80px] text-right">
                                   <label className="block text-[10px] font-black text-slate-400 mb-1 mr-1 kanit-text uppercase tracking-widest">รวม</label>
                                   <div className="py-2.5 font-black text-slate-700 font-data text-lg">{formatCurrency(item.total)}฿</div>
                                </div>
                                {(formData.items || []).length > 1 && (
                                   <button
                                      type="button"
                                      onClick={() => handleRemoveItem(idx)}
                                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all absolute top-2 right-2 sm:static sm:mt-5"
                                   >
                                      <Trash2 size={18} />
                                   </button>
                                )}
                             </div>
                          )})}
                       </div>
                    </div>

                    {/* Section Bottom: Payment, Note, Summary */}
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 items-stretch">
                          {/* Left Column: Payment & Note */}
                          <div className="flex flex-col space-y-4">
                             <div>
                                <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">ช่องทางการชำระ <span className="text-rose-500">*</span></label>
                                <CustomSelect
                                    value={formData.method}
                                    onChange={(val) => setFormData({...formData, method: val})}
                                    options={[
                                        {value: 'cash', label: '💵 เงินสด'},
                                        {value: 'transfer', label: '📱 โอนเงินเข้าบัญชี'},
                                        {value: 'credit_card', label: '💳 บัตรเครดิต'},
                                        {value: 'other', label: '📋 อื่นๆ'}
                                    ]}
                                    className="w-full"
                                />
                             </div>
                             <div className="flex flex-col flex-1">
                                <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">หมายเหตุเพิ่มเติม</label>
                                <textarea placeholder="ใส่บันทึกเพิ่มเติมได้ที่นี่..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full min-h-[100px] h-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data resize-none transition-all flex-1"></textarea>
                             </div>
                          </div>

                          {/* Right Column: Summary */}
                          <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
                             {(() => {
                                // --- แก้ไข: การคำนวณแบบ Prorate (Vatable / Non-Vatable) สำหรับหน้าจอแก้ไขบิล Manual ---
                                const financeSubtotal = (formData.items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                                const financeDiscountAmount = formData.discountType === 'percent' ? (financeSubtotal * ((Number(formData.discount) || 0) / 100)) : (Number(formData.discount) || 0);
                                const financeAfterDiscount = Math.max(0, financeSubtotal - financeDiscountAmount);
                                
                                let totalVatable = 0;
                                (formData.items || []).forEach(item => {
                                     const isVat = item.isVatable !== undefined ? item.isVatable : (posProducts.find(p => p.name === item.name)?.isVatable || false);
                                     if (isVat) totalVatable += (Number(item.total) || 0);
                                });

                                const vatableRatio = financeSubtotal > 0 ? (totalVatable / financeSubtotal) : 0;
                                const vatableDiscount = financeDiscountAmount * vatableRatio;
                                const netVatable = Math.max(0, totalVatable - vatableDiscount);

                                let financeVatAmount = 0;
                                let financeGrandTotal = financeAfterDiscount;
                                
                                if (formData.taxMode === 'exclude') {
                                    financeVatAmount = netVatable * ((Number(formData.vatRate) || 7) / 100);
                                    financeGrandTotal = financeAfterDiscount + financeVatAmount;
                                } else if (formData.taxMode === 'include') {
                                    financeVatAmount = netVatable - (netVatable * 100 / (100 + (Number(formData.vatRate) || 7)));
                                    financeGrandTotal = financeAfterDiscount;
                                }

                                const grandTotalStr = formatCurrency(financeGrandTotal) + "฿";
                                const grandTotalLen = grandTotalStr.length;
                                const grandTotalTextClass = grandTotalLen > 15 ? 'text-lg sm:text-xl' : (grandTotalLen > 12 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl');

                                return (
                                   <div className="space-y-3 font-data text-sm flex-1 flex flex-col justify-end">
                                      <div className="flex justify-between items-center text-slate-700">
                                         <span className="kanit-text font-medium">รวมเป็นเงิน</span>
                                         <span className="font-bold">{formatCurrency(financeSubtotal)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                         <span className="kanit-text font-medium text-slate-700 flex items-center gap-1">
                                            ส่วนลด
                                            {formData.discount > 0 && (
                                               <span className="text-rose-500 font-bold text-[10px] sm:text-xs">
                                                  {formData.discountType === 'percent' 
                                                     ? `(${formatCurrency(financeDiscountAmount)} ฿)` 
                                                     : `(${Number(((Number(formData.discount) || 0) * 100 / (financeSubtotal || 1)).toFixed(2))}%)`}
                                               </span>
                                            )}
                                         </span>                                         <div className="flex items-center gap-1">
                                            <input
                                               type="number"
                                               min="0"
                                               value={formData.discount || ''}
                                               onChange={(e) => setFormData({...formData, discount: Number(e.target.value)})}
                                               className="w-16 sm:w-20 px-2 py-1 text-right text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-400 transition-colors"
                                               placeholder="0.00"
                                            />
                                            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden h-[28px]">
                                               <button type="button" onClick={() => setFormData({...formData, discountType: 'amount'})} className={`px-2 text-xs font-bold transition-colors ${formData.discountType === 'amount' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>฿</button>
                                               <div className="w-px bg-slate-200"></div>
                                               <button type="button" onClick={() => setFormData({...formData, discountType: 'percent'})} className={`px-2 text-xs font-bold transition-colors ${formData.discountType === 'percent' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>%</button>
                                            </div>
                                         </div>
                                      </div>
                                      {financeDiscountAmount > 0 && (
                                          <div className="flex justify-between items-center text-rose-500 font-medium">
                                             <span className="kanit-text">ส่วนลดรวม</span>
                                             <span className="font-bold">- {formatCurrency(financeDiscountAmount)}</span>
                                          </div>
                                      )}

                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                                         <span className="kanit-text font-bold text-slate-800">การคิดภาษี</span>
                                         <div className="flex items-center gap-3 text-[10px] sm:text-xs kanit-text">
                                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                               <input type="radio" name="financeTaxMode" value="include" checked={formData.taxMode === 'include'} onChange={() => setFormData({...formData, taxMode: 'include'})} className="hidden" />
                                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${formData.taxMode === 'include' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                                                  {formData.taxMode === 'include' && <div className="w-2 h-2 bg-sky-500 rounded-full animate-in zoom-in-50 duration-200"></div>}
                                               </div>
                                               <span className={formData.taxMode === 'include' ? 'text-sky-600 font-bold' : 'text-slate-500 group-hover:text-slate-700'}>รวม VAT</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                               <input type="radio" name="financeTaxMode" value="exclude" checked={formData.taxMode === 'exclude'} onChange={() => setFormData({...formData, taxMode: 'exclude'})} className="hidden" />
                                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${formData.taxMode === 'exclude' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                                                  {formData.taxMode === 'exclude' && <div className="w-2 h-2 bg-sky-500 rounded-full animate-in zoom-in-50 duration-200"></div>}
                                               </div>
                                               <span className={formData.taxMode === 'exclude' ? 'text-sky-600 font-bold' : 'text-slate-500 group-hover:text-slate-700'}>แยก VAT</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                               <input type="radio" name="financeTaxMode" value="none" checked={formData.taxMode === 'none'} onChange={() => setFormData({...formData, taxMode: 'none', vatRate: 7})} className="hidden" />
                                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${formData.taxMode === 'none' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                                                  {formData.taxMode === 'none' && <div className="w-2 h-2 bg-sky-500 rounded-full animate-in zoom-in-50 duration-200"></div>}
                                               </div>
                                               <span className={formData.taxMode === 'none' ? 'text-sky-600 font-bold' : 'text-slate-500 group-hover:text-slate-700'}>ไม่มี VAT</span>
                                            </label>
                                         </div>
                                      </div>
                                      {formData.taxMode !== 'none' && (
                                         <div className="flex justify-between items-center text-slate-700 font-medium animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2">
                                               <span className="kanit-text">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                               <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                                  <input type="number" value={formData.vatRate || ''} onChange={(e) => setFormData({...formData, vatRate: Number(e.target.value)})} className="w-12 px-2 py-0.5 text-center text-xs font-bold text-sky-600 outline-none" />
                                                  <span className="px-2 text-xs font-bold text-slate-400 bg-slate-50 kanit-text border-l border-slate-200">%</span>
                                               </div>
                                            </div>
                                            <span className="font-bold">{formatCurrency(financeVatAmount)}</span>
                                         </div>
                                      )}

                                      <div className="mt-4 p-5 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-white shadow-lg shadow-sky-500/20 gap-2">
                                         <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                                               <Activity size={20} />
                                            </div>
                                            <span className="font-bold kanit-text shrink-0 text-sky-50">ยอดสุทธิ</span>
                                         </div>
                                         <span className={`font-black font-data text-right w-full sm:w-auto break-all leading-tight ${grandTotalTextClass}`}>
                                         {formatCurrency(financeGrandTotal)}฿
                                      </span>
                                   </div>
                                </div>
                             );
                          })()}
                       </div>
                    </div>
                 </form>
              </div>
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={closeManualModal} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm kanit-text">ยกเลิก</button>
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
        <div className={`fixed inset-0 z-[200] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm ${isPosEditClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closePosEditModal}></div>
          <div className={`relative z-[210] w-full max-w-4xl bg-white rounded-[2rem] border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isPosEditClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600 shadow-sm">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 kanit-text">แก้ไขรายการขาย (POS)</h3>
                  <p className="text-xs text-slate-500 font-data uppercase tracking-wider">{posEditForm.id}</p>
                </div>
              </div>
              <button onClick={closePosEditModal} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                   <div className="sm:col-span-4">
                      <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">เลขที่รายการ</label>
                      <input type="text" value={posEditForm.id} disabled className="w-full px-4 py-3 rounded-2xl bg-slate-100 border border-slate-100 text-slate-500 text-sm font-data cursor-not-allowed transition-all" />
                   </div>
                   <div className="sm:col-span-4">
                      <label className="block text-[11px] font-black text-amber-500 mb-1.5 ml-1 kanit-text uppercase tracking-widest flex items-center gap-1"><CalendarIcon size={12}/> วันที่ทำรายการ</label>
                      <div ref={posDateWrapperRef} className="relative group">
                         <input
                            type="text"
                            value={posEditForm.displayDate || ''}
                            onChange={e => setPosEditForm({...posEditForm, displayDate: e.target.value})}
                            className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-amber-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-data transition-all"
                            placeholder="DD/MM/YYYY HH:mm:ss"
                         />
                         <button type="button" onClick={handleOpenPosCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 hover:shadow-sm rounded-xl transition-all"><CalendarIcon size={18} /></button>
                      </div>
                   </div>
                   <div className="sm:col-span-4">
                      <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">สถานะบิล <span className="text-rose-500">*</span></label>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 border border-slate-100 h-[46px]">
                         <button type="button" onClick={() => setPosEditForm({...posEditForm, status: 'completed'})} className={`flex-1 py-1 rounded-xl text-xs font-bold kanit-text transition-all ${posEditForm.status === 'completed' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>สำเร็จ</button>
                         <button type="button" onClick={() => setPosEditForm({...posEditForm, status: 'cancelled'})} className={`flex-1 py-1 rounded-xl text-xs font-bold kanit-text transition-all ${posEditForm.status === 'cancelled' ? 'bg-white text-rose-500 shadow-sm border border-rose-100' : 'text-slate-400 hover:text-slate-600'}`}>ยกเลิก</button>
                      </div>
                   </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">ค้นหาลูกค้า/คนไข้ (HN, ชื่อ, เบอร์โทร)</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={patientSearchQuery} 
                      onChange={(e) => searchPatients(e.target.value)}
                      onFocus={() => setShowPatientResults(true)}                      
                      onBlur={() => setTimeout(() => setShowPatientResults(false), 200)}
                      placeholder="พิมพ์เพื่อค้นหาลูกค้า..."
                      className="w-full px-4 py-3 pl-11 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                    
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
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectPatient(p);
                              }}
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
                      <div className="w-full max-w-[8px] h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="font-data">HN: {posEditForm.patientId} | {posEditForm.patientName}</span>
                      <button type="button" onClick={() => { setPosEditForm({...posEditForm, patientId: '', patientName: ''}); setPatientSearchQuery(''); }} className="ml-2 text-emerald-400 hover:text-rose-500 transition-colors"><X size={14} /></button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/50 p-4 sm:p-5 rounded-3xl border border-slate-100 flex flex-col mt-4">
                   <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11px] font-black text-slate-400 kanit-text uppercase tracking-widest">รายการสินค้าและบริการ <span className="text-rose-500">*</span></label>
                      <button 
                        type="button"
                        onClick={handleAddPosItem}
                        className="text-xs font-bold text-sky-600 bg-sky-100 hover:bg-sky-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 kanit-text shadow-sm hover:shadow active:scale-95"
                      >
                        <Plus size={14} /> เพิ่มรายการ
                      </button>
                   </div>

                   <div className="space-y-3">
                      {posEditForm.items.map((item, idx) => {
                         const isVat = item.isVatable !== undefined ? item.isVatable : posProducts?.find(p => p.id === item.id || p.name === item.name)?.isVatable;
                         return (
                         <div key={idx} className="p-3 sm:p-4 bg-white border border-slate-100 rounded-3xl hover:border-sky-200 transition-all shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center relative group" style={{ zIndex: 50 - idx }}>
                            <div className="flex-1 w-full relative">
                               <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 kanit-text uppercase tracking-widest flex items-center gap-1.5">
                                  รายละเอียด
                                  {isVat && <span className="text-[9px] px-1 py-0.5 bg-sky-50 text-sky-600 rounded font-bold border border-sky-200 tracking-tight leading-none">(V) คิดภาษี</span>}
                               </label>
                               <input
                                  type="text"
                                  required
                                  value={item.name}
                                  onChange={(e) => handlePosItemChange(idx, 'name', e.target.value)}
                                  placeholder="ค้นหา หรือพิมพ์เอง"
                                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-transparent outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-data peer"
                               />
                               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[220] overflow-hidden hidden peer-focus:block hover:block modal-animate-in">
                                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                     {posProducts?.filter(p => !item.name || p.name.toLowerCase().includes(item.name.toLowerCase())).map(p => (
                                        <button
                                           key={p.id}
                                           type="button"
                                           onMouseDown={(e) => {
                                              e.preventDefault();
                                              handlePosItemChange(idx, 'id', p.id);
                                           }}
                                           className="w-full p-3 flex items-center justify-between hover:bg-sky-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                                        >
                                           <div className="font-bold text-slate-700 kanit-text text-sm truncate pr-2 flex items-center gap-1.5">
                                              {p.name}
                                              {p.isVatable && <span className="px-1.5 py-0.5 bg-sky-50 text-sky-600 text-[9px] rounded border border-sky-100 font-bold uppercase tracking-tighter shrink-0 leading-none">+VAT</span>}
                                           </div>
                                           <div className="text-xs font-black text-sky-500 font-data shrink-0">{formatCurrency(p.price)} ฿</div>
                                        </button>
                                     ))}
                                     {posProducts?.filter(p => !item.name || p.name.toLowerCase().includes(item.name.toLowerCase())).length === 0 && (
                                         <div className="p-4 text-center text-sm text-slate-400 kanit-text">
                                             สามารถพิมพ์ชื่อรายการเองได้เลย
                                         </div>
                                     )}
                                  </div>
                               </div>
                            </div>
                            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                               <div className="w-20">
                                  <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 kanit-text uppercase tracking-widest text-center">จำนวน</label>
                                  <input 
                                  type="number" 
                                  min="1"
                                  value={item.quantity} 
                                  onChange={(e) => handlePosItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-transparent outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-data text-center"
                                  />
                               </div>
                               <div className="w-24 text-right">
                                  <label className="block text-[10px] font-black text-slate-400 mb-1 mr-1 kanit-text uppercase tracking-widest">ราคา</label>
                                  <input 
                                  type="number" 
                                  value={item.price} 
                                  onChange={(e) => handlePosItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-transparent outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm font-data text-right"
                                  />
                               </div>
                            </div>
                            <div className="hidden sm:block min-w-[80px] text-right">
                               <label className="block text-[10px] font-black text-slate-400 mb-1 mr-1 kanit-text uppercase tracking-widest">รวม</label>
                               <div className="py-2.5 font-black text-slate-700 font-data text-lg">{formatCurrency(item.total)}฿</div>
                            </div>
                            {(posEditForm.items || []).length > 1 && (
                               <button 
                                 type="button"
                                 onClick={() => handleRemovePosItem(idx)}
                                 className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all absolute top-2 right-2 sm:static sm:mt-5"
                               >
                                 <Trash2 size={18} />
                               </button>
                            )}
                         </div>
                      )})}
                      
                      {posEditForm.items.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-400 kanit-text text-sm flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                            <ShoppingCart size={32} className="opacity-20" />
                          </div>
                          ยังไม่มีรายการสินค้า กรุณาเพิ่มรายการ
                        </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 items-stretch">
                   <div className="flex flex-col space-y-4">
                       <div>
                          <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">ช่องทางการชำระ <span className="text-rose-500">*</span></label>
                          <CustomSelect 
                            value={posEditForm.paymentMethod} 
                            onChange={(val) => setPosEditForm({...posEditForm, paymentMethod: val})}
                            options={[
                                {value: 'cash', label: '💵 เงินสด'},
                                {value: 'transfer', label: '📱 โอนเงินเข้าบัญชี'},
                                {value: 'credit', label: '💳 บัตรเครดิต'},
                                {value: 'other', label: '📋 อื่นๆ'}
                            ]}
                            className="w-full"
                          />
                       </div>
                       <div className="flex flex-col flex-1">
                          <label className="block text-[11px] font-black text-slate-400 mb-1.5 ml-1 kanit-text uppercase tracking-widest">หมายเหตุเพิ่มเติม</label>
                          <textarea 
                            value={posEditForm.note || ''} 
                            onChange={(e) => setPosEditForm({...posEditForm, note: e.target.value})}
                            className="w-full min-h-[100px] h-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data resize-none transition-all flex-1"
                            placeholder="ใส่บันทึกเพิ่มเติมได้ที่นี่..."
                          />
                       </div>
                   </div>

                   <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
                       {(() => {
                          const financeSubtotal = (posEditForm.items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                          const financeDiscountAmount = posEditForm.discountType === 'percent' ? (financeSubtotal * ((Number(posEditForm.discountValue) || 0) / 100)) : (Number(posEditForm.discountValue) || 0);
                          const financeAfterDiscount = Math.max(0, financeSubtotal - financeDiscountAmount);
                          
                          let totalVatable = 0;
                          (posEditForm.items || []).forEach(item => {
                               const isVat = item.isVatable !== undefined ? item.isVatable : (posProducts.find(p => p.id === item.id || p.name === item.name)?.isVatable || false);
                               if (isVat) totalVatable += (Number(item.total) || 0);
                          });

                          const vatableRatio = financeSubtotal > 0 ? (totalVatable / financeSubtotal) : 0;
                          const vatableDiscount = financeDiscountAmount * vatableRatio;
                          const netVatable = Math.max(0, totalVatable - vatableDiscount);

                          let financeVatAmount = 0;
                          let financeGrandTotal = financeAfterDiscount;
                          if (posEditForm.taxMode === 'exclude') {
                              financeVatAmount = netVatable * ((Number(posEditForm.vatRate) || 7) / 100);
                              financeGrandTotal = financeAfterDiscount + financeVatAmount;
                          } else if (posEditForm.taxMode === 'include') {
                              financeVatAmount = netVatable - (netVatable * 100 / (100 + (Number(posEditForm.vatRate) || 7)));
                              financeGrandTotal = financeAfterDiscount;
                          }

                          const grandTotalStr = formatCurrency(financeGrandTotal) + "฿";
                          const grandTotalLen = grandTotalStr.length;
                          const grandTotalTextClass = grandTotalLen > 15 ? 'text-lg sm:text-xl' : (grandTotalLen > 12 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl');

                          return (
                             <div className="space-y-3 font-data text-sm flex-1 flex flex-col justify-end">
                                <div className="flex justify-between items-center text-slate-700">
                                   <span className="kanit-text font-medium">รวมเป็นเงิน</span>
                                   <span className="font-bold">{formatCurrency(financeSubtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                   <span className="kanit-text font-medium text-slate-700 flex items-center gap-1">
                                      ส่วนลด
                                      {posEditForm.discountValue > 0 && (
                                         <span className="text-rose-500 font-bold text-[10px] sm:text-xs">
                                            {posEditForm.discountType === 'percent' 
                                               ? `(${formatCurrency(financeDiscountAmount)} ฿)` 
                                               : `(${Number(((Number(posEditForm.discountValue) || 0) * 100 / (financeSubtotal || 1)).toFixed(2))}%)`}
                                         </span>
                                      )}
                                   </span>
                                   <div className="flex items-center gap-1">
                                      <input
                                         type="number"
                                         min="0"
                                         value={posEditForm.discountValue || ''}
                                         onChange={(e) => setPosEditForm({...posEditForm, discountValue: Number(e.target.value)})}
                                         className="w-16 sm:w-20 px-2 py-1 text-right text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-400 transition-colors"
                                         placeholder="0.00"
                                      />
                                      <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden h-[28px]">
                                         <button type="button" onClick={() => setPosEditForm({...posEditForm, discountType: 'amount'})} className={`px-2 text-xs font-bold transition-colors ${posEditForm.discountType === 'amount' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>฿</button>
                                         <div className="w-px bg-slate-200"></div>
                                         <button type="button" onClick={() => setPosEditForm({...posEditForm, discountType: 'percent'})} className={`px-2 text-xs font-bold transition-colors ${posEditForm.discountType === 'percent' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>%</button>
                                      </div>
                                   </div>
                                </div>
                                {financeDiscountAmount > 0 && (
                                    <div className="flex justify-between items-center text-rose-500 font-medium">
                                       <span className="kanit-text">ส่วนลดรวม</span>
                                       <span className="font-bold">- {formatCurrency(financeDiscountAmount)}</span>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                                   <span className="kanit-text font-bold text-slate-800">การคิดภาษี</span>
                                   <div className="flex items-center gap-3 text-[10px] sm:text-xs kanit-text">
                                      <label className="flex items-center gap-1.5 cursor-pointer group">
                                         <input type="radio" name="posTaxMode" value="include" checked={posEditForm.taxMode === 'include'} onChange={() => setPosEditForm({...posEditForm, taxMode: 'include'})} className="hidden" />
                                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${posEditForm.taxMode === 'include' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                                            {posEditForm.taxMode === 'include' && <div className="w-2 h-2 bg-sky-500 rounded-full animate-in zoom-in-50 duration-200"></div>}
                                         </div>
                                         <span className={posEditForm.taxMode === 'include' ? 'text-sky-600 font-bold' : 'text-slate-500 group-hover:text-slate-700'}>รวม VAT</span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer group">
                                         <input type="radio" name="posTaxMode" value="exclude" checked={posEditForm.taxMode === 'exclude'} onChange={() => setPosEditForm({...posEditForm, taxMode: 'exclude'})} className="hidden" />
                                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${posEditForm.taxMode === 'exclude' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                                            {posEditForm.taxMode === 'exclude' && <div className="w-2 h-2 bg-sky-500 rounded-full animate-in zoom-in-50 duration-200"></div>}
                                         </div>
                                         <span className={posEditForm.taxMode === 'exclude' ? 'text-sky-600 font-bold' : 'text-slate-500 group-hover:text-slate-700'}>แยก VAT</span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer group">
                                         <input type="radio" name="posTaxMode" value="none" checked={posEditForm.taxMode === 'none'} onChange={() => setPosEditForm({...posEditForm, taxMode: 'none', vatRate: 7})} className="hidden" />
                                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${posEditForm.taxMode === 'none' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                                            {posEditForm.taxMode === 'none' && <div className="w-2 h-2 bg-sky-500 rounded-full animate-in zoom-in-50 duration-200"></div>}
                                         </div>
                                         <span className={posEditForm.taxMode === 'none' ? 'text-sky-600 font-bold' : 'text-slate-500 group-hover:text-slate-700'}>ไม่มี VAT</span>
                                      </label>
                                   </div>
                                </div>
                                {posEditForm.taxMode !== 'none' && (
                                   <div className="flex justify-between items-center text-slate-700 font-medium animate-in fade-in slide-in-from-top-2">
                                      <div className="flex items-center gap-2">
                                         <span className="kanit-text">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                         <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                            <input type="number" value={posEditForm.vatRate || ''} onChange={(e) => setPosEditForm({...posEditForm, vatRate: Number(e.target.value)})} className="w-12 px-2 py-0.5 text-center text-xs font-bold text-sky-600 outline-none" />
                                            <span className="px-2 text-xs font-bold text-slate-400 bg-slate-50 kanit-text border-l border-slate-200">%</span>
                                         </div>
                                      </div>
                                      <span className="font-bold">{formatCurrency(financeVatAmount)}</span>
                                   </div>
                                )}

                                <div className="mt-4 p-5 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-white shadow-lg shadow-sky-500/20 gap-2">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                                         <Activity size={20} />
                                      </div>
                                      <span className="font-bold kanit-text shrink-0 text-sky-50">ยอดสุทธิ</span>
                                   </div>
                                   <span className={`font-black font-data text-right w-full sm:w-auto break-all leading-tight ${grandTotalTextClass}`}>
                                      {formatCurrency(financeGrandTotal)}฿
                                   </span>
                                </div>
                             </div>
                          );
                       })()}
                   </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={closePosEditModal}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm kanit-text"
              >
                ยกเลิก
              </button>
              <button 
                type="button"
                onClick={handleSavePosEdit}
                disabled={isSavingPos || posEditForm.items.length === 0}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-500/20 kanit-text flex items-center gap-2"
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
        <div className={`fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${calendarModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={calendarModal.close}></div>
          <div
            ref={finCalSwipeProps.ref}
            style={finCalSwipeProps.style}
            className={`relative z-[230] w-full max-w-[420px] sm:max-w-[400px] bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-7 shadow-2xl ${calendarModal.isClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >            <div className="w-full pt-1 pb-4 -mt-2 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
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
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 h-8"></div>)}
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
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl text-base sm:text-sm font-data">{calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium kanit-text calendar-btn-anim ${calDate.getMonth() === i ? 'cal-selected' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            
            {calView === 'years' && (
                <div className="w-full calendar-view-anim">
                <div className="flex justify-between items-center mb-6 px-1">
                  <button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{yearPageStart} - {yearPageStart + 11}</span>
                  <button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium font-data calendar-btn-anim ${(calDate.getFullYear() + 543) === y ? 'cal-selected' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            {/* Time & Action Panel - ปรับเลย์เอาต์แนวนอนตามรูปภาพ (Mockup) */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between w-full gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0 w-full sm:w-auto justify-center">
                    <Clock size={16} className="text-sky-500 shrink-0" />
                    
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
                        value={calTime.s || '00'} 
                        onChange={v => setCalTime({...calTime, s: v})} 
                        options={Array.from({length:60}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                </div>
                
                <div className="flex gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setCalDate(now);
                          setCalTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0'), s: String(now.getSeconds()).padStart(2,'0')});
                          setCalView('days');
                    }} className="flex-1 sm:flex-none px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors kanit-text shadow-sm whitespace-nowrap">ปัจจุบัน</button>
                    <button type="button" onClick={() => {
                          const d = String(calDate.getDate()).padStart(2, '0');
                          const m = String(calDate.getMonth() + 1).padStart(2, '0');
                          const y = calDate.getFullYear() + 543;
                          const formattedDate = `${d}/${m}/${y} ${calTime.h}:${calTime.m}:${calTime.s || '00'}`;

                          if (calendarTarget === 'pos') {
                              setPosEditForm({...posEditForm, displayDate: formattedDate});
                          } else {
                              setFormData({...formData, date: formattedDate});
                          }
                          calendarModal.close();
                    }} className="flex-[2] sm:flex-none px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20 transition-colors kanit-text whitespace-nowrap">ตกลง</button>
                </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Sweet Alert --- */}
      

      {/* --- [NEW] Modal: Date Range Calendar สำหรับหน้าการเงิน --- */}
      {showFinRangeCalendar && createPortal(
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isFinRangeClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeFinRangeCalendar}></div>
          <div 
            ref={finRangeSwipeProps.ref} 
            style={finRangeSwipeProps.style}
            className={`relative z-[210] w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[1.5rem] border border-slate-100 shadow-2xl flex flex-col ${isFinRangeClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-3 pb-3 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
              {finRangeCalView === 'days' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <button type="button" onClick={() => setFinRangeCalDate(new Date(finRangeCalDate.getFullYear(), finRangeCalDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setFinRangeCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[finRangeCalDate.getMonth()]} {finRangeCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={() => setFinRangeCalDate(new Date(finRangeCalDate.getFullYear(), finRangeCalDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>

                  <div className="mb-4 bg-sky-50 p-3 rounded-xl border border-sky-100 flex items-center justify-between">
                      <div className="flex flex-col">
                          <span className="text-[10px] text-sky-600 font-bold kanit-text uppercase">เริ่มต้น</span>
                          <span className="text-sm font-black text-sky-800 font-data">{tempStartDate ? formatRangeStr(tempStartDate) : '-'}</span>
                      </div>
                      <div className="text-sky-300"><ChevronRight size={16} /></div>
                      <div className="flex flex-col text-right">
                          <span className="text-[10px] text-sky-600 font-bold kanit-text uppercase">สิ้นสุด</span>
                          <span className="text-sm font-black text-sky-800 font-data">{tempEndDate ? formatRangeStr(tempEndDate) : '-'}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center mb-2">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
                    {blankFinRangeDays.map(b => <div key={`blank-${b}`} className="w-full aspect-square"></div>)}
                    {monthFinRangeDays.map(day => {
                      const selectedDate = new Date(finRangeCalDate.getFullYear(), finRangeCalDate.getMonth(), day);
                      selectedDate.setHours(0,0,0,0);
                      
                      const hasBothDates = tempStartDate && tempEndDate;
                      const isSelectedStart = tempStartDate && selectedDate.getTime() === tempStartDate.getTime();
                      const isSelectedEnd = tempEndDate && selectedDate.getTime() === tempEndDate.getTime();
                      const isInRange = hasBothDates && selectedDate > tempStartDate && selectedDate < tempEndDate;
                      const isToday = new Date().setHours(0,0,0,0) === selectedDate.getTime();

                      return (
                        <div key={day} className="w-full flex items-center justify-center relative my-0.5">
                            {hasBothDates && isSelectedStart && tempStartDate.getTime() !== tempEndDate.getTime() && (
                                <div className="absolute right-0 w-1/2 h-10 sm:h-8 bg-sky-100 my-auto"></div>
                            )}
                            {hasBothDates && isSelectedEnd && tempStartDate.getTime() !== tempEndDate.getTime() && (
                                <div className="absolute left-0 w-1/2 h-10 sm:h-8 bg-sky-100 my-auto"></div>
                            )}
                            {isInRange && (
                                <div className="absolute w-full h-10 sm:h-8 bg-sky-100 my-auto"></div>
                            )}
                            
                            <button 
                                type="button" 
                                onClick={() => handleSelectFinRangeDate(day)} 
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

              {finRangeCalView === 'months' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setFinRangeCalDate(new Date(finRangeCalDate.getFullYear() - 1, finRangeCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setFinRangeCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{finRangeCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={() => setFinRangeCalDate(new Date(finRangeCalDate.getFullYear() + 1, finRangeCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setFinRangeCalDate(new Date(finRangeCalDate.getFullYear(), i, 1)); setFinRangeCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${finRangeCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                  </div>
                </>
              )}

              {finRangeCalView === 'years' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setFinRangeYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{finRangeYearPageStart} - {finRangeYearPageStart + 11}</span>
                    <button type="button" onClick={() => setFinRangeYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({length: 12}, (_, i) => finRangeYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setFinRangeCalDate(new Date(y - 543, finRangeCalDate.getMonth(), 1)); setFinRangeCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(finRangeCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 w-full rounded-b-[1.5rem]">
                <button type="button" onClick={closeFinRangeCalendar} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text transition-colors shadow-sm text-sm">
                    ยกเลิก
                </button>
                <button type="button" onClick={confirmFinRange} className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-md shadow-sky-500/20 kanit-text transition-colors text-sm">
                    ยืนยันช่วงเวลา
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default FinancePage;

