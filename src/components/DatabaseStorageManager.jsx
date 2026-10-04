import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, HardDrive, ArrowUpRight, ArrowDownRight, RefreshCw, 
  Download, Trash2, ShieldCheck, AlertTriangle, FileSpreadsheet, 
  Upload, CheckCircle2, RotateCcw, AlertOctagon, Calendar, Check,
  Layers, Lock, Sparkles, FlaskConical, X, Info, Printer
} from 'lucide-react';
import { 
  PURGEABLE_TABLES, 
  PROTECTED_TABLES, 
  getDatabaseAndStorageStats, 
  getDateRangeBounds, 
  getTableCountsByDateRange,
  previewPurgeImpact, 
  exportSupabaseToExcel, 
  purgeHistoricalData, 
  parseExcelForSimulation 
} from '../lib/databaseManager';
import { clearAllLocalStores } from '../lib/offlineStore';
import ClinicStatementModal from './ClinicStatementModal';

const THAI_MONTHS = [
  { value: 0, label: 'มกราคม' },
  { value: 1, label: 'กุมภาพันธ์' },
  { value: 2, label: 'มีนาคม' },
  { value: 3, label: 'เมษายน' },
  { value: 4, label: 'พฤษภาคม' },
  { value: 5, label: 'มิถุนายน' },
  { value: 6, label: 'กรกฎาคม' },
  { value: 7, label: 'สิงหาคม' },
  { value: 8, label: 'กันยายน' },
  { value: 9, label: 'ตุลาคม' },
  { value: 10, label: 'พฤศจิกายน' },
  { value: 11, label: 'ธันวาคม' }
];

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export default function DatabaseStorageManager({ 
  showToast, 
  onStartSimulation, 
  isSimulationMode, 
  simulationMeta, 
  onExitSimulation 
}) {
  // --- 1. Real-time Dashboard State ---
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await getDatabaseAndStorageStats();
      if (res?.status === 'success') {
        setStats(res);
      } else {
        showToast('ไม่สามารถดึงข้อมูลสถิติพื้นที่ได้: ' + (res?.message || ''), 'warning');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStats(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // --- 2. Active Tab State for Management Actions ---
  const [activeActionTab, setActiveActionTab] = useState('export'); // 'export', 'purge', 'simulation', 'cache'
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // --- 3. Export to Excel State ---
  const [exportRangeType, setExportRangeType] = useState('year'); // 'all', 'year', 'month', 'custom', 'single'
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportStartDate, setExportStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportSingleDate, setExportSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportSelectedTables, setExportSelectedTables] = useState(PURGEABLE_TABLES.map(t => t.key));
  const [exportCounts, setExportCounts] = useState({});
  const [isLoadingExportCounts, setIsLoadingExportCounts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- 4. Purge Historical Data State ---
  const [purgeRangeType, setPurgeRangeType] = useState('year'); // 'year', 'month', 'custom', 'single'
  const [purgeYear, setPurgeYear] = useState(new Date().getFullYear() - 1); // ค่าเริ่มต้นคือปีที่แล้ว
  const [purgeMonth, setPurgeMonth] = useState(new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1);
  const [purgeStartDate, setPurgeStartDate] = useState(`${new Date().getFullYear() - 1}-01-01`);
  const [purgeEndDate, setPurgeEndDate] = useState(`${new Date().getFullYear() - 1}-12-31`);
  const [purgeSingleDate, setPurgeSingleDate] = useState(`${new Date().getFullYear() - 1}-01-01`);
  const [purgeSelectedTables, setPurgeSelectedTables] = useState(['pos_transactions', 'finance_revenue', 'finance_expenses', 'staff_schedules', 'inventory_logs', 'logs']);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const [impactCounts, setImpactCounts] = useState(null);
  const [isPurging, setIsPurging] = useState(false);
  const [hasExportedConfirmed, setHasExportedConfirmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // --- 5. Simulation Import State ---
  const [importFile, setImportFile] = useState(null);
  const [parsedSimData, setParsedSimData] = useState(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // คำนวณช่วงวันที่สำหรับ Export
  const currentExportBounds = useMemo(() => {
    return getDateRangeBounds(exportRangeType, {
      year: exportYear,
      month: exportMonth,
      startDate: exportStartDate,
      endDate: exportEndDate,
      singleDate: exportSingleDate
    });
  }, [exportRangeType, exportYear, exportMonth, exportStartDate, exportEndDate, exportSingleDate]);

  // คำนวณช่วงวันที่สำหรับ Purge
  const currentPurgeBounds = useMemo(() => {
    return getDateRangeBounds(purgeRangeType, {
      year: purgeYear,
      month: purgeMonth,
      startDate: purgeStartDate,
      endDate: purgeEndDate,
      singleDate: purgeSingleDate
    });
  }, [purgeRangeType, purgeYear, purgeMonth, purgeStartDate, purgeEndDate, purgeSingleDate]);

  // ดึงจำนวนแถวตามช่วงเวลาที่เลือกในแท็บ Export อัตโนมัติ (Dynamic Head Count)
  useEffect(() => {
    let isMounted = true;
    const fetchExportCounts = async () => {
      setIsLoadingExportCounts(true);
      try {
        const counts = await getTableCountsByDateRange(
          PURGEABLE_TABLES.map(t => t.key),
          currentExportBounds
        );
        if (isMounted) {
          setExportCounts(counts);
        }
      } catch (err) {
        console.error('fetchExportCounts error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingExportCounts(false);
        }
      }
    };

    fetchExportCounts();
    return () => { isMounted = false; };
  }, [currentExportBounds]);

  // ตรวจสอบจำนวนรายการที่จะถูกลบอัตโนมัติเมื่อเลือกตารางหรือช่วงเวลาในแท็บ Purge
  useEffect(() => {
    let isMounted = true;
    if (activeActionTab === 'purge' && purgeSelectedTables.length > 0) {
      previewPurgeImpact(purgeSelectedTables, currentPurgeBounds).then(counts => {
        if (isMounted) setImpactCounts(counts);
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [activeActionTab, currentPurgeBounds, purgeSelectedTables]);

  // ตรวจสอบจำนวนรายการที่จะถูกลบ
  const handleCheckImpact = async () => {
    if (purgeSelectedTables.length === 0) {
      showToast('กรุณาเลือกตารางที่ต้องการลบอย่างน้อย 1 ตาราง', 'warning');
      return;
    }
    setIsCheckingImpact(true);
    try {
      const counts = await previewPurgeImpact(purgeSelectedTables, currentPurgeBounds);
      setImpactCounts(counts);
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการตรวจสอบรายการ: ' + e.message, 'danger');
    } finally {
      setIsCheckingImpact(false);
    }
  };

  // ดำเนินการ Export เป็น Excel
  const handleExecuteExport = async () => {
    if (exportSelectedTables.length === 0) {
      showToast('กรุณาเลือกตารางที่ต้องการ Export อย่างน้อย 1 ตาราง', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `anping_backup_${currentExportBounds.dateOnlyStart || 'all'}_to_${currentExportBounds.dateOnlyEnd || nowStr}.xlsx`;
      const res = await exportSupabaseToExcel(exportSelectedTables, currentExportBounds, filename);
      showToast(`ส่งออกข้อมูลสำเร็จ ${res.totalRows} แถวลงไฟล์ ${res.filename}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการส่งออกไฟล์: ' + e.message, 'danger');
    } finally {
      setIsExporting(false);
    }
  };

  // ดำเนินการลบข้อมูลย้อนหลัง (Purge)
  const handleExecutePurge = async () => {
    if (!hasExportedConfirmed) {
      showToast('กรุณาติ๊กยืนยันว่าได้ส่งออกไฟล์สำรองเรียบร้อยแล้ว', 'warning');
      return;
    }
    if (confirmText.trim() !== 'CONFIRM_DELETE') {
      showToast('กรุณาพิมพ์ข้อความ CONFIRM_DELETE เพื่อยืนยันความปลอดภัย', 'warning');
      return;
    }

    const totalImpactRows = impactCounts ? Object.values(impactCounts).reduce((a, b) => a + b, 0) : null;
    const confirmPrompt = window.confirm(`⚠️ คำเตือนขั้นสุดท้าย:\nคุณต้องการลบข้อมูลจำนวน ${totalImpactRows !== null ? totalImpactRows : 'ที่เลือก'} รายการ ในช่วง ${currentPurgeBounds.label} ออกจากฐานข้อมูลและระบบจริงใช่หรือไม่?\n\n(ข้อมูลคนไข้และประวัติการรักษาจะไม่ถูกแตะต้อง 100%)`);
    if (!confirmPrompt) return;

    setIsPurging(true);
    try {
      const res = await purgeHistoricalData(purgeSelectedTables, currentPurgeBounds);
      showToast(`ลบข้อมูลย้อนหลังเรียบร้อยแล้ว รวมทั้งสิ้น ${res.totalDeleted} รายการ`, 'success');
      setImpactCounts(null);
      setConfirmText('');
      setHasExportedConfirmed(false);
      // รีเฟรชสถิติฐานข้อมูลใหม่
      fetchStats();
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล: ' + e.message, 'danger');
    } finally {
      setIsPurging(false);
    }
  };

  // จัดการอัปโหลดไฟล์ Excel เพื่อจำลองข้อมูล
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setIsParsingExcel(true);
    try {
      const res = await parseExcelForSimulation(file);
      setParsedSimData(res.data);
      showToast(`ตรวจพบข้อมูลจากไฟล์ ${file.name} รวม ${res.data.totalRecords} รายการ`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'danger');
      setImportFile(null);
      setParsedSimData(null);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleStartSimulation = () => {
    if (!parsedSimData) return;
    if (onStartSimulation) {
      onStartSimulation(parsedSimData);
      showToast('เปิดโหมดจำลองข้อมูล (Sandbox Mode) สำเร็จ! ข้อมูลจะรันจากไฟล์เท่านั้น', 'success');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* --- ส่วนหัวหลัก (Header & Refresh) --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-xs">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 kanit-text flex items-center gap-2">
              จัดการฐานข้อมูล แคช & พื้นที่จัดเก็บ
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                Real-time Live
              </span>
            </h2>
            <p className="text-xs text-slate-500 kanit-text mt-0.5">
              ตรวจสอบเนื้อที่ Supabase โควตา Egress ส่งออกข้อมูลสำรอง และลบข้อมูลย้อนหลังอย่างปลอดภัย
            </p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoadingStats}
          className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold kanit-text text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <RefreshCw size={15} className={isLoadingStats ? 'animate-spin text-sky-500' : 'text-slate-500'} />
          <span>{isLoadingStats ? 'กำลังตรวจสอบ...' : 'รีเฟรชสถิติเรียลไทม์'}</span>
        </button>
      </div>

      {/* --- แดชบอร์ดสรุปโควตา Egress & เนื้อที่จัดเก็บ (Metrics Grid) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Egress Quota (Data Transfer) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 kanit-text uppercase tracking-wider">
              โควตา Egress ({stats?.currentMonthLabel || 'เดือนนี้'})
            </span>
            <span className={`p-2 rounded-xl border ${
              (stats?.egressUsagePercent || 0) > 80 
                ? 'bg-rose-50 text-rose-600 border-rose-100' 
                : (stats?.egressUsagePercent || 0) > 50 
                  ? 'bg-amber-50 text-amber-600 border-amber-100' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              <ArrowUpRight size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 kanit-text">
                {stats ? formatBytes(stats.estimatedMonthlyEgressBytes) : '-'}
              </span>
              <span className="text-xs text-slate-400 kanit-text font-normal">
                / 5.00 GB
              </span>
            </div>

            {/* Progress Bar (หลอดพลัง) */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  (stats?.egressUsagePercent || 0) > 80 
                    ? 'bg-rose-500' 
                    : (stats?.egressUsagePercent || 0) > 50 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, stats?.egressUsagePercent || 1)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 kanit-text mt-1.5 flex justify-between">
              <span>ใช้งานไปแล้ว {stats?.egressUsagePercent != null ? `${stats.egressUsagePercent}%` : '0%'}</span>
              <span className="text-emerald-600 font-medium">ประหยัดได้ {stats?.egressSavingsPercent != null ? `${stats.egressSavingsPercent}%` : '99.8%'}</span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs kanit-text">
            <span className="text-slate-500">โควตาคงเหลือเดือนนี้:</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} />
              {stats ? formatBytes(stats.egressRemainingBytes) : '5.00 GB'}
            </span>
          </div>
        </div>

        {/* Metric 2: Database Storage Size */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 kanit-text uppercase tracking-wider">
              ขนาดฐานข้อมูล (Database)
            </span>
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <HardDrive size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 kanit-text">
                {stats ? formatBytes(stats.estimatedDbBytes) : '-'}
              </span>
              <span className="text-xs text-slate-400 kanit-text font-normal">
                / 500 MB
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className="bg-sky-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(2, stats?.dbUsagePercent || 1)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 kanit-text mt-1.5 flex justify-between">
              <span>ใช้งานไปแล้ว {stats?.dbUsagePercent || 0}%</span>
              <span>{stats?.totalRows ? `${stats.totalRows.toLocaleString()} แถว` : '-'}</span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs kanit-text">
            <span className="text-slate-500">ความจุคงเหลือ:</span>
            <span className="text-sky-600 font-bold">
              {stats ? formatBytes(Math.max(0, stats.dbLimitBytes - stats.estimatedDbBytes)) : '-'}
            </span>
          </div>
        </div>

        {/* Metric 3: File Storage (Buckets) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 kanit-text uppercase tracking-wider">
              พื้นที่ไฟล์ (Storage Files)
            </span>
            <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
              <Layers size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 kanit-text">
                {stats ? formatBytes(stats.totalStorageBytes) : '-'}
              </span>
              <span className="text-xs text-slate-400 kanit-text font-normal">
                / 1.00 GB
              </span>
            </div>

            {/* Progress Bar (หลอดพลัง) */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  (stats?.storageUsagePercent || 0) > 80 
                    ? 'bg-rose-500' 
                    : (stats?.storageUsagePercent || 0) > 50 
                      ? 'bg-amber-500' 
                      : 'bg-violet-500'
                }`}
                style={{ width: `${Math.max(2, stats?.storageUsagePercent || 1)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 kanit-text mt-1.5 flex justify-between">
              <span>ใช้งานไปแล้ว {stats?.storageUsagePercent != null ? `${stats.storageUsagePercent}%` : '0%'}</span>
              <span>{stats?.totalFilesCount ? `${stats.totalFilesCount.toLocaleString()} ไฟล์` : '0 ไฟล์'} ({stats?.bucketStats?.length || 0} ถัง)</span>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs kanit-text">
            <span className="text-slate-500">พื้นที่คงเหลือ:</span>
            <span className="text-violet-600 font-bold">
              {stats ? formatBytes(stats.storageRemainingBytes) : '1.00 GB'}
            </span>
          </div>
        </div>
      </div>

      {/* --- แท็บเมนูจัดการ 4 ด้าน (Action SubTabs) --- */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto p-2 bg-slate-50/50 gap-1.5 custom-scrollbar">
          <button
            onClick={() => setActiveActionTab('export')}
            className={`px-4 py-2.5 rounded-2xl font-bold kanit-text text-xs flex items-center gap-2 shrink-0 transition-all ${
              activeActionTab === 'export'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download size={15} />
            <span>1. ส่งออกข้อมูลเป็น Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => setActiveActionTab('purge')}
            className={`px-4 py-2.5 rounded-2xl font-bold kanit-text text-xs flex items-center gap-2 shrink-0 transition-all ${
              activeActionTab === 'purge'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trash2 size={15} />
            <span>2. ลบข้อมูลย้อนหลังตามช่วงวันที่</span>
          </button>

          <button
            onClick={() => setActiveActionTab('simulation')}
            className={`px-4 py-2.5 rounded-2xl font-bold kanit-text text-xs flex items-center gap-2 shrink-0 transition-all ${
              activeActionTab === 'simulation'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FlaskConical size={15} />
            <span>3. โหมดจำลองข้อมูลจากไฟล์ Excel (Sandbox)</span>
          </button>

          <button
            onClick={() => setActiveActionTab('cache')}
            className={`px-4 py-2.5 rounded-2xl font-bold kanit-text text-xs flex items-center gap-2 shrink-0 transition-all ${
              activeActionTab === 'cache'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RotateCcw size={15} />
            <span>4. จัดการแคชเครื่อง (IndexedDB)</span>
          </button>
        </div>

        {/* --- เนื้อหาในแต่ละแท็บ --- */}
        <div className="p-6">
          {/* ========================================================================= */}
          {/* TAB 1: EXPORT TO EXCEL */}
          {/* ========================================================================= */}
          {activeActionTab === 'export' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 kanit-text flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-500" size={18} />
                    ส่งออกข้อมูลจาก Supabase เป็นไฟล์ Excel (.xlsx) แบบหลาย Sheet
                  </h3>
                  <p className="text-xs text-slate-500 kanit-text mt-1">
                    ดาวน์โหลดข้อมูลเอกสารการเงิน บิล POS การเข้างานพนักงาน และ Log ระบบ เพื่อนำไปเก็บสำรองข้อมูลไว้ดูย้อนหลังก่อนทำการลบ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(true)}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-2xl font-bold kanit-text text-xs shadow-2xs flex items-center gap-2 shrink-0 transition-all active:scale-95"
                  title="พิมพ์ / ส่งออก Statement สไตล์ธนาคารพาณิชย์"
                >
                  <Printer size={15} />
                  <span>พิมพ์ Statement คลินิก (Bank Style)</span>
                </button>
              </div>

              {/* 1. เลือกช่วงเวลา */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 kanit-text block">
                  1. เลือกช่วงเวลาที่ต้องการส่งออก:
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'all', label: 'ข้อมูลทั้งหมด' },
                    { id: 'year', label: 'เลือกทั้งปี' },
                    { id: 'month', label: 'เลือกรายเดือน' },
                    { id: 'custom', label: 'กำหนดช่วงวันที่' },
                    { id: 'single', label: 'เฉพาะวันเดียว' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setExportRangeType(tab.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold kanit-text border transition-all ${
                        exportRangeType === tab.id
                          ? 'bg-white text-sky-600 border-sky-300 shadow-xs'
                          : 'bg-slate-100/60 text-slate-600 border-transparent hover:bg-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ตัวกรองตามประเภทช่วงเวลา */}
                <div className="pt-2">
                  {exportRangeType === 'year' && (
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-600 kanit-text font-medium">ปี พ.ศ./ค.ศ.:</label>
                      <select
                        value={exportYear}
                        onChange={(e) => setExportYear(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-sky-500"
                      >
                        {AVAILABLE_YEARS.map(y => (
                          <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {exportRangeType === 'month' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-600 kanit-text font-medium">ปี:</label>
                        <select
                          value={exportYear}
                          onChange={(e) => setExportYear(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-sky-500"
                        >
                          {AVAILABLE_YEARS.map(y => (
                            <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-600 kanit-text font-medium">เดือน:</label>
                        <select
                          value={exportMonth}
                          onChange={(e) => setExportMonth(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-sky-500"
                        >
                          {THAI_MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {exportRangeType === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 kanit-text">ตั้งแต่วันที่:</span>
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-sky-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 kanit-text">ถึงวันที่:</span>
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  {exportRangeType === 'single' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 kanit-text">ระบุวันที่:</span>
                      <input
                        type="date"
                        value={exportSingleDate}
                        onChange={(e) => setExportSingleDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-sky-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. เลือกตารางที่ต้องการ Export */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 kanit-text">
                    2. เลือกตารางที่ต้องการบรรจุลงในไฟล์ Excel:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExportSelectedTables(PURGEABLE_TABLES.map(t => t.key))}
                      className="text-[11px] text-sky-600 hover:underline kanit-text font-semibold"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setExportSelectedTables([])}
                      className="text-[11px] text-slate-400 hover:underline kanit-text font-semibold"
                    >
                      ยกเลิกทั้งหมด
                    </button>
                  </div>
                </div>

                {/* แถบสรุปช่วงเวลาและจำนวนแถวจริงในช่วงเวลานี้ */}
                <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs kanit-text">
                  <div className="flex items-center gap-2 text-sky-800 font-medium">
                    <Info size={14} className="text-sky-600 shrink-0" />
                    <span>ช่วงเวลา: <strong className="text-sky-950 font-bold">{currentExportBounds.label}</strong></span>
                  </div>
                  <div className="text-sky-700 font-bold">
                    รวมแถวที่เลือก: {isLoadingExportCounts ? (
                      <span className="animate-pulse text-sky-500">กำลังคำนวณ...</span>
                    ) : (
                      `${exportSelectedTables.reduce((acc, k) => acc + (exportCounts[k] !== undefined ? exportCounts[k] : 0), 0).toLocaleString()} แถว`
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PURGEABLE_TABLES.map(tbl => {
                    const isChecked = exportSelectedTables.includes(tbl.key);
                    const count = exportCounts[tbl.key] !== undefined ? exportCounts[tbl.key] : (stats?.tableCounts?.[tbl.key] || 0);
                    return (
                      <label
                        key={tbl.key}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-sky-50/60 border-sky-200 text-sky-900 shadow-2xs' 
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setExportSelectedTables([...exportSelectedTables, tbl.key]);
                              else setExportSelectedTables(exportSelectedTables.filter(k => k !== tbl.key));
                            }}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-xs font-bold kanit-text truncate">{tbl.name}</span>
                        </div>
                        <span className={`text-[11px] font-bold kanit-text px-2 py-0.5 rounded-lg border transition-all ${
                          count > 0 
                            ? 'bg-sky-100/70 border-sky-200 text-sky-800' 
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                          {isLoadingExportCounts ? (
                            <span className="animate-pulse text-sky-500">...</span>
                          ) : (
                            `${count.toLocaleString()} แถว`
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ปุ่มสั่ง Export */}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  disabled={isExporting || exportSelectedTables.length === 0}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} className={isExporting ? 'animate-bounce' : ''} />
                  <span>{isExporting ? 'กำลังสร้างไฟล์ Excel...' : 'ดาวน์โหลดไฟล์ Excel (.xlsx) สำรองข้อมูล'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PURGE HISTORICAL DATA */}
          {/* ========================================================================= */}
          {activeActionTab === 'purge' && (
            <div className="space-y-6">
              {/* แบนเนอร์เตือนความปลอดภัยขั้นสูงสุด */}
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
                <ShieldCheck size={22} className="text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-sky-900 kanit-text flex items-center gap-1.5">
                    <span>ระบบป้องกันความปลอดภัยทางการแพทย์ 100% (Strict Safety Protected)</span>
                    <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">ระบบล็อกถาวร</span>
                  </h4>
                  <p className="text-[11px] text-sky-700 kanit-text leading-relaxed">
                    ข้อมูลคนไข้ (Patients), ประวัติการรักษา (OPD/Treatments), และคอร์สการรักษา (Patient Courses) <strong>จะไม่สามารถลบได้จากหน้านี้โดยเด็ดขาด</strong> เพื่อป้องกันการสูญหายของประวัติสุขภาพ หากต้องการลบคนไข้ จะต้องดำเนินการเฉพาะเจาะจงที่หน้าเวชระเบียนเท่านั้น
                  </p>
                </div>
              </div>

              {/* 1. เลือกช่วงวันที่ที่ต้องการลบ */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 kanit-text block">
                  1. เลือกช่วงเวลาของเอกสารที่ต้องการลบ:
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'year', label: 'เลือกทั้งปี' },
                    { id: 'month', label: 'เลือกรายเดือน' },
                    { id: 'custom', label: 'กำหนดช่วงวันที่เอง' },
                    { id: 'single', label: 'เฉพาะวันเดียว' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setPurgeRangeType(tab.id); setImpactCounts(null); }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold kanit-text border transition-all ${
                        purgeRangeType === tab.id
                          ? 'bg-white text-rose-600 border-rose-300 shadow-xs'
                          : 'bg-slate-100/60 text-slate-600 border-transparent hover:bg-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ตัวกรองตามประเภทช่วงเวลา */}
                <div className="pt-2">
                  {purgeRangeType === 'year' && (
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-600 kanit-text font-medium">เลือกลบข้อมูลทั้งปี:</label>
                      <select
                        value={purgeYear}
                        onChange={(e) => { setPurgeYear(Number(e.target.value)); setImpactCounts(null); }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-rose-500"
                      >
                        {AVAILABLE_YEARS.map(y => (
                          <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {purgeRangeType === 'month' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-600 kanit-text font-medium">ปี:</label>
                        <select
                          value={purgeYear}
                          onChange={(e) => { setPurgeYear(Number(e.target.value)); setImpactCounts(null); }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-rose-500"
                        >
                          {AVAILABLE_YEARS.map(y => (
                            <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-600 kanit-text font-medium">เดือน:</label>
                        <select
                          value={purgeMonth}
                          onChange={(e) => { setPurgeMonth(Number(e.target.value)); setImpactCounts(null); }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-rose-500"
                        >
                          {THAI_MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {purgeRangeType === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 kanit-text">ตั้งแต่วันที่:</span>
                        <input
                          type="date"
                          value={purgeStartDate}
                          onChange={(e) => { setPurgeStartDate(e.target.value); setImpactCounts(null); }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-rose-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 kanit-text">ถึงวันที่:</span>
                        <input
                          type="date"
                          value={purgeEndDate}
                          onChange={(e) => { setPurgeEndDate(e.target.value); setImpactCounts(null); }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-rose-500"
                        />
                      </div>
                    </div>
                  )}

                  {purgeRangeType === 'single' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 kanit-text">ระบุวันที่:</span>
                      <input
                        type="date"
                        value={purgeSingleDate}
                        onChange={(e) => { setPurgeSingleDate(e.target.value); setImpactCounts(null); }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-rose-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. เลือกตารางเอกสารที่อนุญาตให้ลบได้ */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 kanit-text block">
                  2. เลือกประเภทเอกสารที่ต้องการลบ:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PURGEABLE_TABLES.map(tbl => {
                    const isChecked = purgeSelectedTables.includes(tbl.key);
                    const impactNum = impactCounts?.[tbl.key];
                    return (
                      <label
                        key={tbl.key}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-rose-50/50 border-rose-200 text-rose-900 shadow-2xs' 
                            : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setPurgeSelectedTables([...purgeSelectedTables, tbl.key]);
                              else setPurgeSelectedTables(purgeSelectedTables.filter(k => k !== tbl.key));
                              setImpactCounts(null);
                            }}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs font-bold kanit-text truncate">{tbl.name}</span>
                        </div>
                        {impactNum !== undefined && (
                          <span className="text-[11px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                            {impactNum.toLocaleString()} รายการ
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ปุ่มตรวจสอบจำนวนรายการที่จะได้รับผลกระทบ */}
              <div>
                <button
                  type="button"
                  onClick={handleCheckImpact}
                  disabled={isCheckingImpact || purgeSelectedTables.length === 0}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold kanit-text text-xs transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} className={isCheckingImpact ? 'animate-spin text-rose-500' : ''} />
                  <span>{isCheckingImpact ? 'กำลังคำนวณจำนวนรายการ...' : '🔍 ตรวจสอบจำนวนรายการที่จะถูกลบ'}</span>
                </button>
              </div>

              {/* สรุปผลกระทบก่อนลบ */}
              {impactCounts && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 kanit-text">
                    <AlertTriangle size={16} />
                    <span>สรุปรายการที่จะถูกลบออกถาวร ({currentPurgeBounds.label}):</span>
                  </div>
                  <div className="text-xs kanit-text space-y-1">
                    <p className="font-bold text-rose-600">
                      รวมทั้งหมด: {Object.values(impactCounts).reduce((a, b) => a + b, 0).toLocaleString()} แถว
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(impactCounts).map(([key, val]) => (
                        <span key={key} className="bg-white/80 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px]">
                          {PURGEABLE_TABLES.find(t => t.key === key)?.name.split('(')[0] || key}: <strong>{val}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* มาตรการยืนยัน 2 ชั้นก่อนลบ (Safety Confirmation) */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                <span className="text-xs font-bold text-rose-900 kanit-text block">
                  ยืนยันความปลอดภัยเพื่อปลดล็อกการลบ:
                </span>

                <label className="flex items-center gap-2 cursor-pointer text-xs kanit-text text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={hasExportedConfirmed}
                    onChange={(e) => setHasExportedConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>ฉันได้ทำการส่งออกไฟล์ Excel สำรองข้อมูลเรียบร้อยแล้ว และเข้าใจว่าข้อมูลจะถูกลบออกจากฐานข้อมูลถาวร</span>
                </label>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 kanit-text block">
                    พิมพ์ข้อความ <strong className="text-rose-600 select-all">CONFIRM_DELETE</strong> เพื่อปลดล็อกปุ่มลบ:
                  </span>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="พิมพ์ CONFIRM_DELETE ที่นี่"
                    className="w-full max-w-sm px-3 py-2 rounded-xl border border-rose-200 bg-white text-xs font-bold text-slate-800 kanit-text focus:outline-rose-500 uppercase"
                  />
                </div>
              </div>

              {/* ปุ่มลบข้อมูลจริง */}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={handleExecutePurge}
                  disabled={isPurging || !hasExportedConfirmed || confirmText.trim() !== 'CONFIRM_DELETE' || purgeSelectedTables.length === 0}
                  className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} className={isPurging ? 'animate-spin' : ''} />
                  <span>{isPurging ? 'กำลังลบข้อมูลออกจากระบบ...' : 'ยืนยันลบข้อมูลตามช่วงเวลา (Permanent Purge)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SIMULATION MODE (SANDBOX) */}
          {/* ========================================================================= */}
          {activeActionTab === 'simulation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 kanit-text flex items-center gap-2">
                  <FlaskConical className="text-amber-500" size={18} />
                  โหมดจำลองข้อมูลจากไฟล์ Excel (Sandbox Simulation Mode)
                </h3>
                <p className="text-xs text-slate-500 kanit-text mt-1 leading-relaxed">
                  นำเข้าไฟล์ Excel (.xlsx) ที่เคย Export ไว้ เพื่อนำมาเปิดดูรายงาน บิล POS และบัญชีทางการเงินย้อนหลังบนเว็บแอปได้ทันที โดย<strong>ข้อมูลนี้จะรันบนหน่วยความจำเท่านั้น ไม่ถูกส่งขึ้น Supabase หรือแตะต้องข้อมูลจริงใดๆ ทั้งสิ้น</strong>
                </p>
              </div>

              {/* สถานะโหมดจำลองปัจจุบัน */}
              {isSimulationMode && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
                    <div>
                      <span className="text-xs font-bold text-amber-900 kanit-text block">
                        ขณะนี้กำลังอยู่ในโหมดจำลองข้อมูล (Sandbox Mode Active)
                      </span>
                      <span className="text-[11px] text-amber-700 kanit-text">
                        ไฟล์: {simulationMeta?.fileName || 'จำลองจากไฟล์'} ({simulationMeta?.totalRecords || 0} รายการ)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onExitSimulation}
                    className="px-3.5 py-1.5 bg-white text-amber-800 border border-amber-200 rounded-xl font-bold kanit-text text-xs hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <X size={14} />
                    <span>ออกจากโหมดจำลอง</span>
                  </button>
                </div>
              )}

              {/* กล่องอัปโหลดไฟล์ Excel */}
              <div className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/20 rounded-3xl p-8 text-center transition-all">
                <input
                  type="file"
                  id="excel-simulation-upload"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="excel-simulation-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center shadow-xs">
                    <Upload size={26} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 kanit-text block">
                      คลิกเพื่อเลือกไฟล์ Excel (.xlsx) ที่เคย Export ไว้
                    </span>
                    <span className="text-xs text-slate-400 kanit-text mt-0.5 block">
                      รองรับไฟล์ .xlsx ที่มี Sheet ของ POS, การเงิน, หรือประวัติเข้างาน
                    </span>
                  </div>
                </label>
              </div>

              {/* แสดงตัวอย่างข้อมูลที่ตรวจพบในไฟล์ */}
              {parsedSimData && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 kanit-text">
                      ตรวจพบข้อมูลในไฟล์: {parsedSimData.fileName}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 kanit-text bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      รวม {parsedSimData.totalRecords.toLocaleString()} รายการ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs kanit-text">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">บิล POS:</span>
                      <strong className="text-slate-700 font-bold">{parsedSimData.pos_transactions.length} รายการ</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">รายรับ:</span>
                      <strong className="text-slate-700 font-bold">{parsedSimData.finance_revenue.length} รายการ</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">รายจ่าย:</span>
                      <strong className="text-slate-700 font-bold">{parsedSimData.finance_expenses.length} รายการ</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">การเข้างานพนักงาน:</span>
                      <strong className="text-slate-700 font-bold">{parsedSimData.staff_schedules.length} รายการ</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={handleStartSimulation}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
                    >
                      <Sparkles size={16} />
                      <span>เริ่มต้นโหมดจำลองข้อมูล (รันข้อมูลจากไฟล์ Excel นี้)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LOCAL INDEXEDDB CACHE */}
          {/* ========================================================================= */}
          {activeActionTab === 'cache' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 kanit-text flex items-center gap-2">
                  <Database size={18} className="text-sky-500" />
                  จัดการแคชข้อมูลในเครื่อง (IndexedDB Local Storage)
                </h3>
                <p className="text-slate-500 text-xs mt-1 kanit-text leading-relaxed">
                  ระบบจะบันทึกข้อมูลไว้ในเครื่องของคุณอัตโนมัติ เพื่อให้เปิดหน้าเว็บได้เร็วทันใจใน 0.05 วินาที หากคุณต้องการล้างแคชในเครื่องทั้งหมดและดึงข้อมูลใหม่สดๆ จาก Supabase สามารถกดปุ่มล้างแคชด้านล่างนี้ได้ทันที
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs font-medium space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800 text-sm">
                  <AlertTriangle size={16} /> หมายเหตุเกี่ยวกับการล้างแคช
                </div>
                <p>• การล้างแคชในเครื่องจะทำการลบข้อมูลสำรองชั่วคราวใน IndexedDB ออกทั้งหมด</p>
                <p>• ข้อมูลจริงบนฐานข้อมูล Supabase จะไม่สูญหาย ระบบจะทำการดึงข้อมูลใหม่สดๆ ทั้งหมดทันทีเมื่อรีโหลดหน้าเว็บ</p>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('คุณต้องการล้างแคชในเครื่องทั้งหมด และรีโหลดหน้าเว็บเพื่อดึงข้อมูลใหม่สดๆ ใช่หรือไม่?')) {
                      await clearAllLocalStores();
                      showToast('ล้างแคชในเครื่องเรียบร้อยแล้ว กำลังรีโหลดระบบ...', 'success');
                      setTimeout(() => window.location.reload(), 1200);
                    }
                  }}
                  className="px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95"
                >
                  <RotateCcw size={18} />
                  <span>ล้างแคชในเครื่องทั้งหมด (Force Purge & Full Re-sync)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clinic Statement Modal (Bank Layout Style) */}
      <ClinicStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
