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

const ExecutiveDashboard = ({ 
  queueData = [], 
  patientsData = [], 
  posHistoryData = [], 
  financeData = [], 
  staffData = [], 
  branchesData = [], 
  currentBranch = 'all', 
  isGlobalLoading = false,
  showToast = () => {}
}) => {
  const [timeRange, setTimeRange] = useState('month'); // today | week | month | year | all
  const [selectedBranch, setSelectedBranch] = useState(currentBranch);
  const [isScrolled, setIsScrolled] = useState(false);
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

  // Consolidate POS history as income and finance as income/expenses
  const allTransactions = useMemo(() => {
    const posTx = posHistoryData.map(tx => {
      const txDate = tx.datetime || tx.timestamp || tx.createdAt || tx.date || new Date().toISOString();
      return {
        id: tx.id || tx.receiptNo || Math.random().toString(),
        date: txDate,
        type: 'income',
        amount: parseFloat(tx.total || tx.netTotal || tx.grandTotal || tx.amount || 0),
        method: tx.paymentMethod || 'cash',
        category: 'รายได้จาก POS',
        note: tx.patientName ? `ชำระโดย ${tx.patientName}` : 'ทั่วไป (ไม่ระบุคนไข้)',
        status: tx.status || 'completed',
        isAuto: true,
        branchId: tx.branchId || 'all'
      };
    });

    const finTx = financeData.map(tx => ({
        ...tx,
        date: tx.date || new Date().toISOString(),
        amount: parseFloat(tx.amount || 0),
        method: tx.method || 'cash',
        branchId: tx.branchId || 'all'
    }));

    return [...posTx, ...finTx];
  }, [posHistoryData, financeData]);

  // Filter transactions by branch and time range
  const filteredTx = useMemo(() => {
    return allTransactions.filter(tx => {
      // 1. Branch filter
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch) return false;
      
      // 2. Cancelled transaction filter
      if (tx.status === 'cancelled') return false;

      // 3. Time range filter
      const txDate = parseDate(tx.date);
      const now = new Date();
      if (timeRange === 'today') {
        return txDate.getDate() === now.getDate() &&
               txDate.getMonth() === now.getMonth() &&
               txDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'week') {
        const limit = new Date();
        limit.setDate(now.getDate() - 7);
        return txDate >= limit && txDate <= now;
      } else if (timeRange === 'month') {
        const limit = new Date();
        limit.setMonth(now.getMonth() - 1);
        return txDate >= limit && txDate <= now;
      } else if (timeRange === 'year') {
        const limit = new Date();
        limit.setFullYear(now.getFullYear() - 1);
        return txDate >= limit && txDate <= now;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
        return true;
      }
      return true; // 'all'
    });
  }, [allTransactions, selectedBranch, timeRange, customStartDate, customEndDate]);

  // Calculate Financial Summary
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let cash = 0;
    let transfer = 0;
    let card = 0;
    let checkoutsCount = 0;

    filteredTx.forEach(tx => {
      if (tx.type === 'income') {
        income += tx.amount;
        if (tx.method === 'cash') cash += tx.amount;
        else if (tx.method === 'transfer') transfer += tx.amount;
        else if (tx.method === 'card') card += tx.amount;
        if (tx.isAuto) checkoutsCount++;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });

    return {
      income,
      expense,
      netProfit: income - expense,
      cash,
      transfer,
      card,
      checkoutsCount
    };
  }, [filteredTx]);

  // Calculate Staff Performance Rank (sales & commissions)
  const staffStats = useMemo(() => {
    const stats = {};
    staffData.forEach(s => {
      const shortName = s.name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.|ดร\.|นาย|นางสาว|นาง)/, '').trim().split(' ')[0];
      stats[s.id] = { id: s.id, name: shortName, photo: s.photo, role: s.role, position: s.position, commission: 0, checkouts: 0 };
    });

    posHistoryData.forEach(tx => {
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch) return;
      if (tx.status === 'cancelled') return;
      
      const txDate = parseDate(tx.datetime || tx.timestamp || tx.createdAt);
      const now = new Date();
      let matchTime = true;
      if (timeRange === 'today') {
        matchTime = txDate.getDate() === now.getDate() && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'week') {
        const limit = new Date(); limit.setDate(now.getDate() - 7);
        matchTime = txDate >= limit;
      } else if (timeRange === 'month') {
        const limit = new Date(); limit.setMonth(now.getMonth() - 1);
        matchTime = txDate >= limit;
      } else if (timeRange === 'year') {
        const limit = new Date(); limit.setFullYear(now.getFullYear() - 1);
        matchTime = txDate >= limit;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) matchTime = false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) matchTime = false;
        }
      }

      if (matchTime) {
        if (tx.doctorId && stats[tx.doctorId]) {
          stats[tx.doctorId].checkouts++;
          stats[tx.doctorId].commission += parseFloat(tx.doctorCommission || 0);
        }
        if (tx.staffId && stats[tx.staffId]) {
          stats[tx.staffId].checkouts++;
          stats[tx.staffId].commission += parseFloat(tx.staffCommission || 0);
        }
      }
    });

    return Object.values(stats)
      .filter(s => s.checkouts > 0 || s.commission > 0)
      .sort((a, b) => b.commission - a.commission);
  }, [staffData, posHistoryData, selectedBranch, timeRange, customStartDate, customEndDate]);

  // Calculate Top Selling Products/Services
  const topProducts = useMemo(() => {
    const productsMap = {};
    posHistoryData.forEach(tx => {
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch) return;
      if (tx.status === 'cancelled') return;
      
      const txDate = parseDate(tx.datetime || tx.timestamp || tx.createdAt);
      const now = new Date();
      let matchTime = true;
      if (timeRange === 'today') {
        matchTime = txDate.getDate() === now.getDate() && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'week') {
        const limit = new Date(); limit.setDate(now.getDate() - 7);
        matchTime = txDate >= limit;
      } else if (timeRange === 'month') {
        const limit = new Date(); limit.setMonth(now.getMonth() - 1);
        matchTime = txDate >= limit;
      } else if (timeRange === 'year') {
        const limit = new Date(); limit.setFullYear(now.getFullYear() - 1);
        matchTime = txDate >= limit;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) matchTime = false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) matchTime = false;
        }
      }

      if (matchTime && Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          const key = item.id || item.name;
          if (!productsMap[key]) {
            productsMap[key] = { name: item.name, quantity: 0, revenue: 0 };
          }
          productsMap[key].quantity += parseFloat(item.quantity || 0);
          productsMap[key].revenue += parseFloat(item.total || 0);
        });
      }
    });

    return Object.values(productsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [posHistoryData, selectedBranch, timeRange, customStartDate, customEndDate]);

  // Calculate Financial Trends based on the selected timeRange and granularity
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const trends = [];
    const thaiDaysShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const thaiDaysFull = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    let granularity = 'monthly'; // 'daily' or 'monthly'
    let pointsCount = 6; // default

    if (timeRange === 'today' || timeRange === 'week') {
      granularity = 'daily';
      pointsCount = 7;
    } else if (timeRange === 'month') {
      granularity = 'daily';
      // Number of days in the current calendar month
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
        // Current calendar week (Monday to Sunday)
        const startOfWeek = new Date(now);
        const currentDay = startOfWeek.getDay(); // 0 = Sun, 1 = Mon, etc.
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        startOfWeek.setDate(startOfWeek.getDate() + distanceToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          trends.push({
            type: 'daily',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: thaiDaysShort[d.getDay()],
            fullLabel: `${thaiDaysFull[d.getDay()]}ที่ ${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      } else if (timeRange === 'month') {
        // Calendar month days from day 1 to pointsCount
        for (let day = 1; day <= pointsCount; day++) {
          const d = new Date(now.getFullYear(), now.getMonth(), day);
          // Show labels for day 1, and every 5th day to avoid overlap
          const showLabel = (day === 1 || day % 5 === 0 || day === pointsCount);
          trends.push({
            type: 'daily',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: showLabel ? `${d.getDate()}` : '',
            fullLabel: `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      } else if (timeRange === 'custom' && customStartDate && customEndDate) {
        // Custom daily range
        const start = new Date(customStartDate);
        for (let i = 0; i < pointsCount; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const showLabel = pointsCount <= 10 || (i === 0 || i === pointsCount - 1 || d.getDate() % 5 === 0);
          trends.push({
            type: 'daily',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: showLabel ? `${d.getDate()}/${d.getMonth() + 1}` : '',
            fullLabel: `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      } else {
        // Fallback: Last N days
        for (let i = pointsCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          trends.push({
            type: 'daily',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            monthLabel: `${d.getDate()}/${d.getMonth() + 1}`,
            fullLabel: `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      }
    } else {
      // Monthly granularity
      if (timeRange === 'year') {
        // Current calendar year (January to December)
        const currentYear = now.getFullYear();
        for (let mIndex = 0; mIndex < 12; mIndex++) {
          const d = new Date(currentYear, mIndex, 1);
          trends.push({
            type: 'monthly',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            monthLabel: thaiMonthsShort[d.getMonth()],
            fullLabel: `${thaiMonthsFull[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      } else if (timeRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        for (let i = 0; i < pointsCount; i++) {
          const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
          trends.push({
            type: 'monthly',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            monthLabel: `${thaiMonthsShort[d.getMonth()]} ${String(d.getFullYear() + 543).substring(2)}`,
            fullLabel: `${thaiMonthsFull[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      } else {
        // Default monthly trends (last N months)
        for (let i = pointsCount - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          trends.push({
            type: 'monthly',
            date: d,
            year: d.getFullYear(),
            month: d.getMonth(),
            monthLabel: `${thaiMonthsShort[d.getMonth()]} ${String(d.getFullYear() + 543).substring(2)}`,
            fullLabel: `${thaiMonthsFull[d.getMonth()]} ${d.getFullYear() + 543}`,
            income: 0,
            expense: 0
          });
        }
      }
    }

    // Now populate income and expense amounts
    allTransactions.forEach(tx => {
      const txDate = parseDate(tx.date);
      if (selectedBranch !== 'all' && tx.branchId !== selectedBranch) return;
      if (tx.status === 'cancelled') return;

      trends.forEach(t => {
        if (t.type === 'daily') {
          if (txDate.getFullYear() === t.year && txDate.getMonth() === t.month && txDate.getDate() === t.day) {
            if (tx.type === 'income') t.income += tx.amount;
            else if (tx.type === 'expense') t.expense += tx.amount;
          }
        } else {
          if (txDate.getFullYear() === t.year && txDate.getMonth() === t.month) {
            if (tx.type === 'income') t.income += tx.amount;
            else if (tx.type === 'expense') t.expense += tx.amount;
          }
        }
      });
    });

    return trends;
  }, [allTransactions, selectedBranch, timeRange, customStartDate, customEndDate]);

  // Calculate branch revenue breakdown
  const branchRevenue = useMemo(() => {
    const map = {};
    branchesData.forEach(b => {
      map[b.id] = { id: b.id, name: b.name, income: 0, expense: 0 };
    });
    // Add default/fallback branch if not found
    map['all'] = { id: 'all', name: 'อื่น ๆ / ทั่วไป', income: 0, expense: 0 };

    allTransactions.forEach(tx => {
      const txDate = parseDate(tx.date);
      const now = new Date();
      let matchTime = true;
      if (timeRange === 'today') {
        matchTime = txDate.getDate() === now.getDate() && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeRange === 'week') {
        const limit = new Date(); limit.setDate(now.getDate() - 7);
        matchTime = txDate >= limit;
      } else if (timeRange === 'month') {
        const limit = new Date(); limit.setMonth(now.getMonth() - 1);
        matchTime = txDate >= limit;
      } else if (timeRange === 'year') {
        const limit = new Date(); limit.setFullYear(now.getFullYear() - 1);
        matchTime = txDate >= limit;
      } else if (timeRange === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) matchTime = false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) matchTime = false;
        }
      }

      if (matchTime) {
        const bId = tx.branchId || 'all';
        if (!map[bId]) {
          map[bId] = { id: bId, name: `สาขา ${bId}`, income: 0, expense: 0 };
        }
        if (tx.type === 'income') {
          map[bId].income += tx.amount;
        } else if (tx.type === 'expense') {
          map[bId].expense += tx.amount;
        }
      }
    });

    return Object.values(map).filter(b => b.income > 0 || b.expense > 0);
  }, [branchesData, allTransactions, timeRange, customStartDate, customEndDate]);

  // Format currency helper
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const maxTrendValue = Math.max(
    ...monthlyTrends.map(t => Math.max(t.income, t.expense)),
    10000 // avoid division by 0
  );

  const netProfitPoints = useMemo(() => {
    return monthlyTrends.map((t, idx) => {
      const netProfit = t.income - t.expense;
      const pct = Math.max(0, Math.min(100, (netProfit / maxTrendValue) * 80));
      // Elevate dot and line slightly above the bar for perfect visibility
      const dotPct = Math.min(95, pct + 6);
      const x = (idx + 0.5) * (600 / monthlyTrends.length);
      const y = 144 - (dotPct / 100) * 144;
      return { x, y, pct, dotPct, netProfit };
    });
  }, [monthlyTrends, maxTrendValue]);

  const financialLinePath = useMemo(() => {
    return netProfitPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [netProfitPoints]);

  const isCompactFinancial = monthlyTrends.length > 7;
  const financialBarWidthClass = isCompactFinancial 
    ? "w-1 sm:w-1.5" 
    : "w-3.5 sm:w-5";
  const financialGroupGapClass = isCompactFinancial
    ? "gap-0.5"
    : "gap-1 sm:gap-1.5";

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
                <h3 className="text-3xl font-black font-data mt-2">{isGlobalLoading ? '-' : formatMoney(summary.income)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-4 z-10 flex justify-between items-center text-xs text-emerald-100">
              <span className="kanit-text">ยอดผ่าน POS: {summary.checkoutsCount} บิล</span>
              <span className="font-data font-bold">บัตร {((summary.card / (summary.income || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>

          {/* Card 2: Expenses */}
          <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-[2rem] p-7 shadow-lg shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-rose-100 text-xs font-bold uppercase tracking-wider kanit-text">รายจ่ายรวมทั้งหมด</p>
                <h3 className="text-3xl font-black font-data mt-2">{isGlobalLoading ? '-' : formatMoney(summary.expense)}</h3>
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
                <h3 className="text-3xl font-black font-data mt-2">{isGlobalLoading ? '-' : formatMoney(summary.netProfit)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Wallet size={24} />
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-4 z-10 flex justify-between items-center text-xs text-indigo-100">
              <span className="kanit-text">กำไรหักค่าใช้จ่ายของสาขาแล้ว</span>
              <span className="font-data font-bold">อัตรากำไร: {summary.income > 0 ? ((summary.netProfit / summary.income) * 100).toFixed(0) : '0'}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>
        </div>

        {/* Second Row: Charts & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trends Chart */}
          <div className={`lg:col-span-2 ${theme.card} flex flex-col`}>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 kanit-text flex items-center gap-2">
              <BarChart3 className="text-emerald-500 w-5 h-5" /> เทรนด์การเงินย้อนหลัง ({monthlyTrends.length} {monthlyTrends[0]?.type === 'daily' ? 'วัน' : 'เดือน'}ล่าสุด)
            </h3>
            <div className="flex-1 flex flex-col justify-end min-h-[220px] px-2 pt-8">
              <div className="h-36 w-full relative">
                {/* SVG Mixed Line Chart Overlay for Net Profit */}
                <svg className="absolute left-0 right-0 top-0 h-full w-full pointer-events-none z-20" viewBox="0 0 600 144" preserveAspectRatio="none">
                  {/* Glow effect for line */}
                  <path d={financialLinePath} fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Main Line */}
                  <path d={financialLinePath} fill="none" stroke="#6366f1" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Bars Container */}
                <div className="flex items-end h-full w-full relative">
                  {monthlyTrends.map((t, idx) => {
                    const point = netProfitPoints[idx];
                    const incomeHeight = `${Math.max(8, (t.income / maxTrendValue) * 80)}%`;
                    const expenseHeight = `${Math.max(8, (t.expense / maxTrendValue) * 80)}%`;
                    const netProfitHeight = `${Math.max(8, point.pct)}%`;
                    return (
                      <div key={idx} className={`flex-1 flex items-end justify-center ${financialGroupGapClass} h-full relative group cursor-pointer z-10`}>
                        {/* Beautiful Multi-value Tooltip */}
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-md border border-slate-700/50 flex flex-col gap-0.5">
                          <span className="font-bold text-slate-300 text-center border-b border-slate-700/50 pb-0.5 mb-0.5">{t.fullLabel || t.monthLabel}</span>
                          <span className="font-semibold text-emerald-400">รายรับ: +{formatMoney(t.income)}</span>
                          <span className="font-semibold text-rose-400">รายจ่าย: -{formatMoney(t.expense)}</span>
                          <span className="font-bold text-indigo-300 pt-0.5 border-t border-slate-700/50">กำไรสุทธิ: {formatMoney(t.income - t.expense)}</span>
                        </div>

                        {/* Income bar */}
                        <div className={`${financialBarWidthClass} bg-emerald-500 hover:bg-emerald-600 rounded-t-[3px] sm:rounded-t-md transition-all relative cursor-pointer`} style={{ height: incomeHeight }}></div>

                        {/* Net Profit bar */}
                        <div className={`${financialBarWidthClass} bg-indigo-500 hover:bg-indigo-600 rounded-t-[3px] sm:rounded-t-md transition-all relative cursor-pointer`} style={{ height: netProfitHeight }}></div>

                        {/* Expense bar */}
                        <div className={`${financialBarWidthClass} bg-rose-500 hover:bg-rose-600 rounded-t-[3px] sm:rounded-t-md transition-all relative cursor-pointer`} style={{ height: expenseHeight }}></div>

                        {/* Perfect Circle Dot for Net Profit */}
                        <div className="absolute w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full shadow-sm z-20 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: `${100 - point.dotPct}%` }}></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month Labels Row */}
              <div className="flex justify-between px-2 mt-2 w-full">
                {monthlyTrends.map((t, idx) => (
                  <span key={idx} className="flex-1 text-center text-[10px] sm:text-xs font-bold text-slate-500 font-data shrink-0">{t.monthLabel}</span>
                ))}
              </div>

              {/* Legend */}
              <div className="flex justify-center flex-wrap gap-6 mt-6 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-md"></div>
                  <span className="kanit-text">รายรับ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-rose-500 rounded-md"></div>
                  <span className="kanit-text">รายจ่าย</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-indigo-500 rounded-md"></div>
                  <span className="kanit-text">กำไรสุทธิ (แท่ง)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-indigo-500 rounded-full relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full"></div>
                  </div>
                  <span className="kanit-text">เทรนด์กำไรสุทธิ (เส้น)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods & Branch Revenue */}
          <div className={`${theme.card} flex flex-col justify-between`}>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-5 kanit-text flex items-center gap-2">
                <CreditCard className="text-indigo-500 w-5 h-5" /> ช่องทางการชำระเงิน
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'เงินสด', amount: summary.cash, color: 'bg-emerald-500', pct: summary.income > 0 ? (summary.cash / summary.income) * 100 : 0 },
                  { label: 'โอนเงิน', amount: summary.transfer, color: 'bg-sky-500', pct: summary.income > 0 ? (summary.transfer / summary.income) * 100 : 0 },
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Staff / Doctors Performance */}
          <div className={`${theme.card} flex flex-col`}>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 kanit-text flex items-center gap-2">
              <Award className="text-amber-500 w-5 h-5" /> อันดับผลงานและค่าคอมมิชชั่นพนักงาน
            </h3>
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold"><th className="w-[31%] py-3 px-2 kanit-text">พนักงาน</th><th className="w-[31%] py-3 px-2 kanit-text text-center">เคสรักษา</th><th className="w-[38%] py-3 px-2 kanit-text text-right">ค่าคอมมิชชั่น</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {staffStats.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-400 kanit-text">ไม่มีประวัติยอดขาย/ค่าคอมมิชชั่นในช่วงเวลานี้</td>
                    </tr>
                  ) : (
                    staffStats.map((st, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
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
                        <td className="py-3 px-2 text-center font-data text-slate-600 font-bold">{st.checkouts}</td>
                        <td className="py-3 px-2 text-right font-bold text-emerald-600 font-data">{formatMoney(st.commission)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className={`${theme.card} flex flex-col`}>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 kanit-text flex items-center gap-2">
              <ShoppingBag className="text-emerald-500 w-5 h-5" /> สินค้าและบริการขายดี (Top 5 Best Sellers)
            </h3>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {topProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 kanit-text">ไม่มีประวัติการจำหน่ายสินค้า/บริการในช่วงเวลานี้</div>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                        {idx + 1}
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
                ))
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

export default ExecutiveDashboard;

