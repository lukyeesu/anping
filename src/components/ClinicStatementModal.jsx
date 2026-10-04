import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const PERIOD_PRESETS = [
  { id: '7d', label: '1 อาทิตย์', desc: '7 วันล่าสุด' },
  { id: '1m', label: '1 เดือน', desc: '30 วันล่าสุด' },
  { id: '3m', label: '3 เดือน', desc: 'ไตรมาสล่าสุด' },
  { id: '6m', label: '6 เดือน', desc: 'ครึ่งปี' },
  { id: '12m', label: '12 เดือน (1 ปี)', desc: 'ย้อนหลัง 1 ปี' },
  { id: '24m', label: '2 ปี (24 เดือน)', desc: 'ย้อนหลัง 2 ปี' },
  { id: 'custom', label: 'กำหนดเอง', desc: 'ระบุวันเริ่มต้น - สิ้นสุด' },
];

export default function ClinicStatementModal({
  isOpen,
  onClose,
  branchesData = [],
  currentBranch = 'all',
  showToast
}) {
  const [selectedPreset, setSelectedPreset] = useState('1m');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState(currentBranch || 'all');
  const [manualOpeningBalance, setManualOpeningBalance] = useState('');
  
  // Data states
  const [isLoading, setIsLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');

  // คำนวณช่วงวันที่
  const rangeBounds = useMemo(() => {
    return getStatementDateBounds(selectedPreset, {
      startDate: customStartDate,
      endDate: customEndDate
    });
  }, [selectedPreset, customStartDate, customEndDate]);

  // ดึงข้อมูล Statement
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
  const activeBranchInfo = branchesData.find(b => b.id === selectedBranch) || {
    name: selectedBranch === 'all' ? 'ทุกสาขา / ภาพรวมคลินิก' : 'สาขาคลินิก',
    address: '119/140 ม.1 ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110',
    phone: '02-000-0000'
  };

  const clinicInfo = {
    name: 'อันผิง คลินิกการแพทย์แผนไทยประยุกต์',
    enName: 'ANPING APPLIED THAI TRADITIONAL MEDICINE CLINIC',
    taxId: '0-1055-66000-00-0'
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
      statementData,
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
      const filename = `anping_clinic_statement_${rangeBounds.dateOnlyStart}_${rangeBounds.dateOnlyEnd}.xlsx`;
      exportClinicStatementExcel({
        statementData,
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

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 kanit-text tracking-tight">
                  รายการเดินบัญชีการเงินคลินิก (Clinic Statement)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 kanit-text">
                  Bank Layout Style
                </span>
              </div>
              <p className="text-xs text-slate-500 kanit-text mt-0.5">
                พิมพ์และส่งออก Statement รายรับ-รายจ่าย คล้ายรูปแบบของธนาคารพาณิชย์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Section 1: ตัวเลือกช่วงเวลา (Presets) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 kanit-text flex items-center gap-1.5">
                <Calendar size={15} className="text-emerald-600" />
                <span>1. เลือกช่วงเวลาที่ต้องการออก Statement:</span>
              </label>
              <span className="text-xs font-bold text-emerald-700 kanit-text bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                {rangeBounds.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {PERIOD_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPreset(p.id)}
                  className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col justify-center items-center ${
                    selectedPreset === p.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25 scale-[1.02]'
                      : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold kanit-text">{p.label}</span>
                  <span className={`text-[10px] kanit-text mt-0.5 ${
                    selectedPreset === p.id ? 'text-emerald-100' : 'text-slate-400'
                  }`}>
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {selectedPreset === 'custom' && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 kanit-text font-medium">ตั้งแต่วันที่:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 kanit-text font-medium">ถึงวันที่:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: ตัวเลือกสาขา และยอดยกมา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 kanit-text block mb-1.5">
                เลือกสาขา:
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
              >
                <option value="all">ทุกสาขา / สำนักงานใหญ่</option>
                {branchesData.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 kanit-text">
                  ยอดยกมาเริ่มต้น (บาท):
                </label>
                <span className="text-[10px] text-slate-400 kanit-text font-normal">
                  (เว้นว่างไว้เพื่อให้ระบบคำนวณสะสมอัตโนมัติ)
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder={`อัตโนมัติ (${formatCurrency(statementData?.openingBalance || 0)})`}
                value={manualOpeningBalance}
                onChange={(e) => setManualOpeningBalance(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 kanit-text focus:outline-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Section 3: แดชบอร์ดสรุปสถิติสไตล์ Bank Statement */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 kanit-text uppercase">ยอดยกมาเริ่มต้น</span>
              <div className="text-lg font-black text-slate-800 kanit-text mt-1">
                {formatCurrency(statementData?.openingBalance || 0)}
              </div>
              <span className="text-[10px] text-slate-400 kanit-text">บาท</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-500 kanit-text uppercase">รวมรายจ่าย (ถอน)</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded-md">
                  {statementData?.debitCount || 0} รายการ
                </span>
              </div>
              <div className="text-lg font-black text-rose-700 kanit-text mt-1">
                {formatCurrency(statementData?.totalDebit || 0)}
              </div>
              <span className="text-[10px] text-rose-500/80 kanit-text">บาท</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600 kanit-text uppercase">รวมรายรับ (ฝาก)</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded-md">
                  {statementData?.creditCount || 0} รายการ
                </span>
              </div>
              <div className="text-lg font-black text-emerald-800 kanit-text mt-1">
                {formatCurrency(statementData?.totalCredit || 0)}
              </div>
              <span className="text-[10px] text-emerald-600/80 kanit-text">บาท</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <span className="text-[11px] font-bold text-emerald-100 kanit-text uppercase">ยอดยกไปสุทธิ</span>
              <div className="text-lg font-black text-white kanit-text mt-1">
                {formatCurrency(statementData?.closingBalance || 0)}
              </div>
              <span className="text-[10px] text-emerald-100 kanit-text">บาท (คงเหลือสุทธิ)</span>
            </div>
          </div>

          {/* Section 4: Preview Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-700 kanit-text">
                  ตัวอย่างรายการเดินบัญชี ({filteredTransactions.length} รายการ):
                </h4>
                {isLoading && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-pulse kanit-text">
                    <RefreshCw size={12} className="animate-spin" /> กำลังคำนวณ...
                  </span>
                )}
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาใน Statement..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs kanit-text focus:outline-emerald-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs kanit-text">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 text-[11px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-24 text-center">วันที่ / เวลา</th>
                      <th className="py-2.5 px-3">รายการ</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">ถอนเงิน (ออก)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-600">ฝากเงิน (เข้า)</th>
                      <th className="py-2.5 px-3 text-right">ยอดคงเหลือ (บาท)</th>
                      <th className="py-2.5 px-3 text-center">ช่องทาง</th>
                      <th className="py-2.5 px-3">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* ยอดยกมา */}
                    <tr className="bg-slate-50/80 font-bold text-slate-700">
                      <td className="py-2 px-3 text-center text-slate-500 text-[11px]">
                        {rangeBounds.dateOnlyStart}
                      </td>
                      <td className="py-2 px-3">ยอดยกมา (Opening Balance)</td>
                      <td className="py-2 px-3 text-right text-slate-400">-</td>
                      <td className="py-2 px-3 text-right text-slate-400">-</td>
                      <td className="py-2 px-3 text-right font-black text-slate-800">
                        {formatCurrency(statementData?.openingBalance || 0)}
                      </td>
                      <td className="py-2 px-3 text-center text-[11px] text-slate-400">SYSTEM</td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">ยอดยกมาจากรอบก่อนหน้า</td>
                    </tr>

                    {filteredTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 text-center text-[11px]">
                          <span className="font-semibold text-slate-700">{tx.dateFormatted}</span>
                          <span className="text-[10px] text-slate-400 block">{tx.timeFormatted}</span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {tx.type}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600 font-mono">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600 font-mono">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(tx.balance)}
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                            {tx.channel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-xs" title={tx.description}>
                          {tx.description}
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

        </div>

        {/* Modal Footer (Action Buttons) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 kanit-text flex items-center gap-1.5">
            <Info size={14} className="text-emerald-600 shrink-0" />
            <span>รูปแบบเอกสาร A4 และตารางจัดเหมือน Statement ธนาคารกสิกรไทย</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isLoading || !statementData}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold kanit-text text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download size={15} className="text-emerald-600" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={isLoading || !statementData}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold kanit-text text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer size={15} />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
