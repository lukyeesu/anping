import { createClient } from '@supabase/supabase-js';
import { GOOGLE_SCRIPT_URL } from '../global/constants';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

let clientInstance = (typeof window !== 'undefined' && window.__supabaseInstance) ? window.__supabaseInstance : null;
if (!clientInstance && supabaseUrl && supabaseAnonKey) {
  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  if (typeof window !== 'undefined') {
    window.__supabaseInstance = clientInstance;
  }
}

export const supabase = clientInstance;

const TABLE_MAP = {
  'Patients': 'patients',
  'Branches': 'branches',
  'Queue': 'queue',
  'POS_Transactions': 'pos_transactions',
  'Inventory': 'inventory',
  'InventoryLogs': 'inventory_logs',
  'setting_pos': 'setting_pos',
  'Finance_Revenue': 'finance_revenue',
  'Finance_Expenses': 'finance_expenses',
  'Staff': 'staff',
  'Staff_Schedules': 'staff_schedules',
  'Settings': 'settings',
  'Logs': 'logs',
  'Treatments': 'treatments'
};

const TABLE_COLUMNS = {
  patients: [
    'id', 'prefix', 'first_name', 'last_name', 'name', 'nickname', 'id_card', 'phone', 
    'gender', 'dob', 'age', 'blood_group', 'religion', 'nationality', 'ethnicity', 'occupation',
    'address', 'moo', 'sub_district', 'district', 'province', 'zipcode', 'road',
    'em_name', 'em_phone', 'em_relation', 'em_address',
    'allergies', 'drug_allergy', 'underlying_disease', 'medical_history', 'chief_complaint',
    'pdpa_status', 'pdpa_token', 'pdpa_expires', 'branch_id', 'created_at', 'updated_at'
  ],
  treatments: ['id', 'patient_id', 'datetime', 'date', 'time', 'doctor', 'chief_complaint', 'diagnosis', 'treatment_detail', 'prescription', 'vital_signs', 'attachments', 'cost', 'branch_id', 'created_at', 'updated_at'],
  branches: ['id', 'name', 'address', 'phone', 'is_active', 'created_at', 'updated_at'],
  queue: ['id', 'hn', 'patient_name', 'phone', 'raw_date_time', 'doctor', 'service', 'reason', 'status', 'deal_status', 'branch_id', 'notes', 'created_at', 'updated_at'],
  pos_transactions: ['id', 'receipt_no', 'hn', 'patient_name', 'branch_id', 'branch_name', 'total_amount', 'discount', 'net_amount', 'payment_method', 'items', 'staff_name', 'date', 'time', 'created_at', 'updated_at'],
  inventory: ['id', 'code', 'name', 'category', 'unit', 'cost_price', 'selling_price', 'stock_quantity', 'min_stock', 'branch_id', 'created_at', 'updated_at'],
  inventory_logs: ['id', 'item_id', 'item_name', 'change_type', 'quantity', 'staff_name', 'notes', 'created_at'],
  setting_pos: ['id', 'code', 'name', 'category', 'price', 'unit', 'is_active', 'created_at', 'updated_at'],
  finance_revenue: ['id', 'date', 'amount', 'category', 'description', 'branch_id', 'items', 'subtotal', 'discount_value', 'discount_type', 'discount_amount', 'tax_mode', 'vat_rate', 'vat_amount', 'method', 'status', 'is_auto', 'patient_id', 'patient_name', 'created_at', 'updated_at'],
  finance_expenses: ['id', 'date', 'amount', 'category', 'description', 'branch_id', 'items', 'subtotal', 'discount_value', 'discount_type', 'discount_amount', 'tax_mode', 'vat_rate', 'vat_amount', 'method', 'status', 'is_auto', 'patient_id', 'patient_name', 'created_at', 'updated_at'],
  staff: ['id', 'username', 'password', 'prefix', 'first_name', 'last_name', 'name', 'role', 'category', 'phone', 'email', 'branch_id', 'salary', 'is_active', 'created_at', 'updated_at'],
  staff_schedules: ['id', 'staff_id', 'staff_name', 'date', 'day_of_week', 'shift_type', 'start_time', 'end_time', 'is_active', 'branch_id', 'notes', 'created_at', 'updated_at'],
  settings: ['id', 'values', 'labels', 'created_at', 'updated_at'],
  logs: ['id', 'user_name', 'user_id', 'role', 'action', 'target_sheet', 'target_data_id', 'detail', 'created_at']
};

