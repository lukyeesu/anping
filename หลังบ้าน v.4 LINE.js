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

function handleLineWebhook(requestData) {
  try {
    const event = requestData.events[0];
    // ตรวจสอบว่าเป็นการพิมพ์ข้อความมาหาแชทบอท
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim();
      const replyToken = event.replyToken;

      // กรองคำค้นหา (ลบคำว่า หา, ค้นหา ออก)
      const keyword = userMessage.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล|นัดหมาย)\s*/, '').trim();
      
      if (keyword.length > 0) {
        const flexMessage = searchInfoForLineFlex(keyword);

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

function searchInfoForLineFlex(keyword) {
  const kw = keyword.toLowerCase();
  
  // 1. ค้นหาในประวัติคนไข้ (ชีต Patients)
  const patientsData = getData('Patients').data || [];
  const matchedPatient = patientsData.find(p => 
    (p.hn && p.hn.toLowerCase().includes(kw)) || 
    (p.firstName && p.firstName.toLowerCase().includes(kw)) ||
    (p.lastName && p.lastName.toLowerCase().includes(kw)) ||
    (p.phone && p.phone.includes(kw))
  );

  if (!matchedPatient) return null; // ไม่เจอคนไข้

  // 2. หานัดหมายล่าสุดของคนไข้ (ชีต Queue)
  const queueData = getData('Queue').data || [];
  const patientAppointments = queueData.filter(q => q.patientId === matchedPatient.hn || q.patientId === matchedPatient.id);
  
  // เรียงวันที่ล่าสุดขึ้นก่อน
  patientAppointments.sort((a,b) => new Date(b.date || b.rawDateTime || 0) - new Date(a.date || a.rawDateTime || 0));
  const latestAppt = patientAppointments.length > 0 ? patientAppointments[0] : null;

  // 3. สร้าง Flex Message
  return generatePatientFlexMessage(matchedPatient, latestAppt);
}

function generatePatientFlexMessage(patient, appt) {
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  
  let apptBox = {
    "type": "box",
    "layout": "vertical",
    "margin": "lg",
    "spacing": "sm",
    "contents": [
      {
        "type": "text",
        "text": "ไม่มีข้อมูลนัดหมาย",
        "size": "sm",
        "color": "#aaaaaa"
      }
    ]
  };

  if (appt) {
    let statusColor = "#aaaaaa";
    let statusText = appt.status || "รอคิว";
    if (statusText === 'กำลังตรวจ') statusColor = "#0284c7";
    else if (statusText === 'เสร็จสิ้น' || statusText === 'รับยา/ชำระเงิน') statusColor = "#16a34a";
    else if (statusText === 'รอคิว') statusColor = "#f59e0b";

    // Format วันที่
    let dateStr = appt.date || appt.rawDateTime || "";
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        if (appt.time) dateStr += ` ${appt.time}`;
      } catch(e) {}
    }

    apptBox = {
      "type": "box",
      "layout": "vertical",
      "margin": "lg",
      "spacing": "sm",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "นัดล่าสุด", "size": "sm", "color": "#aaaaaa", "flex": 1 },
            { "type": "text", "text": dateStr || "-", "size": "sm", "color": "#333333", "flex": 2, "wrap": true }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "สถานะ", "size": "sm", "color": "#aaaaaa", "flex": 1 },
            { "type": "text", "text": statusText, "size": "sm", "color": statusColor, "flex": 2, "weight": "bold" }
          ]
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "แพทย์", "size": "sm", "color": "#aaaaaa", "flex": 1 },
            { "type": "text", "text": appt.doctorName || "-", "size": "sm", "color": "#333333", "flex": 2, "wrap": true }
          ]
        }
      ]
    };
  }

  return {
    "type": "flex",
    "altText": `ข้อมูลคนไข้: ${fullName}`,
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": "#f0f8ff",
        "contents": [
          {
            "type": "text",
            "text": "🏥 ข้อมูลคนไข้",
            "weight": "bold",
            "color": "#0284c7",
            "size": "sm"
          },
          {
            "type": "text",
            "text": fullName,
            "weight": "bold",
            "size": "xl",
            "margin": "md",
            "wrap": true
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "รหัส HN", "size": "sm", "color": "#aaaaaa", "flex": 1 },
              { "type": "text", "text": hn, "size": "sm", "color": "#333333", "flex": 2, "weight": "bold" }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "margin": "md",
            "contents": [
              { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#aaaaaa", "flex": 1 },
              { "type": "text", "text": phone, "size": "sm", "color": "#333333", "flex": 2 }
            ]
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          apptBox
        ]
      }
    }
  };
}

function replyLineMessage(replyToken, messages) {
  const lineToken = getLineToken();
  if (!lineToken) return; // ถ้าไม่ได้ใส่ Token ในเว็บให้ข้ามไป

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

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Universal JSON API v.2 is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
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
