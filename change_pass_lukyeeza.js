import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://mjgdafabuzguofknhxvv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RhZmFidXpndW9ma25oeHZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMTYxMCwiZXhwIjoyMTAwMzk3NjEwfQ.r5_f0bbN8oIS8WIVBqCAgr_M3CZKGWyYKJAkV3Ec21s';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function setPasswordToOne() {
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.find(u => u.email === 'lukyeeza@anping.com');
  
  if (user) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: '1' });
    if (error) {
      console.error("Failed to set password to 1:", error.message);
    } else {
      console.log("Successfully set password to 1");
    }
  } else {
    console.error("User lukyeeza@anping.com not found");
  }
}

setPasswordToOne();
