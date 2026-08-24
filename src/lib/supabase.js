import { createClient } from '@supabase/supabase-js';
import { GOOGLE_SCRIPT_URL } from '../global/constants';
import { getLocalStore, upsertLocalStore, replaceLocalStore, deleteFromLocalStore, reconcileLocalStore, diffLocalStore, getLastSyncTime, setLastSyncTime } from './offlineStore';

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

// Auto Cache Schema Version Check (ช่วยให้เครื่องที่เคยบันทึกค่าเก่า ดึงข้อมูลล่าสุดจาก Supabase ทันทีเมื่อเปิด/รีเฟรช โดยไม่ต้องสั่งล้างแคชด้วยตนเอง)
const CACHE_SCHEMA_VERSION = 'v3_staff_df_comm_fix_2026';
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  const currentVer = localStorage.getItem('clinic_cache_schema_version');
  if (currentVer !== CACHE_SCHEMA_VERSION) {
    replaceLocalStore('staff', []).catch(() => {});
    localStorage.setItem('clinic_cache_schema_version', CACHE_SCHEMA_VERSION);
  }
}

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
  'Treatments': 'treatments',
  'PatientCourses': 'patient_courses',
  'Patient_Courses': 'patient_courses',
  'patient_courses': 'patient_courses'
};

const TABLE_COLUMNS = {
  patients: [
    'id', 'prefix', 'first_name', 'last_name', 'name', 'nickname', 'id_card', 'phone', 
    'gender', 'dob', 'age', 'blood_group', 'religion', 'nationality', 'ethnicity', 'occupation',
    'address', 'moo', 'sub_district', 'district', 'province', 'zipcode', 'road',
    'em_name', 'em_phone', 'em_relation', 'em_address',
    'allergies', 'drug_allergy', 'underlying_disease', 'medical_history', 'chief_complaint',
    'pdpa_status', 'pdpa_token', 'pdpa_expires', 'pdpa_timestamp', 'pdpa_ip_address', 'pdpa_user_agent',
    'is_consent_marketing', 'is_consent_review',
    'informed_consent_status', 'informed_consent_timestamp', 'informed_consent_ip_address', 'informed_consent_user_agent',
    'informed_consent_signer_type', 'informed_consent_representative_name', 'informed_consent_representative_relation',
    'informed_consent_risk_agreed', 'informed_consent_voluntary_agreed', 'informed_consent_signature_url', 'informed_consent_doc_id',
    'branch_id', 'created_at', 'updated_at', 'is_deleted'
  ],
  patient_courses: [
    'id', 'patient_id', 'patient_name', 'product_id', 'course_name', 
    'total_sessions', 'used_sessions', 'remaining_sessions', 'price', 
    'pos_transaction_id', 'receipt_no', 'branch_id', 'status', 
    'is_shareable', 'shared_patient_ids', 'expire_date', 'notes', 
    'purchased_at', 'created_at', 'updated_at', 'is_deleted'
  ],
  treatments: ['id', 'patient_id', 'datetime', 'date', 'time', 'doctor', 'chief_complaint', 'diagnosis', 'treatment_detail', 'prescription', 'vital_signs', 'attachments', 'cost', 'branch_id', 'med_cert_number', 'created_at', 'updated_at', 'is_deleted'],
  branches: ['id', 'name', 'clinic_reg_name', 'clinic_license', 'clinic_tax', 'address', 'phone', 'email', 'manager', 'logo', 'rooms', 'is_active', 'status', 'created_at', 'updated_at', 'is_deleted'],
  queue: ['id', 'hn', 'patient_name', 'phone', 'raw_date_time', 'doctor', 'service', 'reason', 'status', 'branch_id', 'notes', 'treated', 'created_at', 'updated_at', 'is_deleted'],
  pos_transactions: [
    'id', 'receipt_no', 'hn', 'patient_name', 'branch_id', 'branch_name', 
    'total_amount', 'discount', 'net_amount', 'payment_method', 'items', 
    'staff_name', 'staff_id', 'staff_commission',
    'doctor_id', 'doctor_name', 'doctor_commission',
    'seller_id', 'seller_name', 'seller_commission',
    'date', 'time', 'status', 'transaction_type', 'created_at', 'updated_at', 'is_deleted'
  ],
  inventory: ['id', 'code', 'name', 'category', 'unit', 'cost_price', 'selling_price', 'stock_quantity', 'min_stock', 'lot_no', 'expire_date', 'receive_date', 'branch_id', 'created_at', 'updated_at', 'is_deleted'],
  inventory_logs: ['id', 'item_id', 'item_name', 'change_type', 'quantity', 'staff_name', 'notes', 'created_at', 'updated_at', 'lot_no', 'expire_date', 'receive_date', 'product_id', 'branch_id', 'type', 'amount', 'balance', 'reason'],
  setting_pos: ['id', 'code', 'name', 'category', 'price', 'unit', 'icon', 'stock_managed', 'is_course', 'course_sessions', 'min_stock', 'is_vatable', 'is_active', 'created_at', 'updated_at', 'is_deleted'],
  finance_revenue: ['id', 'date', 'amount', 'category', 'description', 'branch_id', 'items', 'subtotal', 'discount_value', 'discount_type', 'discount_amount', 'tax_mode', 'vat_rate', 'vat_amount', 'method', 'status', 'is_auto', 'patient_id', 'patient_name', 'created_at', 'updated_at', 'is_deleted'],
  finance_expenses: ['id', 'date', 'amount', 'category', 'description', 'branch_id', 'items', 'subtotal', 'discount_value', 'discount_type', 'discount_amount', 'tax_mode', 'vat_rate', 'vat_amount', 'method', 'status', 'is_auto', 'patient_id', 'patient_name', 'created_at', 'updated_at', 'is_deleted'],
  staff: [
    'id', 'emp_code', 'username', 'password', 'prefix', 'first_name', 'last_name', 'name', 
    'role', 'category', 'position', 'phone', 'email', 'id_card', 'license_number', 'dob', 'gender', 
    'nationality', 'ethnicity', 'religion', 
    'address', 'moo', 'road', 'sub_district', 'district', 'province', 'zipcode', 
    'cur_address', 'cur_moo', 'cur_road', 'cur_sub_district', 'cur_district', 'cur_province', 'cur_zipcode', 
    'em_name', 'em_relation', 'em_phone', 'em_address', 
    'salary', 'base_salary', 'employment_type', 
    'df_rate', 'df_type', 'df_condition', 'df_threshold',
    'commission_rate', 'commission_type', 'commission_condition', 'commission_threshold', 
    'ot_rate', 'branch_id', 'photo', 'schedule', 'is_active', 'created_at', 'updated_at'
  ],
  staff_schedules: ['id', 'staff_id', 'staff_name', 'date', 'day_of_week', 'shift_type', 'start_time', 'end_time', 'is_active', 'branch_id', 'notes', 'created_at', 'updated_at'],
  settings: ['id', 'values', 'labels', 'created_at', 'updated_at'],
  logs: ['id', 'user_name', 'user_id', 'role', 'action', 'target_sheet', 'target_data_id', 'detail', 'created_at']
};

const getTableName = (sheetName) => TABLE_MAP[sheetName] || sheetName.toLowerCase();

export const parseBool = (val) => {
  if (val === true || val === 1 || val === '1') return true;
  if (val === false || val === 0 || val === '0' || val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 't' || s === 'yes' || s === '1';
  }
  return Boolean(val);
};

