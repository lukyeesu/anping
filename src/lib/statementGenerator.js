import * as XLSX from 'xlsx';
import { supabase } from './supabase';

/**
 * คำนวณช่วงวันที่สำหรับ Clinic Statement
 * รองรับ: 1 อาทิตย์, 1 เดือน, 3 เดือน, 6 เดือน, 12 เดือน (1 ปี), 2 ปี, หรือกำหนดเอง
 */
export function getStatementDateBounds(periodType = 'month', options = {}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  let startDate, endDate;

  switch (periodType) {
    case 'month':
    case '1m': {
      // 1 เดือนเต็ม (วันที่ 1 ถึง วันสิ้นเดือนที่เลือก)
      const y = options.year ? Number(options.year) : currentYear;
      const m = options.month !== undefined ? Number(options.month) : currentMonth;
      startDate = new Date(y, m, 1, 0, 0, 0, 0);
      const lastDay = new Date(y, m + 1, 0).getDate();
      endDate = new Date(y, m, lastDay, 23, 59, 59, 999);
      break;
    }
    case 'quarter':
    case '3m': {
      // ไตรมาส 3 เดือน (Q1: ม.ค.-มี.ค., Q2: เม.ย.-มิ.ย., Q3: ก.ค.-ก.ย., Q4: ต.ค.-ธ.ค.)
      const y = options.year ? Number(options.year) : currentYear;
      const q = options.quarter !== undefined ? Number(options.quarter) : Math.floor(currentMonth / 3);
      const startMonth = q * 3;
      const endMonth = startMonth + 2;
      startDate = new Date(y, startMonth, 1, 0, 0, 0, 0);
      const lastDay = new Date(y, endMonth + 1, 0).getDate();
      endDate = new Date(y, endMonth, lastDay, 23, 59, 59, 999);
      break;
    }
    case 'half_year':
    case '6m': {
      // ครึ่งปี 6 เดือน (ครึ่งแรก: 1 ม.ค. - 30 มิ.ย., ครึ่งหลัง: 1 ก.ค. - 31 ธ.ค.)
      const y = options.year ? Number(options.year) : currentYear;
      const half = options.half !== undefined ? Number(options.half) : (currentMonth < 6 ? 1 : 2);
      if (half === 1) {
        startDate = new Date(y, 0, 1, 0, 0, 0, 0);
        endDate = new Date(y, 5, 30, 23, 59, 59, 999);
      } else {
        startDate = new Date(y, 6, 1, 0, 0, 0, 0);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      }
      break;
    }
    case 'year':
    case '12m':
    case '1y': {
      // 1 ปีเต็ม (1 ม.ค. - 31 ธ.ค. ของปีที่เลือก)
      const y = options.year ? Number(options.year) : currentYear;
      startDate = new Date(y, 0, 1, 0, 0, 0, 0);
      endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      break;
    }
    case '7d': {
      // 7 วันล่าสุด
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (options.startDate) {
        const [sy, sm, sd] = String(options.startDate).split('-').map(Number);
        startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      } else {
        startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      }
      if (options.endDate) {
        const [ey, em, ed] = String(options.endDate).split('-').map(Number);
        endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      } else {
        endDate = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
      }
      break;
    }
    default: {
      startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      endDate = new Date(currentYear, currentMonth, lastDay, 23, 59, 59, 999);
      break;
    }
  }

  const pad = (n) => String(n).padStart(2, '0');
  const sStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
  const eStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

  const formatDisplayDate = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  };

  return {
    startDate: `${sStr}T00:00:00`,
    endDate: `${eStr}T23:59:59.999`,
    dateOnlyStart: sStr,
    dateOnlyEnd: eStr,
    label: `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`,
    startDateObj: startDate,
    endDateObj: endDate
  };
}

/**
 * ดึงและคำนวณข้อมูล Statement จาก Supabase
 */
