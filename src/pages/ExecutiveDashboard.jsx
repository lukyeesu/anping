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
  Pencil, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown, ArrowLeftRight, Loader2,
  User, Briefcase, Table as TableIcon, CalendarDays, LayoutList, List, Truck,
  ShoppingCart, Tag, Minus, Banknote, QrCode, Receipt, ScanText, Camera, Upload, History, Activity,
  TrendingUp, TrendingDown, Download, Filter, Printer, ShoppingBag, XCircle,
  UserCog, BadgeCheck, Wallet, CalendarClock, DollarSign, Award, CalendarX2, HeartPulse, UserPlus, Mail, CheckSquare, Volume2, Megaphone, Link, ExternalLink, LogOut,
  Lock, Home, Save, UserCheck, Key, RotateCcw, Layers
} from 'lucide-react';
import { theme } from '../global/theme';
import { supabase } from '../lib/supabase';

// Date format helper functions for executive range calendar and comparison
const formatExecRangeStr = (dateObj) => {
  if (!dateObj) return '';
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear() + 543;
  return `${d}/${m}/${y}`;
};

const formatExecDisplayRange = (startStr, endStr) => {
  if (!startStr || !endStr) return 'เลือกช่วงเวลา';
  const startParts = String(startStr).split('-');
  const endParts = String(endStr).split('-');
  if (startParts.length === 3 && endParts.length === 3) {
    const sy = parseInt(startParts[0], 10) + 543;
    const ey = parseInt(endParts[0], 10) + 543;
    return `${startParts[2]}/${startParts[1]}/${sy} - ${endParts[2]}/${endParts[1]}/${ey}`;
  }
  return 'เลือกช่วงเวลา';
};

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
  const headerRef = useRef(null);
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
  const chartScrollContainerRef = useRef(null);
  const [activeTrendIdx, setActiveTrendIdx] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar' | 'mixed'

  // Financial Chart Series Visibility: 'all' | 'income' | 'expense' | 'profit' | 'custom'
  const [chartSeriesFilter, setChartSeriesFilter] = useState('all');
  const [chartVisibleBars, setChartVisibleBars] = useState({ income: true, expense: true, profit: true });
  const [chartVisibleLines, setChartVisibleLines] = useState({
    income: true,
    expense: true,
    profit: true,
    compareProfit: true,
    compareIncome: false,
    compareExpense: false,
  });

  const handleSelectSeriesFilter = useCallback((mode) => {
    if (chartSeriesFilter === mode && mode !== 'all') {
      // Toggle back to all if clicking the currently active single series
      setChartSeriesFilter('all');
      setChartVisibleBars({ income: true, expense: true, profit: true });
      setChartVisibleLines({
        income: true,
        expense: true,
        profit: true,
        compareProfit: true,
        compareIncome: false,
        compareExpense: false,
      });
      return;
    }
    setChartSeriesFilter(mode);
    if (mode === 'all') {
      setChartVisibleBars({ income: true, expense: true, profit: true });
      setChartVisibleLines({
        income: true,
        expense: true,
        profit: true,
        compareProfit: true,
        compareIncome: false,
        compareExpense: false,
      });
    } else if (mode === 'income') {
      setChartVisibleBars({ income: true, expense: false, profit: false });
      setChartVisibleLines({
        income: true,
        expense: false,
        profit: false,
        compareProfit: false,
        compareIncome: true,
        compareExpense: false,
      });
    } else if (mode === 'expense') {
      setChartVisibleBars({ income: false, expense: true, profit: false });
      setChartVisibleLines({
        income: false,
        expense: true,
        profit: false,
        compareProfit: false,
        compareIncome: false,
        compareExpense: true,
      });
    } else if (mode === 'profit') {
      setChartVisibleBars({ income: false, expense: false, profit: true });
      setChartVisibleLines({
        income: false,
        expense: false,
        profit: true,
        compareProfit: true,
        compareIncome: false,
        compareExpense: false,
      });
    }
  }, [chartSeriesFilter]);

  const handleToggleBar = useCallback((key) => {
    setChartVisibleBars(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const anyBarOn = Object.values(next).some(Boolean);
      const anyLineOn = Object.values(chartVisibleLines).some(Boolean);
      if (!anyBarOn && !anyLineOn) {
        return prev;
      }
      return next;
    });
    setChartSeriesFilter('custom');
  }, [chartVisibleLines]);

  const handleToggleLine = useCallback((key) => {
    setChartVisibleLines(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const anyLineOn = Object.values(next).some(Boolean);
      const anyBarOn = Object.values(chartVisibleBars).some(Boolean);
      if (!anyLineOn && !anyBarOn) {
        return prev;
      }
      return next;
    });
    setChartSeriesFilter('custom');
  }, [chartVisibleBars]);

  // Month, Year, Quarter, and Week picker states
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => new Date());
  const [execCalendarMode, setExecCalendarMode] = useState('range'); // 'range' | 'month' | 'year' | 'week'

  // Comparison states
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [compareMode, setCompareMode] = useState('preset'); // 'preset' | 'month' | 'quarter' | 'week' | 'year' | 'custom'
  const [comparePreset, setComparePreset] = useState('previous_period'); // 'previous_period' | 'prev_month' | 'yoy_month' | 'prev_quarter' | 'prev_week' | 'prev_year'
  const [compareMonth, setCompareMonth] = useState(() => {
    const d = new Date();
    return d.getMonth() === 0 ? 11 : d.getMonth() - 1;
  });
  const [compareYear, setCompareYear] = useState(() => {
    const d = new Date();
    return d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  });
  const [compareQuarter, setCompareQuarter] = useState(() => {
    const curQ = Math.floor(new Date().getMonth() / 3) + 1;
    return curQ === 1 ? 4 : curQ - 1;
  });
  const [comparePrimaryYear, setComparePrimaryYear] = useState(() => new Date().getFullYear());
  const [comparePrimaryQuarter, setComparePrimaryQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [comparePrimaryMonth, setComparePrimaryMonth] = useState(() => new Date().getMonth());
  const [compareCustomStart, setCompareCustomStart] = useState('');
  const [compareCustomEnd, setCompareCustomEnd] = useState('');
  const [comparePrimaryCustomStart, setComparePrimaryCustomStart] = useState('');
  const [comparePrimaryCustomEnd, setComparePrimaryCustomEnd] = useState('');
  const [compareWeekDate, setCompareWeekDate] = useState(() => new Date());
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareSummary, setCompareSummary] = useState(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  // Derived chartVisibleSeries for tooltips and summary metrics (adapts to both bars and lines)
  const chartVisibleSeries = useMemo(() => ({
    income: Boolean(
      (chartType !== 'line' && chartVisibleBars.income) ||
      (chartType !== 'bar' && (chartVisibleLines.income || (isCompareActive && chartVisibleLines.compareIncome)))
    ),
    expense: Boolean(
      (chartType !== 'line' && chartVisibleBars.expense) ||
      (chartType !== 'bar' && (chartVisibleLines.expense || (isCompareActive && chartVisibleLines.compareExpense)))
    ),
    profit: Boolean(
      (chartType !== 'line' && chartVisibleBars.profit) ||
      (chartType !== 'bar' && (chartVisibleLines.profit || (isCompareActive && chartVisibleLines.compareProfit)))
    ),
  }), [chartType, chartVisibleBars, chartVisibleLines, isCompareActive]);

  const handlePrevQuarter = useCallback(() => {
    setSelectedQuarter(q => {
      if (q === 1) {
        setSelectedYear(y => y - 1);
        return 4;
      }
      return q - 1;
    });
  }, []);

  const handleNextQuarter = useCallback(() => {
    setSelectedQuarter(q => {
      if (q === 4) {
        setSelectedYear(y => y + 1);
        return 1;
      }
      return q + 1;
    });
  }, []);

  // Wheel scroll throttling ref for quick date cycling
  const wheelThrottleRef = useRef(0);
  const handleWheelStep = useCallback((e, onPrev, onNext) => {
    if (e && e.cancelable) {
      e.preventDefault();
    }
    const now = Date.now();
    if (now - wheelThrottleRef.current < 200) return;
    wheelThrottleRef.current = now;
    if (e.deltaY < 0 || e.deltaX < 0) {
      onPrev();
    } else if (e.deltaY > 0 || e.deltaX > 0) {
      onNext();
    }
  }, []);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsFull = thaiMonths;
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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
      const end = new Date(selectedWeekDate);
      const start = new Date(selectedWeekDate);
      start.setDate(start.getDate() - 6);
      startDate = formatDate(start);
      endDate = formatDate(end);
    } else if (timeRange === 'month') {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      startDate = formatDate(start);
      endDate = formatDate(end);
    } else if (timeRange === 'quarter') {
      const startM = (selectedQuarter - 1) * 3;
      const endM = startM + 2;
      const start = new Date(selectedYear, startM, 1);
      const end = new Date(selectedYear, endM + 1, 0);
      startDate = formatDate(start);
      endDate = formatDate(end);
    } else if (timeRange === 'year') {
      startDate = `${selectedYear}-01-01`;
      endDate = `${selectedYear}-12-31`;
    } else if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    }
    return { startDate, endDate };
  }, [timeRange, selectedMonth, selectedYear, selectedQuarter, selectedWeekDate, customStartDate, customEndDate]);

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

  // Navigation handlers for Month, Year, and Week
  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 0) {
        setSelectedYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 11) {
        setSelectedYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handlePrevYear = () => {
    setSelectedYear(y => y - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(y => y + 1);
  };

  const handlePrevWeek = () => {
    setSelectedWeekDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setSelectedWeekDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleOpenMonthPicker = () => {
    setExecCalendarMode('month');
    setExecRangeCalDate(new Date(selectedYear, selectedMonth, 1));
    setExecRangeCalView('months');
    setShowExecRangeCalendar(true);
  };

  const handleOpenYearPicker = () => {
    setExecCalendarMode('year');
    setExecRangeCalDate(new Date(selectedYear, 0, 1));
    setExecRangeYearPageStart(Math.floor((selectedYear + 543) / 12) * 12);
    setExecRangeCalView('years');
    setShowExecRangeCalendar(true);
  };

  const handleOpenWeekPicker = () => {
    setExecCalendarMode('week');
    setExecRangeCalDate(new Date(selectedWeekDate));
    setExecRangeCalView('days');
    setShowExecRangeCalendar(true);
  };

  // Synchronized Start/End DateTimes for all transaction and stats filtering
  const { startDateTime, endDateTime } = useMemo(() => {
    const now = new Date();
    let s = null, e = null;
    if (timeRange === 'today') {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === 'week') {
      e = new Date(selectedWeekDate);
      e.setHours(23, 59, 59, 999);
      s = new Date(selectedWeekDate);
      s.setDate(s.getDate() - 6);
      s.setHours(0, 0, 0, 0);
    } else if (timeRange === 'month') {
      s = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      e = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    } else if (timeRange === 'quarter') {
      const startM = (selectedQuarter - 1) * 3;
      const endM = startM + 2;
      s = new Date(selectedYear, startM, 1, 0, 0, 0, 0);
      e = new Date(selectedYear, endM + 1, 0, 23, 59, 59, 999);
    } else if (timeRange === 'year') {
      s = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      e = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    } else if (timeRange === 'custom') {
      if (customStartDate) {
        s = new Date(customStartDate);
        s.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        e = new Date(customEndDate);
        e.setHours(23, 59, 59, 999);
      }
    }
    return { startDateTime: s, endDateTime: e };
  }, [timeRange, selectedMonth, selectedYear, selectedQuarter, selectedWeekDate, customStartDate, customEndDate]);

  // Primary period human-readable label
  const primaryPeriodLabel = useMemo(() => {
    if (timeRange === 'today') return 'วันนี้';
    if (timeRange === 'week') {
      const end = new Date(selectedWeekDate);
      const start = new Date(selectedWeekDate);
      start.setDate(start.getDate() - 6);
      return `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
    }
    if (timeRange === 'month') return `${thaiMonthsShort[selectedMonth]} ${selectedYear + 543}`;
    if (timeRange === 'quarter') return `ไตรมาส ${selectedQuarter} (Q${selectedQuarter}) ${selectedYear + 543}`;
    if (timeRange === 'year') return `ปี ${selectedYear + 543}`;
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return formatExecDisplayRange(customStartDate, customEndDate);
    }
    return 'ทั้งหมด';
  }, [timeRange, selectedMonth, selectedYear, selectedQuarter, selectedWeekDate, customStartDate, customEndDate, thaiMonthsShort]);

  // Comparison Date Range Calculation
  const compDateRange = useMemo(() => {
    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let startDate = '';
    let endDate = '';
    let label = '';
    let year = compareYear;
    let month = compareMonth;
    let quarter = null;

    if (compareMode === 'preset') {
      if (comparePreset === 'prev_month') {
        const curM = selectedMonth;
        const curY = selectedYear;
        month = curM === 0 ? 11 : curM - 1;
        year = curM === 0 ? curY - 1 : curY;
        const s = new Date(year, month, 1);
        const e = new Date(year, month + 1, 0);
        startDate = formatDate(s);
        endDate = formatDate(e);
        label = `${thaiMonthsShort[month]} ${year + 543}`;
      } else if (comparePreset === 'yoy_month') {
        month = selectedMonth;
        year = selectedYear - 1;
        const s = new Date(year, month, 1);
        const e = new Date(year, month + 1, 0);
        startDate = formatDate(s);
        endDate = formatDate(e);
        label = `${thaiMonthsShort[month]} ${year + 543}`;
      } else if (comparePreset === 'prev_quarter') {
        const curQ = timeRange === 'quarter' ? selectedQuarter : (Math.floor(selectedMonth / 3) + 1);
        const prevQ = curQ === 1 ? 4 : curQ - 1;
        year = curQ === 1 ? selectedYear - 1 : selectedYear;
        quarter = prevQ;
        const startM = (prevQ - 1) * 3;
        const endM = startM + 2;
        const s = new Date(year, startM, 1);
        const e = new Date(year, endM + 1, 0);
        startDate = formatDate(s);
        endDate = formatDate(e);
        label = `ไตรมาส ${prevQ} (Q${prevQ}) ${year + 543}`;
      } else if (comparePreset === 'prev_week') {
        const end = new Date(selectedWeekDate);
        end.setDate(end.getDate() - 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        startDate = formatDate(start);
        endDate = formatDate(end);
        label = `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
      } else if (comparePreset === 'prev_year') {
        year = selectedYear - 1;
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
        label = `ปี ${year + 543}`;
      } else {
        // default automatic previous_period
        if (timeRange === 'quarter') {
          const prevQ = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
          year = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
          quarter = prevQ;
          const startM = (prevQ - 1) * 3;
          const endM = startM + 2;
          const s = new Date(year, startM, 1);
          const e = new Date(year, endM + 1, 0);
          startDate = formatDate(s);
          endDate = formatDate(e);
          label = `ไตรมาส ${prevQ} (Q${prevQ}) ${year + 543}`;
        } else if (timeRange === 'month') {
          month = selectedMonth === 0 ? 11 : selectedMonth - 1;
          year = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
          const s = new Date(year, month, 1);
          const e = new Date(year, month + 1, 0);
          startDate = formatDate(s);
          endDate = formatDate(e);
          label = `${thaiMonthsShort[month]} ${year + 543}`;
        } else if (timeRange === 'year') {
          year = selectedYear - 1;
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
          label = `ปี ${year + 543}`;
        } else if (timeRange === 'week') {
          const end = new Date(selectedWeekDate);
          end.setDate(end.getDate() - 7);
          const start = new Date(end);
          start.setDate(start.getDate() - 6);
          startDate = formatDate(start);
          endDate = formatDate(end);
          label = `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
        } else if (timeRange === 'custom' && customStartDate && customEndDate) {
          const s = new Date(customStartDate);
          const e = new Date(customEndDate);
          const diffMs = e - s;
          const compEnd = new Date(s);
          compEnd.setDate(compEnd.getDate() - 1);
          const compStart = new Date(compEnd.getTime() - diffMs);
          startDate = formatDate(compStart);
          endDate = formatDate(compEnd);
          label = `${compStart.getDate()}/${compStart.getMonth() + 1} - ${compEnd.getDate()}/${compEnd.getMonth() + 1}`;
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = formatDate(yesterday);
          endDate = formatDate(yesterday);
          label = 'เมื่อวานนี้';
        }
      }
    } else if (compareMode === 'month') {
      year = compareYear;
      month = compareMonth;
      const s = new Date(year, month, 1);
      const e = new Date(year, month + 1, 0);
      startDate = formatDate(s);
      endDate = formatDate(e);
      label = `${thaiMonthsShort[month]} ${year + 543}`;
    } else if (compareMode === 'quarter') {
      year = compareYear;
      const q = compareQuarter;
      quarter = q;
      const startM = (q - 1) * 3;
      const endM = startM + 2;
      const s = new Date(year, startM, 1);
      const e = new Date(year, endM + 1, 0);
      startDate = formatDate(s);
      endDate = formatDate(e);
      label = `ไตรมาส ${q} (Q${q}) ${year + 543}`;
    } else if (compareMode === 'week') {
      const end = new Date(compareWeekDate || selectedWeekDate);
      end.setDate(end.getDate() - 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      startDate = formatDate(start);
      endDate = formatDate(end);
      label = `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
    } else if (compareMode === 'year') {
      year = compareYear;
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      label = `ปี ${year + 543}`;
    } else if (compareMode === 'custom') {
      startDate = compareCustomStart || customStartDate;
      endDate = compareCustomEnd || customEndDate;
      label = formatExecDisplayRange(startDate, endDate);
    }

    return { startDate, endDate, label, year, month, quarter };
  }, [compareMode, comparePreset, compareYear, compareMonth, compareQuarter, compareCustomStart, compareCustomEnd, selectedYear, selectedMonth, selectedQuarter, selectedWeekDate, timeRange, customStartDate, customEndDate, thaiMonthsShort]);

  // Fetch Comparison Data from Supabase RPC
  useEffect(() => {
    if (!isCompareActive || !compDateRange.startDate || !compDateRange.endDate) {
      setCompareSummary(null);
      return;
    }

    const fetchCompareData = async () => {
      setIsCompareLoading(true);
      try {
        const branchFilter = selectedBranch || 'all';
        let fetched = false;

        try {
          const { data: compDbData, error: compErr } = await supabase.rpc('get_executive_dashboard_data', {
            start_date: compDateRange.startDate,
            end_date: compDateRange.endDate,
            branch_filter: branchFilter
          });

          if (!compErr && compDbData && compDbData.summary) {
            const s = compDbData.summary;
            setCompareSummary({
              income: Number(s.total_income) || 0,
              expense: Number(s.total_expense) || 0,
              netProfit: Number(s.net_profit) || 0,
              dailyTrend: compDbData.daily_trend || []
            });
            fetched = true;
          }
        } catch (rpcErr) {
          console.warn('Comparison RPC fallback:', rpcErr);
        }

        // Local fallback calculation if RPC returned error
        if (!fetched) {
          const compS = new Date(compDateRange.startDate);
          const compE = new Date(compDateRange.endDate);
          compE.setHours(23, 59, 59, 999);

          let inc = 0, exp = 0;
          const dailyMap = {};
          (financeData || []).concat(posHistoryData || []).forEach(tx => {
            if (!tx) return;
            if (tx.status === 'cancelled' || tx.is_deleted) return;
            if (selectedBranch !== 'all' && tx.branchId !== selectedBranch && tx.branch_id !== selectedBranch) return;
            const d = parseAnyDate ? parseAnyDate(tx.date || tx.datetime || tx.createdAt || tx.created_at) : new Date(tx.date || tx.datetime || tx.createdAt || tx.created_at);
            if (!d || isNaN(d.getTime()) || d < compS || d > compE) return;
            const amt = Number(tx.amount || tx.net_amount || tx.total_amount || 0);
            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, income: 0, expense: 0 };
            if (tx.type === 'income' || tx.payment_method || tx.paymentMethod) {
              inc += amt;
              dailyMap[dayKey].income += amt;
            } else if (tx.type === 'expense') {
              exp += amt;
              dailyMap[dayKey].expense += amt;
            }
          });

          setCompareSummary({
            income: inc,
            expense: exp,
            netProfit: inc - exp,
            dailyTrend: Object.values(dailyMap)
          });
        }
      } catch (err) {
        console.error('Fetch compare error:', err);
      } finally {
        setIsCompareLoading(false);
      }
    };

    fetchCompareData();
  }, [isCompareActive, compDateRange, selectedBranch, financeData, posHistoryData]);

  // --- States และฟังก์ชันสไตล์ปฏิทินของธีมหลักสำหรับปฏิทินเลือกช่วงเวลา ---
  const [showExecRangeCalendar, setShowExecRangeCalendar] = useState(false);
  const [execRangeCalDate, setExecRangeCalDate] = useState(new Date());
  const [execRangeCalView, setExecRangeCalView] = useState('days');
  const [execRangeYearPageStart, setExecRangeYearPageStart] = useState(0);
  const [execTempStartDate, setExecTempStartDate] = useState(null);
  const [execTempEndDate, setExecTempEndDate] = useState(null);
  const [isExecRangeClosing, setIsExecRangeClosing] = useState(false);

  useEffect(() => {
      if (execRangeCalView === 'years') setExecRangeYearPageStart(Math.floor((execRangeCalDate.getFullYear() + 543) / 12) * 12);
  }, [execRangeCalView, execRangeCalDate]);

  const closeExecRangeCalendar = () => {
      setIsExecRangeClosing(true);
      setTimeout(() => { setShowExecRangeCalendar(false); setIsExecRangeClosing(false); }, 300);
  };
  const execRangeSwipeProps = useSwipeDown(closeExecRangeCalendar);

  const handleOpenExecRange = () => {
      setExecCalendarMode('range');
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

  const handleOpenCompareRange = () => {
      setExecCalendarMode('compare_range');
      const sDate = compareCustomStart ? new Date(compareCustomStart) : (customStartDate ? new Date(customStartDate) : new Date());
      const eDate = compareCustomEnd ? new Date(compareCustomEnd) : (customEndDate ? new Date(customEndDate) : new Date());
      setExecTempStartDate(sDate);
      setExecTempEndDate(eDate);
      setExecRangeCalDate(new Date(sDate));
      setExecRangeCalView('days');
      setShowExecRangeCalendar(true);
  };

  const handleOpenComparePrimaryRange = () => {
      setExecCalendarMode('compare_primary_range');
      const sDate = comparePrimaryCustomStart ? new Date(comparePrimaryCustomStart) : (customStartDate ? new Date(customStartDate) : new Date());
      const eDate = comparePrimaryCustomEnd ? new Date(comparePrimaryCustomEnd) : (customEndDate ? new Date(customEndDate) : new Date());
      setExecTempStartDate(sDate);
      setExecTempEndDate(eDate);
      setExecRangeCalDate(new Date(sDate));
      setExecRangeCalView('days');
      setShowExecRangeCalendar(true);
  };

  const handleOpenCompareWeek = () => {
      setExecCalendarMode('compare_week');
      setExecRangeCalDate(new Date(compareWeekDate || selectedWeekDate));
      setExecRangeCalView('days');
      setShowExecRangeCalendar(true);
  };

  const handleSelectExecRangeDate = (day) => {
      const selectedDate = new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth(), day);
      selectedDate.setHours(0,0,0,0);

      if (execCalendarMode === 'week') {
          setSelectedWeekDate(selectedDate);
          closeExecRangeCalendar();
          return;
      }

      if (execCalendarMode === 'compare_week') {
          setCompareWeekDate(selectedDate);
          setIsCompareActive(true);
          closeExecRangeCalendar();
          return;
      }

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
          const startStr = `${startYear}-${startMonth}-${startDay}`;

          const endYear = execTempEndDate.getFullYear();
          const endMonth = String(execTempEndDate.getMonth() + 1).padStart(2, '0');
          const endDay = String(execTempEndDate.getDate()).padStart(2, '0');
          const endStr = `${endYear}-${endMonth}-${endDay}`;

          if (execCalendarMode === 'compare_range') {
              setCompareCustomStart(startStr);
              setCompareCustomEnd(endStr);
              setIsCompareActive(true);
          } else if (execCalendarMode === 'compare_primary_range') {
              setComparePrimaryCustomStart(startStr);
              setComparePrimaryCustomEnd(endStr);
              setCustomStartDate(startStr);
              setCustomEndDate(endStr);
          } else {
              setCustomStartDate(startStr);
              setCustomEndDate(endStr);
          }

          closeExecRangeCalendar();
      } else {
          showToast('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด', 'warning');
      }
  };

  const blankExecRangeDays = Array.from({ length: new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthExecRangeDays = Array.from({ length: new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

  useEffect(() => {
    setSelectedBranch(currentBranch);
  }, [currentBranch]);

  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container') || document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = rAFThrottle((e) => {
      const target = e.target || mainElement;
      const scrollTop = target.scrollTop || 0;
      if (headerRef.current) {
        if (scrollTop > 20) {
          headerRef.current.classList.add('is-scrolled');
        } else {
          headerRef.current.classList.remove('is-scrolled');
        }
      }
    });

    // Check initial scroll status
    setTimeout(() => {
      if (mainElement && headerRef.current) {
        if (mainElement.scrollTop > 20) {
          headerRef.current.classList.add('is-scrolled');
        } else {
          headerRef.current.classList.remove('is-scrolled');
        }
      }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
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
    const fetchRangeSpecificData = async () => {
      if (!startDateTime || !endDateTime) return;
      try {
        const startIso = startDateTime.toISOString();
        const endIso = endDateTime.toISOString();

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
      } catch (e) {
        console.error("Dashboard range fetch error", e);
      }
    };

    fetchRangeSpecificData();
  }, [startDateTime, endDateTime]);

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
    const startDate = startDateTime;
    const endDate = endDateTime;

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
  }, [allTransactions, selectedBranch, startDateTime, endDateTime]);

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

    const startDate = startDateTime;
    const endDate = endDateTime;

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

      // 1. คำนวณค่า DF หัตถการสำหรับแพทย์
      if (matchedDoctorId && stats[matchedDoctorId]) {
        const docStat = stats[matchedDoctorId];
        docStat.checkouts++;
        docStat.dfCases++;

        if (!dailyDocCounts[matchedDoctorId]) dailyDocCounts[matchedDoctorId] = {};
        dailyDocCounts[matchedDoctorId][dayKey] = (dailyDocCounts[matchedDoctorId][dayKey] || 0) + 1;
        const currentDocCount = dailyDocCounts[matchedDoctorId][dayKey];

        let isQualifiedForDf = false;
        if (docStat.dfCondition === 'all') {
          isQualifiedForDf = true;
        } else if (docStat.dfCondition === 'after_n_cases' && currentDocCount > docStat.dfThreshold) {
          isQualifiedForDf = true;
        }

        if (isQualifiedForDf && docStat.dfRate > 0) {
          let dfFee = 0;
          if (docStat.dfType === 'percent') {
            dfFee = (net * docStat.dfRate) / 100;
          } else if (docStat.dfType === 'fixed') {
            dfFee = docStat.dfRate;
          }
          docStat.dfCommission += dfFee;
          docStat.commission += dfFee;
        }
      }

      // 2. คำนวณค่าคอมมิชชั่นยอดขายสำหรับพนักงานขาย
      let isSellerQualified = false;
      let sellerRate = 0;
      let sellerType = 'percent';

      if (matchedSellerId && stats[matchedSellerId]) {
        const seller = stats[matchedSellerId];
        if (!dailySellerCounts[matchedSellerId]) dailySellerCounts[matchedSellerId] = {};
        dailySellerCounts[matchedSellerId][dayKey] = (dailySellerCounts[matchedSellerId][dayKey] || 0) + 1;
        const currentSellerCount = dailySellerCounts[matchedSellerId][dayKey];

        if (seller.commissionCondition === 'all') {
          isSellerQualified = true;
        } else if (seller.commissionCondition === 'after_n_cases' && currentSellerCount > seller.commissionThreshold) {
          isSellerQualified = true;
        }
        sellerRate = seller.rate;
        sellerType = seller.type;
      }

      if (isSellerQualified && sellerRate > 0 && matchedSellerId && stats[matchedSellerId]) {
        let sellerFee = 0;
        if (sellerType === 'percent') {
          sellerFee = (net * sellerRate) / 100;
        } else if (sellerType === 'fixed') {
          sellerFee = sellerRate;
        }

        const sellerStat = stats[matchedSellerId];
        sellerStat.salesCases++;
        if (!matchedDoctorId || matchedDoctorId !== matchedSellerId) {
          sellerStat.checkouts++;
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
  }, [staffData, posHistoryData, localPosHistory, selectedBranch, startDateTime, endDateTime]);

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
  }, [selectedBranch, startDateTime, endDateTime]);

  // Calculate All Selling Products/Services - คำนวณยอดขายสุทธิของสินค้า/บริการแต่ละตัวหลังหักส่วนลดท้ายบิล
  const allTopProducts = useMemo(() => {
    const productsMap = {};
    const startDate = startDateTime;
    const endDate = endDateTime;

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
  }, [posHistoryData, localPosHistory, selectedBranch, startDateTime, endDateTime]);

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
      pointsCount = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    } else if (timeRange === 'quarter') {
      granularity = 'monthly';
      pointsCount = 3;
    } else if (timeRange === 'year') {
      granularity = 'monthly';
      pointsCount = 12;
    } else if (timeRange === 'custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays <= 92) {
          granularity = 'daily';
          pointsCount = diffDays;
        } else {
          granularity = 'monthly';
          const yearDiff = end.getFullYear() - start.getFullYear();
          const monthDiff = end.getMonth() - start.getMonth();
          pointsCount = Math.max(1, Math.min(36, yearDiff * 12 + monthDiff + 1));
        }
      } else {
        granularity = 'daily';
        pointsCount = 7;
      }
    }

    if (granularity === 'daily') {
      if (timeRange === 'today' || timeRange === 'week') {
        const refDate = timeRange === 'today' ? new Date() : new Date(selectedWeekDate);
        const startOfWeek = new Date(refDate);
        startOfWeek.setDate(startOfWeek.getDate() - 6);
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
          const d = new Date(selectedYear, selectedMonth, day);
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
            fullLabel: `วันที่ ${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${y + 543}`,
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

          const showLabel = pointsCount <= 10 
            ? true 
            : pointsCount <= 20 
            ? (i === 0 || i === pointsCount - 1 || d.getDate() % 2 === 0)
            : pointsCount <= 35 
            ? (i === 0 || i === pointsCount - 1 || d.getDate() % 5 === 0)
            : pointsCount <= 65
            ? (i === 0 || i === pointsCount - 1 || d.getDate() === 1 || d.getDate() % 10 === 0)
            : (i === 0 || i === pointsCount - 1 || d.getDate() === 1 || d.getDate() % 15 === 0);

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
            profit: parseFloat(matched.profit ?? ((matched.income || 0) - (matched.expense || 0)))
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
      if (timeRange === 'quarter') {
        const targetYear = selectedYear;
        const startM = (selectedQuarter - 1) * 3;
        for (let offset = 0; offset < 3; offset++) {
          const mIndex = startM + offset;
          const d = new Date(targetYear, mIndex, 1);
          let inc = 0, exp = 0;
          Object.keys(trendMap).forEach(k => {
            if (k.startsWith(`${targetYear}-${String(mIndex + 1).padStart(2, '0')}`)) {
              inc += parseFloat(trendMap[k].income || 0);
              exp += parseFloat(trendMap[k].expense || 0);
            }
          });

          const mStr = String(mIndex + 1).padStart(2, '0');
          const yStr = String(targetYear + 543).slice(-2);

          trends.push({
            type: 'monthly',
            date: d,
            year: targetYear,
            month: mIndex,
            monthLabel: `${thaiMonthsShort[mIndex]} (${mStr}/${yStr})`,
            fullLabel: `${thaiMonthsFull[mIndex]} (${mStr}/${yStr}) พ.ศ. ${targetYear + 543}`,
            income: inc,
            expense: exp,
            profit: inc - exp
          });
        }
      } else if (timeRange === 'year') {
        const targetYear = selectedYear;
        for (let mIndex = 0; mIndex < 12; mIndex++) {
          const d = new Date(targetYear, mIndex, 1);
          let inc = 0, exp = 0;
          Object.keys(trendMap).forEach(k => {
            if (k.startsWith(`${targetYear}-${String(mIndex + 1).padStart(2, '0')}`)) {
              inc += parseFloat(trendMap[k].income || 0);
              exp += parseFloat(trendMap[k].expense || 0);
            }
          });

          trends.push({
            type: 'monthly',
            date: d,
            year: targetYear,
            month: mIndex,
            monthLabel: thaiMonthsShort[mIndex],
            fullLabel: `${thaiMonthsFull[mIndex]} ${targetYear + 543}`,
            income: inc,
            expense: exp,
            profit: inc - exp
          });
        }
      } else if (timeRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const last = new Date(end.getFullYear(), end.getMonth(), 1);

        while (cur <= last) {
          const curY = cur.getFullYear();
          const curM = cur.getMonth();
          const mKeyPrefix = `${curY}-${String(curM + 1).padStart(2, '0')}`;

          let inc = 0, exp = 0;
          Object.keys(trendMap).forEach(k => {
            if (k.startsWith(mKeyPrefix)) {
              inc += parseFloat(trendMap[k].income || 0);
              exp += parseFloat(trendMap[k].expense || 0);
            }
          });

          trends.push({
            type: 'monthly',
            date: new Date(cur),
            year: curY,
            month: curM,
            monthLabel: `${thaiMonthsShort[curM]} ${String(curY + 543).slice(-2)}`,
            fullLabel: `${thaiMonthsFull[curM]} ${curY + 543}`,
            income: inc,
            expense: exp,
            profit: inc - exp
          });

          cur.setMonth(cur.getMonth() + 1);
        }
      }
    }

    return trends;
  }, [execSummary, timeRange, selectedMonth, selectedYear, selectedQuarter, selectedWeekDate, customStartDate, customEndDate]);

  // Comparison trends data aligned to the primary points
  const compareTrends = useMemo(() => {
    if (!isCompareActive || !compareSummary) return [];

    const compTrendList = Array.isArray(compareSummary.dailyTrend) ? compareSummary.dailyTrend : [];
    const compareMap = {};
    compTrendList.forEach(item => {
      if (item.date) {
        const key = String(item.date).split('T')[0];
        compareMap[key] = item;
      }
    });

    if (timeRange === 'month') {
      const compYear = compDateRange.year;
      const compMonth = compDateRange.month;
      return monthlyTrends.map((t, idx) => {
        const day = idx + 1;
        const y = compYear;
        const m = String(compMonth + 1).padStart(2, '0');
        const dy = String(day).padStart(2, '0');
        const key = `${y}-${m}-${dy}`;
        const matched = compareMap[key] || {};
        const inc = parseFloat(matched.income || 0);
        const exp = parseFloat(matched.expense || 0);
        return {
          day,
          income: inc,
          expense: exp,
          profit: parseFloat(matched.profit ?? (inc - exp))
        };
      });
    } else if (timeRange === 'quarter' || compareMode === 'quarter') {
      const compYear = compDateRange.year || compareYear || selectedYear;
      const compQ = compDateRange.quarter || compareQuarter || (selectedQuarter === 1 ? 4 : selectedQuarter - 1);
      const startM = (compQ - 1) * 3;
      return monthlyTrends.map((t, idx) => {
        const mIndex = startM + idx;
        let inc = 0, exp = 0;
        Object.keys(compareMap).forEach(k => {
          if (k.startsWith(`${compYear}-${String(mIndex + 1).padStart(2, '0')}`)) {
            inc += parseFloat(compareMap[k].income || 0);
            exp += parseFloat(compareMap[k].expense || 0);
          }
        });
        const mStr = String(mIndex + 1).padStart(2, '0');
        const yStr = String(compYear + 543).slice(-2);
        return {
          month: mIndex,
          monthLabel: `${thaiMonthsShort[mIndex]} (${mStr}/${yStr})`,
          fullLabel: `${thaiMonthsFull[mIndex]} (${mStr}/${yStr}) พ.ศ. ${compYear + 543}`,
          income: inc,
          expense: exp,
          profit: inc - exp
        };
      });
    } else if (timeRange === 'year') {
      const compYear = compDateRange.year;
      return monthlyTrends.map((t, mIndex) => {
        let inc = 0, exp = 0;
        Object.keys(compareMap).forEach(k => {
          if (k.startsWith(`${compYear}-${String(mIndex + 1).padStart(2, '0')}`)) {
            inc += parseFloat(compareMap[k].income || 0);
            exp += parseFloat(compareMap[k].expense || 0);
          }
        });
        return {
          month: mIndex,
          monthLabel: thaiMonthsShort[mIndex],
          fullLabel: `${thaiMonthsFull[mIndex]} ${compYear + 543}`,
          income: inc,
          expense: exp,
          profit: inc - exp
        };
      });
    } else if (timeRange === 'custom') {
      const compStart = compDateRange.startDate ? new Date(compDateRange.startDate) : null;
      return monthlyTrends.map((t, idx) => {
        let inc = 0, exp = 0;
        if (t.type === 'monthly') {
          if (compStart) {
            const compMDate = new Date(compStart.getFullYear(), compStart.getMonth() + idx, 1);
            const compY = compMDate.getFullYear();
            const compM = compMDate.getMonth();
            const mKeyPrefix = `${compY}-${String(compM + 1).padStart(2, '0')}`;
            Object.keys(compareMap).forEach(k => {
              if (k.startsWith(mKeyPrefix)) {
                inc += parseFloat(compareMap[k].income || 0);
                exp += parseFloat(compareMap[k].expense || 0);
              }
            });
            return {
              month: compM,
              monthLabel: `${thaiMonthsShort[compM]} ${String(compY + 543).slice(-2)}`,
              fullLabel: `${thaiMonthsFull[compM]} ${compY + 543}`,
              income: inc,
              expense: exp,
              profit: inc - exp
            };
          }
        } else {
          // daily
          if (compStart) {
            const compD = new Date(compStart);
            compD.setDate(compStart.getDate() + idx);
            const y = compD.getFullYear();
            const m = String(compD.getMonth() + 1).padStart(2, '0');
            const dy = String(compD.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${dy}`;
            const matched = compareMap[key] || {};
            inc = parseFloat(matched.income || 0);
            exp = parseFloat(matched.expense || 0);
          } else {
            const matched = compTrendList[idx] || {};
            inc = parseFloat(matched.income || 0);
            exp = parseFloat(matched.expense || 0);
          }
        }
        return {
          income: inc,
          expense: exp,
          profit: inc - exp
        };
      });
    } else {
      return monthlyTrends.map((t, idx) => {
        const matched = compTrendList[idx] || {};
        const inc = parseFloat(matched.income || 0);
        const exp = parseFloat(matched.expense || 0);
        return {
          income: inc,
          expense: exp,
          profit: parseFloat(matched.profit ?? (inc - exp))
        };
      });
    }
  }, [isCompareActive, compareSummary, timeRange, compareMode, compareQuarter, compareYear, selectedYear, monthlyTrends, compDateRange]);

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

  // Combined max trend value for accurate scaling (adapts to visible series)
  const maxTrendValue = useMemo(() => {
    let max = 0;
    monthlyTrends.forEach(t => {
      if (chartVisibleSeries.income && t.income > max) max = t.income;
      if (chartVisibleSeries.expense && t.expense > max) max = t.expense;
      if (chartVisibleSeries.profit) {
        const p = Math.abs(t.profit ?? (t.income - t.expense));
        if (p > max) max = p;
      }
    });
    if (isCompareActive && compareTrends.length) {
      compareTrends.forEach(t => {
        if (chartVisibleSeries.income && t.income > max) max = t.income;
        if (chartVisibleSeries.expense && t.expense > max) max = t.expense;
        if (chartVisibleSeries.profit) {
          const p = Math.abs(t.profit ?? (t.income - t.expense));
          if (p > max) max = p;
        }
      });
    }
    return Math.max(max, 1000);
  }, [monthlyTrends, isCompareActive, compareTrends, chartVisibleSeries]);

  const CHART_TOP_Y = 16;
  const CHART_BOTTOM_Y = 138;
  const CHART_HEIGHT_PX = 122;

  // Primary Income Line Points
  const incomePoints = useMemo(() => {
    return monthlyTrends.map((t, idx) => {
      const inc = t.income || 0;
      const valRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, inc) / maxTrendValue) : 0;
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = inc > 0 ? (CHART_BOTTOM_Y - valRatio * CHART_HEIGHT_PX) : CHART_BOTTOM_Y;
      const dotPct = (valRatio * (CHART_HEIGHT_PX / 144)) * 100;
      const topPct = (y / 144) * 100;
      const pct = valRatio * 85;
      return { x, y, pct, dotPct, topPct, value: inc, hasValue: inc > 0 };
    });
  }, [monthlyTrends, maxTrendValue]);

  const incomeLinePath = useMemo(() => {
    return incomePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [incomePoints]);

  const incomeAreaPath = useMemo(() => {
    if (!incomePoints.length) return '';
    const first = incomePoints[0];
    const last = incomePoints[incomePoints.length - 1];
    const lineCommands = incomePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return `${lineCommands} L ${last.x.toFixed(1)} ${CHART_BOTTOM_Y} L ${first.x.toFixed(1)} ${CHART_BOTTOM_Y} Z`;
  }, [incomePoints]);

  // Comparison Income Line Points
  const compareIncomePoints = useMemo(() => {
    if (!isCompareActive || !compareTrends.length) return [];
    return compareTrends.map((t, idx) => {
      const inc = t.income || 0;
      const valRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, inc) / maxTrendValue) : 0;
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = inc > 0 ? (CHART_BOTTOM_Y - valRatio * CHART_HEIGHT_PX) : CHART_BOTTOM_Y;
      const dotPct = (valRatio * (CHART_HEIGHT_PX / 144)) * 100;
      const topPct = (y / 144) * 100;
      const pct = valRatio * 85;
      return { x, y, pct, dotPct, topPct, value: inc, hasValue: inc > 0 };
    });
  }, [isCompareActive, compareTrends, maxTrendValue, monthlyTrends.length]);

  const compareIncomeLinePath = useMemo(() => {
    if (!compareIncomePoints.length) return '';
    return compareIncomePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [compareIncomePoints]);

  // Primary Expense Line Points
  const expensePoints = useMemo(() => {
    return monthlyTrends.map((t, idx) => {
      const exp = t.expense || 0;
      const valRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, exp) / maxTrendValue) : 0;
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = exp > 0 ? (CHART_BOTTOM_Y - valRatio * CHART_HEIGHT_PX) : CHART_BOTTOM_Y;
      const dotPct = (valRatio * (CHART_HEIGHT_PX / 144)) * 100;
      const topPct = (y / 144) * 100;
      const pct = valRatio * 85;
      return { x, y, pct, dotPct, topPct, value: exp, hasValue: exp > 0 };
    });
  }, [monthlyTrends, maxTrendValue]);

  const expenseLinePath = useMemo(() => {
    return expensePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [expensePoints]);

  const expenseAreaPath = useMemo(() => {
    if (!expensePoints.length) return '';
    const first = expensePoints[0];
    const last = expensePoints[expensePoints.length - 1];
    const lineCommands = expensePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return `${lineCommands} L ${last.x.toFixed(1)} ${CHART_BOTTOM_Y} L ${first.x.toFixed(1)} ${CHART_BOTTOM_Y} Z`;
  }, [expensePoints]);

  // Comparison Expense Line Points
  const compareExpensePoints = useMemo(() => {
    if (!isCompareActive || !compareTrends.length) return [];
    return compareTrends.map((t, idx) => {
      const exp = t.expense || 0;
      const valRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, exp) / maxTrendValue) : 0;
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = exp > 0 ? (CHART_BOTTOM_Y - valRatio * CHART_HEIGHT_PX) : CHART_BOTTOM_Y;
      const dotPct = (valRatio * (CHART_HEIGHT_PX / 144)) * 100;
      const topPct = (y / 144) * 100;
      const pct = valRatio * 85;
      return { x, y, pct, dotPct, topPct, value: exp, hasValue: exp > 0 };
    });
  }, [isCompareActive, compareTrends, maxTrendValue, monthlyTrends.length]);

  const compareExpenseLinePath = useMemo(() => {
    if (!compareExpensePoints.length) return '';
    return compareExpensePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [compareExpensePoints]);

  // Primary Net Profit Line Points
  const netProfitPoints = useMemo(() => {
    return monthlyTrends.map((t, idx) => {
      const netProfit = t.income - t.expense;
      const valRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, netProfit) / maxTrendValue) : 0;
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = netProfit > 0 ? (CHART_BOTTOM_Y - valRatio * CHART_HEIGHT_PX) : CHART_BOTTOM_Y;
      const dotPct = (valRatio * (CHART_HEIGHT_PX / 144)) * 100;
      const topPct = (y / 144) * 100;
      const pct = valRatio * 85;
      return { x, y, pct, dotPct, topPct, netProfit, value: netProfit, hasValue: netProfit > 0 };
    });
  }, [monthlyTrends, maxTrendValue]);

  const financialLinePath = useMemo(() => {
    return netProfitPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [netProfitPoints]);

  const profitAreaPath = useMemo(() => {
    if (!netProfitPoints.length) return '';
    const first = netProfitPoints[0];
    const last = netProfitPoints[netProfitPoints.length - 1];
    const lineCommands = netProfitPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return `${lineCommands} L ${last.x.toFixed(1)} ${CHART_BOTTOM_Y} L ${first.x.toFixed(1)} ${CHART_BOTTOM_Y} Z`;
  }, [netProfitPoints]);

  // Comparison Net Profit Line Points
  const compareNetProfitPoints = useMemo(() => {
    if (!isCompareActive || !compareTrends.length) return [];
    return compareTrends.map((t, idx) => {
      const netProfit = t.profit ?? (t.income - t.expense);
      const valRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, netProfit) / maxTrendValue) : 0;
      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
      const y = netProfit > 0 ? (CHART_BOTTOM_Y - valRatio * CHART_HEIGHT_PX) : CHART_BOTTOM_Y;
      const dotPct = (valRatio * (CHART_HEIGHT_PX / 144)) * 100;
      const topPct = (y / 144) * 100;
      const pct = valRatio * 85;
      return { x, y, pct, dotPct, topPct, netProfit, value: netProfit, hasValue: netProfit > 0, income: t.income, expense: t.expense };
    });
  }, [isCompareActive, compareTrends, maxTrendValue, monthlyTrends.length]);

  const compareFinancialLinePath = useMemo(() => {
    if (!compareNetProfitPoints.length) return '';
    return compareNetProfitPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [compareNetProfitPoints]);

  // Comparison statistics diff for KPI Cards
  const compareDiffStats = useMemo(() => {
    if (!isCompareActive || !compareSummary) return null;
    const primInc = summary.income || 0;
    const compInc = compareSummary.income || 0;
    const incDiff = primInc - compInc;
    const incPct = compInc > 0 ? (incDiff / compInc) * 100 : (primInc > 0 ? 100 : 0);

    const primExp = summary.expense || 0;
    const compExp = compareSummary.expense || 0;
    const expDiff = primExp - compExp;
    const expPct = compExp > 0 ? (expDiff / compExp) * 100 : (primExp > 0 ? 100 : 0);

    const primProfit = summary.netProfit || 0;
    const compProfit = compareSummary.netProfit || 0;
    const profitDiff = primProfit - compProfit;
    const profitPct = compProfit !== 0 ? (profitDiff / Math.abs(compProfit)) * 100 : (primProfit > 0 ? 100 : 0);

    return {
      incDiff,
      incPct,
      expDiff,
      expPct,
      profitDiff,
      profitPct,
      compareLabel: compDateRange.label
    };
  }, [isCompareActive, compareSummary, summary, compDateRange]);

  // Detailed summary statistics for Primary period (available both standalone and for comparison)
  const primaryStats = useMemo(() => {
    if (!monthlyTrends || monthlyTrends.length === 0) return null;

    let maxIncome = { amount: 0, label: '-' };
    let minIncome = { amount: Infinity, label: '-' };
    let maxExpense = { amount: 0, label: '-' };
    let minExpense = { amount: Infinity, label: '-' };
    let maxProfit = { amount: -Infinity, label: '-' };
    let minProfit = { amount: Infinity, label: '-' };

    let positiveProfitDays = 0;
    let daysWithIncome = 0;
    let daysWithExpense = 0;

    monthlyTrends.forEach(t => {
      const pNet = t.profit ?? (t.income - t.expense);
      const lbl = t.fullLabel || t.monthLabel || `วันที่ ${t.day || ''}`;
      if (t.income > maxIncome.amount) maxIncome = { amount: t.income, label: lbl };
      if (t.income > 0 && t.income < minIncome.amount) minIncome = { amount: t.income, label: lbl };
      if (t.expense > maxExpense.amount) maxExpense = { amount: t.expense, label: lbl };
      if (t.expense > 0 && t.expense < minExpense.amount) minExpense = { amount: t.expense, label: lbl };
      if (pNet > maxProfit.amount) maxProfit = { amount: pNet, label: lbl };
      if (pNet < minProfit.amount) minProfit = { amount: pNet, label: lbl };

      if (pNet > 0) positiveProfitDays++;
      if (t.income > 0) daysWithIncome++;
      if (t.expense > 0) daysWithExpense++;
    });

    if (minIncome.amount === Infinity) minIncome.amount = 0;
    if (minExpense.amount === Infinity) minExpense.amount = 0;
    if (maxProfit.amount === -Infinity) maxProfit.amount = 0;
    if (minProfit.amount === Infinity) minProfit.amount = 0;

    const daysCount = Math.max(1, monthlyTrends.length);
    const totalIncome = summary.income || 0;
    const totalExpense = summary.expense || 0;
    const totalProfit = summary.netProfit || (totalIncome - totalExpense);
    const margin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

    return {
      periodLabel: primaryPeriodLabel,
      daysCount,
      positiveProfitDays,
      daysWithIncome,
      daysWithExpense,
      unitLabel: (timeRange === 'year' || timeRange === 'quarter') ? 'เดือน' : 'วัน',
      income: {
        total: totalIncome,
        avg: totalIncome / daysCount,
        max: maxIncome,
        min: minIncome,
      },
      expense: {
        total: totalExpense,
        avg: totalExpense / daysCount,
        max: maxExpense,
        min: minExpense,
        ratio: expenseRatio,
      },
      profit: {
        total: totalProfit,
        avg: totalProfit / daysCount,
        max: maxProfit,
        min: minProfit,
        margin,
      }
    };
  }, [monthlyTrends, summary, primaryPeriodLabel, timeRange]);

  // Detailed summary statistics comparing Primary vs Comparison periods
  const comparisonStats = useMemo(() => {
    if (!isCompareActive || !compareSummary || !primaryStats) return null;

    let compMaxIncome = { amount: 0, label: '-' };
    let compMinIncome = { amount: Infinity, label: '-' };
    let compMaxExpense = { amount: 0, label: '-' };
    let compMinExpense = { amount: Infinity, label: '-' };
    let compMaxProfit = { amount: -Infinity, label: '-' };

    compareTrends.forEach((t, idx) => {
      const pNet = t.profit ?? (t.income - t.expense);
      const lbl = `วันที่ ${idx + 1}`;
      if (t.income > compMaxIncome.amount) compMaxIncome = { amount: t.income, label: lbl };
      if (t.income > 0 && t.income < compMinIncome.amount) compMinIncome = { amount: t.income, label: lbl };
      if (t.expense > compMaxExpense.amount) compMaxExpense = { amount: t.expense, label: lbl };
      if (t.expense > 0 && t.expense < compMinExpense.amount) compMinExpense = { amount: t.expense, label: lbl };
      if (pNet > compMaxProfit.amount) compMaxProfit = { amount: pNet, label: lbl };
    });

    if (compMinIncome.amount === Infinity) compMinIncome.amount = 0;
    if (compMinExpense.amount === Infinity) compMinExpense.amount = 0;
    if (compMaxProfit.amount === -Infinity) compMaxProfit.amount = 0;

    const primDays = primaryStats.daysCount;
    const compDays = Math.max(1, compareTrends.length || primDays);

    const primTotalIncome = primaryStats.income.total;
    const compTotalIncome = compareSummary.income || 0;
    const incDiff = primTotalIncome - compTotalIncome;
    const incPct = compTotalIncome > 0 ? (incDiff / compTotalIncome) * 100 : (primTotalIncome > 0 ? 100 : 0);

    const primTotalExpense = primaryStats.expense.total;
    const compTotalExpense = compareSummary.expense || 0;
    const expDiff = primTotalExpense - compTotalExpense;
    const expPct = compTotalExpense > 0 ? (expDiff / compTotalExpense) * 100 : (primTotalExpense > 0 ? 100 : 0);

    const primTotalProfit = primaryStats.profit.total;
    const compTotalProfit = compareSummary.netProfit || 0;
    const profitDiff = primTotalProfit - compTotalProfit;
    const profitPct = compTotalProfit !== 0 ? (profitDiff / Math.abs(compTotalProfit)) * 100 : (primTotalProfit > 0 ? 100 : 0);

    const primMargin = primaryStats.profit.margin;
    const compMargin = compTotalIncome > 0 ? (compTotalProfit / compTotalIncome) * 100 : 0;
    const marginDiff = primMargin - compMargin;

    return {
      primaryLabel: primaryPeriodLabel,
      compareLabel: compDateRange.label,
      unitLabel: (timeRange === 'year' || timeRange === 'quarter') ? 'เดือน' : 'วัน',
      days: { primary: primDays, compare: compDays },
      income: {
        primary: primTotalIncome,
        compare: compTotalIncome,
        diff: incDiff,
        pct: incPct,
        avgPrimary: primTotalIncome / primDays,
        avgCompare: compTotalIncome / compDays,
        maxPrimary: primaryStats.income.max,
        maxCompare: compMaxIncome,
        minPrimary: primaryStats.income.min,
        minCompare: compMinIncome
      },
      expense: {
        primary: primTotalExpense,
        compare: compTotalExpense,
        diff: expDiff,
        pct: expPct,
        avgPrimary: primTotalExpense / primDays,
        avgCompare: compTotalExpense / compDays,
        maxPrimary: primaryStats.expense.max,
        maxCompare: compMaxExpense,
        minPrimary: primaryStats.expense.min,
        minCompare: compMinExpense
      },
      profit: {
        primary: primTotalProfit,
        compare: compTotalProfit,
        diff: profitDiff,
        pct: profitPct,
        marginPrimary: primMargin,
        marginCompare: compMargin,
        marginDiff,
        avgPrimary: primTotalProfit / primDays,
        avgCompare: compTotalProfit / compDays,
        maxPrimary: primaryStats.profit.max,
        maxCompare: compMaxProfit
      }
    };
  }, [isCompareActive, compareSummary, primaryStats, compareTrends, primaryPeriodLabel, compDateRange]);

  const isCompactFinancial = monthlyTrends.length > 7;
  const isSuperCompactFinancial = monthlyTrends.length > 15;

  const activeSeriesCount = useMemo(() => {
    return Object.values(chartVisibleSeries).filter(Boolean).length || 1;
  }, [chartVisibleSeries]);

  const activeBarCount = useMemo(() => {
    if (chartType === 'line') return 0;
    return Object.values(chartVisibleBars).filter(Boolean).length || 1;
  }, [chartType, chartVisibleBars]);

  const getDayBarWidthClass = useCallback((dayCount) => {
    const count = Math.max(1, dayCount || 1);
    if (chartMobileMode === 'scroll') {
      if (count === 1) return isCompactFinancial ? "w-3.5 sm:w-5" : "w-6 sm:w-8";
      if (count === 2) return isCompactFinancial ? "w-2.5 sm:w-3.5" : "w-4.5 sm:w-6";
      return isCompactFinancial ? "w-2 sm:w-2.5" : "w-3.5 sm:w-5";
    }

    if (isSuperCompactFinancial) {
      if (count === 1) return "w-1.5 min-[390px]:w-2 sm:w-3.5";
      if (count === 2) return "w-1 min-[390px]:w-1.5 sm:w-2.5";
      return "w-[2.5px] min-[390px]:w-[3px] sm:w-2";
    }

    if (isCompactFinancial) {
      if (count === 1) return "w-3 sm:w-5";
      if (count === 2) return "w-2 sm:w-3.5";
      return "w-1.5 sm:w-2.5";
    }

    if (monthlyTrends.length <= 4) {
      if (count === 1) return "w-10 sm:w-16 md:w-20";
      if (count === 2) return "w-8 sm:w-12 md:w-14";
      return "w-5 sm:w-8 md:w-10";
    }

    if (count === 1) return "w-6 sm:w-10";
    if (count === 2) return "w-4 sm:w-7";
    return "w-3 sm:w-5";
  }, [chartMobileMode, isSuperCompactFinancial, isCompactFinancial, monthlyTrends.length]);

  const financialBarWidthClass = useMemo(() => {
    return getDayBarWidthClass(activeBarCount);
  }, [getDayBarWidthClass, activeBarCount]);

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
    if (monthlyTrends.length <= 4) {
      return "gap-2 sm:gap-3";
    }
    return "gap-1 sm:gap-1.5";
  }, [chartMobileMode, isSuperCompactFinancial, isCompactFinancial, monthlyTrends.length]);

  // Labels for the Compare Modal preview
  const modalPrimaryLabel = useMemo(() => {
    if (compareMode === 'quarter') {
      return `ไตรมาส ${comparePrimaryQuarter} (Q${comparePrimaryQuarter}) พ.ศ. ${comparePrimaryYear + 543}`;
    }
    if (compareMode === 'month') {
      return `${thaiMonths[comparePrimaryMonth]} พ.ศ. ${comparePrimaryYear + 543}`;
    }
    if (compareMode === 'year') {
      return `ปี พ.ศ. ${comparePrimaryYear + 543}`;
    }
    if (compareMode === 'custom') {
      return formatExecDisplayRange(comparePrimaryCustomStart || customStartDate, comparePrimaryCustomEnd || customEndDate);
    }
    return primaryPeriodLabel;
  }, [compareMode, comparePrimaryQuarter, comparePrimaryYear, comparePrimaryMonth, comparePrimaryCustomStart, comparePrimaryCustomEnd, customStartDate, customEndDate, thaiMonths, primaryPeriodLabel]);

  const modalCompareLabel = useMemo(() => {
    if (compareMode === 'quarter') {
      return `ไตรมาส ${compareQuarter} (Q${compareQuarter}) พ.ศ. ${compareYear + 543}`;
    }
    if (compareMode === 'month') {
      return `${thaiMonths[compareMonth]} พ.ศ. ${compareYear + 543}`;
    }
    if (compareMode === 'year') {
      return `ปี พ.ศ. ${compareYear + 543}`;
    }
    if (compareMode === 'custom') {
      return formatExecDisplayRange(compareCustomStart || customStartDate, compareCustomEnd || customEndDate);
    }
    return compDateRange.label || 'ยังไม่ได้ระบุ';
  }, [compareMode, compareQuarter, compareYear, compareMonth, compareCustomStart, compareCustomEnd, customStartDate, customEndDate, thaiMonths, compDateRange.label]);

  return (
    <div className="fade-in pb-10 w-full">
      {/* Header Panel */}
      <div ref={headerRef} className="sticky z-40 w-full pointer-events-none transition-[top] duration-300 ease-in-out" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto exec-sticky-header">
          <div className="w-full mx-auto px-3.5 sm:px-6 md:px-8 2xl:px-12 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2.5 sm:gap-3 py-2 sm:py-2.5 xl:py-3 exec-header-inner">
            
            {/* Title & Branch Dropdown Row on Mobile and Tablet */}
            <div className="flex items-center justify-between w-full xl:w-auto gap-3 shrink-0">
              <div className="min-w-0 shrink-0">
                <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-2 text-base sm:text-lg md:text-xl whitespace-nowrap">
                  <TrendingUp className="text-emerald-500 animate-pulse shrink-0 w-4 h-4 sm:w-5 sm:h-5" /> 
                  <span className="whitespace-nowrap">แดชบอร์ดผู้บริหาร</span>
                </h1>
                <p className="text-slate-500 kanit-text sticky-header-desc text-xs hidden sm:block truncate">ข้อมูลสรุปรายได้ กำไร และประสิทธิภาพของคลินิกเชิงลึก</p>
              </div>

              {/* Branch Filter dropdown - Visible on mobile and tablet (< xl) */}
              <div className="w-36 sm:w-44 xl:hidden shrink-0 relative">
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
            <div className="flex flex-row items-center gap-2 sm:gap-2.5 w-full xl:w-auto shrink-0 select-none overflow-x-auto scrollbar-none flex-nowrap py-1 px-0.5 max-w-full">
              {/* Branch Filter dropdown - Visible ONLY on Large Desktop (xl:) */}
              <div className="hidden xl:block w-40 shrink-0 relative">
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

              {/* Time Range Selector & Pickers */}
              <div className="flex items-center gap-2 flex-nowrap shrink-0">
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-sm flex-nowrap shrink-0">
                  {[
                    { id: 'today', label: 'วันนี้' },
                    { id: 'week', label: 'สัปดาห์' },
                    { id: 'month', label: 'เดือน' },
                    { id: 'quarter', label: 'ไตรมาส' },
                    { id: 'year', label: 'ปี' },
                    { id: 'custom', label: 'ช่วงเวลา' },
                    { id: 'all', label: 'ทั้งหมด' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setTimeRange(r.id);
                        if (r.id === 'month' && timeRange === 'month') handleOpenMonthPicker();
                        else if (r.id === 'year' && timeRange === 'year') handleOpenYearPicker();
                        else if (r.id === 'custom') handleOpenExecRange();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold kanit-text transition-all shrink-0 ${timeRange === r.id ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50 font-black' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Month Picker Quick Switch Pill */}
                {timeRange === 'month' && (
                  <div 
                    onWheel={(e) => handleWheelStep(e, handlePrevMonth, handleNextMonth)}
                    title="เลื่อนลูกกลิ้งเมาส์ขึ้น-ลง เพื่อเปลี่ยนเดือน หรือคลิกเพื่อเปิดปฏิทิน"
                    className="flex items-center bg-white rounded-xl border border-slate-200/60 shadow-sm p-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      title="เดือนก่อนหน้า"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenMonthPicker}
                      className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-800 kanit-text transition-colors"
                    >
                      <CalendarIcon size={14} className="text-emerald-500" />
                      <span>{thaiMonths[selectedMonth]} {selectedYear + 543}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      title="เดือนถัดไป"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Quarter Picker Quick Switch Pill */}
                {timeRange === 'quarter' && (
                  <div 
                    onWheel={(e) => handleWheelStep(e, handlePrevQuarter, handleNextQuarter)}
                    title="เลื่อนลูกกลิ้งเมาส์ขึ้น-ลง เพื่อเปลี่ยนไตรมาส"
                    className="flex items-center bg-white rounded-xl border border-slate-200/60 shadow-sm p-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={handlePrevQuarter}
                      title="ไตรมาสก่อนหน้า"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-800 kanit-text">
                      <CalendarIcon size={14} className="text-emerald-500" />
                      <span>ไตรมาส {selectedQuarter} (Q{selectedQuarter}) {selectedYear + 543}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextQuarter}
                      title="ไตรมาสถัดไป"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Year Picker Quick Switch Pill */}
                {timeRange === 'year' && (
                  <div 
                    onWheel={(e) => handleWheelStep(e, handlePrevYear, handleNextYear)}
                    title="เลื่อนลูกกลิ้งเมาส์ขึ้น-ลง เพื่อเปลี่ยนปี หรือคลิกเพื่อเปิดปฏิทิน"
                    className="flex items-center bg-white rounded-xl border border-slate-200/60 shadow-sm p-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={handlePrevYear}
                      title="ปีก่อนหน้า"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenYearPicker}
                      className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-800 kanit-text transition-colors"
                    >
                      <CalendarIcon size={14} className="text-emerald-500" />
                      <span>ปี พ.ศ. {selectedYear + 543}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextYear}
                      title="ปีถัดไป"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Week Picker Quick Switch Pill */}
                {timeRange === 'week' && (
                  <div 
                    onWheel={(e) => handleWheelStep(e, handlePrevWeek, handleNextWeek)}
                    title="เลื่อนลูกกลิ้งเมาส์ขึ้น-ลง เพื่อเปลี่ยนสัปดาห์ หรือคลิกเพื่อเปิดปฏิทิน"
                    className="flex items-center bg-white rounded-xl border border-slate-200/60 shadow-sm p-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={handlePrevWeek}
                      title="สัปดาห์ก่อนหน้า"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenWeekPicker}
                      className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-800 kanit-text transition-colors"
                    >
                      <CalendarIcon size={14} className="text-emerald-500" />
                      <span>{primaryPeriodLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextWeek}
                      title="สัปดาห์ถัดไป"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

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

                {/* Compare Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    setComparePrimaryYear(selectedYear);
                    setComparePrimaryQuarter(selectedQuarter);
                    setComparePrimaryMonth(selectedMonth);
                    setComparePrimaryCustomStart(customStartDate);
                    setComparePrimaryCustomEnd(customEndDate);
                    setShowCompareModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold kanit-text transition-all shrink-0 border ${
                    isCompareActive 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-sm shadow-indigo-500/20' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/60 shadow-sm'
                  }`}
                >
                  <ArrowLeftRight size={13} className={isCompareActive ? 'text-amber-300' : 'text-indigo-500'} />
                  <span>{isCompareActive ? `เทียบ: ${compDateRange.label}` : 'เปรียบเทียบ'}</span>
                  {isCompareActive && (
                    <span 
                      onClick={(e) => { e.stopPropagation(); setIsCompareActive(false); }}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                      title="ปิดโหมดเปรียบเทียบ"
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-3.5 sm:px-6 md:px-8 2xl:px-12 mt-3 sm:mt-4 space-y-4 sm:space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 min-[960px]:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-6 w-full min-w-0">
          {/* Card 1: Revenue */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl sm:rounded-[1.75rem] lg:rounded-[2rem] p-4 sm:p-5 lg:p-7 shadow-md sm:shadow-lg shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden group min-w-0">
            <div className="flex justify-between items-start z-10 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-emerald-100 text-[11px] sm:text-xs font-bold uppercase tracking-wider kanit-text truncate">รายรับรวมทั้งหมด</p>
                <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black font-data mt-1.5 sm:mt-2 tracking-tight whitespace-nowrap">{(isGlobalLoading || isDashboardLoading) ? '...' : formatMoney(summary.income)}</h3>
                {isCompareActive && compareDiffStats && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-black/20 backdrop-blur-md">
                    <span className={compareDiffStats.incDiff >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
                      {compareDiffStats.incDiff >= 0 ? '▲ +' : '▼ '}{compareDiffStats.incPct.toFixed(1)}%
                    </span>
                    <span className="text-white/80 truncate">เทียบ {compareDiffStats.compareLabel} ({formatMoney(compareSummary?.income || 0)})</span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                <TrendingUp size={20} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-4 sm:mt-6 lg:mt-8 border-t border-white/10 pt-2.5 sm:pt-3 lg:pt-4 z-10 flex justify-between items-center text-[10px] sm:text-[11px] lg:text-xs text-emerald-100 gap-2">
              <span className="kanit-text truncate">ยอดผ่าน POS: {summary.checkoutsCount} บิล</span>
              <span className="font-data font-bold shrink-0">โอนเงิน {((summary.transfer / (summary.income || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 lg:w-28 lg:h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>

          {/* Card 2: Expenses */}
          <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl sm:rounded-[1.75rem] lg:rounded-[2rem] p-4 sm:p-5 lg:p-7 shadow-md sm:shadow-lg shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden group min-w-0">
            <div className="flex justify-between items-start z-10 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-rose-100 text-[11px] sm:text-xs font-bold uppercase tracking-wider kanit-text truncate">รายจ่ายรวมทั้งหมด</p>
                <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black font-data mt-1.5 sm:mt-2 tracking-tight whitespace-nowrap">{(isGlobalLoading || isDashboardLoading) ? '...' : formatMoney(summary.expense)}</h3>
                {isCompareActive && compareDiffStats && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-black/20 backdrop-blur-md">
                    <span className={compareDiffStats.expDiff <= 0 ? 'text-emerald-200' : 'text-rose-200'}>
                      {compareDiffStats.expDiff >= 0 ? '▲ +' : '▼ '}{compareDiffStats.expPct.toFixed(1)}%
                    </span>
                    <span className="text-white/80 truncate">เทียบ {compareDiffStats.compareLabel} ({formatMoney(compareSummary?.expense || 0)})</span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                <TrendingDown size={20} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-4 sm:mt-6 lg:mt-8 border-t border-white/10 pt-2.5 sm:pt-3 lg:pt-4 z-10 flex justify-between items-center text-[10px] sm:text-[11px] lg:text-xs text-rose-100 gap-2">
              <span className="kanit-text truncate">ค่าคอม & สวัสดิการ</span>
              <span className="font-data font-bold shrink-0">อัตราส่วน: {((summary.expense / (summary.income || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 lg:w-28 lg:h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="bg-gradient-to-br from-indigo-500 to-sky-600 text-white rounded-2xl sm:rounded-[1.75rem] lg:rounded-[2rem] p-4 sm:p-5 lg:p-7 shadow-md sm:shadow-lg shadow-indigo-500/10 flex flex-col justify-between relative overflow-hidden group min-w-0">
            <div className="flex justify-between items-start z-10 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-indigo-100 text-[11px] sm:text-xs font-bold uppercase tracking-wider kanit-text truncate">กำไรสุทธิ (Net Profit)</p>
                <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black font-data mt-1.5 sm:mt-2 tracking-tight whitespace-nowrap">{(isGlobalLoading || isDashboardLoading) ? '...' : formatMoney(summary.netProfit)}</h3>
                {isCompareActive && compareDiffStats && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-black/20 backdrop-blur-md">
                    <span className={compareDiffStats.profitDiff >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
                      {compareDiffStats.profitDiff >= 0 ? '▲ +' : '▼ '}{compareDiffStats.profitPct.toFixed(1)}%
                    </span>
                    <span className="text-white/80 truncate">เทียบ {compareDiffStats.compareLabel} ({formatMoney(compareSummary?.netProfit || 0)})</span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                <Wallet size={20} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-4 sm:mt-6 lg:mt-8 border-t border-white/10 pt-2.5 sm:pt-3 lg:pt-4 z-10 flex justify-between items-center text-[10px] sm:text-[11px] lg:text-xs text-indigo-100 gap-2">
              <span className="kanit-text truncate">กำไรหักค่าใช้จ่ายแล้ว</span>
              <span className="font-data font-bold shrink-0">อัตรากำไร: {Number(summary.profitMargin != null ? summary.profitMargin : (summary.income > 0 ? ((summary.netProfit / summary.income) * 100) : 0)).toFixed(1)}%</span>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 lg:w-28 lg:h-28 bg-white/5 rounded-full opacity-50 pointer-events-none transform scale-150"></div>
          </div>
        </div>

        {/* Second Row: Charts & Payment Methods */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 w-full min-w-0">
          {/* Trends Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-6 lg:p-7 flex flex-col justify-between min-w-0 relative h-full">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-5 relative z-10">
              {/* Left: Title + Comparison Badge (inline) */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap xl:flex-nowrap min-w-0">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                    <BarChart3 className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                  </div>
                  <h3 className="text-lg sm:text-xl xl:text-2xl font-black text-slate-900 kanit-text tracking-tight whitespace-nowrap">
                    เทรนด์การเงิน{!isCompareActive && (
                      <span className="text-slate-600 font-bold text-base sm:text-lg xl:text-xl ml-2 font-data">
                        ({primaryPeriodLabel})
                      </span>
                    )}
                  </h3>
                </div>
                {isCompareActive && (
                  <span className="text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/90 flex items-center gap-1.5 shadow-xs shrink-0 max-w-full">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span className="font-data truncate">{primaryPeriodLabel}</span>
                    <span className="text-slate-400 font-normal px-0.5">vs</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="font-data text-amber-900 truncate">{compDateRange.label}</span>
                  </span>
                )}
              </div>

              {/* Right: Controls Toolbar (Wraps naturally on tablet / narrow screens to stay within card) */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full xl:w-auto xl:flex-nowrap min-w-0 relative z-10">
                {/* Chart Type Selector: เส้น | แท่ง | แท่ง+เส้น */}
                <div className="grid grid-cols-3 sm:flex items-center bg-slate-100/90 p-0.5 sm:p-1 rounded-xl text-xs font-bold kanit-text border border-slate-200/70 shadow-xs w-full sm:w-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setChartType('line')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartType === 'line'
                        ? 'bg-slate-900 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="ดูกราฟเส้นต่อเนื่อง (Area / Line Chart)"
                  >
                    <TrendingUp size={13} className="shrink-0" />
                    <span className="truncate">เส้น</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartType === 'bar'
                        ? 'bg-slate-900 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="ดูกราฟแท่งเปรียบเทียบ (Bar Chart)"
                  >
                    <BarChart3 size={13} className="shrink-0" />
                    <span className="truncate">แท่ง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('mixed')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartType === 'mixed'
                        ? 'bg-slate-900 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="ดูกราฟทั้งแท่งและเส้นพร้อมกัน (Bar + Line)"
                  >
                    <Layers size={13} className="shrink-0" />
                    <span className="truncate">แท่ง+เส้น</span>
                  </button>
                </div>

                {/* Series Selector Pill Bar: ทั้งหมด vs ทีละเส้น */}
                <div className="grid grid-cols-4 sm:flex items-center bg-slate-100/90 p-0.5 sm:p-1 rounded-xl text-xs font-bold kanit-text border border-slate-200/70 shadow-xs w-full sm:w-auto max-w-full gap-0.5">
                  {/* All */}
                  <button
                    type="button"
                    onClick={() => handleSelectSeriesFilter('all')}
                    className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartSeriesFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="แสดงข้อมูลทั้งหมด"
                  >
                    <span className="truncate">ทั้งหมด</span>
                  </button>

                  {/* Income */}
                  <button
                    type="button"
                    onClick={() => handleSelectSeriesFilter('income')}
                    className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartSeriesFilter === 'income'
                        ? 'bg-emerald-500 text-white shadow-xs font-black'
                        : chartVisibleSeries.income && chartSeriesFilter === 'custom'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold'
                          : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                    }`}
                    title="ดูกราฟรายรับเดี่ยว"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${chartSeriesFilter === 'income' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    <span className="truncate">รายรับ</span>
                  </button>

                  {/* Expense */}
                  <button
                    type="button"
                    onClick={() => handleSelectSeriesFilter('expense')}
                    className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartSeriesFilter === 'expense'
                        ? 'bg-rose-500 text-white shadow-xs font-black'
                        : chartVisibleSeries.expense && chartSeriesFilter === 'custom'
                          ? 'bg-rose-50 text-rose-700 border border-rose-300 font-bold'
                          : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/60'
                    }`}
                    title="ดูกราฟรายจ่ายเดี่ยว"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${chartSeriesFilter === 'expense' ? 'bg-white' : 'bg-rose-500'}`}></span>
                    <span className="truncate">รายจ่าย</span>
                  </button>

                  {/* Profit */}
                  <button
                    type="button"
                    onClick={() => handleSelectSeriesFilter('profit')}
                    className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-95 ${
                      chartSeriesFilter === 'profit'
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : chartVisibleSeries.profit && chartSeriesFilter === 'custom'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 font-bold'
                          : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                    }`}
                    title="ดูกราฟกำไรสุทธิเดี่ยว"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${chartSeriesFilter === 'profit' ? 'bg-white' : 'bg-indigo-500'}`}></span>
                    <span className="truncate">กำไร</span>
                  </button>
                </div>

                {/* View Mode Toggle on Mobile when data has more than 10 points */}
                {monthlyTrends.length > 10 && (
                  <div className="grid grid-cols-2 sm:hidden items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold kanit-text border border-slate-200/70 shadow-xs w-full relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        if (chartScrollContainerRef.current) {
                          chartScrollContainerRef.current.scrollLeft = 0;
                        }
                        setChartMobileMode('fit');
                      }}
                      className={`py-1.5 rounded-lg transition-all min-h-[30px] flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${
                        chartMobileMode === 'fit'
                          ? 'bg-white text-emerald-600 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span>พอดีจอ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMobileMode('scroll')}
                      className={`py-1.5 rounded-lg transition-all min-h-[30px] flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${
                        chartMobileMode === 'scroll'
                          ? 'bg-white text-emerald-600 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span>เลื่อนดู</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col px-1 sm:px-2 w-full min-w-0 pt-1 sm:pt-2">
              {/* Scrollable Container on Mobile when in 'scroll' mode */}
              <div 
                ref={chartScrollContainerRef}
                className={`w-full ${chartMobileMode === 'scroll' ? 'overflow-x-auto custom-scrollbar pb-2 pt-10 sm:pt-12' : 'overflow-visible pt-1'}`}
              >
                <div className={`${chartMobileMode === 'scroll' ? 'min-w-[620px] sm:min-w-full' : 'w-full'} h-40 sm:h-48 md:h-52 xl:h-56 relative`}>
                  {/* SVG Multi-Line & Area Chart Overlay for Income, Expense, Profit */}
                  <svg className="absolute left-0 right-0 top-0 h-full w-full pointer-events-none z-20" viewBox="0 0 600 144" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="85%" stopColor="#10b981" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                        <stop offset="85%" stopColor="#f43f5e" stopOpacity="0.03" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
                        <stop offset="85%" stopColor="#6366f1" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal & Vertical Grid Baseline & Guides */}
                    {/* 0% Baseline */}
                    <line x1="0" y1={CHART_BOTTOM_Y} x2="600" y2={CHART_BOTTOM_Y} stroke="#94a3b8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

                    {/* Horizontal Grid Guides (25%, 50%, 75%, 100%) */}
                    <line x1="0" y1={Math.round(CHART_BOTTOM_Y - CHART_HEIGHT_PX * 0.25)} x2="600" y2={Math.round(CHART_BOTTOM_Y - CHART_HEIGHT_PX * 0.25)} stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={Math.round(CHART_BOTTOM_Y - CHART_HEIGHT_PX * 0.5)} x2="600" y2={Math.round(CHART_BOTTOM_Y - CHART_HEIGHT_PX * 0.5)} stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={Math.round(CHART_BOTTOM_Y - CHART_HEIGHT_PX * 0.75)} x2="600" y2={Math.round(CHART_BOTTOM_Y - CHART_HEIGHT_PX * 0.75)} stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={CHART_TOP_Y} x2="600" y2={CHART_TOP_Y} stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />

                    {/* Vertical Grid Guides aligned with tick columns */}
                    {monthlyTrends.map((t, idx) => {
                      const shouldShow = monthlyTrends.length <= 12 || Boolean(t.monthLabel);
                      if (!shouldShow) return null;
                      const x = (idx + 0.5) * (600 / (monthlyTrends.length || 1));
                      return (
                        <line
                          key={`vgrid-${idx}`}
                          x1={x}
                          y1={CHART_TOP_Y}
                          x2={x}
                          y2={CHART_BOTTOM_Y}
                          stroke="#94a3b8"
                          strokeOpacity="0.4"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}

                    {/* Render active lines when chartType is 'line' or 'mixed' */}
                    {chartType !== 'bar' && (
                      <>
                        {/* Income Line (and area gradient in pure 'line' mode) */}
                        {chartVisibleLines.income && chartType === 'line' && incomeAreaPath && (
                          <path d={incomeAreaPath} fill="url(#incomeAreaGrad)" />
                        )}
                        {chartVisibleLines.income && (
                          <>
                            <path d={incomeLinePath} fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={incomeLinePath} fill="none" stroke="#10b981" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "3"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                        {/* Comparison Income Line */}
                        {isCompareActive && chartVisibleLines.compareIncome && compareIncomeLinePath && (
                          <>
                            <path d={compareIncomeLinePath} fill="none" stroke="rgba(52, 211, 153, 0.15)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={compareIncomeLinePath} fill="none" stroke="#34d399" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "2.5"} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}

                        {/* Expense Line (and area gradient in pure 'line' mode) */}
                        {chartVisibleLines.expense && chartType === 'line' && expenseAreaPath && (
                          <path d={expenseAreaPath} fill="url(#expenseAreaGrad)" />
                        )}
                        {chartVisibleLines.expense && (
                          <>
                            <path d={expenseLinePath} fill="none" stroke="rgba(244, 63, 94, 0.2)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={expenseLinePath} fill="none" stroke="#f43f5e" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "3"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                        {/* Comparison Expense Line */}
                        {isCompareActive && chartVisibleLines.compareExpense && compareExpenseLinePath && (
                          <>
                            <path d={compareExpenseLinePath} fill="none" stroke="rgba(251, 113, 133, 0.15)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={compareExpenseLinePath} fill="none" stroke="#fb7185" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "2.5"} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}

                        {/* Net Profit Line (and area gradient in pure 'line' mode) */}
                        {chartVisibleLines.profit && chartType === 'line' && profitAreaPath && (
                          <path d={profitAreaPath} fill="url(#profitAreaGrad)" />
                        )}
                        {chartVisibleLines.profit && (
                          <>
                            <path d={financialLinePath} fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={financialLinePath} fill="none" stroke="#6366f1" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "3"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                        {/* Comparison Net Profit Line */}
                        {isCompareActive && chartVisibleLines.compareProfit && compareFinancialLinePath && (
                          <>
                            <path d={compareFinancialLinePath} fill="none" stroke="rgba(245, 158, 11, 0.15)" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "4" : "6"} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={compareFinancialLinePath} fill="none" stroke="#f59e0b" strokeWidth={isSuperCompactFinancial && chartMobileMode === 'fit' ? "2" : "2.5"} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                      </>
                    )}
                  </svg>

                  {/* Bars Container */}
                  <div className="flex items-end h-full w-full relative">
                    {monthlyTrends.map((t, idx) => {
                      const point = netProfitPoints[idx] || { pct: 0, dotPct: 0, topPct: 95.83, value: 0, hasValue: false };
                      const incPt = incomePoints[idx] || { pct: 0, dotPct: 0, topPct: 95.83, value: 0, hasValue: false };
                      const expPt = expensePoints[idx] || { pct: 0, dotPct: 0, topPct: 95.83, value: 0, hasValue: false };
                      const compItem = compareTrends[idx];
                      const compPoint = compareNetProfitPoints[idx];

                      const incValRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, t.income || 0) / maxTrendValue) : 0;
                      const expValRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, t.expense || 0) / maxTrendValue) : 0;
                      const profitVal = (t.income || 0) - (t.expense || 0);
                      const profitValRatio = maxTrendValue > 0 ? Math.min(1, Math.max(0, profitVal) / maxTrendValue) : 0;

                      const incomeHeight = t.income > 0 ? `${Math.max(3, incValRatio * 100)}%` : '0px';
                      const expenseHeight = t.expense > 0 ? `${Math.max(3, expValRatio * 100)}%` : '0px';
                      const netProfitHeight = profitVal > 0 ? `${Math.max(3, profitValRatio * 100)}%` : '0px';

                      const dayActiveBars = (
                        (chartVisibleBars.income && t.income > 0 ? 1 : 0) +
                        (chartVisibleBars.profit && (t.income - t.expense) > 0 ? 1 : 0) +
                        (chartVisibleBars.expense && t.expense > 0 ? 1 : 0)
                      );
                      const currentBarWidthClass = getDayBarWidthClass(dayActiveBars);

                      // Calculate peak height of this specific day column so tooltip hovers right above the bars/dots
                      let peakPct = 0;
                      if (chartType !== 'line') {
                        if (chartVisibleBars.income && t.income > 0) peakPct = Math.max(peakPct, incValRatio * 85);
                        if (chartVisibleBars.expense && t.expense > 0) peakPct = Math.max(peakPct, expValRatio * 85);
                        if (chartVisibleBars.profit && profitVal > 0) peakPct = Math.max(peakPct, profitValRatio * 85);
                      }
                      if (chartType !== 'bar') {
                        if (chartVisibleLines.income && t.income > 0) peakPct = Math.max(peakPct, incPt.pct);
                        if (chartVisibleLines.expense && t.expense > 0) peakPct = Math.max(peakPct, expPt.pct);
                        if (chartVisibleLines.profit && point.value > 0) peakPct = Math.max(peakPct, point.pct);
                        if (isCompareActive && compItem) {
                          if (chartVisibleLines.compareIncome && compItem.income > 0) peakPct = Math.max(peakPct, (compItem.income / maxTrendValue) * 85);
                          if (chartVisibleLines.compareExpense && compItem.expense > 0) peakPct = Math.max(peakPct, (compItem.expense / maxTrendValue) * 85);
                          if (chartVisibleLines.compareProfit && compPoint?.hasValue) peakPct = Math.max(peakPct, compPoint.pct);
                        }
                      }
                      const tooltipBottomStyle = `calc(${Math.min(84, Math.max(16, peakPct + 4))}% + 12px)`;

                      const ratio = monthlyTrends.length > 1 ? idx / (monthlyTrends.length - 1) : 0.5;
                      const isLeftEdge = ratio < 0.25;
                      const isRightEdge = ratio > 0.75;
                      const tooltipAlign = isLeftEdge 
                        ? 'left-0' 
                        : isRightEdge 
                          ? 'right-0' 
                          : 'left-1/2 -translate-x-1/2';
                      const arrowAlign = isLeftEdge
                        ? 'left-4'
                        : isRightEdge
                          ? 'right-4'
                          : 'left-1/2 -translate-x-1/2';
                      const isSelected = activeTrendIdx === idx;

                      return (
                        <div 
                          key={idx} 
                          onClick={() => setActiveTrendIdx(isSelected ? null : idx)}
                          className={`flex-1 min-w-0 flex items-end justify-center ${financialGroupGapClass} h-full relative group cursor-pointer ${isSelected ? 'z-40' : 'z-10 group-hover:z-30 hover:z-30'}`}
                        >
                          {/* Column Guide Highlight on Hover / Select (especially clear in Line mode) */}
                          <div className={`absolute inset-x-0.5 sm:inset-x-1 top-0 bottom-0 rounded-xl transition-all pointer-events-none ${
                            isSelected 
                              ? 'bg-indigo-50/85 ring-1 ring-indigo-300 shadow-inner' 
                              : 'group-hover:bg-slate-100/60'
                          }`} />

                          {isSelected && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px border-l border-dashed border-indigo-300 pointer-events-none z-10" />
                          )}
                          {/* Tooltip: Either Comparison side-by-side or Single period */}
                          {isCompareActive && compItem ? (
                            <div 
                              style={{ bottom: tooltipBottomStyle }}
                              className={`absolute ${tooltipAlign} bg-slate-900/95 backdrop-blur-md text-white text-[10px] sm:text-xs p-2.5 sm:p-3 rounded-2xl ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'} transition-all duration-150 pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-slate-700/80 flex flex-col gap-2 min-w-[240px] sm:min-w-[270px]`}
                            >
                              {/* Title */}
                              <div className="flex items-center justify-between border-b border-slate-700/70 pb-1 font-bold text-xs">
                                <span className="text-slate-200">{t.fullLabel || t.monthLabel}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  โหมดเปรียบเทียบ
                                </span>
                              </div>

                              {/* Side-by-side Columns */}
                              <div className="grid grid-cols-2 gap-3 text-[10px] sm:text-[11px]">
                                  {/* Primary Period */}
                                  <div className="flex flex-col gap-1 border-r border-slate-700/60 pr-2.5">
                                    <div className="font-bold text-indigo-300 flex items-center gap-1 truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                                      <span className="truncate">{primaryPeriodLabel}</span>
                                    </div>
                                    {chartVisibleSeries.income && (
                                      <div className="flex justify-between text-emerald-400">
                                        <span>รายรับ:</span>
                                        <span className="font-data font-bold">+{formatMoney(t.income)}</span>
                                      </div>
                                    )}
                                    {chartVisibleSeries.expense && (
                                      <div className="flex justify-between text-rose-400">
                                        <span>รายจ่าย:</span>
                                        <span className="font-data font-bold">-{formatMoney(t.expense)}</span>
                                      </div>
                                    )}
                                    {chartVisibleSeries.profit && (
                                      <div className="flex justify-between text-indigo-200 font-bold pt-0.5 border-t border-slate-700/50">
                                        <span>กำไร:</span>
                                        <span className="font-data font-black">{formatMoney(t.income - t.expense)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Comparison Period */}
                                  <div className="flex flex-col gap-1 pl-0.5">
                                    <div className="font-bold text-amber-400 flex items-center gap-1 truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                      <span className="truncate">{compDateRange.label}</span>
                                    </div>
                                    {chartVisibleSeries.income && (
                                      <div className="flex justify-between text-emerald-300">
                                        <span>รายรับ:</span>
                                        <span className="font-data font-bold">+{formatMoney(compItem.income)}</span>
                                      </div>
                                    )}
                                    {chartVisibleSeries.expense && (
                                      <div className="flex justify-between text-rose-300">
                                        <span>รายจ่าย:</span>
                                        <span className="font-data font-bold">-{formatMoney(compItem.expense)}</span>
                                      </div>
                                    )}
                                    {chartVisibleSeries.profit && (
                                      <div className="flex justify-between text-amber-300 font-bold pt-0.5 border-t border-slate-700/50">
                                        <span>กำไร:</span>
                                        <span className="font-data font-black">{formatMoney(compItem.profit ?? (compItem.income - compItem.expense))}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Profit Diff Row */}
                                {chartVisibleSeries.profit && (() => {
                                  const primNet = t.income - t.expense;
                                  const compNet = compItem.profit ?? (compItem.income - compItem.expense);
                                  const diff = primNet - compNet;
                                  const diffPct = compNet !== 0 ? (diff / Math.abs(compNet)) * 100 : (primNet > 0 ? 100 : 0);
                                  return (
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/70 text-[10px] sm:text-[11px] font-bold">
                                      <span className="text-slate-400">ผลต่างกำไรสุทธิ:</span>
                                      <span className={`font-data ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {diff >= 0 ? '▲ +' : '▼ '}{formatMoney(Math.abs(diff))} ({diffPct.toFixed(1)}%)
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Downward Caret Arrow */}
                                <div className={`absolute -bottom-1 ${arrowAlign} w-2 h-2 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/80 pointer-events-none`}></div>
                              </div>
                            ) : (
                              /* Single period Tooltip */
                              <div 
                                style={{ bottom: tooltipBottomStyle }}
                                className={`absolute ${tooltipAlign} bg-slate-900/95 backdrop-blur-md text-white text-[10px] sm:text-xs px-2.5 py-1.5 rounded-xl ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'} transition-all duration-150 pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-slate-700/70 flex flex-col gap-1 min-w-[130px]`}
                              >
                                <div className="font-bold text-slate-300 text-center border-b border-slate-700/60 pb-0.5 text-[11px]">
                                  {t.fullLabel || t.monthLabel}
                                </div>
                                {chartVisibleSeries.income && (
                                  <div className="flex items-center justify-between gap-3 text-emerald-400 font-semibold leading-none">
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                      <span>รายรับ:</span>
                                    </span>
                                    <span className="font-data font-bold">+{formatMoney(t.income)}</span>
                                  </div>
                                )}
                                {chartVisibleSeries.expense && (
                                  <div className="flex items-center justify-between gap-3 text-rose-400 font-semibold leading-none">
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                                      <span>รายจ่าย:</span>
                                    </span>
                                    <span className="font-data font-bold">-{formatMoney(t.expense)}</span>
                                  </div>
                                )}
                                {chartVisibleSeries.profit && (
                                  <div className="flex items-center justify-between gap-3 text-indigo-300 font-bold pt-0.5 border-t border-slate-700/60 leading-none">
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                                      <span>กำไรสุทธิ:</span>
                                    </span>
                                    <span className="font-data font-black">{formatMoney(t.income - t.expense)}</span>
                                  </div>
                                )}
                                {/* Tooltip Downward Caret Arrow */}
                                <div className={`absolute -bottom-1 ${arrowAlign} w-2 h-2 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/70 pointer-events-none`}></div>
                              </div>
                            )}

                          {/* Render Bars in 'bar' and 'mixed' modes (anchored precisely on the solid baseline at Y=138) */}
                          {chartType !== 'line' && (
                            <div 
                              className={`absolute inset-x-0 flex items-end justify-center ${financialGroupGapClass} pointer-events-none z-10`}
                              style={{ 
                                bottom: `${((144 - CHART_BOTTOM_Y) / 144) * 100}%`,
                                height: `${(CHART_HEIGHT_PX / 144) * 100}%`
                              }}
                            >
                              {/* Income bar (rendered only if > 0 so zero values don't push other bars off-center) */}
                              {chartVisibleBars.income && t.income > 0 && (
                                <div className={`${currentBarWidthClass} bg-emerald-500 hover:bg-emerald-600 rounded-t-[2px] sm:rounded-t-md transition-all relative pointer-events-auto cursor-pointer ${isSelected ? 'ring-2 ring-emerald-300 ring-offset-1 brightness-110' : ''}`} style={{ height: incomeHeight }}></div>
                              )}

                              {/* Net Profit bar */}
                              {chartVisibleBars.profit && (t.income - t.expense) > 0 && (
                                <div className={`${currentBarWidthClass} bg-indigo-500 hover:bg-indigo-600 rounded-t-[2px] sm:rounded-t-md transition-all relative pointer-events-auto cursor-pointer ${isSelected ? 'ring-2 ring-indigo-300 ring-offset-1 brightness-110' : ''}`} style={{ height: netProfitHeight }}></div>
                              )}

                              {/* Expense bar */}
                              {chartVisibleBars.expense && t.expense > 0 && (
                                <div className={`${currentBarWidthClass} bg-rose-500 hover:bg-rose-600 rounded-t-[2px] sm:rounded-t-md transition-all relative pointer-events-auto cursor-pointer ${isSelected ? 'ring-2 ring-rose-300 ring-offset-1 brightness-110' : ''}`} style={{ height: expenseHeight }}></div>
                              )}
                            </div>
                          )}

                          {/* Data Dots: In 'line' and 'mixed' modes, render dots cleanly only when positive or selected */}
                          {chartType !== 'bar' && (
                            <>
                              {/* Circle Dot for Income */}
                              {chartVisibleLines.income && (t.income > 0 || isSelected) && (
                                <div 
                                  className={`absolute rounded-full shadow-md z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                                    isSelected 
                                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-600 border-2 border-white ring-2 ring-emerald-400' 
                                      : activeSeriesCount === 1 
                                        ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white border-2 border-emerald-500 group-hover:scale-125' 
                                        : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 border border-white group-hover:scale-125'
                                  }`} 
                                  style={{ top: `${incPt.topPct}%` }}
                                ></div>
                              )}

                              {/* Circle Dot for Expense */}
                              {chartVisibleLines.expense && (t.expense > 0 || isSelected) && (
                                <div 
                                  className={`absolute rounded-full shadow-md z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                                    isSelected 
                                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-rose-600 border-2 border-white ring-2 ring-rose-400' 
                                      : activeSeriesCount === 1 
                                        ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white border-2 border-rose-500 group-hover:scale-125' 
                                        : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 border border-white group-hover:scale-125'
                                  }`} 
                                  style={{ top: `${expPt.topPct}%` }}
                                ></div>
                              )}

                              {/* Circle Dot for Net Profit */}
                              {chartVisibleLines.profit && (point.value > 0 || isSelected) && (
                                <div 
                                  className={`absolute rounded-full shadow-md z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                                    isSelected 
                                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-indigo-600 border-2 border-white ring-2 ring-indigo-400' 
                                      : activeSeriesCount === 1 
                                        ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white border-2 border-indigo-500 group-hover:scale-125' 
                                        : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 border border-white group-hover:scale-125'
                                  }`} 
                                  style={{ top: `${point.topPct}%` }}
                                ></div>
                              )}

                              {/* Circle Dot for Comparison Net Profit */}
                              {isCompareActive && chartVisibleLines.compareProfit && compPoint && (compPoint.hasValue || isSelected) && (
                                <div 
                                  className={`absolute rounded-full shadow-md z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                                    isSelected 
                                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-amber-500 border-2 border-white ring-2 ring-amber-400' 
                                      : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 border border-white group-hover:scale-125'
                                  }`} 
                                  style={{ top: `${compPoint.topPct}%` }}
                                ></div>
                              )}

                              {/* Circle Dot for Comparison Income */}
                              {isCompareActive && chartVisibleLines.compareIncome && compItem && (compItem.income > 0 || isSelected) && (
                                <div 
                                  className={`absolute rounded-full shadow-md z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                                    isSelected 
                                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white ring-2 ring-emerald-300' 
                                      : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 border border-white group-hover:scale-125'
                                  }`} 
                                  style={{ top: `${compareIncomePoints[idx]?.topPct}%` }}
                                ></div>
                              )}

                              {/* Circle Dot for Comparison Expense */}
                              {isCompareActive && chartVisibleLines.compareExpense && compItem && (compItem.expense > 0 || isSelected) && (
                                <div 
                                  className={`absolute rounded-full shadow-md z-20 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                                    isSelected 
                                      ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-rose-400 border-2 border-white ring-2 ring-rose-300' 
                                      : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-400 border border-white group-hover:scale-125'
                                  }`} 
                                  style={{ top: `${compareExpensePoints[idx]?.topPct}%` }}
                                ></div>
                              )}
                            </>
                          )}
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

              {/* Interactive Legend (Click each item to toggle on/off independently) */}
              <div className="mt-4 sm:mt-5 border-t border-slate-100 pt-3 sm:pt-4 text-[11px] sm:text-xs select-none">
                {chartType === 'mixed' ? (
                  /* Mixed Mode: Show distinct Bars and Lines groups */
                  <div className="flex flex-col gap-2 sm:gap-2.5 items-center justify-center">
                    {/* Bars Row */}
                    <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-0.5 shrink-0">
                        <BarChart3 size={13} className="text-slate-500" />
                        <span>แท่งกราฟ:</span>
                      </span>

                      {/* Bar Income */}
                      <button
                        type="button"
                        onClick={() => handleToggleBar('income')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleBars.income
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs hover:bg-emerald-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดแท่งรายรับ"
                      >
                        <div className={`w-2.5 h-3 rounded-[2px] shrink-0 ${chartVisibleBars.income ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className="kanit-text">รายรับ</span>
                      </button>

                      {/* Bar Profit */}
                      <button
                        type="button"
                        onClick={() => handleToggleBar('profit')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleBars.profit
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold shadow-xs hover:bg-indigo-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดแท่งกำไรสุทธิ"
                      >
                        <div className={`w-2.5 h-3 rounded-[2px] shrink-0 ${chartVisibleBars.profit ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                        <span className="kanit-text">กำไร</span>
                      </button>

                      {/* Bar Expense */}
                      <button
                        type="button"
                        onClick={() => handleToggleBar('expense')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleBars.expense
                            ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs hover:bg-rose-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดแท่งรายจ่าย"
                      >
                        <div className={`w-2.5 h-3 rounded-[2px] shrink-0 ${chartVisibleBars.expense ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                        <span className="kanit-text">รายจ่าย</span>
                      </button>
                    </div>

                    {/* Lines Row */}
                    <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-0.5 shrink-0">
                        <TrendingUp size={13} className="text-slate-500" />
                        <span>เส้นกราฟ:</span>
                      </span>

                      {/* Line Income */}
                      <button
                        type="button"
                        onClick={() => handleToggleLine('income')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleLines.income
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs hover:bg-emerald-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดเส้นรายรับ"
                      >
                        <div className="w-3.5 h-0.5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white"></div>
                        </div>
                        <span className="kanit-text">เส้นรายรับ</span>
                      </button>

                      {/* Line Profit */}
                      <button
                        type="button"
                        onClick={() => handleToggleLine('profit')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleLines.profit
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold shadow-xs hover:bg-indigo-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดเส้นกำไรสุทธิ"
                      >
                        <div className="w-3.5 h-0.5 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 border border-white"></div>
                        </div>
                        <span className="kanit-text">เส้นกำไร</span>
                      </button>

                      {/* Line Expense */}
                      <button
                        type="button"
                        onClick={() => handleToggleLine('expense')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleLines.expense
                            ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs hover:bg-rose-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดเส้นรายจ่าย"
                      >
                        <div className="w-3.5 h-0.5 bg-rose-500 rounded-full flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 border border-white"></div>
                        </div>
                        <span className="kanit-text">เส้นรายจ่าย</span>
                      </button>

                      {/* Compare Profit Line (if compare active) */}
                      {isCompareActive && (
                        <button
                          type="button"
                          onClick={() => handleToggleLine('compareProfit')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            chartVisibleLines.compareProfit
                              ? 'bg-amber-50 text-amber-800 border border-amber-300 font-bold shadow-xs hover:bg-amber-100/80'
                              : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                          }`}
                          title="คลิกเพื่อเปิด/ปิดเส้นกำไรเทียบ"
                        >
                          <div className="w-3.5 h-0 border-t-2 border-dashed border-amber-500 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 border border-white"></div>
                          </div>
                          <span className="kanit-text">กำไร เทียบ ({compDateRange.label})</span>
                        </button>
                      )}

                      {/* Compare Income Line (if compare active) */}
                      {isCompareActive && (
                        <button
                          type="button"
                          onClick={() => handleToggleLine('compareIncome')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            chartVisibleLines.compareIncome
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs hover:bg-emerald-100/80'
                              : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                          }`}
                          title="คลิกเพื่อเปิด/ปิดเส้นรายรับเทียบ"
                        >
                          <div className="w-3.5 h-0 border-t-2 border-dashed border-emerald-400 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white"></div>
                          </div>
                          <span className="kanit-text">รายรับ เทียบ</span>
                        </button>
                      )}

                      {/* Compare Expense Line (if compare active) */}
                      {isCompareActive && (
                        <button
                          type="button"
                          onClick={() => handleToggleLine('compareExpense')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            chartVisibleLines.compareExpense
                              ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs hover:bg-rose-100/80'
                              : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                          }`}
                          title="คลิกเพื่อเปิด/ปิดเส้นรายจ่ายเทียบ"
                        >
                          <div className="w-3.5 h-0 border-t-2 border-dashed border-rose-400 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 border border-white"></div>
                          </div>
                          <span className="kanit-text">รายจ่าย เทียบ</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : chartType === 'bar' ? (
                  /* Pure Bar Mode: Show Bar Toggles */
                  <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3">
                    {/* Bar Income */}
                    <button
                      type="button"
                      onClick={() => handleToggleBar('income')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        chartVisibleBars.income
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs hover:bg-emerald-100/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดแท่งรายรับ"
                    >
                      <div className={`w-2.5 h-3 rounded-[2px] shrink-0 ${chartVisibleBars.income ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <span className="kanit-text">รายรับ ({primaryPeriodLabel})</span>
                    </button>

                    {/* Bar Profit */}
                    <button
                      type="button"
                      onClick={() => handleToggleBar('profit')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        chartVisibleBars.profit
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold shadow-xs hover:bg-indigo-100/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดแท่งกำไรสุทธิ"
                    >
                      <div className={`w-2.5 h-3 rounded-[2px] shrink-0 ${chartVisibleBars.profit ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                      <span className="kanit-text">กำไรสุทธิ ({primaryPeriodLabel})</span>
                    </button>

                    {/* Bar Expense */}
                    <button
                      type="button"
                      onClick={() => handleToggleBar('expense')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        chartVisibleBars.expense
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs hover:bg-rose-100/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดแท่งรายจ่าย"
                    >
                      <div className={`w-2.5 h-3 rounded-[2px] shrink-0 ${chartVisibleBars.expense ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                      <span className="kanit-text">รายจ่าย ({primaryPeriodLabel})</span>
                    </button>
                  </div>
                ) : (
                  /* Pure Line Mode: Show Line Toggles */
                  <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3">
                    {/* Line Income */}
                    <button
                      type="button"
                      onClick={() => handleToggleLine('income')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        chartVisibleLines.income
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs hover:bg-emerald-100/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดเส้นรายรับ"
                    >
                      <div className="w-3.5 h-0.5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white"></div>
                      </div>
                      <span className="kanit-text">รายรับ ({primaryPeriodLabel})</span>
                    </button>

                    {/* Line Profit */}
                    <button
                      type="button"
                      onClick={() => handleToggleLine('profit')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        chartVisibleLines.profit
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold shadow-xs hover:bg-indigo-100/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดเส้นกำไรสุทธิ"
                    >
                      <div className="w-3.5 h-0.5 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 border border-white"></div>
                      </div>
                      <span className="kanit-text">กำไรสุทธิ ({primaryPeriodLabel})</span>
                    </button>

                    {/* Line Expense */}
                    <button
                      type="button"
                      onClick={() => handleToggleLine('expense')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        chartVisibleLines.expense
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs hover:bg-rose-100/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดเส้นรายจ่าย"
                    >
                      <div className="w-3.5 h-0.5 bg-rose-500 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 border border-white"></div>
                      </div>
                      <span className="kanit-text">รายจ่าย ({primaryPeriodLabel})</span>
                    </button>

                    {/* Compare Profit Line (if compare active) */}
                    {isCompareActive && (
                      <button
                        type="button"
                        onClick={() => handleToggleLine('compareProfit')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleLines.compareProfit
                            ? 'bg-amber-50 text-amber-800 border border-amber-300 font-bold shadow-xs hover:bg-amber-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดเส้นกำไรเทียบ"
                      >
                        <div className="w-3.5 h-0 border-t-2 border-dashed border-amber-500 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 border border-white"></div>
                        </div>
                        <span className="kanit-text">กำไร เทียบ ({compDateRange.label})</span>
                      </button>
                    )}

                    {/* Compare Income Line (if compare active) */}
                    {isCompareActive && (
                      <button
                        type="button"
                        onClick={() => handleToggleLine('compareIncome')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleLines.compareIncome
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs hover:bg-emerald-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดเส้นรายรับเทียบ"
                      >
                        <div className="w-3.5 h-0 border-t-2 border-dashed border-emerald-400 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white"></div>
                        </div>
                        <span className="kanit-text">รายรับ เทียบ</span>
                      </button>
                    )}

                    {/* Compare Expense Line (if compare active) */}
                    {isCompareActive && (
                      <button
                        type="button"
                        onClick={() => handleToggleLine('compareExpense')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          chartVisibleLines.compareExpense
                            ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs hover:bg-rose-100/80'
                            : 'bg-slate-50 text-slate-400 border border-slate-200/60 opacity-40 hover:opacity-75 line-through'
                        }`}
                        title="คลิกเพื่อเปิด/ปิดเส้นรายจ่ายเทียบ"
                      >
                        <div className="w-3.5 h-0 border-t-2 border-dashed border-rose-400 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 border border-white"></div>
                        </div>
                        <span className="kanit-text">รายจ่าย เทียบ</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Detailed Breakdown Statistics under Chart (Active in both Compare & Normal mode) */}
              {isCompareActive ? (
                comparisonStats ? (
                  <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                          <ArrowLeftRight size={14} />
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-800 kanit-text tracking-tight">
                          สรุปสถิติเปรียบเทียบ: {comparisonStats.primaryLabel} vs {comparisonStats.compareLabel}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-400 font-medium kanit-text">
                        ช่วงเวลาเทียบ {comparisonStats.days.primary} {comparisonStats.unitLabel} vs {comparisonStats.days.compare} {comparisonStats.unitLabel}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 min-[960px]:grid-cols-3 gap-3">
                      {/* Income Stats Card */}
                      <div className="bg-emerald-50/40 rounded-2xl p-3 sm:p-3.5 border border-emerald-100/80 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800 kanit-text flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> รายรับทั้งหมด
                            </span>
                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full font-data ${comparisonStats.income.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {comparisonStats.income.diff >= 0 ? '▲ +' : '▼ '}{comparisonStats.income.pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-800 font-data">
                              {formatMoney(comparisonStats.income.primary)}
                            </span>
                            <span className="text-[11px] sm:text-xs text-slate-400 font-data">
                              vs {formatMoney(comparisonStats.income.compare)}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold mt-1 text-slate-500 kanit-text">
                            ผลต่าง: <span className={`font-data ${comparisonStats.income.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{comparisonStats.income.diff >= 0 ? '+' : ''}{formatMoney(comparisonStats.income.diff)} ฿</span>
                          </div>

                          {/* Mini Visual Trend Bar for Primary Income */}
                          <div className="mt-2.5 mb-1 bg-white/70 rounded-xl p-1.5 border border-emerald-100/60">
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-data mb-1">
                              <span>กราฟแนวโน้ม ({primaryPeriodLabel})</span>
                              <span className="text-emerald-700 font-bold">Peak: {formatMoney(comparisonStats.income.maxPrimary.amount)} ฿</span>
                            </div>
                            <div className="flex items-end gap-0.5 h-6 w-full">
                              {monthlyTrends.map((t, idx) => {
                                const maxVal = comparisonStats.income.maxPrimary.amount || 1;
                                const hPct = maxVal > 0 ? Math.max(8, Math.min(100, (t.income / maxVal) * 100)) : 8;
                                const isMax = t.income > 0 && t.income === comparisonStats.income.maxPrimary.amount;
                                return (
                                  <div
                                    key={idx}
                                    title={`${t.fullLabel || t.monthLabel}: ${formatMoney(t.income)} ฿`}
                                    className={`flex-1 rounded-xs transition-all hover:opacity-100 ${isMax ? 'bg-emerald-600 shadow-xs' : t.income > 0 ? 'bg-emerald-400/80 hover:bg-emerald-500' : 'bg-slate-200/60'}`}
                                    style={{ height: `${hPct}%` }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-emerald-100/70 text-[10px] sm:text-[11px] space-y-1 text-slate-600">
                          <div className="flex justify-between">
                            <span className="kanit-text">เฉลี่ยต่อ{comparisonStats.unitLabel}:</span>
                            <span className="font-data font-bold text-slate-700">{formatMoney(comparisonStats.income.avgPrimary)} ฿/{comparisonStats.unitLabel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="kanit-text">ยอดสูงสุด:</span>
                            <span className="font-data font-bold text-emerald-700 truncate max-w-[150px]" title={comparisonStats.income.maxPrimary.label}>
                              {formatMoney(comparisonStats.income.maxPrimary.amount)} ฿
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="kanit-text">ยอดต่ำสุด:</span>
                            <span className="font-data font-bold text-slate-500 truncate max-w-[150px]" title={comparisonStats.income.minPrimary.label}>
                              {formatMoney(comparisonStats.income.minPrimary.amount)} ฿
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expense Stats Card */}
                      <div className="bg-rose-50/40 rounded-2xl p-3 sm:p-3.5 border border-rose-100/80 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-800 kanit-text flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span> รายจ่ายทั้งหมด
                            </span>
                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full font-data ${comparisonStats.expense.diff <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {comparisonStats.expense.diff >= 0 ? '▲ +' : '▼ '}{comparisonStats.expense.pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-800 font-data">
                              {formatMoney(comparisonStats.expense.primary)}
                            </span>
                            <span className="text-[11px] sm:text-xs text-slate-400 font-data">
                              vs {formatMoney(comparisonStats.expense.compare)}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold mt-1 text-slate-500 kanit-text">
                            ผลต่าง: <span className={`font-data ${comparisonStats.expense.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{comparisonStats.expense.diff >= 0 ? '+' : ''}{formatMoney(comparisonStats.expense.diff)} ฿</span>
                          </div>

                          {/* Mini Visual Trend Bar for Primary Expense */}
                          <div className="mt-2.5 mb-1 bg-white/70 rounded-xl p-1.5 border border-rose-100/60">
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-data mb-1">
                              <span>กราฟแนวโน้ม ({primaryPeriodLabel})</span>
                              <span className="text-rose-700 font-bold">Peak: {formatMoney(comparisonStats.expense.maxPrimary.amount)} ฿</span>
                            </div>
                            <div className="flex items-end gap-0.5 h-6 w-full">
                              {monthlyTrends.map((t, idx) => {
                                const maxVal = comparisonStats.expense.maxPrimary.amount || 1;
                                const hPct = maxVal > 0 ? Math.max(8, Math.min(100, (t.expense / maxVal) * 100)) : 8;
                                const isMax = t.expense > 0 && t.expense === comparisonStats.expense.maxPrimary.amount;
                                return (
                                  <div
                                    key={idx}
                                    title={`${t.fullLabel || t.monthLabel}: ${formatMoney(t.expense)} ฿`}
                                    className={`flex-1 rounded-xs transition-all hover:opacity-100 ${isMax ? 'bg-rose-600 shadow-xs' : t.expense > 0 ? 'bg-rose-400/80 hover:bg-rose-500' : 'bg-slate-200/60'}`}
                                    style={{ height: `${hPct}%` }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-rose-100/70 text-[10px] sm:text-[11px] space-y-1 text-slate-600">
                          <div className="flex justify-between">
                            <span className="kanit-text">เฉลี่ยต่อ{comparisonStats.unitLabel}:</span>
                            <span className="font-data font-bold text-slate-700">{formatMoney(comparisonStats.expense.avgPrimary)} ฿/{comparisonStats.unitLabel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="kanit-text">รายจ่ายสูงสุด:</span>
                            <span className="font-data font-bold text-rose-700 truncate max-w-[150px]" title={comparisonStats.expense.maxPrimary.label}>
                              {formatMoney(comparisonStats.expense.maxPrimary.amount)} ฿
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="kanit-text">รายจ่ายต่ำสุด:</span>
                            <span className="font-data font-bold text-slate-500 truncate max-w-[150px]" title={comparisonStats.expense.minPrimary.label}>
                              {formatMoney(comparisonStats.expense.minPrimary.amount)} ฿
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Net Profit Stats Card */}
                      <div className="bg-indigo-50/40 rounded-2xl p-3 sm:p-3.5 border border-indigo-100/80 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-800 kanit-text flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> กำไรสุทธิ
                            </span>
                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full font-data ${comparisonStats.profit.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {comparisonStats.profit.diff >= 0 ? '▲ +' : '▼ '}{comparisonStats.profit.pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-800 font-data">
                              {formatMoney(comparisonStats.profit.primary)}
                            </span>
                            <span className="text-[11px] sm:text-xs text-slate-400 font-data">
                              vs {formatMoney(comparisonStats.profit.compare)}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold mt-1 text-slate-500 kanit-text">
                            ผลต่าง: <span className={`font-data ${comparisonStats.profit.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{comparisonStats.profit.diff >= 0 ? '+' : ''}{formatMoney(comparisonStats.profit.diff)} ฿</span>
                          </div>

                          {/* Mini Visual Trend Bar for Primary Profit */}
                          <div className="mt-2.5 mb-1 bg-white/70 rounded-xl p-1.5 border border-indigo-100/60">
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-data mb-1">
                              <span>กราฟแนวโน้ม ({primaryPeriodLabel})</span>
                              <span className="text-indigo-700 font-bold">Peak: {formatMoney(comparisonStats.profit.maxPrimary.amount)} ฿</span>
                            </div>
                            <div className="flex items-end gap-0.5 h-6 w-full">
                              {monthlyTrends.map((t, idx) => {
                                const p = t.profit ?? (t.income - t.expense);
                                const maxVal = Math.max(Math.abs(comparisonStats.profit.maxPrimary.amount || 1), Math.abs(comparisonStats.profit.minPrimary?.amount || 1));
                                const hPct = maxVal > 0 ? Math.max(8, Math.min(100, (Math.abs(p) / maxVal) * 100)) : 8;
                                const isPositive = p >= 0;
                                return (
                                  <div
                                    key={idx}
                                    title={`${t.fullLabel || t.monthLabel}: ${p >= 0 ? 'กำไร' : 'ขาดทุน'} ${formatMoney(p)} ฿`}
                                    className={`flex-1 rounded-xs transition-all hover:opacity-100 ${isPositive ? 'bg-indigo-500/80 hover:bg-indigo-600' : 'bg-rose-500/80 hover:bg-rose-600'}`}
                                    style={{ height: `${hPct}%` }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-indigo-100/70 text-[10px] sm:text-[11px] space-y-1 text-slate-600">
                          <div className="flex justify-between">
                            <span className="kanit-text">อัตรากำไร (Margin):</span>
                            <span className="font-data font-bold text-indigo-700">
                              {comparisonStats.profit.marginPrimary.toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">({comparisonStats.profit.marginDiff >= 0 ? '+' : ''}{comparisonStats.profit.marginDiff.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="kanit-text">เฉลี่ยต่อ{comparisonStats.unitLabel}:</span>
                            <span className="font-data font-bold text-slate-700">{formatMoney(comparisonStats.profit.avgPrimary)} ฿/{comparisonStats.unitLabel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="kanit-text">กำไรสูงสุด:</span>
                            <span className="font-data font-bold text-indigo-700 truncate max-w-[150px]" title={comparisonStats.profit.maxPrimary.label}>
                              {formatMoney(comparisonStats.profit.maxPrimary.amount)} ฿
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isCompareLoading ? (
                  <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 flex items-center justify-center py-6 text-slate-400 text-xs font-bold kanit-text gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    <span>กำลังประมวลผลสถิติเปรียบเทียบ...</span>
                  </div>
                ) : (
                  <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 flex items-center justify-center py-6 text-slate-400 text-xs font-medium kanit-text">
                    ไม่พบข้อมูลสถิติเปรียบเทียบสำหรับช่วงเวลานี้
                  </div>
                )
              ) : primaryStats ? (
                <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={15} className="text-emerald-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 kanit-text">
                        สรุปสถิติ: {primaryStats.periodLabel}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-400 font-medium kanit-text">
                      รวบรวมจากข้อมูลกราฟ {primaryStats.daysCount} {primaryStats.unitLabel} (มีรายรับ {primaryStats.daysWithIncome} {primaryStats.unitLabel})
                    </div>
                  </div>

                  <div className="grid grid-cols-1 min-[960px]:grid-cols-3 gap-3">
                    {/* Income Stats Card */}
                    <div className="bg-emerald-50/40 rounded-2xl p-3 sm:p-3.5 border border-emerald-100/80 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 kanit-text flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> รายรับทั้งหมด
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full font-data bg-emerald-100 text-emerald-700">
                            เฉลี่ย {formatMoney(primaryStats.income.avg)} ฿/{primaryStats.unitLabel}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-base sm:text-lg font-black text-slate-800 font-data">
                            {formatMoney(primaryStats.income.total)} <span className="text-xs font-normal text-slate-400">฿</span>
                          </span>
                        </div>
                        <div className="text-[11px] font-bold mt-0.5 text-slate-500 kanit-text">
                          มีรายรับ: <span className="font-data text-emerald-600 font-bold">{primaryStats.daysWithIncome}</span> จาก {primaryStats.daysCount} {primaryStats.unitLabel}
                        </div>

                        {/* Mini Visual Trend Bar Chart for Income */}
                        <div className="mt-2.5 mb-1 bg-white/70 rounded-xl p-1.5 border border-emerald-100/60">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-data mb-1">
                            <span>กราฟแนวโน้มรายรับ</span>
                            <span className="text-emerald-700 font-bold">Peak: {formatMoney(primaryStats.income.max.amount)} ฿</span>
                          </div>
                          <div className="flex items-end gap-0.5 h-6 w-full">
                            {monthlyTrends.map((t, idx) => {
                              const maxInc = primaryStats.income.max.amount || 1;
                              const hPct = maxInc > 0 ? Math.max(8, Math.min(100, (t.income / maxInc) * 100)) : 8;
                              const isMax = t.income > 0 && t.income === primaryStats.income.max.amount;
                              return (
                                <div
                                  key={idx}
                                  title={`${t.fullLabel || t.monthLabel}: ${formatMoney(t.income)} ฿`}
                                  className={`flex-1 rounded-xs transition-all hover:opacity-100 ${isMax ? 'bg-emerald-600 shadow-xs' : t.income > 0 ? 'bg-emerald-400/80 hover:bg-emerald-500' : 'bg-slate-200/60'}`}
                                  style={{ height: `${hPct}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-emerald-100/70 text-[10px] sm:text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="kanit-text">เฉลี่ยต่อ{primaryStats.unitLabel}:</span>
                          <span className="font-data font-bold text-slate-700">{formatMoney(primaryStats.income.avg)} ฿</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="kanit-text">ยอดสูงสุด:</span>
                          <span className="font-data font-bold text-emerald-700 truncate max-w-[150px]" title={primaryStats.income.max.label}>
                            {formatMoney(primaryStats.income.max.amount)} ฿ <span className="text-[9px] text-slate-400 font-normal">({primaryStats.income.max.label})</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="kanit-text">ยอดต่ำสุด (มีรายการ):</span>
                          <span className="font-data font-bold text-slate-500 truncate max-w-[150px]" title={primaryStats.income.min.label}>
                            {formatMoney(primaryStats.income.min.amount)} ฿ <span className="text-[9px] text-slate-400 font-normal">({primaryStats.income.min.label})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expense Stats Card */}
                    <div className="bg-rose-50/40 rounded-2xl p-3 sm:p-3.5 border border-rose-100/80 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-800 kanit-text flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span> รายจ่ายทั้งหมด
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full font-data bg-rose-100 text-rose-700">
                            {primaryStats.expense.ratio.toFixed(1)}% ของรายรับ
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-base sm:text-lg font-black text-slate-800 font-data">
                            {formatMoney(primaryStats.expense.total)} <span className="text-xs font-normal text-slate-400">฿</span>
                          </span>
                        </div>
                        <div className="text-[11px] font-bold mt-0.5 text-slate-500 kanit-text">
                          มีรายจ่าย: <span className="font-data text-rose-600 font-bold">{primaryStats.daysWithExpense}</span> จาก {primaryStats.daysCount} {primaryStats.unitLabel}
                        </div>

                        {/* Mini Visual Trend Bar Chart for Expense */}
                        <div className="mt-2.5 mb-1 bg-white/70 rounded-xl p-1.5 border border-rose-100/60">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-data mb-1">
                            <span>กราฟแนวโน้มรายจ่าย</span>
                            <span className="text-rose-700 font-bold">Peak: {formatMoney(primaryStats.expense.max.amount)} ฿</span>
                          </div>
                          <div className="flex items-end gap-0.5 h-6 w-full">
                            {monthlyTrends.map((t, idx) => {
                              const maxExp = primaryStats.expense.max.amount || 1;
                              const hPct = maxExp > 0 ? Math.max(8, Math.min(100, (t.expense / maxExp) * 100)) : 8;
                              const isMax = t.expense > 0 && t.expense === primaryStats.expense.max.amount;
                              return (
                                <div
                                  key={idx}
                                  title={`${t.fullLabel || t.monthLabel}: ${formatMoney(t.expense)} ฿`}
                                  className={`flex-1 rounded-xs transition-all hover:opacity-100 ${isMax ? 'bg-rose-600 shadow-xs' : t.expense > 0 ? 'bg-rose-400/80 hover:bg-rose-500' : 'bg-slate-200/60'}`}
                                  style={{ height: `${hPct}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-rose-100/70 text-[10px] sm:text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="kanit-text">เฉลี่ยต่อ{primaryStats.unitLabel}:</span>
                          <span className="font-data font-bold text-slate-700">{formatMoney(primaryStats.expense.avg)} ฿</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="kanit-text">รายจ่ายสูงสุด:</span>
                          <span className="font-data font-bold text-rose-700 truncate max-w-[150px]" title={primaryStats.expense.max.label}>
                            {formatMoney(primaryStats.expense.max.amount)} ฿ <span className="text-[9px] text-slate-400 font-normal">({primaryStats.expense.max.label})</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="kanit-text">รายจ่ายต่ำสุด (มีรายการ):</span>
                          <span className="font-data font-bold text-slate-500 truncate max-w-[150px]" title={primaryStats.expense.min.label}>
                            {formatMoney(primaryStats.expense.min.amount)} ฿ <span className="text-[9px] text-slate-400 font-normal">({primaryStats.expense.min.label})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Profit Stats Card */}
                    <div className="bg-indigo-50/40 rounded-2xl p-3 sm:p-3.5 border border-indigo-100/80 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-800 kanit-text flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> กำไรสุทธิ
                          </span>
                          <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full font-data ${primaryStats.profit.margin >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                            Margin {primaryStats.profit.margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className={`text-base sm:text-lg font-black font-data ${primaryStats.profit.total >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            {formatMoney(primaryStats.profit.total)} <span className="text-xs font-normal text-slate-400">฿</span>
                          </span>
                        </div>
                        <div className="text-[11px] font-bold mt-0.5 text-slate-500 kanit-text">
                          กำไรเป็นบวก: <span className="font-data text-indigo-600 font-bold">{primaryStats.positiveProfitDays}</span> จาก {primaryStats.daysCount} {primaryStats.unitLabel}
                        </div>

                        {/* Mini Visual Trend Bar Chart for Net Profit */}
                        <div className="mt-2.5 mb-1 bg-white/70 rounded-xl p-1.5 border border-indigo-100/60">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-data mb-1">
                            <span>กราฟแนวโน้มกำไร</span>
                            <span className="text-indigo-700 font-bold">Peak: {formatMoney(primaryStats.profit.max.amount)} ฿</span>
                          </div>
                          <div className="flex items-end gap-0.5 h-6 w-full">
                            {monthlyTrends.map((t, idx) => {
                              const p = t.profit ?? (t.income - t.expense);
                              const maxP = Math.max(Math.abs(primaryStats.profit.max.amount || 1), Math.abs(primaryStats.profit.min.amount || 1));
                              const hPct = maxP > 0 ? Math.max(8, Math.min(100, (Math.abs(p) / maxP) * 100)) : 8;
                              const isPositive = p >= 0;
                              return (
                                <div
                                  key={idx}
                                  title={`${t.fullLabel || t.monthLabel}: ${p >= 0 ? 'กำไร' : 'ขาดทุน'} ${formatMoney(p)} ฿`}
                                  className={`flex-1 rounded-xs transition-all hover:opacity-100 ${isPositive ? 'bg-indigo-500/80 hover:bg-indigo-600' : 'bg-rose-500/80 hover:bg-rose-600'}`}
                                  style={{ height: `${hPct}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-indigo-100/70 text-[10px] sm:text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="kanit-text">อัตรากำไร (Net Margin):</span>
                          <span className="font-data font-bold text-indigo-700">{primaryStats.profit.margin.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="kanit-text">เฉลี่ยต่อ{primaryStats.unitLabel}:</span>
                          <span className="font-data font-bold text-slate-700">{formatMoney(primaryStats.profit.avg)} ฿</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="kanit-text">กำไรสูงสุด:</span>
                          <span className="font-data font-bold text-indigo-700 truncate max-w-[150px]" title={primaryStats.profit.max.label}>
                            {formatMoney(primaryStats.profit.max.amount)} ฿ <span className="text-[9px] text-slate-400 font-normal">({primaryStats.profit.max.label})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Payment Methods & Branch Revenue */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-6 lg:p-7 flex flex-col justify-between min-w-0 overflow-hidden h-full">
            <div className="flex flex-col h-full justify-between space-y-5 sm:space-y-6">
              {/* Payment Methods Section */}
              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 kanit-text flex items-center gap-2.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span>ช่องทางการชำระเงิน</span>
                  </h3>
                  <span className="text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-3 py-1 rounded-full font-data shadow-xs">
                    {summary.checkoutsCount > 0 ? `${summary.checkoutsCount} รายการ` : `${formatMoney(summary.income)} ฿`}
                  </span>
                </div>

                {/* Proportional Multi-Segment Stacked Bar */}
                {(() => {
                  const totalPay = (summary.cash || 0) + (summary.transfer || 0) + (summary.qr || 0) + (summary.card || 0);
                  const base = totalPay > 0 ? totalPay : (summary.income > 0 ? summary.income : 1);
                  const transferAmt = (summary.transfer || 0) + (summary.qr || 0);
                  const cashAmt = summary.cash || 0;
                  const cardAmt = summary.card || 0;
                  const pTransfer = (transferAmt / base) * 100;
                  const pCash = (cashAmt / base) * 100;
                  const pCard = (cardAmt / base) * 100;

                  return (
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
                        {pTransfer > 0 && (
                          <div 
                            style={{ width: `${pTransfer}%` }} 
                            className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-500" 
                            title={`โอน/สแกน QR: ${pTransfer.toFixed(1)}%`} 
                          />
                        )}
                        {pCash > 0 && (
                          <div 
                            style={{ width: `${pCash}%` }} 
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" 
                            title={`เงินสด: ${pCash.toFixed(1)}%`} 
                          />
                        )}
                        {pCard > 0 && (
                          <div 
                            style={{ width: `${pCard}%` }} 
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" 
                            title={`บัตรเครดิต: ${pCard.toFixed(1)}%`} 
                          />
                        )}
                        {totalPay === 0 && (
                          <div className="w-full h-full bg-slate-200 rounded-full" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-data px-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> โอน/QR {pTransfer.toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> เงินสด {pCash.toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> บัตร {pCard.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Individual Channel Cards */}
                <div className="space-y-2 pt-1">
                  {/* Channel 1: Transfer & QR */}
                  {(() => {
                    const amt = (summary.transfer || 0) + (summary.qr || 0);
                    const totalPay = (summary.cash || 0) + amt + (summary.card || 0);
                    const base = totalPay > 0 ? totalPay : (summary.income > 0 ? summary.income : 1);
                    const pct = totalPay > 0 ? (amt / base) * 100 : 0;
                    return (
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-sky-50/50 to-transparent border border-sky-100/80 hover:border-sky-200 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                              <QrCode size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 kanit-text truncate">โอนเงิน / สแกนจ่าย</div>
                              <div className="text-[10px] text-slate-400 truncate">พร้อมเพย์ & ธนาคาร</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-black font-data text-slate-800">{formatMoney(amt)} <span className="text-[10px] font-normal text-slate-400">฿</span></div>
                            <span className="inline-block text-[10px] font-bold font-data text-sky-700 bg-sky-100/90 px-1.5 py-0.2 rounded-full">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-sky-100/70 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Channel 2: Cash */}
                  {(() => {
                    const amt = summary.cash || 0;
                    const transferAmt = (summary.transfer || 0) + (summary.qr || 0);
                    const totalPay = amt + transferAmt + (summary.card || 0);
                    const base = totalPay > 0 ? totalPay : (summary.income > 0 ? summary.income : 1);
                    const pct = totalPay > 0 ? (amt / base) * 100 : 0;
                    return (
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-transparent border border-emerald-100/80 hover:border-emerald-200 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                              <Banknote size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 kanit-text truncate">เงินสดหน้าร้าน</div>
                              <div className="text-[10px] text-slate-400 truncate">จุดแคชเชียร์คลินิก</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-black font-data text-slate-800">{formatMoney(amt)} <span className="text-[10px] font-normal text-slate-400">฿</span></div>
                            <span className="inline-block text-[10px] font-bold font-data text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-full">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-emerald-100/70 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Channel 3: Card */}
                  {(() => {
                    const amt = summary.card || 0;
                    const transferAmt = (summary.transfer || 0) + (summary.qr || 0);
                    const totalPay = (summary.cash || 0) + transferAmt + amt;
                    const base = totalPay > 0 ? totalPay : (summary.income > 0 ? summary.income : 1);
                    const pct = totalPay > 0 ? (amt / base) * 100 : 0;
                    return (
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-50/50 to-transparent border border-indigo-100/80 hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <CreditCard size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 kanit-text truncate">บัตรเครดิต / เดบิต</div>
                              <div className="text-[10px] text-slate-400 truncate">EDC, Visa, Mastercard</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-black font-data text-slate-800">{formatMoney(amt)} <span className="text-[10px] font-normal text-slate-400">฿</span></div>
                            <span className="inline-block text-[10px] font-bold font-data text-indigo-700 bg-indigo-100/90 px-1.5 py-0.2 rounded-full">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-indigo-100/70 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Circular / Donut Chart Summary Card for Payment Methods */}
                {(() => {
                  const transferAmt = (summary.transfer || 0) + (summary.qr || 0);
                  const cashAmt = summary.cash || 0;
                  const cardAmt = summary.card || 0;
                  const totalPay = cashAmt + transferAmt + cardAmt;
                  const base = totalPay > 0 ? totalPay : 1;
                  const pTransfer = totalPay > 0 ? (transferAmt / base) * 100 : 0;
                  const pCash = totalPay > 0 ? (cashAmt / base) * 100 : 0;
                  const pCard = totalPay > 0 ? (cardAmt / base) * 100 : 0;

                  // Donut SVG parameters
                  const radius = 36;
                  const circ = 2 * Math.PI * radius;
                  const strokeW = 9;

                  const dashTransfer = (pTransfer / 100) * circ;
                  const dashCash = (pCash / 100) * circ;
                  const dashCard = (pCard / 100) * circ;

                  const offsetTransfer = 0;
                  const offsetCash = -dashTransfer;
                  const offsetCard = -(dashTransfer + dashCash);

                  const methods = [
                    { name: 'โอนเงิน/QR', amt: transferAmt, pct: pTransfer, color: 'text-sky-600' },
                    { name: 'เงินสด', amt: cashAmt, pct: pCash, color: 'text-emerald-600' },
                    { name: 'บัตรเครดิต', amt: cardAmt, pct: pCard, color: 'text-indigo-600' },
                  ];
                  methods.sort((a, b) => b.amt - a.amt);
                  const topMethod = methods[0];
                  const avgPerBill = summary.checkoutsCount > 0 ? (totalPay / summary.checkoutsCount) : 0;

                  return (
                    <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-slate-50/90 via-indigo-50/20 to-slate-50/60 border border-slate-200/60 shadow-xs flex items-center justify-between gap-3">
                      {/* SVG Donut Chart with Center Label */}
                      <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth={strokeW}
                          />
                          {totalPay > 0 ? (
                            <>
                              {pTransfer > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#0ea5e9"
                                  strokeWidth={strokeW}
                                  strokeDasharray={`${dashTransfer} ${circ - dashTransfer}`}
                                  strokeDashoffset={offsetTransfer}
                                  strokeLinecap="round"
                                  className="transition-all duration-700 ease-out"
                                />
                              )}
                              {pCash > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#10b981"
                                  strokeWidth={strokeW}
                                  strokeDasharray={`${dashCash} ${circ - dashCash}`}
                                  strokeDashoffset={offsetCash}
                                  strokeLinecap="round"
                                  className="transition-all duration-700 ease-out"
                                />
                              )}
                              {pCard > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#6366f1"
                                  strokeWidth={strokeW}
                                  strokeDasharray={`${dashCard} ${circ - dashCard}`}
                                  strokeDashoffset={offsetCard}
                                  strokeLinecap="round"
                                  className="transition-all duration-700 ease-out"
                                />
                              )}
                            </>
                          ) : (
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke="#e2e8f0"
                              strokeWidth={strokeW}
                              strokeDasharray="4 4"
                            />
                          )}
                        </svg>

                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-[9px] font-bold text-slate-400 kanit-text leading-tight">สัดส่วน</span>
                          <span className="text-xs sm:text-sm font-black font-data text-slate-800 leading-none mt-0.5">
                            {totalPay > 0 ? `${topMethod.pct.toFixed(0)}%` : '0%'}
                          </span>
                          <span className="text-[8px] font-medium text-slate-400 font-data truncate max-w-[48px] leading-tight mt-0.5">
                            {topMethod.amt > 0 ? topMethod.name : 'ไม่มีข้อมูล'}
                          </span>
                        </div>
                      </div>

                      {/* Info Breakdown alongside the Donut */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Top Channel Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-slate-700 kanit-text flex items-center gap-1 truncate">
                            <span>🏆 นิยมสูงสุด:</span>
                            <span className={`font-black ${topMethod.color}`}>{topMethod.amt > 0 ? topMethod.name : '-'}</span>
                          </span>
                          {topMethod.amt > 0 && (
                            <span className="text-[10px] font-bold font-data text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.2 rounded-full shrink-0">
                              {topMethod.pct.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        {/* Mini Percentage Legend Chips */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-data font-bold">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            <span>โอน {pTransfer.toFixed(0)}%</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>เงินสด {pCash.toFixed(0)}%</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span>บัตร {pCard.toFixed(0)}%</span>
                          </span>
                        </div>

                        {/* Average Ticket Size / Count */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 kanit-text">
                          <span className="truncate">ยอดเฉลี่ยต่อบิล:</span>
                          <span className="font-bold font-data text-slate-800 shrink-0">
                            {formatMoney(avgPerBill)} <span className="text-[9px] font-normal text-slate-400">฿</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Branch Breakdown Section */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-600 kanit-text flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400" />
                    <span>สรุปยอดแบ่งตามสาขา</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-data">
                    {branchRevenue.length} สาขา
                  </span>
                </div>

                <div className="space-y-2 max-h-48 xl:max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {(() => {
                    const totalBranchInc = branchRevenue.reduce((acc, br) => acc + (br.income || 0), 0) || 1;
                    return branchRevenue.map((br, idx) => {
                      const sharePct = ((br.income / totalBranchInc) * 100).toFixed(0);
                      const netBranchProfit = br.income - br.expense;
                      return (
                        <div key={idx} className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 transition-all">
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-800 kanit-text truncate max-w-[150px]">{br.name}</span>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <span className="font-bold text-emerald-600 font-data">+{formatMoney(br.income)}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-data ${netBranchProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                กำไร {formatMoney(netBranchProfit)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-data">
                            <span>สัดส่วนรายรับ: {sharePct}%</span>
                            <span>รายจ่าย: -{formatMoney(br.expense)} ฿</span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${sharePct}%` }}></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Staff ranking & Top Products */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 w-full min-w-0">
          {/* Top Staff / Doctors Performance */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-6 lg:p-7 flex flex-col min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 kanit-text flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <span>อันดับผลงานและค่าคอมมิชชั่น</span>
              </h3>

              {/* Segmented Tabs */}
              <div className="w-full sm:w-auto overflow-x-auto scrollbar-none flex bg-slate-100 p-1 rounded-xl gap-1 text-[11px] sm:text-xs font-bold kanit-text border border-slate-200/60 shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setStaffRankingTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${staffRankingTab === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setStaffRankingTab('df')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${staffRankingTab === 'df' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Stethoscope size={12} /> ค่า DF (เคสรักษา)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffRankingTab('sales')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${staffRankingTab === 'sales' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Award size={12} /> ค่าคอม (ยอดขาย)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar -mx-2 sm:mx-0 px-2 sm:px-0">
              <table className="table-auto w-full min-w-[320px] sm:min-w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold text-[11px] sm:text-xs">
                    <th className={`${staffRankingTab === 'all' ? 'w-[34%]' : 'w-[38%]'} py-2.5 sm:py-3 px-1.5 sm:px-2 kanit-text`}>
                      {staffRankingTab === 'df' ? 'แพทย์ผู้รักษา' : staffRankingTab === 'sales' ? 'ผู้แนะนำ / ผู้ขาย' : 'พนักงาน'}
                    </th>
                    {staffRankingTab === 'all' ? (
                      <>
                        <th className="w-[18%] py-2.5 sm:py-3 px-1 sm:px-2 kanit-text text-center text-emerald-700 whitespace-nowrap">
                          🩺 เคสรักษา
                        </th>
                        <th className="w-[18%] py-2.5 sm:py-3 px-1 sm:px-2 kanit-text text-center text-amber-700 whitespace-nowrap">
                          💼 บิลขาย
                        </th>
                      </>
                    ) : (
                      <th className="w-[28%] py-2.5 sm:py-3 px-1 sm:px-2 kanit-text text-center whitespace-nowrap">
                        {staffRankingTab === 'df' ? '🩺 เคสรักษา' : '💼 บิลขาย'}
                      </th>
                    )}
                    <th className={`${staffRankingTab === 'all' ? 'w-[30%]' : 'w-[34%]'} py-2.5 sm:py-3 px-1.5 sm:px-2 kanit-text text-right whitespace-nowrap`}>
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
                        <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <span className="font-bold text-slate-400 font-data w-3.5 sm:w-4 text-[11px] sm:text-xs shrink-0">{idx + 1}</span>
                          {st.photo ? (
                            <img src={st.photo} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-slate-200 shrink-0" alt="Avatar"/>
                          ) : (
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><User size={13}/></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-700 kanit-text truncate text-xs sm:text-sm">{st.name}</div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium kanit-text truncate mt-0.5">{st.position || st.role}</div>
                          </div>
                        </td>

                        {staffRankingTab === 'all' ? (
                          <>
                            <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center font-data text-emerald-700 font-bold">
                              {st.dfCases > 0 ? (
                                <span className="bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100/80 text-[10px] sm:text-xs whitespace-nowrap">
                                  {st.dfCases} เคส
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center font-data text-amber-700 font-bold">
                              {st.salesCases > 0 ? (
                                <span className="bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-100/80 text-[10px] sm:text-xs whitespace-nowrap">
                                  {st.salesCases} บิล
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center font-data text-slate-600 font-bold">
                            {staffRankingTab === 'df' ? (
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100/80 text-[10px] sm:text-xs whitespace-nowrap">
                                {st.dfCases} เคส
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-100/80 text-[10px] sm:text-xs whitespace-nowrap">
                                {st.salesCases} บิล
                              </span>
                            )}
                          </td>
                        )}

                        <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-right font-bold text-emerald-600 font-data">
                          {staffRankingTab === 'df' ? (
                            <div className="text-xs sm:text-sm">{formatMoney(st.dfCommission)}</div>
                          ) : staffRankingTab === 'sales' ? (
                            <div className="text-xs sm:text-sm">{formatMoney(st.salesCommission)}</div>
                          ) : (
                            <div>
                              <div className="text-xs sm:text-sm">{formatMoney(st.commission)}</div>
                              {(st.dfCommission > 0 || st.salesCommission > 0) && (
                                <div className="text-[9px] sm:text-[10px] text-slate-400 font-data font-normal mt-0.5 whitespace-nowrap">
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
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 p-4 sm:p-6 lg:p-7 flex flex-col min-h-[340px] sm:min-h-[380px] lg:min-h-[410px] min-w-0 overflow-hidden">
            <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-2.5 sm:gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 kanit-text truncate">
                  สินค้าและบริการขายดี
                </h3>
                <span className="text-xs font-medium text-slate-400 kanit-text shrink-0 hidden sm:inline">
                  ({allTopProducts.length > 0 ? `อันดับ ${topProductsPage * TOP_PRODUCTS_PER_PAGE + 1}-${Math.min((topProductsPage + 1) * TOP_PRODUCTS_PER_PAGE, allTopProducts.length)} จาก ${allTopProducts.length}` : '0 รายการ'})
                </span>
              </div>

              <div className="flex items-center justify-between min-[480px]:justify-end gap-2">
                <span className="text-[11px] font-normal text-slate-400 kanit-text shrink-0 sm:hidden">
                  {allTopProducts.length > 0 ? `${topProductsPage * TOP_PRODUCTS_PER_PAGE + 1}-${Math.min((topProductsPage + 1) * TOP_PRODUCTS_PER_PAGE, allTopProducts.length)} จาก ${allTopProducts.length}` : '0 รายการ'}
                </span>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setTopProductsPage(prev => Math.max(0, prev - 1))}
                    disabled={topProductsPage === 0}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 border border-slate-200/60 shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                    title="อันดับก่อนหน้า"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-600 font-data px-1.5 min-w-[32px] sm:min-w-[36px] text-center">
                    {topProductsTotalPages > 0 ? `${topProductsPage + 1}/${topProductsTotalPages}` : '1/1'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTopProductsPage(prev => Math.min(topProductsTotalPages - 1, prev + 1))}
                    disabled={topProductsPage >= topProductsTotalPages - 1}
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-white text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 border border-slate-200/60 shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                    title="อันดับถัดไป"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col justify-start min-h-[260px] sm:min-h-[290px]">
              {paginatedTopProducts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 kanit-text text-sm italic py-10">
                  ไม่มีประวัติการจำหน่ายสินค้า/บริการในช่วงเวลานี้
                </div>
              ) : (
                paginatedTopProducts.map((p, idx) => {
                  const rankNumber = topProductsPage * TOP_PRODUCTS_PER_PAGE + idx + 1;
                  return (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2.5 sm:pb-3 last:border-0 last:pb-0 gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-inner ${
                          rankNumber === 1 ? 'bg-amber-100 text-amber-700 font-black' :
                          rankNumber === 2 ? 'bg-slate-200 text-slate-700 font-bold' :
                          rankNumber === 3 ? 'bg-amber-50 text-amber-800 font-bold' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {rankNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-700 text-xs sm:text-sm kanit-text truncate" title={p.name}>{p.name}</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 font-data mt-0.5">จำนวนที่ขาย: {p.quantity} ชิ้น/ครั้ง</p>
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

      {/* --- Modal: Central Calendar Modal สำหรับหน้าแดชบอร์ดผู้บริหาร (รองรับทั้ง วัน, สัปดาห์, เดือน, ปี และ ช่วงเวลา) --- */}
      {showExecRangeCalendar && createPortal(
        <div className={`fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${isExecRangeClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeExecRangeCalendar}></div>
          <div 
            ref={execRangeSwipeProps.ref} 
            style={execRangeSwipeProps.style}
            className={`relative z-[260] w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[1.5rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden ${isExecRangeClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
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

                  {/* Header preview banner based on mode */}
                  {(execCalendarMode === 'week' || execCalendarMode === 'compare_week') ? (
                    <div className={`mb-4 ${execCalendarMode === 'compare_week' ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'} p-3 rounded-xl border flex items-center justify-between`}>
                      <div className="flex flex-col">
                        <span className={`text-[10px] ${execCalendarMode === 'compare_week' ? 'text-indigo-600' : 'text-emerald-600'} font-bold kanit-text uppercase`}>คลิกวันที่เพื่อเลือกสัปดาห์ (7 วัน)</span>
                        <span className="text-xs sm:text-sm font-black font-data">
                          {execCalendarMode === 'compare_week' ? (
                            (() => {
                              const end = new Date(compareWeekDate || selectedWeekDate);
                              end.setDate(end.getDate() - 7);
                              const start = new Date(end);
                              start.setDate(start.getDate() - 6);
                              return `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
                            })()
                          ) : primaryPeriodLabel}
                        </span>
                      </div>
                      <CalendarIcon size={18} className={execCalendarMode === 'compare_week' ? 'text-indigo-500 shrink-0' : 'text-emerald-500 shrink-0'} />
                    </div>
                  ) : (
                    <div className={`mb-4 ${execCalendarMode === 'compare_range' ? 'bg-amber-50 border-amber-200 text-amber-900' : execCalendarMode === 'compare_primary_range' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-emerald-50 border-emerald-100 text-emerald-800'} p-3 rounded-xl border flex items-center justify-between`}>
                      <div className="flex flex-col">
                        <span className={`text-[10px] ${execCalendarMode === 'compare_range' ? 'text-amber-700' : execCalendarMode === 'compare_primary_range' ? 'text-indigo-600' : 'text-emerald-600'} font-bold kanit-text uppercase`}>
                          {execCalendarMode === 'compare_range' ? 'วันเริ่มต้นเปรียบเทียบ' : execCalendarMode === 'compare_primary_range' ? 'วันเริ่มต้นช่วงหลัก' : 'เริ่มต้น'}
                        </span>
                        <span className="text-sm font-black font-data">{execTempStartDate ? formatExecRangeStr(execTempStartDate) : '-'}</span>
                      </div>
                      <div className={execCalendarMode === 'compare_range' ? 'text-amber-300' : execCalendarMode === 'compare_primary_range' ? 'text-indigo-300' : 'text-emerald-300'}><ChevronRight size={16} /></div>
                      <div className="flex flex-col text-right">
                        <span className={`text-[10px] ${execCalendarMode === 'compare_range' ? 'text-amber-700' : execCalendarMode === 'compare_primary_range' ? 'text-indigo-600' : 'text-emerald-600'} font-bold kanit-text uppercase`}>
                          {execCalendarMode === 'compare_range' ? 'วันสิ้นสุดเปรียบเทียบ' : execCalendarMode === 'compare_primary_range' ? 'วันสิ้นสุดช่วงหลัก' : 'สิ้นสุด'}
                        </span>
                        <span className="text-sm font-black font-data">{execTempEndDate ? formatExecRangeStr(execTempEndDate) : '-'}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center mb-2">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
                    {blankExecRangeDays.map(b => <div key={`blank-${b}`} className="w-full aspect-square"></div>)}
                    {monthExecRangeDays.map(day => {
                      const selectedDate = new Date(execRangeCalDate.getFullYear(), execRangeCalDate.getMonth(), day);
                      selectedDate.setHours(0,0,0,0);
                      
                      let isSelectedStart = false;
                      let isSelectedEnd = false;
                      let isInRange = false;

                      if (execCalendarMode === 'week') {
                        const weekEnd = new Date(selectedWeekDate);
                        weekEnd.setHours(23, 59, 59, 999);
                        const weekStart = new Date(selectedWeekDate);
                        weekStart.setDate(weekStart.getDate() - 6);
                        weekStart.setHours(0, 0, 0, 0);

                        isSelectedStart = selectedDate.toDateString() === weekStart.toDateString();
                        isSelectedEnd = selectedDate.toDateString() === weekEnd.toDateString();
                        isInRange = selectedDate >= weekStart && selectedDate <= weekEnd;
                      } else if (execCalendarMode === 'compare_week') {
                        const weekEnd = new Date(compareWeekDate || selectedWeekDate);
                        weekEnd.setHours(23, 59, 59, 999);
                        const weekStart = new Date(compareWeekDate || selectedWeekDate);
                        weekStart.setDate(weekStart.getDate() - 6);
                        weekStart.setHours(0, 0, 0, 0);

                        isSelectedStart = selectedDate.toDateString() === weekStart.toDateString();
                        isSelectedEnd = selectedDate.toDateString() === weekEnd.toDateString();
                        isInRange = selectedDate >= weekStart && selectedDate <= weekEnd;
                      } else {
                        const hasBothDates = execTempStartDate && execTempEndDate;
                        isSelectedStart = execTempStartDate && selectedDate.getTime() === execTempStartDate.getTime();
                        isSelectedEnd = execTempEndDate && selectedDate.getTime() === execTempEndDate.getTime();
                        isInRange = hasBothDates && selectedDate > execTempStartDate && selectedDate < execTempEndDate;
                      }

                      const isToday = new Date().setHours(0,0,0,0) === selectedDate.getTime();
                      const isCompare = execCalendarMode.startsWith('compare');

                      return (
                        <div key={day} className="w-full flex items-center justify-center relative my-0.5">
                            {(isSelectedStart && !isSelectedEnd) && (
                                <div className={`absolute right-0 w-1/2 h-10 sm:h-8 ${isCompare ? 'bg-indigo-50' : 'bg-emerald-50'} my-auto`}></div>
                            )}
                            {(isSelectedEnd && !isSelectedStart) && (
                                <div className={`absolute left-0 w-1/2 h-10 sm:h-8 ${isCompare ? 'bg-indigo-50' : 'bg-emerald-50'} my-auto`}></div>
                            )}
                            {isInRange && (
                                <div className={`absolute w-full h-10 sm:h-8 ${isCompare ? 'bg-indigo-50' : 'bg-emerald-50'} my-auto`}></div>
                            )}
                            
                            <button 
                                type="button" 
                                onClick={() => handleSelectExecRangeDate(day)} 
                                className={`relative w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-xl flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data 
                                ${isSelectedStart || isSelectedEnd ? (isCompare ? 'bg-indigo-600 text-white shadow-md z-10' : 'bg-emerald-500 text-white shadow-md z-10') : 
                                  isInRange ? (isCompare ? 'text-indigo-800 font-bold' : 'text-emerald-800 font-bold') : 
                                  isToday ? (isCompare ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-200' : 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-200') : 'text-slate-700 hover:bg-slate-100'}`}
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
                    <button type="button" onClick={() => setExecRangeCalDate(new Date(execRangeCalDate.getFullYear() - 1, execRangeCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <button type="button" onClick={() => setExecRangeCalView('years')} className="font-bold text-slate-800 hover:text-emerald-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">ปี พ.ศ. {execRangeCalDate.getFullYear() + 543}</button>
                    <button type="button" onClick={() => setExecRangeCalDate(new Date(execRangeCalDate.getFullYear() + 1, execRangeCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {thaiMonthsShort.map((m, i) => {
                      const isSelected = execCalendarMode === 'month' 
                        ? (selectedMonth === i && selectedYear === execRangeCalDate.getFullYear())
                        : (execRangeCalDate.getMonth() === i);
                      const isThisMonth = new Date().getMonth() === i && new Date().getFullYear() === execRangeCalDate.getFullYear();
                      return (
                        <button 
                          key={m} 
                          type="button" 
                          onClick={() => {
                            if (execCalendarMode === 'month') {
                              setSelectedMonth(i);
                              setSelectedYear(execRangeCalDate.getFullYear());
                              closeExecRangeCalendar();
                            } else {
                              setExecRangeCalDate(new Date(execRangeCalDate.getFullYear(), i, 1)); 
                              setExecRangeCalView('days');
                            }
                          }} 
                          className={`py-4 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all kanit-text ${
                            isSelected 
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-black' 
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>{thaiMonths[i]}</div>
                          {isThisMonth && !isSelected && (
                            <span className="text-[10px] text-emerald-600 block font-normal mt-0.5">เดือนนี้</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {execRangeCalView === 'years' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setExecRangeYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">ปี พ.ศ. {execRangeYearPageStart} - {execRangeYearPageStart + 11}</span>
                    <button type="button" onClick={() => setExecRangeYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({length: 12}, (_, i) => execRangeYearPageStart + i).map(y => {
                      const ceYear = y - 543;
                      const isSelected = execCalendarMode === 'year' 
                        ? (selectedYear === ceYear) 
                        : ((execRangeCalDate.getFullYear() + 543) === y);
                      const isThisYear = new Date().getFullYear() === ceYear;
                      return (
                        <button 
                          key={y} 
                          type="button" 
                          onClick={() => {
                            if (execCalendarMode === 'year') {
                              setSelectedYear(ceYear);
                              closeExecRangeCalendar();
                            } else {
                              setExecRangeCalDate(new Date(ceYear, execRangeCalDate.getMonth(), 1)); 
                              setExecRangeCalView(execCalendarMode === 'month' ? 'months' : 'days');
                            }
                          }} 
                          className={`py-4 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all font-data ${
                            isSelected 
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-black' 
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>พ.ศ. {y}</div>
                          <div className="text-[10px] opacity-75">{ceYear} {isThisYear ? '(ปีนี้)' : ''}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions based on mode */}
            {execCalendarMode === 'month' ? (
              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0 w-full rounded-b-[1.5rem]">
                <button 
                  type="button" 
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth());
                    setSelectedYear(now.getFullYear());
                    closeExecRangeCalendar();
                  }} 
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold kanit-text text-xs hover:bg-slate-100 transition-colors shadow-xs"
                >
                  เดือนปัจจุบัน
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const now = new Date();
                    const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                    const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                    setSelectedMonth(prevM);
                    setSelectedYear(prevY);
                    closeExecRangeCalendar();
                  }} 
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold kanit-text text-xs hover:bg-slate-100 transition-colors shadow-xs"
                >
                  เดือนที่แล้ว
                </button>
              </div>
            ) : execCalendarMode === 'year' ? (
              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0 w-full rounded-b-[1.5rem]">
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedYear(new Date().getFullYear());
                    closeExecRangeCalendar();
                  }} 
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold kanit-text text-xs hover:bg-slate-100 transition-colors shadow-xs"
                >
                  ปีปัจจุบัน
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedYear(new Date().getFullYear() - 1);
                    closeExecRangeCalendar();
                  }} 
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold kanit-text text-xs hover:bg-slate-100 transition-colors shadow-xs"
                >
                  ปีก่อนหน้า
                </button>
              </div>
            ) : (execCalendarMode === 'week' || execCalendarMode === 'compare_week') ? (
              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0 w-full rounded-b-[1.5rem]">
                <button 
                  type="button" 
                  onClick={() => {
                    if (execCalendarMode === 'compare_week') {
                      setCompareWeekDate(new Date());
                      setIsCompareActive(true);
                    } else {
                      setSelectedWeekDate(new Date());
                    }
                    closeExecRangeCalendar();
                  }} 
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold kanit-text text-xs hover:bg-slate-100 transition-colors shadow-xs"
                >
                  สัปดาห์ปัจจุบัน (7 วันล่าสุด)
                </button>
              </div>
            ) : (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 w-full rounded-b-[1.5rem]">
                <button type="button" onClick={closeExecRangeCalendar} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text transition-colors shadow-sm text-sm">
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  onClick={confirmExecRange} 
                  className={`px-6 py-2.5 ${
                    execCalendarMode === 'compare_range' 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' 
                      : execCalendarMode === 'compare_primary_range'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  } text-white rounded-xl font-bold shadow-md kanit-text transition-colors text-sm`}
                >
                  {execCalendarMode === 'compare_range' ? 'ยืนยันช่วงเปรียบเทียบ' : execCalendarMode === 'compare_primary_range' ? 'ยืนยันช่วงเวลาหลัก' : 'ยืนยันช่วงเวลา'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Comparison Setup Modal */}
      {showCompareModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowCompareModal(false)}></div>
          <div className="relative z-[210] bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <ArrowLeftRight className="text-indigo-600 w-5 h-5 shrink-0" />
                <span>ตั้งค่าการเปรียบเทียบข้อมูล</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Switch: Toggle Compare Mode */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
              <div>
                <div className="font-bold text-sm text-slate-800 kanit-text">เปิดใช้งานโหมดเปรียบเทียบ</div>
                <div className="text-xs text-slate-500 kanit-text">ซ้อนกราฟและแสดงอัตราเติบโตเทียบ 2 ช่วงเวลา</div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareActive(prev => !prev)}
                className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors duration-200 ${isCompareActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${isCompareActive ? 'translate-x-5.5' : 'translate-x-0'}`}></div>
              </button>
            </div>

            {/* Mode Category Selector Tabs */}
            <div>
              <label className="text-xs font-bold text-slate-600 kanit-text mb-2 block">เลือกรูปแบบเปรียบเทียบ:</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 text-xs font-bold kanit-text">
                {[
                  { id: 'preset', label: 'ปุ่มลัด' },
                  { id: 'month', label: 'เดือน' },
                  { id: 'quarter', label: 'ไตรมาส' },
                  { id: 'week', label: 'สัปดาห์' },
                  { id: 'year', label: 'ปี' },
                  { id: 'custom', label: 'ช่วงวัน' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCompareMode(tab.id);
                      setIsCompareActive(true);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-center transition-all ${
                      compareMode === tab.id 
                        ? 'bg-white text-indigo-600 shadow-sm font-black' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab 1: Preset (Quick Presets) */}
            {compareMode === 'preset' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 kanit-text mb-1">เลือกรูปแบบยอดนิยมที่ตั้งค่าไว้ให้ล่วงหน้า:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'prev_month', title: 'เดือนก่อนหน้า', desc: `เทียบกับเดือน ${selectedMonth === 0 ? thaiMonthsShort[11] : thaiMonthsShort[selectedMonth - 1]}` },
                    { id: 'yoy_month', title: 'ช่วงเดียวกันของปีก่อน (YoY)', desc: `เทียบกับเดือน ${thaiMonthsShort[selectedMonth]} ปี ${selectedYear - 1 + 543}` },
                    { id: 'prev_quarter', title: 'ไตรมาสก่อนหน้า', desc: 'เทียบกับไตรมาส 3 เดือนก่อน' },
                    { id: 'prev_week', title: 'สัปดาห์ก่อนหน้า', desc: 'เทียบกับ 7 วันก่อนหน้า' },
                    { id: 'prev_year', title: 'ปีก่อนหน้า', desc: `เทียบกับปี พ.ศ. ${selectedYear - 1 + 543}` },
                    { id: 'previous_period', title: 'ช่วงก่อนหน้าอัตโนมัติ', desc: 'คำนวณตามช่วงเวลาหลักที่เลือก' },
                  ].map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setComparePreset(p.id);
                        setIsCompareActive(true);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1 ${
                        comparePreset === p.id 
                          ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-800 kanit-text">{p.title}</span>
                        <input 
                          type="radio" 
                          name="compare_preset_radio"
                          checked={comparePreset === p.id} 
                          onChange={() => {
                            setComparePreset(p.id);
                            setIsCompareActive(true);
                          }}
                          className="text-indigo-600 focus:ring-indigo-500" 
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 kanit-text">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Month */}
            {compareMode === 'month' && (
              <div className="space-y-4">
                {/* Quick Presets for Month */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text mb-1.5 block">
                    คู่เปรียบเทียบด่วน:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const prevM = comparePrimaryMonth === 0 ? 11 : comparePrimaryMonth - 1;
                        const prevY = comparePrimaryMonth === 0 ? comparePrimaryYear - 1 : comparePrimaryYear;
                        setCompareMonth(prevM);
                        setCompareYear(prevY);
                        setIsCompareActive(true);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                    >
                      เดือนก่อนหน้า (MoM)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompareMonth(comparePrimaryMonth);
                        setCompareYear(comparePrimaryYear - 1);
                        setIsCompareActive(true);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                    >
                      ช่วงเดียวกันปีก่อน (YoY)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curM = new Date().getMonth();
                        const curY = new Date().getFullYear();
                        setComparePrimaryMonth(curM);
                        setComparePrimaryYear(curY);
                        setCompareMonth(curM === 0 ? 11 : curM - 1);
                        setCompareYear(curM === 0 ? curY - 1 : curY);
                        setIsCompareActive(true);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                    >
                      เดือนปัจจุบัน vs ก่อนหน้า
                    </button>
                  </div>
                </div>

                {/* Dual Period Selector: Primary Month vs Comparison Month */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Box 1: Primary Month */}
                  <div className="p-3 bg-indigo-50/40 border-2 border-indigo-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 kanit-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. เดือนหลัก
                      </span>
                      <select
                        value={comparePrimaryYear}
                        onChange={(e) => setComparePrimaryYear(Number(e.target.value))}
                        className="bg-white border border-indigo-200 text-indigo-950 font-bold text-xs rounded-lg px-2 py-1 outline-none"
                      >
                        {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(yr => (
                          <option key={yr} value={yr}>พ.ศ. {yr + 543}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {thaiMonthsShort.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setComparePrimaryMonth(idx);
                            setIsCompareActive(true);
                          }}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold kanit-text transition-all ${
                            comparePrimaryMonth === idx
                              ? 'bg-indigo-600 text-white shadow-xs font-black'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Box 2: Compare Month */}
                  <div className="p-3 bg-amber-50/40 border-2 border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 kanit-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2. เทียบกับเดือน
                      </span>
                      <select
                        value={compareYear}
                        onChange={(e) => setCompareYear(Number(e.target.value))}
                        className="bg-white border border-amber-200 text-amber-950 font-bold text-xs rounded-lg px-2 py-1 outline-none"
                      >
                        {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(yr => (
                          <option key={yr} value={yr}>พ.ศ. {yr + 543}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {thaiMonthsShort.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCompareMonth(idx);
                            setIsCompareActive(true);
                          }}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold kanit-text transition-all ${
                            compareMonth === idx
                              ? 'bg-amber-500 text-white shadow-xs font-black'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Quarter (Q1-Q4) */}
            {compareMode === 'quarter' && (
              <div className="space-y-4">
                {/* Quick Preset Buttons for Quarters */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text mb-1.5 block">
                    คู่เปรียบเทียบด่วน:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { label: 'Q2 vs Q1', q1: 2, q2: 1, y1: comparePrimaryYear, y2: comparePrimaryYear },
                      { label: 'Q3 vs Q2', q1: 3, q2: 2, y1: comparePrimaryYear, y2: comparePrimaryYear },
                      { label: 'Q4 vs Q3', q1: 4, q2: 3, y1: comparePrimaryYear, y2: comparePrimaryYear },
                      { label: 'YoY (ปีก่อน)', q1: comparePrimaryQuarter, q2: comparePrimaryQuarter, y1: comparePrimaryYear, y2: comparePrimaryYear - 1 },
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setComparePrimaryQuarter(btn.q1);
                          setCompareQuarter(btn.q2);
                          setComparePrimaryYear(btn.y1);
                          setCompareYear(btn.y2);
                          setIsCompareActive(true);
                        }}
                        className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dual Period Selector: Primary Period vs Comparison Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Box 1: Primary Quarter */}
                  <div className="p-3.5 bg-indigo-50/40 border-2 border-indigo-200/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 kanit-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. ไตรมาสหลัก
                      </span>
                      <select
                        value={comparePrimaryYear}
                        onChange={(e) => setComparePrimaryYear(Number(e.target.value))}
                        className="bg-white border border-indigo-200 text-indigo-950 font-bold text-xs rounded-lg px-2 py-1 outline-none"
                      >
                        {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(yr => (
                          <option key={yr} value={yr}>พ.ศ. {yr + 543}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { q: 1, label: 'ไตรมาส 1 (Q1)', desc: 'ม.ค. - มี.ค.' },
                        { q: 2, label: 'ไตรมาส 2 (Q2)', desc: 'เม.ย. - มิ.ย.' },
                        { q: 3, label: 'ไตรมาส 3 (Q3)', desc: 'ก.ค. - ก.ย.' },
                        { q: 4, label: 'ไตรมาส 4 (Q4)', desc: 'ต.ค. - ธ.ค.' }
                      ].map(item => (
                        <button
                          key={item.q}
                          type="button"
                          onClick={() => {
                            setComparePrimaryQuarter(item.q);
                            setIsCompareActive(true);
                          }}
                          className={`p-2 rounded-xl text-left transition-all border ${
                            comparePrimaryQuarter === item.q
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="font-bold text-xs kanit-text">{item.label}</div>
                          <div className={`text-[10px] ${comparePrimaryQuarter === item.q ? 'text-indigo-100' : 'text-slate-400'} font-data`}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Box 2: Compare Quarter */}
                  <div className="p-3.5 bg-amber-50/40 border-2 border-amber-200/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 kanit-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2. เทียบกับไตรมาส
                      </span>
                      <select
                        value={compareYear}
                        onChange={(e) => setCompareYear(Number(e.target.value))}
                        className="bg-white border border-amber-200 text-amber-950 font-bold text-xs rounded-lg px-2 py-1 outline-none"
                      >
                        {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(yr => (
                          <option key={yr} value={yr}>พ.ศ. {yr + 543}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { q: 1, label: 'ไตรมาส 1 (Q1)', desc: 'ม.ค. - มี.ค.' },
                        { q: 2, label: 'ไตรมาส 2 (Q2)', desc: 'เม.ย. - มิ.ย.' },
                        { q: 3, label: 'ไตรมาส 3 (Q3)', desc: 'ก.ค. - ก.ย.' },
                        { q: 4, label: 'ไตรมาส 4 (Q4)', desc: 'ต.ค. - ธ.ค.' }
                      ].map(item => (
                        <button
                          key={item.q}
                          type="button"
                          onClick={() => {
                            setCompareQuarter(item.q);
                            setIsCompareActive(true);
                          }}
                          className={`p-2 rounded-xl text-left transition-all border ${
                            compareQuarter === item.q
                              ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="font-bold text-xs kanit-text">{item.label}</div>
                          <div className={`text-[10px] ${compareQuarter === item.q ? 'text-amber-100' : 'text-slate-400'} font-data`}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Week */}
            {compareMode === 'week' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 kanit-text">เลือกสัปดาห์ที่ต้องการเปรียบเทียบ (ระบบจะเทียบ 7 วัน):</div>
                <div 
                  onClick={handleOpenCompareWeek}
                  className="p-3 sm:p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 hover:border-indigo-400 rounded-2xl cursor-pointer transition-all flex items-center justify-between group gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                      <CalendarIcon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-400 kanit-text">สัปดาห์ที่เลือกเปรียบเทียบ:</div>
                      <div className="text-xs sm:text-sm font-black text-slate-800 font-data truncate mt-0.5">
                        {(() => {
                          const end = new Date(compareWeekDate || selectedWeekDate);
                          end.setDate(end.getDate() - 7);
                          const start = new Date(end);
                          start.setDate(start.getDate() - 6);
                          return `${start.getDate()} ${thaiMonthsShort[start.getMonth()]} - ${end.getDate()} ${thaiMonthsShort[end.getMonth()]} ${end.getFullYear() + 543}`;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        setCompareWeekDate(d);
                        setIsCompareActive(true);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold kanit-text transition-colors whitespace-nowrap shadow-xs"
                    >
                      7 วันก่อน
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold kanit-text transition-colors shadow-xs shadow-indigo-500/20 whitespace-nowrap flex items-center gap-1"
                    >
                      <CalendarIcon size={13} />
                      <span>เปิดปฏิทิน</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Year */}
            {compareMode === 'year' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Box 1: Primary Year */}
                  <div className="p-3.5 bg-indigo-50/40 border-2 border-indigo-200/80 rounded-2xl space-y-2.5">
                    <span className="text-xs font-bold text-indigo-900 kanit-text flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. ปีหลัก
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(yr => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setComparePrimaryYear(yr);
                            setIsCompareActive(true);
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-bold kanit-text transition-all border ${
                            comparePrimaryYear === yr
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          พ.ศ. {yr + 543}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Box 2: Compare Year */}
                  <div className="p-3.5 bg-amber-50/40 border-2 border-amber-200/80 rounded-2xl space-y-2.5">
                    <span className="text-xs font-bold text-amber-900 kanit-text flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2. เทียบกับปี
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(yr => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setCompareYear(yr);
                            setIsCompareActive(true);
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-bold kanit-text transition-all border ${
                            compareYear === yr
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          พ.ศ. {yr + 543}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: Custom Date Range */}
            {compareMode === 'custom' && (
              <div className="space-y-3.5">
                {/* Quick Presets for Date Pairs */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text mb-1.5 block">
                    คู่เปรียบเทียบด่วน:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const pEnd = new Date(today);
                        const pStart = new Date(today);
                        pStart.setDate(pStart.getDate() - 6);

                        const cEnd = new Date(pStart);
                        cEnd.setDate(cEnd.getDate() - 1);
                        const cStart = new Date(cEnd);
                        cStart.setDate(cStart.getDate() - 6);

                        setComparePrimaryCustomStart(formatDateStr(pStart));
                        setComparePrimaryCustomEnd(formatDateStr(pEnd));
                        setCustomStartDate(formatDateStr(pStart));
                        setCustomEndDate(formatDateStr(pEnd));

                        setCompareCustomStart(formatDateStr(cStart));
                        setCompareCustomEnd(formatDateStr(cEnd));
                        setIsCompareActive(true);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                    >
                      7 วัน vs 7 วันก่อน
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const pEnd = new Date(today);
                        const pStart = new Date(today);
                        pStart.setDate(pStart.getDate() - 29);

                        const cEnd = new Date(pStart);
                        cEnd.setDate(cEnd.getDate() - 1);
                        const cStart = new Date(cEnd);
                        cStart.setDate(cStart.getDate() - 29);

                        setComparePrimaryCustomStart(formatDateStr(pStart));
                        setComparePrimaryCustomEnd(formatDateStr(pEnd));
                        setCustomStartDate(formatDateStr(pStart));
                        setCustomEndDate(formatDateStr(pEnd));

                        setCompareCustomStart(formatDateStr(cStart));
                        setCompareCustomEnd(formatDateStr(cEnd));
                        setIsCompareActive(true);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                    >
                      30 วัน vs 30 วันก่อน
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const pStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        const pEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                        const cStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const cEnd = new Date(today.getFullYear(), today.getMonth(), 0);

                        setComparePrimaryCustomStart(formatDateStr(pStart));
                        setComparePrimaryCustomEnd(formatDateStr(pEnd));
                        setCustomStartDate(formatDateStr(pStart));
                        setCustomEndDate(formatDateStr(pEnd));

                        setCompareCustomStart(formatDateStr(cStart));
                        setCompareCustomEnd(formatDateStr(cEnd));
                        setIsCompareActive(true);
                      }}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold kanit-text transition-all text-center"
                    >
                      เดือนนี้ vs เดือนก่อน
                    </button>
                  </div>
                </div>

                {/* Dual Interactive Cards: 1. ช่วงหลัก & 2. ช่วงที่จะเทียบ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Box 1: ช่วงหลัก */}
                  <div 
                    onClick={handleOpenComparePrimaryRange}
                    className="p-3.5 bg-indigo-50/40 hover:bg-indigo-50/70 border-2 border-indigo-200/80 hover:border-indigo-400 rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 kanit-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. ช่วงหลัก
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full kanit-text group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        คลิกเลือกวัน
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 kanit-text">วันที่เลือก:</div>
                        <div className="text-xs sm:text-sm font-black text-indigo-950 font-data truncate">
                          {formatExecDisplayRange(comparePrimaryCustomStart || customStartDate, comparePrimaryCustomEnd || customEndDate)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-1.5 px-3 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-xl text-xs font-bold kanit-text transition-colors shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CalendarIcon size={13} />
                      <span>เปิดปฏิทินเลือกช่วงหลัก</span>
                    </button>
                  </div>

                  {/* Box 2: ช่วงที่จะเทียบ */}
                  <div 
                    onClick={handleOpenCompareRange}
                    className="p-3.5 bg-amber-50/40 hover:bg-amber-50/70 border-2 border-amber-200/80 hover:border-amber-400 rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 kanit-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2. ช่วงที่จะเทียบ
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full kanit-text group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        คลิกเลือกวัน
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 kanit-text">วันที่เลือก:</div>
                        <div className="text-xs sm:text-sm font-black text-amber-950 font-data truncate">
                          {formatExecDisplayRange(compareCustomStart || customStartDate, compareCustomEnd || customEndDate)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-1.5 px-3 bg-amber-500 group-hover:bg-amber-600 text-white rounded-xl text-xs font-bold kanit-text transition-colors shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CalendarIcon size={13} />
                      <span>เปิดปฏิทินเลือกช่วงเทียบ</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Preview Summary Bar with Clickable Date Buttons */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2 shadow-xs">
              {/* Left: ช่วงหลัก (Clickable) */}
              <button
                type="button"
                onClick={() => {
                  if (compareMode === 'custom') {
                    handleOpenComparePrimaryRange();
                  } else if (compareMode === 'week') {
                    handleOpenExecRange();
                  } else {
                    handleOpenComparePrimaryRange();
                  }
                }}
                className="flex-1 min-w-0 p-2 sm:px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 hover:border-indigo-300 text-left transition-all group cursor-pointer"
                title="คลิกเพื่อเลือกวัน/ช่วงเวลาหลัก"
              >
                <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-bold kanit-text">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 shadow-xs shadow-indigo-500/30 group-hover:scale-110 transition-transform"></span>
                  <span>ช่วงหลัก</span>
                  <CalendarIcon size={11} className="text-indigo-500 opacity-60 group-hover:opacity-100 ml-auto shrink-0" />
                </div>
                <div className="text-xs sm:text-xs font-black text-indigo-950 truncate mt-0.5 font-data">
                  {modalPrimaryLabel}
                </div>
              </button>

              {/* Center: Swap / Compare Icon */}
              <div className="flex flex-col items-center justify-center px-1 text-slate-400 shrink-0">
                <ArrowLeftRight size={14} className="text-indigo-500" />
                <span className="text-[9px] font-bold mt-0.5 kanit-text text-slate-400">เทียบ</span>
              </div>

              {/* Right: ช่วงที่จะเทียบ (Clickable) */}
              <button
                type="button"
                onClick={() => {
                  if (compareMode === 'custom') {
                    handleOpenCompareRange();
                  } else if (compareMode === 'week') {
                    handleOpenCompareWeek();
                  } else {
                    handleOpenCompareRange();
                  }
                }}
                className="flex-1 min-w-0 p-2 sm:px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/80 hover:border-amber-300 text-left transition-all group cursor-pointer"
                title="คลิกเพื่อเลือกวัน/ช่วงเวลาที่จะเทียบ"
              >
                <div className="flex items-center gap-1 text-[10px] text-amber-800 font-bold kanit-text">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-xs shadow-amber-500/30 group-hover:scale-110 transition-transform"></span>
                  <span>ช่วงที่จะเทียบ</span>
                  <CalendarIcon size={11} className="text-amber-600 opacity-60 group-hover:opacity-100 ml-auto shrink-0" />
                </div>
                <div className="text-xs sm:text-xs font-black text-amber-950 truncate mt-0.5 font-data">
                  {modalCompareLabel}
                </div>
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              {isCompareActive && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCompareActive(false);
                    setShowCompareModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold kanit-text transition-colors"
                >
                  ปิดโหมดเปรียบเทียบ
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (compareMode === 'quarter') {
                    setTimeRange('quarter');
                    setSelectedYear(comparePrimaryYear);
                    setSelectedQuarter(comparePrimaryQuarter);
                  } else if (compareMode === 'month') {
                    setTimeRange('month');
                    setSelectedYear(comparePrimaryYear);
                    setSelectedMonth(comparePrimaryMonth);
                  } else if (compareMode === 'year') {
                    setTimeRange('year');
                    setSelectedYear(comparePrimaryYear);
                  } else if (compareMode === 'custom') {
                    setTimeRange('custom');
                    if (comparePrimaryCustomStart) setCustomStartDate(comparePrimaryCustomStart);
                    if (comparePrimaryCustomEnd) setCustomEndDate(comparePrimaryCustomEnd);
                  } else if (compareMode === 'preset') {
                    if (comparePreset === 'prev_quarter' && timeRange !== 'quarter') {
                      setTimeRange('quarter');
                    } else if (comparePreset === 'prev_month' && timeRange !== 'month') {
                      setTimeRange('month');
                    } else if (comparePreset === 'prev_year' && timeRange !== 'year') {
                      setTimeRange('year');
                    }
                  }
                  setIsCompareActive(true);
                  setShowCompareModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold kanit-text transition-colors shadow-md shadow-indigo-500/20"
              >
                ยืนยันการเปรียบเทียบ
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

