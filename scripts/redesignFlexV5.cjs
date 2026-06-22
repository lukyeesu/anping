const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const filePath = path.join(projectDir, 'หลังบ้าน v.5 LINE.js');
let v5Content = fs.readFileSync(filePath, 'utf8');

// Replacement for buildPatientCardFlex
const newPatientFlex = `function buildPatientCardFlex(patient) {
  const fullName = \`\${patient.firstName || ''} \${patient.lastName || ''}\`.trim() || 'ไม่ระบุชื่อ';
  const hn = patient.hn || patient.id || '-';
  const phone = patient.phone || '-';
  const age = patient.age ? \`\${patient.age} ปี\` : '-';
  const gender = patient.gender || '-';
  const lastVisit = patient.lastVisit || '-';

  return {
    "type": "flex",
    "altText": \`ระเบียนประวัติ: \${fullName}\`,
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
                  { "type": "text", "text": \`\${age} / \${gender}\`, "size": "sm", "color": "#334155", "flex": 2 }
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
              "text": \`ดูนัดหมาย \${hn}\`
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
              "uri": \`\${WEBAPP_URL}?print_opd=\${hn}\`
            }
          }
        ]
      }
    }
  };
}`;

// Replacement for buildAppointmentCarousel
const newAppointmentFlex = `function buildAppointmentCarousel(appts, titleStr) {
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
              "text": \`ค้นหา \${hn}\`
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
              "uri": phone && phone !== '-' ? \`tel:\${phone}\` : \`tel:0000\`
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
}`;

const pStart = v5Content.indexOf('function buildPatientCardFlex');
const pEnd = v5Content.indexOf('function getAppointmentsForDay');
const firstPart = v5Content.substring(0, pStart);

const cStart = v5Content.indexOf('function buildAppointmentCarousel');
const cEnd = v5Content.indexOf('function replyLineMessage');

const middlePart = v5Content.substring(pEnd, cStart);
const lastPart = v5Content.substring(cEnd);

v5Content = firstPart + newPatientFlex + '\n\n// -------------------------------------------------------------\n// ค้นหาและสร้างการ์ดนัดหมาย\n// -------------------------------------------------------------\n' + middlePart + newAppointmentFlex + '\n\n' + lastPart;

fs.writeFileSync(filePath, v5Content);
console.log('Applied flex layout redesign and fixes to v.5 LINE.js');