export async function fetchStatementData(rangeBounds, branchId = 'all', manualOpeningBalance = null) {
  if (!supabase) throw new Error('Supabase client is not connected');

  const queryStartDate = rangeBounds.dateOnlyStart || rangeBounds.startDate;
  const queryEndDate = rangeBounds.dateOnlyEnd ? `${rangeBounds.dateOnlyEnd} 23:59:59.999` : rangeBounds.endDate;

  // 1. ดึงข้อมูลรายการจาก finance_all_transactions (ซึ่งรวม POS, Revenue, Expense ครบและตัดรายการซ้ำแล้ว)
  let query = supabase.from('finance_all_transactions')
    .select('*')
    .gte('timestamp_date', queryStartDate)
    .lte('timestamp_date', queryEndDate)
    .neq('status', 'cancelled');

  if (branchId && branchId !== 'all') {
    query = query.eq('branch_id', branchId);
  }

  const { data: rawRows, error } = await query;
  if (error) {
    console.error('fetchStatementData query error:', error);
    throw new Error(error.message || 'ไม่สามารถดึงข้อมูลรายการเดินบัญชีได้');
  }

  // เวลาเริ่มต้นและสิ้นสุดของรอบตามเขตเวลาท้องถิ่น
  const startMs = new Date(rangeBounds.startDateObj || rangeBounds.startDate).getTime();
  const endMs = new Date(rangeBounds.endDateObj || rangeBounds.endDate).getTime();

  // กรองเฉพาะรายการที่ตกอยู่ในช่วงเวลาจริงของรอบนี้ (ตัดเศษวันก่อนหน้า/ถัดไปที่อาจติดมาจากการ query สตริง)
  const validRows = (rawRows || []).filter(row => {
    const raw = row.timestamp_date || row.created_at;
    if (!raw) return false;
    const ms = new Date(raw).getTime();
    return ms >= startMs && ms <= endMs;
  });

  // เรียงลำดับตามเวลาจริงจากเก่าไปใหม่อย่างแม่นยำ (Chronological Ascending)
  validRows.sort((a, b) => {
    const tA = new Date(a.timestamp_date || a.created_at || 0).getTime();
    const tB = new Date(b.timestamp_date || b.created_at || 0).getTime();
    return tA - tB;
  });

  // 2. คำนวณยอดยกมา (Opening Balance)
  let openingBalance = manualOpeningBalance !== null ? Number(manualOpeningBalance) : 0;
  
  if (manualOpeningBalance === null) {
    try {
      let prevQuery = supabase.from('finance_all_transactions')
        .select('type, amount, id, timestamp_date')
        .lt('timestamp_date', queryStartDate)
        .neq('status', 'cancelled');

      if (branchId && branchId !== 'all') {
        prevQuery = prevQuery.eq('branch_id', branchId);
      }

      const { data: prevData, error: prevErr } = await prevQuery;
      if (prevErr) {
        console.error('prevQuery error:', prevErr);
      }
      
      const allPrevRows = [...(prevData || [])];
      // เก็บรายการที่ rawRows ดึงมาแต่ตกอยู่ในรอบก่อน startMs เข้ายอดยกมาด้วย
      (rawRows || []).forEach(row => {
        const raw = row.timestamp_date;
        if (raw && new Date(raw).getTime() < startMs) {
          allPrevRows.push(row);
        }
      });

      let prevIncome = 0;
      let prevExpense = 0;
      allPrevRows.forEach(row => {
        const amt = Number(row.amount || 0);
        const isExp = row.type === 'expense' || String(row.id || '').toUpperCase().startsWith('EXP');
        if (isExp) {
          prevExpense += amt;
        } else {
          prevIncome += amt;
        }
      });
      openingBalance = Math.round((prevIncome - prevExpense) * 100) / 100;
    } catch (e) {
      console.warn('Cannot calculate prev opening balance:', e);
      openingBalance = 0;
    }
  }

  // 3. รวบรวมและแปลงเป็นโครงสร้างมาตรฐานของ Statement จาก validRows
  const transactions = [];

  validRows.forEach(row => {
    const dt = new Date(row.timestamp_date || row.created_at || Date.now());
    const isExp = row.type === 'expense' || String(row.id || '').toUpperCase().startsWith('EXP') || row.category === 'รายจ่าย';
    const amt = Number(row.amount || 0);

    let items = row.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }
    const itemNames = Array.isArray(items) 
      ? items.map(i => i.name || i.title || '').filter(Boolean).slice(0, 3).join(', ')
      : '';

    const patientName = row.patient_name || row.patientName || '';
    const hn = row.hn || row.patient_id || '';
    const ref = row.id || '';
    const note = row.note || '';

    // ทำความสะอาดชื่อคนไข้ (ตัดคำนำหน้า HN ซ้ำซ้อนออก)
    const cleanPatient = patientName ? patientName.replace(/^HN\d*[-\s•]*/i, '').trim() : '';

    let desc = '';
    let shortType = '';

    if (row.is_auto || row.category === 'รายได้จาก POS' || String(ref).startsWith('REC')) {
      shortType = 'รับชำระ POS';
      const parts = [ref];
      if (cleanPatient) parts.push(cleanPatient);
      if (itemNames) parts.push(`(${itemNames})`);
      desc = parts.join(' • ');
    } else if (isExp) {
      shortType = row.category || 'รายจ่าย';
      const parts = [];
      if (row.category) parts.push(row.category);
      if (note && note !== row.category) parts.push(note);
      if (cleanPatient) parts.push(`คนไข้: ${cleanPatient}`);
      if (itemNames) parts.push(`(${itemNames})`);
      desc = parts.join(' - ') || 'รายจ่ายทั่วไป';
    } else {
      shortType = row.category || 'รายรับ';
      const parts = [];
      if (row.category) parts.push(row.category);
      if (note && note !== row.category) parts.push(note);
      if (cleanPatient) parts.push(`คนไข้: ${cleanPatient}`);
      if (itemNames) parts.push(`(${itemNames})`);
      desc = parts.join(' - ') || 'รายรับทั่วไป';
    }

    transactions.push({
      id: row.id,
      timestamp: dt.getTime(),
      dateObj: dt,
      dateFormatted: formatStatementDate(dt),
      timeFormatted: formatStatementTime(dt),
      type: shortType,
      credit: isExp ? 0 : amt,
      debit: isExp ? amt : 0,
      channel: mapPaymentChannel(row.method || row.payment_method),
      refNo: ref,
      description: desc,
      category: row.category || (isExp ? 'รายจ่าย' : 'รายรับ'),
      branchId: row.branch_id
    });
  });

  // เรียงลำดับตามวันเวลา (น้อยไปมาก - Chronological Order)
  transactions.sort((a, b) => a.timestamp - b.timestamp);

  // คำนวณ Running Balance ทีละแถว
  let currentBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;
  let debitCount = 0;
  let creditCount = 0;

  const rowsWithBalance = transactions.map((t, idx) => {
    if (t.debit > 0) {
      currentBalance -= t.debit;
      totalDebit += t.debit;
      debitCount++;
    }
    if (t.credit > 0) {
      currentBalance += t.credit;
      totalCredit += t.credit;
      creditCount++;
    }

    return {
      ...t,
      index: idx + 1,
      balance: currentBalance
    };
  });

  const closingBalance = currentBalance;

  return {
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    debitCount,
    creditCount,
    transactions: rowsWithBalance,
    totalRows: rowsWithBalance.length
  };
}

