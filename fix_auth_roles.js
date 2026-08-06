import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjgdafabuzguofknhxvv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RhZmFidXpndW9ma25oeHZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMTYxMCwiZXhwIjoyMTAwMzk3NjEwfQ.r5_f0bbN8oIS8WIVBqCAgr_M3CZKGWyYKJAkV3Ec21s';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function fixRoles() {
  console.log('🔄 กำลังดึงรายชื่อผู้ใช้ทั้งหมดจาก Supabase Auth...');
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error('❌ ดึงข้อมูลผู้ใช้ล้มเหลว:', error.message);
    return;
  }

  console.log(`✅ พบผู้ใช้ทั้งหมด ${users.length} บัญชี`);
  
  let successCount = 0;
  for (const user of users) {
    try {
      const currentMeta = user.user_metadata || {};
      if (currentMeta.role !== 'admin') {
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...currentMeta, role: 'admin' }
        });
        
        if (updateErr) {
          console.error(`❌ อัปเดตบัญชี ${user.email} ล้มเหลว:`, updateErr.message);
        } else {
          console.log(`✅ อัปเดตสิทธิ์บัญชี ${user.email} เป็น 'admin' สำเร็จ`);
          successCount++;
        }
      } else {
        console.log(`ℹ️ บัญชี ${user.email} มีสิทธิ์ 'admin' อยู่แล้ว (ข้าม)`);
      }
    } catch (e) {
      console.error(`❌ เกิดข้อผิดพลาดกับบัญชี ${user.email}:`, e.message);
    }
  }
  
  console.log(`\n🎉 สรุป: อัปเดตสิทธิ์ไปทั้งหมด ${successCount} บัญชี`);
}

fixRoles();
