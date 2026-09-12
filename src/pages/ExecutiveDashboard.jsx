import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { supabase } from '../lib/supabase';

const ExecutiveDashboard = ({ 
  queueData = [], 
  patientsData = [], 
  posHistoryData = [], 
  financeData = [], 
  staffData = [], 
  branchesData = [], 
  currentBranch = 'all', 
  posProducts = [],
  isGlobalLoading = false,
  showToast = () => {},
  callAppScript
}) => {
  const [timeRange, setTimeRange] = useState('month'); // today | week | month | year | all
  const [selectedBranch, setSelectedBranch] = useState(currentBranch);
  const [isScrolled, setIsScrolled] = useState(false);
  const [execSummary, setExecSummary] = useState(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [staffRankingTab, setStaffRankingTab] = useState('all'); // 'all' | 'df' | 'sales'
  const [chartMobileMode, setChartMobileMode] = useState('fit'); // 'fit' | 'scroll'
  const [activeTrendIdx, setActiveTrendIdx] = useState(null);

  const buildDateRange = useCallback(() => {
    const now = new Date();
    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let startDate = '1970-01-01';
    let endDate = '2099-12-31';

    if (timeRange === 'today') {
      startDate = formatDate(now);
      endDate = formatDate(now);
    } else if (timeRange === 'week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      startDate = formatDate(start);
      endDate = formatDate(now);
    } else if (timeRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = formatDate(start);
      endDate = formatDate(end);
    } else if (timeRange === 'year') {
      startDate = `${now.getFullYear()}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
    } else if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    }
    return { startDate, endDate };
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      try {
        const { startDate, endDate } = buildDateRange();
        const branchFilter = selectedBranch || 'all';

        // 1. เรียก get_executive_dashboard_data จาก Supabase โดยตรง (คำนวณทุกการ์ดบนเซิร์ฟเวอร์ Supabase)
        let dataFetched = false;
        try {
          const { data: dbData, error: dbErr } = await supabase.rpc('get_executive_dashboard_data', {
            start_date: startDate,
            end_date: endDate,
            branch_filter: branchFilter
          });

          if (!dbErr && dbData && dbData.summary) {
            const s = dbData.summary;
            setExecSummary({
              totalIncome: Number(s.total_income) || 0,
              posTotalIncome: Number(s.pos_total_income) || 0,
              manualRevenueIncome: Number(s.manual_revenue_income) || 0,
              totalExpense: Number(s.total_expense) || 0,
              netProfit: Number(s.net_profit) || 0,
              profitMargin: Number(s.profit_margin) || 0,
              posCount: Number(s.pos_count) || 0,
              averageTicket: Number(s.average_ticket) || 0,
              paymentMethods: {
                cash: Number(s.payment_methods?.cash) || 0,
                transfer: Number(s.payment_methods?.transfer) || 0,
                card: Number(s.payment_methods?.card) || 0,
                qr: Number(s.payment_methods?.qr) || 0,
                other: Number(s.payment_methods?.other) || 0
              },
              topProducts: dbData.top_products || [],
              staffStats: dbData.staff_stats || [],
              topDoctors: dbData.top_doctors || [],
              branchSummary: dbData.branch_summary || [],
              dailyTrend: dbData.daily_trend || [],
              queueStats: dbData.queue_stats || {}
            });
            dataFetched = true;
          }
        } catch (rpcErr) {
          console.warn('RPC get_executive_dashboard_data error, trying fallback:', rpcErr);
        }

        // 2. Fallback: ถ้ายังไม่ได้รัน SQL หรือออฟไลน์ ให้เรียก GET_EXECUTIVE_SUMMARY
        if (!dataFetched && callAppScript) {
          const res = await callAppScript('GET_EXECUTIVE_SUMMARY', 'System', {
            startDate: startDate.split('T')[0],
            endDate: endDate.split('T')[0],
            branchId: branchFilter
          });
          if (res?.status === 'success' && res.summary) {
            setExecSummary(res.summary);
          }
        }
      } catch (e) {
        console.error("Executive Dashboard fetch error", e);
      } finally {
        setIsDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange, customStartDate, customEndDate, selectedBranch, callAppScript, buildDateRange]);

  // --- States และฟังก์ชันสไตล์ปฏิทินของธีมหลักสำหรับปฏิทินเลือกช่วงเวลา ---
  const [showExecRangeCalendar, setShowExecRangeCalendar] = useState(false);
  const [execRangeCalDate, setExecRangeCalDate] = useState(new Date());
  const [execRangeCalView, setExecRangeCalView] = useState('days');
  const [execRangeYearPageStart, setExecRangeYearPageStart] = useState(0);
  const [execTempStartDate, setExecTempStartDate] = useState(null);
  const [execTempEndDate, setExecTempEndDate] = useState(null);
  const [isExecRangeClosing, setIsExecRangeClosing] = useState(false);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  useEffect(() => {
      if (execRangeCalView === 'years') setExecRangeYearPageStart(Math.floor((execRangeCalDate.getFullYear() + 543) / 12) * 12);
  }, [execRangeCalView, execRangeCalDate]);

  const closeExecRangeCalendar = () => {
      setIsExecRangeClosing(true);
      setTimeout(() => { setShowExecRangeCalendar(false); setIsExecRangeClosing(false); }, 300);
  };
  const execRangeSwipeProps = useSwipeDown(closeExecRangeCalendar);

  const handleOpenExecRange = () => {
      setExecTempStartDate(customStartDate ? new Date(customStartDate) : null);
      setExecTempEndDate(customEndDate ? new Date(customEndDate) : null);
      if (customStartDate) {
          setExecRangeCalDate(new Date(customStartDate));
      } else {
          setExecRangeCalDate(new Date());
      }
      setExecRangeCalView('days');
      setShowExecRangeCalendar(true);
  };

  const handleSelectExecRangeDate = (day) => {
      const selectedDate = new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth(), day);
      selectedDate.setHours(0,0,0,0);

      if (!execTempStartDate || (execTempStartDate && execTempEndDate)) {
          setExecTempStartDate(selectedDate);
          setExecTempEndDate(null);
      } else {
          if (selectedDate >= execTempStartDate) {
              setExecTempEndDate(selectedDate);
          } else {
              setExecTempStartDate(selectedDate);
              setExecTempEndDate(null);
          }
      }
  };

  const confirmExecRange = () => {
      if (execTempStartDate && execTempEndDate) {
          const startYear = execTempStartDate.getFullYear();
          const startMonth = String(execTempStartDate.getMonth() + 1).padStart(2, '0');
          const startDay = String(execTempStartDate.getDate()).padStart(2, '0');
          setCustomStartDate(`${startYear}-${startMonth}-${startDay}`);

          const endYear = execTempEndDate.getFullYear();
          const endMonth = String(execTempEndDate.getMonth() + 1).padStart(2, '0');
          const endDay = String(execTempEndDate.getDate()).padStart(2, '0');
          setCustomEndDate(`${endYear}-${endMonth}-${endDay}`);

          closeExecRangeCalendar();
      } else {
          showToast('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด', 'warning');
      }
  };

  const formatExecRangeStr = (dateObj) => {
      if (!dateObj) return '';
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear() + 543;
      return `${d}/${m}/${y}`;
  };

  const formatExecDisplayRange = (startStr, endStr) => {
      if (!startStr || !endStr) return 'เลือกช่วงเวลา';
      const startParts = startStr.split('-');
      const endParts = endStr.split('-');
      if (startParts.length === 3 && endParts.length === 3) {
          const sy = parseInt(startParts[0]) + 543;
          const ey = parseInt(endParts[0]) + 543;
          return `${startParts[2]}/${startParts[1]}/${sy} - ${endParts[2]}/${endParts[1]}/${ey}`;
      }
      return 'เลือกช่วงเวลา';
  };

  const blankExecRangeDays = Array.from({ length: new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthExecRangeDays = Array.from({ length: new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

  useEffect(() => {
    setSelectedBranch(currentBranch);
  }, [currentBranch]);

  useEffect(() => {
    const mainElement = document.querySelector('main') || window;
    const handleScroll = rAFThrottle((e) => {
      const target = e.target || e.currentTarget;
      const scrollTop = target.scrollTop || 0;
      if (scrollTop > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    });
    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll status
    const mainNode = document.querySelector('main');
    if (mainNode && mainNode.scrollTop > 20) {
      setIsScrolled(true);
    }
    
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Help parse dates from the database (CE or BE)
  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    if (dStr instanceof Date) return dStr;
    return parseAnyDate(dStr);
  };

  // Server-side Date-Based Fetching State
  const [localPosHistory, setLocalPosHistory] = useState([]);
  const [localFinanceData, setLocalFinanceData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      try {
        let startDate, endDate;
        const now = new Date();
        
        if (timeRange === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (timeRange === 'week') {
          startDate = new Date();
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = now;
        } else if (timeRange === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (timeRange === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (timeRange === 'custom' && customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }

        if (startDate && endDate) {
          const startIso = startDate.toISOString();
          const endIso = endDate.toISOString();

          // Fetch only the data in the selected date range
          const [posRes, revRes, expRes] = await Promise.all([
             supabase.from('pos_transactions').select('*').gte('created_at', startIso).lte('created_at', endIso),
             supabase.from('finance_revenue').select('*').gte('created_at', startIso).lte('created_at', endIso),
             supabase.from('finance_expenses').select('*').gte('created_at', startIso).lte('created_at', endIso)
          ]);

          if (posRes.data) setLocalPosHistory(posRes.data);
          
          const finances = [];
          if (revRes.data) finances.push(...revRes.data.map(d => ({...d, type: 'income'})));
          if (expRes.data) finances.push(...expRes.data.map(d => ({...d, type: 'expense'})));
          setLocalFinanceData(finances);
        }
      } catch (e) {
        console.error("Dashboard fetch error", e);
      }
      setIsDashboardLoading(false);
    };

    fetchDashboardData();
  }, [timeRange, customStartDate, customEndDate]);

  // Consolidate POS history as income and finance as income/expenses
  const allTransactions = useMemo(() => {
    // 1. รวม POS transactions จากทั้ง localPosHistory และ posHistoryData
    const posMap = new Map();
    (posHistoryData || []).forEach(tx => { if (tx && tx.id) posMap.set(String(tx.id), tx); });
    (localPosHistory || []).forEach(tx => { 
      if (tx && tx.id) {
        const existing = posMap.get(String(tx.id));
        posMap.set(String(tx.id), { ...tx, ...(existing || {}) });
      }
    });
    const activePos = posMap.size > 0 ? Array.from(posMap.values()) : (localPosHistory || posHistoryData || []);

    const posTx = activePos.map(tx => {
      const txDate = tx.datetime || tx.timestamp || tx.createdAt || tx.date || tx.created_at || new Date().toISOString();
      return {
        id: tx.id || tx.receiptNo || tx.receipt_no || Math.random().toString(),
        date: txDate,
        type: 'income',
        amount: Number(tx.net_amount ?? tx.netAmount ?? tx.grand_total ?? tx.grandTotal ?? tx.amount ?? (Number(tx.total_amount || tx.totalAmount || tx.total || 0) - Number(tx.discount || tx.discount_amount || 0))),
        method: tx.payment_method || tx.paymentMethod || tx.method || 'cash',
        category: 'รายได้จาก POS',
        note: tx.patient_name || tx.patientName ? `ชำระโดย ${tx.patient_name || tx.patientName}` : 'ทั่วไป (ไม่ระบุคนไข้)',
        status: tx.status || 'completed',
        isAuto: true,
        branchId: tx.branch_id || tx.branchId || 'all'
      };
    });

    // 2. รวม Finance transactions
    const finMap = new Map();
    (financeData || []).forEach(tx => { if (tx && tx.id) finMap.set(String(tx.id), tx); });
    (localFinanceData || []).forEach(tx => { 
      if (tx && tx.id) {
        const existing = finMap.get(String(tx.id));
        finMap.set(String(tx.id), { ...tx, ...(existing || {}) });
      }
    });
    const activeFin = finMap.size > 0 ? Array.from(finMap.values()) : (localFinanceData || financeData || []);

    const finTx = activeFin
      .filter(tx => !tx.is_auto && !tx.isAuto) // ไม่ซ้ำกับ POS
      .map(tx => ({
        ...tx,
        date: tx.date || tx.timestamp_date || tx.created_at || new Date().toISOString(),
        amount: parseFloat(tx.amount || 0),
        method: tx.method || tx.payment_method || 'cash',
        type: tx.type || (tx.category === 'expense' ? 'expense' : 'income'),
        branchId: tx.branchId || tx.branch_id || 'all'
      }));

    return [...posTx, ...finTx];
  }, [localPosHistory, posHistoryData, localFinanceData, financeData]);

  // Filter transactions by branch and time range
  const filteredTx = useMemo(() => {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (timeRange === 'custom') {
      if (customStartDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    return allTransactions.filter(tx => {
      // 1. Branch filter
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch && tx.branch_id !== selectedBranch) return false;
      
      // 2. Cancelled transaction filter
      if (tx.status === 'cancelled' || tx.is_deleted) return false;

      // 3. Time range filter
      const txDate = parseDate(tx.date || tx.datetime || tx.timestamp || tx.createdAt || tx.created_at);
      if (!txDate) return false;

      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;

      return true;
    });
  }, [allTransactions, selectedBranch, timeRange, customStartDate, customEndDate]);

  // Calculate Financial Summary (จาก filteredTx ที่ซิงค์บิล POS และการเงินแบบ Realtime)
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let cash = 0;
    let transfer = 0;
    let card = 0;
    let qr = 0;
    let posCount = 0;

    (filteredTx || []).forEach(tx => {
      const amt = Number(tx.amount || 0);
      const m = String(tx.method || tx.payment_method || tx.paymentMethod || '').toLowerCase();

      if (tx.type === 'income') {
        income += amt;
        if (tx.isAuto || tx.is_auto) posCount++;

        if (m.includes('cash') || m.includes('เงินสด')) {
          cash += amt;
        } else if (m.includes('transfer') || m.includes('โอน') || m.includes('bank')) {
          transfer += amt;
        } else if (m.includes('card') || m.includes('credit') || m.includes('บัตร')) {
          card += amt;
        } else if (m.includes('qr') || m.includes('พร้อมเพย์') || m.includes('promptpay')) {
          qr += amt;
        } else {
          // Default to cash if unknown
          cash += amt;
        }
      } else if (tx.type === 'expense') {
        expense += amt;
      }
    });

    const netProfit = income - expense;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

    return {
      income,
      expense,
      netProfit,
      profitMargin,
      cash,
      transfer,
      card,
      qr,
      checkoutsCount: posCount
    };
  }, [filteredTx]);

  // Calculate Staff Performance Rank (sales & commissions) - คำนวณตามประวัติบิล POS และอัตราค่าคอมมิชชั่น/DF ของพนักงาน
  const staffStats = useMemo(() => {
    const stats = {};
    (staffData || []).forEach(s => {
      const shortName = (s.name || '').replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.|ดร\.|นาย|นางสาว|นาง)/, '').trim().split(' ')[0];
      const rate = Number(s.commissionRate || s.commission_rate || 0);
      const type = s.commissionType || s.commission_type || 'percent';
      const dfRate = Number(s.dfRate || s.df_rate || 0);
      const dfType = s.dfType || s.df_type || 'percent';
      const dfCondition = s.dfCondition || s.df_condition || 'all';
      const dfThreshold = Number(s.dfThreshold || s.df_threshold || 1);
      const commissionCondition = s.commissionCondition || s.commission_condition || 'all';
      const commissionThreshold = Number(s.commissionThreshold || s.commission_threshold || 1);

      stats[s.id] = { 
        id: s.id, 
        name: shortName, 
        fullName: s.name,
        photo: s.photo, 
        role: s.role, 
        position: s.position, 
        rate,
        type,
        dfRate,
        dfType,
        dfCondition,
        dfThreshold,
        commissionCondition,
        commissionThreshold,
        commission: 0, 
        dfCommission: 0,
        salesCommission: 0,
        dfCases: 0,
        salesCases: 0,
        checkouts: 0 
      };
    });

    const now = new Date();
    let startDate = null;
    let endDate = null;

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (timeRange === 'custom') {
      if (customStartDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const doctorsList = (staffData || []).filter(s => s.role === 'doctor' || s.position?.includes('แพทย์'));
    const dailyDocCounts = {};
    const dailySellerCounts = {};

    // รวมข้อมูล POS จากทั้ง Local Fetch และ Props
    const posMap = new Map();
    (posHistoryData || []).forEach(tx => { if (tx && tx.id) posMap.set(String(tx.id), tx); });
    (localPosHistory || []).forEach(tx => { 
      if (tx && tx.id) {
        const existing = posMap.get(String(tx.id));
        posMap.set(String(tx.id), { ...tx, ...(existing || {}) });
      }
    });
    const combinedPosList = posMap.size > 0 ? Array.from(posMap.values()) : (localPosHistory || posHistoryData || []);

    combinedPosList.forEach(tx => {
      if (!tx) return;
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch && tx.branch_id !== selectedBranch) return;
      if (tx.status === 'cancelled') return;
      
      const txDate = parseDate(tx.datetime || tx.timestamp || tx.createdAt || tx.date || tx.created_at);
      if (!txDate) return;

      if (startDate && txDate < startDate) return;
      if (endDate && txDate > endDate) return;

      const net = Number(tx.net_amount ?? tx.netAmount ?? tx.grand_total ?? tx.grandTotal ?? tx.amount ?? (Number(tx.total_amount || tx.totalAmount || tx.total || 0) - Number(tx.discount || tx.discount_amount || 0)));
      const dayKey = `${txDate.getFullYear()}-${txDate.getMonth()}-${txDate.getDate()}`;

      // จับคู่แพทย์ผู้ตรวจ/ทำหัตถการ (เฉพาะบิลที่มีการระบุแพทย์เท่านั้น ไม่ Auto-Match สุ่มแพทย์)
      let matchedDoctorId = tx.doctorId || tx.doctor_id;
      if (!matchedDoctorId && (tx.doctorName || tx.doctor_name || tx.doctor)) {
        const docName = String(tx.doctorName || tx.doctor_name || tx.doctor).trim();
        const found = (staffData || []).find(s => s.name === docName || s.name.trim().toLowerCase() === docName.toLowerCase());
        if (found) matchedDoctorId = found.id;
      }

      // จับคู่ผู้ขาย/ผู้แนะนำ (เฉพาะบิลที่มีการระบุผู้ขายเท่านั้น)
      let matchedSellerId = tx.sellerId || tx.seller_id || tx.staffId || tx.staff_id;
      if (!matchedSellerId && (tx.sellerName || tx.seller_name || tx.staffName || tx.staff_name)) {
        const sName = String(tx.sellerName || tx.seller_name || tx.staffName || tx.staff_name).trim();
        const found = (staffData || []).find(s => s.name === sName || s.name.trim().toLowerCase() === sName.toLowerCase());
        if (found) matchedSellerId = found.id;
      }

      // 1. คำนวณค่า DF หัตถการให้แพทย์ (พร้อมเช็คเงื่อนไข Threshold รายวัน)
      if (matchedDoctorId && stats[matchedDoctorId]) {
        const docStat = stats[matchedDoctorId];
        docStat.dfCases++;
        docStat.checkouts++;
        const docDayKey = `${matchedDoctorId}_${dayKey}`;
        dailyDocCounts[docDayKey] = (dailyDocCounts[docDayKey] || 0) + 1;
        const isEligibleDf = docStat.dfCondition !== 'threshold' || dailyDocCounts[docDayKey] >= (docStat.dfThreshold || 1);

        let docFee = 0;
        if (tx.doctorCommission || tx.doctor_commission) {
          docFee = parseFloat(tx.doctorCommission || tx.doctor_commission || 0);
        } else if (isEligibleDf) {
          if (docStat.dfRate > 0) {
            docFee = docStat.dfType === 'percent' ? (net * (docStat.dfRate / 100)) : docStat.dfRate;
          } else if (docStat.rate > 0) {
            docFee = docStat.type === 'percent' ? (net * (docStat.rate / 100)) : docStat.rate;
          }
        }
        docStat.dfCommission += docFee;
        docStat.commission += docFee;
      }

      // 2. คำนวณค่าคอมมิชชั่นยอดขายให้ผู้ขาย
      if (matchedSellerId && stats[matchedSellerId]) {
        const sellerStat = stats[matchedSellerId];
        sellerStat.salesCases++;
        if (matchedSellerId !== matchedDoctorId) {
          sellerStat.checkouts++;
        }
        const sellerDayKey = `${matchedSellerId}_${dayKey}`;
        dailySellerCounts[sellerDayKey] = (dailySellerCounts[sellerDayKey] || 0) + 1;
        const isEligibleSales = sellerStat.commissionCondition !== 'threshold' || dailySellerCounts[sellerDayKey] >= (sellerStat.commissionThreshold || 1);

        let sellerFee = 0;
        if (tx.staffCommission || tx.staff_commission || tx.sellerCommission || tx.seller_commission) {
          sellerFee = parseFloat(tx.staffCommission || tx.staff_commission || tx.sellerCommission || tx.seller_commission || 0);
        } else if (isEligibleSales && sellerStat.rate > 0) {
          sellerFee = sellerStat.type === 'percent' ? (net * (sellerStat.rate / 100)) : sellerStat.rate;
        }

        if (matchedSellerId !== matchedDoctorId) {
          sellerStat.salesCommission += sellerFee;
          sellerStat.commission += sellerFee;
        } else if (matchedSellerId === matchedDoctorId) {
          stats[matchedDoctorId].salesCommission += sellerFee;
          stats[matchedDoctorId].commission += sellerFee;
        }
      }
    });

    return Object.values(stats)
      .filter(s => s.checkouts > 0 || s.commission > 0);
  }, [staffData, posHistoryData, localPosHistory, selectedBranch, timeRange, customStartDate, customEndDate]);

  // กรองและเรียงลำดับตาม Tab ที่เลือก (ทั้งหมด / ค่า DF หัตถการ / ค่าคอมมิชชั่นยอดขาย)
  const displayedStaffStats = useMemo(() => {
    if (staffRankingTab === 'df') {
      return (staffStats || [])
        .filter(s => s.dfCases > 0 || s.dfCommission > 0 || s.role === 'doctor' || s.position?.includes('แพทย์'))
        .sort((a, b) => b.dfCommission - a.dfCommission || b.dfCases - a.dfCases);
    }
    if (staffRankingTab === 'sales') {
      return (staffStats || [])
        .filter(s => s.salesCases > 0 || s.salesCommission > 0)
        .sort((a, b) => b.salesCommission - a.salesCommission || b.salesCases - a.salesCases);
    }
    return (staffStats || []).sort((a, b) => b.commission - a.commission || b.checkouts - a.checkouts);
  }, [staffStats, staffRankingTab]);

  // Pagination state for top selling products/services
  const [topProductsPage, setTopProductsPage] = useState(0);
  const TOP_PRODUCTS_PER_PAGE = 5;

  // Reset topProductsPage whenever filters change
  useEffect(() => {
    setTopProductsPage(0);
  }, [timeRange, selectedBranch, customStartDate, customEndDate]);

  // Calculate All Selling Products/Services - คำนวณยอดขายสุทธิของสินค้า/บริการแต่ละตัวหลังหักส่วนลดท้ายบิล
  const allTopProducts = useMemo(() => {
    const productsMap = {};

    const now = new Date();
    let startDate = null;
    let endDate = null;

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (timeRange === 'custom') {
      if (customStartDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // รวมข้อมูล POS จากทั้ง Local Fetch และ Props
    const posMap = new Map();
    (posHistoryData || []).forEach(tx => { if (tx && tx.id) posMap.set(String(tx.id), tx); });
    (localPosHistory || []).forEach(tx => { 
      if (tx && tx.id) {
        const existing = posMap.get(String(tx.id));
        posMap.set(String(tx.id), { ...tx, ...(existing || {}) });
      }
    });
    const combinedPosList = posMap.size > 0 ? Array.from(posMap.values()) : (localPosHistory || posHistoryData || []);

    combinedPosList.forEach(tx => {
      if (!tx) return;
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch && tx.branch_id !== selectedBranch) return;
      if (tx.status === 'cancelled') return;
      
      const txDate = parseDate(tx.datetime || tx.timestamp || tx.createdAt || tx.date || tx.created_at);
      if (!txDate) return;

      // กรองตามช่วงวันที่เลือกอย่างแม่นยำ
      if (startDate && txDate < startDate) return;
      if (endDate && txDate > endDate) return;

      let items = tx.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }

      if (Array.isArray(items) && items.length > 0) {
        const validItems = items.filter(item => {
          if (!item || !item.name) return false;
          const name = item.name;
          const itId = String(item.id || item.productId || '');
          if (name.includes('ตัดรอบ') || name.includes('ตัดคอร์ส') || name.includes('หมายเหตุ') || itId.startsWith('REDEEM_')) return false;
          return true;
        });

        if (validItems.length === 0) return;

        const net = Number(tx.net_amount ?? tx.netAmount ?? tx.grand_total ?? tx.grandTotal ?? tx.amount ?? (Number(tx.total_amount || tx.totalAmount || tx.total || 0) - Number(tx.discount || tx.discount_amount || 0)));

        const billGross = validItems.reduce((sum, item) => {
          const qty = parseFloat(item.quantity ?? item.qty ?? 1);
          const itemTotal = parseFloat(item.total !== undefined ? item.total : (Number(item.price || 0) * qty));
          return sum + itemTotal;
        }, 0);

        // อัตราส่วนลดเฉลี่ยตามสัดส่วนของแต่ละรายการในบิล
        const discountRatio = (billGross > 0 && net > 0) ? (net / billGross) : (net === 0 ? 0 : 1);

        validItems.forEach(item => {
          const key = String(item.id || item.productId || item.name).trim();
          if (!productsMap[key]) {
            productsMap[key] = {
              id: key,
              name: item.name,
              quantity: 0,
              revenue: 0,
              category: item.category || item.type || ''
            };
          }

          const itemQty = parseFloat(item.quantity ?? item.qty ?? 1);
          let itemGross = parseFloat(item.total !== undefined ? item.total : (Number(item.price || 0) * itemQty));
          let itemNet = 0;
          if (billGross > 0) {
            itemNet = itemGross * discountRatio;
          } else if (net > 0) {
            itemNet = net / validItems.length;
          }
          if (net === 0) itemNet = 0;

          productsMap[key].quantity += itemQty;
          productsMap[key].revenue += itemNet;
        });
      }
    });

    return Object.values(productsMap)
      .filter(p => p.quantity > 0 || p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
  }, [posHistoryData, localPosHistory, selectedBranch, timeRange, customStartDate, customEndDate]);

  const topProductsTotalPages = Math.max(1, Math.ceil(allTopProducts.length / TOP_PRODUCTS_PER_PAGE));
  const paginatedTopProducts = useMemo(() => {
    const start = topProductsPage * TOP_PRODUCTS_PER_PAGE;
    return allTopProducts.slice(start, start + TOP_PRODUCTS_PER_PAGE);
  }, [allTopProducts, topProductsPage]);

  // Calculate Financial Trends based on timeRange & execSummary.dailyTrend
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const trends = [];
    const thaiDaysShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const thaiDaysFull = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    // Map dailyTrend from backend by YYYY-MM-DD key for instant lookup
    const trendMap = {};
    if (execSummary?.dailyTrend && Array.isArray(execSummary.dailyTrend)) {
      execSummary.dailyTrend.forEach(item => {
        if (item.date) {
          const key = String(item.date).split('T')[0];
          trendMap[key] = item;
        }
      });
    }

    let granularity = 'daily';
    let pointsCount = 31;

    if (timeRange === 'today' || timeRange === 'week') {
      granularity = 'daily';
      pointsCount = 7;
    } else if (timeRange === 'month') {
      granularity = 'daily';
      pointsCount = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    } else if (timeRange === 'year') {
      granularity = 'monthly';
      pointsCount = 12;
    } else if (timeRange === 'custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays <= 31) {
          granularity = 'daily';
          pointsCount = diffDays;
        } else {
          granularity = 'monthly';
          const yearDiff = end.getFullYear() - start.getFullYear();
          const monthDiff = end.getMonth() - start.getMonth();
          pointsCount = Math.max(1, Math.min(24, yearDiff * 12 + monthDiff + 1));
        }
      } else {
        granularity = 'monthly';
        pointsCount = 6;
      }
    }

    if (granularity === 'daily') {
      if (timeRange === 'today' || timeRange === 'week') {
        const startOfWeek = new Date(now);
        const currentDay = startOfWeek.getDay();
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        startOfWeek.setDate(startOfWeek.getDate() + distanceToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${dy}`;
          const matched = trendMap[key] || {};

          trends.push({
            type: 'daily',
            date: d,
            year: y,
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: thaiDaysShort[d.getDay()],
            fullLabel: `${thaiDaysFull[d.getDay()]}ที่ ${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${y + 543}`,
            income: parseFloat(matched.income || 0),
            expense: parseFloat(matched.expense || 0),
            profit: parseFloat(matched.profit || (matched.income || 0) - (matched.expense || 0))
          });
        }
      } else if (timeRange === 'month') {
        for (let day = 1; day <= pointsCount; day++) {
          const d = new Date(now.getFullYear(), now.getMonth(), day);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${dy}`;
          const matched = trendMap[key] || {};

          const showLabel = (day === 1 || day % 5 === 0 || day === pointsCount);
          trends.push({
            type: 'daily',
            date: d,
            year: y,
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: showLabel ? `${d.getDate()}` : '',
            fullLabel: `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${y + 543}`,
            income: parseFloat(matched.income || 0),
            expense: parseFloat(matched.expense || 0),
            profit: parseFloat(matched.profit || (matched.income || 0) - (matched.expense || 0))
          });
        }
      } else if (timeRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        for (let i = 0; i < pointsCount; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${dy}`;
          const matched = trendMap[key] || {};

          const showLabel = pointsCount <= 10 || (i === 0 || i === pointsCount - 1 || d.getDate() % 5 === 0);
          trends.push({
            type: 'daily',
            date: d,
            year: y,
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: showLabel ? `${d.getDate()}/${d.getMonth() + 1}` : '',
            fullLabel: `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${y + 543}`,
            income: parseFloat(matched.income || 0),
            expense: parseFloat(matched.expense || 0),
            profit: parseFloat(matched.profit || (matched.income || 0) - (matched.expense || 0))
          });
        }
      } else {
        for (let i = pointsCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${dy}`;
          const matched = trendMap[key] || {};

          trends.push({
            type: 'daily',
            date: d,
            year: y,
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: `${d.getDate()}/${d.getMonth() + 1}`,
            fullLabel: `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${y + 543}`,
            income: parseFloat(matched.income || 0),
            expense: parseFloat(matched.expense || 0),
            profit: parseFloat(matched.profit || (matched.income || 0) - (matched.expense || 0))
          });
        }
      }
    } else {
      if (timeRange === 'year') {
        const currentYear = now.getFullYear();
        for (let mIndex = 0; mIndex < 12; mIndex++) {
          const d = new Date(currentYear, mIndex, 1);
          let inc = 0, exp = 0;
          Object.keys(trendMap).forEach(k => {
            if (k.startsWith(`${currentYear}-${String(mIndex + 1).padStart(2, '0')}`)) {
              inc += parseFloat(trendMap[k].income || 0);
              exp += parseFloat(trendMap[k].expense || 0);
            }
          });

          trends.push({
            type: 'monthly',
            date: d,
            year: currentYear,
            month: mIndex,
            monthLabel: thaiMonthsShort[mIndex],
            fullLabel: `${thaiMonthsFull[mIndex]} ${currentYear + 543}`,
            income: inc,
            expense: exp,
            profit: inc - exp
          });
        }
      }
    }

    return trends;
  }, [execSummary, timeRange, customStartDate, customEndDate]);

  // Calculate branch revenue breakdown from execSummary
  const branchRevenue = useMemo(() => {
    if (execSummary?.branchSummary) {
      const isArray = Array.isArray(execSummary.branchSummary);
      return branchesData.map(b => {
        const bId = b.id;
        let info = { income: 0, expense: 0, profit: 0 };
        if (isArray) {
          info = execSummary.branchSummary.find(item => item.branch_id === bId || item.branchId === bId) || info;
        } else {
          info = execSummary.branchSummary[bId] || info;
        }
        return {
          id: bId,
          name: b.name,
          income: Number(info.income) || 0,
          expense: Number(info.expense) || 0,
          profit: Number(info.profit) || 0
        };
      });
    }
    return branchesData.map(b => ({ id: b.id, name: b.name, income: 0, expense: 0, profit: 0 }));
  }, [branchesData, execSummary]);

  // Format currency helper (clean number with commas, no ฿ symbol for readability)
  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const maxTrendValue = Math.max(
    ...monthlyTrends.map(t => Math.max(t.income, t.expense, Math.abs(t.profit || 0))),
    1000 // avoid division by 0
  );

  const netProfitPoints = useMemo(() => {
    return monthlyTrends.map((t, idx) => {
      const netProfit = t.income - t.expense;
      const pct = Math.max(0, Math.min(100, (netProfit / maxTrendValue) * 80));
      const dotPct = Math.max(5, Math.min(95, (netProfit > 0 ? (netProfit / maxTrendValue) * 80 : 0) + 6));
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = 144 - (dotPct / 100) * 144;
      return { x, y, pct, dotPct, netProfit };
    });
  }, [monthlyTrends, maxTrendValue]);

  const financialLinePath = useMemo(() => {
    return netProfitPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [netProfitPoints]);

  const isCompactFinancial = monthlyTrends.length > 7;
  const isSuperCompactFinancial = monthlyTrends.length > 15;

  const financialBarWidthClass = useMemo(() => {
    if (chartMobileMode === 'scroll') {
      return isCompactFinancial ? "w-1.5 sm:w-1.5" : "w-3.5 sm:w-5";
    }
    if (isSuperCompactFinancial) {
      return "w-[2px] min-[400px]:w-[2.5px] sm:w-1.5";
    }
    if (isCompactFinancial) {
      return "w-1 sm:w-1.5";
    }
    return "w-3.5 sm:w-5";
  }, [chartMobileMode, isSuperCompactFinancial, isCompactFinancial]);

  const financialGroupGapClass = useMemo(() => {
    if (chartMobileMode === 'scroll') {
      return isCompactFinancial ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1.5";
    }
    if (isSuperCompactFinancial) {
      return "gap-[0.5px] min-[400px]:gap-[1px] sm:gap-0.5";
    }
    if (isCompactFinancial) {
      return "gap-0.5";
    }
    return "gap-1 sm:gap-1.5";
  }, [chartMobileMode, isSuperCompactFinancial, isCompactFinancial]);

  return (
    <div className="fade-in pb-10 w-full">
      {/* Header Panel */}
      <div className={`sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out ${isScrolled ? 'is-scrolled' : ''}`} style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className={`w-full pointer-events-auto transition-all duration-300 ${isScrolled ? 'bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.03)]' : 'bg-transparent border-b border-transparent'}`}>
          <div className={`w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all duration-300 ${isScrolled ? 'py-1.5 sm:py-2.5' : 'py-3 sm:py-4'}`}>
            
            {/* Title & Branch Dropdown Row on Mobile */}
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <div>
                <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-2">
                  <TrendingUp className="text-emerald-500 animate-pulse shrink-0" size={20} /> แดชบอร์ดผู้บริหาร
                </h1>
                <p className="text-slate-500 kanit-text sticky-header-desc hidden md:block">ข้อมูลสรุปรายได้ กำไร และประสิทธิภาพของคลินิกเชิงลึก</p>
              </div>

              {/* Branch Filter dropdown - Visible ONLY on mobile in the first row */}
              <div className="w-[120px] sm:hidden shrink-0 relative">
                <CustomSelect 
                  value={selectedBranch} 
                  onChange={(val) => setSelectedBranch(val)} 
                  options={[
                    { value: 'all', label: 'ทุกสาขา' },
                    ...branchesData.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  compact fullWidth className="w-full"
                />
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-row items-center gap-2.5 w-full md:w-auto shrink-0 select-none overflow-x-auto scrollbar-none flex-nowrap py-1.5 px-0.5">
              {/* Branch Filter dropdown - Visible ONLY on Desktop/Tablet */}
              <div className="hidden sm:block w-40 relative">
                <CustomSelect 
                  value={selectedBranch} 
                  onChange={(val) => setSelectedBranch(val)} 
                  options={[
                    { value: 'all', label: 'ทุกสาขา' },
                    ...branchesData.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  compact fullWidth className="w-full"
                />
              </div>

              {/* Time Range Selector & Custom Date selector */}
              <div className="flex items-center gap-2 flex-nowrap shrink-0">
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-sm flex-nowrap shrink-0">
                  {[
                    { id: 'today', label: 'วันนี้' },
                    { id: 'week', label: '7 วัน' },
                    { id: 'month', label: 'เดือนนี้' },
                    { id: 'year', label: 'ปีนี้' },
                    { id: 'custom', label: 'ช่วงเวลา' },
                    { id: 'all', label: 'ทั้งหมด' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setTimeRange(r.id);
                        if (r.id === 'custom') {
                          handleOpenExecRange();
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold kanit-text transition-all shrink-0 ${timeRange === r.id ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Selector Button when 'custom' is active */}
                {timeRange === 'custom' && (
                  <button
                    type="button"
                    onClick={handleOpenExecRange}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm backdrop-blur-md transition-all text-xs font-bold kanit-text shrink-0"
                  >
                    <CalendarIcon size={14} className="text-emerald-500" />
                    <span>{formatExecDisplayRange(customStartDate, customEndDate)}</span>
                  </button>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Revenue */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-[2rem] p-7 shadow-lg shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider kanit-text">รายรับรวมทั้งหมด</p>
                <h3 className="text-3xl font-black font-data mt-2">{(isGlobalLoading || isDashboardLoading) ? '...' : formatMoney(summary.income)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-4 z-10 flex justify-between items-center text-xs text-emerald-100">
              <span className="kanit-text">ยอดผ่าน POS: {summary.checkoutsCount} บิล</span>
              <span className="font-data font-bold">โอนเงิน {((summary.transfer / (summary.income || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>

          {/* Card 2: Expenses */}
          <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-[2rem] p-7 shadow-lg shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-rose-100 text-xs font-bold uppercase tracking-wider kanit-text">รายจ่ายรวมทั้งหมด</p>
                <h3 className="text-3xl font-black font-data mt-2">{(isGlobalLoading || isDashboardLoading) ? '...' : formatMoney(summary.expense)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <TrendingDown size={24} />
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-4 z-10 flex justify-between items-center text-xs text-rose-100">
              <span className="kanit-text">ค่าคอม & สวัสดิการรวมอยู่ด้วย</span>
              <span className="font-data font-bold">อัตราส่วน: {((summary.expense / (summary.income || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="bg-gradient-to-br from-indigo-500 to-sky-600 text-white rounded-[2rem] p-7 shadow-lg shadow-indigo-500/10 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider kanit-text">กำไรสุทธิ (Net Profit)</p>
                <h3 className="text-3xl font-black font-data mt-2">{(isGlobalLoading || isDashboardLoading) ? '...' : formatMoney(summary.netProfit)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Wallet size={24} />
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-4 z-10 flex justify-between items-center text-xs text-indigo-100">
              <span className="kanit-text">กำไรหักค่าใช้จ่ายของสาขาแล้ว</span>
              <span className="font-data font-bold">อัตรากำไร: {summary.profitMargin || (summary.income > 0 ? ((summary.netProfit / summary.income) * 100).toFixed(0) : '0')}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>
        </div>

        {/* Second Row: Charts & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
          {/* Trends Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-7 flex flex-col min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <BarChart3 className="text-emerald-500 w-5 h-5 shrink-0" />
                <span>เทรนด์การเงินย้อนหลัง ({monthlyTrends.length} {monthlyTrends[0]?.type === 'daily' ? 'วัน' : 'เดือน'}ล่าสุด)</span>
              </h3>

              {/* View Mode Toggle on Mobile when data has more than 10 points */}
              {monthlyTrends.length > 10 && (
                <div className="flex sm:hidden items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold kanit-text border border-slate-200/60 shadow-xs self-start">
                  <button
                    type="button"
                    onClick={() => setChartMobileMode('fit')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${chartMobileMode === 'fit' ? 'bg-white text-emerald-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    พอดีจอ
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMobileMode('scroll')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${chartMobileMode === 'scroll' ? 'bg-white text-emerald-600 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    เลื่อนดู
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-end min-h-[220px] px-1 sm:px-2 pt-6 sm:pt-8 w-full min-w-0">
              {/* Scrollable Container on Mobile when in 'scroll' mode */}
              <div className={`w-full ${chartMobileMode === 'scroll' ? 'overflow-x-auto custom-scrollbar pb-2' : 'overflow-hidden'}`}>
                <div className={`${chartMobileMode === 'scroll' ? 'min-w-[620px] sm:min-w-full' : 'w-full'} h-36 relative`}>
                  {/* SVG Mixed Line Chart Overlay for Net Profit */}
                  <svg className="absolute left-0 right-0 top-0 h-full w-full pointer-events-none z-20" viewBox="0 0 600 144" preserveAspectRatio="none">
                    {/* Glow effect for line */}
                    <path d={financialLinePath} fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Main Line */}
                    <path d={financialLinePath} fill="none" stroke="#6366f1" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "3"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {/* Bars Container */}
                  <div className="flex items-end h-full w-full relative">
                    {monthlyTrends.map((t, idx) => {
                      const point = netProfitPoints[idx] || { pct: 0, dotPct: 0 };
                      const incomeHeight = t.income > 0 ? `${Math.max(4, (t.income / maxTrendValue) * 80)}%` : '0px';
                      const expenseHeight = t.expense > 0 ? `${Math.max(4, (t.expense / maxTrendValue) * 80)}%` : '0px';
                      const netProfitHeight = point.pct > 0 ? `${Math.max(4, point.pct)}%` : '0px';
                      const isLeftEdge = idx < 2;
                      const isRightEdge = idx >= monthlyTrends.length - 2;
                      const tooltipAlign = isLeftEdge 
                        ? 'left-0' 
                        : isRightEdge 
                          ? 'right-0' 
                          : 'left-1/2 -translate-x-1/2';
                      const isSelected = activeTrendIdx === idx;

                      return (
                        <div 
                          key={idx} 
                          onClick={() => setActiveTrendIdx(isSelected ? null : idx)}
                          className={`flex-1 min-w-0 flex items-end justify-center ${financialGroupGapClass} h-full relative group cursor-pointer z-10`}
                        >
                          {/* Beautiful Multi-value Tooltip */}
                          <div className={`absolute -top-20 ${tooltipAlign} bg-slate-900/95 text-white text-[10px] p-2 rounded-lg ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg border border-slate-700/50 flex flex-col gap-0.5`}>
                            <span className="font-bold text-slate-300 text-center border-b border-slate-700/50 pb-0.5 mb-0.5">{t.fullLabel || t.monthLabel}</span>
                            <span className="font-semibold text-emerald-400">รายรับ: +{formatMoney(t.income)}</span>
                            <span className="font-semibold text-rose-400">รายจ่าย: -{formatMoney(t.expense)}</span>
                            <span className="font-bold text-indigo-300 pt-0.5 border-t border-slate-700/50">กำไรสุทธิ: {formatMoney(t.income - t.expense)}</span>
                          </div>

                          {/* Income bar */}
                          <div className={`${financialBarWidthClass} bg-emerald-500 hover:bg-emerald-600 rounded-t-[2px] sm:rounded-t-md transition-all relative cursor-pointer`} style={{ height: incomeHeight }}></div>

                          {/* Net Profit bar */}
                          <div className={`${financialBarWidthClass} bg-indigo-500 hover:bg-indigo-600 rounded-t-[2px] sm:rounded-t-md transition-all relative cursor-pointer`} style={{ height: netProfitHeight }}></div>

                          {/* Expense bar */}
                          <div className={`${financialBarWidthClass} bg-rose-500 hover:bg-rose-600 rounded-t-[2px] sm:rounded-t-md transition-all relative cursor-pointer`} style={{ height: expenseHeight }}></div>

                          {/* Circle Dot for Net Profit */}
                          <div 
                            className={`absolute rounded-full shadow-sm z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                              isSuperCompactFinancial && chartMobileMode === 'fit'
                                ? 'w-1.5 h-1.5 bg-indigo-500 sm:w-2.5 sm:h-2.5 sm:bg-white sm:border-2 sm:border-indigo-500'
                                : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white border-2 border-indigo-500'
                            } ${isSelected ? '!scale-150 !bg-indigo-600 !border-white' : 'group-hover:scale-125'}`} 
                            style={{ top: `${100 - point.dotPct}%` }}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Month Labels Row */}
                <div className={`${chartMobileMode === 'scroll' ? 'min-w-[620px] sm:min-w-full' : 'w-full'} flex justify-between px-1 sm:px-2 mt-2`}>
                  {monthlyTrends.map((t, idx) => (
                    <span key={idx} className="flex-1 min-w-0 text-center text-[9px] sm:text-xs font-bold text-slate-500 font-data truncate">{t.monthLabel}</span>
                  ))}
                </div>
              </div>

              {/* Scroll Hint on Mobile when in 'scroll' mode */}
              {chartMobileMode === 'scroll' && (
                <div className="sm:hidden text-center text-[10px] text-slate-400 font-medium kanit-text mt-1">
                  ← เลื่อนในกราฟซ้าย-ขวาเพื่อดูรายวัน →
                </div>
              )}

              {/* Legend */}
              <div className="flex justify-center flex-wrap gap-3 sm:gap-6 mt-4 sm:mt-6 border-t border-slate-100 pt-3 sm:pt-4 text-[11px] sm:text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-sm sm:rounded-md"></div>
                  <span className="kanit-text">รายรับ</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-rose-500 rounded-sm sm:rounded-md"></div>
                  <span className="kanit-text">รายจ่าย</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-indigo-500 rounded-sm sm:rounded-md"></div>
                  <span className="kanit-text">กำไรสุทธิ (แท่ง)</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5 sm:w-6 h-1 bg-indigo-500 rounded-full relative flex items-center justify-center">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white border-2 border-indigo-500 rounded-full"></div>
                  </div>
                  <span className="kanit-text">เทรนด์กำไรสุทธิ (เส้น)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods & Branch Revenue */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-7 flex flex-col justify-between min-w-0 overflow-hidden">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-5 kanit-text flex items-center gap-2">
                <CreditCard className="text-indigo-500 w-5 h-5" /> ช่องทางการชำระเงิน
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'เงินสด', amount: summary.cash, color: 'bg-emerald-500', pct: summary.income > 0 ? (summary.cash / summary.income) * 100 : 0 },
                  { label: 'โอนเงิน / สแกนจ่าย', amount: summary.transfer + (summary.qr || 0), color: 'bg-sky-500', pct: summary.income > 0 ? ((summary.transfer + (summary.qr || 0)) / summary.income) * 100 : 0 },
                  { label: 'บัตรเครดิต', amount: summary.card, color: 'bg-indigo-500', pct: summary.income > 0 ? (summary.card / summary.income) * 100 : 0 }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span className="kanit-text">{item.label}</span>
                      <span className="font-data">{formatMoney(item.amount)} ({item.pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 mt-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest kanit-text mb-3">สรุปยอดแบ่งตามสาขา</h4>
              <div className="space-y-2.5 max-h-40 overflow-y-auto custom-scrollbar">
                {branchRevenue.map((br, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 kanit-text truncate max-w-[120px]">{br.name}</span>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 font-data">+{formatMoney(br.income)}</div>
                      <div className="text-[10px] text-slate-400 font-data mt-0.5">-{formatMoney(br.expense)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Staff ranking & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-w-0">
          {/* Top Staff / Doctors Performance */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-7 flex flex-col min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <Award className="text-amber-500 w-5 h-5 shrink-0" />
                <span>อันดับผลงานและค่าคอมมิชชั่น</span>
              </h3>

              {/* Segmented Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold kanit-text border border-slate-200/60 shrink-0 shadow-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStaffRankingTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${staffRankingTab === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setStaffRankingTab('df')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${staffRankingTab === 'df' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Stethoscope size={12} /> ค่า DF (เคสรักษา)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffRankingTab('sales')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${staffRankingTab === 'sales' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Award size={12} /> ค่าคอม (ยอดขาย)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table-auto w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold">
                    <th className={`${staffRankingTab === 'all' ? 'w-[34%]' : 'w-[38%]'} py-3 px-2 kanit-text`}>
                      {staffRankingTab === 'df' ? 'แพทย์ผู้รักษา' : staffRankingTab === 'sales' ? 'ผู้แนะนำ / ผู้ขาย' : 'พนักงาน'}
                    </th>
                    {staffRankingTab === 'all' ? (
                      <>
                        <th className="w-[18%] py-3 px-2 kanit-text text-center text-emerald-700 whitespace-nowrap">
                          🩺 เคสรักษา
                        </th>
                        <th className="w-[18%] py-3 px-2 kanit-text text-center text-amber-700 whitespace-nowrap">
                          💼 บิลขาย
                        </th>
                      </>
                    ) : (
                      <th className="w-[28%] py-3 px-2 kanit-text text-center whitespace-nowrap">
                        {staffRankingTab === 'df' ? '🩺 จำนวนเคสรักษา' : '💼 จำนวนบิลขาย'}
                      </th>
                    )}
                    <th className={`${staffRankingTab === 'all' ? 'w-[30%]' : 'w-[34%]'} py-3 px-2 kanit-text text-right whitespace-nowrap`}>
                      {staffRankingTab === 'df' ? 'ค่า DF หัตถการ' : staffRankingTab === 'sales' ? 'ค่าคอมมิชชั่น' : 'ค่าตอบแทนรวม'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedStaffStats.length === 0 ? (
                    <tr>
                      <td colSpan={staffRankingTab === 'all' ? 4 : 3} className="py-8 text-center text-slate-400 kanit-text">
                        {staffRankingTab === 'df' 
                          ? 'ไม่มีประวัติเคสรักษา/ค่า DF ในช่วงเวลานี้' 
                          : staffRankingTab === 'sales' 
                          ? 'ไม่มีประวัติยอดขาย/ค่าคอมมิชชั่นในช่วงเวลานี้' 
                          : 'ไม่มีประวัติผลงานในช่วงเวลานี้'}
                      </td>
                    </tr>
                  ) : (
                    displayedStaffStats.map((st, idx) => (
                      <tr key={st.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 flex items-center gap-2.5">
                          <span className="font-bold text-slate-400 font-data w-4 shrink-0">{idx + 1}</span>
                          {st.photo ? (
                            <img src={st.photo} className="w-7 h-7 rounded-full object-cover border border-slate-200" alt="Avatar"/>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={14}/></div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-700 kanit-text truncate">{st.name}</div>
                            <div className="text-[9px] text-slate-400 font-medium kanit-text truncate mt-0.5">{st.position || st.role}</div>
                          </div>
                        </td>

                        {staffRankingTab === 'all' ? (
                          <>
                            <td className="py-3 px-2 text-center font-data text-emerald-700 font-bold">
                              {st.dfCases > 0 ? (
                                <span className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/80 text-xs">
                                  {st.dfCases} เคส
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center font-data text-amber-700 font-bold">
                              {st.salesCases > 0 ? (
                                <span className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/80 text-xs">
                                  {st.salesCases} บิล
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td className="py-3 px-2 text-center font-data text-slate-600 font-bold">
                            {staffRankingTab === 'df' ? (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100/80 text-xs">
                                {st.dfCases} เคส
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100/80 text-xs">
                                {st.salesCases} บิล
                              </span>
                            )}
                          </td>
                        )}

                        <td className="py-3 px-2 text-right font-bold text-emerald-600 font-data">
                          {staffRankingTab === 'df' ? (
                            <div>{formatMoney(st.dfCommission)}</div>
                          ) : staffRankingTab === 'sales' ? (
                            <div>{formatMoney(st.salesCommission)}</div>
                          ) : (
                            <div>
                              <div>{formatMoney(st.commission)}</div>
                              {(st.dfCommission > 0 || st.salesCommission > 0) && (
                                <div className="text-[10px] text-slate-400 font-data font-normal mt-0.5 whitespace-nowrap">
                                  DF: {formatMoney(st.dfCommission)} | ขาย: {formatMoney(st.salesCommission)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-7 flex flex-col min-h-[380px] sm:min-h-[410px] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2 truncate">
                <ShoppingBag className="text-emerald-500 w-5 h-5 shrink-0" />
                <span>สินค้าและบริการขายดี</span>
                <span className="text-xs font-normal text-slate-400 kanit-text">
                  ({allTopProducts.length > 0 ? `อันดับ ${topProductsPage * TOP_PRODUCTS_PER_PAGE + 1}-${Math.min((topProductsPage + 1) * TOP_PRODUCTS_PER_PAGE, allTopProducts.length)} จาก ${allTopProducts.length}` : '0 รายการ'})
                </span>
              </h3>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setTopProductsPage(prev => Math.max(0, prev - 1))}
                  disabled={topProductsPage === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 border border-slate-200/60 shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  title="อันดับก่อนหน้า"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-600 font-data px-1.5 min-w-[36px] text-center">
                  {topProductsTotalPages > 0 ? `${topProductsPage + 1}/${topProductsTotalPages}` : '1/1'}
                </span>
                <button
                  type="button"
                  onClick={() => setTopProductsPage(prev => Math.min(topProductsTotalPages - 1, prev + 1))}
                  disabled={topProductsPage >= topProductsTotalPages - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 border border-slate-200/60 shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  title="อันดับถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-start min-h-[290px]">
              {paginatedTopProducts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 kanit-text text-sm italic py-10">
                  ไม่มีประวัติการจำหน่ายสินค้า/บริการในช่วงเวลานี้
                </div>
              ) : (
                paginatedTopProducts.map((p, idx) => {
                  const rankNumber = topProductsPage * TOP_PRODUCTS_PER_PAGE + idx + 1;
                  return (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-inner ${
                          rankNumber === 1 ? 'bg-amber-100 text-amber-700 font-black' :
                          rankNumber === 2 ? 'bg-slate-200 text-slate-700 font-bold' :
                          rankNumber === 3 ? 'bg-amber-50 text-amber-800 font-bold' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {rankNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 text-xs sm:text-sm kanit-text truncate" title={p.name}>{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-data mt-0.5">จำนวนที่ขาย: {p.quantity} ชิ้น/ครั้ง</p>
                        </div>
                      </div>
                      <div className="text-right font-bold text-slate-700 font-data text-xs sm:text-sm pl-2 shrink-0">
                        {formatMoney(p.revenue)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Modal: Date Range Calendar สำหรับหน้าแดชบอร์ดผู้บริหาร --- */}
      {showExecRangeCalendar && createPortal(
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isExecRangeClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeExecRangeCalendar}></div>
          <div 
            ref={execRangeSwipeProps.ref} 
            style={execRangeSwipeProps.style}
            className={`relative z-[210] w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[1.5rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden ${isExecRangeClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-3 pb-3 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
              {execRangeCalView === 'days' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <button type="button" onClick={() => setExecRangeCalDate(new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setExecRangeCalView('months')} className="font-bold text-slate-800 hover:text-emerald-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[execRangeCalDate.getMonth()]} {execRangeCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={() => setExecRangeCalDate(new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>

                  <div className="mb-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex flex-col">
                          <span className="text-[10px] text-emerald-600 font-bold kanit-text uppercase">เริ่มต้น</span>
                          <span className="text-sm font-black text-emerald-800 font-data">{execTempStartDate ? formatExecRangeStr(execTempStartDate) : '-'}</span>
                      </div>
                      <div className="text-emerald-300"><ChevronRight size={16} /></div>
                      <div className="flex flex-col text-right">
                          <span className="text-[10px] text-emerald-600 font-bold kanit-text uppercase">สิ้นสุด</span>
                          <span className="text-sm font-black text-emerald-800 font-data">{execTempEndDate ? formatExecRangeStr(execTempEndDate) : '-'}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center mb-2">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
                    {blankExecRangeDays.map(b => <div key={`blank-${b}`} className="w-full aspect-square"></div>)}
                    {monthExecRangeDays.map(day => {
                      const selectedDate = new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth(), day);
                      selectedDate.setHours(0,0,0,0);
                      
                      const hasBothDates = execTempStartDate && execTempEndDate;
                      const isSelectedStart = execTempStartDate && selectedDate.getTime() === execTempStartDate.getTime();
                      const isSelectedEnd = execTempEndDate && selectedDate.getTime() === execTempEndDate.getTime();
                      const isInRange = hasBothDates && selectedDate > execTempStartDate && selectedDate < execTempEndDate;
                      const isToday = new Date().setHours(0,0,0,0) === selectedDate.getTime();

                      return (
                        <div key={day} className="w-full flex items-center justify-center relative my-0.5">
                            {hasBothDates && isSelectedStart && execTempStartDate.getTime() !== execTempEndDate.getTime() && (
                                <div className="absolute right-0 w-1/2 h-10 sm:h-8 bg-emerald-50 my-auto"></div>
                            )}
                            {hasBothDates && isSelectedEnd && execTempStartDate.getTime() !== execTempEndDate.getTime() && (
                                <div className="absolute left-0 w-1/2 h-10 sm:h-8 bg-emerald-50 my-auto"></div>
                            )}
                            {isInRange && (
                                <div className="absolute w-full h-10 sm:h-8 bg-emerald-50 my-auto"></div>
                            )}
                            
                            <button 
                                type="button" 
                                onClick={() => handleSelectExecRangeDate(day)} 
                                className={`relative w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-xl flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data 
                                ${isSelectedStart || isSelectedEnd ? 'bg-emerald-500 text-white shadow-md z-10' : 
                                  isInRange ? 'text-emerald-800' : 
                                  isToday ? 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-200' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                                {day}
                            </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {execRangeCalView === 'months' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setExecRangeCalDate(new Date(execRangeCalDate.getFullYear() - 1, execRangeCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setExecRangeCalView('years')} className="font-bold text-slate-800 hover:text-emerald-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{execRangeCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={() => setExecRangeCalDate(new Date(execRangeCalDate.getFullYear() + 1, execRangeCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {thaiMonthsShort.map((m, i) => (
                      <button 
                        key={m} 
                        type="button" 
                        onClick={() => {setExecRangeCalDate(new Date(execRangeCalDate.getFullYear(), i, 1)); setExecRangeCalView('days');}} 
                        className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${execRangeCalDate.getMonth() === i ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {execRangeCalView === 'years' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setExecRangeYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{execRangeYearPageStart} - {execRangeYearPageStart + 11}</span>
                    <button type="button" onClick={() => setExecRangeYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({length: 12}, (_, i) => execRangeYearPageStart + i).map(y => (
                      <button 
                        key={y} 
                        type="button" 
                        onClick={() => {setExecRangeCalDate(new Date(y - 543, execRangeCalDate.getMonth(), 1)); setExecRangeCalView('months');}} 
                        className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(execRangeCalDate.getFullYear() + 543) === y ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 w-full rounded-b-[1.5rem]">
                <button type="button" onClick={closeExecRangeCalendar} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text transition-colors shadow-sm text-sm">
                    ยกเลิก
                </button>
                <button type="button" onClick={confirmExecRange} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 kanit-text transition-colors text-sm">
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

export default React.memo(ExecutiveDashboard);

