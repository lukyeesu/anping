// ============================================================
// Unified Supabase Edge Function: line-messaging
// ถอดแบบการทำงาน และ Flex Message เหมือน หลังบ้าน v.5 LINE.js 100%
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// -------------------------------------------------------------
// 🧠 SMART HN MATCHER (เช่น HN69-0001 ตรงกับ HN001, 001, HN69-0001)
// -------------------------------------------------------------
function isHnMatch(patientHn: any, kw: string): boolean {
  if (!patientHn || !kw) return false;
  const pStr = String(patientHn).toLowerCase();
  const kStr = String(kw).toLowerCase().trim();

  if (pStr.includes(kStr)) return true;

  const cleanP = pStr.replace(/[^a-z0-9]/g, '');
  const cleanK = kStr.replace(/[^a-z0-9]/g, '');
  if (cleanP.includes(cleanK)) return true;

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
// 🎨 COLOR & STATUS HELPERS (จาก หลังบ้าน v.5 LINE.js)
// -------------------------------------------------------------
const colorHexMap: Record<string, string> = {
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

function getStatusInfo(statusKey: string, settings: any[] = []) {
  const s = String(statusKey || '').toLowerCase();
  
  const apptStatusesRecord = settings.find(st => st.id === 'appointment_statuses');
  const customStatuses = apptStatusesRecord ? (apptStatusesRecord.data?.statuses || apptStatusesRecord.statuses || []) : [];
  const matchedStatus = customStatuses.find((st: any) => s.includes(st.label.toLowerCase()) || st.label.toLowerCase().includes(s));
  
  if (matchedStatus) {
     return { label: matchedStatus.label, colorHex: colorHexMap[matchedStatus.color] || '#0284c7' };
  }

  if (s.includes('confirm') || s.includes('ยืนยันแล้ว')) return { label: 'ยืนยันแล้ว', colorHex: '#10b981' };
  if (s.includes('cancel') || s.includes('ยกเลิก')) return { label: 'ยกเลิก', colorHex: '#f43f5e' };
  if (s.includes('resched') || s.includes('เลื่อน')) return { label: 'เลื่อนนัด', colorHex: '#8b5cf6' };
  if (s.includes('complete') || s.includes('เสร็จสิ้น')) return { label: 'เสร็จสิ้น', colorHex: '#0ea5e9' };
  return { label: statusKey || 'รอยืนยัน', colorHex: '#f59e0b' };
}

function formatNotificationDate(dateStr: string, timeStr: string) {
  let finalDate = "-";
  let finalTime = "-";

  if (dateStr && dateStr !== "-") {
    if (dateStr.includes('/')) {
      // คาดว่าเป็นรูปแบบ "04/07/2569 13:00 น."
      const parts = dateStr.trim().split(' ');
      finalDate = parts[0];
      if (parts.length > 1) {
        finalTime = parts.slice(1).join(' ').replace('น.', '').trim() + ' น.';
      }
    } else {
      // รูปแบบอื่น เช่น ISO
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          // ปรับเป็นเวลาไทย (GMT+7)
          const thaiTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
          const day = String(thaiTime.getUTCDate()).padStart(2, '0');
          const month = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
          const year = thaiTime.getUTCFullYear() + 543;
          finalDate = `${day}/${month}/${year}`;
          
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const h = String(thaiTime.getUTCHours()).padStart(2, '0');
            const m = String(thaiTime.getUTCMinutes()).padStart(2, '0');
            if (h !== "00" || m !== "00") {
              finalTime = `${h}:${m} น.`;
            }
          }
        } else {
          finalDate = dateStr;
        }
      } catch(e) {
        finalDate = dateStr;
      }
    }
  }

  if (finalTime === "-" && timeStr && timeStr !== "-") {
    finalTime = timeStr.includes("น.") ? timeStr : `${timeStr} น.`;
  }

  return { date: finalDate, time: finalTime };
}

