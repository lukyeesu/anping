import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Disable default body parser so we can get exact raw bytes for Ed25519 signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
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
async function getDiscordSettings() {
  let settings = {
    applicationId: process.env.DISCORD_APPLICATION_ID || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    botName: 'Anping Clinic Notifier',
    botAvatarUrl: ''
  };

  if (!supabase) return settings;

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
  const displayPhone = formatThaiPhone(patient.phone || patient.tel || '-');
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

  const fields = [
    {
      name: '👤 ข้อมูลพื้นฐาน',
      value: `• **ชื่อ-นามสกุล:** ${fullName}\n• **รหัส HN:** \`${hn}\`\n• **เบอร์โทร:** ${displayPhone}\n• **อายุ / เพศ:** ${ageStr} / ${genderStr}`,
      inline: false
    },
    {
      name: '⚠️ ข้อมูลทางการแพทย์',
      value: `• **แพ้ยา:** ${allergy}\n• **โรคประจำตัว:** ${underlyingDisease}`,
      inline: false
    }
  ];

  // คอร์สคงเหลือ
  const activeCourses = courseList.filter(c => !c.is_deleted && (c.remaining_sessions > 0 || c.remaining > 0));
  if (activeCourses.length > 0) {
    const courseLines = activeCourses.slice(0, 5).map(c => {
      const cName = c.course_name || c.name || c.data?.course_name || 'คอร์สการรักษา';
      const rem = c.remaining_sessions ?? c.remaining ?? c.data?.remaining_sessions ?? 0;
      const tot = c.total_sessions ?? c.total ?? c.data?.total_sessions ?? rem;
      const exp = c.expire_date || c.data?.expire_date;
      const expStr = exp ? ` (หมดอายุ ${formatThaiDateTime(exp)})` : '';
      return `• **${cName}**: เหลือ **${rem}/${tot}** ครั้ง${expStr}`;
    });
    fields.push({
      name: `💳 คอร์สคงเหลือ (${activeCourses.length} รายการ)`,
      value: courseLines.join('\n'),
      inline: false
    });
  } else {
    fields.push({
      name: '💳 คอร์สคงเหลือ',
      value: 'ไม่มีคอร์สการรักษาคงเหลือในระบบ',
      inline: false
    });
  }

  // ประวัติการตรวจล่าสุด
  const validTrts = treatmentList.filter(t => !t.is_deleted);
  if (validTrts.length > 0) {
    const trtLines = validTrts.slice(0, 3).map(t => {
      const vDate = formatThaiDateTime(t.created_at || t.visit_date || t.date);
      const doc = t.doctor || t.doctor_name || t.data?.doctor || '-';
      const diag = t.diagnosis || t.data?.diagnosis || t.symptoms || t.data?.symptoms || t.treatment || '-';
      const cost = t.total_cost || t.cost || t.data?.total_cost;
      const costStr = cost ? ` [฿${Number(cost).toLocaleString()}]` : '';
      return `• **${vDate}** โดย ${doc}\n  *การวินิจฉัย/การรักษา:* ${diag}${costStr}`;
    });
    fields.push({
      name: `🩺 ประวัติการรักษาล่าสุด (${validTrts.length} ครั้ง)`,
      value: trtLines.join('\n'),
      inline: false
    });
  }

  // นัดหมายที่กำลังจะมาถึง
  const validAppts = queueList.filter(q => !q.isDeleted);
  if (validAppts.length > 0) {
    const apptLines = validAppts.slice(0, 3).map(q => {
      const dt = formatThaiDateTime(q.rawDateTime || q.date);
      return `• **${dt}**: ${q.service} (แพทย์: ${q.doctor}) [${q.status}]`;
    });
    fields.push({
      name: `🗓️ นัดหมายที่กำลังจะมาถึง (${validAppts.length} รายการ)`,
      value: apptLines.join('\n'),
      inline: false
    });
  }

  return {
    author: {
      name: '🏥 ANPING CLINIC • PATIENT RECORD',
      icon_url: botAvatarUrl || undefined
    },
    title: `📁 เวชระเบียน: ${fullName} (${hn})`,
    description: `>>> ข้อมูลเวชระเบียนผู้รับบริการจากฐานข้อมูลคลินิก`,
    color: 0x0284c7, // Sky Blue
    fields,
    footer: {
      text: `Anping Clinic • ค้นหาเมื่อ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildQueueEmbed(queueList, titleText, botAvatarUrl = '') {
  const fields = [];
  if (queueList.length === 0) {
    fields.push({
      name: 'สถานะ',
      value: 'ไม่พบคิวนัดหมายในช่วงเวลาดังกล่าว'
    });
  } else {
    queueList.slice(0, 10).forEach((q, idx) => {
      const dt = formatThaiDateTime(q.rawDateTime || q.date);
      const phone = formatThaiPhone(q.phone);
      fields.push({
        name: `${idx + 1}. ⏰ ${dt} - ${q.patientName} (${q.hn})`,
        value: `• **แพทย์:** ${q.doctor}\n• **หัตถการ/บริการ:** ${q.service}\n• **เบอร์โทร:** ${phone}\n• **สถานะ:** \`${q.status}\``,
        inline: false
      });
    });

    if (queueList.length > 10) {
      fields.push({
        name: 'และคิวอื่นๆ',
        value: `ยังมีอีก ${queueList.length - 10} รายการ (เปิดดูทั้งหมดในระบบเว็บคลินิก)`
      });
    }
  }

  return {
    author: {
      name: '🏥 ANPING CLINIC • APPOINTMENTS',
      icon_url: botAvatarUrl || undefined
    },
    title: `🗓️ ${titleText} (${queueList.length} คิว)`,
    description: `>>> รายการคิวนัดหมายตรวจและรับบริการทางการแพทย์`,
    color: 0x0ea5e9,
    fields,
    footer: {
      text: `Anping Clinic • ข้อมูล ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildPosEmbed(tx, botAvatarUrl = '') {
  const rNo = tx.receipt_no || tx.id || '-';
  const pName = tx.patient_name || tx.patientName || tx.data?.patient_name || '-';
  const hn = tx.hn || tx.data?.hn || '-';
  const netAmount = Number(tx.net_amount ?? tx.total_amount ?? tx.data?.net_amount ?? 0);
  const paymentMethod = tx.payment_method || tx.data?.payment_method || 'เงินสด';
  const dt = formatThaiDateTime(tx.created_at || tx.date || tx.data?.created_at);

  const items = Array.isArray(tx.items) ? tx.items : (Array.isArray(tx.data?.items) ? tx.data.items : []);
  let itemsText = '-';
  if (items.length > 0) {
    itemsText = items.slice(0, 8).map((it, i) => {
      const name = it.name || it.item_name || 'สินค้า/บริการ';
      const qty = it.quantity || it.qty || 1;
      const price = Number(it.price || it.unit_price || 0);
      return `${i + 1}. **${name}** x${qty} (฿${price.toLocaleString()})`;
    }).join('\n');
    if (items.length > 8) itemsText += `\n*...และอีก ${items.length - 8} รายการ*`;
  }

  return {
    author: {
      name: '🏥 ANPING CLINIC • POS INVOICE',
      icon_url: botAvatarUrl || undefined
    },
    title: `💵 ใบเสร็จรับเงิน POS: ${rNo}`,
    description: `>>> **ผู้รับบริการ:** ${pName} (${hn})\n**วัน-เวลา:** ${dt}\n**ยอดชำระสุทธิ:** **฿${netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}** (${paymentMethod})`,
    color: 0x10b981, // Emerald Green
    fields: [
      {
        name: `📦 รายการสินค้า/บริการ (${items.length} รายการ)`,
        value: itemsText,
        inline: false
      }
    ],
    footer: {
      text: `Anping Clinic • ออกใบเสร็จเมื่อ ${dt}`
    }
  };
}

function buildSalesSummaryEmbed(summary, botAvatarUrl = '') {
  return {
    author: {
      name: '🏥 ANPING CLINIC • SALES REPORT',
      icon_url: botAvatarUrl || undefined
    },
    title: `📊 สรุปยอดขายประจำวัน: ${summary.date}`,
    description: `>>> ภาพรวมรายรับและการชำระเงินของคลินิกประจำวัน`,
    color: 0xf59e0b, // Amber
    fields: [
      {
        name: '💰 ยอดขายรวมทั้งสิ้น',
        value: `**฿${summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}** บาท`,
        inline: true
      },
      {
        name: '🧾 จำนวนบิลทั้งหมด',
        value: `**${summary.billsCount}** บิล (${summary.patientsCount} คนไข้)`,
        inline: true
      },
      {
        name: '💵 ยอดเงินสด',
        value: `฿${summary.cashAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${summary.cashCount} บิล)`,
        inline: true
      },
      {
        name: '📱 ยอดเงินโอน',
        value: `฿${summary.transferAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${summary.transferCount} บิล)`,
        inline: true
      },
      {
        name: '💳 ยอดบัตรเครดิต',
        value: `฿${summary.creditAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${summary.creditCount} บิล)`,
        inline: true
      }
    ],
    footer: {
      text: `Anping Clinic • สรุปยอด ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildInventoryEmbed(items, title = '📦 คลังยา & เวชภัณฑ์', botAvatarUrl = '') {
  const fields = items.slice(0, 10).map((it, i) => {
    const name = it.name || it.product_name || '-';
    const code = it.code || it.id || '-';
    const qty = Number(it.stock_quantity ?? it.quantity ?? 0);
    const unit = it.unit || 'หน่วย';
    const price = Number(it.price || it.sale_price || 0);
    const badge = qty <= 5 ? '🔴 ใกล้หมด' : (qty <= 15 ? '🟡 ปานกลาง' : '🟢 ปกติ');

    return {
      name: `${i + 1}. ${name} (${code})`,
      value: `• คงเหลือ: **${qty} ${unit}** [${badge}]\n• ราคาขาย: ฿${price.toLocaleString()}`,
      inline: false
    };
  });

  return {
    author: {
      name: '🏥 ANPING CLINIC • INVENTORY',
      icon_url: botAvatarUrl || undefined
    },
    title,
    description: `>>> ข้อมูลรายการยาและเวชภัณฑ์ในคลังคลินิก (${items.length} รายการ)`,
    color: 0x8b5cf6, // Violet
    fields,
    footer: {
      text: `Anping Clinic • สต็อก ณ ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })} น.`
    }
  };
}

function buildHelpEmbed(botAvatarUrl = '') {
  return {
    author: {
      name: '🏥 ANPING CLINIC • DISCORD BOT GUIDE',
      icon_url: botAvatarUrl || undefined
    },
    title: '📖 คู่มือคำสั่งค้นหาข้อมูลคลินิก (Slash Commands)',
    description: `>>> ท่านสามารถพิมพ์เครื่องหมาย \`/\` ในช่องแชทเพื่อเรียกใช้คำสั่งได้ทันที:`,
    color: 0x6366f1, // Indigo
    fields: [
      {
        name: '🔍 /search [keyword]',
        value: 'ค้นหาอัจฉริยะครอบคลุมทุกส่วน (เวชระเบียน, คอร์สคงเหลือ, บิล POS, คิวนัดหมาย, สต็อกยา)',
        inline: false
      },
      {
        name: '📁 /patient [keyword]',
        value: 'ค้นหาเวชระเบียนคนไข้โดยเฉพาะ (ชื่อ, HN, เบอร์โทร) พร้อมประวัติการรักษาและคอร์สคงเหลือ',
        inline: false
      },
      {
        name: '🗓️ /queue [date]',
        value: 'ดูตารางคิวนัดหมาย (พิมพ์ "วันนี้", "พรุ่งนี้", ระบุวันที่ เช่น 13/09/2569 หรือเว้นว่างเพื่อดูวันนี้)',
        inline: false
      },
      {
        name: '💵 /bill [keyword]',
        value: 'ค้นหาบิลชำระเงิน POS (ระบุเลขที่ใบเสร็จ เช่น REC69090022, 22 หรือเว้นว่างเพื่อดูบิลล่าสุด)',
        inline: false
      },
      {
        name: '📊 /sales [date]',
        value: 'สรุปยอดขายประจำวัน แยกยอดเงินสด เงินโอน บัตรเครดิต (พิมพ์ "วันนี้", "เมื่อวาน" หรือระบุวันที่)',
        inline: false
      },
      {
        name: '💊 /stock [keyword]',
        value: 'เช็คสต็อกยาและสินค้าในคลัง (ระบุชื่อยา หรือเว้นว่างเพื่อดู 10 รายการที่เหลือน้อยที่สุด)',
        inline: false
      }
    ],
    footer: {
      text: 'Anping Clinic Medical System • ระบบค้นหาอัจฉริยะผ่าน Discord'
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

      const matchedPt = patients.find(p =>
        isHnMatch(p.hn, cleanKw) ||
        isHnMatch(p.hn, rawKw) ||
        (p.firstName && p.firstName.toLowerCase().includes(cleanKw)) ||
        (p.lastName && p.lastName.toLowerCase().includes(cleanKw)) ||
        (p.name && p.name.toLowerCase().includes(cleanKw)) ||
        (p.nickname && p.nickname.toLowerCase().includes(cleanKw)) ||
        (p.phone && String(p.phone).replace(/\D/g, '').includes(cleanKw.replace(/\D/g, '')))
      );

      if (matchedPt) {
        const pId = matchedPt.id || matchedPt.hn;
        const pHn = matchedPt.hn || matchedPt.id;
        const patientFilter = pId === pHn ? `patient_id.eq.${pId}` : `patient_id.eq.${pId},patient_id.eq.${pHn}`;

        const [queueRes, trtRes, courseRes] = await Promise.all([
          supabase.from('queue').select('*').eq('is_deleted', false),
          supabase.from('treatments').select('*').eq('is_deleted', false).or(patientFilter).order('created_at', { ascending: false }).limit(10),
          supabase.from('patient_courses').select('*').eq('is_deleted', false).or(patientFilter).limit(10)
        ]);

        const patientQueues = (queueRes.data || [])
          .map(normalizeQueueRow)
          .filter(q => !q.isDeleted && (isHnMatch(q.hn, pHn) || (q.patientName && q.patientName.includes(matchedPt.name))));

        const embed = buildPatientEmbed(matchedPt, patientQueues, trtRes.data || [], courseRes.data || [], botAvatar);
        return respond(embed);
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
