const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const fileV3Match = fs.readdirSync(projectDir).find(f => f.includes('v.3'));
let v3Content = fs.readFileSync(path.join(projectDir, fileV3Match), 'utf8');

const replacement = `function doPost(e) {
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
      const keyword = userMessage.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล|นัดหมาย)\\s*/, '').trim();
      
      if (keyword.length > 0) {
        const flexMessage = searchInfoForLineFlex(keyword);

        if (flexMessage) {
          replyLineMessage(replyToken, [flexMessage]);
        } else {
          replyLineMessage(replyToken, [{
            type: "text",
            text: \`ไม่พบข้อมูลคนไข้ที่ตรงกับ "\${keyword}" ในระบบค่ะ\`
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
  const fullName = \`\${patient.firstName || ''} \${patient.lastName || ''}\`.trim() || 'ไม่ระบุชื่อ';
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
        if (appt.time) dateStr += \` \${appt.time}\`;
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
    "altText": \`ข้อมูลคนไข้: \${fullName}\`,
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
`;

const oldDoPostRegex = /function doPost\(e\) \{[\s\S]*?lock\.releaseLock\(\);\n  \}\n\}/;
let v4Content = v3Content.replace(oldDoPostRegex, replacement);

fs.writeFileSync(path.join(projectDir, 'หลังบ้าน v.4 LINE.js'), v4Content);
console.log('Created backend v.4 LINE EXACTLY!');
