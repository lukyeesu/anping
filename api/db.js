import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
  treatments: ['id', 'patient_id', 'datetime', 'date', 'time', 'doctor', 'chief_complaint', 'diagnosis', 'treatment_detail', 'prescription', 'vital_signs', 'attachments', 'cost', 'branch_id', 'created_at', 'updated_at', 'is_deleted'],
  branches: ['id', 'name', 'clinic_reg_name', 'clinic_license', 'clinic_tax', 'address', 'phone', 'email', 'manager', 'logo', 'rooms', 'is_active', 'status', 'created_at', 'updated_at', 'is_deleted'],
  queue: ['id', 'hn', 'patient_name', 'phone', 'raw_date_time', 'doctor', 'service', 'reason', 'status', 'branch_id', 'notes', 'treated', 'created_at', 'updated_at', 'is_deleted'],
  pos_transactions: ['id', 'receipt_no', 'hn', 'patient_name', 'branch_id', 'branch_name', 'total_amount', 'discount', 'net_amount', 'payment_method', 'items', 'staff_name', 'date', 'time', 'status', 'transaction_type', 'created_at', 'updated_at', 'is_deleted'],
  inventory: ['id', 'code', 'product_id', 'product_name', 'name', 'category', 'unit', 'cost_price', 'selling_price', 'stock_quantity', 'min_stock', 'lot_no', 'expire_date', 'receive_date', 'branch_id', 'created_at', 'updated_at', 'is_deleted'],
  inventory_logs: ['id', 'item_id', 'item_name', 'change_type', 'quantity', 'staff_name', 'notes', 'created_at', 'updated_at', 'lot_no', 'expire_date', 'receive_date', 'product_id', 'branch_id', 'type', 'amount', 'balance', 'reason'],
  setting_pos: ['id', 'code', 'name', 'category', 'price', 'unit', 'icon', 'stock_managed', 'is_course', 'course_sessions', 'min_stock', 'is_vatable', 'is_active', 'created_at', 'updated_at', 'is_deleted'],
  finance_revenue: ['id', 'date', 'amount', 'category', 'description', 'branch_id', 'items', 'subtotal', 'discount_value', 'discount_type', 'discount_amount', 'tax_mode', 'vat_rate', 'vat_amount', 'method', 'status', 'is_auto', 'patient_id', 'patient_name', 'created_at', 'updated_at', 'is_deleted'],
  finance_expenses: ['id', 'date', 'amount', 'category', 'description', 'branch_id', 'items', 'subtotal', 'discount_value', 'discount_type', 'discount_amount', 'tax_mode', 'vat_rate', 'vat_amount', 'method', 'status', 'is_auto', 'patient_id', 'patient_name', 'created_at', 'updated_at', 'is_deleted'],
  staff: [
    'id', 'emp_code', 'username', 'prefix', 'first_name', 'last_name', 'name', 
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

function getSupabaseAdmin() {
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mjgdafabuzguofknhxvv.supabase.co';
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uaARgpzqpsrsBLbTjLeVWw_ERbdwFwn';

  try {
    const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
    const matchKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    if (matchKey && matchKey[1]) {
      serviceRoleKey = matchKey[1].trim();
    }
  } catch (e) {}

  return (supabaseUrl && serviceRoleKey) ? createClient(supabaseUrl, serviceRoleKey) : null;
}

function rowToJS(row) {
  if (!row) return null;
  const jsObj = { ...row };
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) continue;
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    jsObj[camelKey] = val;
  }
  if (row.raw_date_time || row.deal_status || row.patient_name || row.is_treated !== undefined || row.treated !== undefined) {
    if (row.treated !== undefined) jsObj.treated = Boolean(row.treated);
    else if (row.is_treated !== undefined) jsObj.treated = Boolean(row.is_treated);
    else if (row.status === 'treated' || row.status === 'completed' || row.deal_status === 'completed') jsObj.treated = true;
    else jsObj.treated = false;
  }
  return jsObj;
}