function extractFirstPhone(phoneStr: any): string {
  if (!phoneStr || phoneStr === "-") return "-";
  const str = String(phoneStr);
  const parts = str.split(/[,/]|หรือ|และ|and|&/);
  const firstPhone = parts[0].replace(/\D/g, "");
  return firstPhone.length >= 9 ? firstPhone : "-";
}

// -------------------------------------------------------------
// 🎨 FLEX MESSAGE BUILDERS (ถอดแบบจาก หลังบ้าน v.5 LINE.js 100%)
// -------------------------------------------------------------

const WEBAPP_URL = "https://anpingclinic.vercel.app";

function formatCompactDate(isoString: string) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildQueueNotificationFlex(payload: any, titleText: string, headerColor: string, noteText: string = "", oldDateTimeStr: string | null = null) {
  const { date: finalDateStr, time: timeStr } = formatNotificationDate(
    payload.datetime || payload.raw_date_time || payload.rawDateTime || payload.date || "-", 
    payload.time || "-"
  );

  const hn = payload.hn || payload.patient_id || payload.patientId || "-";
  const patientName = payload.patientName || payload.patient_name || payload.name || "ไม่ระบุชื่อ";
  const doctor = payload.doctor || payload.doctorName || payload.doctor_name || payload.artist || "-";
  const reason = payload.reason || payload.category || payload.service || "-";
  const serviceType = payload.serviceType || payload.service_type || payload.category || payload.service || "-";

  const contentsArray: any[] = [];

  if (oldDateTimeStr) {
    contentsArray.push(
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "จากเดิม", "size": "sm", "color": "#ef4444", "flex": 1, "weight": "bold" },
          { "type": "text", "text": oldDateTimeStr, "size": "sm", "color": "#ef4444", "flex": 2, "weight": "bold", "wrap": true }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "นัดใหม่", "size": "sm", "color": "#10b981", "flex": 1, "weight": "bold" },
          { "type": "text", "text": finalDateStr, "size": "sm", "color": "#10b981", "flex": 2, "weight": "bold" }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "เวลา", "size": "sm", "color": "#10b981", "flex": 1, "weight": "bold" },
          { "type": "text", "text": timeStr, "size": "sm", "color": "#10b981", "flex": 2, "weight": "bold" }
        ]
      }
    );
  } else {
    contentsArray.push(
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "วันที่", "size": "sm", "color": "#64748b", "flex": 1 },
          { "type": "text", "text": finalDateStr, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "เวลา", "size": "sm", "color": "#64748b", "flex": 1 },
          { "type": "text", "text": timeStr, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "ประเภทบริการ", "size": "sm", "color": "#64748b", "flex": 1 },
          { "type": "text", "text": serviceType, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
        ]
      }
    );
  }

  contentsArray.push(
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "อาการ", "size": "sm", "color": "#64748b", "flex": 1 },
        { "type": "text", "text": reason, "size": "sm", "color": "#334155", "flex": 2, "wrap": true }
      ]
    },
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "แพทย์", "size": "sm", "color": "#64748b", "flex": 1 },
        { "type": "text", "text": doctor, "size": "sm", "color": "#334155", "flex": 2, "wrap": true }
      ]
    }
  );

  if (noteText) {
    contentsArray.unshift({
      "type": "box",
      "layout": "horizontal",
      "margin": "sm",
      "contents": [
        { "type": "text", "text": "สถานะ", "size": "sm", "color": headerColor, "flex": 1, "weight": "bold" },
        { "type": "text", "text": noteText, "size": "sm", "color": headerColor, "flex": 2, "wrap": true, "weight": "bold" }
      ]
    });
  }

  return {
    "type": "flex",
    "altText": `${titleText}: ${patientName}`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": headerColor,
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": titleText,
            "color": "#ffffff",
            "weight": "bold",
            "size": "sm"
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
            "size": "lg",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": hn,
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
            "contents": contentsArray
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "color": "#e0f2fe",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "ดูประวัติ",
              "text": `ค้นหา ${hn}`
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
              "uri": extractFirstPhone(payload.phone) !== '-' ? `tel:${extractFirstPhone(payload.phone)}` : `tel:0000`
            }
          }
        ]
      }
    }
  };
}

