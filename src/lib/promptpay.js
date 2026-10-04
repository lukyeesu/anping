import QRCode from 'qrcode';

/**
 * รายชื่อธนาคารในประเทศไทย พร้อมสีประจำธนาคาร
 */
export const THAI_BANKS = [
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย', enName: 'Kasikornbank', color: '#138f2d', textColor: '#ffffff' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', enName: 'Siam Commercial Bank', color: '#4e2e7f', textColor: '#ffffff' },
  { code: 'BBL', name: 'ธนาคารกรุงเทพ', enName: 'Bangkok Bank', color: '#1e4598', textColor: '#ffffff' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย', enName: 'Krungthai Bank', color: '#00a5e5', textColor: '#ffffff' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', enName: 'Bank of Ayudhya', color: '#fec43b', textColor: '#1e293b' },
  { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต', enName: 'TMBThanachart Bank', color: '#002d63', textColor: '#ffffff' },
  { code: 'GSB', name: 'ธนาคารออมสิน', enName: 'Government Savings Bank', color: '#eb1985', textColor: '#ffffff' },
  { code: 'BAAC', name: 'ธ.ก.ส.', enName: 'BAAC', color: '#006b3f', textColor: '#ffffff' },
  { code: 'UOB', name: 'ธนาคารยูโอบี', enName: 'UOB', color: '#0b2265', textColor: '#ffffff' },
  { code: 'PROMPTPAY', name: 'พร้อมเพย์ (PromptPay)', enName: 'PromptPay', color: '#003d6b', textColor: '#ffffff' }
];

export function getBankInfo(code) {
  if (!code) return THAI_BANKS[0];
  const found = THAI_BANKS.find(b => b.code.toUpperCase() === String(code).toUpperCase());
  return found || { code, name: code, enName: code, color: '#0f172a', textColor: '#ffffff' };
}

/**
 * คำนวณ CRC16-CCITT สำหรับมาตรฐาน EMVCo Thai QR Payment
 */
function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * สร้าง EMVCo Thai QR Payment Payload สำหรับ PromptPay (เบอร์โทรศัพท์ 10 หลัก หรือ เลขประจำตัว 13 หลัก)
 */
export function generatePromptPayPayload(target, amount) {
  if (!target) return '';
  const sanitized = String(target).replace(/[^0-9]/g, '');
  if (!sanitized) return '';

  let targetTag = '';
  if (sanitized.length >= 13) {
    // เลขบัตรประชาชน / เลขประจำตัวผู้เสียภาษี 13 หลัก
    targetTag = '02' + String(sanitized.length).padStart(2, '0') + sanitized;
  } else {
    // เบอร์โทรศัพท์มือถือ (แปลง 08x -> 00668x)
    const formattedMobile = '0066' + sanitized.replace(/^0/, '');
    targetTag = '01' + String(formattedMobile.length).padStart(2, '0') + formattedMobile;
  }

  const tag29Data = '0016A000000677010111' + targetTag;
  const tag29 = '29' + String(tag29Data.length).padStart(2, '0') + tag29Data;

  const f00 = '000201'; // Payload Format Indicator
  const f01 = (amount && Number(amount) > 0) ? '010212' : '010211'; // Dynamic (12) vs Static (11)
  const f53 = '5303764'; // Currency Code 764 (THB)
  const f58 = '5802TH';   // Country Code TH

  let payload = f00 + f01 + tag29 + f53;
  if (amount && Number(amount) > 0) {
    const amtStr = Number(amount).toFixed(2);
    payload += '54' + String(amtStr.length).padStart(2, '0') + amtStr;
  }
  payload += f58;
  payload += '6304';
  payload += crc16(payload);
  return payload;
}

/**
 * สร้างภาพ QR Code Data URL จาก Payload
 */
export async function generatePromptPayQrDataUrl(target, amount, options = {}) {
  try {
    const payload = generatePromptPayPayload(target, amount);
    if (!payload) return null;
    return await QRCode.toDataURL(payload, {
      width: options.width || 320,
      margin: options.margin !== undefined ? options.margin : 1,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#ffffff'
      }
    });
  } catch (err) {
    console.warn('generatePromptPayQrDataUrl error, fallback to promptpay.io:', err);
    const cleanNo = String(target).replace(/[^0-9]/g, '');
    const amt = Number(amount) > 0 ? Number(amount).toFixed(2) : '';
    return amt ? `https://promptpay.io/${cleanNo}/${amt}.png` : `https://promptpay.io/${cleanNo}.png`;
  }
}

/**
 * จัดรูปแบบเบอร์พร้อมเพย์ หรือเลขที่บัญชีให้อ่านง่าย
 */
export function formatAccountNumber(number, type = 'promptpay_mobile') {
  if (!number) return '-';
  const clean = String(number).replace(/[^0-9]/g, '');
  if (type === 'promptpay_mobile' || (clean.length === 10 && clean.startsWith('0'))) {
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
  }
  if (type === 'promptpay_id' || clean.length === 13) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12)}`;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}-${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  return number;
}

export const DEFAULT_POS_QR_SETTINGS = {
  accounts: [
    {
      id: 'default-kbank-promptpay',
      name: 'นาย พุทธินัทธ์ จงเจริญเลิศสิน',
      type: 'promptpay_mobile',
      accountNumber: '0631434927',
      bankCode: 'KBANK',
      bankName: 'ธนาคารกสิกรไทย',
      qrImage: '',
      isDefault: true,
      isActive: true,
      note: 'บัญชีหลักคลินิก'
    }
  ],
  branchDefaults: {}
};
