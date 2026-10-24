const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ThaiCardReader, EVENTS, MODE } = require('@privageapp/thai-national-id-reader');

const mapReligion = (raw) => {
    if (!raw) return '';
    const str = String(raw).trim();
    if (str === '01' || str === '1' || str.includes('พุทธ')) return 'พุทธ';
    if (str === '02' || str === '2' || str.includes('อิสลาม')) return 'อิสลาม';
    if (str === '03' || str === '3' || str.includes('คริสต์')) return 'คริสต์';
    if (str === '04' || str === '4' || str.includes('ฮินดู') || str.includes('พราหมณ์')) return 'พราหมณ์-ฮินดู';
    if (str === '05' || str === '5' || str.includes('ซิกข์')) return 'ซิกข์';
    if (str === '00' || str === '99' || str.includes('ไม่ระบุ') || str.includes('ไม่นับถือ')) return 'ไม่ระบุ';
    return str.replace(/^ศาสนา\s*/, '').trim();
};

const app = express();
app.use(cors()); 
app.use(express.json());

process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});

let currentCardData = null;
let isReading = false;
let isDeviceConnected = false;
let isCardInserted = false;

console.log('⏳ กำลังเชื่อมต่อกับเครื่องอ่านบัตร (Alcorlink)...');

const reader = new ThaiCardReader();
reader.readMode = MODE.PERSONAL; // อ่านเฉพาะข้อมูลตัวอักษรเพื่อความรวดเร็ว
reader.autoRecreate = true;      // เชื่อมต่อใหม่เองถ้าเครื่องหลุด

// เริ่มต้นรับฟังเหตุการณ์จากเครื่องอ่านบัตร
try {
    reader.startListener();
} catch (err) {
    console.warn('⚠️ ไม่สามารถเริ่ม reader listener ได้ (อาจมีโปรแกรมอื่นอย่าง SIAM-ID ใช้งานอยู่):', err.message);
}

// เมื่อพบเครื่องอ่านบัตร
reader.on(EVENTS.DEVICE_CONNECTED, () => {
    console.log('✅ พบเครื่องอ่านบัตรแล้ว! (กรุณาเสียบบัตรประชาชน)');
    isDeviceConnected = true;
});

// เมื่อเครื่องอ่านถูกดึงออก
reader.on(EVENTS.DEVICE_DISCONNECTED, () => {
    console.log('❌ เครื่องอ่านบัตรถูกดึงออก');
    isDeviceConnected = false;
    currentCardData = null;
    isCardInserted = false;
});

// เมื่อมีการเสียบบัตร
reader.on(EVENTS.CARD_INSERTED, () => {
    console.log(`\n💳 กำลังดึงข้อมูลจากบัตร...`);
    isReading = true;
    isCardInserted = true;
    currentCardData = null; // ล้างข้อมูลบัตรเก่าก่อนอ่านใหม่
});

// เมื่ออ่านข้อมูลเสร็จสมบูรณ์
reader.on(EVENTS.READING_COMPLETE, (person) => {
    currentCardData = person;
    console.log(`✅ อ่านข้อมูลสำเร็จ: ${person.titleTH}${person.firstNameTH} ${person.lastNameTH}`);
    isReading = false;
    isCardInserted = true;
});

// เมื่ออ่านข้อมูลล้มเหลว (เช่น ดึงบัตรออกก่อน)
reader.on(EVENTS.READING_FAIL, (err) => {
    console.error('❌ อ่านข้อมูลไม่สำเร็จ:', err);
    isReading = false;
    currentCardData = null;
    isCardInserted = false;
});

// เมื่อมีการดึงบัตรออก
reader.on(EVENTS.CARD_REMOVED, () => {
    console.log('👋 ดึงบัตรออกแล้ว (รอคิวต่อไป...)');
    currentCardData = null;
    isCardInserted = false;
});

