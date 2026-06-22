const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const filePath = path.join(projectDir, 'หลังบ้าน v.5 LINE.js');
let v5Content = fs.readFileSync(filePath, 'utf8');

// Replace the old buildAppointmentCarousel with the corrected one
const newCarouselFunc = `function buildAppointmentCarousel(appts, titleStr) {
  const bubbles = appts.map(appt => {
    let statusColor = "#94a3b8";
    let statusText = appt.status || appt.dealStatus || "รอคิว";
    if (statusText === 'กำลังตรวจ') statusColor = "#0284c7";
    else if (statusText === 'เสร็จสิ้น' || statusText === 'รับยา/ชำระเงิน' || statusText === 'สำเร็จ') statusColor = "#16a34a";
    else if (statusText === 'รอคิว' || statusText === 'นัดหมาย') statusColor = "#f59e0b";
    else if (statusText === 'ยกเลิก') statusColor = "#ef4444";

    let dateStr = appt.datetime || appt.date || appt.rawDateTime || "-";
    let timeStr = appt.time || "-";
    
    if (dateStr && dateStr !== "-") {
      try {
        const d = new Date(dateStr);
        // Extract time if datetime includes time
        if (dateStr.includes('T') || dateStr.includes(' ')) {
          const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          if (t !== "00:00") timeStr = t;
        }
        dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch(e) {}
    }

    const hn = appt.hn || appt.patientId || "-";
    const patientName = appt.patientName || appt.name || "ไม่ระบุชื่อ";
    const doctor = appt.doctor || appt.doctorName || appt.artist || "-";
    const reason = appt.reason || appt.category || "-";
    const phone = appt.phone || "-"; // โทรศัพท์คนไข้ (ถ้ามีในคิว)

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
                  { "type": "text", "text": dateStr, "size": "xs", "color": "#334155", "flex": 2, "weight": "bold" }
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
              "uri": phone !== '-' ? \`tel:\${phone}\` : \`tel:0000\`
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

const startIndex = v5Content.indexOf('function buildAppointmentCarousel');
const endIndex = v5Content.indexOf('function replyLineMessage');

const firstPart = v5Content.substring(0, startIndex);
const lastPart = v5Content.substring(endIndex);

v5Content = firstPart + newCarouselFunc + '\n\n' + lastPart;

fs.writeFileSync(filePath, v5Content);
console.log('Fixed appointment fields in v.5 LINE.js');