const getTableName = (sheetName) => TABLE_MAP[sheetName] || sheetName.toLowerCase();

export function rowToJS(row) {
  if (!row) return null;
  const jsObj = { ...row };
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) continue;
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    jsObj[camelKey] = val;
  }
  if (!jsObj.hn && jsObj.id) {
    jsObj.hn = jsObj.id;
  }
  if (!jsObj.name && (jsObj.firstName || jsObj.lastName)) {
    jsObj.name = `${jsObj.firstName || ''} ${jsObj.lastName || ''}`.trim();
  }
  if (jsObj.schedule && typeof jsObj.schedule === 'string') {
    try {
      jsObj.schedule = JSON.parse(jsObj.schedule);
    } catch (e) {}
  }
  if (jsObj.service) {
    jsObj.serviceType = jsObj.service;
  }
  if (jsObj.rawDateTime && !jsObj.datetime) {
    try {
      const d = new Date(jsObj.rawDateTime);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear() + 543;
        const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        jsObj.datetime = `${dd}/${mm}/${yy} ${t} น.`;
      }
    } catch(e) {}
  }
  return jsObj;
}

export function jsToRow(payload, tableName = '') {
  if (!payload) return {};
  
  const recordId = String(payload.hn || payload.id || payload.username || `REC_${Date.now()}`);

  const rawRow = {
    id: recordId,
    updated_at: new Date().toISOString()
  };

  // อัปเดตคอลัมน์ camelCase ทั้งหมดให้กลายเป็น snake_case อัตโนมัติสำหรับตาราง PostgreSQL
  for (const [key, val] of Object.entries(payload)) {
    if (val === null || val === undefined) continue;
    if (key === 'data' || key === 'updatedBy' || key === 'updatedById' || key === 'opdRecords' || key === 'courses') continue;
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || typeof val === 'object') {
      rawRow[snakeKey] = val;
    }
  }

  if (tableName === 'pos_transactions') {
    if (payload.hn || payload.patientId) rawRow.hn = String(payload.hn || payload.patientId);
    
    const rawTotal = payload.totalAmount ?? payload.subtotal ?? payload.grandTotal ?? payload.amount ?? payload.total ?? 0;
    const cleanTotal = parseFloat(String(rawTotal).replace(/,/g, '')) || 0;
    rawRow.total_amount = cleanTotal;

    const rawNet = payload.netAmount ?? payload.netTotal ?? payload.grandTotal ?? payload.amount ?? 0;
    rawRow.net_amount = parseFloat(String(rawNet).replace(/,/g, '')) || cleanTotal;

    const rawDiscount = payload.discountAmount ?? payload.discount ?? 0;
    rawRow.discount = parseFloat(String(rawDiscount).replace(/,/g, '')) || 0;
  }

  if (tableName === 'finance_revenue' || tableName === 'finance_expenses') {
    if (payload.note !== undefined && payload.description === undefined) {
      rawRow.description = String(payload.note || '');
    }
  }

  // Safe Mappings & Address Consolidation
  if (payload.firstName || payload.first_name) rawRow.first_name = String(payload.firstName || payload.first_name);
  if (payload.lastName || payload.last_name) rawRow.last_name = String(payload.lastName || payload.last_name);
  if (payload.idCard || payload.id_card) rawRow.id_card = String(payload.idCard || payload.id_card);
  if (payload.bloodGroup || payload.blood_group) rawRow.blood_group = String(payload.bloodGroup || payload.blood_group);

  // Safe Mappings & Address Consolidation (ที่อยู่ตามบัตรประชาชน & ที่อยู่ปัจจุบัน)
  const mainAddress = String(payload.address || payload.curAddress || payload.cur_address || '').trim();
  const mainMoo = String(payload.moo || payload.curMoo || payload.cur_moo || '').trim();
  const mainRoad = String(payload.road || payload.curRoad || payload.cur_road || '').trim();
  const mainSubDistrict = String(payload.subDistrict || payload.sub_district || payload.curSubDistrict || payload.cur_sub_district || '').trim();
  const mainDistrict = String(payload.district || payload.curDistrict || payload.cur_district || '').trim();
  const mainProvince = String(payload.province || payload.curProvince || payload.cur_province || '').trim();
  const mainZipcode = String(payload.zipcode || payload.curZipcode || payload.cur_zipcode || '').trim();

  const curAddressVal = String(payload.curAddress || payload.cur_address || mainAddress).trim();
  const curMooVal = String(payload.curMoo || payload.cur_moo || mainMoo).trim();
  const curRoadVal = String(payload.curRoad || payload.cur_road || mainRoad).trim();
  const curSubDistVal = String(payload.curSubDistrict || payload.cur_sub_district || mainSubDistrict).trim();
  const curDistrictVal = String(payload.curDistrict || payload.cur_district || mainDistrict).trim();
  const curProvinceVal = String(payload.curProvince || payload.cur_province || mainProvince).trim();
  const curZipcodeVal = String(payload.curZipcode || payload.cur_zipcode || mainZipcode).trim();

  rawRow.address = mainAddress;
  rawRow.moo = mainMoo;
  rawRow.road = mainRoad;
  rawRow.sub_district = mainSubDistrict;
  rawRow.district = mainDistrict;
  rawRow.province = mainProvince;
  rawRow.zipcode = mainZipcode;

  rawRow.cur_address = curAddressVal;
  rawRow.cur_moo = curMooVal;
  rawRow.cur_road = curRoadVal;
  rawRow.cur_sub_district = curSubDistVal;
  rawRow.cur_district = curDistrictVal;
  rawRow.cur_province = curProvinceVal;
  rawRow.cur_zipcode = curZipcodeVal;

  if (payload.emName || payload.em_name) rawRow.em_name = String(payload.emName || payload.em_name);
  if (payload.emPhone || payload.em_phone) rawRow.em_phone = String(payload.emPhone || payload.em_phone);
  if (payload.emRelation || payload.em_relation) rawRow.em_relation = String(payload.emRelation || payload.em_relation);
  if (payload.drugAllergy || payload.allergies || payload.drug_allergy) rawRow.drug_allergy = String(payload.drugAllergy || payload.allergies || payload.drug_allergy || '');
  if (payload.underlyingDisease || payload.medicalHistory || payload.underlying_disease) rawRow.underlying_disease = String(payload.underlyingDisease || payload.medicalHistory || payload.underlying_disease || '');
  if (payload.chiefComplaint || payload.chief_complaint) rawRow.chief_complaint = String(payload.chiefComplaint || payload.chief_complaint);
  if (payload.pdpaStatus || payload.pdpa_status) rawRow.pdpa_status = String(payload.pdpaStatus || payload.pdpa_status);
  if (payload.pdpaToken || payload.pdpa_token) rawRow.pdpa_token = String(payload.pdpaToken || payload.pdpa_token);
  if (payload.pdpaExpires || payload.pdpa_expires) rawRow.pdpa_expires = Number(payload.pdpaExpires || payload.pdpa_expires);
  if (payload.branchId || payload.branch_id) rawRow.branch_id = String(payload.branchId || payload.branch_id);

  if (payload.serviceType !== undefined || payload.service_type !== undefined || payload.service !== undefined) {
    rawRow.service = String(payload.serviceType || payload.service_type || payload.service || '');
  }

  if (payload.commissionRate !== undefined || payload.commission_rate !== undefined) rawRow.commission_rate = Number(payload.commissionRate || payload.commission_rate || 0);
  if (payload.otRate !== undefined || payload.ot_rate !== undefined) rawRow.ot_rate = Number(payload.otRate || payload.ot_rate || 0);
  if (payload.employmentType || payload.employment_type) rawRow.employment_type = String(payload.employmentType || payload.employment_type);
  if (payload.bankName || payload.bank_name) rawRow.bank_name = String(payload.bankName || payload.bank_name);
  if (payload.bankAccount || payload.bank_account) rawRow.bank_account = String(payload.bankAccount || payload.bank_account);
  if (payload.schedule !== undefined) rawRow.schedule = payload.schedule;

  // Safe Numeric Mappings
  const numFields = ['salary', 'amount', 'totalAmount', 'total_amount', 'discount', 'netAmount', 'net_amount', 'costPrice', 'cost_price', 'sellingPrice', 'selling_price', 'price', 'age', 'stockQuantity', 'stock_quantity', 'minStock', 'min_stock', 'commission_rate', 'ot_rate'];
  for (const field of numFields) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      const snakeKey = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      const numVal = Number(String(payload[field]).replace(/[^0-9.-]/g, ''));
      if (!isNaN(numVal)) {
        rawRow[snakeKey] = numVal;
      }
    }
  }

  // Filter keys according to allowed columns for the target table
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed || !Array.isArray(allowed)) {
    return rawRow;
  }

  const cleanRow = {};
  for (const key of Object.keys(rawRow)) {
    if (allowed.includes(key)) {
      cleanRow[key] = rawRow[key];
    }
  }
  return cleanRow;
}