// ฟังก์ชันดึงข้อมูลจากโปรแกรม SIAM-ID (เฉพาะกรณีที่เพิ่งมีการเขียนไฟล์ และบัตรยังเสียบอยู่)
function getSiamIdData() {
    try {
        const siamIdPath = path.join(os.homedir(), 'Downloads', 'SIAM-ID', 'Data.txt');
        if (fs.existsSync(siamIdPath)) {
            const stat = fs.statSync(siamIdPath);
            const ageMs = Date.now() - stat.mtimeMs;
            // ถ้าไฟล์เก่าเกิน 30 วินาที ไม่ถือเป็นข้อมูลสดจากการเสียบบัตรใหม่
            if (ageMs > 30000) {
                return null;
            }

            const content = fs.readFileSync(siamIdPath, 'utf8');
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
                const parseCSV = (str) => {
                    const arr = [];
                    let quote = false;
                    let col = '';
                    for (let i = 0; i < str.length; i++) {
                        const c = str[i];
                        if (c === '"') { quote = !quote; }
                        else if (c === ',' && !quote) { arr.push(col.trim()); col = ''; }
                        else { col += c; }
                    }
                    arr.push(col.trim());
                    return arr;
                };
                const values = parseCSV(lines[1]);
                if (values.length >= 22) {
                    const cid = values[2].replace(/"/g, '').trim();
                    const prefix = values[3] || '';
                    const fname = values[4] || '';
                    const lname = values[5] || '';
                    const dob = values[9] || '';
                    const gender = values[10] || '';
                    const religion = mapReligion(values[11] || '');
                    const houseNo = values[14] || '';
                    let moo = (values[15] || '').replace(/[^0-9]/g, '').trim();
                    let road = [values[16], values[17], values[18]].filter(Boolean).join(' ').trim();
                    let subDistrict = (values[19] || '').replace(/^(?:ตำบล|แขวง)\s*/, '').trim();
                    let district = (values[20] || '').replace(/^(?:อำเภอ|เขต)\s*/, '').trim();
                    let province = (values[21] || '').replace(/^(?:จังหวัด|จ\.)\s*/, '').trim();
                    let photoPath = values[31] || '';
                    let photoBase64 = null;
                    if (photoPath && fs.existsSync(photoPath)) {
                        photoBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(photoPath).toString('base64');
                    }

                    const firstChar = cid ? cid[0] : '';
                    const isThaiCitizen = ['1', '2', '3', '4', '5', '8'].includes(firstChar);

                    return {
                        citizenId: cid,
                        titleTH: prefix,
                        firstNameTH: fname,
                        lastNameTH: lname,
                        birthday: dob,
                        gender: gender === 'ชาย' ? '1' : (gender === 'หญิง' ? '2' : gender),
                        religion: religion,
                        nationality: isThaiCitizen ? 'ไทย' : '',
                        ethnicity: isThaiCitizen ? 'ไทย' : '',
                        address: houseNo,
                        moo: moo,
                        road: road,
                        subDistrict: subDistrict,
                        district: district,
                        province: province,
                        photo: photoBase64
                    };
                }
            }
        }
    } catch (e) {
        console.error('Error reading SIAM-ID data:', e);
    }
    return null;
}

// ----------------------------------------------------
// API ตรวจสอบสถานะ (Health Check / Status)
// ----------------------------------------------------
app.get('/api/status', (req, res) => {
    const hasDevice = isDeviceConnected || (reader.readers && reader.readers.length > 0) || Boolean(currentCardData);
    res.json({
        status: 'ok',
        server: 'Anping Smart Card Agent (PC)',
        deviceConnected: hasDevice,
        hasCard: isCardInserted && Boolean(currentCardData),
        readerName: 'USB Smart Card Reader'
    });
});