export function rowToJS(row) {
  if (!row) return null;
  const jsObj = { ...row };
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) continue;
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    jsObj[camelKey] = val;
  }
  if (row.category || row.type) {
    const catVal = row.category || row.type;
    jsObj.category = catVal;
    jsObj.type = catVal;
  }
  if (row.stock_managed !== undefined || row.stockManaged !== undefined) {
    jsObj.stockManaged = parseBool(row.stock_managed ?? row.stockManaged);
    jsObj.stock_managed = jsObj.stockManaged;
  }
  if (row.is_course !== undefined || row.isCourse !== undefined) {
    jsObj.isCourse = parseBool(row.is_course ?? row.isCourse);
    jsObj.is_course = jsObj.isCourse;
  }
  if (row.is_active !== undefined || row.isActive !== undefined) {
    jsObj.isActive = parseBool(row.is_active ?? row.isActive);
    jsObj.is_active = jsObj.isActive;
  }
  if (row.is_deleted !== undefined || row.isDeleted !== undefined) {
    jsObj.isDeleted = parseBool(row.is_deleted ?? row.isDeleted);
    jsObj.is_deleted = jsObj.isDeleted;
  }
  if (row.course_sessions !== undefined || row.courseSessions !== undefined) {
    jsObj.courseSessions = Number((row.course_sessions ?? row.courseSessions) || 1);
  }
  if (row.min_stock !== undefined || row.minStock !== undefined) {
    jsObj.minStock = Number((row.min_stock ?? row.minStock) || 0);
  }
  if (row.stock_quantity !== undefined || row.stockQuantity !== undefined || row.quantity !== undefined) {
    const qty = Number((row.stock_quantity ?? row.stockQuantity ?? row.quantity) || 0);
    jsObj.stockQuantity = qty;
    jsObj.quantity = qty;
    jsObj.stock_quantity = qty;
  }
  if (row.is_vatable !== undefined || row.isVatable !== undefined) {
    jsObj.isVatable = parseBool(row.is_vatable ?? row.isVatable);
    jsObj.is_vatable = jsObj.isVatable;
  }
  if (row.icon) {
    jsObj.icon = row.icon;
  }
  if (row.code || row.product_id || row.productId || row.item_id || row.itemId) {
    const pId = String(row.productId || row.product_id || row.itemId || row.item_id || row.code || '').trim();
    jsObj.productId = pId;
    jsObj.itemId = pId;
    jsObj.code = pId;
  }
  if (row.item_name || row.product_name || row.productName) {
    const pName = String(row.productName || row.product_name || row.item_name || '').trim();
    jsObj.productName = pName;
    jsObj.itemName = pName;
  }
  if (row.change_type || row.type) {
    const tVal = String(row.change_type || row.type || '').trim();
    jsObj.type = tVal;
    jsObj.changeType = tVal;
    jsObj.change_type = tVal;
  }
  if (row.notes || row.reason) {
    const rVal = String(row.reason || row.notes || '').trim();
    jsObj.reason = rVal;
    jsObj.notes = rVal;
  }
  if (row.created_at || row.timestamp) {
    const ts = row.created_at || row.timestamp;
    jsObj.created_at = ts;
    jsObj.timestamp = ts;
  }
  if (row.lot_no !== undefined || row.lotNo !== undefined) {
    const val = row.lot_no ?? row.lotNo ?? '';
    jsObj.lotNo = val;
    jsObj.lot_no = val;
  }
  if (row.expire_date !== undefined || row.expireDate !== undefined) {
    const val = row.expire_date ?? row.expireDate ?? '';
    jsObj.expireDate = val;
    jsObj.expire_date = val;
  }
  if (row.total_sessions !== undefined || row.totalSessions !== undefined) {
    jsObj.totalSessions = Number(row.total_sessions ?? row.totalSessions ?? 1);
    jsObj.total_sessions = jsObj.totalSessions;
  }
  if (row.used_sessions !== undefined || row.usedSessions !== undefined) {
    jsObj.usedSessions = Number(row.used_sessions ?? row.usedSessions ?? 0);
    jsObj.used_sessions = jsObj.usedSessions;
  }
  if (row.remaining_sessions !== undefined || row.remainingSessions !== undefined) {
    jsObj.remainingSessions = Number(row.remaining_sessions ?? row.remainingSessions ?? 0);
    jsObj.remaining_sessions = jsObj.remainingSessions;
  }
  if (row.is_shareable !== undefined || row.isShareable !== undefined) {
    jsObj.isShareable = parseBool(row.is_shareable ?? row.isShareable ?? true);
    jsObj.is_shareable = jsObj.isShareable;
  }
  if (row.shared_patient_ids !== undefined || row.sharedPatientIds !== undefined) {
    let sIds = row.shared_patient_ids ?? row.sharedPatientIds;
    if (typeof sIds === 'string') {
      try { sIds = JSON.parse(sIds); } catch(e) { sIds = []; }
    }
    jsObj.sharedPatientIds = Array.isArray(sIds) ? sIds : [];
    jsObj.shared_patient_ids = jsObj.sharedPatientIds;
  }
  if (row.course_name || row.courseName) {
    jsObj.courseName = row.course_name || row.courseName;
    jsObj.course_name = jsObj.courseName;
  }
  if (row.patient_id || row.patientId) {
    jsObj.patientId = row.patient_id || row.patientId;
    jsObj.patient_id = jsObj.patientId;
  }
  if (row.purchased_at || row.purchasedAt) {
    jsObj.purchasedAt = row.purchased_at || row.purchasedAt;
    jsObj.purchased_at = jsObj.purchasedAt;
  }
  if (row.transaction_type !== undefined || row.transactionType !== undefined) {
    jsObj.transactionType = String(row.transaction_type ?? row.transactionType ?? 'sale');
    jsObj.transaction_type = jsObj.transactionType;
  }

  if (row.receive_date !== undefined || row.receiveDate !== undefined) {
    const val = row.receive_date ?? row.receiveDate ?? '';
    jsObj.receiveDate = val;
    jsObj.receive_date = val;
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
  if (row.raw_date_time || row.deal_status || row.patient_name || row.is_treated !== undefined || row.treated !== undefined) {
    if (row.treated !== undefined) jsObj.treated = Boolean(row.treated);
    else if (row.is_treated !== undefined) jsObj.treated = Boolean(row.is_treated);
    else if (row.status === 'treated' || row.status === 'completed' || row.deal_status === 'completed') jsObj.treated = true;
    else jsObj.treated = false;
  }

  // Robust Staff DF & Commission Mappings (ทั้ง camelCase และ snake_case ซิงค์ตรงกัน 100%)
  if (row.df_rate !== undefined || row.dfRate !== undefined) {
    const v = Number((row.dfRate !== undefined ? row.dfRate : row.df_rate) || 0);
    jsObj.dfRate = v;
    jsObj.df_rate = v;
  }
  if (row.df_type !== undefined || row.dfType !== undefined) {
    const v = String((row.dfType !== undefined ? row.dfType : row.df_type) || 'percent');
    jsObj.dfType = v;
    jsObj.df_type = v;
  }
  if (row.df_condition !== undefined || row.dfCondition !== undefined) {
    const v = String((row.dfCondition !== undefined ? row.dfCondition : row.df_condition) || 'all');
    jsObj.dfCondition = v;
    jsObj.df_condition = v;
  }
  if (row.df_threshold !== undefined || row.dfThreshold !== undefined) {
    const v = Number((row.dfThreshold !== undefined ? row.dfThreshold : row.df_threshold) || 0);
    jsObj.dfThreshold = v;
    jsObj.df_threshold = v;
  }
  if (row.commission_rate !== undefined || row.commissionRate !== undefined) {
    const v = Number((row.commissionRate !== undefined ? row.commissionRate : row.commission_rate) || 0);
    jsObj.commissionRate = v;
    jsObj.commission_rate = v;
  }
  if (row.commission_type !== undefined || row.commissionType !== undefined) {
    const v = String((row.commissionType !== undefined ? row.commissionType : row.commission_type) || 'percent');
    jsObj.commissionType = v;
    jsObj.commission_type = v;
  }
  if (row.commission_condition !== undefined || row.commissionCondition !== undefined) {
    const v = String((row.commissionCondition !== undefined ? row.commissionCondition : row.commission_condition) || 'all');
    jsObj.commissionCondition = v;
    jsObj.commission_condition = v;
  }
  if (row.commission_threshold !== undefined || row.commissionThreshold !== undefined) {
    const v = Number((row.commissionThreshold !== undefined ? row.commissionThreshold : row.commission_threshold) || 0);
    jsObj.commissionThreshold = v;
    jsObj.commission_threshold = v;
  }
  if (row.base_salary !== undefined || row.baseSalary !== undefined) {
    const v = Number((row.baseSalary !== undefined ? row.baseSalary : row.base_salary) || 0);
    jsObj.baseSalary = v;
    jsObj.base_salary = v;
  }
  if (row.ot_rate !== undefined || row.otRate !== undefined) {
    const v = Number((row.otRate !== undefined ? row.otRate : row.ot_rate) || 0);
    jsObj.otRate = v;
    jsObj.ot_rate = v;
  }

  return jsObj;
}