function createPatientFlex(patient: any, queueList: any[] = []) {
  let idc = patient.idCard ? String(patient.idCard).replace(/\D/g, "") : "0000";
  if (idc.length < 4) idc = "0000";
  const idCard4 = idc.slice(-4);
  const fullName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  
  let ageStr = '-';
  if (patient.age) {
    ageStr = `${patient.age} ปี`;
  } else if (patient.dob) {
    const parts = patient.dob.split('/');
    if (parts.length === 3) {
      const birthYearTH = parseInt(parts[2], 10);
      const currentYearTH = new Date().getFullYear() + 543;
      const calculatedAge = currentYearTH - birthYearTH;
      if (!isNaN(calculatedAge) && calculatedAge >= 0) {
        ageStr = `${calculatedAge} ปี`;
      }
    }
  }
  const gender = patient.gender || '-';

  let lastVisit = patient.lastVisit && patient.lastVisit !== '-' ? patient.lastVisit : '';
  if (!lastVisit && queueList.length > 0) {
    try {
      const pId = patient.hn || patient.id;
      const patientAppts = queueList.filter(q => q.hn === pId || q.patientId === pId);
      if (patientAppts.length > 0) {
        const pastAppts = patientAppts.filter(q => {
          const d = new Date(q.date || q.rawDateTime || 0);
          return d.getTime() <= new Date().getTime();
        });
        if (pastAppts.length > 0) {
          pastAppts.sort((a,b) => new Date(b.date || b.rawDateTime || 0).getTime() - new Date(a.date || a.rawDateTime || 0).getTime());
          const latest = pastAppts[0];
          lastVisit = latest.date || latest.rawDateTime || latest.datetime;
        }
      }
    } catch(e) {}
  }

  if (lastVisit && lastVisit !== '-') {
    try {
      const d = new Date(lastVisit.includes('/') ? lastVisit.split('/').reverse().join('-') : lastVisit);
      if (!isNaN(d.getTime())) {
        lastVisit = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    } catch(e) {}
  } else {
    lastVisit = '-';
  }

  return {
    "type": "flex",
    "altText": `เวชระเบียน: ${fullName}`,
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
            "size": "sm"
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
            "size": "lg",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": hn,
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
                  { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": phone, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "อายุ/เพศ", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": `${ageStr} / ${gender}`, "size": "sm", "color": "#334155", "flex": 2 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "รักษาล่าสุด", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": lastVisit, "size": "sm", "color": "#334155", "flex": 2 }
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
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "color": "#e0f2fe",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "ดูนัดหมาย",
              "text": `ดูนัดหมาย ${hn}`
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
              "uri": `${WEBAPP_URL}?print_opd=${hn}${idCard4}${formatCompactDate(new Date().toISOString())}`
            }
          }
        ]
      }
    }
  };
}

