const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pcsclite = require('pcsclite');
const iconv = require('iconv-lite');

// ----------------------------------------------------
// 1. APDU Commands สำหรับบัตรประจำตัวประชาชนไทย
// ----------------------------------------------------
// เลือก Applet บัตรประชาชน (A0 00 00 00 54 48 00 01)
const CMD_SELECT = [0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01];

// เลขประจำตัวประชาชน 13 หลัก (13 ไบต์)
const CMD_CID_REQ = [0x80, 0xB0, 0x00, 0x04, 0x02, 0x00, 0x0D];
const CMD_CID_GET = [0x00, 0xC0, 0x00, 0x00, 0x0D];

// ข้อมูลส่วนบุคคล: ชื่อ-สกุล ไทย/อังกฤษ, วันเกิด, เพศ (209 ไบต์)
const CMD_PERSON_REQ = [0x80, 0xB0, 0x00, 0x11, 0x02, 0x00, 0xD1];
const CMD_PERSON_GET = [0x00, 0xC0, 0x00, 0x00, 0xD1];

// ที่อยู่ตามทะเบียนราษฎร์ (100 ไบต์)
const CMD_ADDRESS_REQ = [0x80, 0xB0, 0x15, 0x79, 0x02, 0x00, 0x64];
const CMD_ADDRESS_GET = [0x00, 0xC0, 0x00, 0x00, 0x64];

// วันออกบัตร (8 ไบต์)
const CMD_ISSUE_REQ = [0x80, 0xB0, 0x01, 0x67, 0x02, 0x00, 0x08];
const CMD_ISSUE_GET = [0x00, 0xC0, 0x00, 0x00, 0x08];

// วันหมดอายุ (8 ไบต์)
const CMD_EXPIRE_REQ = [0x80, 0xB0, 0x01, 0x6F, 0x02, 0x00, 0x08];
const CMD_EXPIRE_GET = [0x00, 0xC0, 0x00, 0x00, 0x08];

// ศาสนา (2 ไบต์)
const CMD_RELIGION_REQ = [0x80, 0xB0, 0x01, 0x77, 0x02, 0x00, 0x02];
const CMD_RELIGION_GET = [0x00, 0xC0, 0x00, 0x00, 0x02];

// หน่วยงานที่ออกบัตร (100 ไบต์)
const CMD_ISSUER_REQ = [0x80, 0xB0, 0x00, 0xF6, 0x02, 0x00, 0x64];
const CMD_ISSUER_GET = [0x00, 0xC0, 0x00, 0x00, 0x64];

// คำสั่งอ่านรูปถ่าย 21 บล็อก (รวม 5118 ไบต์)
function getPhotoCommands() {
    const list = [];
    for (let i = 0; i < 21; i++) {
        const xof = i * 254 + 379;
        const xwd = (i === 20) ? 38 : 254;
        const sp2 = (xof >> 8) & 0xff;
        const sp3 = xof & 0xff;
        const sp6 = xwd & 0xff;
        list.push({
            req: [0x80, 0xB0, sp2, sp3, 0x02, 0x00, sp6],
            get: [0x00, 0xC0, 0x00, 0x00, sp6]
        });
    }
    return list;
}

// ----------------------------------------------------
// 2. ฟังก์ชันแปลงข้อมูลมาตรฐานภาษาไทย
// ----------------------------------------------------
function decodeTis620(buf) {
    if (!buf || buf.length === 0) return '';
    let len = buf.length;
    if (len >= 2 && buf[len - 2] === 0x90 && buf[len - 1] === 0x00) {
        len -= 2;
    }
    return iconv.decode(buf.subarray(0, len), 'tis-620').trim();
}

