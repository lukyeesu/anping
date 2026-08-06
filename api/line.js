import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// -------------------------------------------------------------
// 🧠 SMART HN MATCHER (เช่น HN69-0001 ตรงกับ HN001, 001, HN69-0001)
// -------------------------------------------------------------
function isHnMatch(patientHn, kw) {
  if (!patientHn || !kw) return false;
  const pStr = String(patientHn).toLowerCase();
  const kStr = String(kw).toLowerCase().trim();

  // 1. Direct Substring Match (เช่น "hn69-0001" ตรงกับ "hn69-0001" หรือ "69-0001")
  if (pStr.includes(kStr)) return true;

  // 2. Clean Non-Alphanumerics (เช่น "hn69-0001" -> "hn690001", "hn001" -> "hn001")
  const cleanP = pStr.replace(/[^a-z0-9]/g, '');
  const cleanK = kStr.replace(/[^a-z0-9]/g, '');
  if (cleanP.includes(cleanK)) return true;

  // 3. Smart HN Digits Match (เช่น "HN69-0001" ตรงกับ "HN001", "001", หรือ "1")
  const pDigits = cleanP.replace(/^[a-z]+/, ''); // e.g. "690001"
  const kDigits = cleanK.replace(/^[a-z]+/, ''); // e.g. "001" หรือ "1"

  if (kDigits.length > 0) {
    if (pDigits.endsWith(kDigits)) return true;
    
    // เปรียบเทียบค่าตัวเลขลำดับท้าย (เช่น 1 == 1)
    const pNum = parseInt(pDigits.slice(-4), 10);
    const kNum = parseInt(kDigits, 10);
    if (!isNaN(pNum) && !isNaN(kNum) && pNum === kNum) return true;
  }

  return false;
}

// -------------------------------------------------------------
// 🎨 FLEX MESSAGE BUILDERS (ถอดแบบจาก หลังบ้าน v.5 LINE.js)
// -------------------------------------------------------------

