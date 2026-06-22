const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'หลังบ้าน v.5 LINE.js');
let content = fs.readFileSync(filePath, 'utf8');

// Update Patient Card URI
content = content.replace(/\\?print_opd=\\$\\{hn\\}/g, '?print_opd_hn=${hn}');

// Add Print button to Appointment Flex
const apptButtonToReplace = `"action": {
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
          }`;

const newApptButtons = `"action": {
              "type": "message",
              "label": "ดูประวัติ",
              "text": \`ค้นหา \${hn}\`
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
                  "uri": \`\${WEBAPP_URL}?print_opd_hn=\${hn}&print_opd_date=\${appt.date || appt.rawDateTime || appt.datetime || ''}\`
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
                  "uri": phone && phone !== '-' ? \`tel:\${phone}\` : \`tel:0000\`
                }
              }
            ]
          }`;

if (content.includes(apptButtonToReplace)) {
  content = content.replace(apptButtonToReplace, newApptButtons);
  fs.writeFileSync(filePath, content);
  console.log('Added print button to Appointment Flex');
} else {
  console.log('Could not find the target buttons to replace in V5');
}
