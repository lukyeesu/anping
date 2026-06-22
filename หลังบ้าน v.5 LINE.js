// ==========================================
// Universal JSON Backend (Google Apps Script) v.4
// รองรับทุกระบบ: เวชระเบียน, POS, คลังสินค้า, คิว ฯลฯ
// เพิ่มฟีเจอร์: LINE Webhook Flex Message & Dynamic Token
// ==========================================

const DB_SCHEMA = ['id', 'json_data']; // โครงสร้างตายตัวสำหรับทุกชีต

function doPost(e) {
  // --- ระบบจัดคิว ป้องกันข้อมูลชนกันเวลาบันทึกพร้อมกันหลายคน ---
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    
    const requestData = JSON.parse(e.postData.contents);

    // ==========================================
    // 🟢 เช็คว่าเป็น Webhook จาก LINE หรือไม่
    // ==========================================
    if (requestData.events && requestData.events.length > 0) {
      return handleLineWebhook(requestData);
    }

    // ==========================================
    // 🔵 โค้ดเดิมสำหรับจัดการ API จาก Web App 
    // ==========================================
    const { action, sheetName, payload } = requestData;

    if (!sheetName) throw new Error("Missing 'sheetName' in request.");
    initSheet(sheetName); // เตรียมชีตอัตโนมัติ

    let response = {};

    switch (action) {
      case 'SAVE_DATA':
        response = saveData(sheetName, payload);
        break;
      case 'GET_DATA':
        response = getData(sheetName);
        break;
      case 'GET_DATA_BY_MONTH': 
        response = getDataByMonth(sheetName, payload.year, payload.month);
        break;
      case 'DELETE_DATA':
        response = deleteData(sheetName, payload.id);
        break;
      case 'UPLOAD_FILE':
        response = uploadFile(payload);
        break;
      default:
        response = { status: 'error', message: 'Action not found' };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 🟢 ส่วนของการจัดการ LINE Webhook และ Flex Message
// ==========================================

// ⚠️ ดึง Token อัตโนมัติจากหน้าตั้งค่าของเว็บแอป (ชีต Settings)
function getLineToken() {
  const settings = getData('Settings').data || [];
  const tokenRecord = settings.find(s => s.id === 'integration_tokens');
  if (tokenRecord && tokenRecord.values && tokenRecord.values.line) {
    return tokenRecord.values.line;
  }
  return ""; 
}

const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/2966/2966327.png"; // ⚠️ เปลี่ยนเป็น URL โลโก้ของคลินิกได้
const WEBAPP_URL = "https://anpingclinic.vercel.app"; // ⚠️ เปลี่ยนเป็น URL หน้าเว็บจริง

function handleLineWebhook(requestData) {
  try {
    const event = requestData.events[0];
    if (event.type === 'message' && event.message.type === 'text') {
      let userMessage = event.message.text.trim();
      const replyToken = event.replyToken;

      // 1. เช็คคำสั่ง "นัดหมายวันนี้", "นัดวันนี้มีใครบ้าง" ฯลฯ
      if (userMessage.match(/นัด(หมาย)?(วันนี้|วันนี)/)) {
        const flexMsg = getAppointmentsForDay(0);
        replyLineMessage(replyToken, [flexMsg]);
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }
      if (userMessage.match(/นัด(หมาย)?พรุ่งนี้/)) {
        const flexMsg = getAppointmentsForDay(1);
        replyLineMessage(replyToken, [flexMsg]);
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }

      // 2. เช็คคำสั่งดูนัดหมายของคนไข้ เช่น "ดูนัดหมาย HN001"
      if (userMessage.startsWith('ดูนัดหมาย')) {
        const kw = userMessage.replace('ดูนัดหมาย', '').trim();
        if (kw) {
          const flexMsg = getAppointmentsForPatient(kw);
          replyLineMessage(replyToken, [flexMsg]);
          return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
        }
      }

      // 3. ค้นหาข้อมูลคนไข้ปกติ (ตัดคำนำหน้าออก)
      const keyword = userMessage.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล)\s*/, '').trim();
      if (keyword.length > 0) {
        const flexMessage = searchPatientFlex(keyword);
        if (flexMessage) {
          replyLineMessage(replyToken, [flexMessage]);
        } else {
          replyLineMessage(replyToken, [{
            type: "text",
            text: `ไม่พบข้อมูลคนไข้ที่ตรงกับ "${keyword}" ในระบบค่ะ`
          }]);
        }
      }
    }
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch(e) {
    return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
  }
}

// -------------------------------------------------------------
// ค้นหาและสร้างการ์ดคนไข้
// -------------------------------------------------------------
function searchPatientFlex(keyword) {
  const kw = keyword.toLowerCase();
  const patientsData = getData('Patients').data || [];
  const matchedPatient = patientsData.find(p => 
    (p.hn && p.hn.toLowerCase().includes(kw)) || 
    (p.firstName && p.firstName.toLowerCase().includes(kw)) ||
    (p.lastName && p.lastName.toLowerCase().includes(kw)) ||
    (p.phone && p.phone.includes(kw))
  );

  if (!matchedPatient) return null;

  return buildPatientCardFlex(matchedPatient);
}

function buildPatientCardFlex(patient) {
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  const age = patient.age ? `${patient.age} ปี` : '-';
  const gender = patient.gender || '-';
  const lastVisit = patient.lastVisit || '-';

  return {
    "type": "flex",
    "altText": `ระเบียนประวัติ: ${fullName}`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#0284c7", // สีฟ้าคลินิก
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": "ระเบียนประวัติคนไข้",
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
                  { "type": "text", "text": `${age} / ${gender}`, "size": "sm", "color": "#334155", "flex": 2 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "มาล่าสุด", "size": "sm", "color": "#64748b", "flex": 1 },
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
              "label": "🖨️ พิมพ์ใบ OPD",
              "uri": `${WEBAPP_URL}?print_opd_hn=${hn}`
            }
          }
        ]
      }
    }
  };
}