function createPatientFlex(patient) {
  const fullName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  const gender = patient.gender || '-';
  const age = patient.age ? `${patient.age} ปี` : '-';
  const allergies = patient.drugAllergy || 'ไม่มี';

  return {
    type: "flex",
    altText: `เวชระเบียน: ${fullName}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284c7",
        paddingAll: "md",
        contents: [
          { type: "text", text: "🏥 เวชระเบียนคนไข้", color: "#ffffff", weight: "bold", size: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: fullName, weight: "bold", size: "lg", color: "#0f172a", wrap: true },
          { type: "text", text: `HN: ${hn}`, size: "sm", color: "#64748b", margin: "xs" },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "เบอร์โทร", size: "sm", color: "#64748b", flex: 1 },
                  { type: "text", text: phone, size: "sm", color: "#334155", flex: 2, weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "อายุ/เพศ", size: "sm", color: "#64748b", flex: 1 },
                  { type: "text", text: `${age} / ${gender}`, size: "sm", color: "#334155", flex: 2 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "แพ้ยา", size: "sm", color: "#64748b", flex: 1 },
                  { type: "text", text: allergies, size: "sm", color: allergies !== 'ไม่มี' ? "#e11d48" : "#334155", flex: 2, weight: allergies !== 'ไม่มี' ? "bold" : "normal" }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0ea5e9",
            height: "sm",
            action: {
              type: "message",
              label: "📅 ดูคิวนัดหมายคนไข้",
              text: `ดูนัดหมาย ${hn}`
            }
          }
        ]
      }
    }
  };
}

const colorHexMap = {
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  teal: "#14b8a6",
  fuchsia: "#d946ef",
  slate: "#64748b"
};

function createAppointmentCarouselFlex(appts, titleStr, settings = []) {
  if (!appts || appts.length === 0) {
    return {
      type: "flex",
      altText: titleStr,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: `📅 ${titleStr}: ไม่พบรายการนัดหมาย`, color: "#64748b" }
          ]
        }
      }
    };
  }

  const apptStatusesRecord = settings.find(s => s.id === 'appointment_statuses');
  const customStatuses = apptStatusesRecord ? (apptStatusesRecord.statuses || []) : [];

  const bubbles = appts.slice(0, 10).map((appt) => {
    const patientName = appt.patientName || appt.patient_name || appt.name || appt.firstName || appt.first_name || 'ไม่ระบุชื่อ';
    const hn = appt.hn || appt.patientId || '-';
    const dateStr = appt.date || appt.datetime || appt.rawDateTime || '-';
    const timeStr = appt.time || '-';
    const doctor = appt.doctor || appt.doctorName || appt.artist || 'ไม่ระบุหมอ';
    const reason = appt.reason || appt.service || appt.category || appt.symptoms || appt.symptom || '-';
    const additionalInquiry = appt.additional_inquiry || appt.additionalInquiry || appt.note || '-';
    const status = appt.status || appt.dealStatus || 'รอยืนยัน';

    let headerBg = "#0284c7";
    const matchedStatus = customStatuses.find(s => status.includes(s.label) || s.label.includes(status));
    if (matchedStatus && matchedStatus.color && colorHexMap[matchedStatus.color]) {
      headerBg = colorHexMap[matchedStatus.color];
    } else {
      if (status.includes('ยืนยัน') || status.includes('confirmed')) headerBg = "#10b981";
      else if (status.includes('ยกเลิก') || status.includes('cancel')) headerBg = "#f43f5e";
      else if (status.includes('เลื่อน')) headerBg = "#8b5cf6";
      else if (status.includes('รอ') || status.includes('pending')) headerBg = "#f59e0b";
    }

    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerBg,
        paddingAll: "md",
        contents: [
          { type: "text", text: `📌 ${status}`, color: "#ffffff", weight: "bold", size: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: patientName, weight: "bold", size: "lg", color: "#0f172a", wrap: true },
          { type: "text", text: `HN: ${hn}`, size: "sm", color: "#64748b", margin: "xs" },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "วันที่/เวลา", size: "sm", color: "#64748b", flex: 3 },
                  { type: "text", text: `${dateStr} (${timeStr})`, size: "sm", color: "#334155", flex: 7, weight: "bold", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "อาการ/บริการ", size: "sm", color: "#64748b", flex: 3 },
                  { type: "text", text: reason, size: "sm", color: "#334155", flex: 7, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "สอบถามเพิ่มเติม", size: "sm", color: "#64748b", flex: 3 },
                  { type: "text", text: additionalInquiry, size: "sm", color: "#334155", flex: 7, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "ผู้ตรวจ", size: "sm", color: "#64748b", flex: 3 },
                  { type: "text", text: doctor, size: "sm", color: "#334155", flex: 7, wrap: true }
                ]
              }
            ]
          }
        ]
      }
    };
  });

  return {
    type: "flex",
    altText: titleStr,
    contents: bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles }
  };
}

function createPosFlex(pos) {
  const patientName = pos.patientName || 'ลูกค้าทั่วไป';
  const totalAmount = pos.totalAmount || pos.grandTotal || pos.total || 0;
  const branchName = pos.branchName || 'สาขาหลัก';
  const id = pos.id || pos.receiptNo || '-';

  return {
    type: "flex",
    altText: `บิลขาย POS: ฿${Number(totalAmount).toLocaleString()}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10b981",
        paddingAll: "md",
        contents: [
          { type: "text", text: "💰 รายการขาย POS สำเร็จ", color: "#ffffff", weight: "bold", size: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: `฿${Number(totalAmount).toLocaleString()} บาท`, weight: "bold", size: "xl", color: "#059669" },
          { type: "text", text: `เลขที่บิล: ${id}`, size: "sm", color: "#64748b", margin: "xs" },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "สาขา", size: "sm", color: "#64748b", flex: 1 },
                  { type: "text", text: branchName, size: "sm", color: "#334155", flex: 2 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "คนไข้/ลูกค้า", size: "sm", color: "#64748b", flex: 1 },
                  { type: "text", text: patientName, size: "sm", color: "#334155", flex: 2, weight: "bold" }
                ]
              }
            ]
          }
        ]
      }
    }
  };
}

// -------------------------------------------------------------
// Database Settings Reader
// -------------------------------------------------------------
let cachedSettings = null;
async function getSettings() {
  if (cachedSettings) return cachedSettings;
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      cachedSettings = data.map(item => ({ id: item.id, ...(item.data || {}) }));
      return cachedSettings;
    }
  } catch (e) {
    console.error('Error fetching settings:', e);
  }
  return [];
}

async function getLineToken() {
  if (!supabase) return process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  try {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settings = data.map(item => ({ id: item.id, ...(item.data || {}) }));
      const tokenRecord = settings.find(s => s.id === 'integration_tokens');
      const vals = tokenRecord?.data?.values || tokenRecord?.values;
      if (vals?.line) {
        return vals.line;
      }
    }
  } catch (e) {
    console.error('Error fetching LINE token from Supabase:', e);
  }
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
}

