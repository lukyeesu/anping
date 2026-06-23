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
    const { action, sheetName, payload, token } = requestData;

    // --- ระบบล็อกอิน (LOGIN) สร้าง Token แบบถาวร ---
    if (action === 'LOGIN') {
        const staffObj = getData('Staff').data || [];
        const matched = staffObj.find(s => s.username && payload.username && s.username.toLowerCase() === payload.username.toLowerCase() && s.password === payload.password);
        
        if (matched) {
            delete matched.password; // ลบรหัสผ่านทิ้งก่อนส่งกลับไปหน้าเว็บ
            const newToken = Utilities.getUuid();
            // ใช้ PropertiesService เก็บ Token แบบถาวร (จนกว่าจะ Logout) ไม่หมดอายุใน 6 ชม.
            PropertiesService.getScriptProperties().setProperty('session_' + newToken, matched.id); 
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: { staff: matched, token: newToken } })).setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' })).setMimeType(ContentService.MimeType.JSON);
        }
    }

    // --- ระบบออกจากระบบ (LOGOUT) ลบ Token ถาวรทิ้ง ---
    if (action === 'LOGOUT') {
        if (token) {
            PropertiesService.getScriptProperties().deleteProperty('session_' + token);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'FORGOT_PASSWORD') return handleForgotPassword(payload);
    if (action === 'CONFIRM_RESET_PASSWORD') return handleConfirmResetPassword(payload);

    // --- ตรวจสอบ Token (AUTHENTICATION CHECK) ---
    let isValidToken = false;
    if (token === 'recovery-token') {
        isValidToken = true;
    } else if (token) {
        const userId = PropertiesService.getScriptProperties().getProperty('session_' + token);
        if (userId) {
            isValidToken = true;
        }
    }
    
    if (!isValidToken) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unauthorized: Invalid or missing token' })).setMimeType(ContentService.MimeType.JSON);
    }

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

