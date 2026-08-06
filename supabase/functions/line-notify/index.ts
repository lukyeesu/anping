// ============================================================
// Supabase Edge Function: line-notify
// ทำหน้าที่รับ Webhook จาก Database Trigger แล้วยิงเข้า LINE OA
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, table, record } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
    const lineGroupId = Deno.env.get('LINE_GROUP_ID') ?? '';

    if (!lineToken || !lineGroupId) {
      return new Response(JSON.stringify({ message: "LINE credentials missing in Edge Function Environment" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const data = record.data || {};

    let pushText = "";
    if (table === 'queue' && (type === 'INSERT' || type === 'UPDATE')) {
      const patientName = data.patientName || data.name || 'ไม่ระบุชื่อ';
      const dateStr = data.date || data.datetime || 'ไม่ระบุวัน';
      const timeStr = data.time || 'ไม่ระบุเวลา';
      const doctor = data.doctor || data.artist || 'ไม่ระบุ';

      pushText = `🚨 นัดหมายใหม่เข้าสู่ระบบ (Supabase Edge Function) 🏥\n-------------------------\n👤 คนไข้: ${patientName}\n📅 วันที่: ${dateStr}\n⏰ เวลา: ${timeStr} น.\n👨‍⚕️ ผู้ตรวจ: ${doctor}`;
    } else if (table === 'pos_transactions' && type === 'INSERT') {
      const totalAmount = data.totalAmount || data.grandTotal || data.total || 0;
      const patientName = data.patientName || 'ลูกค้าทั่วไป';
      const branchName = data.branchName || 'สาขาหลัก';

      pushText = `💰 มีรายการขาย POS ใหม่ (Supabase Edge Function) 🏥\n-------------------------\n📍 สาขา: ${branchName}\n👤 คนไข้/ลูกค้า: ${patientName}\n💵 ยอดรวม: ${Number(totalAmount).toLocaleString()} บาท`;
    }

    if (pushText) {
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineToken}`
        },
        body: JSON.stringify({
          to: lineGroupId,
          messages: [{ type: 'text', text: pushText }]
        })
      });
    }

    return new Response(JSON.stringify({ success: true, message: "LINE notification sent" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
