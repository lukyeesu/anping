import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { getLocalStore, replaceLocalStore, deleteFromLocalStore } from './offlineStore';

// รายการตารางที่อนุญาตให้ Export และ Purge ได้ (ความปลอดภัยสูงสุด: ห้ามมี patients, treatments, patient_courses เด็ดขาด!)
export const PURGEABLE_TABLES = [
  { key: 'pos_transactions', name: 'รายการขาย POS (POS Transactions)', dateCol: 'date', timeCol: 'created_at', icon: 'Receipt' },
  { key: 'finance_revenue', name: 'รายรับทางการเงิน (Finance Revenue)', dateCol: 'date', timeCol: 'created_at', icon: 'TrendingUp' },
  { key: 'finance_expenses', name: 'รายจ่ายทางการเงิน (Finance Expenses)', dateCol: 'date', timeCol: 'created_at', icon: 'TrendingDown' },
  { key: 'staff_schedules', name: 'ประวัติการเข้างานพนักงาน (Staff Schedules)', dateCol: 'date', timeCol: 'created_at', icon: 'CalendarDays' },
  { key: 'inventory_logs', name: 'ประวัติการเบิก/ปรับสต็อก (Inventory Logs)', dateCol: 'receive_date', timeCol: 'created_at', icon: 'Package' },
  { key: 'logs', name: 'บันทึกกิจกรรมระบบ (System Logs)', dateCol: null, timeCol: 'created_at', icon: 'FileText' }
];

// รายการตารางที่ได้รับการปกป้อง (ห้ามลบเด็ดขาด 100%)
export const PROTECTED_TABLES = [
  { key: 'patients', name: 'ข้อมูลคนไข้ (Patients)', reason: 'ต้องลบเฉพาะที่หน้าเวชระเบียน' },
  { key: 'treatments', name: 'ประวัติการรักษา (Treatments / OPD)', reason: 'เอกสารทางการแพทย์ห้ามลบ' },
  { key: 'patient_courses', name: 'คอร์สการรักษา (Patient Courses)', reason: 'ข้อมูลสิทธิและยอดคงเหลือคนไข้' },
  { key: 'branches', name: 'สาขาคลินิก (Branches)', reason: 'ข้อมูลโครงสร้างคลินิก' },
  { key: 'staff', name: 'ข้อมูลพนักงาน (Staff)', reason: 'ข้อมูลบุคลากรคลินิก' },
  { key: 'inventory', name: 'สินค้าและเวชภัณฑ์ (Inventory Items)', reason: 'สต็อกคงเหลือปัจจุบัน' },
  { key: 'setting_pos', name: 'รายการบริการและแคตตาล็อก (Catalog)', reason: 'การตั้งค่าสินค้า/บริการ' },
  { key: 'settings', name: 'การตั้งค่าระบบ (System Settings)', reason: 'การตั้งค่าคลินิก' }
];

/**
 * ดึงสถิติ Database, Storage และประเมิน Egress แบบ Real-time
 */
