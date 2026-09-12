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
  if (cleanK.length > 0 && cleanP.includes(cleanK)) return true;

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
// 🕒 THAI DATE & TIME HELPERS (UTC+7 GMT+7)
// -------------------------------------------------------------
function parseQueueDateToThaiYMD(rawStr) {
  if (!rawStr) return null;
  const str = String(rawStr).trim();

  // 1. รูปแบบวันไทย เช่น 12/09/2569 หรือ 12/09/2026
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const day = String(parseInt(slashMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(slashMatch[2], 10)).padStart(2, '0');
    let year = parseInt(slashMatch[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  // 2. รูปแบบ YYYY-MM-DD เช่น 2026-09-12 (ไม่มีเวลา T)
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch && !str.includes('T')) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 3. รูปแบบ ISO UTC เช่น 2026-09-12T06:00:00.000Z ให้แปลงเป็นเวลาไทย GMT+7
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

function normalizeQueueRow(q) {
  if (!q) return null;
  const data = q.data || {};
  return {
    ...q,
    ...data,
    id: q.id || data.id,
    hn: q.hn || data.hn || q.patient_id || data.patient_id || q.patientId || data.patientId || '-',
    patientName: q.patient_name || data.patient_name || q.patientName || data.patientName || q.name || data.name || 'ไม่ระบุชื่อ',
    rawDateTime: q.raw_date_time || data.raw_date_time || q.rawDateTime || data.rawDateTime || q.date || data.date || q.datetime || data.datetime || '',
    date: q.date || data.date || q.raw_date_time || data.raw_date_time || q.rawDateTime || data.rawDateTime || '',
    doctor: q.doctor || data.doctor || q.doctor_name || data.doctor_name || q.doctorName || data.doctorName || '-',
    service: q.service || data.service || q.service_type || data.service_type || q.serviceType || data.serviceType || '-',
    serviceType: q.service_type || data.service_type || q.serviceType || data.serviceType || q.service || data.service || '-',
    reason: q.reason || data.reason || q.symptoms || data.symptoms || q.service || data.service || '-',
    phone: q.phone || data.phone || q.tel || data.tel || '',
    status: q.status || data.status || 'pending',
    isDeleted: Boolean(q.is_deleted ?? data.is_deleted ?? q.isDeleted ?? data.isDeleted ?? false)
  };
}

// -------------------------------------------------------------
// 🎨 COLOR & STATUS HELPERS (จาก หลังบ้าน v.5 LINE.js)
// -------------------------------------------------------------
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

const WEBAPP_URL = "https://anpingclinic.vercel.app";

function extractFirstPhone(phoneStr) {
  if (!phoneStr || phoneStr === "-") return "-";
  const str = String(phoneStr);
  const parts = str.split(/[,/]|หรือ|และ|and|&/);
  const firstPhone = parts[0].replace(/\D/g, "");
  return firstPhone.length >= 9 ? firstPhone : "-";
}

function formatNotificationDate(dateStr, timeStr) {
  let finalDate = "-";
  let finalTime = "-";

  if (dateStr && dateStr !== "-") {
    if (dateStr.includes('/')) {
      const parts = dateStr.trim().split(' ');
      finalDate = parts[0];
      if (parts.length > 1) {
        finalTime = parts.slice(1).join(' ').replace('น.', '').trim() + ' น.';
      }
    } else {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const thaiTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
          const day = String(thaiTime.getUTCDate()).padStart(2, '0');
          const month = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
          const year = thaiTime.getUTCFullYear() + 543;
          finalDate = `${day}/${month}/${year}`;
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const h = String(thaiTime.getUTCHours()).padStart(2, '0');
            const m = String(thaiTime.getUTCMinutes()).padStart(2, '0');
            finalTime = `${h}:${m} น.`;
          }
        }
      } catch (e) {}
    }
  }

  if (timeStr && timeStr !== "-") {
    finalTime = timeStr.replace('น.', '').trim() + ' น.';
  }

  return { date: finalDate, time: finalTime };
}

function getStatusInfo(statusKey, settings = []) {
  const s = String(statusKey || '').toLowerCase();
  const apptStatusesRecord = settings.find(st => st.id === 'appointment_statuses');
  const customStatuses = apptStatusesRecord ? (apptStatusesRecord.data?.statuses || apptStatusesRecord.statuses || []) : [];
  const matchedStatus = customStatuses.find(st => s.includes(st.label.toLowerCase()) || st.label.toLowerCase().includes(s));
  
  if (matchedStatus) {
     return { label: matchedStatus.label, colorHex: colorHexMap[matchedStatus.color] || '#0284c7' };
  }

  if (s.includes('confirm') || s.includes('ยืนยันแล้ว')) return { label: 'ยืนยันแล้ว', colorHex: '#10b981' };
  if (s.includes('cancel') || s.includes('ยกเลิก')) return { label: 'ยกเลิก', colorHex: '#f43f5e' };
  if (s.includes('resched') || s.includes('เลื่อน')) return { label: 'เลื่อนนัด', colorHex: '#8b5cf6' };
  if (s.includes('complete') || s.includes('เสร็จสิ้น')) return { label: 'เสร็จสิ้น', colorHex: '#0ea5e9' };
  return { label: statusKey || 'รอยืนยัน', colorHex: '#f59e0b' };
}

function getThaiNotificationTimestamp(d = new Date()) {
  try {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const thai = new Date(validDate.getTime() + (7 * 60 * 60 * 1000));
    const day = String(thai.getUTCDate()).padStart(2, '0');
    const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
    const year = thai.getUTCFullYear() + 543;
    const hours = String(thai.getUTCHours()).padStart(2, '0');
    const minutes = String(thai.getUTCMinutes()).padStart(2, '0');
    return `Anping Clinic • วันที่ ${day}/${month}/${year} ${hours}:${minutes} น.`;
  } catch (e) {
    return 'Anping Clinic';
  }
}

// -------------------------------------------------------------
// 🎨 MODERN UNIFIED FLEX MESSAGE BUILDERS
// -------------------------------------------------------------

function parseToTimestamp(raw) {
  if (!raw) return 0;
  const str = String(raw).trim();
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    let yr = parseInt(m[3], 10);
    if (yr > 2400) yr -= 543;
    const hr = m[4] ? parseInt(m[4], 10) : 0;
    const min = m[5] ? parseInt(m[5], 10) : 0;
    return new Date(yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10), hr, min).getTime();
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatThaiVisitDate(raw) {
  if (!raw || raw === '-') return '-';
  const str = String(raw).trim();
  
  // 1. Format: DD/MM/YYYY (Thai or AD) with optional time
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = parseInt(slashMatch[3], 10);
    if (year < 2400) year += 543;
    const time = slashMatch[4] ? ` (${slashMatch[4]}:${slashMatch[5]} น.)` : '';
    return `${day}/${month}/${year}${time}`;
  }

  // 2. Format: ISO Date (e.g. 2026-09-12T07:07:30.332Z)
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
  } catch(_e) {}

  return str;
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

