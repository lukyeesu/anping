import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { GOOGLE_SCRIPT_URL } from './global/constants';
import { callSupabase, supabase, jsToRow, rowToJS } from './lib/supabase';
import { subscribeStoreUpdates, clearAllLocalStores, getLocalStore, upsertLocalStore, deleteFromLocalStore, resetDatabasePurgedFlag } from './lib/offlineStore';
import { ToastContainer } from './global/helpers';
import { triggerGlobalToast } from './global/helpers';
import ResetPasswordScreen from './pages/ResetPasswordScreen';
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
  Lock, Home, Save, UserCheck, Key, RotateCcw, CloudDownload, Database, Keyboard, FlaskConical, Ticket,
  BookOpen
} from 'lucide-react';

// --- สไตล์พื้นฐาน (Design Tokens) ---
import { rAFThrottle, formatDate, formatDateTime, formatStatNumber, formatTreatmentRecord, getDynamicTextSize, parsePatientName, getPatientFullName, generateNextHN, getAgeString, getPatientId, useModal, useSwipeDown, getPatientLastVisitStr, formatCurPrint, bahtTextPrint, globalGenerateInformedConsentHtml, globalGenerateRecordHtml, globalGenerateOpdHtml, globalGenerateMedicalCertificateHtml, globalGenerateReceiptHtml, getEffectiveApptStatus, getEffectiveApptDatetimeStr, getEffectiveApptIsoDate, parseThaiDateToISO, parseAnyDate, isSameDay, formatFinTime, formatFinCurrency, getFinDynamicTextClass } from './global/helpers';

// ... other imports if any
import ProfileManager from './pages/ProfileManager';
import LoginScreen from './pages/LoginScreen';
import SettingsManager from './pages/SettingsManager';
import PdpaConsentForm from './pages/PdpaConsentForm';
import ReportsManager from './pages/ReportsManager';
import StaffManager from './pages/StaffManager';
import FinancePage from './pages/FinancePage';
import FinanceTableSection from './pages/FinanceTableSection';
import TransactionCard from './pages/TransactionCard';
import TransactionRow from './pages/TransactionRow';
import InventoryManager from './pages/InventoryManager';
import BranchManager from './pages/BranchManager';
import CatalogManager from './pages/CatalogManager';
import CouponManager from './pages/CouponManager';
import POSSystem from './pages/POSSystem';
import MedicalRecords from './pages/MedicalRecords';
import PatientModal from './pages/PatientModal';
import Dashboard from './pages/Dashboard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import StatCard from './pages/StatCard';
import AppointmentManager from './pages/AppointmentManager';
import CalendarView from './pages/CalendarView';
import CalendarDay from './pages/CalendarDay';
import CustomSelect from './pages/CustomSelect';
import PlaceholderPage from './pages/PlaceholderPage';
import PortalDropdown from './pages/PortalDropdown';
import AnimatedModal from './pages/AnimatedModal';
import Skeleton from './pages/Skeleton';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import DisplayAdsManager from './pages/DisplayAdsManager';
import CustomerDisplay from './pages/CustomerDisplay';
import { DEFAULT_POS_QR_SETTINGS } from './lib/promptpay';
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

// --- Map ไอคอนที่สามารถเลือกได้สำหรับระบบ POS ---


 
// VISION_API_KEY ถูกย้ายไปเก็บที่ Vercel Environment Variables แล้ว

// --- เพิ่มตัวแปร Global สำหรับชื่อเดือนภาษาไทย ---





// --- Throttle helper using requestAnimationFrame to prevent scroll layout thrashing ---


// --- ฟังก์ชันและ Component เสริมที่ขาดหายไป ---




// --- เพิ่มฟังก์ชันจัดการตัวเลขใน Card ให้อัตโนมัติและใส่คอมม่า ---




// --- ฟังก์ชันแยกส่วนชื่ออัตโนมัติแบบอัจฉริยะ ---










/**
 * Hook สำหรับจัดการ Modal ที่มีแอนิเมชันปิด
 */












// --- GLOBAL PRINT TEMPLATES (แม่แบบการพิมพ์เอกสารสากล) ---




























// --- [NEW] Unified Date Parsing & Comparison to prevent BE/CE mismatch bugs ---






// [UPDATED COMPONENT] Calendar View Implementation - HIGH PERFORMANCE OPTIMIZED

// --- [PERFORMANCE OPTIMIZATION] คอมโพเนนต์ช่องวันที่ในปฏิทิน (แยกออกมาเพื่อใช้ React.memo) ---


// --- [PERFORMANCE OPTIMIZATION] คอมโพเนนต์ช่องวันที่ในปฏิทิน (แยกออกมาเพื่อใช้ React.memo) ---




// เพิ่ม prop setPatientsData เพื่อให้สามารถเพิ่มคนไข้ใหม่จากหน้านัดหมายได้


// --- เพิ่ม Component StatCard ที่หายไปสำหรับหน้า Dashboard ---






// --- คอมโพเนนต์ Modal เวชระเบียน (แยกออกมาเพื่อประสิทธิภาพ) ---

// เปลี่ยนแปลงบรรทัดรับ Props ของ MedicalRecords


// --- ระบบ POS (Point of Sale) ---
// แก้ไข: เพิ่ม Props สำหรับคลังสินค้าเพื่อตัดสต็อกอัตโนมัติ


// --- ระบบฐานข้อมูลรายการ (Catalog Manager) ---


// --- ระบบจัดการสาขา (Branch Manager) ---


// --- ระบบคลังสินค้า (Inventory Manager) ---


// --- [OPTIMIZATION] Finance Helper Functions ---






// --- [OPTIMIZATION] Memoized Row and Card components ---




// --- [COMPONENT ISOLATION] React.memo wrapped list to prevent re-rendering when modals open ---




// --- ระบบจัดการพนักงาน (Staff Manager) ---


// --- [NEW] ระบบรายงานและศูนย์รวมเอกสาร (Reports & Documents Manager) ---


// ==========================================
// ส่วนจัดการตั้งค่าระบบ (Settings Manager)
// ==========================================






// ส่วนจัดการโปรไฟล์พนักงาน (Profile Manager)


// --- [NEW] Global Toast pub/sub system to isolate rendering from the main App component ---
const toastSubscribers = new Set();
let globalToasts = [];

// --- [NEW] Restore Mock Data to prevent ReferenceErrors ---
const mockBranches = [
  { id: 'b1', name: 'สาขาหลัก (กรุงเทพ)' },
  { id: 'b2', name: 'สาขาเชียงใหม่' },
];

const mockPatients = [
  { id: 'HN001', name: 'สมชาย ใจดี', phone: '081-234-5678', lastVisit: '2023-10-25', branchId: 'b1' },
  { id: 'HN002', name: 'สมหญิง รักสวย', phone: '089-876-5432', lastVisit: '2023-10-26', branchId: 'b2' },
  { id: 'HN003', name: 'มีชัย ทำดี', phone: '082-333-4444', lastVisit: '2023-10-27', branchId: 'b1' },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'exec_dashboard', label: 'แดชบอร์ดผู้บริหาร', icon: TrendingUp },
  { id: 'records', label: 'เวชระเบียน', icon: Users },
  { id: 'queue', label: 'นัดหมาย', icon: CalendarRange },
  { id: 'pos', label: 'POS', icon: Calculator },
  { id: 'coupons', label: 'คูปอง', icon: Ticket },
  { id: 'catalog', label: 'สินค้า/บริการ', icon: Tag },
  { id: 'inventory', label: 'คลังสินค้า', icon: Package },
  { id: 'finance', label: 'การเงิน', icon: Banknote },
  { id: 'staff', label: 'พนักงาน', icon: UserCog },
  { id: 'branch', label: 'สาขา', icon: Building2 },
  { id: 'reports', label: 'รายงาน', icon: BarChart3 },
  { id: 'display_ads', label: 'จัดการโฆษณา', icon: Megaphone },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
];

const MAIN_NAV_ORDER = ['dashboard', 'records', 'queue', 'pos', 'reports'];
const OTHER_PREFERRED_ORDER = ['exec_dashboard', 'coupons', 'catalog', 'inventory', 'finance', 'staff', 'branch', 'display_ads', 'settings'];

