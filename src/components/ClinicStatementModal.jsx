import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileSpreadsheet, Printer, Download, Calendar, RefreshCw, 
  X, CheckCircle2, ArrowUpRight, ArrowDownRight, Building2, 
  Wallet, Layers, Search, AlertCircle, Info, ChevronRight, Eye
} from 'lucide-react';
import { 
  getStatementDateBounds, 
  fetchStatementData, 
  generateClinicStatementHtml, 
  exportClinicStatementExcel 
} from '../lib/statementGenerator';
import { supabase } from '../lib/supabase';
import { getLocalStore } from '../lib/offlineStore';

const MONTH_OPTIONS = [
  { value: 0, label: 'มกราคม (เดือน 1)' },
  { value: 1, label: 'กุมภาพันธ์ (เดือน 2)' },
  { value: 2, label: 'มีนาคม (เดือน 3)' },
  { value: 3, label: 'เมษายน (เดือน 4)' },
  { value: 4, label: 'พฤษภาคม (เดือน 5)' },
  { value: 5, label: 'มิถุนายน (เดือน 6)' },
  { value: 6, label: 'กรกฎาคม (เดือน 7)' },
  { value: 7, label: 'สิงหาคม (เดือน 8)' },
  { value: 8, label: 'กันยายน (เดือน 9)' },
  { value: 9, label: 'ตุลาคม (เดือน 10)' },
  { value: 10, label: 'พฤศจิกายน (เดือน 11)' },
  { value: 11, label: 'ธันวาคม (เดือน 12)' },
];

const QUARTER_OPTIONS = [
  { value: 0, label: 'ไตรมาส 1 (1 ม.ค. - 31 มี.ค.)' },
  { value: 1, label: 'ไตรมาส 2 (1 เม.ย. - 30 มิ.ย.)' },
  { value: 2, label: 'ไตรมาส 3 (1 ก.ค. - 30 ก.ย.)' },
  { value: 3, label: 'ไตรมาส 4 (1 ต.ค. - 31 ธ.ค.)' },
];

const HALF_OPTIONS = [
  { value: 1, label: 'ครึ่งปีแรก (1 ม.ค. - 30 มิ.ย.)' },
  { value: 2, label: 'ครึ่งปีหลัง (1 ก.ค. - 31 ธ.ค.)' },
];