export async function getDatabaseAndStorageStats() {
  if (!supabase) {
    return {
      status: 'error',
      message: 'Supabase client is not connected'
    };
  }

  try {
    // 1. นับจำนวนแถวในแต่ละตารางแบบ Head Query (Zero Data Egress)
    const allTableKeys = [
      'patients', 'treatments', 'patient_courses', 'pos_transactions', 
      'finance_revenue', 'finance_expenses', 'staff_schedules', 'inventory_logs', 
      'inventory', 'staff', 'branches', 'logs'
    ];

    const countPromises = allTableKeys.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        return { table, count: (!error && typeof count === 'number') ? count : 0 };
      } catch (e) {
        return { table, count: 0 };
      }
    });

    const countResults = await Promise.all(countPromises);
    const tableCounts = {};
    let totalRows = 0;
    countResults.forEach(r => {
      tableCounts[r.table] = r.count;
      totalRows += r.count;
    });

    // 2. ดึงสถิติไฟล์ใน Supabase Storage Buckets
    let totalStorageBytes = 0;
    let totalFilesCount = 0;
    const bucketStats = [];

    try {
      const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
      if (!bErr && Array.isArray(buckets) && buckets.length > 0) {
        for (const bucket of buckets) {
          try {
            const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 200 });
            let bucketBytes = 0;
            let fileCount = 0;
            if (Array.isArray(files)) {
              files.forEach(f => {
                if (f.metadata?.size) bucketBytes += Number(f.metadata.size);
                fileCount++;
              });
            }
            totalStorageBytes += bucketBytes;
            totalFilesCount += fileCount;
            bucketStats.push({
              name: bucket.name,
              filesCount: fileCount,
              sizeBytes: bucketBytes
            });
          } catch (e) {}
        }
      }
    } catch (sErr) {}

    // 3. ประมาณการขนาด Database และ Egress รายเดือน
    // เฉลี่ยขนาดข้อมูลต่อแถว ~ 0.5 - 1.2 KB ขึ้นอยู่กับตาราง
    const estimatedDbBytes = totalRows * 850;
    
    // โควตาฟรีมาตรฐาน Supabase Free Tier = 5 GB ต่อเดือน
    const EGRESS_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
    const DB_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024;  // 500 MB (Supabase Free Tier)

    // คำนวณ Egress ประจำเดือนปัจจุบัน
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = now.getDate();
    const localTrackedBytes = (typeof localStorage !== 'undefined')
      ? Number(localStorage.getItem(`anping_egress_${currentMonthKey}`) || 0)
      : 0;

    // คำนวณ Egress จากการเรียกใช้งาน API และ Storage 
    // - ระบบใช้ IndexedDB Cache ทำให้ส่วนใหญ่ดึงเฉพาะข้อมูลส่วนต่าง และใช้ Pagination ทีละ 35 รายการ
    // - คำนวณจากกิจกรรมการคิวรีฐานข้อมูล (เฉลี่ย ~120 Bytes ต่อแถวที่ถูกโหลดในแต่ละเซสชัน)
    // - รวมกับการดาวน์โหลดไฟล์รูปภาพจาก Storage (~20% ของขนาดไฟล์ทั้งหมดในแต่ละเดือน)
    const baseQueryEgress = totalRows * 120;
    const baseStorageEgress = Math.round(totalStorageBytes * 0.2);
    const dailyOperationalBytes = (Math.max(1, currentDay) * 0.8) * 1024 * 1024; // ~0.8 MB ต่อวันสำหรับ Sync/Auth

    const estimatedMonthlyEgressBytes = Math.max(
      localTrackedBytes,
      Math.round(dailyOperationalBytes + baseQueryEgress + baseStorageEgress)
    );

    const egressUsagePercent = Math.min(100, Number(((estimatedMonthlyEgressBytes / EGRESS_LIMIT_BYTES) * 100).toFixed(2)));
    const egressRemainingBytes = Math.max(0, EGRESS_LIMIT_BYTES - estimatedMonthlyEgressBytes);
    const egressSavingsPercent = Math.max(0, Number((100 - egressUsagePercent).toFixed(2)));
    const currentMonthLabel = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    // สถิติที่ส่งกลับ
    return {
      status: 'success',
      totalRows,
      tableCounts,
      estimatedDbBytes,
      dbLimitBytes: DB_STORAGE_LIMIT_BYTES,
      dbUsagePercent: Math.min(100, Math.round((estimatedDbBytes / DB_STORAGE_LIMIT_BYTES) * 100)),
      totalStorageBytes,
      totalFilesCount,
      bucketStats,
      estimatedMonthlyEgressBytes,
      egressLimitBytes: EGRESS_LIMIT_BYTES,
      egressUsagePercent,
      egressRemainingBytes,
      egressSavingsPercent,
      currentMonthLabel,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('getDatabaseAndStorageStats error:', err);
    return { status: 'error', message: err.message };
  }
}

