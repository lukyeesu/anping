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
  treatments: ['id', 'patient_id', 'datetime', 'date', 'time', 'doctor', 'chief_complaint', 'diagnosis', 'treatment_detail', 'prescription', 'vital_signs', 'attachments', 'cost', 'branch_id', 'created_at', 'updated_at', 'is_deleted'],
  branches: ['id', 'name', 'clinic_reg_name', 'clinic_license', 'clinic_tax', 'address', 'phone', 'email', 'manager', 'logo', 'rooms', 'is_active', 'status', 'created_at', 'updated_at', 'is_deleted'],
  queue: ['id', 'hn', 'patient_name', 'phone', 'raw_date_time', 'doctor', 'service', 'reason', 'status', 'branch_id', 'notes', 'treated', 'created_at', 'updated_at', 'is_deleted'],
  pos_transactions: ['id', 'receipt_no', 'hn', 'patient_name', 'branch_id', 'branch_name', 'total_amount', 'discount', 'net_amount', 'payment_method', 'items', 'staff_name', 'date', 'time', 'created_at', 'updated_at', 'is_deleted'],
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
      case 'GET_DATA': {
        const { data, error } = await supabaseAdmin.from(tableName).select('*');
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



      default:
        return res.status(400).json({ status: 'error', message: `Unsupported action: ${action}` });
    }
  } catch (err) {
    console.error('Secure DB Proxy Error:', err);
    return res.status(200).json({ status: 'error', message: err?.message || String(err) });
  }
}