export function jsToRow(payload, tableName = '') {
  if (!payload) return {};
  
  const recordId = String(payload.id || payload.hn || payload.username || `REC_${Date.now()}`);

  const rawRow = {
    id: recordId,
    updated_at: new Date().toISOString()
  };

  // อัปเดตคอลัมน์ camelCase ทั้งหมดให้กลายเป็น snake_case อัตโนมัติสำหรับตาราง PostgreSQL
  for (const [key, val] of Object.entries(payload)) {
    if (val === null || val === undefined) continue;
    if (key === 'data' || key === 'updatedBy' || key === 'updatedById' || key === 'opdRecords') continue;
    
    // ป้องกันไม่ให้คอลัมน์แบบ snake_case ตัวเก่าใน payload มาเขียนทับค่าใหม่ที่เพิ่งแก้ไขใน camelCase
    if (key.includes('_')) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (camelKey !== key && payload[camelKey] !== undefined) {
        continue;
      }
    }

    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // ตรวจสอบว่าคอลัมน์นี้มีอยู่ในโครงสร้าง TABLE_COLUMNS หรือไม่
    // ถ้าย้ายมาใช้ Supabase จะต้องมีคอลัมน์จริงๆ ในตาราง ถึงจะอนุญาตให้ insert ได้
    const allowedColumns = TABLE_COLUMNS[tableName] || [];
    if (allowedColumns.length > 0 && !allowedColumns.includes(snakeKey)) {
        continue; 
    }

    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || typeof val === 'object') {
      rawRow[snakeKey] = val;
    }
  }

  if (tableName === 'queue' || tableName === 'Queue') {
    if (payload.treated !== undefined) {
      const isTr = Boolean(payload.treated);
      rawRow.status = isTr ? 'completed' : 'pending';
      rawRow.deal_status = isTr ? 'completed' : 'pending';
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

    if (payload.status !== undefined) {
      rawRow.status = String(payload.status || 'completed');
    }
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
  if (payload.type || payload.category) {
    const catVal = String(payload.category || payload.type || '').trim();
    rawRow.category = catVal;
  }
  if (payload.stockManaged !== undefined || payload.stock_managed !== undefined) {
    rawRow.stock_managed = parseBool(payload.stockManaged ?? payload.stock_managed);
  }
  if (payload.isCourse !== undefined || payload.is_course !== undefined) {
    rawRow.is_course = parseBool(payload.isCourse ?? payload.is_course);
  }
  if (payload.isActive !== undefined || payload.is_active !== undefined) {
    rawRow.is_active = parseBool(payload.isActive ?? payload.is_active);
  }
  if (payload.isDeleted !== undefined || payload.is_deleted !== undefined) {
    rawRow.is_deleted = parseBool(payload.isDeleted ?? payload.is_deleted);
  }
  if (payload.courseSessions !== undefined || payload.course_sessions !== undefined) {
    rawRow.course_sessions = Number((payload.courseSessions ?? payload.course_sessions) || 1);
  }
  if (payload.minStock !== undefined || payload.min_stock !== undefined) {
    rawRow.min_stock = Number((payload.minStock ?? payload.min_stock) || 0);
  }
  if (payload.quantity !== undefined || payload.stockQuantity !== undefined || payload.stock_quantity !== undefined) {
    rawRow.stock_quantity = Number((payload.stockQuantity ?? payload.quantity ?? payload.stock_quantity) || 0);
  }
  if (payload.code || payload.productId || payload.product_id || payload.itemId || payload.item_id) {
    const pId = String(payload.code || payload.productId || payload.product_id || payload.itemId || payload.item_id || '').trim();
    rawRow.code = pId;
    rawRow.item_id = pId;
    rawRow.product_id = pId;
  }
  if (payload.productName || payload.product_name || payload.itemName || payload.item_name) {
    const pName = String(payload.productName || payload.product_name || payload.itemName || payload.item_name || '').trim();
    rawRow.item_name = pName;
  }
  if (payload.changeType || payload.change_type || payload.type) {
    const cType = String(payload.change_type || payload.changeType || payload.type || '').trim();
    rawRow.change_type = cType;
    rawRow.type = cType;
  }
  if (payload.notes || payload.note || payload.reason) {
    const noteVal = String(payload.notes || payload.note || payload.reason || '').trim();
    rawRow.notes = noteVal;
    rawRow.reason = noteVal;
  }
  if (payload.amount !== undefined || payload.quantity !== undefined || payload.balance !== undefined) {
    const amt = Number((payload.amount ?? payload.quantity) || 0);
    const qty = Number((payload.quantity ?? payload.amount) || 0);
    rawRow.amount = amt;
    rawRow.quantity = qty;
    rawRow.balance = Number(payload.balance || 0);
  }
  if (payload.staffName || payload.staff_name) {
    rawRow.staff_name = String(payload.staffName || payload.staff_name || '');
  }
  if (payload.lotNo !== undefined || payload.lot_no !== undefined) {
    rawRow.lot_no = String(payload.lotNo ?? payload.lot_no ?? '');
  }
  if (payload.expireDate !== undefined || payload.expire_date !== undefined) {
    const rawExp = (payload.expireDate !== undefined ? payload.expireDate : payload.expire_date);
    rawRow.expire_date = (rawExp && String(rawExp).trim()) ? String(rawExp).trim() : null;
  }
  if (payload.receiveDate !== undefined || payload.receive_date !== undefined) {
    const rawRec = (payload.receiveDate !== undefined ? payload.receiveDate : payload.receive_date);
    rawRow.receive_date = (rawRec && String(rawRec).trim()) ? String(rawRec).trim() : null;
  }
  if (payload.isVatable !== undefined || payload.is_vatable !== undefined) {
    rawRow.is_vatable = Boolean(payload.isVatable ?? payload.is_vatable);
  }
  if (payload.icon !== undefined) {
    rawRow.icon = String(payload.icon);
  }

  if (payload.schedule !== undefined) rawRow.schedule = payload.schedule;

  if (payload.totalSessions !== undefined || payload.total_sessions !== undefined) rawRow.total_sessions = Number(payload.totalSessions ?? payload.total_sessions ?? 1);
  if (payload.usedSessions !== undefined || payload.used_sessions !== undefined) rawRow.used_sessions = Number(payload.usedSessions ?? payload.used_sessions ?? 0);
  if (payload.remainingSessions !== undefined || payload.remaining_sessions !== undefined) rawRow.remaining_sessions = Number(payload.remainingSessions ?? payload.remaining_sessions ?? 0);
  if (payload.isShareable !== undefined || payload.is_shareable !== undefined) rawRow.is_shareable = parseBool(payload.isShareable ?? payload.is_shareable);
  if (payload.sharedPatientIds !== undefined || payload.shared_patient_ids !== undefined) rawRow.shared_patient_ids = payload.sharedPatientIds ?? payload.shared_patient_ids;
  if (payload.courseName || payload.course_name) rawRow.course_name = String(payload.courseName || payload.course_name);
  if (payload.patientId || payload.patient_id) rawRow.patient_id = String(payload.patientId || payload.patient_id);
  if (payload.patientName || payload.patient_name) rawRow.patient_name = String(payload.patientName || payload.patient_name);
  if (payload.purchasedAt !== undefined || payload.purchased_at !== undefined) {
    const rawPur = (payload.purchasedAt !== undefined ? payload.purchasedAt : payload.purchased_at);
    rawRow.purchased_at = (rawPur && String(rawPur).trim()) ? String(rawPur).trim() : null;
  }
  if (payload.posTransactionId !== undefined || payload.pos_transaction_id !== undefined) {
    const rawPosId = (payload.posTransactionId !== undefined ? payload.posTransactionId : payload.pos_transaction_id);
    rawRow.pos_transaction_id = (rawPosId && String(rawPosId).trim()) ? String(rawPosId).trim() : null;
  }
  if (payload.receiptNo !== undefined || payload.receipt_no !== undefined) {
    const rawRc = (payload.receiptNo !== undefined ? payload.receiptNo : payload.receipt_no);
    rawRow.receipt_no = (rawRc && String(rawRc).trim()) ? String(rawRc).trim() : null;
  }
  if (payload.transactionType !== undefined || payload.transaction_type !== undefined) rawRow.transaction_type = String(payload.transactionType ?? payload.transaction_type);

  // Explicit Staff DF & Commission Mappings (camelCase ได้สิทธิ์ก่อนเสมอเพื่อป้องกันค่าเก่าใน snake_case มาทับ)
  if (payload.commissionRate !== undefined || payload.commission_rate !== undefined) {
    const v = Number((payload.commissionRate !== undefined ? payload.commissionRate : payload.commission_rate) || 0);
    rawRow.commission_rate = v;
  }
  if (payload.commissionType !== undefined || payload.commission_type !== undefined) {
    rawRow.commission_type = String(payload.commissionType || payload.commission_type || 'percent');
  }
  if (payload.commissionCondition !== undefined || payload.commission_condition !== undefined) {
    rawRow.commission_condition = String(payload.commissionCondition || payload.commission_condition || 'all');
  }
  if (payload.commissionThreshold !== undefined || payload.commission_threshold !== undefined) {
    rawRow.commission_threshold = Number(payload.commissionThreshold ?? payload.commission_threshold ?? 0);
  }
  if (payload.dfRate !== undefined || payload.df_rate !== undefined) {
    rawRow.df_rate = Number((payload.dfRate !== undefined ? payload.dfRate : payload.df_rate) || 0);
  }
  if (payload.dfType !== undefined || payload.df_type !== undefined) {
    rawRow.df_type = String(payload.dfType || payload.df_type || 'percent');
  }
  if (payload.dfCondition !== undefined || payload.df_condition !== undefined) {
    rawRow.df_condition = String(payload.dfCondition || payload.df_condition || 'all');
  }
  if (payload.dfThreshold !== undefined || payload.df_threshold !== undefined) {
    rawRow.df_threshold = Number(payload.dfThreshold ?? payload.df_threshold ?? 0);
  }
  if (payload.baseSalary !== undefined || payload.base_salary !== undefined) {
    rawRow.base_salary = Number((payload.baseSalary !== undefined ? payload.baseSalary : payload.base_salary) || 0);
  }
  if (payload.otRate !== undefined || payload.ot_rate !== undefined) {
    rawRow.ot_rate = Number((payload.otRate !== undefined ? payload.otRate : payload.ot_rate) || 0);
  }

  // Safe Numeric Mappings with camelCase precedence
  const numericKeyPairs = [
    ['salary', 'salary'],
    ['totalAmount', 'total_amount'],
    ['discount', 'discount'],
    ['netAmount', 'net_amount'],
    ['costPrice', 'cost_price'],
    ['sellingPrice', 'selling_price'],
    ['price', 'price'],
    ['age', 'age'],
    ['stockQuantity', 'stock_quantity'],
    ['minStock', 'min_stock'],
    ['totalSessions', 'total_sessions'],
    ['usedSessions', 'used_sessions'],
    ['remainingSessions', 'remaining_sessions']
  ];

  for (const [camelKey, snakeKey] of numericKeyPairs) {
    const rawVal = payload[camelKey] !== undefined ? payload[camelKey] : payload[snakeKey];
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const numVal = Number(String(rawVal).replace(/[^0-9.-]/g, ''));
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

  const dateCols = ['expire_date', 'receive_date', 'purchased_at', 'created_at', 'updated_at', 'dob', 'datetime', 'timestamp_date', 'pos_transaction_id', 'receipt_no', 'doctor_id', 'seller_id', 'staff_id'];

  const cleanRow = {};
  for (const key of Object.keys(rawRow)) {
    if (allowed.includes(key)) {
      let val = rawRow[key];
      if (dateCols.includes(key) && typeof val === 'string' && val.trim() === '') {
        val = null;
      }
      cleanRow[key] = val;
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

// Differential Sync Engine: ส่งข้อมูลจาก IndexedDB ขึ้นไปให้ Supabase เทียบ (Ingress ฟรี 100%)
// และรับกลับมาเฉพาะแถวที่มีการแก้ไขจริงหรือ ID ที่ถูกลบ (Egress แทบเป็น 0 Byte)
export async function differentialSyncTable(tableName, selectCols = '*', options = {}) {
  const { scopeFilterFn = null, customManifestQuery = null, scopeCol = null, scopeVal = null, scopeVals = null } = options;

  // 1. อ่านข้อมูลเดิมจาก IndexedDB ทันที และ Normalize ด้วย rowToJS (0ms, 0 Egress)
  const initialLocal = (await getLocalStore(tableName)).map(rowToJS);
  const currentLocalScoped = typeof scopeFilterFn === 'function' ? initialLocal.filter(scopeFilterFn) : initialLocal;

  if (!supabase) {
    return { status: 'success', data: currentLocalScoped, fromCache: true };
  }

  // 2. [Server-Side Reconcile] ส่งชุดข้อมูล { id, updated_at } จาก IndexedDB ขึ้นไปให้ Supabase ตรวจสอบ (Ingress = ฟรี 100%!)
  const clientManifest = currentLocalScoped.map(x => ({
    id: String(x.id || x.hn || x.username || '').trim(),
    updated_at: x.updated_at || x.updatedAt || x.created_at || null
  })).filter(x => x.id);

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('reconcile_sync', {
      p_table_name: tableName,
      p_client_items: clientManifest,
      p_scope_column: scopeCol || null,
      p_scope_value: scopeVal ? String(scopeVal) : null,
      p_scope_values: Array.isArray(scopeVals) && scopeVals.length > 0 ? scopeVals : null
    });

    if (!rpcErr) {
      if (rpcRes === null || (typeof rpcRes === 'object' && !rpcRes.deleted_ids && !rpcRes.updated_rows)) {
        // กรณีไม่มีอะไรเปลี่ยนแปลงเลย: ปล่อย IndexedDB ไว้อย่างเดิม ไม่ต้องแตะต้องอะไร (0 Bytes Egress!)
        await setLastSyncTime(tableName, new Date().toISOString());
        console.log(
          `%c⚡ [Differential Sync: ${tableName}]%c 🎯 100% In Sync (0 Byte Payload - No Egress Used! ✨)`,
          'color: #0284c7; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;',
          'color: #16a34a; font-weight: 600;'
        );
        return {
          status: 'success',
          data: currentLocalScoped,
          fetchedCount: 0,
          deletedCount: 0
        };
      }

      const deletedIds = Array.isArray(rpcRes.deleted_ids) ? rpcRes.deleted_ids : [];
      const updatedRows = Array.isArray(rpcRes.updated_rows) ? rpcRes.updated_rows : [];

      // ลบรายการที่ถูกลบออกจาก IndexedDB ทันที
      for (const delId of deletedIds) {
        await deleteFromLocalStore(tableName, delId, { broadcast: false });
      }

      // อัปเดตเฉพาะแถวที่มีการแก้ไขหรือเพิ่มใหม่
      if (updatedRows.length > 0) {
        const formatted = updatedRows.map(rowToJS).filter(x => !x.is_deleted && !x.isDeleted);
        await upsertLocalStore(tableName, formatted, { broadcast: false });
      }

      await setLastSyncTime(tableName, new Date().toISOString());

      const freshLocal = (await getLocalStore(tableName)).map(rowToJS);
      const finalData = typeof scopeFilterFn === 'function' ? freshLocal.filter(scopeFilterFn) : freshLocal;

      console.log(
        `%c⚡ [Differential Sync: ${tableName}]%c 🚀 Delta Updated!\n` +
        `📦 Local Items: ${clientManifest.length} | 🗑️ Deleted: ${deletedIds.length} | 🔄 Updated: ${updatedRows.length} | 💾 Egress: Delta (${updatedRows.length} rows)`,
        'color: #0284c7; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;',
        'color: #16a34a; font-weight: 600;'
      );

      return {
        status: 'success',
        data: finalData,
        fetchedCount: updatedRows.length,
        deletedCount: deletedIds.length
      };
    } else {
      console.warn(`[DiffSync RPC warning for ${tableName}]:`, rpcErr);
    }
  } catch (rpcEx) {
    console.warn(`[DiffSync RPC exception for ${tableName}]:`, rpcEx);
  }

  // 3. [Fallback] Client-Side Lightweight Manifest Check (กรณีที่ยังไม่ได้รัน SQL function บน Supabase)
  const hasDeletedCol = TABLE_COLUMNS[tableName]?.includes('is_deleted');
  const timeCol = TABLE_COLUMNS[tableName]?.includes('updated_at') ? 'updated_at' : 'created_at';
  const selectManifestCols = hasDeletedCol ? `id,${timeCol},is_deleted` : `id,${timeCol}`;

  let manifestQuery = customManifestQuery
    ? customManifestQuery(supabase.from(tableName))
    : supabase.from(tableName).select(selectManifestCols);

  let serverManifest = null;
  try {
    let { data: resData, error: manifestErr } = await manifestQuery;
    if (manifestErr) {
      let fbManifest = customManifestQuery
        ? customManifestQuery(supabase.from(tableName))
        : supabase.from(tableName).select(`id,${timeCol}`);
      let fbRes = await fbManifest;
      if (!fbRes.error && fbRes.data) {
        serverManifest = fbRes.data;
      }
    } else {
      serverManifest = resData;
    }
  } catch (err) {
    console.warn(`[DiffSync] Manifest network warning for ${tableName}:`, err);
  }

  if (!serverManifest) {
    return { status: 'success', data: currentLocalScoped, fromCache: true };
  }

  const { idsToFetch, deletedIds } = await diffLocalStore(tableName, serverManifest || [], scopeFilterFn);

  if (idsToFetch.length > 0) {
    const chunkSize = 100;
    const fetchedRows = [];
    for (let i = 0; i < idsToFetch.length; i += chunkSize) {
      const chunk = idsToFetch.slice(i, i + chunkSize);
      let { data: chunkData, error: chunkErr } = await supabase
        .from(tableName)
        .select(selectCols)
        .in('id', chunk);

      if (chunkErr) {
        const fbChunk = await supabase.from(tableName).select('*').in('id', chunk);
        if (!fbChunk.error && fbChunk.data) {
          chunkData = fbChunk.data;
          chunkErr = null;
        }
      }

      if (!chunkErr && chunkData) {
        fetchedRows.push(...chunkData);
      }
    }

    if (fetchedRows.length > 0) {
      const formatted = fetchedRows.map(rowToJS).filter(x => !x.is_deleted && !x.isDeleted);
      await upsertLocalStore(tableName, formatted, { broadcast: false });
    }
  }

  await setLastSyncTime(tableName, new Date().toISOString());

  const freshLocal = (await getLocalStore(tableName)).map(rowToJS);
  const finalData = typeof scopeFilterFn === 'function' ? freshLocal.filter(scopeFilterFn) : freshLocal;

  console.log(
    `%c⚡ [Differential Sync: ${tableName}]%c 📡 Client-Side Manifest Reconcile!\n` +
    `📦 Local Items: ${currentLocalScoped.length} | 🗑️ Deleted: ${deletedIds.length} | 🔄 Updated: ${idsToFetch.length}`,
    'color: #0284c7; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;',
    'color: #d97706; font-weight: 600;'
  );

  return {
    status: 'success',
    data: finalData,
    fetchedCount: idsToFetch.length,
    deletedCount: deletedIds.length
  };
}

export async function callSupabase(action, sheetName, payload = null) {
  if (!supabase) {
    throw new Error('Supabase client ยังไม่ได้ถูกตั้งค่า');
  }

  const tableName = getTableName(sheetName);

  switch (action) {
    case 'GET_DATA': {
      const selectCols = (TABLE_COLUMNS[tableName] || []).join(',') || '*';
      return await differentialSyncTable(tableName, selectCols);
    }

    case 'GET_DATA_BY_MONTH': {
      const selectCols = (TABLE_COLUMNS[tableName] || []).join(',') || '*';
      const year = payload?.year || new Date().getFullYear();
      const month = payload?.month || (new Date().getMonth() + 1);

      // ซิงค์คิวนัดหมายทั้งตารางในครั้งเดียว (Zero Waste Egress ~0.035 KB)
      await differentialSyncTable(tableName, selectCols);

      const localData = await getLocalStore(tableName);
      const filtered = localData.filter(item => {
        const d = parseItemDate(item);
        if (!d) return true;
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      });
      return { status: 'success', data: filtered };
    }

    case 'GET_TREATMENTS_BY_PATIENT': {
      const patientId = String(payload?.patientId || payload?.patient_id || payload?.hn || '').trim();
      if (!patientId) {
        return { status: 'success', data: [] };
      }

      const scopeFn = t => String(t.patient_id || t.patientId || t.hn || '').trim().toLowerCase() === patientId.toLowerCase();

      return await differentialSyncTable('treatments', '*', {
        scopeFilterFn: scopeFn,
        scopeCol: 'patient_id',
        scopeVal: patientId,
        customManifestQuery: query => query.select('id,updated_at,is_deleted').ilike('patient_id', patientId)
      });
    }

    case 'GET_PATIENTS_PAGINATED': {
      const selectCols = (TABLE_COLUMNS.patients || []).join(',') || '*';
      const offset = payload?.offset || 0;
      const limit = payload?.limit || 20;
      const search = (payload?.search || '').trim().toLowerCase();
      const sortKey = payload?.sortKey || 'created_at';
      const sortDir = payload?.sortDir || 'desc';

      // 1. ซิงค์ตารางคนไข้แบบ Differential Sync (Zero Egress Reconcile ~0.035 KB)
      await differentialSyncTable('patients', selectCols);

      let colSort = 'created_at';
      if (sortKey === 'id' || sortKey === 'hn') colSort = 'id';
      else if (sortKey === 'firstName' || sortKey === 'name') colSort = 'first_name';
      else if (sortKey === 'lastName') colSort = 'last_name';
      else if (sortKey === 'age' || sortKey === 'dob') colSort = 'dob';
      else if (sortKey === 'createdAt') colSort = 'created_at';

      const localPatients = (await getLocalStore('patients')) || [];
      let filtered = localPatients.filter(p => !p.is_deleted && !p.isDeleted);

      if (search) {
        filtered = filtered.filter(p => {
          const fn = String(p.first_name || p.firstName || '').toLowerCase();
          const ln = String(p.last_name || p.lastName || '').toLowerCase();
          const fullName = `${fn} ${ln}`.trim();
          const hn = String(p.id || p.hn || '').toLowerCase();
          const idCard = String(p.id_card || p.idCard || '').toLowerCase();
          const phone = String(p.phone || '').toLowerCase();
          const nick = String(p.nickname || '').toLowerCase();
          return fullName.includes(search) || hn.includes(search) || idCard.includes(search) || phone.includes(search) || nick.includes(search);
        });
      }

      filtered.sort((a, b) => {
        let valA = a[colSort] || a[sortKey] || '';
        let valB = b[colSort] || b[sortKey] || '';
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDir === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
        }
        return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });

      const pagedData = filtered.slice(offset, offset + limit);

      return { 
        status: 'success', 
        data: pagedData, 
        totalCount: filtered.length, 
        hasMore: (offset + limit) < filtered.length 
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
      const patientIds = payload?.patientIds || [];
      if (!Array.isArray(patientIds) || patientIds.length === 0) {
        return { status: 'success', data: [] };
      }

      const normPids = patientIds.map(id => String(id).trim().toLowerCase());
      const scopeFn = t => normPids.includes(String(t.patient_id || t.patientId || t.hn || '').trim().toLowerCase());

      return await differentialSyncTable('treatments', '*', {
        scopeFilterFn: scopeFn,
        scopeCol: 'patient_id',
        scopeVals: patientIds,
        customManifestQuery: query => query.select('id,updated_at,is_deleted,patient_id').in('patient_id', patientIds)
      });
    }

    case 'GET_TREATMENT_COUNTS': {
      try {
        const normalizeId = (str) => String(str || '').trim().toLowerCase().replace(/o/g, '0');
        const countsMap = {};

        // 1. อ่านจาก IndexedDB ก่อนเพื่อประหยัด Egress 100%
        try {
          const localTreatments = (await getLocalStore('treatments')) || [];
          localTreatments.forEach(row => {
            if (!row) return;
            if (row.is_deleted === true || row.is_deleted === 'true') return;
            const rawPid = String(row.patient_id || row.patientId || row.hn || '').trim();
            if (rawPid && rawPid !== '-' && rawPid !== 'null' && rawPid !== 'undefined') {
              const lowerPid = rawPid.toLowerCase();
              const normPid = normalizeId(rawPid);
              const currentCount = (countsMap[rawPid] || 0) + 1;
              countsMap[rawPid] = currentCount;
              countsMap[lowerPid] = currentCount;
              countsMap[normPid] = currentCount;
            }
          });
        } catch (e) {}

        // อ่านจาก LocalStorage ด้วย
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const saved = localStorage.getItem('clinic_treatment_counts');
            if (saved) {
              const parsed = JSON.parse(saved);
              Object.assign(countsMap, parsed);
            }
          } catch (e) {}
        }

        // หากมีข้อมูลแคชในเครื่องอยู่แล้ว คืนค่าได้ทันทีโดยไม่ต้องต่อ Supabase (0 Egress)
        if (Object.keys(countsMap).length > 0) {
          return { status: 'success', data: countsMap };
        }

        // 2. ดึงจาก Supabase เฉพาะเมื่อในเครื่องไม่มีแคชเลย (ดึงเบาๆ เฉพาะ patient_id)
        let data = null;
        const res = await supabase.from('treatments').select('patient_id');
        if (res.error) {
          const fbRes = await supabase.from('treatments').select('*');
          data = fbRes.data;
        } else {
          data = res.data;
        }

        (data || []).forEach(row => {
          if (!row) return;
          if (row.is_deleted === true || row.is_deleted === 'true') return;

          const rawPid = String(row.patient_id || row.patientId || row.hn || row.patient_hn || row.id || '').trim();
          if (rawPid && rawPid !== '-' && rawPid !== 'null' && rawPid !== 'undefined') {
            const lowerPid = rawPid.toLowerCase();
            const normPid = normalizeId(rawPid);

            const currentCount = (countsMap[rawPid] || 0) + 1;
            countsMap[rawPid] = currentCount;
            countsMap[lowerPid] = currentCount;
            countsMap[normPid] = currentCount;
          }
        });

        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem('clinic_treatment_counts', JSON.stringify(countsMap));
          } catch (e) {}
        }

        return { status: 'success', data: countsMap };
      } catch (err) {
        console.error("GET_TREATMENT_COUNTS exception:", err);
        return { status: 'success', data: {} };
      }
    }

    case 'GET_PATIENT_STATS': {
      try {
        const [
          resTotal,
          resMale,
          resFemale
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false'),
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('gender', 'ชาย').or('is_deleted.is.null,is_deleted.eq.false'),
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('gender', 'หญิง').or('is_deleted.is.null,is_deleted.eq.false')
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
          supabase.from('patients').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false'),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or(`raw_date_time.ilike.%${todayIso}%,raw_date_time.ilike.%${todayStr}%`),
          supabase.from('queue').select('*', { count: 'exact', head: true }).or('status.ilike.%pending%,status.ilike.%รอยืนยัน%,status.ilike.%รอ%'),
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
        const branchFilter = payload?.branch_id || payload?.branchId || 'all';
        const localQueue = (await getLocalStore('queue')) || [];

        const now = new Date();
        const dStr = String(now.getDate()).padStart(2, '0');
        const mStr = String(now.getMonth() + 1).padStart(2, '0');
        const yStr = String(now.getFullYear());
        const thaiYStr = String(now.getFullYear() + 543);
        const todayThaiStr = `${dStr}/${mStr}/${thaiYStr}`;
        const todayIsoStr = `${yStr}-${mStr}-${dStr}`;

        const targetBranch = String(branchFilter).toLowerCase();

        let todayCount = 0;
        let confirmed = 0;
        let pending = 0;
        let cancelled = 0;
        let total = 0;

        localQueue.forEach(item => {
          if (!item || item.is_deleted || item.isDeleted) return;
          const itemBranch = String(item.branch_id || item.branchId || '').toLowerCase();
          if (targetBranch !== 'all' && itemBranch && itemBranch !== 'all' && itemBranch !== targetBranch) {
            return; // Skip items belonging to a different branch
          }

          total++;

          const rawDt = String(item.raw_date_time || item.datetime || item.created_at || '');
          if (rawDt.includes(todayThaiStr) || rawDt.includes(todayIsoStr)) {
            todayCount++;
          }

          const st = String(item.status || '').toLowerCase();
          if (st === 'pending' || st === 'รอยืนยัน' || st.includes('pend') || (st.includes('ยืนยัน') && st.includes('รอ'))) {
            pending++;
          } else if (st === 'cancelled' || st === 'ยกเลิก' || st.includes('cancel')) {
            cancelled++;
          } else if (st === 'confirmed' || st === 'completed' || st === 'done' || st === 'ยืนยันแล้ว' || st.includes('confirm') || st.includes('ยืนยัน')) {
            confirmed++;
          } else {
            pending++;
          }
        });

        return {
          status: 'success',
          data: {
            total,
            todayCount,
            confirmed,
            completed: confirmed,
            pending,
            cancelled
          }
        };
      } catch (e) {
        console.error('GET_APPOINTMENT_STATS error:', e);
        return { status: 'error', data: null };
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

    case 'GET_REPORT_DOCUMENT_STATS': {
      try {
        const branchId = payload?.branchId || payload?.branch_id;
        
        let pQuery = supabase.from('patients').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false');
        let cQuery = supabase.from('patients').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').eq('informed_consent_status', 'green');
        let oQuery = supabase.from('treatments').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false');
        let mQuery = supabase.from('treatments').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').not('med_cert_number', 'is', null).neq('med_cert_number', '');
        let rQuery = supabase.from('pos_transactions').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').or('status.is.null,status.neq.cancelled');

        if (branchId && branchId !== 'all') {
          oQuery = oQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`);
          mQuery = mQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`);
          rQuery = rQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`);
        }

        const [
          resPatients,
          resConsent,
          resOpd,
          resMedCert,
          resReceipts
        ] = await Promise.all([
          pQuery, cQuery, oQuery, mQuery, rQuery
        ]);

        const records = resPatients.count || 0;
        const consents = resConsent.count || 0;
        const opds = resOpd.count || 0;
        const medcerts = resMedCert.count || 0;
        const receipts = resReceipts.count || 0;
        const total = records + opds + receipts + medcerts + consents;

        return {
          status: 'success',
          data: { total, records, opds, receipts, medcerts, consents }
        };
      } catch (e) {
        console.error('GET_REPORT_DOCUMENT_STATS error:', e);
        return { status: 'error', data: { total: 0, records: 0, opds: 0, receipts: 0, medcerts: 0, consents: 0 } };
      }
    }

    case 'GET_EXECUTIVE_SUMMARY': {
      try {
        const { startDate, endDate, branchId } = payload || {};

        // 1. เรียกใช้งาน RPC get_executive_dashboard_data บน Supabase โดยตรง (Single Source of Truth)
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('get_executive_dashboard_data', {
            start_date: startDate,
            end_date: endDate,
            branch_filter: branchId || 'all'
          });
          if (!rpcErr && rpcData && rpcData.summary) {
            const s = rpcData.summary;
            return {
              status: 'success',
              summary: {
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
                topProducts: rpcData.top_products || [],
                staffStats: rpcData.staff_stats || [],
                topDoctors: rpcData.top_doctors || [],
                branchSummary: rpcData.branch_summary || [],
                dailyTrend: rpcData.daily_trend || [],
                queueStats: rpcData.queue_stats || {}
              }
            };
          }
        } catch (rpcErr) {
          console.warn('RPC get_executive_dashboard_data fallback to query:', rpcErr);
        }

        let posQuery = supabase.from('pos_transactions').select('*');
        if (branchId && branchId !== 'all') posQuery = posQuery.eq('branch_id', branchId);

        let revQuery = supabase.from('finance_revenue').select('*');
        if (branchId && branchId !== 'all') revQuery = revQuery.eq('branch_id', branchId);

        let expQuery = supabase.from('finance_expenses').select('*');
        if (branchId && branchId !== 'all') expQuery = expQuery.eq('branch_id', branchId);

        let queueQuery = supabase.from('queue').select('*');
        if (branchId && branchId !== 'all') queueQuery = queueQuery.eq('branch_id', branchId);

        let patientQuery = supabase.from('patients').select('id, created_at');

        const [posRes, revRes, expRes, queueRes, patientRes] = await Promise.all([
          posQuery, revQuery, expQuery, queueQuery, patientQuery
        ]);

        const rawPosList = (posRes.data || []).map(rowToJS);
        const rawRevList = (revRes.data || []).map(rowToJS);
        const rawExpList = (expRes.data || []).map(rowToJS);
        const rawQueueList = (queueRes.data || []).map(rowToJS);
        const rawPatientList = patientRes.data || [];

        const parseToYMD = (dStr) => {
          if (!dStr) return null;
          const str = String(dStr).trim();
          // Check DD/MM/YYYY
          const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (ddmmyyyy) {
            let day = parseInt(ddmmyyyy[1], 10);
            let month = parseInt(ddmmyyyy[2], 10);
            let year = parseInt(ddmmyyyy[3], 10);
            if (year > 2400) year -= 543;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
          // Check YYYY-MM-DD
          const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (yyyymmdd) {
            let year = parseInt(yyyymmdd[1], 10);
            let month = parseInt(yyyymmdd[2], 10);
            let day = parseInt(yyyymmdd[3], 10);
            if (year > 2400) year -= 543;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
          try {
            const dt = new Date(str);
            if (!isNaN(dt.getTime())) {
              let year = dt.getFullYear();
              if (year > 2400) year -= 543;
              const m = String(dt.getMonth() + 1).padStart(2, '0');
              const d = String(dt.getDate()).padStart(2, '0');
              return `${year}-${m}-${d}`;
            }
          } catch(e) {}
          return null;
        };

        const isDateInRange = (dStr) => {
          if (!startDate || !endDate) return true;
          const ymd = parseToYMD(dStr);
          if (!ymd) return true;
          return ymd >= startDate && ymd <= endDate;
        };

        const posList = rawPosList.filter(tx => isDateInRange(tx.datetime || tx.timestamp || tx.date || tx.createdAt || tx.created_at));
        const revList = rawRevList.filter(tx => isDateInRange(tx.datetime || tx.timestamp || tx.date || tx.createdAt || tx.created_at));
        const expList = rawExpList.filter(tx => isDateInRange(tx.datetime || tx.timestamp || tx.date || tx.createdAt || tx.created_at));
        const queueList = rawQueueList.filter(q => isDateInRange(q.rawDateTime || q.raw_date_time || q.datetime || q.createdAt || q.created_at));
        const patientList = rawPatientList.filter(p => isDateInRange(p.created_at || p.createdAt));

        const getPosNetAmount = (tx) => {
          if (!tx) return 0;
          if (tx.net_amount !== undefined && tx.net_amount !== null && !isNaN(Number(tx.net_amount))) {
            return Number(tx.net_amount);
          }
          if (tx.netAmount !== undefined && tx.netAmount !== null && !isNaN(Number(tx.netAmount))) {
            return Number(tx.netAmount);
          }
          if (tx.grand_total !== undefined && tx.grand_total !== null && !isNaN(Number(tx.grand_total))) {
            return Number(tx.grand_total);
          }
          if (tx.grandTotal !== undefined && tx.grandTotal !== null && !isNaN(Number(tx.grandTotal))) {
            return Number(tx.grandTotal);
          }
          if (tx.amount !== undefined && tx.amount !== null && !isNaN(Number(tx.amount))) {
            return Number(tx.amount);
          }
          const total = Number(tx.total_amount ?? tx.totalAmount ?? tx.total ?? 0) || 0;
          const discount = Number(tx.discount ?? tx.discount_amount ?? tx.discountAmount ?? 0) || 0;
          return Math.max(0, total - discount);
        };

        let posTotalIncome = 0;
        let posCount = 0;
        const paymentMethods = { cash: 0, transfer: 0, card: 0, qr: 0, other: 0 };
        const productSales = {};

        posList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          posCount += 1;
          const net = getPosNetAmount(tx);
          posTotalIncome += net;

          const method = (tx.paymentMethod || tx.method || 'cash').toLowerCase();
          if (method.includes('cash') || method.includes('สด')) paymentMethods.cash += net;
          else if (method.includes('transfer') || method.includes('โอน') || method.includes('promptpay')) paymentMethods.transfer += net;
          else if (method.includes('card') || method.includes('เครดิต')) paymentMethods.card += net;
          else if (method.includes('qr')) paymentMethods.qr += net;
          else paymentMethods.other += net;

          let items = tx.items;
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch(e) { items = []; }
          }
          if (Array.isArray(items)) {
            items.forEach(it => {
              if (!it || !it.name) return;
              const name = it.name || it.productName || 'สินค้าทั่วไป';
              const itId = String(it.id || '');
              // ข้ามรายการที่เป็นการตัดคอร์ส / ตัดรอบ / หมายเหตุ / รายการฟรีที่ไม่มีราคา
              if (name.includes('ตัดรอบ') || name.includes('ตัดคอร์ส') || name.includes('หมายเหตุ') || itId.startsWith('REDEEM_')) return;
              if (Number(it.price || 0) === 0 && Number(it.total || 0) === 0) return;

              const qty = parseInt(it.quantity || it.qty || 1) || 1;
              const price = parseFloat(it.price || it.unitPrice || 0) || 0;
              let lineTotal = parseFloat(it.total !== undefined ? it.total : (qty * price)) || 0;
              if (net === 0) lineTotal = 0;

              if (!productSales[name]) {
                productSales[name] = { id: itId || name, name, qty: 0, total: 0 };
              }
              productSales[name].qty += qty;
              productSales[name].total += lineTotal;
            });
          }
        });

        let manualRevenueIncome = 0;
        revList.forEach(tx => {
          if (tx.status === 'cancelled' || tx.isAuto === true || tx.is_auto === true) return;
          const amt = parseFloat(tx.amount || 0) || 0;
          manualRevenueIncome += amt;

          const method = (tx.method || 'cash').toLowerCase();
          if (method.includes('cash') || method.includes('สด')) paymentMethods.cash += amt;
          else if (method.includes('transfer') || method.includes('โอน') || method.includes('promptpay')) paymentMethods.transfer += amt;
          else if (method.includes('card') || method.includes('เครดิต')) paymentMethods.card += amt;
          else if (method.includes('qr')) paymentMethods.qr += amt;
          else paymentMethods.other += amt;
        });

        const totalIncome = posTotalIncome + manualRevenueIncome;

        let totalExpense = 0;
        expList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          const amt = parseFloat(tx.amount || 0) || 0;
          totalExpense += amt;
        });

        const netProfit = totalIncome - totalExpense;
        const profitMargin = totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(2)) : 0;

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.total - a.total);

        const doctorCases = {};
        queueList.forEach(q => {
          const doc = q.doctor || 'ไม่ระบุแพทย์';
          if (!doctorCases[doc]) doctorCases[doc] = { name: doc, count: 0 };
          doctorCases[doc].count += 1;
        });
        const topDoctors = Object.values(doctorCases)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const queueStats = {
          total: queueList.length,
          completed: queueList.filter(q => q.status === 'completed' || q.status === 'treated' || q.treated === true).length,
          pending: queueList.filter(q => q.status === 'pending' || q.status === 'waiting').length,
          cancelled: queueList.filter(q => q.status === 'cancelled').length
        };

        const branchSummary = {};
        posList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          const bId = tx.branchId || tx.branch_id || 'main';
          const net = getPosNetAmount(tx);
          if (!branchSummary[bId]) branchSummary[bId] = { branchId: bId, income: 0, expense: 0, profit: 0 };
          branchSummary[bId].income += net;
        });
        revList.forEach(tx => {
          if (tx.status === 'cancelled' || tx.isAuto === true || tx.is_auto === true) return;
          const bId = tx.branchId || tx.branch_id || 'main';
          const amt = parseFloat(tx.amount || 0) || 0;
          if (!branchSummary[bId]) branchSummary[bId] = { branchId: bId, income: 0, expense: 0, profit: 0 };
          branchSummary[bId].income += amt;
        });
        expList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          const bId = tx.branchId || tx.branch_id || 'main';
          const amt = parseFloat(tx.amount || 0) || 0;
          if (!branchSummary[bId]) branchSummary[bId] = { branchId: bId, income: 0, expense: 0, profit: 0 };
          branchSummary[bId].expense += amt;
        });
        Object.keys(branchSummary).forEach(bId => {
          branchSummary[bId].profit = branchSummary[bId].income - branchSummary[bId].expense;
        });

        const dailyTrendMap = {};
        posList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          const dateStr = tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '');
          if (!dateStr) return;
          const net = getPosNetAmount(tx);
          if (!dailyTrendMap[dateStr]) dailyTrendMap[dateStr] = { date: dateStr, income: 0, expense: 0, profit: 0 };
          dailyTrendMap[dateStr].income += net;
        });
        revList.forEach(tx => {
          if (tx.status === 'cancelled' || tx.isAuto === true || tx.is_auto === true) return;
          const dateStr = tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '');
          if (!dateStr) return;
          const amt = parseFloat(tx.amount || 0) || 0;
          if (!dailyTrendMap[dateStr]) dailyTrendMap[dateStr] = { date: dateStr, income: 0, expense: 0, profit: 0 };
          dailyTrendMap[dateStr].income += amt;
        });
        expList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          const dateStr = tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '');
          if (!dateStr) return;
          const amt = parseFloat(tx.amount || 0) || 0;
          if (!dailyTrendMap[dateStr]) dailyTrendMap[dateStr] = { date: dateStr, income: 0, expense: 0, profit: 0 };
          dailyTrendMap[dateStr].expense += amt;
        });
        
        const dailyTrend = Object.values(dailyTrendMap).sort((a, b) => a.date.localeCompare(b.date));
        dailyTrend.forEach(d => { d.profit = d.income - d.expense; });

        return {
          status: 'success',
          summary: {
            totalIncome,
            posTotalIncome,
            manualRevenueIncome,
            totalExpense,
            netProfit,
            profitMargin,
            paymentMethods,
            topProducts,
            topDoctors,
            queueStats,
            posCount,
            checkoutsCount: posCount,
            newPatientsCount: patientList.length,
            branchSummary,
            dailyTrend
          }
        };
      } catch (e) {
        console.error('GET_EXECUTIVE_SUMMARY error:', e);
        return { status: 'error', message: e.message || String(e) };
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
      const { data: upsertData, error } = await supabase.from(tableName).upsert(row).select();
      if (error) {
        console.error("🔥 SUPABASE UPSERT ERROR:", error);
        throw error;
      }

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
              console.warn('Auth Sync Note: Backend could not sync to Supabase Auth automatically.');
            }
          })
          .catch(() => {});
        } catch (e) {}
      }

      const authoritativeRow = (upsertData && upsertData.length > 0) ? upsertData[0] : row;
      const savedJsRow = rowToJS(authoritativeRow);
      await upsertLocalStore(tableName, [savedJsRow]);
      await setLastSyncTime(tableName, new Date().toISOString());

      return { status: 'success', message: 'Data saved successfully', id: row.id, data: savedJsRow };
    }

    case 'DELETE_DATA': {
      const recordId = String(payload?.id || payload?.hn || payload?.username);
      if (!recordId) throw new Error('Missing ID for deletion');
      
      const nowIso = new Date().toISOString();

      // สั่งลบข้อมูลออกจาก Supabase DB โดยตรงเพื่อไม่ให้ค้างในฐานข้อมูล
      const { error: deleteErr } = await supabase.from(tableName).delete().eq('id', recordId);
      if (deleteErr) {
        console.warn(`Hard delete on ${tableName} failed (${deleteErr.message}). Performing soft delete fallback...`);
        await supabase.from(tableName).update({ is_deleted: true, updated_at: nowIso }).eq('id', recordId);
      }

      // ลบออกจาก IndexedDB ทันที 100%
      await deleteFromLocalStore(tableName, recordId);

      // หากเป็นการลบคนไข้ ให้ลบประวัติการรักษาทั้งหมดของคนไข้คนนี้ออกจาก IndexedDB ด้วย
      if (tableName === 'patients') {
        const localTreatments = (await getLocalStore('treatments')) || [];
        const normPid = recordId.trim().toLowerCase();
        const treatmentsToKeep = localTreatments.filter(t => {
          const pid = String(t.patient_id || t.patientId || t.hn || '').trim().toLowerCase();
          return pid !== normPid;
        });
        await replaceLocalStore('treatments', treatmentsToKeep, { broadcast: false });
      }

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
      // 1. ถ้ามีการตั้งค่า GOOGLE_SCRIPT_URL ที่เป็น Google Script ของจริง ให้ใช้ Google Drive เป็นหลัก
      if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.includes('script.google.com')) {
        try {
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
        } catch (err) {
          console.error("Google Drive upload failed:", err);
          throw new Error('การอัปโหลดไป Google Drive ล้มเหลว: ' + err.message);
        }
      }

      // 2. ถ้าไม่ได้ตั้งค่า Google Script ไว้ ให้ใช้ Supabase Storage แทน
      try {
        const { fileName, mimeType, data: base64Data } = payload;
        if (!fileName || !base64Data) throw new Error('ข้อมูลไฟล์ไม่ครบถ้วน');

        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: mimeType || 'image/png' });

        let bucketName = 'uploads';
        try {
          const { data: buckets } = await supabase.storage.listBuckets();
          if (buckets && buckets.length > 0) {
             const preferred = buckets.find(b => b.name === 'uploads' || b.name === 'images' || b.name === 'public');
             bucketName = preferred ? preferred.name : buckets[0].name;
          }
        } catch (e) {
          console.warn('Failed to list buckets', e);
        }

        const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `clinic_uploads/${Date.now()}_${safeFileName}`;

        const { data, error } = await supabase.storage.from(bucketName).upload(filePath, blob, {
          contentType: mimeType || 'image/png',
          upsert: true
        });

        if (error) throw new Error(error.message);

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        return { status: 'success', fileUrl: publicUrlData.publicUrl };
      } catch (err) {
        throw new Error(`อัปโหลดไฟล์ไป Supabase Storage ล้มเหลว: ${err.message}`);
      }
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