// -------------------------------------------------------------
// ค้นหาและสร้างการ์ดนัดหมาย
// -------------------------------------------------------------
function getAppointmentsForDay(dayOffset) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetDateStr = targetDate.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const queueData = getData('Queue').data || [];
  
  // กรองหานัดที่ตรงกับวันที่ต้องการ
  const appts = queueData.filter(q => {
    if (!q.date && !q.rawDateTime) return false;
    try {
      const d = new Date(q.date || q.rawDateTime);
      const dStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
      return dStr === targetDateStr;
    } catch(e) { return false; }
  });

  if (appts.length === 0) {
    const dayText = dayOffset === 0 ? 'วันนี้' : 'พรุ่งนี้';
    return {
      "type": "flex",
      "altText": `ไม่มีนัดหมาย${dayText}`,
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": `ไม่มีนัดหมายสำหรับ${dayText}ค่ะ`, "color": "#64748b" }
          ]
        }
      }
    };
  }

  return buildAppointmentCarousel(appts, dayOffset === 0 ? 'นัดหมายวันนี้' : 'นัดหมายพรุ่งนี้');
}

function getAppointmentsForPatient(hn) {
  const queueData = getData('Queue').data || [];
  const appts = queueData.filter(q => q.patientId === hn);
  
  if (appts.length === 0) {
    return {
      "type": "flex",
      "altText": "ไม่มีข้อมูลนัดหมาย",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": `ไม่พบนัดหมายของรหัส ${hn}`, "color": "#64748b" }
          ]
        }
      }
    };
  }

  // เรียงลำดับคิวใหม่สุดขึ้นก่อน
  appts.sort((a,b) => new Date(b.date || b.rawDateTime || 0) - new Date(a.date || a.rawDateTime || 0));

  return buildAppointmentCarousel(appts.slice(0, 5), `ประวัตินัดหมาย ${hn}`); // แสดงสูงสุด 5 คิว
}

function buildAppointmentCarousel(appts, titleStr) {
  const bubbles = appts.map(appt => {
    let rawStatus = appt.status || appt.dealStatus || "pending";
    let statusColor = "#94a3b8"; // สีเทาตั้งต้น
    let statusText = rawStatus;
    
    // แปลงสถานะภาษาอังกฤษเป็นภาษาไทย และกำหนดสีให้ตรงกับหน้าเว็บ
    if (rawStatus === 'pending') { statusText = 'รอยืนยัน'; statusColor = "#f59e0b"; } // amber
    else if (rawStatus === 'confirmed') { statusText = 'ยืนยันแล้ว'; statusColor = "#0284c7"; } // sky/blue
    else if (rawStatus === 'cancelled') { statusText = 'ยกเลิก'; statusColor = "#ef4444"; } // red/rose
    else if (rawStatus === 'postponed') { statusText = 'เลื่อนนัด'; statusColor = "#8b5cf6"; } // violet
    else {
      // ดักเคสอื่น (เช่น สถานะจากหน้าเวชระเบียน)
      if (statusText.includes('สำเร็จ') || statusText.includes('เสร็จ') || statusText.includes('ชำระเงิน')) {
        statusColor = "#10b981"; // emerald/green
      } else if (statusText.includes('ตรวจ')) {
        statusColor = "#0ea5e9";
      } else if (statusText.includes('รอคิว')) {
        statusColor = "#f59e0b";
      }
    }

    let dateStr = appt.datetime || appt.date || appt.rawDateTime || "-";
    let timeStr = appt.time || "-";
    let finalDateStr = "-";
    
    if (dateStr && dateStr !== "-") {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) { // Check for Invalid Date
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            if (t !== "00:00") timeStr = t;
          }
          finalDateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
          finalDateStr = dateStr; // fallback to raw string if cannot parse
        }
      } catch(e) {
        finalDateStr = dateStr;
      }
    }

    const hn = appt.hn || appt.patientId || "-";
    const patientName = appt.patientName || appt.name || "ไม่ระบุชื่อ";
    const doctor = appt.doctor || appt.doctorName || appt.artist || "-";
    const reason = appt.reason || appt.category || "-";
    const phone = appt.phone || "-"; 

    return {
      "type": "bubble",
      "size": "micro",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": statusColor,
        "paddingAll": "sm",
        "contents": [
          {
            "type": "text",
            "text": statusText,
            "color": "#ffffff",
            "weight": "bold",
            "size": "sm"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "md",
        "contents": [
          {
            "type": "text",
            "text": patientName,
            "weight": "bold",
            "size": "md",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": hn,
            "size": "xs",
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
            "spacing": "xs",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "วันที่", "size": "xs", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": finalDateStr, "size": "xs", "color": "#334155", "flex": 2, "weight": "bold" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เวลา", "size": "xs", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": timeStr, "size": "xs", "color": "#334155", "flex": 2, "weight": "bold" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "สาเหตุ", "size": "xs", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": reason, "size": "xs", "color": "#334155", "flex": 2, "wrap": true }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "แพทย์", "size": "xs", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": doctor, "size": "xs", "color": "#334155", "flex": 2, "wrap": true }
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
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "color": "#0284c7", // ฟ้า
                "height": "sm",
                "action": {
                  "type": "uri",
                  "label": "🖨️ ปริ้น OPD",
                  "uri": `${WEBAPP_URL}?print_opd_hn=${hn}&print_opd_date=${appt.date || appt.rawDateTime || appt.datetime || ''}`
                }
              },
              {
                "type": "button",
                "style": "primary",
                "color": "#10b981", // เขียวโทร
                "height": "sm",
                "action": {
                  "type": "uri",
                  "label": "📞 โทร",
                  "uri": phone && phone !== '-' ? `tel:${phone}` : `tel:0000`
                }
              }
            ]
          }
        ]
      }
    };
  });

  return {
    "type": "flex",
    "altText": titleStr,
    "contents": {
      "type": "carousel",
      "contents": bubbles
    }
  };
}