export default function App() {

  const getUrlParam = (key) => {
    if (typeof window === 'undefined') return null;
    const searchParams = new URLSearchParams(window.location.search);
    const searchVal = searchParams.get(key);
    if (searchVal) return searchVal;
    if (window.location.hash && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?') + 1));
      return hashParams.get(key);
    }
    return null;
  };

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pdpaToken = getUrlParam('pdpa');
  const pdpaHn = getUrlParam('hn');
  const resetToken = getUrlParam('reset_token') || getUrlParam('token');
  const isPrintUrl = Boolean(
    getUrlParam('print_pos') || 
    getUrlParam('print_receipt') || 
    getUrlParam('print_opd') || 
    getUrlParam('print_opd_hn') ||
    getUrlParam('print_cert') ||
    getUrlParam('print_bill')
  );

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('clinic_isLoggedIn') === 'true';
    }
    return false;
  });

  const [posProducts, setPosProducts] = useState([]); 
  const [staffData, setStaffData] = useState([]); // เพิ่ม State ข้อมูลพนักงาน
  const [isAuthDataFetched, setIsAuthDataFetched] = useState(false);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [loadedMonths, setLoadedMonths] = useState(new Set()); // ติดตามเดือนที่โหลดแล้ว (YYYY-MM)
  const [isQueueFetching, setIsQueueFetching] = useState(false);
  const fetchingMonthsRef = useRef(new Set()); // ใช้ Ref ติดตามการโหลดที่กำลังดำเนินอยู่เพื่อป้องกันโหลดซ้ำซ้อน

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('clinic_currentUser');
      if (saved) return JSON.parse(saved);
    }
    return { id: 'admin1', name: 'Admin User', role: 'admin', category: 'staff' };
  });

  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  


  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const callParam = urlParams.get('call') || urlParams.get('tel');
    if (callParam) {
      const clean = String(callParam).replace(/\D/g, '');
      if (clean) {
        window.location.href = `tel:${clean}`;
      }
    }
  }, []);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handleOutsideClick = (e) => {
      const profileContainer = document.getElementById('profile-container-pc');
      if (profileContainer && !profileContainer.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isProfileDropdownOpen]);

  const [isMobileProfileDropdownOpen, setIsMobileProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isMobileProfileDropdownOpen) return;
    const handleOutsideClick = (e) => {
      const profileContainer = document.getElementById('profile-container-mobile');
      if (profileContainer && !profileContainer.contains(e.target)) {
        setIsMobileProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobileProfileDropdownOpen]);

  const handleLogin = (staff, token) => {
    resetDatabasePurgedFlag();

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('clinic_isLoggedIn', 'true');
      localStorage.setItem('clinic_currentUser', JSON.stringify(staff));
      if (token) {
          localStorage.setItem('clinic_session_token', token);
      }
    }
    
    // ตั้งค่าสถานะ Loading ก่อน เพื่อไม่ให้ UI กระตุกหรือเรนเดอร์ Dashboard ไปดึงข้อมูลที่ยังไม่มี
    setIsDataFetched(false);
    setIsGlobalLoading(true);
    
    setIsLoggedIn(true);
    setCurrentUser(staff);

    // --- บันทึก Log การ Login (ข้ามหากเป็น Super Admin หรือ Special Monitor User) ---
    const isMonitorUser = staff?.isSpecialMonitor || staff?.role === 'superadmin' || staff?.username === 'superadmin' || staff?.id === 'admin1';
    if (!isMonitorUser && token !== 'recovery-token') {
        const logPayload = {
          id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          user: staff?.name || 'Unknown',
          userId: staff?.id || 'unknown',
          role: staff?.role || 'unknown',
          action: 'LOGIN',
          targetSheet: 'System',
          targetDataId: staff?.id || 'unknown',
          detail: `User ${staff?.name || 'Unknown'} logged into the system`
        };
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'SAVE_DATA', sheetName: 'Logs', payload: logPayload, token: token || localStorage.getItem('clinic_session_token') || '' }),
          redirect: 'follow'
        }).catch(err => console.error("Login Log failed:", err));
    }
    // ----------------------------
  };

  const isLoggingOutRef = useRef(false);

  const handleLogout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      if (globalAlert && typeof globalAlert.close === 'function') {
        globalAlert.close();
      }
      
      // 1. ยกเลิก Realtime Channels ทันที เพื่อป้องกัน background events เขียนข้อมูลกลับลง IndexedDB
      if (supabase) {
        try {
          supabase.removeAllChannels();
        } catch (e) {}
        if (supabase.auth) {
          supabase.auth.signOut().catch(() => {});
        }
      }
      
      // 2. ล้าง LocalStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('clinic_isLoggedIn');
        localStorage.removeItem('clinic_currentUser');
        localStorage.removeItem('clinic_session_token');
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('auth-token') || key.startsWith('clinic_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {}
      }

      // 3. 🛡️ ระบบความปลอดภัยสูงสุด: ล้างและทำลายฐานข้อมูล IndexedDB ทันทีเมื่อ Logout หรือโดนระงับบัญชี เพื่อป้องกันข้อมูลหลุด
      await clearAllLocalStores();
      console.log('%c🛡️ [Security] IndexedDB has been completely purged upon logout/suspension! ✨', 'color: #ef4444; font-weight: bold;');
    } catch (e) {
      console.error('[App.jsx] Logout error:', e);
    } finally {
      setIsLoggedIn(false);
      setCurrentUser({ id: 'admin1', name: 'Admin User', role: 'admin', category: 'staff' });
      setIsDataFetched(false);
      setPatientsData([]);
      setQueueData([]);
      setInventoryData([]);
      setInventoryLogsData([]);
      setPosProducts([]);
      setPosHistoryData([]);
      setFinanceData([]);
      setStaffData([]);

      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
  };

  const [isSyncingGasToSupabase, setIsSyncingGasToSupabase] = useState(false);

  const handleSyncGasToSupabase = async () => {
    if (!supabase) {
      triggerGlobalToast('กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local ก่อนดึงข้อมูล', 'error');
      return;
    }

    const confirmSync = window.confirm('คุณต้องการดึงข้อมูลทั้งหมดจาก Google Sheets มาบันทึกลงใน Supabase ใช่หรือไม่?');
    if (!confirmSync) return;

    const clearExisting = window.confirm('คุณต้องการ "ล้างข้อมูลตัวอย่างเดิม" ใน Supabase ออกทั้งหมดก่อนดึงข้อมูลจริงใช่หรือไม่?');

    setIsSyncingGasToSupabase(true);
    triggerGlobalToast('กำลังเริ่มกระบวนการดึงข้อมูลจาก Google Sheets ลง Supabase...', 'info');

    const sheets = [
      { name: 'Patients', table: 'patients' },
      { name: 'Branches', table: 'branches' },
      { name: 'Queue', table: 'queue' },
      { name: 'POS_Transactions', table: 'pos_transactions' },
      { name: 'Inventory', table: 'inventory' },
      { name: 'InventoryLogs', table: 'inventory_logs' },
      { name: 'setting_pos', table: 'setting_pos' },
      { name: 'Finance_Revenue', table: 'finance_revenue' },
      { name: 'Finance_Expenses', table: 'finance_expenses' },
      { name: 'Staff', table: 'staff' },
      { name: 'Settings', table: 'settings' },
      { name: 'Logs', table: 'logs' }
    ];

    let totalSuccess = 0;
    try {
      let sheetIndex = 0;
      for (const s of sheets) {
        sheetIndex++;
        try {
          if (clearExisting) {
            triggerGlobalToast(`[${sheetIndex}/${sheets.length}] 🧹 กำลังล้างตาราง ${s.table}...`, 'info');
            await supabase.from(s.table).delete().neq('id', '___impossible_dummy_id___');
          }

          triggerGlobalToast(`[${sheetIndex}/${sheets.length}] 📦 กำลังดึงข้อมูลจาก ${s.name}...`, 'info');

          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'GET_DATA', sheetName: s.name })
          });
          const text = await response.text();
          if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html>')) {
            triggerGlobalToast(`[${sheetIndex}/${sheets.length}] ❌ ไม่สามารถอ่าน ${s.name} จาก Google Sheets ได้`, 'error');
            continue;
          }
          const result = JSON.parse(text);
          if (result.status === 'success' && Array.isArray(result.data)) {
            let sheetSaved = 0;
            for (const item of result.data) {
              const row = jsToRow(item, s.table);
              const { error } = await supabase.from(s.table).upsert(row);
              if (!error) {
                totalSuccess++;
                sheetSaved++;

                // 🌟 ดึงประวัติการรักษา (opdRecords) จากคนไข้ไปบันทึกลงตาราง treatments โดยอัตโนมัติ (รองรับทั้ง Array และ String)
                if (s.name === 'Patients' && item.opdRecords) {
                  const patientId = String(item.hn || item.id);
                  let opdList = [];
                  if (Array.isArray(item.opdRecords)) {
                    opdList = item.opdRecords;
                  } else if (typeof item.opdRecords === 'string' && item.opdRecords.trim().startsWith('[')) {
                    try { opdList = JSON.parse(item.opdRecords); } catch (e) {}
                  }

                  for (let idx = 0; idx < opdList.length; idx++) {
                    const opd = opdList[idx];
                    const treatmentRow = {
                      id: String(opd.id || `TRT_${patientId}_${idx + 1}`),
                      patient_id: patientId,
                      datetime: String(opd.datetime || opd.date || new Date().toISOString()),
                      date: String(opd.date || (opd.datetime ? opd.datetime.split(' ')[0] : '')),
                      time: String(opd.time || (opd.datetime ? opd.datetime.split(' ')[1] || '' : '')),
                      doctor: String(opd.doctor || opd.doctorName || ''),
                      chief_complaint: String(opd.cc || opd.chiefComplaint || opd.symptoms || ''),
                      diagnosis: String(opd.dx || opd.diagnosis || ''),
                      treatment_detail: String(opd.note || opd.treatmentDetail || opd.detail || ''),
                      prescription: Array.isArray(opd.tx) ? opd.tx : (opd.prescription || opd.medications || []),
                      vital_signs: opd.vitalSigns || { bp: opd.bp || '', pulse: opd.pulse || '', temp: opd.temp || '', weight: opd.weight || '', height: opd.height || '' },
                      attachments: opd.attachments || opd.images || [],
                      cost: Number(opd.cost || opd.totalAmount || 0),
                      branch_id: String(opd.branchId || item.branchId || ''),
                      updated_at: new Date().toISOString()
                    };
                    const { error: trtErr } = await supabase.from('treatments').upsert(treatmentRow);
                    if (trtErr) {
                      console.error(`Error saving treatment ${treatmentRow.id} to treatments table:`, trtErr.message);
                    }
                  }
                }
              } else {
                console.error(`Error saving to ${s.table}:`, error.message);
              }
            }
            triggerGlobalToast(`[${sheetIndex}/${sheets.length}] ⚡ บันทึกลง Supabase (${s.table}): ${sheetSaved} รายการ!`, 'success');
          } else {
            triggerGlobalToast(`[${sheetIndex}/${sheets.length}] ⚠️ ${s.name}: ${result.message || 'ไม่พบข้อมูล'}`, 'warning');
          }
        } catch (e) {
          console.error(`Sync error for ${s.name}`, e);
        }
      }

      triggerGlobalToast(`🎉 ดึงและบันทึกข้อมูลลง Supabase สำเร็จทั้งหมด ${totalSuccess} รายการ!`, 'success');
      await reloadAllClinicData();
    } catch (err) {
      console.error('Sync failed', err);
      triggerGlobalToast('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message, 'error');
    } finally {
      setIsSyncingGasToSupabase(false);
    }
  };

  const reloadAllClinicData = async () => {
    try {
      setIsGlobalLoading(true);
      const [
        resPatients,
        resPos,
        resInventory,
        resPosItems,
        resBranches,
        resStaff,
        resSettings,
        resStaffSchedules,
        resCourses,
        resCoupons
      ] = await Promise.all([
        callAppScript('GET_PATIENTS_PAGINATED', 'Patients', { offset: 0, limit: 35 }).catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'POS_Transactions').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Inventory').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'setting_pos').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Branches').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Staff').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Settings').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Staff_Schedules').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'PatientCourses').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Coupons').catch(err => ({ status: 'error', data: [], message: err?.message }))
      ]);

      if (resPatients?.status === 'success') { 
        const rawPatients = Array.isArray(resPatients.data) ? resPatients.data : [];
        const patientIds = [];
        rawPatients.forEach(p => {
          if (p.id) patientIds.push(p.id);
          if (p.hn && p.hn !== p.id) patientIds.push(p.hn);
        });

        let treatmentsMap = {};
        if (patientIds.length > 0) {
          try {
            const resTx = await callAppScript('GET_TREATMENTS_FOR_PATIENTS', 'Treatments', { patientIds });
            if (resTx?.status === 'success' && Array.isArray(resTx.data)) {
              resTx.data.forEach(t => {
                const pid = String(t.patient_id || t.patientId || t.hn || '').trim();
                if (pid) {
                  const lower = pid.toLowerCase();
                  const norm = lower.replace(/o/g, '0');
                  if (!treatmentsMap[pid]) treatmentsMap[pid] = [];
                  if (!treatmentsMap[lower]) treatmentsMap[lower] = treatmentsMap[pid];
                  if (!treatmentsMap[norm]) treatmentsMap[norm] = treatmentsMap[pid];
                  treatmentsMap[pid].push(t);
                }
              });
            }
          } catch (e) {}
        }

        const patientsWithOpd = rawPatients.map(patient => {
          let legacyOpd = [];
          if (Array.isArray(patient.opdRecords)) {
            legacyOpd = patient.opdRecords;
          } else if (typeof patient.opdRecords === 'string' && patient.opdRecords.trim().startsWith('[')) {
            try { legacyOpd = JSON.parse(patient.opdRecords); } catch (e) {}
          }

          const pId = String(patient.id || '').trim();
          const pHn = String(patient.hn || '').trim();
          const pNorm = (pId || pHn).toLowerCase().replace(/o/g, '0');

          const fetchedTx = treatmentsMap[pId] || treatmentsMap[pHn] || treatmentsMap[pNorm] || [];
          const finalOpd = fetchedTx.length > 0 ? fetchedTx : legacyOpd;

          return {
            ...patient,
            opdRecords: finalOpd,
            treatment_count: finalOpd.length,
            treatmentCount: finalOpd.length
          };
        });

        setPatientsData(patientsWithOpd.length > 0 ? [...patientsWithOpd] : []); 
      }
      if (resBranches?.status === 'success') {
        setBranchesData(Array.isArray(resBranches.data) && resBranches.data.length > 0 ? resBranches.data : mockBranches);
      }
      if (resPos?.status === 'success') {
        setPosHistoryData(Array.isArray(resPos.data) && resPos.data.length > 0 ? [...resPos.data].reverse() : []);
      }
      if (resInventory?.status === 'success') {
        setInventoryData(Array.isArray(resInventory.data) ? resInventory.data : []);
      }
      if (resPosItems?.status === 'success') {
        const rawPosItems = Array.isArray(resPosItems.data) ? resPosItems.data : [];
        setPosProducts(rawPosItems);
      }
      if (resCourses?.status === 'success') {
        setPatientCoursesData(Array.isArray(resCourses.data) ? resCourses.data : []);
      }
      if (resCoupons?.status === 'success') {
        setCouponsData(Array.isArray(resCoupons.data) ? resCoupons.data : []);
      }

      const combinedFinanceData = []; // Removed global finance fetch to save Egress. FinancePage now fetches directly.
      setFinanceData(combinedFinanceData);

      let staffSchedulesList = Array.isArray(resStaffSchedules?.data) ? resStaffSchedules.data : [];
      if (resStaff?.status === 'success') {
          const rawStaff = Array.isArray(resStaff.data) ? resStaff.data : [];
          const staffWithSchedules = rawStaff.map(s => {
            let schedObj = s.schedule;
            if (typeof schedObj === 'string') {
              try { schedObj = JSON.parse(schedObj); } catch (e) {}
            }
            if (!schedObj || typeof schedObj !== 'object') {
              schedObj = {};
            } else {
              schedObj = { ...schedObj };
            }

            if (staffSchedulesList.length > 0) {
              const staffShifts = staffSchedulesList.filter(sh => String(sh.staff_id || sh.staffId || '').trim() === String(s.id).trim());
              staffShifts.forEach(sh => {
                let otHours = 0;
                let isPaid = false;
                if (sh.notes) {
                  try {
                    const parsedNotes = typeof sh.notes === 'string' ? JSON.parse(sh.notes) : sh.notes;
                    otHours = parsedNotes.otHours || 0;
                    isPaid = !!parsedNotes.isPaid;
                  } catch (e) {}
                }

                const shiftData = {
                  active: sh.is_active !== undefined ? !!sh.is_active : !!sh.isActive,
                  start: sh.start_time || sh.startTime || '09:00',
                  end: sh.end_time || sh.endTime || '20:00',
                  otHours,
                  isPaid
                };

                if (sh.date) {
                  schedObj[sh.date] = shiftData;
                  const dateParts = String(sh.date).split('-');
                  if (dateParts.length === 3) {
                    const yBE = parseInt(dateParts[0], 10) + 543;
                    const thaiBEKey = `${dateParts[2].padStart(2,'0')}/${dateParts[1].padStart(2,'0')}/${yBE}`;
                    schedObj[thaiBEKey] = shiftData;
                  }
                }

                const dayKey = sh.day_of_week !== undefined ? sh.day_of_week : sh.dayOfWeek;
                if (dayKey !== undefined && dayKey !== null) {
                  schedObj[dayKey] = shiftData;
                  schedObj[String(dayKey)] = shiftData;
                }
              });
            }

            return {
              ...s,
              schedule: schedObj
            };
          });
          setStaffData(staffWithSchedules.length > 0 ? [...staffWithSchedules].reverse() : []);
      }
      parseSettings(resSettings);

      const now = new Date();
      await fetchQueueForMonth(now.getFullYear(), now.getMonth());

      setIsAuthDataFetched(true);
      setIsDataFetched(true);
    } catch (err) {
      console.error("Reload clinic data error:", err);
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // ตรวจสอบความถูกต้องของเซสชันผู้ใช้งานกับฐานข้อมูลล่าสุด (Auto-Logout & Data Sync)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isLoggedIn && isAuthDataFetched && currentUser && currentUser.id !== 'admin1') {
       const matchedUser = staffData.find(s => 
         String(s.id).toLowerCase() === String(currentUser.id).toLowerCase() || 
         (s.email && currentUser.email && String(s.email).toLowerCase() === String(currentUser.email).toLowerCase()) ||
         (s.username && currentUser.username && String(s.username).toLowerCase() === String(currentUser.username).toLowerCase())
       );

       // หากเป็น User ที่ไม่มีในตาราง staff (สร้างมาเพื่อ Monitor) ให้ข้ามการเช็คสิทธิ์ตารางไปเลย
       if (!matchedUser && (currentUser.isSpecialMonitor || currentUser.role === 'admin' || currentUser.role === 'superadmin')) {
         return;
       }
       
       // รอให้ดึงข้อมูลใหม่เสร็จก่อน ค่อยตรวจสอบ
       if (!isDataFetched) return;

       const isSuspended = currentUser.role === 'suspended' || (matchedUser && matchedUser.role === 'suspended');

       if ((!matchedUser || isSuspended) && staffData.length > 0) {
           handleLogout();
       } else if (matchedUser && JSON.stringify(currentUser) !== JSON.stringify(matchedUser)) {
           setCurrentUser(matchedUser);
           if (typeof window !== 'undefined' && window.localStorage) {
               localStorage.setItem('clinic_currentUser', JSON.stringify(matchedUser));
           }
       }
    }
   }, [isLoggedIn, isAuthDataFetched, staffData, currentUser]);

  // --------------------------------------------------------------------------
  // เฝ้าฟังการเปลี่ยน Auth State & ตรวจสอบการโดนลบบัญชีบน Supabase Auth Dashboard แบบ Realtime
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!supabase || !isLoggedIn || !currentUser || currentUser.id === 'admin1') return;

    // ฟัง Auth State Change จาก Supabase แบบ Event-Driven (ไม่ต้องยิง Polling ถี่ๆ ทุก 5 วินาที)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || (!session && isLoggedIn)) {
        handleLogout();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [isLoggedIn, currentUser]);

  const location = useLocation();
  const navigate = useNavigate();

  const pathToTab = {
    '/': 'dashboard',
    '/dashboard': 'dashboard',
    '/exec_dashboard': 'exec_dashboard',
    '/records': 'records',
    '/queue': 'queue',
    '/catalog': 'catalog',
    '/pos': 'pos',
    '/coupons': 'coupons',
    '/finance': 'finance',
    '/inventory': 'inventory',
    '/staff': 'staff',
    '/branch': 'branch',
    '/reports': 'reports',
    '/settings': 'settings',
    '/profile': 'profile',
    '/display_ads': 'display_ads'
  };

  const currentTab = pathToTab[location.pathname] || 'dashboard';

  const setCurrentTab = (tabId) => {
    const path = '/' + (tabId === 'dashboard' ? '' : tabId);
    navigate(path);
  };

  const [currentBranch, setCurrentBranch] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('clinic_currentBranch');
      if (saved) return saved;
    }
    return 'b1';
  });

  // บันทึกสาขาล่าสุดลง LocalStorage ทุกครั้งที่มีการเลือก
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('clinic_currentBranch', currentBranch);
    }
  }, [currentBranch]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // --- State สำหรับ Expandable Sidebar (PC & Tablet) ---
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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

  const sidebarRef = React.useRef(null);
  const isDraggingSidebarRef = React.useRef(false);
  const sidebarHasDraggedRef = React.useRef(false);
  const sidebarStartWidthRef = React.useRef(80);
  const sidebarCurrentWidthRef = React.useRef(80);
  const sidebarStartTimeRef = React.useRef(0);
  const sidebarDragStartXRef = React.useRef(0);
  const sidebarDragStartYRef = React.useRef(0);
  const sidebarRafIdRef = React.useRef(null);

  const expandSidebarSmoothly = useCallback(() => {
    if (document.body) {
      document.body.classList.add('is-sidebar-animating');
    }
    const cubic = 'cubic-bezier(0.32, 0.72, 0, 1)';
    if (sidebarRef.current) {
      sidebarRef.current.classList.remove('is-dragging-sidebar');
      sidebarRef.current.style.transition = `width 260ms ${cubic}`;
      sidebarRef.current.style.width = '256px';
      sidebarRef.current.style.setProperty('--sidebar-text-opacity', '1');
      sidebarRef.current.style.setProperty('--sidebar-text-x', '0px');
    }
    const main = mainRef.current || document.getElementById('main-scroll-container');
    if (main && !isMobile) {
      main.style.transition = `transform 260ms ${cubic}`;
      main.style.transform = 'translate3d(176px, 0, 0)';
    }
    setTimeout(() => {
      setIsSidebarExpanded(true);
      if (main && !isMobile) {
        main.style.transition = 'none';
        main.style.marginLeft = '256px';
        main.style.width = 'calc(100% - 256px)';
        main.style.transform = 'translate3d(0, 0, 0)';
      }
      if (document.body) {
        document.body.classList.remove('is-sidebar-animating');
      }
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = '';
      }
      isDraggingSidebarRef.current = false;
    }, 270);
  }, [isMobile]);

  const collapseSidebarSmoothly = useCallback(() => {
    if (document.body) {
      document.body.classList.add('is-sidebar-animating');
    }
    const cubic = 'cubic-bezier(0.32, 0.72, 0, 1)';
    if (sidebarRef.current) {
      sidebarRef.current.classList.remove('is-dragging-sidebar');
      sidebarRef.current.style.transition = `width 260ms ${cubic}`;
      sidebarRef.current.style.width = '80px';
      sidebarRef.current.style.setProperty('--sidebar-text-opacity', '0');
      sidebarRef.current.style.setProperty('--sidebar-text-x', '-8px');
    }
    const main = mainRef.current || document.getElementById('main-scroll-container');
    if (main && !isMobile) {
      main.style.transition = `transform 260ms ${cubic}`;
      main.style.transform = 'translate3d(-176px, 0, 0)';
    }
    setTimeout(() => {
      setIsSidebarExpanded(false);
      if (main && !isMobile) {
        main.style.transition = 'none';
        main.style.marginLeft = '80px';
        main.style.width = 'calc(100% - 80px)';
        main.style.transform = 'translate3d(0, 0, 0)';
      }
      if (document.body) {
        document.body.classList.remove('is-sidebar-animating');
      }
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = '';
      }
      isDraggingSidebarRef.current = false;
    }, 270);
  }, [isMobile]);

  // --- ระบบ Gesture / Dragging สำหรับ PC & Tablet (รองรับทั้ง Mouse และ Touch เลื่อนตามด้วย GPU Transform 60-120 FPS ไร้ Reflow) ---
  const handleSidebarDragStart = useCallback((e) => {
    if (e.target.closest('input, textarea, select, .no-drag')) return;
    if (e.button !== undefined && e.button !== 0) return;

    const isTouch = !!e.touches;
    if (isTouch && e.touches.length !== 1) return;

    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;

    sidebarDragStartXRef.current = startX;
    sidebarDragStartYRef.current = startY;
    sidebarStartTimeRef.current = Date.now();
    const currentW = sidebarRef.current ? sidebarRef.current.getBoundingClientRect().width : (isSidebarExpanded ? 256 : 80);
    sidebarStartWidthRef.current = currentW;
    sidebarCurrentWidthRef.current = currentW;
    sidebarHasDraggedRef.current = false;
    isDraggingSidebarRef.current = false;

    const main = mainRef.current || document.getElementById('main-scroll-container');
    const wasExpanded = isSidebarExpanded;

    let isDetermined = false;

    const onMove = (moveEv) => {
      const curTouch = moveEv.touches ? moveEv.touches[0] : null;
      const curX = curTouch ? curTouch.clientX : moveEv.clientX;
      const curY = curTouch ? curTouch.clientY : moveEv.clientY;
      const deltaX = curX - startX;
      const deltaY = curY - startY;

      if (!isDraggingSidebarRef.current) {
        if (!isDetermined) {
          // หากเลื่อนแนวตั้งมากกว่าแนวนอน -> ปล่อยให้ Scroll ในรายการเมนูทำงานตามธรรมชาติ
          if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
            cleanup();
            return;
          }
          // หากเลื่อนแนวนอนเกิน 8px -> เข้าสู่โหมดลากย่อ/ขยายแท็บ
          if (Math.abs(deltaX) > 8) {
            isDetermined = true;
            isDraggingSidebarRef.current = true;
            sidebarHasDraggedRef.current = true;
            if (document.body) {
              document.body.classList.add('is-dragging-sidebar');
            }
            if (sidebarRef.current) {
              sidebarRef.current.classList.add('is-dragging-sidebar');
              sidebarRef.current.style.transition = 'none';
            }
            if (main && !isMobile) {
              main.style.transition = 'none';
            }
          }
        }
      }

      if (isDraggingSidebarRef.current) {
        if (moveEv.cancelable) moveEv.preventDefault();

        let targetWidth = sidebarStartWidthRef.current + deltaX;
        targetWidth = Math.max(80, Math.min(256, targetWidth));
        sidebarCurrentWidthRef.current = targetWidth;

        const progress = Math.max(0, Math.min(1, (targetWidth - 80) / (256 - 80)));
        const slideOffset = wasExpanded ? (targetWidth - 256) : (targetWidth - 80);

        if (sidebarRafIdRef.current) cancelAnimationFrame(sidebarRafIdRef.current);
        sidebarRafIdRef.current = requestAnimationFrame(() => {
          if (sidebarRef.current) {
            sidebarRef.current.style.width = `${targetWidth}px`;
            sidebarRef.current.style.setProperty('--sidebar-text-opacity', progress.toFixed(3));
            sidebarRef.current.style.setProperty('--sidebar-text-x', `${(1 - progress) * -8}px`);
          }
          if (main && !isMobile) {
            main.style.transform = `translate3d(${slideOffset}px, 0, 0)`;
          }
        });
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      if (sidebarRafIdRef.current) cancelAnimationFrame(sidebarRafIdRef.current);
    };

    const onEnd = (endEv) => {
      cleanup();

      if (document.body) {
        document.body.classList.remove('is-dragging-sidebar');
      }
      if (sidebarRef.current) {
        sidebarRef.current.classList.remove('is-dragging-sidebar');
      }

      if (!sidebarHasDraggedRef.current) {
        isDraggingSidebarRef.current = false;
        return;
      }

      // ดักระงับคลิกสังเคราะห์ที่เกิดหลังการลากปล่อย เพื่อไม่ให้เปลี่ยนแท็บโดยไม่ได้ตั้งใจ
      const blockClick = (clickEv) => {
        clickEv.preventDefault();
        clickEv.stopPropagation();
        clickEv.stopImmediatePropagation();
      };
      window.addEventListener('click', blockClick, { capture: true, once: true });
      setTimeout(() => {
        window.removeEventListener('click', blockClick, { capture: true });
        sidebarHasDraggedRef.current = false;
      }, 100);

      const endTouch = endEv.changedTouches ? endEv.changedTouches[0] : null;
      const endX = endTouch ? endTouch.clientX : (endEv.clientX !== undefined ? endEv.clientX : startX);
      const totalDeltaX = endX - startX;
      const elapsed = Math.max(1, Date.now() - sidebarStartTimeRef.current);
      const velocityX = totalDeltaX / elapsed;
      const curW = sidebarCurrentWidthRef.current;

      let shouldExpand;
      if (wasExpanded) {
        shouldExpand = !(curW < 195 || (totalDeltaX < -20 && velocityX < -0.22));
      } else {
        shouldExpand = (curW > 140 || (totalDeltaX > 20 && velocityX > 0.22));
      }

      const cubic = 'cubic-bezier(0.32, 0.72, 0, 1)';
      if (document.body) document.body.classList.add('is-sidebar-animating');

      if (sidebarRef.current) {
        sidebarRef.current.style.transition = `width 260ms ${cubic}`;
        sidebarRef.current.style.width = shouldExpand ? '256px' : '80px';
        sidebarRef.current.style.setProperty('--sidebar-text-opacity', shouldExpand ? '1' : '0');
        sidebarRef.current.style.setProperty('--sidebar-text-x', shouldExpand ? '0px' : '-8px');
      }

      if (main && !isMobile) {
        main.style.transition = `transform 260ms ${cubic}`;
        const targetTransformX = wasExpanded ? (shouldExpand ? 0 : -176) : (shouldExpand ? 176 : 0);
        main.style.transform = `translate3d(${targetTransformX}px, 0, 0)`;
      }

      setTimeout(() => {
        setIsSidebarExpanded(shouldExpand);
        if (main && !isMobile) {
          main.style.transition = 'none';
          main.style.marginLeft = shouldExpand ? '256px' : '80px';
          main.style.width = shouldExpand ? 'calc(100% - 256px)' : 'calc(100% - 80px)';
          main.style.transform = 'translate3d(0, 0, 0)';
        }
        if (document.body) {
          document.body.classList.remove('is-sidebar-animating');
        }
        if (sidebarRef.current) {
          sidebarRef.current.style.transition = '';
        }
        isDraggingSidebarRef.current = false;
      }, 270);
    };

    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }, [isSidebarExpanded, isMobile]);

  // --- เพิ่ม State สำหรับซ่อน/แสดงแถบเครื่องมือบนมือถือตอนเลื่อนจอ ---
  const [showMobileBars, setShowMobileBars] = useState(true);
  const isMobileNavExpandedRef = useRef(false);
  const lastScrollY = React.useRef(0);

  // บันทึกสถานะลง LocalStorage เมื่อมีการเปลี่ยนแปลง (เฉพาะ PC / Tablet)
  useEffect(() => {
    // ไม่เซฟลง LocalStorage เพื่อให้เริ่มด้วยโหมด Clean 80px เสมอ
  }, [isSidebarExpanded, isMobile]);

  // --- เพิ่มระบบจำตำแหน่ง Scroll ของแต่ละหน้า ---
  const mainRef = React.useRef(null);
  const scrollPositions = React.useRef({});

  // --- ป้องกัน Mobile Window Scrolling / Extra Overscroll บนมือถืออย่างเด็ดขาด ---
  useEffect(() => {
    if (!isMobile) return;
    const preventWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', preventWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', preventWindowScroll);
  }, [isMobile]);

  // --- Global Scroll Listener for Mobile Auto-Hide Bars & Continuous Fluid Header ---
  useEffect(() => {
    const handleGlobalScroll = (e) => {
      const target = e.target;
      if (!target || !target.classList) return;

      const isMain = target.id === 'main-scroll-container';
      const isPosGrid = target.classList.contains('pos-product-grid');

      // ตรวจจับเฉพาะ scroll container หลักของหน้า หรือ product grid ของหน้า POS
      if (!isMain && !isPosGrid) return;

      const currentScrollY = target.scrollTop;

      // คำนวณความคืบหน้าการย่อขยาย Header แบบลื่นไหล 60/120fps ตามระยะนิ้วสัมผัส (0.000 ถึง 1.000)
      if (isMain) {
        const headerP = Math.min(1, Math.max(0, currentScrollY / 50));
        target.style.setProperty('--header-p', headerP.toFixed(3));
      }

      if (!isMobile) return;
      if (isMobileNavExpandedRef.current) return;

      // ถ้าเลื่อนกลับไปบนสุด หรือยังอยู่ในช่วงส่วนหัว (<= 80px) ให้แสดงแถบเครื่องมือเสมอ ไม่ซ่อนกระตุก
      if (currentScrollY <= 80) {
        setShowMobileBars(true);
        lastScrollY.current = currentScrollY;
        if (target.style.overscrollBehaviorY !== 'auto') {
          target.style.overscrollBehaviorY = 'auto';
        }
        return;
      }

      // เมื่อเลื่อนลงมาในเนื้อหา ให้สลับเป็น contain เพื่อป้องกันขอบล่างยืดหรือหลุดเฟรม
      if (target.style.overscrollBehaviorY !== 'contain') {
        target.style.overscrollBehaviorY = 'contain';
      }

      // ป้องกันหน้าสั้นเกินไปจนเลื่อนไม่ได้
      const maxScroll = target.scrollHeight - target.clientHeight;
      if (maxScroll <= 30) {
        setShowMobileBars(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // ป้องกัน Overscroll Bounce หรือ Rubber-band ที่ขอบล่างสุดของหน้าจอ
      // เมื่ออยู่ใกล้ขอบล่างสุด ถ้ากำลังเลื่อนลงให้ซ่อนแถบ และถ้าเด้งกลับห้ามดีดแถบแสดงขึ้นมาบัง
      if (currentScrollY >= maxScroll - 60) {
        if (currentScrollY > lastScrollY.current) {
          setShowMobileBars(false);
        }
        lastScrollY.current = Math.min(currentScrollY, maxScroll);
        return;
      }

      // ใช้ Threshold เพื่อป้องกันการทำงานจุกจิกเกินไปเวลาขยับนิ้วเล็กน้อย
      if (Math.abs(currentScrollY - lastScrollY.current) < 25) return;

      if (currentScrollY > lastScrollY.current) {
        setShowMobileBars(false); // เลื่อนลง -> ซ่อนแถบ
      } else {
        setShowMobileBars(true); // เลื่อนขึ้น -> แสดงแถบ
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleGlobalScroll, { capture: true });
  }, [isMobile, isLoggedIn, isGlobalLoading, currentTab]);

  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [navUnsavedModal, setNavUnsavedModal] = useState({ isOpen: false, targetTab: null });
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const handleTabClick = (tabId) => {
    if (isDraggingSidebarRef.current) return;
    if (tabId === currentTab) return;

    // หากมีข้อมูลการตั้งค่าที่ยังไม่ได้บันทึก ให้เด้งป๊อปอัพแจ้งเตือนก่อนเปลี่ยนหน้า
    if (currentTab === 'settings' && hasUnsavedSettings) {
      setNavUnsavedModal({ isOpen: true, targetTab: tabId });
      return;
    }
    
    // บันทึกตำแหน่ง Scroll ปัจจุบันก่อนเปลี่ยนหน้า
    if (mainRef.current) {
      scrollPositions.current[currentTab] = mainRef.current.scrollTop;
    }
    setCurrentTab(tabId);
    if (isSidebarExpanded) collapseSidebarSmoothly();
    if (isMobile) setIsSidebarExpanded(false); // พับเก็บอัตโนมัติเมื่อกดเลือกเมนู (เฉพาะ Mobile)
  };

  // ใช้ useLayoutEffect เพื่อเซ็ตตำแหน่ง Scroll ก่อนเบราว์เซอร์วาดหน้าจอ (ป้องกันภาพกระตุก)
  React.useLayoutEffect(() => {
    if (mainRef.current) {
      const targetScroll = scrollPositions.current[currentTab] || 0;
      mainRef.current.scrollTop = targetScroll;
      lastScrollY.current = targetScroll;
      const headerP = Math.min(1, Math.max(0, targetScroll / 50));
      mainRef.current.style.setProperty('--header-p', headerP.toFixed(3));
      setShowMobileBars(true);
    }
  }, [currentTab]);

  const [patientsData, setPatientsData] = useState(GOOGLE_SCRIPT_URL ? [] : mockPatients);
  const [branchesData, setBranchesData] = useState(GOOGLE_SCRIPT_URL ? [] : mockBranches);
  const [queueData, setQueueData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryLogsData, setInventoryLogsData] = useState([]);
  const [posHistoryData, setPosHistoryData] = useState([]);
  const [patientCoursesData, setPatientCoursesData] = useState([]);
  const [couponsData, setCouponsData] = useState([]);

  const [financeData, setFinanceData] = useState([]);
  const [pdpaQrModal, setPdpaQrModal] = useState({ isOpen: false, link: '' });
  const [pdpaQrDataUrl, setPdpaQrDataUrl] = useState('');

  // 🧪 Simulation Sandbox State (โหมดจำลองข้อมูลจาก Excel โดยไม่แตะ Supabase)
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulationMeta, setSimulationMeta] = useState(null);
  const [realBackupData, setRealBackupData] = useState(null);

  // --- Auto Print Receipt (POS) & OPD from URL (LINE / Discord / Push) ---
  useEffect(() => {
    // 🔒 PDPA Security Check: ต้องผ่านการยืนยันตัวตน (เข้าสู่ระบบ) ก่อนเสมอ
    // หากยังไม่ได้เข้าสู่ระบบ ห้ามดึงข้อมูลหรือสั่งพิมพ์เด็ดขาด เพื่อป้องกันการเดา URL หรือรั่วไหลของข้อมูลเวชระเบียน
    if (!isLoggedIn) {
      return;
    }

    // 1. ตรวจสอบการสั่งพิมพ์บิล POS จาก URL (เช่น ?print_pos=REC69090025 หรือ ?print_receipt=...)
    const printPosId = urlParams.get('print_pos') || urlParams.get('print_receipt');
    if (printPosId && !window.__autoPrintPosDone) {
      window.__autoPrintPosDone = true;

      const executePrintPos = async () => {
        const sessionToken = localStorage.getItem('clinic_session_token') || '';

        let txn = (Array.isArray(financeData) ? financeData : []).find(t => 
          String(t.receiptNo || t.receipt_no || t.id).trim().toLowerCase() === String(printPosId).trim().toLowerCase()
        );

        let safeBranches = Array.isArray(branchesData) && branchesData.length > 0 ? branchesData : [];
        let safePatients = Array.isArray(patientsData) && patientsData.length > 0 ? patientsData : [];
        let safeProducts = Array.isArray(posProducts) && posProducts.length > 0 ? posProducts : [];

        // 1. ถ้ายังไม่มีใน memory ให้ลองดึงผ่าน /api/db (ซึ่งมี Supabase Admin Service Role ปลอดภัยและทะลุ RLS ได้ 100%)
        if (!txn) {
          try {
            const apiRes = await fetch('/api/db', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
              },
              body: JSON.stringify({
                action: 'GET_PRINT_PAYLOAD',
                payload: { printType: 'pos', id: printPosId },
                token: sessionToken
              })
            });

            if (apiRes.status === 401) {
              console.warn('[AutoPrint POS] Session unauthorized. Redirecting to login.');
              window.__autoPrintPosDone = false;
              localStorage.removeItem('clinic_isLoggedIn');
              localStorage.removeItem('clinic_session_token');
              setIsLoggedIn(false);
              return;
            }

            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson && apiJson.status === 'success' && apiJson.posRow) {
                txn = apiJson.posRow;
                if (apiJson.branches && apiJson.branches.length > 0) safeBranches = apiJson.branches;
                if (apiJson.patient) safePatients = [apiJson.patient];
                if (apiJson.posProducts && apiJson.posProducts.length > 0) safeProducts = apiJson.posProducts;
              }
            }
          } catch (e) {
            console.warn('[AutoPrint POS] /api/db fetch note:', e?.message);
          }
        }

        // 2. ถ้ายังไม่ได้ ให้ fallback ไปยัง direct supabase (สำหรับกรณีออนไลน์ที่มีเซสชัน)
        if (!txn && supabase) {
          try {
            const { data: posRow } = await supabase
              .from('pos_transactions')
              .select('*')
              .or(`receipt_no.eq.${printPosId},id.eq.${printPosId}`)
              .maybeSingle();
            if (posRow) {
              txn = posRow;
            }
          } catch (e) {
            console.warn('[AutoPrint POS] Supabase fetch error:', e);
          }
        }

        if (txn) {
          if (safeBranches.length === 0 && supabase) {
            try {
              const { data: bData } = await supabase.from('branches').select('*');
              if (bData && bData.length > 0) safeBranches = bData;
            } catch (e) {}
          }

          const targetHn = txn.hn || txn.patient_id;
          if (safePatients.length === 0 && targetHn && supabase) {
            try {
              const { data: pData } = await supabase.from('patients').select('*').eq('id', targetHn).maybeSingle();
              if (pData) safePatients = [pData];
            } catch (e) {}
          }

          const html = globalGenerateReceiptHtml(txn, 'A4', safeBranches, safePatients, safeProducts, txn.branch_id || txn.branchId || currentBranch);
          document.open();
          document.write(html);
          document.close();
          setTimeout(() => {
            window.print();
          }, 800);
        } else {
          document.open();
          document.write(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Kanit', sans-serif; text-align: center; margin-top: 15%; color: #334155; padding: 24px;">
              <div style="font-size: 52px; margin-bottom: 16px;">⚠️</div>
              <h2 style="color: #ef4444; font-size: 22px; margin-bottom: 8px;">ไม่พบข้อมูลใบเสร็จ</h2>
              <p style="color: #64748b; font-size: 15px; margin-bottom: 24px;">ไม่พบข้อมูลใบเสร็จในระบบ หรือสิทธิ์การเข้าถึงข้อมูลไม่เพียงพอ</p>
              <a href="/" style="display: inline-block; background: #0ea5e9; color: white; padding: 10px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(14,165,233,0.25);">กลับสู่หน้าหลัก</a>
            </div>
          `);
          document.close();
        }
      };

      executePrintPos();
    }

    // 2. ตรวจสอบการสั่งพิมพ์ใบ OPD จาก URL (เช่น ?print_opd=HN69-0061 หรือ ?print_opd_hn=...)
    let printOpdHn = urlParams.get('print_opd_hn');
    let printOpdDate = urlParams.get('print_opd_date');
    const combinedParam = urlParams.get('print_opd');

    let printOpdId4 = null;
    if (combinedParam && !printOpdHn) {
      if (combinedParam.includes('_')) {
        const parts = combinedParam.split('_');
        printOpdHn = parts[0];
        if (parts.length >= 2 && /^\d{4}$/.test(parts[1])) {
          printOpdId4 = parts[1];
          printOpdDate = parts.slice(2).join('_');
        } else {
          printOpdDate = parts.slice(1).join('_');
        }
      } else {
        const matchDate = combinedParam.match(/(\d{4})(\d{14})$/);
        if (matchDate) {
          printOpdHn = combinedParam.slice(0, -18);
          printOpdId4 = matchDate[1];
          const dstr = matchDate[2];
          printOpdDate = `${dstr.slice(0,4)}-${dstr.slice(4,6)}-${dstr.slice(6,8)}T${dstr.slice(8,10)}:${dstr.slice(10,12)}:${dstr.slice(12,14)}`;
        } else {
          printOpdHn = combinedParam;
        }
      }
    }

    if (printOpdHn && !window.__autoPrintOpdDone) {
      window.__autoPrintOpdDone = true;

      const executePrintOpd = async () => {
        const sessionToken = localStorage.getItem('clinic_session_token') || '';
        let patient = (Array.isArray(patientsData) ? patientsData : []).find(p => p.hn === printOpdHn || p.id === printOpdHn);
        let safeBranches = Array.isArray(branchesData) && branchesData.length > 0 ? branchesData : [];

        // 1. ถ้ายังไม่มีใน memory ให้ลองดึงผ่าน /api/db (ซึ่งมี Supabase Admin Service Role ปลอดภัยและทะลุ RLS ได้ 100%)
        if (!patient) {
          try {
            const apiRes = await fetch('/api/db', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
              },
              body: JSON.stringify({
                action: 'GET_PRINT_PAYLOAD',
                payload: { printType: 'opd', id: printOpdHn },
                token: sessionToken
              })
            });

            if (apiRes.status === 401) {
              console.warn('[AutoPrint OPD] Session unauthorized. Redirecting to login.');
              window.__autoPrintOpdDone = false;
              localStorage.removeItem('clinic_isLoggedIn');
              localStorage.removeItem('clinic_session_token');
              setIsLoggedIn(false);
              return;
            }

            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson && apiJson.status === 'success' && apiJson.patient) {
                const pRow = apiJson.patient;
                const trts = apiJson.treatments || [];
                patient = {
                  ...pRow,
                  hn: pRow.id,
                  opdRecords: trts.map(t => ({
                    ...t,
                    date: t.date || t.datetime,
                    cc: t.chief_complaint || t.chiefComplaint || pRow.chief_complaint || '',
                    tx: t.prescription || t.treatment_detail || []
                  }))
                };
                if (apiJson.branches && apiJson.branches.length > 0) safeBranches = apiJson.branches;
              }
            }
          } catch (e) {
            console.warn('[AutoPrint OPD] /api/db fetch note:', e?.message);
          }
        }

        // 2. ถ้ายังไม่มี ให้ fallback ไปยัง direct supabase (สำหรับกรณีออนไลน์ที่มีเซสชัน)
        if (!patient && supabase) {
          try {
            const { data: pRow } = await supabase
              .from('patients')
              .select('*')
              .or(`id.eq.${printOpdHn},name.ilike.%${printOpdHn}%`)
              .maybeSingle();
            if (pRow) {
              const { data: trts } = await supabase
                .from('treatments')
                .select('*')
                .eq('patient_id', pRow.id)
                .order('created_at', { ascending: false });
              patient = {
                ...pRow,
                hn: pRow.id,
                opdRecords: (trts || []).map(t => ({
                  ...t,
                  date: t.date || t.datetime,
                  cc: t.chief_complaint || t.chiefComplaint || pRow.chief_complaint || '',
                  tx: t.prescription || t.treatment_detail || []
                }))
              };
            }
          } catch (e) {
            console.warn('[AutoPrint OPD] Supabase fetch error:', e);
          }
        }

        if (patient) {
          // ตรวจสอบเลข 4 ตัวท้ายบัตรประชาชน เฉพาะเมื่อในลิงก์มีการส่งรหัสมาตรวจสอบเท่านั้น (Security Hash Verification)
          let actualIdc = patient.idCard || patient.id_card ? String(patient.idCard || patient.id_card).replace(/\D/g, '') : "0000";
          if (actualIdc.length < 4) actualIdc = "0000";
          const actualId4 = actualIdc.slice(-4);

          if (printOpdId4 && printOpdId4 !== actualId4) {
            document.open();
            document.write(`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Kanit', sans-serif; text-align: center; margin-top: 15%; color: #334155; padding: 24px;">
                <div style="font-size: 52px; margin-bottom: 16px;">🚫</div>
                <h2 style="color: #ef4444; font-size: 22px; margin-bottom: 8px;">ปฏิเสธการเข้าถึง (Access Denied)</h2>
                <p style="color: #64748b; font-size: 15px; margin-bottom: 24px;">รหัสยืนยันตัวตนไม่ตรงกับฐานข้อมูล เพื่อความปลอดภัยตาม PDPA</p>
                <a href="/" style="display: inline-block; background: #0ea5e9; color: white; padding: 10px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(14,165,233,0.25);">กลับสู่หน้าหลัก</a>
              </div>
            `);
            document.close();
            return;
          }

          if (safeBranches.length === 0 && supabase) {
            try {
              const { data: bData } = await supabase.from('branches').select('*');
              if (bData && bData.length > 0) safeBranches = bData;
            } catch (e) {}
          }

          let targetRecord = null;
          let visitNumber = 1;

          if (patient.opdRecords && patient.opdRecords.length > 0) {
            if (printOpdDate) {
              const targetDate = new Date(printOpdDate).toLocaleDateString('th-TH');
              const idx = patient.opdRecords.findIndex(r => {
                try {
                  const rDateStr = new Date(r.date || r.createdAt || r.created_at).toLocaleDateString('th-TH');
                  return rDateStr === targetDate;
                } catch(e) { return false; }
              });

              if (idx !== -1) {
                targetRecord = patient.opdRecords[idx];
                visitNumber = patient.opdRecords.length - idx;
              }
            }
            if (!targetRecord) {
              targetRecord = patient.opdRecords[0];
              visitNumber = patient.opdRecords.length;
            }
          }

          if (!targetRecord) {
            targetRecord = {
              date: printOpdDate || new Date().toISOString(),
              cc: patient.chief_complaint || patient.chiefComplaint || '',
              tx: []
            };
            visitNumber = 1;
          }

          if (!targetRecord.cc) {
            targetRecord.cc = targetRecord.chief_complaint || targetRecord.chiefComplaint || patient.chief_complaint || patient.chiefComplaint || '';
          }
          if (!targetRecord.tx) {
            targetRecord.tx = targetRecord.prescription || targetRecord.treatment_detail || [];
          }

          const html = globalGenerateOpdHtml(patient, targetRecord, visitNumber, safeBranches, currentBranch);

          document.open();
          document.write(html);
          document.close();

          setTimeout(() => {
            window.print();
          }, 800);
        } else {
          document.open();
          document.write(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Kanit', sans-serif; text-align: center; margin-top: 15%; color: #334155; padding: 24px;">
              <div style="font-size: 52px; margin-bottom: 16px;">⚠️</div>
              <h2 style="color: #ef4444; font-size: 22px; margin-bottom: 8px;">ไม่พบข้อมูลคนไข้</h2>
              <p style="color: #64748b; font-size: 15px; margin-bottom: 24px;">ไม่พบประวัติคนไข้ในระบบฐานข้อมูล หรือสิทธิ์การเข้าถึงข้อมูลไม่เพียงพอ</p>
              <a href="/" style="display: inline-block; background: #0ea5e9; color: white; padding: 10px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(14,165,233,0.25);">กลับสู่หน้าหลัก</a>
            </div>
          `);
          document.close();
        }
      };

      executePrintOpd();
    }
  }, [isLoggedIn, patientsData, financeData, branchesData, currentBranch, posProducts]);

  useEffect(() => {
    if (pdpaQrModal.isOpen && pdpaQrModal.link) {
      QRCode.toDataURL(pdpaQrModal.link, { width: 300, margin: 1 })
        .then(url => setPdpaQrDataUrl(url))
        .catch(err => console.error("QR Generation Error:", err));
    } else {
      setPdpaQrDataUrl('');
    }
  }, [pdpaQrModal.isOpen, pdpaQrModal.link]);

  // --- States for clinic settings (prefixes, roles/permissions, categories) ---
  const [staffPrefixes, setStaffPrefixes] = useState(['นาย', 'นาง', 'นางสาว', 'ดร.', 'นพ.', 'พญ.', 'ทพ.', 'ทพญ.']);
  const [rolePermissions, setRolePermissions] = useState({
    admin: ['dashboard', 'exec_dashboard', 'records', 'queue', 'pos', 'coupons', 'catalog', 'inventory', 'finance', 'staff', 'branch', 'reports', 'settings', 'display_ads'],
    doctor: ['dashboard', 'records', 'queue'],
    nurse: ['records', 'queue'],
    sale: ['pos', 'coupons', 'catalog'],
    suspended: []
  });
  const [roleLabels, setRoleLabels] = useState({
    admin: 'แอดมิน (Admin)',
    doctor: 'แพทย์ (Doctor)',
    nurse: 'พยาบาล/ผู้ช่วย (Nurse)',
    sale: 'พนักงานขาย/ที่ปรึกษา (Sale)',
    suspended: '⛔ ระงับบัญชี (Suspended)'
  });
  const [staffCategories, setStaffCategories] = useState(['แพทย์', 'สต๊าฟ/พนักงาน']);
  const [appointmentStatuses, setAppointmentStatuses] = useState([
    { label: 'รอยืนยัน', color: 'amber' },
    { label: 'ยืนยันแล้ว', color: 'emerald' },
    { label: 'เลื่อนนัด', color: 'violet' },
    { label: 'ยกเลิก', color: 'rose' }
  ]);
  const [integrationTokens, setIntegrationTokens] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('clinic_integration_tokens');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.line || parsed.discord)) return parsed;
        }
      }
    } catch(e) {}
    return { line: '', telegram: '', discord: '', lineGroupId: '' };
  });
  const [gdriveTokens, setGdriveTokens] = useState({ generalDriveFolderId: '', pdpaDriveFolderId: '' });
  const [posQrSettings, setPosQrSettings] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('clinic_pos_qr_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.accounts) && parsed.accounts.length > 0) return parsed;
        }
      }
    } catch(e) {}
    return DEFAULT_POS_QR_SETTINGS;
  });

  // --- ฟังก์ชันอ่านออกเสียง (TTS) รองรับทั้ง Localhost และ Production (Vite/Vercel Proxy + Native Fallback) ---
  const speak = (text, onEnd) => {
    if (!text) {
      if (onEnd) onEnd();
      return;
    }
    
    const hasThai = /[ก-ฮ]/.test(text);
    const lang = hasThai ? 'th' : 'en';

    let isEnded = false;
    const safeOnEnd = () => {
      if (!isEnded) {
        isEnded = true;
        if (onEnd) onEnd();
      }
    };

    // 1. เรียกใช้ /api/tts (รองรับทั้ง Localhost ผ่าน Vite Middleware และ Production บน Vercel)
    const proxyUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
    const audio = new Audio(proxyUrl);
    
    audio.playbackRate = 1.35;
    audio.preservesPitch = true;
    audio.onended = safeOnEnd;

    const fallbackToNative = () => handleNativeTTS(text, safeOnEnd, lang);

    audio.onerror = fallbackToNative;
    audio.play().catch(fallbackToNative);
  };

  // Helper สำหรับเรียกใช้ Native Browser TTS (รองรับระบุภาษา)
  const handleNativeTTS = (text, onEnd, lang = 'th') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
      utterance.rate = 1.35;
      
      const voices = window.speechSynthesis.getVoices();
      if (lang === 'th' && Array.isArray(voices) && voices.length > 0) {
        const thaiVoice = voices.find(v => (v.lang && (v.lang === 'th-TH' || v.lang.startsWith('th'))) || (v.name && (v.name.includes('Thai') || v.name.includes('Kanya') || v.name.includes('Pattara'))));
        if (thaiVoice) utterance.voice = thaiVoice;
      }

      utterance.onend = () => { if (onEnd) onEnd(); };
      utterance.onerror = () => { if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  };



  const fetchQueueForMonth = async (year, month) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (loadedMonths.has(monthKey) || fetchingMonthsRef.current.has(monthKey)) return;

    fetchingMonthsRef.current.add(monthKey);

    setIsQueueFetching(true); // เริ่มโหลด
    try {
        // ขอข้อมูลจาก Backend โดยระบุเดือนและปี
        const res = await callAppScript('GET_DATA_BY_MONTH', 'Queue', { year, month: month + 1 });
        if (res?.status === 'success' && Array.isArray(res.data)) {
            setQueueData(prev => {
                // ป้องกันข้อมูลซ้ำโดยใช้ ID
                const existingIds = new Set(prev.map(item => item.id));
                const newData = res.data.filter(item => !existingIds.has(item.id));
                return [...prev, ...newData];
            });
            setLoadedMonths(prev => {
                const newSet = new Set(prev);
                newSet.add(monthKey);
                return newSet;
            });
        }
    } catch (error) {
        console.error("Fetch Month Error:", error);
    } finally {
        setIsQueueFetching(false); // โหลดเสร็จสิ้น
    }
  };


  // --- ระบบ Global Alert ส่วนกลาง (ทดแทน sweetAlert/medAlert ของแต่ละหน้า) ---
  const globalAlert = useModal();
  const [globalAlertConfig, setGlobalAlertConfig] = useState({ type: '', title: '', text: '', onConfirm: null, hideCancel: false });

  const showGlobalAlert = ({ type = 'info', title = '', text = '', message = '', onConfirm = null, hideCancel = false }) => {
    setGlobalAlertConfig({ type, title, text: text || message, onConfirm, hideCancel });
    globalAlert.open();
  };

  const GlobalAlertUI = () => {
      if (!globalAlert.isOpen) return null;
      return createPortal(
          <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${globalAlert.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
            <div className={`bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center ${globalAlert.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${globalAlertConfig.type === 'info' ? 'bg-sky-100 text-sky-500' : 'bg-rose-100 text-rose-500'}`}>
                {globalAlertConfig.type === 'info' ? <FileText size={40} /> : <AlertTriangle size={40} />}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2 kanit-text">{globalAlertConfig.title}</h3>
              <p className="text-slate-500 mb-8 kanit-text">{globalAlertConfig.text}</p>
              <div className="flex gap-3 w-full">
                {!globalAlertConfig.hideCancel && (
                  <button onClick={globalAlert.close} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">
                    ยกเลิก
                  </button>
                )}
                <button onClick={() => { if (globalAlertConfig.onConfirm) globalAlertConfig.onConfirm(); globalAlert.close(); }} className={`flex-1 py-3.5 text-white rounded-2xl font-semibold transition-colors shadow-lg kanit-text ${globalAlertConfig.type === 'info' ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/30' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'}`}>
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>,
          document.body
      );
  };

  // --- ระบบคีย์ลัดสากล (Global Keyboard Shortcuts) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT');
      const isTextarea = activeEl && (activeEl.tagName === 'TEXTAREA');
      const isEditable = isInput || isTextarea || activeEl?.isContentEditable;

      // 1. Shift + ? หรือ Ctrl + / -> เปิด/ปิดหน้าต่างแสดงแป้นพิมพ์ลัด
      if (((e.ctrlKey || e.metaKey) && e.key === '/') || (e.shiftKey && (e.key === '?' || e.key === '/'))) {
        if ((e.ctrlKey || e.metaKey) || !isEditable) {
          e.preventDefault();
          setIsShortcutsModalOpen(prev => !prev);
          return;
        }
      }

      // 2. Escape: ปิด Modal หรือล้างข้อความในช่องค้นหา/ช่องพิมพ์
      if (e.key === 'Escape') {
        // ก) หากกำลังโฟกัสอยู่ที่ช่อง Input ที่มีข้อความอยู่ ให้ล้างข้อความก่อน
        if (isInput && activeEl.value && activeEl.value.trim().length > 0) {
          e.preventDefault();
          e.stopPropagation();

          // ลองกดปุ่มล้างข้อความที่อยู่ข้างๆ ก่อนถ้ามี
          const clearBtn = activeEl.parentElement?.querySelector('button[title*="ล้างข้อความ"]');
          if (clearBtn) {
            clearBtn.click();
          } else {
            // ใช้ setter ของ HTMLInputElement เพื่อให้ React รับรู้ onChange
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(activeEl, '');
            } else {
              activeEl.value = '';
            }
            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
            activeEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return;
        }

        // หากอยู่ใน input แต่ไม่มีข้อความแล้ว ให้ unfocus
        if (isInput) {
          activeEl.blur();
        }

        // ข) หากไม่มีข้อความในช่อง หรืออยู่นอก input: ปิด Modal ต่างๆ
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setIsShortcutsModalOpen(false);
          return;
        }

        if (navUnsavedModal.isOpen) {
          e.preventDefault();
          setNavUnsavedModal({ isOpen: false, targetTab: null });
          return;
        }

        if (pdpaQrModal.isOpen) {
          e.preventDefault();
          setPdpaQrModal({ isOpen: false, link: '' });
          return;
        }

        if (globalAlert.isOpen) {
          e.preventDefault();
          globalAlert.close();
          return;
        }

        // ปิด Profile dropdown หากเปิดอยู่
        if (isProfileDropdownOpen || isMobileProfileDropdownOpen) {
          setIsProfileDropdownOpen(false);
          setIsMobileProfileDropdownOpen(false);
        }

        // ค้นหา Modal หรือ Dialog อื่นๆ ที่เปิดอยู่บนหน้าจอ
        const modals = Array.from(document.querySelectorAll('.fixed.inset-0, [role="dialog"]')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        if (modals.length > 0) {
          const topModal = modals[modals.length - 1];
          const closeBtn = topModal.querySelector('button[title*="ปิด"], button[title*="Close"], button[aria-label*="close"], button:has(.lucide-x), button:has(.lucide-x-circle)');
          if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            closeBtn.click();
            return;
          }
        }
      }

      // ฟังก์ชันตรวจสอบความชัดเจนของ Element ว่าแสดงผลจริงบนหน้าจอ (ไม่ถูกซ่อน ไม่เป็น 0x0)
      const isElementVisible = (el) => {
        if (!el || el.disabled) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || style.pointerEvents === 'none') {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      // ฟังก์ชันค้นหาปุ่มบันทึกที่ถูกต้อง ปลอดภัย และแม่นยำที่สุด
      const findActiveSaveButton = () => {
        // ก) ค้นหา Modal หรือ Dialog ที่เปิดอยู่และแสดงผลจริงบนหน้าจอ
        const activeModals = Array.from(document.querySelectorAll('.fixed.inset-0, [role="dialog"]')).filter(el => {
          if (!isElementVisible(el)) return false;
          // ต้องมีการ์ด modal หรือปุ่ม/เนื้อหาอยู่ข้างใน (ไม่เอา backdrop เปล่า)
          return el.querySelector('button, input, form, [role="document"], .bg-white') !== null;
        });

        if (activeModals.length > 0) {
          const topModal = activeModals[activeModals.length - 1];

          // 1. ปุ่มที่มี data-save-btn="true" ใน Modal
          const explicitModalBtn = topModal.querySelector('[data-save-btn="true"]:not(:disabled)');
          if (explicitModalBtn && isElementVisible(explicitModalBtn)) return explicitModalBtn;

          // 2. ปุ่ม type="submit"
          const submitBtn = topModal.querySelector('button[type="submit"]:not(:disabled)');
          if (submitBtn && isElementVisible(submitBtn)) return submitBtn;

          // 3. ปุ่มข้อความบันทึกใน Modal (คัดกรองปุ่มยกเลิก, ปิด, หรือยังไม่บันทึก ออกเด็ดขาด)
          const modalBtns = Array.from(topModal.querySelectorAll('button:not(:disabled)')).filter(isElementVisible);
          const textModalBtn = modalBtns.find(btn => {
            const txt = (btn.textContent || '').trim();
            if (txt.includes('ยกเลิก') || txt.includes('ยังไม่บันทึก') || txt.includes('ไม่บันทึก') || txt.includes('ปิด')) return false;
            return txt.includes('บันทึก') || txt.includes('ยืนยัน') || txt.includes('ตกลง') || txt.includes('ชำระเงิน');
          });
          if (textModalBtn) return textModalBtn;
        }

        // ข) หากไม่มี Modal ให้มองหาปุ่มบันทึกบนหน้าหลักปัจจุบัน
        // 1. ปุ่มที่มี data-save-btn="true" บนหน้า
        const explicitPageBtns = Array.from(document.querySelectorAll('[data-save-btn="true"]:not(:disabled)')).filter(isElementVisible);
        if (explicitPageBtns.length > 0) {
          return explicitPageBtns[explicitPageBtns.length - 1];
        }

        // 2. ค้นหาปุ่มที่มีคำว่าบันทึกบนหน้า (คัดกรอง 'ยังไม่บันทึก', 'ไม่บันทึก', 'ยกเลิก', 'ปิด' ออกเด็ดขาด)
        const pageBtns = Array.from(document.querySelectorAll('button:not(:disabled)')).filter(isElementVisible);
        const textPageBtn = pageBtns.find(btn => {
          const txt = (btn.textContent || '').trim();
          if (txt.includes('ยังไม่บันทึก') || txt.includes('ไม่บันทึก') || txt.includes('ยกเลิก') || txt.includes('ปิด')) return false;
          return (
            txt.includes('บันทึกการตั้งค่า') ||
            txt.includes('บันทึกข้อมูล') ||
            txt.includes('บันทึกสิทธิ์') ||
            txt.includes('บันทึกรายการ') ||
            txt.includes('บันทึกสถานะ') ||
            txt.includes('บันทึก') ||
            txt.includes('ชำระเงิน') ||
            txt.includes('ยืนยัน')
          );
        });

        return textPageBtn || null;
      };

      // 3. Ctrl + K หรือ / : ค้นหาด่วน (Quick Search - รองรับคีย์บอร์ดไทย)
      const isKeyK = e.code === 'KeyK' || e.key?.toLowerCase() === 'k' || e.key === 'า' || e.keyCode === 75;
      if (((e.ctrlKey || e.metaKey) && isKeyK) || (e.key === '/' && !isEditable)) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="ค้นหา"], input[type="search"], input[placeholder*="พิมพ์"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
        return;
      }

      // 4. Alt + S หรือ Ctrl + S: บันทึกข้อมูลทันที (รองรับทั้งภาษาไทยและอังกฤษ ป้องกันเบราว์เซอร์เด้ง Save HTML)
      const isKeyS = e.code === 'KeyS' || e.key?.toLowerCase() === 's' || e.key === 'ห' || e.key === 'ฆ' || e.keyCode === 83;
      if ((e.altKey && isKeyS) || ((e.ctrlKey || e.metaKey) && isKeyS)) {
        e.preventDefault();
        e.stopPropagation();

        if (activeEl && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }

        const targetBtn = findActiveSaveButton();
        if (targetBtn) {
          targetBtn.click();
        } else {
          // ตรวจสอบว่ามีปุ่มบันทึกที่ disabled อยู่หรือไม่
          const disabledSaveBtn = document.querySelector('[data-save-btn="true"]:disabled');
          if (disabledSaveBtn) {
            triggerGlobalToast('ระบบกำลังบันทึกข้อมูลอยู่ กรุณารอสักครู่...', 'warning');
          }
        }
        return;
      }

      // 5. Alt + N หรือ F2: เพิ่มรายการใหม่ด่วน (รองรับคีย์บอร์ดไทย)
      const isKeyN = e.code === 'KeyN' || e.key?.toLowerCase() === 'n' || e.key === 'ื' || e.keyCode === 78;
      if ((e.altKey && isKeyN) || e.key === 'F2') {
        e.preventDefault();
        const newBtn = Array.from(document.querySelectorAll('button:not(:disabled)')).find(btn => {
          const txt = (btn.textContent || '').trim();
          if (txt.includes('ยกเลิก') || txt.includes('ปิด')) return false;
          return (txt.includes('เพิ่ม') || txt.includes('ลงทะเบียน') || txt.includes('นัดหมายใหม่')) &&
            isElementVisible(btn);
        }) || document.querySelector('button:not(:disabled):has(.lucide-plus)');

        if (newBtn) {
          newBtn.click();
        }
        return;
      }

      // 6. Enter: บันทึก/ยืนยันข้อมูล หากไม่ได้อยู่ใน Textarea หรือ Button
      if (e.key === 'Enter') {
        if (isTextarea) return;
        if (activeEl?.tagName === 'BUTTON') return;
        if (activeEl?.tagName === 'SELECT') return;

        // หากอยู่ใน input ที่อยู่ใน <form> ปล่อยให้เบราว์เซอร์ submit ธรรมชาติ
        if (activeEl?.tagName === 'INPUT' && activeEl.form) {
          return;
        }

        // หากไม่ได้อยู่ใน Input (เช่น กด Enter ว่างๆ ในหน้า) หรืออยู่ใน Modal
        const activeModals = Array.from(document.querySelectorAll('.fixed.inset-0, [role="dialog"]')).filter(el => {
          if (!isElementVisible(el)) return false;
          return el.querySelector('button, input, form, [role="document"], .bg-white') !== null;
        });

        if (!isInput || activeModals.length > 0) {
          const targetBtn = findActiveSaveButton();
          if (targetBtn) {
            e.preventDefault();
            targetBtn.click();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isShortcutsModalOpen, navUnsavedModal, pdpaQrModal, globalAlert, isProfileDropdownOpen, isMobileProfileDropdownOpen]);

  // แจ้งเตือนแบบ Multi-toast Stack ปลอดภัยสูง แสดงบนสุด เรียงซ้อนกัน 4 อัน (แยก Component เพื่อความปลอดภัยไม่ให้ App re-render)
  const showToast = (message, type = 'success') => {
    triggerGlobalToast(message, type);
  };

  // --- 🧪 Sandbox Simulation Handlers (รันข้อมูลจากไฟล์ Excel บน Memory เท่านั้น) ---
  const handleStartSimulation = (simData) => {
    if (!simData) return;

    // 1. สำรองข้อมูลจริงไว้คืนค่าเมื่อออกจากโหมดจำลอง
    setRealBackupData({
      posHistoryData: [...posHistoryData],
      financeData: [...financeData],
      inventoryLogsData: [...inventoryLogsData]
    });

    // 2. ปรับแต่งและโหลดข้อมูลจำลอง
    if (Array.isArray(simData.pos_transactions) && simData.pos_transactions.length > 0) {
      const mappedPos = simData.pos_transactions.map(row => {
        let items = row.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch (e) { items = []; }
        }
        return {
          ...row,
          items: Array.isArray(items) ? items : (row.items || []),
          receiptNo: row.receipt_no || row.receiptNo || row.id,
          totalAmount: Number(row.total_amount || row.totalAmount || row.grand_total || row.grandTotal || 0),
          netTotal: Number(row.net_total || row.netTotal || row.total_amount || 0),
          paymentMethod: row.payment_method || row.paymentMethod || 'cash'
        };
      });
      setPosHistoryData(mappedPos);
    }

    const simRevenues = Array.isArray(simData.finance_revenue) ? simData.finance_revenue.map(r => ({
      ...r,
      type: 'revenue',
      amount: Number(r.amount || 0),
      category: r.category || 'รายรับ',
      date: r.date || r.created_at
    })) : [];

    const simExpenses = Array.isArray(simData.finance_expenses) ? simData.finance_expenses.map(e => ({
      ...e,
      type: 'expense',
      amount: Number(e.amount || 0),
      category: e.category || 'รายจ่าย',
      date: e.date || e.created_at
    })) : [];

    if (simRevenues.length > 0 || simExpenses.length > 0) {
      setFinanceData([...simRevenues, ...simExpenses]);
    }

    if (Array.isArray(simData.inventory_logs) && simData.inventory_logs.length > 0) {
      setInventoryLogsData(simData.inventory_logs);
    }

    setIsSimulationMode(true);
    setSimulationMeta(simData);
    showToast(`เข้าสู่โหมดจำลองข้อมูลจาก "${simData.fileName}" รวม ${simData.totalRecords.toLocaleString()} รายการเรียบร้อยแล้ว`, 'info');
  };

  const handleExitSimulation = () => {
    if (realBackupData) {
      setPosHistoryData(realBackupData.posHistoryData || []);
      setFinanceData(realBackupData.financeData || []);
      setInventoryLogsData(realBackupData.inventoryLogsData || []);
    }
    setIsSimulationMode(false);
    setSimulationMeta(null);
    setRealBackupData(null);
    showToast('ออกจากโหมดจำลองข้อมูล และคืนค่าข้อมูลจริงจากเซิร์ฟเวอร์เรียบร้อยแล้ว', 'success');
  };

  const handleScroll = rAFThrottle((e) => {
    setIsScrolled(e.target.scrollTop > 20);
  });

  // --- [NEW] รวมฟังก์ชันพิมพ์ใบเสร็จมาไว้ตรงกลาง เพื่อให้ทุกหน้าระบบเรียกใช้แบบเดียวกัน (DRY) ---
  const handlePrintReceipt = (txn, format = 'A4') => {
    if (!txn) return;
    
    // Determine which branch to use: prioritize transaction's branch (POS branch) over sidebar selection
    const branchToUse = (txn.branchId && txn.branchId !== 'all') ? txn.branchId : (currentBranch !== 'all' ? currentBranch : '');

    if (!branchToUse || branchToUse === 'all') {
        showToast('กรุณาเลือกสาขาที่จะทำรายการก่อนพิมพ์เอกสาร', 'warning');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
        return;
    }

    const html = globalGenerateReceiptHtml(txn, format, branchesData, patientsData, posProducts, currentBranch);

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 800); // เผื่อเวลาโหลดฟอนต์
  };

  // --- [NEW] ดึงข้อมูลคนไข้แบบ Paginated (Server-side Infinite Loading) พร้อม Treatments เฉพาะกลุ่ม ---
  const fetchPatientsPaginated = useCallback(async ({ offset = 0, limit = 35, search = '', sortKey = 'createdAt', sortDir = 'desc', columns, skipTreatments = false } = {}) => {
    try {
      const resPatients = await callAppScript('GET_PATIENTS_PAGINATED', 'Patients', { offset, limit, search, sortKey, sortDir, columns });
      if (resPatients?.status === 'success' && Array.isArray(resPatients.data)) {
        const rawPatients = resPatients.data;
        const patientIds = [];
        rawPatients.forEach(p => {
          if (p.id) patientIds.push(p.id);
          if (p.hn && p.hn !== p.id) patientIds.push(p.hn);
        });

        let treatmentsMap = {};
        if (!skipTreatments && patientIds.length > 0) {
          try {
            const resTx = await callAppScript('GET_TREATMENTS_FOR_PATIENTS', 'Treatments', { patientIds });
            if (resTx?.status === 'success' && Array.isArray(resTx.data)) {
              resTx.data.forEach(t => {
                const pid = String(t.patient_id || t.patientId || t.hn || '').trim();
                if (pid) {
                  const lower = pid.toLowerCase();
                  const norm = lower.replace(/o/g, '0');
                  if (!treatmentsMap[pid]) treatmentsMap[pid] = [];
                  if (!treatmentsMap[lower]) treatmentsMap[lower] = treatmentsMap[pid];
                  if (!treatmentsMap[norm]) treatmentsMap[norm] = treatmentsMap[pid];
                  treatmentsMap[pid].push(t);
                }
              });
            }
          } catch (e) {}
        }

        const patientsWithOpd = rawPatients.map(patient => {
          let legacyOpd = [];
          if (Array.isArray(patient.opdRecords)) {
            legacyOpd = patient.opdRecords;
          } else if (typeof patient.opdRecords === 'string' && patient.opdRecords.trim().startsWith('[')) {
            try { legacyOpd = JSON.parse(patient.opdRecords); } catch (e) {}
          }

          const pId = String(patient.id || '').trim();
          const pHn = String(patient.hn || '').trim();
          const pNorm = (pId || pHn).toLowerCase().replace(/o/g, '0');

          const fetchedTx = treatmentsMap[pId] || treatmentsMap[pHn] || treatmentsMap[pNorm] || [];
          const finalOpd = fetchedTx.length > 0 ? fetchedTx : legacyOpd;

          return {
            ...patient,
            opdRecords: finalOpd,
            treatment_count: finalOpd.length,
            treatmentCount: finalOpd.length
          };
        });

        return {
          status: 'success',
          patients: patientsWithOpd,
          totalCount: resPatients.totalCount || patientsWithOpd.length,
          hasMore: resPatients.hasMore
        };
      }
    } catch (e) {
      console.error("fetchPatientsPaginated error:", e);
    }
    return { status: 'error', patients: [], totalCount: 0, hasMore: false };
  }, []);

  const fetchPatientStats = useCallback(async () => {
    try {
      const res = await callAppScript('GET_PATIENT_STATS', 'Patients');
      if (res?.status === 'success' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.error('fetchPatientStats error:', e);
    }
    return { total: 0, male: 0, female: 0 };
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await callAppScript('GET_DASHBOARD_STATS', 'System');
      if (res?.status === 'success' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.error('fetchDashboardStats error:', e);
    }
    return { totalPatients: 0, todaysQueue: 0, pendingQueue: 0, activeBranches: 1 };
  }, []);

  const fetchAppointmentStats = useCallback(async (branchId) => {
    try {
      const targetBranch = branchId || currentBranch || 'all';
      const res = await callAppScript('GET_APPOINTMENT_STATS', 'Queue', { branch_id: targetBranch });
      if (res?.status === 'success' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.error('fetchAppointmentStats error:', e);
    }
    return { total: 0, todayCount: 0, completed: 0, confirmed: 0, pending: 0, cancelled: 0 };
  }, [currentBranch]);

  const fetchInventoryStats = useCallback(async () => {
    try {
      const res = await callAppScript('GET_INVENTORY_STATS', 'Inventory');
      if (res?.status === 'success' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.error('fetchInventoryStats error:', e);
    }
    return { totalItems: 0, outOfStock: 0 };
  }, []);

  const fetchFinanceStats = useCallback(async () => {
    try {
      const res = await callAppScript('GET_FINANCE_STATS', 'Finance');
      if (res?.status === 'success' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.error('fetchFinanceStats error:', e);
    }
    return { revenueCount: 0, expenseCount: 0, posCount: 0 };
  }, []);

  const fetchStaffStats = useCallback(async () => {
    try {
      const res = await callAppScript('GET_STAFF_STATS', 'Staff');
      if (res?.status === 'success' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.error('fetchStaffStats error:', e);
    }
    return { totalStaff: 0, activeStaff: 0 };
  }, []);

  // --- [NEW] ดึงข้อมูล Treatments เฉพาะคนไข้คนเดียวบน Demand เมื่อเปิด Modal เท่านั้น (Lazy Load ประหยัด Egress 100%) ---
  // --- [NEW] ดึงข้อมูล Treatments เฉพาะคนไข้คนเดียวบน Demand เมื่อเปิด Modal เท่านั้น (Lazy Load ประหยัด Egress 100%) ---
  const fetchPatientTreatments = async (patientId, candidateIds = []) => {
    if (!patientId) return [];
    try {
      const pIdStr = String(patientId).trim();
      const allIds = Array.from(new Set([pIdStr, ...(Array.isArray(candidateIds) ? candidateIds : [])].filter(Boolean)));
      const res = await callAppScript('GET_TREATMENTS_BY_PATIENT', 'Treatments', { 
        patientId: pIdStr,
        patientIds: allIds,
        id: allIds[0] || pIdStr
      });
      if (res?.status === 'success' && Array.isArray(res.data)) {
        const formattedTreatments = res.data.map(formatTreatmentRecord);
        formattedTreatments.sort((a, b) => {
          const tA = parseAnyDate(a.created_at || a.datetime || a.date)?.getTime() || 0;
          const tB = parseAnyDate(b.created_at || b.datetime || b.date)?.getTime() || 0;
          return tB - tA;
        });
        
        const idSet = new Set(allIds.map(x => x.toLowerCase()));
        setPatientsData(prev => {
          const exists = prev.some(p => p && (idSet.has(String(p.id || '').trim().toLowerCase()) || idSet.has(String(p.hn || '').trim().toLowerCase())));
          if (!exists) {
            getLocalStore('patients').then(allLocal => {
              const matched = (allLocal || []).find(p => p && (idSet.has(String(p.id || '').trim().toLowerCase()) || idSet.has(String(p.hn || '').trim().toLowerCase())));
              if (matched) {
                const newP = { ...matched, opdRecords: formattedTreatments };
                setPatientsData(curr => [newP, ...curr.filter(p => !idSet.has(String(p.id || '').trim().toLowerCase()) && !idSet.has(String(p.hn || '').trim().toLowerCase()))]);
              }
            }).catch(() => {});
            return prev;
          }
          return prev.map(p => {
            if (p && (idSet.has(String(p.id || '').trim().toLowerCase()) || idSet.has(String(p.hn || '').trim().toLowerCase()))) {
              return { ...p, opdRecords: formattedTreatments };
            }
            return p;
          });
        });

        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const rawPid = String(patientId).trim();
            const lowerPid = rawPid.toLowerCase();
            const savedStr = localStorage.getItem('clinic_treatment_counts');
            const currentMap = savedStr ? JSON.parse(savedStr) : {};
            currentMap[rawPid] = formattedTreatments.length;
            currentMap[lowerPid] = formattedTreatments.length;
            localStorage.setItem('clinic_treatment_counts', JSON.stringify(currentMap));
          }
        } catch (err) {}

        return formattedTreatments;
      }
    } catch (e) {
      console.error("fetchPatientTreatments error:", e);
    }
    return [];
  };

  // --- ระบบ Realtime Sync ช่วยอัปเดต State หน้าเว็บทันทีเมื่อเพิ่ม/แก้ไข/ลบข้อมูล ---
  const syncLocalStateOnSave = useCallback((sheetName, payload) => {
    if (!payload) return;
    const targetId = String(payload.id || payload.hn || '').trim();
    const targetName = String(payload.name || payload.patientName || payload.title || '').trim().toLowerCase();

    if (sheetName === 'Patients') {
      setPatientsData(prev => {
        const idx = prev.findIndex(p => 
          (targetId && String(p.id || p.hn || '').trim() === targetId) ||
          (targetName && String(p.name || '').trim().toLowerCase() === targetName)
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'Queue') {
      setQueueData(prev => {
        const payloadHn = String(payload.hn || payload.patientId || '').trim();
        const payloadDate = String(payload.rawDateTime || payload.datetime || payload.date || '').trim();

        const idx = prev.findIndex(q => {
          const qId = String(q.id || '').trim();
          if (targetId && qId && qId === targetId) return true;
          
          const qHn = String(q.hn || q.patientId || '').trim();
          const qDate = String(q.rawDateTime || q.datetime || q.date || '').trim();
          if (payloadHn && qHn && payloadHn === qHn && payloadDate && qDate && payloadDate === qDate) return true;
          
          return false;
        });

        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'Inventory') {
      setInventoryData(prev => {
        const pId = String(payload.id || '').trim();
        // 1. หาตาม ID แถวโดยตรง (สำหรับสต็อกรายล็อต)
        let idx = pId ? prev.findIndex(i => String(i.id || '').trim() === pId) : -1;
        // 2. ถ้าไม่พบ หาตามรหัสสินค้า + สาขา + ล็อต
        if (idx === -1 && (payload.code || payload.productId)) {
          const cleanCode = String(payload.code || payload.productId).replace(/^INV_/, '').trim().toLowerCase();
          const pBranch = String(payload.branchId || payload.branch_id || '').trim();
          const pLot = String(payload.lotNo || payload.lot_no || '').trim();
          idx = prev.findIndex(i => {
            const iCode = String(i.code || i.productId || i.id || '').replace(/^INV_/, '').trim().toLowerCase();
            const iBranch = String(i.branchId || i.branch_id || '').trim();
            const iLot = String(i.lotNo || i.lot_no || '').trim();
            return iCode === cleanCode && (iBranch === pBranch || (!iBranch && !pBranch)) && (iLot === pLot || (!iLot && !pLot));
          });
        }
        // 3. Fallback สำหรับรายการทั่วไป
        if (idx === -1 && targetId) {
          idx = prev.findIndex(i => 
            String(i.id || i.code || '').trim() === targetId ||
            (targetName && String(i.name || '').trim().toLowerCase() === targetName)
          );
        }
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'InventoryLogs') {
      setInventoryLogsData(prev => {
        const idx = prev.findIndex(l => targetId && String(l.id || '').trim() === targetId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'setting_pos') {
      upsertLocalStore('setting_pos', [payload]).catch(() => {});
      setPosProducts(prev => {
        const idx = prev.findIndex(i => 
          (targetId && String(i.id || i.code || '').trim() === targetId) ||
          (targetName && String(i.name || '').trim().toLowerCase() === targetName)
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'Branches') {
      setBranchesData(prev => {
        const idx = prev.findIndex(b => 
          (targetId && String(b.id || '').trim() === targetId) ||
          (targetName && String(b.name || '').trim().toLowerCase() === targetName)
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [...prev, payload];
      });
    } else if (sheetName === 'POS_Transactions') {
      upsertLocalStore('pos_transactions', [payload]).catch(() => {});
      setPosHistoryData(prev => {
        const receiptNo = String(payload.receipt_no || payload.receiptNo || '').trim();
        const idx = prev.findIndex(t => 
          (targetId && String(t.id || '').trim() === targetId) ||
          (receiptNo && String(t.receiptNo || t.receipt_no || '').trim() === receiptNo) ||
          (t.date === payload.date && t.time === payload.time && String(t.hn || t.patient_name) === String(payload.hn || payload.patient_name))
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
      setFinanceData(prev => {
        const receiptNo = String(payload.receipt_no || payload.receiptNo || '').trim();
        const idx = prev.findIndex(f => 
          (targetId && String(f.id || '').trim() === targetId) ||
          (receiptNo && String(f.id || f.receiptNo || f.receipt_no || '').trim() === receiptNo)
        );
        const finRow = {
          id: payload.id || payload.receipt_no || payload.receiptNo,
          date: payload.created_at || payload.timestamp_date || payload.date || new Date().toISOString(),
          timestamp_date: payload.created_at || payload.timestamp_date || payload.date || new Date().toISOString(),
          amount: Number(payload.net_amount ?? payload.netAmount ?? payload.total_amount ?? payload.totalAmount ?? payload.amount ?? 0),
          category: 'รายได้จาก POS',
          note: payload.patient_name || payload.patientName || '',
          patientName: payload.patient_name || payload.patientName || '',
          branch_id: payload.branch_id || payload.branchId || 'main',
          items: payload.items || [],
          method: payload.payment_method || payload.paymentMethod || 'cash',
          status: payload.status || 'completed',
          is_auto: true,
          isAuto: true,
          type: 'income',
          subtotal: Number(payload.total_amount ?? payload.totalAmount ?? 0),
          discount_amount: Number(payload.discount ?? payload.discountAmount ?? 0),
          is_deleted: !!(payload.is_deleted || payload.isDeleted),
          doctorName: payload.doctorName || payload.doctor_name || payload.doctor || '',
          doctor_name: payload.doctorName || payload.doctor_name || payload.doctor || '',
          doctorId: payload.doctorId || payload.doctor_id || '',
          doctor_id: payload.doctorId || payload.doctor_id || '',
          sellerName: payload.sellerName || payload.seller_name || payload.staffName || payload.staff_name || '',
          seller_name: payload.sellerName || payload.seller_name || payload.staffName || payload.staff_name || '',
          sellerId: payload.sellerId || payload.seller_id || payload.staffId || payload.staff_id || '',
          seller_id: payload.sellerId || payload.seller_id || payload.staffId || payload.staff_id || '',
          staffName: payload.staffName || payload.staff_name || payload.sellerName || payload.seller_name || '',
          staff_name: payload.staffName || payload.staff_name || payload.sellerName || payload.seller_name || '',
          staffId: payload.staffId || payload.staff_id || payload.sellerId || payload.seller_id || '',
          staff_id: payload.staffId || payload.staff_id || payload.sellerId || payload.seller_id || '',
          rawTx: payload
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...finRow };
          return next;
        }
        return [finRow, ...prev];
      });
    } else if (sheetName === 'Staff') {
      setStaffData(prev => {
        const idx = prev.findIndex(s => 
          (targetId && String(s.id || '').trim() === targetId) ||
          (targetName && String(s.name || '').trim().toLowerCase() === targetName)
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'Staff_Schedules') {
      const staffId = String(payload.staff_id || payload.staffId || '').trim();
      if (staffId) {
        setStaffData(prev => prev.map(s => {
          if (String(s.id).trim() !== staffId) return s;
          const updatedSched = { ...(s.schedule || {}) };

          let otHours = 0;
          let isPaid = false;
          if (payload.notes) {
            try {
              const parsedNotes = typeof payload.notes === 'string' ? JSON.parse(payload.notes) : payload.notes;
              otHours = parsedNotes.otHours || 0;
              isPaid = !!parsedNotes.isPaid;
            } catch (e) {}
          }

          const shiftData = {
            active: payload.is_active !== undefined ? !!payload.is_active : !!payload.isActive,
            start: payload.start_time || payload.startTime || '09:00',
            end: payload.end_time || payload.endTime || '20:00',
            otHours,
            isPaid
          };

          if (payload.date) {
            updatedSched[payload.date] = shiftData;
            const dateParts = String(payload.date).split('-');
            if (dateParts.length === 3) {
              const yBE = parseInt(dateParts[0], 10) + 543;
              const thaiBEKey = `${dateParts[2].padStart(2,'0')}/${dateParts[1].padStart(2,'0')}/${yBE}`;
              updatedSched[thaiBEKey] = shiftData;
            }
          }
          const dayKey = payload.day_of_week !== undefined ? payload.day_of_week : payload.dayOfWeek;
          if (dayKey !== undefined && dayKey !== null) {
            updatedSched[dayKey] = shiftData;
            updatedSched[String(dayKey)] = shiftData;
          }

          return { ...s, schedule: updatedSched };
        }));
      }
    } else if (sheetName === 'Finance_Revenue' || sheetName === 'Finance_Expenses') {
      const storeName = sheetName === 'Finance_Revenue' ? 'finance_revenue' : 'finance_expenses';
      upsertLocalStore(storeName, [payload]).catch(() => {});
      setFinanceData(prev => {
        const idx = prev.findIndex(f => 
          (targetId && String(f.id || '').trim() === targetId) ||
          (f.date === payload.date && Number(f.amount) === Number(payload.amount) && f.category === payload.category)
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'Treatments') {
      const patientId = String(payload.patient_id || payload.patientId || payload.hn || '').trim();
      if (patientId) {
        upsertLocalStore('treatments', [payload]).catch(() => {});
        const formattedTrt = formatTreatmentRecord(payload);
        setPatientsData(prev => {
          const patientExists = prev.some(p => p && String(p.id || p.hn).trim().toLowerCase() === patientId.toLowerCase());
          if (!patientExists) {
            getLocalStore('patients').then(localPatients => {
              const matchedP = (localPatients || []).find(p => p && String(p.id || p.hn).trim().toLowerCase() === patientId.toLowerCase());
              if (matchedP) {
                const updatedP = {
                  ...matchedP,
                  opdRecords: [formattedTrt, ...(matchedP.opdRecords || [])]
                };
                setPatientsData(curr => [updatedP, ...curr.filter(p => String(p.id || p.hn).trim().toLowerCase() !== patientId.toLowerCase())]);
              } else if (supabase) {
                supabase.from('patients').select('*').or(`id.eq.${patientId},hn.eq.${patientId}`).then(({ data: pData }) => {
                  if (pData && pData[0]) {
                    const jsP = rowToJS(pData[0]);
                    jsP.opdRecords = [formattedTrt];
                    setPatientsData(curr => [jsP, ...curr.filter(p => String(p.id || p.hn).trim().toLowerCase() !== patientId.toLowerCase())]);
                  }
                }).catch(() => {});
              }
            }).catch(() => {});
            return prev;
          }

          return prev.map(p => {
            if (String(p.id || p.hn).trim().toLowerCase() === patientId.toLowerCase()) {
              const existingOpd = p.opdRecords || [];
              const targetTrtId = String(payload.id || '').trim();
              const targetDatetime = payload.datetime || `${payload.date || ''} ${payload.time || ''}`.trim();
              
              const idx = existingOpd.findIndex(t => 
                (targetTrtId && String(t.id || '').trim() === targetTrtId) ||
                (targetDatetime && t.datetime === targetDatetime && t.doctor === payload.doctor)
              );
              let updatedOpd;
              if (idx >= 0) {
                updatedOpd = [...existingOpd];
                updatedOpd[idx] = { ...updatedOpd[idx], ...formattedTrt };
              } else {
                updatedOpd = [formattedTrt, ...existingOpd];
              }
              updatedOpd.sort((a, b) => {
                const tA = parseAnyDate(a.created_at || a.datetime || a.date)?.getTime() || 0;
                const tB = parseAnyDate(b.created_at || b.datetime || b.date)?.getTime() || 0;
                return tB - tA;
              });
              return { ...p, opdRecords: updatedOpd };
            }
            return p;
          });
        });
      }
    } else if (sheetName === 'PatientCourses' || sheetName === 'patient_courses' || sheetName === 'Patient_Courses') {
      // Pure Realtime State: ไม่เก็บลง IndexedDB ตามคำสั่งเพื่อความถูกต้องของข้อมูลข้ามอุปกรณ์ 100%
      setPatientCoursesData(prev => {
        if (payload.is_deleted || payload.isDeleted) {
          return prev.filter(c => String(c.id).trim() !== targetId);
        }
        const idx = prev.findIndex(c => String(c.id).trim() === targetId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [payload, ...prev];
      });
    } else if (sheetName === 'Coupons' || sheetName === 'coupons') {
      setCouponsData(prev => {
        const cCode = String(payload.code || '').trim().toUpperCase();
        const idx = prev.findIndex(c => 
          (targetId && String(c.id || '').trim() === targetId) ||
          (cCode && String(c.code || '').trim().toUpperCase() === cCode)
        );
        if (idx >= 0) {
          const next = [...prev];
          const existing = next[idx] || {};
          const preservedBg = existing.bgImage || existing.bg_image || existing.designConfig?.customImageUrl || existing.design_config?.customImageUrl || '';
          const incomingBg = payload.bgImage || payload.bg_image || payload.designConfig?.customImageUrl || payload.design_config?.customImageUrl || '';
          const effectiveBg = incomingBg || preservedBg || null;

          const merged = { 
            ...existing, 
            ...payload,
            bgImage: effectiveBg,
            bg_image: effectiveBg
          };
          upsertLocalStore('coupons', [merged]).catch(() => {});
          next[idx] = merged;
          return next;
        }
        upsertLocalStore('coupons', [payload]).catch(() => {});
        return [payload, ...prev];
      });
    } else if (sheetName === 'Settings' || sheetName === 'settings') {
      const settingId = String(payload.id || '').trim();
      let vals = payload.values;
      if (typeof vals === 'string') {
        try { vals = JSON.parse(vals); } catch (e) {}
      }
      if (settingId === 'integration_tokens') {
        setIntegrationTokens(vals);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('clinic_integration_tokens', JSON.stringify(vals));
          }
        } catch (e) {}
      } else if (settingId === 'staff_prefixes') {
        if (Array.isArray(vals)) setStaffPrefixes(vals);
      } else if (settingId === 'staff_categories') {
        if (Array.isArray(vals)) setStaffCategories(vals);
      } else if (settingId === 'role_permissions') {
        if (vals) setRolePermissions(vals);
        if (payload.labels) setRoleLabels(payload.labels);
      } else if (settingId === 'appointment_statuses') {
        if (Array.isArray(vals)) setAppointmentStatuses(vals);
      } else if (settingId === 'gdrive_tokens') {
        if (vals) setGdriveTokens(vals);
      } else if (settingId === 'pos_qr_settings') {
        if (vals && Array.isArray(vals.accounts)) {
          setPosQrSettings(vals);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('clinic_pos_qr_settings', JSON.stringify(vals));
            }
          } catch (e) {}
        }
      }
    }
  }, []);

  const syncLocalStateOnDelete = useCallback((sheetName, payload) => {
    if (!payload) return;
    const targetId = String(payload.id || payload.hn || '').trim();
    if (!targetId) return;

    const mapSheetToStore = {
      Patients: 'patients',
      Queue: 'queue',
      Inventory: 'inventory',
      InventoryLogs: 'inventory_logs',
      setting_pos: 'setting_pos',
      Branches: 'branches',
      POS_Transactions: 'pos_transactions',
      Staff: 'staff',
      Staff_Schedules: 'staff_schedules',
      Finance_Revenue: 'finance_revenue',
      Finance_Expenses: 'finance_expenses',
      Treatments: 'treatments',
      Settings: 'settings',
      Coupons: 'coupons',
      coupons: 'coupons'
    };

    const storeName = mapSheetToStore[sheetName];
    if (storeName) {
      deleteFromLocalStore(storeName, targetId).catch(() => {});
    }

    if (sheetName === 'Patients') {
      setPatientsData(prev => prev.filter(p => String(p.id || p.hn) !== targetId));
    } else if (sheetName === 'Queue') {
      setQueueData(prev => prev.filter(q => String(q.id) !== targetId));
    } else if (sheetName === 'Inventory') {
      setInventoryData(prev => prev.filter(i => String(i.id) !== targetId));
    } else if (sheetName === 'setting_pos') {
      setPosProducts(prev => prev.filter(i => String(i.id) !== targetId));
    } else if (sheetName === 'Branches') {
      setBranchesData(prev => prev.filter(b => String(b.id) !== targetId));
    } else if (sheetName === 'POS_Transactions') {
      setPosHistoryData(prev => prev.filter(t => String(t.id || t.receiptNo || t.receipt_no || '').trim() !== targetId));
      setFinanceData(prev => prev.filter(f => String(f.id || f.receiptNo || f.receipt_no || '').trim() !== targetId));
    } else if (sheetName === 'Staff') {
      setStaffData(prev => prev.filter(s => String(s.id) !== targetId));
    } else if (sheetName === 'Finance_Revenue' || sheetName === 'Finance_Expenses') {
      setFinanceData(prev => prev.filter(f => String(f.id) !== targetId));
    } else if (sheetName === 'PatientCourses' || sheetName === 'patient_courses' || sheetName === 'Patient_Courses') {
      setPatientCoursesData(prev => prev.filter(c => String(c.id).trim() !== targetId));
    } else if (sheetName === 'Coupons' || sheetName === 'coupons') {
      setCouponsData(prev => prev.filter(c => String(c.id || '').trim() !== targetId && String(c.code || '').trim().toUpperCase() !== String(payload.code || '').trim().toUpperCase()));
    } else if (sheetName === 'Treatments') {
      setPatientsData(prev => prev.map(p => {
        if (p.opdRecords && p.opdRecords.some(t => String(t.id || '').trim() === targetId)) {
          return {
            ...p,
            opdRecords: p.opdRecords.filter(t => String(t.id || '').trim() !== targetId)
          };
        }
        return p;
      }));
    }
  }, []);

  // --- ปรับปรุงฟังก์ชันป้องกัน Error HTML แบบ 100% และรองรับ Supabase ---
  const callAppScript = useCallback(async (action, sheetName, data = null) => {
    // 🛡️ ในโหมดจำลองข้อมูล (Sandbox Simulation) ไม่อนุญาตให้เขียนหรือลบข้อมูลจริงลง Supabase
    if (isSimulationMode && (action === 'SAVE_DATA' || action === 'SAVE_BATCH' || action === 'DELETE_DATA' || action === 'UPDATE_DATA')) {
      showToast('อยู่ในโหมดจำลองข้อมูล (Sandbox Mode): ข้อมูลทำงานบนเบราว์เซอร์เท่านั้น ไม่ถูกบันทึกลงระบบจริง', 'warning');
      return { status: 'success', simulated: true, data };
    }
    try {
      let result;
      // หากตั้งค่า Supabase ไว้ ให้เรียกใช้งานผ่าน Supabase Adapter โดยตรง
      if (supabase) {
        result = await callSupabase(action, sheetName, data);
      } else {
        // --- ระบบบันทึก Log การใช้งาน (กรณีใช้ Google Apps Script เดิม) ---
        const currentToken = localStorage.getItem('clinic_session_token');
        const isMonitorUser = currentUser?.isSpecialMonitor || currentUser?.role === 'superadmin' || currentUser?.username === 'superadmin' || currentUser?.id === 'admin1';
        if (!isMonitorUser && sheetName !== 'Logs' && (action === 'SAVE_DATA' || action === 'DELETE_DATA') && currentToken !== 'recovery-token') {
          if (data && typeof data === 'object') {
              data.updatedBy = currentUser?.name || 'Unknown';
              data.updatedById = currentUser?.id || 'unknown';
          }
          
          const logPayload = {
            id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'Unknown',
            userId: currentUser?.id || 'unknown',
            role: currentUser?.role || 'unknown',
            action: action,
            targetSheet: sheetName,
            targetDataId: data?.id || data?.hn || 'unknown',
            detail: `User ${currentUser?.name || 'Unknown'} performed ${action} on ${sheetName}`
          };
          fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'SAVE_DATA', sheetName: 'Logs', payload: logPayload, token: currentToken || '' }),
            redirect: 'follow'
          }).catch(err => console.error("Logging failed:", err));
        }
        // -------------------------------

        const rawToken = localStorage.getItem('clinic_session_token') || 'recovery-token';
        const gasToken = (rawToken.startsWith('ey') || rawToken.startsWith('supa') || rawToken.startsWith('sec')) ? 'recovery-token' : rawToken;

        const response = await fetch(GOOGLE_SCRIPT_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action, sheetName, payload: data, token: gasToken }), 
            redirect: 'follow' 
        });
        
        const responseText = await response.text();
        
        if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
            console.error("ได้รับ HTML แทนที่จะเป็น JSON:", responseText.substring(0, 200));
            throw new Error("สิทธิ์การเข้าถึงฐานข้อมูลไม่ถูกต้อง กรุณาตั้งค่า Google Apps Script ให้ 'ทุกคน' เข้าถึงได้");
        }

        result = JSON.parse(responseText);
        if (result.status === 'error') throw new Error(result.message);
      }

      // --- อัปเดต React State สดๆ ทันทีเมื่อ SAVE_DATA, SAVE_BATCH หรือ DELETE_DATA สำเร็จ ---
      if (result && result.status === 'success') {
        if (action === 'SAVE_DATA' && data) {
          syncLocalStateOnSave(sheetName, data);
        } else if (action === 'SAVE_BATCH' && Array.isArray(data)) {
          data.forEach(item => syncLocalStateOnSave(sheetName, item));
        } else if (action === 'DELETE_DATA' && data) {
          syncLocalStateOnDelete(sheetName, data);
        }
      }

      return result;
    } catch (error) { 
        throw error; 
    }
  }, [isSimulationMode, showToast, currentUser, syncLocalStateOnSave, syncLocalStateOnDelete]);

  const parseSettings = (resSettings) => {
    if (resSettings?.status === 'success' && Array.isArray(resSettings.data)) {
      const prefixes = resSettings.data.find(s => s.id === 'staff_prefixes');
      if (prefixes && Array.isArray(prefixes.values)) {
        setStaffPrefixes(prefixes.values);
      }
      const perms = resSettings.data.find(s => s.id === 'role_permissions');
      if (perms && perms.values) {
        setRolePermissions(perms.values);
        if (perms.labels) {
          setRoleLabels(perms.labels);
        }
      }
      const staffCats = resSettings.data.find(s => s.id === 'staff_categories');
      if (staffCats && Array.isArray(staffCats.values)) {
        setStaffCategories(staffCats.values);
      }
      const apptStats = resSettings.data.find(s => s.id === 'appointment_statuses');
      if (apptStats && Array.isArray(apptStats.values)) {
        const normalized = apptStats.values.map(item => {
          if (typeof item === 'string') {
            let color = 'sky';
            if (item === 'รอยืนยัน' || item.toLowerCase().includes('pend')) color = 'amber';
            else if (item === 'ยืนยันแล้ว' || item.toLowerCase().includes('confirm')) color = 'emerald';
            else if (item === 'ยกเลิก' || item.toLowerCase().includes('cancel')) color = 'rose';
            return { label: item, color };
          }
          return item;
        });
        setAppointmentStatuses(normalized);
      }
      const intTokens = resSettings.data.find(s => s.id === 'integration_tokens');
      if (intTokens && intTokens.values) {
        let val = intTokens.values;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (e) {}
        }
        setIntegrationTokens(val);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('clinic_integration_tokens', JSON.stringify(val));
          }
        } catch (e) {}
      }
      const gdTokens = resSettings.data.find(s => s.id === 'gdrive_tokens');
      if (gdTokens && gdTokens.values) {
        setGdriveTokens(gdTokens.values);
      }
      const qrSett = resSettings.data.find(s => s.id === 'pos_qr_settings');
      if (qrSett && qrSett.values) {
        let val = qrSett.values;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (e) {}
        }
        if (val && Array.isArray(val.accounts) && val.accounts.length > 0) {
          setPosQrSettings(val);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('clinic_pos_qr_settings', JSON.stringify(val));
            }
          } catch (e) {}
        }
      }
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (!GOOGLE_SCRIPT_URL) {
        setIsAuthDataFetched(true);
        setIsDataFetched(true);
        setIsGlobalLoading(false);
        return;
      }

      // กรณีที่ 1: ล็อกอินแล้ว แต่ข้อมูลอื่นๆ ยังไม่โหลด (ทำการดึงข้อมูลเวชระเบียน, สต๊อก, POS, การเงิน)
      if (isLoggedIn && !isDataFetched) {
        setIsGlobalLoading(true);
        try {
          await reloadAllClinicData();
          const now = new Date();
          await fetchQueueForMonth(now.getFullYear(), now.getMonth());
          setIsAuthDataFetched(true);
          setIsDataFetched(true);
        } catch (error) { 
          console.error("Load Clinic Data Error:", error);
          triggerGlobalToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'warning'); 
        } finally {
          setIsGlobalLoading(false);
        }
      }

      // กรณีที่ 2: ยังไม่ได้ล็อกอิน และยังไม่มีข้อมูล Auth (ดึงเฉพาะข้อมูลล็อกอินเพื่อความเร็ว)
      if (!isLoggedIn && !isAuthDataFetched) {
        if (pdpaToken) {
          setIsGlobalLoading(true);
          try {
            const resSettingsResponse = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'GET_DATA', sheetName: 'Settings', payload: null, token: 'recovery-token' })
            });
            const resSettings = await resSettingsResponse.json();
            parseSettings(resSettings);
            setIsAuthDataFetched(true);
          } catch(e) { 
            console.error(e); 
            // Fallback for PDPA if settings fail
            setIsAuthDataFetched(true);
          } finally {
            setIsGlobalLoading(false);
          }
        } else {
          // ปิดการดึงข้อมูลอัตโนมัติก่อนล็อกอิน เพื่อความปลอดภัย (ไม่ให้โดนแฮกข้อมูลด้วย F12)
          setIsGlobalLoading(false);
          // ไม่เซ็ต setIsAuthDataFetched(true) ที่นี่ เพื่อให้ไปโหลด Staff หลังล็อกอินเสร็จ
        }
      }
    };

    loadInitialData();
  }, [isLoggedIn, isAuthDataFetched, isDataFetched]);

  // --- Supabase Realtime Listener (ฟังการเพิ่ม/แก้ไข/ลบจากทุกเครื่องแบบ Realtime) ---
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow, table } = payload;
          const mapTableToSheet = {
            patients: 'Patients',
            treatments: 'Treatments',
            branches: 'Branches',
            queue: 'Queue',
            pos_transactions: 'POS_Transactions',
            inventory: 'Inventory',
            inventory_logs: 'InventoryLogs',
            setting_pos: 'setting_pos',
            finance_revenue: 'Finance_Revenue',
            finance_expenses: 'Finance_Expenses',
            staff: 'Staff',
            staff_schedules: 'Staff_Schedules',
            settings: 'Settings',
            patient_courses: 'PatientCourses',
            coupons: 'Coupons'
          };
          const sheetName = mapTableToSheet[table];
          if (!sheetName) return;

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            if (newRow) {
              const jsRow = rowToJS(newRow);
              console.log(
                `%c⚡ [Realtime Sync: ${table}]%c 📡 ${eventType} received! ID: ${jsRow.id || jsRow.hn}`,
                'color: #059669; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;',
                'color: #047857; font-weight: 600;'
              );
              syncLocalStateOnSave(sheetName, jsRow);
            }
          } else if (eventType === 'DELETE') {
            if (oldRow && oldRow.id) {
              console.log(
                `%c⚡ [Realtime Sync: ${table}]%c 🗑️ DELETE received! ID: ${oldRow.id}`,
                'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px;',
                'color: #b91c1c; font-weight: 600;'
              );
              syncLocalStateOnDelete(sheetName, { id: oldRow.id });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- ดึงข้อมูลคอร์สและสต็อกสินค้าล่าสุดจาก Supabase อัตโนมัติเมื่อโฟกัสหน้าต่าง หรือสลับแท็บกลับมา (พร้อมระบบ Cooldown 60s เพื่อประหยัด Egress 100%) ---
  useEffect(() => {
    if (!supabase) return;

    let lastFetchTime = 0;
    const COOLDOWN_MS = 60000; // รออย่างน้อย 60 วินาทีถึงจะยอมดึงใหม่เมื่อสลับแท็บ (ป้องกันการยิงซ้ำเวลากดสลับแท็บบ่อยๆ)

    const refreshClinicDataFromSupabase = async (force = false) => {
      const now = Date.now();
      if (!force && (now - lastFetchTime < COOLDOWN_MS)) {
        return;
      }
      lastFetchTime = now;

      try {
        // รีเฟรชสต็อกสินค้าล่าสุด
        const explicitInvCols = 'id,code,product_id,product_name,name,category,unit,cost_price,selling_price,stock_quantity,min_stock,lot_no,expire_date,receive_date,branch_id,created_at,updated_at,is_deleted';
        const { data: invData, error: invErr } = await supabase
          .from('inventory')
          .select(explicitInvCols)
          .or('is_deleted.is.null,is_deleted.eq.false');
        if (!invErr && Array.isArray(invData)) {
          setInventoryData(invData.map(rowToJS));
        }

        const explicitCols = 'id,patient_id,patient_name,product_id,course_name,total_sessions,used_sessions,remaining_sessions,price,pos_transaction_id,receipt_no,branch_id,status,is_shareable,shared_patient_ids,expire_date,notes,purchased_at,created_at,updated_at,is_deleted';
        const { data, error } = await supabase
          .from('patient_courses')
          .select(explicitCols)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('purchased_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          setPatientCoursesData(data.map(rowToJS));
        }

        // รีเฟรชคูปองล่าสุดแบบ Differential Sync (Zero-Waste Egress ถ้าไม่มีการเปลี่ยนแปลง)
        const resCoupons = await callAppScript('GET_DATA', 'Coupons');
        if (resCoupons?.status === 'success' && Array.isArray(resCoupons.data)) {
          setCouponsData(resCoupons.data);
        }
      } catch (err) {
        console.warn('[Focus Refresh Note]:', err);
      }
    };

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshClinicDataFromSupabase(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('online', () => refreshClinicDataFromSupabase(true));

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('online', () => refreshClinicDataFromSupabase(true));
    };
  }, []);

  // --- Android Card Agent / SwipeRefreshLayout Scroll Sync ---
  // แจ้งเตือนสถานะการเลื่อนหน้าจอไปยัง Android WebView เพื่อป้องกัน SwipeRefreshLayout ขัดขวางการเลื่อนดูข้อมูลด้านบน (Scroll Up)
  useEffect(() => {
    let lastCanScrollUp = null;

    const checkCanScrollUp = (target) => {
      try {
        if (target && target instanceof Element) {
          let el = target;
          while (el && el !== document.body && el !== document.documentElement) {
            if (el.scrollTop > 1) return true;
            el = el.parentElement;
          }
        }
        const main = mainRef.current || document.getElementById('main-scroll-container');
        if (main && main.scrollTop > 1) return true;
        if (window.scrollY > 1 || document.documentElement.scrollTop > 1 || document.body.scrollTop > 1) return true;
        const scrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
        for (let i = 0; i < scrollables.length; i++) {
          if (scrollables[i].scrollTop > 1) return true;
        }
      } catch (_) {}
      return false;
    };

    const notifyNative = (canScroll) => {
      if (lastCanScrollUp === canScroll) return;
      lastCanScrollUp = canScroll;
      if (window.AndroidCardBridge && typeof window.AndroidCardBridge.setCanScrollUp === 'function') {
        try {
          window.AndroidCardBridge.setCanScrollUp(canScroll);
        } catch (_) {}
      }
    };

    const handleTouchStart = (e) => {
      const target = (e.touches && e.touches[0]) ? e.touches[0].target : e.target;
      notifyNative(checkCanScrollUp(target));
    };

    const handleScroll = (e) => {
      const target = e.target;
      if (target && target.scrollTop !== undefined && target.scrollTop > 1) {
        notifyNative(true);
      } else {
        notifyNative(checkCanScrollUp(target));
      }
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        notifyNative(checkCanScrollUp(null));
      }, 50);
    };

    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    notifyNative(checkCanScrollUp(null));

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // ซิงค์สถานะ Scroll เมื่อสลับแท็บเมนู
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.AndroidCardBridge && typeof window.AndroidCardBridge.setCanScrollUp === 'function') {
        const main = mainRef.current || document.getElementById('main-scroll-container');
        const canScroll = (main && main.scrollTop > 1) || window.scrollY > 1;
        try {
          window.AndroidCardBridge.setCanScrollUp(canScroll);
        } catch (_) {}
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [currentTab]);

  // --- ผู้ป่วยถูกโหลดแบบ Server-side Pagination ทีละ 35 รายการตามต้องการ (ไม่ Preload 82 รายการลงมาทีเดียว เพื่อประหยัด Egress สูงสุด) ---

  // --- BroadcastChannel Listener (ซิงค์ข้อมูลระหว่างหลายแท็บในเครื่องเดียวกัน) ---
  useEffect(() => {
    const unsubscribe = subscribeStoreUpdates((eventData) => {
      if (eventData && (eventData.type === 'STORE_UPDATED' || eventData.action === 'NETWORK_RECONNECTED')) {
        const storeName = eventData.storeName;
        if (storeName === 'patients' || storeName === '*') {
          getLocalStore('patients').then(allLocal => {
            if (!allLocal || !allLocal.length) return;
            setPatientsData(prev => {
              if (!prev || prev.length === 0) {
                return allLocal.slice(0, 35);
              }
              const map = new Map(allLocal.map(p => [String(p.id || p.hn).toLowerCase(), p]));
              return prev.map(p => {
                const key = String(p.id || p.hn).toLowerCase();
                return map.get(key) ? { ...p, ...map.get(key) } : p;
              });
            });
          });
        }
        if (storeName === 'queue' || storeName === '*') {
          getLocalStore('queue').then(data => data && data.length && setQueueData(data));
        }
        if (storeName === 'inventory' || storeName === '*') {
          getLocalStore('inventory').then(data => data && data.length && setInventoryData(data));
        }
        if (storeName === 'setting_pos' || storeName === '*') {
          getLocalStore('setting_pos').then(data => data && setPosProducts(data));
        }
        if (storeName === 'staff' || storeName === '*') {
          getLocalStore('staff').then(data => data && data.length && setStaffData(data));
        }
        if (storeName === 'pos_transactions' || storeName === '*') {
          getLocalStore('pos_transactions').then(data => data && data.length && setPosHistoryData([...data].reverse()));
        }
        if (storeName === 'coupons' || storeName === '*') {
          getLocalStore('coupons').then(data => data && setCouponsData(data));
        }
        // patient_courses ถูกแยกออกมาเป็น Pure Realtime ไม่โหลดจาก IndexedDB ตามคำสั่ง
      }
    });
    return () => unsubscribe();
  }, []);

  const navItems = NAV_ITEMS;

  const dealStatuses = useMemo(() => {
    const colorClasses = {
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rose: 'bg-rose-100 text-rose-700 border-rose-200',
      sky: 'bg-sky-100 text-sky-700 border-sky-200',
      violet: 'bg-violet-100 text-violet-700 border-violet-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      teal: 'bg-teal-100 text-teal-700 border-teal-200',
      fuchsia: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
      slate: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return appointmentStatuses.map((statusObj, index) => {
      const label = typeof statusObj === 'string' ? statusObj : statusObj.label;
      const colorKey = typeof statusObj === 'string' ? 'sky' : (statusObj.color || 'sky');

      let value = 'pending';
      if (label === 'ยืนยันแล้ว' || label.toLowerCase().includes('confirm')) value = 'confirmed';
      else if (label === 'ยกเลิก' || label.toLowerCase().includes('cancel')) value = 'cancelled';
      else if (label === 'เลื่อนนัด' || label.toLowerCase().includes('postpone')) value = 'postponed';
      else if (label === 'รอยืนยัน' || label.toLowerCase().includes('pend')) value = 'pending';
      else {
        value = `custom_${index}`;
      }

      const color = colorClasses[colorKey] || colorClasses.sky;

      return {
        value,
        label,
        color
      };
    });
  }, [appointmentStatuses]);

  const allowedTabs = useMemo(() => {
    return rolePermissions[currentUser.role] || ['dashboard', 'exec_dashboard', 'records', 'queue', 'pos', 'coupons', 'catalog', 'inventory', 'finance', 'staff', 'branch', 'reports', 'settings', 'display_ads'];
  }, [rolePermissions, currentUser.role]);

  const filteredNavItems = useMemo(() => {
    // แอดมินต้องเข้าหน้าตั้งค่าได้เสมอ เพื่อป้องกันการล็อกตัวเองออก
    const tabs = currentUser.role === 'admin' && !allowedTabs.includes('settings') 
      ? [...allowedTabs, 'settings'] 
      : allowedTabs;
    return NAV_ITEMS.filter(item => tabs.includes(item.id));
  }, [allowedTabs, currentUser.role]);

  // เมื่อสิทธิ์เปลี่ยนแล้วแท็บปัจจุบันที่เปิดอยู่ไม่มีสิทธิ์เข้าถึง ให้เด้งไปหน้าแรกที่สามารถเข้าได้
  useEffect(() => {
    const tabIds = [...filteredNavItems.map(item => item.id), 'profile'];
    if (tabIds.length > 0 && !tabIds.includes(currentTab)) {
      setCurrentTab(tabIds[0]);
    }
  }, [filteredNavItems, currentTab]);

  // คำนวณตัวแปรสำหรับ Navbar มือถือล่วงหน้า (แถวที่ 1 เมนูหลัก 5 หน้า และแถวที่เหลือเป็นเมนูเพิ่มเติม 4 คอลัมน์)
  const hasMoreNavItems = filteredNavItems.length >= 6;

  const mobileNavItems = useMemo(() => {
    if (!hasMoreNavItems) return filteredNavItems;
    return MAIN_NAV_ORDER
      .map(id => filteredNavItems.find(item => item.id === id))
      .filter(Boolean);
  }, [filteredNavItems, hasMoreNavItems]);

  const otherMobileNavItems = useMemo(() => {
    if (!hasMoreNavItems) return [];
    return filteredNavItems
      .filter(item => !MAIN_NAV_ORDER.includes(item.id))
      .sort((a, b) => {
        const idxA = OTHER_PREFERRED_ORDER.indexOf(a.id);
        const idxB = OTHER_PREFERRED_ORDER.indexOf(b.id);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });
  }, [filteredNavItems, hasMoreNavItems]);

  const [navActiveTab, setNavActiveTab] = useState(currentTab);
  const effectiveNavTab = navActiveTab || currentTab;

  useEffect(() => {
    setNavActiveTab(currentTab);
  }, [currentTab]);

  const activeNavIndex = mobileNavItems.findIndex(item => item.id === effectiveNavTab);
  const activeOtherIndex = otherMobileNavItems.findIndex(item => item.id === effectiveNavTab);

  // จดจำตำแหน่งดัชนีของเมนูหลักล่าสุด เพื่อให้วงกลมสีฟ้าเลื่อนสไลด์ได้อย่างต่อเนื่อง ไม่กระโดดมาจากขอบจอ
  const lastMainIndexRef = useRef(0);
  if (activeNavIndex !== -1) {
    lastMainIndexRef.current = activeNavIndex;
  }

  // ควบคุมวงกลม Liquid Bubble สีสันที่เลื่อนไปหาไอคอนที่เลือกในแถวเพิ่มเติม (4 คอลัมน์) โดยใช้ Ref ตรงกับ DOM ไม่ผ่าน React State เพื่อตัดปัญหา Re-render และอาการพื้นหลังเบลอกระพริบ
  const extraGridRef = useRef(null);
  const extraBubbleRef = useRef(null);

  const updateExtraBubble = useCallback((animate = false) => {
    if (!extraGridRef.current || !extraBubbleRef.current) return;
    const activeBtn = extraGridRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      const iconEl = activeBtn.querySelector('.extra-nav-icon');
      const gridRect = extraGridRef.current.getBoundingClientRect();
      const targetRect = iconEl ? iconEl.getBoundingClientRect() : activeBtn.getBoundingClientRect();
      const x = targetRect.left - gridRect.left;
      const y = targetRect.top - gridRect.top;
      if (animate) {
        extraBubbleRef.current.style.transition = 'transform 350ms cubic-bezier(0.34, 1.15, 0.64, 1), opacity 200ms ease-out';
      } else {
        extraBubbleRef.current.style.transition = 'none';
      }
      extraBubbleRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
      extraBubbleRef.current.style.opacity = '1';
    } else {
      extraBubbleRef.current.style.opacity = '0';
    }
  }, []);

  useEffect(() => {
    if (!extraGridRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateExtraBubble(false));
    ro.observe(extraGridRef.current);
    return () => ro.disconnect();
  }, [updateExtraBubble]);

  // ควบคุมความสูงและการลากเลื่อน (Touch Dragging) แผงควบคุมตามนิ้วมือแบบ Real-time 60/120fps
  // ใช้ GPU-Accelerated Direct DOM Animation 100% ไม่สั่ง setState เพื่อป้องกันไม่ให้ทั้ง App.jsx เกิดการ Re-render (0 re-renders)
  const navSheetRef = useRef(null);
  const [navSheetNode, setNavSheetNode] = useState(null);
  const setNavSheetRef = useCallback((node) => {
    navSheetRef.current = node;
    setNavSheetNode(node);
  }, []);
  const isDraggingRef = useRef(false);
  const navBackdropRef = useRef(null);
  const extraContentRef = useRef(null);
  const extraHeightRef = useRef(200);
  const isExpandedRef = isMobileNavExpandedRef;

  const expandMobileNav = useCallback(() => {
    isExpandedRef.current = true;
    if (navSheetRef.current) {
      navSheetRef.current.style.transition = 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)';
      navSheetRef.current.style.transform = 'translate3d(0, 0px, 0)';
    }
    if (navBackdropRef.current) {
      navBackdropRef.current.style.transition = 'opacity 320ms ease-out';
      navBackdropRef.current.style.opacity = '1';
      navBackdropRef.current.style.pointerEvents = 'auto';
    }
    if (extraContentRef.current) {
      extraContentRef.current.style.transition = 'opacity 320ms ease-out';
      extraContentRef.current.style.opacity = '1';
    }
    updateExtraBubble(false);
  }, [updateExtraBubble]);

  const collapseMobileNav = useCallback(() => {
    isExpandedRef.current = false;
    const H = extraHeightRef.current || 200;
    if (navSheetRef.current) {
      navSheetRef.current.style.transition = 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)';
      navSheetRef.current.style.transform = `translate3d(0, ${H}px, 0)`;
    }
    if (navBackdropRef.current) {
      navBackdropRef.current.style.transition = 'opacity 320ms ease-out';
      navBackdropRef.current.style.opacity = '0';
      navBackdropRef.current.style.pointerEvents = 'none';
    }
    if (extraContentRef.current) {
      extraContentRef.current.style.transition = 'opacity 320ms ease-out';
      extraContentRef.current.style.opacity = '0';
    }
  }, []);

  const toggleMobileNav = useCallback(() => {
    if (isExpandedRef.current) {
      collapseMobileNav();
    } else {
      expandMobileNav();
    }
  }, [expandMobileNav, collapseMobileNav]);

  // นำทางไปยังแท็บที่เลือก สลับหน้าทันที และพับเก็บแผงควบคุมลงอย่างนุ่มนวล โดยแตะเพียงครั้งเดียวก็ทำงาน 100%
  const handleNavSelect = useCallback((tabId, clickedElement) => {
    if (tabId === currentTab) {
      if (isExpandedRef.current) {
        collapseMobileNav();
      }
      return;
    }

    // 1. ตอบสนอง UI ทันที 0ms: ให้วงกลมสีฟ้าเริ่มเลื่อนและไฮไลต์ไอคอนทันที
    setNavActiveTab(tabId);

    // 2. ถ้าเป็นแท็บในแถวเพิ่มเติม (4 คอลัมน์): เคลื่อน Bubble ทันทีตั้งแต่เฟรมแรก (0ms) ด้วยพิกัด layout ที่แม่นยำระดับ Subpixel
    const isOtherTab = otherMobileNavItems.some(item => item.id === tabId);
    if (isOtherTab && extraGridRef.current && extraBubbleRef.current) {
      const btn = clickedElement || extraGridRef.current.querySelector(`[data-tab-id="${tabId}"]`);
      if (btn) {
        const iconEl = btn.querySelector('.extra-nav-icon');
        const gridRect = extraGridRef.current.getBoundingClientRect();
        const targetRect = iconEl ? iconEl.getBoundingClientRect() : btn.getBoundingClientRect();
        const x = targetRect.left - gridRect.left;
        const y = targetRect.top - gridRect.top;
        extraBubbleRef.current.style.transition = 'transform 350ms cubic-bezier(0.34, 1.15, 0.64, 1), opacity 200ms ease-out';
        extraBubbleRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
        extraBubbleRef.current.style.opacity = '1';
      }
    } else if (extraBubbleRef.current) {
      extraBubbleRef.current.style.opacity = '0';
    }

    // 3. สลับหน้าและพับเก็บแผงควบคุมลงทันที ไม่ต้องมี timeout หน่วงเวลา เพื่อให้แตะครั้งเดียวติด 100% ไม่หลุด
    if (isExpandedRef.current) {
      collapseMobileNav();
    }
    handleTabClick(tabId);
  }, [handleTabClick, collapseMobileNav, currentTab, otherMobileNavItems]);

  // ตัวจัดการการแตะปุ่มเมนูมือถือแบบ Zero-latency Touch:
  // ตรวจจับที่ touchend โดยตรง ไม่ต้องรอ synthetic click ของเบราว์เซอร์ ซึ่งมักถูกบล็อกขณะแผงควบคุมกำลังเคลื่อนที่
  const lastNavTouchTimeRef = useRef(0);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const handleButtonTouchStart = useCallback((e) => {
    if (e.touches && e.touches[0]) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, []);

  const handleButtonTouchEnd = useCallback((tabId, e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartPosRef.current.y);
      // หากขยับนิ้วเกิน 8px ถือเป็นการลากแผงเมนู ไม่ใช่การแตะเลือกแท็บ
      if (deltaX >= 8 || deltaY >= 8) return;
    }
    // สัมผัสนิ่งๆ แตะเลือกเมนู (Clean Tap): บันทึกเวลาเพื่อป้องกัน synthetic click ซ้ำซ้อน
    lastNavTouchTimeRef.current = Date.now();
    handleNavSelect(tabId, e.currentTarget);
  }, [handleNavSelect]);

  const handleButtonClick = useCallback((tabId, e) => {
    // ป้องกัน synthetic click ที่เบราว์เซอร์ส่งตามมาหลังจาก touchend (ภายใน 450ms)
    if (Date.now() - lastNavTouchTimeRef.current < 450) {
      return;
    }
    handleNavSelect(tabId, e.currentTarget);
  }, [handleNavSelect]);

  // คำนวณความสูงจริงของเมนูแถวเพิ่มเติม เพื่อให้เมนูหลักลอยพ้นแถบนำทางของมือถือ 2-4px พอดี และมีระยะหายใจรอบขีดลากด้านบน
  // อัปเดตผ่าน extraHeightRef โดยตรง ไม่เรียก setState เพื่อป้องกันไม่ให้ทั้ง App เกิดการ Re-render กระพริบ
  useEffect(() => {
    const updateH = () => {
      let newH = 0;
      if (navSheetRef.current) {
        const totalH = navSheetRef.current.offsetHeight;
        const computedPb = parseFloat(window.getComputedStyle(navSheetRef.current).paddingBottom) || 14;
        const mainRow = navSheetRef.current.querySelector('.max-w-sm');
        const mainRowBottom = mainRow ? (mainRow.offsetTop + mainRow.offsetHeight) : 68;
        // ความสูงส่วนที่มองเห็นตอนพับเก็บ = ขอบล่างของแถวไอคอนหลัก (mainRowBottom) + paddingBottom (14px)
        const visibleH = mainRowBottom + computedPb;
        const hiddenH = Math.max(0, totalH - visibleH);
        if (hiddenH > 0) newH = hiddenH;
      } else if (extraContentRef.current) {
        const h = extraContentRef.current.offsetHeight;
        if (h > 0) newH = h;
      }
      if (newH === 0 && otherMobileNavItems.length > 0) {
        const rows = Math.ceil(otherMobileNavItems.length / 4);
        newH = rows * 78 + 30;
      }
      extraHeightRef.current = newH;
      if (navSheetRef.current && !isExpandedRef.current && !isDraggingRef.current) {
        navSheetRef.current.style.transform = `translate3d(0, ${newH}px, 0)`;
      }
    };

    updateH();
    if (navSheetRef.current && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateH);
      ro.observe(navSheetRef.current);
      return () => ro.disconnect();
    }
  }, [otherMobileNavItems, navSheetNode]);

  // ซิงค์สถานะการเปิด/ปิด เมื่อมีการเลื่อน Scroll ของหน้าจอมือถือ (ซ่อน/แสดงแถบ)
  useEffect(() => {
    if (!navSheetRef.current || isDraggingRef.current) return;
    const H = extraHeightRef.current || 200;

    navSheetRef.current.style.transition = 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)';

    if (isMobile && !showMobileBars && !isExpandedRef.current) {
      navSheetRef.current.style.transform = 'translate3d(0, 115%, 0)';
    } else if (hasMoreNavItems && !isExpandedRef.current) {
      navSheetRef.current.style.transform = `translate3d(0, ${H}px, 0)`;
    } else {
      navSheetRef.current.style.transform = 'translate3d(0, 0px, 0)';
    }
  }, [hasMoreNavItems, showMobileBars, isMobile]);

  // ระบบ Interactive Dragging รูดตามนิ้วมือแบบ Real-time เหมือน Control Center / Quick Panel
  // จับและลากได้ทั้งผืนแผงควบคุม (ทั้งปุ่มและที่ว่าง) โดยหากเป็นการแตะนิ่งๆ (Clean Tap) จะสั่งเปลี่ยนหน้าทันทีในคลิกเดียว
  useEffect(() => {
    const el = navSheetNode;
    if (!el || !hasMoreNavItems) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;
    let isDraggingTouch = false;
    let touchRafId = null;

    // --- 1. TOUCH EVENTS (สำหรับโทรศัพท์มือถือ / แท็บเล็ต) ---
    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
      isDraggingTouch = false;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchY - touchStartY;
      const deltaX = touchX - touchStartX;

      if (!isDraggingTouch) {
        if (Math.abs(deltaY) < 8) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) return; // ปัดแนวนอน ไม่ใช่การลากแผงนี้

        isDraggingTouch = true;
        isDraggingRef.current = true;
        el.style.transition = 'none';
        if (navBackdropRef.current) navBackdropRef.current.style.transition = 'none';
        if (extraContentRef.current) extraContentRef.current.style.transition = 'none';
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      const H = extraHeightRef.current || 200;
      let targetTranslateY = 0;

      if (!isExpandedRef.current) {
        // เริ่มจากพับเก็บ: รูดขึ้น deltaY เป็นลบ (จำกัดไม่ให้เกิน 0 เด็ดขาด ห้ามลอยจนเห็นช่องว่างด้านล่าง)
        if (deltaY <= 0) {
          targetTranslateY = Math.max(0, H + deltaY);
        } else {
          // รูดลงขณะพับเก็บอยู่ -> มีแรงต้าน Rubber-band เล็กน้อย
          targetTranslateY = H + deltaY * 0.15;
        }
      } else {
        // เริ่มจากเปิดขยาย: รูดลง deltaY เป็นบวก (จำกัดไม่ให้เกิน H)
        if (deltaY >= 0) {
          targetTranslateY = Math.min(H, deltaY);
        } else {
          // ถ้ารูดขึ้นขณะเปิดขยายอยู่แล้ว -> ห้ามลอยขยับขึ้นเด็ดขาด ล็อกที่ 0 ทันที
          targetTranslateY = 0;
        }
      }

      if (touchRafId) cancelAnimationFrame(touchRafId);
      touchRafId = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${targetTranslateY}px, 0)`;

        if (H > 0) {
          const progress = Math.max(0, Math.min(1, 1 - (targetTranslateY / H)));
          if (navBackdropRef.current) {
            navBackdropRef.current.style.opacity = progress.toFixed(3);
            navBackdropRef.current.style.pointerEvents = progress > 0.05 ? 'auto' : 'none';
          }
          if (extraContentRef.current) {
            extraContentRef.current.style.opacity = progress.toFixed(3);
          }
        }
      });
    };

    const handleTouchEnd = (e) => {
      if (!isDraggingTouch) {
        // เป็นเพียงการแตะเลือกเมนู (Clean Tap < 8px) -> ไม่แตะต้อง transform หรือ state ปล่อยให้ onClick ของปุ่มทำงานอย่างสมบูรณ์ทันที
        return;
      }
      if (touchRafId) cancelAnimationFrame(touchRafId);
      isDraggingTouch = false;
      isDraggingRef.current = false;

      const endY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
      const totalDeltaY = endY - touchStartY;
      const elapsed = Math.max(1, Date.now() - touchStartTime);
      const velocityY = totalDeltaY / elapsed;

      const H = extraHeightRef.current || 200;
      const wasExpanded = isExpandedRef.current;
      let shouldExpand = wasExpanded;

      if (!wasExpanded) {
        // ต้องการเปิด: ต้องรูดขึ้นเกิน 25px หรือสะบัดนิ้วขึ้นเร็วโดยมีการเคลื่อนที่ขึ้นเกิน 10px
        if (totalDeltaY < -25 || (totalDeltaY < -10 && velocityY < -0.3)) {
          shouldExpand = true;
        }
      } else {
        // ต้องการปิด: ต้องรูดลงเกิน 25px หรือสะบัดนิ้วลงเร็วโดยมีการเคลื่อนที่ลงเกิน 10px
        if (totalDeltaY > 25 || (totalDeltaY > 10 && velocityY > 0.3)) {
          shouldExpand = false;
        }
      }

      if (shouldExpand) {
        expandMobileNav();
      } else {
        collapseMobileNav();
      }
    };

    // --- 2. MOUSE EVENTS (สำหรับคอมพิวเตอร์ PC / แล็ปท็อป เวลาย่อขนาดหน้าจอ) ---
    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // คลิกซ้ายเท่านั้น

      const mStartY = e.clientY;
      const mStartX = e.clientX;
      const mStartTime = Date.now();
      let isDraggingMouse = false;

      const handleMouseMove = (me) => {
        const deltaY = me.clientY - mStartY;
        const deltaX = me.clientX - mStartX;
        if (!isDraggingMouse) {
          if (Math.abs(deltaY) < 6) return;
          if (Math.abs(deltaX) > Math.abs(deltaY)) return;
          isDraggingMouse = true;
          isDraggingRef.current = true;
          el.style.transition = 'none';
          if (navBackdropRef.current) navBackdropRef.current.style.transition = 'none';
          if (extraContentRef.current) extraContentRef.current.style.transition = 'none';
        }

        const H = extraHeightRef.current || 200;
        let targetTranslateY = 0;

        if (!isExpandedRef.current) {
          if (deltaY <= 0) {
            targetTranslateY = Math.max(0, H + deltaY);
          } else {
            targetTranslateY = H + deltaY * 0.15;
          }
        } else {
          if (deltaY >= 0) {
            targetTranslateY = Math.min(H, deltaY);
          } else {
            targetTranslateY = 0;
          }
        }

        if (touchRafId) cancelAnimationFrame(touchRafId);
        touchRafId = requestAnimationFrame(() => {
          el.style.transform = `translate3d(0, ${targetTranslateY}px, 0)`;

          if (H > 0) {
            const progress = Math.max(0, Math.min(1, 1 - (targetTranslateY / H)));
            if (navBackdropRef.current) {
              navBackdropRef.current.style.opacity = progress.toFixed(3);
              navBackdropRef.current.style.pointerEvents = progress > 0.05 ? 'auto' : 'none';
            }
            if (extraContentRef.current) {
              extraContentRef.current.style.opacity = progress.toFixed(3);
            }
          }
        });
      };

      const handleMouseUp = (me) => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (touchRafId) cancelAnimationFrame(touchRafId);

        if (!isDraggingMouse) {
          return;
        }
        isDraggingMouse = false;
        isDraggingRef.current = false;

        const totalDeltaY = me.clientY - mStartY;
        const elapsed = Math.max(1, Date.now() - mStartTime);
        const velocityY = totalDeltaY / elapsed;

        const H = extraHeightRef.current || 200;
        const wasExpanded = isExpandedRef.current;
        let shouldExpand = wasExpanded;

        if (!wasExpanded) {
          if (totalDeltaY < -25 || (totalDeltaY < -10 && velocityY < -0.3)) {
            shouldExpand = true;
          }
        } else {
          if (totalDeltaY > 25 || (totalDeltaY > 10 && velocityY > 0.3)) {
            shouldExpand = false;
          }
        }

        if (shouldExpand) {
          expandMobileNav();
        } else {
          collapseMobileNav();
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    el.addEventListener('mousedown', handleMouseDown);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('mousedown', handleMouseDown);
    };
  }, [navSheetNode, hasMoreNavItems]);



  const isCustomerDisplayRoute = location.pathname === '/customer-display' || location.pathname === '/display' || Boolean(getUrlParam('customer_display'));
  if (isCustomerDisplayRoute) {
      return (
        <CustomerDisplay 
          branchId={getUrlParam('branch') || (currentBranch && currentBranch !== 'all' ? currentBranch : 'b1')}
          stationId={getUrlParam('station') || 'station_1'}
          branchesData={branchesData}
          showToast={showToast}
        />
      );
  }

  if (pdpaToken && pdpaHn) {
      return <PdpaConsentForm token={pdpaToken} hn={pdpaHn} gdriveTokens={gdriveTokens} isAuthDataFetched={isAuthDataFetched} />;
  }

  if (resetToken) {
      return <ResetPasswordScreen token={resetToken} callAppScript={callAppScript} showToast={showToast} />;
  }

  // 🔒 PDPA Compliance: หากยังไม่ได้เข้าสู่ระบบ ต้องให้เข้าสู่ระบบก่อนเสมอ แม้จะเป็นการกดลิงก์พิมพ์เอกสาร
  if (!isLoggedIn || (isGlobalLoading && !isPrintUrl)) {
      return (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
            
            body { font-family: 'Kanit', sans-serif !important; }
            h1, h2, h3, h4, h5, h6, button, th, label, .nav-item, .kanit-text { font-family: 'Kanit', sans-serif !important; }
            td, input, select, textarea, .font-data { font-family: 'Sarabun', sans-serif !important; }

            .login-screen-container,
            .login-screen-container *,
            .login-screen-container input,
            .login-screen-container select,
            .login-screen-container textarea,
            .login-screen-container .font-data {
                font-family: 'Kanit', sans-serif !important;
            }

            .fade-in { animation: fadeIn 0.3s ease-out forwards; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            @keyframes loading-slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            .animate-loading-slide {
                animation: loading-slide 1.5s infinite linear;
            }

            /* --- Premium Animations for Login Screen --- */
            @keyframes blob {
              0% { transform: translate(0px, 0px) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.95); }
              100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
              animation: blob 7s infinite alternate ease-in-out;
            }
            .animation-delay-2000 {
              animation-delay: 2s;
            }
            .animation-delay-4000 {
              animation-delay: 4s;
            }

            @keyframes scale-up {
              0% { transform: scale(0.95); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            .animate-scale-up {
              animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              100%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake {
              animation: shake 0.6s ease-in-out;
            }
          `}} />
          <LoginScreen onLogin={handleLogin} callAppScript={callAppScript} isGlobalLoading={isGlobalLoading} isPrintUrl={isPrintUrl} />
        </>
      );
  }

  // หากล็อกอินเรียบร้อยแล้ว และเปิดมาจากลิงก์พิมพ์ ให้แสดงหน้าจอเตรียมพิมพ์
  if (isPrintUrl) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700 font-sans p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <Printer size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 font-['Kanit']">กำลังเตรียมเอกสารสำหรับพิมพ์...</h2>
            <p className="text-sm text-slate-500 mb-6 font-['Kanit']">ระบบกำลังดึงข้อมูลและเตรียมเปิดหน้าต่างการพิมพ์ กรุณารอสักครู่</p>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
  }

  return (
    <div className={`w-full h-full h-[100dvh] max-h-[100dvh] bg-slate-50 flex relative overflow-hidden text-slate-800 ${isMobile && !showMobileBars ? 'mobile-bars-hidden' : 'mobile-bars-visible'}`}>
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-200/40 blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/30 blur-[100px] pointer-events-none z-0"></div>

      <div className={`flex h-full h-[100dvh] max-h-[100dvh] overflow-hidden overflow-x-hidden w-full max-w-full flex-col md:flex-row relative ${isMobile && !showMobileBars ? 'mobile-bars-hidden' : 'mobile-bars-visible'}`}>
        
        {/* Backdrop สำหรับ Mobile เมื่อกางเมนู (ใช้ CSS Transition ธรรมดา ไม่กิน CPU) */}
        <div 
          className={`md:hidden fixed inset-0 bg-slate-900/60 z-[100] transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarExpanded(false)}
        />

        {/* Mobile Slide Menu (สร้างแยกมาต่างหาก ทำงานด้วย CSS Transform ล้วนๆ ลื่นไหล 100%) */}
        <aside 
          className={`md:hidden fixed inset-y-0 left-0 z-[110] w-[260px] bg-white shadow-2xl flex flex-col will-change-transform transform transition-transform duration-250 ease-out ${isSidebarExpanded ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) {
              e.currentTarget.dataset.startX = e.touches[0].clientX;
            }
          }}
          onTouchEnd={(e) => {
            const startX = parseFloat(e.currentTarget.dataset.startX);
            if (e.changedTouches && e.changedTouches[0] && !isNaN(startX)) {
              const deltaX = e.changedTouches[0].clientX - startX;
              if (deltaX < -40) {
                setIsSidebarExpanded(false);
              }
            }
          }}
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
              {filteredNavItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id)} 
                  className={`flex items-center py-3 px-3 w-full rounded-2xl transition-all duration-200 kanit-text ${currentTab === item.id ? 'bg-sky-500 shadow-md shadow-sky-500/20 text-white font-normal' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-normal'}`}
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

            <div className="p-4 border-t border-slate-100/50 min-h-[80px] flex items-center gap-3 shrink-0 select-none">
              {currentUser.photo ? (
                <img src={currentUser.photo} className="w-8 h-8 shrink-0 rounded-full object-cover border border-slate-200/60 shadow-sm" alt={currentUser.name} />
              ) : (
                <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Users size={16} /></div>
              )}
              <div className="text-left flex-1 min-w-0">
                <div className="font-semibold text-slate-700 text-xs kanit-text truncate">{currentUser.name}</div>
                <p className="text-[11px] font-medium text-emerald-600 kanit-text mt-0.5 truncate">{currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Desktop / Tablet Sidebar (ทำงานแบบ GPU Slide Push: เลื่อนตามกัน 60-120 FPS ไร้การคำนวณ Reflow ตาราง) */}
        <aside 
          ref={sidebarRef}
          onMouseDown={handleSidebarDragStart}
          onTouchStart={handleSidebarDragStart}
          style={{ 
            width: isSidebarExpanded ? '256px' : '80px',
            '--sidebar-text-opacity': isSidebarExpanded ? 1 : 0,
            '--sidebar-text-x': isSidebarExpanded ? '0px' : '-8px',
            willChange: 'width',
            touchAction: 'pan-y'
          }}
          className={`hidden md:flex flex-col absolute top-0 left-0 bottom-0 select-none ${(!isSidebarExpanded && isProfileDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'} bg-white border-r border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] z-[52]`}
        >
          {/* ขอบลากปรับขนาดด้านขวา (Drag Handle Strip) คลีน ไร้ไฮไลท์สีฟ้าตามที่ผู้ใช้ต้องการ */}
          <div 
            onMouseDown={handleSidebarDragStart}
            onTouchStart={handleSidebarDragStart}
            className="sidebar-drag-handle hidden md:flex absolute top-0 right-0 w-3 h-full cursor-col-resize z-[70] touch-none select-none" 
            title="คลิกลากเพื่อย่อ/ขยายเมนู"
          />

          {/* Header & Logo (คลิกเพื่อย่อ/ขยาย หรือ ปัดซ้ายขวาได้ คลีน ไร้ลูกศร) */}
          <div 
            onClick={() => {
              if (isDraggingSidebarRef.current) return;
              if (isSidebarExpanded) {
                collapseSidebarSmoothly();
              } else {
                expandSidebarSmoothly();
              }
            }}
            className="flex items-center min-h-[89px] border-b border-slate-100/50 overflow-hidden shrink-0 cursor-pointer hover:bg-slate-50/70 transition-colors group select-none"
            title={isSidebarExpanded ? "คลิกเพื่อย่อเมนู" : "คลิกเพื่อขยายเมนู"}
          >
            <div className="w-[80px] shrink-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
                <Stethoscope size={24} />
              </div>
            </div>
            <div 
              className="sidebar-text-label flex-1 flex flex-col justify-center pr-4 whitespace-nowrap min-w-0 pointer-events-none will-change-transform"
              style={{
                opacity: 'var(--sidebar-text-opacity, ' + (isSidebarExpanded ? 1 : 0) + ')',
                transform: 'translate3d(var(--sidebar-text-x, ' + (isSidebarExpanded ? '0px' : '-8px') + '), 0, 0)',
                transition: 'opacity 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 260ms cubic-bezier(0.32, 0.72, 0, 1)'
              }}
            >
              <h2 className="font-bold text-slate-800 leading-tight kanit-text truncate">Clinic<span className="text-sky-500">Hub</span></h2>
              <p className="text-xs text-slate-400 kanit-text truncate">Management System</p>
            </div>
          </div>

          <div className={`flex flex-col h-full ${(!isSidebarExpanded && isProfileDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="px-4 py-4 relative z-[60] min-h-[72px] flex items-center shrink-0 overflow-hidden">
              <div 
                className="sidebar-text-label w-full absolute left-0 px-4 will-change-transform"
                style={{
                  opacity: 'var(--sidebar-text-opacity, ' + (isSidebarExpanded ? 1 : 0) + ')',
                  pointerEvents: isSidebarExpanded ? 'auto' : 'none',
                  transition: 'opacity 260ms cubic-bezier(0.32, 0.72, 0, 1)'
                }}
              >
                <CustomSelect
                    value={currentBranch}
                    onChange={(val) => setCurrentBranch(val)}
                    options={[{value: 'all', label: 'ดูข้อมูลทุกสาขารวม'}, ...branchesData.map(b => ({value: b.id, label: b.name}))]}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl focus-within:bg-white"
                />            
              </div>
              <div 
                onClick={() => {
                  if (isDraggingSidebarRef.current) return;
                  expandSidebarSmoothly();
                }}
                className="sidebar-compact-icon w-[80px] absolute left-0 flex items-center justify-center will-change-transform"
                style={{
                  opacity: 'calc(1 - var(--sidebar-text-opacity, ' + (isSidebarExpanded ? 1 : 0) + '))',
                  pointerEvents: !isSidebarExpanded ? 'auto' : 'none',
                  transition: 'opacity 260ms cubic-bezier(0.32, 0.72, 0, 1)'
                }}
              >
                <div title="เลือกสาขา (คลิกเพื่อขยาย)" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100 hover:bg-sky-50 hover:text-sky-600 transition-colors cursor-pointer">
                  <Building2 size={20} />
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative">
              {filteredNavItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button 
                    key={item.id} 
                    type="button"
                    onClick={() => {
                      if (isDraggingSidebarRef.current) return;
                      handleTabClick(item.id);
                    }} 
                    title={!isSidebarExpanded ? item.label : undefined}
                    className={`w-full h-11 flex items-center rounded-2xl transition-colors duration-150 kanit-text overflow-hidden shrink-0 relative ${
                      isActive 
                        ? 'bg-sky-500 shadow-md shadow-sky-500/20 text-white font-normal' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-normal'
                    }`}
                  >
                    <div className="w-12 h-11 shrink-0 flex items-center justify-center pointer-events-none">
                      <item.icon size={20} className={isActive ? 'opacity-100' : 'opacity-70'} />
                    </div>
                    <span 
                      className="sidebar-text-label whitespace-nowrap overflow-hidden text-left font-normal text-sm pl-1 pointer-events-none will-change-transform"
                      style={{
                        opacity: 'var(--sidebar-text-opacity, ' + (isSidebarExpanded ? 1 : 0) + ')',
                        transform: 'translate3d(var(--sidebar-text-x, ' + (isSidebarExpanded ? '0px' : '-8px') + '), 0, 0)',
                        transition: 'opacity 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 260ms cubic-bezier(0.32, 0.72, 0, 1)'
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div id="profile-container-pc" className="px-4 py-3 border-t border-slate-100/50 min-h-[76px] flex items-center relative shrink-0 overflow-visible">
              {/* Dropdown Menu (Expanded) */}
              {isProfileDropdownOpen && isSidebarExpanded && (
                <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-[999] animate-scale-up text-left space-y-1">
                  {/* Row 1: ชื่อและตำแหน่ง */}
                  <div className="px-3 py-2.5 border-b border-slate-100/50 select-none text-left">
                    <div className="font-semibold text-slate-700 text-xs kanit-text truncate">{currentUser.name}</div>
                    <p className="text-[11px] font-medium text-emerald-600 kanit-text mt-0.5 truncate">{currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}</p>
                  </div>

                  {/* Row 2: โปรไฟล์ */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      handleTabClick('profile');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                  >
                    <User size={14} className="opacity-80 text-slate-500 shrink-0" />
                    <span>โปรไฟล์</span>
                  </button>

                  {/* Row 3: คู่มือการใช้ */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      setIsShortcutsModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="opacity-80 text-sky-500 shrink-0" />
                      <span className="whitespace-nowrap">คู่มือการใช้</span>
                    </div>
                    <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">Shift+?</kbd>
                  </button>

                  {/* Row 4: ออกจากระบบ */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} className="opacity-80 shrink-0" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}

              {/* Dropdown Menu (Collapsed) */}
              {isProfileDropdownOpen && !isSidebarExpanded && (
                <div className="absolute bottom-20 left-4 w-56 min-w-[220px] bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-[999] animate-scale-up text-left space-y-1">
                  {/* Row 1: ชื่อและตำแหน่ง */}
                  <div className="px-3 py-2.5 border-b border-slate-100/50 select-none text-left">
                    <div className="font-semibold text-slate-700 text-xs kanit-text truncate">{currentUser.name}</div>
                    <p className="text-[11px] font-medium text-emerald-600 kanit-text mt-0.5 truncate">{currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}</p>
                  </div>

                  {/* Row 2: โปรไฟล์ */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      handleTabClick('profile');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                  >
                    <User size={14} className="opacity-80 text-slate-500 shrink-0" />
                    <span>โปรไฟล์</span>
                  </button>

                  {/* Row 3: คู่มือการใช้ */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      setIsShortcutsModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="opacity-80 text-sky-500 shrink-0" />
                      <span className="whitespace-nowrap">คู่มือการใช้</span>
                    </div>
                    <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">Shift+?</kbd>
                  </button>

                  {/* Row 4: ออกจากระบบ */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} className="opacity-80 shrink-0" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}

              {/* Single Unified Profile Bar */}
              <div 
                onClick={() => {
                  if (isDraggingSidebarRef.current) return;
                  setIsProfileDropdownOpen(prev => !prev);
                }}
                className="w-full h-11 flex items-center cursor-pointer hover:bg-slate-50/80 rounded-2xl transition-colors select-none overflow-hidden"
              >
                <div className="w-12 shrink-0 flex items-center justify-center">
                  {currentUser.photo ? (
                    <img src={currentUser.photo} className="w-9 h-9 rounded-full object-cover border border-slate-200 ring-2 ring-white shadow-sm" alt={currentUser.name} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ring-2 ring-white shadow-sm">
                      <User size={18} />
                    </div>
                  )}
                </div>
                <div 
                  className="sidebar-text-label text-left flex-1 min-w-0 pr-2 pl-1 pointer-events-none will-change-transform"
                  style={{
                    opacity: 'var(--sidebar-text-opacity, ' + (isSidebarExpanded ? 1 : 0) + ')',
                    transform: 'translate3d(var(--sidebar-text-x, ' + (isSidebarExpanded ? '0px' : '-8px') + '), 0, 0)',
                    transition: 'opacity 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 260ms cubic-bezier(0.32, 0.72, 0, 1)'
                  }}
                >
                  <div className="font-normal text-slate-700 text-xs kanit-text truncate">{currentUser.name}</div>
                  <p className="text-[11px] font-light text-emerald-600 kanit-text mt-0.5 truncate">{currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        {/* --- Mobile Top Header --- */}
        <header 
          className="mobile-top-header md:hidden fixed top-0 left-0 right-0 h-[61px] box-border flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3 bg-white/95 border-b border-slate-200/80 z-[45] shadow-sm"
          style={{ 
            transform: (isMobile && !showMobileBars) ? 'translateY(-61px)' : 'translateY(0px)', 
            transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' 
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button onClick={() => setIsSidebarExpanded(true)} className="w-10 h-10 flex items-center justify-center text-slate-500 active:scale-90 transition-transform">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/30">
                <Stethoscope size={18} />
              </div>
            </button>
            <div>
              <h2 className="text-lg font-black kanit-text tracking-tight mt-0.5">Clinic<span className="text-sky-500">Hub</span></h2>
            </div>
          </div>
          <div id="profile-container-mobile" className="flex items-center gap-2 sm:gap-3 relative">
            <div 
              onClick={() => setIsMobileProfileDropdownOpen(!isMobileProfileDropdownOpen)}
              className="text-right cursor-pointer select-none"
            >
              <div className="font-bold text-slate-700 text-xs kanit-text truncate max-w-[95px] xs:max-w-[130px] sm:max-w-[160px]">
                {currentUser.name}
              </div>
              <p className="text-[11px] font-medium text-emerald-600 kanit-text mt-0.5 truncate">
                {currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}
              </p>
            </div>
            <div 
              onClick={() => setIsMobileProfileDropdownOpen(!isMobileProfileDropdownOpen)}
              className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              {currentUser.photo ? (
                <img src={currentUser.photo} className="w-9 h-9 rounded-full object-cover shadow-inner ring-2 ring-white" alt={currentUser.name} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner ring-2 ring-white">
                  <User size={16} />
                </div>
              )}
            </div>

            {/* Mobile Profile Dropdown */}
            {isMobileProfileDropdownOpen && (
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-[999] animate-scale-up text-left space-y-1 w-56 min-w-[220px]">
                {/* Row 1: ชื่อและตำแหน่ง (ไม่เอารูป) */}
                <div className="px-3 py-2 border-b border-slate-100/50 select-none text-left">
                  <div className="font-semibold text-slate-700 text-xs kanit-text truncate">{currentUser.name}</div>
                  <p className="text-[11px] font-medium text-emerald-600 kanit-text mt-0.5 truncate">{currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}</p>
                </div>

                {/* Row 2: โปรไฟล์ */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileProfileDropdownOpen(false);
                    handleTabClick('profile');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                >
                  <User size={14} className="opacity-80 text-slate-500 shrink-0" />
                  <span>โปรไฟล์</span>
                </button>

                {/* Row 3: คู่มือการใช้ */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileProfileDropdownOpen(false);
                    setIsShortcutsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="opacity-80 text-sky-500 shrink-0" />
                    <span className="whitespace-nowrap">คู่มือการใช้</span>
                  </div>
                  <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">Shift+?</kbd>
                </button>


                {/* Row 4: ออกจากระบบ */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileProfileDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                >
                  <LogOut size={14} className="opacity-80" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* เพิ่ม ref={mainRef} ให้กล่องหลัก ปลด z-20 ออกเพื่อให้ Modal ทำงานอิสระ */}
        <main 
          id="main-scroll-container" 
          ref={mainRef} 
          className={`h-full min-w-0 flex flex-col relative custom-scrollbar ${currentTab === 'pos' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-24 md:pb-0'}`} 
          style={{ 
            overflowAnchor: 'none', 
            overscrollBehaviorY: 'auto', 
            marginLeft: !isMobile ? (isSidebarExpanded ? '256px' : '80px') : '0px',
            width: !isMobile ? (isSidebarExpanded ? 'calc(100% - 256px)' : 'calc(100% - 80px)') : '100%',
            flex: isMobile ? '1 1 0%' : 'none',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
            '--mobile-header-offset': (isMobile && showMobileBars) ? '61px' : '0px', 
            '--mobile-pos-top': (isMobile && showMobileBars) ? '61px' : '0px', 
            '--mobile-pos-bottom': (isMobile && showMobileBars) ? '64px' : '0px' 
          }}
        >
          
          {/* --- [FIX] ย้าย Spacer มาไว้ด้านในกล่อง Scroll แบบตายตัว ไม่ให้ Layout สั่นกระตุก (ยกเว้นหน้าเต็มจออย่าง POS) --- */}
          {currentTab !== 'pos' && (
            <div className="md:hidden shrink-0 w-full h-[61px] pointer-events-none"></div>
          )}

          {/* 🧪 Simulation Sandbox Mode Banner */}
          {isSimulationMode && (
            <div className="sticky top-0 z-30 mx-4 md:mx-6 mt-3 mb-2 p-3.5 bg-gradient-to-r from-amber-500/95 via-orange-500/95 to-amber-600/95 backdrop-blur-md text-white rounded-2xl shadow-lg border border-amber-300/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shrink-0 backdrop-blur-xs">
                  <FlaskConical size={20} className="text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm kanit-text tracking-wide">
                      กำลังทำงานในโหมดจำลองข้อมูล (Sandbox Simulation Mode)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-amber-700 uppercase tracking-wider">
                      Memory Only
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 kanit-text font-normal mt-0.5">
                    ไฟล์: <span className="font-semibold text-white">{simulationMeta?.fileName || 'ข้อมูลจาก Excel'}</span>
                    {simulationMeta?.totalRecords ? ` (${simulationMeta.totalRecords.toLocaleString()} รายการ)` : ''} 
                    {' • '} ข้อมูลทั้งหมดรันบนเบราว์เซอร์ ไม่มีการส่งหรือแก้ไขข้อมูลบน Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExitSimulation}
                className="px-4 py-2 bg-white text-amber-700 hover:bg-amber-50 active:scale-95 transition-all rounded-xl text-xs font-bold kanit-text shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <LogOut size={14} />
                <span>ออกจากโหมดจำลอง</span>
              </button>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col w-full min-h-full">
            {currentTab === 'dashboard' && (
                <div className="w-full min-w-0">
                    <Dashboard 
                        queueData={queueData} 
                        patientsData={patientsData} 
                        isGlobalLoading={isGlobalLoading} 
                        speak={speak}
                        currentBranch={currentBranch}
                        branchesData={branchesData}
                        staffData={staffData}
                        callAppScript={callAppScript}
                        setQueueData={setQueueData}
                        showToast={showToast}
                        fetchDashboardStats={fetchDashboardStats}
                    />
                </div>
            )}

            {currentTab === 'exec_dashboard' && (
                <div className="w-full min-w-0">
                    <ExecutiveDashboard 
                        queueData={queueData}
                        patientsData={patientsData}
                        posHistoryData={posHistoryData}
                        financeData={financeData}
                        staffData={staffData}
                        branchesData={branchesData}
                        currentBranch={currentBranch}
                        posProducts={posProducts}
                        isGlobalLoading={isGlobalLoading}
                        showToast={showToast}
                        callAppScript={callAppScript}
                    />
                </div>
            )}

            {currentTab === 'records' && (
                <div className="w-full">
                    <MedicalRecords patientsData={patientsData} setPatientsData={setPatientsData} patientCoursesData={patientCoursesData} setPatientCoursesData={setPatientCoursesData} couponsData={couponsData} setCouponsData={setCouponsData} currentBranch={currentBranch} branchesData={branchesData} staffData={staffData} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} posProducts={posProducts} showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} setPdpaQrModal={setPdpaQrModal} currentUser={currentUser} fetchPatientTreatments={fetchPatientTreatments} fetchPatientsPaginated={fetchPatientsPaginated} fetchPatientStats={fetchPatientStats} integrationTokens={integrationTokens} />
                </div>
            )}

            {currentTab === 'queue' && (
                <div className="w-full">
                    <AppointmentManager currentBranch={currentBranch} branchesData={branchesData} queueData={queueData} setQueueData={setQueueData} patientsData={patientsData} setPatientsData={setPatientsData} patientCoursesData={patientCoursesData} setPatientCoursesData={setPatientCoursesData} staffData={staffData} posProducts={posProducts} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} fetchQueueForMonth={fetchQueueForMonth} isQueueFetching={isQueueFetching} showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} roleLabels={roleLabels} dealStatuses={dealStatuses} staffCategories={staffCategories} currentUser={currentUser} fetchAppointmentStats={fetchAppointmentStats} integrationTokens={integrationTokens} />
                </div>
            )}

            {currentTab === 'catalog' && (
                <div className="w-full">
                    <CatalogManager products={posProducts} setProducts={setPosProducts} posHistoryData={posHistoryData} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} setInventoryData={setInventoryData} />
                </div>
            )}

            {currentTab === 'coupons' && (
                <div className="w-full">
                    <CouponManager 
                        couponsData={couponsData}
                        setCouponsData={setCouponsData}
                        patientsData={patientsData}
                        posProducts={posProducts}
                        posHistoryData={posHistoryData}
                        currentBranch={currentBranch}
                        branchesData={branchesData}
                        currentUser={currentUser}
                        callAppScript={callAppScript}
                        gdriveTokens={gdriveTokens}
                        showToast={showToast}
                        showGlobalAlert={showGlobalAlert}
                        isGlobalLoading={isGlobalLoading}
                    />
                </div>
            )}

            {currentTab === 'pos' && (
                <div className="flex-1 w-full relative min-h-0 flex flex-col">
                    <POSSystem products={posProducts}
                        setProducts={setPosProducts}
                        patientsData={patientsData}
                        setPatientsData={setPatientsData}
                        patientCoursesData={patientCoursesData}
                        setPatientCoursesData={setPatientCoursesData}
                        couponsData={couponsData}
                        setCouponsData={setCouponsData}
                        posHistoryData={posHistoryData}
                        setPosHistoryData={setPosHistoryData}
                        inventoryData={inventoryData}
                        setInventoryData={setInventoryData}
                        setInventoryLogsData={setInventoryLogsData}
                        staffData={staffData}
                        currentBranch={currentBranch}
                        branchesData={branchesData}
                        currentUser={currentUser}
                        showToast={showToast}
                        callAppScript={callAppScript}
                        isGlobalLoading={isGlobalLoading}
                        isMobile={isMobile}
                        showMobileBars={showMobileBars}
                        handlePrintReceipt={handlePrintReceipt}
                        integrationTokens={integrationTokens}
                        fetchPatientTreatments={fetchPatientTreatments}
                        fetchPatientsPaginated={fetchPatientsPaginated}
                        posQrSettings={posQrSettings}
                    showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} />
                </div>
            )}

            {currentTab === 'finance' && (
                <div className="w-full mx-auto px-0 py-0">
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
                     staffData={staffData}
                     setStaffData={setStaffData}
                     patientCoursesData={patientCoursesData}
                     setPatientCoursesData={setPatientCoursesData}
                     handlePrintReceipt={handlePrintReceipt}
                     showGlobalAlert={showGlobalAlert} globalAlert={globalAlert}
                     fetchFinanceStats={fetchFinanceStats}
                   />
                </div>
            )}

            {currentTab === 'inventory' && (
                <div className="w-full">
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
                        fetchInventoryStats={fetchInventoryStats}
                    />
                </div>
            )}

            {currentTab === 'staff' && (
                <div className="w-full mx-auto px-0 py-0">
                    <StaffManager staffData={staffData} 
                       setStaffData={setStaffData} 
                       financeData={financeData} 
                       setFinanceData={setFinanceData} 
                       posHistoryData={posHistoryData} 
                       branchesData={branchesData}
                       callAppScript={callAppScript} 
                       showToast={showToast} 
                       isGlobalLoading={isGlobalLoading} 
                       showGlobalAlert={showGlobalAlert} 
                       globalAlert={globalAlert}
                       staffPrefixes={staffPrefixes}
                       staffCategories={staffCategories}
                       roleLabels={roleLabels}
                       gdriveTokens={gdriveTokens}
                       fetchStaffStats={fetchStaffStats}
                       currentUser={currentUser}
                       handleLogout={handleLogout}
                    />
                </div>
            )}
            
            {currentTab === 'branch' && (
                <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 py-4 md:py-8">
                    <BranchManager branchesData={branchesData} 
                        setBranchesData={setBranchesData} 
                        showToast={showToast} 
                        callAppScript={callAppScript} 
                        isGlobalLoading={isGlobalLoading} 
                        showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} 
                        gdriveTokens={gdriveTokens}
                    />
                </div>
            )}

            {currentTab === 'reports' && (
                <div className="w-full mx-auto px-0 py-0">
                    <ReportsManager
                        patientsData={patientsData}
                        setPatientsData={setPatientsData}
                        posHistoryData={posHistoryData}
                        setPosHistoryData={setPosHistoryData}
                        branchesData={branchesData}
                        posProducts={posProducts}
                        isGlobalLoading={isGlobalLoading}
                        showToast={showToast}
                        currentBranch={currentBranch}
                        staffData={staffData}
                        callAppScript={callAppScript}
                        fetchPatientsPaginated={fetchPatientsPaginated}
                    />
                </div>
            )}
            
            {currentTab === 'settings' && (
                <div className="w-full">
                    <SettingsManager 
                        staffPrefixes={staffPrefixes}
                        setStaffPrefixes={setStaffPrefixes}
                        rolePermissions={rolePermissions}
                        setRolePermissions={setRolePermissions}
                        roleLabels={roleLabels}
                        setRoleLabels={setRoleLabels}
                        staffCategories={staffCategories}
                        setStaffCategories={setStaffCategories}
                        appointmentStatuses={appointmentStatuses}
                        setAppointmentStatuses={setAppointmentStatuses}
                        integrationTokens={integrationTokens}
                        setIntegrationTokens={setIntegrationTokens}
                        gdriveTokens={gdriveTokens}
                        setGdriveTokens={setGdriveTokens}
                        callAppScript={callAppScript}
                        showToast={showToast}
                        isGlobalLoading={isGlobalLoading}
                        onDirtyChange={setHasUnsavedSettings}
                        onStartSimulation={handleStartSimulation}
                        isSimulationMode={isSimulationMode}
                        simulationMeta={simulationMeta}
                        onExitSimulation={handleExitSimulation}
                        branchesData={branchesData}
                        currentBranch={currentBranch}
                        posQrSettings={posQrSettings}
                        setPosQrSettings={setPosQrSettings}
                        showGlobalAlert={showGlobalAlert}
                        globalAlert={globalAlert}
                    />
                </div>
            )}

            {currentTab === 'display_ads' && (
                <div className="w-full">
                    <DisplayAdsManager 
                        gdriveTokens={gdriveTokens}
                        callAppScript={callAppScript}
                        showToast={showToast}
                        showGlobalAlert={showGlobalAlert}
                        branchesData={branchesData}
                        currentBranch={currentBranch}
                    />
                </div>
            )}

            {currentTab === 'profile' && (
                <div className="w-full">
                    <ProfileManager
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        staffData={staffData}
                        setStaffData={setStaffData}
                        branchesData={branchesData}
                        callAppScript={callAppScript}
                        showToast={showToast}
                        isGlobalLoading={isGlobalLoading}
                        roleLabels={roleLabels}
                        integrationTokens={integrationTokens}
                        gdriveTokens={gdriveTokens}
                    />
                </div>
            )}
          </div>

        </main> 

        {/* Backdrop Overlay เมื่อเลื่อนเปิดแถบเมนูเพิ่มเติม (วางไว้นอก <main> เพื่อความเสถียร 60fps และไม่กระพริบซ้อน) */}
        {isMobile && hasMoreNavItems && (
          <div 
            ref={navBackdropRef}
            className="fixed inset-0 bg-slate-900/40 z-[42] will-change-[opacity] opacity-0 pointer-events-none"
            style={{
              transition: 'opacity 300ms ease-out'
            }}
            onClick={collapseMobileNav}
          />
        )}

        {/* ปรับแก้ Navbar มือถือ: Compact & Full เหมือนแบบเดิม พร้อม Expandable Quick Panel ดึงขึ้นเพื่อเลือกหน้าอื่น */}
        <div 
          ref={setNavSheetRef}
          className="md:hidden fixed bottom-0 left-0 w-full bg-white border border-b-0 border-slate-200/80 rounded-t-[1.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pt-1.5 pb-[calc(max(0.875rem,env(safe-area-inset-bottom)))] px-2 z-[50] will-change-transform select-none touch-none"
          style={{
            transform: isDraggingRef.current
              ? undefined
              : (isMobile && !showMobileBars && !isExpandedRef.current)
                ? 'translate3d(0, 115%, 0)'
                : hasMoreNavItems && !isExpandedRef.current
                  ? `translate3d(0, ${extraHeightRef.current}px, 0)`
                  : 'translate3d(0, 0px, 0)',
            transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)'
          }}
        >
          {/* Drag Handle Indicator (ขีดเส้นเรียบกะทัดรัด พร้อมระยะหายใจไม่ให้เบียดกับไอคอน) */}
          {hasMoreNavItems && (
            <div 
              data-drag-handle="true"
              onClick={(e) => {
                e.stopPropagation();
                toggleMobileNav();
              }}
              className="w-full flex items-center justify-center pt-0.5 pb-1.5 cursor-grab active:cursor-grabbing select-none group touch-none"
              aria-label="เปิดดูเมนูเพิ่มเติม"
              role="button"
            >
              <div className="w-9 h-1 rounded-full bg-slate-300/80 transition-transform duration-200 group-hover:scale-105 pointer-events-none" />
            </div>
          )}

          {/* แถวที่ 1: 5 เมนูหลัก พร้อม Liquid Bubble กะทัดรัด สัดส่วนเต็ม กระชับ ไซส์เดิม 100% */}
          <div className="relative flex w-full max-w-sm mx-auto h-[50px]">
              {/* กล่องใส่ก้อน Bubble สีสันที่เลื่อนไปมา ขนาด 48px (w-12 h-12) พร้อม Liquid Tab Bar Animation 500ms นุ่มนวล ไม่กระตุก */}
              <div 
                className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none will-change-transform" 
                style={{ 
                  width: `calc(100% / ${mobileNavItems.length})`,
                  transform: `translateX(calc(${activeNavIndex !== -1 ? activeNavIndex : lastMainIndexRef.current} * 100%))`,
                  opacity: activeNavIndex !== -1 ? 1 : 0,
                  transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-in-out'
                }} 
              >
                <div className="w-12 h-12 bg-gradient-to-tr from-sky-400 to-sky-600 rounded-full shadow-lg shadow-sky-500/40" />
              </div>

              {/* Nav Buttons: ปุ่มรับการกดคลิก ไอคอนขนาด 24px ชัดเจนเต็มตา แตะครั้งเดียวสลับหน้าทันที 100% */}
              {mobileNavItems.map((item) => {
                  const isActive = effectiveNavTab === item.id;
                  return (
                      <button 
                          key={item.id} 
                          type="button"
                          data-tab-id={item.id}
                          onClick={(e) => handleButtonClick(item.id, e)} 
                          onTouchStart={handleButtonTouchStart}
                          onTouchEnd={(e) => handleButtonTouchEnd(item.id, e)}
                          className={`relative z-10 flex-1 flex items-center justify-center transition-colors duration-300 touch-manipulation cursor-pointer select-none active:opacity-75 ${isActive ? 'text-white' : 'text-slate-400'}`}
                          title={item.label}
                          aria-label={item.label}
                      >
                          <item.icon 
                              size={24} 
                              strokeWidth={isActive ? 2.5 : 2} 
                              className={`transition-transform duration-300 ease-in-out pointer-events-none ${isActive ? 'scale-110' : 'scale-100'}`}
                          />
                      </button>
                  );
              })}
          </div>

          {/* แถวที่เหลือ: เมนูเพิ่มเติม 4 คอลัมน์ ไอคอนใหญ่เท่าเมนูหลัก (w-12 h-12, size 24) ดูเป็นเนื้อเดียวกัน */}
          {hasMoreNavItems && (
            <div 
              ref={extraContentRef}
              className="w-full max-w-sm mx-auto pt-2 pb-[calc(max(1.25rem,env(safe-area-inset-bottom)))] transition-opacity duration-300 opacity-0 pointer-events-auto"
            >
              <div id="extra-mobile-nav-grid" ref={extraGridRef} className="grid grid-cols-4 gap-x-2 gap-y-2 px-1 relative">
                {/* Sliding Liquid Bubble Indicator สำหรับเมนูแถวเพิ่มเติม (ขนาด w-12 h-12 เท่ากับเมนูหลัก 100%) */}
                <div 
                  ref={extraBubbleRef}
                  className="absolute top-0 left-0 w-12 h-12 bg-gradient-to-tr from-sky-400 to-sky-600 rounded-full shadow-lg shadow-sky-500/40 pointer-events-none opacity-0 z-0"
                  style={{
                    willChange: 'transform'
                  }}
                />

                {otherMobileNavItems.map((item) => {
                  const isActive = effectiveNavTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-tab-id={item.id}
                      data-active={isActive ? "true" : "false"}
                      onClick={(e) => handleButtonClick(item.id, e)}
                      onTouchStart={handleButtonTouchStart}
                      onTouchEnd={(e) => handleButtonTouchEnd(item.id, e)}
                      className="flex flex-col items-center justify-center py-1 px-0.5 rounded-xl active:bg-sky-50/70 transition-colors duration-200 text-center relative z-10 touch-manipulation cursor-pointer select-none"
                      aria-label={item.label}
                      title={item.label}
                    >
                      <div className="extra-nav-icon w-12 h-12 flex items-center justify-center transition-colors duration-300 pointer-events-none">
                        <item.icon 
                          size={24} 
                          strokeWidth={isActive ? 2.5 : 2} 
                          className={`transition-transform duration-300 ease-in-out ${
                            isActive ? 'scale-110 text-white' : 'scale-100 text-slate-500'
                          }`}
                        />
                      </div>
                      <span className={`text-[11px] font-light kanit-text leading-tight mt-1 text-center truncate max-w-[76px] line-clamp-1 px-0.5 transition-colors duration-300 pointer-events-none ${
                        isActive ? 'text-sky-600 font-medium' : 'text-slate-600'
                      }`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* แผ่นพื้นหลังส่วนขยายด้านล่าง (Bottom Skirt) เพื่อปิดช่องว่าง 100% ไม่ให้เห็นขอบล่างทะลุเด็ดขาด */}
          <div className="absolute top-full left-0 right-0 h-96 bg-white pointer-events-none" />
        </div>
      </div>

      <ToastContainer />

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        /* 1. โครงสร้างเว็บและ UI ทั่วไปใช้ Kanit เป็นค่าเริ่มต้น */
        body { font-family: 'Kanit', sans-serif !important; }
        h1, h2, h3, h4, h5, h6, button, th, label, .nav-item, .kanit-text { font-family: 'Kanit', sans-serif !important; }
        
        /* 2. ข้อมูล เนื้อหา และฟอร์มรับข้อมูล ใช้ Google Font 'Sarabun' แทนฟอนต์เครื่องทั่วไป */
        td, input, select, textarea, .font-data { font-family: 'Sarabun', sans-serif !important; }

        /* 2.5 บังคับให้หน้าจอ Login และโครงสร้างภายในทั้งหมดใช้ Google Font 'Kanit' เท่านั้น */
        .login-screen-container,
        .login-screen-container *,
        .login-screen-container input,
        .login-screen-container select,
        .login-screen-container textarea,
        .login-screen-container .font-data {
            font-family: 'Kanit', sans-serif !important;
        }

        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @keyframes loading-slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .animate-loading-slide {
            animation: loading-slide 1.5s infinite linear;
        }
        
        /* --- ทำให้ Modal ทุกตัวเด้งใหญ่ขึ้นและลดลงแบบ Smooth เหมือนกันทั้งหมด --- */
        .scale-in, .modal-animate-in, .sweet-alert-pop { 
            animation: scaleFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important; 
            transform-origin: center;
        }
        
        /* เพิ่ม Animation ตอนปิดให้เด้งขึ้นและหดลง พร้อมกับฉากหลังที่ค่อยๆ จาง */
        .modal-animate-out { 
            animation: scaleFadeOut 0.25s cubic-bezier(0.36, -0.3, 0.6, 1) forwards !important; 
            transform-origin: center;
        }
        .backdrop-animate-out {
            animation: fadeOut 0.3s ease-out forwards !important;
        }

        /* แอนิเมชันตอนสลับมุมมอง (วัน/เดือน/ปี) ภายในปฏิทิน */
        .calendar-view-anim {
            animation: scaleFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* แอนิเมชันปุ่มวันที่ (กดแล้วยุบ, เลือกแล้วเด้ง) */
        .calendar-btn-anim {
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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


        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes scaleFadeIn {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
        }

        @keyframes scaleFadeOut {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.85); }
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
        
        .toast-wrapper-active {
            opacity: 1;
            transform: translateY(0);
            margin-bottom: 0.5rem;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toast-wrapper-closing {
            opacity: 0 !important;
            transform: translateY(-10px);
            margin-bottom: 0px !important;
            pointer-events: none;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
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
        .custom-scrollbar::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
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
            transform: translateY(15px); /* ลดระยะการเด้งลง เพื่อไม่ให้ทะลุกรอบขอบ */
          }
          100% {
            opacity: 1;
            transform: translateY(0); 
          }
        }

        /* คลาสที่จะเอาไปใส่ให้แต่ละแถว */
        .space-row-animation {
          opacity: 0; /* ซ่อนไว้ก่อนที่แอนิเมชันจะเริ่ม */
          
          /* เล่นแอนิเมชันให้กระชับขึ้น ใช้ ease-out ป้องกันปัญหาหน่วง */
          animation: spaceRowEnter 0.5s ease-out forwards; 
        }

        /* --- [NEW] CSS สำหรับ Custom Pointer Engine 60FPS ของเราเอง --- */
        body.is-custom-dragging {
            touch-action: none !important;
            overflow: hidden !important; 
        }
        body.is-custom-dragging * {
            cursor: grabbing !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }
        /* ปิดการรับเมาส์ของไส้ใน เพื่อให้การตรวจจับทะลุไปถึงช่องตารางได้แม่นยำ */
        body.is-custom-dragging .calendar-dropzone * {
            pointer-events: none !important;
        }
        
        /* สไตล์กรอบตาราง 4 ด้านเป๊ะแบบ Inset ไม่โดนตัดแหว่ง */
        .calendar-dropzone {
            position: relative; 
        }
        .calendar-dropzone.dropzone-active::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border: 2px solid #0ea5e9 !important; 
            background-color: rgba(224, 242, 254, 0.4) !important;
            z-index: 50 !important;
            pointer-events: none !important;
            box-shadow: inset 0 0 12px rgba(14, 165, 233, 0.25) !important;
            border-radius: inherit; 
        }

        /* --- CSS-Based 60FPS Sticky Header Animations --- */
        :root {
          --scrolled-header-h: 60px;
          --header-p: 0;
        }
        @media (min-width: 640px) {
          :root {
            --scrolled-header-h: 64px;
          }
        }

        .sticky-header-bg { 
          min-height: calc(var(--scrolled-header-h, 60px) + (1 - var(--header-p, 0)) * 48px);
          height: auto;
          box-sizing: border-box !important;
          padding-top: calc(0.5rem + (1 - var(--header-p, 0)) * 0.5rem);
          padding-bottom: calc(0.5rem + (1 - var(--header-p, 0)) * 0.5rem);
          background-color: rgba(255, 255, 255, calc(var(--header-p, 0) * 0.90)); 
          backdrop-filter: blur(calc(var(--header-p, 0) * 16px)); 
          -webkit-backdrop-filter: blur(calc(var(--header-p, 0) * 16px)); 
          border: 1px solid transparent !important; 
          border-bottom-color: rgba(226, 232, 240, calc(var(--header-p, 0) * 0.8)) !important; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, calc(var(--header-p, 0) * 0.02)) !important; 
          outline: none !important; 
          will-change: min-height, background-color, backdrop-filter; 
        }
        @media (min-width: 640px) {
          .sticky-header-bg {
            min-height: calc(var(--scrolled-header-h, 64px) + (1 - var(--header-p, 0)) * 36px);
            padding-top: calc(0.5rem + (1 - var(--header-p, 0)) * 0.5rem);
            padding-bottom: calc(0.5rem + (1 - var(--header-p, 0)) * 0.5rem);
          }
        }
        .is-scrolled .sticky-header-bg { 
          height: var(--scrolled-header-h, 60px) !important;
          min-height: var(--scrolled-header-h, 60px) !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          box-sizing: border-box !important;
          background-color: rgba(255, 255, 255, 0.90) !important; 
          backdrop-filter: blur(16px) !important; 
          -webkit-backdrop-filter: blur(16px) !important; 
          border-bottom-color: rgba(226, 232, 240, 0.8) !important; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02) !important; 
          outline: none !important; 
        }
        @media (min-width: 640px) {
          .is-scrolled .sticky-header-bg {
            height: var(--scrolled-header-h, 64px) !important;
            min-height: var(--scrolled-header-h, 64px) !important;
          }
        }

        .header-spacer { 
          height: calc(0.75rem - var(--header-p, 0) * 0.75rem); 
        }
        @media (min-width: 640px) { 
          .header-spacer { 
            height: calc(1rem - var(--header-p, 0) * 1rem); 
          } 
        }
        .is-scrolled .header-spacer { height: 0px !important; }

        .sticky-header-inner { 
          width: 100%;
          max-width: 100%;
          box-sizing: border-box !important;
          padding-top: calc(0.5rem - var(--header-p, 0) * 0.5rem); 
          padding-bottom: calc(0.5rem - var(--header-p, 0) * 0.5rem); 
          height: 100%;
          display: flex;
          align-items: center;
          will-change: padding; 
        }
        .sticky-header-inner > *:first-child {
          min-width: 0 !important;
          flex: 1 1 auto !important;
        }
        .sticky-header-inner > *:last-child {
          flex-shrink: 0 !important;
        }
        @media (min-width: 768px) { 
          .sticky-header-inner { 
            padding-top: calc(1rem - var(--header-p, 0) * 1rem); 
            padding-bottom: calc(1rem - var(--header-p, 0) * 1rem); 
          } 
        }
        .is-scrolled .sticky-header-inner { 
          height: 100% !important; 
          min-height: 100% !important; 
          max-height: 100% !important; 
          padding-top: 0 !important; 
          padding-bottom: 0 !important; 
          display: flex !important; 
          align-items: center !important; 
        }

        .sticky-header-title { 
          font-size: calc(1.1875rem + (1 - var(--header-p, 0)) * 0.125rem); 
          line-height: calc(1.6rem + (1 - var(--header-p, 0)) * 0.2rem); 
          margin: 0; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          will-change: font-size, line-height; 
        }
        @media (min-width: 640px) { 
          .sticky-header-title { 
            font-size: calc(1.375rem + (1 - var(--header-p, 0)) * 0.5rem); 
            line-height: calc(1.875rem + (1 - var(--header-p, 0)) * 0.375rem); 
          } 
        }
        .is-scrolled .sticky-header-title { 
          font-size: 1.1875rem !important; 
          line-height: 1.6rem !important; 
          white-space: nowrap !important; 
          overflow: hidden !important; 
          text-overflow: ellipsis !important; 
        }
        @media (min-width: 640px) { 
          .is-scrolled .sticky-header-title { 
            font-size: 1.375rem !important; 
            line-height: 1.875rem !important; 
          } 
        }

        .sticky-header-desc { 
          opacity: calc(max(0, 1 - var(--header-p, 0) * 1.4)); 
          max-height: calc(max(0px, (1 - var(--header-p, 0) * 1.3) * 64px)); 
          line-height: 1.35rem; 
          font-size: 0.875rem; 
          margin-top: calc(max(0px, (1 - var(--header-p, 0) * 1.2) * 0.25rem)); 
          transform: translateY(calc(var(--header-p, 0) * -6px));
          overflow: hidden; 
          pointer-events: none;
          will-change: opacity, transform, max-height; 
        }
        .is-scrolled .sticky-header-desc { 
          opacity: 0 !important; 
          max-height: 0 !important; 
          margin-top: 0 !important; 
          margin-bottom: 0 !important; 
          pointer-events: none !important; 
        }

        .sticky-header-btn { 
          height: calc(40px + (1 - var(--header-p, 0)) * 4px); 
          padding: calc(0.425rem + (1 - var(--header-p, 0)) * 0.125rem) calc(0.625rem + (1 - var(--header-p, 0)) * 0.125rem); 
          font-size: calc(0.85rem + (1 - var(--header-p, 0)) * 0.05rem); 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0;
          will-change: padding, font-size, height; 
        }
        @media (min-width: 640px) { 
          .sticky-header-btn { 
            padding: calc(0.5rem + (1 - var(--header-p, 0)) * 0.25rem) calc(1.25rem - var(--header-p, 0) * 0.25rem); 
            font-size: calc(0.9375rem + (1 - var(--header-p, 0)) * 0.0625rem); 
            height: calc(44px + (1 - var(--header-p, 0)) * 4px); 
          } 
        }
        .is-scrolled .sticky-header-btn { 
          padding: 0.425rem 0.625rem !important; 
          font-size: 0.85rem !important; 
          height: 40px !important; 
          display: inline-flex !important; 
          align-items: center !important; 
          justify-content: center !important; 
          flex-shrink: 0 !important;
        }
        @media (min-width: 640px) { 
          .is-scrolled .sticky-header-btn { 
            padding: 0.5rem 1.25rem !important; 
            font-size: 0.9375rem !important; 
            height: 44px !important; 
          } 
        }
        .sticky-header-btn svg { 
          width: calc(18px + (1 - var(--header-p, 0)) * 2px); 
          height: calc(18px + (1 - var(--header-p, 0)) * 2px); 
          will-change: width, height; 
        }
        @media (min-width: 640px) { 
          .sticky-header-btn svg { 
            width: calc(20px - var(--header-p, 0) * 1px); 
            height: calc(20px - var(--header-p, 0) * 1px); 
          } 
        }
        .is-scrolled .sticky-header-btn svg { width: 18px !important; height: 18px !important; }
        @media (min-width: 640px) { .is-scrolled .sticky-header-btn svg { width: 19px !important; height: 19px !important; } }

        .dash-date-badge { 
          padding: calc(0.375rem - var(--header-p, 0) * 0.125rem) calc(0.75rem - var(--header-p, 0) * 0.25rem); 
          font-size: calc(0.875rem - var(--header-p, 0) * 0.125rem); 
          height: calc(38px - var(--header-p, 0) * 6px);
          display: inline-flex;
          align-items: center;
          will-change: padding, font-size; 
        }
        @media (min-width: 640px) { 
          .dash-date-badge { 
            padding: calc(0.5rem - var(--header-p, 0) * 0.125rem) calc(1rem - var(--header-p, 0) * 0.25rem); 
            font-size: 1rem; 
          } 
        }
        .dash-date-badge svg { 
          width: calc(18px - var(--header-p, 0) * 4px); 
          height: calc(18px - var(--header-p, 0) * 4px); 
        }
        .is-scrolled .dash-date-badge { font-size: 0.75rem !important; padding: 0.25rem 0.5rem !important; height: 32px !important; display: inline-flex !important; align-items: center !important; }
        .is-scrolled .dash-date-badge svg { width: 14px !important; height: 14px !important; }

        .sticky-filter-inner { 
          transition: width 0.3s ease, padding 0.3s ease, border-radius 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease; 
          width: calc(100% - 2rem); 
          border-radius: 2rem; 
          border-width: 1px; 
          border-style: solid;
          border-color: rgba(226, 232, 240, 0.7);
          will-change: width, padding, border-radius, border-color, box-shadow; 
          background-color: rgba(255, 255, 255, 0.90); 
          backdrop-filter: blur(16px); 
          -webkit-backdrop-filter: blur(16px); 
          box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.03); 
        }
        @media (min-width: 768px) { .sticky-filter-inner { width: calc(100% - 4rem); } }
        @media (min-width: 1536px) { .sticky-filter-inner { width: calc(100% - 6rem); } }
        .is-scrolled .sticky-filter-inner { 
          position: relative !important; 
          top: 0 !important; 
          transform: none !important; 
          --tw-translate-y: 0 !important; 
          width: 100% !important; 
          border-radius: 0 0 1.5rem 1.5rem !important; 
          border-top-color: transparent !important; 
          border-left-color: transparent !important; 
          border-right-color: transparent !important; 
          border-bottom-color: rgba(226, 232, 240, 0.8) !important; 
          box-shadow: 0 10px 15px -6px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.02) !important; 
          background-color: rgba(255, 255, 255, 0.90) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          padding-top: 0.625rem !important; 
          padding-bottom: 0.625rem !important; 
        }
        @media (min-width: 768px) { 
          .is-scrolled .sticky-filter-inner { 
            padding-top: 0.875rem !important; 
            padding-bottom: 0.875rem !important; 
            padding-left: 2rem !important; 
            padding-right: 2rem !important; 
          } 
        }
        @media (min-width: 1536px) { .is-scrolled .sticky-filter-inner { padding-left: 3rem !important; padding-right: 3rem !important; } }

        /* --- [PERFECT 0px GAP] Synchronized GPU-accelerated Header & Filter Docking --- */
        @media (max-width: 767px) {
          /* Lock sticky top to 61px on mobile (matching 61px mobile header) with zero layout thrashing */
          .page-sticky-header,
          div:has(> .sticky-header-bg),
          div[style*="--mobile-header-offset"] {
            top: 61px !important;
          }

          /* Filter sticky positioning: strictly driven by --mobile-header-offset and scrolled header height without layout jumping */
          .sticky-filter-appt {
            top: calc(var(--mobile-header-offset, 0px) + var(--scrolled-header-h, 60px)) !important;
            transform: none !important;
            transition: top 0.35s cubic-bezier(0.32, 0.72, 0, 1) !important;
          }
          .sticky-filter-appt.filter-expanded {
            z-index: 40 !important;
          }

          /* Hardware-accelerated GPU transitions running on the compositor thread for mobile headers */
          header.mobile-top-header,
          .page-sticky-header,
          div:has(> .sticky-header-bg),
          div[style*="--mobile-header-offset"] {
            transform: translateY(0px);
            transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1) !important;
            will-change: transform;
          }

          /* Lockstep slide-up when scrolling down: 0px gap at all times */
          .mobile-bars-hidden header.mobile-top-header,
          .mobile-bars-hidden .page-sticky-header,
          .mobile-bars-hidden div:has(> .sticky-header-bg),
          .mobile-bars-hidden div[style*="--mobile-header-offset"] {
            transform: translateY(-61px) !important;
          }

          .mobile-bars-visible header.mobile-top-header,
          .mobile-bars-visible .page-sticky-header,
          .mobile-bars-visible div:has(> .sticky-header-bg),
          .mobile-bars-visible div[style*="--mobile-header-offset"] {
            transform: translateY(0px) !important;
          }
        }

        @media (min-width: 768px) {
          .page-sticky-header,
          div:has(> .sticky-header-bg),
          div[style*="--mobile-header-offset"] {
            top: 0px !important;
            transform: none !important;
            transition: none !important;
          }
          .sticky-filter-appt {
            top: var(--scrolled-header-h, 64px) !important;
            transform: none !important;
            transition: none !important;
          }
          .sticky-filter-appt.filter-expanded {
            top: var(--scrolled-header-h, 64px) !important;
            z-index: 40;
          }
        }

        /* --- Executive Dashboard Sticky Header (Frosted Glass / กระจกขุ่น เหมือนหน้าอื่น) --- */
        .exec-sticky-header {
          background-color: rgba(248, 250, 252, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.7);
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
          transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, backdrop-filter 0.25s ease;
        }
        .is-scrolled .exec-sticky-header {
          background-color: rgba(255, 255, 255, 0.90) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border-bottom-color: rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02) !important;
        }
        .exec-header-inner {
          transition: padding 0.25s ease;
        }
        .is-scrolled .exec-header-inner {
          padding-top: 0.375rem !important;
          padding-bottom: 0.375rem !important;
        }
        @media (min-width: 640px) {
          .is-scrolled .exec-header-inner {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
        }
      `}} />

      {/* PDPA QR Code Modal */}
      {pdpaQrModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-3.5 sm:p-6">
              <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[calc(100dvh-1.75rem)] overflow-y-auto p-6 animate-in fade-in zoom-in duration-200 border border-slate-100">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                      <h3 className="font-bold text-lg text-slate-800 kanit-text flex items-center gap-2">
                          <ShieldCheck size={24} className="text-sky-500" /> สแกนเพื่อยินยอม
                      </h3>
                      <button onClick={() => setPdpaQrModal({ isOpen: false, link: '' })} className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                          <XCircle size={20} />
                      </button>
                  </div>
                  <div className="flex flex-col items-center">
                      <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-sky-200 shadow-sm mb-5 relative flex items-center justify-center min-w-[240px] min-h-[240px]">
                          {pdpaQrDataUrl ? (
                              <img src={pdpaQrDataUrl} alt="QR Code" className="w-56 h-56 rounded-xl animate-in fade-in duration-150" />
                          ) : (
                              <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                                  <Loader2 className="animate-spin text-sky-500" size={32} />
                                  <span className="text-xs">กำลังสร้าง QR Code...</span>
                              </div>
                          )}
                      </div>
                      <p className="text-sm text-slate-500 text-center mb-6 px-2 leading-relaxed">
                          ให้ผู้ป่วยสแกน QR Code เพื่อให้ความยินยอม หรือคลิกปุ่มด้านล่างเพื่อเปิดหน้าต่างให้ผู้ป่วยทำรายการบนอุปกรณ์นี้
                      </p>
                      <button 
                          onClick={() => {
                              window.open(pdpaQrModal.link, '_blank');
                              setPdpaQrModal({ isOpen: false, link: '' });
                          }}
                          className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/20 transform hover:-translate-y-0.5"
                      >
                          <ExternalLink size={18} /> เปิดหน้ายินยอมบนเครื่องนี้
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal แจ้งเตือนเมื่อมีข้อมูลที่ยังไม่ได้บันทึกก่อนเปลี่ยนหน้าหลัก */}
      {navUnsavedModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-xs">
              <AlertTriangle size={26} />
            </div>
            <h3 className="text-lg font-black text-slate-800 text-center kanit-text mb-2">
              มีข้อมูลที่ยังไม่ได้บันทึก!
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm text-center kanit-text leading-relaxed mb-6">
              คุณได้กรอกหรือแก้ไขข้อมูลการตั้งค่าแจ้งเตือน (บอท LINE / Discord) ไว้แต่ยังไม่ได้กดบันทึก หากออกจากหน้านี้ข้อมูลที่แก้ไขจะสูญหาย
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNavUnsavedModal({ isOpen: false, targetTab: null })}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-sm kanit-text transition-colors"
              >
                อยู่หน้านี้ต่อ
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = navUnsavedModal.targetTab;
                  setHasUnsavedSettings(false);
                  setNavUnsavedModal({ isOpen: false, targetTab: null });
                  if (target) {
                    if (mainRef.current) {
                      scrollPositions.current[currentTab] = mainRef.current.scrollTop;
                    }
                    setCurrentTab(target);
                    if (isMobile) setIsSidebarExpanded(false);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm kanit-text transition-colors shadow-sm"
              >
                ออกจากหน้านี้ (ไม่บันทึก)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แป้นพิมพ์ลัด */}
      <KeyboardShortcutsModal 
        isOpen={isShortcutsModalOpen} 
        onClose={() => setIsShortcutsModalOpen(false)} 
      />

      {GlobalAlertUI()}
    </div>
  );
}