function jsToRow(payload, tableName = '') {
  if (!payload) return {};
  const row = {};
  const allowedColumns = TABLE_COLUMNS[tableName] || [];
  
  for (const [key, val] of Object.entries(payload)) {
    if (key === 'updatedBy' || key === 'updatedById') continue;
    
    // ป้องกันไม่ให้คอลัมน์แบบ snake_case ตัวเก่าใน payload มาเขียนทับค่าใหม่ที่เพิ่งแก้ไขใน camelCase
    if (key.includes('_')) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (camelKey !== key && payload[camelKey] !== undefined) {
        continue;
      }
    }

    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    if (allowedColumns.length > 0 && !allowedColumns.includes(snakeKey)) {
        continue;
    }
    row[snakeKey] = val;
  }

  if (tableName === 'queue' || tableName === 'Queue') {
    if (payload.treated !== undefined) {
      const isTr = Boolean(payload.treated);
      row.status = isTr ? 'completed' : 'pending';
      row.deal_status = isTr ? 'completed' : 'pending';
    }
  }
  if (payload.id || payload.hn) {
    row.id = String(payload.id || payload.hn);
  }

  if (tableName === 'pos_transactions' || tableName === 'POS_Transactions') {
    if (payload.hn || payload.patientId) row.hn = String(payload.hn || payload.patientId);
    
    const rawTotal = payload.totalAmount ?? payload.subtotal ?? payload.grandTotal ?? payload.amount ?? payload.total ?? 0;
    const cleanTotal = parseFloat(String(rawTotal).replace(/,/g, '')) || 0;
    row.total_amount = cleanTotal;

    const rawNet = payload.netAmount ?? payload.netTotal ?? payload.grandTotal ?? payload.amount ?? 0;
    row.net_amount = parseFloat(String(rawNet).replace(/,/g, '')) || cleanTotal;

    const rawDiscount = payload.discountAmount ?? payload.discount ?? 0;
    row.discount = parseFloat(String(rawDiscount).replace(/,/g, '')) || 0;
  }

  if (tableName === 'finance_revenue' || tableName === 'finance_expenses') {
    if (payload.note !== undefined && payload.description === undefined) {
      row.description = String(payload.note || '');
    }
  }

  if (tableName !== 'logs' && tableName !== 'Logs' && tableName !== 'inventory_logs') {
    row.updated_at = new Date().toISOString();
  }
  return row;
}

/**
 * ฟังก์ชันซิงค์ข้อมูลพนักงานกับระบบ Supabase Auth (auth.users)
 */
