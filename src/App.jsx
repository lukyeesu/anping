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
  Lock, Home, Save, UserCheck, Key, RotateCcw, CloudDownload, Database
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

export default function App() {

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pdpaToken = urlParams.get('pdpa');
  const pdpaHn = urlParams.get('hn');
  const resetToken = urlParams.get('reset_token');

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
        resInvLogs,
        resPosItems,
        resBranches,
        resStaff,
        resSettings,
        resStaffSchedules
      ] = await Promise.all([
        callAppScript('GET_PATIENTS_PAGINATED', 'Patients', { offset: 0, limit: 20 }).catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'POS_Transactions').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Inventory').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'InventoryLogs').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'setting_pos').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Branches').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Staff').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Settings').catch(err => ({ status: 'error', data: [], message: err?.message })),
        callAppScript('GET_DATA', 'Staff_Schedules').catch(err => ({ status: 'error', data: [], message: err?.message }))
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
      if (resInvLogs?.status === 'success') {
        setInventoryLogsData(Array.isArray(resInvLogs.data) && resInvLogs.data.length > 0 ? [...resInvLogs.data].reverse() : []);
      }
      if (resPosItems?.status === 'success') {
        const rawPosItems = Array.isArray(resPosItems.data) ? resPosItems.data : [];
        setPosProducts(rawPosItems);
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
    '/finance': 'finance',
    '/inventory': 'inventory',
    '/staff': 'staff',
    '/branch': 'branch',
    '/reports': 'reports',
    '/settings': 'settings',
    '/profile': 'profile'
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

  // --- เพิ่ม State สำหรับซ่อน/แสดงแถบเครื่องมือบนมือถือตอนเลื่อนจอ ---
  const [showMobileBars, setShowMobileBars] = useState(true);
  const lastScrollY = React.useRef(0);

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

    const handleMove = (e) => {
      if (dragStartX.current === null) return;
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
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

    const handleEnd = (e) => {
      if (dragStartX.current === null) return;

      const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
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

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingSidebar, isSidebarExpanded, sidebarBaseWidth, baseProgress, isMobile]);

  // ฟังก์ชันเริ่มจับการลาก (ตรวจสอบพื้นที่ป้องกันการลากมั่ว) - เฉพาะ PC
  const startSidebarDrag = (e) => {
    if (isMobile) return;
    if (e.target.closest('.no-drag-zone')) return;
    hasDragged.current = false;
    dragStartX.current = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  };

  // --- เพิ่มระบบจำตำแหน่ง Scroll ของแต่ละหน้า ---
  const mainRef = React.useRef(null);
  const scrollPositions = React.useRef({});

  // --- Global Scroll Listener for Mobile Auto-Hide Bars ---
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleGlobalScroll = (e) => {
      if (!isMobile) return; // ทำงานเฉพาะโหมดมือถือเท่านั้น
      const currentScrollY = e.target.scrollTop;

      // ถ้าเลื่อนกลับไปบนสุด ให้แสดงแถบเครื่องมือเสมอ
      if (currentScrollY <= 20) {
        setShowMobileBars(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // ใช้ Threshold เพื่อป้องกันการทำงานจุกจิกเกินไปเวลาขยับนิ้วเล็กน้อย
      if (Math.abs(currentScrollY - lastScrollY.current) < 15) return;

      if (currentScrollY > lastScrollY.current) {
        setShowMobileBars(false); // เลื่อนลง -> ซ่อนแถบ
      } else {
        setShowMobileBars(true); // เลื่อนขึ้น -> แสดงแถบ
      }
      lastScrollY.current = currentScrollY;
    };

    mainElement.addEventListener('scroll', handleGlobalScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleGlobalScroll);
  }, [isMobile, isLoggedIn, isGlobalLoading]);

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
      const targetScroll = scrollPositions.current[currentTab] || 0;
      mainRef.current.scrollTop = targetScroll;
      lastScrollY.current = targetScroll;
      setShowMobileBars(true);
    }
  }, [currentTab]);

  const [patientsData, setPatientsData] = useState(GOOGLE_SCRIPT_URL ? [] : mockPatients);
  const [branchesData, setBranchesData] = useState(GOOGLE_SCRIPT_URL ? [] : mockBranches);
  const [queueData, setQueueData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryLogsData, setInventoryLogsData] = useState([]);
  const [posHistoryData, setPosHistoryData] = useState([]);

  // --- Auto Print OPD from URL (LINE Webhook) ---
  useEffect(() => {
    if (patientsData.length > 0 && !window.__autoPrintDone) {
      // รองรับทั้งพารามิเตอร์แบบแยกและแบบรวม (เช่น ?print_opd=HN0268_2024-06-22T08:00)
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
      
      if (printOpdHn) {
        window.__autoPrintDone = true; // prevent loop
        const patient = patientsData.find(p => p.hn === printOpdHn || p.id === printOpdHn);
        
        if (patient) {
          // Verify ID Card (Security feature to prevent HN guessing)
          let actualIdc = patient.idCard ? String(patient.idCard).replace(/\D/g, '') : "0000";
          if (actualIdc.length < 4) actualIdc = "0000";
          const actualId4 = actualIdc.slice(-4);
          
          if (!printOpdId4 || printOpdId4 !== actualId4) {
             document.open();
             document.write('<div style="font-family:sans-serif;text-align:center;margin-top:20%;color:#ef4444;"><h2>⚠️ ปฏิเสธการเข้าถึง (Access Denied)</h2><p>ลิงก์ไม่ถูกต้อง หรือรหัสยืนยันตัวตนไม่ตรงกับฐานข้อมูล</p></div>');
             document.close();
             return;
          }
          let targetRecord = null;
          let visitNumber = 1;
          
          if (patient.opdRecords && patient.opdRecords.length > 0) {
            if (printOpdDate) {
               const targetDate = new Date(printOpdDate).toLocaleDateString('th-TH');
               const idx = patient.opdRecords.findIndex(r => {
                  try {
                    const rDateStr = new Date(r.date || r.createdAt).toLocaleDateString('th-TH');
                    return rDateStr === targetDate;
                  } catch(e) { return false; }
               });
               
               if (idx !== -1) {
                 targetRecord = patient.opdRecords[idx];
                 visitNumber = patient.opdRecords.length - idx;
               }
            }
            if (!targetRecord) {
                 targetRecord = patient.opdRecords[0]; // fallback
                 visitNumber = patient.opdRecords.length;
            }
          }
          
          if (!targetRecord) {
             targetRecord = { date: printOpdDate || new Date().toISOString() };
             visitNumber = 1;
          }
          
          const html = globalGenerateOpdHtml(patient, targetRecord, visitNumber, branchesData, currentBranch);
          
          // เขียนทับหน้าเว็บปัจจุบันให้กลายเป็นหน้าเปล่า (เหมือน about:blank) แล้วสั่งปริ้น
          document.open();
          document.write(html);
          document.close();
          
          setTimeout(() => {
             window.print();
          }, 800);
        }
      }
    }
  }, [patientsData, branchesData, currentBranch]);
  const [financeData, setFinanceData] = useState([]);
  const [pdpaQrModal, setPdpaQrModal] = useState({ isOpen: false, link: '' });
  const [pdpaQrDataUrl, setPdpaQrDataUrl] = useState('');

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
    admin: ['dashboard', 'exec_dashboard', 'records', 'queue', 'pos', 'catalog', 'inventory', 'finance', 'staff', 'branch', 'reports', 'settings'],
    doctor: ['dashboard', 'records', 'queue'],
    nurse: ['records', 'queue'],
    sale: ['pos', 'catalog'],
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
  const [integrationTokens, setIntegrationTokens] = useState({ line: '', telegram: '', discord: '', lineGroupId: '' });
  const [gdriveTokens, setGdriveTokens] = useState({ generalDriveFolderId: '', pdpaDriveFolderId: '' });

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

  const showGlobalAlert = ({ type = 'info', title = '', text = '', onConfirm = null, hideCancel = false }) => {
    setGlobalAlertConfig({ type, title, text, onConfirm, hideCancel });
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

  // แจ้งเตือนแบบ Multi-toast Stack ปลอดภัยสูง แสดงบนสุด เรียงซ้อนกัน 4 อัน (แยก Component เพื่อความปลอดภัยไม่ให้ App re-render)
  const showToast = (message, type = 'success') => {
    triggerGlobalToast(message, type);
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
  const fetchPatientsPaginated = useCallback(async ({ offset = 0, limit = 20, search = '', sortKey = 'createdAt', sortDir = 'desc' } = {}) => {
    try {
      const resPatients = await callAppScript('GET_PATIENTS_PAGINATED', 'Patients', { offset, limit, search, sortKey, sortDir });
      if (resPatients?.status === 'success' && Array.isArray(resPatients.data)) {
        const rawPatients = resPatients.data;
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
  const fetchPatientTreatments = async (patientId) => {
    if (!patientId) return [];
    try {
      const res = await callAppScript('GET_TREATMENTS_BY_PATIENT', 'Treatments', { patientId });
      if (res?.status === 'success' && Array.isArray(res.data)) {
        const formattedTreatments = res.data.map(t => {
          const vs = typeof t.vital_signs === 'object' && t.vital_signs ? t.vital_signs : (typeof t.vital_signs === 'string' ? (JSON.parse(t.vital_signs || '{}')) : (t.vitalSigns || {}));
          const txArr = Array.isArray(t.prescription) ? t.prescription : (Array.isArray(t.tx) ? t.tx : (typeof t.prescription === 'string' ? (JSON.parse(t.prescription || '[]')) : []));
          return {
            ...t,
            id: t.id,
            datetime: t.datetime || `${t.date || ''} ${t.time || ''}`.trim(),
            date: t.date,
            time: t.time,
            doctor: t.doctor,
            chiefComplaint: t.chief_complaint || t.chiefComplaint || t.cc || '',
            cc: t.chief_complaint || t.chiefComplaint || t.cc || '',
            diagnosis: t.diagnosis || t.dx || '',
            dx: t.diagnosis || t.dx || '',
            treatmentDetail: t.treatment_detail || t.treatmentDetail || t.note || '',
            note: t.treatment_detail || t.treatmentDetail || t.note || '',
            prescription: txArr,
            tx: txArr,
            vitalSigns: vs,
            bp: t.bp || vs.bp || '',
            pulse: t.pulse || vs.pulse || '',
            temp: t.temp || vs.temp || '',
            weight: t.weight || vs.weight || '',
            height: t.height || vs.height || '',
            attachments: Array.isArray(t.attachments) ? t.attachments : [],
            cost: Number(t.cost || 0),
            branchId: t.branch_id || t.branchId,
            medCertNumber: t.med_cert_number || t.medCertNumber || t.med_cert_no || ''
          };
        });
        
        setPatientsData(prev => prev.map(p => {
          if (String(p.id || p.hn).trim().toLowerCase() === String(patientId).trim().toLowerCase()) {
            return { ...p, opdRecords: formattedTreatments };
          }
          return p;
        }));

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
  const syncLocalStateOnSave = (sheetName, payload) => {
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
          is_deleted: !!(payload.is_deleted || payload.isDeleted)
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
        setPatientsData(prev => {
          return prev.map(p => {
            if (String(p.id || p.hn).trim().toLowerCase() === patientId.toLowerCase()) {
              const existingOpd = p.opdRecords || [];
              const targetTrtId = String(payload.id || '').trim();
              const targetDatetime = payload.datetime || `${payload.date || ''} ${payload.time || ''}`.trim();
              
              const idx = existingOpd.findIndex(t => 
                (targetTrtId && String(t.id || '').trim() === targetTrtId) ||
                (targetDatetime && t.datetime === targetDatetime && t.doctor === payload.doctor)
              );
              const formattedTrt = formatTreatmentRecord(payload);
              let updatedOpd;
              if (idx >= 0) {
                updatedOpd = [...existingOpd];
                updatedOpd[idx] = { ...updatedOpd[idx], ...formattedTrt };
              } else {
                updatedOpd = [formattedTrt, ...existingOpd];
              }
              updatedOpd.sort((a, b) => new Date(b.datetime || b.date || 0) - new Date(a.datetime || a.date || 0));
              return { ...p, opdRecords: updatedOpd };
            }
            return p;
          });
        });
      }
    }
  };

  const syncLocalStateOnDelete = (sheetName, payload) => {
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
      Settings: 'settings'
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
  };

  // --- ปรับปรุงฟังก์ชันป้องกัน Error HTML แบบ 100% และรองรับ Supabase ---
  const callAppScript = async (action, sheetName, data = null) => {
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

      // --- อัปเดต React State สดๆ ทันทีเมื่อ SAVE_DATA หรือ DELETE_DATA สำเร็จ ---
      if (result && result.status === 'success') {
        if (action === 'SAVE_DATA' && data) {
          syncLocalStateOnSave(sheetName, data);
        } else if (action === 'DELETE_DATA' && data) {
          syncLocalStateOnDelete(sheetName, data);
        }
      }

      return result;
    } catch (error) { 
        throw error; 
    }
  };

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
        setIntegrationTokens(intTokens.values);
      }
      const gdTokens = resSettings.data.find(s => s.id === 'gdrive_tokens');
      if (gdTokens && gdTokens.values) {
        setGdriveTokens(gdTokens.values);
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
            settings: 'Settings'
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

  // --- BroadcastChannel Listener (ซิงค์ข้อมูลระหว่างหลายแท็บในเครื่องเดียวกัน) ---
  useEffect(() => {
    const unsubscribe = subscribeStoreUpdates((eventData) => {
      if (eventData && (eventData.type === 'STORE_UPDATED' || eventData.action === 'NETWORK_RECONNECTED')) {
        const storeName = eventData.storeName;
        if (storeName === 'patients' || storeName === '*') {
          getLocalStore('patients').then(data => data && data.length && setPatientsData(data));
        }
        if (storeName === 'queue' || storeName === '*') {
          getLocalStore('queue').then(data => data && data.length && setQueueData(data));
        }
        if (storeName === 'inventory' || storeName === '*') {
          getLocalStore('inventory').then(data => data && data.length && setInventoryData(data));
        }
        if (storeName === 'staff' || storeName === '*') {
          getLocalStore('staff').then(data => data && data.length && setStaffData(data));
        }
        if (storeName === 'pos_transactions' || storeName === '*') {
          getLocalStore('pos_transactions').then(data => data && data.length && setPosHistoryData([...data].reverse()));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'exec_dashboard', label: 'แดชบอร์ดผู้บริหาร', icon: TrendingUp },
    { id: 'records', label: 'เวชระเบียน', icon: Users },
    { id: 'queue', label: 'นัดหมาย', icon: CalendarRange },
    { id: 'pos', label: 'POS', icon: Calculator },
    { id: 'catalog', label: 'สินค้า/บริการ', icon: Tag },
    { id: 'inventory', label: 'คลังสินค้า', icon: Package },
    { id: 'finance', label: 'การเงิน', icon: Banknote },
    { id: 'staff', label: 'พนักงาน', icon: UserCog },
    { id: 'branch', label: 'สาขา', icon: Building2 },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

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
    return rolePermissions[currentUser.role] || ['dashboard', 'exec_dashboard', 'records', 'queue', 'pos', 'catalog', 'inventory', 'finance', 'staff', 'branch', 'reports', 'settings'];
  }, [rolePermissions, currentUser.role]);

  const filteredNavItems = useMemo(() => {
    // แอดมินต้องเข้าหน้าตั้งค่าได้เสมอ เพื่อป้องกันการล็อกตัวเองออก
    const tabs = currentUser.role === 'admin' && !allowedTabs.includes('settings') 
      ? [...allowedTabs, 'settings'] 
      : allowedTabs;
    return navItems.filter(item => tabs.includes(item.id));
  }, [navItems, allowedTabs, currentUser.role]);

  // เมื่อสิทธิ์เปลี่ยนแล้วแท็บปัจจุบันที่เปิดอยู่ไม่มีสิทธิ์เข้าถึง ให้เด้งไปหน้าแรกที่สามารถเข้าได้
  useEffect(() => {
    const tabIds = [...filteredNavItems.map(item => item.id), 'profile'];
    if (tabIds.length > 0 && !tabIds.includes(currentTab)) {
      setCurrentTab(tabIds[0]);
    }
  }, [filteredNavItems, currentTab]);

  // คำนวณตัวแปรสำหรับ Navbar มือถือล่วงหน้า
  const mobileNavItems = filteredNavItems.filter(item => ['dashboard', 'records', 'queue', 'pos', 'reports'].includes(item.id));
  const activeNavIndex = mobileNavItems.findIndex(item => item.id === currentTab);

  if (pdpaToken && pdpaHn) {
      return <PdpaConsentForm token={pdpaToken} hn={pdpaHn} gdriveTokens={gdriveTokens} isAuthDataFetched={isAuthDataFetched} />;
  }

  if (resetToken) {
      return <ResetPasswordScreen token={resetToken} callAppScript={callAppScript} showToast={showToast} />;
  }

  if (!isLoggedIn || isGlobalLoading) {
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
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake {
              animation: shake 0.6s ease-in-out;
            }
          `}} />
          <LoginScreen onLogin={handleLogin} callAppScript={callAppScript} isGlobalLoading={isGlobalLoading} />
        </>
      );
  }

  return (
    <div className="w-full h-screen bg-slate-50 flex relative overflow-hidden text-slate-800">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-200/40 blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/30 blur-[100px] pointer-events-none z-0"></div>

      {/* แก้ไขกลับมาเป็น h-screen เพราะ 100dvh อาจทำให้หน้าจอยุบตัวบนบาง Browser */}
      <div className="flex h-screen overflow-hidden w-full flex-col md:flex-row relative">
        
        {/* Backdrop สำหรับ Mobile เมื่อกางเมนู (ใช้ CSS Transition ธรรมดา ไม่กิน CPU) */}
        <div 
          className={`md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsSidebarExpanded(false)}
        />

        {/* Mobile Slide Menu (สร้างแยกมาต่างหาก ทำงานด้วย CSS Transform ล้วนๆ ลื่นไหล 100%) */}
        <aside 
          className={`md:hidden fixed inset-y-0 left-0 z-[110] w-[260px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarExpanded ? 'translate-x-0' : '-translate-x-full'}`}
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

        {/* Desktop Sidebar (ใช้ระบบลากแบบเดิมของ PC) */}
        <aside 
          ref={sidebarRef}
          onMouseDown={startSidebarDrag}
          onTouchStart={startSidebarDrag}
          style={{ 
            '--sidebar-width': `${sidebarBaseWidth}px`,
            '--drag-progress': baseProgress,
            width: 'var(--sidebar-width)'
          }}
          className={`hidden md:flex flex-col h-full relative select-none shrink-0 ${(!isSidebarExpanded && isProfileDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'} ${!isDraggingSidebar ? 'transition-[width] duration-300 ease-in-out' : ''} ${theme.glassPanel} border-r border-slate-200/50 z-[52]`}
        >
          <div className="flex items-center min-h-[89px] border-b border-slate-100/50 overflow-hidden shrink-0">
            <div className="w-[80px] shrink-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/30">
                <Stethoscope size={24} />
              </div>
            </div>
            <div 
              style={{ opacity: 'var(--drag-progress)', transform: `translateX(calc((1 - var(--drag-progress)) * -20px))` }}
              className={`whitespace-nowrap min-w-[150px] ${!isDraggingSidebar ? 'transition-all duration-300' : ''} ${!isSidebarExpanded && !isDraggingSidebar ? 'pointer-events-none' : ''}`}
            >
              <h2 className="font-bold text-slate-800 leading-tight kanit-text">Clinic<span className="text-sky-500">Hub</span></h2>
              <p className="text-xs text-slate-400 kanit-text">Management System</p>
            </div>
          </div>

          <div className={`flex flex-col h-full ${(!isSidebarExpanded && isProfileDropdownOpen) ? 'overflow-visible' : 'overflow-hidden'}`}>
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

            <nav className="flex-1 px-3.5 py-2 flex flex-col overflow-y-auto overflow-x-hidden relative gap-1 custom-scrollbar">
              {filteredNavItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id)} 
                  title={!isSidebarExpanded && !isDraggingSidebar ? item.label : undefined}
                  className={`w-full flex items-center h-11 rounded-2xl transition-colors duration-200 kanit-text overflow-hidden shrink-0 ${currentTab === item.id ? 'bg-sky-500 shadow-md shadow-sky-500/20 text-white font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <div className="w-[52px] shrink-0 h-11 flex items-center justify-center">
                    <item.icon size={20} className={currentTab === item.id ? 'opacity-100' : 'opacity-70'} />
                  </div>
                  <span 
                    style={{ 
                      opacity: 'var(--drag-progress)', 
                      transform: `translateX(calc((1 - var(--drag-progress)) * -10px))`
                    }}
                    className={`whitespace-nowrap overflow-hidden flex items-center text-left ${!isDraggingSidebar ? 'transition-all duration-300' : ''}`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div id="profile-container-pc" className="p-4 border-t border-slate-100/50 overflow-visible min-h-[80px] flex items-center justify-center relative shrink-0">
              {/* Dropdown Menu */}
              {/* Dropdown Menu (Expanded) */}
              {isProfileDropdownOpen && isSidebarExpanded && (
                <div className="absolute bottom-20 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 p-2 z-[999] animate-scale-up text-left space-y-1">
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
                      setCurrentTab('profile');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                  >
                    <User size={14} className="opacity-80 text-slate-500" />
                    <span>โปรไฟล์</span>
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
                    <LogOut size={14} className="opacity-80" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}

              {/* Dropdown Menu (Collapsed) */}
              {isProfileDropdownOpen && !isSidebarExpanded && (
                <div className="absolute bottom-20 left-4 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 p-2 z-[999] animate-scale-up text-left space-y-1">
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
                      setCurrentTab('profile');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                  >
                    <User size={14} className="opacity-80 text-slate-500" />
                    <span>โปรไฟล์</span>
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
                    <LogOut size={14} className="opacity-80" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}

              {/* Single Unified Profile Bar */}
              <div 
                onClick={() => {
                  setIsProfileDropdownOpen(prev => !prev);
                }}
                className="w-full flex items-center cursor-pointer hover:bg-slate-50/80 py-2 rounded-2xl transition-colors no-drag-zone select-none"
              >
                <div className="w-[52px] shrink-0 flex items-center justify-center">
                  {currentUser.photo ? (
                    <img src={currentUser.photo} className="w-9 h-9 rounded-full object-cover border border-slate-200 ring-2 ring-white shadow-sm" alt={currentUser.name} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ring-2 ring-white shadow-sm">
                      <User size={18} />
                    </div>
                  )}
                </div>
                <div 
                  style={{ 
                    opacity: 'var(--drag-progress)', 
                    transform: `translateX(calc((1 - var(--drag-progress)) * -10px))`
                  }}
                  className={`text-left flex-1 min-w-0 pr-2 ${!isDraggingSidebar ? 'transition-all duration-300' : ''}`}
                >
                  <div className="font-semibold text-slate-700 text-xs kanit-text truncate">{currentUser.name}</div>
                  <p className="text-[11px] font-medium text-emerald-600 kanit-text mt-0.5 truncate">{currentUser.position || roleLabels[currentUser.role] || currentUser.category || 'ออนไลน์'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        {/* --- Mobile Top Header --- */}
        <header className={`md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 z-[45] shadow-sm transition-transform duration-300 ease-in-out ${showMobileBars ? 'translate-y-0' : '-translate-y-full'}`}>
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
              <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 p-2 z-[999] animate-scale-up text-left space-y-1 w-48">
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
                    setCurrentTab('profile');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-xl font-bold kanit-text transition-colors flex items-center gap-2"
                >
                  <User size={14} className="opacity-80 text-slate-500" />
                  <span>โปรไฟล์</span>
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
        <main id="main-scroll-container" ref={mainRef} className="flex-1 flex flex-col overflow-y-auto pb-24 md:pb-0 w-full relative custom-scrollbar" style={{ overflowAnchor: 'none', '--mobile-header-offset': (isMobile && showMobileBars) ? '61px' : '0px' }}>
          
          {/* --- [FIX] ย้าย Spacer มาไว้ด้านในกล่อง Scroll แบบตายตัว ไม่ให้ Layout สั่นกระตุก --- */}
          <div className="md:hidden shrink-0 w-full h-[61px] pointer-events-none"></div>

          <div className="flex-1 flex flex-col w-full min-h-full">
            {currentTab === 'dashboard' && (
                <div className="w-full">
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
                <div className="w-full">
                    <ExecutiveDashboard 
                        queueData={queueData}
                        patientsData={patientsData}
                        posHistoryData={posHistoryData}
                        financeData={financeData}
                        staffData={staffData}
                        branchesData={branchesData}
                        currentBranch={currentBranch}
                        isGlobalLoading={isGlobalLoading}
                        showToast={showToast}
                        callAppScript={callAppScript}
                    />
                </div>
            )}

            {currentTab === 'records' && (
                <div className="w-full">
                    <MedicalRecords patientsData={patientsData} setPatientsData={setPatientsData} currentBranch={currentBranch} branchesData={branchesData} staffData={staffData} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} posProducts={posProducts} showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} setPdpaQrModal={setPdpaQrModal} currentUser={currentUser} fetchPatientTreatments={fetchPatientTreatments} fetchPatientsPaginated={fetchPatientsPaginated} fetchPatientStats={fetchPatientStats} />
                </div>
            )}

            {currentTab === 'queue' && (
                <div className="w-full">
                    <AppointmentManager currentBranch={currentBranch} branchesData={branchesData} queueData={queueData} setQueueData={setQueueData} patientsData={patientsData} setPatientsData={setPatientsData} staffData={staffData} posProducts={posProducts} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} fetchQueueForMonth={fetchQueueForMonth} isQueueFetching={isQueueFetching} showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} roleLabels={roleLabels} dealStatuses={dealStatuses} staffCategories={staffCategories} currentUser={currentUser} fetchAppointmentStats={fetchAppointmentStats} />
                </div>
            )}

            {currentTab === 'catalog' && (
                <div className="w-full">
                    <CatalogManager products={posProducts} setProducts={setPosProducts} posHistoryData={posHistoryData} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} showGlobalAlert={showGlobalAlert} globalAlert={globalAlert} />
                </div>
            )}

            {currentTab === 'pos' && (
                <div className="flex-1 w-full relative min-h-0 flex flex-col">
                    <POSSystem products={posProducts}
                        setProducts={setPosProducts}
                        patientsData={patientsData}
                        setPatientsData={setPatientsData}
                        posHistoryData={posHistoryData}
                        setPosHistoryData={setPosHistoryData}
                        inventoryData={inventoryData}
                        setInventoryData={setInventoryData}
                        setInventoryLogsData={setInventoryLogsData}
                        staffData={staffData}
                        currentBranch={currentBranch}
                        branchesData={branchesData}
                        showToast={showToast}
                        callAppScript={callAppScript}
                        isGlobalLoading={isGlobalLoading}
                        showMobileBars={showMobileBars}
                        handlePrintReceipt={handlePrintReceipt}
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

          {/* ปรับแก้ Navbar มือถือ: Liquid Tab Bar Animation (Sliding Bubble) เพิ่มขอบมนด้านบน */}
          <div className={`md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border border-b-0 border-slate-200/80 rounded-t-[1.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[calc(max(0.5rem,env(safe-area-inset-bottom)))] pt-2 px-2 z-[45] transition-transform duration-300 ease-in-out ${showMobileBars ? 'translate-y-0' : 'translate-y-[120%]'}`}>
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
        .sticky-header-bg { transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease; border-bottom: 1px solid transparent; background-color: transparent; will-change: background-color, backdrop-filter; }
        .is-scrolled .sticky-header-bg { background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-color: transparent; box-shadow: none; }

        .header-spacer { transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1); height: 0.75rem; }
        @media (min-width: 640px) { .header-spacer { height: 1rem; } }
        .is-scrolled .header-spacer { height: 0px !important; }

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

        .sticky-filter-inner { transition: width 0.3s ease, padding 0.3s ease, border-radius 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease; width: calc(100% - 2rem); border-radius: 2rem; border-width: 1px; will-change: width, padding, border-radius; background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
        @media (min-width: 768px) { .sticky-filter-inner { width: calc(100% - 4rem); } }
        @media (min-width: 1536px) { .sticky-filter-inner { width: calc(100% - 6rem); } }
        .is-scrolled .sticky-filter-inner { width: 100%; border-radius: 0 0 1.5rem 1.5rem; border-top-color: transparent; border-left-color: transparent; border-right-color: transparent; border-bottom-color: rgba(226, 232, 240, 0.8); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }
        .is-scrolled .sticky-filter-inner { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
        @media (min-width: 768px) { 
          .is-scrolled .sticky-filter-inner { padding-top: 1rem !important; padding-bottom: 1rem !important; padding-left: 2rem; padding-right: 2rem; } 
        }
        @media (min-width: 1536px) { .is-scrolled .sticky-filter-inner { padding-left: 3rem; padding-right: 3rem; } }

        /* --- [NEW] CSS คำนวณระยะกาง Filter ของหน้านัดหมายอัตโนมัติ --- */
        .sticky-filter-appt { top: calc(var(--mobile-header-offset, 0px) + 52px); }
        @media (min-width: 640px) { .sticky-filter-appt { top: calc(var(--mobile-header-offset, 0px) + 60px); } }

        /* สไตล์เพิ่มเติมเมื่อกาง Filter ออก (เพิ่มระยะห่างจากขอบบนเพื่อความสวยงามและไม่โดนบัง) */
        .sticky-filter-appt.filter-expanded { top: calc(var(--mobile-header-offset, 0px) + 52px); z-index: 40; }
        @media (min-width: 640px) { .sticky-filter-appt.filter-expanded { top: calc(var(--mobile-header-offset, 0px) + 60px); } }
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

      {GlobalAlertUI()}
    </div>
  );
}
