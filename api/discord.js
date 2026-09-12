import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Disable default body parser so we can get exact raw bytes for Ed25519 signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mjgdafabuzguofknhxvv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

const WEBAPP_URL = 'https://anpingclinic.vercel.app';

// -------------------------------------------------------------
// 🧠 SMART HN MATCHER
// -------------------------------------------------------------
function isHnMatch(patientHn, kw) {
  if (!patientHn || !kw) return false;
  const pStr = String(patientHn).toLowerCase();
  const kStr = String(kw).toLowerCase().trim();

  if (pStr.includes(kStr)) return true;

  const cleanP = pStr.replace(/[^a-z0-9]/g, '');
  const cleanK = kStr.replace(/[^a-z0-9]/g, '');
  if (cleanK.length > 0 && cleanP.includes(cleanK)) return true;

  const pDigits = cleanP.replace(/^[a-z]+/, '');
  const kDigits = cleanK.replace(/^[a-z]+/, '');

  if (kDigits.length > 0) {
    if (pDigits.endsWith(kDigits)) return true;
    const pNum = parseInt(pDigits.slice(-4), 10);
    const kNum = parseInt(kDigits, 10);
    if (!isNaN(pNum) && !isNaN(kNum) && pNum === kNum) return true;
  }

  return false;
}

// -------------------------------------------------------------
// 🕒 THAI DATE & TIME HELPERS (UTC+7 GMT+7)
// -------------------------------------------------------------
function parseQueueDateToThaiYMD(rawStr) {
  if (!rawStr) return null;
  const str = String(rawStr).trim();

  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const day = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
    let year = parseInt(slashMatch[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch && !str.includes('T')) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const thaiTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      const year = thaiTime.getUTCFullYear();
      const month = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(thaiTime.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}

  return null;
}

function getTodayAndTomorrowThaiYMD() {
  const now = new Date();
  const thaiNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));

  const todayY = thaiNow.getUTCFullYear();
  const todayM = String(thaiNow.getUTCMonth() + 1).padStart(2, '0');
  const todayD = String(thaiNow.getUTCDate()).padStart(2, '0');
  const todayIso = `${todayY}-${todayM}-${todayD}`;

  const thaiTomorrow = new Date(thaiNow.getTime() + (24 * 60 * 60 * 1000));
  const tomY = thaiTomorrow.getUTCFullYear();
  const tomM = String(thaiTomorrow.getUTCMonth() + 1).padStart(2, '0');
  const tomD = String(thaiTomorrow.getUTCDate()).padStart(2, '0');
  const tomorrowIso = `${tomY}-${tomM}-${tomD}`;

  return { todayIso, tomorrowIso };
}

function formatThaiPhone(phoneStr) {
  if (!phoneStr || phoneStr === '-') return '-';
  const clean = String(phoneStr).replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
  }
  return String(phoneStr);
}

function formatThaiDateTime(raw) {
  if (!raw || raw === '-') return '-';
  const str = String(raw).trim();
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    if (year < 2400) year += 543;
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = parseInt(slashMatch[3], 10);
    if (year < 2400) year += 543;
    const time = slashMatch[4] ? ` (${slashMatch[4]}:${slashMatch[5]} น.)` : '';
    return `${day}/${month}/${year}${time}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const thai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      const day = String(thai.getUTCDate()).padStart(2, '0');
      const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
      const year = thai.getUTCFullYear() + 543;
      const hours = String(thai.getUTCHours()).padStart(2, '0');
      const mins = String(thai.getUTCMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} (${hours}:${mins} น.)`;
    }
  } catch (_e) {}

  return str;
}