function getLineGroupId() {
  const settings = getData('Settings').data || [];
  const tokenRecord = settings.find(s => s.id === 'integration_tokens');
  if (tokenRecord && tokenRecord.values && tokenRecord.values.lineGroupId) {
    return tokenRecord.values.lineGroupId;
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

      // 0. คำสั่งเช็คไอดีกลุ่ม (เอาไว้ใช้ทำระบบแจ้งเตือน)
      if (userMessage.toLowerCase() === '/groupid' || userMessage === '/ไอดีกลุ่ม') {
        const source = event.source;
        if (source.type === 'group') {
          replyLineMessage(replyToken, [{ type: "text", text: `📍 Group ID ของกลุ่มนี้คือ:\n${source.groupId}\n\n(นำ ID นี้ไปให้ผู้พัฒนาเพื่อตั้งค่าการแจ้งเตือนได้เลยครับ)` }]);
        } else {
          replyLineMessage(replyToken, [{ type: "text", text: `คำสั่งนี้ต้องใช้ใน "กลุ่ม LINE" เท่านั้นครับ!\nรบกวนดึงบอทเข้ากลุ่มแล้วพิมพ์ใหม่อีกครั้งครับ` }]);
        }
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }

      // 0.1 คำสั่ง /help เพื่อดูรายการคำสั่งทั้งหมด
      if (userMessage.toLowerCase() === '/help') {
        const helpText = `🤖 รวมคำสั่งแชทบอทคลินิก 🏥\n-------------------------\n🔍 ค้นหาประวัติคนไข้:\nพิมพ์ ชื่อ, นามสกุล, รหัส HN หรือ เบอร์โทร (เช่น สมชาย หรือ HN001)\n\n📅 ดูคิวนัดหมายรวม:\nพิมพ์คำว่า "นัดหมายวันนี้" หรือ "นัดหมายพรุ่งนี้"\n\n👤 ดูนัดหมายรายบุคคล:\nพิมพ์คำว่า "ดูนัดหมาย" ตามด้วย ชื่อ หรือ รหัส HN\n(เช่น ดูนัดหมาย HN001)\n\n💡 พิมพ์ /help เพื่อดูข้อความนี้อีกครั้ง`;
        replyLineMessage(replyToken, [{ type: "text", text: helpText }]);
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }

      // 1. เช็คคำสั่ง "นัดหมายวันนี้", "นัดวันนี้มีใครบ้าง" ฯลฯ
      if (userMessage.match(/นัด(หมาย)?(วันนี้|วันนี)/)) {
        const flexMsg = getAppointmentsForDay(0);
        replyLineMessage(replyToken, [flexMsg]);
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }
      if (userMessage.match(/นัด(หมาย)?พรุ(่|้)งนี้/)) {
        const flexMsg = getAppointmentsForDay(1);
        replyLineMessage(replyToken, [flexMsg]);
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }

      const dateMatch = userMessage.match(/^นัด(หมาย)?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dateMatch) {
        const day = parseInt(dateMatch[2], 10);
        const month = parseInt(dateMatch[3], 10) - 1; 
        let year = parseInt(dateMatch[4], 10);
        
        if (year > 2400) year -= 543;

        const targetDate = new Date(year, month, day);
        const dateStrForLabel = `วันที่ ${day.toString().padStart(2, '0')}/${(month+1).toString().padStart(2, '0')}/${year+543}`;
        
        const flexMsg = getAppointmentsForDate(targetDate, dateStrForLabel);
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
function formatCompactDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
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
  let idc = patient.idCard ? String(patient.idCard).replace(/\D/g, "") : "0000";
  if (idc.length < 4) idc = "0000";
  const idCard4 = idc.slice(-4);
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  let ageStr = '-';
  if (patient.age) {
    ageStr = `${patient.age} ปี`;
  } else if (patient.dob) {
    // dob is DD/MM/YYYY (Buddhist year)
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

  if (!lastVisit) {
    try {
      const queueData = getData('Queue').data || [];
      const pId = patient.hn || patient.id;
      const patientAppts = queueData.filter(q => q.hn === pId || q.patientId === pId);
      if (patientAppts.length > 0) {
        // หาคิวที่ผ่านมาแล้วล่าสุด
        const pastAppts = patientAppts.filter(q => {
          const d = new Date(q.date || q.rawDateTime || 0);
          return d.getTime() <= new Date().getTime();
        });
        if (pastAppts.length > 0) {
          pastAppts.sort((a,b) => new Date(b.date || b.rawDateTime || 0) - new Date(a.date || a.rawDateTime || 0));
          const latest = pastAppts[0];
          lastVisit = latest.date || latest.rawDateTime || latest.datetime;
        }
      }
    } catch(e) {}
  }

  if (lastVisit && lastVisit !== '-') {
    try {
      // พยายามแปลงเป็น format สวยๆ (23 มิ.ย. 2569)
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
        "backgroundColor": "#0284c7", // สีฟ้าคลินิก
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

// -------------------------------------------------------------
// ค้นหาและสร้างการ์ดนัดหมาย
// -------------------------------------------------------------
function getAppointmentsForDate(targetDate, labelText) {
  const targetDateStr = targetDate.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const queueData = getData('Queue').data || [];
  
  const appts = queueData.filter(q => {
    if (!q.date && !q.rawDateTime) return false;
    try {
      const d = new Date(q.date || q.rawDateTime);
      const dStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
      return dStr === targetDateStr;
    } catch(e) { return false; }
  });

  if (appts.length === 0) {
    return {
      "type": "flex",
      "altText": `ไม่มีนัดหมายสำหรับ${labelText}`,
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": `ไม่มีนัดหมายสำหรับ${labelText}ค่ะ`, "color": "#64748b" }
          ]
        }
      }
    };
  }

  const patientsData = getData('Patients').data || [];
  appts.forEach(appt => {
    const pId = appt.hn || appt.patientId;
    const p = patientsData.find(pat => pat.hn === pId || pat.id === pId);
    let idc = p && p.idCard ? String(p.idCard).replace(/\D/g, '') : "0000";
    if (idc.length < 4) idc = "0000";
    appt._idCard4 = idc.slice(-4);
  });
  return buildAppointmentCarousel(appts, `นัดหมาย${labelText}`);
}

function getAppointmentsForDay(dayOffset) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const dayText = dayOffset === 0 ? 'วันนี้' : 'พรุ่งนี้';
  return getAppointmentsForDate(targetDate, dayText);
}

function getAppointmentsForPatient(keyword) {
    const kw = keyword.toLowerCase();
    const queueData = getData('Queue').data || [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appts = queueData.filter(q => {
        const id = q.hn || q.patientId || '';
        if (!id.toLowerCase().includes(kw)) return false;
        if (!q.date && !q.rawDateTime) return false;
        
        try {
            const apptDate = new Date(q.date || q.rawDateTime);
            apptDate.setHours(0, 0, 0, 0);
            return apptDate.getTime() >= today.getTime();
        } catch(e) { return false; }
    });
  
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
            { "type": "text", "text": `ไม่พบนัดหมายของรหัส ${keyword}`, "color": "#64748b" }
          ]
        }
      }
    };
  }

  // เรียงลำดับคิวจากวันนี้ไปอนาคต (ใกล้สุดขึ้นก่อน)
  appts.sort((a,b) => new Date(a.date || a.rawDateTime || 0) - new Date(b.date || b.rawDateTime || 0));

  const patientsData = getData('Patients').data || [];
  appts.forEach(appt => {
    const pId = appt.hn || appt.patientId;
    const p = patientsData.find(pat => pat.hn === pId || pat.id === pId);
    let idc = p && p.idCard ? String(p.idCard).replace(/\D/g, '') : "0000";
    if (idc.length < 4) idc = "0000";
    appt._idCard4 = idc.slice(-4);
  });

  return buildAppointmentCarousel(appts.slice(0, 5), `ประวัตินัดหมาย ${keyword}`); // แสดงสูงสุด 5 คิว
}