/**
 * คำนวณช่วงวันที่ตาม ISO String (startOfDay และ endOfDay)
 */
export function getDateRangeBounds(type, options = {}) {
  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (type === 'all') {
    return { startDate: null, endDate: null, label: 'ข้อมูลทั้งหมด (All Time)' };
  }

  if (type === 'year') {
    const year = Number(options.year) || now.getFullYear();
    startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    return { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString(), 
      dateOnlyStart: `${year}-01-01`,
      dateOnlyEnd: `${year}-12-31`,
      label: `ตลอดทั้งปี พ.ศ. ${year + 543} (${year})` 
    };
  }

  if (type === 'custom') {
    const s = options.startDate ? new Date(options.startDate) : new Date(now.getFullYear(), 0, 1);
    const e = options.endDate ? new Date(options.endDate) : now;
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    const sStr = s.toISOString().split('T')[0];
    const eStr = e.toISOString().split('T')[0];
    return {
      startDate: s.toISOString(),
      endDate: e.toISOString(),
      dateOnlyStart: sStr,
      dateOnlyEnd: eStr,
      label: `${sStr} ถึง ${eStr}`
    };
  }

  if (type === 'single') {
    const d = options.singleDate ? new Date(options.singleDate) : now;
    d.setHours(0, 0, 0, 0);
    const sStr = d.toISOString().split('T')[0];
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    return {
      startDate: d.toISOString(),
      endDate: e.toISOString(),
      dateOnlyStart: sStr,
      dateOnlyEnd: sStr,
      label: `เฉพาะวันที่ ${sStr}`
    };
  }

  return { startDate: null, endDate: null, label: 'ไม่ระบุช่วงเวลา' };
}

/**
 * ตรวจสอบจำนวนรายการที่จะได้รับผลกระทบตามช่วงเวลาและตาราง
 */
