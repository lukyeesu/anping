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
function parseQueueDateToThaiYMD(rawStr: any): string | null {
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
  } catch (_e) {}

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

function normalizeQueueRow(q: any) {
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

function getThaiNotificationTimestamp(d = new Date()): string {
  try {
    const thai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
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
  const firstPhone = extractFirstPhone(payload.phone);

  const contentsArray: any[] = [];

  if (oldDateTimeStr) {
    contentsArray.push(
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "จากเดิม", "size": "sm", "color": "#ef4444", "flex": 4, "weight": "bold" },
          { "type": "text", "text": oldDateTimeStr, "size": "sm", "color": "#ef4444", "flex": 6, "weight": "bold", "wrap": true }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "นัดใหม่", "size": "sm", "color": "#10b981", "flex": 4, "weight": "bold" },
          { "type": "text", "text": finalDateStr, "size": "sm", "color": "#10b981", "flex": 6, "weight": "bold" }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "เวลา", "size": "sm", "color": "#10b981", "flex": 4, "weight": "bold" },
          { "type": "text", "text": timeStr, "size": "sm", "color": "#10b981", "flex": 6, "weight": "bold" }
        ]
      }
    );
  } else {
    contentsArray.push(
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
      }
    );
  }

  contentsArray.push(
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
    ...((payload.phone && payload.phone !== '-') || (firstPhone && firstPhone !== '-') ? [{
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": payload.phone || firstPhone, "size": "sm", "color": "#0ea5e9", "weight": "bold", "flex": 6 }
      ]
    }] : [])
  );

  if (noteText) {
    contentsArray.unshift({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "สถานะ", "size": "sm", "color": headerColor, "flex": 4, "weight": "bold" },
        { "type": "text", "text": noteText, "size": "sm", "color": headerColor, "flex": 6, "wrap": true, "weight": "bold" }
      ]
    });
  }

  return {
    "type": "flex",
    "altText": `${titleText}: ${patientName} (${finalDateStr} ${timeStr})`,
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
            "contents": contentsArray
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
            "margin": "sm"
          }
        ]
      }
    }
  };
}

function createDailySalesSummaryFlex(summary: any, branchName: string = 'สาขาหลัก') {
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
            "margin": "sm"
          }
        ]
      }
    }
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
            "margin": "sm"
          }
        ]
      }
    }
  };
}

function createInventoryFlex(item: any) {
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
            "margin": "sm"
          }
        ]
      }
    }
  };
}