function extractFirstPhone(phoneStr) {
  if (!phoneStr || phoneStr === "-") return "-";
  const str = String(phoneStr);
  const parts = str.split(/[,/]|หรือ|และ|and|&/);
  const firstPhone = parts[0].replace(/\D/g, "");
  return firstPhone.length >= 9 ? firstPhone : "-";
}

function buildAppointmentCarousel(appts, titleStr) {
  const mapStatusInfo = getGlobalStatusMapping();

  const bubbles = appts.map(appt => {
    let rawStatus = appt.status || appt.dealStatus || "pending";
    const statusInfo = mapStatusInfo(rawStatus);
    const statusText = statusInfo.label;
    const statusColor = getColorHex(statusInfo.colorKey);

    let dateStr = appt.rawDateTime || appt.datetime || appt.date || "-";
    let timeStr = appt.time || "-";
    let finalDateStr = "-";
    
    if (dateStr && dateStr !== "-") {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) { 
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            if (t !== "00:00") timeStr = t;
          }
          finalDateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
          let parts = dateStr.split(' ');
          if (parts.length >= 2) {
            finalDateStr = parts[0];
            timeStr = parts.slice(1).join(' ').replace('น.', '').trim();
          } else {
            finalDateStr = dateStr; 
          }
        }
      } catch(e) {
        finalDateStr = dateStr;
      }
    }

    if (timeStr && timeStr !== "-" && !timeStr.includes("น.")) {
      timeStr = `${timeStr} น.`;
    }

    const hn = appt.hn || appt.patientId || "-";
    const patientName = appt.patientName || appt.name || "ไม่ระบุชื่อ";
    const doctor = appt.doctor || appt.doctorName || appt.artist || "-";
    const reason = appt.reason || appt.category || "-";
    const phone = extractFirstPhone(appt.phone || "-"); 

    return {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": statusColor,
        "paddingAll": "md",
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
            "color": "#0ea5e9", // สีฟ้าเหมือนปุ่มพิมพ์
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "โทร",
              "uri": phone && phone !== '-' ? `tel:${phone}` : `tel:0000`
            }
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