function createPatientFlex(patient, queueList = [], treatmentList = [], courseList = []) {
  const fullName = patient.name || `${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const rawPhone = patient.phone || patient.tel || '-';
  const displayPhone = formatThaiPhone(rawPhone);
  const firstPhone = extractFirstPhone(rawPhone);
  const allergy = patient.drugAllergy || patient.drug_allergy || patient.allergy || patient.allergies || 'ไม่มี';
  const underlyingDisease = patient.underlying_disease || patient.underlyingDisease || patient.disease || '';

  // คำนวณอายุอย่างแม่นยำ
  let ageStr = '-';
  if (patient.age) {
    ageStr = `${patient.age} ปี`;
  } else if (patient.dob) {
    const cleanDob = String(patient.dob).trim();
    const parts = cleanDob.split(/[\/\-]/);
    if (parts.length === 3) {
      let birthYear = parseInt(parts[0].length === 4 ? parts[0] : parts[2], 10);
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear)) {
        if (birthYear > 2400) birthYear -= 543;
        const calculatedAge = currentYear - birthYear;
        if (calculatedAge >= 0 && calculatedAge <= 120) {
          ageStr = `${calculatedAge} ปี`;
        }
      }
    }
  }
  const gender = patient.gender || '-';

  // ค้นหาวันที่รักษาล่าสุด และรายละเอียดการรักษาล่าสุด
  let lastVisitRaw = '';
  let latestTreatmentName = '';
  let latestDoctor = '';

  // 1. ดึงจาก treatmentList (ตาราง treatments ใน Supabase)
  if (treatmentList && treatmentList.length > 0) {
    const validTrts = treatmentList.filter(t => !t.is_deleted);
    if (validTrts.length > 0) {
      validTrts.sort((a, b) => {
        const timeA = parseToTimestamp(a.created_at || a.datetime || a.date);
        const timeB = parseToTimestamp(b.created_at || b.datetime || b.date);
        return timeB - timeA;
      });
      const latestTrt = validTrts[0];
      const trtDateTime = latestTrt.datetime || (latestTrt.date ? (latestTrt.time ? `${latestTrt.date} ${latestTrt.time}` : latestTrt.date) : '') || latestTrt.created_at || '';
      lastVisitRaw = trtDateTime;
      latestDoctor = latestTrt.doctor || '';
      if (Array.isArray(latestTrt.prescription) && latestTrt.prescription.length > 0) {
        latestTreatmentName = latestTrt.prescription.filter(Boolean).join(', ');
      } else if (typeof latestTrt.prescription === 'string' && latestTrt.prescription.trim()) {
        latestTreatmentName = latestTrt.prescription.trim();
      } else if (latestTrt.treatment_detail) {
        latestTreatmentName = latestTrt.treatment_detail;
      } else if (latestTrt.chief_complaint) {
        latestTreatmentName = latestTrt.chief_complaint;
      }
    }
  }

  // 2. สำรอง: ดึงจาก queueList (คิวนัดหมายที่ผ่านการรักษาแล้ว)
  if (!lastVisitRaw && queueList && queueList.length > 0) {
    try {
      const pId = patient.hn || patient.id;
      const patientAppts = queueList.filter(q => 
        q.hn === pId || q.patientId === pId || q.patient_id === pId ||
        (patient.name && q.patientName && q.patientName.includes(patient.name))
      );
      if (patientAppts.length > 0) {
        const pastAppts = patientAppts.filter(q => {
          const d = new Date(q.rawDateTime || q.date || 0);
          return !isNaN(d.getTime()) && (d.getTime() <= Date.now() || q.treated);
        });
        if (pastAppts.length > 0) {
          pastAppts.sort((a, b) => new Date(b.rawDateTime || b.date || 0).getTime() - new Date(a.rawDateTime || a.date || 0).getTime());
          const latest = pastAppts[0];
          lastVisitRaw = latest.datetime || latest.date || latest.rawDateTime || '';
          if (!latestDoctor && latest.doctor) latestDoctor = latest.doctor;
          if (!latestTreatmentName && (latest.service || latest.reason)) latestTreatmentName = latest.service || latest.reason;
        }
      }
    } catch(_e) {}
  }

  // 3. สำรอง: จากฟิลด์ใน patient
  if (!lastVisitRaw) {
    lastVisitRaw = patient.lastVisit || patient.last_visit || patient.data?.lastVisit || patient.data?.last_visit || '';
  }

  const lastVisitFormatted = formatThaiVisitDate(lastVisitRaw);

  // คอร์สคงเหลือของคนไข้
  let remainingCoursesText = '';
  if (courseList && courseList.length > 0) {
    const activeCourses = courseList.filter(c => !c.is_deleted && Number(c.remaining_sessions ?? c.remainingSessions ?? 0) > 0);
    if (activeCourses.length > 0) {
      remainingCoursesText = activeCourses.map(c => {
        const cName = c.course_name || c.courseName || 'คอร์ส';
        const rem = c.remaining_sessions ?? c.remainingSessions ?? 0;
        return `${cName} (${rem} ครั้ง)`;
      }).join(', ');
    }
  }

  const patientRows = [
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": displayPhone, "size": "sm", "color": "#0ea5e9", "weight": "bold", "flex": 6 }
      ]
    },
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "อายุ/เพศ", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": `${ageStr} / ${gender}`, "size": "sm", "color": "#334155", "flex": 6 }
      ]
    },
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "รักษาล่าสุด", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": lastVisitFormatted, "size": "sm", "color": "#0f172a", "weight": "bold", "flex": 6, "wrap": true }
      ]
    },
    ...(latestTreatmentName ? [{
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "รายการรักษา", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": latestTreatmentName, "size": "sm", "color": "#334155", "flex": 6, "wrap": true }
      ]
    }] : []),
    ...(latestDoctor && latestDoctor !== '-' ? [{
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "แพทย์ผู้ตรวจ", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": latestDoctor, "size": "sm", "color": "#334155", "flex": 6, "wrap": true }
      ]
    }] : []),
    ...(remainingCoursesText ? [{
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "คอร์สคงเหลือ", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": remainingCoursesText, "size": "sm", "color": "#d97706", "weight": "bold", "flex": 6, "wrap": true }
      ]
    }] : [])
  ];

  if (allergy && allergy !== 'ไม่มี' && allergy !== '-') {
    patientRows.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "ประวัติแพ้ยา", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": allergy, "size": "sm", "color": "#ef4444", "weight": "bold", "flex": 6, "wrap": true }
      ]
    });
  }

  if (underlyingDisease && underlyingDisease !== 'ไม่มี' && underlyingDisease !== '-') {
    patientRows.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "โรคประจำตัว", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": underlyingDisease, "size": "sm", "color": "#e11d48", "weight": "bold", "flex": 6, "wrap": true }
      ]
    });
  }

  return {
    "type": "flex",
    "altText": `เวชระเบียน: ${fullName} (${hn})`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#0284c7",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": "เวชระเบียน",
            "color": "#ffffff",
            "weight": "bold",
            "size": "md"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "contents": [
          {
            "type": "text",
            "text": fullName,
            "weight": "bold",
            "size": "xl",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": hn && hn !== '-' ? (hn.startsWith('HN') ? hn : `HN: ${hn}`) : "คนไข้ทั่วไป",
            "size": "sm",
            "color": "#64748b",
            "margin": "xs"
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "md",
            "spacing": "sm",
            "contents": patientRows
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "14px",
        "paddingTop": "0px",
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "color": "#e0f2fe",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "ดูนัดหมาย",
              "text": `ดูนัดหมาย ${hn && hn !== '-' ? hn : fullName}`
            }
          },
          {
            "type": "button",
            "style": "primary",
            "color": "#0ea5e9",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "พิมพ์ใบ OPD",
              "uri": `${WEBAPP_URL}?print_opd=${encodeURIComponent(hn)}`
            }
          },
          {
            "type": "text",
            "text": getThaiNotificationTimestamp(),
            "size": "xxs",
            "color": "#94a3b8",
            "align": "center",
            "margin": "sm",
            "wrap": true
          }
        ]
      }
    }
  };
}

function createAppointmentCarouselFlex(appts, titleStr, settings = []) {
  const cleanTitle = titleStr.replace(/^นัดหมายของ\s*/, '').replace(/["']/g, '');

  if (!appts || appts.length === 0) {
    return {
      "type": "flex",
      "altText": `นัดหมาย: ${cleanTitle}`,
      "contents": {
        "type": "bubble",
        "size": "kilo",
        "header": {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#0284c7",
          "paddingAll": "md",
          "contents": [
            {
              "type": "text",
              "text": "นัดหมายคนไข้",
              "color": "#ffffff",
              "weight": "bold",
              "size": "md"
            }
          ]
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "paddingAll": "lg",
          "contents": [
            {
              "type": "text",
              "text": cleanTitle,
              "weight": "bold",
              "size": "xl",
              "color": "#0f172a",
              "wrap": true
            },
            {
              "type": "separator",
              "margin": "md"
            },
            {
              "type": "text",
              "text": `ไม่พบรายการนัดหมายที่รอรับบริการของ "${cleanTitle}" ในระบบขณะนี้`,
              "size": "sm",
              "color": "#64748b",
              "margin": "md",
              "wrap": true
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "spacing": "sm",
          "paddingAll": "14px",
          "paddingTop": "0px",
          "contents": [
            {
              "type": "button",
              "style": "secondary",
              "color": "#e0f2fe",
              "height": "sm",
              "action": {
                "type": "message",
                "label": "ดูประวัติ",
                "text": `ค้นหา ${cleanTitle}`
              }
            },
            {
              "type": "button",
              "style": "primary",
              "color": "#0ea5e9",
              "height": "sm",
              "action": {
                "type": "uri",
                "label": "➕ นัดหมายใหม่ ↗",
                "uri": WEBAPP_URL
              }
            }
          ]
        }
      }
    };
  }

  const bubbles = appts.slice(0, 10).map((appt) => {
    const rawStatus = appt.status || appt.dealStatus || "pending";
    const statusInfo = getStatusInfo(rawStatus, settings);

    const { date: finalDateStr, time: timeStr } = formatNotificationDate(
      appt.datetime || appt.raw_date_time || appt.rawDateTime || appt.date || "-", 
      appt.time || "-"
    );

    const hn = appt.hn || appt.patient_id || appt.patientId || "-";
    const patientName = appt.patientName || appt.patient_name || appt.firstName || appt.first_name || appt.name || "ไม่ระบุชื่อ";
    const doctor = appt.doctor || appt.doctorName || appt.doctor_name || appt.artist || "-";
    const reason = appt.reason || appt.service || appt.serviceType || appt.symptoms || appt.symptom || "-";
    const serviceType = appt.serviceType || appt.service_type || "-";
    const phone = appt.phone || "-";
    const firstPhone = extractFirstPhone(phone);

    return {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": statusInfo.colorHex || "#10b981",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": statusInfo.label || "ยืนยันแล้ว",
            "color": "#ffffff",
            "weight": "bold",
            "size": "md"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "contents": [
          {
            "type": "text",
            "text": patientName,
            "weight": "bold",
            "size": "xl",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": hn && hn !== '-' ? (hn.startsWith('HN') ? hn : `HN: ${hn}`) : "คนไข้คลินิก",
            "size": "sm",
            "color": "#64748b",
            "margin": "xs"
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "md",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "วันที่", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": finalDateStr, "size": "sm", "color": "#0f172a", "weight": "bold", "flex": 6 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เวลา", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": timeStr, "size": "sm", "color": "#0f172a", "weight": "bold", "flex": 6 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ประเภทบริการ", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": serviceType, "size": "sm", "color": "#334155", "flex": 6, "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "อาการ", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": reason, "size": "sm", "color": "#334155", "flex": 6, "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "แพทย์", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": doctor, "size": "sm", "color": "#334155", "flex": 6, "wrap": true }
                ]
              },
              ...(phone && phone !== '-' ? [{
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": phone, "size": "sm", "color": "#0ea5e9", "weight": "bold", "flex": 6 }
                ]
              }] : [])
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "14px",
        "paddingTop": "0px",
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "color": "#e0f2fe",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "ดูประวัติ",
              "text": `ค้นหา ${hn && hn !== '-' ? hn : patientName}`
            }
          },
          {
            "type": "button",
            "style": "primary",
            "color": "#0ea5e9",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "โทร",
              "uri": firstPhone !== '-' ? `tel:${firstPhone}` : WEBAPP_URL
            }
          },
          {
            "type": "text",
            "text": getThaiNotificationTimestamp(),
            "size": "xxs",
            "color": "#94a3b8",
            "align": "center",
            "margin": "sm",
            "wrap": true
          }
        ]
      }
    };
  });

  return {
    "type": "flex",
    "altText": `นัดหมาย: ${cleanTitle}`,
    "contents": bubbles.length === 1 ? bubbles[0] : { "type": "carousel", "contents": bubbles }
  };
}

function createMenuFlex() {
  return {
    "type": "flex",
    "altText": "📋 เมนูคำสั่งลัดระบบคลินิก (Anping Clinic)",
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#1e40af",
        "paddingAll": "16px",
        "contents": [
          {
            "type": "text",
            "text": "🏥 ANPING CLINIC",
            "color": "#bfdbfe",
            "size": "xs",
            "weight": "bold"
          },
          {
            "type": "text",
            "text": "📋 เมนูคำสั่งลัดระบบคลินิก",
            "color": "#ffffff",
            "size": "md",
            "weight": "bold",
            "margin": "xs"
          },
          {
            "type": "text",
            "text": "แตะปุ่มเพื่อดูข้อมูลหรือสั่งงานบอทได้ทันที",
            "color": "#e0e7ff",
            "size": "xxs",
            "margin": "xs"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "16px",
        "spacing": "md",
        "contents": [
          {
            "type": "text",
            "text": "📊 สรุปยอดและการเงิน",
            "size": "xs",
            "color": "#64748b",
            "weight": "bold"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "color": "#1e40af",
                "height": "sm",
                "flex": 1,
                "action": {
                  "type": "message",
                  "label": "📊 สรุปยอดวันนี้",
                  "text": "สรุปยอดขายประจำวัน"
                }
              },
              {
                "type": "button",
                "style": "secondary",
                "color": "#eff6ff",
                "height": "sm",
                "flex": 1,
                "action": {
                  "type": "message",
                  "label": "⏮️ ยอดเมื่อวาน",
                  "text": "สรุปยอดเมื่อวาน"
                }
              }
            ]
          },
          {
            "type": "separator"
          },
          {
            "type": "text",
            "text": "📅 ตารางคิวนัดหมาย",
            "size": "xs",
            "color": "#64748b",
            "weight": "bold"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "color": "#0ea5e9",
                "height": "sm",
                "flex": 1,
                "action": {
                  "type": "message",
                  "label": "📅 นัดหมายวันนี้",
                  "text": "นัดหมายวันนี้"
                }
              },
              {
                "type": "button",
                "style": "secondary",
                "color": "#f0f9ff",
                "height": "sm",
                "flex": 1,
                "action": {
                  "type": "message",
                  "label": "🗓️ นัดพรุ่งนี้",
                  "text": "นัดหมายพรุ่งนี้"
                }
              }
            ]
          },
          {
            "type": "separator"
          },
          {
            "type": "text",
            "text": "🧾 บิล & ยา & คนไข้",
            "size": "xs",
            "color": "#64748b",
            "weight": "bold"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "color": "#059669",
                "height": "sm",
                "flex": 1,
                "action": {
                  "type": "message",
                  "label": "🧾 บิลล่าสุด",
                  "text": "บิลล่าสุด"
                }
              },
              {
                "type": "button",
                "style": "secondary",
                "color": "#ecfdf5",
                "height": "sm",
                "flex": 1,
                "action": {
                  "type": "message",
                  "label": "📦 คลังยา/สต็อก",
                  "text": "เช็คสต็อก"
                }
              }
            ]
          },
          {
            "type": "button",
            "style": "secondary",
            "color": "#f8fafc",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "🔍 วิธีค้นหาคนไข้ / HN",
              "text": "ค้นหาคนไข้"
            }
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "14px",
        "paddingTop": "0px",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#0284c7",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "🌐 เปิดดูในระบบ Anping Clinic ↗",
              "uri": WEBAPP_URL
            }
          },
          {
            "type": "text",
            "text": getThaiNotificationTimestamp(),
            "size": "xxs",
            "color": "#94a3b8",
            "align": "center",
            "margin": "sm",
            "wrap": true
          }
        ]
      }
    }
  };
}

function createInventoryFlex(item) {
  const name = item.name || item.product_name || 'สินค้า/เวชภัณฑ์';
  const code = item.code || item.id || '-';
  const category = item.category || 'ทั่วไป';
  const qty = item.stock_quantity ?? item.quantity ?? 0;
  const unit = item.unit || 'ชิ้น';
  const price = item.selling_price ?? item.price ?? 0;

  return {
    "type": "flex",
    "altText": `📦 สต็อกสินค้า/ยา: ${name} (${qty} ${unit})`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#059669",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": "📦 ข้อมูลสต็อกยา & เวชภัณฑ์",
            "color": "#ffffff",
            "weight": "bold",
            "size": "md"
          },
          {
            "type": "text",
            "text": `รหัส: ${code} • หมวด: ${category}`,
            "color": "#a7f3d0",
            "size": "xs",
            "margin": "xs"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "contents": [
          {
            "type": "text",
            "text": name,
            "weight": "bold",
            "size": "lg",
            "color": "#064e3b"
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "md",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "คงเหลือในคลัง", "size": "sm", "color": "#64748b", "flex": 5 },
                  { "type": "text", "text": `${qty} ${unit}`, "size": "sm", "color": qty > 5 ? "#059669" : "#dc2626", "weight": "bold", "flex": 5, "align": "end" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ราคาจำหน่าย", "size": "sm", "color": "#64748b", "flex": 5 },
                  { "type": "text", "text": `฿${Number(price).toLocaleString()} / ${unit}`, "size": "sm", "color": "#0f172a", "weight": "bold", "flex": 5, "align": "end" }
                ]
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "14px",
        "paddingTop": "0px",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#059669",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "🌐 เปิดดูในระบบคลัง ↗",
              "uri": WEBAPP_URL
            }
          },
          {
            "type": "text",
            "text": getThaiNotificationTimestamp(),
            "size": "xxs",
            "color": "#94a3b8",
            "align": "center",
            "margin": "sm",
            "wrap": true
          }
        ]
      }
    }
  };
}

function createPosFlex(pos) {
  const data = pos.data || {};
  const patientName = pos.patient_name || pos.patientName || data.patient_name || data.patientName || pos.customerName || data.customerName || 'ลูกค้าทั่วไป';
  const totalAmount = Number(
    pos.net_amount ??
    pos.total_amount ??
    pos.totalAmount ??
    pos.grandTotal ??
    pos.grand_total ??
    pos.total ??
    pos.amount ??
    data.net_amount ??
    data.total_amount ??
    data.totalAmount ??
    data.grandTotal ??
    data.grand_total ??
    data.total ??
    0
  );
  const id = pos.receipt_no || pos.receiptNo || pos.id || data.receipt_no || data.receiptNo || data.id || '-';
  
  // Payment method translation
  let rawPay = String(pos.payment_method || pos.paymentMethod || data.payment_method || data.paymentMethod || 'เงินสด').toLowerCase();
  let payMethod = '💵 เงินสด';
  if (rawPay.includes('transfer') || rawPay.includes('โอน')) {
    payMethod = '📲 โอนเงิน (QR Code)';
  } else if (rawPay.includes('credit') || rawPay.includes('card') || rawPay.includes('บัตร')) {
    payMethod = '💳 บัตรเครดิต';
  } else if (rawPay.includes('cash') || rawPay.includes('สด')) {
    payMethod = '💵 เงินสด';
  } else if (rawPay && rawPay !== '-') {
    payMethod = pos.payment_method || pos.paymentMethod || rawPay;
  }

  const staff = pos.staff_name || pos.staff || pos.seller_name || pos.cashier || data.staff_name || data.staff || 'เจ้าหน้าที่';
  const phone = pos.phone || pos.tel || data.phone || data.tel || '';

  // Thai Date formatting
  let dateStr = '-';
  const rawTime = pos.created_at || pos.datetime || pos.date || data.created_at || data.datetime || data.date;
  if (rawTime) {
    try {
      const d = new Date(rawTime);
      if (!isNaN(d.getTime())) {
        const thai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
        const day = String(thai.getUTCDate()).padStart(2, '0');
        const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
        const year = thai.getUTCFullYear() + 543;
        const hours = String(thai.getUTCHours()).padStart(2, '0');
        const minutes = String(thai.getUTCMinutes()).padStart(2, '0');
        dateStr = `${day}/${month}/${year} ${hours}:${minutes} น.`;
      } else {
        dateStr = String(rawTime);
      }
    } catch (_e) {
      dateStr = String(rawTime);
    }
  }

  // Items list
  const rawItems = pos.items || data.items || [];
  let itemContents = [];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    itemContents = rawItems.slice(0, 5).map((it) => {
      const itName = it.name || it.courseName || it.product_name || 'รายการสินค้า/บริการ';
      const itQty = it.quantity || it.qty || 1;
      const itPrice = it.total || it.price || 0;
      return {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": `• ${itName} x${itQty}`, "size": "xs", "color": "#334155", "flex": 7, "wrap": true },
          { "type": "text", "text": `฿${Number(itPrice).toLocaleString()}`, "size": "xs", "color": "#0f172a", "weight": "bold", "flex": 3, "align": "end" }
        ]
      };
    });
  }

  return {
    "type": "flex",
    "altText": `🧾 ใบเสร็จรับเงิน/บิล POS: ฿${Number(totalAmount).toLocaleString()} (${id})`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#0284c7",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": "🧾 ใบเสร็จรับเงิน / บิล POS",
            "color": "#ffffff",
            "weight": "bold",
            "size": "md"
          },
          {
            "type": "text",
            "text": `เลขที่: ${String(id)}`,
            "color": "#e0f2fe",
            "size": "xs",
            "margin": "xs"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ลูกค้า", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(patientName), "size": "sm", "color": "#0f172a", "weight": "bold", "flex": 6, "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "วันเวลา", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(dateStr), "size": "sm", "color": "#334155", "flex": 6 }
                ]
              },
              ...(phone ? [{
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(phone), "size": "sm", "color": "#0284c7", "weight": "bold", "flex": 6 }
                ]
              }] : []),
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ช่องทางชำระ", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(payMethod), "size": "sm", "color": "#334155", "flex": 6 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ผู้บันทึก", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(staff), "size": "sm", "color": "#334155", "flex": 6, "wrap": true }
                ]
              }
            ]
          },
          ...(itemContents.length > 0 ? [
            { "type": "separator", "margin": "md" },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "md",
              "spacing": "xs",
              "contents": [
                { "type": "text", "text": "รายการสินค้า / บริการ:", "size": "xs", "color": "#64748b", "weight": "bold" },
                ...itemContents
              ]
            }
          ] : []),
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "margin": "md",
            "contents": [
              { "type": "text", "text": "ยอดสุทธิ", "size": "md", "color": "#0f172a", "weight": "bold", "flex": 4 },
              { "type": "text", "text": `฿${Number(totalAmount).toLocaleString()}`, "size": "xl", "color": "#0284c7", "weight": "bold", "flex": 6, "align": "end" }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "14px",
        "paddingTop": "0px",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#0ea5e9",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "📄 ดู/พิมพ์ใบเสร็จ ↗",
              "uri": `${WEBAPP_URL}?print_pos=${encodeURIComponent(id)}`
            }
          },
          {
            "type": "text",
            "text": getThaiNotificationTimestamp(),
            "size": "xxs",
            "color": "#94a3b8",
            "align": "center",
            "margin": "sm",
            "wrap": true
          }
        ]
      }
    }
  };
}

function createDailySalesSummaryFlex(summary, branchName = 'สาขาหลัก') {
  const totalAmount = summary.totalAmount || 0;
  const billsCount = summary.billsCount || 0;
  const patientsCount = summary.patientsCount || 0;
  const cashAmount = summary.cashAmount || 0;
  const transferAmount = summary.transferAmount || 0;
  const creditAmount = summary.creditAmount || 0;
  const dateStr = summary.date || '';

  return {
    "type": "flex",
    "altText": `📊 สรุปยอดขายประจำวัน: ฿${Number(totalAmount).toLocaleString()} (${dateStr})`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#1e40af",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": "📊 สรุปยอดขายประจำวัน",
            "color": "#ffffff",
            "weight": "bold",
            "size": "md"
          },
          {
            "type": "text",
            "text": `ประจำวันที่ ${dateStr} • ${branchName}`,
            "color": "#bfdbfe",
            "size": "xs",
            "margin": "xs"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#eff6ff",
            "cornerRadius": "md",
            "paddingAll": "md",
            "contents": [
              {
                "type": "text",
                "text": "ยอดขายรวมสุทธิ",
                "size": "xs",
                "color": "#1e40af",
                "weight": "bold"
              },
              {
                "type": "text",
                "text": `฿${Number(totalAmount).toLocaleString()}`,
                "size": "xxl",
                "color": "#1e3a8a",
                "weight": "bold",
                "margin": "xs"
              },
              {
                "type": "text",
                "text": `ทั้งหมด ${billsCount} บิล • คนไข้ ${patientsCount} ท่าน`,
                "size": "xs",
                "color": "#64748b",
                "margin": "xs"
              }
            ]
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "md",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "💵 เงินสด", "size": "sm", "color": "#64748b", "flex": 5 },
                  { "type": "text", "text": `฿${Number(cashAmount).toLocaleString()}`, "size": "sm", "color": "#0f172a", "weight": "bold", "flex": 5, "align": "end" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "📲 เงินโอน", "size": "sm", "color": "#64748b", "flex": 5 },
                  { "type": "text", "text": `฿${Number(transferAmount).toLocaleString()}`, "size": "sm", "color": "#0284c7", "weight": "bold", "flex": 5, "align": "end" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "💳 บัตรเครดิต", "size": "sm", "color": "#64748b", "flex": 5 },
                  { "type": "text", "text": `฿${Number(creditAmount).toLocaleString()}`, "size": "sm", "color": "#7c3aed", "weight": "bold", "flex": 5, "align": "end" }
                ]
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "paddingAll": "14px",
        "paddingTop": "0px",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#1e40af",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "🌐 ดูรายงานการเงินในระบบ ↗",
              "uri": WEBAPP_URL
            }
          },
          {
            "type": "text",
            "text": getThaiNotificationTimestamp(),
            "size": "xxs",
            "color": "#94a3b8",
            "align": "center",
            "margin": "sm",
            "wrap": true
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
  // 🟡 A. ซิงก์โควต้าจริงจาก LINE Developer API (สำหรับปุ่ม "ซิงก์โควต้าจริง")
  // ============================================================
  if (req.query?.action === 'sync_quotas' || requestData.action === 'sync_quotas') {
    const tokens = requestData.tokens || [];
    const quotas = {};
    for (const item of tokens) {
      if (item && item.token) {
        try {
          const quotaRes = await fetch('https://api.line.me/v2/bot/message/quota/consumption', {
            headers: { 'Authorization': `Bearer ${item.token.trim()}` }
          });
          if (quotaRes.ok) {
            const qJson = await quotaRes.json();
            quotas[item.id] = Number(qJson.totalUsage || 0);
          }
        } catch (e) {
          console.warn(`Quota sync error for bot ${item.id}:`, e);
        }
      }
    }
    return res.status(200).json({ status: 'OK', quotas });
  }

  // ============================================================
  // 🟡 B. จัดการส่ง Push Message ผ่านบอทที่ระบุ (พร้อม Multi-Recipient)
  // ============================================================
  if (requestData.action === 'send_push') {
    const { token, to, messages } = requestData;
    const targets = Array.isArray(to) ? to : [to];
    const pushToken = token || channelToken;
    let anySuccess = false;
    for (const targetId of targets) {
      if (targetId && pushToken) {
        try {
          const pRes = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pushToken.trim()}`
            },
            body: JSON.stringify({
              to: targetId.trim(),
              messages: messages
            })
          });
          if (pRes.ok) anySuccess = true;
          else {
            const errData = await pRes.json().catch(() => ({}));
            console.error('LINE Push fail:', errData);
          }
        } catch (err) {
          console.error('LINE Push exception:', err);
        }
      }
    }
    return res.status(200).json({ status: anySuccess ? 'OK' : 'ERROR' });
  }

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

    const cleanMsg = userMessage.trim();

    // 2. คำสั่งแสดงเมนูลัด / เมนูหลัก (Flex Menu Card)
    const isMenuRequest = Boolean(
      cleanMsg === 'เมนู' ||
      cleanMsg === 'เมนูลัด' ||
      cleanMsg === 'เมนูหลัก' ||
      cleanMsg === 'คำสั่ง' ||
      cleanMsg === 'คู่มือ' ||
      cleanMsg.toLowerCase() === '/menu' ||
      cleanMsg.toLowerCase() === 'menu' ||
      cleanMsg.toLowerCase() === '/help' ||
      cleanMsg.toLowerCase() === 'help'
    );

    if (isMenuRequest) {
      const flexMenu = createMenuFlex();
      await replyLineMessage(replyToken, [flexMenu], channelToken);
      return res.status(200).json({ status: 'OK', menu: true });
    }

    // 2.1 คำสั่งขอดูบิลล่าสุด (จากปุ่มเมนู หรือ พิมพ์ "บิลล่าสุด", "บิล")
    if ((cleanMsg === 'บิลล่าสุด' || cleanMsg === 'ดูบิลล่าสุด' || cleanMsg === 'บิล') && supabase) {
      const { data: posRaw } = await supabase.from('pos_transactions')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (posRaw && posRaw.length > 0) {
        const flexMsg = createPosFlex(posRaw[0]);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK', type: 'pos_latest' });
      } else {
        await replyLineMessage(replyToken, [{ type: 'text', text: 'ไม่พบประวัติบิลชำระเงิน POS ในระบบขณะนี้ครับ' }], channelToken);
        return res.status(200).json({ status: 'OK', found: false });
      }
    }

    // 2.2 คำแนะนำค้นหาคนไข้ (จากปุ่มเมนู หรือ พิมพ์ "ค้นหาคนไข้")
    if (cleanMsg === 'ค้นหาคนไข้' || cleanMsg === 'หาคนไข้' || cleanMsg === 'ค้นหา' || cleanMsg === 'วิธีค้นหาคนไข้') {
      const guideMsg = {
        type: "text",
        text: "🔍 วิธีค้นหาประวัติคนไข้ (เวชระเบียน):\n\nท่านสามารถพิมพ์ส่งมาในแชทได้ทันที เช่น:\n• ชื่อ หรือ นามสกุล (เช่น สมชาย หรือ นวลอนงค์)\n• รหัส HN (เช่น HN001 หรือ HN69-0001)\n• เบอร์โทรศัพท์ (เช่น 0812345678)\n\nระบบบอทจะค้นหาและส่งบัตรประวัติคนไข้พร้อมคิวนัดหมายล่าสุดให้ทันทีครับ 🏥"
      };
      await replyLineMessage(replyToken, [guideMsg], channelToken);
      return res.status(200).json({ status: 'OK', guide: 'patient_search' });
    }

    // 2.5 คำสั่งสรุปยอดขาย (Daily Sales Summary)
    // รองรับทุกคำที่เกี่ยวกับยอดขาย เช่น "สรุปยอด", "สรุปยอดวันนี้", "สรุปยอดขายประจำวัน", "สรุปยอดขาย", "ยอดวันนี้", "ยอดขายวันนี้", "ยอดขายประจำวัน", "ปิดยอด", "ปิดยอดวันนี้", "ยอดประจำวัน", "สรุปยอดเมื่อวาน", "ยอดขายเมื่อวาน"
    const isSalesSummary = Boolean(
      cleanMsg.includes('สรุปยอด') ||
      cleanMsg.includes('ยอดวันนี้') ||
      cleanMsg.includes('ยอดขาย') ||
      cleanMsg.includes('ปิดยอด') ||
      cleanMsg.includes('ยอดประจำวัน') ||
      cleanMsg.includes('ยอดรวม') ||
      cleanMsg.match(/(สรุป|ปิด)?\s*ยอด(ขาย)?/i)
    );

    if (isSalesSummary && supabase) {
      const { todayIso } = getTodayAndTomorrowThaiYMD();
      let targetYMD = todayIso;
      let labelBranch = 'สาขาหลัก';

      if (cleanMsg.includes('เมื่อวาน')) {
        const now = new Date();
        const thaiYest = new Date(now.getTime() + (7 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000));
        const yYear = thaiYest.getUTCFullYear();
        const yMonth = String(thaiYest.getUTCMonth() + 1).padStart(2, '0');
        const yDay = String(thaiYest.getUTCDate()).padStart(2, '0');
        targetYMD = `${yYear}-${yMonth}-${yDay}`;
      } else {
        const dateMatch = cleanMsg.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dateMatch) {
          const d = String(parseInt(dateMatch[1], 10)).padStart(2, '0');
          const m = String(parseInt(dateMatch[2], 10)).padStart(2, '0');
          let y = parseInt(dateMatch[3], 10);
          if (y > 2400) y -= 543;
          targetYMD = `${y}-${m}-${d}`;
        }
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

      // วันที่แสดงผลแบบไทย วว/ดด/2569
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

      const flexMsg = createDailySalesSummaryFlex(summary, labelBranch);
      await replyLineMessage(replyToken, [flexMsg], channelToken);
      return res.status(200).json({ status: 'OK' });
    }

    // 3. ค้นหาคิวนัดหมายตามวันที่ระบุ (เช่น "นัดหมาย 12/09/2569", "นัด 13/09/2569", "คิว 15/09/2026")
    const specificApptDateMatch = cleanMsg.match(/^(นัด(หมาย)?|คิว)\s*(วันที(่|้))?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (specificApptDateMatch && supabase) {
      const day = String(parseInt(specificApptDateMatch[5], 10)).padStart(2, '0');
      const month = String(parseInt(specificApptDateMatch[6], 10)).padStart(2, '0');
      let year = parseInt(specificApptDateMatch[7], 10);
      const thaiYearDisplay = year > 2400 ? year : year + 543;
      if (year > 2400) year -= 543;
      const targetYMD = `${year}-${month}-${day}`;
      const titleText = `คิวนัดหมายวันที่ ${day}/${month}/${thaiYearDisplay}`;

      const { data: queueRaw } = await supabase.from('queue').select('*');
      const queueList = (queueRaw || [])
        .map(normalizeQueueRow)
        .filter(q => !q.isDeleted && parseQueueDateToThaiYMD(q.rawDateTime) === targetYMD);

      queueList.sort((a, b) => new Date(a.rawDateTime).getTime() - new Date(b.rawDateTime).getTime());
      const settings = await getSettings();
      const flexMsg = createAppointmentCarouselFlex(queueList, titleText, settings);
      await replyLineMessage(replyToken, [flexMsg], channelToken);
      return res.status(200).json({ status: 'OK' });
    }

    // 3.1 ค้นหาคิวนัดหมายตามวัน: วันนี้ / พรุ่งนี้
    const isTodayAppt = Boolean(
      cleanMsg.match(/(นัด(หมาย)?|คิว).*(วันนี้|วันนี)/) || 
      cleanMsg === 'นัดหมายวันนี้' ||
      cleanMsg === 'นัดวันนี้' ||
      cleanMsg === 'คิววันนี้' ||
      cleanMsg === 'ดูนัดวันนี้' ||
      cleanMsg === 'ดูนัดหมายวันนี้' ||
      cleanMsg === 'นัดหมาย' ||
      cleanMsg === 'ดูนัดหมาย' ||
      cleanMsg === 'คิวนัดหมาย'
    );
    const isTomorrowAppt = Boolean(
      cleanMsg.match(/(นัด(หมาย)?|คิว).*พรุ(่|้)งนี้/) ||
      cleanMsg === 'นัดหมายพรุ่งนี้' ||
      cleanMsg === 'นัดพรุ่งนี้' ||
      cleanMsg === 'คิวพรุ่งนี้' ||
      cleanMsg === 'ดูนัดพรุ่งนี้' ||
      cleanMsg === 'ดูนัดหมายพรุ่งนี้'
    );

    if (isTodayAppt || isTomorrowAppt) {
      if (supabase) {
        const { todayIso, tomorrowIso } = getTodayAndTomorrowThaiYMD();
        const targetYMD = isTomorrowAppt ? tomorrowIso : todayIso;
        const titleText = isTomorrowAppt ? 'คิวนัดหมายพรุ่งนี้' : 'คิวนัดหมายวันนี้';

        const { data: queueRaw } = await supabase.from('queue').select('*');
        const queueList = (queueRaw || [])
          .map(normalizeQueueRow)
          .filter(q => !q.isDeleted && parseQueueDateToThaiYMD(q.rawDateTime) === targetYMD);

        queueList.sort((a, b) => new Date(a.rawDateTime).getTime() - new Date(b.rawDateTime).getTime());

        const settings = await getSettings();
        const flexMsg = createAppointmentCarouselFlex(queueList, titleText, settings);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
      }
      return res.status(200).json({ status: 'OK' });
    }

    // 3.2 ดูนัดหมายรายบุคคล (เช่น "ดูนัดหมาย HN69-0071", "ดูนัดหมาย 0071", "ดูนัดหมาย ศิริลักษ์")
    if (cleanMsg.startsWith('ดูนัดหมาย') || cleanMsg.startsWith('นัดหมาย ') || cleanMsg.startsWith('คิวนัดหมาย ')) {
      const kw = cleanMsg.replace(/^(ดูนัดหมาย|นัดหมาย|คิวนัดหมาย)\s*/, '').trim();
      if (kw && supabase) {
        const { data: queueRaw } = await supabase.from('queue').select('*');
        const queueList = (queueRaw || [])
          .map(normalizeQueueRow)
          .filter(q => !q.isDeleted && (
            isHnMatch(q.hn, kw) ||
            (q.patientName && q.patientName.toLowerCase().includes(kw.toLowerCase()))
          ));

        queueList.sort((a, b) => new Date(b.rawDateTime).getTime() - new Date(a.rawDateTime).getTime());

        const settings = await getSettings();
        const flexMsg = createAppointmentCarouselFlex(queueList, `นัดหมายของ "${kw}"`, settings);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }
    }

    // 4. ค้นหาบิล POS / ใบเสร็จรับเงิน (เช่น "REC69090022", "บิล REC69090022", "บิล 22", "ใบเสร็จ REC...")
    const isBillSearch = Boolean(
      cleanMsg.toUpperCase().includes('REC') ||
      cleanMsg.startsWith('บิล') ||
      cleanMsg.startsWith('ใบเสร็จ')
    );

    if (isBillSearch && supabase) {
      const recKw = cleanMsg.replace(/^(บิล|ใบเสร็จ|ดูบิล)\s*/, '').trim().toUpperCase();
      const { data: posRaw } = await supabase.from('pos_transactions').select('*');
      const matchedTx = (posRaw || []).find(tx => {
        if (tx.is_deleted) return false;
        const rNo = String(tx.receipt_no || tx.id || '').toUpperCase();
        if (rNo === recKw) return true;
        if (rNo.includes(recKw)) return true;
        const digitsOnly = recKw.replace(/[^0-9]/g, '');
        if (digitsOnly.length >= 2 && rNo.endsWith(digitsOnly)) return true;
        return false;
      });

      if (matchedTx) {
        const flexMsg = createPosFlex(matchedTx);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }
    }

    // 5. ค้นหายา & สต็อกสินค้าในคลัง (เช่น "สต็อก...", "ยา...", "สินค้า...", "คลัง...", "เช็คสต็อก")
    const isInvSearch = Boolean(
      cleanMsg.startsWith('สต็อก') ||
      cleanMsg.startsWith('ยา ') ||
      cleanMsg.startsWith('สินค้า ') ||
      cleanMsg.startsWith('คลัง ') ||
      cleanMsg.startsWith('เช็คสต็อก') ||
      cleanMsg === 'เช็คสต็อก' ||
      cleanMsg === 'สต็อก' ||
      cleanMsg === 'คลังยา'
    );

    if (isInvSearch && supabase) {
      const invKw = cleanMsg.replace(/^(สต็อก|ยา|สินค้า|คลัง|เช็คสต็อก)\s*/, '').trim().toLowerCase();
      const { data: invRaw } = await supabase.from('inventory').select('*');
      const validItems = (invRaw || []).filter(item => !item.is_deleted);

      if (!invKw) {
        // หากไม่ได้ระบุชื่อยา (เช่น กดปุ่ม "เช็คสต็อก" จากเมนู) ให้แสดงสินค้า 10 รายการเรียงจากคงเหลือน้อยที่สุด
        const sorted = [...validItems].sort((a, b) => {
          const qA = Number(a.stock_quantity ?? a.quantity ?? 0);
          const qB = Number(b.stock_quantity ?? b.quantity ?? 0);
          return qA - qB;
        });
        const topItems = sorted.slice(0, 10);
        if (topItems.length > 0) {
          const bubbles = topItems.map(it => createInventoryFlex(it).contents);
          const flexMsg = {
            type: "flex",
            altText: "📦 ข้อมูลสต็อกยา & เวชภัณฑ์ในคลังคลินิก",
            contents: bubbles.length === 1 ? bubbles[0] : {
              type: "carousel",
              contents: bubbles
            }
          };
          await replyLineMessage(replyToken, [flexMsg], channelToken);
          return res.status(200).json({ status: 'OK', count: topItems.length });
        }
      } else {
        const matchedItem = validItems.find(item => {
          const n = String(item.name || item.product_name || '').toLowerCase();
          const c = String(item.code || item.id || '').toLowerCase();
          return n.includes(invKw) || c.includes(invKw);
        });

        if (matchedItem) {
          const flexMsg = createInventoryFlex(matchedItem);
          await replyLineMessage(replyToken, [flexMsg], channelToken);
          return res.status(200).json({ status: 'OK', found: true });
        }
      }
    }

    // 5.5 ดูการรักษาล่าสุด / เคสล่าสุดของคลินิก
    const isLatestTrtGeneric = (
      cleanMsg === 'รักษาล่าสุด' ||
      cleanMsg === 'การรักษาล่าสุด' ||
      cleanMsg === 'ประวัติการรักษาล่าสุด' ||
      cleanMsg === 'ดูการรักษาล่าสุด' ||
      cleanMsg === 'เคสล่าสุด' ||
      cleanMsg === 'opd ล่าสุด'
    );

    if (isLatestTrtGeneric && supabase) {
      const { data: latestTrts } = await supabase
        .from('treatments')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestTrts && latestTrts.length > 0) {
        const trt = latestTrts[0];
        const pId = trt.patient_id;
        const { data: ptRaw } = await supabase.from('patients').select('*').eq('id', pId).limit(1);
        if (ptRaw && ptRaw.length > 0) {
          const p = ptRaw[0];
          const matchedPt = {
            ...p,
            ...(p.data || {}),
            hn: p.hn || p.id || p.data?.hn || p.data?.id,
            firstName: p.first_name || p.firstName || p.data?.first_name || p.data?.firstName || '',
            lastName: p.last_name || p.lastName || p.data?.last_name || p.data?.lastName || '',
            nickname: p.nickname || p.nick_name || p.data?.nickname || p.data?.nick_name || '',
            name: p.name || p.data?.name || `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim(),
            phone: p.phone || p.tel || p.data?.phone || p.data?.tel || '',
            isDeleted: Boolean(p.is_deleted ?? p.data?.is_deleted ?? false)
          };
          const [queueRes, trtRes, courseRes] = await Promise.all([
            supabase.from('queue').select('*').eq('is_deleted', false),
            supabase.from('treatments').select('*').eq('is_deleted', false).eq('patient_id', pId).order('created_at', { ascending: false }).limit(10),
            supabase.from('patient_courses').select('*').eq('is_deleted', false).eq('patient_id', pId).limit(10)
          ]);
          const queueList = (queueRes.data || []).map(normalizeQueueRow).filter(q => !q.isDeleted);
          const flexMsg = createPatientFlex(matchedPt, queueList, trtRes.data || [trt], courseRes.data || []);
          await replyLineMessage(replyToken, [flexMsg], channelToken);
          return res.status(200).json({ status: 'OK', type: 'latest_treatment' });
        }
      }
    }

    // 6. ค้นหาประวัติคนไข้ (เวชระเบียน) จาก Supabase (พิมพ์ชื่อ, HN เช่น HN001 -> HN69-0001, เบอร์โทร, หรือ "รักษาล่าสุด...")
    const rawKw = cleanMsg.replace(/^(ประวัติการรักษา|การรักษาล่าสุด|รักษาล่าสุด|การรักษา|รักษา|ดูประวัติคนไข้|ดูประวัติ|ค้นหาคนไข้|ค้นหา|ดูคนไข้|คนไข้|ประวัติคนไข้|ประวัติ|เวชระเบียน|ข้อมูล|เช็ค|หา|opd)\s*/i, '').trim();
    const keyword = rawKw.replace(/^(คุณ|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim();
    if ((keyword.length > 0 || rawKw.length > 0) && supabase) {
      const { data: patientsRaw } = await supabase.from('patients').select('*');
      const patients = (patientsRaw || []).map(p => ({
        ...p,
        ...(p.data || {}),
        hn: p.hn || p.id || p.data?.hn || p.data?.id,
        firstName: p.first_name || p.firstName || p.data?.first_name || p.data?.firstName || '',
        lastName: p.last_name || p.lastName || p.data?.last_name || p.data?.lastName || '',
        nickname: p.nickname || p.nick_name || p.data?.nickname || p.data?.nick_name || '',
        name: p.name || p.data?.name || `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim(),
        phone: p.phone || p.tel || p.data?.phone || p.data?.tel || '',
        isDeleted: Boolean(p.is_deleted ?? p.data?.is_deleted ?? false)
      })).filter(p => !p.isDeleted);

      const kw = keyword.toLowerCase();
      const rawKwLower = rawKw.toLowerCase();
      const matched = patients.find(p => 
        isHnMatch(p.hn, kw) ||
        isHnMatch(p.hn, rawKwLower) ||
        (p.firstName && p.firstName.toLowerCase().includes(kw)) ||
        (p.lastName && p.lastName.toLowerCase().includes(kw)) ||
        (p.name && p.name.toLowerCase().includes(kw)) ||
        (p.nickname && p.nickname.toLowerCase().includes(kw)) ||
        (p.phone && String(p.phone).includes(kw)) ||
        (rawKwLower && p.name && p.name.toLowerCase().includes(rawKwLower))
      );

      if (matched) {
        const pId = matched.id || matched.hn;
        const pHn = matched.hn || matched.id;
        const patientFilter = pId === pHn ? `patient_id.eq.${pId}` : `patient_id.eq.${pId},patient_id.eq.${pHn}`;

        const [queueRes, trtRes, courseRes] = await Promise.all([
          supabase.from('queue').select('*').eq('is_deleted', false),
          supabase.from('treatments').select('*').eq('is_deleted', false).or(patientFilter).order('created_at', { ascending: false }).limit(10),
          supabase.from('patient_courses').select('*').eq('is_deleted', false).or(patientFilter).limit(10)
        ]);

        const queueList = (queueRes.data || []).map(normalizeQueueRow).filter(q => !q.isDeleted);
        const flexMsg = createPatientFlex(matched, queueList, trtRes.data || [], courseRes.data || []);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }

      // สำรอง 1: หากค้นหาในเวชระเบียนไม่เจอ ลองดูในคิวนัดหมาย
      const { data: queueRaw } = await supabase.from('queue').select('*');
      const queueList = (queueRaw || [])
        .map(normalizeQueueRow)
        .filter(q => !q.isDeleted && (
          isHnMatch(q.hn, kw) ||
          (q.patientName && q.patientName.toLowerCase().includes(kw))
        ));

      if (queueList.length > 0) {
        const settings = await getSettings();
        const flexMsg = createAppointmentCarouselFlex(queueList, `นัดหมายของ "${keyword}"`, settings);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }

      // สำรอง 2: หากยังไม่เจอ ลองตรวจในคลังยาและสินค้า
      const { data: invRaw } = await supabase.from('inventory').select('*');
      const matchedInv = (invRaw || []).find(item => {
        if (item.is_deleted) return false;
        const n = String(item.name || '').toLowerCase();
        const c = String(item.code || '').toLowerCase();
        return n.includes(kw) || c.includes(kw);
      });

      if (matchedInv) {
        const flexMsg = createInventoryFlex(matchedInv);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }

      // สำรอง 3: ลองตรวจในบิล POS
      const { data: posRaw } = await supabase.from('pos_transactions').select('*');
      const matchedPos = (posRaw || []).find(tx => {
        if (tx.is_deleted) return false;
        const rNo = String(tx.receipt_no || tx.id || '').toLowerCase();
        const pName = String(tx.patient_name || '').toLowerCase();
        return rNo.includes(kw) || pName.includes(kw);
      });

      if (matchedPos) {
        const flexMsg = createPosFlex(matchedPos);
        await replyLineMessage(replyToken, [flexMsg], channelToken);
        return res.status(200).json({ status: 'OK' });
      }

      // หากไม่พบข้อมูลใดๆ ส่งคำแนะนำการใช้งานที่ครอบคลุม
      const notFoundText = `ไม่พบข้อมูลที่ตรงกับ "${keyword}" ในระบบคลินิกครับ\n\n` +
        `💡 แนะนำคำสั่งที่สามารถพิมพ์ได้:\n` +
        `• "สรุปยอดขายประจำวัน" หรือ "ยอดวันนี้" เพื่อดูยอดขาย\n` +
        `• "นัดหมายวันนี้" หรือ "นัดหมายพรุ่งนี้" เพื่อดูคิวนัด\n` +
        `• "ดูนัดหมาย" ตามด้วย ชื่อ หรือ HN เพื่อดูนัดหมายคนไข้\n` +
        `• พิมพ์ ชื่อ, HN, เบอร์โทร เพื่อค้นหาประวัติคนไข้\n` +
        `• "บิล REC..." เพื่อดูข้อมูลบิลชำระเงิน POS\n` +
        `• "สต็อก..." หรือ "ยา..." เพื่อค้นหายาและสินค้า\n` +
        `• พิมพ์ /help เพื่อดูคู่มือคำสั่งทั้งหมดครับ`;
      await replyLineMessage(replyToken, [{ type: 'text', text: notFoundText }], channelToken);
      return res.status(200).json({ status: 'OK' });
    }
  }

  return res.status(200).json({ status: 'OK' });
}
