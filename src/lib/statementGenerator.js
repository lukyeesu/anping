import * as XLSX from 'xlsx';
import { supabase } from './supabase';

/**
 * คำนวณช่วงวันที่สำหรับ Clinic Statement
 * รองรับ: 1 อาทิตย์, 1 เดือน, 3 เดือน, 6 เดือน, 12 เดือน (1 ปี), 2 ปี, หรือกำหนดเอง
 */
export function getStatementDateBounds(preset, customOptions = {}) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case '7d': {
      // 1 อาทิตย์ (7 วันล่าสุด)
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case '1m': {
      // 1 เดือน (30 วันล่าสุด หรือ เดือนปัจจุบัน)
      if (customOptions.month !== undefined && customOptions.year !== undefined) {
        const y = Number(customOptions.year);
        const m = Number(customOptions.month);
        startDate = new Date(y, m, 1, 0, 0, 0, 0);
        const lastDay = new Date(y, m + 1, 0).getDate();
        endDate = new Date(y, m, lastDay, 23, 59, 59, 999);
      } else {
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      }
      break;
    }
    case '3m': {
      // 3 เดือน (ไตรมาส)
      startDate.setMonth(now.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case '6m': {
      // 6 เดือน (ครึ่งปี)
      startDate.setMonth(now.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case '12m':
    case '1y': {
      // 12 เดือน / 1 ปี
      if (customOptions.year) {
        const y = Number(customOptions.year);
        startDate = new Date(y, 0, 1, 0, 0, 0, 0);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
      }
      break;
    }
    case '24m':
    case '2y': {
      // 2 ปี (24 เดือน)
      startDate.setFullYear(now.getFullYear() - 2);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'custom': {
      if (customOptions.startDate) {
        startDate = new Date(customOptions.startDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customOptions.endDate) {
        endDate = new Date(customOptions.endDate);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    }
    default: {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
  }

  const sStr = startDate.toISOString().split('T')[0];
  const eStr = endDate.toISOString().split('T')[0];

  const formatDisplayDate = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  };

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
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

  const { startDate, endDate, dateOnlyStart, dateOnlyEnd } = rangeBounds;

  // 1. ดึงข้อมูล POS Transactions
  let posQuery = supabase.from('pos_transactions')
    .select('*')
    .neq('status', 'cancelled')
    .or(`created_at.gte.${startDate},and(date.gte.${dateOnlyStart},date.lte.${dateOnlyEnd})`)
    .lte('created_at', endDate);

  if (branchId && branchId !== 'all') {
    posQuery = posQuery.or(`branch_id.eq.${branchId},branchId.eq.${branchId}`);
  }

  // 2. ดึงข้อมูล Finance Revenue
  let revQuery = supabase.from('finance_revenue')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (branchId && branchId !== 'all') {
    revQuery = revQuery.or(`branch_id.eq.${branchId},branchId.eq.${branchId}`);
  }

  // 3. ดึงข้อมูล Finance Expenses
  let expQuery = supabase.from('finance_expenses')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (branchId && branchId !== 'all') {
    expQuery = expQuery.or(`branch_id.eq.${branchId},branchId.eq.${branchId}`);
  }

  const [resPos, resRev, resExp] = await Promise.all([
    posQuery.order('created_at', { ascending: true }),
    revQuery.order('created_at', { ascending: true }),
    expQuery.order('created_at', { ascending: true })
  ]);

  const rawPos = Array.isArray(resPos.data) ? resPos.data : [];
  const rawRev = Array.isArray(resRev.data) ? resRev.data : [];
  const rawExp = Array.isArray(resExp.data) ? resExp.data : [];

  // รวบรวมและแปลงเป็นโครงสร้างมาตรฐานของ Statement
  const transactions = [];

  // POS
  rawPos.forEach(p => {
    const dt = new Date(p.created_at || p.date || Date.now());
    let items = p.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }
    const itemNames = Array.isArray(items) 
      ? items.map(i => i.name || i.title || '').filter(Boolean).slice(0, 3).join(', ')
      : '';

    const patientName = p.patient_name || p.patientName || 'ลูกค้าทั่วไป';
    const hn = p.hn || p.patient_id || '';
    const ref = p.receipt_no || p.receiptNo || p.id || '';
    const amount = Number(p.net_total || p.netTotal || p.total_amount || p.totalAmount || 0);

    transactions.push({
      id: p.id,
      timestamp: dt.getTime(),
      dateObj: dt,
      dateFormatted: formatStatementDate(dt),
      timeFormatted: formatStatementTime(dt),
      type: 'รับชำระบิล POS',
      credit: amount,
      debit: 0,
      channel: mapPaymentChannel(p.payment_method || p.paymentMethod),
      refNo: ref,
      description: `บิล POS: ${ref} • คนไข้: ${patientName}${hn ? ` (HN: ${hn})` : ''}${itemNames ? ` • รายการ: ${itemNames}` : ''}`,
      category: 'ค่ารักษาพยาบาล/ยา',
      branchId: p.branch_id || p.branchId
    });
  });

  // Revenue (เฉพาะที่ไม่ใช่บิล POS ซ้ำ)
  rawRev.forEach(r => {
    const ref = r.id || '';
    const isAutoPos = r.is_auto || r.category === 'รายได้จาก POS' || String(r.id || '').startsWith('REC');
    if (isAutoPos) return; // ข้ามเพื่อป้องกันการนับซ้ำกับ POS

    const dt = new Date(r.created_at || r.date || Date.now());
    const amount = Number(r.amount || 0);

    transactions.push({
      id: r.id,
      timestamp: dt.getTime(),
      dateObj: dt,
      dateFormatted: formatStatementDate(dt),
      timeFormatted: formatStatementTime(dt),
      type: `รายรับ (${r.category || 'ทั่วไป'})`,
      credit: amount,
      debit: 0,
      channel: mapPaymentChannel(r.payment_method || r.paymentMethod),
      refNo: ref,
      description: `${r.title || r.description || 'รายรับ'} • ${r.detail || r.note || ''}`,
      category: r.category || 'รายรับอื่นๆ',
      branchId: r.branch_id || r.branchId
    });
  });

  // Expense
  rawExp.forEach(e => {
    const dt = new Date(e.created_at || e.date || Date.now());
    const amount = Number(e.amount || 0);
    const payee = e.payee || e.vendor || '';

    transactions.push({
      id: e.id,
      timestamp: dt.getTime(),
      dateObj: dt,
      dateFormatted: formatStatementDate(dt),
      timeFormatted: formatStatementTime(dt),
      type: `รายจ่าย (${e.category || 'ทั่วไป'})`,
      credit: 0,
      debit: amount,
      channel: mapPaymentChannel(e.payment_method || e.paymentMethod),
      refNo: e.id || '',
      description: `${e.title || e.description || 'รายจ่าย'}${payee ? ` • จ่ายให้: ${payee}` : ''} • ${e.detail || e.note || ''}`,
      category: e.category || 'รายจ่าย',
      branchId: e.branch_id || e.branchId
    });
  });

  // เรียงลำดับตามวันเวลา (น้อยไปมาก - Chronological Order)
  transactions.sort((a, b) => a.timestamp - b.timestamp);

  // คำนวณยอดยกมา (Opening Balance)
  let openingBalance = manualOpeningBalance !== null ? Number(manualOpeningBalance) : 0;
  
  // ถ้าไม่ได้กรอกยอดยกมาแบบ Manual ให้ลองคำนวณสะสมก่อนวันเริ่มต้น
  if (manualOpeningBalance === null) {
    try {
      const { data: prevPos } = await supabase.from('pos_transactions')
        .select('net_total, total_amount')
        .neq('status', 'cancelled')
        .lt('created_at', startDate);

      const { data: prevRev } = await supabase.from('finance_revenue')
        .select('amount, category, is_auto')
        .lt('created_at', startDate);

      const { data: prevExp } = await supabase.from('finance_expenses')
        .select('amount')
        .lt('created_at', startDate);

      let prevTotalIncome = 0;
      (prevPos || []).forEach(p => { prevTotalIncome += Number(p.net_total || p.total_amount || 0); });
      (prevRev || []).forEach(r => {
        if (!r.is_auto && r.category !== 'รายได้จาก POS') {
          prevTotalIncome += Number(r.amount || 0);
        }
      });

      let prevTotalExpense = 0;
      (prevExp || []).forEach(e => { prevTotalExpense += Number(e.amount || 0); });

      openingBalance = Math.max(0, prevTotalIncome - prevTotalExpense);
    } catch (e) {
      openingBalance = 0;
    }
  }

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
 * แมปประเภทช่องทางการชำระให้เหมือนของธนาคาร
 */
function mapPaymentChannel(method) {
  if (!method) return 'โอนเงิน';
  const m = String(method).toLowerCase();
  if (m.includes('cash') || m.includes('เงินสด')) return 'เงินสด (Cash)';
  if (m.includes('qr') || m.includes('promptpay') || m.includes('พร้อมเพย์')) return 'EDC/K SHOP/MYQR';
  if (m.includes('card') || m.includes('บัตร') || m.includes('credit')) return 'บัตรเครดิต (EDC)';
  if (m.includes('transfer') || m.includes('โอน')) return 'K PLUS/Mobile Banking';
  return 'โอนเงิน/Mobile Banking';
}

function formatStatementDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yr = String(d.getFullYear() + 543).slice(-2);
  return `${day}-${month}-${yr}`;
}

function formatStatementTime(d) {
  const hr = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hr}:${min}`;
}

/**
 * สร้าง HTML Statement สไตล์ธนาคารกสิกรไทย (A4 Format) สำหรับสั่งพิมพ์หรือเซฟเป็น PDF
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

  const clinicName = clinicInfo.name || 'อันผิง คลินิกการแพทย์แผนไทยประยุกต์';
  const clinicEnName = clinicInfo.enName || 'ANPING APPLIED THAI TRADITIONAL MEDICINE CLINIC';
  const clinicTaxId = clinicInfo.taxId || '0-1055-66000-00-0';
  const branchName = branchInfo?.name || 'สำนักงานใหญ่ / ทุกสาขา';
  const branchAddress = branchInfo?.address || '119/140 ม.1 ต.ลำผักกูด อ.ธัญบุรี จ.ปทุมธานี 12110';
  const branchPhone = branchInfo?.phone || '02-000-0000';

  const refNumber = `STM-${Date.now().toString().slice(-8)}`;
  const printedAt = new Date().toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // แบ่งหน้ารายการ (ประมาณ 32 รายการต่อหน้า A4 เหมือน Statement ธนาคาร)
  const ROWS_PER_PAGE = 28;
  const pages = [];
  if (transactions.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < transactions.length; i += ROWS_PER_PAGE) {
      pages.push(transactions.slice(i, i + ROWS_PER_PAGE));
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
  <title>Clinic Statement - ${clinicName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      background: #f1f5f9;
      color: #1e293b;
      font-size: 11px;
      line-height: 1.35;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm 12mm 14mm;
      margin: 10mm auto;
      background: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      position: relative;
      display: flex;
      flex-col;
      justify-content: space-between;
    }

    @media print {
      body {
        background: transparent;
      }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
        height: 297mm;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }

    .header-title-th {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
    }

    .header-title-en {
      font-size: 8.5px;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }

    .logo-box {
      text-align: right;
    }

    .clinic-logo-text {
      font-size: 16px;
      font-weight: 800;
      color: #059669; /* Emerald Green เหมือนธนาคารกสิกร */
      letter-spacing: -0.3px;
    }

    .clinic-sub-logo {
      font-size: 8.5px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .page-number {
      font-size: 10px;
      color: #475569;
      margin-top: 3px;
      font-weight: 600;
    }

    /* Meta Info & Summary Grid */
    .meta-section {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .meta-left {
      flex: 1;
      font-size: 10px;
      color: #334155;
      line-height: 1.45;
    }

    .meta-left .account-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .barcode-area {
      font-family: monospace;
      letter-spacing: 3px;
      font-size: 10px;
      margin-top: 8px;
      color: #64748b;
    }

    /* Summary Box (สไตล์ธนาคาร) */
    .summary-box {
      width: 82mm;
      border: 1px solid #1e293b;
      border-collapse: collapse;
      font-size: 9.5px;
    }

    .summary-box td {
      border: 1px solid #334155;
      padding: 3px 6px;
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
    }

    .summary-box .val-hl {
      color: #059669;
      font-weight: 800;
    }

    /* Statement Table */
    .stmt-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #334155;
      margin-top: 4px;
    }

    .stmt-table th {
      border: 1px solid #334155;
      background: #f1f5f9;
      color: #0f172a;
      font-size: 9.5px;
      font-weight: 700;
      padding: 5px 4px;
      text-align: center;
      line-height: 1.2;
    }

    .stmt-table td {
      border-left: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      border-bottom: 1px solid #e2e8f0;
      padding: 3.5px 5px;
      font-size: 9px;
      color: #1e293b;
      vertical-align: top;
    }

    .stmt-table tr:nth-child(even) td {
      background-color: #fafafa;
    }

    .stmt-table .opening-row td {
      background: #f8fafc !important;
      font-weight: 700;
      border-bottom: 1px solid #94a3b8;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }

    .debit-val { color: #dc2626; font-weight: 600; }
    .credit-val { color: #16a34a; font-weight: 600; }
    .balance-val { color: #0f172a; font-weight: 700; }

    /* Footer */
    .footer-section {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      font-size: 8px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
  </style>
</head>
<body>

  <!-- Floating Print Controls -->
  <div class="no-print" style="position: fixed; top: 18px; right: 24px; z-index: 9999; display: flex; gap: 10px; background: white; padding: 10px 14px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;">
    <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 8px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; items-center; gap: 6px; box-shadow: 0 2px 8px rgba(5,150,105,0.3);">
      🖨️ สั่งพิมพ์ / บันทึก PDF
    </button>
    <button onclick="window.close()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer;">
      ปิดหน้าต่าง
    </button>
  </div>

  ${pages.map((pageRows, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === totalPages - 1;

    // ยอดยกมาของหน้านี้
    const pageOpeningBalance = isFirstPage 
      ? openingBalance 
      : (pages[pageIdx - 1]?.[pages[pageIdx - 1].length - 1]?.balance ?? openingBalance);

    return `
    <div class="page">
      <div>
        <!-- ส่วนหัวกระดาษ -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="header-title-th">รายการเดินบัญชีรายรับ-รายจ่าย (มีรายละเอียด)</div>
              <div class="header-title-en">CLINIC STATEMENT OF REVENUE & EXPENSE ACCOUNT (WITH DETAIL)</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 3px;">ที่เอกสาร: ${refNumber}</div>
            </td>
            <td class="logo-box" style="vertical-align: top;">
              <div class="clinic-logo-text">${clinicName}</div>
              <div class="clinic-sub-logo">${clinicEnName}</div>
              <div class="page-number">หน้าที่ (PAGE/OF) ${pageIdx + 1}/${totalPages}</div>
            </td>
          </tr>
        </table>

        <!-- ข้อมูลหน่วยงาน และ ตารางสรุปขวามือ -->
        <div class="meta-section">
          <div class="meta-left">
            <div class="account-name">ชื่อสถานพยาบาล: ${clinicName}</div>
            <div>สาขา: <strong>${branchName}</strong></div>
            <div>ที่อยู่: ${branchAddress}</div>
            <div>โทรศัพท์: ${branchPhone} • เลขประจำตัวผู้เสียภาษี: ${clinicTaxId}</div>
            <div class="barcode-area">|||||| | |||||||| ||||| | ||||||||||||||||||||||</div>
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

        <!-- ตาราง Statement -->
        <table class="stmt-table">
          <thead>
            <tr>
              <th style="width: 14mm;">วันที่</th>
              <th style="width: 11mm;">เวลา</th>
              <th style="width: 25mm;">รายการ</th>
              <th style="width: 22mm;">รายจ่าย (ถอน)</th>
              <th style="width: 22mm;">รายรับ (ฝาก)</th>
              <th style="width: 24mm;">ยอดคงเหลือ (บาท)</th>
              <th style="width: 22mm;">ช่องทาง</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            <!-- แถวยอดยกมา -->
            <tr class="opening-row">
              <td class="text-center">${formatStatementDate(rangeBounds.startDateObj)}</td>
              <td class="text-center">--:--</td>
              <td>ยอดยกมา</td>
              <td class="text-right">-</td>
              <td class="text-right">-</td>
              <td class="text-right balance-val">${formatNum(pageOpeningBalance)}</td>
              <td class="text-center">SYSTEM</td>
              <td style="color: #64748b;">ยอดยกมาจากรอบก่อนหน้า</td>
            </tr>

            <!-- รายการแต่ละแถว -->
            ${pageRows.map(r => `
              <tr>
                <td class="text-center">${r.dateFormatted}</td>
                <td class="text-center" style="color: #64748b;">${r.timeFormatted}</td>
                <td style="font-weight: 600;">${r.type}</td>
                <td class="text-right debit-val">${r.debit > 0 ? formatNum(r.debit) : '-'}</td>
                <td class="text-right credit-val">${r.credit > 0 ? formatNum(r.credit) : '-'}</td>
                <td class="text-right balance-val">${formatNum(r.balance)}</td>
                <td class="text-center" style="font-size: 8.5px; color: #475569;">${r.channel}</td>
                <td style="font-size: 8.5px; color: #334155;">${r.description}</td>
              </tr>
            `).join('')}

            ${pageRows.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">
                  ไม่มีรายการเคลื่อนไหวทางการเงินในช่วงเวลาที่เลือก
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <!-- ส่วนท้ายหน้ากระดาษ -->
      <div class="footer-section">
        <div>
          ออกโดย: ระบบสารสนเทศการเงินคลินิก (Periodic Automated Statement) • พิมพ์เมื่อ: ${printedAt}
        </div>
        <div style="text-align: right;">
          เอกสารนี้เป็นรายงานสรุปรายการเดินบัญชีภายในสำหรับตรวจสอบทางบัญชีและการเงิน
        </div>
      </div>
    </div>
    `;
  }).join('')}

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

  const clinicName = clinicInfo.name || 'อันผิง คลินิกการแพทย์แผนไทยประยุกต์';
  const branchName = branchInfo?.name || 'สำนักงานใหญ่ / ทุกสาขา';

  // หัวตาราง
  const sheetRows = [
    ['รายการเดินบัญชีรายรับ-รายจ่าย (Clinic Statement)'],
    [`ชื่อสถานพยาบาล: ${clinicName}`, '', '', `สาขา: ${branchName}`],
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