function replyLineMessage(replyToken, messages) {
  const lineToken = getLineToken();
  if (!lineToken) return; 

  const url = "https://api.line.me/v2/bot/message/reply";
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + lineToken
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    })
  };
  UrlFetchApp.fetch(url, options);
}

// สร้างชีตและหัวคอลัมน์ให้อัตโนมัติ หากยังไม่มีชีตนั้นๆ อยู่
function initSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const range = sheet.getRange(1, 1, 1, 2);
    range.setValues([DB_SCHEMA]);
    range.setFontWeight("bold").setBackground("#f0f8ff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 500); // ขยายช่องให้กว้างเพื่อเก็บ JSON
  }
}

// ==========================================
// ฟังก์ชันจัดการข้อมูล (CRUD) รูปแบบ JSON สากล
// ==========================================

function saveData(sheetName, payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  const idToSave = payload.id || payload.hn; 
  if (!idToSave) return { status: 'error', message: 'ID is required' };

  payload.updatedAt = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToSave) {
      sheet.getRange(i + 1, 2).setValue(JSON.stringify(payload)); 
      return { status: 'success', message: 'Data updated successfully', data: payload };
    }
  }

  payload.createdAt = new Date().toISOString();
  sheet.appendRow([idToSave, JSON.stringify(payload)]);
  return { status: 'success', message: 'Data created successfully', data: payload };
}

function getData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return { status: 'success', data: [] }; 
  
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  
  const records = values.map(row => {
    try {
      return JSON.parse(row[1]); 
    } catch(e) {
      return null;
    }
  }).filter(r => r !== null);
  
  return { status: 'success', data: records };
}

/**
 * ฟังก์ชันใหม่: ดึงข้อมูลเฉพาะเดือนและปีที่ระบุ
 * ช่วยลดภาระการโหลดข้อมูลมหาศาล (Infinity Monthly Loading)
 */
function getDataByMonth(sheetName, year, month) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return { status: 'success', data: [] }; 
  
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  
  const records = values.map(row => {
    try {
      return JSON.parse(row[1]);
    } catch(e) {
      return null;
    }
  }).filter(r => {
    if (r === null) return false;
    
    // ตรวจสอบฟิลด์วันที่ที่มีโอกาสพบในระบบ (Appointment/Queue)
    const dateStr = r.rawDeliveryStart || r.rawDeliveryDateTime || r.rawDateTime || r.date;
    if (!dateStr) return false;
    
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    
    // กรองเอาเฉพาะข้อมูลที่ตรงกับปีและเดือน (month ที่ส่งมาเป็น 1-12)
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });
  
  return { status: 'success', data: records };
}

function deleteData(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Data deleted successfully' };
    }
  }
  return { status: 'error', message: 'ID not found' };
}

function uploadFile(payload) {
  try {
    const { folderId, fileName, mimeType, data } = payload;
    if (!folderId || !data) return { status: 'error', message: 'Missing folderId or data' };

    const folder = DriveApp.getFolderById(folderId);
    const decodedData = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decodedData, mimeType, fileName);
    const file = folder.createFile(blob);

    const fileId = file.getId();
    const directUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    return { 
      status: 'success', 
      message: 'File uploaded successfully',
      fileUrl: directUrl, 
      fileId: fileId 
    };
  } catch (error) {
    return { status: 'error', message: 'Upload failed: ' + error.toString() };
  }
}