export async function previewPurgeImpact(tableKeys, rangeBounds) {
  if (!supabase || !Array.isArray(tableKeys) || tableKeys.length === 0) {
    return {};
  }

  const results = {};
  const { startDate, endDate, dateOnlyStart, dateOnlyEnd } = rangeBounds;

  for (const tableKey of tableKeys) {
    // ป้องกันตารางต้องห้าม
    if (PROTECTED_TABLES.some(p => p.key === tableKey)) continue;

    try {
      let query = supabase.from(tableKey).select('*', { count: 'exact', head: true });
      
      const tableMeta = PURGEABLE_TABLES.find(t => t.key === tableKey);
      if (startDate && endDate) {
        if (tableMeta?.dateCol) {
          // ใช้ or เพื่อรองรับทั้ง ISO timestamp created_at และ date
          query = query.or(`created_at.gte.${startDate},and(${tableMeta.dateCol}.gte.${dateOnlyStart},${tableMeta.dateCol}.lte.${dateOnlyEnd})`)
                       .lte('created_at', endDate);
        } else {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
      }

      const { count, error } = await query;
      results[tableKey] = (!error && typeof count === 'number') ? count : 0;
    } catch (err) {
      results[tableKey] = 0;
    }
  }

  return results;
}

/**
 * ดึงข้อมูลจาก Supabase และ Export เป็นไฟล์ Excel (.xlsx) แบบหลาย Sheet
 */
export async function exportSupabaseToExcel(tableKeys, rangeBounds, filename = 'clinic_backup.xlsx') {
  if (!supabase || !Array.isArray(tableKeys) || tableKeys.length === 0) {
    throw new Error('กรุณาเลือกตารางที่ต้องการ Export อย่างน้อย 1 ตาราง');
  }

  const { startDate, endDate, dateOnlyStart, dateOnlyEnd } = rangeBounds;
  const workbook = XLSX.utils.book_new();
  let totalExportedRows = 0;

  for (const tableKey of tableKeys) {
    try {
      let query = supabase.from(tableKey).select('*').order('created_at', { ascending: false });

      const tableMeta = PURGEABLE_TABLES.find(t => t.key === tableKey);
      if (startDate && endDate) {
        if (tableMeta?.dateCol) {
          query = query.or(`created_at.gte.${startDate},and(${tableMeta.dateCol}.gte.${dateOnlyStart},${tableMeta.dateCol}.lte.${dateOnlyEnd})`)
                       .lte('created_at', endDate);
        } else {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
      }

      // ดึงข้อมูลสูงสุดครั้งละ 10,000 แถว
      const { data, error } = await query.limit(10000);
      if (error) {
        console.warn(`Export table ${tableKey} error:`, error);
        continue;
      }

      const rows = Array.isArray(data) ? data : [];
      totalExportedRows += rows.length;

      // จัดการฟิลด์ที่เป็น JSON/Object ให้อยู่ในรูป string เพื่อให้อ่านง่ายใน Excel
      const cleanRows = rows.map(item => {
        const rowObj = {};
        for (const k in item) {
          if (item[k] !== null && typeof item[k] === 'object') {
            try { rowObj[k] = JSON.stringify(item[k]); } catch (e) { rowObj[k] = String(item[k]); }
          } else {
            rowObj[k] = item[k];
          }
        }
        return rowObj;
      });

      // ชื่อ Sheet ต้องไม่เกิน 31 ตัวอักษรตามมาตรฐาน Excel
      const sheetName = tableKey.slice(0, 30);
      const worksheet = XLSX.utils.json_to_sheet(cleanRows.length > 0 ? cleanRows : [{ note: 'ไม่มีข้อมูลในช่วงเวลาที่เลือก' }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    } catch (err) {
      console.error(`Error exporting ${tableKey}:`, err);
    }
  }

  if (totalExportedRows === 0 && workbook.SheetNames.length === 0) {
    throw new Error('ไม่พบข้อมูลในช่วงเวลาที่เลือกสำหรับการ Export');
  }

  // ดาวน์โหลดไฟล์ Excel เข้าสู่เครื่องผู้ใช้
  XLSX.writeFile(workbook, filename);
  return { status: 'success', totalRows: totalExportedRows, filename };
}

/**
 * ลบข้อมูลย้อนหลังตามช่วงวันที่และตารางที่เลือกอย่างปลอดภัย (Purge Data)
 * พร้อมลบออกจาก IndexedDB ในเครื่องด้วยเพื่อให้สอดคล้องกัน
 */
export async function purgeHistoricalData(tableKeys, rangeBounds) {
  if (!supabase) throw new Error('Supabase client is not connected');
  if (!Array.isArray(tableKeys) || tableKeys.length === 0) {
    throw new Error('กรุณาเลือกตารางที่ต้องการลบ');
  }

  const { startDate, endDate, dateOnlyStart, dateOnlyEnd } = rangeBounds;
  if (!startDate || !endDate) {
    throw new Error('กรุณาระบุช่วงวันที่ที่ต้องการลบให้ครบถ้วน');
  }

  const results = {};
  let totalDeleted = 0;

  for (const tableKey of tableKeys) {
    // 🛡️ ป้องกันตารางคนไข้และประวัติรักษาอย่างเด็ดขาด 100%
    if (PROTECTED_TABLES.some(p => p.key === tableKey) || tableKey === 'patients' || tableKey === 'treatments' || tableKey === 'patient_courses') {
      console.warn(`[Security Alert] Table ${tableKey} is strictly protected from purge!`);
      continue;
    }

    try {
      const tableMeta = PURGEABLE_TABLES.find(t => t.key === tableKey);
      
      // 1. ดึง ID ของแถวที่ตรงตามเงื่อนไขเพื่อลบทั้งบน Supabase และ IndexedDB
      let selectQuery = supabase.from(tableKey).select('id');
      if (tableMeta?.dateCol) {
        selectQuery = selectQuery.or(`created_at.gte.${startDate},and(${tableMeta.dateCol}.gte.${dateOnlyStart},${tableMeta.dateCol}.lte.${dateOnlyEnd})`)
                                 .lte('created_at', endDate);
      } else {
        selectQuery = selectQuery.gte('created_at', startDate).lte('created_at', endDate);
      }

      const { data: rowsToDelete, error: selErr } = await selectQuery.limit(5000);
      if (selErr || !rowsToDelete || rowsToDelete.length === 0) {
        results[tableKey] = 0;
        continue;
      }

      const ids = rowsToDelete.map(r => r.id).filter(Boolean);
      if (ids.length === 0) {
        results[tableKey] = 0;
        continue;
      }

      // 2. ลบออกจาก Supabase (Hard delete เพื่อประหยัดพื้นที่ DB)
      const { error: delErr } = await supabase.from(tableKey).delete().in('id', ids);
      if (delErr) {
        console.warn(`Delete on ${tableKey} error:`, delErr);
        // Fallback: Soft delete
        await supabase.from(tableKey).update({ is_deleted: true, updated_at: new Date().toISOString() }).in('id', ids);
      }

      // 3. ลบออกจาก IndexedDB ในเครื่องด้วยทันที
      for (const id of ids) {
        await deleteFromLocalStore(tableKey, id, { broadcast: false });
      }

      results[tableKey] = ids.length;
      totalDeleted += ids.length;
    } catch (err) {
      console.error(`Purge error on ${tableKey}:`, err);
      results[tableKey] = 0;
    }
  }

  return { status: 'success', totalDeleted, details: results };
}

/**
 * อ่านไฟล์ Excel สำหรับโหมดจำลองข้อมูล (Simulation Sandbox Mode)
 */
export async function parseExcelForSimulation(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const simulationData = {
          fileName: file.name,
          fileSize: file.size,
          importedAt: new Date().toISOString(),
          pos_transactions: [],
          finance_revenue: [],
          finance_expenses: [],
          staff_schedules: [],
          inventory_logs: [],
          logs: [],
          totalRecords: 0
        };

        workbook.SheetNames.forEach(sheetName => {
          const lowerSheet = sheetName.toLowerCase().replace(/[^a-z0-9_]/g, '');
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet) || [];

          if (lowerSheet.includes('pos_transactions') || lowerSheet.includes('pos') || lowerSheet.includes('receipt')) {
            simulationData.pos_transactions = rows;
            simulationData.totalRecords += rows.length;
          } else if (lowerSheet.includes('finance_revenue') || lowerSheet.includes('revenue') || lowerSheet.includes('income')) {
            simulationData.finance_revenue = rows;
            simulationData.totalRecords += rows.length;
          } else if (lowerSheet.includes('finance_expenses') || lowerSheet.includes('expense') || lowerSheet.includes('expenses')) {
            simulationData.finance_expenses = rows;
            simulationData.totalRecords += rows.length;
          } else if (lowerSheet.includes('staff_schedules') || lowerSheet.includes('schedule') || lowerSheet.includes('attendance')) {
            simulationData.staff_schedules = rows;
            simulationData.totalRecords += rows.length;
          } else if (lowerSheet.includes('inventory_logs') || lowerSheet.includes('inventory') || lowerSheet.includes('stock')) {
            simulationData.inventory_logs = rows;
            simulationData.totalRecords += rows.length;
          } else if (lowerSheet.includes('log')) {
            simulationData.logs = rows;
            simulationData.totalRecords += rows.length;
          }
        });

        resolve({
          status: 'success',
          data: simulationData
        });
      } catch (err) {
        reject(new Error('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsArrayBuffer(file);
  });
}