async function syncStaffWithSupabaseAuth(client, payload, isDelete = false) {
  if (!client || !payload) return;
  try {
    const rawUser = String(payload.username || payload.empCode || payload.id || '').trim();
    if (!rawUser) return;

    const cleanUser = rawUser.includes('@') ? rawUser.split('@')[0] : rawUser;
    const cleanUserLower = cleanUser.toLowerCase();
    const email = payload.email && payload.email.includes('@') 
      ? payload.email 
      : `${cleanUserLower.replace(/[^a-z0-9._-]/g, '')}@anping.com`;

    if (!client.auth?.admin) {
      console.warn('Supabase Admin client not available for Auth sync');
      throw new Error('Supabase Admin client not available');
    }

    // ถ้าใช้ Anon Key จะดึงรายชื่อ Users ไม่ได้ (ติดสิทธิ์)
    const { data: userListData, error: listError } = await client.auth.admin.listUsers();
    if (listError) {
      console.error('Failed to list users (Missing Service Role Key?):', listError);
      throw listError;
    }

    const users = userListData?.users || [];
    const existingUser = users.find(u => 
      (u.email && u.email.toLowerCase() === email.toLowerCase()) || 
      (u.user_metadata?.username && String(u.user_metadata.username).toLowerCase() === cleanUserLower) || 
      String(u.user_metadata?.staffId).toLowerCase() === String(payload.id).toLowerCase() ||
      String(u.id).toLowerCase() === String(payload.id).toLowerCase()
    );

    if (isDelete) {
      if (existingUser) {
        await client.auth.admin.deleteUser(existingUser.id);
      }
      return;
    }

    const staffName = payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || cleanUser;
    const rawPass = payload.password ? String(payload.password).trim() : null;
    const formattedPass = rawPass;

    if (existingUser) {
      const updateData = {
        email: email,
        email_confirm: true,
        user_metadata: {
          staffId: payload.id,
          username: cleanUser,
          name: staffName,
          role: payload.role || 'staff',
          category: payload.category || 'staff',
          branchId: payload.branchId || 'b1'
        }
      };
      if (formattedPass) {
        updateData.password = formattedPass;
      }
      const { error: updateErr } = await client.auth.admin.updateUserById(existingUser.id, updateData);
      if (updateErr) throw updateErr;
    } else {
      const { error: createErr } = await client.auth.admin.createUser({
        email: email,
        password: formattedPass || '123456',
        email_confirm: true,
        user_metadata: {
          staffId: payload.id,
          username: cleanUser,
          name: staffName,
          role: payload.role || 'staff',
          category: payload.category || 'staff',
          branchId: payload.branchId || 'b1'
        }
      });
      if (createErr) throw createErr;
    }
  } catch (err) {
    console.error('Error syncing staff with Supabase Auth:', err);
    throw err;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Secure Database Proxy is Running');
  }

  const { action, sheetName, payload, token } = req.body || {};

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(200).json({ status: 'warning', message: 'Database admin client not configured' });
  }

  try {
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
      'Settings': 'settings',
      'Logs': 'logs'
    };

    const tableName = TABLE_MAP[sheetName] || (sheetName ? sheetName.toLowerCase() : '');

    switch (action) {
      case 'GET_PRINT_PAYLOAD': {
        const { printType, id } = payload || {};
        if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });

        if (printType === 'pos') {
          const { data: posRow } = await supabaseAdmin
            .from('pos_transactions')
            .select('*')
            .or(`id.eq.${id},receipt_no.eq.${id}`)
            .maybeSingle();

          let branches = [];
          let patient = null;
          let posProducts = [];

          if (posRow) {
            const [bRes, posProdRes] = await Promise.all([
              supabaseAdmin.from('branches').select('*'),
              supabaseAdmin.from('setting_pos').select('*')
            ]);
            branches = bRes.data || [];
            posProducts = (posProdRes.data || []).map(rowToJS);

            const targetHn = posRow.hn || posRow.patient_id;
            if (targetHn) {
              const { data: pRow } = await supabaseAdmin.from('patients').select('*').eq('id', targetHn).maybeSingle();
              if (pRow) patient = pRow;
            }
          }

          return res.status(200).json({
            status: 'success',
            posRow: posRow ? rowToJS(posRow) : null,
            branches,
            patient,
            posProducts
          });
        } else if (printType === 'opd') {
          const { data: pRow } = await supabaseAdmin
            .from('patients')
            .select('*')
            .or(`id.eq.${id},name.ilike.%${id}%`)
            .maybeSingle();

          let treatments = [];
          let branches = [];

          if (pRow) {
            const [trtRes, bRes] = await Promise.all([
              supabaseAdmin.from('treatments').select('*').eq('patient_id', pRow.id).order('created_at', { ascending: false }),
              supabaseAdmin.from('branches').select('*')
            ]);
            treatments = trtRes.data || [];
            branches = bRes.data || [];
          }

          return res.status(200).json({
            status: 'success',
            patient: pRow,
            treatments,
            branches
          });
        }

        return res.status(400).json({ status: 'error', message: 'Invalid printType' });
      }

      case 'GET_DATA': {
        const selectCols = (TABLE_COLUMNS[tableName] || []).join(',') || '*';
        const { data, error } = await supabaseAdmin.from(tableName).select(selectCols);
        if (error) throw error;
        const formattedData = (data || []).map(rowToJS);
        return res.status(200).json({ status: 'success', data: formattedData });
      }

      case 'SAVE_DATA': {
        if (!payload || (!payload.id && !payload.hn)) {
          return res.status(400).json({ status: 'error', message: 'ID is required' });
        }
        const recordId = String(payload.id || payload.hn);
        const row = jsToRow(payload, tableName);

        let upsertError = null;
        try {
          const { error } = await supabaseAdmin.from(tableName).upsert(row);
          if (error) upsertError = error;
        } catch (e) {
          upsertError = e;
        }

        if (sheetName === 'Staff') {
          // ข้าม upsertError สำหรับ Staff เพราะหน้าเว็บเซฟข้อมูลลงตารางไปแล้ว (ติด RLS จาก Anon Key ก็ไม่เป็นไร)
          // โฟกัสที่การซิงค์ข้อมูลลง Auth
          try {
            await syncStaffWithSupabaseAuth(supabaseAdmin, payload, false);
          } catch (e) {
            return res.status(200).json({ status: 'error', message: 'Auth Sync Failed: ' + (e.message || String(e)) });
          }
        } else if (upsertError) {
          throw upsertError;
        }

        return res.status(200).json({ status: 'success', message: 'Data saved successfully', id: recordId, data: payload });
      }

      case 'DELETE_DATA': {
        const recordId = String(payload?.id || payload?.hn);
        if (!recordId) return res.status(400).json({ status: 'error', message: 'ID required' });
        const { error } = await supabaseAdmin.from(tableName).delete().eq('id', recordId);
        if (error) throw error;

        if (sheetName === 'Staff') {
          await syncStaffWithSupabaseAuth(supabaseAdmin, payload, true);
        }

        return res.status(200).json({ status: 'success', message: 'Data deleted successfully' });
      }

      case 'GET_EXECUTIVE_SUMMARY': {
        const { startDate, endDate, branchId } = payload || {};
        
        let posQuery = supabaseAdmin.from('pos_transactions').select('*');
        if (branchId && branchId !== 'all') posQuery = posQuery.eq('branch_id', branchId);

        let revQuery = supabaseAdmin.from('finance_revenue').select('*');
        if (branchId && branchId !== 'all') revQuery = revQuery.eq('branch_id', branchId);

        let expQuery = supabaseAdmin.from('finance_expenses').select('*');
        if (branchId && branchId !== 'all') expQuery = expQuery.eq('branch_id', branchId);

        let queueQuery = supabaseAdmin.from('queue').select('*');
        if (branchId && branchId !== 'all') queueQuery = queueQuery.eq('branch_id', branchId);

        let patientQuery = supabaseAdmin.from('patients').select('id, created_at');

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

        return res.status(200).json({
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
        });
      }

      case 'GET_REPORT_DOCUMENT_STATS': {
        const branchId = payload?.branchId || payload?.branch_id;
        
        let pQuery = supabaseAdmin.from('patients').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false');
        let cQuery = supabaseAdmin.from('patients').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').eq('informed_consent_status', 'green');
        let oQuery = supabaseAdmin.from('treatments').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false');
        let mQuery = supabaseAdmin.from('treatments').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').not('med_cert_number', 'is', null).neq('med_cert_number', '');
        let rQuery = supabaseAdmin.from('pos_transactions').select('*', { count: 'exact', head: true }).or('is_deleted.is.null,is_deleted.eq.false').or('status.is.null,status.neq.cancelled');

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

        return res.status(200).json({
          status: 'success',
          data: { total, records, opds, receipts, medcerts, consents }
        });
      }

      case 'FORGOT_PASSWORD':
      case 'GENERATE_RESET_TOKEN': {
        const { staffId, username, email } = payload || {};
        if (!staffId && !username && !email) {
          return res.status(400).json({ status: 'error', message: 'Staff identifier is required' });
        }

        let staff = null;
        if (staffId) {
          const { data } = await supabaseAdmin.from('staff').select('id, name, first_name, last_name, username, email, role').eq('id', staffId);
          if (data && data[0]) staff = data[0];
        }
        if (!staff && username) {
          const { data } = await supabaseAdmin.from('staff').select('id, name, first_name, last_name, username, email, role').eq('username', username);
          if (data && data[0]) staff = data[0];
        }
        if (!staff && email) {
          const { data } = await supabaseAdmin.from('staff').select('id, name, first_name, last_name, username, email, role').eq('email', email);
          if (data && data[0]) staff = data[0];
        }
        if (!staff) {
          return res.status(404).json({ status: 'error', message: 'ไม่พบข้อมูลพนักงานในระบบ' });
        }

        const randomPart = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
        const token = `rst_${Date.now().toString(36)}_${randomPart}`;
        const expiresAt = Date.now() + (15 * 60 * 1000); // 15 นาที
        const staffName = staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.username;

        // บันทึก reset_token และ reset_token_expires_at ลงตาราง staff โดยตรง
        // การ update ค่าใหม่จะทับ token เก่าของพนักงานคนนี้ทันที (ทำให้ token เก่าหมดอายุโดยอัตโนมัติ และใช้ token ล่าสุดเสมอ)
        const { error: updateStaffErr } = await supabaseAdmin
          .from('staff')
          .update({
            reset_token: token,
            reset_token_expires_at: expiresAt
          })
          .eq('id', staff.id);

        if (updateStaffErr) {
          console.error('Update staff reset_token error:', updateStaffErr);
          if (String(updateStaffErr.message || '').includes('column') && String(updateStaffErr.message || '').includes('reset_token')) {
            return res.status(500).json({
              status: 'error',
              code: 'COLUMN_MISSING',
              message: 'ยังไม่ได้เพิ่มคอลัมน์ reset_token ในตาราง staff กรุณารันคำสั่ง SQL: ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token TEXT, ADD COLUMN IF NOT EXISTS reset_token_expires_at BIGINT;'
            });
          }
          throw updateStaffErr;
        }

        return res.status(200).json({
          status: 'success',
          token,
          expiresAt,
          staffName,
          username: staff.username,
          message: 'สร้างโทเค็นเปลี่ยนรหัสผ่านสำเร็จ (อายุ 15 นาที)'
        });
      }

      case 'VERIFY_RESET_TOKEN': {
        const { token } = payload || {};
        if (!token) {
          return res.status(400).json({ status: 'error', message: 'ไม่พบรหัสโทเค็น' });
        }

        // ค้นหาพนักงานจาก reset_token ในตาราง staff โดยตรง
        const { data: staffRows, error: staffErr } = await supabaseAdmin
          .from('staff')
          .select('id, name, first_name, last_name, username, email, reset_token_expires_at')
          .eq('reset_token', token);

        if (staffErr || !staffRows || staffRows.length === 0) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'ลิงก์รีเซ็ตรหัสผ่านนี้ไม่ถูกต้อง ถูกยกเลิกแล้ว (เนื่องจากมีการสร้างลิงก์ใหม่ล่าสุด) หรือถูกใช้งานไปแล้ว' 
          });
        }

        const staffData = staffRows[0];
        const now = Date.now();
        if (!staffData.reset_token_expires_at || now > Number(staffData.reset_token_expires_at)) {
          return res.status(400).json({ 
            status: 'error', 
            code: 'EXPIRED',
            message: 'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุแล้ว (มีอายุ 15 นาที) กรุณาติดต่อฝ่ายบุคคล (HR) เพื่อขอรับลิงก์ใหม่' 
          });
        }

        const staffName = staffData.name || `${staffData.first_name || ''} ${staffData.last_name || ''}`.trim() || staffData.username;

        return res.status(200).json({
          status: 'success',
          valid: true,
          staffName,
          username: staffData.username,
          expiresAt: staffData.reset_token_expires_at
        });
      }

      case 'CONFIRM_RESET_PASSWORD': {
        const { token, newPassword } = payload || {};
        if (!token || !newPassword) {
          return res.status(400).json({ status: 'error', message: 'กรุณาระบุข้อมูลรหัสผ่านใหม่' });
        }

        if (String(newPassword).length < 6) {
          return res.status(400).json({ status: 'error', message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        }

        // ค้นหาพนักงานจาก reset_token ในตาราง staff
        const { data: staffRows, error: staffErr } = await supabaseAdmin
          .from('staff')
          .select('id, name, first_name, last_name, username, email, reset_token_expires_at')
          .eq('reset_token', token);

        if (staffErr || !staffRows || staffRows.length === 0) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'ลิงก์รีเซ็ตรหัสผ่านนี้ไม่ถูกต้อง ถูกยกเลิกแล้ว (เนื่องจากมีการสร้างลิงก์ใหม่ล่าสุด) หรือถูกใช้งานไปแล้ว' 
          });
        }

        const staffData = staffRows[0];
        const now = Date.now();
        if (!staffData.reset_token_expires_at || now > Number(staffData.reset_token_expires_at)) {
          return res.status(400).json({ status: 'error', message: 'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุแล้ว (มีอายุ 15 นาที)' });
        }

        const staffId = staffData.id;
        const staffName = staffData.name || `${staffData.first_name || ''} ${staffData.last_name || ''}`.trim() || staffData.username;

        // 1. Update password in public.staff table และเคลียร์ reset_token / reset_token_expires_at ออก
        const { error: updateStaffErr } = await supabaseAdmin
          .from('staff')
          .update({ 
            password: String(newPassword).trim(),
            reset_token: null,
            reset_token_expires_at: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', staffId);

        if (updateStaffErr) {
          console.error('Update staff table error:', updateStaffErr);
          throw updateStaffErr;
        }

        // 2. Update password in Supabase Auth (auth.users)
        try {
          if (supabaseAdmin.auth?.admin) {
            const { data: userListData } = await supabaseAdmin.auth.admin.listUsers();
            const users = userListData?.users || [];
            
            const rawUser = String(tokenData.username || '').toLowerCase();
            const cleanUser = rawUser.includes('@') ? rawUser.split('@')[0] : rawUser;
            const staffEmail = (tokenData.email && tokenData.email.includes('@')) 
              ? tokenData.email.toLowerCase() 
              : `${cleanUser.replace(/[^a-z0-9._-]/g, '')}@anping.com`;

            const authUser = users.find(u => 
              (u.email && u.email.toLowerCase() === staffEmail) ||
              (tokenData.email && u.email && u.email.toLowerCase() === tokenData.email.toLowerCase()) ||
              (u.user_metadata?.username && String(u.user_metadata.username).toLowerCase() === cleanUser) ||
              String(u.user_metadata?.staffId).toLowerCase() === String(staffId).toLowerCase() ||
              String(u.id).toLowerCase() === String(staffId).toLowerCase()
            );

            if (authUser) {
              await supabaseAdmin.auth.admin.updateUserById(authUser.id, { 
                password: String(newPassword).trim() 
              });
            } else {
              await supabaseAdmin.auth.admin.createUser({
                email: staffEmail,
                password: String(newPassword).trim(),
                email_confirm: true,
                user_metadata: {
                  staffId: staffId,
                  username: cleanUser,
                  name: tokenData.staffName,
                  role: 'staff'
                }
              });
            }
          }
        } catch (authErr) {
          console.warn('Supabase Auth update note in CONFIRM_RESET_PASSWORD:', authErr);
        }

        // 3. Delete used token from settings
        delete tokensMap[token];
        await supabaseAdmin.from('settings').upsert({
          id: 'password_reset_tokens',
          values: tokensMap,
          updated_at: new Date().toISOString()
        });

        // 4. Log the password reset action
        try {
          await supabaseAdmin.from('logs').insert([{
            id: `LOG_RESET_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            user_name: tokenData.staffName || 'Staff',
            user_id: staffId,
            role: 'staff',
            action: 'PASSWORD_RESET',
            target_sheet: 'Staff',
            target_data_id: staffId,
            detail: `พนักงาน (@${tokenData.username}) เปลี่ยนรหัสผ่านใหม่ด้วยตนเองสำเร็จผ่านลิงก์รีเซ็ต`,
            created_at: new Date().toISOString()
          }]);
        } catch (logErr) {
          console.warn('Logging password reset error:', logErr);
        }

        return res.status(200).json({
          status: 'success',
          message: 'เปลี่ยนรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว'
        });
      }

      default:
        return res.status(400).json({ status: 'error', message: `Unsupported action: ${action}` });
    }
  } catch (err) {
    console.error('Secure DB Proxy Error:', err);
    return res.status(200).json({ status: 'error', message: err?.message || String(err) });
  }
}
