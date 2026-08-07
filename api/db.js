import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
  if (!jsObj.name && (jsObj.firstName || jsObj.lastName)) {
    jsObj.name = `${jsObj.firstName || ''} ${jsObj.lastName || ''}`.trim();
  }
  return jsObj;
}

function jsToRow(payload, tableName = '') {
  if (!payload) return {};
  const row = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key === 'updatedBy' || key === 'updatedById') continue;
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    row[snakeKey] = val;
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
    try {
      fs.appendFileSync(path.resolve(process.cwd(), 'debug_api.txt'), `\n[${new Date().toISOString()}] Auth Sync Error: ${err.message || String(err)}\n`);
    } catch(e) {}
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



      default:
        return res.status(400).json({ status: 'error', message: `Unsupported action: ${action}` });
    }
  } catch (err) {
    console.error('Secure DB Proxy Error:', err);
    return res.status(200).json({ status: 'error', message: err?.message || String(err) });
  }
}