export default function ClinicStatementModal({
  isOpen,
  onClose,
  branchesData = [],
  currentBranch = 'all',
  showToast
}) {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // ตัวเลือกปี (พ.ศ. / ค.ศ.)
  const yearOptions = useMemo(() => {
    return [
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      currentYear - 4
    ];
  }, [currentYear]);

  // ตัวเลือกรูปแบบช่วงเวลา
  const [periodType, setPeriodType] = useState('month'); // 'month' | 'quarter' | 'half_year' | 'year' | '7d' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(currentMonth / 3));
  const [selectedHalf, setSelectedHalf] = useState(currentMonth < 6 ? 1 : 2);

  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState(currentBranch || 'all');
  const [manualOpeningBalance, setManualOpeningBalance] = useState('');
  
  // Data states
  const [isLoading, setIsLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');

  // Fallback branches if not passed via props
  const [internalBranches, setInternalBranches] = useState([]);
  useEffect(() => {
    if (branchesData && branchesData.length > 0) {
      setInternalBranches(branchesData);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const local = await getLocalStore('branches');
        if (isMounted && Array.isArray(local) && local.length > 0) {
          setInternalBranches(local);
          return;
        }
      } catch (e) {}
      if (supabase) {
        try {
          const { data } = await supabase.from('branches').select('*');
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setInternalBranches(data);
          }
        } catch (e) {}
      }
    })();
    return () => { isMounted = false; };
  }, [branchesData, isOpen]);

  useEffect(() => {
    if (currentBranch) {
      setSelectedBranch(currentBranch);
    }
  }, [currentBranch]);

  const effectiveBranches = (branchesData && branchesData.length > 0) ? branchesData : internalBranches;

  // คำนวณช่วงวันที่ตามโหมดที่เลือก
  const rangeBounds = useMemo(() => {
    return getStatementDateBounds(periodType, {
      year: selectedYear,
      month: selectedMonth,
      quarter: selectedQuarter,
      half: selectedHalf,
      startDate: customStartDate,
      endDate: customEndDate
    });
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, selectedHalf, customStartDate, customEndDate]);

  // ดึงข้อมูล Statement จาก Supabase
  const loadStatement = useCallback(async () => {
    setIsLoading(true);
    try {
      const openBal = manualOpeningBalance.trim() !== '' ? Number(manualOpeningBalance) : null;
      const res = await fetchStatementData(rangeBounds, selectedBranch, openBal);
      setStatementData(res);
    } catch (err) {
      console.error('loadStatement error:', err);
      showToast?.('เกิดข้อผิดพลาดในการดึงข้อมูล Statement: ' + err.message, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [rangeBounds, selectedBranch, manualOpeningBalance, showToast]);

  useEffect(() => {
    if (isOpen) {
      loadStatement();
    }
  }, [isOpen, loadStatement]);

  useEffect(() => {
    if (currentBranch) {
      setSelectedBranch(currentBranch);
    }
  }, [currentBranch]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // กรองตารางแสดงตัวอย่าง
  const filteredTransactions = useMemo(() => {
    if (!statementData?.transactions) return [];
    if (!filterSearch.trim()) return statementData.transactions;
    const q = filterSearch.toLowerCase().trim();
    return statementData.transactions.filter(t => 
      t.description?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q) ||
      t.refNo?.toLowerCase().includes(q) ||
      t.channel?.toLowerCase().includes(q)
    );
  }, [statementData, filterSearch]);

  if (!isOpen) return null;

  // ข้อมูลสาขาที่เลือก
  const isAllBranchSelected = selectedBranch === 'all' || !selectedBranch;
  const primaryBranch = effectiveBranches.find(b => b.id === 'b1') || effectiveBranches[0] || {};
  const currentBranchObj = effectiveBranches.find(b => b.id === selectedBranch) || {};

  const activeBranchInfo = isAllBranchSelected
    ? {
        id: 'all',
        name: 'ทุกสาขา',
        clinicRegName: primaryBranch.clinicRegName || primaryBranch.clinic_reg_name || primaryBranch.registeredName || 'อันผิง คลินิกการแพทย์แผนจีน',
        clinicLicense: primaryBranch.clinicLicense || primaryBranch.clinic_license || primaryBranch.license || '',
        clinicTax: primaryBranch.clinicTax || primaryBranch.clinic_tax || primaryBranch.taxId || '0-1055-66000-00-0',
        address: primaryBranch.address || '119/140 ม.1 ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110',
        phone: primaryBranch.phone || '02-000-0000'
      }
    : {
        id: selectedBranch,
        name: currentBranchObj.name || 'สาขาคลินิก',
        clinicRegName: currentBranchObj.clinicRegName || currentBranchObj.clinic_reg_name || currentBranchObj.registeredName || currentBranchObj.name || 'อันผิง คลินิกการแพทย์แผนจีน',
        clinicLicense: currentBranchObj.clinicLicense || currentBranchObj.clinic_license || currentBranchObj.license || '',
        clinicTax: currentBranchObj.clinicTax || currentBranchObj.clinic_tax || currentBranchObj.taxId || '0-1055-66000-00-0',
        address: currentBranchObj.address || '119/140 ม.1 ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110',
        phone: currentBranchObj.phone || '02-000-0000'
      };

  const regName = activeBranchInfo.clinicRegName || 'อันผิง คลินิกการแพทย์แผนจีน';
  const clinicDisplayTitle = isAllBranchSelected 
    ? `${regName} (ทุกสาขา)` 
    : regName;

  const clinicInfo = {
    name: 'อันผิง คลินิกการแพทย์แผนจีน',
    clinicRegName: regName,
    enName: 'ANPING MEDICINE CLINIC',
    taxId: activeBranchInfo.clinicTax || '0-1055-66000-00-0'
  };

  // ดำเนินการพิมพ์ / เซฟเป็น PDF
  const handlePrintPdf = () => {
    if (!statementData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast?.('เบราว์เซอร์บล็อกหน้าต่าง Pop-up กรุณาอนุญาตเพื่อเปิดเอกสารพิมพ์', 'warning');
      return;
    }

    const html = generateClinicStatementHtml({
      statementData: {
        ...statementData,
        transactions: filteredTransactions
      },
      rangeBounds,
      branchInfo: activeBranchInfo,
      clinicInfo
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ดำเนินการดาวน์โหลด Excel
  const handleExportExcel = () => {
    if (!statementData) return;
    try {
      const filename = `anping_statement_${rangeBounds.dateOnlyStart}_${rangeBounds.dateOnlyEnd}.xlsx`;
      exportClinicStatementExcel({
        statementData: {
          ...statementData,
          transactions: filteredTransactions
        },
        rangeBounds,
        branchInfo: activeBranchInfo,
        clinicInfo,
        filename
      });
      showToast?.('ดาวน์โหลดไฟล์ Excel Statement เรียบร้อยแล้ว', 'success');
    } catch (e) {
      console.error(e);
      showToast?.('เกิดข้อผิดพลาดในการดาวน์โหลด Excel: ' + e.message, 'danger');
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:p-6 [@media(max-height:480px)]:py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-white">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 [@media(max-height:480px)]:w-9 [@media(max-height:480px)]:h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-slate-800 kanit-text tracking-tight leading-snug">
                  รายการเดินบัญชีการเงินคลินิก (Clinic Statement)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 kanit-text shrink-0">
                  Bank Layout Style
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 kanit-text mt-0.5 truncate [@media(max-height:480px)]:hidden">
                {clinicDisplayTitle} • ออก Statement ยอดรับ-จ่ายพร้อมยอดยกมาตามมาตรฐานธนาคาร
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 [@media(max-height:480px)]:p-3.5 space-y-4 sm:space-y-5 custom-scrollbar">
          
          {/* Section 1: เมนูเลือกช่วงเวลาและสาขาแบบ Dropdown (สะอาด ใช้งานง่าย ไม่รก) */}
          <div className="bg-slate-50/90 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar size={17} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 kanit-text">
                  ตั้งค่าช่วงเวลาและเงื่อนไข Statement:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-800 kanit-text bg-emerald-100/70 border border-emerald-200/80 px-2.5 sm:px-3 py-1 rounded-xl min-w-0 break-words">
                  📅 รอบวันที่: {rangeBounds.label}
                </span>
                <button
                  type="button"
                  onClick={loadStatement}
                  disabled={isLoading}
                  title="รีเฟรชข้อมูล"
                  className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
                </button>
              </div>
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Dropdown 1: รูปแบบช่วงเวลา */}
              <div className="min-w-0">
                <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                  รูปแบบช่วงเวลา:
                </label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                >
                  <option value="month">รายเดือน (วันที่ 1 ถึง สิ้นเดือน)</option>
                  <option value="quarter">ไตรมาส (3 เดือน)</option>
                  <option value="half_year">ครึ่งปี (6 เดือน)</option>
                  <option value="year">รายปี (1 ปีเต็ม)</option>
                  <option value="7d">7 วันล่าสุด</option>
                  <option value="custom">กำหนดช่วงวันที่เอง</option>
                </select>
              </div>

              {/* Dropdown 2 & 3: ตัวเลือกย่อยตามโหมด */}
              {periodType === 'month' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      เลือกเดือน:
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    >
                      {MONTH_OPTIONS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      เลือกปี:
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {periodType === 'quarter' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      เลือกไตรมาส:
                    </label>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    >
                      {QUARTER_OPTIONS.map(q => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      เลือกปี:
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {periodType === 'half_year' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      เลือกครึ่งปี:
                    </label>
                    <select
                      value={selectedHalf}
                      onChange={(e) => setSelectedHalf(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    >
                      {HALF_OPTIONS.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      เลือกปี:
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {periodType === 'year' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                    เลือกปี (ทั้งปี):
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                    ))}
                  </select>
                </div>
              )}

              {periodType === 'custom' && (
                <>
                  <div className="min-w-0">
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      ตั้งแต่วันที่:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full min-w-0 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                      ถึงวันที่:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full min-w-0 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                    />
                  </div>
                </>
              )}

              {periodType === '7d' && (
                <div className="flex items-center min-w-0">
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold kanit-text w-full text-center">
                    ย้อนหลัง 7 วันล่าสุดจากวันนี้
                  </div>
                </div>
              )}

              {/* สาขาคลินิก */}
              <div className="min-w-0">
                <label className="text-[11px] font-bold text-slate-600 kanit-text block mb-1">
                  เลือกสาขาคลินิก:
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                >
                  <option value="all">ทุกสาขา (ภาพรวมทั้งคลินิก)</option>
                  {effectiveBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.clinicRegName ? ` (${b.clinicRegName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* ยอดยกมาเริ่มต้น (Manual override) */}
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                  <label className="text-[11px] font-bold text-slate-600 kanit-text">
                    ยอดยกมาเริ่มต้น:
                  </label>
                  <span className="text-[9px] text-slate-400 kanit-text">
                    (เว้นว่าง = อัตโนมัติ)
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`อัตโนมัติ (${formatCurrency(statementData?.openingBalance || 0)})`}
                  value={manualOpeningBalance}
                  onChange={(e) => setManualOpeningBalance(e.target.value)}
                  className="w-full min-w-0 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: แดชบอร์ดสรุปสถิติสไตล์ Bank Statement */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
            <div className="min-w-0 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 kanit-text uppercase block truncate">ยอดยกมาเริ่มต้น</span>
              <div className="text-base sm:text-lg font-black text-slate-800 kanit-text mt-1 truncate" title={formatCurrency(statementData?.openingBalance || 0)}>
                {formatCurrency(statementData?.openingBalance || 0)}
              </div>
              <span className="text-[10px] text-slate-400 kanit-text">บาท</span>
            </div>

            <div className="min-w-0 p-3 rounded-2xl bg-rose-50/60 border border-rose-100 shadow-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-rose-500 kanit-text uppercase truncate">รวมรายจ่าย (ถอน)</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded-md shrink-0">
                  {statementData?.debitCount || 0}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-700 kanit-text mt-1 truncate" title={formatCurrency(statementData?.totalDebit || 0)}>
                {formatCurrency(statementData?.totalDebit || 0)}
              </div>
              <span className="text-[10px] text-rose-500/80 kanit-text">บาท</span>
            </div>

            <div className="min-w-0 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 shadow-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-emerald-600 kanit-text uppercase truncate">รวมรายรับ (ฝาก)</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded-md shrink-0">
                  {statementData?.creditCount || 0}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-800 kanit-text mt-1 truncate" title={formatCurrency(statementData?.totalCredit || 0)}>
                {formatCurrency(statementData?.totalCredit || 0)}
              </div>
              <span className="text-[10px] text-emerald-600/80 kanit-text">บาท</span>
            </div>

            {/* กำไร / ขาดทุน (รอบนี้) = รายรับ - รายจ่าย */}
            {(() => {
              const netProfit = (statementData?.totalCredit || 0) - (statementData?.totalDebit || 0);
              const isProfit = netProfit >= 0;
              return (
                <div className={`min-w-0 p-3 rounded-2xl border shadow-xs ${isProfit ? 'bg-teal-50/70 border-teal-200/80' : 'bg-amber-50/70 border-amber-200/80'}`}>
                  <span className={`text-[11px] font-bold kanit-text uppercase block truncate ${isProfit ? 'text-teal-700' : 'text-amber-700'}`}>
                    กำไร / ขาดทุน
                  </span>
                  <div className={`text-base sm:text-lg font-black kanit-text mt-1 truncate ${isProfit ? 'text-teal-800' : 'text-amber-800'}`} title={`${netProfit > 0 ? '+' : ''}${formatCurrency(netProfit)}`}>
                    {netProfit > 0 ? '+' : ''}{formatCurrency(netProfit)}
                  </div>
                  <span className={`text-[10px] kanit-text ${isProfit ? 'text-teal-600/80' : 'text-amber-600/80'}`}>
                    บาท (รายรับ - รายจ่าย)
                  </span>
                </div>
              );
            })()}

            <div className="min-w-0 min-[380px]:col-span-2 md:col-span-1 p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <span className="text-[11px] font-bold text-emerald-100 kanit-text uppercase block truncate">ยอดยกไปสุทธิ</span>
              <div className="text-base sm:text-lg font-black text-white kanit-text mt-1 truncate" title={formatCurrency(statementData?.closingBalance || 0)}>
                {formatCurrency(statementData?.closingBalance || 0)}
              </div>
              <span className="text-[10px] text-emerald-100 kanit-text">บาท (คงเหลือสุทธิ)</span>
            </div>
          </div>

          {/* Section 3: Preview Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h4 className="text-xs font-bold text-slate-700 kanit-text">
                  ตัวอย่างรายการเดินบัญชี ({filteredTransactions.length} รายการ):
                </h4>
                {isLoading && (
                  <span className="text-[10px] text-emerald-600 font-bold kanit-text animate-pulse">
                    กำลังโหลดข้อมูล...
                  </span>
                )}
              </div>

              <div className="relative w-full sm:w-64 shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาในตารางตัวอย่าง..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs kanit-text focus:outline-emerald-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto custom-scrollbar shadow-xs">
              <table className="w-full min-w-[680px] text-left border-collapse text-xs kanit-text">
                <thead className="bg-slate-100/80 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-24 whitespace-nowrap">วันที่</th>
                    <th className="py-2.5 px-2 text-center w-16 whitespace-nowrap">เวลา</th>
                    <th className="py-2.5 px-3">รายการ</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">ถอน (จ่าย)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">ฝาก (รับ)</th>
                    <th className="py-2.5 px-3 text-right font-bold whitespace-nowrap">คงเหลือ</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">ช่องทาง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* แถวยอดยกมาเริ่มต้น */}
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className="py-2 px-3 text-center text-black font-medium whitespace-nowrap">
                      {rangeBounds.dateOnlyStart}
                    </td>
                    <td className="py-2 px-2 text-center text-black font-medium whitespace-nowrap">--:--</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-black text-[10px]">
                        ยอดยกมา
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-black font-medium whitespace-nowrap">-</td>
                    <td className="py-2 px-3 text-right text-black font-medium whitespace-nowrap">-</td>
                    <td className="py-2 px-3 text-right text-black font-bold whitespace-nowrap">
                      {formatCurrency(statementData?.openingBalance || 0)}
                    </td>
                    <td className="py-2 px-3 text-center text-black text-[10px] whitespace-nowrap">SYSTEM</td>
                  </tr>

                  {filteredTransactions.map((t, idx) => (
                    <tr key={t.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-black font-medium whitespace-nowrap">
                        {t.dateFormatted}
                      </td>
                      <td className="py-2 px-2 text-center text-black font-medium text-[11px] whitespace-nowrap">
                        {t.timeFormatted}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-black">{t.type}</div>
                        <div className="text-[11px] text-black font-normal truncate max-w-[280px]" title={t.description}>
                          {t.description}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                        {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-black whitespace-nowrap">
                        {formatCurrency(t.balance)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-black">
                          {t.channel}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {isLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการเดินบัญชีในช่วงเวลาที่เลือก'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer (Action Buttons) */}
        <div className="px-4 py-3 sm:p-5 [@media(max-height:480px)]:py-2.5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* ปุ่มปิดหน้าต่าง ชิดซ้าย */}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 [@media(max-height:480px)]:py-2 bg-slate-200/90 hover:bg-slate-300 text-slate-700 rounded-xl font-bold kanit-text text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
          >
            <X size={16} className="shrink-0" />
            <span>ปิดหน้าต่าง</span>
          </button>

          {/* ปุ่มส่งออก Excel และพิมพ์ PDF ชิดขวา */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isLoading || !statementData}
              className="px-4 py-2.5 [@media(max-height:480px)]:py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold kanit-text text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download size={15} className="text-emerald-600 shrink-0" />
              <span className="truncate">ส่งออก Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={isLoading || !statementData}
              className="px-5 py-2.5 [@media(max-height:480px)]:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold kanit-text text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer size={15} className="shrink-0" />
              <span className="truncate">พิมพ์ / บันทึก PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