function parseOpdDateVal(item) {
  if (!item) return 0;
  const str = item.datetime || `${item.date || ''} ${item.time || ''}`.trim() || item.created_at;
  if (!str) return 0;
  if (str.includes('/')) {
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    const timeStr = parts[1] ? parts[1].replace('น.', '').trim() : '00:00';
    if (dateParts.length === 3) {
      let day = parseInt(dateParts[0], 10);
      let month = parseInt(dateParts[1], 10) - 1;
      let year = parseInt(dateParts[2], 10);
      if (year > 2400) year -= 543;
      const [h, m] = timeStr.split(':').map(n => parseInt(n, 10) || 0);
      const d = new Date(year, month, day, h, m);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
  }
  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

function normalizeQueueRow(q) {
  if (!q) return null;
  const data = q.data || {};
  return {
    ...q,
    ...data,
    id: q.id || data.id,
    hn: q.hn || data.hn || q.patient_id || data.patient_id || '-',
    patientName: q.patient_name || data.patient_name || q.patientName || data.patientName || q.name || data.name || 'ไม่ระบุชื่อ',
    rawDateTime: q.raw_date_time || data.raw_date_time || q.rawDateTime || data.rawDateTime || q.date || data.date || '',
    date: q.date || data.date || q.raw_date_time || data.raw_date_time || '',
    doctor: q.doctor || data.doctor || q.doctor_name || data.doctor_name || '-',
    service: q.service || data.service || q.service_type || data.service_type || '-',
    reason: q.reason || data.reason || q.symptoms || data.symptoms || q.service || '-',
    phone: q.phone || data.phone || q.tel || data.tel || '',
    status: q.status || data.status || 'pending',
    isDeleted: Boolean(q.is_deleted ?? data.is_deleted ?? false)
  };
}

// -------------------------------------------------------------
// 🔐 SETTINGS & DISCORD CREDENTIALS
// -------------------------------------------------------------
let cachedDiscordSettings = null;
let lastSettingsFetch = 0;

async function getDiscordSettings() {
  const now = Date.now();
  if (cachedDiscordSettings && (now - lastSettingsFetch < 60000)) {
    return cachedDiscordSettings;
  }

  let settings = {
    applicationId: process.env.DISCORD_APPLICATION_ID || '1548455329929494569',
    publicKey: process.env.DISCORD_PUBLIC_KEY || 'a1c164649d9416e97e8c4284127a5daebf08db52ed834a63fdc660c1a866468b',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    botName: 'Anping Clinic Notifier',
    botAvatarUrl: ''
  };

  if (!supabase) {
    cachedDiscordSettings = settings;
    lastSettingsFetch = now;
    return settings;
  }

  try {
    const { data } = await supabase.from('settings').select('*').eq('id', 'integration_tokens').limit(1);
    if (data && data.length > 0) {
      const record = data[0];
      const vals = record.values || record.data?.values || record.data || {};
      const dc = vals.discord || {};
      if (dc.applicationId) settings.applicationId = String(dc.applicationId).trim();
      if (dc.publicKey) settings.publicKey = String(dc.publicKey).trim();
      if (dc.botToken) settings.botToken = String(dc.botToken).trim();
      if (dc.botName) settings.botName = String(dc.botName).trim();
      if (dc.botAvatarUrl) settings.botAvatarUrl = String(dc.botAvatarUrl).trim();
    }
  } catch (e) {
    console.error('Error fetching Discord settings:', e);
  }

  cachedDiscordSettings = settings;
  lastSettingsFetch = now;
  return settings;
}

// -------------------------------------------------------------
// 🛡️ ED25519 SIGNATURE VERIFICATION
// -------------------------------------------------------------
function verifyDiscordSignature(rawBody, signatureHex, timestamp, publicKeyHex) {
  if (!signatureHex || !timestamp || !publicKeyHex || !rawBody) return false;
  try {
    const rawPub = Buffer.from(publicKeyHex, 'hex');
    if (rawPub.length !== 32) return false;
    // SPKI header for Ed25519 is 302a300506032b6570032100 (12 bytes) + 32 bytes raw key
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const key = crypto.createPublicKey({
      key: Buffer.concat([spkiPrefix, rawPub]),
      format: 'der',
      type: 'spki'
    });
    const message = Buffer.from(timestamp + rawBody);
    const signature = Buffer.from(signatureHex, 'hex');
    return crypto.verify(null, message, key, signature);
  } catch (err) {
    console.error('Discord signature verification error:', err);
    return false;
  }
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

// -------------------------------------------------------------
// 📦 DISCORD EMBED BUILDERS
// -------------------------------------------------------------
function buildPatientEmbed(patient, queueList = [], treatmentList = [], courseList = [], botAvatarUrl = '') {
  const fullName = patient.name || `${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const rawPhone = patient.phone || patient.tel || '-';
  const displayPhone = formatThaiPhone(rawPhone);
  const cleanPhoneDigits = String(rawPhone || '').replace(/\D/g, '');
  const callUrl = cleanPhoneDigits && cleanPhoneDigits.length >= 9
    ? `${WEBAPP_URL}/api/call?tel=${cleanPhoneDigits}`
    : null;
  const phoneDisplay = callUrl
    ? `[📞 **${displayPhone}**](${callUrl})`
    : `\`${displayPhone}\``;

  const allergy = patient.drugAllergy || patient.drug_allergy || patient.allergy || patient.allergies || 'ไม่มีประวัติแพ้ยา';
  const underlyingDisease = patient.underlying_disease || patient.underlyingDisease || patient.disease || 'ไม่มี';

  let ageStr = '-';
  if (patient.age) {
    ageStr = `${patient.age} ปี`;
  } else if (patient.dob) {
    const parts = String(patient.dob).trim().split(/[\/\-]/);
    if (parts.length === 3) {
      const birthYear = parseInt(parts[0].length === 4 ? parts[0] : parts[2], 10);
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear)) {
        const adYear = birthYear > 2400 ? birthYear - 543 : birthYear;
        ageStr = `${currentYear - adYear} ปี`;
      }
    }
  }

  const genderStr = patient.gender === 'male' || patient.gender === 'ชาย' ? 'ชาย' : (patient.gender === 'female' || patient.gender === 'หญิง' ? 'หญิง' : '-');
  const nickStr = patient.nickname ? `  •  **ชื่อเล่น:** \`${patient.nickname}\`` : '';
  const callLinkHeader = callUrl ? `  •  [📞 **โทรออก**](${callUrl})` : '';

  const isNoAllergy = !allergy || allergy === '-' || allergy.includes('ไม่มี');
  const allergyDisplay = isNoAllergy ? '`🟢 ไม่มีประวัติแพ้ยา`' : `\`🔴 ${allergy}\``;

  const isNoDisease = !underlyingDisease || underlyingDisease === '-' || underlyingDisease === 'ไม่มี';
  const diseaseDisplay = isNoDisease ? '`🟢 ไม่มีโรคประจำตัว`' : `\`🟡 ${underlyingDisease}\``;

  const fields = [
    {
      name: '📞 เบอร์โทรศัพท์',
      value: phoneDisplay,
      inline: true
    },
    {
      name: '🚫 ประวัติแพ้ยา',
      value: allergyDisplay,
      inline: true
    },
    {
      name: '🩺 โรคประจำตัว',
      value: diseaseDisplay,
      inline: true
    }
  ];

  // ที่อยู่ / ภูมิลำเนา (ถ้ามี)
  const fullAddress = [
    patient.address,
    patient.moo ? `ม.${patient.moo}` : '',
    patient.sub_district || patient.subDistrict,
    patient.district,
    patient.province
  ].filter(Boolean).join(' ').trim();

  if (fullAddress) {
    fields.push({
      name: '📍 ที่อยู่ / ภูมิลำเนา',
      value: fullAddress,
      inline: false
    });
  }

  // คอร์สคงเหลือ
  const activeCourses = courseList.filter(c => !c.is_deleted && (c.remaining_sessions > 0 || c.remaining > 0));
  if (activeCourses.length > 0) {
    const courseLines = activeCourses.slice(0, 5).map(c => {
      const cName = c.course_name || c.name || c.data?.course_name || 'คอร์สการรักษา';
      const rem = c.remaining_sessions ?? c.remaining ?? c.data?.remaining_sessions ?? 0;
      const tot = c.total_sessions ?? c.total ?? c.data?.total_sessions ?? rem;
      const exp = c.expire_date || c.data?.expire_date;
      const expStr = exp ? ` *(หมดอายุ ${formatThaiDateTime(exp)})*` : '';
      return `• **${cName}**\n  └ คงเหลือ: \`${rem} / ${tot} ครั้ง\` [🟢 พร้อมใช้งาน]${expStr}`;
    });
    fields.push({
      name: `💳 คอร์สการรักษาคงเหลือ (${activeCourses.length} รายการ)`,
      value: courseLines.join('\n\n'),
      inline: false
    });
  } else {
    fields.push({
      name: '💳 คอร์สการรักษาคงเหลือ',
      value: '*(ไม่มีคอร์สการรักษาคงเหลือในระบบ)*',
      inline: false
    });
  }

  // ประวัติการตรวจรักษา (เรียงจากวันที่ตรวจล่าสุดไปหาเก่าสุด)
  const validTrts = treatmentList
    .filter(t => !t.is_deleted)
    .sort((a, b) => parseOpdDateVal(b) - parseOpdDateVal(a));

  if (validTrts.length > 0) {
    const maxShow = 10;
    const lines = validTrts.slice(0, maxShow).map((t, idx) => {
      const vDate = formatThaiDateTime(t.datetime || t.created_at || t.visit_date || t.date);
      const doc = t.doctor || t.doctor_name || t.data?.doctor || '-';
      const diag = t.diagnosis || t.data?.diagnosis || '';
      const cc = t.chief_complaint || t.data?.chief_complaint || t.symptoms || t.data?.symptoms || '';
      const mainNote = diag || cc || t.treatment || '-';
      const subNote = (diag && cc && cc !== diag) ? `\n  ├ *อาการสำคัญ:* ${cc.length > 60 ? cc.slice(0, 60) + '...' : cc}` : '';
      const cost = t.cost || t.total_cost || t.data?.cost || t.data?.total_cost;
      const costStr = cost ? ` • ยอด: \`฿${Number(cost).toLocaleString()}\`` : '';
      const rx = Array.isArray(t.prescription) ? t.prescription.join(', ') : (t.prescription || '');
      const rxStr = rx ? `\n  └ *หัตถการ/ยา:* ${rx}` : '';
      const visitNum = validTrts.length - idx;
      return `• **ครั้งที่ ${visitNum} • 📅 ${vDate}** (แพทย์: **${doc}**)${costStr}\n  ├ *การวินิจฉัย/อาการ:* **${mainNote.length > 70 ? mainNote.slice(0, 70) + '...' : mainNote}**${subNote}${rxStr}`;
    });

    let currentLines = [];
    let currentLen = 0;
    let chunkIndex = 1;

    for (const line of lines) {
      if (currentLen + line.length + 2 > 950 && currentLines.length > 0) {
        fields.push({
          name: chunkIndex === 1 ? `🩺 ประวัติการตรวจรักษา (${validTrts.length} ครั้ง)` : '\u200b',
          value: currentLines.join('\n\n'),
          inline: false
        });
        currentLines = [line];
        currentLen = line.length;
        chunkIndex++;
      } else {
        currentLines.push(line);
        currentLen += line.length + 2;
      }
    }

    if (currentLines.length > 0) {
      fields.push({
        name: chunkIndex === 1 ? `🩺 ประวัติการตรวจรักษา (${validTrts.length} ครั้ง)` : '\u200b',
        value: currentLines.join('\n\n'),
        inline: false
      });
    }

    if (validTrts.length > maxShow) {
      fields.push({
        name: '📋 ประวัติการรักษาเพิ่มเติม',
        value: `*(คนไข้มีประวัติการรักษาทั้งหมด ${validTrts.length} ครั้ง สามารถเปิดดูประวัติย้อนหลังทั้งหมดได้ในระบบ)*`,
        inline: false
      });
    }
  }

  // นัดหมายที่กำลังจะมาถึง (เรียงจากนัดที่ใกล้มาถึงที่สุด)
  const validAppts = queueList
    .filter(q => !q.isDeleted)
    .sort((a, b) => parseOpdDateVal(a) - parseOpdDateVal(b));

  if (validAppts.length > 0) {
    const apptLines = validAppts.slice(0, 3).map(q => {
      const dt = formatThaiDateTime(q.rawDateTime || q.date);
      const qClean = String(q.phone || '').replace(/\D/g, '');
      const qCall = qClean && qClean.length >= 9 ? `${WEBAPP_URL}/api/call?tel=${qClean}` : null;
      const qPhoneStr = q.phone ? (qCall ? ` • โทร: [${formatThaiPhone(q.phone)}](${qCall})` : ` • โทร: \`${formatThaiPhone(q.phone)}\``) : '';
      return `• **⏰ ${dt}** — **${q.service}**\n  └ แพทย์: **${q.doctor}** • สถานะ: \`${q.status}\`${qPhoneStr}`;
    });
    fields.push({
      name: `🗓️ คิวนัดหมายที่กำลังจะมาถึง (${validAppts.length} รายการ)`,
      value: apptLines.join('\n\n'),
      inline: false
    });
  }

  return {
    author: {
      name: '🏥 คลินิกอันผิง • เวชระเบียนผู้ป่วย (PATIENT RECORD)',
      icon_url: (botAvatarUrl && botAvatarUrl.startsWith('http')) ? botAvatarUrl : undefined
    },
    title: `📁 คุณ${fullName.replace(/^(คุณ|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '')} (${hn})`,
    description: `>>> **รหัสประจำตัว HN:** \`${hn}\`  •  **เพศ:** \`${genderStr}\`  •  **อายุ:** \`${ageStr}\`${nickStr}${callLinkHeader}`,
    color: 0x0284c7, // Sky Blue / Cyan
    fields,
    footer: {
      text: `Anping Clinic OPD System • ตรวจสอบข้อมูล ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildQueueEmbed(queueList, titleText, botAvatarUrl = '') {
  const fields = [];
  if (queueList.length === 0) {
    fields.push({
      name: 'ℹ️ สถานะคิวนัดหมาย',
      value: '>>> ไม่พบคิวนัดหมายตรวจหรือรับบริการในช่วงเวลาดังกล่าว\nสามารถทำการนัดหมายหรือจองคิวใหม่ได้ผ่านทางระบบคลินิก',
      inline: false
    });
  } else {
    const doctors = [...new Set(queueList.map(q => q.doctor).filter(d => d && d !== '-'))];
    const docStr = doctors.length > 0 ? doctors.join(', ') : 'แพทย์ประจำคลินิก';

    const queueLines = queueList.slice(0, 10).map((q, idx) => {
      const dt = formatThaiDateTime(q.rawDateTime || q.date);
      const timeOnly = dt.includes('(') ? dt.split('(')[1].replace(')', '').trim() : dt;
      const cleanPhone = String(q.phone || '').replace(/\D/g, '');
      const callUrl = cleanPhone && cleanPhone.length >= 9 ? `${WEBAPP_URL}/api/call?tel=${cleanPhone}` : null;
      const phoneStr = q.phone ? (callUrl ? ` • 📞 [${formatThaiPhone(q.phone)}](${callUrl})` : ` • 📞 \`${formatThaiPhone(q.phone)}\``) : '';

      let statusBadge = '🟡 รอดำเนินการ';
      const st = String(q.status || '').toLowerCase();
      if (st.includes('confirm') || st.includes('ยืนยัน')) statusBadge = '🟢 ยืนยันแล้ว';
      else if (st.includes('in_progress') || st.includes('ตรวจ')) statusBadge = '🔵 กำลังตรวจ';
      else if (st.includes('complete') || st.includes('เสร็จ')) statusBadge = '⚪ เสร็จสิ้น';
      else if (st.includes('cancel') || st.includes('ยกเลิก')) statusBadge = '🔴 ยกเลิก';

      const pName = q.patientName.replace(/^(คุณ|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '');
      return `• **${idx + 1}. ⏰ ${timeOnly}** — **คุณ${pName}** (\`${q.hn}\`)\n  ├ 🩺 **บริการ:** ${q.service} (แพทย์: **${q.doctor}**)\n  └ 🏷️ สถานะ: \`${statusBadge}\`${phoneStr}`;
    });

    let curLines = [];
    let curLen = 0;
    let cIdx = 1;
    for (const line of queueLines) {
      if (curLen + line.length + 2 > 950 && curLines.length > 0) {
        fields.push({
          name: cIdx === 1 ? `📋 รายการคิวนัดหมาย (${queueList.length} คิว)` : '\u200b',
          value: curLines.join('\n\n'),
          inline: false
        });
        curLines = [line];
        curLen = line.length;
        cIdx++;
      } else {
        curLines.push(line);
        curLen += line.length + 2;
      }
    }
    if (curLines.length > 0) {
      fields.push({
        name: cIdx === 1 ? `📋 รายการคิวนัดหมาย (${queueList.length} คิว)` : '\u200b',
        value: curLines.join('\n\n'),
        inline: false
      });
    }

    if (queueList.length > 10) {
      fields.push({
        name: '📋 คิวนัดหมายเพิ่มเติม',
        value: `*(ยังมีคิวนัดหมายอีก ${queueList.length - 10} รายการ สามารถเปิดดูตารางนัดทั้งหมดได้ในระบบ)*`,
        inline: false
      });
    }
  }

  return {
    author: {
      name: '🏥 คลินิกอันผิง • ตารางคิวนัดหมายแพทย์ (APPOINTMENTS)',
      icon_url: (botAvatarUrl && botAvatarUrl.startsWith('http')) ? botAvatarUrl : undefined
    },
    title: `🗓️ ${titleText}`,
    description: `>>> **จำนวนคิวนัดทั้งหมด:** \`${queueList.length} คิว\`  •  **แพทย์ตรวจ:** \`${docStr}\``,
    color: 0x0284c7, // Medical Sky Blue
    fields,
    footer: {
      text: `Anping Clinic Queue System • ตรวจสอบคิว ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildPosEmbed(tx, botAvatarUrl = '') {
  const rNo = tx.receipt_no || tx.id || '-';
  const pName = tx.patient_name || tx.patientName || tx.data?.patient_name || '-';
  const cleanPName = pName.replace(/^HN\d{2}-\d{4}\s*-\s*/, '').replace(/^(คุณ|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '');
  const hn = tx.hn || tx.data?.hn || (pName.match(/HN\d{2}-\d{4}/)?.[0]) || '-';
  const netAmount = Number(tx.net_amount ?? tx.total_amount ?? tx.data?.net_amount ?? 0);
  const discount = Number(tx.discount ?? tx.data?.discount ?? 0);
  const rawMethod = String(tx.payment_method || tx.data?.payment_method || 'cash').toLowerCase();

  let methodDisplay = '💵 เงินสด';
  if (rawMethod.includes('transfer') || rawMethod.includes('โอน')) methodDisplay = '📱 เงินโอน (QR)';
  else if (rawMethod.includes('credit') || rawMethod.includes('บัตร')) methodDisplay = '💳 บัตรเครดิต';

  const dt = formatThaiDateTime(tx.created_at || tx.date || tx.data?.created_at);
  const items = Array.isArray(tx.items) ? tx.items : (Array.isArray(tx.data?.items) ? tx.data.items : []);

  const fields = [
    {
      name: '💰 ยอดชำระสุทธิ',
      value: `\`฿${netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\``,
      inline: true
    },
    {
      name: '💳 ช่องทางชำระ',
      value: `\`${methodDisplay}\``,
      inline: true
    },
    {
      name: '🏷️ สถานะบิล',
      value: '`🟢 ชำระเรียบร้อย`',
      inline: true
    }
  ];

  if (items.length > 0) {
    const itemLines = items.slice(0, 8).map((it, i) => {
      const name = it.name || it.item_name || 'สินค้า/บริการ';
      const qty = it.quantity || it.qty || 1;
      const price = Number(it.price || it.unit_price || 0);
      const total = Number(it.total || price * qty);
      return `• **${i + 1}. ${name}**  (x${qty})\n  └ ยอด: \`฿${total.toLocaleString()}\` *(ราคา/หน่วย: ฿${price.toLocaleString()})*`;
    });
    if (items.length > 8) {
      itemLines.push(`*...และรายการอื่นๆ อีก ${items.length - 8} รายการ*`);
    }
    fields.push({
      name: `📦 รายการสินค้าและบริการ (${items.length} รายการ)`,
      value: itemLines.join('\n\n'),
      inline: false
    });
  }

  if (discount > 0) {
    fields.push({
      name: '🏷️ ส่วนลดพิเศษ',
      value: `\`-฿${discount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\``,
      inline: false
    });
  }

  return {
    author: {
      name: '🏥 คลินิกอันผิง • ใบเสร็จรับเงิน POS (OFFICIAL RECEIPT)',
      icon_url: (botAvatarUrl && botAvatarUrl.startsWith('http')) ? botAvatarUrl : undefined
    },
    title: `🧾 ใบเสร็จรับเงินเลขที่: ${rNo}`,
    description: `>>> **ผู้รับบริการ:** คุณ${cleanPName}  •  **รหัส HN:** \`${hn}\`\n**📅 วันที่ออกบิล:** \`${dt}\``,
    color: 0x10b981, // Emerald Green
    fields,
    footer: {
      text: `Anping Clinic POS System • ตรวจสอบใบเสร็จ ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildSalesSummaryEmbed(summary, botAvatarUrl = '') {
  return {
    author: {
      name: '🏥 คลินิกอันผิง • สรุปยอดขายและการเงิน (SALES & FINANCE)',
      icon_url: (botAvatarUrl && botAvatarUrl.startsWith('http')) ? botAvatarUrl : undefined
    },
    title: `📊 รายงานสรุปยอดขายประจำวัน: ${summary.date}`,
    description: `>>> **ยอดขายรวมทั้งสิ้น:** **\`฿${summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\`**\n**จำนวนบิลทั้งหมด:** \`${summary.billsCount} บิล\`  •  **จำนวนผู้รับบริการ:** \`${summary.patientsCount} ท่าน\``,
    color: 0xf59e0b, // Golden Amber
    fields: [
      {
        name: '💵 เงินสด (Cash)',
        value: `\`฿${summary.cashAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\`\n└ **${summary.cashCount}** บิล`,
        inline: true
      },
      {
        name: '📱 เงินโอน (QR Transfer)',
        value: `\`฿${summary.transferAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\`\n└ **${summary.transferCount}** บิล`,
        inline: true
      },
      {
        name: '💳 บัตรเครดิต (Credit Card)',
        value: `\`฿${summary.creditAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\`\n└ **${summary.creditCount}** บิล`,
        inline: true
      }
    ],
    footer: {
      text: `Anping Clinic Financial System • สรุปยอด ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildInventoryEmbed(items, title = '📦 คลังยา & เวชภัณฑ์', botAvatarUrl = '') {
  const fields = [];

  if (items.length === 0) {
    fields.push({
      name: 'สถานะ',
      value: 'ไม่พบรายการยาหรือเวชภัณฑ์ในระบบคลัง',
      inline: false
    });
  } else {
    const itemLines = items.slice(0, 10).map((it, i) => {
      const name = it.name || it.product_name || '-';
      const code = it.code || it.id || '-';
      const qty = Number(it.stock_quantity ?? it.quantity ?? 0);
      const unit = it.unit || 'หน่วย';
      const price = Number(it.selling_price || it.price || it.sale_price || 0);
      const minStock = Number(it.min_stock || 5);

      let badge = '🟢 ปกติ';
      if (qty <= 0) badge = '🔴 สินค้าหมด';
      else if (qty <= minStock) badge = '🟡 ใกล้หมดสต็อก';

      return `• **${i + 1}. ${name}** (\`${code}\`)\n  ├ 📦 คงเหลือ: \`${qty} ${unit}\` [${badge}]\n  └ 🏷️ ราคาจำหน่าย: \`฿${price.toLocaleString()} บาท\``;
    });

    fields.push({
      name: `📋 รายการยาและเวชภัณฑ์ (${items.length} รายการ)`,
      value: itemLines.join('\n\n'),
      inline: false
    });

    if (items.length > 10) {
      fields.push({
        name: '📦 รายการเพิ่มเติม',
        value: `*(ยังมีรายการยาอีก ${items.length - 10} รายการ สามารถเปิดดูทั้งหมดในระบบคลังยา)*`,
        inline: false
      });
    }
  }

  return {
    author: {
      name: '🏥 คลินิกอันผิง • คลังยาและเวชภัณฑ์ (PHARMACY & INVENTORY)',
      icon_url: (botAvatarUrl && botAvatarUrl.startsWith('http')) ? botAvatarUrl : undefined
    },
    title,
    description: `>>> **จำนวนรายการยาที่ค้นพบ:** \`${items.length} รายการ\``,
    color: 0x8b5cf6, // Violet / Purple
    fields,
    footer: {
      text: `Anping Clinic Pharmacy System • ตรวจสอบสต็อก ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildHelpEmbed(botAvatarUrl = '') {
  return {
    author: {
      name: '🏥 คลินิกอันผิง • ผู้ช่วยคลินิกอัจฉริยะ (ANPING ASSISTANT)',
      icon_url: (botAvatarUrl && botAvatarUrl.startsWith('http')) ? botAvatarUrl : undefined
    },
    title: '📖 คู่มือคำสั่งค้นหาข้อมูลคลินิก (Slash Commands)',
    description: `>>> ท่านสามารถพิมพ์เครื่องหมาย \`/\` ในช่องแชทเพื่อเรียกใช้คำสั่งงานคลินิกได้ทันที:`,
    color: 0x6366f1, // Indigo
    fields: [
      {
        name: '🔍 /search [keyword]',
        value: '• ค้นหาอัจฉริยะครอบคลุมทุกระบบ (พิมพ์ชื่อคนไข้, เบอร์โทร, รหัส HN, ยอดขายเมื่อวาน, คิววันนี้, ยาในคลัง)',
        inline: false
      },
      {
        name: '📁 /patient [keyword]',
        value: '• ค้นหาเวชระเบียนคนไข้โดยเฉพาะ (ประวัติการตรวจ OPD, คอร์สคงเหลือ, ประวัติแพ้ยา, โรคประจำตัว, ปุ่มโทรออก)',
        inline: false
      },
      {
        name: '🗓️ /queue [date]',
        value: '• ดูตารางคิวนัดหมาย (ระบุ `วันนี้`, `พรุ่งนี้`, `เมื่อวาน` หรือระบุวันที่ เช่น `15/09/2569`)',
        inline: false
      },
      {
        name: '🧾 /bill [keyword]',
        value: '• ค้นหาใบเสร็จรับเงิน POS (ค้นหาด้วยเลขที่ใบเสร็จ หรือชื่อคนไข้)',
        inline: false
      },
      {
        name: '📊 /sales [date]',
        value: '• สรุปยอดขายประจำวัน (ระบุ `วันนี้`, `เมื่อวาน` หรือระบุวันที่ เช่น `12/09/2569`)',
        inline: false
      },
      {
        name: '💊 /stock [keyword]',
        value: '• ค้นหาสต็อกยาและเวชภัณฑ์ในคลังคลินิก (ค้นหาด้วยชื่อยา หรือรหัสยา)',
        inline: false
      }
    ],
    footer: {
      text: 'Anping Clinic Bot • พิมพ์ /help เพื่อเปิดดูคู่มือนี้ได้ตลอดเวลา'
    }
  };
}

// -------------------------------------------------------------
// 🚀 SLASH COMMAND DEFINITIONS FOR DISCORD API
// -------------------------------------------------------------
const COMMAND_DEFINITIONS = [
  {
    name: 'search',
    description: '🔍 ค้นหาข้อมูลคลินิก (เวชระเบียน, คอร์ส, บิล POS, นัดหมาย, ยา)',
    options: [
      {
        type: 3, // STRING
        name: 'keyword',
        description: 'คำค้นหา (ชื่อคนไข้, รหัส HN, เบอร์โทร, เลขที่ใบเสร็จ, หรือชื่อยา)',
        required: true
      }
    ]
  },
  {
    name: 'patient',
    description: '📁 ค้นหาเวชระเบียนคนไข้ (ประวัติการรักษา, คอร์สคงเหลือ, นัดหมาย)',
    options: [
      {
        type: 3,
        name: 'keyword',
        description: 'ชื่อ-นามสกุล, ชื่อเล่น, รหัส HN (เช่น 001 หรือ HN69-0001), หรือเบอร์โทร',
        required: true
      }
    ]
  },
  {
    name: 'queue',
    description: '🗓️ ดูตารางคิวนัดหมาย (วันนี้, พรุ่งนี้, หรือระบุวันที่)',
    options: [
      {
        type: 3,
        name: 'date',
        description: 'ระบุ เช่น วันนี้, พรุ่งนี้, 13/09/2569 (เว้นว่างเพื่อดูวันนี้)',
        required: false
      }
    ]
  },
  {
    name: 'bill',
    description: '💵 ค้นหาบิล POS / ใบเสร็จรับเงิน',
    options: [
      {
        type: 3,
        name: 'keyword',
        description: 'เลขที่ใบเสร็จ (เช่น REC..., 22) หรือชื่อคนไข้ (เว้นว่างเพื่อดูบิลล่าสุด)',
        required: false
      }
    ]
  },
  {
    name: 'sales',
    description: '📊 สรุปยอดขายประจำวัน (เงินสด, โอน, บัตรเครดิต)',
    options: [
      {
        type: 3,
        name: 'date',
        description: 'ระบุ เช่น วันนี้, เมื่อวาน, 12/09/2569 (เว้นว่างเพื่อดูวันนี้)',
        required: false
      }
    ]
  },
  {
    name: 'stock',
    description: '💊 ค้นหาคลังยาและสินค้า / เช็คสินค้าใกล้หมด',
    options: [
      {
        type: 3,
        name: 'keyword',
        description: 'ชื่อยา หรือรหัสสินค้า (เว้นว่างเพื่อดู 10 รายการที่เหลือน้อยที่สุด)',
        required: false
      }
    ]
  },
  {
    name: 'help',
    description: '❓ ดูคำแนะนำและรายการคำสั่งทั้งหมดของคลินิก'
  }
];

// -------------------------------------------------------------
// 🌐 MAIN REQUEST HANDLER
// -------------------------------------------------------------
export default async function handler(req, res) {
  // 1. ลงทะเบียนคำสั่ง Slash Commands ผ่าน Discord REST API
  if (req.query?.action === 'register_commands' || req.query?.action === 'sync_commands') {
    try {
      const settings = await getDiscordSettings();
      const appId = req.query.appId || req.body?.appId || settings.applicationId;
      const botToken = req.query.token || req.body?.token || settings.botToken;

      if (!appId || !botToken) {
        return res.status(400).json({
          success: false,
          error: 'กรุณากรอก Discord Application ID และ Bot Token ในหน้าตั้งค่าก่อนทำการลงทะเบียนคำสั่ง'
        });
      }

      const discordRes = await fetch(`https://discord.com/api/v10/applications/${appId.trim()}/commands`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${botToken.trim()}`
        },
        body: JSON.stringify(COMMAND_DEFINITIONS)
      });

      if (!discordRes.ok) {
        const errJson = await discordRes.json().catch(() => ({}));
        return res.status(discordRes.status).json({
          success: false,
          error: 'Discord API Error',
          details: errJson
        });
      }

      const registered = await discordRes.json();
      return res.status(200).json({
        success: true,
        message: 'ลงทะเบียนคำสั่ง Discord Slash Commands สำเร็จเรียบร้อย!',
        commands: registered
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. Health check / status preview สำหรับเปิดผ่าน Browser (GET)
  if (req.method !== 'POST') {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Anping Clinic Discord Bot</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #f8fafc;">
          <h2>🏥 Anping Clinic Discord Interactions Endpoint is Running!</h2>
          <p style="color: #94a3b8;">ใช้เป็น Interactions Endpoint URL ใน Discord Developer Portal</p>
          <code style="background: #1e293b; padding: 8px 16px; border-radius: 8px; color: #38bdf8;">${WEBAPP_URL}/api/discord</code>
        </body>
      </html>
    `);
  }

  // 3. อ่าน raw body สำหรับตรวจสอบ Ed25519 signature
  let rawBody = '';
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    return res.status(400).send('Error reading request body');
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  // ดึงค่า Discord settings จาก Supabase / Env
  const discordSettings = await getDiscordSettings();
  const publicKey = discordSettings.publicKey;

  // ตรวจสอบลายเซ็น Ed25519 เพื่อความปลอดภัยตามมาตรฐาน Discord
  if (publicKey) {
    const isValid = verifyDiscordSignature(rawBody, signature, timestamp, publicKey);
    if (!isValid) {
      return res.status(401).send('Invalid request signature');
    }
  } else {
    // ถ้ายังไม่ได้ใส่ public key ให้แจ้งเตือนใน console แต่ไม่ขัดขวางหากเป็นการทดสอบ
    console.warn('⚠️ Warning: DISCORD_PUBLIC_KEY is not configured.');
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).send('Invalid JSON body');
  }

  // Discord PING (Type 1) -> ต้องตอบ PONG (Type 1) ทันที
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // Discord APPLICATION_COMMAND (Type 2)
  if (interaction.type === 2) {
    const cmdName = interaction.data?.name;
    const optionsList = interaction.data?.options || [];
    const options = {};
    for (const opt of optionsList) {
      options[opt.name] = opt.value;
    }

    const botAvatar = discordSettings.botAvatarUrl || '';
    const actionRow = {
      type: 1,
      components: [
        {
          type: 2, // BUTTON
          style: 5, // LINK
          label: '🌐 เปิดดูในระบบ Anping Clinic',
          url: WEBAPP_URL
        }
      ]
    };

    // Helper ตอบกลับ Discord Interaction
    const respond = (embed, components = [actionRow]) => {
      return res.status(200).json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          embeds: [embed],
          components
        }
      });
    };

    // -----------------------------------------------------------
    // COMMAND: /help
    // -----------------------------------------------------------
    if (cmdName === 'help') {
      const helpEmbed = buildHelpEmbed(botAvatar);
      return respond(helpEmbed);
    }

    // -----------------------------------------------------------
    // COMMAND: /sales [date]
    // -----------------------------------------------------------
    if (cmdName === 'sales') {
      if (!supabase) {
        return respond({
          title: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูล',
          description: 'ระบบไม่สามารถเชื่อมต่อ Supabase ได้ในขณะนี้',
          color: 0xf43f5e
        });
      }

      const { todayIso } = getTodayAndTomorrowThaiYMD();
      let targetYMD = todayIso;
      const dateArg = (options.date || '').trim();

      if (dateArg.includes('เมื่อวาน')) {
        const now = new Date();
        const thaiYest = new Date(now.getTime() + (7 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));
        const yYear = thaiYest.getUTCFullYear();
        const yMonth = String(thaiYest.getUTCMonth() + 1).padStart(2, '0');
        const yDay = String(thaiYest.getUTCDate()).padStart(2, '0');
        targetYMD = `${yYear}-${yMonth}-${yDay}`;
      } else if (dateArg) {
        const parsed = parseQueueDateToThaiYMD(dateArg);
        if (parsed) targetYMD = parsed;
      }

      const { data: posRaw } = await supabase.from('pos_transactions').select('*');
      const validTxns = (posRaw || []).filter(tx => {
        if (tx.is_deleted || tx.status === 'cancelled') return false;
        const rawTime = tx.created_at || tx.date;
        if (!rawTime) return false;
        try {
          const d = new Date(rawTime);
          if (isNaN(d.getTime())) return false;
          const txThai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
          return txThai.toISOString().split('T')[0] === targetYMD;
        } catch (e) {
          return false;
        }
      });

      let totalAmount = 0;
      let cashAmount = 0;
      let cashCount = 0;
      let transferAmount = 0;
      let transferCount = 0;
      let creditAmount = 0;
      let creditCount = 0;
      const uniquePatients = new Set();

      for (const tx of validTxns) {
        const amount = Number(tx.net_amount ?? tx.total_amount ?? 0);
        totalAmount += amount;
        const method = String(tx.payment_method || 'cash').toLowerCase();
        if (method.includes('transfer') || method.includes('โอน')) {
          transferAmount += amount;
          transferCount++;
        } else if (method.includes('credit') || method.includes('บัตร')) {
          creditAmount += amount;
          creditCount++;
        } else {
          cashAmount += amount;
          cashCount++;
        }
        const pName = String(tx.patient_name || tx.hn || '').trim();
        if (pName) uniquePatients.add(pName);
      }

      const [tYear, tMonth, tDay] = targetYMD.split('-');
      const thaiYearDisplay = parseInt(tYear, 10) > 2400 ? tYear : String(parseInt(tYear, 10) + 543);
      const dateStrThai = `${tDay}/${tMonth}/${thaiYearDisplay}`;

      const summary = {
        date: dateStrThai,
        totalAmount,
        billsCount: validTxns.length,
        patientsCount: uniquePatients.size,
        cashAmount,
        cashCount,
        transferAmount,
        transferCount,
        creditAmount,
        creditCount
      };

      const embed = buildSalesSummaryEmbed(summary, botAvatar);
      return respond(embed);
    }

    // -----------------------------------------------------------
    // COMMAND: /queue [date]
    // -----------------------------------------------------------
    if (cmdName === 'queue') {
      if (!supabase) {
        return respond({
          title: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูล',
          description: 'ระบบไม่สามารถเชื่อมต่อ Supabase ได้ในขณะนี้',
          color: 0xf43f5e
        });
      }

      const { todayIso, tomorrowIso } = getTodayAndTomorrowThaiYMD();
      const dateArg = (options.date || '').trim();
      let targetYMD = todayIso;
      let title = 'คิวนัดหมายวันนี้';

      if (dateArg.includes('พรุ่งนี้')) {
        targetYMD = tomorrowIso;
        title = 'คิวนัดหมายพรุ่งนี้';
      } else if (dateArg && !dateArg.includes('วันนี้')) {
        const parsed = parseQueueDateToThaiYMD(dateArg);
        if (parsed) {
          targetYMD = parsed;
          const [y, m, d] = targetYMD.split('-');
          const yDisp = parseInt(y, 10) > 2400 ? y : parseInt(y, 10) + 543;
          title = `คิวนัดหมายวันที่ ${d}/${m}/${yDisp}`;
        }
      }

      const { data: queueRaw } = await supabase.from('queue').select('*');
      const queueList = (queueRaw || [])
        .map(normalizeQueueRow)
        .filter(q => !q.isDeleted && parseQueueDateToThaiYMD(q.rawDateTime) === targetYMD);

      queueList.sort((a, b) => new Date(a.rawDateTime).getTime() - new Date(b.rawDateTime).getTime());

      const embed = buildQueueEmbed(queueList, title, botAvatar);
      return respond(embed);
    }

    // -----------------------------------------------------------
    // COMMAND: /bill [keyword]
    // -----------------------------------------------------------
    if (cmdName === 'bill') {
      if (!supabase) {
        return respond({
          title: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูล',
          description: 'ระบบไม่สามารถเชื่อมต่อ Supabase ได้ในขณะนี้',
          color: 0xf43f5e
        });
      }

      const recKw = (options.keyword || '').trim().toUpperCase();
      if (!recKw) {
        // ดึงบิลล่าสุด
        const { data: posRaw } = await supabase
          .from('pos_transactions')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (posRaw && posRaw.length > 0) {
          return respond(buildPosEmbed(posRaw[0], botAvatar));
        } else {
          return respond({
            title: '💵 บิลชำระเงิน POS',
            description: 'ไม่พบรายการบิลชำระเงินในระบบขณะนี้',
            color: 0x64748b
          });
        }
      }

      const { data: posRaw } = await supabase.from('pos_transactions').select('*');
      const matched = (posRaw || []).find(tx => {
        if (tx.is_deleted) return false;
        const rNo = String(tx.receipt_no || tx.id || '').toUpperCase();
        const pName = String(tx.patient_name || '').toUpperCase();
        if (rNo === recKw || rNo.includes(recKw) || pName.includes(recKw)) return true;
        const digitsOnly = recKw.replace(/[^0-9]/g, '');
        if (digitsOnly.length >= 2 && rNo.endsWith(digitsOnly)) return true;
        return false;
      });

      if (matched) {
        return respond(buildPosEmbed(matched, botAvatar));
      } else {
        return respond({
          title: '🔍 ไม่พบข้อมูลบิล',
          description: `ไม่พบบิลที่ตรงกับ "${recKw}" ในระบบคลินิกครับ`,
          color: 0xf43f5e
        });
      }
    }

    // -----------------------------------------------------------
    // COMMAND: /stock [keyword]
    // -----------------------------------------------------------
    if (cmdName === 'stock') {
      if (!supabase) {
        return respond({
          title: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูล',
          description: 'ระบบไม่สามารถเชื่อมต่อ Supabase ได้ในขณะนี้',
          color: 0xf43f5e
        });
      }

      const stockKw = (options.keyword || '').trim().toLowerCase();
      const { data: invRaw } = await supabase.from('inventory').select('*');
      const validItems = (invRaw || []).filter(it => !it.is_deleted);

      if (!stockKw) {
        // แสดง 10 รายการที่สต็อกเหลือน้อยที่สุด
        const sorted = [...validItems].sort((a, b) => {
          const qA = Number(a.stock_quantity ?? a.quantity ?? 0);
          const qB = Number(b.stock_quantity ?? b.quantity ?? 0);
          return qA - qB;
        });
        const top10 = sorted.slice(0, 10);
        return respond(buildInventoryEmbed(top10, '📦 รายการยา & สินค้าที่คงเหลือน้อยที่สุด', botAvatar));
      }

      const matched = validItems.filter(it => {
        const n = String(it.name || it.product_name || '').toLowerCase();
        const c = String(it.code || it.id || '').toLowerCase();
        return n.includes(stockKw) || c.includes(stockKw);
      });

      if (matched.length > 0) {
        return respond(buildInventoryEmbed(matched, `📦 ผลการค้นหายา: "${stockKw}"`, botAvatar));
      } else {
        return respond({
          title: '🔍 ไม่พบรายการยา',
          description: `ไม่พบยาหรือสินค้าที่ตรงกับคำค้นหา "${stockKw}" ในระบบคลัง`,
          color: 0xf43f5e
        });
      }
    }

    // -----------------------------------------------------------
    // COMMAND: /patient [keyword] OR /search [keyword]
    // -----------------------------------------------------------
    if (cmdName === 'patient' || cmdName === 'search') {
      if (!supabase) {
        return respond({
          title: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูล',
          description: 'ระบบไม่สามารถเชื่อมต่อ Supabase ได้ในขณะนี้',
          color: 0xf43f5e
        });
      }

      const rawKw = (options.keyword || '').trim();
      const cleanKw = rawKw.replace(/^(คุณ|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim().toLowerCase();

      // 🌟 SMART INTENT DETECTION (สำหรับคำสั่ง /search)
      if (cmdName === 'search') {
        // 1. ตรวจสอบว่าเป็นการถามหายอดขายหรือไม่ (เช่น "สรุปยอดเมื่อวาน", "ยอดขาย", "รายได้", "sales")
        const isSalesQuery = /^(สรุป)?(ยอด|ยอดขาย|รายได้|ขาย)/i.test(cleanKw) || cleanKw.includes('ยอดขาย') || cleanKw.includes('สรุปยอด') || cleanKw.includes('sales');
        if (isSalesQuery) {
          let salesDateArg = '';
          if (cleanKw.includes('เมื่อวาน')) salesDateArg = 'เมื่อวาน';
          else if (cleanKw.includes('วันนี้')) salesDateArg = 'วันนี้';
          else {
            const dateMatch = cleanKw.match(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/);
            if (dateMatch) salesDateArg = dateMatch[0];
          }

          const { todayIso } = getTodayAndTomorrowThaiYMD();
          let targetYMD = todayIso;
          if (salesDateArg.includes('เมื่อวาน')) {
            const now = new Date();
            const thaiYest = new Date(now.getTime() + (7 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));
            const yYear = thaiYest.getUTCFullYear();
            const yMonth = String(thaiYest.getUTCMonth() + 1).padStart(2, '0');
            const yDay = String(thaiYest.getUTCDate()).padStart(2, '0');
            targetYMD = `${yYear}-${yMonth}-${yDay}`;
          } else if (salesDateArg && salesDateArg !== 'วันนี้') {
            const parsed = parseQueueDateToThaiYMD(salesDateArg);
            if (parsed) targetYMD = parsed;
          }

          const { data: posRaw } = await supabase.from('pos_transactions').select('*');
          const validTxns = (posRaw || []).filter(tx => {
            if (tx.is_deleted || tx.status === 'cancelled') return false;
            const rawTime = tx.created_at || tx.date;
            if (!rawTime) return false;
            try {
              const d = new Date(rawTime);
              if (isNaN(d.getTime())) return false;
              const txThai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
              return txThai.toISOString().split('T')[0] === targetYMD;
            } catch (e) {
              return false;
            }
          });

          let totalAmount = 0;
          let cashAmount = 0;
          let cashCount = 0;
          let transferAmount = 0;
          let transferCount = 0;
          let creditAmount = 0;
          let creditCount = 0;
          const uniquePatients = new Set();

          for (const tx of validTxns) {
            const amount = Number(tx.net_amount ?? tx.total_amount ?? 0);
            totalAmount += amount;
            const method = String(tx.payment_method || 'cash').toLowerCase();
            if (method.includes('transfer') || method.includes('โอน')) {
              transferAmount += amount;
              transferCount++;
            } else if (method.includes('credit') || method.includes('บัตร')) {
              creditAmount += amount;
              creditCount++;
            } else {
              cashAmount += amount;
              cashCount++;
            }
            const pName = String(tx.patient_name || tx.hn || '').trim();
            if (pName) uniquePatients.add(pName);
          }

          const [tYear, tMonth, tDay] = targetYMD.split('-');
          const thaiYearDisplay = parseInt(tYear, 10) > 2400 ? tYear : String(parseInt(tYear, 10) + 543);
          const dateStrThai = `${tDay}/${tMonth}/${thaiYearDisplay}`;

          const summary = {
            date: dateStrThai,
            totalAmount,
            billsCount: validTxns.length,
            patientsCount: uniquePatients.size,
            cashAmount,
            cashCount,
            transferAmount,
            transferCount,
            creditAmount,
            creditCount
          };

          const embed = buildSalesSummaryEmbed(summary, botAvatar);
          embed.footer = {
            text: `Anping Clinic • ค้นหายอดขายอัตโนมัติจาก "${rawKw}" (แนะนำ: ใช้คำสั่ง /sales ได้โดยตรง)`
          };
          return respond(embed);
        }

        // 2. ตรวจสอบว่าเป็นการถามหาคิวหรือนัดหมายหรือไม่ (เช่น "คิววันนี้", "นัดหมายวันนี้")
        const isQueueQuery = /^(คิว|นัด|นัดหมาย|ตารางนัด)/i.test(cleanKw) || cleanKw.includes('คิววันนี้') || cleanKw.includes('นัดวันนี้');
        if (isQueueQuery) {
          const { todayIso, tomorrowIso } = getTodayAndTomorrowThaiYMD();
          let targetYMD = todayIso;
          let dateTitle = 'วันนี้';
          if (cleanKw.includes('พรุ่งนี้')) {
            targetYMD = tomorrowIso;
            dateTitle = 'วันพรุ่งนี้';
          } else if (cleanKw.includes('เมื่อวาน')) {
            const now = new Date();
            const thaiYest = new Date(now.getTime() + (7 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));
            const yYear = thaiYest.getUTCFullYear();
            const yMonth = String(thaiYest.getUTCMonth() + 1).padStart(2, '0');
            const yDay = String(thaiYest.getUTCDate()).padStart(2, '0');
            targetYMD = `${yYear}-${yMonth}-${yDay}`;
            dateTitle = 'เมื่อวานนี้';
          }

          const { data: queueRaw } = await supabase.from('queue').select('*');
          const queueList = (queueRaw || [])
            .map(normalizeQueueRow)
            .filter(q => !q.isDeleted && parseQueueDateToThaiYMD(q.rawDateTime || q.date) === targetYMD);

          queueList.sort((a, b) => new Date(a.rawDateTime).getTime() - new Date(b.rawDateTime).getTime());
          const embed = buildQueueEmbed(queueList, `คิวนัดหมายประจำ${dateTitle} (${targetYMD})`, botAvatar);
          embed.footer = {
            text: `Anping Clinic • ค้นหาคิวอัตโนมัติจาก "${rawKw}" (แนะนำ: ใช้คำสั่ง /queue ได้โดยตรง)`
          };
          return respond(embed);
        }
      }

      // 1. ค้นหาใน patients ก่อนเสมอ
      const { data: patientsRaw } = await supabase.from('patients').select('*');
      const patients = (patientsRaw || []).map(p => ({
        ...p,
        ...(p.data || {}),
        hn: p.hn || p.id || p.data?.hn || p.data?.id,
        firstName: p.first_name || p.firstName || p.data?.first_name || '',
        lastName: p.last_name || p.lastName || p.data?.last_name || '',
        nickname: p.nickname || p.nick_name || p.data?.nickname || '',
        name: p.name || p.data?.name || `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim(),
        phone: p.phone || p.tel || p.data?.phone || '',
        isDeleted: Boolean(p.is_deleted ?? p.data?.is_deleted ?? false)
      })).filter(p => !p.isDeleted);

      const kwDigits = cleanKw.replace(/\D/g, '');
      const isDigitsOnly = /^\d+$/.test(cleanKw);

      const matchedPt = patients.find(p => {
        // HN Match (ตัวเลข HN หรือรหัสเต็ม)
        if (isHnMatch(p.hn, cleanKw) || isHnMatch(p.hn, rawKw)) return true;

        // Phone Match: ต้องมีตัวเลขค้นหาอย่างน้อย 4 หลักขึ้นไปเท่านั้น ป้องกันข้อความว่าง
        if (kwDigits.length >= 4 && p.phone) {
          const pDigits = String(p.phone).replace(/\D/g, '');
          if (pDigits.includes(kwDigits)) return true;
        }

        // Name Match: ต้องค้นหาอย่างน้อย 2 ตัวอักษร
        if (cleanKw.length >= 2 && !isDigitsOnly) {
          if (p.firstName && p.firstName.toLowerCase().includes(cleanKw)) return true;
          if (p.lastName && p.lastName.toLowerCase().includes(cleanKw)) return true;
          if (p.name && p.name.toLowerCase().includes(cleanKw)) return true;
          if (p.nickname && p.nickname.toLowerCase() === cleanKw) return true;
        }

        return false;
      });

      if (matchedPt) {
        const pId = matchedPt.id || matchedPt.hn;
        const pHn = matchedPt.hn || matchedPt.id;
        const patientFilter = pId === pHn ? `patient_id.eq.${pId}` : `patient_id.eq.${pId},patient_id.eq.${pHn}`;

        const [queueRes, trtRes, courseRes] = await Promise.all([
          supabase.from('queue').select('*').eq('is_deleted', false),
          supabase.from('treatments').select('*').eq('is_deleted', false).or(patientFilter).order('created_at', { ascending: false }).limit(25),
          supabase.from('patient_courses').select('*').eq('is_deleted', false).or(patientFilter).limit(20)
        ]);

        const patientQueues = (queueRes.data || [])
          .map(normalizeQueueRow)
          .filter(q => !q.isDeleted && (isHnMatch(q.hn, pHn) || (q.patientName && q.patientName.includes(matchedPt.name))));

        const embed = buildPatientEmbed(matchedPt, patientQueues, trtRes.data || [], courseRes.data || [], botAvatar);

        const pPhone = matchedPt.phone || matchedPt.tel;
        const cleanPhone = String(pPhone || '').replace(/\D/g, '');
        const patientButtons = [
          {
            type: 2, // BUTTON
            style: 5, // LINK
            label: '🌐 เปิดดูประวัติคนไข้ในระบบ',
            url: WEBAPP_URL
          }
        ];

        if (cleanPhone && cleanPhone.length >= 9) {
          patientButtons.push({
            type: 2, // BUTTON
            style: 5, // LINK
            label: `📞 โทร ${formatThaiPhone(pPhone)}`,
            url: `${WEBAPP_URL}/api/call?tel=${cleanPhone}`
          });
        }

        const patientActionRow = {
          type: 1,
          components: patientButtons
        };

        return respond(embed, [patientActionRow]);
      }

      // 2. ถ้าเป็น /search แล้วไม่พบในเวชระเบียน: ลองค้นหาในคิวนัดหมาย
      if (cmdName === 'search') {
        const { data: queueRaw } = await supabase.from('queue').select('*');
        const queueList = (queueRaw || [])
          .map(normalizeQueueRow)
          .filter(q => !q.isDeleted && (
            isHnMatch(q.hn, cleanKw) ||
            (q.patientName && q.patientName.toLowerCase().includes(cleanKw))
          ));

        if (queueList.length > 0) {
          queueList.sort((a, b) => new Date(b.rawDateTime).getTime() - new Date(a.rawDateTime).getTime());
          const embed = buildQueueEmbed(queueList, `นัดหมายที่ตรงกับ "${rawKw}"`, botAvatar);
          return respond(embed);
        }

        // 3. ลองค้นหาในบิล POS
        const { data: posRaw } = await supabase.from('pos_transactions').select('*');
        const matchedTx = (posRaw || []).find(tx => {
          if (tx.is_deleted) return false;
          const rNo = String(tx.receipt_no || tx.id || '').toUpperCase();
          const pName = String(tx.patient_name || '').toUpperCase();
          return rNo.includes(rawKw.toUpperCase()) || pName.includes(rawKw.toUpperCase());
        });

        if (matchedTx) {
          return respond(buildPosEmbed(matchedTx, botAvatar));
        }

        // 4. ลองค้นหาในคลังยา
        const { data: invRaw } = await supabase.from('inventory').select('*');
        const matchedInv = (invRaw || []).filter(it => {
          if (it.is_deleted) return false;
          const n = String(it.name || it.product_name || '').toLowerCase();
          const c = String(it.code || it.id || '').toLowerCase();
          return n.includes(cleanKw) || c.includes(cleanKw);
        });

        if (matchedInv.length > 0) {
          return respond(buildInventoryEmbed(matchedInv, `📦 ผลการค้นหายา: "${rawKw}"`, botAvatar));
        }
      }

      // หากไม่พบข้อมูลใดๆ
      return respond({
        title: '🔍 ไม่พบข้อมูลที่ค้นหา',
        description: `ไม่พบข้อมูลที่ตรงกับ "${rawKw}" ในระบบคลินิกครับ\n\n` +
          `💡 **คำแนะนำการค้นหา:**\n` +
          `• ค้นหาคนไข้: พิมพ์ชื่อ, นามสกุล, เบอร์โทร, หรือรหัส HN (เช่น \`HN69-0001\`, \`001\`)\n` +
          `• ค้นหาคิวนัด: ใช้คำสั่ง \`/queue\`\n` +
          `• ค้นหาบิล: ใช้คำสั่ง \`/bill\`\n` +
          `• สรุปยอดขาย: ใช้คำสั่ง \`/sales\`\n` +
          `• พิมพ์ \`/help\` เพื่อดูคำแนะนำทั้งหมด`,
        color: 0x64748b
      });
    }

    // Default response สำหรับ command ที่ไม่รู้จัก
    return respond(buildHelpEmbed(botAvatar));
  }

  return res.status(200).json({ status: 'OK' });
}