function pushLineMessage(to, messages) {
  const lineToken = getLineToken();
  if (!lineToken || !to) return; 

  const url = "https://api.line.me/v2/bot/message/push";
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + lineToken
    },
    payload: JSON.stringify({
      to: to,
      messages: messages
    })
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch(e) {}
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

function getColorHex(colorKey) {
  const map = {
    'amber': '#f59e0b',
    'emerald': '#10b981',
    'rose': '#f43f5e',
    'sky': '#0ea5e9',
    'violet': '#8b5cf6',
    'indigo': '#6366f1',
    'teal': '#14b8a6',
    'fuchsia': '#d946ef',
    'slate': '#64748b'
  };
  return map[colorKey] || '#0ea5e9'; // default blue
}

function formatNotificationDate(dateStr, timeStr) {
  let finalDateStr = "-";
  let finalTimeStr = timeStr || "-";
  if (dateStr && dateStr !== "-") {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) { 
        if (dateStr.includes('T') || dateStr.includes(' ')) {
          const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          if (t !== "00:00") finalTimeStr = t;
        }
        finalDateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        let parts = dateStr.split(' ');
        if (parts.length >= 2) {
          finalDateStr = parts[0];
          finalTimeStr = parts.slice(1).join(' ').replace('น.', '').trim();
        } else {
          finalDateStr = dateStr; 
        }
      }
    } catch(e) {
      finalDateStr = dateStr;
    }
  }
  if (finalTimeStr && finalTimeStr !== "-" && !finalTimeStr.includes("น.")) {
    finalTimeStr = `${finalTimeStr} น.`;
  }
  return { date: finalDateStr, time: finalTimeStr };
}

function getGlobalStatusMapping() {
  let statuses = [];
  try {
    const settingsObj = getData('Settings').data || [];
    const statusesRecord = settingsObj.find(s => s.id === 'appointment_statuses');
    statuses = (statusesRecord && statusesRecord.values) ? statusesRecord.values : [];
  } catch(e) {}
  
  return (s) => {
    if (!s) return { label: 'รอยืนยัน', colorKey: 'amber' };
    
    if (s.startsWith('custom_')) {
       const idx = parseInt(s.split('_')[1], 10);
       if (!isNaN(idx) && statuses[idx]) {
          const st = statuses[idx];
          return { label: st.label || s, colorKey: st.color || 'sky' };
       }
    }
    const matched = statuses.find(st => st.label === s || st.value === s);
    if (matched) return { label: matched.label, colorKey: matched.color || 'sky' };
    
    if (s === 'pending') return { label: 'รอยืนยัน', colorKey: 'amber' };
    if (s === 'confirmed') return { label: 'ยืนยันแล้ว', colorKey: 'emerald' };
    if (s === 'cancelled') return { label: 'ยกเลิก', colorKey: 'rose' };
    if (s === 'postponed' || s.includes('เลื่อน')) return { label: 'เลื่อนนัด', colorKey: 'violet' };
    
    if (s.includes('สำเร็จ') || s.includes('เสร็จ') || s.includes('ชำระเงิน')) return { label: s, colorKey: 'emerald' };
    if (s.includes('ตรวจ')) return { label: s, colorKey: 'sky' };
    if (s.includes('รอคิว')) return { label: s, colorKey: 'amber' };

    return { label: s, colorKey: 'slate' };
  };
}