function createAppointmentCarouselFlex(appts: any[], titleStr: string, settings: any[] = []) {
  if (!appts || appts.length === 0) {
    return {
      "type": "flex",
      "altText": titleStr,
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": `ไม่มีนัดหมายสำหรับ${titleStr}ค่ะ`, "color": "#64748b" }
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
    const reason = appt.reason || appt.symptoms || appt.symptom || "-";
    const serviceType = appt.serviceType || appt.service_type || appt.category || appt.service || "-";

    return {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": statusInfo.colorHex,
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": statusInfo.label,
            "color": "#ffffff",
            "weight": "bold",
            "size": "sm"
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
            "size": "lg",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": hn,
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
                  { "type": "text", "text": "วันที่", "size": "sm", "color": "#64748b", "flex": 3 },
                  { "type": "text", "text": finalDateStr, "size": "sm", "color": "#334155", "flex": 7, "weight": "bold", "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เวลา", "size": "sm", "color": "#64748b", "flex": 3 },
                  { "type": "text", "text": timeStr, "size": "sm", "color": "#334155", "flex": 7, "weight": "bold", "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ประเภทบริการ", "size": "sm", "color": "#64748b", "flex": 3 },
                  { "type": "text", "text": serviceType, "size": "sm", "color": "#334155", "flex": 7, "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "อาการ", "size": "sm", "color": "#64748b", "flex": 3 },
                  { "type": "text", "text": reason, "size": "sm", "color": "#334155", "flex": 7, "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "แพทย์", "size": "sm", "color": "#64748b", "flex": 3 },
                  { "type": "text", "text": doctor, "size": "sm", "color": "#334155", "flex": 7, "wrap": true }
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
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "color": "#e0f2fe",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "ดูประวัติ",
              "text": `ค้นหา ${hn}`
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
              "uri": extractFirstPhone(appt.phone) !== '-' ? `tel:${extractFirstPhone(appt.phone)}` : `tel:0000`
            }
          }
        ]
      }
    };
  });

  return {
    "type": "flex",
    "altText": titleStr,
    "contents": bubbles.length === 1 ? bubbles[0] : { "type": "carousel", "contents": bubbles }
  };
}

function createPosFlex(pos: any) {
  const patientName = pos.patientName || 'ลูกค้าทั่วไป';
  const totalAmount = pos.totalAmount || pos.grandTotal || pos.total || 0;
  const branchName = pos.branchName || 'สาขาหลัก';
  const id = pos.id || pos.receiptNo || '-';

  return {
    "type": "flex",
    "altText": `รายการขาย POS: ฿${Number(totalAmount).toLocaleString()}`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#10b981",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": "💰 รายการขาย POS สำเร็จ",
            "color": "#ffffff",
            "weight": "bold",
            "size": "sm"
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
            "text": `฿${Number(totalAmount).toLocaleString()} บาท`,
            "weight": "bold",
            "size": "xl",
            "color": "#059669"
          },
          {
            "type": "text",
            "text": `เลขที่บิล: ${id}`,
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
                contents: [
                  { "type": "text", "text": "สาขา", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": branchName, "size": "sm", "color": "#334155", "flex": 2 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                contents: [
                  { "type": "text", "text": "คนไข้/ลูกค้า", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": patientName, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
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
// HTTP Helpers
// -------------------------------------------------------------
async function sendLinePush(to: string, messages: any[], token: string) {
  if (!token || !to) return false;
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to, messages })
    });
    return res.ok;
  } catch (e) {
    console.error('Error sending LINE Push:', e);
    return false;
  }
}

