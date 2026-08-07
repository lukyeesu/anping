import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const googleScriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || '';

if (!rawSupabaseUrl || !supabaseAnonKey) {
  console.error("❌ กรุณาระบุ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในไฟล์ .env.local ก่อนย้ายข้อมูล");
  process.exit(1);
}

const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SHEETS = [
  { name: 'Patients', table: 'patients' },
  { name: 'Branches', table: 'branches' },
  { name: 'Queue', table: 'queue' },
  { name: 'POS_Transactions', table: 'pos_transactions' },
  { name: 'Inventory', table: 'inventory' },
  { name: 'InventoryLogs', table: 'inventory_logs' },
  { name: 'setting_pos', table: 'setting_pos' },
  { name: 'Finance_Revenue', table: 'finance_revenue' },
  { name: 'Finance_Expenses', table: 'finance_expenses' },
  { name: 'Staff', table: 'staff' },
  { name: 'Settings', table: 'settings' },
  { name: 'Logs', table: 'logs' }
];

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

  if (tableName === 'pos_transactions') {
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

  row.updated_at = new Date().toISOString();
  return row;
}

async function migrate() {
  console.log("🚀 เริ่มต้นล้างข้อมูลเดิมและดึงข้อมูลใหม่จาก Google Sheets -> Supabase (Relational SQL Columns)...");

  for (const sheet of SHEETS) {
    try {
      console.log(`🧹 กำลังล้างข้อมูลตารางเดิม: ${sheet.table}...`);
      await supabase.from(sheet.table).delete().neq('id', '___impossible_dummy_id___');

      console.log(`📦 กำลังดึงข้อมูลจาก Google Sheet: ${sheet.name}...`);
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_DATA', sheetName: sheet.name })
      });

      const text = await response.text();
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html>')) {
        console.error(`  ❌ ได้รับข้อผิดพลาดจาก Google Script สำหรับชีต ${sheet.name}`);
        continue;
      }

      const res = JSON.parse(text);
      if (res.status === 'success' && Array.isArray(res.data)) {
        console.log(`  ✓ พบข้อมูล ${res.data.length} รายการใน ${sheet.name}`);
        
        let successCount = 0;
        for (const item of res.data) {
          const row = jsToRow(item, sheet.table);
          const { error } = await supabase.from(sheet.table).upsert(row);
          if (error) {
            console.error(`  ❌ บันทึก ID ${row.id} ล้มเหลว:`, error.message);
          } else {
            successCount++;
          }
        }
        console.log(`  ✅ ล้างและบันทึกตาราง ${sheet.table} แบบแยกคอลัมน์สำเร็จ (${successCount} รายการ)!`);
      } else {
        console.log(`  ⚠️ ไม่พบข้อมูลในชีต ${sheet.name}`);
      }
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดในตาราง ${sheet.table}:`, err.message);
    }
  }

  console.log("\n🎉 ล้างข้อมูลเดิมและซิงค์ข้อมูลใหม่ทั้งหมดเป็นคอลัมน์แยกบน Supabase เรียบร้อยแล้ว!");
}

migrate();
