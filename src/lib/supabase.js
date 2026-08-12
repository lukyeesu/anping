import { createClient } from '@supabase/supabase-js';
import { GOOGLE_SCRIPT_URL } from '../global/constants';
import { getLocalStore, upsertLocalStore, replaceLocalStore, getLastSyncTime, setLastSyncTime } from './offlineStore';

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
    'pdpa_status', 'pdpa_token', 'pdpa_expires', 'pdpa_timestamp', 'pdpa_ip_address', 'pdpa_user_agent',
    'is_consent_marketing', 'is_consent_review',
    'informed_consent_status', 'informed_consent_timestamp', 'informed_consent_ip_address', 'informed_consent_user_agent',
    'informed_consent_signer_type', 'informed_consent_representative_name', 'informed_consent_representative_relation',
    'informed_consent_risk_agreed', 'informed_consent_voluntary_agreed', 'informed_consent_signature_url', 'informed_consent_doc_id',
    'branch_id', 'created_at', 'updated_at', 'is_deleted'
  ],
  treatments: ['id', 'patient_id', 'datetime', 'date', 'time', 'doctor', 'chief_complaint', 'diagnosis', 'treatment_detail', 'prescription', 'vital_signs', 'attachments', 'cost', 'branch_id', 'med_cert_number', 'created_at', 'updated_at', 'is_deleted'],
  branches: ['id', 'name', 'clinic_reg_name', 'clinic_license', 'clinic_tax', 'address', 'phone', 'email', 'manager', 'logo', 'rooms', 'is_active', 'status', 'created_at', 'updated_at', 'is_deleted'],
  queue: ['id', 'hn', 'patient_name', 'phone', 'raw_date_time', 'doctor', 'service', 'reason', 'status', 'branch_id', 'notes', 'treated', 'created_at', 'updated_at', 'is_deleted'],
  pos_transactions: ['id', 'receipt_no', 'hn', 'patient_name', 'branch_id', 'branch_name', 'total_amount', 'discount', 'net_amount', 'payment_method', 'items', 'staff_name', 'date', 'time', 'status', 'created_at', 'updated_at', 'is_deleted'],
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
    jsObj.category = row.category || row.type;
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
    rawRow.expire_date = String(payload.expireDate ?? payload.expire_date ?? '');
  }
  if (payload.receiveDate !== undefined || payload.receive_date !== undefined) {
    rawRow.receive_date = String(payload.receiveDate ?? payload.receive_date ?? '');
  }
  if (payload.isVatable !== undefined || payload.is_vatable !== undefined) {
    rawRow.is_vatable = Boolean(payload.isVatable ?? payload.is_vatable);
  }
  if (payload.icon !== undefined) {
    rawRow.icon = String(payload.icon);
  }

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
      const isMasterConfigTable = ['setting_pos', 'branches', 'settings', 'staff', 'logs'].includes(tableName);
      const lastSync = isMasterConfigTable ? null : await getLastSyncTime(tableName);

      let query = supabase.from(tableName).select(selectCols);

      if (lastSync) {
        // ในกรณี Delta Sync ไม่ใส่ Filter is_deleted เพื่อให้ดึงรายการที่ถูกลบฝั่ง Server ในช่วงที่ปิดแอปกลับมาอัปเดตลบออกใน IndexedDB ด้วย
        if (tableName === 'inventory_logs' || tableName === 'logs') {
          query = query.gt('created_at', lastSync);
        } else {
          query = query.gt('updated_at', lastSync);
        }
      } else {
        if (TABLE_COLUMNS[tableName]?.includes('is_deleted')) {
          query = query.or('is_deleted.is.null,is_deleted.eq.false');
        }
        if (tableName === 'logs') query = query.order('created_at', { ascending: false }).limit(100);
        else if (tableName === 'inventory_logs') query = query.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'pos_transactions') query = query.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'finance_revenue' || tableName === 'finance_expenses') query = query.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'treatments') query = query.order('created_at', { ascending: false }).limit(1000);
      }

      let { data, error } = await query;

      if (error) {
        console.warn(`Query ${tableName} with explicit columns or delta query failed (${error.message}). Retrying fallback select('*')...`);
        let fallbackQuery = supabase.from(tableName).select('*');
        if (tableName === 'logs') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(100);
        else if (tableName === 'inventory_logs') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(200);
        else if (tableName === 'pos_transactions') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'finance_revenue' || tableName === 'finance_expenses') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(500);
        else if (tableName === 'treatments') fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(1000);
        
        const resFb = await fallbackQuery;
        if (resFb.data) {
          data = resFb.data;
        } else if (resFb.error && !lastSync) {
          console.error(`Fallback query for ${tableName} also failed:`, resFb.error.message);
          return { status: 'error', data: [], message: resFb.error.message };
        }
      }

      const formattedData = (data || []).map(rowToJS);
      const nowIso = new Date().toISOString();
      const hasSoftDelete = TABLE_COLUMNS[tableName]?.includes('is_deleted');

      if (lastSync) {
        if (formattedData.length > 0) {
          await upsertLocalStore(tableName, formattedData, { broadcast: false });
        }
        await setLastSyncTime(tableName, nowIso);
        const mergedLocalData = await getLocalStore(tableName);
        return { status: 'success', data: mergedLocalData };
      } else {
        await replaceLocalStore(tableName, formattedData, { broadcast: false });
        await setLastSyncTime(tableName, nowIso);
        const localData = await getLocalStore(tableName);
        const finalData = localData.length > 0 ? localData : formattedData;
        return { status: 'success', data: finalData };
      }
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
      const nowIso = new Date().toISOString();
      if (formattedData.length > 0) {
        await upsertLocalStore(tableName, formattedData, { broadcast: false });
        await setLastSyncTime(tableName, nowIso);
      }
      return { status: 'success', data: formattedData };
    }

    case 'GET_TREATMENTS_BY_PATIENT': {
      const patientId = String(payload?.patientId || payload?.patient_id || payload?.hn || '').trim();
      if (!patientId) {
        return { status: 'success', data: [] };
      }

      // 1. อ่านข้อมูลเดิมจาก IndexedDB ก่อนเพื่อความรวดเร็ว (Offline First)
      const localStoreTreatments = (await getLocalStore('treatments')) || [];
      const cachedForPatient = localStoreTreatments.filter(t => 
        t && String(t.patient_id || t.patientId || t.hn || '').trim().toLowerCase() === patientId.toLowerCase()
      );

      // 2. ดึงจาก Supabase DB ด้วย ilike ค้นหาครอบคลุมตัวพิมพ์เล็ก-ใหญ่
      let data = null;
      const { data: resData, error } = await supabase
        .from('treatments')
        .select('*')
        .ilike('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("GET_TREATMENTS_BY_PATIENT query warning:", error.message);
        const fbRes = await supabase.from('treatments').select('*').eq('patient_id', patientId);
        data = fbRes.data;
      } else {
        data = resData;
      }

      const formattedData = (data || []).map(rowToJS);
      const nowIso = new Date().toISOString();
      if (formattedData.length > 0) {
        await upsertLocalStore('treatments', formattedData, { broadcast: false });
        await setLastSyncTime('treatments', nowIso);
      }

      const finalTreatments = (formattedData && formattedData.length > 0) ? formattedData : cachedForPatient;
      return { status: 'success', data: finalTreatments };
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
      query = query.or('is_deleted.is.null,is_deleted.eq.false');

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,id.ilike.%${search}%,id_card.ilike.%${search}%,phone.ilike.%${search}%,nickname.ilike.%${search}%`);
      }

      query = query.order(colSort, { ascending: sortDir === 'asc' });
      query = query.range(offset, offset + limit - 1);

      let { data, count, error } = await query;

      if (error) {
        let fbQuery = supabase.from('patients').select('*', { count: 'exact' });
        fbQuery = fbQuery.or('is_deleted.is.null,is_deleted.eq.false');
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
      const nowIso = new Date().toISOString();

      if (formattedData.length > 0) {
        await upsertLocalStore('patients', formattedData, { broadcast: false });
        await setLastSyncTime('patients', nowIso);
      }

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
      const patientIds = payload?.patientIds || [];
      if (!Array.isArray(patientIds) || patientIds.length === 0) {
        return { status: 'success', data: [] };
      }

      const normPids = patientIds.map(id => String(id).trim().toLowerCase());
      
      // 1. อ่านจาก IndexedDB ก่อนเสมอ (ประหยัด Egress 100% บนการรีเฟรช!)
      const localStoreTreatments = (await getLocalStore('treatments')) || [];
      const cachedTx = localStoreTreatments.filter(t => {
        if (!t) return false;
        const pid = String(t.patient_id || t.patientId || t.hn || '').trim().toLowerCase();
        return normPids.includes(pid);
      });

      // หากมีข้อมูลอยู่ใน IndexedDB แล้ว ให้คืนค่าจาก IndexedDB ทันทีโดยไม่ต้องต่อ Supabase
      if (cachedTx.length > 0) {
        return { status: 'success', data: cachedTx };
      }

      // 2. ดึงจาก Supabase เฉพาะเมื่อใน IndexedDB ยังไม่มีข้อมูลของคนไข้กลุ่มนี้
      let { data, error } = await supabase
        .from('treatments')
        .select('*')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("GET_TREATMENTS_FOR_PATIENTS error:", error.message);
        return { status: 'success', data: cachedTx };
      }

      const formattedData = (data || []).map(rowToJS);
      if (formattedData.length > 0) {
        await upsertLocalStore('treatments', formattedData, { broadcast: false });
        await setLastSyncTime('treatments', new Date().toISOString());
      }
      return { status: 'success', data: formattedData };
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
        const branchFilter = params?.branch_id || params?.branchId || 'all';

        let query = supabase.from('queue').select('status, raw_date_time, created_at, branch_id');
        const { data, error } = await query;
        if (error || !data) {
          return { status: 'error', data: null };
        }

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

        data.forEach(item => {
          const itemBranch = String(item.branch_id || item.branchId || '').toLowerCase();
          if (targetBranch !== 'all' && itemBranch && itemBranch !== 'all' && itemBranch !== targetBranch) {
            return; // Skip items belonging to a different branch
          }

          total++;

          const rawDt = String(item.raw_date_time || item.created_at || '');
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

    case 'GET_EXECUTIVE_SUMMARY': {
      try {
        const { startDate, endDate, branchId } = payload || {};

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

        const isDateInRange = (dStr) => {
          if (!startDate || !endDate) return true;
          if (!dStr) return true;
          try {
            const dt = new Date(dStr);
            if (isNaN(dt.getTime())) return true;
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            const ymd = `${y}-${m}-${d}`;
            return ymd >= startDate && ymd <= endDate;
          } catch(e) {
            return true;
          }
        };

        const posList = rawPosList.filter(tx => isDateInRange(tx.date || tx.createdAt || tx.created_at));
        const revList = rawRevList.filter(tx => isDateInRange(tx.date || tx.createdAt || tx.created_at));
        const expList = rawExpList.filter(tx => isDateInRange(tx.date || tx.createdAt || tx.created_at));
        const queueList = rawQueueList.filter(q => isDateInRange(q.rawDateTime || q.raw_date_time || q.createdAt || q.created_at));
        const patientList = rawPatientList.filter(p => isDateInRange(p.created_at));

        let posTotalIncome = 0;
        const paymentMethods = { cash: 0, transfer: 0, card: 0, qr: 0, other: 0 };
        const productSales = {};

        posList.forEach(tx => {
          if (tx.status === 'cancelled') return;
          const net = parseFloat(tx.netAmount || tx.totalAmount || tx.netTotal || tx.grandTotal || tx.amount || 0) || 0;
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
              const name = it.name || it.productName || 'สินค้าทั่วไป';
              const qty = parseInt(it.quantity || it.qty || 1) || 1;
              const price = parseFloat(it.price || it.unitPrice || 0) || 0;
              const lineTotal = parseFloat(it.total || (qty * price)) || 0;

              if (!productSales[name]) {
                productSales[name] = { name, qty: 0, total: 0 };
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
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

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
          const net = parseFloat(tx.netAmount || tx.totalAmount || tx.amount || 0) || 0;
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
          const net = parseFloat(tx.netAmount || tx.totalAmount || tx.amount || 0) || 0;
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
      const { error } = await supabase.from(tableName).upsert(row);
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

      const savedJsRow = rowToJS(row);
      await upsertLocalStore(tableName, [savedJsRow]);
      await setLastSyncTime(tableName, new Date().toISOString());

      return { status: 'success', message: 'Data saved successfully', id: row.id, data: savedJsRow };
    }

    case 'DELETE_DATA': {
      const recordId = String(payload?.hn || payload?.id || payload?.username);
      if (!recordId) throw new Error('Missing ID for deletion');
      
      const nowIso = new Date().toISOString();

      // สั่งลบข้อมูลออกจาก Supabase DB โดยตรงเพื่อไม่ให้ค้างในฐานข้อมูล
      const { error: deleteErr } = await supabase.from(tableName).delete().eq('id', recordId);
      if (deleteErr) {
        console.warn(`Hard delete on ${tableName} failed (${deleteErr.message}). Performing soft delete fallback...`);
        await supabase.from(tableName).update({ is_deleted: true, updated_at: nowIso }).eq('id', recordId);
      }

      await upsertLocalStore(tableName, [{ id: recordId, is_deleted: true }]);

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