function createPatientFlex(patient: any, queueList: any[] = []) {
  const fullName = patient.name || `${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const rawPhone = patient.phone || patient.tel || '-';
  const firstPhone = extractFirstPhone(rawPhone);
  const allergy = patient.drugAllergy || patient.drug_allergy || patient.allergy || 'ไม่มี';
  
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
      const patientAppts = queueList.filter(q => q.hn === pId || q.patientId === pId || q.patient_id === pId);
      if (patientAppts.length > 0) {
        const pastAppts = patientAppts.filter(q => {
          const d = new Date(q.date || q.rawDateTime || q.raw_date_time || 0);
          return d.getTime() <= new Date().getTime();
        });
        if (pastAppts.length > 0) {
          pastAppts.sort((a,b) => new Date(b.date || b.rawDateTime || b.raw_date_time || 0).getTime() - new Date(a.date || a.rawDateTime || a.raw_date_time || 0).getTime());
          const latest = pastAppts[0];
          lastVisit = latest.date || latest.rawDateTime || latest.raw_date_time || latest.datetime;
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

  const patientRows: any[] = [
    {
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 4 },
        { "type": "text", "text": rawPhone, "size": "sm", "color": "#0ea5e9", "weight": "bold", "flex": 6 }
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
        { "type": "text", "text": lastVisit, "size": "sm", "color": "#334155", "flex": 6 }
      ]
    }
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
          }
        ]
      }
    }
  };
}

function createAppointmentCarouselFlex(appts: any[], titleStr: string, settings: any[] = []) {
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

function createPosFlex(pos: any) {
  const patientName = pos.patientName || pos.patient_name || pos.customerName || 'ลูกค้าทั่วไป';
  const totalAmount = pos.totalAmount || pos.grandTotal || pos.total || 0;
  const id = pos.id || pos.receiptNo || pos.receipt_id || '-';
  const payMethod = pos.paymentMethod || pos.payment_method || 'เงินสด';
  const staff = pos.staff || pos.cashier || 'เจ้าหน้าที่';
  const phone = pos.phone || pos.tel || '';
  const dateStr = pos.datetime || pos.date || new Date().toLocaleDateString('th-TH');

  return {
    "type": "flex",
    "altText": `(เพิ่มบิลใหม่) รับชำระเงิน POS: ฿${Number(totalAmount).toLocaleString()} (${id})`,
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
            "text": "(เพิ่มบิลใหม่) รับชำระเงิน POS",
            "color": "#ffffff",
            "weight": "bold",
            "size": "md"
          },
          {
            "type": "text",
            "text": String(id),
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
                  { "type": "text", "text": "วันที่", "size": "sm", "color": "#64748b", "flex": 4 },
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
                  { "type": "text", "text": "ช่องทาง", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(payMethod), "size": "sm", "color": "#334155", "flex": 6 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "ผู้บันทึก", "size": "sm", "color": "#64748b", "flex": 4 },
                  { "type": "text", "text": String(staff), "size": "sm", "color": "#334155", "flex": 6 }
                ]
              }
            ]
          },
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
              { "type": "text", "text": `฿${Number(totalAmount).toLocaleString()}`, "size": "xl", "color": "#0284c7", "weight": "bold", "flex": 6, align: "end" }
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
              "label": "พิมพ์บิล",
              "uri": `${WEBAPP_URL}?print_pos=${encodeURIComponent(id)}`
            }
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
  if (!token || !replyToken) {
    console.error('sendLineReply: token or replyToken missing', { hasToken: !!token, hasReplyToken: !!replyToken });
    return false;
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ replyToken, messages })
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('sendLineReply error response from LINE:', res.status, errBody);
      return false;
    }
    return true;
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
    const FALLBACK_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ2RhZmFidXpndW9ma25oeHZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMTYxMCwiZXhwIjoyMTAwMzk3NjEwfQ.r5_f0bbN8oIS8WIVBqCAgr_M3CZKGWyYKJAkV3Ec21s';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://mjgdafabuzguofknhxvv.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || FALLBACK_SERVICE_KEY;
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
          
          // 1. ดึง Channel Access Token: รองรับโครงสร้าง { line: { bots: [...] } }, { lineBots: [...] }, { line: "token" }
          const botList = Array.isArray(vals.line?.bots) ? vals.line.bots
                        : Array.isArray(vals.lineBots) ? vals.lineBots
                        : [];
          if (botList.length > 0) {
            const activeBot = botList.find((b: any) => b.token && (Number(b.usedQuota) || 0) < (Number(b.totalQuota) || 300)) || botList[0];
            if (activeBot?.token) {
              lineToken = String(activeBot.token).trim();
            }
          } else if (typeof vals.line === 'string' && vals.line.trim()) {
            lineToken = vals.line.trim();
          } else if (vals.line?.token) {
            lineToken = String(vals.line.token).trim();
          }

          // 2. ดึงเป้าหมายกลุ่ม / ลูกค้า: รองรับทั้ง { line: { recipients: [...] } }, { lineRecipients: [...] }, { lineGroupId: "..." }
          const recList = Array.isArray(vals.line?.recipients) ? vals.line.recipients
                        : Array.isArray(vals.lineRecipients) ? vals.lineRecipients
                        : [];
          if (recList.length > 0) {
            const firstRec = recList[0];
            lineGroupId = typeof firstRec === 'string' ? firstRec.trim() : (firstRec?.chatId || firstRec?.id || '').trim();
          } else if (typeof vals.lineGroupId === 'string' && vals.lineGroupId.trim()) {
            lineGroupId = vals.lineGroupId.trim();
          }
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

      if (action === 'send_push') {
        const targets = Array.isArray(payload.to) ? payload.to : [payload.to || targetId];
        const pushToken = payload.token || lineToken;
        const pushMessages = payload.messages || [{ type: 'text', text: payload.message || 'แจ้งเตือน' }];
        let anySuccess = false;
        for (const t of targets) {
          if (t && pushToken) {
            const ok = await sendLinePush(t, pushMessages, pushToken);
            if (ok) anySuccess = true;
          }
        }
        return new Response(JSON.stringify({ success: anySuccess, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      if (action === 'sync_quotas') {
        const tokens = payload.tokens || [];
        const quotas: Record<string, number> = {};
        for (const item of tokens) {
          if (item?.token) {
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
        return new Response(JSON.stringify({ success: true, quotas }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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

        // 1. คำสั่งหา ID แชท: /idchat, /id chat, /ไอดีแชท, /groupid, /ไอดีกลุ่ม (รองรับการ mention บอทด้วย)
        const lowerMsg = userMessage.toLowerCase();
        if (
          lowerMsg === '/idchat' || 
          lowerMsg === '/id chat' ||
          lowerMsg === 'idchat' || 
          lowerMsg === 'id chat' ||
          lowerMsg === '/ไอดีแชท' || 
          lowerMsg === 'ไอดีแชท' || 
          lowerMsg === '/groupid' || 
          lowerMsg === 'groupid' || 
          lowerMsg === '/ไอดีกลุ่ม' || 
          lowerMsg === 'ไอดีกลุ่ม' ||
          lowerMsg.includes('/idchat') ||
          lowerMsg.includes('/id chat') ||
          lowerMsg.includes('idchat') ||
          lowerMsg.includes('ไอดีแชท') ||
          lowerMsg.includes('ไอดีกลุ่ม') ||
          lowerMsg.includes('groupid')
        ) {
          const targetId = source.groupId || source.userId || source.roomId || 'ไม่พบ ID';
          const chatType = source.type === 'group' ? 'กลุ่ม (Group ID)' : (source.type === 'user' ? 'ส่วนตัว (User ID)' : 'ห้องแชท');

          const replyText = `📍 ID สำหรับตั้งค่ารับการแจ้งเตือน (${chatType}):\n\n${targetId}\n\n(คุณสามารถคัดลอก ID นี้ ไปวางใส่ในช่อง ID กลุ่ม หรือ ID ลูกค้า หน้าตั้งค่าเว็บคลินิกได้เลยครับ)`;
          const replyOk = await sendLineReply(replyToken, [{ type: 'text', text: replyText }], lineToken);
          return new Response(JSON.stringify({ success: replyOk, targetId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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
          await sendLineReply(replyToken, [flexMenu], lineToken);
          return new Response(JSON.stringify({ success: true, menu: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 2.1 คำสั่งขอดูบิลล่าสุด (จากปุ่มเมนู หรือ พิมพ์ "บิลล่าสุด", "บิล")
        if (cleanMsg === 'บิลล่าสุด' || cleanMsg === 'ดูบิลล่าสุด' || cleanMsg === 'บิล') {
          const { data: posRaw } = await supabase.from('pos_transactions')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1);

          if (posRaw && posRaw.length > 0) {
            const flexMsg = createPosFlex(posRaw[0]);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, found: true, type: 'pos_latest' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          } else {
            await sendLineReply(replyToken, [{ type: 'text', text: 'ไม่พบประวัติบิลชำระเงิน POS ในระบบขณะนี้ครับ' }], lineToken);
            return new Response(JSON.stringify({ success: true, found: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }

        // 2.2 คำแนะนำค้นหาคนไข้ (จากปุ่มเมนู หรือ พิมพ์ "ค้นหาคนไข้")
        if (cleanMsg === 'ค้นหาคนไข้' || cleanMsg === 'หาคนไข้' || cleanMsg === 'ค้นหา' || cleanMsg === 'วิธีค้นหาคนไข้') {
          const guideMsg = {
            type: "text",
            text: "🔍 วิธีค้นหาประวัติคนไข้ (เวชระเบียน):\n\nท่านสามารถพิมพ์ส่งมาในแชทได้ทันที เช่น:\n• ชื่อ หรือ นามสกุล (เช่น สมชาย หรือ นวลอนงค์)\n• รหัส HN (เช่น HN001 หรือ HN69-0001)\n• เบอร์โทรศัพท์ (เช่น 0812345678)\n\nระบบบอทจะค้นหาและส่งบัตรประวัติคนไข้พร้อมคิวนัดหมายล่าสุดให้ทันทีครับ 🏥"
          };
          await sendLineReply(replyToken, [guideMsg], lineToken);
          return new Response(JSON.stringify({ success: true, guide: 'patient_search' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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

        if (isSalesSummary) {
          const { todayIso } = getTodayAndTomorrowThaiYMD();
          let targetYMD = todayIso;
          let labelBranch = 'สาขาหลัก';

          // ตรวจสอบว่าขอสรุปยอด "เมื่อวาน" หรือระบุวันที่หรือไม่
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
          
          const validTxns = (posRaw || []).filter((tx: any) => {
            if (tx.is_deleted || tx.status === 'cancelled') return false;
            const rawTime = tx.created_at || tx.date;
            if (!rawTime) return false;
            try {
              const d = new Date(rawTime);
              if (isNaN(d.getTime())) return false;
              const txThai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
              return txThai.toISOString().split('T')[0] === targetYMD;
            } catch (_e) {
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
          const uniquePatients = new Set<string>();

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
          await sendLineReply(replyToken, [flexMsg], lineToken);
          return new Response(JSON.stringify({ success: true, count: validTxns.length, total: totalAmount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 3. ค้นหาคิวนัดหมายตามวันที่ระบุ (เช่น "นัดหมาย 12/09/2569", "นัด 13/09/2569", "คิว 15/09/2026")
        const specificApptDateMatch = cleanMsg.match(/^(นัด(หมาย)?|คิว)\s*(วันที(่|้))?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (specificApptDateMatch) {
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
            .filter((q: any) => !q.isDeleted && parseQueueDateToThaiYMD(q.rawDateTime) === targetYMD);

          queueList.sort((a: any, b: any) => new Date(a.rawDateTime).getTime() - new Date(b.rawDateTime).getTime());
          const flexMsg = createAppointmentCarouselFlex(queueList, titleText, allSettingsRows);
          await sendLineReply(replyToken, [flexMsg], lineToken);
          return new Response(JSON.stringify({ success: true, count: queueList.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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
          const { todayIso, tomorrowIso } = getTodayAndTomorrowThaiYMD();
          const targetYMD = isTomorrowAppt ? tomorrowIso : todayIso;
          const titleText = isTomorrowAppt ? 'คิวนัดหมายพรุ่งนี้' : 'คิวนัดหมายวันนี้';

          const { data: queueRaw } = await supabase.from('queue').select('*');
          const queueList = (queueRaw || [])
            .map(normalizeQueueRow)
            .filter((q: any) => !q.isDeleted && parseQueueDateToThaiYMD(q.rawDateTime) === targetYMD);

          queueList.sort((a: any, b: any) => new Date(a.rawDateTime).getTime() - new Date(b.rawDateTime).getTime());
          const flexMsg = createAppointmentCarouselFlex(queueList, titleText, allSettingsRows);
          await sendLineReply(replyToken, [flexMsg], lineToken);
          return new Response(JSON.stringify({ success: true, count: queueList.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 3.2 ดูนัดหมายรายบุคคล (เช่น "ดูนัดหมาย HN69-0071", "ดูนัดหมาย 0071", "ดูนัดหมาย ศิริลักษ์", "หา HN001")
        if (cleanMsg.startsWith('ดูนัดหมาย') || cleanMsg.startsWith('นัดหมาย ') || cleanMsg.startsWith('หา ') || cleanMsg.startsWith('คิวนัดหมาย ')) {
          const kw = cleanMsg.replace(/^(ดูนัดหมาย|นัดหมาย|คิวนัดหมาย|หา)\s*/, '').trim();
          if (kw) {
            const { data: queueRaw } = await supabase.from('queue').select('*');
            const queueList = (queueRaw || [])
              .map(normalizeQueueRow)
              .filter((q: any) => !q.isDeleted && (
                isHnMatch(q.hn, kw) ||
                (q.patientName && q.patientName.toLowerCase().includes(kw.toLowerCase()))
              ));

            queueList.sort((a: any, b: any) => new Date(b.rawDateTime).getTime() - new Date(a.rawDateTime).getTime());
            const flexMsg = createAppointmentCarouselFlex(queueList, `นัดหมายของ "${kw}"`, allSettingsRows);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, count: queueList.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }

        // 4. ค้นหาบิล POS / ใบเสร็จรับเงิน (เช่น "REC69090022", "บิล REC69090022", "บิล 22", "ใบเสร็จ REC...")
        const isBillSearch = Boolean(
          cleanMsg.toUpperCase().includes('REC') ||
          cleanMsg.startsWith('บิล') ||
          cleanMsg.startsWith('ใบเสร็จ')
        );

        if (isBillSearch) {
          const recKw = cleanMsg.replace(/^(บิล|ใบเสร็จ|ดูบิล)\s*/, '').trim().toUpperCase();
          const { data: posRaw } = await supabase.from('pos_transactions').select('*');
          const matchedTx = (posRaw || []).find((tx: any) => {
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
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, found: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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

        if (isInvSearch) {
          const invKw = cleanMsg.replace(/^(สต็อก|ยา|สินค้า|คลัง|เช็คสต็อก)\s*/, '').trim().toLowerCase();
          const { data: invRaw } = await supabase.from('inventory').select('*');
          const validItems = (invRaw || []).filter((item: any) => !item.is_deleted);

          if (!invKw) {
            // หากไม่ได้ระบุชื่อยา (เช่น กดปุ่ม "เช็คสต็อก" จากเมนู) ให้แสดงสินค้า 10 รายการเรียงจากคงเหลือน้อยที่สุด
            const sorted = [...validItems].sort((a: any, b: any) => {
              const qA = Number(a.stock_quantity ?? a.quantity ?? 0);
              const qB = Number(b.stock_quantity ?? b.quantity ?? 0);
              return qA - qB;
            });
            const topItems = sorted.slice(0, 10);
            if (topItems.length > 0) {
              const bubbles = topItems.map((it: any) => createInventoryFlex(it).contents);
              const flexMsg = {
                type: "flex",
                altText: "📦 ข้อมูลสต็อกยา & เวชภัณฑ์ในคลังคลินิก",
                contents: bubbles.length === 1 ? bubbles[0] : {
                  type: "carousel",
                  contents: bubbles
                }
              };
              await sendLineReply(replyToken, [flexMsg], lineToken);
              return new Response(JSON.stringify({ success: true, count: topItems.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }
          } else {
            const matchedItem = validItems.find((item: any) => {
              const n = String(item.name || item.product_name || '').toLowerCase();
              const c = String(item.code || item.id || '').toLowerCase();
              return n.includes(invKw) || c.includes(invKw);
            });

            if (matchedItem) {
              const flexMsg = createInventoryFlex(matchedItem);
              await sendLineReply(replyToken, [flexMsg], lineToken);
              return new Response(JSON.stringify({ success: true, found: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }
          }
        }

        // 6. ค้นหาประวัติคนไข้ (เวชระเบียน) จาก Supabase (พิมพ์ชื่อ, HN เช่น HN001 -> HN69-0001, หรือ เบอร์โทร)
        const keyword = cleanMsg.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล|ประวัติ|คนไข้)\s*/, '').trim();
        if (keyword.length > 0) {
          const { data: patientsRaw } = await supabase.from('patients').select('*');
          const patients = (patientsRaw || []).map((p: any) => ({
            ...p,
            ...(p.data || {}),
            hn: p.hn || p.id || p.data?.hn || p.data?.id,
            firstName: p.first_name || p.firstName || p.data?.first_name || p.data?.firstName || '',
            lastName: p.last_name || p.lastName || p.data?.last_name || p.data?.lastName || '',
            name: p.name || p.data?.name || `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim(),
            phone: p.phone || p.tel || p.data?.phone || p.data?.tel || '',
            isDeleted: Boolean(p.is_deleted ?? p.data?.is_deleted ?? false)
          })).filter((p: any) => !p.isDeleted);

          const kw = keyword.toLowerCase();
          const matched = patients.find((p: any) => 
            isHnMatch(p.hn, kw) ||
            (p.firstName && p.firstName.toLowerCase().includes(kw)) ||
            (p.lastName && p.lastName.toLowerCase().includes(kw)) ||
            (p.name && p.name.toLowerCase().includes(kw)) ||
            (p.phone && String(p.phone).includes(kw))
          );

          if (matched) {
            const { data: queueRaw } = await supabase.from('queue').select('*');
            const queueList = (queueRaw || []).map(normalizeQueueRow).filter((q: any) => !q.isDeleted);
            const flexMsg = createPatientFlex(matched, queueList);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, type: 'patient' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }

          // สำรอง 1: หากค้นหาในเวชระเบียนไม่เจอ ลองดูในคิวนัดหมาย
          const { data: queueRaw } = await supabase.from('queue').select('*');
          const queueList = (queueRaw || [])
            .map(normalizeQueueRow)
            .filter((q: any) => !q.isDeleted && (
              isHnMatch(q.hn, kw) ||
              (q.patientName && q.patientName.toLowerCase().includes(kw))
            ));

          if (queueList.length > 0) {
            const flexMsg = createAppointmentCarouselFlex(queueList, `นัดหมายของ "${keyword}"`, allSettingsRows);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, type: 'queue' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }

          // สำรอง 2: หากยังไม่เจอ ลองตรวจในคลังยาและสินค้า
          const { data: invRaw } = await supabase.from('inventory').select('*');
          const matchedInv = (invRaw || []).find((item: any) => {
            if (item.is_deleted) return false;
            const n = String(item.name || '').toLowerCase();
            const c = String(item.code || '').toLowerCase();
            return n.includes(kw) || c.includes(kw);
          });

          if (matchedInv) {
            const flexMsg = createInventoryFlex(matchedInv);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, type: 'inventory' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }

          // สำรอง 3: ลองตรวจในบิล POS
          const { data: posRaw } = await supabase.from('pos_transactions').select('*');
          const matchedPos = (posRaw || []).find((tx: any) => {
            if (tx.is_deleted) return false;
            const rNo = String(tx.receipt_no || tx.id || '').toLowerCase();
            const pName = String(tx.patient_name || '').toLowerCase();
            return rNo.includes(kw) || pName.includes(kw);
          });

          if (matchedPos) {
            const flexMsg = createPosFlex(matchedPos);
            await sendLineReply(replyToken, [flexMsg], lineToken);
            return new Response(JSON.stringify({ success: true, type: 'pos' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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
          await sendLineReply(replyToken, [{ type: 'text', text: notFoundText }], lineToken);
          return new Response(JSON.stringify({ success: true, notFound: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
      }
      return new Response(JSON.stringify({ success: true, mode: 'line_chatbot' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ message: "No action performed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
