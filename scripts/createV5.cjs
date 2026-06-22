const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const fileV4 = fs.readFileSync(path.join(projectDir, 'หลังบ้าน v.4 LINE.js'), 'utf8');

const splitIndex = fileV4.indexOf('// ==========================================');
// Wait, there are multiple separators.
// Let's find the one before getLineToken()
const targetMarker = '// ⚠️ ดึง Token อัตโนมัติจากหน้าตั้งค่าของเว็บแอป';
const targetIndex = fileV4.indexOf(targetMarker);
const originalTopHalf = fileV4.substring(0, targetIndex);

const newLineLogic = `// ⚠️ ดึง Token อัตโนมัติจากหน้าตั้งค่าของเว็บแอป (ชีต Settings)
function getLineToken() {
  const settings = getData('Settings').data || [];
  const tokenRecord = settings.find(s => s.id === 'integration_tokens');
  if (tokenRecord && tokenRecord.values && tokenRecord.values.line) {
    return tokenRecord.values.line;
  }
  return ""; 
}

const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/2966/2966327.png"; // ⚠️ เปลี่ยนเป็น URL โลโก้ของคลินิกได้
const WEBAPP_URL = "https://anping-clinic.vercel.app"; // ⚠️ เปลี่ยนเป็น URL หน้าเว็บจริง

function handleLineWebhook(requestData) {
  try {
    const event = requestData.events[0];
    if (event.type === 'message' && event.message.type === 'text') {
      let userMessage = event.message.text.trim();
      const replyToken = event.replyToken;

      // 1. เช็คคำสั่ง "นัดหมายวันนี้" หรือ "นัดหมายพรุ่งนี้"
      if (userMessage.includes('นัดหมายวันนี้')) {
        const flexMsg = getAppointmentsForDay(0);
        replyLineMessage(replyToken, [flexMsg]);
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }
      if (userMessage.includes('นัดหมายพรุ่งนี้')) {
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
      const keyword = userMessage.replace(/^(หา|ค้นหา|เช็ค|ข้อมูล)\\s*/, '').trim();
      if (keyword.length > 0) {
        const flexMessage = searchPatientFlex(keyword);
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
  const fullName = \`\${patient.firstName || ''} \${patient.lastName || ''}\`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  const age = patient.age ? \`\${patient.age} ปี\` : '-';
  const gender = patient.gender || '-';

  return {
    "type": "flex",
    "altText": \`ระเบียนประวัติ: \${fullName}\`,
    "contents": {
      "type": "bubble",
      "size": "mega",
      "header": {
        "type": "box",
        "layout": "horizontal",
        "backgroundColor": "#f8fafc",
        "alignItems": "center",
        "contents": [
          {
            "type": "image",
            "url": LOGO_URL,
            "size": "xs",
            "flex": 0,
            "margin": "none"
          },
          {
            "type": "text",
            "text": "Anping Clinic",
            "weight": "bold",
            "color": "#0284c7",
            "size": "sm",
            "flex": 1,
            "margin": "md"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "20px",
        "contents": [
          {
            "type": "text",
            "text": "ระเบียนประวัติคนไข้",
            "weight": "bold",
            "color": "#64748b",
            "size": "xs"
          },
          {
            "type": "text",
            "text": fullName,
            "weight": "bold",
            "size": "xl",
            "margin": "sm",
            "wrap": true,
            "color": "#0f172a"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "lg",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "รหัส HN", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": hn, "size": "sm", "color": "#334155", "flex": 2, "weight": "bold" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": phone, "size": "sm", "color": "#334155", "flex": 2 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "อายุ/เพศ", "size": "sm", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": \`\${age} / \${gender}\`, "size": "sm", "color": "#334155", "flex": 2 }
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
            "style": "primary",
            "color": "#0ea5e9",
            "height": "sm",
            "action": {
              "type": "message",
              "label": "ดูนัดหมายของคนไข้",
              "text": \`ดูนัดหมาย \${hn}\`
            }
          },
          {
            "type": "button",
            "style": "secondary",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "พิมพ์เอกสาร / เปิดในเว็บ",
              "uri": WEBAPP_URL
            }
          }
        ]
      }
    }
  };
}

// -------------------------------------------------------------
// ค้นหาและสร้างการ์ดนัดหมาย (แบบ Carousel ถ้ามีหลายคิว)
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
      "altText": \`ไม่มีนัดหมาย\${dayText}\`,
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": \`ไม่มีนัดหมายสำหรับ\${dayText}ค่ะ\`, "color": "#64748b" }
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
            { "type": "text", "text": \`ไม่พบนัดหมายของรหัส \${hn}\`, "color": "#64748b" }
          ]
        }
      }
    };
  }

  // เรียงลำดับคิวใหม่สุดขึ้นก่อน
  appts.sort((a,b) => new Date(b.date || b.rawDateTime || 0) - new Date(a.date || a.rawDateTime || 0));

  return buildAppointmentCarousel(appts.slice(0, 5), \`ประวัตินัดหมาย \${hn}\`); // แสดงสูงสุด 5 คิว
}

function buildAppointmentCarousel(appts, titleStr) {
  const bubbles = appts.map(appt => {
    let statusColor = "#94a3b8";
    let statusText = appt.status || "รอคิว";
    if (statusText === 'กำลังตรวจ') statusColor = "#0284c7";
    else if (statusText === 'เสร็จสิ้น' || statusText === 'รับยา/ชำระเงิน') statusColor = "#16a34a";
    else if (statusText === 'รอคิว') statusColor = "#f59e0b";
    else if (statusText === 'ยกเลิก') statusColor = "#ef4444";

    let dateStr = appt.date || appt.rawDateTime || "-";
    if (dateStr && dateStr !== "-") {
      try {
        const d = new Date(dateStr);
        dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch(e) {}
    }

    return {
      "type": "bubble",
      "size": "micro",
      "header": {
        "type": "box",
        "layout": "vertical",
        "backgroundColor": statusColor,
        "paddingAll": "12px",
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
        "paddingAll": "16px",
        "contents": [
          {
            "type": "text",
            "text": appt.patientName || "ไม่ระบุชื่อ",
            "weight": "bold",
            "size": "md",
            "color": "#0f172a",
            "wrap": true
          },
          {
            "type": "text",
            "text": appt.patientId || "-",
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
                  { "type": "text", "text": dateStr, "size": "xs", "color": "#334155", "flex": 2, "weight": "bold" }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "เวลา", "size": "xs", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": appt.time || "-", "size": "xs", "color": "#334155", "flex": 2 }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  { "type": "text", "text": "แพทย์", "size": "xs", "color": "#64748b", "flex": 1 },
                  { "type": "text", "text": appt.doctorName || "-", "size": "xs", "color": "#334155", "flex": 2, "wrap": true }
                ]
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
`;

const v5Content = originalTopHalf + newLineLogic;
fs.writeFileSync(path.join(projectDir, 'หลังบ้าน v.5 LINE.js'), v5Content);
console.log('Created backend v.5 LINE successfully!');