/**
 * แมปประเภทช่องทางการชำระให้เหมือนของธนาคาร (กะทัดรัด บรรทัดเดียว)
 */
function mapPaymentChannel(method) {
  if (!method) return 'โอนเงิน';
  const m = String(method).toLowerCase();
  if (m.includes('cash') || m.includes('เงินสด')) return 'เงินสด';
  if (m.includes('qr') || m.includes('promptpay') || m.includes('พร้อมเพย์')) return 'K PLUS/QR';
  if (m.includes('card') || m.includes('บัตร') || m.includes('credit')) return 'บัตรเครดิต';
  if (m.includes('transfer') || m.includes('โอน')) return 'K PLUS';
  return 'โอนเงิน';
}

function formatStatementDate(d) {
  if (!d) return '-';
  const dateObj = d instanceof Date ? d : new Date(d);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yr = String(dateObj.getFullYear() + 543).slice(-2);
  return `${day}/${month}/${yr}`;
}

function formatStatementTime(d) {
  if (!d) return '--:--';
  const dateObj = d instanceof Date ? d : new Date(d);
  const hr = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hr}:${min}`;
}

/**
 * สร้าง HTML Statement สไตล์ธนาคารกสิกรไทย (A4 Format เป๊ะ ไม่ล้น ไม่ตัด) สำหรับสั่งพิมพ์หรือเซฟเป็น PDF
 */
export function generateClinicStatementHtml({
  statementData,
  rangeBounds,
  branchInfo,
  clinicInfo = {}
}) {
  const {
    openingBalance = 0,
    closingBalance = 0,
    totalDebit = 0,
    totalCredit = 0,
    debitCount = 0,
    creditCount = 0,
    transactions = []
  } = statementData || {};

  const baseClinicName = clinicInfo.name || 'อันผิง คลินิกการแพทย์แผนไทยประยุกต์';
  const clinicEnName = clinicInfo.enName || 'ANPING APPLIED THAI TRADITIONAL MEDICINE CLINIC';

  const isAllBranches = !branchInfo || 
    branchInfo.id === 'all' || 
    branchInfo.name === 'ทุกสาขา' || 
    String(branchInfo.name || '').includes('ทุกสาขา') ||
    String(branchInfo.name || '').includes('ภาพรวม');

  const branchName = isAllBranches ? 'ทุกสาขา' : (branchInfo.name || 'สาขาหลัก');

  // ดึง "ชื่อจดทะเบียน / นิติบุคคล" ที่กรอกตรงหน้าสาขา
  const regName = branchInfo?.clinicRegName || 
                  branchInfo?.clinic_reg_name || 
                  branchInfo?.registeredName || 
                  clinicInfo.clinicRegName || 
                  clinicInfo.regName;

  const clinicDisplayTitle = regName 
    ? (isAllBranches ? `${regName} (ทุกสาขา)` : regName)
    : (isAllBranches ? `${baseClinicName} (ทุกสาขา)` : `${baseClinicName} (${branchName})`);

  const clinicTaxId = branchInfo?.clinicTax || branchInfo?.clinic_tax || branchInfo?.taxId || clinicInfo.taxId || '0-1055-66000-00-0';
  const clinicLicense = branchInfo?.clinicLicense || branchInfo?.clinic_license || branchInfo?.license || '';
  const branchAddress = branchInfo?.address || clinicInfo.address || '119/140 ม.1 ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110';
  const branchPhone = branchInfo?.phone || clinicInfo.phone || '02-000-0000';

  const refNumber = `STM-${Date.now().toString().slice(-8)}`;
  const printedAt = new Date().toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // จำนวนแถวต่อหน้า A4 ตามขนาดจริง (พิมพ์ให้เต็มหน้าก่อนค่อยขึ้นหน้าใหม่)
  // หน้าแรกมีกล่อง Summary Box -> จุได้เต็มที่ 44 รายการ
  // หน้า 2 เป็นต้นไปมีมินิเฮดเดอร์กะทัดรัด -> จุได้เต็มที่ 54 รายการ
  const ROWS_FIRST_PAGE = 44;
  const ROWS_SUBSEQUENT_PAGE = 54;

  const pages = [];
  const total = transactions.length;

  if (total === 0) {
    pages.push([]);
  } else {
    pages.push(transactions.slice(0, ROWS_FIRST_PAGE));
    let offset = ROWS_FIRST_PAGE;
    while (offset < total) {
      pages.push(transactions.slice(offset, offset + ROWS_SUBSEQUENT_PAGE));
      offset += ROWS_SUBSEQUENT_PAGE;
    }
  }

  const totalPages = pages.length;

  const formatNum = (n) => {
    if (n === null || n === undefined || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>Clinic Statement - ${clinicDisplayTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      background: #1e293b;
      color: #0f172a;
      font-size: 8.5px;
      line-height: 1.2;
      margin: 0;
      padding: 0;
    }

    /* Top Preview Toolbar (no-print) */
    .preview-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      height: 52px;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      border-bottom: 1px solid #334155;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .tb-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tb-icon {
      width: 34px;
      height: 34px;
      background: #059669;
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.4);
    }

    .tb-titles {
      line-height: 1.25;
    }

    .tb-main-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
    }

    .tb-sub-title {
      font-size: 10.5px;
      color: #94a3b8;
      white-space: nowrap;
    }

    .tb-center {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tb-btn-group {
      display: flex;
      align-items: center;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 2px;
    }

    .tb-btn {
      background: transparent;
      border: none;
      color: #e2e8f0;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .tb-btn:hover {
      background: #334155;
      color: #ffffff;
    }

    .tb-btn-pill {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 5px 10px;
      font-size: 11.5px;
      font-weight: 500;
      gap: 5px;
    }

    .tb-page-info {
      font-size: 11.5px;
      color: #cbd5e1;
      font-weight: 600;
      padding: 0 8px;
      min-width: 60px;
      text-align: center;
      user-select: none;
    }

    .tb-zoom-badge {
      font-size: 11.5px;
      color: #38bdf8;
      font-weight: 700;
      padding: 0 8px;
      min-width: 48px;
      text-align: center;
      font-family: 'Courier New', Courier, monospace;
      user-select: none;
    }

    .tb-divider {
      width: 1px;
      height: 20px;
      background: #334155;
      margin: 0 4px;
    }

    .tb-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tb-btn-print {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 3px 10px rgba(5, 150, 105, 0.4);
      transition: transform 0.1s, box-shadow 0.15s;
    }

    .tb-btn-print:hover {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.5);
    }

    .tb-btn-close {
      background: transparent;
      border: 1px solid #475569;
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .tb-btn-close:hover {
      background: #e11d48;
      border-color: #e11d48;
      color: white;
    }

    .pages-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 0 60px 0;
      transform-origin: top center;
      transition: transform 0.1s ease-out;
    }

    .page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      box-sizing: border-box;
      padding: 8mm 10mm 8mm 10mm;
      margin: 0 auto 20px auto;
      background: white;
      box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    @media print {
      .preview-toolbar,
      .no-print {
        display: none !important;
      }
      body {
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .pages-container {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        transform: none !important;
        zoom: 1 !important;
      }
      .page {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: 8mm 10mm 8mm 10mm !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
      }
      .page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }

    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }

    .header-title-th {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
    }

    .header-title-en {
      font-size: 8px;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }

    .logo-box {
      text-align: right;
    }

    .clinic-logo-text {
      font-size: 14.5px;
      font-weight: 800;
      color: #059669; /* Kasikorn Emerald Green */
      letter-spacing: -0.3px;
    }

    .clinic-sub-logo {
      font-size: 7.5px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .page-number {
      font-size: 8.5px;
      color: #475569;
      margin-top: 2px;
      font-weight: 600;
    }

    /* Meta Info & Summary Grid */
    .meta-section {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .meta-left {
      flex: 1;
      font-size: 8.5px;
      color: #334155;
      line-height: 1.35;
    }

    .meta-left .account-name {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
      letter-spacing: -0.2px;
    }

    /* Summary Box (สไตล์ธนาคาร) */
    .summary-box {
      width: 80mm;
      border: 1px solid #1e293b;
      border-collapse: collapse;
      font-size: 8.5px;
    }

    .summary-box td {
      border: 1px solid #334155;
      padding: 2px 5px;
      line-height: 1.2;
    }

    .summary-box .lbl {
      color: #334155;
      font-weight: 500;
      width: 48%;
      background: #f8fafc;
    }

    .summary-box .val {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
      width: 52%;
      font-family: 'Courier New', Courier, monospace;
    }

    .summary-box .val-hl {
      color: #059669;
      font-weight: 800;
    }

    /* Statement Table */
    .stmt-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1px solid #1e293b;
      margin-top: 2px;
    }

    .stmt-table th {
      border: 1px solid #1e293b;
      background: #f1f5f9;
      color: #0f172a;
      font-size: 8px;
      font-weight: 700;
      padding: 3px 2px;
      text-align: center;
      line-height: 1.15;
    }

    .stmt-table td {
      border-left: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #e2e8f0;
      padding: 2px 3px;
      font-size: 8px;
      color: #1e293b;
      vertical-align: middle;
      line-height: 1.15;
    }

    .stmt-table tr:nth-child(even) td {
      background-color: #fafbfc;
    }

    .stmt-table .opening-row td {
      background: #f8fafc !important;
      font-weight: 700;
      border-bottom: 1px solid #94a3b8;
    }

    /* Filler Rows ที่ช่วยเติมตารางให้เต็มจรดขอบล่างของกระดาษ A4 */
    .stmt-table .filler-row td {
      height: 18px;
      padding: 0 3px;
      border-left: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #e2e8f0;
      background: transparent;
      user-select: none;
    }

    .stmt-table .filler-row:nth-child(even) td {
      background-color: #fafbfc;
    }

    .stmt-table .filler-last td,
    .stmt-table tr:last-child td {
      border-bottom: 1.5px solid #1e293b !important;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .nowrap { white-space: nowrap; }

    .num-val {
      font-family: 'Courier New', Courier, monospace;
      font-size: 8px;
      font-weight: 600;
    }

    .debit-val { color: #dc2626; }
    .credit-val { color: #16a34a; }
    .balance-val { color: #0f172a; font-weight: 700; }

    .desc-cell {
      font-size: 7.5px;
      line-height: 1.15;
      word-break: break-word;
      overflow: hidden;
      max-height: 20px;
    }

    /* Footer */
    .footer-section {
      margin-top: auto;
      padding-top: 4px;
      border-top: 1px solid #cbd5e1;
      font-size: 7.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
  </style>
</head>
<body>

  <!-- Top Preview Toolbar (พร้อมเครื่องมือซูม ย่อ-ขยาย เต็มจอ และปุ่มพิมพ์) -->
  <div id="preview-toolbar" class="preview-toolbar no-print">
    <div class="tb-left">
      <div class="tb-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      </div>
      <div class="tb-titles">
        <div class="tb-main-title">Clinic Statement - ${clinicDisplayTitle}</div>
        <div class="tb-sub-title">สาขา: ${branchName} • รอบ: ${rangeBounds.label} • ที่เอกสาร: ${refNumber}</div>
      </div>
    </div>

    <div class="tb-center">
      <!-- ตัวเปลี่ยนหน้า -->
      <div class="tb-btn-group">
        <button type="button" class="tb-btn" onclick="scrollToPrevPage()" title="หน้าก่อนหน้า (Page Up)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span class="tb-page-info">หน้า <span id="tb-current-page">1</span> / ${totalPages}</span>
        <button type="button" class="tb-btn" onclick="scrollToNextPage()" title="หน้าถัดไป (Page Down)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <div class="tb-divider"></div>

      <!-- เครื่องมือซูมย่อ-ขยาย -->
      <div class="tb-btn-group">
        <button type="button" class="tb-btn" onclick="zoomOut()" title="ย่อขนาด (- / Ctrl + Minus)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <span id="tb-zoom-level" class="tb-zoom-badge">100%</span>
        <button type="button" class="tb-btn" onclick="zoomIn()" title="ขยายขนาด (+ / Ctrl + Plus)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      <div class="tb-divider"></div>

      <!-- ปรับมุมมองเต็มจอ / พอดีความกว้าง / 100% -->
      <button type="button" class="tb-btn tb-btn-pill" onclick="fitPage()" title="ปรับพอดีหน้าจอเต็มแผ่น (Fit to Page)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
        <span>กระดาษเต็มจอ</span>
      </button>
      <button type="button" class="tb-btn tb-btn-pill" onclick="fitWidth()" title="ปรับพอดีความกว้างหน้าจอ (Fit to Width)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        <span>พอดีความกว้าง</span>
      </button>
      <button type="button" class="tb-btn tb-btn-pill" onclick="resetZoom()" title="ขนาดจริง 100%">
        <span>100%</span>
      </button>
    </div>

    <div class="tb-right">
      <button type="button" class="tb-btn-print" onclick="window.print()" title="สั่งพิมพ์เอกสาร หรือ บันทึกเป็น PDF (Ctrl+P)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        <span>พิมพ์เอกสาร / บันทึก PDF</span>
      </button>
      <button type="button" class="tb-btn-close" onclick="window.close()" title="ปิดหน้าต่างนี้ (Esc)">
        ✕
      </button>
    </div>
  </div>

  <!-- Wrapper ครอบกระดาษทั้งหมด เพื่อรองรับการ Zoom จัดกึ่งกลาง และตรวจเช็คความถูกต้อง -->
  <div id="pages-container" class="pages-container">

  ${pages.map((pageRows, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === totalPages - 1;

    // ยอดยกมาของหน้านี้
    const pageOpeningBalance = isFirstPage 
      ? openingBalance 
      : (pages[pageIdx - 1]?.[pages[pageIdx - 1].length - 1]?.balance ?? openingBalance);

    // วันที่ของแถวยอดยกมา: หน้าแรกใช้วันที่เริ่มต้นรอบบัญชี, หน้า 2 เป็นต้นไปใช้วันที่ของรายการสุดท้ายจากหน้าก่อน
    const prevPageLastRow = pages[pageIdx - 1]?.[pages[pageIdx - 1].length - 1];
    const pageOpeningDate = isFirstPage 
      ? formatStatementDate(rangeBounds.startDateObj)
      : (prevPageLastRow?.dateFormatted || formatStatementDate(rangeBounds.startDateObj));

    // คำนวณจำนวนแถวว่าง (Filler Rows) เพื่อต่อตารางให้เต็มจรดขอบล่างของหน้ากระดาษ A4
    const targetRowsForFullHeight = isFirstPage ? 51 : 58;
    const renderedRowCount = 1 + pageRows.length + (isLastPage ? 1 : 0);
    const fillerCount = Math.max(0, targetRowsForFullHeight - renderedRowCount);

    return `
    <div class="page">
      <div>
        ${isFirstPage ? `
        <!-- ส่วนหัวกระดาษหน้า 1 (Full Header & Summary Box) -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="header-title-th">รายการเดินบัญชีรายรับ-รายจ่าย (มีรายละเอียด)</div>
              <div class="header-title-en">CLINIC STATEMENT OF REVENUE & EXPENSE ACCOUNT (WITH DETAIL)</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">ที่เอกสาร: ${refNumber}</div>
            </td>
            <td class="logo-box" style="vertical-align: top;">
              <div class="clinic-logo-text">${clinicDisplayTitle}</div>
              <div class="clinic-sub-logo">${clinicEnName}</div>
              <div class="page-number">หน้าที่ (PAGE/OF) ${pageIdx + 1}/${totalPages}</div>
            </td>
          </tr>
        </table>

        <!-- ข้อมูลหน่วยงาน และ ตารางสรุปขวามือ (Summary Box สไตล์กสิกรไทย) -->
        <div class="meta-section">
          <div class="meta-left">
            <div class="account-name">${clinicDisplayTitle}</div>
            <div>สาขา: <strong>${branchName}</strong></div>
            <div>ที่อยู่: ${branchAddress}</div>
            <div>โทรศัพท์: ${branchPhone} • เลขประจำตัวผู้เสียภาษี: ${clinicTaxId}${clinicLicense ? ` • เลขที่ใบอนุญาต: ${clinicLicense}` : ''}</div>
          </div>

          <table class="summary-box">
            <tr>
              <td class="lbl">เลขที่อ้างอิง</td>
              <td class="val">${refNumber}</td>
            </tr>
            <tr>
              <td class="lbl">สาขาคลินิก</td>
              <td class="val">${branchName}</td>
            </tr>
            <tr>
              <td class="lbl">รอบระหว่างวันที่</td>
              <td class="val">${rangeBounds.label}</td>
            </tr>
            <tr>
              <td class="lbl">ยอดยกมาเริ่มต้น</td>
              <td class="val">${formatNum(openingBalance)}</td>
            </tr>
            <tr>
              <td class="lbl">รวมรายจ่าย (${debitCount} รายการ)</td>
              <td class="val" style="color: #dc2626;">${formatNum(totalDebit)}</td>
            </tr>
            <tr>
              <td class="lbl">รวมรายรับ (${creditCount} รายการ)</td>
              <td class="val" style="color: #16a34a;">${formatNum(totalCredit)}</td>
            </tr>
            <tr>
              <td class="lbl" style="font-weight: 700; background: #e2e8f0;">ยอดยกไปสุทธิ</td>
              <td class="val val-hl" style="background: #e2e8f0;">${formatNum(closingBalance)}</td>
            </tr>
          </table>
        </div>
        ` : `
        <!-- ส่วนหัวกระดาษหน้า 2 เป็นต้นไป (Compact Mini-Header เหมือนกสิกร) -->
        <table class="header-table" style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1;">
          <tr>
            <td style="vertical-align: top;">
              <div class="header-title-th" style="font-size: 11px;">รายการเดินบัญชีรายรับ-รายจ่าย (มีรายละเอียด)</div>
              <div style="font-size: 8px; color: #64748b;">เลขที่อ้างอิง: ${refNumber} • สาขา: ${branchName} • รอบระหว่างวันที่: ${rangeBounds.label}</div>
            </td>
            <td class="logo-box" style="vertical-align: top;">
              <div class="clinic-logo-text" style="font-size: 13px;">${clinicDisplayTitle}</div>
              <div class="page-number">หน้าที่ (PAGE/OF) ${pageIdx + 1}/${totalPages}</div>
            </td>
          </tr>
        </table>
        `}

        <!-- ตาราง Statement -->
        <table class="stmt-table">
          <colgroup>
            <col style="width: 18mm;">
            <col style="width: 11mm;">
            <col style="width: 23mm;">
            <col style="width: 20mm;">
            <col style="width: 20mm;">
            <col style="width: 22mm;">
            <col style="width: 17mm;">
            <col>
          </colgroup>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>เวลา</th>
              <th>รายการ</th>
              <th>ถอนเงิน (ออก)</th>
              <th>ฝากเงิน (เข้า)</th>
              <th>ยอดคงเหลือ (บาท)</th>
              <th>ช่องทาง</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            <!-- แถวยอดยกมาของหน้านี้ -->
            <tr class="opening-row">
              <td class="text-center nowrap num-val">${pageOpeningDate}</td>
              <td class="text-center nowrap num-val" style="color: #94a3b8;">--:--</td>
              <td class="text-center nowrap" style="font-weight: 700;">ยอดยกมา</td>
              <td class="text-right nowrap num-val">-</td>
              <td class="text-right nowrap num-val">-</td>
              <td class="text-right nowrap num-val balance-val">${formatNum(pageOpeningBalance)}</td>
              <td class="text-center nowrap" style="color: #94a3b8;">SYSTEM</td>
              <td class="text-left desc-cell" style="color: #64748b;">${isFirstPage ? 'ยอดยกมาจากรอบก่อนหน้า' : `ยอดยกมาจากหน้าที่ ${pageIdx}`}</td>
            </tr>

            <!-- รายการของหน้านี้ -->
            ${pageRows.map(r => `
              <tr>
                <td class="text-center nowrap num-val">${r.dateFormatted}</td>
                <td class="text-center nowrap num-val" style="color: #64748b;">${r.timeFormatted}</td>
                <td class="text-center nowrap" style="font-weight: 500;">${r.type}</td>
                <td class="text-right nowrap num-val debit-val">${r.debit > 0 ? formatNum(r.debit) : '-'}</td>
                <td class="text-right nowrap num-val credit-val">${r.credit > 0 ? formatNum(r.credit) : '-'}</td>
                <td class="text-right nowrap num-val balance-val">${formatNum(r.balance)}</td>
                <td class="text-center nowrap" style="font-size: 7.5px;">${r.channel}</td>
                <td class="text-left desc-cell" title="${r.description}">${r.description}</td>
              </tr>
            `).join('')}

            ${isLastPage ? `
              <!-- แถวสรุปยอดยกไปสุทธิในหน้าสุดท้าย -->
              <tr class="opening-row" style="background: #e2e8f0 !important; border-top: 1.5px solid #1e293b;">
                <td class="text-center nowrap num-val">${formatStatementDate(rangeBounds.endDateObj)}</td>
                <td class="text-center nowrap num-val" style="color: #94a3b8;">--:--</td>
                <td class="text-center nowrap" style="font-weight: 700; color: #047857;">ยอดยกไปสุทธิ</td>
                <td class="text-right nowrap num-val debit-val" style="font-weight: 700;">${formatNum(totalDebit)}</td>
                <td class="text-right nowrap num-val credit-val" style="font-weight: 700;">${formatNum(totalCredit)}</td>
                <td class="text-right nowrap num-val balance-val" style="font-size: 9px; color: #047857; font-weight: 800;">${formatNum(closingBalance)}</td>
                <td class="text-center nowrap" style="font-weight: 700;">สุทธิ</td>
                <td class="text-left desc-cell" style="font-weight: 600; color: #334155;">ยอดยกไปคงเหลือสุทธิ (รวม ${transactions.length} รายการ)</td>
              </tr>
            ` : ''}

            ${pageRows.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">
                  ไม่มีรายการเคลื่อนไหวทางการเงินในช่วงเวลาที่เลือก
                </td>
              </tr>
            ` : ''}
            <!-- แถวว่างต่อตารางให้เต็มจรดขอบล่างของกระดาษ A4 (Filler Rows) -->
            ${Array.from({ length: fillerCount }).map((_, fIdx) => `
              <tr class="filler-row${fIdx === fillerCount - 1 ? ' filler-last' : ''}">
                <td class="text-center nowrap num-val">&nbsp;</td>
                <td class="text-center nowrap num-val">&nbsp;</td>
                <td class="text-center nowrap">&nbsp;</td>
                <td class="text-right nowrap num-val">&nbsp;</td>
                <td class="text-right nowrap num-val">&nbsp;</td>
                <td class="text-right nowrap num-val">&nbsp;</td>
                <td class="text-center nowrap">&nbsp;</td>
                <td class="text-left desc-cell">&nbsp;</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- ส่วนท้ายหน้ากระดาษ -->
      <div class="footer-section">
        <div>
          ออกโดย: ระบบสารสนเทศการเงินคลินิก • วันที่สั่งพิมพ์เอกสาร: ${printedAt} น.
        </div>
        <div style="text-align: right;">
          เอกสารนี้เป็นรายงานสรุปรายการเดินบัญชีภายในสำหรับตรวจสอบทางบัญชีและการเงิน
        </div>
      </div>
    </div>
    `;
  }).join('')}
  </div> <!-- /#pages-container -->

  <script>
    let currentZoom = 1.0;
    const container = document.getElementById('pages-container');
    const zoomText = document.getElementById('tb-zoom-level');
    const pageNumSpan = document.getElementById('tb-current-page');
    const pages = document.querySelectorAll('.page');

    function applyZoom(scale) {
      currentZoom = Math.max(0.3, Math.min(2.5, Math.round(scale * 100) / 100));
      if ('zoom' in container.style) {
        container.style.zoom = currentZoom;
      } else {
        container.style.transform = 'scale(' + currentZoom + ')';
        container.style.transformOrigin = 'top center';
      }
      if (zoomText) {
        zoomText.textContent = Math.round(currentZoom * 100) + '%';
      }
    }

    function zoomIn() {
      applyZoom(currentZoom + 0.1);
    }

    function zoomOut() {
      applyZoom(currentZoom - 0.1);
    }

    function resetZoom() {
      applyZoom(1.0);
    }

    function fitPage() {
      const tb = document.getElementById('preview-toolbar');
      const tbH = tb ? tb.offsetHeight : 52;
      const availH = window.innerHeight - tbH - 40;
      const firstP = document.querySelector('.page');
      const ph = firstP ? firstP.offsetHeight : 1123;
      const scale = availH / ph;
      applyZoom(scale);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function fitWidth() {
      const availW = window.innerWidth - 60;
      const firstP = document.querySelector('.page');
      const pw = firstP ? firstP.offsetWidth : 794;
      const scale = availW / pw;
      applyZoom(scale);
    }

    function scrollToPrevPage() {
      const cur = getCurrentPageIdx();
      if (cur > 0 && pages[cur - 1]) {
        pages[cur - 1].scrollIntoView({ behavior: 'smooth' });
      }
    }

    function scrollToNextPage() {
      const cur = getCurrentPageIdx();
      if (cur < pages.length - 1 && pages[cur + 1]) {
        pages[cur + 1].scrollIntoView({ behavior: 'smooth' });
      }
    }

    function getCurrentPageIdx() {
      const scrollY = window.scrollY || window.pageYOffset;
      let cur = 0;
      pages.forEach((p, idx) => {
        if (p.offsetTop - 120 <= scrollY) cur = idx;
      });
      return cur;
    }

    window.addEventListener('scroll', function() {
      if (pageNumSpan) {
        pageNumSpan.textContent = getCurrentPageIdx() + 1;
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (e.key === 'Escape') {
        window.close();
      }
    });

    // On Load: Fit to page automatically so user sees the full A4 layout cleanly
    window.addEventListener('load', function() {
      fitPage();
    });
  </script>
</body>
</html>
  `;
}