async function getLineGroupId() {
  if (!supabase) return process.env.LINE_GROUP_ID || '';
  try {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settings = data.map(item => ({ id: item.id, ...(item.data || {}) }));
      const tokenRecord = settings.find(s => s.id === 'integration_tokens');
      const vals = tokenRecord?.data?.values || tokenRecord?.values;
      if (vals?.lineGroupId) {
        return vals.lineGroupId;
      }
    }
  } catch (e) {}
  return process.env.LINE_GROUP_ID || '';
}

async function replyLineMessage(replyToken, messages, channelToken) {
  if (!channelToken || !replyToken) return;
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelToken}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: messages
      })
    });
  } catch (err) {
    console.error('Error replying to LINE:', err);
  }
}

async function pushLineMessage(targetId, messages, channelToken) {
  if (!channelToken || !targetId) return;
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelToken}`
      },
      body: JSON.stringify({
        to: targetId,
        messages: messages
      })
    });
  } catch (err) {
    console.error('Error pushing to LINE:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('LINE Webhook Endpoint & Supabase Database Trigger is Running');
  }

  const requestData = req.body || {};
  const channelToken = await getLineToken();

  // ============================================================
  // 🟢 1. จัดการ Supabase Database Webhooks (ยิงเมื่อมี Insert/Update ใน Supabase)
  // ============================================================
  if (requestData.type && requestData.table && requestData.record) {
    const { type, table, record } = requestData;
    const groupId = await getLineGroupId();

    if (!groupId) {
      return res.status(200).json({ status: 'OK', message: 'No Group ID configured' });
    }

    const payload = record.data || {};

    if (table === 'queue' && (type === 'INSERT' || type === 'UPDATE')) {
      const settings = await getSettings();
      const flexMsg = createAppointmentCarouselFlex([payload], '🚨 นัดหมายใหม่เข้าสู่ระบบ', settings);
      await pushLineMessage(groupId, [flexMsg], channelToken);
      return res.status(200).json({ status: 'OK', message: 'LINE Flex Push Notification sent' });
    }

    if (table === 'pos_transactions' && type === 'INSERT') {
      const flexMsg = createPosFlex(payload);
      await pushLineMessage(groupId, [flexMsg], channelToken);
      return res.status(200).json({ status: 'OK', message: 'LINE Flex Push Notification sent' });
    }

    return res.status(200).json({ status: 'OK' });
  }

  // ============================================================
  // 🔵 2. จัดการ LINE Webhook Events (ตอบโต้แชทด้วย FLEX MESSAGE)
  // ============================================================
  if (!requestData.events || requestData.events.length === 0) {
    return res.status(200).json({ status: 'OK' });
  }

  const event = requestData.events[0];
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text.trim();
    const replyToken = event.replyToken;
    const source = event.source || {};

    // 1. คำสั่งหา ID แชท: /idchat, /ไอดีแชท, /groupid, /ไอดีกลุ่ม
    if (
      userMessage.toLowerCase() === '/idchat' || 
      userMessage === '/ไอดีแชท' || 
      userMessage.toLowerCase() === '/groupid' || 
      userMessage === '/ไอดีกลุ่ม'
    ) {
      const targetId = source.groupId || source.userId || source.roomId || 'ไม่พบ ID';
      const chatType = source.type === 'group' ? 'กลุ่ม (Group ID)' : (source.type === 'user' ? 'ส่วนตัว (User ID)' : 'ห้องแชท');

      const replyText = `📍 ID สำหรับตั้งค่ารับการแจ้งเตือน (${chatType}):\n\n${targetId}\n\n(คุณสามารถคัดลอก ID นี้ ไปวางใส่ในช่อง LINE Group ID / Chat ID หน้าตั้งค่าเว็บคลินิกได้เลยครับ)`;
      await replyLineMessage(replyToken, [{ type: 'text', text: replyText }], channelToken);
      return res.status(200).json({ status: 'OK' });
    }

    // 2. คำสั่ง /help
    if (userMessage.toLowerCase() === '/help') {
      const helpText = `🤖 รวมคำสั่งแชทบอทคลินิก (Smart HN Matching) 🏥\n-------------------------\n🆔 ค้นหา ID แชทตั้งค่า:\nพิมพ์ /idchat หรือ /ไอดีแชท\n\n🔍 ค้นหาประวัติคนไข้ (Flex Card):\nพิมพ์ ชื่อ, นามสกุล, รหัส HN หรือ เบอร์โทร\n(เช่น HN001 จะค้นเจอ HN69-0001 ทันที!)\n\n📅 ดูคิวนัดหมายรวม (Flex Carousel):\nพิมพ์คำว่า "นัดหมายวันนี้" หรือ "นัดหมายพรุ่งนี้"\n\n👤 ดูนัดหมายรายบุคคล:\nพิมพ์คำว่า "ดูนัดหมาย" ตามด้วย ชื่อ หรือ รหัส HN (เช่น ดูนัดหมาย HN001)\n\n💡 พิมพ์ /help เพื่อดูคู่มือนี้อีกครั้ง`;
      await replyLineMessage(replyToken, [{ type: 'text', text: helpText }], channelToken);
      return res.status(200).json({ status: 'OK' });
    }

    // 3. ดูนัดหมายรายบุคคล (เช่น พิมพ์ "ดูนัดหมาย HN001" หรือ "ดูนัดหมาย HN69-0001" หรือ "ดูนัดหมาย สมชาย")
    if (userMessage.startsWith('ดูนัดหมาย')) {
      const kw = userMessage.replace(/^ดูนัดหมาย\s*/, '').trim();
      if (kw && supabase) {
        const { data: queueRaw } = await supabase.from('queue').select('*');
        const queueList = (queueRaw || []).map(q => ({ id: q.id, ...(q.data || q) }));
        const matched = queueList.filter(q => 
          isHnMatch(q.hn || q.patientId, kw) ||
          (q.patientName && String(q.patientName).toLowerCase().includes(kw.toLowerCase())) ||
          (q.name && String(q.name).toLowerCase().includes(kw.toLowerCase()))
        );
        const settings = await getSettings();
        const flexMsg = createAppointmentCarouselFlex(matched, `นัดหมายของ "${kw}"`, settings);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }
    }

    // 4. ค้นหาคิวนัดหมายวันนี้ / พรุ่งนี้ จาก Supabase
    if (userMessage.match(/นัด(หมาย)?(วันนี้|วันนี)/) || userMessage.match(/นัด(หมาย)?พรุ(่|้)งนี้/)) {
      const isTomorrow = !!userMessage.match(/พรุ(่|้)งนี้/);
      
      const now = new Date();
      const thaiNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      if (isTomorrow) thaiNow.setDate(thaiNow.getDate() + 1);

      const targetIso = thaiNow.toISOString().split('T')[0];

      if (supabase) {
        const { data: queueRaw } = await supabase.from('queue').select('*');
        const queueList = (queueRaw || []).map(q => ({ id: q.id, ...(q.data || q) }));
        const matched = queueList.filter(q => (q.date && q.date.includes(targetIso)) || (q.rawDateTime && q.rawDateTime.includes(targetIso)));

        const titleText = isTomorrow ? 'คิวนัดหมายพรุ่งนี้' : 'คิวนัดหมายวันนี้';
        const settings = await getSettings();
        const flexMsg = createAppointmentCarouselFlex(matched, titleText, settings);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
      }
      return res.status(200).json({ status: 'OK' });
    }

    // 5. ค้นหาประวัติคนไข้จาก Supabase (พิมพ์ชื่อ, HN เช่น HN001 -> HN69-0001, หรือ เบอร์โทร)
    const keyword = userMessage.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล)\s*/, '').trim();
    if (keyword.length > 0 && supabase) {
      const { data: patientsRaw } = await supabase.from('patients').select('*');
      const patients = (patientsRaw || []).map(p => ({ id: p.id, ...(p.data || p) }));
      const kw = keyword.toLowerCase();
      const matched = patients.find(p => 
        isHnMatch(p.hn || p.id, kw) ||
        (p.firstName && String(p.firstName).toLowerCase().includes(kw)) ||
        (p.lastName && String(p.lastName).toLowerCase().includes(kw)) ||
        (p.phone && String(p.phone).includes(kw)) ||
        (p.name && String(p.name).toLowerCase().includes(kw))
      );

      if (matched) {
        const flexMsg = createPatientFlex(matched);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
      } else {
        await replyLineMessage(replyToken, [{ type: 'text', text: `ไม่พบข้อมูลคนไข้ที่ตรงกับ "${keyword}" ในระบบ Supabase ครับ` }], channelToken);
      }
      return res.status(200).json({ status: 'OK' });
    }
  }

  return res.status(200).json({ status: 'OK' });
}
