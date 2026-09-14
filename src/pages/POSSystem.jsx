import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Skeleton from './Skeleton';
import CustomSelect from './CustomSelect';
import CatalogManager from './CatalogManager';
import CalendarDay from './CalendarDay';
import { POS_ICONS } from '../global/constants';
import { supabase } from '../lib/supabase';
import { rAFThrottle, parseBool, formatDate, formatDateTime, formatStatNumber, getDynamicTextSize, parsePatientName, getPatientFullName, generateNextHN, generateNextReceiptId, getAgeString, getPatientId, useModal, useSwipeDown, getPatientLastVisitStr, formatCurPrint, bahtTextPrint, globalGenerateInformedConsentHtml, globalGenerateRecordHtml, globalGenerateOpdHtml, globalGenerateMedicalCertificateHtml, globalGenerateReceiptHtml, getEffectiveApptStatus, getEffectiveApptDatetimeStr, getEffectiveApptIsoDate, parseThaiDateToISO, parseAnyDate, isSameDay, formatFinTime, formatFinCurrency, getFinDynamicTextClass, syncCourseSessionsOnStatusChange } from '../global/helpers';
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
import { dispatchClinicNotification, calculateDailySalesSummary } from '../lib/notificationHub';

const POSSystem = ({ 
    products = [], setProducts, 
    patientsData = [], setPatientsData, 
    patientCoursesData = [], setPatientCoursesData,
    posHistoryData = [], setPosHistoryData, 
    inventoryData = [], setInventoryData,
    setInventoryLogsData,
    staffData = [],
    currentBranch,
    branchesData = [],
    showToast, callAppScript, isGlobalLoading, showGlobalAlert, globalAlert,
    showMobileBars,
    handlePrintReceipt,
    currentUser,
    integrationTokens = {},
    fetchPatientTreatments,
    fetchPatientsPaginated
}) => {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isFetchingOpd, setIsFetchingOpd] = useState(false);
  const [discount, setDiscount] = useState(0);
  
  // State สำหรับเลือกแพทย์ผู้ตรวจและผู้แนะนำ/ผู้ขาย (Dual Commission)
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [doctorIsSeller, setDoctorIsSeller] = useState(true);

  // รายชื่อแพทย์สำหรับเลือกใน POS
  const doctorsList = useMemo(() => {
    return (staffData || []).filter(s => s.role === 'doctor' || s.position?.includes('แพทย์') || s.role === 'admin');
  }, [staffData]);

  // ตั้งค่าแพทย์อัตโนมัติจาก OPD ของคนไข้ (หากเป็นการขายสินค้าทั่วไป สามารถเว้นว่างได้)
  useEffect(() => {
    if (selectedPatientId) {
      const patient = (patientsData || []).find(p => p && ((p.id && String(p.id) === String(selectedPatientId)) || (p.hn && String(p.hn) === String(selectedPatientId))));
      const opdList = Array.isArray(patient?.opdRecords) ? patient.opdRecords : [];
      const latestOpd = opdList[0];
      const docName = latestOpd?.doctor || patient?.doctor || '';
      if (docName) {
        const matchedDoc = (staffData || []).find(s => s.name === docName || s.name.includes(docName) || docName.includes(s.name));
        if (matchedDoc) {
          setSelectedDoctorId(matchedDoc.id);
          if (doctorIsSeller) setSelectedSellerId(matchedDoc.id);
          return;
        }
      }
    }
    // หากไม่มี OPD และในตะกร้าไม่มีบริการ/หัตถการ (ขายเฉพาะสินค้า/ครีม) ให้เว้นว่างแพทย์ได้
    const hasServiceInCart = cart.some(it => it.product?.category === 'บริการ' || it.product?.category === 'หัตถการ' || it.product?.type === 'service');
    if (!hasServiceInCart && !selectedPatientId) {
      // ปล่อยว่างแพทย์สำหรับการขายสินค้าหน้าร้านทั่วไป
      if (doctorIsSeller && !selectedDoctorId) {
        setDoctorIsSeller(false);
      }
    }
  }, [selectedPatientId, patientsData, staffData, cart, doctorIsSeller, selectedDoctorId]);
  
  // State สำหรับคอร์สแชร์ (Cross-Patient Shared Courses)
  const [isShareCourseModalOpen, setIsShareCourseModalOpen] = useState(false);
  const [shareOwnerSearch, setShareOwnerSearch] = useState('');
  const [selectedOwnerPatient, setSelectedOwnerPatient] = useState(null);
  const [visibleShareOwnerCount, setVisibleShareOwnerCount] = useState(15);
  const [visibleShareCourseCount, setVisibleShareCourseCount] = useState(10);

  // รีเซ็ตจำนวนรายการที่แสดงสำหรับ Infinite Scroll เมื่อเปิด Modal หรือค้นหา
  useEffect(() => {
    setVisibleShareOwnerCount(15);
  }, [shareOwnerSearch, isShareCourseModalOpen]);

  useEffect(() => {
    setVisibleShareCourseCount(10);
  }, [selectedOwnerPatient]);

  // ฟังก์ชันดึงชื่อ-นามสกุลคนไข้แบบสมบูรณ์และแม่นยำ (รองรับทั้ง first_name, firstName, name, prefix)
  const getDisplayPatientName = useCallback((p) => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    const fromHelper = getPatientFullName(p);
    if (fromHelper && fromHelper !== '-' && fromHelper !== p.prefix && fromHelper.trim() !== '') {
      return fromHelper;
    }
    const prefix = p.prefix || p.title || '';
    const fn = p.first_name || p.firstName || '';
    const ln = p.last_name || p.lastName || '';
    if (fn || ln) {
      return `${prefix}${fn} ${ln}`.trim();
    }
    if (p.name && p.name.trim() !== prefix.trim()) {
      return p.name.trim();
    }
    return prefix || p.id || p.hn || '';
  }, []);

  // รายชื่อคอร์สทั้งหมดที่ยังไม่หมดอายุและยังใช้ไม่หมด (ตัดคอร์สของคนไข้ปัจจุบันออก)
  const availableShareableCourses = useMemo(() => {
    const currentPid = String(selectedPatientId || '').trim().toLowerCase();
    const currentPidDigits = currentPid.replace(/\D/g, '');
    const now = Date.now();

    return (patientCoursesData || []).filter(c => {
      if (!c) return false;
      if (c.isDeleted || c.is_deleted) return false;
      if ((c.status || 'active') !== 'active') return false;

      // 1. เช็คจำนวนครั้งที่เหลือ: ต้องมากกว่า 0 (ไม่เอาคอร์สที่ใช้หมดแล้ว)
      const rem = Number(c.remainingSessions ?? c.remaining_sessions ?? 0);
      if (rem <= 0) return false;

      // 2. เช็ควันหมดอายุ: หากมีวันหมดอายุ ต้องยังไม่หมดอายุ (ไม่เอาคอร์สที่หมดอายุแล้ว)
      const expDate = c.expireDate || c.expire_date;
      if (expDate) {
        const expTime = new Date(expDate).setHours(23, 59, 59, 999);
        if (!isNaN(expTime) && expTime < now) {
          return false;
        }
      }

      // 3. ต้องไม่ใช่คนไข้ที่กำลังคิดเงินอยู่ปัจจุบัน
      const cPid = String(c.patientId || c.patient_id || '').trim().toLowerCase();
      const cPidDigits = cPid.replace(/\D/g, '');
      if (cPid === currentPid || (currentPidDigits && cPidDigits === currentPidDigits)) {
        return false;
      }

      return true;
    });
  }, [patientCoursesData, selectedPatientId]);

  // ดึงข้อมูลคนไข้เจ้าของคอร์สเพิ่มเติมจาก Supabase หากยังไม่มีใน patientsData
  useEffect(() => {
    if (!isShareCourseModalOpen || availableShareableCourses.length === 0) return;
    const missingIds = [];
    availableShareableCourses.forEach(c => {
      const pid = String(c.patientId || c.patient_id || '').trim();
      if (pid) {
        const exists = (patientsData || []).some(p => {
          const pId = String(p.id || p.hn || '').trim().toLowerCase();
          return pId === pid.toLowerCase() || (pid.replace(/\D/g, '') && pId.replace(/\D/g, '') === pid.replace(/\D/g, ''));
        });
        if (!exists && !missingIds.includes(pid)) {
          missingIds.push(pid);
        }
      }
    });

    if (missingIds.length > 0 && supabase) {
      supabase.from('patients')
        .select('*')
        .in('id', missingIds)
        .then(({ data, error }) => {
          if (!error && Array.isArray(data) && data.length > 0) {
            setPatientsData(prev => {
              const existingIds = new Set((prev || []).map(p => String(p.id || p.hn).toLowerCase()));
              const toAdd = data.filter(p => !existingIds.has(String(p.id).toLowerCase()));
              return [...prev, ...toAdd];
            });
          }
        })
        .catch(err => console.warn('[POS] Fetch missing course owners error:', err));
    }
  }, [isShareCourseModalOpen, availableShareableCourses, patientsData, setPatientsData]);

  // รวมรายชื่อเจ้าของคอร์สที่ไม่ซ้ำ เฉพาะผู้ที่มีคอร์สใช้ได้จริงเท่านั้น
  const eligibleShareOwners = useMemo(() => {
    const ownerMap = new Map();

    availableShareableCourses.forEach(course => {
      const pId = String(course.patientId || course.patient_id || '').trim();
      if (!pId) return;
      const normPid = pId.toLowerCase();

      if (!ownerMap.has(normPid)) {
        const pObj = (patientsData || []).find(p => {
          if (!p) return false;
          const pid = String(p.id || p.hn || '').trim().toLowerCase();
          return pid === normPid || (pId.replace(/\D/g, '') && pid.replace(/\D/g, '') === pId.replace(/\D/g, ''));
        });

        let fullName = '';
        if (pObj) {
          fullName = getDisplayPatientName(pObj);
        }
        if (!fullName || fullName === '-' || fullName === pObj?.prefix) {
          fullName = course.patientName || course.patient_name || pId;
        }

        ownerMap.set(normPid, {
          id: pObj?.id || pObj?.hn || pId,
          raw: pObj || { id: pId, name: fullName, first_name: fullName },
          fullName,
          nickname: pObj?.nickname || '',
          phone: pObj?.phone || (pObj?.phones && pObj.phones[0]) || '',
          courses: []
        });
      }

      ownerMap.get(normPid).courses.push(course);
    });

    return Array.from(ownerMap.values());
  }, [availableShareableCourses, patientsData, getDisplayPatientName]);

  // กรองรายชื่อเจ้าของคอร์สตามคำค้นหา (ค้นหาจาก HN, ชื่อ, นามสกุล, ชื่อเล่น, เบอร์โทร)
  const filteredShareOwners = useMemo(() => {
    const q = shareOwnerSearch.trim().toLowerCase();
    if (!q) return eligibleShareOwners;
    return eligibleShareOwners.filter(owner => {
      const idMatch = owner.id.toLowerCase().includes(q);
      const nameMatch = owner.fullName.toLowerCase().includes(q);
      const nickMatch = owner.nickname.toLowerCase().includes(q);
      const phoneMatch = owner.phone.toLowerCase().includes(q);
      return idMatch || nameMatch || nickMatch || phoneMatch;
    });
  }, [eligibleShareOwners, shareOwnerSearch]);
  
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
  const dailySummaryModal = useModal();
  const [dailySummaryData, setDailySummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // --- [NEW] Ref สำหรับควบคุม Scroll ใน Modal ชำระเงิน ---
  const checkoutScrollRef = useRef(null);

  useEffect(() => {
    if (paymentMethod === 'transfer' || checkoutSuccess) {
      setTimeout(() => {
        if (checkoutScrollRef.current) {
          checkoutScrollRef.current.scrollTo({
            top: checkoutScrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 150); // หน่วงเวลาเล็กน้อยเพื่อให้ DOM เรนเดอร์รูป QR หรือข้อความสำเร็จเสร็จก่อน
    }
  }, [paymentMethod, checkoutSuccess]);

  // --- เพิ่ม State สำหรับ Infinite Scroll ของประวัติการขาย ---
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(25);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [localHistoryData, setLocalHistoryData] = useState([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Fetch history when modal opens or visible count increases
  useEffect(() => {
    if (historyModal.isOpen) {
      const fetchHistory = async () => {
        setIsHistoryLoadingMore(true);
        try {
          const { data, error } = await supabase
            .from('pos_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(visibleHistoryCount);
          if (data && !error) {
            const mappedData = data.map(tx => ({
               ...tx,
               receiptNo: tx.receipt_no,
               patientName: tx.patient_name,
               branchId: tx.branch_id,
               branchName: tx.branch_name,
               totalAmount: tx.total_amount,
               netAmount: tx.net_amount,
               paymentMethod: tx.payment_method,
               staffName: tx.staff_name,
               createdAt: tx.created_at,
               updatedAt: tx.updated_at
            }));
            setLocalHistoryData(mappedData);
            setHasMoreHistory(data.length === visibleHistoryCount);
          }
        } catch (e) {
          console.error('Fetch history error:', e);
        }
        setIsHistoryLoadingMore(false);
      };
      fetchHistory();
    }
  }, [historyModal.isOpen, visibleHistoryCount]);

  // --- เพิ่ม State สำหรับดูและแก้ไขรายละเอียดบิล ---
  const [selectedHistoryTxn, setSelectedHistoryTxn] = useState(null);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyEditForm, setHistoryEditForm] = useState(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // --- เพิ่ม State ควบคุมการเปิดปิดตะกร้าบนมือถือ ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [activeCourseTooltip, setActiveCourseTooltip] = useState(null);
  const hoverTimerRef = useRef(null);
  const touchTimerRef = useRef(null);

  const calculateTooltipPosition = (target, courseInfo) => {
    try {
      if (!target || typeof target.getBoundingClientRect !== 'function') return null;
      const rect = target.getBoundingClientRect();
      if (!rect) return null;
      const midX = rect.left + rect.width / 2;
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
      const maxTooltipWidth = Math.min(200, screenWidth - 32);
      const halfWidth = maxTooltipWidth / 2;
      const clampedX = Math.max(halfWidth + 16, Math.min(screenWidth - halfWidth - 16, midX));
      const isNearTop = rect.top < 110;
      return {
        ...courseInfo,
        x: clampedX,
        y: isNearTop ? rect.bottom + 6 : rect.top - 6,
        placement: isNearTop ? 'bottom' : 'top'
      };
    } catch (err) {
      console.warn('[POS Tooltip] Error:', err);
      return null;
    }
  };

  const handleCourseMouseEnter = (e, courseInfo) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const target = e.currentTarget;
    hoverTimerRef.current = setTimeout(() => {
      const pos = calculateTooltipPosition(target, courseInfo);
      if (pos) setActiveCourseTooltip(pos);
    }, 1000); // หน่วงเวลา 1.0s ตอน hover
  };

  const handleCourseMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setActiveCourseTooltip(null);
  };

  const handleCourseTouchStart = (e, courseInfo) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    const target = e.currentTarget;
    touchTimerRef.current = setTimeout(() => {
      const pos = calculateTooltipPosition(target, courseInfo);
      if (pos) {
        setActiveCourseTooltip(pos);
        setTimeout(() => setActiveCourseTooltip(null), 3000);
      }
    }, 1000); // หน่วงเวลา 1.0s สำหรับการกดแตะค้างบนมือถือ
  };

  const handleCourseTouchEnd = () => {
    // หากแตะธรรมดาเพื่อเลือกคอร์ส หรือปล่อยนิ้วก่อน 2.5s ให้ยกเลิกการโชว์ Tooltip ทันที
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };


  // --- [NEW] State สำหรับระบบจับเวลา QR Code ---
  const [qrCountdown, setQrCountdown] = useState(300); // 300 วินาที = 5 นาที
  const [isQrExpired, setIsQrExpired] = useState(false);
  const [qrKey, setQrKey] = useState(Date.now()); // ไว้ใช้รีเฟรชรูป QR ใหม่

  // --- [NEW] ระบบจับเวลาถอยหลัง QR Code ---
  useEffect(() => {
    let timer;
    if (paymentMethod === 'transfer' && checkoutModal.isOpen && !checkoutSuccess && !isQrExpired) {
      timer = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentMethod, checkoutModal.isOpen, checkoutSuccess, isQrExpired]);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  // ------------------------------------------------

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
  const [isAlertClosing, setIsAlertClosing] = useState(false);

  const closeAlert = () => {
    setIsAlertClosing(true);
    setTimeout(() => {
        globalAlert.close();
        setIsAlertClosing(false);
    }, 300);
  };

  // --- ฟังก์ชันดึงประวัติการรักษา OPD ล่าสุดของคนไข้มาใส่ตะกร้า POS อัตโนมัติ ---
  const loadPatientOpdToCart = async (patientId, patientLabel) => {
    if (!patientId) {
      setSelectedPatientId('');
      setPatientSearchTerm('');
      setCart([]);
      showToast('ล้างตะกร้า เริ่มบิลสำหรับลูกค้าทั่วไป', 'info');
      return;
    }

    setIsFetchingOpd(true);
    let newCartItems = [];

    try {
      let fetchedTreatments = [];

      // 1. ดึงผ่านฟังก์ชัน fetchPatientTreatments (ถ้ามีส่งมาจาก App.jsx)
      if (typeof fetchPatientTreatments === 'function') {
        try {
          const res = await fetchPatientTreatments(patientId);
          if (Array.isArray(res) && res.length > 0) {
            fetchedTreatments = res;
          }
        } catch (err) {
          console.warn('[POS] fetchPatientTreatments warning:', err);
        }
      }

      // 2. ถ้ายังไม่ได้ข้อมูล ให้ดึงตรงจาก Supabase ตาราง treatments
      if (fetchedTreatments.length === 0 && supabase) {
        try {
          const pId = String(patientId).trim();
          const digitsOnly = pId.replace(/\D/g, '');
          let query = supabase
            .from('treatments')
            .select('*')
            .or('is_deleted.is.null,is_deleted.eq.false')
            .order('created_at', { ascending: false })
            .limit(10);

          if (pId.startsWith('HN69-')) {
            query = query.or(`patient_id.eq.${pId},patient_id.ilike.%${digitsOnly}`);
          } else if (digitsOnly) {
            query = query.or(`patient_id.eq.${pId},patient_id.ilike.%${digitsOnly}%`);
          } else {
            query = query.eq('patient_id', pId);
          }

          const { data: dbTrts, error: dbErr } = await query;
          if (!dbErr && Array.isArray(dbTrts) && dbTrts.length > 0) {
            fetchedTreatments = dbTrts;
          }
        } catch (err) {
          console.warn('[POS] Supabase treatments query warning:', err);
        }
      }

      // 3. Fallback ผ่าน callAppScript
      if (fetchedTreatments.length === 0 && typeof callAppScript === 'function') {
        try {
          const res = await callAppScript('GET_TREATMENTS_BY_PATIENT', 'Treatments', { patientId });
          if (res?.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
            fetchedTreatments = res.data;
          }
        } catch (err) {
          console.warn('[POS] callAppScript treatments warning:', err);
        }
      }

      // 4. Fallback จากแคชใน patientsData
      if (fetchedTreatments.length === 0) {
        const pNorm = String(patientId).trim().toLowerCase();
        const patient = (patientsData || []).find(p => p && ((p.id && String(p.id).trim().toLowerCase() === pNorm) || (p.hn && String(p.hn).trim().toLowerCase() === pNorm)));
        if (Array.isArray(patient?.opdRecords) && patient.opdRecords.length > 0) {
          fetchedTreatments = patient.opdRecords;
        }
      }

      if (fetchedTreatments.length > 0) {
        // เรียงลำดับเอาใบล่าสุด (index 0)
        const sortedTreatments = [...fetchedTreatments].sort((a, b) => {
          const dateA = new Date(a.created_at || a.datetime || a.date || 0).getTime();
          const dateB = new Date(b.created_at || b.datetime || b.date || 0).getTime();
          return dateB - dateA;
        });
        const latestOpd = sortedTreatments[0];

        // อัปเดตแคช opdRecords ใน patientsData เพื่อให้ส่วนอื่นๆ ในแอพใช้งานได้ทันที
        if (typeof setPatientsData === 'function') {
          setPatientsData(prev => (prev || []).map(p => {
            if (p && ((p.id && String(p.id).trim().toLowerCase() === String(patientId).trim().toLowerCase()) || (p.hn && String(p.hn).trim().toLowerCase() === String(patientId).trim().toLowerCase()))) {
              return { ...p, opdRecords: sortedTreatments };
            }
            return p;
          }));
        }

        // ตั้งค่าแพทย์อัตโนมัติจากใบตรวจล่าสุด
        const docName = String(latestOpd.doctor || latestOpd.doctorName || '').trim();
        if (docName) {
          const matchedDoc = (staffData || []).find(s => {
            if (!s || !s.name) return false;
            const sName = s.name.trim();
            return sName === docName || sName.includes(docName) || docName.includes(sName);
          });
          if (matchedDoc) {
            setSelectedDoctorId(matchedDoc.id);
            if (doctorIsSeller) setSelectedSellerId(matchedDoc.id);
          }
        }

        // ดึงรายการรักษาจาก prescription หรือ tx (เลือกใช้แหล่งเดียว ไม่ concat ทั้งสองฟิลด์ซ้ำซ้อน)
        let rawItems = [];
        if (latestOpd.prescription && (Array.isArray(latestOpd.prescription) ? latestOpd.prescription.length > 0 : Boolean(latestOpd.prescription))) {
          rawItems = Array.isArray(latestOpd.prescription) ? latestOpd.prescription : [latestOpd.prescription];
        } else if (latestOpd.tx && (Array.isArray(latestOpd.tx) ? latestOpd.tx.length > 0 : Boolean(latestOpd.tx))) {
          rawItems = Array.isArray(latestOpd.tx) ? latestOpd.tx : [latestOpd.tx];
        }

        const parseTreatmentItems = (raw) => {
          if (!raw) return [];
          if (Array.isArray(raw)) {
            return raw.flatMap(it => parseTreatmentItems(it));
          }
          if (typeof raw === 'object') {
            if (raw.name) return [String(raw.name).trim()];
            return [];
          }
          if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (!trimmed) return [];
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parseTreatmentItems(parsed);
              } catch (e) {}
            }
            if (trimmed.includes('\n') || trimmed.includes(',')) {
              return trimmed.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            }
            return [trimmed];
          }
          return [String(raw).trim()];
        };

        const treatmentNames = parseTreatmentItems(rawItems).filter(name => name && name.trim() !== '');
        const normalizeName = (s) => String(s || '').replace(/[\s\-_+()\/]/g, '').toLowerCase();

        treatmentNames.forEach((tName, idx) => {
          const cleanName = tName.trim();
          const normName = normalizeName(cleanName);

          // 1. นำมาเทียบกับ Catalog สินค้า POS
          let matchedProduct = (products || []).find(p => p && (p.name?.trim() === cleanName || p.id === cleanName));
          if (!matchedProduct) {
            matchedProduct = (products || []).find(p => p && normalizeName(p.name) === normName);
          }
          if (!matchedProduct) {
            matchedProduct = (products || []).find(p => {
              if (!p || !p.name) return false;
              const pNorm = normalizeName(p.name);
              return (pNorm.length >= 3 && (pNorm.includes(normName) || normName.includes(pNorm)));
            });
          }

          if (matchedProduct) {
            const existing = newCartItems.find(item => item && item.product && item.product.id === matchedProduct.id);
            if (existing) {
              existing.quantity += 1;
            } else {
              newCartItems.push({ product: matchedProduct, quantity: 1 });
            }
            return;
          }

          // 2. ถ้าไม่พบใน Products ให้หาใน คลังยา/เวชภัณฑ์ (inventoryData)
          const matchedInv = (inventoryData || []).find(inv => {
            if (!inv) return false;
            const invName = (inv.name || inv.medicineName || inv.itemName || '').trim();
            if (!invName) return false;
            return invName === cleanName || normalizeName(invName) === normName || (normName.length >= 3 && normalizeName(invName).includes(normName));
          });

          if (matchedInv) {
            const invId = matchedInv.id || `INV_${normName}`;
            const existing = newCartItems.find(item => item && item.product && item.product.id === invId);
            if (existing) {
              existing.quantity += 1;
            } else {
              newCartItems.push({
                product: {
                  id: invId,
                  name: matchedInv.name || matchedInv.medicineName || matchedInv.itemName,
                  price: Number(matchedInv.price || matchedInv.unitPrice || matchedInv.salePrice || latestOpd.cost || 0),
                  type: matchedInv.category || matchedInv.type || 'ยา/เวชภัณฑ์',
                  icon: 'Pill',
                  stockManaged: true,
                  stock: matchedInv.stock !== undefined ? matchedInv.stock : (matchedInv.quantity || 0)
                },
                quantity: 1
              });
            }
            return;
          }

          // 3. หากการรักษานั้นไม่ได้ถูกตั้งค่าไว้ใน POS ให้สร้างเป็นรายการชั่วคราวแจ้งเตือน
          const fallbackPrice = (treatmentNames.length === 1 && Number(latestOpd.cost) > 0) ? Number(latestOpd.cost) : 0;
          newCartItems.push({
            product: {
              id: `TEMP_TX_${Date.now()}_${idx}`,
              name: cleanName,
              price: fallbackPrice,
              type: 'รายการจากแพทย์ (OPD)',
              icon: 'Stethoscope',
              isTemp: true
            },
            quantity: 1
          });
        });

        // 4. กรณีที่ไม่มีชื่อหัตถการใน prescription แต่มี cost ใน OPD
        if (treatmentNames.length === 0 && Number(latestOpd.cost) > 0) {
          const itemTitle = latestOpd.treatment_detail?.trim() || latestOpd.diagnosis?.trim() || 'ค่าบริการทางการแพทย์ (OPD)';
          newCartItems.push({
            product: {
              id: `TEMP_TX_${Date.now()}_cost`,
              name: itemTitle,
              price: Number(latestOpd.cost),
              type: 'รายการจากแพทย์ (OPD)',
              icon: 'Stethoscope',
              isTemp: true
            },
            quantity: 1
          });
        }

        // 5. นำหมายเหตุ (Note) มาใส่ตะกร้าด้วยในฐานะข้อความแจ้งเตือน (ราคา 0 บาท)
        const noteText = (latestOpd.note || latestOpd.treatment_detail || '').trim();
        if (noteText && noteText !== '-' && noteText !== 'null') {
          newCartItems.push({
            product: {
              id: `NOTE_${Date.now()}`,
              name: `หมายเหตุแพทย์: ${noteText}`,
              price: 0,
              type: 'ข้อความแจ้งเตือน',
              icon: 'FileText',
              isNote: true
            },
            quantity: 1
          });
        }
      }
    } catch (err) {
      console.error('[POS] Error loading patient OPD:', err);
    } finally {
      setIsFetchingOpd(false);
    }

    setCart(newCartItems);

    if (patientId && newCartItems.length > 0) {
      const itemNames = newCartItems.filter(it => !it.product?.isNote).map(it => it.product?.name).filter(Boolean);
      if (itemNames.length > 0) {
        showToast(`ดึงรายการรักษา (${itemNames.join(', ')}) ลงตะกร้าแล้ว`, 'success');
      } else {
        showToast('ดึงรายการรักษาล่าสุดจาก OPD ลงตะกร้าแล้ว', 'success');
      }
    } else if (patientId) {
      showToast('ไม่พบประวัติการรักษาล่าสุดใน OPD สำหรับคนไข้นี้ (เริ่มบิลว่าง)', 'info');
    }
  };

  // --- ฟังก์ชันเมื่อเลือกคนไข้ ให้ดึงประวัติล่าสุดมาใส่ตะกร้า ---
  const handleSelectPatient = (patientId, patientLabel) => {
    setSelectedPatientId(patientId);
    setPatientSearchTerm(patientLabel);
    setIsPatientDropdownOpen(false);
    loadPatientOpdToCart(patientId, patientLabel);
  };

  // ดึงรายการหมวดหมู่ที่มีทั้งหมดจากข้อมูล Products
  const categories = Array.from(new Set(['ทั้งหมด', ...products.map(p => p.category || p.type || 'ไม่ระบุหมวดหมู่').filter(Boolean)]));

  // กรองสินค้าตามคำค้นหาและหมวดหมู่
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p) return false;
      const matchSearch = (p.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || (p.id || '').toLowerCase().includes((searchQuery || '').toLowerCase());
      const catVal = p.category || p.type || 'ไม่ระบุหมวดหมู่';
      const matchCategory = activeCategory === 'ทั้งหมด' || catVal === activeCategory || p.type === activeCategory || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, activeCategory]);

  // ฟังก์ชันตรวจสอบว่ารายการนี้ต้องคุมสต็อกสินค้าหรือไม่
  const isStockManaged = useCallback((prod) => {
    if (!prod) return false;
    if (prod.isRedeem || prod.isNote || prod.isCourse) return false;
    const cat = String(prod.category || prod.type || '').trim();
    if (cat === 'บริการ' || cat === 'หัตถการ' || prod.type === 'service') return false;
    return Boolean(
      parseBool(prod.stockManaged) || 
      parseBool(prod.stock_managed) || 
      prod.itemKind === 'stock' || 
      prod.kind === 'stock' || 
      (typeof prod.id === 'string' && prod.id.toLowerCase().startsWith('prod'))
    );
  }, []);

  // ฟังก์ชันคำนวณสต็อกคงเหลือจริงแบบเรียลไทม์ตามสาขาปัจจุบัน
  const getProductStock = useCallback((productOrId, branch = currentBranch) => {
    if (!productOrId) return 0;
    const productId = typeof productOrId === 'object' ? productOrId.id : productOrId;
    const productObj = typeof productOrId === 'object' ? productOrId : products.find(p => p && p.id === productId);

    if (!productObj || !isStockManaged(productObj)) {
      return Infinity; // บริการ/หัตถการ/คอร์ส ไม่จำกัดสต็อก
    }

    const cleanTarget = String(productId || '').replace(/^INV_/, '').trim().toLowerCase();
    const cleanName = String(productObj?.name || '').trim().toLowerCase();
    const targetBranch = branch === 'all' ? null : branch;

    const matchedStocks = (inventoryData || []).filter(inv => {
      if (!inv || inv.isDeleted || inv.is_deleted) return false;

      const cleanId = String(inv.id || '').replace(/^INV_/, '').trim().toLowerCase();
      const cleanPId = String(inv.productId || inv.product_id || '').replace(/^INV_/, '').trim().toLowerCase();
      const cleanCode = String(inv.code || '').replace(/^INV_/, '').trim().toLowerCase();
      const invName = String(inv.name || inv.itemName || inv.productName || '').trim().toLowerCase();

      const isMatch = cleanId === cleanTarget || 
                      cleanPId === cleanTarget || 
                      cleanCode === cleanTarget ||
                      (cleanName && invName && cleanName === invName);
      if (!isMatch) return false;

      if (targetBranch) {
        const bId = inv.branchId || inv.branch_id;
        if (bId === targetBranch) return true;
        // กรณีไม่มีการระบุ branchId (เช่น ข้อมูลเริ่มต้น) ให้ถือเป็นสาขาหลัก (b1)
        if (!bId && (targetBranch === 'b1' || branchesData.length <= 1)) return true;
        return false;
      }
      return true;
    });

    const total = matchedStocks.reduce((sum, s) => {
      const qty = Number(s.quantity ?? s.stockQuantity ?? s.stock_quantity ?? 0);
      return sum + (isNaN(qty) ? 0 : Math.max(0, qty));
    }, 0);

    return total;
  }, [inventoryData, currentBranch, products, isStockManaged, branchesData]);

  // ฟังก์ชันจัดการตะกร้า (จำกัดจำนวนไม่ให้เกินสต็อกคงเหลือจริงของสาขา)
  const addToCart = (product) => {
    if (isStockManaged(product)) {
      const availableStock = getProductStock(product);
      if (availableStock <= 0) {
        showToast(`⚠️ "${product.name}" สินค้าหมด (0 ชิ้น)`, 'warning');
        return;
      }
      const existing = cart.find(item => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= availableStock) {
        showToast(`⚠️ "${product.name}" ครบตามสต็อกแล้ว (${availableStock} ${product.unit || 'ชิ้น'})`, 'warning');
        return;
      }
    }

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
        const curQty = Number(item.quantity) || 1;
        if (delta > 0 && isStockManaged(item.product)) {
          const availableStock = getProductStock(item.product);
          if (curQty + delta > availableStock) {
            showToast(`⚠️ "${item.product.name}" สูงสุดตามสต็อกแล้ว (${availableStock} ${item.product.unit || 'ชิ้น'})`, 'warning');
            return item;
          }
        }
        const newQuantity = Math.max(0, curQty + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => (Number(item.quantity) || 0) > 0));
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

  // --- คำนวณยอดเงินและภาษีแบบละเอียด (แยก Vatable / Non-Vatable) ---
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * (Number(item.quantity) || 0)), 0);
  const discountAmount = discountType === 'percent' ? (subtotal * (discount / 100)) : Number(discount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  let totalVatable = 0;
  let totalNonVatable = 0;
  cart.forEach(item => {
      const itemTotal = item.product.price * (Number(item.quantity) || 0);
      if (item.product.isVatable) {
          totalVatable += itemTotal;
      } else {
          totalNonVatable += itemTotal;
      }
  });

  const vatableRatio = subtotal > 0 ? (totalVatable / subtotal) : 0;
  const vatableDiscount = discountAmount * vatableRatio;
  const netVatable = Math.max(0, totalVatable - vatableDiscount);

  let vatAmount = 0;
  let priceExcludingVat = afterDiscount;
  let grandTotal = afterDiscount;

  if (taxMode === 'exclude') {
    // แยก VAT (บวกเพิ่มจากยอด Vatable หลังหักส่วนลด)
    vatAmount = netVatable * (vatRate / 100);
    grandTotal = afterDiscount + vatAmount;
    priceExcludingVat = afterDiscount;
  } else if (taxMode === 'include') {
    // รวม VAT (ถอด VAT ออกจากยอด Vatable)
    vatAmount = netVatable - (netVatable * 100 / (100 + vatRate));
    priceExcludingVat = afterDiscount - vatAmount;
    grandTotal = afterDiscount;
  }
  // --------------------------------------------------------

  // Format ค่าเงิน
  const formatCurrency = (amount) => {
    const num = Number(amount);
    const validNum = isNaN(num) ? 0 : num;
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(validNum);
  };

  // จัดการการชำระเงิน (ตรวจสอบสต็อกสินค้าก่อนเปิดหน้าต่างคิดเงิน)
  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('ตะกร้าสินค้าว่างเปล่า', 'warning');
      return;
    }

    // ตรวจสอบสต็อกคงเหลือจริงของทุกสินค้าในตะกร้า
    for (const item of cart) {
      if (isStockManaged(item.product)) {
        const available = getProductStock(item.product);
        if (available <= 0) {
          showToast(`⚠️ "${item.product.name}" สินค้าหมด (0 ชิ้น) กรุณาลบออก`, 'danger');
          return;
        }
        if (item.quantity > available) {
          showToast(`⚠️ "${item.product.name}" เกินสต็อก (${available} ${item.product.unit || 'ชิ้น'})`, 'warning');
          return;
        }
      }
    }

    checkoutModal.open();
    setCheckoutSuccess(false);
  };

  // แก้ไข: เปลี่ยนเป็นการทำงานแบบ Asynchronous และส่งข้อมูลไปบันทึกผ่าน API
  const confirmPayment = async () => {
    // ตรวจสอบสต็อกล่าสุดอีกครั้งก่อนบันทึกเงิน ป้องกันการขายสินค้าเกินพร้อมกันหลายอุปกรณ์
    for (const item of cart) {
      if (isStockManaged(item.product)) {
        const available = getProductStock(item.product);
        if (item.quantity > available) {
          showToast(`⚠️ "${item.product.name}" สต็อกไม่พอ (เหลือ ${available} ${item.product.unit || 'ชิ้น'})`, 'danger');
          return;
        }
      }
    }

    setIsProcessingPayment(true);
    
    // ดึงชื่อคนไข้จริงโดยตัด prefix HN ออก
    let cleanPatientName = '';
    if (selectedPatientId) {
        const patientObj = (patientsData || []).find(p => (p.id || p.hn) === selectedPatientId);
        if (patientObj) {
            cleanPatientName = patientObj.name || `${patientObj.prefix || ''}${patientObj.firstName || ''} ${patientObj.lastName || ''}`.trim();
        }
    }
    if (!cleanPatientName) {
        if (patientSearchTerm) {
            cleanPatientName = patientSearchTerm.includes(' - ') 
                ? patientSearchTerm.split(' - ').slice(1).join(' - ').trim() 
                : patientSearchTerm.trim();
        } else {
            cleanPatientName = 'ลูกค้าทั่วไป (ไม่ระบุ)';
        }
    }

    const purePatientName = selectedPatientId 
        ? cleanPatientName.replace(new RegExp(`^${selectedPatientId}\\s*[-•]?\\s*`, 'i'), '').trim()
        : cleanPatientName;

    const patientNameWithHN = (selectedPatientId && purePatientName && purePatientName !== 'ลูกค้าทั่วไป (ไม่ระบุ)')
        ? `${selectedPatientId} - ${purePatientName}`
        : purePatientName;

    // คำนวณค่า DF หัตถการ และค่าคอมมิชชั่นยอดขาย
    const doctorObj = (staffData || []).find(s => s.id === selectedDoctorId);
    const sellerObj = (staffData || []).find(s => s.id === (doctorIsSeller ? selectedDoctorId : selectedSellerId));

    let doctorCommission = 0;
    let sellerCommission = 0;

    let treatmentTotal = 0;
    let productSalesTotal = 0;

    cart.forEach(it => {
      const p = it.product;
      const isService = p.category === 'บริการ' || p.category === 'หัตถการ' || p.type === 'service';
      const itemTotal = Number(p.price || 0) * Number(it.quantity || 1);
      if (isService) {
        treatmentTotal += itemTotal;
      } else {
        productSalesTotal += itemTotal;
      }
    });

    // 1. คำนวณ DF ให้แพทย์ (จากยอดหัตถการ หรือยอดบิล โดยตรวจสอบเงื่อนไขเคสรายวัน)
    if (doctorObj) {
      const dfRate = Number(doctorObj.dfRate || doctorObj.df_rate || doctorObj.commissionRate || doctorObj.commission_rate || 0);
      const dfType = doctorObj.dfType || doctorObj.df_type || doctorObj.commissionType || doctorObj.commission_type || 'percent';
      const dfCondition = doctorObj.dfCondition || doctorObj.df_condition || 'all';
      const dfThreshold = Number(doctorObj.dfThreshold || doctorObj.df_threshold || 1);

      // นับจำนวนเคสของแพทย์ในวันนี้เพื่อตรวจเงื่อนไข Threshold
      const todayDocCases = (posHistoryData || []).filter(tx => 
        tx.status !== 'cancelled' && 
        (tx.doctorId === selectedDoctorId || tx.doctor_id === selectedDoctorId || tx.doctorName === doctorObj.name || tx.doctor_name === doctorObj.name) && 
        isSameDay(tx.createdAt || tx.date, new Date())
      ).length + 1; // +1 สำหรับบิลปัจจุบัน

      const isEligibleForDf = dfCondition !== 'threshold' || todayDocCases >= dfThreshold;

      if (dfRate > 0 && isEligibleForDf) {
        if (dfType === 'percent') {
          doctorCommission = Math.round(treatmentTotal > 0 ? (treatmentTotal * (dfRate / 100)) : (grandTotal * (dfRate / 100)));
        } else {
          doctorCommission = dfRate;
        }
      }
    }

    // 2. คำนวณค่าคอมมิชชั่นยอดขายให้ผู้แนะนำ/ผู้ขาย (จากยอดขายสินค้า/คอร์ส หรือยอดบิล)
    if (sellerObj) {
      const salesRate = Number(sellerObj.commissionRate || sellerObj.commission_rate || 0);
      const salesType = sellerObj.commissionType || sellerObj.commission_type || 'percent';
      const salesCondition = sellerObj.commissionCondition || sellerObj.commission_condition || 'all';
      const salesThreshold = Number(sellerObj.commissionThreshold || sellerObj.commission_threshold || 1);

      const effectiveSellerId = doctorIsSeller ? selectedDoctorId : selectedSellerId;
      const todaySellerSales = (posHistoryData || []).filter(tx => 
        tx.status !== 'cancelled' && 
        (tx.sellerId === effectiveSellerId || tx.seller_id === effectiveSellerId || tx.staffId === effectiveSellerId || tx.staff_id === effectiveSellerId || tx.staffName === sellerObj.name || tx.staff_name === sellerObj.name) && 
        isSameDay(tx.createdAt || tx.date, new Date())
      ).length + 1;

      const isEligibleForSales = salesCondition !== 'threshold' || todaySellerSales >= salesThreshold;

      if (salesRate > 0 && isEligibleForSales) {
        if (salesType === 'percent') {
          sellerCommission = Math.round(productSalesTotal > 0 ? (productSalesTotal * (salesRate / 100)) : (grandTotal * (salesRate / 100)));
        } else {
          sellerCommission = salesRate;
        }
      }
    }

    // สร้าง Payload ข้อมูลบิลเพื่อส่งไปบันทึกในฐานข้อมูล
    const isAnyRedeem = cart.some(item => !!item.product.isRedeem);
    const receiptId = await generateNextReceiptId(posHistoryData, supabase);
    const transactionData = {
        id: receiptId,
        receiptNo: receiptId,
        receipt_no: receiptId,
        patientId: selectedPatientId || '',
        hn: selectedPatientId || '',
        patientName: patientNameWithHN,
        patient_name: patientNameWithHN,
        note: patientNameWithHN,
        branchId: currentBranch === 'all' ? 'b1' : currentBranch, // บันทึกว่าขายที่สาขาไหน
        doctorId: selectedDoctorId || '',
        doctor_id: selectedDoctorId || '',
        doctorName: doctorObj?.name || '',
        doctor_name: doctorObj?.name || '',
        doctorCommission: doctorCommission,
        doctor_commission: doctorCommission,
        sellerId: doctorIsSeller ? (selectedDoctorId || '') : (selectedSellerId || ''),
        seller_id: doctorIsSeller ? (selectedDoctorId || '') : (selectedSellerId || ''),
        sellerName: sellerObj?.name || doctorObj?.name || '',
        seller_name: sellerObj?.name || doctorObj?.name || '',
        sellerCommission: sellerCommission,
        seller_commission: sellerCommission,
        staffId: doctorIsSeller ? (selectedDoctorId || '') : (selectedSellerId || ''),
        staff_id: doctorIsSeller ? (selectedDoctorId || '') : (selectedSellerId || ''),
        staffName: sellerObj?.name || doctorObj?.name || cleanPatientName,
        staff_name: sellerObj?.name || doctorObj?.name || cleanPatientName,
        staffCommission: sellerCommission,
        staff_commission: sellerCommission,
        transactionType: isAnyRedeem ? 'course_redeem' : 'sale',
        transaction_type: isAnyRedeem ? 'course_redeem' : 'sale',
        items: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            total: item.product.price * item.quantity,
            isVatable: !!item.product.isVatable,
            isRedeem: !!item.product.isRedeem,
            courseId: item.product.courseId || '',
            courseName: item.product.courseName || item.product.name,
            ownerPatientId: item.product.ownerPatientId || '',
            ownerPatientName: item.product.ownerPatientName || ''
        })),
        subtotal: subtotal,
        discountValue: discount,
        discountType: discountType,
        discountAmount: discountAmount,
        totalVatable: totalVatable,
        netVatable: netVatable,
        taxMode: taxMode,
        vatRate: vatRate,
        vatAmount: vatAmount,
        grandTotal: grandTotal,
        totalAmount: subtotal,
        netAmount: grandTotal,
        discount: discountAmount,
        paymentMethod: paymentMethod,
        status: 'completed',
        createdAt: new Date().toISOString()
    };

    try {
        // ส่งข้อมูลไปบันทึกลงชีตชื่อ 'POS_Transactions' (สำคัญสุด ให้ทำเป็นลำดับแรก)
        await callAppScript('SAVE_DATA', 'POS_Transactions', transactionData);
        
        // --- เริ่มปรับปรุง: รวบรวม API Calls สำหรับสต็อกและคอร์สไว้ยิงพร้อมกัน (Promise.all) ---
        const backgroundTasks = [];
        
        // --- ระบบตัดสต็อกอัตโนมัติ (Automatic Stock Deduction - Atomic RPC / Client FEFO Fallback) ---
        const targetBranch = currentBranch === 'all' ? 'b1' : currentBranch;
        let localInvData = [...inventoryData];
        let localLogs = [];
        let rpcDeductedSuccess = false;
        const stockItemsInCart = cart.filter(item => isStockManaged(item.product));

        if (stockItemsInCart.length > 0 && supabase) {
            try {
                const rpcPayload = stockItemsInCart.map(i => ({
                    product: { id: i.product.id, name: i.product.name },
                    quantity: i.quantity
                }));
                const { data: rpcRes, error: rpcErr } = await supabase.rpc('deduct_pos_stock', {
                    p_items: rpcPayload,
                    p_branch_id: targetBranch,
                    p_receipt_id: receiptId
                });

                if (!rpcErr && rpcRes && rpcRes.status === 'success') {
                    rpcDeductedSuccess = true;
                    // อัปเดตสต็อกคงเหลือใน Local State ทันทีตามผลลัพธ์จาก RPC
                    if (Array.isArray(rpcRes.deductions)) {
                        rpcRes.deductions.forEach(d => {
                            const sIdx = localInvData.findIndex(s => s.id === d.stock_id);
                            if (sIdx !== -1) {
                                localInvData[sIdx] = {
                                    ...localInvData[sIdx],
                                    quantity: Number(d.new_quantity),
                                    stockQuantity: Number(d.new_quantity),
                                    stock_quantity: Number(d.new_quantity)
                                };
                            }
                        });
                    }
                }
            } catch (rpcEx) {
                console.warn('[POS] deduct_pos_stock RPC failed, falling back to client deduction:', rpcEx);
            }
        }

        // Client-side Fallback (ทำงานเมื่อ RPC ไม่สำเร็จ หรือยังไม่ได้รัน SQL ฟังก์ชัน)
        if (!rpcDeductedSuccess) {
            for (const item of cart) {
                if (isStockManaged(item.product)) {
                    const cleanTarget = String(item.product.id).replace(/^INV_/, '').trim().toLowerCase();
                    const cleanTargetName = String(item.product.name || '').trim().toLowerCase();

                    // ดึงรายการสต็อกทั้งหมดของสินค้านี้ในสาขานี้ และเรียงลำดับตามวันหมดอายุ (FEFO)
                    const productStocks = localInvData
                        .filter(inv => {
                            if (!inv || inv.isDeleted || inv.is_deleted) return false;
                            const cleanId = String(inv.id || '').replace(/^INV_/, '').trim().toLowerCase();
                            const cleanPId = String(inv.productId || inv.product_id || '').replace(/^INV_/, '').trim().toLowerCase();
                            const cleanCode = String(inv.code || '').replace(/^INV_/, '').trim().toLowerCase();
                            const invName = String(inv.name || inv.itemName || inv.productName || '').trim().toLowerCase();

                            const isMatch = cleanId === cleanTarget || 
                                            cleanPId === cleanTarget || 
                                            cleanCode === cleanTarget ||
                                            (cleanTargetName && invName && cleanTargetName === invName);
                            if (!isMatch) return false;

                            const bId = inv.branchId || inv.branch_id;
                            if (targetBranch) {
                                if (bId === targetBranch) return true;
                                if (!bId && (targetBranch === 'b1' || branchesData.length <= 1)) return true;
                                return false;
                            }
                            return true;
                        })
                        .sort((a, b) => {
                            const aDate = a.expireDate || a.expire_date;
                            const bDate = b.expireDate || b.expire_date;
                            if (!aDate) return 1;
                            if (!bDate) return -1;
                            const parseDate = (d) => {
                                if (typeof d === 'string' && d.includes('/')) {
                                    const parts = d.split('/').map(Number);
                                    const yr = parts[2] > 2400 ? parts[2] - 543 : parts[2];
                                    return new Date(yr, parts[1] - 1, parts[0]);
                                }
                                return new Date(d);
                            };
                            return parseDate(aDate) - parseDate(bDate);
                        });

                    let remainingToDeduct = item.quantity;

                    for (const stockItem of productStocks) {
                        if (remainingToDeduct <= 0) break;

                        const currentStockQty = Number(stockItem.quantity ?? stockItem.stockQuantity ?? stockItem.stock_quantity ?? 0);
                        const deductAmount = Math.min(currentStockQty, remainingToDeduct);
                        if (deductAmount <= 0) continue;

                        const newQty = currentStockQty - deductAmount;
                        remainingToDeduct -= deductAmount;

                        const updatedStock = { 
                            ...stockItem, 
                            quantity: newQty,
                            stockQuantity: newQty,
                            stock_quantity: newQty,
                            branchId: stockItem.branchId || stockItem.branch_id || targetBranch,
                            branch_id: stockItem.branchId || stockItem.branch_id || targetBranch
                        };
                        
                        // เพิ่มคิวเข้า Background Tasks
                        backgroundTasks.push(callAppScript('SAVE_DATA', 'Inventory', updatedStock));
                        
                        // สร้าง Log การตัดสต็อกรายล็อต
                        const branchName = branchesData.find(b => b.id === targetBranch)?.name || targetBranch;
                        const logPayload = {
                            id: `LOG${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            productId: item.product.id,
                            product_id: item.product.id,
                            itemId: item.product.id,
                            item_id: item.product.id,
                            productName: item.product.name,
                            item_name: item.product.name,
                            branchId: targetBranch,
                            branch_id: targetBranch,
                            type: 'SALE',
                            change_type: 'SALE',
                            amount: deductAmount,
                            quantity: deductAmount,
                            balance: newQty,
                            reason: `ขายสินค้า (บิล: ${receiptId})`,
                            notes: `ล็อต: ${stockItem.lotNo || stockItem.lot_no || 'N/A'}, สาขา: ${branchName}`,
                            lotNo: stockItem.lotNo || stockItem.lot_no || '',
                            lot_no: stockItem.lotNo || stockItem.lot_no || '',
                            expireDate: stockItem.expireDate || stockItem.expire_date || '',
                            expire_date: stockItem.expireDate || stockItem.expire_date || '',
                            timestamp: new Date().toISOString(),
                            created_at: new Date().toISOString()
                        };
                        backgroundTasks.push(callAppScript('SAVE_DATA', 'InventoryLogs', logPayload));

                        // อัปเดต Local State สต็อกและ Log ทันที
                        const idx = localInvData.findIndex(s => s.id === stockItem.id);
                        if (idx !== -1) localInvData[idx] = updatedStock;
                        localLogs.push(logPayload);
                    }

                    // กรณีสต็อกไม่พอ (หักจนติดลบในล็อตสุดท้าย หรือแจ้งเตือน)
                    if (remainingToDeduct > 0) {
                        console.warn(`Stock insufficient for ${item.product.name}. Remaining to deduct: ${remainingToDeduct}`);
                    }
                }
            }
        }

        // --- เพิ่มระบบจัดการคอร์ส/แพ็กเกจ (ตาราง patient_courses) ---
        const newCoursesToSave = [];
        const updatedCoursesToSave = [];

        cart.forEach(item => {
            // 1. กรณีซื้อคอร์สใหม่ (สินค้าปกติที่มี flag isCourse และไม่ใช่การตัดยอด)
            if (item.product.isCourse && !item.product.isRedeem) {
                for (let i = 0; i < item.quantity; i++) {
                    const sessionCount = Number(item.product.courseSessions || item.product.course_sessions) || 1;
                    const courseId = `CRS${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    const purchaseDate = new Date();
                    const expDateObj = new Date(purchaseDate);
                    expDateObj.setFullYear(expDateObj.getFullYear() + 1); // ค่าเริ่มต้น 1 ปี
                    const defaultExpireIso = expDateObj.toISOString().split('T')[0];

                    const newCourse = {
                        id: courseId,
                        patientId: selectedPatientId || '',
                        patient_id: selectedPatientId || '',
                        patientName: cleanPatientName,
                        patient_name: cleanPatientName,
                        productId: item.product.id,
                        product_id: item.product.id,
                        courseName: item.product.name,
                        course_name: item.product.name,
                        totalSessions: sessionCount,
                        total_sessions: sessionCount,
                        usedSessions: 0,
                        used_sessions: 0,
                        remainingSessions: sessionCount,
                        remaining_sessions: sessionCount,
                        price: Number(item.product.price) || 0,
                        posTransactionId: receiptId,
                        pos_transaction_id: receiptId,
                        receiptNo: receiptId,
                        receipt_no: receiptId,
                        branchId: currentBranch === 'all' ? 'b1' : currentBranch,
                        branch_id: currentBranch === 'all' ? 'b1' : currentBranch,
                        status: 'active',
                        isShareable: true,
                        is_shareable: true,
                        sharedPatientIds: [],
                        shared_patient_ids: [],
                        expireDate: defaultExpireIso,
                        expire_date: defaultExpireIso,
                        purchasedAt: purchaseDate.toISOString(),
                        purchased_at: purchaseDate.toISOString()
                    };
                    backgroundTasks.push(callAppScript('SAVE_DATA', 'PatientCourses', newCourse));
                    newCoursesToSave.push(newCourse);
                }
            }

            // 2. กรณีตัดคอร์ส (Redeem)
            if (item.product.isRedeem && item.product.courseId) {
                const targetCourse = (patientCoursesData || []).find(c => c.id === item.product.courseId);
                if (targetCourse) {
                    const currentUsed = Number(targetCourse.usedSessions ?? targetCourse.used_sessions) || 0;
                    const currentRem = Number(targetCourse.remainingSessions ?? targetCourse.remaining_sessions) || 1;
                    const newUsed = currentUsed + item.quantity;
                    const newRem = Math.max(0, currentRem - item.quantity);
                    const updatedCourse = {
                        ...targetCourse,
                        usedSessions: newUsed,
                        used_sessions: newUsed,
                        remainingSessions: newRem,
                        remaining_sessions: newRem,
                        status: newRem === 0 ? 'completed' : 'active',
                        updated_at: new Date().toISOString()
                    };
                    backgroundTasks.push(callAppScript('SAVE_DATA', 'PatientCourses', updatedCourse));
                    updatedCoursesToSave.push(updatedCourse);
                }
            }
        });

        // ประมวลผล Task ทั้งหมดพร้อมกัน (ช่วยให้ทำรายการเสร็จเร็วขึ้นหลายเท่าตัว)
        if (backgroundTasks.length > 0) {
            await Promise.all(backgroundTasks);
        }

        // อัปเดต React States รวดเดียว
        if (localLogs.length > 0 || rpcDeductedSuccess) {
            setInventoryData(localInvData);
            if (localLogs.length > 0) {
                setInventoryLogsData(prev => [...localLogs, ...prev]);
            }
        }
        if (setPatientCoursesData && (newCoursesToSave.length > 0 || updatedCoursesToSave.length > 0)) {
            setPatientCoursesData(prev => {
                let next = [...prev];
                updatedCoursesToSave.forEach(u => {
                    const idx = next.findIndex(c => c.id === u.id);
                    if (idx >= 0) next[idx] = u;
                });
                if (newCoursesToSave.length > 0) {
                    next = [...newCoursesToSave, ...next];
                }
                return next;
            });
        }

        // อัปเดต State ประวัติการขายทันทีเพื่อให้แสดงใน Modal
        if (setPosHistoryData) {
            setPosHistoryData(prev => [transactionData, ...prev]);
        }

        // ส่งการแจ้งเตือน Dual Broadcast (LINE + Discord)
        const patientPhone = selectedPatientId 
          ? ((patientsData || []).find(p => (p.id || p.hn) === selectedPatientId)?.phone || '')
          : '';
        const payMethodStr = paymentMethod === 'cash' ? 'เงินสด' : paymentMethod === 'transfer' ? 'เงินโอน' : paymentMethod === 'credit' ? 'บัตรเครดิต' : paymentMethod;
        dispatchClinicNotification({
            eventType: 'pos',
            settings: integrationTokens,
            title: '💵 ปิดบิล POS / ได้รับชำระเงินสำเร็จ',
            message: `บิลเลขที่ ${receiptId} ยอดชำระ ${Number(grandTotal).toLocaleString()} บาท (${payMethodStr})`,
            fields: [
                { name: '🧾 เลขที่บิล', value: receiptId, inline: true },
                { name: '💰 ยอดชำระสุทธิ', value: `${Number(grandTotal).toLocaleString()} บาท`, inline: true },
                { name: '👤 คนไข้', value: cleanPatientName || 'ลูกค้าทั่วไป', inline: true },
                { name: '💳 ช่องทางชำระ', value: payMethodStr, inline: true },
                { name: '👩‍💼 ผู้ทำรายการ', value: currentUser?.name || currentUser?.username || 'เจ้าหน้าที่', inline: true },
                { name: '📦 รายการสินค้า', value: `${cart.length} รายการ`, inline: true },
                ...(patientPhone ? [{ name: '📞 เบอร์ติดต่อ', value: patientPhone, inline: true }] : [])
            ],
            rawPayload: {
                receiptId,
                grandTotal,
                patientName: cleanPatientName || 'ลูกค้าทั่วไป',
                hn: selectedPatientId || '',
                phone: patientPhone,
                paymentMethod: payMethodStr,
                staff: currentUser?.name || currentUser?.username || 'เจ้าหน้าที่',
                itemsCount: `${cart.length} รายการ`,
                items: cart.map(it => ({ name: it.name || it.productName || 'สินค้า', quantity: it.quantity || 1, price: it.price || it.sellingPrice || 0 })),
                branch: currentBranch?.name || 'สาขาหลัก',
                date: new Date().toLocaleDateString('th-TH'),
                datetime: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
            },
            discordColor: 0x059669,
            callAppScript
        }).catch(err => console.error('[POS Notification Error]:', err));
        
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

  // --- ฟังก์ชันเปิดหน้าต่างและคำนวณสรุปยอดขายประจำวัน ---
  const handleOpenDailySummaryModal = async () => {
    dailySummaryModal.open();
    setIsSummaryLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      const txnsToUse = (data && !error && data.length > 0) ? data : (posHistoryData || []);
      const summary = calculateDailySalesSummary(txnsToUse, new Date());
      setDailySummaryData(summary);
    } catch (err) {
      console.error('[POS Daily Summary Error]:', err);
      const summary = calculateDailySalesSummary(posHistoryData || [], new Date());
      setDailySummaryData(summary);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // --- ฟังก์ชันบรอดแคสต์ส่งสรุปยอดขายเข้า LINE และ Discord ---
  const handleBroadcastDailySummary = async () => {
    if (!dailySummaryData) return;
    setIsSendingSummary(true);
    try {
      const res = await dispatchClinicNotification({
        eventType: 'dashboard',
        settings: integrationTokens,
        title: '📊 สรุปยอดขายประจำวัน',
        message: `ยอดขายรวมสุทธิ ฿${Number(dailySummaryData.totalAmount).toLocaleString()} (${dailySummaryData.billsCount} บิล)`,
        fields: [
          { name: '📅 ประจำวันที่', value: dailySummaryData.date, inline: true },
          { name: '💰 ยอดขายรวมสุทธิ', value: `฿${Number(dailySummaryData.totalAmount).toLocaleString()}`, inline: true },
          { name: '🧾 จำนวนบิลทั้งหมด', value: `${dailySummaryData.billsCount} บิล`, inline: true },
          { name: '👥 คนไข้ที่รับบริการ', value: `${dailySummaryData.patientsCount} ท่าน`, inline: true },
          { name: '💵 เงินสด', value: `฿${Number(dailySummaryData.cashAmount).toLocaleString()} (${dailySummaryData.cashCount} บิล)`, inline: true },
          { name: '📲 เงินโอน', value: `฿${Number(dailySummaryData.transferAmount).toLocaleString()} (${dailySummaryData.transferCount} บิล)`, inline: true },
          { name: '💳 บัตรเครดิต', value: `฿${Number(dailySummaryData.creditAmount).toLocaleString()} (${dailySummaryData.creditCount} บิล)`, inline: true },
          { name: '🏥 สาขา', value: currentBranch?.name || 'สาขาหลัก', inline: true }
        ],
        rawPayload: {
          totalAmount: dailySummaryData.totalAmount,
          billsCount: dailySummaryData.billsCount,
          patientsCount: dailySummaryData.patientsCount,
          cashAmount: dailySummaryData.cashAmount,
          transferAmount: dailySummaryData.transferAmount,
          creditAmount: dailySummaryData.creditAmount,
          branch: currentBranch?.name || 'สาขาหลัก',
          date: dailySummaryData.date
        },
        discordColor: 0x1e40af,
        callAppScript
      });

      if (res?.success || res?.line?.success || res?.discord?.success) {
        showToast('📢 ส่งสรุปยอดขายเข้า LINE และ Discord สำเร็จเรียบร้อย', 'success');
        dailySummaryModal.close();
      } else {
        showToast(res?.error || 'ส่งแจ้งเตือนไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ', 'warning');
      }
    } catch (err) {
      console.error('[Send Daily Summary Error]:', err);
      showToast('เกิดข้อผิดพลาดในการส่งสรุปยอดขาย', 'danger');
    } finally {
      setIsSendingSummary(false);
    }
  };

  // --- ฟังก์ชันจัดการดูและแก้ไขบิลย้อนหลัง ---
  const handleViewHistoryTxn = (txn) => {
    if (!txn) return;
    const formattedTxn = {
      ...txn,
      subtotal: Number(txn.subtotal ?? txn.total_amount ?? txn.totalAmount ?? txn.grandTotal ?? txn.grand_total ?? txn.net_amount ?? txn.netAmount ?? txn.amount ?? 0),
      discountAmount: Number(txn.discountAmount ?? txn.discount_amount ?? txn.discount ?? 0),
      vatAmount: Number(txn.vatAmount ?? txn.vat_amount ?? txn.vat ?? 0),
      grandTotal: Number(txn.grandTotal ?? txn.grand_total ?? txn.netAmount ?? txn.net_amount ?? txn.total_amount ?? txn.totalAmount ?? txn.amount ?? 0),
      paymentMethod: txn.paymentMethod || txn.payment_method || 'cash',
      status: txn.status || 'completed'
    };
    setSelectedHistoryTxn(formattedTxn);
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
    const rawTxn = { ...selectedHistoryTxn };
    const curDoctorId = rawTxn.doctorId || rawTxn.doctor_id || (staffData || []).find(s => s.name === rawTxn.doctorName || s.name === rawTxn.doctor_name || s.name === rawTxn.doctor)?.id || '';
    const curSellerId = rawTxn.sellerId || rawTxn.seller_id || rawTxn.staffId || rawTxn.staff_id || (staffData || []).find(s => s.name === rawTxn.sellerName || s.name === rawTxn.seller_name || s.name === rawTxn.staffName || s.name === rawTxn.staff_name)?.id || '';

    setHistoryEditForm({
      ...rawTxn,
      doctorId: curDoctorId,
      doctor_id: curDoctorId,
      sellerId: curSellerId,
      seller_id: curSellerId
    });
    setIsEditingHistory(true);
  };

  const handleSaveTxnEdit = async () => {
    setIsSavingHistory(true);
    try {
        const docObj = (staffData || []).find(s => s.id === historyEditForm.doctorId);
        const sellerObj = (staffData || []).find(s => s.id === (historyEditForm.sellerId || historyEditForm.staffId));

        const payloadToSave = {
            ...historyEditForm,
            doctorId: docObj ? docObj.id : '',
            doctor_id: docObj ? docObj.id : '',
            doctorName: docObj ? docObj.name : '',
            doctor_name: docObj ? docObj.name : '',
            doctor: docObj ? docObj.name : '',
            sellerId: sellerObj ? sellerObj.id : '',
            seller_id: sellerObj ? sellerObj.id : '',
            sellerName: sellerObj ? sellerObj.name : '',
            seller_name: sellerObj ? sellerObj.name : '',
            staffId: sellerObj ? sellerObj.id : '',
            staff_id: sellerObj ? sellerObj.id : '',
            staffName: sellerObj ? sellerObj.name : '',
            staff_name: sellerObj ? sellerObj.name : ''
        };

        const prevStatus = selectedHistoryTxn?.status || 'completed';
        const newStatus = payloadToSave.status || 'completed';

        await callAppScript('SAVE_DATA', 'POS_Transactions', payloadToSave);

        // หากมีการเปลี่ยนสถานะระหว่าง completed <-> cancelled ให้จัดการคืนหรือตัดรอบคอร์ส
        if (prevStatus !== newStatus) {
          await syncCourseSessionsOnStatusChange({
            prevStatus,
            newStatus,
            transaction: payloadToSave,
            patientCoursesData,
            setPatientCoursesData,
            callAppScript
          });
        }

        // อัปเดตข้อมูลในตารางหลัก
        if (setPosHistoryData) {
            setPosHistoryData(prev => prev.map(t => (t.id === payloadToSave.id || t.receiptNo === payloadToSave.id || t.receipt_no === payloadToSave.receiptNo) ? { ...t, ...payloadToSave } : t));
        }
        // อัปเดตข้อมูลในหน้าดูรายละเอียด
        setSelectedHistoryTxn(payloadToSave);
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
      if (hasMoreHistory && !isHistoryLoadingMore) {
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
      showGlobalAlert({
          type: 'warning', title: 'ยืนยันการลบรายการ?',
          text: `คุณต้องการลบ "${prod.name}" ใช่หรือไม่?`,
          onConfirm: async () => {
              globalAlert.setIsOpen(false);
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

  const patientOptions = useMemo(() => {
    const sortedPatients = [...patientsData].sort((a, b) => {
        const valA = getPatientLastVisitStr(a);
        const valB = getPatientLastVisitStr(b);
        if (valA < valB) return 1;
        if (valA > valB) return -1;
        return 0;
    });
    
    return [
      { value: '', label: 'เลือกลูกค้าทั่วไป (ไม่ระบุ)' },
      ...sortedPatients.map(p => ({ 
        value: p.id || p.hn, 
        label: `${p.hn || p.id} - ${getPatientFullName(p)}`,
        phone: p.phone || p.phone1 || '',
        raw: p
      }))
    ];
  }, [patientsData]);

  // รายการคนไข้ที่ผ่านการกรอง (หากไม่ค้นหา จะแสดงทั้งหมดเพื่อให้สามารถเลื่อนดู/scroll คนไข้ทุกคนได้ครบถ้วน)
  const filteredPatientOptions = useMemo(() => {
    const list = patientOptions.filter(p => p.value !== '');
    if (!patientSearchTerm || !patientSearchTerm.trim()) {
      return list;
    }
    const term = patientSearchTerm.toLowerCase().trim();
    return list.filter(p => {
      const matchLabel = (p.label || '').toLowerCase().includes(term);
      const matchPhone = (p.phone || '').includes(term);
      return matchLabel || matchPhone;
    });
  }, [patientOptions, patientSearchTerm]);

  // State สำหรับ Infinite Scroll ใน Dropdown คนไข้หน้า POS (On-Demand Fetching ประหยัด Egress)
  const [posHasMore, setPosHasMore] = useState(true);
  const [posIsLoadingMore, setPosIsLoadingMore] = useState(false);
  const posLoadingRef = useRef(false);
  const searchDebounceTimerRef = useRef(null);

  // ฟังก์ชันดึงข้อมูลคนไข้เพิ่มเติมเมื่อเลื่อน Scroll หรือเมื่อพิมพ์ค้นหา (โหลดเข้า patientsData และบันทึกลง IndexedDB อัตโนมัติ)
  const loadMorePatients = useCallback(async (searchQuery = '', isNewSearch = false) => {
    if (!fetchPatientsPaginated || posLoadingRef.current) return;
    if (!posHasMore && !searchQuery && !isNewSearch) return;

    posLoadingRef.current = true;
    setPosIsLoadingMore(true);

    try {
      const currentOffset = isNewSearch ? 0 : (searchQuery ? filteredPatientOptions.length : patientsData.length);
      const res = await fetchPatientsPaginated({
        offset: currentOffset,
        limit: 20,
        search: (searchQuery || '').trim()
      });

      if (res && res.status === 'success' && Array.isArray(res.patients)) {
        if (res.patients.length > 0) {
          setPatientsData(prev => {
            const existingIds = new Set(prev.map(p => String(p.id || p.hn || '').trim().toLowerCase()));
            const newItems = res.patients.filter(p => !existingIds.has(String(p.id || p.hn || '').trim().toLowerCase()));
            return [...prev, ...newItems];
          });
        }
        setPosHasMore(Boolean(res.hasMore));
      } else {
        setPosHasMore(false);
      }
    } catch (err) {
      console.error('POS loadMorePatients error:', err);
    } finally {
      posLoadingRef.current = false;
      setPosIsLoadingMore(false);
    }
  }, [fetchPatientsPaginated, posHasMore, patientsData.length, filteredPatientOptions.length, setPatientsData]);

  // เมื่อพิมพ์ค้นหาใน POS หากพิมพ์ 2 ตัวอักษรขึ้นไป ให้ดึงข้อมูลที่ตรงกันจาก Server/IndexedDB มาเสริมใน Dropdown
  useEffect(() => {
    if (!patientSearchTerm || patientSearchTerm.trim().length < 2) return;
    if (!isPatientDropdownOpen) return;

    clearTimeout(searchDebounceTimerRef.current);
    searchDebounceTimerRef.current = setTimeout(() => {
      loadMorePatients(patientSearchTerm, true);
    }, 350);

    return () => clearTimeout(searchDebounceTimerRef.current);
  }, [patientSearchTerm, isPatientDropdownOpen, loadMorePatients]);

  // จัดการ Event Scroll เมื่อเลื่อนลงมาใกล้ขอบล่างของ Dropdown ให้โหลดชุดถัดไป
  const handleDropdownScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (posHasMore && !posIsLoadingMore) {
        loadMorePatients(patientSearchTerm, false);
      }
    }
  };

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
              onClick={handleOpenDailySummaryModal}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 hover:text-blue-800 hover:bg-blue-100 transition-colors shadow-sm kanit-text text-[11px] sm:text-sm font-medium"
              title="สรุปยอดขายประจำวัน & ส่งแจ้งเตือนเข้า LINE / Discord"
            >
              <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px] text-blue-600" /> <span className="hidden sm:inline">สรุปยอดวันนี้</span><span className="sm:hidden">สรุปยอด</span>
            </button>
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
                  className="w-full pl-12 pr-11 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl text-base outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors font-data shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                    title="ล้างข้อความ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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
            <div className="pos-product-grid flex-1 p-3 sm:p-6 pb-24 lg:pb-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {isGlobalLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-5 auto-rows-max">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`skel-pos-${i}`} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col h-full">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-200 rounded-xl sm:rounded-2xl mb-4 animate-pulse shrink-0"></div>
                      <div className="flex-1 flex flex-col justify-between w-full">
                        <div className="mb-2">
                          <div className="h-3 w-full max-w-[64px] bg-slate-200 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-end justify-between mt-auto w-full pt-2">
                          <div className="h-5 w-full max-w-[80px] bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 min-[450px]:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5 sm:gap-5 auto-rows-max">
                  {filteredProducts.map((product, index) => {
                    const Icon = typeof product.icon === 'string' ? (POS_ICONS[product.icon] || Package) : (product.icon || Package);
                    const isStock = isStockManaged(product);
                    const stock = isStock ? getProductStock(product) : Infinity;
                    const isOut = isStock && stock <= 0;
                    const isLow = isStock && stock > 0 && stock <= (product.minStock || 5);
                    const inCartItem = cart.find(item => item?.product?.id === product.id);
                    const inCartQty = inCartItem ? (Number(inCartItem.quantity) || 0) : 0;

                    return (
                      <button 
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`pos-product-card bg-white p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border transition-all flex flex-col h-full text-left group active:scale-[0.98] space-row-animation relative overflow-hidden ${
                          isOut
                            ? 'border-slate-200/80 bg-slate-50/40 opacity-80 hover:border-rose-300 hover:shadow-md hover:shadow-rose-500/5'
                            : inCartQty > 0
                              ? 'border-sky-300 ring-2 ring-sky-400/20 shadow-md shadow-sky-500/10 hover:border-sky-400'
                              : 'border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10'
                        }`}
                        style={{ animationDelay: `${(index % 20) * 30}ms` }}
                      >
                        {/* แถวบน: ไอคอนสินค้า (ซ้าย) และ ป้ายสต็อก (ขวา) แยกกันชัดเจน ไม่ล้นการ์ดบนมือถือ */}
                        <div className="flex items-start justify-between w-full mb-2 sm:mb-3 gap-1.5 min-w-0">
                          <div className={`w-9 h-9 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                            isOut
                              ? 'bg-rose-50 text-rose-400 group-hover:bg-rose-500 group-hover:text-white'
                              : inCartQty > 0
                                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                                : 'bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white'
                          }`}>
                            <Icon className="w-4.5 h-4.5 sm:w-6.5 sm:h-6.5" strokeWidth={2} />
                          </div>

                          {/* ป้ายแสดงสถานะสต็อก (มุมขวาบน กระชับและจัดระเบียบสวยงาม) */}
                          {isStock && (
                            <div className={`text-[10px] sm:text-[11px] font-bold kanit-text px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-1.5 shrink-0 max-w-[calc(100%-2.6rem)] sm:max-w-none transition-all ${
                              isOut
                                ? 'bg-rose-50 text-rose-600 border border-rose-200/90'
                                : isLow
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/90'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/90'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                              }`} />
                              <span className="truncate whitespace-nowrap">{isOut ? 'หมด (0)' : `เหลือ ${stock}`}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* ส่วนกลาง: หมวดหมู่ และ ชื่อสินค้า */}
                        <div className="flex-1 flex flex-col justify-between w-full mb-2 sm:mb-3 min-w-0">
                          <div>
                            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">
                              {product.type || product.category}
                            </span>
                            <h3 className="font-bold text-slate-800 text-xs sm:text-base kanit-text line-clamp-2 leading-snug min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-sky-600 transition-colors">
                              {product.name}
                            </h3>
                          </div>
                        </div>
                        
                        {/* แถวล่าง: ราคาเด่นชัด + ปุ่มกดแบบ E-Commerce กว้างขวาง เป็นระเบียบ */}
                        <div className="flex items-center justify-between mt-auto w-full pt-2 sm:pt-2.5 border-t border-slate-100/90 gap-1.5 sm:gap-2 min-w-0">
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-black text-sky-600 text-sm sm:text-base lg:text-lg font-data leading-none tracking-tight truncate">
                              {formatCurrency(product.price)}
                            </div>
                            {product.unit && (
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-data mt-0.5 sm:mt-1 truncate">
                                /{product.unit}
                              </span>
                            )}
                          </div>

                          {/* Quick Action Button */}
                          <div className="shrink-0">
                            {isOut ? (
                              <div 
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-400 border border-slate-200/60 flex items-center justify-center text-xs font-bold"
                                title="สินค้าหมดสต็อก"
                              >
                                <Minus size={12} strokeWidth={2.5} className="opacity-40" />
                              </div>
                            ) : inCartQty > 0 ? (
                              <div 
                                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl bg-sky-500 text-white font-data font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-sm shadow-sky-500/25 group-hover:bg-sky-600 transition-all active:scale-95"
                                title={`อยู่ในตะกร้าแล้ว ${inCartQty} ชิ้น (กดเพื่อเพิ่มอีก)`}
                              >
                                <Plus size={10} strokeWidth={3} />
                                <span>{inCartQty}</span>
                              </div>
                            ) : (
                              <div 
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-sky-50 text-sky-600 border border-sky-100/80 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white group-hover:border-transparent transition-all shadow-2xs active:scale-95"
                                title="เพิ่มลงตะกร้า"
                              >
                                <Plus size={14} strokeWidth={2.5} />
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
                {isFetchingOpd ? (
                  <Loader2 className="w-5 h-5 animate-spin text-sky-500 shrink-0 mr-3" />
                ) : (
                  <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                )}
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
                {selectedPatientId ? (
                  <button 
                    onClick={() => { 
                      setSelectedPatientId(''); 
                      setPatientSearchTerm(''); 
                      setIsPatientDropdownOpen(false); 
                      setCart([]);
                      showToast('เริ่มบิลสำหรับลูกค้าทั่วไป (ล้างตะกร้าแล้ว)', 'info');
                    }} 
                    className="text-slate-400 hover:text-rose-500 ml-2 shrink-0 p-1 hover:bg-slate-100 rounded-full transition-all"
                    title="ยกเลิกการเลือกคนไข้"
                  >
                    <X className="w-5 h-5" />
                  </button>
                ) : patientSearchTerm ? (
                  <button 
                    type="button"
                    onClick={() => { 
                      setPatientSearchTerm(''); 
                    }} 
                    className="text-slate-400 hover:text-slate-600 ml-2 shrink-0 p-1 hover:bg-slate-100 rounded-full transition-all"
                    title="ล้างข้อความ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
              
              {isPatientDropdownOpen && (
                <div 
                  onScroll={handleDropdownScroll}
                  className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top"
                >
                    <div 
                      onMouseDown={(e) => { e.preventDefault(); handleSelectPatient('', ''); }}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 font-data text-sm sm:text-base ${!selectedPatientId ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-500'}`}
                    >
                       ลูกค้าทั่วไป (ไม่ระบุ)
                    </div>
                    {filteredPatientOptions.length === 0 && !posIsLoadingMore && patientSearchTerm && (
                        <div className="px-4 py-3 text-slate-400 text-sm sm:text-base text-center font-data">
                            ไม่พบข้อมูลลูกค้า
                        </div>
                    )}
                    {filteredPatientOptions.map((opt) => (
                        <div
                            key={opt.value}
                            onMouseDown={(e) => { 
                               e.preventDefault(); 
                               if (opt.raw && !patientsData.find(p => (p.id || p.hn) === opt.value)) {
                                   setPatientsData(prev => [...prev, opt.raw]);
                               }
                               handleSelectPatient(opt.value, opt.label); 
                            }}
                            className={`px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data transition-colors text-sm sm:text-base ${selectedPatientId === opt.value ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                        >
                            {opt.label}
                        </div>
                    ))}
                    {posIsLoadingMore && (
                        <div className="px-4 py-2.5 text-center text-xs text-sky-600 font-data flex items-center justify-center gap-1.5 bg-sky-50/60 border-t border-sky-100">
                            <Loader2 size={14} className="animate-spin text-sky-500" /> กำลังโหลดรายชื่อเพิ่มเติม...
                        </div>
                    )}
                    {!posHasMore && patientsData.length > 20 && !patientSearchTerm && (
                        <div className="px-4 py-2 text-center text-[11px] text-slate-400 font-data border-t border-slate-50 bg-slate-50/50">
                            แสดงรายชื่อทั้งหมดแล้ว ({patientsData.length} คน)
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* คอร์สคงเหลือของลูกค้า (แสดงเฉพาะเมื่อเลือกลูกค้า) */}
          {selectedPatientId && (
            <div className="relative z-10 px-3 sm:px-4 py-2.5 bg-indigo-50/30 border-b border-indigo-100 shrink-0 no-drag-zone">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] font-bold text-indigo-700 kanit-text uppercase tracking-wider">คอร์สที่ใช้ได้</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShareOwnerSearch('');
                    setSelectedOwnerPatient(null);
                    setIsShareCourseModalOpen(true);
                  }}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold kanit-text flex items-center gap-1 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Users size={11} /> + ใช้คอร์สแชร์
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {(() => {
                  const normPid = String(selectedPatientId || '').trim().toLowerCase();
                  // ค้นหาจาก patientCoursesData เป็นหลัก ถ้าไม่มีให้ fallback หาจาก patient.courses
                  const activeCourses = (patientCoursesData || []).filter(c => {
                    if (!c) return false;
                    const cPid = String(c.patientId || c.patient_id || '').trim().toLowerCase();
                    const rem = Number(c.remainingSessions ?? c.remaining_sessions) || 0;
                    const expDate = c.expireDate || c.expire_date;
                    const isExpired = expDate ? (new Date(expDate).setHours(23, 59, 59, 999) < Date.now()) : false;
                    return cPid === normPid && rem > 0 && (c.status || 'active') === 'active' && !c.isDeleted && !isExpired;
                  });

                  if (activeCourses.length === 0) {
                    return <div className="text-[10px] text-slate-400 kanit-text py-1 italic">ไม่มีคอร์สส่วนตัวคงเหลือ</div>;
                  }

                  return activeCourses.map(course => {
                    const courseName = course.courseName || course.course_name || course.name;
                    const rem = Number(course.remainingSessions ?? course.remaining_sessions) || 1;
                    const total = Number(course.totalSessions ?? course.total_sessions) || 1;
                    const isAlreadyInCart = cart.some(item => item?.product?.courseId === course?.id);

                    return (
                      <button
                        key={course.id}
                        onMouseEnter={(e) => handleCourseMouseEnter(e, { name: courseName, rem, total })}
                        onMouseLeave={handleCourseMouseLeave}
                        onTouchStart={(e) => handleCourseTouchStart(e, { name: courseName, rem, total })}
                        onTouchEnd={handleCourseTouchEnd}
                        onClick={() => {
                          if (isAlreadyInCart) {
                            showToast('รายการนี้อยู่ในตะกร้าแล้ว', 'info');
                            return;
                          }

                          const courseProduct = products.find(p => p.id === course.productId) || {
                            id: course.productId,
                            name: courseName,
                            price: 0,
                            type: 'คอร์สเดิม',
                            icon: 'Package'
                          };

                          const redeemItem = {
                            product: { 
                              ...courseProduct, 
                              id: `REDEEM_${course.id}`, 
                              price: 0, 
                              isRedeem: true, 
                              courseId: course.id,
                              courseName: courseName,
                              name: `${courseName} (${rem}/${total})`
                            },
                            quantity: 1
                          };
                          setCart(prev => [...prev, redeemItem]);
                          showToast(`เพิ่มการตัดคอร์ส ${courseName} เข้าตะกร้า`, 'success');
                        }}
                        className={`shrink-0 px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 text-left group border ${
                          isAlreadyInCart
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-400/40'
                            : 'bg-white border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-[10px] font-bold kanit-text ${isAlreadyInCart ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                            คงเหลือ {rem}/{total}
                          </span>
                          {isAlreadyInCart && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md">
                              <CheckCircle2 size={10} className="text-emerald-300" /> ในตะกร้า
                            </span>
                          )}
                        </div>
                        <div className={`text-xs font-bold kanit-text truncate max-w-[130px] pointer-events-none ${isAlreadyInCart ? 'text-white font-black' : 'text-slate-700'}`}>
                          {courseName}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* --- แก้ไข: Middle Area (รวมรายการบิล และ หน้าต่างตั้งค่าส่วนลดแบบ Overlay) --- */}
          {/* แก้ไข 2: ถอด overflow-hidden ออก และเพิ่ม z-20 เพื่อให้แท็บยืดทะลุไปบังคอร์สคงเหลือได้แบบอิสระ */}
          <div className="flex-1 min-h-0 relative flex flex-col bg-slate-50/20 z-20">
            
            {/* 1. Cart Items List (อยู่ด้านหลังเสมอ) */}
            {/* Spacer div ดันด้านล่าง 100px ป้องกันรายการสุดท้ายโดนบัง */}
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 sm:p-5">
              {cart.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {cart.map((item, idx) => {
                    const CartItemIcon = typeof item.product.icon === 'string' ? (POS_ICONS[item.product.icon] || Package) : (item.product.icon || Package);
                    return (
                      <div key={idx} className="flex flex-col gap-3 relative group p-3 sm:p-4 bg-white border border-slate-100 rounded-[1.5rem] hover:border-sky-200 transition-all shadow-sm">
                         
                         {/* ส่วนบน: ไอคอน + รายละเอียด + ปุ่มลบ */}
                         <div className="flex gap-3 sm:gap-4 items-start">
                             <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.product.isNote ? 'bg-amber-50 text-amber-500' : item.product.isRedeem ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                                <CartItemIcon size={24} className="sm:w-7 sm:h-7 stroke-[1.5]" />
                             </div>
                             
                             <div className="flex-1 min-w-0 pt-1">
                               <div className="flex justify-between items-start gap-2">
                                 <h4 className={`font-bold text-sm sm:text-base kanit-text leading-tight ${item.product.isNote ? 'text-amber-700' : item.product.isRedeem ? 'text-indigo-700' : 'text-slate-800'}`}>
                                   {item.product.isRedeem && (
                                      <span className={`mr-1.5 px-1.5 py-0.5 text-white text-[9px] rounded uppercase font-black tracking-tighter align-middle ${item.product.ownerPatientName ? 'bg-purple-600' : 'bg-indigo-500'}`}>
                                        {item.product.ownerPatientName ? 'ตัดคอร์สแชร์' : 'ตัดคอร์ส'}
                                      </span>
                                    )}
                                   {item.product.name}
                                   {item.product.isVatable && <span className="ml-1.5 px-1.5 py-0.5 bg-sky-50 text-sky-600 text-[10px] rounded border border-sky-200 font-bold tracking-tighter align-middle">(V)</span>}
                                 </h4>
                                 <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 -mt-1 -mr-1 shrink-0"><X size={18} /></button>
                               </div>

                                {/* แสดงสต็อกคงเหลือเรียลไทม์ในรายการบิล */}
                                {isStockManaged(item.product) && (() => {
                                  const availableStock = getProductStock(item.product);
                                  const isOver = item.quantity > availableStock;
                                  const isAtMax = item.quantity === availableStock;
                                  return (
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[10px] font-bold kanit-text px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                        isOver
                                          ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                                          : isAtMax
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOver ? 'bg-rose-500' : isAtMax ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                        {isOver 
                                          ? `⚠️ เกินสต็อก! (สาขามี ${availableStock} ${item.product.unit || 'ชิ้น'})`
                                          : `คลังสาขามี: ${availableStock} ${item.product.unit || 'ชิ้น'}`
                                        }
                                      </span>
                                    </div>
                                  );
                                })()}

                              {/* ข้อความสถานะเพิ่มเติม (ถ้ามี) */}
                              {item.product.isTemp ? (
                                Number(item.product.price) > 0 ? (
                                  <div className="text-amber-600 font-bold text-xs kanit-text mt-1.5 flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span> ราคาจาก OPD
                                  </div>
                                ) : (
                                  <div className="text-rose-500 font-bold text-xs kanit-text mt-1.5">ไม่มีราคาในระบบ (ระบุราคาใน OPD)</div>
                                )
                              ) : item.product.isNote ? null : (
                                item.product.isRedeem ? <div className="text-indigo-500 font-bold text-xs font-data mt-1">FREE (REDEEM)</div> : null
                              )}
                             </div>
                         </div>

                         {/* ส่วนล่าง: ปุ่มปรับจำนวน + ราคารวม */}
                         {!item.product.isNote && (
                           <div className="flex items-center justify-between pt-1">
                             
                              {/* Qty Controls ชิดซ้าย (จำกัดไม่ให้เกินสต็อก) */}
                              {(() => {
                                const isStock = isStockManaged(item.product);
                                const availableStock = isStock ? getProductStock(item.product) : Infinity;
                                const itemQty = Number(item.quantity) || 0;
                                const isMax = isStock && itemQty >= availableStock;
                                return (
                                  <div className="flex items-center gap-1 bg-slate-50/90 rounded-xl border border-slate-200 p-1 w-fit shadow-xs">
                                    <button 
                                      type="button"
                                      onClick={() => updateQuantity(item.product.id, -1)} 
                                      className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-500 shadow-sm border border-slate-100 hover:text-sky-500 active:scale-95 transition-all"
                                      title="ลดจำนวน"
                                    >
                                      <Minus size={14} strokeWidth={2.5}/>
                                    </button>
                                    <input 
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={item.quantity === '' ? '' : item.quantity}
                                      onFocus={e => e.target.select()}
                                      onChange={e => {
                                        const rawVal = e.target.value;
                                        if (rawVal === '') {
                                          setCart(prev => prev.map(it => it.product.id === item.product.id ? { ...it, quantity: '' } : it));
                                          return;
                                        }
                                        const cleanNum = rawVal.replace(/\D/g, '');
                                        if (!cleanNum) return;
                                        let num = parseInt(cleanNum, 10);
                                        if (isStock) {
                                          if (num > availableStock) {
                                            showToast(`⚠️ สินค้า "${item.product.name}" มีสต็อก ${availableStock} ${item.product.unit || 'ชิ้น'}`, 'warning');
                                            num = availableStock;
                                          }
                                        }
                                        setCart(prev => prev.map(it => it.product.id === item.product.id ? { ...it, quantity: Math.max(1, num) } : it));
                                      }}
                                      onBlur={() => {
                                        if (!item.quantity || Number(item.quantity) < 1) {
                                          setCart(prev => prev.map(it => it.product.id === item.product.id ? { ...it, quantity: 1 } : it));
                                        }
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.target.blur();
                                        }
                                      }}
                                      className="font-black text-sm sm:text-base text-slate-800 w-12 sm:w-14 text-center font-data bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-sky-300 focus:ring-2 focus:ring-sky-100 rounded-lg py-0.5 transition-all outline-none"
                                      title="คลิกเพื่อพิมพ์ตัวเลขได้โดยตรง"
                                      placeholder="1"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (isMax) {
                                          showToast(`⚠️ สินค้า "${item.product.name}" เพิ่มได้ไม่เกินสต็อกคงเหลือ (${availableStock} ${item.product.unit || 'ชิ้น'})`, 'warning');
                                          return;
                                        }
                                        updateQuantity(item.product.id, 1);
                                      }} 
                                      disabled={isMax}
                                      className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border transition-all ${
                                        isMax 
                                          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' 
                                          : 'bg-white text-slate-500 border-slate-100 hover:text-sky-500 active:scale-95 cursor-pointer'
                                      }`}
                                      title={isMax ? `สต็อกคงเหลือสูงสุดแล้ว (${availableStock} ${item.product.unit || 'ชิ้น'})` : "เพิ่มจำนวน"}
                                    >
                                      <Plus size={14} strokeWidth={2.5}/>
                                    </button>
                                  </div>
                                );
                              })()}
                              
                              {/* ยอดเงินรวม ชิดขวา */}
                              <div className="text-right flex flex-col justify-end">
                                {(Number(item.quantity) || 0) > 1 && !item.product.isRedeem && (
                                    <span className="text-[10px] text-slate-400 font-data mb-0.5 tracking-tight">{formatCurrency(item.product.price)} / หน่วย</span>
                                )}
                                <span className={`font-black text-lg sm:text-xl font-data leading-none tracking-tight ${item.product.isRedeem ? 'text-indigo-500' : 'text-slate-800'}`}>
                                  {item.product.isRedeem ? '0.00' : formatCurrency(item.product.price * (Number(item.quantity) || 0))}
                                </span>
                              </div>
                           </div>
                         )}
                      </div>
                     );
                  })}
                  
                  {/* Spacer เผื่อพื้นที่ด้านล่าง 100px ให้มองเห็นรายการสุดท้ายได้เต็มที่ ไม่โดนแถบด้านล่างบังแน่นอน */}
                  <div className="h-[100px] w-full shrink-0 pointer-events-none"></div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 opacity-50"><ShoppingCart size={32} /></div>
                  <p className="kanit-text font-bold text-sm sm:text-base italic">ยังไม่มีรายการในบิล</p>
                </div>
              )}
            </div>

            {/* 2. Expandable Settings Overlay (ลอยขึ้นมาบังรายการบิล) */}
            {/* แก้ไข 3: ปรับ z-index เป็น z-30 ให้อยู่เหนือกล่องตรงกลาง พร้อมเพิ่มเงาให้ลอยเด่นขึ้น */}
            <div 
              className={`absolute bottom-0 left-0 w-full flex flex-col bg-white rounded-t-[1.5rem] xl:rounded-t-[2rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] z-30 transition-transform duration-300 ease-in-out border-t border-slate-100 ${isSummaryExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-32px)]'}`}
            >
              {/* Toggle Tab (มองเห็นเสมอที่ความสูง 32px) */}
              <div 
                className="h-[32px] w-full flex justify-center items-center hover:bg-sky-50 text-slate-500 hover:text-sky-600 cursor-pointer rounded-t-[1.5rem] xl:rounded-t-[2rem] transition-colors shrink-0"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                title={isSummaryExpanded ? "ย่อรายละเอียด" : "ตั้งค่าส่วนลดและภาษี"}
              >
                <div className="flex items-center gap-1.5 kanit-text font-bold text-[10px] sm:text-[11px] tracking-wide select-none">
                  {isSummaryExpanded ? <ChevronDown size={14} className="text-sky-500" /> : <ChevronUp size={14} className="text-sky-500" />}
                  <span>{isSummaryExpanded ? 'ย่อรายละเอียดส่วนลดและภาษี' : 'ตั้งค่าส่วนลดและภาษี'}</span>
                  {!isSummaryExpanded && (discountAmount > 0 || vatAmount > 0) && (
                     <span className="flex h-1.5 w-1.5 relative ml-0.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                     </span>
                  )}
                </div>
              </div>

              {/* Settings Content (แสดงผลเมื่อกางขึ้นมา) */}
              <div className="overflow-y-auto custom-scrollbar p-4 sm:p-5 max-h-[40vh] sm:max-h-[350px] bg-slate-50/80 border-t border-slate-100/80">
                <div className="space-y-2.5 sm:space-y-3 font-data text-xs sm:text-sm">
                  {/* รวมเป็นเงิน */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="kanit-text font-medium">รวมเป็นเงิน</span>
                    <span className="font-bold">{formatCurrency(subtotal)}</span>
                  </div>

                  {/* ส่วนลดเพิ่มเติม */}
                  <div className="flex justify-between items-center">
                    <span className="kanit-text font-medium text-slate-700 flex items-center gap-1">
                      ส่วนลดเพิ่มเติม
                      {discount > 0 && (
                         <span className="text-rose-500 font-bold text-[10px] sm:text-xs">
                            {discountType === 'percent' 
                               ? `(${formatCurrency(discountAmount)} บาท)` 
                               : `(${Number(((Number(discount) || 0) * 100 / (subtotal || 1)).toFixed(2))}%)`}
                         </span>
                      )}
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

                  <div className="h-px w-full bg-slate-200/60 my-1.5"></div>

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
                  <div className={`flex justify-between items-center text-slate-700 font-medium transition-opacity duration-300 ${taxMode === 'none' ? 'opacity-40 select-none' : ''}`}>
                    <span className="kanit-text">ราคาไม่รวมภาษีมูลค่าเพิ่ม</span>
                    <span className="font-bold">{formatCurrency(priceExcludingVat)}</span>
                  </div>

                  {/* ภาษีมูลค่าเพิ่ม + Input % */}
                  <div className={`flex justify-between items-center text-slate-700 font-medium transition-opacity duration-300 ${taxMode === 'none' ? 'opacity-40 select-none pointer-events-none' : ''}`}>
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

          </div>

          {/* --- Always Visible Bottom Section (Totals & Buttons - Fixed Footer) --- */}
          {/* แก้ไข 4: เพิ่ม z-40 ให้ส่วนท้าย (Footer) ยึดอยู่บนสุดเหนือบิลเสมอ ไม่ว่าแท็บส่วนลดจะกางหรือหด */}
          <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4 flex flex-col bg-white shrink-0 z-40 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] relative">
              <div className="flex justify-between items-center text-lg sm:text-xl font-black text-slate-800 mb-3 select-none">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="kanit-text">ยอดสุทธิ</span>
                  {!isSummaryExpanded && (discountAmount > 0 || vatAmount > 0) && (
                     <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md kanit-text border border-amber-100 animate-in fade-in">
                        มีส่วนลด/ภาษี
                     </span>
                  )}
                </div>
                <span className="font-data text-sky-600">{formatCurrency(grandTotal)}</span>
              </div>

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
          
          </div> {/* End of Right Column */}

          {/* --- Floating Mobile Cart Button (แสดงเฉพาะบนมือถือตอนอยู่หน้าเลือกสินค้า) --- */}
          {!isMobileCartOpen && (
            <div className={`md:hidden fixed left-4 right-4 z-40 transition-all duration-300 ease-in-out ${showMobileBars ? 'bottom-[76px]' : 'bottom-6'}`}>
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
                      ตะกร้าสินค้า ({cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)})
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
      {checkoutModal.isOpen && createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${checkoutModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden ${checkoutModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <Banknote size={18} className="text-sky-500"/> ชำระเงิน
              </h3>
              <button onClick={closeCheckoutAndReset} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div ref={checkoutScrollRef} className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4 sm:gap-5 scroll-smooth">
               <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 sm:p-5 rounded-2xl text-center border border-sky-100 shadow-inner relative overflow-hidden shrink-0">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-sky-200/50 rounded-full blur-2xl pointer-events-none"></div>
                  <p className="text-[11px] sm:text-xs text-sky-600 font-bold kanit-text mb-0.5 relative z-10 uppercase tracking-wider">ยอดสุทธิที่ต้องชำระ</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-sky-600 font-data tracking-tighter relative z-10 leading-none py-1">{formatCurrency(grandTotal)}</h2>
               </div>

                {/* เลือกผู้แนะนำ / ผู้ขาย (ค่าคอมมิชชั่นยอดขาย) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5 shrink-0">
                   <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 kanit-text flex items-center gap-1.5">
                         <Award size={14} className="text-amber-500" /> ผู้แนะนำ / ผู้ขาย
                      </label>
                      {selectedDoctorId && (
                         <label className="flex items-center gap-1.5 text-[11px] font-bold text-sky-600 kanit-text cursor-pointer select-none bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                            <input
                               type="checkbox"
                               checked={doctorIsSeller}
                               onChange={(e) => {
                                  const checked = e.target.checked;
                                  setDoctorIsSeller(checked);
                                  if (checked) setSelectedSellerId(selectedDoctorId);
                               }}
                               className="rounded text-sky-500 focus:ring-0 cursor-pointer"
                            />
                            แพทย์แนะนำ/ขายเอง
                         </label>
                      )}
                   </div>

                   {doctorIsSeller && selectedDoctorId ? (
                      <div className="px-3 py-2 bg-sky-50/50 rounded-xl border border-sky-100 text-xs font-bold text-sky-700 kanit-text flex items-center justify-between">
                         <span className="flex items-center gap-1.5">✨ แพทย์แนะนำเอง</span>
                         <span className="text-[10px] text-sky-600 font-medium bg-white px-2 py-0.5 rounded-md border border-sky-200 shadow-xs">
                            {(staffData || []).find(s => s.id === selectedDoctorId)?.name || 'แพทย์จาก OPD'}
                         </span>
                      </div>
                   ) : (
                      <select
                         value={selectedSellerId}
                         onChange={(e) => setSelectedSellerId(e.target.value)}
                         className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 kanit-text cursor-pointer"
                      >
                         <option value="">- เลือกผู้ขาย / ผู้แนะนำ (ไม่ระบุก็ได้) -</option>
                         {staffData.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.position || s.role})</option>
                         ))}
                      </select>
                   )}
                </div>

               <div className="space-y-3 shrink-0">
                  <label className="block text-sm font-bold text-slate-700 kanit-text">เลือกวิธีชำระเงิน</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                     <button onClick={() => setPaymentMethod('cash')} className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all kanit-text ${paymentMethod === 'cash' ? 'ring-2 ring-sky-500 border-transparent bg-sky-50 text-sky-700 shadow-sm scale-[1.02] z-10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <Banknote size={24} /> <span className="text-xs sm:text-sm font-bold whitespace-nowrap">เงินสด</span>
                     </button>
                     <button onClick={() => setPaymentMethod('transfer')} className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all kanit-text ${paymentMethod === 'transfer' ? 'ring-2 ring-sky-500 border-transparent bg-sky-50 text-sky-700 shadow-sm scale-[1.02] z-10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <QrCode size={24} /> <span className="text-xs sm:text-sm font-bold whitespace-nowrap">โอนเงิน (QR)</span>
                     </button>
                     <button onClick={() => setPaymentMethod('credit')} className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all kanit-text col-span-2 ${paymentMethod === 'credit' ? 'ring-2 ring-sky-500 border-transparent bg-sky-50 text-sky-700 shadow-sm scale-[1.02] z-10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <CreditCard size={24} /> <span className="text-xs sm:text-sm font-bold whitespace-nowrap">บัตรเครดิต</span>
                     </button>
                  </div>

                  {paymentMethod === 'transfer' && (
                     <div className="mt-4 border border-sky-100 bg-sky-50/50 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                        <p className="text-xs sm:text-sm font-bold text-slate-500 kanit-text mb-3 sm:mb-4 text-center">สแกน QR Code พร้อมเพย์</p>
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0 relative mb-4">
                            <div className="absolute inset-0 border-2 border-sky-400 rounded-xl animate-pulse opacity-40 pointer-events-none"></div>
                            <img 
                               src={`https://promptpay.io/0631434927/${grandTotal}.png`} 
                               alt="PromptPay QR" 
                               className="w-48 h-48 sm:w-56 sm:h-56 object-contain pointer-events-none select-none relative z-10" 
                            />
                        </div>
                        <div className="text-center flex flex-col items-center w-full">
                            <h4 className="text-lg sm:text-xl font-black text-sky-700 kanit-text leading-tight mb-1">นาย พุทธินัทธ์ จงเจริญเลิศสิน</h4>
                            <p className="text-xs sm:text-sm text-slate-500 font-data mb-3">เบอร์พร้อมเพย์: 063-143-4927</p>
                            <div className="bg-white px-5 py-3 rounded-2xl border border-sky-100 shadow-sm w-full max-w-[240px]">
                               <p className="text-[10px] sm:text-xs text-slate-400 font-bold kanit-text mb-0.5">ยอดชำระสุทธิ</p>
                               <p className="text-xl sm:text-2xl font-black text-sky-600 font-data leading-none">{formatCurrency(grandTotal)}</p>
                            </div>
                        </div>
                     </div>
                  )}
               </div>

               <div className="mt-auto pt-4 flex flex-col justify-end shrink-0">
                 {checkoutSuccess ? (
                    <div className="flex flex-col items-center py-2 animate-in fade-in zoom-in slide-in-from-bottom-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-base kanit-text">ทำรายการสำเร็จ</h4>
                        <p className="text-slate-500 text-xs kanit-text mb-4">บันทึกข้อมูลการขายเรียบร้อยแล้ว</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                           <button onClick={() => handlePrintReceipt(posHistoryData[0], '80mm')} className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold transition-colors kanit-text text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border border-indigo-100 shadow-sm active:scale-95"><Printer size={16}/> สลิป (80mm)</button>
                           <button onClick={() => handlePrintReceipt(posHistoryData[0], 'A4')} className="py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl font-bold transition-colors kanit-text text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border border-sky-100 shadow-sm active:scale-95"><Printer size={16}/> ใบเสร็จ (A4)</button>
                           <button onClick={closeCheckoutAndReset} className="col-span-2 sm:col-span-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors kanit-text text-sm flex items-center justify-center shadow-sm active:scale-95">เสร็จสิ้น</button>
                        </div>
                    </div>
                 ) : (
                    <button 
                       onClick={confirmPayment}
                       disabled={isProcessingPayment}
                       className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-md shadow-sky-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 kanit-text text-base"
                    >
                       {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt size={18} />}
                       {isProcessingPayment ? 'กำลังบันทึก...' : 'ยืนยันการรับเงิน'}
                    </button>
                 )}
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* History Modal */}
      {historyModal.isOpen && createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${historyModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
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
                            <table className="table-auto w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text"><th className="w-[19%] p-4 font-bold">วันที่/เวลา</th><th className="w-[16%] p-4 font-bold">เลขที่บิล</th><th className="w-[16%] p-4 font-bold">ลูกค้า</th><th className="w-[19%] p-4 font-bold text-right">ยอดรวม</th><th className="w-[16%] p-4 font-bold text-center">วิธีชำระ</th><th className="w-[14%] p-4 font-bold text-center">สถานะ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skel-hist-${idx}`} className="border-b border-slate-50"><td className="p-4"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[80px] bg-slate-200 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-full animate-pulse mx-auto"></div></td></tr>
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
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <button onClick={() => handlePrintReceipt(selectedHistoryTxn, '80mm')} title="พิมพ์สลิป 80mm" className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                            <Printer size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">สลิป (80mm)</span>
                                        </button>
                                        <button onClick={() => handlePrintReceipt(selectedHistoryTxn, 'A4')} title="พิมพ์ใบเสร็จ A4" className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                            <Printer size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">A4</span>
                                        </button>
                                        <button onClick={handleEditTxn} className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                            <Pencil size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">แก้ไขข้อมูล</span>
                                        </button>
                                    </div>
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
                         <div className="p-4 sm:p-6 flex-1 bg-white">
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
                                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 kanit-text">
                                                <span>🩺 แพทย์: <strong className="text-slate-800">{selectedHistoryTxn.doctorName || selectedHistoryTxn.doctor_name || '-'}</strong></span>
                                                <span className="text-slate-300">|</span>
                                                <span>💼 ผู้ขาย: <strong className="text-slate-800">{selectedHistoryTxn.sellerName || selectedHistoryTxn.seller_name || selectedHistoryTxn.staffName || selectedHistoryTxn.staff_name || '-'}</strong></span>
                                            </div>
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
                                                    options={[{value:'completed', label:'✅ สำเร็จ'}, {value:'cancelled', label:'❌ ยกเลิก'}]}
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
                                                    {selectedHistoryTxn.status === 'completed' ? 'สำเร็จ' : selectedHistoryTxn.status === 'cancelled' ? 'ยกเลิก' : selectedHistoryTxn.status}
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

                                {isEditingHistory && (
                                    <div className="md:col-span-2 p-4 rounded-xl border bg-amber-50/40 border-amber-200/80 space-y-3 relative z-10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-500"><Award size={12}/></div>
                                            <p className="text-[11px] sm:text-xs font-bold text-amber-900 kanit-text uppercase tracking-wider">ข้อมูลแพทย์ผู้ตรวจรักษา & ผู้แนะนำ/ผู้ขาย</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 mb-1 kanit-text flex items-center gap-1">
                                                    <Stethoscope size={12} className="text-emerald-600"/> แพทย์ผู้ตรวจรักษา (ค่า DF)
                                                </label>
                                                <select
                                                    value={historyEditForm.doctorId || ''}
                                                    onChange={e => {
                                                        const docId = e.target.value;
                                                        const doc = (staffData || []).find(s => s.id === docId);
                                                        setHistoryEditForm({
                                                            ...historyEditForm,
                                                            doctorId: docId,
                                                            doctor_id: docId,
                                                            doctorName: doc ? doc.name : '',
                                                            doctor_name: doc ? doc.name : '',
                                                            doctor: doc ? doc.name : ''
                                                        });
                                                    }}
                                                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 kanit-text cursor-pointer"
                                                >
                                                    <option value="">- ไม่ระบุแพทย์ (ขายเฉพาะสินค้า) -</option>
                                                    {doctorsList.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name} ({d.position || 'แพทย์'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 mb-1 kanit-text flex items-center gap-1">
                                                    <Award size={12} className="text-amber-500"/> ผู้แนะนำ / ผู้ขาย (ค่าคอมยอดขาย)
                                                </label>
                                                <select
                                                    value={historyEditForm.sellerId || historyEditForm.staffId || ''}
                                                    onChange={e => {
                                                        const sellerId = e.target.value;
                                                        const seller = (staffData || []).find(s => s.id === sellerId);
                                                        setHistoryEditForm({
                                                            ...historyEditForm,
                                                            sellerId: sellerId,
                                                            seller_id: sellerId,
                                                            sellerName: seller ? seller.name : '',
                                                            seller_name: seller ? seller.name : '',
                                                            staffId: sellerId,
                                                            staff_id: sellerId,
                                                            staffName: seller ? seller.name : '',
                                                            staff_name: seller ? seller.name : ''
                                                        });
                                                    }}
                                                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 kanit-text cursor-pointer"
                                                >
                                                    <option value="">- ไม่ระบุผู้ขาย / แคชเชียร์ -</option>
                                                    {staffData.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.position || s.role})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            <h5 className="font-bold text-slate-700 kanit-text mb-3 flex items-center gap-2"><ShoppingCart size={16} className="text-sky-500" /> รายการสินค้า ({selectedHistoryTxn.items?.length || 0})</h5>
                            <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 w-full">
                                {/* Desktop Table */}
                                <div className="hidden sm:block overflow-x-auto w-full">
                                    <table className="table-auto w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium kanit-text sticky top-0"><th className="w-[16%] p-3 text-center">#</th><th className="w-[32%] p-3">รายการสินค้า / บริการ</th><th className="w-[16%] p-3 text-center ">จำนวน</th><th className="w-[19%] p-3 text-right ">ราคา/หน่วย</th><th className="w-[17%] p-3 text-right ">รวม (บาท)</th></tr>
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
                                <div className="sm:hidden flex flex-col divide-y divide-slate-50 bg-slate-50/30">
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
                            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
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
                ) : localHistoryData && localHistoryData.length > 0 ? (
                    // --- Existing List View ---
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden m-4 sm:m-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto overflow-y-hidden">
                            <table className="table-auto w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text"><th className="w-[19%] p-4 font-bold">วันที่/เวลา</th><th className="w-[16%] p-4 font-bold">เลขที่บิล</th><th className="w-[16%] p-4 font-bold">ลูกค้า</th><th className="w-[19%] p-4 font-bold text-right">ยอดรวม</th><th className="w-[16%] p-4 font-bold text-center">วิธีชำระ</th><th className="w-[14%] p-4 font-bold text-center">สถานะ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* ใช้ .slice เพื่อจำกัดจำนวนการแสดงผลแบบ Infinite Scroll */}
                                    {localHistoryData.map((txn, idx) => (
                                        <tr key={txn.id || idx} onClick={() => handleViewHistoryTxn(txn)} className="hover:bg-sky-50/50 cursor-pointer transition-colors font-data text-sm space-row-animation group" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                                            <td className="p-4 text-slate-600">{formatDateTime(txn.createdAt)}</td>
                                            <td className="p-4 font-bold text-sky-600 kanit-text group-hover:text-sky-700">{txn.id}</td>
                                            <td className="p-4 text-slate-800 kanit-text font-medium">{txn.patientName || '-'}</td>
                                            <td className="p-4 font-bold text-slate-800 text-right">{formatCurrency(txn.grandTotal ?? txn.grand_total ?? txn.netAmount ?? txn.net_amount ?? txn.totalAmount ?? txn.total_amount ?? txn.amount)}</td>
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
                                        <tr key={`skel-hist-more-${idx}`} className="border-b border-slate-50"><td className="p-4"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[80px] bg-slate-200 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-full animate-pulse mx-auto"></div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-slate-50/50">
                            {localHistoryData.map((txn, idx) => (
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
                                            <div className="font-black text-sky-600 font-data text-lg leading-none">{formatCurrency(txn.grandTotal ?? txn.grand_total ?? txn.netAmount ?? txn.net_amount ?? txn.totalAmount ?? txn.total_amount ?? txn.amount)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isHistoryLoadingMore && Array.from({ length: 3 }).map((_, idx) => (
                                <div key={`skel-mob-${idx}`} className="p-4 bg-white flex flex-col gap-3 border-b border-slate-100">
                                    <div className="flex justify-between"><div className="h-5 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div><div className="h-5 w-full max-w-[64px] bg-slate-200 rounded-md animate-pulse"></div></div>
                                    <div className="flex justify-between items-end mt-2"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div><div className="h-6 w-full max-w-[80px] bg-slate-200 rounded animate-pulse"></div></div>
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
        </div>,
        document.body
      )}

      {/* --- Modal สรุปยอดขายประจำวัน (Daily Sales Summary Modal) --- */}
      {dailySummaryModal.isOpen && createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm ${dailySummaryModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${dailySummaryModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold kanit-text flex items-center gap-2">
                    สรุปยอดขายประจำวัน
                  </h2>
                  <p className="text-xs text-blue-100 kanit-text">
                    ประจำวันที่ {dailySummaryData?.date || new Date().toLocaleDateString('th-TH')} • {currentBranch?.name || 'สาขาหลัก'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => dailySummaryModal.close()}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              {isSummaryLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm kanit-text font-medium">กำลังคำนวณยอดขายประจำวัน...</p>
                </div>
              ) : (
                <>
                  {/* Hero Total Amount */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl p-4 sm:p-5 text-center">
                    <span className="text-xs sm:text-sm font-semibold text-blue-700 kanit-text uppercase tracking-wide">
                      ยอดขายรวมสุทธิวันนี้
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-blue-900 font-data my-1">
                      ฿{Number(dailySummaryData?.totalAmount || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs sm:text-sm text-slate-500 font-medium kanit-text">
                      <span className="bg-white/80 border border-blue-100 px-3 py-1 rounded-full shadow-2xs">
                        🧾 ทั้งหมด <strong>{dailySummaryData?.billsCount || 0}</strong> บิล
                      </span>
                      <span className="bg-white/80 border border-blue-100 px-3 py-1 rounded-full shadow-2xs">
                        👥 คนไข้ <strong>{dailySummaryData?.patientsCount || 0}</strong> ท่าน
                      </span>
                    </div>
                  </div>

                  {/* Payment Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 kanit-text mb-1">
                        <span className="flex items-center gap-1.5"><Banknote size={15} /> เงินสด</span>
                        <span className="text-[11px] text-emerald-600 bg-white/70 px-1.5 py-0.5 rounded">{dailySummaryData?.cashCount || 0} บิล</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-emerald-950 font-data">
                        ฿{Number(dailySummaryData?.cashAmount || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-semibold text-sky-800 kanit-text mb-1">
                        <span className="flex items-center gap-1.5"><QrCode size={15} /> เงินโอน</span>
                        <span className="text-[11px] text-sky-600 bg-white/70 px-1.5 py-0.5 rounded">{dailySummaryData?.transferCount || 0} บิล</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-sky-950 font-data">
                        ฿{Number(dailySummaryData?.transferAmount || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs font-semibold text-purple-800 kanit-text mb-1">
                        <span className="flex items-center gap-1.5"><CreditCard size={15} /> บัตรเครดิต</span>
                        <span className="text-[11px] text-purple-600 bg-white/70 px-1.5 py-0.5 rounded">{dailySummaryData?.creditCount || 0} บิล</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-purple-950 font-data">
                        ฿{Number(dailySummaryData?.creditAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider kanit-text mb-2 flex items-center justify-between">
                      <span>รายการบิลวันนี้ ({dailySummaryData?.billsCount || 0})</span>
                      <span className="text-[11px] font-normal text-slate-400">เรียงตามเวลาล่าสุด</span>
                    </h3>
                    
                    {(!dailySummaryData?.transactions || dailySummaryData.transactions.length === 0) ? (
                      <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs text-slate-400 kanit-text">ยังไม่มียอดขายในวันนี้</p>
                      </div>
                    ) : (
                      <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto custom-scrollbar">
                        {dailySummaryData.transactions.map((tx, idx) => {
                          const amt = Number(tx.net_amount ?? tx.netAmount ?? tx.grandTotal ?? tx.total_amount ?? 0);
                          const pMethod = tx.payment_method || tx.paymentMethod || 'cash';
                          const pMethodThai = pMethod === 'cash' ? 'เงินสด' : (pMethod === 'transfer' ? 'เงินโอน' : (pMethod === 'credit' ? 'บัตรเครดิต' : pMethod));
                          const pName = tx.patient_name || tx.patientName || 'ลูกค้าทั่วไป';
                          const recNo = tx.receipt_no || tx.receiptNo || tx.id || '-';
                          const timeStr = tx.created_at ? new Date(tx.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';

                          return (
                            <div key={tx.id || idx} className="p-2.5 sm:p-3 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs sm:text-sm">
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold text-slate-800 truncate kanit-text flex items-center gap-1.5">
                                  <span className="text-blue-600 font-mono text-[11px] sm:text-xs">[{recNo}]</span>
                                  <span>{pName}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>🕒 {timeStr} น.</span>
                                  <span>•</span>
                                  <span className="text-slate-500 font-medium">{pMethodThai}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-slate-900 font-data text-sm sm:text-base">
                                  ฿{amt.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button 
                onClick={() => dailySummaryModal.close()} 
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium kanit-text hover:bg-slate-100 transition-colors text-xs sm:text-sm"
              >
                ปิดหน้าต่าง
              </button>

              <button
                onClick={handleBroadcastDailySummary}
                disabled={isSendingSummary || isSummaryLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold kanit-text shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
              >
                {isSendingSummary ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังส่งแจ้งเตือน...</span>
                  </>
                ) : (
                  <>
                    <Megaphone size={16} />
                    <span>📢 ส่งสรุปยอดเข้า LINE & Discord</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* --- Modal เลือกคอร์สแชร์ข้ามคนไข้ (Cross-Patient Course Sharing) --- */}
      {isShareCourseModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg h-[580px] max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold kanit-text">ใช้คอร์สแชร์ (จากคนไข้ท่านอื่น)</h3>
                  <p className="text-xs text-indigo-100 font-data">ผู้รับบริการ: {patientSearchTerm || selectedPatientId || 'ลูกค้าทั่วไป'}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsShareCourseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {/* ช่องค้นหา */}
              <div className="shrink-0">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 kanit-text">
                  ค้นหาเจ้าของคอร์ส (ชื่อ, นามสกุล, ชื่อเล่น, HN หรือเบอร์โทรศัพท์)
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-data text-slate-700"
                    placeholder="พิมพ์ชื่อ, นามสกุล, ชื่อเล่น, HN หรือเบอร์โทร..."
                    value={shareOwnerSearch}
                    onChange={(e) => {
                      setShareOwnerSearch(e.target.value);
                      setSelectedOwnerPatient(null);
                    }}
                    autoFocus
                  />
                  {shareOwnerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setShareOwnerSearch('');
                        setSelectedOwnerPatient(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* รายชื่อคนไข้เจ้าของคอร์ส (แสดงเฉพาะผู้ที่มีคอร์สยังไม่หมดอายุและมีรอบคงเหลือ) */}
              {!selectedOwnerPatient && (
                <div className="flex-1 min-h-0 flex flex-col gap-2">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-600 kanit-text">
                      {shareOwnerSearch 
                        ? `ผลการค้นหา (${filteredShareOwners.length} ท่าน)` 
                        : `คนไข้ที่มีคอร์สพร้อมแชร์ (${eligibleShareOwners.length} ท่าน)`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-data">เฉพาะคอร์สที่ยังไม่หมดอายุและมีรอบคงเหลือ</span>
                  </div>

                  <div 
                    onScroll={(e) => {
                      const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
                      if (scrollTop + clientHeight >= scrollHeight - 40) {
                        setVisibleShareOwnerCount(prev => Math.min(prev + 15, filteredShareOwners.length));
                      }
                    }}
                    className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2 p-0.5"
                  >
                    {filteredShareOwners.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                        <Users className="w-12 h-12 mb-2 opacity-20 text-indigo-500" />
                        <p className="text-xs font-bold kanit-text text-slate-600">ไม่พบคอร์สที่สามารถแชร์ได้</p>
                        <p className="text-[11px] text-slate-400 font-data mt-1 max-w-[280px]">
                          {shareOwnerSearch 
                            ? 'ไม่พบคนไข้ที่มีคอร์สตรงกับคำค้นหา หรือคอร์สถูกใช้ครบแล้ว / หมดอายุ' 
                            : 'ขณะนี้ยังไม่มีคนไข้ที่มีคอร์สคงเหลือในระบบ'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {filteredShareOwners.slice(0, visibleShareOwnerCount).map(owner => (
                          <button
                            key={owner.id}
                            type="button"
                            onClick={() => setSelectedOwnerPatient(owner.raw)}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 transition-all text-left shadow-xs hover:shadow-md group active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <User size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-600 kanit-text truncate">
                                  {owner.fullName} {owner.nickname && <span className="text-xs font-normal text-slate-500">({owner.nickname})</span>}
                                </div>
                                <div className="text-[11px] text-slate-400 font-data flex items-center gap-2 mt-0.5">
                                  <span className="font-semibold text-slate-600">{owner.id}</span>
                                  {owner.phone && <span>• โทร {owner.phone}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-2 text-right">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 group-hover:bg-indigo-100 transition-colors inline-flex items-center gap-1">
                                <Award size={12} className="text-indigo-500" />
                                {owner.courses.length} คอร์ส
                              </span>
                            </div>
                          </button>
                        ))}
                        {visibleShareOwnerCount < filteredShareOwners.length && (
                          <div className="py-2.5 text-center text-xs text-indigo-600 font-data flex items-center justify-center gap-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                            <Loader2 size={13} className="animate-spin text-indigo-500" />
                            <span>กำลังแสดง {Math.min(visibleShareOwnerCount, filteredShareOwners.length)} จาก {filteredShareOwners.length} ท่าน (เลื่อนลงเพื่อดูเพิ่ม)</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* แสดงคอร์สของเจ้าของที่เลือก */}
              {selectedOwnerPatient && (
                <div className="flex-1 min-h-0 flex flex-col gap-3">
                  {/* การ์ดข้อมูลเจ้าของคอร์ส */}
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-100/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        <UserCheck size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">เจ้าของคอร์สที่เลือก</span>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 kanit-text truncate">
                          {selectedOwnerPatient.id || selectedOwnerPatient.hn} - {getDisplayPatientName(selectedOwnerPatient)} {selectedOwnerPatient.nickname && <span className="text-xs font-normal text-slate-500">({selectedOwnerPatient.nickname})</span>}
                        </div>
                        {selectedOwnerPatient.phone && (
                          <div className="text-[11px] text-slate-500 font-data mt-0.5">โทร: {selectedOwnerPatient.phone}</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOwnerPatient(null)}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-200 transition-all shadow-xs active:scale-95 shrink-0 ml-2"
                    >
                      เปลี่ยน
                    </button>
                  </div>

                  {/* รายการคอร์สที่เลือกได้ */}
                  <div className="flex-1 min-h-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-slate-700 kanit-text">เลือกคอร์สที่ต้องการตัดรอบ:</span>
                      <span className="text-[10px] text-slate-400 font-data">คลิกที่คอร์สเพื่อเพิ่มเข้าตะกร้า</span>
                    </div>

                    <div 
                      onScroll={(e) => {
                        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
                        if (scrollTop + clientHeight >= scrollHeight - 30) {
                          setVisibleShareCourseCount(prev => prev + 10);
                        }
                      }}
                      className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-2 p-0.5"
                    >
                      {(() => {
                        const ownerIdStr = String(selectedOwnerPatient.id || selectedOwnerPatient.hn || '').trim().toLowerCase();
                        const ownerCourses = availableShareableCourses.filter(c => {
                          const cPid = String(c.patientId || c.patient_id || '').trim().toLowerCase();
                          return cPid === ownerIdStr || (ownerIdStr.replace(/\D/g, '') && cPid.replace(/\D/g, '') === ownerIdStr.replace(/\D/g, ''));
                        });

                        if (ownerCourses.length === 0) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 kanit-text">
                              คนไข้ท่านนี้ไม่มีคอร์สที่สามารถใช้งานได้ (อาจหมดอายุหรือใช้ครบแล้ว)
                            </div>
                          );
                        }

                        const displayedCourses = ownerCourses.slice(0, visibleShareCourseCount);

                        return (
                          <>
                            {displayedCourses.map(course => {
                              const courseName = course.courseName || course.course_name || course.name;
                              const rem = Number(course.remainingSessions ?? course.remaining_sessions) || 1;
                              const total = Number(course.totalSessions ?? course.total_sessions) || 1;
                              const isAlreadyInCart = cart.some(item => item?.product?.courseId === course?.id);
                              const ownerFullName = getDisplayPatientName(selectedOwnerPatient);

                              return (
                                <button
                                  key={course.id}
                                  type="button"
                                  disabled={isAlreadyInCart}
                                  onMouseEnter={(e) => handleCourseMouseEnter(e, { name: courseName, rem, total, owner: ownerFullName })}
                                  onMouseLeave={handleCourseMouseLeave}
                                  onTouchStart={(e) => handleCourseTouchStart(e, { name: courseName, rem, total, owner: ownerFullName })}
                                  onTouchEnd={handleCourseTouchEnd}
                                  onClick={() => {
                                    const courseProduct = products.find(p => p.id === course.productId) || {
                                      id: course.productId,
                                      name: courseName,
                                      price: 0,
                                      type: 'คอร์สเดิม',
                                      icon: 'Package'
                                    };
                                    const redeemItem = {
                                      product: {
                                        ...courseProduct,
                                        id: `REDEEM_${course.id}`,
                                        price: 0,
                                        isRedeem: true,
                                        courseId: course.id,
                                        courseName: courseName,
                                        ownerPatientId: selectedOwnerPatient.id || selectedOwnerPatient.hn,
                                        ownerPatientName: ownerFullName,
                                        name: `${courseName} (${rem}/${total})`
                                      },
                                      quantity: 1
                                    };
                                    setCart(prev => [...prev, redeemItem]);
                                    setIsShareCourseModalOpen(false);
                                    showToast(`เพิ่มการตัดคอร์สแชร์ของ ${ownerFullName} เข้าตะกร้าแล้ว`, 'success');
                                  }}
                                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                    isAlreadyInCart 
                                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                                      : 'bg-white hover:bg-purple-50 border-slate-200 hover:border-purple-300 shadow-sm active:scale-[0.99]'
                                  }`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="text-xs sm:text-sm font-bold text-slate-800 kanit-text truncate">{courseName}</div>
                                    <div className="text-[11px] text-slate-400 font-data flex flex-wrap gap-x-2 mt-0.5">
                                      {(course.purchasedAt || course.purchased_at) && (
                                        <span>ซื้อเมื่อ: {formatDate(course.purchasedAt || course.purchased_at)}</span>
                                      )}
                                      {(course.expireDate || course.expire_date) && (
                                        <span className="text-amber-600 font-semibold">หมดอายุ: {formatDate(course.expireDate || course.expire_date)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100 block">
                                      คงเหลือ {rem}/{total} ครั้ง
                                    </span>
                                    {isAlreadyInCart && <div className="text-[10px] text-amber-500 font-bold mt-1">อยู่ในตะกร้าแล้ว</div>}
                                  </div>
                                </button>
                              );
                            })}
                            {visibleShareCourseCount < ownerCourses.length && (
                              <div className="py-2.5 text-center text-xs text-indigo-600 font-data flex items-center justify-center gap-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                <Loader2 size={13} className="animate-spin text-indigo-500" />
                                <span>กำลังแสดง {Math.min(visibleShareCourseCount, ownerCourses.length)} จาก {ownerCourses.length} คอร์ส (เลื่อนลงเพื่อดูเพิ่ม)</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsShareCourseModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all kanit-text active:scale-95"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Light Glassmorphism Compact Course Tooltip Portal */}
      {typeof document !== 'undefined' && activeCourseTooltip && createPortal(
        <div 
          className={`fixed pointer-events-none transform -translate-x-1/2 select-none transition-all duration-150 ${
            activeCourseTooltip.placement === 'bottom' ? 'translate-y-0 mt-1.5' : '-translate-y-full -mt-1.5'
          }`}
          style={{ 
            left: `${activeCourseTooltip.x}px`, 
            top: `${activeCourseTooltip.y}px`,
            zIndex: 999999 
          }}
        >
          {activeCourseTooltip.placement === 'bottom' && (
            <div className="w-2.5 h-2.5 bg-white/95 backdrop-blur-md rotate-45 mx-auto -mb-1.5 border-l border-t border-indigo-100/80 shadow-2xs"></div>
          )}
          <div className="bg-white/95 backdrop-blur-md text-slate-700 px-3 py-2 rounded-xl shadow-xl border border-indigo-100/90 w-max max-w-[200px] sm:max-w-[240px] text-center kanit-text ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-xs font-normal text-slate-700 leading-snug break-words whitespace-normal">
              {activeCourseTooltip.name}{' '}
              <span className="text-indigo-600 font-data font-semibold text-[11px] whitespace-nowrap">
                ({activeCourseTooltip.rem}/{activeCourseTooltip.total})
              </span>
            </div>
            {activeCourseTooltip.owner && (
              <div className="text-[10px] text-purple-600 font-normal mt-0.5 break-words whitespace-normal">
                (ของ: {activeCourseTooltip.owner})
              </div>
            )}
          </div>
          {activeCourseTooltip.placement !== 'bottom' && (
            <div className="w-2.5 h-2.5 bg-white/95 backdrop-blur-md rotate-45 mx-auto -mt-1.5 border-r border-b border-indigo-100/80 shadow-2xs"></div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default React.memo(POSSystem);