/**
 * ส่งออก Statement เป็นไฟล์ Excel (.xlsx) แบบมีสูตรและจัดสไตล์แบบธนาคาร
 */
export function exportClinicStatementExcel({
  statementData,
  rangeBounds,
  branchInfo,
  clinicInfo = {},
  filename = 'clinic_statement.xlsx'
}) {
  const {
    openingBalance = 0,
    closingBalance = 0,
    totalDebit = 0,
    totalCredit = 0,
    debitCount = 0,
    creditCount = 0,
    transactions = []
  } = statementData || {};

  const baseClinicName = clinicInfo.name || 'อันผิง คลินิกการแพทย์แผนไทยประยุกต์';
  const isAllBranches = !branchInfo || 
    branchInfo.id === 'all' || 
    branchInfo.name === 'ทุกสาขา' || 
    String(branchInfo.name || '').includes('ทุกสาขา') ||
    String(branchInfo.name || '').includes('ภาพรวม');

  const branchName = isAllBranches ? 'ทุกสาขา' : (branchInfo.name || 'สาขาหลัก');

  // ดึง "ชื่อจดทะเบียน / นิติบุคคล" ที่กรอกตรงหน้าสาขา
  const regName = branchInfo?.clinicRegName || 
                  branchInfo?.clinic_reg_name || 
                  branchInfo?.registeredName || 
                  clinicInfo.clinicRegName || 
                  clinicInfo.regName;

  const clinicDisplayTitle = regName 
    ? (isAllBranches ? `${regName} (ทุกสาขา)` : regName)
    : (isAllBranches ? `${baseClinicName} (ทุกสาขา)` : `${baseClinicName} (${branchName})`);

  // หัวตาราง
  const sheetRows = [
    ['รายการเดินบัญชีรายรับ-รายจ่าย (Clinic Statement)'],
    [clinicDisplayTitle, '', '', `สาขา: ${branchName}`],
    [`รอบระหว่างวันที่: ${rangeBounds.label}`, '', '', `พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}`],
    [''],
    ['ยอดยกมาเริ่มต้น (บาท)', openingBalance],
    ['รวมรายจ่าย (บาท)', totalDebit, `(${debitCount} รายการ)`],
    ['รวมรายรับ (บาท)', totalCredit, `(${creditCount} รายการ)`],
    ['ยอดยกไปสุทธิ (บาท)', closingBalance],
    [''],
    [
      'ลำดับ',
      'วันที่',
      'เวลา',
      'รายการ',
      'รายจ่าย (ถอน)',
      'รายรับ (ฝาก)',
      'ยอดคงเหลือ (บาท)',
      'ช่องทาง',
      'เลขที่เอกสาร',
      'หมวดหมู่',
      'รายละเอียด'
    ],
    [
      0,
      rangeBounds.dateOnlyStart,
      '00:00',
      'ยอดยกมา',
      0,
      0,
      openingBalance,
      'SYSTEM',
      '-',
      'ยอดยกมา',
      'ยอดยกมาจากรอบก่อนหน้า'
    ]
  ];

  transactions.forEach((t, i) => {
    sheetRows.push([
      i + 1,
      t.dateFormatted,
      t.timeFormatted,
      t.type,
      t.debit > 0 ? t.debit : 0,
      t.credit > 0 ? t.credit : 0,
      t.balance,
      t.channel,
      t.refNo,
      t.category,
      t.description
    ]);
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  // ตั้งความกว้างคอลัมน์ให้อ่านง่าย
  worksheet['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 12 }, // วันที่
    { wch: 8 },  // เวลา
    { wch: 22 }, // รายการ
    { wch: 16 }, // รายจ่าย
    { wch: 16 }, // รายรับ
    { wch: 18 }, // ยอดคงเหลือ
    { wch: 22 }, // ช่องทาง
    { wch: 18 }, // เลขที่เอกสาร
    { wch: 20 }, // หมวดหมู่
    { wch: 45 }  // รายละเอียด
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
  XLSX.writeFile(workbook, filename);
  return { status: 'success', totalRows: transactions.length, filename };
}