const mapReligion = (raw) => {
    if (!raw) return 'ไม่ระบุ';
    const str = String(raw).trim();
    if (str === '01' || str === '1' || str.includes('พุทธ')) return 'พุทธ';
    if (str === '02' || str === '2' || str.includes('อิสลาม')) return 'อิสลาม';
    if (str === '03' || str === '3' || str.includes('คริสต์')) return 'คริสต์';
    if (str === '04' || str === '4' || str.includes('ฮินดู') || str.includes('พราหมณ์')) return 'พราหมณ์-ฮินดู';
    if (str === '05' || str === '5' || str.includes('ซิกข์')) return 'ซิกข์';
    if (str === '00' || str === '99' || str.includes('ไม่ระบุ') || str.includes('ไม่นับถือ')) return 'ไม่ระบุ';
    return str.replace(/^ศาสนา\s*/, '').trim();
};

const formatThaiDate = (raw, isExpire = false) => {
    if (!raw) return '';
    const str = String(raw).trim();
    if (isExpire && (str === '99999999' || str.startsWith('9999') || str.includes('ตลอดชีพ'))) {
        return 'ตลอดชีพ';
    }
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            let y = parseInt(parts[2], 10);
            if (y < 2400) y += 543;
            return `${d}/${m}/${y}`;
        }
    } else if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3) {
            let y = parseInt(parts[0], 10);
            if (y < 2400) y += 543;
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            return `${d}/${m}/${y}`;
        }
    } else if (str.length === 8 && /^\d+$/.test(str)) {
        let y = parseInt(str.substring(0, 4), 10);
        if (y < 2400) y += 543;
        const m = str.substring(4, 6);
        const d = str.substring(6, 8);
        return `${d}/${m}/${y}`;
    }
    return str;
};

const formatGender = (raw, title = '') => {
    const rawGender = String(raw || '').toLowerCase().trim();
    const titleLower = String(title || '').toLowerCase().trim();
    const malePrefixes = ['นาย', 'นพ.', 'ด.ช.', 'เด็กชาย', 'พระ', 'ม.ร.ว.', 'mr.', 'mr', 'master'];
    const femalePrefixes = ['นาง', 'นางสาว', 'ด.ญ.', 'เด็กหญิง', 'น.ส.', 'พญ.', 'mrs.', 'mrs', 'miss', 'ms.', 'ms'];

    if (rawGender === '1' || rawGender === 'ชาย' || rawGender === 'male' || rawGender === 'm' || malePrefixes.some(p => titleLower.includes(p))) {
        return 'ชาย';
    }
    if (rawGender === '2' || rawGender === 'หญิง' || rawGender === 'female' || rawGender === 'f' || femalePrefixes.some(p => titleLower.includes(p))) {
        return 'หญิง';
    }
    return 'ไม่ระบุ';
};

const normalizeTitle = (raw) => {
    let t = String(raw || '').trim();
    if (t === 'น.ส.' || t === 'น.ส') return 'นางสาว';
    if (t === 'ด.ช.' || t === 'ด.ช') return 'ด.ช.';
    if (t === 'ด.ญ.' || t === 'ด.ญ') return 'ด.ญ.';
    return t;
};