function sendQueueNotification(groupId, payload, idToSave, titleText, headerColor, noteText = "", oldDateTimeStr = null, statusColor = null) {
  const finalStatusColor = statusColor || headerColor;
  
  const { date: finalDateStr, time: timeStr } = formatNotificationDate(
    payload.rawDateTime || payload.datetime || payload.date || "-", 
    payload.time || "-"
  );

  const hn = payload.hn || payload.patientId || "-";
  const patientName = payload.patientName || payload.name || "ไม่ระบุชื่อ";
  const doctor = payload.doctor || payload.artist || "-";
  const reason = payload.reason || payload.category || "-";
  const phone = extractFirstPhone(payload.phone || "-");

  const contentsArray = [];
  
  if (oldDateTimeStr) {
    contentsArray.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "จากเดิม", "size": "sm", "color": "#ef4444", "flex": 1, "weight": "bold" },
        { "type": "text", "text": oldDateTimeStr, "size": "sm", "color": "#ef4444", "flex": 2, "weight": "bold", "wrap": true }
      ]
    });
    contentsArray.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "นัดใหม่", "size": "sm", "color": "#10b981", "flex": 1, "weight": "bold" },
        { "type": "text", "text": finalDateStr, "size": "sm", "color": "#10b981", "flex": 2, "weight": "bold" }
      ]
    });
    contentsArray.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "เวลา", "size": "sm", "color": "#10b981", "flex": 1, "weight": "bold" },
        { "type": "text", "text": timeStr, "size": "sm", "color": "#10b981", "flex": 2, "weight": "bold" }
      ]
    });
  } else {
    contentsArray.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "วันที่", "size": "sm", "color": "#64748b", "flex": 1 },
        { "type": "text", "text": finalDateStr, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
      ]
    });
    contentsArray.push({
      "type": "box",
      "layout": "horizontal",
      "contents": [
        { "type": "text", "text": "เวลา", "size": "sm", "color": "#64748b", "flex": 1 },
        { "type": "text", "text": timeStr, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
      ]
    });
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
        { "type": "text", "text": "สถานะ", "size": "sm", "color": finalStatusColor, "flex": 1, "weight": "bold" },
        { "type": "text", "text": noteText, "size": "sm", "color": finalStatusColor, "flex": 2, "wrap": true, "weight": "bold" }
      ]
    });
  }

  const bubble = {
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
            "uri": phone && phone !== '-' ? `tel:${phone}` : `tel:0000`
          }
        }
      ]
    }
  };

  const flexMsg = {
    "type": "flex",
    "altText": `${titleText}: ${patientName}`,
    "contents": bubble
  };
  
  pushLineMessage(groupId, [flexMsg]);
}

function saveData(sheetName, payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  const idToSave = payload.id || payload.hn; 
  if (!idToSave) return { status: 'error', message: 'ID is required' };

  payload.updatedAt = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToSave) {
      let oldPayload = {};
      if (sheetName === 'Queue') {
        try { oldPayload = JSON.parse(data[i][1]); } catch(e) {}
      }

      sheet.getRange(i + 1, 2).setValue(JSON.stringify(payload)); 

      if (sheetName === 'Queue') {
        try {
          const groupId = getLineGroupId();
          if (groupId && Object.keys(oldPayload).length > 0) {
             const oldDate = oldPayload.rawDateTime || oldPayload.datetime || oldPayload.date || "";
             const newDate = payload.rawDateTime || payload.datetime || payload.date || "";
             const oldTime = oldPayload.time || "";
             const newTime = payload.time || "";
             const oldStatus = oldPayload.status || oldPayload.dealStatus || "";
             const newStatus = payload.status || payload.dealStatus || "";

             let titleText = "";
             let headerColor = "";
             let noteText = "";

             const statusChanged = oldStatus !== newStatus;
             const timeChanged = oldDate !== newDate || oldTime !== newTime;

             if (statusChanged || timeChanged) {
                 let oldDateTimeStr = null;
                 const mapStatusInfo = getGlobalStatusMapping();
                 const newStatusInfo = mapStatusInfo(newStatus);
                 noteText = newStatusInfo.label; 
                 const actualStatusColor = getColorHex(newStatusInfo.colorKey);

                 if (statusChanged) {
                    headerColor = actualStatusColor;
                    titleText = `อัปเดตสถานะ: ${noteText}`;
                 } else { 
                    headerColor = "#3b82f6"; // ฟ้า
                    titleText = "🔄 เปลี่ยนแปลงวัน/เวลานัด";
                 }

                 if (timeChanged) {
                    const oldFmt = formatNotificationDate(oldDate, oldTime);
                    oldDateTimeStr = `${oldFmt.date} ${oldFmt.time}`;
                 }

                 sendQueueNotification(groupId, payload, idToSave, titleText, headerColor, noteText, oldDateTimeStr, actualStatusColor);
             }
          }
        } catch(e) {}
      }

      return { status: 'success', message: 'Data updated successfully', data: payload };
    }
  }

  payload.createdAt = new Date().toISOString();
  sheet.appendRow([idToSave, JSON.stringify(payload)]);

  if (sheetName === 'Queue') {
    try {
      const groupId = getLineGroupId();
      if (groupId) {
        sendQueueNotification(groupId, payload, idToSave, "🚨 นัดหมายใหม่เข้าสู่ระบบ", "#10b981", "");
      }
    } catch(e) {}
  }

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