// ----------------------------------------------------
// API สำหรับให้ React ดึงข้อมูลไปใส่ในฟอร์ม
// ----------------------------------------------------
app.get('/api/read-card', (req, res) => {
    if (isReading) {
        return res.status(503).json({ error: 'กำลังอ่านข้อมูลจากบัตร กรุณารอสักครู่...' });
    }

    // ถ้าดึงบัตรออกแล้ว หรือไม่มีบัตรเสียบอยู่ ห้ามคืนค่าบัตรเก่าเด็ดขาด!
    if (!isCardInserted && !currentCardData) {
        return res.status(404).json({ error: 'ไม่พบบัตรประชาชน กรุณาเสียบบัตรให้แน่น' });
    }

    let card = currentCardData;

    // ถ้าไม่มีข้อมูลจากการ์ดโดยตรง แต่ตรวจพบว่ามีการ์ดเสียบอยู่ ให้ตรวจเช็คจาก SIAM-ID แฟ้มข้อมูล
    if (!card && isCardInserted) {
        card = getSiamIdData();
    }

    if (!card) {
        return res.status(404).json({ error: 'ไม่พบบัตรประชาชน กรุณาเสียบบัตรให้แน่น' });
    }

    // 1. จัดการปีเกิด: แปลงทุกรูปแบบเป็น DD/MM/YYYY ปี พ.ศ.
    let formattedDob = '';
    const rawDob = card.birthday || card.dob || '';
    if (rawDob) {
        const str = String(rawDob).trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                let y = parseInt(parts[2], 10);
                if (y < 2400) y += 543;
                formattedDob = `${d}/${m}/${y}`;
            }
        } else if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
                let y = parseInt(parts[0], 10);
                if (y < 2400) y += 543;
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                formattedDob = `${d}/${m}/${y}`;
            }
        } else if (str.length === 8 && /^\d+$/.test(str)) {
            let y = parseInt(str.substring(0, 4), 10);
            if (y < 2400) y += 543;
            const m = str.substring(4, 6);
            const d = str.substring(6, 8);
            formattedDob = `${d}/${m}/${y}`;
        } else {
            formattedDob = str;
        }
    }

    // 2. จัดการเพศ: คืนค่าเป็น 'ชาย' หรือ 'หญิง'
    let gender = 'ไม่ระบุ';
    const rawGender = String(card.gender || '').toLowerCase().trim();
    const titleTh = card.titleTH || card.titleName || '';
    const titleLower = titleTh.toLowerCase();
    const malePrefixes = ['นาย', 'นพ.', 'ด.ช.', 'เด็กชาย', 'พระ', 'ม.ร.ว.', 'mr.', 'mr', 'master'];
    const femalePrefixes = ['นาง', 'นางสาว', 'ด.ญ.', 'เด็กหญิง', 'น.ส.', 'พญ.', 'mrs.', 'mrs', 'miss', 'ms.', 'ms'];

    if (rawGender === '1' || rawGender === 'ชาย' || rawGender === 'male' || rawGender === 'm' || malePrefixes.some(p => titleLower.includes(p))) {
        gender = 'ชาย';
    } else if (rawGender === '2' || rawGender === 'หญิง' || rawGender === 'female' || rawGender === 'f' || femalePrefixes.some(p => titleLower.includes(p))) {
        gender = 'หญิง';
    }

    // จัดการคำนำหน้าชื่อ (แปลงตัวย่อเป็นคำเต็ม)
    let normalizedTitle = titleTh.trim();
    if (normalizedTitle === 'น.ส.' || normalizedTitle === 'น.ส') normalizedTitle = 'นางสาว';
    else if (normalizedTitle === 'ด.ช.' || normalizedTitle === 'ด.ช') normalizedTitle = 'ด.ช.';
    else if (normalizedTitle === 'ด.ญ.' || normalizedTitle === 'ด.ญ') normalizedTitle = 'ด.ญ.';

    // 3. จัดการศาสนา, สัญชาติ, เชื้อชาติ
    let religion = mapReligion(card.religion || card.Religion || card.faith || '');

    const cidStr = String(card.citizenId || card.cid || '').trim();
    const firstChar = cidStr ? cidStr[0] : '';
    const isThaiCitizen = ['1', '2', '3', '4', '5', '8'].includes(firstChar);
    const nationality = card.nationality || (isThaiCitizen ? 'ไทย' : '');
    const ethnicity = card.ethnicity || (isThaiCitizen ? 'ไทย' : '');

    // 4. จัดการที่อยู่
    let houseNo = card.address || '';
    let moo = String(card.moo || '').replace(/[^0-9]/g, '').trim();
    let road = card.road || '';
    let subDistrict = card.subDistrict || '';
    let district = card.district || '';
    let province = card.province || '';

    // หากที่อยู่ยังเป็นก้อนเดียว ให้แยกส่วน
    if (houseNo && !subDistrict && !district && !province) {
        let provMatch = houseNo.match(/จังหวัด\s*([^\s]+)/);
        if (provMatch) province = provMatch[1];
        let distMatch = houseNo.match(/(?:อำเภอ|เขต)\s*([^\s]+)/);
        if (distMatch) district = distMatch[1];
        let subDistMatch = houseNo.match(/(?:ตำบล|แขวง)\s*([^\s]+)/);
        if (subDistMatch) subDistrict = subDistMatch[1];
        let mooMatch = houseNo.match(/หมู่(?:ที่)?\s*([^\s]+)/);
        if (mooMatch) moo = mooMatch[1];
        let roadMatch = houseNo.match(/(?:ถนน|ซอย|ตรอก)\s*([^\s]+)/);
        if (roadMatch) road = roadMatch[1];
        let houseMatch = houseNo.split(/\s+(หมู่|ตำบล|แขวง|อำเภอ|เขต|จังหวัด|ซอย|ถนน)/)[0];
        if (houseMatch) houseNo = houseMatch.replace(/^ที่อยู่\s*/, '').trim();
    }

    // จัดเตรียมข้อมูลส่งกลับให้หน้าเว็บคลินิก
    const responseData = {
        pid: card.citizenId || '',
        citizenId: card.citizenId || '',
        titleName: normalizedTitle,
        prefix: normalizedTitle,
        fname: card.firstNameTH || '',
        firstName: card.firstNameTH || '',
        lname: card.lastNameTH || '',
        lastName: card.lastNameTH || '',
        dob: formattedDob, 
        gender: gender,
        religion: religion,
        nationality: nationality,
        ethnicity: ethnicity,
        address: houseNo,
        moo: moo,
        road: road,
        subDistrict: subDistrict,
        district: district,
        province: province,
        photo: card.photo || null
    };

    res.json(responseData);
});

const PORT = 8181;
app.listen(PORT, () => {
    console.log(`\n================================================`);
    console.log(`🚀 Thai Smart Card API พร้อมทำงาน!`);
    console.log(`📡 เปิดรอรับคำสั่งที่: http://localhost:${PORT}/api/read-card`);
    console.log(`================================================\n`);
});
