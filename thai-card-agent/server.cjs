const ThaiCardReaderPackage = require('thai-smartcard-reader');
const WebSocket = require('ws');

// ระบบค้นหา Class อัตโนมัติ (Bulletproof Extraction)
// เพื่อแก้ปัญหา TypeError: is not a constructor ที่เกิดจากโครงสร้างการ Export ของไลบรารี
let ReaderClass;
let EVENTS;
let MODE;

if (ThaiCardReaderPackage.ThaiCardReader && typeof ThaiCardReaderPackage.ThaiCardReader === 'function') {
  // รองรับรูปแบบการ Export ปกติ
  ReaderClass = ThaiCardReaderPackage.ThaiCardReader;
  EVENTS = ThaiCardReaderPackage.EVENTS;
  MODE = ThaiCardReaderPackage.MODE;
} else if (ThaiCardReaderPackage.default && typeof ThaiCardReaderPackage.default.ThaiCardReader === 'function') {
  // รองรับรูปแบบ Export ที่ซ้อนอยู่ใน .default
  ReaderClass = ThaiCardReaderPackage.default.ThaiCardReader;
  EVENTS = ThaiCardReaderPackage.default.EVENTS;
  MODE = ThaiCardReaderPackage.default.MODE;
} else if (ThaiCardReaderPackage.default && typeof ThaiCardReaderPackage.default === 'function') {
  // รองรับรูปแบบที่ .default คือ Class โดยตรง
  ReaderClass = ThaiCardReaderPackage.default;
  EVENTS = ThaiCardReaderPackage.EVENTS || {};
  MODE = ThaiCardReaderPackage.MODE || {};
} else if (typeof ThaiCardReaderPackage === 'function') {
  // รองรับรูปแบบที่ตัว Module คือ Class โดยตรง
  ReaderClass = ThaiCardReaderPackage;
  EVENTS = ThaiCardReaderPackage.EVENTS || {};
  MODE = ThaiCardReaderPackage.MODE || {};
}

// เช็คความชัวร์ว่าพบ Constructor จริงๆ
if (typeof ReaderClass !== 'function') {
  console.error('❌ ดึงข้อมูลไลบรารีไม่สำเร็จ โครงสร้างไฟล์ไม่ถูกต้อง:', Object.keys(ThaiCardReaderPackage));
  process.exit(1);
}

// กำหนดค่า Default กรณีหาค่าคงที่ไม่เจอ
EVENTS = EVENTS || {
  READING_INIT: 'reading-init',
  READING_COMPLETE: 'reading-complete',
  CARD_REMOVED: 'card-removed',
  ERROR: 'error'
};
MODE = MODE || {
  PERSONAL_PHOTO: 'PERSONAL_PHOTO'
};

// สร้าง WebSocket Server ที่ Port 8080
const wss = new WebSocket.Server({ port: 8080 });

// เริ่มต้นใช้งานเครื่องอ่านบัตร
const reader = new ReaderClass();
reader.readMode = MODE.PERSONAL_PHOTO; // ดึงข้อมูลพื้นฐานพร้อมรูปภาพ
reader.autoRecreate = true;

wss.on('connection', (ws) => {
  console.log('✅ Web App connected to Agent!');
  ws.send(JSON.stringify({ event: 'connected' }));

  // เมื่อเริ่มอ่านบัตร
  reader.on(EVENTS.READING_INIT, () => {
    ws.send(JSON.stringify({ event: 'card-inserted' }));
  });

  // เมื่ออ่านบัตรเสร็จสิ้น
  reader.on(EVENTS.READING_COMPLETE, (obj) => {
    console.log('✅ Reading Complete:', obj.citizenId);
    
    // แปลงรูปแบบ Data ให้ตรงกับที่ WebApp ต้องการ
    const data = {
      citizenId: obj.citizenId,
      titleTh: obj.titleTH,
      firstNameTh: obj.firstNameTH,
      lastNameTh: obj.lastNameTH,
      titleEn: obj.titleEN,
      firstNameEn: obj.firstNameEN,
      lastNameEn: obj.lastNameEN,
      dobTh: obj.birthdayTH,
      dobEn: obj.birthdayEN,
      gender: obj.gender,
      address: obj.address,
      issueDateTh: obj.issueDateTH,
      expireDateTh: obj.expireDateTH,
      photoBase64: obj.photo ? `data:image/jpeg;base64,${obj.photo}` : null
    };

    ws.send(JSON.stringify({ event: 'reading-complete', data }));
  });

  // เมื่อดึงบัตรออก
  reader.on(EVENTS.CARD_REMOVED, () => {
    console.log('⚠️ Card Removed');
    ws.send(JSON.stringify({ event: 'card-removed' }));
  });

  // หากเกิด Error
  reader.on(EVENTS.ERROR, (err) => {
    console.error('❌ Error:', err);
    ws.send(JSON.stringify({ event: 'error', message: "อ่านบัตรไม่สำเร็จ หรือไม่ได้เสียบเครื่องอ่าน" }));
  });
});

console.log('🚀 Local Agent is running on ws://localhost:8080');