// =========================================================================================
// 1. นำโค้ด 2 ฟังก์ชันนี้ (handleForgotPassword และ handleConfirmResetPassword) ไปวางต่อท้ายไฟล์ .gs ใน Apps Script ของคุณ
// =========================================================================================

function handleForgotPassword(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Staff');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sheet Staff not found'})).setMimeType(ContentService.MimeType.JSON);
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ไม่พบข้อมูลในระบบ'})).setMimeType(ContentService.MimeType.JSON);
    
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    var targetUsername = String(payload.username).trim().toLowerCase();
    
    var userRow = -1;
    var userObj = null;
    
    for (var i = 0; i < values.length; i++) {
      try {
        var obj = JSON.parse(values[i][1]);
        var rowUsername = String(obj.username || '').trim().toLowerCase();
        var rowEmail = String(obj.email || '').trim().toLowerCase();
        
        if ((rowUsername && rowUsername === targetUsername) || (rowEmail && rowEmail === targetUsername)) {
          userRow = i + 2;
          userObj = obj;
          break;
        }
      } catch(e) {}
    }
    
    if (userRow === -1 || !userObj) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ไม่พบผู้ใช้งานหรืออีเมลนี้ในระบบ'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!userObj.email) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'บัญชีนี้ยังไม่ได้ลงทะเบียนอีเมลไว้ ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาติดต่อผู้ดูแลระบบ'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var cache = CacheService.getScriptCache();
    var oldTokenKey = cache.get('USER_RESET_' + userRow);
    if (oldTokenKey) {
      cache.remove(oldTokenKey);
    }
    
    var token = Utilities.getUuid();
    var newTokenKey = 'RESET_' + token;
    cache.put(newTokenKey, userRow.toString(), 900); // 15 mins
    cache.put('USER_RESET_' + userRow, newTokenKey, 900);
    
    var resetUrl = payload.resetUrl || 'http://localhost:5173';
    var link = resetUrl + '?reset_token=' + token;
    var userName = userObj.name || 'ผู้ใช้งาน';
    
    var logoUrl = "https://cdn-icons-png.flaticon.com/512/2966/2966327.png"; // Default
    try {
      var branchSheet = ss.getSheetByName('Branches');
      if (branchSheet) {
        var branchLastRow = branchSheet.getLastRow();
        if (branchLastRow > 1) {
          var branchValues = branchSheet.getRange(2, 1, branchLastRow - 1, 2).getValues();
          for (var j = 0; j < branchValues.length; j++) {
            try {
              var bObj = JSON.parse(branchValues[j][1]);
              if (bObj.id === 'b1' && bObj.logo) {
                logoUrl = bObj.logo;
                break;
              }
            } catch(ex) {}
          }
        }
      }
    } catch(e) {}
    
    var htmlBody = `
      <div style="font-family: 'Kanit', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: white; padding: 30px 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- ใช้ลิงก์รูปภาพออนไลน์แทน cid:logo -->
          <!-- หากต้องการใช้โลโก้ตัวเอง ให้อัปโหลดรูปขึ้นเว็บฝากรูป (เช่น Imgur) หรือ Google Drive แบบ Public แล้วเอาลิงก์ตรงมาวางแทนที่ลิงก์ด้านล่างนี้ครับ -->
          <img src="${logoUrl}" alt="Anping Clinic Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid #e0f2fe; margin-bottom: 15px;" />
          <h1 style="color: #0284c7; margin: 0; font-size: 26px; font-weight: bold;">อันผิงคลินิก (Anping Clinic)</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 15px;">ระบบจัดการคลินิกอัจฉริยะ</p>
        </div>
        
        <div style="background-color: white; padding: 35px 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">คำขอรีเซ็ตรหัสผ่าน 🔑</h2>
          <p style="color: #334155; line-height: 1.7; font-size: 15px;">สวัสดีคุณ <strong>${userName}</strong>,</p>
          <p style="color: #334155; line-height: 1.7; font-size: 15px;">เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีผู้ใช้งาน <strong>${userObj.username}</strong> ของคุณ</p>
          <p style="color: #334155; line-height: 1.7; font-size: 15px;">หากคุณเป็นผู้ดำเนินการ กรุณาคลิกที่ปุ่มด้านล่างเพื่อตั้งค่ารหัสผ่านใหม่ของคุณครับ</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${link}" style="background-color: #0ea5e9; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(14, 165, 233, 0.39);">ตั้งค่ารหัสผ่านใหม่</a>
          </div>
          
          <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; padding: 12px; border-radius: 8px; margin-bottom: 25px;">
            <p style="color: #e11d48; font-size: 13px; text-align: center; margin: 0; font-weight: 500;">⚠️ ลิงก์นี้จะหมดอายุภายใน 15 นาที เพื่อความปลอดภัย</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6;">หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่านนี้ โปรดละเว้นอีเมลฉบับนี้ รหัสผ่านเดิมของคุณจะยังคงใช้งานได้ตามปกติ หรือคุณสามารถติดต่อผู้ดูแลระบบได้ทันที</p>
          </div>
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: userObj.email,
      subject: "คำขอรีเซ็ตรหัสผ่าน - อันผิงคลินิก (Anping Clinic)",
      body: "สวัสดีคุณ " + userName + "\n\nเราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีผู้ใช้งานของคุณ หากคุณเป็นผู้ดำเนินการ กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งค่ารหัสผ่านใหม่:\n" + link + "\n\nลิงก์นี้จะหมดอายุภายใน 15 นาทีเพื่อความปลอดภัย",
      htmlBody: htmlBody
    });
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Sent email'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleConfirmResetPassword(payload) {
  try {
    var token = payload.token;
    var newPassword = payload.newPassword;
    
    if (!token || !newPassword) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ข้อมูลไม่ครบถ้วน'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var cache = CacheService.getScriptCache();
    var rowStr = cache.get('RESET_' + token);
    
    if (!rowStr) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var rowNum = parseInt(rowStr);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Staff');
    
    var jsonStr = sheet.getRange(rowNum, 2).getValue();
    var obj = JSON.parse(jsonStr);
    obj.password = newPassword;
    sheet.getRange(rowNum, 2).setValue(JSON.stringify(obj));
    
    cache.remove('RESET_' + token);
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'เปลี่ยนรหัสผ่านสำเร็จ'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. ไปที่ฟังก์ชัน doPost(e) ที่มีอยู่เดิมของคุณ แล้วเพิ่มเงื่อนไข IF สองบรรทัดนี้เข้าไปในนั้น:
/*

  if (action === 'FORGOT_PASSWORD') {
    return handleForgotPassword(payload);
  }
  
  if (action === 'CONFIRM_RESET_PASSWORD') {
    return handleConfirmResetPassword(payload);
  }

*/
// =========================================================================================