// ----------------------------------------------------
// 3. แปลงข้อมูลดิบจากชิปบัตรประชาชนเป็น Object ครบถ้วน
// ----------------------------------------------------
function parseCardBytes(cidBuf, personBuf, addressBuf, issueBuf, expireBuf, relBuf, issuerBuf, photoBuf) {
    const cidStr = decodeTis620(cidBuf).replace(/[^0-9]/g, '');

    let titleTh = '', firstTh = '', middleTh = '', lastTh = '';
    let titleEn = '', firstEn = '', middleEn = '', lastEn = '';
    let dob = '', gender = 'ไม่ระบุ';

    if (personBuf && personBuf.length >= 100) {
        const thStr = decodeTis620(personBuf.subarray(0, 100));
        const thParts = thStr.split('#').map(s => s.trim());
        titleTh = normalizeTitle(thParts[0] || '');
        firstTh = thParts[1] || '';
        middleTh = thParts[2] || '';
        if (thParts.length > 3) {
            lastTh = thParts[3] || middleTh;
        } else {
            lastTh = middleTh;
        }
    }

    if (personBuf && personBuf.length >= 200) {
        const enStr = decodeTis620(personBuf.subarray(100, 200));
        const enParts = enStr.split('#').map(s => s.trim());
        titleEn = enParts[0] || '';
        firstEn = enParts[1] || '';
        middleEn = enParts[2] || '';
        if (enParts.length > 3) {
            lastEn = enParts[3] || middleEn;
        } else {
            lastEn = middleEn;
        }
    }

    if (personBuf && personBuf.length >= 208) {
        const dobStr = personBuf.subarray(200, 208).toString('ascii').trim();
        if (dobStr.length === 8 && /^\d+$/.test(dobStr)) {
            const y = dobStr.substring(0, 4);
            const m = dobStr.substring(4, 6);
            const d = dobStr.substring(6, 8);
            dob = `${d}/${m}/${y}`;
        }
    }

    if (personBuf && personBuf.length >= 209) {
        const g = String.fromCharCode(personBuf[208]);
        gender = formatGender(g, titleTh);
    } else {
        gender = formatGender('', titleTh);
    }

    let houseNo = '', moo = '', road = '', subDistrict = '', district = '', province = '';
    if (addressBuf) {
        const rawAddr = decodeTis620(addressBuf);
        const parts = rawAddr.split('#').map(s => s.trim());
        houseNo = parts[0] || '';
        moo = (parts[1] || '').replace(/[^0-9]/g, '');
        const trok = parts[2] || '';
        const soi = parts[3] || '';
        const roadPart = parts[4] || '';
        road = [trok, soi, roadPart].filter(Boolean).join(' ').replace(/^(ถนน|ถ\.)\s*/, '').trim();
        subDistrict = (parts[5] || '').replace(/^(?:ตำบล|แขวง|ต\.)\s*/, '').trim();
        district = (parts[6] || '').replace(/^(?:อำเภอ|เขต|อ\.)\s*/, '').trim();
        province = (parts[7] || '').replace(/^(?:จังหวัด|จ\.)\s*/, '').trim();
    }

    let issueDate = '';
    if (issueBuf) {
        const rawIssue = decodeTis620(issueBuf).replace(/[^0-9]/g, '');
        if (rawIssue.length === 8) {
            issueDate = `${rawIssue.substring(6, 8)}/${rawIssue.substring(4, 6)}/${rawIssue.substring(0, 4)}`;
        }
    }

    let expireDate = '';
    if (expireBuf) {
        const rawExp = decodeTis620(expireBuf).replace(/[^0-9]/g, '');
        if (rawExp === '99999999' || rawExp.startsWith('9999')) {
            expireDate = 'ตลอดชีพ';
        } else if (rawExp.length === 8) {
            expireDate = `${rawExp.substring(6, 8)}/${rawExp.substring(4, 6)}/${rawExp.substring(0, 4)}`;
        }
    }

    let religion = 'ไม่ระบุ';
    if (relBuf) {
        religion = mapReligion(decodeTis620(relBuf));
    }

    let issuer = '';
    if (issuerBuf) {
        issuer = decodeTis620(issuerBuf);
    }

    let photoBase64 = '';
    if (photoBuf && photoBuf.length > 0) {
        photoBase64 = photoBuf.toString('base64');
    }

    const firstChar = cidStr ? cidStr[0] : '';
    const isThaiCitizen = ['1', '2', '3', '4', '5', '8'].includes(firstChar);

    return {
        citizenId: cidStr,
        prefixTh: titleTh,
        firstNameTh: firstTh,
        middleNameTh: middleTh,
        lastNameTh: lastTh,
        prefixEn: titleEn,
        firstNameEn: firstEn,
        middleNameEn: middleEn,
        lastNameEn: lastEn,
        dob,
        gender,
        religion,
        nationality: isThaiCitizen ? 'ไทย' : '',
        ethnicity: isThaiCitizen ? 'ไทย' : '',
        houseNo,
        moo,
        road,
        subDistrict,
        district,
        province,
        issueDate,
        expireDate,
        issuer,
        photoBase64,
        source: 'SmartCard'
    };
}