function parseItemDate(item) {
  if (!item) return null;
  const val = item.datetime || item.date || item.rawDateTime || item.raw_date_time || item.createdAt || item.created_at;
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/');
    if (parts.length === 3) {
      let d, m, y;
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (parts[0].length === 4) {
        y = p0; m = p1 - 1; d = p2;
      } else if (p1 > 12) {
        m = p0 - 1; d = p1; y = p2;
      } else {
        d = p0; m = p1 - 1; y = p2;
      }

      if (y > 2400) y -= 543;
      const parsed = new Date(y, m, d);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export async function callSupabase(action, sheetName, payload = null) {
  if (!supabase) {
    throw new Error('Supabase client ยังไม่ได้ถูกตั้งค่า');
  }

  const tableName = getTableName(sheetName);

  switch (action) {
    case 'GET_DATA': {
      const selectCols = (TABLE_COLUMNS[tableName] || []).join(',') || '*';
      let query = supabase.from(tableName).select(selectCols);

      if (tableName === 'logs') {
        query = query.order('created_at', { ascending: false }).limit(100);
      } else if (tableName === 'inventory_logs') {
        query = query.order('created_at', { ascending: false }).limit(200);
      } else if (tableName === 'pos_transactions') {
        query = query.order('created_at', { ascending: false }).limit(500);
      } else if (tableName === 'finance_revenue' || tableName === 'finance_expenses') {
        query = query.order('created_at', { ascending: false }).limit(500);
      } else if (tableName === 'treatments') {
        query = query.order('created_at', { ascending: false }).limit(1000);
      }

      let { data, error } = await query;

      if (error) {
        console.warn(`Query ${tableName} with explicit columns failed (${error.message}). Retrying with select('*')...`);
        let fallbackQuery = supabase.from(tableName).select('*');
        if (tableName === 'logs') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(100);
        else if (tableName === 'inventory_logs') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(200);
        else if (tableName === 'pos_transactions') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'finance_revenue' || tableName === 'finance_expenses') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'treatments') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(1000);
        
        const resFb = await fallbackQuery;
        data = resFb.data;
        if (resFb.error) {
          console.error(`Fallback query for ${tableName} also failed:`, resFb.error.message);
          return { status: 'error', data: [], message: resFb.error.message };
        }
      }

      const formattedData = (data || []).map(rowToJS);
      return { status: 'success', data: formattedData };
    }

    case 'GET_DATA_BY_MONTH': {
      const selectCols = (TABLE_COLUMNS[tableName] || []).join(',') || '*';
      const year = payload?.year || new Date().getFullYear();
      const month = payload?.month || (new Date().getMonth() + 1);

      let query = supabase.from(tableName).select(selectCols);

      let { data, error } = await query;
      if (error) {
        let fallbackQuery = supabase.from(tableName).select('*');
        const resFb = await fallbackQuery;
        data = resFb.data;
      }

      const formattedData = (data || [])
        .map(rowToJS)
        .filter(item => {
          const d = parseItemDate(item);
          if (!d) return true;
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });
      return { status: 'success', data: formattedData };
    }

    case 'GET_TREATMENTS_BY_PATIENT': {
      const selectCols = (TABLE_COLUMNS.treatments || []).join(',') || '*';
      const patientId = String(payload?.patientId || payload?.patient_id || payload?.hn || '').trim();
      if (!patientId) {
        return { status: 'success', data: [] };
      }
      const { data, error } = await supabase
        .from('treatments')
        .select(selectCols)
        .eq('patient_id', patientId)
        .order('datetime', { ascending: false });

      if (error) throw error;
      const formattedData = (data || []).map(rowToJS);
      return { status: 'success', data: formattedData };
    }

    case 'GET_PATIENTS_PAGINATED': {
      const selectCols = (TABLE_COLUMNS.patients || []).join(',') || '*';
      const offset = payload?.offset || 0;
      const limit = payload?.limit || 20;
      const search = (payload?.search || '').trim().toLowerCase();
      const sortKey = payload?.sortKey || 'created_at';
      const sortDir = payload?.sortDir || 'desc';

      let colSort = 'created_at';
      if (sortKey === 'id' || sortKey === 'hn') colSort = 'id';
      else if (sortKey === 'firstName' || sortKey === 'name') colSort = 'first_name';
      else if (sortKey === 'lastName') colSort = 'last_name';
      else if (sortKey === 'age' || sortKey === 'dob') colSort = 'dob';
      else if (sortKey === 'createdAt') colSort = 'created_at';

      let query = supabase.from('patients').select(selectCols, { count: 'exact' });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,id.ilike.%${search}%,id_card.ilike.%${search}%,phone.ilike.%${search}%,nickname.ilike.%${search}%`);
      }

      query = query.order(colSort, { ascending: sortDir === 'asc' });
      query = query.range(offset, offset + limit - 1);

      let { data, count, error } = await query;

      if (error) {
        let fbQuery = supabase.from('patients').select('*', { count: 'exact' });
        if (search) {
          fbQuery = fbQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,id.ilike.%${search}%,id_card.ilike.%${search}%,phone.ilike.%${search}%,nickname.ilike.%${search}%`);
        }
        fbQuery = fbQuery.order(colSort, { ascending: sortDir === 'asc' });
        fbQuery = fbQuery.range(offset, offset + limit - 1);
        const fbRes = await fbQuery;
        data = fbRes.data;
        count = fbRes.count;
      }

      const formattedData = (data || []).map(rowToJS);
      return { 
        status: 'success', 
        data: formattedData, 
        totalCount: count || formattedData.length, 
        hasMore: count ? (offset + limit) < count : formattedData.length === limit 
      };
    }

    case 'GET_EXEC_DASHBOARD_STATS': {
      const { startDate, endDate, branchId } = payload || {};
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId
      });
      if (error) {
        console.error("Dashboard RPC Error:", error);
        return { status: 'error', message: error.message };
      }
      return { status: 'success', data };
    }

    case 'GET_TREATMENTS_FOR_PATIENTS': {
      const selectCols = (TABLE_COLUMNS.treatments || []).join(',') || '*';
      const patientIds = payload?.patientIds || [];
      if (!Array.isArray(patientIds) || patientIds.length === 0) {
        return { status: 'success', data: [] };
      }
      const { data, error } = await supabase
        .from('treatments')
        .select(selectCols)
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false });

      if (error) {
        const fbRes = await supabase
          .from('treatments')
          .select('*')
          .in('patient_id', patientIds)
          .order('created_at', { ascending: false });
        return { status: 'success', data: (fbRes.data || []).map(rowToJS) };
      }

      const formattedData = (data || []).map(rowToJS);
      return { status: 'success', data: formattedData };
    }

    case 'GET_PATIENT_STATS': {
      try {
        const [
          resTotal,
          resMale,
          resFemale
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('gender', 'ชาย'),
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('gender', 'หญิง')
        ]);

        return {
          status: 'success',
          data: {
            total: resTotal.count || 0,
            male: resMale.count || 0,
            female: resFemale.count || 0
          }
        };
      } catch (e) {
        console.error('GET_PATIENT_STATS error:', e);
        return { status: 'error', data: { total: 0, male: 0, female: 0 } };
      }
    }

    case 'GET_DASHBOARD_STATS': {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${day}/${month}/${year + 543}`;
        const todayIso = `${year}-${month}-${day}`;

        const [
          resPatients,
          resTodaysQueue,
          resPendingQueue,
          resBranches
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or(`date.eq."${todayIso}",date.eq."${todayStr}"`),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or('status.eq."pending",deal_status.eq."pending"'),
          supabase.from('branches').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        return {
          status: 'success',
          data: {
            totalPatients: resPatients.count || 0,
            todaysQueue: resTodaysQueue.count || 0,
            pendingQueue: resPendingQueue.count || 0,
            activeBranches: resBranches.count || 1
          }
        };
      } catch (e) {
        console.error('GET_DASHBOARD_STATS error:', e);
        return { status: 'error', data: { totalPatients: 0, todaysQueue: 0, pendingQueue: 0, activeBranches: 1 } };
      }
    }

    case 'GET_APPOINTMENT_STATS': {
      try {
        const [
          resTotal,
          resCompleted,
          resPending,
          resCancelled
        ] = await Promise.all([
          supabase.from('queue').select('*', { count: 'exact', head: true }),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or('status.eq.completed,deal_status.eq.completed,status.eq.done'),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or('status.eq.pending,deal_status.eq.pending'),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or('status.eq.cancelled,deal_status.eq.cancelled')
        ]);

        return {
          status: 'success',
          data: {
            total: resTotal.count || 0,
            completed: resCompleted.count || 0,
            pending: resPending.count || 0,
            cancelled: resCancelled.count || 0
          }
        };
      } catch (e) {
        console.error('GET_APPOINTMENT_STATS error:', e);
        return { status: 'error', data: { total: 0, completed: 0, pending: 0, cancelled: 0 } };
      }
    }

    case 'GET_INVENTORY_STATS': {
      try {
        const [
          resTotal,
          resOutOfStock
        ] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('inventory').select('*', { count: 'exact', head: true }).lte('stock_quantity', 0)
        ]);

        return {
          status: 'success',
          data: {
            totalItems: resTotal.count || 0,
            outOfStock: resOutOfStock.count || 0
          }
        };
      } catch (e) {
        console.error('GET_INVENTORY_STATS error:', e);
        return { status: 'error', data: { totalItems: 0, outOfStock: 0 } };
      }
    }

    case 'GET_FINANCE_STATS': {
      try {
        const [
          resRevenue,
          resExpense,
          resPos
        ] = await Promise.all([
          supabase.from('finance_revenue').select('*', { count: 'exact', head: true }),
          supabase.from('finance_expenses').select('*', { count: 'exact', head: true }),
          supabase.from('pos_transactions').select('*', { count: 'exact', head: true })
        ]);

        return {
          status: 'success',
          data: {
            revenueCount: resRevenue.count || 0,
            expenseCount: resExpense.count || 0,
            posCount: resPos.count || 0
          }
        };
      } catch (e) {
        console.error('GET_FINANCE_STATS error:', e);
        return { status: 'error', data: { revenueCount: 0, expenseCount: 0, posCount: 0 } };
      }
    }

    case 'GET_STAFF_STATS': {
      try {
        const [
          resTotal,
          resActive
        ] = await Promise.all([
          supabase.from('staff').select('*', { count: 'exact', head: true }),
          supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        return {
          status: 'success',
          data: {
            totalStaff: resTotal.count || 0,
            activeStaff: resActive.count || 0
          }
        };
      } catch (e) {
        console.error('GET_STAFF_STATS error:', e);
        return { status: 'error', data: { totalStaff: 0, activeStaff: 0 } };
      }
    }

    case 'GET_EXECUTIVE_STATS': {
      try {
        const [
          resPatients,
          resQueue,
          resPos,
          resRev
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('queue').select('*', { count: 'exact', head: true }),
          supabase.from('pos_transactions').select('*', { count: 'exact', head: true }),
          supabase.from('finance_revenue').select('*', { count: 'exact', head: true })
        ]);

        return {
          status: 'success',
          data: {
            totalPatients: resPatients.count || 0,
            totalQueue: resQueue.count || 0,
            totalPos: resPos.count || 0,
            totalRevenue: resRev.count || 0
          }
        };
      } catch (e) {
        console.error('GET_EXECUTIVE_STATS error:', e);
        return { status: 'error', data: { totalPatients: 0, totalQueue: 0, totalPos: 0, totalRevenue: 0 } };
      }
    }

    case 'SAVE_DATA': {
      if (!payload || (!payload.id && !payload.hn && !payload.username)) {
        throw new Error('Missing ID in payload');
      }

      // หากเป็นการสร้าง/แก้ไขพนักงาน ให้สร้างบัญชีใน Supabase Auth และบันทึกลงตาราง staff
      if (tableName === 'staff') {
        const rawUsername = String(payload.username || payload.id || '').trim();
        const cleanUsername = rawUsername.includes('@') ? rawUsername.split('@')[0] : rawUsername;
        const cleanUserLower = cleanUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        const formattedEmail = cleanUserLower 
          ? `${cleanUserLower}@anping.com` 
          : (payload.email && payload.email.includes('@') ? payload.email.toLowerCase() : `staff_${Date.now()}@anping.com`);

        // ปรับแต่งให้ Username และ Email บนฟอร์ม ตรงกับ DB 100%
        payload.username = cleanUserLower || cleanUsername;
        payload.email = formattedEmail;
        // ไม่แก้ไข payload.password ให้มันคงค่าเดิมที่ผู้ใช้ตั้งไว้ในตาราง staff (แม้จะสั้นกว่า 6 ตัว)

        // ตรวจสอบ Username / Email ซ้ำกับพนักงานคนอื่นก่อนดำเนินการ
        if (cleanUserLower) {
          const { data: existingStaffRows } = await supabase.from('staff').select('id, username, email');
          if (existingStaffRows && existingStaffRows.length > 0) {
            const isDupe = existingStaffRows.some(s => {
              if (payload.id && String(s.id).toLowerCase() === String(payload.id).toLowerCase()) return false;
              const u = String(s.username || '').toLowerCase().trim();
              const uClean = u.includes('@') ? u.split('@')[0] : u;
              const e = String(s.email || '').toLowerCase().trim();
              const eClean = e.includes('@') ? e.split('@')[0] : e;
              return uClean === cleanUserLower || u === cleanUserLower || eClean === cleanUserLower;
            });
            if (isDupe) {
              throw new Error(`ID พนักงาน (Username) "${cleanUserLower}" มีอยู่ในระบบแล้ว กรุณาใช้ Username อื่น`);
            }
          }
        }
      }

      const row = jsToRow(payload, tableName);
      const { error } = await supabase.from(tableName).upsert(row);
      if (error) throw error;

      // ซิงค์สร้าง/แก้ไขพนักงานไปยังระบบ Supabase Auth (auth.users) ผ่าน Backend API แบบเบื้องหลัง
      if (tableName === 'staff') {
        try {
          const sessionToken = localStorage.getItem('clinic_session_token') || 'recovery-token';
          fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SAVE_DATA',
              sheetName: 'Staff',
              payload: payload,
              token: sessionToken
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.status === 'error' && data.message && data.message.includes('Auth Sync Failed')) {
              console.warn('Auth Sync Note: Backend could not sync to Supabase Auth automatically. You may need to create this user manually in the Supabase Dashboard.');
            }
          })
          .catch(() => {});
        } catch (e) {}
      }

      return { status: 'success', message: 'Data saved successfully', id: row.id, data: payload };
    }

    case 'DELETE_DATA': {
      const recordId = String(payload?.hn || payload?.id || payload?.username);
      if (!recordId) throw new Error('Missing ID for deletion');
      const { error } = await supabase.from(tableName).delete().eq('id', recordId);
      if (error) throw error;

      // ซิงค์ลบพนักงานออกจากระบบ Supabase Auth (auth.users) ผ่าน Backend API
      if (tableName === 'staff') {
        try {
          const sessionToken = localStorage.getItem('clinic_session_token') || 'recovery-token';
          await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_DATA',
              sheetName: 'Staff',
              payload: payload || { id: recordId },
              token: sessionToken
            })
          }).catch(err => console.warn('Auth sync DELETE_DATA note:', err));
        } catch (e) {
          console.warn('Auth sync exception:', e);
        }
      }

      return { status: 'success', message: 'Data deleted successfully' };
    }

async function logFailedLogin(usernameInput, reason, staffObj = null) {
  try {
    const rawUser = String(usernameInput || '').trim();
    const logId = `LOG_FAIL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const logPayload = {
      id: logId,
      user_name: staffObj?.name || rawUser || 'Guest',
      user_id: staffObj?.id || rawUser || 'unknown',
      role: staffObj?.role || 'guest',
      action: 'LOGIN_FAILED',
      target_sheet: 'System',
      target_data_id: rawUser || 'unknown',
      detail: `เข้าสู่ระบบไม่สำเร็จ: ${reason}`,
      created_at: new Date().toISOString()
    };

    // ส่งบันทึก Log ผ่าน Backend API (/api/db) เพื่อป้องกัน 401 Unauthorized จาก RLS
    try {
      fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_DATA',
          sheetName: 'Logs',
          payload: logPayload,
          token: 'failed-login-token'
        })
      }).catch(() => {});
    } catch (e) {}

    if (GOOGLE_SCRIPT_URL) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'SAVE_DATA', sheetName: 'Logs', payload: logPayload, token: 'failed-login-log' }),
        redirect: 'follow'
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('logFailedLogin exception:', e);
  }
}



    case 'UPLOAD_FILE': {
      if (!GOOGLE_SCRIPT_URL) {
        throw new Error('Missing GOOGLE_SCRIPT_URL for Google Drive uploads');
      }
      const rawToken = localStorage.getItem('clinic_session_token') || 'recovery-token';
      const gasToken = (rawToken.startsWith('ey') || rawToken.startsWith('supa') || rawToken.startsWith('sec')) ? 'recovery-token' : rawToken;

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'UPLOAD_FILE', sheetName, payload, token: gasToken })
      });
      const responseText = await response.text();
      if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
        throw new Error('สิทธิ์การบันทึกภาพลง Google Drive ไม่ถูกต้อง');
      }
      const result = JSON.parse(responseText);
      if (result.status === 'error') throw new Error(result.message);
      return result;
    }

    default:
      throw new Error(`Action ${action} not supported in Supabase Adapter`);
  }
}

export async function sendLinePushNotification(action, data = null, customMessage = '') {
  if (!supabase) return { status: 'error', message: 'Supabase client not initialized' };
  try {
    const { data: res, error } = await supabase.functions.invoke('line-messaging', {
      body: { action, data, message: customMessage }
    });
    if (error) throw error;
    return { status: 'success', data: res };
  } catch (err) {
    console.error('Error sending LINE Push via Supabase Edge Function:', err);
    return { status: 'error', message: err.message };
  }
}