async function sendLineReply(replyToken: string, messages: any[], token: string) {
  if (!token || !replyToken) return false;
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ replyToken, messages })
    });
    return res.ok;
  } catch (e) {
    console.error('Error sending LINE Reply:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? '';
    let lineGroupId = Deno.env.get('LINE_GROUP_ID') ?? '';
    let allSettingsRows: any[] = [];

    try {
      const { data: settingsRows } = await supabase.from('settings').select('*');
      if (settingsRows && settingsRows.length > 0) {
        allSettingsRows = settingsRows;
        const tokenRecord = settingsRows.find(s => s.id === 'integration_tokens');
        if (tokenRecord) {
          const vals = tokenRecord.data?.values || tokenRecord.values || {};
          if (vals.line) lineToken = vals.line;
          if (vals.lineGroupId) lineGroupId = vals.lineGroupId;
        }
      }
    } catch (e) {
      console.error("Error reading settings for LINE tokens:", e);
    }

    const payload = await req.json();

    // ============================================================
    // 🔴 โหมดที่ 1: Custom Action Call จากแอป
    // ============================================================
    if (payload.action) {
      const { action, targetId = lineGroupId, message, data } = payload;

      if (action === 'push_custom') {
        const success = await sendLinePush(targetId, [{ type: 'text', text: message }], lineToken);
        return new Response(JSON.stringify({ success, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      if (action === 'push_appointment') {
        const flexMsg = buildQueueNotificationFlex(data, "🚨 นัดหมายใหม่เข้าสู่ระบบ", "#10b981");
        const success = await sendLinePush(targetId, [flexMsg], lineToken);
        return new Response(JSON.stringify({ success, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      if (action === 'push_pos') {
        const flexMsg = createPosFlex(data);
        const success = await sendLinePush(targetId, [flexMsg], lineToken);
        return new Response(JSON.stringify({ success, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
    }

    // ============================================================
    // 🟡 โหมดที่ 2: Supabase Database Webhook Trigger (ถอดแบบ หลังบ้าน v.5 LINE.js)
    // ============================================================
    if (payload.type && payload.table && payload.record) {
      const { type, table, record, old_record } = payload;
      const data = record.data || record || {};
      const oldData = old_record?.data || old_record || {};

      if (table === 'queue') {
        let titleText = "🚨 นัดหมายใหม่เข้าสู่ระบบ";
        let headerColor = "#10b981";
        let noteText = "";
        let oldDateTimeStr: string | null = null;

        if (type === 'UPDATE' && Object.keys(oldData).length > 0) {
          const oldStatus = oldData.status || oldData.dealStatus || oldData.deal_status || "";
          const newStatus = data.status || data.dealStatus || data.deal_status || "";
          const oldDate = oldData.raw_date_time || oldData.rawDateTime || oldData.datetime || oldData.date || "";
          const newDate = data.raw_date_time || data.rawDateTime || data.datetime || data.date || "";
          const oldTime = oldData.time || "";
          const newTime = data.time || "";

          const statusChanged = oldStatus !== newStatus;
          const timeChanged = oldDate !== newDate || oldTime !== newTime;

          if (statusChanged && timeChanged) {
            titleText = "🚨 อัปเดตสถานะ & เลื่อนนัดหมาย";
            headerColor = "#8b5cf6";
            noteText = `เปลี่ยนสถานะเป็น ${getStatusInfo(newStatus, allSettingsRows).label}`;
            const { date: oDate, time: oTime } = formatNotificationDate(oldDate, oldTime);
            oldDateTimeStr = `${oDate} (${oTime})`;
          } else if (statusChanged) {
            titleText = "🚨 อัปเดตสถานะนัดหมาย";
            const sInfo = getStatusInfo(newStatus, allSettingsRows);
            headerColor = sInfo.colorHex;
            noteText = `เปลี่ยนสถานะเป็น ${sInfo.label}`;
          } else if (timeChanged) {
            titleText = "🚨 เลื่อนวันเวลานัดหมาย";
            headerColor = "#8b5cf6";
            noteText = "เลื่อนวันเวลานัดหมาย";
            const { date: oDate, time: oTime } = formatNotificationDate(oldDate, oldTime);
            oldDateTimeStr = `${oDate} (${oTime})`;
          }
        }

        const flexMsg = buildQueueNotificationFlex(data, titleText, headerColor, noteText, oldDateTimeStr);
        await sendLinePush(lineGroupId, [flexMsg], lineToken);
      } else if (table === 'pos_transactions' && type === 'INSERT') {
        const flexMsg = createPosFlex(data);
        await sendLinePush(lineGroupId, [flexMsg], lineToken);
      }

      return new Response(JSON.stringify({ success: true, mode: 'webhook_trigger' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // ============================================================
    // 🟢 โหมดที่ 3: LINE Chatbot Reply (ตอบโต้แชทอัตโนมัติ)
    // ============================================================
    if (payload.events && payload.events.length > 0) {
      const event = payload.events[0];
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
          await sendLineReply(replyToken, [{ type: 'text', text: replyText }], lineToken);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 2. คำสั่ง /help
        if (userMessage.toLowerCase() === '/help') {
          const helpText = `🤖 รวมคำสั่งแชทบอทคลินิก (Flex Message Enabled) 🏥\n-------------------------\n🆔 ค้นหา ID แชทตั้งค่า:\nพิมพ์ /idchat หรือ /ไอดีแชท\n\n🔍 ค้นหาประวัติคนไข้ (Flex Card):\nพิมพ์ ชื่อ, นามสกุล, รหัส HN หรือ เบอร์โทร (เช่น สมชาย หรือ HN001)\n\n📅 ดูคิวนัดหมายรวม (Flex Carousel):\nพิมพ์คำว่า "นัดหมายวันนี้" หรือ "นัดหมายพรุ่งนี้"\n\n👤 ดูนัดหมายรายบุคคล:\nพิมพ์คำว่า "ดูนัดหมาย" ตามด้วย ชื่อ หรือ รหัส HN (เช่น ดูนัดหมาย HN001)\n\n💡 พิมพ์ /help เพื่อดูคู่มือนี้อีกครั้ง`;
          await sendLineReply(replyToken, [{ type: 'text', text: helpText }], lineToken);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 3. ดูนัดหมายรายบุคคล (เช่น "ดูนัดหมาย HN001", "หา HN69-0001", "หา สมชาย")
        if (userMessage.startsWith('ดูนัดหมาย') || userMessage.startsWith('หา ')) {
          const kw = userMessage.replace(/^(ดูนัดหมาย|หา)\s*/, '').trim();
          if (kw) {
            const { data: queueRaw } = await supabase.from('queue').select('*');
            const queueList = (queueRaw || []).map(q => ({ id: q.id, ...(q.data || q) }));
            const matched = queueList.filter(q => 
              isHnMatch(q.hn || q.patientId, kw) ||
              (q.patientName && String(q.patientName).toLowerCase().includes(kw.toLowerCase())) ||
              (q.name && String(q.name).toLowerCase().includes(kw.toLowerCase()))
            );
            const flexMsg = createAppointmentCarouselFlex(matched, `นัดหมายของ "${kw}"`, allSettingsRows);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }

        // 4. ค้นหาคิวนัดหมายวันนี้ / พรุ่งนี้ จาก Supabase
        if (userMessage.match(/นัด(หมาย)?(วันนี้|วันนี)/) || userMessage.match(/นัด(หมาย)?พรุ(่|้)งนี้/)) {
          const isTomorrow = !!userMessage.match(/พรุ(่|้)งนี้/);
          
          const now = new Date();
          const thaiNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
          if (isTomorrow) thaiNow.setDate(thaiNow.getDate() + 1);

          const targetIso = thaiNow.toISOString().split('T')[0];

          const { data: queueRaw } = await supabase.from('queue').select('*');
          const queueList = (queueRaw || []).map(q => ({ id: q.id, ...(q.data || q) }));
          const matched = queueList.filter(q => (q.date && q.date.includes(targetIso)) || (q.rawDateTime && q.rawDateTime.includes(targetIso)));

          const titleText = isTomorrow ? 'คิวนัดหมายพรุ่งนี้' : 'คิวนัดหมายวันนี้';
          const flexMsg = createAppointmentCarouselFlex(matched, titleText, allSettingsRows);
          await sendLineReply(replyToken, [flexMsg], lineToken);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 5. ค้นหาประวัติคนไข้จาก Supabase (พิมพ์ชื่อ, HN เช่น HN001 -> HN69-0001, หรือ เบอร์โทร)
        const keyword = userMessage.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล)\s*/, '').trim();
        if (keyword.length > 0) {
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
            const { data: queueRaw } = await supabase.from('queue').select('*');
            const queueList = (queueRaw || []).map(q => ({ id: q.id, ...(q.data || q) }));
            const flexMsg = createPatientFlex(matched, queueList);
            await sendLineReply(replyToken, [flexMsg], lineToken);
          } else {
            await sendLineReply(replyToken, [{ type: 'text', text: `ไม่พบข้อมูลคนไข้ที่ตรงกับ "${keyword}" ในระบบ Supabase ครับ` }], lineToken);
          }
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
      }
      return new Response(JSON.stringify({ success: true, mode: 'line_chatbot' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ message: "No action performed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