// ----------------------------------------------------
// 4. ดึงข้อมูลจากแฟ้ม SIAM-ID (Data.txt) ครบ 32 คอลัมน์
// ----------------------------------------------------
function getSiamIdData() {
    try {
        const candidatePaths = [
            path.join(os.homedir(), 'Downloads', 'SIAM-ID', 'Data.txt'),
            path.join(os.homedir(), 'Desktop', 'SIAM-ID', 'Data.txt'),
            'C:\\SIAM-ID\\Data.txt',
            path.join(process.cwd(), 'SIAM-ID', 'Data.txt')
        ];

        let siamIdPath = candidatePaths.find(p => fs.existsSync(p));
        if (!siamIdPath) return null;

        const content = fs.readFileSync(siamIdPath, 'utf8');
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return null;

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
        if (values.length < 15) return null;

        const cid = (values[2] || '').replace(/"/g, '').trim();
        const prefixTh = normalizeTitle(values[3] || '');
        const fnameTh = values[4] || '';
        const lnameTh = values[5] || '';
        const prefixEn = values[6] || '';
        const fnameEn = values[7] || '';
        const lnameEn = values[8] || '';
        const dob = formatThaiDate(values[9] || '');
        const gender = formatGender(values[10] || '', prefixTh);
        const religion = mapReligion(values[11] || '');

        const houseNo = values[14] || '';
        const moo = (values[15] || '').replace(/[^0-9]/g, '').trim();
        const road = [values[16], values[17], values[18]].filter(Boolean).join(' ').replace(/^(ถนน|ถ\.)\s*/, '').trim();
        const subDistrict = (values[19] || '').replace(/^(?:ตำบล|แขวง|ต\.)\s*/, '').trim();
        const district = (values[20] || '').replace(/^(?:อำเภอ|เขต|อ\.)\s*/, '').trim();
        const province = (values[21] || '').replace(/^(?:จังหวัด|จ\.)\s*/, '').trim();

        const issueDate = formatThaiDate(values[22] || '');
        const expireDate = formatThaiDate(values[23] || '', true);
        const cardNo = (values[24] || '').replace(/"/g, '').trim();
        const issuer = values[25] || '';

        const photoPath = values[31] || '';
        let photoBase64 = '';
        if (photoPath && fs.existsSync(photoPath)) {
            photoBase64 = fs.readFileSync(photoPath).toString('base64');
        }

        const firstChar = cid ? cid[0] : '';
        const isThaiCitizen = ['1', '2', '3', '4', '5', '8'].includes(firstChar);

        return {
            citizenId: cid,
            prefixTh,
            firstNameTh: fnameTh,
            middleNameTh: '',
            lastNameTh: lnameTh,
            prefixEn,
            firstNameEn: fnameEn,
            middleNameEn: '',
            lastNameEn: lnameEn,
            dob,
            gender,
            religion,
            nationality: isThaiCitizen ? 'ไทย' : '',
            ethnicity: isThaiCitizen ? 'ไทย' : '',
            houseNo,
            moo,
            road,
            subDistrict,
            district,
            province,
            issueDate,
            expireDate,
            cardNo,
            issuer,
            photoBase64,
            source: 'SIAM-ID'
        };
    } catch (e) {
        console.error('Error reading SIAM-ID data:', e.message);
        return null;
    }
}

// ----------------------------------------------------
// 5. จัดรูปแบบข้อมูลตอบกลับแบบสมบูรณ์ 100% (Universal Schema)
// ----------------------------------------------------
function formatResponse(card) {
    if (!card) return null;

    const prefixTh = normalizeTitle(card.prefixTh || card.titleName || card.prefix || '');
    const fnameTh = card.firstNameTh || card.firstName || card.fname || '';
    const lnameTh = card.lastNameTh || card.lastName || card.lname || '';
    const middleTh = card.middleNameTh || card.middleName || '';

    const prefixEn = card.prefixEn || card.titleEn || '';
    const fnameEn = card.firstNameEn || card.fnameEn || '';
    const lnameEn = card.lastNameEn || card.lnameEn || '';
    const middleEn = card.middleNameEn || '';

    const dob = formatThaiDate(card.dob || card.birthday || '');
    const gender = formatGender(card.gender || card.sex || '', prefixTh);
    const religion = mapReligion(card.religion || '');

    const cid = String(card.citizenId || card.pid || card.idCard || '').replace(/[^0-9]/g, '').trim();
    const isThaiCitizen = ['1', '2', '3', '4', '5', '8'].includes(cid ? cid[0] : '');

    const houseNo = card.houseNo || card.address || '';
    const moo = String(card.moo || '').replace(/[^0-9]/g, '').trim();
    const road = card.road || '';
    const subDistrict = (card.subDistrict || card.subdistrict || card.tambon || '').replace(/^(?:ตำบล|แขวง|ต\.)\s*/, '').trim();
    const district = (card.district || card.amphur || '').replace(/^(?:อำเภอ|เขต|อ\.)\s*/, '').trim();
    const province = (card.province || card.changwat || '').replace(/^(?:จังหวัด|จ\.)\s*/, '').trim();
    const zipcode = card.zipcode || '';

    const issueDate = formatThaiDate(card.issueDate || card.issue || '');
    const expireDate = formatThaiDate(card.expireDate || card.expire || '', true);
    const issuer = card.issuer || '';
    const cardNo = card.cardNo || '';

    let photoBase64 = card.photoBase64 || '';
    if (!photoBase64 && card.photo) {
        photoBase64 = String(card.photo).replace(/^data:image\/[a-z]+;base64,/, '');
    }
    const photoDataUri = photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : null;

    return {
        // Identification
        pid: cid,
        citizenId: cid,
        idCard: cid,

        // Thai Name
        titleName: prefixTh,
        prefix: prefixTh,
        prefixTh: prefixTh,
        titleTh: prefixTh,
        fname: fnameTh,
        firstName: fnameTh,
        firstNameTh: fnameTh,
        middleName: middleTh,
        middleNameTh: middleTh,
        lname: lnameTh,
        lastName: lnameTh,
        lastNameTh: lnameTh,
        fullNameTh: `${prefixTh}${fnameTh} ${lnameTh}`.trim(),

        // English Name
        titleEn: prefixEn,
        prefixEn: prefixEn,
        fnameEn: fnameEn,
        firstNameEn: fnameEn,
        middleNameEn: middleEn,
        lnameEn: lnameEn,
        lastNameEn: lnameEn,
        fullNameEn: `${prefixEn ? prefixEn + ' ' : ''}${fnameEn} ${lnameEn}`.trim(),

        // Demographics
        dob: dob,
        birthday: dob,
        gender: gender,
        sex: gender,
        religion: religion,
        nationality: card.nationality || (isThaiCitizen ? 'ไทย' : ''),
        ethnicity: card.ethnicity || (isThaiCitizen ? 'ไทย' : ''),

        // Address
        address: houseNo,
        houseNo: houseNo,
        moo: moo,
        road: road,
        subDistrict: subDistrict,
        subdistrict: subDistrict,
        tambon: subDistrict,
        district: district,
        amphur: district,
        province: province,
        changwat: province,
        zipcode: zipcode,

        // Card Metadata
        issueDate: issueDate,
        issue: issueDate,
        expireDate: expireDate,
        expire: expireDate,
        issuer: issuer,
        cardNo: cardNo,

        // Photo
        photo: photoDataUri,
        photoBase64: photoBase64,
        image: photoDataUri,

        source: card.source || 'SmartCard'
    };
}

// ----------------------------------------------------
// 6. Direct PC/SC Engine (pcsclite)
// ----------------------------------------------------
let currentCardData = null;
let isReading = false;
let isDeviceConnected = false;
let isCardInserted = false;
let hasReadCard = false;
let currentReader = null;

const transmit = (reader, cmd, protocol) => {
    return new Promise((resolve, reject) => {
        reader.transmit(Buffer.from(cmd), 256, protocol, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
};

function readCardDirect(reader) {
    return new Promise((resolve) => {
        if (isReading) return resolve(null);
        isReading = true;

        console.log(`\n💳 กำลังอ่านข้อมูลบัตรจากเครื่อง ${reader.name}...`);

        reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, async (err, protocol) => {
            if (err) {
                console.warn('⚠️ ไม่สามารถเชื่อมต่อบัตรโดยตรงได้ (อาจมีโปรแกรมอย่าง SIAM-ID ใช้งานอยู่):', err.message);
                isReading = false;
                return resolve(null);
            }

            try {
                // 1. Select Applet
                await transmit(reader, CMD_SELECT, protocol);

                // 2. CID (13 หลัก)
                await transmit(reader, CMD_CID_REQ, protocol);
                const cidBuf = await transmit(reader, CMD_CID_GET, protocol);

                // 3. ข้อมูลบุคคล (209 ไบต์)
                await transmit(reader, CMD_PERSON_REQ, protocol);
                const personBuf = await transmit(reader, CMD_PERSON_GET, protocol);

                // 4. ที่อยู่ (100 ไบต์)
                await transmit(reader, CMD_ADDRESS_REQ, protocol);
                const addressBuf = await transmit(reader, CMD_ADDRESS_GET, protocol);

                // 5. วันออกบัตร (8 ไบต์)
                await transmit(reader, CMD_ISSUE_REQ, protocol);
                const issueBuf = await transmit(reader, CMD_ISSUE_GET, protocol);

                // 6. วันหมดอายุ (8 ไบต์)
                await transmit(reader, CMD_EXPIRE_REQ, protocol);
                const expireBuf = await transmit(reader, CMD_EXPIRE_GET, protocol);

                // 7. ศาสนา (2 ไบต์)
                await transmit(reader, CMD_RELIGION_REQ, protocol);
                const relBuf = await transmit(reader, CMD_RELIGION_GET, protocol);

                // 8. ผู้ออกบัตร (100 ไบต์)
                await transmit(reader, CMD_ISSUER_REQ, protocol);
                const issuerBuf = await transmit(reader, CMD_ISSUER_GET, protocol);

                // 9. รูปถ่าย (21 บล็อก)
                let photoBuf = null;
                try {
                    const photoCmds = getPhotoCommands();
                    const photoChunks = [];
                    for (const cmdPair of photoCmds) {
                        await transmit(reader, cmdPair.req, protocol);
                        let res = await transmit(reader, cmdPair.get, protocol);
                        if (res.length > 2 && res[res.length - 2] === 0x90 && res[res.length - 1] === 0x00) {
                            res = res.subarray(0, res.length - 2);
                        }
                        photoChunks.push(res);
                    }
                    photoBuf = Buffer.concat(photoChunks);
                } catch (photoErr) {
                    console.warn('⚠️ ข้ามการอ่านรูปถ่ายเนื่องจากชิปตอบสนองช้า:', photoErr.message);
                }

                reader.disconnect(reader.SCARD_LEAVE_CARD, () => {});

                const parsed = parseCardBytes(cidBuf, personBuf, addressBuf, issueBuf, expireBuf, relBuf, issuerBuf, photoBuf);
                currentCardData = parsed;
                isCardInserted = true;
                hasReadCard = true;
                console.log(`✅ อ่านข้อมูลสำเร็จ: ${parsed.prefixTh}${parsed.firstNameTh} ${parsed.lastNameTh} (${parsed.citizenId})`);
                resolve(parsed);
            } catch (readErr) {
                console.error('❌ อ่านข้อมูลจากชิปล้มเหลว:', readErr.message);
                reader.disconnect(reader.SCARD_LEAVE_CARD, () => {});
                resolve(null);
            } finally {
                isReading = false;
            }
        });
    });
}

// เริ่มต้น PCSC Listener
let pcsc = null;
try {
    pcsc = pcsclite();
    pcsc.on('reader', reader => {
        console.log(`🔌 ตรวจพบอุปกรณ์: ${reader.name}`);
        currentReader = reader;
        isDeviceConnected = true;

        reader.on('status', status => {
            const changes = reader.state ^ status.state;
            if (!changes) return;

            const isPresent = Boolean(status.state & reader.SCARD_STATE_PRESENT);
            const isEmpty = Boolean(status.state & reader.SCARD_STATE_EMPTY);

            if (isEmpty) {
                console.log('👋 ดึงบัตรประชาชนออกแล้ว');
                isCardInserted = false;
                hasReadCard = false;
                currentCardData = null;
            } else if (isPresent && !hasReadCard && !isReading) {
                isCardInserted = true;
                // หน่วงเวลาเล็กน้อยเพื่อให้หน้าสัมผัสของชิปนิ่งสนิท
                setTimeout(() => {
                    if (isCardInserted && !hasReadCard && !isReading) {
                        readCardDirect(reader);
                    }
                }, 400);
            }
        });

        reader.on('error', err => {
            console.warn(`⚠️ เกิดข้อผิดพลาดที่เครื่องอ่าน ${reader.name}:`, err.message);
        });

        reader.on('end', () => {
            console.log(`❌ เครื่องอ่าน ${reader.name} ถูกดึงออก`);
            if (currentReader === reader) {
                currentReader = null;
                isDeviceConnected = false;
                currentCardData = null;
                isCardInserted = false;
                hasReadCard = false;
            }
        });
    });

    pcsc.on('error', err => {
        console.warn('⚠️ PCSC Subsystem Warning:', err.message);
    });
} catch (pcscErr) {
    console.warn('⚠️ ไม่สามารถเริ่ม PCSC ได้:', pcscErr.message);
}

// ----------------------------------------------------
// 7. Express HTTP Server
// ----------------------------------------------------
const app = express();

// ตั้งค่า CORS & Private Network Access เต็มรูปแบบ
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.json());

process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});

// Endpoint ตรวจสอบสถานะการเชื่อมต่อ
app.get('/api/status', (req, res) => {
    const siamData = getSiamIdData();
    const hasCard = isCardInserted || Boolean(currentCardData) || Boolean(siamData);
    const hasDevice = isDeviceConnected || Boolean(currentReader) || Boolean(siamData);

    res.json({
        status: 'ok',
        server: 'Anping Smart Card Agent (PC Enhanced)',
        deviceConnected: hasDevice,
        hasCard: hasCard,
        readerName: currentReader ? currentReader.name : 'USB Smart Card Reader'
    });
});

// Endpoint อ่านข้อมูลบัตรประชาชนสำหรับคลินิก (ส่งข้อมูลครบ 100%)
app.get('/api/read-card', async (req, res) => {
    // 1. ถ้ามีข้อมูลชิปในหน่วยความจำอยู่แล้ว ส่งกลับทันที
    if (currentCardData) {
        return res.json(formatResponse(currentCardData));
    }

    // 2. ถ้ามีข้อมูลจาก SIAM-ID Data.txt ส่งกลับทันที
    const siamData = getSiamIdData();
    if (siamData) {
        return res.json(formatResponse(siamData));
    }

    // 3. ถ้ากำลังอ่านอยู่
    if (isReading) {
        return res.status(503).json({ 
            status: 'reading',
            error: 'กำลังอ่านข้อมูลจากบัตรประชาชน กรุณารอสักครู่...' 
        });
    }

    // 4. ถ้าตรวจพบการ์ดเสียบอยู่แต่ยังไม่ได้อ่าน ให้ลองอ่านแบบ On-Demand
    if (isCardInserted && currentReader) {
        await readCardDirect(currentReader);
        if (currentCardData) {
            return res.json(formatResponse(currentCardData));
        }
    }

    // 5. ไม่พบบัตร
    return res.status(404).json({ 
        status: 'error',
        error: 'ไม่พบบัตรประชาชน กรุณาเสียบบัตรให้แน่น แล้วกดอ่านใหม่อีกครั้ง' 
    });
});

const PORT = 8181;
app.listen(PORT, () => {
    console.log(`\n================================================`);
    console.log(`🚀 Anping Smart Card Agent (PC Enhanced) พร้อมทำงาน!`);
    console.log(`📡 เปิดรอรับคำสั่งที่: http://localhost:${PORT}/api/read-card`);
    console.log(`✨ รองรับทั้งเครื่องอ่านตรง (PCSC) และ SIAM-ID ครบ 100%`);
    console.log(`================================================\n`);
});
