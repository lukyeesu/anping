import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mjgdafabuzguofknhxvv.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_uaARgpzqpsrsBLbTjLeVWw_ERbdwFwn';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function keepAlive() {
  console.log(`📡 [Keep-Alive] Sending ping query to Supabase (${supabaseUrl})...`);
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.from('settings').select('id').limit(1);
    const duration = Date.now() - startTime;

    if (error) {
      console.error(`❌ [Keep-Alive] Ping failed (${duration}ms):`, error.message);
      return false;
    }

    console.log(`✅ [Keep-Alive] Ping successful! (${duration}ms) Supabase DB is active.`);
    return true;
  } catch (err) {
    console.error(`❌ [Keep-Alive] Unexpected error:`, err.message);
    return false;
  }
}

keepAlive();
